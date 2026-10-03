// as-diff/engine.js
// WO-1041 — Middleware: CORS + JSON body parsing
// WO-1042 — Network Anchor: fixed port 4000
// WO-1043 — Funnel Tiering: separation of concerns (each route is a named handler)
// Run: node as-diff/engine.js

import http  from 'http';
import https from 'https';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { randomUUID, createSign } from 'crypto';
import { fileURLToPath } from 'url';
import { compareSignals } from '../src/engine/asdiff.js';
import { pool, migrate } from './db.js';
import { lastFormationState, writeFormationState, formationStateHistory, formationStateHistoryBySubject } from './formationstatestore.js';
import { decideWrite } from '../src/engine/formationsnapshot.js';
import { computeFsStar, computeDFC, reconcile } from '../src/engine/timingproxy.js';
import { evaluateVendorPortfolio, MAX_PORTFOLIO_SIZE } from '../src/engine/vendorportfolioview.js';

// WO-1042 — fixed port, no override
const PORT = 4000;

// Supplier Structural Intelligence (specs/SPEC-external-supplier-structural-intelligence.md) --
// secownershipconnector.js's searchOwnershipFilings() calls fetch('/api/edgar?...') with a
// browser-relative URL (correct in that context -- the Vite dev proxy resolves it against the
// page origin). This server process IS that origin's backing API, so a relative fetch here has
// no base to resolve against and throws. Rewriting only '/api/'-prefixed relative calls to this
// same server's own address -- additive, does not touch any existing https.request-based proxy
// handler in this file (none of them use fetch()).
const _realFetch = globalThis.fetch;
globalThis.fetch = (fetchTarget, opts) => {
  const abs = typeof fetchTarget === 'string' && fetchTarget.startsWith('/api/') ? `http://localhost:${PORT}${fetchTarget}` : fetchTarget;
  return _realFetch(abs, opts);
};

// WO-2019 — Maersk Consumer Key (env var preferred; falls back to specs/maersk.env)
const MAERSK_KEY = process.env.MAERSK_CONSUMER_KEY ||
  (existsSync('./specs/maersk.env') ? readFileSync('./specs/maersk.env', 'utf8').trim() : '');

// WO-2039 — data.gov API key (covers FDA, FEC, Census — env var preferred; falls back to specs/data_gov.env)
const DATA_GOV_KEY = process.env.DATA_GOV_API_KEY ||
  (existsSync('./specs/data_gov.env') ? readFileSync('./specs/data_gov.env', 'utf8').trim() : '');

// KRYL-969 Phase 1 — Companies House key (env var preferred; falls back to specs/companies_house.env)
const COMPANIES_HOUSE_KEY = process.env.COMPANIES_HOUSE_API_KEY ||
  (existsSync('./specs/companies_house.env') ? readFileSync('./specs/companies_house.env', 'utf8').trim() : '');

// ── Proxy response cache ──────────────────────────────────────────────────────
// TTL matched to hook poll intervals: FRED = 5min, EDGAR = 15min.
// Prevents redundant upstream calls when multiple clients poll simultaneously.
const PROXY_CACHE     = new Map();
const FRED_TTL_MS     = 300_000;
const EDGAR_TTL_MS    = 900_000;
const FINNHUB_TTL_MS  = 30_000;  // 30s — matches daemon polling interval
const KALSHI_TTL_MS   = 300_000; // 5 min — prevents 429 on simultaneous polls
const EIA_TTL_MS      = 3_600_000; // 1h — WPSR releases weekly, no need to re-fetch often
const PATENTSVIEW_TTL_MS = 3_600_000; // 1h — PatentsView data is weekly/monthly, not live (connector's own comment)
const FUEL_CACHE_TTL_MS = 24 * 3_600_000; // 24h — Gas Go regional/per-station prices, dedicated TTL
// WO-2019 — Service API connector TTLs
const GITHUB_TTL_MS   =   900_000; // 15 min
const ARXIV_TTL_MS    = 3_600_000; // 1h
const NPM_TTL_MS      = 3_600_000; // 1h
const PUBMED_TTL_MS   = 3_600_000; // 1h
const OPENALEX_TTL_MS = 3_600_000; // 1h
const BLS_TTL_MS      = 3_600_000; // 1h
const USAJOBS_TTL_MS  = 1_800_000; // 30 min
const TREASURY_TTL_MS = 3_600_000; // 1h
const WORLDBANK_TTL_MS = 86_400_000; // 24h — annual data
const GDELT_DOC_TTL_MS =   900_000; // 15 min
const REDDIT_TTL_MS   =   900_000; // 15 min
const FHFA_TTL_MS     = 86_400_000; // 24h — quarterly data
const USGS_TTL_MS     =   900_000; // 15 min
const MAERSK_TTL_MS   = 3_600_000; // 1h — vessel schedules update infrequently
// WO-2040 — USASpending
const USASPENDING_TTL_MS = 86_400_000; // 24h — obligation data posts daily; no need to re-fetch more often
// WO-2039 — Federal Signal Trio TTLs
const FDA_TTL_MS      = 86_400_000; // 24h — approval counts change daily at most
const FEC_TTL_MS      = 3_600_000;  // 1h
const CENSUS_TTL_MS   = 86_400_000; // 24h — ACS annual data, no point re-fetching often
// KRYL-969 Phase 1 — Narrative Snapshot Capture (Wayback Machine)
const WAYBACK_TTL_MS  = 2_592_000_000; // 30d — archived captures are immutable, safe to cache long
// KRYL-969 Phase 1 — EDGAR filing document fetch (distinct from existing efts.sec.gov search-index proxy)
const EDGAR_DOC_TTL_MS = 2_592_000_000; // 30d — filed documents never change once filed
// KRYL-969 Phase 1 — Companies House
const COMPANIES_HOUSE_TTL_MS  = 86_400_000; // 24h — profile/filings don't change intraday

function getCached(key, ttlMs) {
  const entry = PROXY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) { PROXY_CACHE.delete(key); return null; }
  return entry;
}

function setCached(key, statusCode, body) {
  if (statusCode >= 400) return; // don't cache failures — let the next request retry upstream instead of replaying a stale error for the full TTL
  PROXY_CACHE.set(key, { statusCode, body, ts: Date.now() });
}

// ── WO-1041: Middleware ───────────────────────────────────────────────────────

function applyCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// Minimal internal admin page (2026-10-02) -- a real page instead of hand-built curl/browser
// URLs for checking tester telemetry / guest state. The admin key is typed into this page once
// (kept in sessionStorage, this tab only) and sent from the browser straight to the existing
// GET /api/tester-telemetry and /api/guest-state read endpoints -- same auth gate as before,
// just a form instead of a hand-built URL. No new privilege, no new exposure surface.
async function handleAdminPage(req, res) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KRYLO Admin</title>
<style>
  body { font-family: 'IBM Plex Mono', monospace; background: #0a0a0a; color: #e0e0dc; padding: 24px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 15px; letter-spacing: 0.1em; color: #66FF00; font-weight: 400; }
  label { display: block; font-size: 11px; color: #888; margin: 14px 0 4px; }
  input, select { width: 100%; box-sizing: border-box; background: #141414; border: 1px solid #333; color: #e0e0dc; padding: 8px; font-family: inherit; font-size: 13px; }
  button { margin-top: 16px; background: #66FF00; color: #0a0a0a; border: none; padding: 10px 18px; font-family: inherit; font-size: 12px; letter-spacing: 0.05em; cursor: pointer; }
  button:hover { opacity: 0.85; }
  #results { margin-top: 24px; white-space: pre-wrap; font-size: 11px; line-height: 1.5; border-top: 1px solid #222; padding-top: 16px; }
  .row { border-bottom: 1px solid #1a1a1a; padding: 8px 0; }
  .meta { color: #666; font-size: 10px; }
  .err { color: #ff5555; }
</style></head>
<body>
  <h1>KRYLO ADMIN — GUEST ACTIVITY</h1>
  <label>Admin Key (kept only in this browser tab)</label>
  <input id="key" type="password" placeholder="ADMIN_KEY">
  <label>Query</label>
  <select id="source">
    <option value="tester-telemetry">Tester Telemetry (activity log)</option>
    <option value="guest-state">Guest State (saved work-product)</option>
  </select>
  <label>Profile ID (leave blank for all)</label>
  <input id="profileId" placeholder="e.g. TZ596FGX">
  <button onclick="run()">Run Query</button>
  <div id="results"></div>
<script>
  const keyEl = document.getElementById('key');
  keyEl.value = sessionStorage.getItem('krylo_admin_key') || '';
  keyEl.addEventListener('input', () => sessionStorage.setItem('krylo_admin_key', keyEl.value));

  async function run() {
    const key = keyEl.value.trim();
    const source = document.getElementById('source').value;
    const profileId = document.getElementById('profileId').value.trim();
    const out = document.getElementById('results');
    out.textContent = 'Loading...';
    if (!key) { out.innerHTML = '<span class="err">Admin key required.</span>'; return; }
    const params = new URLSearchParams({ key });
    if (profileId) params.set('profileId', profileId);
    try {
      const res = await fetch('/api/' + source + '?' + params.toString());
      const body = await res.json();
      if (!res.ok) { out.innerHTML = '<span class="err">' + (body.error || res.status) + '</span>'; return; }
      const rows = body.rows || [];
      if (rows.length === 0) { out.textContent = 'No rows.'; return; }
      out.innerHTML = rows.map(r => {
        if (source === 'tester-telemetry') {
          const p = r.payload || {};
          return '<div class="row"><div class="meta">' + (r.received_at || '') + ' · ' + r.profile_id + ' · ' + r.event_type + '</div>' +
                 '<div>' + JSON.stringify(p) + '</div></div>';
        }
        return '<div class="row"><div class="meta">' + (r.updated_at || r.updatedAt || '') + ' · ' + (r.profile_id || r.profileId) + ' · ' + (r.store_key || r.storeKey) + '</div>' +
               '<div>' + JSON.stringify(r.data) + '</div></div>';
      }).join('');
    } catch (e) {
      out.innerHTML = '<span class="err">' + e.message + '</span>';
    }
  }
</script>
</body></html>`;
  sendHtml(res, 200, html);
}

// ── WO-1043: Route handlers (funnel tiering) ─────────────────────────────────

async function handleCompare(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { unitA, unitB } = body;
  if (!unitA || !unitB) return send(res, 400, { error: 'unitA and unitB required' });

  try {
    const result = compareSignals(unitA, unitB);
    send(res, 200, result);
  } catch (err) {
    send(res, 500, { error: err.message });
  }
}

function handleHealth(_req, res) {
  send(res, 200, { status: 'ok', port: PORT, engine: 'as-diff', ts: new Date().toISOString() });
}

// ── WO-1334: Persistence handler ─────────────────────────────────────────────

async function handlePersistExecutionPlan(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { status: 'DB_WRITE_FAILED', error: 'Invalid JSON body' }); }

  const { header, payload, metadata } = body;
  if (!header?.plan_id || !payload?.execution_plan || !payload?.signature || !metadata?.commit_hash) {
    return send(res, 422, { status: 'DB_WRITE_FAILED', error: 'Missing required fields' });
  }

  if (!pool) {
    // No DB configured — return synthetic receipt for local dev
    return send(res, 201, {
      status:     'DB_WRITE_SUCCESS',
      receipt_id: randomUUID().replace(/-/g, ''),
      latency_ms: 0,
    });
  }

  const t0 = Date.now();
  try {
    await pool.query(
      `INSERT INTO execution_plans (plan_id, timestamp, version, payload, signature, source, commit_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plan_id) DO NOTHING`,
      [
        header.plan_id,
        header.timestamp,
        header.version,
        JSON.stringify(payload),
        payload.signature,
        metadata.source,
        metadata.commit_hash,
      ]
    );
    send(res, 201, {
      status:     'DB_WRITE_SUCCESS',
      receipt_id: randomUUID().replace(/-/g, ''),
      latency_ms: Date.now() - t0,
    });
  } catch (err) {
    console.error('[WO-1334] DB write failed:', err.message);
    send(res, 500, { status: 'DB_WRITE_FAILED', error: err.message });
  }
}

// ── Tester telemetry — centralized log (batched) ─────────────────────────────
// Client (src/engine/telemetry.js) still keeps its own localStorage copy;
// this endpoint mirrors each event server-side so tester activity survives
// past that one browser/device. Fire-and-forget from the client — a failed
// POST never blocks the UI, it just means that batch stays local-only.

// Pilot fallback (≤40 users) — Postgres (Supabase) is unreachable from this VPS (direct host is
// IPv6-only, VPS has no IPv6 route; pooler region unknown). Appends to a local JSONL file so
// telemetry isn't silently dropped while that's sorted out. Temporary, not a redesign of the
// Postgres path above, which stays the primary path whenever `pool` is set.
// fileURLToPath (not .pathname) -- .pathname percent-encodes special characters (e.g. a space
// in the repo's own path, "web apps"), which silently misdirected both this file and
// GUEST_STATE_FILE below to a nonexistent path on this machine. Invisible in production (no
// special characters in /opt/krylo-api), confirmed live locally while testing guest-state.
const TELEMETRY_FILE = fileURLToPath(new URL('./data/tester_telemetry.jsonl', import.meta.url));

function appendTelemetryFile(events) {
  const dir = TELEMETRY_FILE.slice(0, TELEMETRY_FILE.lastIndexOf('/'));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let written = 0;
  const lines = [];
  for (const ev of events) {
    if (!ev?.type || !ev?._emittedAt) continue;
    lines.push(JSON.stringify({
      id: randomUUID(),
      profile_id: ev.profileId ?? null,
      session_id: ev.sessionId ?? null,
      event_type: ev.type,
      payload: ev,
      emitted_at: new Date(ev._emittedAt).toISOString(),
      received_at: new Date().toISOString(),
    }));
    written++;
  }
  if (lines.length) {
    appendFileSync(TELEMETRY_FILE, lines.join('\n') + '\n');
  }
  return written;
}

function readTelemetryFile({ profileId, sessionId }) {
  if (!existsSync(TELEMETRY_FILE)) return [];
  const rows = readFileSync(TELEMETRY_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .filter((r) => !profileId || r.profile_id === profileId)
    .filter((r) => !sessionId || r.session_id === sessionId);
  rows.sort((a, b) => (a.received_at < b.received_at ? 1 : -1));
  return rows.slice(0, 500);
}

async function handleTesterTelemetry(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { status: 'DB_WRITE_FAILED', error: 'Invalid JSON body' }); }

  const events = Array.isArray(body?.events) ? body.events : null;
  if (!events || events.length === 0) {
    return send(res, 422, { status: 'DB_WRITE_FAILED', error: 'events[] required' });
  }

  if (!pool) {
    try {
      const written = appendTelemetryFile(events);
      return send(res, 201, { status: 'DB_WRITE_SUCCESS', written, note: 'file fallback (pilot)' });
    } catch (err) {
      console.error('[tester-telemetry] file write failed:', err.message);
      return send(res, 500, { status: 'DB_WRITE_FAILED', error: err.message });
    }
  }

  try {
    let written = 0;
    for (const ev of events) {
      if (!ev?.type || !ev?._emittedAt) continue;
      await pool.query(
        `INSERT INTO tester_telemetry (profile_id, session_id, event_type, payload, emitted_at)
         VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))`,
        [ev.profileId ?? null, ev.sessionId ?? null, ev.type, JSON.stringify(ev), ev._emittedAt]
      );
      written++;
    }
    send(res, 201, { status: 'DB_WRITE_SUCCESS', written });
  } catch (err) {
    console.error('[tester-telemetry] DB write failed, falling back to file:', err.message);
    try {
      const written = appendTelemetryFile(events);
      send(res, 201, { status: 'DB_WRITE_SUCCESS', written, note: 'file fallback (DB unreachable)' });
    } catch (fileErr) {
      console.error('[tester-telemetry] file fallback also failed:', fileErr.message);
      send(res, 500, { status: 'DB_WRITE_FAILED', error: fileErr.message });
    }
  }
}

// Guest State Durability (2026-10-02) -- server mirror for guest work-product previously saved
// only to browser localStorage. One upserted row per (profileId, storeKey). Same DB-with-
// file-fallback shape as tester-telemetry above, not a new design -- see db.js's guest_state
// table comment for why.
const GUEST_STATE_FILE = fileURLToPath(new URL('./data/guest_state.json', import.meta.url));

function readGuestStateFile() {
  if (!existsSync(GUEST_STATE_FILE)) return {};
  try { return JSON.parse(readFileSync(GUEST_STATE_FILE, 'utf8')); } catch { return {}; }
}

function writeGuestStateFileEntry(profileId, storeKey, data) {
  const dir = GUEST_STATE_FILE.slice(0, GUEST_STATE_FILE.lastIndexOf('/'));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const all = readGuestStateFile();
  all[`${profileId}::${storeKey}`] = { profileId, storeKey, data, updatedAt: new Date().toISOString() };
  writeFileSync(GUEST_STATE_FILE, JSON.stringify(all, null, 2));
}

// POST /api/vendor-portfolio -- Supplier Structural Intelligence Section 17 proof endpoint.
// Localhost proof only (not referenced by any production route or nginx config); runs the real
// vendor -> entity resolution -> live EDGAR observation -> canonical ρ -> supplier join path and
// returns the bounded portfolio view for vendor-portfolio-proof.html to render.
async function handleVendorPortfolio(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const vendors = body?.vendors;
  if (!Array.isArray(vendors)) return send(res, 422, { error: 'vendors must be an array' });
  if (vendors.length > MAX_PORTFOLIO_SIZE) {
    return send(res, 422, { error: `population of ${vendors.length} exceeds the bounded ceiling of ${MAX_PORTFOLIO_SIZE}` });
  }

  try {
    const results = await evaluateVendorPortfolio(vendors, body?.observationWindow);
    return send(res, 200, { results });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
}

async function handleGuestStateWrite(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { status: 'DB_WRITE_FAILED', error: 'Invalid JSON body' }); }

  const { profileId, storeKey, data } = body ?? {};
  if (!profileId || !storeKey || data === undefined) {
    return send(res, 422, { status: 'DB_WRITE_FAILED', error: 'profileId, storeKey, data required' });
  }

  if (!pool) {
    try {
      writeGuestStateFileEntry(profileId, storeKey, data);
      return send(res, 201, { status: 'DB_WRITE_SUCCESS', note: 'file fallback (pilot)' });
    } catch (err) {
      console.error('[guest-state] file write failed:', err.message);
      return send(res, 500, { status: 'DB_WRITE_FAILED', error: err.message });
    }
  }

  try {
    await pool.query(
      `INSERT INTO guest_state (profile_id, store_key, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (profile_id, store_key) DO UPDATE SET data = $3, updated_at = NOW()`,
      [profileId, storeKey, JSON.stringify(data)]
    );
    send(res, 201, { status: 'DB_WRITE_SUCCESS' });
  } catch (err) {
    console.error('[guest-state] DB write failed, falling back to file:', err.message);
    try {
      writeGuestStateFileEntry(profileId, storeKey, data);
      send(res, 201, { status: 'DB_WRITE_SUCCESS', note: 'file fallback (DB unreachable)' });
    } catch (fileErr) {
      console.error('[guest-state] file fallback also failed:', fileErr.message);
      send(res, 500, { status: 'DB_WRITE_FAILED', error: fileErr.message });
    }
  }
}

// GET /api/guest-state?profileId=t03&key=ADMIN_KEY — admin recovery read, same minimal
// ADMIN_KEY gate as tester-telemetry's read path (not a real auth system).
async function handleGuestStateRead(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || u.searchParams.get('key') !== adminKey) {
    return send(res, 403, { status: 'FORBIDDEN', error: 'missing or invalid key' });
  }
  const profileId = u.searchParams.get('profileId');
  const storeKey = u.searchParams.get('storeKey');

  if (!pool) {
    const all = readGuestStateFile();
    const rows = Object.values(all)
      .filter((r) => !profileId || r.profileId === profileId)
      .filter((r) => !storeKey || r.storeKey === storeKey);
    return send(res, 200, { status: 'DB_READ_SUCCESS', rows, note: 'file fallback (pilot)' });
  }
  try {
    const params = [];
    let sql = 'SELECT profile_id, store_key, data, updated_at FROM guest_state';
    const where = [];
    if (profileId) { params.push(profileId); where.push('profile_id = $' + params.length); }
    if (storeKey)  { params.push(storeKey);  where.push('store_key = $' + params.length); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY updated_at DESC LIMIT 500';
    const { rows } = await pool.query(sql, params);
    send(res, 200, { status: 'DB_READ_SUCCESS', rows });
  } catch (err) {
    console.error('[guest-state] DB read failed, falling back to file:', err.message);
    const all = readGuestStateFile();
    const rows = Object.values(all)
      .filter((r) => !profileId || r.profileId === profileId)
      .filter((r) => !storeKey || r.storeKey === storeKey);
    send(res, 200, { status: 'DB_READ_SUCCESS', rows, note: 'file fallback (DB unreachable)' });
  }
}

// GET /api/tester-telemetry?profileId=t03&key=ADMIN_KEY — read path, did not exist before
// today. Requires ADMIN_KEY (env var) as a query param so this isn't wide open to the public;
// this is a minimal gate, not a real auth system — do not treat it as one.
async function handleTesterTelemetryRead(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || u.searchParams.get('key') !== adminKey) {
    return send(res, 403, { status: 'FORBIDDEN', error: 'missing or invalid key' });
  }
  if (!pool) {
    const rows = readTelemetryFile({
      profileId: u.searchParams.get('profileId'),
      sessionId: u.searchParams.get('sessionId'),
    });
    return send(res, 200, { status: 'DB_READ_SUCCESS', rows, note: 'file fallback (pilot)' });
  }
  try {
    const params = [];
    let sql = 'SELECT id, profile_id, session_id, event_type, payload, emitted_at, received_at FROM tester_telemetry';
    const where = [];
    const profileId = u.searchParams.get('profileId');
    const sessionId = u.searchParams.get('sessionId');
    if (profileId) { params.push(profileId); where.push('profile_id = $' + params.length); }
    if (sessionId) { params.push(sessionId); where.push('session_id = $' + params.length); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY received_at DESC LIMIT 500';
    const { rows } = await pool.query(sql, params);
    send(res, 200, { status: 'DB_READ_SUCCESS', rows });
  } catch (err) {
    console.error('[tester-telemetry] DB read failed, falling back to file:', err.message);
    const rows = readTelemetryFile({
      profileId: u.searchParams.get('profileId'),
      sessionId: u.searchParams.get('sessionId'),
    });
    send(res, 200, { status: 'DB_READ_SUCCESS', rows, note: 'file fallback (DB unreachable)' });
  }
}

// ── KRYL-1334: Formation-State Persistence (automatic trigger) ──────────────
// POST /v1/formation-state — the material-change trigger from the ratified hybrid sampling
// policy (clock trigger is separate, unbuilt infrastructure -- not this endpoint). Client
// posts one candidate row per SUPPORTED relationship pair from a real query
// (formationsnapshot.js's buildCandidateRows(), computed client-side where structuralQuery
// actually lives); this endpoint looks up the last known state for that formation_id and
// applies decideWrite() -- the material-change decision is made HERE, server-side, because
// only the server knows the last persisted state. Fire-and-forget from the client, same as
// tester-telemetry above -- a failed POST never blocks the guest's query.
// One candidate through the single-write semantics: validate -> last known state -> decideWrite()
// -> persist. Shared by the single and the batch endpoint so the two can never diverge.
// No `if (!pool)` 503: formationstatestore.js falls back to a local file when the DB is missing or
// unreachable (KRYL-1334), so persistence no longer depends on the pool. captured_at is assigned
// by the store at write time (capture time) -- a caller can never supply it.
async function persistFormationCandidate(candidate) {
  if (!candidate?.formation_id || !candidate?.entity_a || !candidate?.entity_b || !candidate?.relationship_type) {
    return { code: 422, body: { status: 'DB_WRITE_FAILED', error: 'candidate.{formation_id,entity_a,entity_b,relationship_type} required' } };
  }
  try {
    const last = await lastFormationState(candidate.formation_id);
    const decision = decideWrite(candidate, last, 'material_change');
    if (!decision) return { code: 200, body: { status: 'NO_MATERIAL_CHANGE', written: false } };
    const written = await writeFormationState(decision);
    return { code: 201, body: { status: 'DB_WRITE_SUCCESS', written: true, id: written.id, capturedAt: written.captured_at } };
  } catch (err) {
    console.error('[formation-state] write failed:', err.message);
    return { code: 500, body: { status: 'DB_WRITE_FAILED', error: err.message } };
  }
}

async function handleFormationStateWrite(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { status: 'DB_WRITE_FAILED', error: 'Invalid JSON body' }); }

  const { code, body: out } = await persistFormationCandidate(body?.candidate);
  send(res, code, out);
}

// POST /v1/formation-state/batch -- many candidates, ONE request (KRYL-1334). Each candidate goes
// through persistFormationCandidate() sequentially, exactly as if posted alone: same validation,
// same decideWrite(), same store, same capture-time stamp. Sequential on purpose -- two candidates
// for the same formation_id in one batch must see each other's write. The ceiling mirrors
// secownershipconnector.js's MAX_HITS (100): one observation's admitted relationships always fit.
const FORMATION_BATCH_MAX = 100;
async function handleFormationStateBatchWrite(req, res) {
  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { status: 'DB_WRITE_FAILED', error: 'Invalid JSON body' }); }

  const candidates = body?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return send(res, 422, { status: 'DB_WRITE_FAILED', error: 'candidates must be a non-empty array' });
  }
  if (candidates.length > FORMATION_BATCH_MAX) {
    return send(res, 422, { status: 'DB_WRITE_FAILED', error: `${candidates.length} candidates exceeds the batch ceiling of ${FORMATION_BATCH_MAX}` });
  }

  const results = [];
  for (const candidate of candidates) {
    const { body: out } = await persistFormationCandidate(candidate);
    results.push({ formation_id: candidate?.formation_id ?? null, ...out });
  }
  send(res, 200, {
    status: 'BATCH_COMPLETE',
    received: results.length,
    written: results.filter(r => r.written).length,
    unchanged: results.filter(r => r.status === 'NO_MATERIAL_CHANGE').length,
    failed: results.filter(r => r.status === 'DB_WRITE_FAILED').length,
    results,
  });
}

// GET /v1/formation-state?formationId=... — full history for one formation, oldest first.
async function handleFormationStateRead(req, res) {
  // KRYL-1334 (2026-09-30) -- root cause of the scrubber not rendering: a GET to this exact URL,
  // made before this route existed, got nginx's SPA-fallback 200+index.html response, which the
  // browser cached (no Cache-Control header = cacheable by default). Every response from this
  // endpoint is time-sensitive persisted state, never meant to be cached.
  res.setHeader('Cache-Control', 'no-store');
  // No `if (!pool)` 503: reads merge the DB (when reachable) with the file fallback (KRYL-1334).
  const u = new URL(req.url, 'http://localhost');
  const formationId = u.searchParams.get('formationId');
  const subject = u.searchParams.get('subject'); // KRYL-1350: all formations of one resolved subject
  if (!formationId && !subject) return send(res, 422, { status: 'DB_READ_FAILED', error: 'formationId or subject required' });
  try {
    const rows = formationId ? await formationStateHistory(formationId) : await formationStateHistoryBySubject(subject);
    send(res, 200, { status: 'DB_READ_SUCCESS', rows });
  } catch (err) {
    console.error('[formation-state] read failed:', err.message);
    send(res, 500, { status: 'DB_READ_FAILED', error: err.message });
  }
}

// ── WO-1721: Kalshi Live Feed ─────────────────────────────────────────────────

const KALSHI_KEY  = process.env.KALSHI_API_KEY ?? '';
const KALSHI_PKEY = process.env.KALSHI_PRIVATE_KEY
  ? process.env.KALSHI_PRIVATE_KEY.replace(/\\n/g, '\n')
  : process.env.KALSHI_PRIVATE_KEY_FILE
    ? readFileSync(process.env.KALSHI_PRIVATE_KEY_FILE, 'utf8').trim()
    : '';

// Kalshi event category → KRYLO domain
const CATEGORY_DOMAIN = {
  'Economics':             'capital',
  'Financials':            'capital',
  'Crypto':                'capital',
  'Business':              'capital',
  'Science and Technology':'technology',
  'Elections':             'knowledge',
  'Politics':              'knowledge',
  'Law':                   'knowledge',
  'Geopolitics':           'knowledge',
  'Sports':                'media',
  'Entertainment':         'media',
  'News':                  'media',
  'Employment':            'labor',
  'Real Estate':           'ownership',
  'Housing':               'ownership',
};

function categoryToDomain(cat) {
  return CATEGORY_DOMAIN[cat] ?? null;
}

// Step 1: fetch all open events, build event_ticker → domain map
async function buildEventDomainMap() {
  const map = {};
  let cursor = null;
  for (let i = 0; i < 10; i++) {
    let qs = '?status=open&limit=100';
    if (cursor) qs += `&cursor=${encodeURIComponent(cursor)}`;
    const { events = [], cursor: next } = await kalshiGet('/trade-api/v2/events', qs);
    for (const ev of events) {
      const domain = categoryToDomain(ev.category);
      if (domain) map[ev.event_ticker] = domain;
    }
    cursor = next;
    if (!next || !events.length) break;
  }
  return map;
}

function kalshiSign(method, path) {
  const ts  = Date.now().toString();
  const msg = ts + method.toUpperCase() + path;
  const signer = createSign('SHA256');
  signer.update(msg);
  signer.end();
  const sig = signer.sign(KALSHI_PKEY, 'base64');
  return { ts, sig };
}

function kalshiGet(apiPath, qs = '') {
  return new Promise((resolve, reject) => {
    const { ts, sig } = kalshiSign('GET', apiPath);
    const req = https.request({
      hostname: 'api.elections.kalshi.com',
      path:     apiPath + qs,
      method:   'GET',
      headers: {
        'KALSHI-ACCESS-KEY':       KALSHI_KEY,
        'KALSHI-ACCESS-TIMESTAMP': ts,
        'KALSHI-ACCESS-SIGNATURE': sig,
        'Content-Type':            'application/json',
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Kalshi ${res.statusCode}: ${raw.slice(0, 200)}`));
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Kalshi: invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Step 2: paginate markets; caller passes eventDomainMap for domain lookup.
async function fetchKalshiMarkets(eventDomainMap) {
  const BASE_PATH = '/trade-api/v2/markets';
  const MAX_PAGES = 5;
  const DOMAINS_NEEDED = new Set(['capital','technology','knowledge','labor','media','ownership']);
  let cursor = null;
  let all = [];

  for (let i = 0; i < MAX_PAGES; i++) {
    let qs = '?status=open&limit=200';
    if (cursor) qs += `&cursor=${encodeURIComponent(cursor)}`;
    const { markets = [], cursor: next } = await kalshiGet(BASE_PATH, qs);
    all = all.concat(markets);
    const found = new Set(all.map(m => eventDomainMap[m.event_ticker]).filter(Boolean));
    if ([...DOMAINS_NEEDED].every(d => found.has(d))) break;
    cursor = next;
    if (!next || !markets.length) break;
  }
  return all;
}

async function handleKalshiSignals(req, res) {
  if (!KALSHI_KEY || !KALSHI_PKEY) {
    return send(res, 503, { error: 'KALSHI env not configured', signals: [] });
  }
  const cacheKey = 'kalshi:signals';
  const hit = getCached(cacheKey, KALSHI_TTL_MS);
  if (hit) return send(res, hit.statusCode, hit.body);
  try {
    const eventDomainMap = await buildEventDomainMap();
    const markets        = await fetchKalshiMarkets(eventDomainMap);
    const qs             = new URL(req.url, 'http://x').searchParams;
    const domainFilter   = qs.get('domain')?.toLowerCase() ?? null;

    const buckets = {};
    for (const m of markets) {
      const vol = parseFloat(m.volume_fp ?? '0');
      if (vol === 0) continue;                                   // skip illiquid
      const domain = eventDomainMap[m.event_ticker];
      if (!domain) continue;
      if (domainFilter && domain !== domainFilter) continue;
      if (!buckets[domain]) buckets[domain] = { scores: [], volumes: [] };
      const price = parseFloat(m.last_price_dollars ?? '0') * 100;
      buckets[domain].scores.push(Math.max(0, Math.min(100, price)));
      buckets[domain].volumes.push(vol);
    }

    const signals = Object.entries(buckets).map(([domain, { scores, volumes }]) => {
      const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
      const totVol = volumes.reduce((a, b) => a + b, 0);
      const conf   = parseFloat(Math.min(0.92, 0.40 + (totVol / 500_000) * 0.52).toFixed(2));
      return {
        id:         `kalshi-${domain}-${Date.now()}`,
        source:     'KALSHI',
        label:      `KALSHI_${domain.toUpperCase()}`,
        domain,
        signal:     Math.round(avg),
        confidence: conf,
        fs:         0.71,
        origin:     'KALSHI',
        ts:         Date.now(),
        zone:       'national',
      };
    });

    const payload = { signals, ts: Date.now(), source: 'KALSHI', markets: markets.length };
    setCached(cacheKey, 200, payload);
    send(res, 200, payload);
  } catch (err) {
    console.error('[KALSHI] fetch failed:', err.message);
    send(res, 500, { error: err.message, signals: [] });
  }
}

function handleNotFound(_req, res) {
  send(res, 404, { error: 'Not found' });
}

// ── WO-1768-A: YCID persistent state ─────────────────────────────────────────
const YCID_PATH = new URL('../runtime/ycid_state.json', import.meta.url).pathname;

function readYcid() {
  try { return JSON.parse(readFileSync(YCID_PATH, 'utf8')); }
  catch { return { count: 0, lastChecked: '', inverted: false }; }
}

function writeYcid(state) {
  try { writeFileSync(YCID_PATH, JSON.stringify(state, null, 2)); } catch {}
}

async function updateYcidFromFred() {
  const apiKey = process.env.VITE_FRED_API_KEY ?? process.env.FRED_API_KEY ?? '';
  if (!apiKey) return;
  try {
    const url  = `https://api.stlouisfed.org/fred/series/observations?series_id=T10Y2Y&api_key=${apiKey}&file_type=json&sort_order=desc&limit=3`;
    const data = await fetch(url).then(r => r.json());
    const obs  = (data.observations ?? []).filter(o => o.value !== '.');
    if (!obs.length) return;
    const raw      = parseFloat(obs[0].value);
    const today    = obs[0].date;
    const state    = readYcid();
    if (state.lastChecked === today) return; // already checked today
    state.lastChecked = today;
    if (raw < 0) { state.count++; state.inverted = true; }
    else         { state.count = 0; state.inverted = false; }
    writeYcid(state);
  } catch {}
}

// ── WO-1768-A: /v1/timing-proxy handler ──────────────────────────────────────
async function handleTimingProxy(_req, res) {
  const apiKey = process.env.VITE_FRED_API_KEY ?? process.env.FRED_API_KEY ?? '';
  if (!apiKey) {
    return send(res, 503, { error: 'UPSTREAM_DATA_UNAVAILABLE', missing: ['FRED_API_KEY'] });
  }

  const missing = [];
  let fsStar, dfcResult, ycidDays;

  try { fsStar = await computeFsStar(apiKey); }
  catch (e) {
    missing.push(e.message.includes('BAMLH0A0HYM2') ? 'BAMLH0A0HYM2' : 'M2V');
  }

  try { dfcResult = await computeDFC(); }
  catch { missing.push('EDGAR'); }

  try { ycidDays = readYcid().count; }
  catch { ycidDays = 0; }

  if (missing.length) {
    return send(res, 503, { error: 'UPSTREAM_DATA_UNAVAILABLE', missing });
  }

  const dfcStatus = dfcResult?.status ?? 'NORMAL';
  const result    = reconcile(fsStar, dfcStatus, ycidDays);

  send(res, 200, {
    fsStar:     parseFloat(fsStar.toFixed(4)),
    dfcStatus,
    ycidDays,
    action:     result.action,
    conviction: result.conviction,
    ts:         Date.now(),
  });
}

// ── FRED proxy — server-side fetch, cached ───────────────────────────────────
function handleFredProxy(req, res) {
  const apiKey = process.env.VITE_FRED_API_KEY ?? process.env.FRED_API_KEY ?? '';
  if (!apiKey) { send(res, 503, { error: 'FRED key not configured' }); return; }
  // Strip client-provided api_key — inject server-side key only
  const rawQs  = req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '';
  const params = new URLSearchParams(rawQs);
  params.set('api_key', apiKey);
  params.set('file_type', 'json');
  params.set('sort_order', 'desc');
  params.set('limit', '2');
  const qs  = '?' + params.toString();
  const key = 'fred:' + (params.get('series_id') ?? 'unknown');
  const hit = getCached(key, FRED_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const options = {
    hostname: 'api.stlouisfed.org',
    path:     '/fred/series/observations' + qs,
    method:   'GET',
    headers:  { 'Accept': 'application/json' },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'FRED upstream: ' + err.message }));
  proxy.end();
}

// ── PatentsView proxy — Search API, key server-side only. M7 producer's evidence source. ──
// The legacy api.patentsview.org (no auth, GET-shaped) was decommissioned — see
// patentsviewconnector.js's own comment. This targets the replacement Search API's documented
// convention (search.patentsview.org, POST, X-Api-Key header). Not verified against a live key
// this session (none exists yet, per the Founder) — if the exact host/path differs once a real
// key is available, this is the one place to correct it.
async function handlePatentsViewProxy(req, res) {
  const apiKey = process.env.PATENTSVIEW_API_KEY ?? process.env.VITE_PATENTSVIEW_API_KEY ?? '';
  if (!apiKey) { send(res, 503, { error: 'PatentsView key not configured' }); return; }

  let body;
  try { body = await parseBody(req); }
  catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : 'patent';
  const query    = body?.query ?? {};
  const payload  = JSON.stringify(query);

  const key = 'patentsview:' + endpoint + ':' + payload;
  const hit = getCached(key, PATENTSVIEW_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }

  const options = {
    hostname: 'search.patentsview.org',
    path:     `/api/v1/${endpoint}/`,
    method:   'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'X-Api-Key':    apiKey,
    },
  };
  const proxy = https.request(options, upstream => {
    let responseBody = '';
    upstream.on('data', chunk => { responseBody += chunk; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, responseBody);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(responseBody);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'PatentsView upstream: ' + err.message }));
  proxy.write(payload);
  proxy.end();
}

// ── Fuel proxy — Zyla per-station prices, key server-side only (Petro Locator) ──
// PAID. Repoint the path/host to the chosen per-station Zyla API on subscribe.
function handleFuelProxy(req, res) {
  const u    = new URL(req.url, 'http://localhost');
  const zip  = u.searchParams.get('zip');
  const type = u.searchParams.get('type') || 'regular';
  if (!zip) return send(res, 400, { error: 'MISSING_ZIP' });
  const apiKey = process.env.ZYLA_FUEL_KEY ?? '';
  if (!apiKey) return send(res, 503, { error: 'UPSTREAM_DATA_UNAVAILABLE', missing: ['ZYLA_FUEL_KEY'] });
  const cacheKey = `fuel:${zip}:${type}`;
  const hit = getCached(cacheKey, 6 * 3_600_000); // rates post daily — 6h TTL is plenty
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const options = {
    hostname: 'zylalabs.com',
    path:     `/api/4808/gas+price+locator+api/5997/get+pices?zip=${encodeURIComponent(zip)}&type=${encodeURIComponent(type)}`,
    method:   'GET',
    headers:  { 'Accept': 'application/json', 'Authorization': 'Bearer ' + apiKey },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      setCached(cacheKey, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body); // Zyla body only — the key is never echoed
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'FUEL upstream: ' + err.message }));
  proxy.end();
}

