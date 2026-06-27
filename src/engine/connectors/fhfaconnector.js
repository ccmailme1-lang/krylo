// WO-2019 — FHFA Connector
// House Price Index year-over-year change (USSTHPI via FRED).
// Formula: clamp(50 + hpi_yoy_change × 5, 0, 100)
// Domain: OWNERSHIP

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export async function runFhfaSync() {
  try {
    const apiKey = ''; // FRED key optional for USSTHPI (public series)
    const res = await fetch(`/api/fhfa?series_id=USSTHPI&api_key=${apiKey}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const obs  = data.observations ?? [];
    if (obs.length < 5) throw new Error('insufficient FHFA data');

    // obs[0] = most recent (quarterly), obs[4] = ~1 year ago
    const recent = parseFloat(obs[0].value);
    const prior  = parseFloat(obs[4].value);
    if (isNaN(recent) || isNaN(prior) || prior === 0) throw new Error('invalid FHFA values');

    const yoyChange = ((recent - prior) / prior) * 100;
    const signal    = clamp(Math.round(50 + yoyChange * 5), 0, 100);
    const conf      = 0.85; // quarterly FHFA data — high structural reliability

    surfaceRouter.dispatchBatch([{
      source: 'FHFA', domain: 'OWNERSHIP', signal, confidence: conf,
      ts: Date.now(), polarity: signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE, decay: DECAY.QUARTERLY,
    }]);
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'FHFA', domain: 'OWNERSHIP', signal: 0, confidence: 0, ts: Date.now(),
    }]);
  }
}
