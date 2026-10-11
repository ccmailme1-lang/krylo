// canonicalstore.js -- Step 4 of the Structural Analysis decision record (2026-10-11): the durable, versioned Canonical Relationship Store.
// Same persistence pattern as formationstatestore.js (KRYL-1334): PostgreSQL first, and a local JSONL file as the fallback so persistence works
// when the database is unreachable (observed from the VPS, 2026-10-03). A row lives in exactly ONE place (DB or file) and reads merge both.
// Tables are created here with IF NOT EXISTS (no edit to db.js). Nothing is ever updated or deleted: relationships are identified once and each
// admission or change is a new, immutable version.
//
//   canonical_relationship          one row per relationship IDENTITY (identity_key is the deterministic sameness key; relationship_id is stable)
//   canonical_relationship_version  append-only: predicate, nu_state, evidence (provenance), labels, meta, event time, capture time, version number
//   analytical_snapshot             one row per analytical snapshot: query, subject, lookup states, the relationship set it froze, the pinned temporal result
//   counterparty_match              the last matching outcome per counterparty name (a cache with its retrieval time)
//
// captured_at is always capture time (when KRYLO observed it), never a filing date; event_ts carries the source's own date.
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './db.js';

let FILE = process.env.KRYLO_CANONICAL_STORE_FILE ?? fileURLToPath(new URL('./data/canonical_store.jsonl', import.meta.url));
let _usePool = true;
/** Tests: use a given file and never the database. */
export function _useFileOnly(path) { FILE = path; _usePool = false; }
const logFallback = (op, err) => console.error(`[canonical-store] ${op}: DB unavailable (${err?.code ?? 'error'}) -- using file fallback`);   // the failure class only: a pg message can carry host text

// A database that does not answer must never stall a read or a write: every query is capped, and after a failure the DB is skipped for a minute
// (circuit breaker), so the file fallback answers at once. (A first ECONNREFUSED can otherwise take seconds.)
const DB_CAP_MS = 2000, DB_DOWN_MS = 60_000;
let _dbDownUntil = 0;
const q = (...args) => Promise.race([
  pool.query(...args),
  new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('db timeout'), { code: 'DB_TIMEOUT' })), DB_CAP_MS)),
]).catch((err) => { _dbDownUntil = Date.now() + DB_DOWN_MS; throw err; });

let _tablesReady = null;
async function ensureTables() {
  if (!pool || !_usePool || Date.now() < _dbDownUntil) return false;
  if (_tablesReady == null) {
    _tablesReady = q(`
      CREATE TABLE IF NOT EXISTS canonical_relationship (
        identity_key TEXT PRIMARY KEY, relationship_id TEXT NOT NULL UNIQUE, type TEXT NOT NULL, phi_class TEXT NOT NULL,
        part JSONB NOT NULL, nu_id JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS canonical_relationship_version (
        id SERIAL PRIMARY KEY, relationship_id TEXT NOT NULL, version INT NOT NULL, predicate TEXT NOT NULL,
        nu_state JSONB NOT NULL DEFAULT '{}', evidence JSONB NOT NULL, labels JSONB, meta JSONB,
        event_ts TIMESTAMPTZ, captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (relationship_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_canonical_version_rel ON canonical_relationship_version (relationship_id, version DESC);
      CREATE INDEX IF NOT EXISTS idx_canonical_relationship_part ON canonical_relationship USING GIN (part);
      CREATE TABLE IF NOT EXISTS analytical_snapshot (
        id TEXT PRIMARY KEY, query TEXT, canonical_id TEXT, generated_at TIMESTAMPTZ, lookups JSONB, relationship_refs JSONB,
        change JSONB, refresh_of TEXT, captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS counterparty_match (
        name_key TEXT PRIMARY KEY, outcome JSONB NOT NULL, retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`).then(() => true).catch((err) => { logFallback('create tables', err); return false; });
  }
  return _tablesReady;
}

// ── file fallback ──────────────────────────────────────────────────────────────
function fileRows() {
  if (!existsSync(FILE)) return [];
  const out = [];
  for (const line of readFileSync(FILE, 'utf8').split('\n')) { if (!line) continue; try { out.push(JSON.parse(line)); } catch { /* a torn line is skipped */ } }
  return out;
}
function appendFile(row) {
  const dir = dirname(FILE); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(FILE, JSON.stringify(row) + '\n');
}

