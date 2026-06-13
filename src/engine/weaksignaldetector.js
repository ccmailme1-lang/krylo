// src/engine/weaksignaldetector.js — WO-1726: Weak Signal Detection Layer
//
// Phase A: identify signals with pressure < WEAK_THRESHOLD
// Phase B: velocity tracker — fast-rising weak signals flagged EMERGING
// Phase C: cross-domain correlation — TECHNOLOGY + KNOWLEDGE both weak
//          and emerging simultaneously triggers early convergence alert
//          before the convergence classifier fires
//
// Input: signals[] — any array of { domain, signal (0-100), ts }
// Output: { weakSignals, emergingSignals, earlyConvergenceAlert }

export const WEAK_THRESHOLD  = 20;   // pressure below this = weak signal territory
const VELOCITY_WINDOW        = 3;    // readings kept per domain for slope
const EMERGING_SLOPE         = 1.5;  // points-per-reading = emerging threshold
const PHASE_C_DOMAINS        = ['TECHNOLOGY', 'KNOWLEDGE'];

// Per-domain ring buffer: domain → [{ pressure, ts }, ...]
// Module-level so velocity persists across calls within the same session.
const _history = new Map();

function _updateHistory(domain, pressure, ts) {
  if (!_history.has(domain)) _history.set(domain, []);
  const buf = _history.get(domain);
  buf.push({ pressure, ts });
  if (buf.length > VELOCITY_WINDOW) buf.shift();
}

// Linear slope over the ring buffer (points per reading).
// Positive = rising. Returns 0 if fewer than 2 readings.
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
//   weakSignals:          signals with pressure < WEAK_THRESHOLD (with slope attached)
//   emergingSignals:      weak signals that are fast-rising (slope >= EMERGING_SLOPE)
//   earlyConvergenceAlert: true when TECHNOLOGY and KNOWLEDGE are both emerging simultaneously
export function detectWeakSignals(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { weakSignals: [], emergingSignals: [], earlyConvergenceAlert: false };
  }

  const now = Date.now();

  // Update velocity history for all incoming signals
  for (const s of signals) {
    _updateHistory(s.domain, s.signal ?? 0, s.ts ?? now);
  }

  // Phase A: filter weak
  const weakSignals = signals
    .filter(s => (s.signal ?? 0) < WEAK_THRESHOLD)
    .map(s => ({ ...s, slope: _slope(s.domain) }));

  // Phase B: flag emerging
  const emergingSignals = weakSignals.filter(s => s.slope >= EMERGING_SLOPE);

  // Phase C: early convergence — both Phase C domains weak AND emerging
  const emergingDomains = new Set(emergingSignals.map(s => s.domain));
  const earlyConvergenceAlert = PHASE_C_DOMAINS.every(d => emergingDomains.has(d));

  return { weakSignals, emergingSignals, earlyConvergenceAlert };
}

// resetWeakSignalHistory() — call between sessions or on query change
export function resetWeakSignalHistory() {
  _history.clear();
}

export { PHASE_C_DOMAINS };
