/* src/engine/pulseStateMachine.js                                      */
/* WO-752 — Pulse State Machine                                         */
/* Manages "Potential Energy Well" escapes for ETR nodes.               */
/*                                                                      */
/* State ladder: DORMANT → ACTIVE → ESCAPING → NATIONAL                 */
/* Snap trigger: fsVal >= snapThreshold, where threshold = f(trust_delta)*/
/* Low trust (TrustΔ -50) → snaps at Signal 75 (low bar)               */
/* High trust (TrustΔ +50) → snaps at Signal 95 (high bar)             */

export const PULSE_STATES = {
  DORMANT:  'DORMANT',   // Signal too low — node sits in potential well
  ACTIVE:   'ACTIVE',    // Signal rising — node is energized but contained
  ESCAPING: 'ESCAPING',  // Escape velocity reached — stalk snaps, node ascends
  NATIONAL: 'NATIONAL',  // Node has migrated to national stratum
};

// ── Snap Threshold ────────────────────────────────────────────────────────────
// Returns the fsVal (0–1) required for this node to escape its potential well.
// Low trust = low threshold (0.75); High trust = high threshold (0.95).
export function getSnapThreshold(trust_delta) {
  const t = Math.max(0, Math.min(1, (trust_delta + 50) / 100));
  return 0.75 + t * 0.20; // range: 0.75 → 0.95
}

// ── Particle Mass ─────────────────────────────────────────────────────────────
// Combines category mass and trust state into a single physics constant.
// High trust + heavy category = hardest to move.
export function computeParticleMass(trust_delta, categoryMass) {
  const trustFactor = Math.max(0, Math.min(1, (trust_delta + 50) / 100));
  return categoryMass * (0.5 + trustFactor * 0.5);
}

// ── Per-Frame State Tick ──────────────────────────────────────────────────────
// Evaluates a single node's pulse state for the current frame.
// node:  { trustDelta, pulseState }
// fsVal: current fidelity/signal score (0–1)
// Returns: { newState, escaped }
export function tickPulseState(node, fsVal) {
  const state = node.pulseState ?? PULSE_STATES.DORMANT;

  // Terminal states — no further transitions
  if (state === PULSE_STATES.ESCAPING || state === PULSE_STATES.NATIONAL) {
    return { newState: state, escaped: false };
  }

  const threshold = getSnapThreshold(node.trustDelta ?? 0);

  if (fsVal >= threshold) {
    return { newState: PULSE_STATES.ESCAPING, escaped: true };
  }
  if (fsVal >= 0.35) {
    return { newState: PULSE_STATES.ACTIVE, escaped: false };
  }
  return { newState: PULSE_STATES.DORMANT, escaped: false };
}
