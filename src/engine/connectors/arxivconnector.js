// WO-2019 — arXiv Connector
// Papers submitted in last 7 days for a topic.
// Formula: min(100, papers_per_week / 2 × 50)
// Domain: KNOWLEDGE

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runArxivSync(topic) {
  try {
    const res = await fetch(`/api/arxiv?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const count = data.count ?? 0;

    const signal = clamp(Math.round(Math.min(100, (count / 2) * 50)), 0, 100);
    const conf   = clamp(0.3 + Math.min(1, count / 20) * 0.6, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'ARXIV', domain: 'KNOWLEDGE', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.WEEKLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'ARXIV', domain: 'KNOWLEDGE', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