// ── relationships ──────────────────────────────────────────────────────────────
const sameEvidence = (a, b) => JSON.stringify(a?.provenance?.accession ?? null) === JSON.stringify(b?.provenance?.accession ?? null)
  && JSON.stringify(a?.provenance?.observation?.cusip ?? null) === JSON.stringify(b?.provenance?.observation?.cusip ?? null)
  && JSON.stringify(a?.provenance?.nuIdEvent ?? null) === JSON.stringify(b?.provenance?.nuIdEvent ?? null);

/** All stored relationship rows and versions, merged from the DB and the file. */
async function loadAll({ nodes = null } = {}) {
  const rels = new Map(), vers = [];
  if (await ensureTables()) {
    try {
      const r = nodes?.length
        ? await q('SELECT * FROM canonical_relationship WHERE part ?| $1', [nodes])
        : await q('SELECT * FROM canonical_relationship');
      for (const row of r.rows) rels.set(row.identity_key, { identity_key: row.identity_key, relationship_id: row.relationship_id, type: row.type, phi_class: row.phi_class, part: row.part, nu_id: row.nu_id });
      if (rels.size) {
        const ids = [...rels.values()].map(x => x.relationship_id);
        const v = await q('SELECT * FROM canonical_relationship_version WHERE relationship_id = ANY($1) ORDER BY relationship_id, version', [ids]);
        for (const row of v.rows) vers.push({ ...row, event_ts: row.event_ts?.toISOString?.() ?? row.event_ts, captured_at: row.captured_at?.toISOString?.() ?? row.captured_at });
      }
    } catch (err) { logFallback('read', err); }
  }
  for (const row of fileRows()) {
    if (row._t === 'rel' && !rels.has(row.identity_key) && (!nodes?.length || row.part?.some(p => nodes.includes(p)))) rels.set(row.identity_key, row);
    else if (row._t === 'ver') vers.push(row);
  }
  return { rels, vers };
}

/**
 * Persist one admission: identify the relationship (stable id per identity_key) and append a version unless the latest version already
 * records the same evidence (idempotent: re-analysing the same filing does not create versions).
 * item = { identity_key, type, phi_class, part, nu_id, predicate, nu_state, evidence, labels, meta, event_ts }
 */
export async function writeAdmission(item) {
  if (!item?.identity_key || !item.type || !Array.isArray(item.part) || !item.evidence) throw new Error('identity_key, type, part and evidence are required');
  const { rels, vers } = await loadAll({ nodes: item.part });
  let rel = rels.get(item.identity_key); let created = false; let where = 'file';
  if (!rel) { rel = { identity_key: item.identity_key, relationship_id: randomUUID(), type: item.type, phi_class: item.phi_class, part: item.part, nu_id: item.nu_id ?? {} }; created = true; }
  const mine = vers.filter(v => v.relationship_id === rel.relationship_id).sort((a, b) => a.version - b.version);
  const last = mine[mine.length - 1];
  // Idempotent on the EVIDENCE: a version that already records this evidence (same filing, same observation, same state) is the answer, whatever
  // order it arrives in and whatever predicate the in-memory store computed (a re-analysis sees the same evidence as PERSISTENT, not NEW).
  const dup = mine.find(v => sameEvidence(v.evidence, item.evidence) && JSON.stringify(v.nu_state ?? {}) === JSON.stringify(item.nu_state ?? {}));
  if (dup) return { relationship_id: rel.relationship_id, version: dup.version, written: false, created: false };
  const version = (last?.version ?? 0) + 1;
  const row = { relationship_id: rel.relationship_id, version, predicate: item.predicate, nu_state: item.nu_state ?? {}, evidence: item.evidence, labels: item.labels ?? null, meta: item.meta ?? null, event_ts: item.event_ts ?? null };
  if (await ensureTables()) {
    try {
      if (created) await q('INSERT INTO canonical_relationship (identity_key, relationship_id, type, phi_class, part, nu_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (identity_key) DO NOTHING', [rel.identity_key, rel.relationship_id, rel.type, rel.phi_class, JSON.stringify(rel.part), JSON.stringify(rel.nu_id)]);
      await q('INSERT INTO canonical_relationship_version (relationship_id, version, predicate, nu_state, evidence, labels, meta, event_ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (relationship_id, version) DO NOTHING',
        [row.relationship_id, row.version, row.predicate, JSON.stringify(row.nu_state), JSON.stringify(row.evidence), JSON.stringify(row.labels), JSON.stringify(row.meta), row.event_ts]);
      where = 'db';
    } catch (err) { logFallback('write', err); where = 'file'; }
  }
  if (where === 'file') {
    if (created) appendFile({ _t: 'rel', ...rel, created_at: new Date().toISOString() });
    appendFile({ _t: 'ver', ...row, captured_at: new Date().toISOString() });
  }
  return { relationship_id: rel.relationship_id, version, written: true, created, persisted_in: where };
}

