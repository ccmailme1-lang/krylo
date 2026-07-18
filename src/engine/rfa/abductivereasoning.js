// abductivereasoning.js — KRYL-1069 RFA Abductive Reasoning Engine (AR).
// Generates candidate MECHANISMS that explain a structural pattern (the SCE/ExplanationBundle).
// Abduction PROPOSES, never asserts (§11a detect-not-predict). Every mechanism is PROJECTED until
// EDL's absence test (KRYL-1071) corroborates it. This is the promoted, contract-bearing form of
// the walking skeleton's inline abduce().
//
// SLICE 1 boundary_clause: mechanism candidates are drawn from the Constraint Fabric's bounded
// abducible set (closed world, E ↔ ∨Cᵢ). plausibility/support_gap/reasoning_integrity are
// STRUCTURAL scores over the candidate set (no external data) — honest priors, not measured fit;
// measured fit arrives via EDL. Validation of plausibility calibration is the deferred SME AC.
import { MODE } from '../causalepistemicstamp.js';

let _seq = 0;
const mkId = p => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/**
 * abduceMechanisms(effect, abducibles, { parentExpId, provenance }) → MechanismBundle[]
 * @param {string} effect      the observed structural pattern to explain
 * @param {string[]} abducibles the closed-world candidate causes (from Constraint Fabric)
 * @returns {Object[]} MechanismBundle per spec:
 *   { mechanism_id, parent_exp_id, from, to, latent_factors, plausibility, support_gap,
 *     reasoning_integrity, inference_distance, boundary_clause, mode, status, provenance }
 */
export function abduceMechanisms(effect, abducibles = [], { parentExpId = null, provenance = null } = {}) {
  const n = abducibles.length;
  // Structural priors: a smaller closed world makes each candidate individually more plausible
  // (fewer competing explanations); support_gap is the fraction of the world NOT this candidate.
  const plausibility = n ? +(1 / n).toFixed(4) : 0;
  const support_gap  = n ? +((n - 1) / n).toFixed(4) : 1;
  return abducibles.map(cause => ({
    mechanism_id:       mkId('mech'),
    parent_exp_id:      parentExpId,
    from:               cause,
    to:                 effect,
    latent_factors:     [],                  // SCM latents — populated when a latent model is bound (deferred)
    plausibility,                            // structural prior over the closed world
    support_gap,                             // how much explanatory room remains uncovered
    reasoning_integrity: n ? 1 : 0,          // 1 = drawn from a real closed world; 0 = open world (no basis)
    inference_distance:  1,                  // one abductive hop from effect to cause
    boundary_clause:    'PROJECTED_UNTIL_ABSENCE_TEST',
    mode:               MODE.ABDUCTION,
    status:             'PROJECTED',
    provenance,
  }));
}
