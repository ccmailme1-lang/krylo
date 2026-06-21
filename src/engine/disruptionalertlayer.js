// WO-1740A — Disruption Detection Engine
// Pure detection. No rendering, no UI. Emits DisruptionEvent.
// Inputs:  convergence state (WO-1126A.v2) + AS-DIFF result (WO-1827)
// Outputs: DisruptionEvent — consumed by WO-1740B (Projection Layer)
// Call on convergence classifier updates only — NOT on every animation frame.

export const DISRUPTION_VARIANCE_THRESHOLD = 0.82;

// stateId distance that qualifies as entropy acceleration
const STATE_JUMP_THRESHOLD = 2;

export const SEVERITY = {
  REGIME_SHIFT:  'REGIME_SHIFT',   // low-frequency structural transition
  CRITICAL_SURGE: 'CRITICAL_SURGE', // imminent boundary breakdown
};

// Internal — tracks previous locked stateId for transition detection
let _prevStateId = null;

/**
 * evaluateDisruption
 *
 * Evaluates active runtime state for structural breaks.
 *
 * @param {Object} convergenceResult — { stateId, label, theme } from applyTransitionPolicy()
 * @param {Object|null} asDiffResult — from compareSignals(), null if no comparison active
 * @param {string[]} violatedDomains — canonical domain names driving the anomaly
 * @returns {DisruptionEvent}
 */
export function evaluateDisruption(convergenceResult, asDiffResult = null, violatedDomains = []) {
  const { stateId } = convergenceResult;
  const triggers = [];
  let varianceMagnitude = 0;
  let stateTransition = null;

  // Trigger 1: State transition discontinuity
  // Jump ≥ 2 stateId units (e.g. 4→2, 3→0) = entropy acceleration
  if (_prevStateId !== null && Math.abs(stateId - _prevStateId) >= STATE_JUMP_THRESHOLD) {
    triggers.push('STATE_JUMP');
    stateTransition = { from: _prevStateId, to: stateId };
  }
  _prevStateId = stateId;

  if (asDiffResult !== null) {
    const { divergence, asymmetric_capture, incomparability_flag, dominant_axis_gap } = asDiffResult;
    varianceMagnitude = divergence ?? 0;

    // Trigger 2: AS-DIFF variance spike
    if (varianceMagnitude > DISRUPTION_VARIANCE_THRESHOLD) {
      triggers.push('ASDIFF_VARIANCE');
    }

    // Trigger 3: Asymmetric capture + incomparability co-fire
    // A's structural weakness IS B's strength, AND domains cannot be compared —
    // compound condition signals an extreme boundary condition.
    if (asymmetric_capture && incomparability_flag) {
      triggers.push('ASYMMETRIC_INCOMPARABILITY');
    }

    // Trigger 4: Dominant axis gap collapse
    // Single dimension driving >70% of leverage delta = field concentration / instability.
    if ((dominant_axis_gap ?? 0) > 0.70) {
      triggers.push('AXIS_COLLAPSE');
    }
  }

  const isActive = triggers.length > 0;

  // Severity: CRITICAL_SURGE when multiple triggers fire or variance is maximal
  const severity = isActive
    ? (triggers.length >= 2 || varianceMagnitude > 0.92)
      ? SEVERITY.CRITICAL_SURGE
      : SEVERITY.REGIME_SHIFT
    : null;

  return {
    isActive,
    severity,
    triggers,
    violatedDomains,
    varianceMagnitude: parseFloat(varianceMagnitude.toFixed(4)),
    stateTransition,
    ts: new Date().toISOString(),
  };
}

/**
 * resetDisruptionState
 * Call when a new session begins or query is cleared.
 */
export function resetDisruptionState() {
  _prevStateId = null;
}
