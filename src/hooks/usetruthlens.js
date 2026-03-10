// usetruthlens.js
// WO-229   — Truth Tap. Fs calculation. State bridge.
// WO-229.1 — Updated to handle ETR collection (array)
// Location: src/hooks/usetruthlens.js
import { useState, useEffect, useCallback } from 'react';

const FS_WEIGHTS = {
  m_checksum:  0.40,
  t_telemetry: 0.30,
  d_docs:      0.20,
  v_voice:     0.09,
  e_viral:     0.01,
};

function validateRecord(record) {
  const fc = record?.fidelity_components;
  if (!fc) throw new Error("[" + record?.id + "] Missing fidelity_components");
  for (const key of Object.keys(FS_WEIGHTS)) {
    if (typeof fc[key] !== "number") {
      throw new Error("[" + record?.id + "] Invalid fidelity field: " + key);
    }
  }
}

function calculateFs(components) {
  let score = 0;
  for (const [key, weight] of Object.entries(FS_WEIGHTS)) {
    score += components[key] * weight;
  }
  return parseFloat(score.toFixed(4));
}

function mapPosture(fs) {
  if (fs === null) return "PENDING";
  if (fs >= 0.70)  return "HARDENED";
  if (fs >= 0.40)  return "WATCH";
  return "CALM";
}

function enrichRecord(record) {
  validateRecord(record);
  const fs = calculateFs(record.fidelity_components);
  return { ...record, fs, posture: mapPosture(fs) };
}

export function usetruthlens(query) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchTruth = useCallback(async (q) => {
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/truth", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error("/api/truth returned " + res.status);
      const payload = await res.json();
      const arr = Array.isArray(payload) ? payload : [payload];
      setRecords(arr.map(enrichRecord));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTruth(query);
  }, [query, fetchTruth]);

  return { records, loading, error, refetch: fetchTruth };
}
