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

// WO-2019 — Maersk Consumer Key (env var preferred; falls back to specs/maersk.env)
const MAERSK_KEY = process.env.MAERSK_CONSUMER_KEY ||
  (existsSync('./specs/maersk.env') ? readFileSync('./specs/maersk.env', 'utf8').trim() : '');

// WO-2039 — data.gov API key (covers FDA, FEC, Census — env var preferred; falls back to specs/data_gov.env)
const DATA_GOV_KEY = process.env.DATA_GOV_API_KEY ||
  (existsSync('./specs/data_gov.env') ? readFileSync('./specs/data_gov.env', 'utf8').trim() : '');

// ── Proxy response cache ──────────────────────────────────────────────────────
// TTL matched to hook poll intervals: FRED = 5min, EDGAR = 15min.
// Prevents redundant upstream calls when multiple clients poll simultaneously.
const PROXY_CACHE     = new Map();
const FRED_TTL_MS     = 300_000;
const EDGAR_TTL_MS    = 900_000;
const FINNHUB_TTL_MS  = 30_000;  // 30s — matches daemon polling interval
const KALSHI_TTL_MS   = 300_000; // 5 min — prevents 429 on simultaneous polls
const EIA_TTL_MS      = 3_600_000; // 1h — WPSR releases weekly, no need to re-fetch often
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
    path: `/works?filter=title.search:${encodeURIComponent(q)},publication_year:%3E%3D2024&per-page=25&select=cited_by_count`,
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
    headers: { 'Authorization-Key': apiKey, 'Host': 'data.usajobs.gov', 'User-Agent': 'houzzco@gmail.com' },
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
    path: `/v1/accounting/od/avg_interest_rates?fields=${fields}&filter=${filter}&sort=-record_date&page[size]=4`,
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

// ── WO-1043: Router ───────────────────────────────────────────────────────────

function routeRequest(req, res) {
  applyCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url?.split('?')[0];

  if (req.method === 'POST' && url === '/compare')                            return handleCompare(req, res);
  if (req.method === 'POST' && url === '/api/v1/persistence/execution-plan') return handlePersistExecutionPlan(req, res);
  if (req.method === 'GET'  && url === '/health')                            return handleHealth(req, res);
  if (req.method === 'GET'  && url === '/api/kalshi/signals')                return handleKalshiSignals(req, res);
  if (req.method === 'GET'  && url === '/api/eia')                           return handleEiaProxy(req, res);
  if (req.method === 'GET'  && url === '/api/fred')                          return handleFredProxy(req, res);
  if (req.method === 'GET'  && url === '/api/finnhub')                       return handleFinnhubProxy(req, res);
  if (req.method === 'GET'  && url === '/api/edgar')                         return handleEdgarProxy(req, res);
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
