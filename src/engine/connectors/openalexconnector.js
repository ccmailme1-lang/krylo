// WO-2019 — OpenAlex Connector
// Citation velocity for recent works on a topic.
// Formula: min(100, avgCitedByCount / 50 × 100)
// Domain: KNOWLEDGE

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runOpenAlexSync(topic) {
  try {
    const res = await fetch(`/api/openalex?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data    = await res.json();
    const results = data.results ?? [];
    const total   = data.meta?.count ?? 0;
    const avgCite = results.length
      ? results.reduce((s, w) => s + (w.cited_by_count ?? 0), 0) / results.length
      : 0;

    const signal = clamp(Math.round(Math.min(100, (avgCite / 50) * 100)), 0, 100);
    const conf   = clamp(0.3 + Math.min(1, total / 100) * 0.6, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'OPENALEX', domain: 'KNOWLEDGE', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.QUARTERLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'OPENALEX', domain: 'KNOWLEDGE', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
