// constraintfabric.js — KRYL-1070 RFA Constraint Fabric (CF).
// The domain WALLS a mechanism must survive. Per the closure spine (specs/rfa-integration-closure-
// spine.md §50): the constraints ARE the closed world — E ↔ ∨Cᵢ (Clark completion). CF scopes
// closure and detects Constraint Competition (multiple limiting factors bearing on one mechanism).
// It does NOT reason about mechanisms — it bounds them. Deterministic → reports are reproducible.
//
// SLICE 1 boundary: Constraint Catalog v0.1 is fixed (POWER_CAP, CAPEX, PERMIT, LABOR). The
// SME-precision ≥70% acceptance target is a VALIDATION gate over real labelled cases — deferred
// to the RFA validation ticket, not claimed here.

export const CONSTRAINT_CATALOG = Object.freeze({
  POWER_CAP: { id: 'POWER_CAP', label: 'Power availability ceiling', kind: 'PHYSICAL' },
  CAPEX:     { id: 'CAPEX',     label: 'Capital expenditure limit',  kind: 'FINANCIAL' },
  PERMIT:    { id: 'PERMIT',    label: 'Regulatory / permitting',    kind: 'REGULATORY' },
  LABOR:     { id: 'LABOR',     label: 'Labor / skills availability', kind: 'HUMAN' },
});

let _seq = 0;
const mkId = p => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/**
 * evaluateConstraints(mechanism, activeConstraints, { provenance }) → ConstraintReport
 * @param {Object} mechanism         a MechanismBundle (from AR)
 * @param {Array}  activeConstraints [{ id (∈ CATALOG), severity 0..1, note? }]
 * @returns ConstraintReport {
 *   report_id, mechanism_id, constraints[], competition[], binding, closed, boundary_clause, provenance
 * }
 *   competition = the set of constraints jointly binding (severity ≥ COMPETE_FLOOR) — the "power +
 *   transformer + permit" case; binding = the single highest-severity wall. §21: constraints are
 *   kept UNCOLLAPSED (no blended constraint score), competition is surfaced as a set.
 */
export const COMPETE_FLOOR = 0.5;

export function evaluateConstraints(mechanism, activeConstraints = [], { provenance = null } = {}) {
  const errors = [];
  const constraints = activeConstraints
    .filter(c => {
      const ok = c && CONSTRAINT_CATALOG[c.id] && typeof c.severity === 'number';
      if (!ok) errors.push(`invalid constraint entry: ${JSON.stringify(c)}`);
      return ok;
    })
    .map(c => ({ id: c.id, kind: CONSTRAINT_CATALOG[c.id].kind, severity: +c.severity.toFixed(4), note: c.note ?? null }));

  const competing = constraints.filter(c => c.severity >= COMPETE_FLOOR);
  const binding = constraints.reduce((a, b) => (!a || b.severity > a.severity ? b : a), null);

  return {
    report_id:   mkId('cons'),
    mechanism_id: mechanism?.mechanism_id ?? null,
    constraints,                                   // uncollapsed, per §21
    competition: competing.length >= 2 ? competing.map(c => c.id) : [],
    binding:     binding ? binding.id : null,
    closed:      constraints.length > 0,           // a bounded constraint set = a closed world
    boundary_clause: 'CLOSURE_SCOPED',
    errors,
    provenance,
  };
}
