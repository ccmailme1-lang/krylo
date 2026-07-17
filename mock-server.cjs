// mock-server.cjs
// WO-249 — Mock Truth Engine API
// KRYL-300 — POST /api/ingest: ETR payload (id, telemetry, metadata), schema validation, 201 + id
// Location: repo root
// Run: node mock-server.cjs

const http = require('http');

// In-memory signal store — appended by /api/ingest
const ingestedSignals = [];

const mockRecords = (query) => [
  {
    id: 'etr-001',
    title: query,
    truth_statement: `${query} — signal one`,
    source_type: 'spine',
    signal_score: 0.73,
    fidelity_components: {
      m_checksum:  0.82,
      t_telemetry: 0.74,
      d_docs:      0.61,
      v_voice:     0.55,
      e_viral:     0.48,
    },
  },
  {
    id: 'etr-002',
    title: query,
    truth_statement: `${query} — signal two`,
    source_type: 'friction',
    signal_score: 0.68,
    fidelity_components: {
      m_checksum:  0.71,
      t_telemetry: 0.65,
      d_docs:      0.58,
      v_voice:     0.42,
      e_viral:     0.61,
    },
  },
  {
    id: 'etr-003',
    title: query,
    truth_statement: `${query} — signal three`,
    source_type: 'audit',
    signal_score: 0.91,
    fidelity_components: {
      m_checksum:  0.95,
      t_telemetry: 0.88,
      d_docs:      0.79,
      v_voice:     0.72,
      e_viral:     0.33,
    },
  },
];

// KRYL-1052 — NARRATIVE proxy (NewsAPI.ai / Event Registry). Key held server-side (env or
// specs/NEWS API.env), NEVER echoed to the client. Cached per-query (10 min TTL) to conserve
// the token quota. Returns { totalResults, source_refs }; any failure → 0 → producer withholds.
const erCache = new Map();          // q -> { ts, payload }
const ER_TTL  = 10 * 60 * 1000;     // 10 min

function erKey() {
  if (process.env.EVENTREGISTRY_KEY) return process.env.EVENTREGISTRY_KEY.trim();
  try {
    const raw = require('fs').readFileSync(require('path').join(__dirname, 'specs', 'NEWS API.env'), 'utf8');
    return (raw.match(/[0-9a-fA-F-]{36}/) || [])[0] || '';
  } catch { return ''; }
}

function fetchEventRegistry(q) {
  return new Promise(resolve => {
    const key = erKey();
    if (!key) return resolve({ totalResults: 0, source_refs: [] });
    const y = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const t = new Date().toISOString().slice(0, 10);
    const path = `/api/v1/article/getArticles?apiKey=${encodeURIComponent(key)}`
      + `&keyword=${encodeURIComponent(q)}&lang=eng&dateStart=${y}&dateEnd=${t}`
      + `&articlesCount=5&articlesSortBy=date&resultType=articles&dataType=news`;
    const preq = require('https').request({
      hostname: 'eventregistry.org', path, method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'krylo-narrative-facet/1.0' },
    }, up => {
      let b = ''; up.on('data', c => b += c);
      up.on('end', () => {
        try {
          const A = (JSON.parse(b).articles) || {};
          const source_refs = (A.results || []).slice(0, 5)
            .map(a => ({ uri: a.uri, url: a.url, source: a.source?.title, date: a.date }));
          resolve({ totalResults: A.totalResults ?? 0, source_refs });
        } catch { resolve({ totalResults: 0, source_refs: [] }); }
      });
    });
    preq.on('error', () => resolve({ totalResults: 0, source_refs: [] }));
    preq.end();
  });
}

