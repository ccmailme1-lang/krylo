// as-diff/engine.js
// WO-1041 — Middleware: CORS + JSON body parsing
// WO-1042 — Network Anchor: fixed port 4000
// WO-1043 — Funnel Tiering: separation of concerns (each route is a named handler)
// Run: node as-diff/engine.js

import http  from 'http';
import https from 'https';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID, createSign } from 'crypto';
import { compareSignals } from '../src/engine/asdiff.js';
import { pool, migrate } from './db.js';
import { computeFsStar, computeDFC, reconcile } from '../src/engine/timingproxy.js';

// WO-1042 — fixed port, no override
const PORT = 4000;

// ── Proxy response cache ──────────────────────────────────────────────────────
// TTL matched to hook poll intervals: FRED = 5min, EDGAR = 15min.
// Prevents redundant upstream calls when multiple clients poll simultaneously.
const PROXY_CACHE     = new Map();
const FRED_TTL_MS     = 300_000;
const EDGAR_TTL_MS    = 900_000;

function getCached(key, ttlMs) {
  const entry = PROXY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) { PROXY_CACHE.delete(key); return null; }
  return entry;
}

function setCached(key, statusCode, body) {
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

    send(res, 200, { signals, ts: Date.now(), source: 'KALSHI', markets: markets.length });
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
  const qs    = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const key   = 'fred:' + qs;
  const hit   = getCached(key, FRED_TTL_MS);
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

// ── WO-1043: Router ───────────────────────────────────────────────────────────

function routeRequest(req, res) {
  applyCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url?.split('?')[0];

  if (req.method === 'POST' && url === '/compare')                            return handleCompare(req, res);
  if (req.method === 'POST' && url === '/api/v1/persistence/execution-plan') return handlePersistExecutionPlan(req, res);
  if (req.method === 'GET'  && url === '/health')                            return handleHealth(req, res);
  if (req.method === 'GET'  && url === '/api/kalshi/signals')                return handleKalshiSignals(req, res);
  if (req.method === 'GET'  && url === '/api/fred')                          return handleFredProxy(req, res);
  if (req.method === 'GET'  && url === '/api/edgar')                         return handleEdgarProxy(req, res);
  if (req.method === 'GET'  && url === '/v1/timing-proxy')                   return handleTimingProxy(req, res);
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
