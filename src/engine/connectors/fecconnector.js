// WO-2039B — FEC Campaign Finance Signal Connector
// Signal: number of active PAC committees filing this election cycle
// Domains: CAPITAL (total money in motion → structural pressure on policy/markets)
//          MEDIA   (PAC ad-spend velocity → attention/narrative pressure signal)
// Formula: min(100, count / 5000 × 100)  [5000 active PACs = peak cycle]
// Decay: QUARTERLY — cycle-level filing activity changes over weeks not days

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runFecSync() {
  const ts = Date.now();
  try {
    const res = await fetch('/api/fec');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // pagination.count = total PAC committees with filings this cycle
    const count = json?.pagination?.count ?? 0;

    // Two signals from the same count — capital volume + media spend pressure
    const signal = clamp(Math.round(Math.min(100, (count / 5000) * 100)), 0, 100);

    surfaceRouter.dispatchBatch([
      {
        source: 'FEC', domain: 'CAPITAL', signal,
        confidence: 0.70, ts, decay: DECAY.QUARTERLY,
        polarity: signal >= 30 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      },
      {
        source: 'FEC', domain: 'MEDIA', signal: Math.round(signal * 0.85),
        confidence: 0.60, ts, decay: DECAY.QUARTERLY,
        polarity: signal >= 30 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      },
    ]);
    return { count, signal };
  } catch {
    surfaceRouter.dispatchBatch([
      { source: 'FEC', domain: 'CAPITAL', signal: 0, confidence: 0, ts },
      { source: 'FEC', domain: 'MEDIA',   signal: 0, confidence: 0, ts },
    ]);
    return null;
  }
}
