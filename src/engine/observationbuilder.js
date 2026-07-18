// observationbuilder.js — KRYL-1009 Observation Builder (engine-first slice).
// Compose reusable STRUCTURAL DETECTORS: evidence operators + AND/OR gate + thresholds + temporal
// windows → a confidence-scored emergent-theme observation. DETECTION, never prediction — an
// ObservationDefinition declares WHAT TO OBSERVE; it never forecasts. The drag-drop UI is a separate
// Founder-domain layer on top; this is the verifiable backend.
//
// GUARDRAILS (composed detectors inherit the discipline of the signals they read):
//  §22 — an operand whose evidence is ABSENT is a classified MISSING, never a silent fail-to-zero. An
//        AND detector with missing required evidence WITHHOLDS (cannot confirm) rather than assert "not
//        detected" with a fabricated score.
//  math-checks-out — confidence is the mean confidence of the matched signals; thresholds are DECLARED
//        in the definition, never invented at evaluation time.
//  §11a — output is an observation of present structure, no forward/causal claim.

const COMPARATORS = {
  '>=':      (v, t) => v >= t,
  '>':       (v, t) => v > t,
  '<=':      (v, t) => v <= t,
  '<':       (v, t) => v < t,
  '=':       (v, t) => v === t,
  present:   (v)    => v != null,
  absent:    (v)    => v == null,
};

export function validateDefinition(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return { valid: false, errors: ['definition must be an object'] };
  if (!def.id)   errors.push('definition requires an id');
  if (!def.name) errors.push('definition requires a name');
  if (!['AND', 'OR'].includes(def.gate)) errors.push("gate must be 'AND' or 'OR'");
  if (!Array.isArray(def.operands) || def.operands.length === 0) errors.push('definition requires ≥1 operand');
  for (const [i, op] of (def.operands ?? []).entries()) {
    if (!op.signalKey) errors.push(`operand[${i}] requires signalKey`);
    if (!(op.comparator in COMPARATORS)) errors.push(`operand[${i}] bad comparator: ${op.comparator}`);
    if (!['present', 'absent'].includes(op.comparator) && typeof op.threshold !== 'number') {
      errors.push(`operand[${i}] comparator ${op.comparator} requires a numeric threshold`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * evaluateObservation(def, context, { nowTs }) → observation
 * @param context { signals: { [signalKey]: { value:number, confidence?:number, ts?:number } } }
 * @returns {
 *   id, name, gate, detected:boolean|null, confidence:number|null, withheld:boolean,
 *   matched[], failed[], missing[], reason
 * }
 *   detected=null + withheld=true → §22: required evidence absent under an AND gate (cannot confirm).
 */
export function evaluateObservation(def, context = {}, { nowTs = Date.now() } = {}) {
  const v = validateDefinition(def);
  if (!v.valid) return { id: def?.id ?? null, detected: null, withheld: true, reason: 'INVALID_DEFINITION', errors: v.errors };

  const signals = context.signals ?? {};
  const matched = [], failed = [], missing = [];
  const matchedConfidences = [];

  for (const op of def.operands) {
    const sig = signals[op.signalKey];
    // temporal window: if declared, the signal must be observed within it (else treated as absent/stale)
    const fresh = sig && (op.window == null || sig.ts == null || (nowTs - sig.ts) <= op.window);
    if (!sig || !fresh) {
      if (op.comparator === 'absent') { matched.push(op.signalKey); continue; } // absence IS the match
      missing.push(op.signalKey);                                                // §22 classified missing
      continue;
    }
    const pass = COMPARATORS[op.comparator](sig.value, op.threshold);
    if (pass) { matched.push(op.signalKey); matchedConfidences.push(typeof sig.confidence === 'number' ? sig.confidence : 1); }
    else failed.push(op.signalKey);
  }

  // §22 — AND gate cannot be confirmed if any required operand's evidence is missing → WITHHOLD.
  if (def.gate === 'AND' && missing.length > 0) {
    return { id: def.id, name: def.name, gate: def.gate, detected: null, withheld: true, matched, failed, missing, reason: 'MISSING_REQUIRED_EVIDENCE', confidence: null };
  }

  const detected = def.gate === 'AND'
    ? failed.length === 0 && missing.length === 0
    : matched.length > 0;

  // confidence = mean confidence of the signals that matched (honest; null when nothing matched)
  const confidence = matchedConfidences.length
    ? +(matchedConfidences.reduce((a, b) => a + b, 0) / matchedConfidences.length).toFixed(4)
    : null;

  return { id: def.id, name: def.name, gate: def.gate, detected, withheld: false, matched, failed, missing, reason: null, confidence };
}
