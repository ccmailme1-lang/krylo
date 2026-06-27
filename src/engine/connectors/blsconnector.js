// WO-2019 — BLS Connector
// JOLTS quit rate: structural labor mobility signal.
// Formula: clamp(quit_rate / 3.5 × 100, 0, 100)  (3.5% = historical peak)
// Domain: LABOR

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runBlsSync() {
  try {
    const res = await fetch('/api/bls');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data    = await res.json();
    const series  = data.Results?.series?.[0]?.data ?? [];
    const latest  = series[0];
    if (!latest) throw new Error('no BLS data');

    const quitRate = parseFloat(latest.value);
    const signal   = clamp(Math.round((quitRate / 3.5) * 100), 0, 100);
    const conf     = 0.9; // BLS data is authoritative, high confidence

    surfaceRouter.dispatchBatch([{
      source: 'BLS', domain: 'LABOR', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.QUARTERLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'BLS', domain: 'LABOR', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