// ── EIA proxy — server-side fetch, cached (WO-1877) ──────────────────────────
function handleEiaProxy(req, res) {
  const qs  = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const key = 'eia:' + qs;
  const hit = getCached(key, EIA_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const apiKey  = process.env.EIA_API_KEY ?? '';
  const options = {
    hostname: 'api.eia.gov',
    path:     '/v2/petroleum/stoc/wstk/data/' + qs + (qs ? '&' : '?') + 'api_key=' + apiKey,
    method:   'GET',
    headers:  { 'Accept': 'application/json' },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'EIA upstream: ' + err.message }));
  proxy.end();
}

// ── EIA fuel-price proxy (KRYL-1027) — retail Gasoline & Diesel prices ────────
// Distinct dataset from the stocks proxy above (pri/gnd, not stoc/wstk).
// Strips the echoed api_key from EIA's response body before returning.
function handleEiaFuelProxy(req, res) {
  const qs  = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const key = 'eiafuel:' + qs;
  const hit = getCached(key, FUEL_CACHE_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const apiKey  = process.env.EIA_API_KEY ?? '';
  const options = {
    hostname: 'api.eia.gov',
    path:     '/v2/petroleum/pri/gnd/data/' + qs + (qs ? '&' : '?') + 'api_key=' + apiKey,
    method:   'GET',
    headers:  { 'Accept': 'application/json' },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      // EIA echoes the key in request.params.api_key — never let it reach the browser.
      const safe = body.replace(/"api_key":"[^"]*"/g, '"api_key":"[REDACTED]"');
      setCached(key, upstream.statusCode, safe);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(safe);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'EIA fuel upstream: ' + err.message }));
  proxy.end();
}

