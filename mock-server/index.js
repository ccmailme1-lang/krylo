// mock-server/index.js
// WO-229.1 — Updated to return ETR collection (array)
// WO-232   — Added /api/registry GET endpoint
// Location: mock-server/index.js
// Run: node mock-server/index.js
import express from 'express';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const etrData = [
  {
    id:         'ETR-9921-X',
    state:      'WATCH',
    trend:      'STABLE',
    created_at: '2026-03-06T14:00:00Z',
    signal_score: 0.6852,
    source_type: 'observational',
    truth_statement: 'Imminent Layoffs',
    fidelity_components: {
      m_checksum:  1.00,
      t_telemetry: 0.95,
      d_docs:      0.00,
      v_voice:     0.00,
      e_viral:     0.02,
    },
    m_checksum: 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    signature:  'sig:ed25519:4b8e...fullsigstringhere88chars',
  },
  {
    id:         'ETR-4412-B',
    state:      'ALERT',
    trend:      'RISING',
    created_at: '2026-03-07T10:30:00Z',
    signal_score: 0.5095,
    source_type: 'derived',
    truth_statement: 'Unresolved Conflict',
    fidelity_components: {
      m_checksum:  0.65,
      t_telemetry: 0.80,
      d_docs:      0.10,
      v_voice:     0.05,
      e_viral:     0.50,
    },
    m_checksum: 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    signature:  'sig:ed25519:invalidtamperedexample',
  },
  {
    id:         'ETR-3105-Z',
    state:      'HARDENED',
    trend:      'STABLE',
    created_at: '2026-03-07T11:30:00Z',
    signal_score: 0.9749,
    source_type: 'observational',
    truth_statement: 'Unhealthy Workplace Culture',
    fidelity_components: {
      m_checksum:  1.00,
      t_telemetry: 1.00,
      d_docs:      0.98,
      v_voice:     0.99,
      e_viral:     0.88,
    },
    m_checksum: 'sha256:7c4a8d09ca3762af61e59520943dc26494f8941b',
    signature:  'sig:ed25519:validfullsignaturestringhere',
  },
];

// POST /api/truth — query-driven ETR collection (usetruthlens)
app.post('/api/truth', (req, res) => {
  const query = req.body?.query ?? 'unknown';
  console.log(`[mock] POST /api/truth query="${query}"`);
  res.json(etrData.map(r => ({ ...r, title: query })));
});

// GET /api/registry — summary payload (registryview)
app.get('/api/registry', (req, res) => {
  console.log('[mock] GET /api/registry');
  res.json(etrData.map(etr => ({
    id:          etr.id,
    signal_score: etr.signal_score,
    fs:          etr.signal_score,
    status:      etr.state,
    timestamp:   etr.created_at,
    fidelity_components: {
      m_checksum: etr.fidelity_components.m_checksum,
    },
  })));
});

// GET /api/truth/:id — full forensic record (vaultview)
app.get('/api/truth/:id', (req, res) => {
  const full = etrData.find(e => e.id === req.params.id);
  if (!full) return res.status(404).json({ error: 'ETR not found' });
  console.log(`[mock] GET /api/truth/${full.id}`);
  res.json(full);
});

// POST /api/ingest — KRYL-300 + WO-255
// Dual-mode: ingest ETR records (from news bridge), or query stored records
const ingestStore = [];

app.post('/api/ingest', (req, res) => {
  const body = req.body;

  // Query mode: { source: 'nooma', query }
  if (body?.source === 'nooma') {
    console.log(`[mock] POST /api/ingest query="${body.query}" — ${ingestStore.length} record(s)`);
    return res.json(ingestStore);
  }

  // Ingest mode: single record or array
  const records = Array.isArray(body) ? body : [body];
  let added = 0;
  records.forEach(r => {
    if (!r?.id) return;
    const idx = ingestStore.findIndex(s => s.id === r.id);
    if (idx >= 0) ingestStore[idx] = r;
    else { ingestStore.push(r); added++; }
  });
  console.log(`[mock] POST /api/ingest — ${added} new / ${records.length - added} updated`);
  res.json({ ok: true, count: records.length, total: ingestStore.length });
});

app.listen(3001, () => console.log('[mock] Truth server running on :3001'));