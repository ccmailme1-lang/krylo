// WO-2019 — USAJobs Connector
// Federal job posting density for a keyword topic.
// Formula: min(100, posting_count / 500 × 100)
// Domain: LABOR

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runUsajobsSync(topic) {
  try {
    const res = await fetch(`/api/usajobs?q=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const count = data.SearchResult?.SearchResultCountAll ?? data.SearchResult?.SearchResultCount ?? 0;

    const signal = clamp(Math.round(Math.min(100, (count / 500) * 100)), 0, 100);
    const conf   = clamp(0.4 + Math.min(1, count / 200) * 0.4, 0, 1);

    surfaceRouter.dispatchBatch([{
      source: 'USAJOBS', domain: 'LABOR', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.WEEKLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'USAJOBS', domain: 'LABOR', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