// ── Apify fuel-price proxy (johnvc/fuelprices Actor) — real per-station,
// GasBuddy-sourced retail prices via Apify's commercial extraction service (not our own
// scraper). Chosen 2026-07-31 after Zyla (no license) and direct GasBuddy scraping (403,
// anti-bot, confirmed via manual test) were both ruled out. Key server-side only, never echoed.
function fetchApify(search, fuel) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.APIFY_API_TOKEN ?? '';
    if (!apiKey) return reject(Object.assign(new Error('UPSTREAM_DATA_UNAVAILABLE: APIFY_API_TOKEN'), { status: 503 }));
    const runBody = JSON.stringify({ search, fuel: Number(fuel), lang: 'en', maxAge: 0 });
    const runReq = https.request({
      hostname: 'api.apify.com',
      path:     '/v2/acts/johnvc~fuelprices/runs?waitForFinish=60',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(runBody),
        'Authorization':  'Bearer ' + apiKey,
      },
    }, runRes => {
      let runOut = ''; runRes.on('data', c => runOut += c);
      runRes.on('end', () => {
        let datasetId = null;
        try { datasetId = JSON.parse(runOut)?.data?.defaultDatasetId ?? null; } catch {}
        if (!datasetId) return reject(Object.assign(new Error('APIFY_RUN_FAILED: ' + runOut.slice(0, 300)), { status: 502 }));
        const itemsReq = https.request({
          hostname: 'api.apify.com',
          path:     `/v2/datasets/${datasetId}/items?clean=true`,
          method:   'GET',
          headers:  { 'Authorization': 'Bearer ' + apiKey },
        }, itemsRes => {
          let itemsOut = ''; itemsRes.on('data', c => itemsOut += c);
          itemsRes.on('end', () => resolve({ statusCode: itemsRes.statusCode || 200, body: itemsOut }));
        });
        itemsReq.on('error', e => reject(Object.assign(new Error('APIFY_ITEMS upstream: ' + e.message), { status: 502 })));
        itemsReq.end();
      });
    });
    runReq.on('error', e => reject(Object.assign(new Error('APIFY_RUN upstream: ' + e.message), { status: 502 })));
    runReq.write(runBody);
    runReq.end();
  });
}

