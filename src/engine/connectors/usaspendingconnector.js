// WO-2040 — USASpending NAICS-Gated Sector Capital Flow Connector
// No API key required. No entity resolution. Phase A only.
// Gate: NAICS sector prefixes 54 (tech/scientific), 33 (manufacturing/defense),
//       22 (energy/utilities), 23 (construction/infrastructure)
// Signal: actual FY spend vs. prorated annual baseline → capital allocation velocity
// Formula: pace_ratio = actual / expected; signal = clamp(round(pace_ratio × 60), 0, 100)
//   pace_ratio 1.0 → signal 60 (on pace = structural tailwind confirmed)
//   pace_ratio 1.67 → signal 100 (above pace = accelerating capital deployment)
// Domain: CAPITAL
// Decay: DAILY — federal obligations post daily; acceleration is the signal

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Annual federal obligation baselines by NAICS sector (USD billions, approximate FPDS historical avg)
const SECTOR_BASELINES = {
  '54': { label: 'TECH',   annualB: 120 },  // Professional/Scientific/Technical
  '33': { label: 'MFG',    annualB: 180 },  // Manufacturing (defense hardware, electronics)
  '22': { label: 'ENERGY', annualB:  12 },  // Utilities / energy infrastructure
  '23': { label: 'INFRA',  annualB:  55 },  // Construction / infrastructure
};

// Fraction of federal fiscal year elapsed (FY runs Oct 1 – Sep 30)
function fyProgressFraction() {
  const now     = new Date();
  const fyStart = new Date(now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1, 9, 1);
  const fyEnd   = new Date(fyStart.getFullYear() + 1, 9, 1);
  return Math.min(1, (now - fyStart) / (fyEnd - fyStart));
}

export async function runUsaspendingSync() {
  const ts = Date.now();
  try {
    const res = await fetch('/api/usaspending');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const results = json?.results ?? [];
    if (results.length === 0) throw new Error('empty results');

    // Aggregate amounts by 2-digit NAICS prefix
    const sectorTotals = {};
    for (const row of results) {
      const code   = String(row.code ?? '');
      const prefix = code.slice(0, 2);
      if (SECTOR_BASELINES[prefix]) {
        sectorTotals[prefix] = (sectorTotals[prefix] ?? 0) + (row.amount ?? 0);
      }
    }

    const fyFrac   = fyProgressFraction();
    const signals  = [];

    for (const [prefix, { annualB }] of Object.entries(SECTOR_BASELINES)) {
      const actual   = (sectorTotals[prefix] ?? 0) / 1e9;          // convert to billions
      const expected = annualB * fyFrac;
      if (expected <= 0) continue;

      const paceRatio = actual / expected;
      const signal    = clamp(Math.round(paceRatio * 60), 0, 100);
      const conf      = 0.85; // USASpending is audited, authoritative

      signals.push({
        source:   'USASPENDING',
        domain:   'CAPITAL',
        signal,
        confidence: conf,
        ts,
        decay:    DECAY.DAILY,
        polarity: signal >= 40 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
        meta:     { naicsPrefix: prefix, actual, expected, paceRatio },
      });
    }

    if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
    return signals;
  } catch {
    surfaceRouter.dispatchBatch([{
      source: 'USASPENDING', domain: 'CAPITAL', signal: 0, confidence: 0, ts,
    }]);
    return null;
  }
}
