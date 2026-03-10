// src/hooks/useingest.js
// WO-251 — KRYL-300: Nooma Ingest API hook
// Endpoint: POST /api/ingest
// Payload:  { source: 'nooma', query: string }
// Returns:  { signals, loading, error }
// Falls back silently if /api/ingest 404s — does not break app

import { useState, useEffect, useCallback } from 'react';

const FS_WEIGHTS = {
  m_checksum:  0.40,
  t_telemetry: 0.30,
  d_docs:      0.20,
  v_voice:     0.09,
  e_viral:     0.01,
};

function calculateFs(components) {
  let score = 0;
  for (const [key, weight] of Object.entries(FS_WEIGHTS)) {
    score += (components[key] ?? 0) * weight;
  }
  return parseFloat(score.toFixed(4));
}

function mapPosture(fs) {
  if (fs >= 0.70) return 'HARDENED';
  if (fs >= 0.40) return 'WATCH';
  return 'CALM';
}

function enrichRecord(record) {
  const fc = record?.fidelity_components ?? {};
  const fs = calculateFs(fc);
  return { ...record, fs, posture: mapPosture(fs) };
}

export function useingest(query) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchIngest = useCallback(async (q) => {
    if (!q) { setSignals([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ source: 'nooma', query: q }),
      });
      // Silent fallback — endpoint not present
      if (res.status === 404) { setSignals([]); return; }
      if (!res.ok) throw new Error('/api/ingest returned ' + res.status);
      const payload = await res.json();
      const arr = Array.isArray(payload) ? payload : [payload];
      setSignals(arr.map(enrichRecord));
    } catch {
      // Does not break app — silent fallback
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngest(query);
  }, [query, fetchIngest]);

  return { signals, loading, error };
}
