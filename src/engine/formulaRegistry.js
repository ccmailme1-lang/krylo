// src/engine/formulaRegistry.js — Formula Registry M0 (WO: Decision Input Contract).
//
// AUTHORITY BOUNDARY (hard rule, not a suggestion): no governed deterministic calculation may
// execute outside FormulaRegistry.execute(). Same discipline metricsengine.js already enforces
// for metrics ("computed ONLY in metricsengine.js") — this is that same pattern for formulas.
//
// Every result is WITHHELD-shaped, never a thrown exception reaching the perception layer.
// FORMULA_UNAVAILABLE / INVALID_INPUT / CONSTRAINT_FAILED are evaluation OUTCOMES, not crashes.
// The registry reports what happened; it does not decide what the absence means (§22 — that
// stays the caller's/classifier's job).
//
// ID format: NAMESPACE.KEY@1 — the "@1" is a fixed identifier label, not a real versioning
// capability. No version negotiation, resolution, or migration in M0. A formula's math is
// immutable once shipped by convention: a real change gets a new key, never an edit in place.

const FORMULA_EVALUATORS = {
  'FIN.LOAN_PRINCIPAL@1': ({ purchase_price_offer, percent_down_payment }) => {
    if (typeof purchase_price_offer !== 'number' || purchase_price_offer < 0) return null;
    const pct = percent_down_payment ?? 0;
    if (pct < 0 || pct > 100) return null;
    return purchase_price_offer * (1 - pct / 100);
  },
  'FIN.PMT_30YR@1': ({ loan_principal, mortgage_rate_weekly }) => {
    if (typeof loan_principal !== 'number' || loan_principal < 0) return null;
    if (typeof mortgage_rate_weekly !== 'number' || mortgage_rate_weekly <= 0) return null;
    const r = mortgage_rate_weekly / 100 / 12;
    const n = 360;
    return loan_principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  },
  // additional formulas added here only — never inline in a DIC file, never overwriting an
  // existing key.
};

/**
 * execute — the ONLY governed way to run a deterministic formula.
 * @param {string} formulaId — e.g. "FIN.PMT_30YR@1"
 * @param {object} inputs
 * @returns {{status:'SUCCESS', value:number, formulaId}|{status:'WITHHELD', reason:string, formulaId}}
 */
function execute(formulaId, inputs) {
  const fn = FORMULA_EVALUATORS[formulaId];
  if (!fn) return { status: 'WITHHELD', reason: 'FORMULA_UNAVAILABLE', formulaId };
  let value;
  try {
    value = fn(inputs ?? {});
  } catch {
    return { status: 'WITHHELD', reason: 'CONSTRAINT_FAILED', formulaId };
  }
  if (value === null || !Number.isFinite(value)) {
    return { status: 'WITHHELD', reason: 'INVALID_INPUT', formulaId };
  }
  return { status: 'SUCCESS', value, formulaId };
}

export const FormulaRegistry = { execute };
