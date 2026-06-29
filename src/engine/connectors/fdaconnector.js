// WO-2039A — FDA Drug & Device Approval Velocity Connector
// Signal: count of recent FDA approvals (drugs) + 510k clearances (devices) in last 90 days
// Domains: KNOWLEDGE (drugs — novel therapeutics signal regulatory momentum)
//          TECHNOLOGY (devices — device clearance velocity = hardware innovation rate)
// Formula: drugs  → min(100, count / 25 × 100)   [25 NDA/BLA in 90d = peak]
//          devices → min(100, count / 400 × 100)  [400 510k in 90d = peak]
// Decay: QUARTERLY — FDA actions aggregate over months, not days

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

async function fetchCount(route) {
  const res = await fetch(route);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.meta?.results?.total ?? 0;
}

export async function runFdaSync() {
  const ts = Date.now();
  const [drugsRes, devicesRes] = await Promise.allSettled([
    fetchCount('/api/fda-drugs'),
    fetchCount('/api/fda-devices'),
  ]);

  const signals = [];

  if (drugsRes.status === 'fulfilled') {
    const count  = drugsRes.value;
    const signal = clamp(Math.round(Math.min(100, (count / 25) * 100)), 0, 100);
    signals.push({
      source: 'FDA', domain: 'KNOWLEDGE', signal,
      confidence: 0.78, ts, decay: DECAY.QUARTERLY,
      polarity: signal >= 40 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
    });
  }

  if (devicesRes.status === 'fulfilled') {
    const count  = devicesRes.value;
    const signal = clamp(Math.round(Math.min(100, (count / 400) * 100)), 0, 100);
    signals.push({
      source: 'FDA', domain: 'TECHNOLOGY', signal,
      confidence: 0.72, ts, decay: DECAY.QUARTERLY,
      polarity: signal >= 40 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
    });
  }

  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
