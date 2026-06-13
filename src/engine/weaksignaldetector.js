// src/engine/weaksignaldetector.js — WO-1726: Weak Signal Detection Layer
//
// Phase A: identify signals with pressure < WEAK_THRESHOLD
// Phase B: velocity tracker — fast-rising weak signals flagged EMERGING
//
// Phase C (cross-domain correlation) was originally specified here but is
// architecturally mis-layered. Cross-domain correlation is NC-tier behavior.
// It is re-homed as Phase A of WO-1734 (Non-Consensus Layer).
//
// Output contract: all emitted signal objects are tagged
//   { _epistemicTier: 'WEAK', promotable: false }
// Promotion logic must live ONLY in WO-1734 (NC tier) or higher.

import { EPISTEMIC_TIER, tagWithTier } from './epistemictier.js';

export const WEAK_THRESHOLD = 20;   // pressure below this = weak signal territory
const VELOCITY_WINDOW       = 3;    // readings kept per domain for slope
const EMERGING_SLOPE        = 1.5;  // points-per-reading = emerging threshold

// Per-domain ring buffer: domain → [{ pressure, ts }, ...]
const _history = new Map();

function _updateHistory(domain, pressure, ts) {
  if (!_history.has(domain)) _history.set(domain, []);
  const buf = _history.get(domain);
  buf.push({ pressure, ts });
  if (buf.length > VELOCITY_WINDOW) buf.shift();
}

// Linear slope over the ring buffer (points per reading).
function _slope(domain) {
  const buf = _history.get(domain);
  if (!buf || buf.length < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = buf.length;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += buf[i].pressure;
    sumXY += i * buf[i].pressure;
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// detectWeakSignals(signals)
// signals: [{ domain, signal, ts, ...rest }]
// Returns:
//   weakSignals:     WEAK-tagged signals with pressure < WEAK_THRESHOLD + slope
//   emergingSignals: WEAK-tagged signals that are fast-rising (slope >= EMERGING_SLOPE)
export function detectWeakSignals(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { weakSignals: [], emergingSignals: [] };
  }

  const now = Date.now();

  for (const s of signals) {
    _updateHistory(s.domain, s.signal ?? 0, s.ts ?? now);
  }

  const weakSignals = signals
    .filter(s => (s.signal ?? 0) < WEAK_THRESHOLD)
    .map(s => tagWithTier({ ...s, slope: _slope(s.domain) }, EPISTEMIC_TIER.WEAK));

  const emergingSignals = weakSignals.filter(s => s.slope >= EMERGING_SLOPE);

  return { weakSignals, emergingSignals };
}

// resetWeakSignalHistory() — call between sessions or on query change
export function resetWeakSignalHistory() {
  _history.clear();
}
