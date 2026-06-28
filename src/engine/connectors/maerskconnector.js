// WO-2019 — Maersk Shipping Connector
// Vessel schedule density on major trade corridors (Asia→US, US→EU, EU→Asia).
// Formula: clamp(sailingCount / 10 × 100, 0, 100) per corridor, averaged.
// Domain: OWNERSHIP (physical supply chain constraint)

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Three corridors cover global trade flow: Asia-US, US-EU, EU-Asia
const CORRIDORS = [
  { origin: 'CNSHA', dest: 'USORF', label: 'ASIA_US' },   // Shanghai → Norfolk
  { origin: 'USORF', dest: 'DEHAM', label: 'US_EU'   },   // Norfolk → Hamburg
  { origin: 'DEHAM', dest: 'CNSHA', label: 'EU_ASIA'  },   // Hamburg → Shanghai
];

async function fetchCorridor(origin, dest) {
  const res = await fetch(`/api/maersk?origin=${origin}&dest=${dest}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Maersk schedules v1: { sailings: [ { departures: [...] } ] }
  const sailings = data.sailings ?? data.schedules ?? [];
  return sailings.length;
}

export async function runMaerskSync() {
  const results = await Promise.allSettled(
    CORRIDORS.map(c => fetchCorridor(c.origin, c.dest))
  );

  const counts = results.map(r => r.status === 'fulfilled' ? r.value : 0);
  const total  = counts.reduce((s, n) => s + n, 0);
  const active = results.filter(r => r.status === 'fulfilled').length;

  if (active === 0) {
    surfaceRouter.dispatchBatch([{
      source: 'MAERSK', domain: 'OWNERSHIP', signal: 0, confidence: 0, ts: Date.now(),
    }]);
    return;
  }

  // 10 sailings per corridor per 14-day window = full signal
  const avgCount = total / CORRIDORS.length;
  const signal   = clamp(Math.round((avgCount / 10) * 100), 0, 100);
  const conf     = clamp(0.6 + (active / CORRIDORS.length) * 0.35, 0, 1);

  surfaceRouter.dispatchBatch([{
    source:    'MAERSK',
    domain:    'OWNERSHIP',
    signal,
    confidence: conf,
    ts:        Date.now(),
    polarity:  signal > 50 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
    decay:     DECAY.WEEKLY,
  }]);
}
