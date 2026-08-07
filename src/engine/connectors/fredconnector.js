// CAPITAL feeder v2 — modeled directly on githubconnector.js (confirmed working pattern).
// Topic-agnostic macro signal via FRED (10-Year Treasury yield), so it always has real
// data regardless of whether the query names a specific entity — unlike
// capitalrealizationconnector.js, which withholds when no entity resolves.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runFredSync() {
  try {
    const res = await fetch('/api/fred?series_id=DGS10');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const observations = data.observations ?? [];
    const valid = observations.filter(o => o.value !== '.').map(o => parseFloat(o.value));
    if (valid.length < 2) throw new Error('insufficient FRED data');

    const current = valid[valid.length - 1];
    const prior   = valid[valid.length - 2];
    const delta   = current - prior;
    const signal  = clamp(Math.round(50 + delta * 20), 0, 100);
    const conf    = 0.7;

    surfaceRouter.dispatchBatch([{
      source: 'FRED', domain: 'CAPITAL', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.DAILY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'FRED', domain: 'CAPITAL', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