// EIA API key (free, instant at eia.gov) — env or specs/EIA API.env, server-side, never echoed.
function eiaKey() {
  if (process.env.EIA_API_KEY) return process.env.EIA_API_KEY.trim();
  try {
    const raw = require('fs').readFileSync(require('path').join(__dirname, 'specs', 'EIA_API_KEY.env'), 'utf8');
    return (raw.match(/[0-9a-zA-Z]{30,}/) || [])[0] || '';
  } catch { return ''; }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/fuel — DEV proxy for Petro Locator. Zyla per-station prices (PAID).
  // Key from specs/petro_locator (or ZYLA_FUEL_KEY env), server-side, never echoed.
  if (req.method === 'GET' && req.url.startsWith('/api/fuel')) {
    const u    = new URL(req.url, 'http://localhost');
    const zip  = u.searchParams.get('zip');
    const type = u.searchParams.get('type') || 'regular';
    if (!zip) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'MISSING_ZIP' })); return; }
    let key = process.env.ZYLA_FUEL_KEY || '';
    if (!key) { try { key = require('fs').readFileSync(require('path').join(__dirname, 'specs', 'petro_locator'), 'utf8').trim(); } catch {} }
    if (!key) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'UPSTREAM_DATA_UNAVAILABLE', missing: ['ZYLA_FUEL_KEY'] })); return; }
    const preq = require('https').request({
      hostname: 'zylalabs.com',
      path: `/api/4808/gas+price+locator+api/5997/get+pices?zip=${encodeURIComponent(zip)}&type=${encodeURIComponent(type)}`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + key },
    }, up => {
      let b = ''; up.on('data', c => b += c);
      up.on('end', () => { res.writeHead(up.statusCode || 200, { 'Content-Type': 'application/json' }); res.end(b); });
    });
    preq.on('error', e => { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'FUEL upstream: ' + e.message })); });
    preq.end();
    return;
  }

  // GET /api/eia-fuel — FREE EIA weekly retail fuel prices (regional-average FLOOR for Gas Go POC).
  // Real data, Tier-1 authoritative, provenance = EIA. Regional average only — never a per-station
  // claim (that is the paid Zyla layer on /api/fuel). Forwards the client's querystring to EIA v2 with
  // the api_key appended server-side. 503 with the missing var when no key — withhold, never fabricate.
  if (req.method === 'GET' && req.url.startsWith('/api/eia-fuel')) {
    const key = eiaKey();
    if (!key) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'UPSTREAM_DATA_UNAVAILABLE', missing: ['EIA_API_KEY'] })); return; }
    const qs = req.url.split('?')[1] || '';
    const preq = require('https').request({
      hostname: 'api.eia.gov',
      path: `/v2/petroleum/pri/gnd/data/?${qs}&api_key=${encodeURIComponent(key)}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, up => {
      let b = ''; up.on('data', c => b += c);
      up.on('end', () => { res.writeHead(up.statusCode || 200, { 'Content-Type': 'application/json' }); res.end(b); });
    });
    preq.on('error', e => { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'EIA-FUEL upstream: ' + e.message })); });
    preq.end();
    return;
  }

  // GET /api/news-doc — KRYL-1052 DEV proxy for the NARRATIVE facet producer (Event Registry).
  // Returns { totalResults, source_refs }. totalResults = 24h coverage volume for the keyword
  // → the producer's countable narrative intensity. Cached; failure → 0 → withhold (never faked).
  if (req.method === 'GET' && req.url.startsWith('/api/news-doc')) {
    const u = new URL(req.url, 'http://localhost');
    const q = u.searchParams.get('q') || '';
    if (!q) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'MISSING_Q' })); return; }
    const send = (payload) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
    const cached = erCache.get(q);
    if (cached && (Date.now() - cached.ts) < ER_TTL) { send(cached.payload); return; }
    fetchEventRegistry(q).then(payload => { erCache.set(q, { ts: Date.now(), payload }); send(payload); });
    return;
  }

  // GET /api/feed — ETR headlines for ticker tape (6 categories)
  if (req.method === 'GET' && req.url === '/api/feed') {
    const feed = [
      { id: 'ETR-00412', category: 'States',          signal_score: 0.871, trend: '▲', headline: 'Texas legislature advances property tax relief package amid rising homeowner costs' },
      { id: 'ETR-00389', category: 'Financial Impact', signal_score: 0.734, trend: '▼', headline: 'Federal Reserve holds rates steady as inflation data shows mixed signals' },
      { id: 'ETR-00401', category: 'Health Risk',      signal_score: 0.612, trend: '▲', headline: 'CDC flags elevated respiratory illness activity across southeastern states' },
      { id: 'ETR-00356', category: 'Social Impact',    signal_score: 0.903, trend: '▲', headline: 'Housing affordability crisis deepens in major metro areas as inventory hits decade low' },
      { id: 'ETR-00421', category: 'Research',         signal_score: 0.558, trend: '▼', headline: 'Stanford study links extended remote work to measurable shifts in urban migration patterns' },
      { id: 'ETR-00398', category: 'Latest News',      signal_score: 0.781, trend: '▲', headline: 'Senate moves forward with bipartisan infrastructure maintenance bill' },
      { id: 'ETR-00374', category: 'Financial Impact', signal_score: 0.829, trend: '▲', headline: 'Consumer debt levels reach post-pandemic high as credit card delinquencies climb' },
      { id: 'ETR-00341', category: 'States',          signal_score: 0.667, trend: '▼', headline: 'California water authority declares stage 2 drought emergency for central valley' },
      { id: 'ETR-00415', category: 'Social Impact',    signal_score: 0.744, trend: '▲', headline: 'National survey finds 1 in 4 adults report significant financial stress impacting daily decisions' },
      { id: 'ETR-00408', category: 'Latest News',      signal_score: 0.591, trend: '▼', headline: 'Supreme Court agrees to hear case on municipal zoning restrictions and housing development' },
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(feed));
    return;
  }

  // KRYL-300 — Nooma Ingest: POST /api/ingest
  // Accepts: { id, telemetry: { m_checksum, t_telemetry, d_docs, v_voice, e_viral }, metadata: { source, timestamp } }
  // Returns: 201 + { id } on success | 400 + { error } on schema failure
  if (req.method === 'POST' && req.url === '/api/ingest') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        // Schema validation
        if (!payload.id || typeof payload.id !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id required (string)' }));
          return;
        }
        const tel = payload.telemetry;
        if (!tel || typeof tel !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'telemetry object required' }));
          return;
        }
        const telKeys = ['m_checksum', 't_telemetry', 'd_docs', 'v_voice', 'e_viral'];
        for (const k of telKeys) {
          if (typeof tel[k] !== 'number' || tel[k] < 0 || tel[k] > 1) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `telemetry.${k} must be number in [0, 1]` }));
            return;
          }
        }
        const meta = payload.metadata;
        if (!meta || typeof meta !== 'object' || !meta.source) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'metadata.source required' }));
          return;
        }

        // Compute Fs and append to signal store
        const fs = tel.m_checksum * 0.40 + tel.t_telemetry * 0.30 + tel.d_docs * 0.20
                 + tel.v_voice * 0.09 + tel.e_viral * 0.01;
        const record = {
          id:                  payload.id,
          source_type:         meta.source,
          truth_statement:     meta.truth_statement ?? payload.id,
          signal_score:        fs,
          fidelity_components: tel,
          ingested_at:         meta.timestamp ?? new Date().toISOString(),
        };
        ingestedSignals.push(record);
        console.log(`[KRYL-300] Ingested: ${payload.id} Fs=${fs.toFixed(3)} source=${meta.source}`);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: payload.id }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/host') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body);
        const q = query || 'signal';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            state: 2,
            host: {
              output: `Emergent pattern detected in ${q}. Signal field shows pre-consensus positioning window. First-mover advantage available before narrative consolidates.`,
            },
            telemetry: {
              score:     0.81,
              roi:       '3.2x',
              u_score:   0.74,
              coherence: 0.88,
            },
          },
        }));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/truth') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body);
        const records = mockRecords(query || 'unknown');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(records));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3001, () => {
  console.log('Mock Truth Engine running on http://localhost:3001');
});