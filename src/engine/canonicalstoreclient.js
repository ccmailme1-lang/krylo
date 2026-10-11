// canonicalstoreclient.js -- client of the durable Canonical Relationship Store (as-diff/canonicalstore.js, routes under /v1/canonical-store).
//   * a write-through sink on the single write path (canonicalrelationshipprojection.js admitAndProject): every admission becomes an immutable
//     version; the store dedupes re-analysis of the same evidence;
//   * hydrateFor(): loads a subject's stored relationships (with their stable ids and full version history) into the in-memory store BEFORE the
//     lookups run, so the first view of a subject already holds what earlier sessions established and re-admission is PERSISTENT, not NEW;
//   * persistSnapshot(): the analytical snapshot record (lookups, the relationship set it froze, the pinned temporal result);
//   * registryCache: the SEC registrant search result per counterparty name, with its retrieval time (event independent), so a name is searched
//     once and not on every analysis.
// Best effort by design: a failed write never blocks or alters an analysis; a failed read leaves the in-memory store as it was.
import { setAdmissionSink, restoreAdmitted } from './canonicalrelationshipprojection.js';

let _base = '';
let _fetch = (typeof fetch !== 'undefined' ? fetch : null);
const _enabled = () => !!_fetch && (_base !== '' || typeof window !== 'undefined');
/** Tests and scripts point the client at the engine and supply fetch; the browser uses same-origin relative URLs. */
export function configureStoreClient({ baseUrl = '', fetchImpl = null } = {}) { _base = baseUrl; if (fetchImpl) _fetch = fetchImpl; }

const nuIdKey = (nuId) => Object.keys(nuId ?? {}).sort().map(k => `${k}=${JSON.stringify(nuId[k])}`).join('|');
/** The deterministic sameness key of a relationship (canonicalrelationship.js sameRelationship: part set + type + phi class + nu_id). */
export const identityKeyOf = (rho) => `${[...rho.part].sort().join('|')}#${rho.type}#${rho.phiClass}#${nuIdKey(rho.nuId)}`;

// ── write-through ─────────────────────────────────────────────────────────────
let _queue = [], _timer = null, _inflight = null;
const FLUSH_MS = 400, BATCH = 100;
export const _storeStats = { sent: 0, failed: 0 };

function itemFrom({ rho, predicate, historyEntry, labels, meta }) {
  return {
    identity_key: identityKeyOf(rho), type: rho.type, phi_class: rho.phiClass, part: rho.part, nu_id: rho.nuId ?? {},
    predicate, nu_state: historyEntry?.nuState ?? rho.nuState ?? {},
    evidence: { provenance: historyEntry?.provenance ?? null, ts: historyEntry?.ts ?? null },
    labels, meta, event_ts: historyEntry?.ts ? new Date(historyEntry.ts).toISOString() : null,
  };
}
export async function flushStore() {
  if (_inflight) await _inflight;
  while (_queue.length && _enabled()) {
    const batch = _queue.splice(0, BATCH);
    _inflight = (async () => {
      try {
        const r = await _fetch(`${_base}/v1/canonical-store/admissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: batch }) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        _storeStats.sent += batch.length;
      } catch (e) { _storeStats.failed += batch.length; console.warn('[canonical-store] write failed (best effort):', String(e?.message ?? e).slice(0, 80)); }
    })();
    await _inflight; _inflight = null;
  }
}
const schedule = () => { if (_timer) return; _timer = setTimeout(() => { _timer = null; flushStore(); }, FLUSH_MS); };
let _installed = false;
/** Register the sink on the single write path (idempotent). */
export function installStoreSink() {
  if (_installed) return; _installed = true;
  setAdmissionSink((a) => { if (!_enabled()) return; _queue.push(itemFrom(a)); schedule(); });
}

// ── hydrate ───────────────────────────────────────────────────────────────────
/** Load the stored relationships touching these node ids into the in-memory store. Returns { restored, error }. */
export async function hydrateFor(nodeIds, { timeoutMs = 3000 } = {}) {
  if (!_enabled() || !nodeIds?.length) return { restored: 0, error: null };
  try {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    const r = await _fetch(`${_base}/v1/canonical-store/relationships?` + nodeIds.map(n => 'node=' + encodeURIComponent(n)).join('&'), { cache: 'no-store', signal: ctl?.signal });
    if (t) clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return { restored: restoreAdmitted(j.relationships ?? []), error: null };
  } catch (e) { return { restored: 0, error: String(e?.message ?? e).slice(0, 80) }; }
}

// ── snapshots ─────────────────────────────────────────────────────────────────
export function persistSnapshot(snapshot, relationshipRefs = []) {
  if (!_enabled() || !snapshot?.id) return Promise.resolve(false);
  const row = { id: snapshot.id, query: snapshot.query, canonical_id: snapshot.canonicalId, generated_at: new Date(snapshot.generatedAt).toISOString(), lookups: snapshot.lookups, relationship_refs: relationshipRefs, change: snapshot.change ?? null, refresh_of: snapshot.refreshOf ?? null };
  return _fetch(`${_base}/v1/canonical-store/snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot: row }) })
    .then(r => r.ok).catch(() => false);
}

// ── registrant search cache (counterparty matching) ───────────────────────────
const TTL_MS = 14 * 86_400_000;
const _mem = new Map();
export const registryCache = {
  async get(key) {
    const m = _mem.get(key); if (m) return m;
    if (!_enabled()) return null;
    try {
      const r = await _fetch(`${_base}/v1/canonical-store/match?name_key=${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json(); const hit = j.match;
      if (hit && Date.now() - Date.parse(hit.retrieved_at) < TTL_MS) { _mem.set(key, hit.outcome); return hit.outcome; }
    } catch { /* a cache miss is not an error */ }
    return null;
  },
  async put(key, value) {
    _mem.set(key, value);
    if (!_enabled()) return;
    try { await _fetch(`${_base}/v1/canonical-store/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_key: key, outcome: value }) }); } catch { /* best effort */ }
  },
};