function handleFuelApifyProxy(req, res) {
  const u      = new URL(req.url, 'http://localhost');
  const search = u.searchParams.get('search') || u.searchParams.get('zip');
  const fuel   = u.searchParams.get('fuel') || '1';
  if (!search) return send(res, 400, { error: 'MISSING_SEARCH' });
  const cacheKey = `apify:${search}:${fuel}`;
  const hit = getCached(cacheKey, FUEL_CACHE_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  fetchApify(search, fuel)
    .then(({ statusCode, body }) => {
      setCached(cacheKey, statusCode, body);
      res.writeHead(statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    })
    .catch(e => send(res, e.status || 502, { error: e.message }));
}

// Daily 4AM pre-warm — whatever ZIP/fuel-type combos have ever been cached get refreshed
// proactively so the first real use of the day never pays the live-fetch wait (up to 60s
// for a cold Apify run). Self-maintaining: keeps warm whatever the app has actually queried
// before; a brand-new key still pays the wait on its first-ever use, same as today.
function msUntilNext4am() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}
async function prewarmFuelCache() {
  const keys = [...PROXY_CACHE.keys()].filter(k => k.startsWith('apify:') || k.startsWith('eiafuel:'));
  for (const key of keys) {
    try {
      if (key.startsWith('apify:')) {
        const [, search, fuel] = key.split(':');
        const { statusCode, body } = await fetchApify(search, fuel);
        setCached(key, statusCode, body);
      } else if (key.startsWith('eiafuel:')) {
        const qs = key.slice('eiafuel:'.length);
        const apiKey = process.env.EIA_API_KEY ?? '';
        if (!apiKey) continue;
        await new Promise((resolve) => {
          const proxy = https.request({
            hostname: 'api.eia.gov',
            path: '/v2/petroleum/pri/gnd/data/' + qs + (qs ? '&' : '?') + 'api_key=' + apiKey,
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }, upstream => {
            let body = ''; upstream.on('data', c => body += c);
            upstream.on('end', () => {
              const safe = body.replace(/"api_key":"[^"]*"/g, '"api_key":"[REDACTED]"');
              setCached(key, upstream.statusCode, safe);
              resolve();
            });
          });
          proxy.on('error', () => resolve());
          proxy.end();
        });
      }
    } catch (e) {
      console.log(`[Gas Go 4AM prewarm] failed for ${key}: ${e.message}`);
    }
  }
  console.log(`[Gas Go 4AM prewarm] refreshed ${keys.length} cached key(s)`);
}
setTimeout(function scheduleDaily4am() {
  prewarmFuelCache();
  setInterval(prewarmFuelCache, 24 * 60 * 60 * 1000);
}, msUntilNext4am());

// ── Finnhub proxy — server-side fetch, cached ────────────────────────────────
function handleFinnhubProxy(req, res) {
  const qs    = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const key   = 'finnhub:' + qs;
  const hit   = getCached(key, FINNHUB_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const options = {
    hostname: 'finnhub.io',
    path:     '/api/v1/quote' + qs,
    method:   'GET',
    headers:  { 'Accept': 'application/json' },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'Finnhub upstream: ' + err.message }));
  proxy.end();
}

