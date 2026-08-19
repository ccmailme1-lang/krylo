// orchestrator.js — Relationship Validator, Phase 1 (foundation).
// Implements SPEC-relationship-validator-adapter-orchestration-design.md §4 and the six-stage
// composition rule from SPEC-relationship-validator-validation-profile.md §1.
//
// The ONLY module permitted to call more than one operator or construct a ValidationProfile.
// No operator imports another operator (common contract §6 — enforced structurally by nothing
// under src/engine/validator/operators/ importing from a sibling operator file; see the
// write-firewall check, scripts/check-validator-firewall.mjs).

import { buildScopedContext } from './context/index.js';

// Class A/B/C — SPEC-relationship-validator-operators.md §9. Locked; do not infer membership
// from anything other than this table.
export const OPERATOR_CLASS = Object.freeze({
  TEMPORAL:     'A',
  STRUCTURAL:   'A',
  INDEPENDENCE: 'A',
  STABILITY:    'A',
  LAG:          'B',
  RECURRENCE:   'B',
  INFORMATION:  'B',
  ALTERNATIVES: 'C',
});

const CLASS_A_OPERATORS = Object.freeze(
  Object.entries(OPERATOR_CLASS).filter(([, c]) => c === 'A').map(([name]) => name)
);

// OPERATOR_REGISTRY — populated incrementally in Phase 2 (adaptation-only: INDEPENDENCE,
// INFORMATION, RECURRENCE) and Phase 3 (new-logic: TEMPORAL, ALTERNATIVES, LAG, STABILITY,
// STRUCTURAL), per the implementation WO §4 build sequence. Empty in Phase 1 by design — the
// orchestrator and composeProfile() below are fully testable without any operator existing yet.
export const OPERATOR_REGISTRY = {};

// registerOperator(name, operator) — operator: { applicabilityPredicate(candidate, context),
// test(candidate, context) → OperatorResult }. Called by each operator adapter module as it's
// built in Phase 2/3 — this file does not import operator files itself, keeping the dependency
// direction one-way (operators know nothing of the orchestrator's existence beyond this call).
export function registerOperator(name, operator) {
  if (!(name in OPERATOR_CLASS)) {
    throw new Error(`registerOperator: "${name}" is not one of the eight locked operators`);
  }
  OPERATOR_REGISTRY[name] = operator;
}

function naResult(operatorName, reason) {
  return Object.freeze({
    operator: operatorName,
    state: 'N/A',
    evidence_refs: Object.freeze([]),
    rationale: reason,
    contract_version: '1.0.0',
    operator_version: null,
  });
}

// runOperator — applicability check, then test, for one operator. Never throws on a missing
// registration; an unregistered operator is honestly N/A ("not yet implemented"), not a crash,
// consistent with §22 — Phase 1/2/3 partial builds must degrade to absence, not failure.
function runOperator(name, candidate, providerOptions) {
  const operator = OPERATOR_REGISTRY[name];
  if (!operator) return naResult(name, 'NOT_YET_IMPLEMENTED');

  const context = buildScopedContext(name, candidate, providerOptions);
  const applicable = operator.applicabilityPredicate(candidate, context);
  if (applicable !== true) {
    const reason = (applicable && typeof applicable === 'object' && applicable.reason) || 'INAPPLICABLE';
    return naResult(name, reason);
  }
  return operator.test(candidate, context);
}

// composeProfile(results: OperatorResult[]) → overall_status
// Pure function — the six-stage priority rule, SPEC-relationship-validator-validation-profile.md
// §1. Testable in complete isolation from real operators (see Phase 1 DoD).
export function composeProfile(results) {
  const byName = Object.fromEntries(results.map(r => [r.operator, r]));
  const classA = CLASS_A_OPERATORS.map(name => byName[name]).filter(Boolean);

  // Stage 2 — Class A contradiction. Dominant.
  if (classA.some(r => r.state === 'FAIL')) return 'CONTRADICTED';

  // Stage 3 — no evaluable Class A evidence at all.
  if (classA.length > 0 && classA.every(r => r.state === 'N/A')) return 'UNDETERMINED';

  // Stage 4 — Class A ran but inconclusive.
  if (classA.some(r => r.state === 'UNDETERMINED')) return 'UNDETERMINED';

  // Stage 5 — Class A supported, coverage-aware.
  const passed = classA.filter(r => r.state === 'PASS');
  const naCount = classA.filter(r => r.state === 'N/A').length;
  if (passed.length > 0 && passed.length + naCount === classA.length) {
    const alternatives = byName.ALTERNATIVES;
    const fullCoverage = naCount === 0;
    if (fullCoverage) {
      return alternatives?.state === 'CONFLICT' ? 'SUPPORTED_WITH_COMPETING_EXPLANATION' : 'SUPPORTED';
    }
    return 'PARTIALLY_SUPPORTED';
  }

  // No Class A operators registered/applicable at all — cannot claim support (same reasoning
  // as stage 3, reached only if classA.length === 0, e.g. very early Phase 1/2 states).
  return 'UNDETERMINED';
}

// buildValidationProfile(candidate, providerOptions) → ValidationProfile
// The full pipeline: applicability → invocation → composition. Deterministic — identical
// candidate + providerOptions produces an identical profile (Phase 1 DoD test).
export function buildValidationProfile(candidate, providerOptions = {}) {
  const operatorNames = Object.keys(OPERATOR_CLASS);
  const results = operatorNames.map(name => runOperator(name, candidate, providerOptions));

  const operators = Object.fromEntries(results.map(r => [r.operator, r]));
  const applicability_summary = Object.fromEntries(
    results.map(r => [r.operator, r.state === 'N/A' ? { ran: false, reason: r.rationale } : { ran: true }])
  );
  const competing_notes = results
    .filter(r => r.competing_structures?.length)
    .flatMap(r => r.competing_structures);

  return Object.freeze({
    candidate_id: candidate.id,
    operators: Object.freeze(operators),
    overall_status: composeProfile(results),
    competing_notes: Object.freeze(competing_notes),
    applicability_summary: Object.freeze(applicability_summary),
    contract_version: '1.0.0',
    generated_at: Date.now(),
  });
}
