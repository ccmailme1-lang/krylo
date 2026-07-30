// Formation Adapter — maps EXISTING engine outputs into the Formation schema. No new signal
// detection, no new classification logic. Reuses the exact same convergence vector construction
// and classifier the live cones already call (conemap.jsx's coneConvergenceVector +
// classifyConvergenceState + applyTransitionPolicy) — restructuring the output, not recomputing it.
//
// Sandboxed prototype: this module is not imported by conemap.jsx or any live rendering path.
//
// KRYL-Formation Mathematics v0.1 (Operational subset, locked 2026-07-30): velocity is now real —
// V_f = ||ΔF|| / Δt over the reduced state vector F=[M,C], tracked across actual calls. Not a
// passed-in constant. The full [M,C,E,R] vector + learned weighting matrix W is Research Math,
// deferred until Evidence Depth and Connector Strength have real substrates behind them too.

import { getDomainPressure } from '../engine/domaingravity.js';
import { classifyConvergenceState, applyTransitionPolicy } from '../engine/convergenceclassifier.js';
import { buildFormation, FORMATION_STATE } from './formationschema.js';

const CONE_VECTOR_T = 0.7;             // same placeholder constant conemap.jsx uses
const CONE_TELEMETRY_CONFIDENCE = 0.8; // same constant conemap.jsx uses

// Mirrors conemap.jsx's coneConvergenceVector() exactly — one source of truth for this shape
// would ideally be shared, but this prototype stays read-only/sandboxed and doesn't import
// from conemap.jsx to avoid any accidental coupling into the live rendering module.
// Note: this `inputVolatility` is the classifier's own telemetry-choppiness input (feeds
// classifyConvergenceState's TURBULENT detection) — a different concept from the Formation's
// own V_f velocity below, which measures the formation's rate of change over time, not input noise.
function convergenceVector(magnitude, inputVolatility) {
  const leverageN = (magnitude ?? 0) / 100;
  return { D: leverageN, V: inputVolatility ?? 0.5, A: leverageN, T: CONE_VECTOR_T };
}

// State-vector history per domain, F_t = [M_t, C_t] with timestamp — module-level, in-memory.
// Real tracking, not a fabrication: each call records an actual (magnitude, cohesion) reading.
const _history = new Map(); // domain -> { M, C, ts } (most recent prior reading)

// Velocity Preconditions (added after live testing surfaced Δt->0 amplification):
//   1. Valid previous state must exist.
//   2. Δt >= DT_MIN_SECONDS — below this, a rate is meaningless amplification, not a
//      measurement. WITHHELD, never V=0 or a capped value pretending to be real.
//   3. ||ΔF|| >= NOISE_FLOOR — below this, the "movement" is plausibly measurement jitter,
//      not real change. Reported as a genuine 0 (this one IS a real reading, not withheld).
// DT_MIN_SECONDS is a placeholder pending a real per-domain Formation Observation Window
// (cadence/min-interval/max-stale) — flagged here, not silently treated as authoritative.
const DT_MIN_SECONDS = 5;
const NOISE_FLOOR = 0.01;

// V_f = ||ΔF|| / Δt over F=[M,C], Euclidean (W=I — the spec's own admissible initial form).
// First reading for a domain has no prior state to diff against — velocity is 0 (a real reading:
// "no known rate of change yet" is not the same failure mode as "interval too short to trust").
// Returns { velocity, reason } — velocity is null (WITHHELD) when the interval is invalid.
function computeVelocity(domain, M, C, now) {
  const prior = _history.get(domain);
  _history.set(domain, { M, C, ts: now });
  if (!prior) return { velocity: 0, reason: null };

  const dt = (now - prior.ts) / 1000; // seconds
  if (dt < DT_MIN_SECONDS) {
    return { velocity: null, reason: `VELOCITY_INVALID_INTERVAL — Δt=${dt.toFixed(3)}s below minimum valid interval ${DT_MIN_SECONDS}s (placeholder pending a real Formation Observation Window)` };
  }

  const dM = M - prior.M, dC = C - prior.C;
  const deltaF = Math.sqrt(dM * dM + dC * dC);
  if (deltaF < NOISE_FLOOR) return { velocity: 0, reason: null }; // real reading: below noise floor, genuinely ~0

  return { velocity: deltaF / dt, reason: null };
}

export function resetFormationHistory(domain) {
  if (domain) _history.delete(domain);
  else _history.clear();
}

// domain: signal domain (TECHNOLOGY, CAPITAL, etc.). inputVolatility: caller-supplied 0-1, feeds
// the classifier's own vector (see convergenceVector above) — separate from the Formation's V_f.
// Returns a frozen Formation object, or null if the domain has no active signal (§22 absence —
// no formation exists, not a fabricated "emerging" one).
export function adaptDomainToFormation(domain, inputVolatility = 0.5) {
  const pressure = getDomainPressure(domain);
  if (pressure.signalCount === 0) return null;

  const vector = convergenceVector(pressure.magnitude, inputVolatility);
  const raw    = classifyConvergenceState(vector, CONE_TELEMETRY_CONFIDENCE);
  const locked = applyTransitionPolicy(raw);

  // Hysteresis-confirmed (raw matches the locked/persisted state) -> stable.
  // Not yet confirmed (still fluctuating frame to frame) -> emerging.
  const state = raw.stateId === locked.stateId ? FORMATION_STATE.STABLE : FORMATION_STATE.EMERGING;

  const magnitude = pressure.magnitude;
  const cohesion  = raw.stateId / 4; // C_f = S/4, normalized convergence stage (stateId range 0-4)
  const { velocity, reason: velocityReason } = computeVelocity(domain, magnitude, cohesion, Date.now());

  return buildFormation({
    domain,
    magnitude,
    state,
    cohesion,
    velocity,
    velocityReason,
    signalCount: pressure.signalCount,
  });
}
