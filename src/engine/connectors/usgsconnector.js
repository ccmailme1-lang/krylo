// WO-2019 — USGS Connector
// National drought stress via US Drought Monitor area statistics.
// Formula: clamp(D2+D3+D4 drought area %, 0, 100)  (physical constraint inversion applied)
// Domain: OWNERSHIP

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runUsgsSync() {
  try {
    const res = await fetch('/api/usgs');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // US Drought Monitor: returns array of weekly stats
    // Fields: None, D0, D1, D2, D3, D4 (% land area in each drought category)
    const latest = Array.isArray(data) ? data[0] : data;
    if (!latest) throw new Error('no USGS data');

    const d2 = parseFloat(latest.D2 ?? latest.d2 ?? '0');
    const d3 = parseFloat(latest.D3 ?? latest.d3 ?? '0');
    const d4 = parseFloat(latest.D4 ?? latest.d4 ?? '0');
    const droughtPct = clamp(d2 + d3 + d4, 0, 100);

    // High drought % = high physical constraint on land/water (ownership signal)
    const signal = clamp(Math.round(droughtPct), 0, 100);
    const conf   = 0.80; // drought monitor is weekly, high reliability

    surfaceRouter.dispatchBatch([{
      source: 'USGS', domain: 'OWNERSHIP', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.NEGATIVE : POLARITY.POSITIVE, decay: DECAY.WEEKLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'USGS', domain: 'OWNERSHIP', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
