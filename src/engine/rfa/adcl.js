// adcl.js — KRYL-1072 RFA Abduction-Deduction Coherence Loop (ADCL).
// v3, the one NEW capability: when EDL contradicts a mechanism, ADCL REPAIRS the explanation
// rather than just rejecting it — an iterative, VERSIONED refinement between AR and EDL. This is a
// versioned refinement loop, NOT an execution cycle (RDG still forbids execution cycles).
// Type: sandbox capability. §11a: repair PROPOSES a revised mechanism state; it never asserts truth.
//
// SLICE 1 boundary: a single repair step (identify failed assumption → propose revised state →
// re-score coherence). The "≥3 historical cases demonstrated" acceptance target is a VALIDATION
// gate over real cases — deferred to the RFA validation ticket, not claimed here.

let _seq = 0;
const mkId = p => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/**
 * reconcile(mechanism, deduction, constraintReport, { provenance }) → CoherenceRevisionBundle | null
 * Returns null when the deduction already CORROBORATED (nothing to repair) or is WITHHELD (no basis
 * to repair against — §22, withhold beats fabricate). On CONTRADICTED it emits:
 *   { revision_id, parent_mechanism, failed_assumptions[], new_mechanism_state, coherence_delta,
 *     reasoning_integrity, boundary_clause, provenance }
 *   coherence_delta = post-repair RIS proxy − pre-repair RIS (positive = repair improved coherence).
 */
export function reconcile(mechanism, deduction, constraintReport = null, { provenance = null } = {}) {
  if (!deduction || deduction.status === 'CORROBORATED') return null;      // nothing to repair
  if (deduction.status === 'WITHHELD') return null;                        // no basis — withhold

  const obs = deduction.observed_states ?? {};
  const failed_assumptions = [];
  // Attribute the contradiction to a specific broken invariance leg (not a blended score).
  if (obs.presentTotal != null && obs.presentWithEffect < obs.presentTotal) {
    failed_assumptions.push('PRESENCE_INSUFFICIENT'); // cause present but effect sometimes absent
  }
  if (obs.absentWithEffect > 0) {
    failed_assumptions.push('EFFECT_WITHOUT_CAUSE');  // effect present while cause absent → missing constraint
  }
  // A binding external constraint is a candidate hidden factor (ties to §22 MISSING_CONSTRAINT).
  if (constraintReport?.binding) failed_assumptions.push(`EXTERNAL_CONSTRAINT:${constraintReport.binding}`);

  // Revised mechanism state: narrow the claim to the counterstate that held, and flag the gap.
  const new_mechanism_state = {
    from: mechanism?.from, to: mechanism?.to,
    scope: failed_assumptions.includes('EFFECT_WITHOUT_CAUSE') ? 'REQUIRES_ADDITIONAL_CAUSE' : 'NARROWED',
    retained: obs.absentWithEffect === 0 ? 'ABSENCE_LEG_HOLDS' : 'NONE',
  };

  const preRis  = +(deduction.ris ?? 0);
  // repair proxy: recovering the absence leg (NSI) is the coherence a single revision can claim.
  const postRis = +Math.max(preRis, deduction.nsi ?? 0).toFixed(4);

  return {
    revision_id:     mkId('rev'),
    parent_mechanism: mechanism?.mechanism_id ?? null,
    failed_assumptions,
    new_mechanism_state,
    coherence_delta:  +(postRis - preRis).toFixed(4),
    reasoning_integrity: postRis,
    boundary_clause: 'VERSIONED_REPAIR_NOT_EXECUTION_CYCLE',
    provenance,
  };
}