// ── EDGAR proxy — server-side fetch, cached ──────────────────────────────────
function handleEdgarProxy(req, res) {
  const qs    = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const key   = 'edgar:' + qs;
  const hit   = getCached(key, EDGAR_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  const options = {
    hostname: 'efts.sec.gov',
    path:     '/LATEST/search-index' + qs,
    method:   'GET',
    headers:  { 'Accept': 'application/json', 'User-Agent': 'krylo-signal-engine/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', chunk => { body += chunk; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'EDGAR upstream: ' + err.message }));
  proxy.end();
}

// ── WO-2019: Service API proxy handlers ──────────────────────────────────────


function handleGithubProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'github:' + q;
  const hit = getCached(key, GITHUB_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.github.com',
    path: `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=30`,
    method: 'GET',
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'krylo/1.0', 'X-GitHub-Api-Version': '2022-11-28' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleArxivProxy(req, res) {
  const url   = new URL(req.url, 'http://localhost');
  const q     = url.searchParams.get('q') ?? '';
  const key   = 'arxiv:' + q;
  const hit   = getCached(key, ARXIV_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const now  = new Date();
  const end  = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ago  = new Date(now - 7 * 86_400_000).toISOString().slice(0, 10).replace(/-/g, '');
  const searchQ = encodeURIComponent(`all:${q} AND submittedDate:[${ago} TO ${end}]`);
  const options = {
    hostname: 'export.arxiv.org',
    path: `/api/query?search_query=${searchQ}&start=0&max_results=0`,
    method: 'GET', headers: { 'Accept': 'application/atom+xml', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      const match = body.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
      const count = parseInt(match?.[1] ?? '0', 10);
      const json  = JSON.stringify({ count });
      setCached(key, 200, json);
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(json);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleNpmProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'npm:' + q;
  const hit = getCached(key, NPM_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'registry.npmjs.org',
    path: `/-/v1/search?text=${encodeURIComponent(q)}&size=20`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handlePubmedProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'pubmed:' + q;
  const hit = getCached(key, PUBMED_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'eutils.ncbi.nlm.nih.gov',
    path: `/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&datetype=pdat&reldate=365&rettype=json&retmode=json`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleOpenAlexProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'openalex:' + q;
  const hit = getCached(key, OPENALEX_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.openalex.org',
    path: `/works?filter=title.search:${encodeURIComponent(q)},publication_year:%3E2023&per-page=25&select=cited_by_count`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0 (mailto:houzzco@gmail.com)' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleBlsProxy(req, res) {
  const key = 'bls:jolts-quit';
  const hit = getCached(key, BLS_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.bls.gov',
    path: '/publicAPI/v1/timeseries/data/JTS000000000000000QUR',
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleUsajobsProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'usajobs:' + q;
  const hit = getCached(key, USAJOBS_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const apiKey = process.env.USAJOBS_API_KEY ?? '';
  if (!apiKey) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ SearchResult: { SearchResultCount: 0 } })); return; }
  const options = {
    hostname: 'data.usajobs.gov',
    path: `/api/search?Keyword=${encodeURIComponent(q)}&ResultsPerPage=10`,
    method: 'GET',
    headers: { 'Authorization-Key': apiKey, 'Host': 'data.usajobs.gov', 'User-Agent': 'concec@krylo.org' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleTreasuryProxy(req, res) {
  const key = 'treasury:avg-rates';
  const hit = getCached(key, TREASURY_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const fields  = 'security_desc,avg_interest_rate_amt,record_date';
  const filter  = encodeURIComponent('security_desc:in:(Treasury Notes-10 Yr,Treasury Bills-2 Yr)');
  const options = {
    hostname: 'api.fiscaldata.treasury.gov',
    path: `/services/api/fiscal_service/v1/accounting/od/avg_interest_rates?fields=${fields}&filter=${filter}&sort=-record_date&page[size]=4`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleWorldBankProxy(req, res) {
  const key = 'worldbank:gdp-growth';
  const hit = getCached(key, WORLDBANK_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.worldbank.org',
    path: '/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrv=2',
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleGdeltDocProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'gdelt-doc:' + q;
  const hit = getCached(key, GDELT_DOC_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.gdeltproject.org',
    path: `/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=50&timespan=1d&format=json`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      try { JSON.parse(body); } catch { body = JSON.stringify({ articles: [] }); }
      setCached(key, 200, body);
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ articles: [] })); });
  proxy.end();
}

function handleRedditSearchProxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const q   = url.searchParams.get('q') ?? '';
  const key = 'reddit:' + q;
  const hit = getCached(key, REDDIT_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'www.reddit.com',
    path: `/search.json?q=${encodeURIComponent(q)}&sort=new&limit=25&t=day`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0 (by /u/krylo_signal)' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleFhfaProxy(req, res) {
  const url      = new URL(req.url, 'http://localhost');
  const seriesId = url.searchParams.get('series_id') ?? 'USSTHPI';
  const apiKey   = url.searchParams.get('api_key') ?? process.env.FRED_API_KEY ?? '';
  const key      = 'fhfa:' + seriesId;
  const hit      = getCached(key, FHFA_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const options = {
    hostname: 'api.stlouisfed.org',
    path: `/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=8&sort_order=desc`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleMaerskProxy(req, res) {
  const url    = new URL(req.url, 'http://localhost');
  const origin = url.searchParams.get('origin') ?? 'CNSHA'; // Shanghai default
  const dest   = url.searchParams.get('dest')   ?? 'USORF'; // Norfolk default
  const key    = `maersk:${origin}:${dest}`;
  const hit    = getCached(key, MAERSK_TTL_MS);
  if (hit) {
    res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
    res.end(hit.body);
    return;
  }
  if (!MAERSK_KEY) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sailings: [] }));
    return;
  }
  const options = {
    hostname: 'api.maersk.com',
    path: `/schedules/v1/pointToPoint?dateRange=P14D&originPortCode=${origin}&destinationPortCode=${dest}`,
    method: 'GET',
    headers: {
      'Consumer-Key': MAERSK_KEY,
      'Accept': 'application/json',
      'User-Agent': 'krylo/1.0',
    },
  };
  const proxy = https.request(options, upstream => {
    let body = '';
    upstream.on('data', c => { body += c; });
    upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message }));
  proxy.end();
}

function handleUsgsProxy(req, res) {
  const key = 'usgs:drought';
  const hit = getCached(key, USGS_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  // US Drought Monitor statistics — national weekly area percentages
  const today = new Date().toISOString().slice(0, 10);
  const ago   = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const options = {
    hostname: 'usdmdataservices.unl.edu',
    path: `/api/USStatistics/GetDroughtSeverityStatisticsByArea?aoi=0&startdate=${ago}&enddate=${today}&statisticsType=1`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

// ── WO-2046: USASpending Entity Award History ────────────────────────────────

const USASPENDING_ENTITY_TTL_MS = 3_600_000; // 1h — FY totals don't shift hour-to-hour

function handleUsaspendingEntityProxy(req, res) {
  const url  = new URL(req.url, 'http://localhost');
  const name = url.searchParams.get('name') ?? '';
  if (!name) { send(res, 400, { error: 'name required' }); return; }

  const key = `usaspending:entity:${name.toLowerCase()}`;
  const hit = getCached(key, USASPENDING_ENTITY_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }

  const payload = JSON.stringify({
    group: 'fiscal_year',
    filters: {
      time_period: [{ start_date: '2019-10-01', end_date: new Date().toISOString().slice(0, 10) }],
      recipient_search_text: [name],
    },
    subawards: false,
  });

  const options = {
    hostname: 'api.usaspending.gov',
    path: '/api/v2/search/spending_over_time/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Accept': 'application/json',
      'User-Agent': 'krylo/1.0',
    },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message }));
  proxy.write(payload);
  proxy.end();
}

// ── WO-2040: USASpending NAICS Capital Flow ──────────────────────────────────

function handleUsaspendingProxy(req, res) {
  const key = 'usaspending:naics:fy';
  const hit = getCached(key, USASPENDING_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }

  const now     = new Date();
  const fyStart = new Date(now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1, 9, 1);
  const startDate = fyStart.toISOString().slice(0, 10);
  const endDate   = now.toISOString().slice(0, 10);

  const payload = JSON.stringify({
    category: 'naics',
    filters: { time_period: [{ start_date: startDate, end_date: endDate }] },
    limit: 100,
    page: 1,
  });

  const options = {
    hostname: 'api.usaspending.gov',
    path: '/api/v2/search/spending_by_category/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Accept': 'application/json',
      'User-Agent': 'krylo/1.0',
    },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message }));
  proxy.write(payload);
  proxy.end();
}

// ── WO-2039: Federal Signal Trio ─────────────────────────────────────────────

function fdaDateRange() {
  const to   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const from = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10).replace(/-/g, '');
  return { from, to };
}

function handleFdaDrugsProxy(req, res) {
  const key = 'fda:drugs:90d';
  const hit = getCached(key, FDA_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const apiKey = DATA_GOV_KEY;
  const { from, to } = fdaDateRange();
  const search = encodeURIComponent(`submissions.submission_status:AP AND submissions.submission_status_date:[${from} TO ${to}]`);
  const keyParam = apiKey ? `&api_key=${apiKey}` : '';
  const options = {
    hostname: 'api.fda.gov',
    path: `/drug/drugsfda.json?search=${search}&limit=1${keyParam}`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleFdaDevicesProxy(req, res) {
  const key = 'fda:devices:90d';
  const hit = getCached(key, FDA_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const apiKey = DATA_GOV_KEY;
  const { from, to } = fdaDateRange();
  const search = encodeURIComponent(`decision_date:[${from} TO ${to}] AND decision_code:SESE`);
  const keyParam = apiKey ? `&api_key=${apiKey}` : '';
  const options = {
    hostname: 'api.fda.gov',
    path: `/device/510k.json?search=${search}&limit=1${keyParam}`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleFecProxy(req, res) {
  const key = 'fec:pac:totals';
  const hit = getCached(key, FEC_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const apiKey = DATA_GOV_KEY;
  if (!apiKey) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ pagination: { count: 0 } })); return; }
  const cycle = new Date().getFullYear() % 2 === 0 ? new Date().getFullYear() : new Date().getFullYear() + 1;
  const options = {
    hostname: 'api.open.fec.gov',
    path: `/v1/totals/pac/?api_key=${apiKey}&cycle=${cycle}&per_page=1&sort=-receipts`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

function handleCensusAcsProxy(req, res) {
  const key = 'census:acs:national';
  const hit = getCached(key, CENSUS_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  const apiKey = DATA_GOV_KEY;
  if (!apiKey) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify([[]])); return; }
  const vars = 'B19013_001E,B23025_003E,B23025_005E';
  const options = {
    hostname: 'api.census.gov',
    path: `/data/2023/acs/acs1?get=${vars}&for=us:1&key=${apiKey}`,
    method: 'GET', headers: { 'Accept': 'application/json', 'User-Agent': 'krylo/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: err.message })); proxy.end();
}

// KRYL-969 Phase 1 — Wayback Machine CDX proxy (list of captures for a domain)
// Free, unauthenticated, public API — archive.org/help/wayback_api.php
function handleWaybackCdxProxy(req, res) {
  const url  = new URL(req.url, 'http://localhost');
  const site = url.searchParams.get('url') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to   = url.searchParams.get('to') ?? '';
  const key  = 'wayback-cdx:' + site + ':' + from + ':' + to;
  const hit  = getCached(key, WAYBACK_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }

  const params = new URLSearchParams({ url: site, output: 'json' });
  if (from) params.set('from', from);
  if (to)   params.set('to', to);

  const options = {
    hostname: 'web.archive.org',
    path: `/cdx/search/cdx?${params}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'User-Agent': 'krylo-signal-engine/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'Wayback CDX upstream: ' + err.message }));
  proxy.end();
}

// KRYL-969 Phase 1 — Wayback Machine archived snapshot proxy (actual captured page)
// Returns the archived HTML/text verbatim — NOT JSON — caller extracts narrative text from it.
function handleWaybackSnapshotProxy(req, res) {
  const url       = new URL(req.url, 'http://localhost');
  const timestamp = url.searchParams.get('timestamp') ?? '';
  const site      = url.searchParams.get('url') ?? '';
  const key       = 'wayback-snapshot:' + timestamp + ':' + site;
  const hit       = getCached(key, WAYBACK_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'text/html', 'X-Cache': 'HIT' }); res.end(hit.body); return; }

  const options = {
    hostname: 'web.archive.org',
    path: `/web/${encodeURIComponent(timestamp)}/${site}`,
    method: 'GET',
    headers: { 'Accept': 'text/html', 'User-Agent': 'krylo-signal-engine/1.0' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'text/html', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'Wayback snapshot upstream: ' + err.message }));
  proxy.end();
}

// KRYL-969 Phase 1 — EDGAR filing document proxy (raw filing text, not the search index)
// efts.sec.gov (existing handleEdgarProxy) only returns search hits; the actual filed
// document lives on www.sec.gov/Archives and is not proxied elsewhere — CORS blocks a
// direct browser fetch, so this route exists solely to forward the document bytes.
function handleEdgarDocumentProxy(req, res) {
  const url       = new URL(req.url, 'http://localhost');
  const cik       = url.searchParams.get('cik') ?? '';
  const accession = url.searchParams.get('accession') ?? '';
  const file      = url.searchParams.get('file') ?? '';
  const key       = 'edgar-doc:' + cik + ':' + accession + ':' + file;
  const hit       = getCached(key, EDGAR_DOC_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'text/html', 'X-Cache': 'HIT' }); res.end(hit.body); return; }

  const options = {
    hostname: 'www.sec.gov',
    path: `/Archives/edgar/data/${encodeURIComponent(cik)}/${encodeURIComponent(accession)}/${file}`,
    method: 'GET',
    headers: { 'Accept': 'text/html', 'User-Agent': 'Krylo Signal Engine admin@krylo.org' },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'text/html', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'EDGAR document upstream: ' + err.message }));
  proxy.end();
}

// KRYL-969 Phase 1 — Companies House company profile (includes sic_codes — declared nature-of-business)
function handleCompaniesHouseProfileProxy(req, res) {
  const url           = new URL(req.url, 'http://localhost');
  const companyNumber = url.searchParams.get('companyNumber') ?? '';
  const key           = 'ch-profile:' + companyNumber;
  const hit           = getCached(key, COMPANIES_HOUSE_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  if (!COMPANIES_HOUSE_KEY) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({})); return; }

  const options = {
    // Test-type API keys (specs/companies_house.env is currently a Test key) only work
    // against the sandbox host — the production host rejects them with a clean 401.
    // Confirmed via Companies House's own docs, 2026-07-05. SANDBOX DATA IS SYNTHETIC —
    // real company numbers (e.g. Tesco PLC) will not resolve here. Swap to
    // 'api.company-information.service.gov.uk' once a Live application key exists.
    hostname: 'api-sandbox.company-information.service.gov.uk',
    path: `/company/${encodeURIComponent(companyNumber)}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'krylo-signal-engine/1.0',
      // Companies House auth: HTTP Basic, API key as username, blank password
      'Authorization': 'Basic ' + Buffer.from(COMPANIES_HOUSE_KEY + ':').toString('base64'),
    },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'Companies House upstream: ' + err.message }));
  proxy.end();
}

// KRYL-969 Phase 1 — Companies House filing history (links to accounts/strategic-report documents)
function handleCompaniesHouseFilingHistoryProxy(req, res) {
  const url           = new URL(req.url, 'http://localhost');
  const companyNumber = url.searchParams.get('companyNumber') ?? '';
  const key           = 'ch-filing-history:' + companyNumber;
  const hit           = getCached(key, COMPANIES_HOUSE_TTL_MS);
  if (hit) { res.writeHead(hit.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }); res.end(hit.body); return; }
  if (!COMPANIES_HOUSE_KEY) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ items: [] })); return; }

  const options = {
    // Test-type API keys (specs/companies_house.env is currently a Test key) only work
    // against the sandbox host — the production host rejects them with a clean 401.
    // Confirmed via Companies House's own docs, 2026-07-05. SANDBOX DATA IS SYNTHETIC —
    // real company numbers (e.g. Tesco PLC) will not resolve here. Swap to
    // 'api.company-information.service.gov.uk' once a Live application key exists.
    hostname: 'api-sandbox.company-information.service.gov.uk',
    path: `/company/${encodeURIComponent(companyNumber)}/filing-history`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'krylo-signal-engine/1.0',
      'Authorization': 'Basic ' + Buffer.from(COMPANIES_HOUSE_KEY + ':').toString('base64'),
    },
  };
  const proxy = https.request(options, upstream => {
    let body = ''; upstream.on('data', c => { body += c; }); upstream.on('end', () => {
      setCached(key, upstream.statusCode, body);
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }); res.end(body);
    });
  });
  proxy.on('error', err => send(res, 502, { error: 'Companies House upstream: ' + err.message }));
  proxy.end();
}

