// as-diff/engine.js
// WO-1041 — Middleware: CORS + JSON body parsing
// WO-1042 — Network Anchor: fixed port 4000
// WO-1043 — Funnel Tiering: separation of concerns (each route is a named handler)
// Run: node as-diff/engine.js

import http  from 'http';
import https from 'https';
import { randomUUID, createSign } from 'crypto';
import { compareSignals } from '../src/engine/asdiff.js';
import { pool, migrate } from './db.js';

// WO-1042 — fixed port, no override
const PORT = 4000;

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

const KALSHI_KEY  = process.env.KALSHI_API_KEY     ?? '';
const KALSHI_PKEY = (process.env.KALSHI_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

const KALSHI_CATEGORY_MAP = {
  Economics: 'capital',  Finance: 'capital', Financials: 'capital',
  Crypto: 'capital',     Commodities: 'capital',
  Technology: 'technology',
  Science: 'knowledge',  Education: 'knowledge',
  Politics: 'knowledge', Policy: 'knowledge',
  Employment: 'labor',   Jobs: 'labor',
  Sports: 'media',       Entertainment: 'media', Media: 'media',
  'Real Estate': 'ownership', Housing: 'ownership',
};

function kalshiSign(method, path) {
  const ts  = Date.now().toString();
  const msg = ts + method.toUpperCase() + path;
  const signer = createSign('SHA256');
  signer.update(msg);
  signer.end();
  const sig = signer.sign(KALSHI_PKEY, 'base64');
  return { ts, sig };
}

function kalshiGet(apiPath) {
  return new Promise((resolve, reject) => {
    const { ts, sig } = kalshiSign('GET', apiPath);
    const req = https.request({
      hostname: 'trading-api.kalshi.com',
      path:     `${apiPath}?status=open&limit=200`,
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

async function handleKalshiSignals(req, res) {
  if (!KALSHI_KEY || !KALSHI_PKEY) {
    return send(res, 503, { error: 'KALSHI env not configured', signals: [] });
  }
  try {
    const { markets = [] } = await kalshiGet('/trade-api/v2/markets');
    const qs           = new URL(req.url, 'http://x').searchParams;
    const domainFilter = qs.get('domain')?.toLowerCase() ?? null;

    const buckets = {};
    for (const m of markets) {
      const domain = KALSHI_CATEGORY_MAP[m.category] ?? null;
      if (!domain) continue;
      if (domainFilter && domain !== domainFilter) continue;
      if (!buckets[domain]) buckets[domain] = { scores: [], volumes: [] };
      const price = m.last_price ?? m.yes_ask ?? 50;
      buckets[domain].scores.push(Math.max(0, Math.min(100, price)));
      buckets[domain].volumes.push(m.volume ?? 0);
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

// ── WO-1043: Router ───────────────────────────────────────────────────────────

function routeRequest(req, res) {
  applyCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url?.split('?')[0];

  if (req.method === 'POST' && url === '/compare')                            return handleCompare(req, res);
  if (req.method === 'POST' && url === '/api/v1/persistence/execution-plan') return handlePersistExecutionPlan(req, res);
  if (req.method === 'GET'  && url === '/health')                            return handleHealth(req, res);
  if (req.method === 'GET'  && url === '/api/kalshi/signals')                return handleKalshiSignals(req, res);
  handleNotFound(req, res);
}

// ── WO-1042: Network Anchor ───────────────────────────────────────────────────

const server = http.createServer(routeRequest);

server.listen(PORT, async () => {
  console.log(`[AS-DIFF] engine live on port ${PORT}`);
  await migrate();
});
