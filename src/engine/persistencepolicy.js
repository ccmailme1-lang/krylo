// Event Persistence Policy — SSOT
// Version: 1.0.0 | Locked: 2026-05-29
// All surfaces that record, replay, or audit events must route through shouldPersist().
// See specs/event-persistence-matrix.md for the canonical spec.

export const POLICY_VERSION = '1.0.0';

// MODEL tri-gate threshold values
const BUILDING_CONVERGENCE_STATE_ID = 2;
const MODEL_CONVERGENCE_SCORE_FLOOR  = 0.55;
const MODEL_NOVELTY_DELTA_FLOOR      = 0.08;

// Always-persist types — no gating required
const ALWAYS_PERSIST = new Set([
  'SEARCH',
  'ORACLE',
  'PROFILE UPDATE',
  'LENS CHANGE',
  'TRANSACTION',
  'EMERGENCE',
]);

function shouldPersistModel(signal) {
  if (!signal) return true; // fail open — preserve by default when data unavailable

  const stateId        = signal.stateId        ?? signal.state_id ?? null;
  const convergence    = signal.convergenceScore ?? signal.convergence_score ?? null;
  const noveltyDelta   = signal.noveltyDelta    ?? signal.novelty_delta ?? null;

  // If all fields unavailable: fail open
  if (stateId === null && convergence === null && noveltyDelta === null) return true;

  const stateGate     = stateId !== null     && stateId >= BUILDING_CONVERGENCE_STATE_ID;
  const scoreGate     = convergence !== null && convergence >= MODEL_CONVERGENCE_SCORE_FLOOR;
  const noveltyGate   = noveltyDelta !== null && noveltyDelta > MODEL_NOVELTY_DELTA_FLOOR;

  return stateGate || scoreGate || noveltyGate;
}

function shouldPersistSystem(signal) {
  if (!signal) return false; // fail closed — suppress when data unavailable

  return (
    signal.integrityViolation      === true ||
    signal.driftLockActivated      === true ||
    signal.substrate_desync_detected === true
  );
}

/**
 * shouldPersist(event) → boolean
 *
 * event shape:
 * {
 *   type: string         // event type (SEARCH, MODEL, SYSTEM, etc.)
 *   signal?: object      // convergence/integrity signal data (optional)
 * }
 */
export function shouldPersist(event) {
  if (!event || !event.type) return false;

  const type = event.type.toUpperCase().trim();

  if (ALWAYS_PERSIST.has(type)) return true;

  if (type === 'MODEL')  return shouldPersistModel(event.signal);
  if (type === 'SYSTEM') return shouldPersistSystem(event.signal);

  // Unknown types: do not persist by default
  return false;
}

/**
 * filterTransactions(events) → filtered events
 * Convenience wrapper for batch filtering.
 */
export function filterTransactions(events) {
  return events.filter(e => shouldPersist(e));
}

export const PERSISTENCE_THRESHOLDS = {
  MODEL_CONVERGENCE_SCORE_FLOOR,
  MODEL_NOVELTY_DELTA_FLOOR,
  BUILDING_CONVERGENCE_STATE_ID,
};