// ── WO-1043: Router ───────────────────────────────────────────────────────────

function routeRequest(req, res) {
  applyCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url?.split('?')[0];

  if (req.method === 'POST' && url === '/compare')                            return handleCompare(req, res);
  if (req.method === 'POST' && url === '/api/v1/persistence/execution-plan') return handlePersistExecutionPlan(req, res);
  if (req.method === 'POST' && url === '/api/tester-telemetry')              return handleTesterTelemetry(req, res);
  if (req.method === 'GET'  && url === '/api/tester-telemetry')              return handleTesterTelemetryRead(req, res);
  if (req.method === 'POST' && url === '/api/guest-state')                  return handleGuestStateWrite(req, res);
  if (req.method === 'POST' && url === '/api/vendor-portfolio')             return handleVendorPortfolio(req, res);
  if (req.method === 'GET'  && url === '/api/guest-state')                  return handleGuestStateRead(req, res);
  if (req.method === 'GET'  && url.startsWith('/admin'))                    return handleAdminPage(req, res);
  if (req.method === 'POST' && url === '/v1/formation-state')                return handleFormationStateWrite(req, res);
  if (req.method === 'POST' && url === '/v1/formation-state/batch')          return handleFormationStateBatchWrite(req, res);
  if (req.method === 'GET'  && url === '/v1/formation-state')                return handleFormationStateRead(req, res);
  if (req.method === 'GET'  && url === '/health')                            return handleHealth(req, res);
  if (req.method === 'GET'  && url === '/api/kalshi/signals')                return handleKalshiSignals(req, res);
  if (req.method === 'GET'  && url === '/api/eia')                           return handleEiaProxy(req, res);
  if (req.method === 'GET'  && url === '/api/eia-fuel')                      return handleEiaFuelProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fuel-apify')                    return handleFuelApifyProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fuel')                          return handleFuelProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fred')                          return handleFredProxy(req, res);
  if (req.method === 'GET'  && url === '/api/finnhub')                       return handleFinnhubProxy(req, res);
  if (req.method === 'GET'  && url === '/api/edgar')                         return handleEdgarProxy(req, res);
  if (req.method === 'POST' && url === '/api/patentsview')                   return handlePatentsViewProxy(req, res);
  if (req.method === 'GET'  && url === '/v1/timing-proxy')                   return handleTimingProxy(req, res);
  // WO-2019 — Service API connectors
  if (req.method === 'GET'  && url === '/api/github')                        return handleGithubProxy(req, res);
  if (req.method === 'GET'  && url === '/api/arxiv')                         return handleArxivProxy(req, res);
  if (req.method === 'GET'  && url === '/api/npm')                           return handleNpmProxy(req, res);
  if (req.method === 'GET'  && url === '/api/pubmed')                        return handlePubmedProxy(req, res);
  if (req.method === 'GET'  && url === '/api/openalex')                      return handleOpenAlexProxy(req, res);
  if (req.method === 'GET'  && url === '/api/bls')                           return handleBlsProxy(req, res);
  if (req.method === 'GET'  && url === '/api/usajobs')                       return handleUsajobsProxy(req, res);
  if (req.method === 'GET'  && url === '/api/treasury')                      return handleTreasuryProxy(req, res);
  if (req.method === 'GET'  && url === '/api/worldbank')                     return handleWorldBankProxy(req, res);
  if (req.method === 'GET'  && url === '/api/gdelt-doc')                     return handleGdeltDocProxy(req, res);
  if (req.method === 'GET'  && url === '/api/reddit-search')                 return handleRedditSearchProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fhfa')                          return handleFhfaProxy(req, res);
  if (req.method === 'GET'  && url === '/api/usgs')                          return handleUsgsProxy(req, res);
  if (req.method === 'GET'  && url === '/api/maersk')                        return handleMaerskProxy(req, res);
  // WO-2046 — USASpending entity award history
  if (req.method === 'GET'  && url === '/api/usaspending-entity')            return handleUsaspendingEntityProxy(req, res);
  // WO-2040 — USASpending
  if (req.method === 'GET'  && url === '/api/usaspending')                   return handleUsaspendingProxy(req, res);
  // WO-2039 — Federal Signal Trio
  if (req.method === 'GET'  && url === '/api/fda-drugs')                     return handleFdaDrugsProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fda-devices')                   return handleFdaDevicesProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fec')                           return handleFecProxy(req, res);
  if (req.method === 'GET'  && url === '/api/census-acs')                    return handleCensusAcsProxy(req, res);
  // KRYL-969 Phase 1 — Narrative Snapshot Capture
  if (req.method === 'GET'  && url === '/api/wayback-cdx')                   return handleWaybackCdxProxy(req, res);
  if (req.method === 'GET'  && url === '/api/wayback-snapshot')              return handleWaybackSnapshotProxy(req, res);
  if (req.method === 'GET'  && url === '/api/edgar-document')                return handleEdgarDocumentProxy(req, res);
  if (req.method === 'GET'  && url === '/api/companies-house-profile')       return handleCompaniesHouseProfileProxy(req, res);
  if (req.method === 'GET'  && url === '/api/companies-house-filing-history') return handleCompaniesHouseFilingHistoryProxy(req, res);
  handleNotFound(req, res);
}

// ── WO-1042: Network Anchor ───────────────────────────────────────────────────

const server = http.createServer(routeRequest);

server.listen(PORT, async () => {
  console.log(`[AS-DIFF] engine live on port ${PORT}`);
  await migrate();
  // WO-1768-A: YCID daily poll — update on startup then every 24h
  updateYcidFromFred();
  setInterval(updateYcidFromFred, 24 * 60 * 60 * 1000);
});
