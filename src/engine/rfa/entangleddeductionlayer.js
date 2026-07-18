// entangleddeductionlayer.js — KRYL-1071 RFA Entangled Deduction Layer (EDL).
// Pressure-tests an abductive mechanism: Explanation → Expected Structure → Reality Comparison.
// HARD BOUNDARY (spec): NO PREDICTIONS — ABSENCE TEST ONLY. EDL asks "if this mechanism holds,
// what states must be present AND absent?" then compares to the Temporal Observation Fabric
// (KRYL-1075). It never forecasts a future value; it only checks invariance against observed
// present/absent reality. This is the promoted, contract-bearing form of the skeleton's deduce().
import { buildInvarianceRecord } from '../temporalobservationfabric.js';

let _seq = 0;
const mkId = p => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/**
 * deduce(mechanism, fabric, { provenance, minCounterstates }) → DeductionBundle
 * @returns {
 *   deduction_id, parent_exp_id, parent_type:'MECHANISM', from, to,
 *   expected_states, observed_states, lcc, evs, nsi, ris, inference_distance, boundary_clause, provenance
 * }
 *   Metrics (absence-test only, all derived from the TOF invariance record):
 *     LCC Logical Consequence Coverage = fraction of expected consequences observed
 *     EVS Expectation Violation Score  = present-cause-without-effect rate (invariance breaks)
 *     NSI Negative Space Index (§22)   = absence-counterstate coverage (absent→¬effect confirmed)
 *     RIS Reasoning Integrity Score    = LCC·(1−EVS) gated on sufficient counterstates
 *   A withheld record (insufficient counterstates) → status WITHHELD, metrics null (no fabricated fit).
 */
export function deduce(mechanism, fabric, { provenance = null, minCounterstates = 2 } = {}) {
  const from = mechanism?.from, to = mechanism?.to;
  const rec = buildInvarianceRecord(fabric, from, to, { minCounterstates });

  if (!rec) {
    return {
      deduction_id: mkId('ded'), parent_exp_id: mechanism?.mechanism_id ?? null, parent_type: 'MECHANISM',
      from, to, expected_states: { presence: `${to} present`, absence: `${to} absent` },
      observed_states: null, lcc: null, evs: null, nsi: null, ris: null,
      inference_distance: 1, boundary_clause: 'ABSENCE_TEST_WITHHELD_INSUFFICIENT_COUNTERSTATES',
      status: 'WITHHELD', provenance,
    };
  }

  const { presentTotal, presentWithEffect, absentTotal, absentWithEffect } = rec;
  const lcc = presentTotal ? +(presentWithEffect / presentTotal).toFixed(4) : 0;   // consequence coverage
  const evs = presentTotal ? +((presentTotal - presentWithEffect) / presentTotal).toFixed(4) : 1; // violations
  const nsi = absentTotal ? +((absentTotal - absentWithEffect) / absentTotal).toFixed(4) : 0;      // §22 negative space
  const ris = +(lcc * (1 - evs)).toFixed(4);
  // invariance holds iff present→effect always AND absent→¬effect always (strict biconditional)
  const holds = presentWithEffect === presentTotal && absentWithEffect === 0;

  return {
    deduction_id: mkId('ded'), parent_exp_id: mechanism?.mechanism_id ?? null, parent_type: 'MECHANISM',
    from, to,
    expected_states: { presence: `${to} present when ${from} present`, absence: `${to} absent when ${from} absent` },
    observed_states: { presentTotal, presentWithEffect, absentTotal, absentWithEffect },
    lcc, evs, nsi, ris,
    inference_distance: 1,
    boundary_clause: 'ABSENCE_TEST_ONLY',
    status: holds ? 'CORROBORATED' : 'CONTRADICTED',
    provenance,
  };
}
