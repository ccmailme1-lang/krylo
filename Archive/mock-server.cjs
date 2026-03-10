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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
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