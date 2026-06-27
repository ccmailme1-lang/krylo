// WO-2019 — World Bank Connector
// Global GDP growth delta as capital pressure signal.
// Formula: clamp(50 + gdp_growth_delta × 10, 0, 100)
// Domain: CAPITAL

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runWorldBankSync() {
  try {
    const res = await fetch('/api/worldbank');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data    = await res.json();
    // World Bank API returns [metadata, records[]]
    const records = Array.isArray(data) ? (data[1] ?? []) : [];
    const valid   = records.filter(r => r.value !== null).sort((a, b) => b.date - a.date);
    if (valid.length < 2) throw new Error('insufficient World Bank data');

    const current = valid[0].value;
    const prior   = valid[1].value;
    const delta   = current - prior;
    const signal  = clamp(Math.round(50 + delta * 10), 0, 100);
    const conf    = 0.75; // World Bank data is annual, slightly lagged

    surfaceRouter.dispatchBatch([{
      source: 'WORLDBANK', domain: 'CAPITAL', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.QUARTERLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'WORLDBANK', domain: 'CAPITAL', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
