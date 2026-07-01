// WO-2068 — Availability Filter
// Feasibility gate: filters the candidate set to user-accessible opportunities only.
// Runs after Decision Invariant mapping (WO-2066 Phase 3/4), before ranking and Cone rendering.
// Hard filter — eliminates candidates that fail enforced feasibility constraints.
// Does NOT deprioritize, score, or rank. Eliminates only.
//
// Availability IS:  feasibility under user-specific constraints
// Availability NOT: desirability, probability, or value
//
// Two filter spaces — never conflated:
//   Validity filter (system-side)    → upstream, handled by epistemic invariants + domain reasoning
//   Availability filter (user-side)  → this engine, user constraint model applied here

// ── Constraint categories (exhaustive) ───────────────────────────────────────

export const CONSTRAINT_CATEGORIES = [
  'CAPITAL_ACCESS',        // can the user fund this opportunity
  'LEGAL_ELIGIBILITY',     // legal authorization, accreditation, licensing
  'GEOGRAPHY',             // jurisdiction, location, operational reach
  'TIME_WINDOW',           // opportunity window vs user's available timeline
  'EXECUTION_CAPABILITY',  // operational capacity to act
  'RISK_TOLERANCE',        // user-declared or inferred risk bounds
  'INFORMATIONAL_ACCESS',  // user has or can obtain required information
];

// ── User constraint model ─────────────────────────────────────────────────────
// Each constraint declares a bound, an operator, and whether it is enforced (hard) or advisory.
// enforced: true  → hard elimination on failure
// enforced: false → annotated warning only, candidate passes

// Constraint schema per category:
// {
//   bound:    any                                        — declared limit value (type varies)
//   operator: 'MAX' | 'MIN' | 'RANGE' | 'EXACT' | 'BOOLEAN'
//   enforced: boolean                                    — default true
// }

export function makeConstraintModel(overrides = {}) {
  const model = {};
  for (const cat of CONSTRAINT_CATEGORIES) {
    model[cat] = overrides[cat] ?? null;
  }
  return model;
}

// ── Evaluator registry ────────────────────────────────────────────────────────
// Each constraint category can register its own evaluator independently (plug-in).
// evaluatorFn(frozenAdaptedOutput, constraint) → { passed: boolean, reason?: string }

const _evaluators = new Map();

export function registerConstraintEvaluator(category, evaluatorFn) {
  if (!CONSTRAINT_CATEGORIES.includes(category)) {
    throw new Error(`Unknown constraint category: ${category}`);
  }
  if (typeof evaluatorFn !== 'function') {
    throw new Error(`Constraint evaluator for ${category} must be a function`);
  }
  _evaluators.set(category, evaluatorFn);
}

export function isEvaluatorRegistered(category) {
  return _evaluators.has(category);
}

// ── Single-candidate filter ───────────────────────────────────────────────────

export function applyAvailabilityFilter(adaptedOutput, constraintModel) {
  const rejections  = [];
  const advisories  = [];

  for (const category of CONSTRAINT_CATEGORIES) {
    const constraint = constraintModel[category];

    // No constraint declared for this category — unconditional pass
    if (constraint === null || constraint === undefined) continue;

    // No evaluator registered — cannot evaluate, skip silently
    if (!_evaluators.has(category)) continue;

    const evaluator = _evaluators.get(category);

    // Read-only — no mutation path into upstream adapted output
    const frozen = Object.freeze(JSON.parse(JSON.stringify(adaptedOutput)));
    const result  = evaluator(frozen, constraint);

    if (!result.passed) {
      const entry = {
        category,
        reason: result.reason ?? `Failed ${category} constraint`,
        bound:  constraint.bound ?? null,
      };
      if (constraint.enforced === false) {
        advisories.push(entry);
      } else {
        rejections.push(entry);
      }
    }
  }

  return {
    passed:     rejections.length === 0,
    candidate:  adaptedOutput,
    rejections,
    advisories,
    filteredAt: Date.now(),
  };
}

// ── Candidate set filter ──────────────────────────────────────────────────────
// Filters a full set of adapted invariant outputs against a user constraint model.
// Returns only candidates that pass all enforced constraints.
// Eliminated candidates carry rejection reasons for audit trail.

export function filterCandidateSet(adaptedOutputs, constraintModel) {
  if (!Array.isArray(adaptedOutputs)) {
    throw new Error('filterCandidateSet: adaptedOutputs must be an array');
  }
  if (!constraintModel || typeof constraintModel !== 'object') {
    throw new Error('filterCandidateSet: constraintModel must be an object');
  }

  const passed     = [];
  const eliminated = [];

  for (const candidate of adaptedOutputs) {
    const result = applyAvailabilityFilter(candidate, constraintModel);
    if (result.passed) {
      passed.push({ candidate: result.candidate, advisories: result.advisories });
    } else {
      eliminated.push({ candidate: result.candidate, rejections: result.rejections });
    }
  }

  return {
    passed,
    eliminated,
    totalInput:      adaptedOutputs.length,
    totalPassed:     passed.length,
    totalEliminated: eliminated.length,
    filteredAt:      Date.now(),
  };
}
