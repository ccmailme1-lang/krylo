// WO-2072 — User Constraint State Model (UCSM Schema)
// Populates the plug-in mechanism WO-2068 (availabilityfilter.js) already defines but never
// gets fed: registers one evaluator per CONSTRAINT_CATEGORIES and maps a raw user profile into
// a real constraintModel. Does not touch availabilityfilter.js's filter/rank logic.

import {
  CONSTRAINT_CATEGORIES,
  makeConstraintModel,
  registerConstraintEvaluator,
} from './availabilityfilter.js';

// ── Bound-type contract per category (spec: WO-2072-user-constraint-state-model.md) ─────────
//   CAPITAL_ACCESS        — number (USD, user's max deployable capital), operator MAX
//   LEGAL_ELIGIBILITY      — string[] (held licenses/accreditations),   operator BOOLEAN (membership)
//   GEOGRAPHY               — string[] (ISO jurisdiction codes),         operator EXACT (membership)
//   TIME_WINDOW             — number (days available before close),      operator MIN
//   EXECUTION_CAPABILITY    — number (0–100, §16 scale),                 operator MIN
//   RISK_TOLERANCE          — number (0–100, §16 scale),                 operator MAX
//   INFORMATIONAL_ACCESS   — boolean,                                    operator BOOLEAN

// ── Evaluators (one per category) ─────────────────────────────────────────────
// evaluatorFn(frozenAdaptedOutput, constraint) → { passed: boolean, reason?: string }
// Candidate requirement fields are read from adaptedOutput.requirements[category] —
// the shape a Domain Package / Metric Adapter would populate per candidate.

function evalCapitalAccess(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.CAPITAL_ACCESS ?? null;
  if (required === null) return { passed: true };
  const passed = required <= constraint.bound;
  return passed ? { passed } : { passed, reason: `Requires $${required.toLocaleString()}, user bound $${constraint.bound.toLocaleString()}` };
}

function evalLegalEligibility(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.LEGAL_ELIGIBILITY ?? [];
  if (!required.length) return { passed: true };
  const held = new Set(constraint.bound ?? []);
  const missing = required.filter(r => !held.has(r));
  return missing.length === 0
    ? { passed: true }
    : { passed: false, reason: `Missing credential(s): ${missing.join(', ')}` };
}

function evalGeography(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.GEOGRAPHY ?? null;
  if (!required) return { passed: true };
  const allowed = new Set(constraint.bound ?? []);
  return allowed.has(required)
    ? { passed: true }
    : { passed: false, reason: `Requires jurisdiction ${required}, not in user's ${[...allowed].join(', ')}` };
}

function evalTimeWindow(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.TIME_WINDOW ?? null;
  if (required === null) return { passed: true };
  const passed = constraint.bound >= required;
  return passed ? { passed } : { passed, reason: `Requires ${required}d window, user has ${constraint.bound}d` };
}

function evalExecutionCapability(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.EXECUTION_CAPABILITY ?? null;
  if (required === null) return { passed: true };
  const passed = constraint.bound >= required;
  return passed ? { passed } : { passed, reason: `Requires capability ${required}/100, user at ${constraint.bound}/100` };
}

function evalRiskTolerance(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.RISK_TOLERANCE ?? null;
  if (required === null) return { passed: true };
  const passed = required <= constraint.bound;
  return passed ? { passed } : { passed, reason: `Implied risk ${required}/100 exceeds user tolerance ${constraint.bound}/100` };
}

function evalInformationalAccess(adaptedOutput, constraint) {
  const required = adaptedOutput.requirements?.INFORMATIONAL_ACCESS ?? false;
  if (!required) return { passed: true };
  return constraint.bound === true
    ? { passed: true }
    : { passed: false, reason: 'Required information not accessible to user' };
}

const EVALUATORS = {
  CAPITAL_ACCESS:       evalCapitalAccess,
  LEGAL_ELIGIBILITY:    evalLegalEligibility,
  GEOGRAPHY:            evalGeography,
  TIME_WINDOW:          evalTimeWindow,
  EXECUTION_CAPABILITY: evalExecutionCapability,
  RISK_TOLERANCE:       evalRiskTolerance,
  INFORMATIONAL_ACCESS: evalInformationalAccess,
};

let _registered = false;

// Idempotent — safe to call from multiple import sites without double-registering.
export function registerUcsmEvaluators() {
  if (_registered) return;
  for (const category of CONSTRAINT_CATEGORIES) {
    registerConstraintEvaluator(category, EVALUATORS[category]);
  }
  _registered = true;
}

registerUcsmEvaluators();

// ── Profile → constraintModel ─────────────────────────────────────────────────
// userProfile: raw fields as captured from the user (session/profile state).
// Maps 1:1 to the bound-type contract above. Any field left undefined stays
// unconstrained for that category (unconditional pass — matches
// applyAvailabilityFilter's existing "no constraint declared" behavior).

export function buildConstraintModel(userProfile = {}) {
  const overrides = {};

  if (userProfile.maxCapital != null) {
    overrides.CAPITAL_ACCESS = { bound: userProfile.maxCapital, operator: 'MAX', enforced: userProfile.capitalEnforced ?? true };
  }
  if (userProfile.credentials != null) {
    overrides.LEGAL_ELIGIBILITY = { bound: userProfile.credentials, operator: 'BOOLEAN', enforced: userProfile.legalEnforced ?? true };
  }
  if (userProfile.jurisdictions != null) {
    overrides.GEOGRAPHY = { bound: userProfile.jurisdictions, operator: 'EXACT', enforced: userProfile.geoEnforced ?? true };
  }
  if (userProfile.availableDays != null) {
    overrides.TIME_WINDOW = { bound: userProfile.availableDays, operator: 'MIN', enforced: userProfile.timeEnforced ?? true };
  }
  if (userProfile.executionCapability != null) {
    overrides.EXECUTION_CAPABILITY = { bound: userProfile.executionCapability, operator: 'MIN', enforced: userProfile.executionEnforced ?? true };
  }
  if (userProfile.riskTolerance != null) {
    overrides.RISK_TOLERANCE = { bound: userProfile.riskTolerance, operator: 'MAX', enforced: userProfile.riskEnforced ?? true };
  }
  if (userProfile.informationalAccess != null) {
    overrides.INFORMATIONAL_ACCESS = { bound: userProfile.informationalAccess, operator: 'BOOLEAN', enforced: userProfile.infoEnforced ?? true };
  }

  return makeConstraintModel(overrides);
}