/** Relationships touching any of the given node ids, each with all its versions, oldest first. */
export async function relationshipsForNodes(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return [];
  const { rels, vers } = await loadAll({ nodes });
  const out = [];
  for (const rel of rels.values()) {
    if (!rel.part?.some(p => nodes.includes(p))) continue;
    const versions = vers.filter(v => v.relationship_id === rel.relationship_id).sort((a, b) => a.version - b.version)
      .filter((v, i, a) => a.findIndex(x => x.version === v.version) === i);
    out.push({ ...rel, versions });
  }
  return out;
}

// ── snapshots ──────────────────────────────────────────────────────────────────
export async function writeSnapshot(s) {
  if (!s?.id) throw new Error('snapshot id required');
  const row = { id: s.id, query: s.query ?? null, canonical_id: s.canonical_id ?? null, generated_at: s.generated_at ?? null, lookups: s.lookups ?? [], relationship_refs: s.relationship_refs ?? [], change: s.change ?? null, refresh_of: s.refresh_of ?? null };
  if (await ensureTables()) {
    try {
      await q(`INSERT INTO analytical_snapshot (id, query, canonical_id, generated_at, lookups, relationship_refs, change, refresh_of) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET change = EXCLUDED.change, lookups = EXCLUDED.lookups, relationship_refs = EXCLUDED.relationship_refs, updated_at = NOW()`,
        [row.id, row.query, row.canonical_id, row.generated_at, JSON.stringify(row.lookups), JSON.stringify(row.relationship_refs), JSON.stringify(row.change), row.refresh_of]);
      return { persisted_in: 'db' };
    } catch (err) { logFallback('snapshot write', err); }
  }
  appendFile({ _t: 'snap', ...row, captured_at: new Date().toISOString() });
  return { persisted_in: 'file' };
}
export async function snapshotsFor(canonicalId, limit = 50) {
  const out = new Map();
  if (await ensureTables()) {
    try { const r = await q('SELECT * FROM analytical_snapshot WHERE canonical_id = $1 ORDER BY generated_at DESC LIMIT $2', [canonicalId, limit]); for (const x of r.rows) out.set(x.id, { ...x, generated_at: x.generated_at?.toISOString?.() ?? x.generated_at }); }
    catch (err) { logFallback('snapshot read', err); }
  }
  for (const row of fileRows()) if (row._t === 'snap' && row.canonical_id === canonicalId) out.set(row.id, { ...(out.get(row.id) ?? {}), ...row });   // a later row for the same id carries the later state (the pinned change)
  return [...out.values()].sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at))).slice(0, limit);
}

// ── counterparty match cache ───────────────────────────────────────────────────
export async function writeMatch(nameKey, outcome) {
  if (!nameKey || !outcome) throw new Error('name_key and outcome required');
  if (await ensureTables()) {
    try { await q('INSERT INTO counterparty_match (name_key, outcome) VALUES ($1,$2) ON CONFLICT (name_key) DO UPDATE SET outcome = EXCLUDED.outcome, retrieved_at = NOW()', [nameKey, JSON.stringify(outcome)]); return { persisted_in: 'db' }; }
    catch (err) { logFallback('match write', err); }
  }
  appendFile({ _t: 'match', name_key: nameKey, outcome, retrieved_at: new Date().toISOString() });
  return { persisted_in: 'file' };
}
export async function readMatch(nameKey) {
  let best = null;
  if (await ensureTables()) {
    try { const r = await q('SELECT outcome, retrieved_at FROM counterparty_match WHERE name_key = $1', [nameKey]); if (r.rows[0]) best = { outcome: r.rows[0].outcome, retrieved_at: r.rows[0].retrieved_at?.toISOString?.() ?? r.rows[0].retrieved_at }; }
    catch (err) { logFallback('match read', err); }
  }
  for (const row of fileRows()) if (row._t === 'match' && row.name_key === nameKey && (!best || String(row.retrieved_at) > String(best.retrieved_at))) best = { outcome: row.outcome, retrieved_at: row.retrieved_at };
  return best;
}
