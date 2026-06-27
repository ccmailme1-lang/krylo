// WO-2019 — Treasury Connector
// Yield curve stress signal from Treasury average interest rates.
// Formula: clamp((rate10yr - rate2yr + 2) / 4 × 100, 0, 100)
// Domain: CAPITAL

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runTreasurySync() {
  try {
    const res = await fetch('/api/treasury');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = data.data ?? [];

    // Find most recent 10yr and 2yr rates
    const row10 = rows.find(r => r.security_desc?.includes('10 Yr'));
    const row2  = rows.find(r => r.security_desc?.includes('2 Yr') || r.security_desc?.includes('Bills'));
    if (!row10 || !row2) throw new Error('insufficient Treasury data');

    const rate10 = parseFloat(row10.avg_interest_rate_amt);
    const rate2  = parseFloat(row2.avg_interest_rate_amt);
    const signal = clamp(Math.round(((rate10 - rate2 + 2) / 4) * 100), 0, 100);
    const conf   = 0.92; // Treasury data is authoritative

    surfaceRouter.dispatchBatch([{
      source: 'TREASURY', domain: 'CAPITAL', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.WEEKLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'TREASURY', domain: 'CAPITAL', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
