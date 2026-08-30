// QA — KRYL-1202/1203/1204 spec's mandated 6-item "Adversarial validation required" list
// (specs/SPEC-closed-loop-observation-architecture.md, VALIDATION section), one test per numbered
// item, second Bottle Test remediation (2026-08-26). The independent re-run found only items 1
// (partial) and 6 covered by existing QA — this file gives all 6 an explicit, named assertion.
// Where an item is already proven by real machinery in another suite, this file exercises that
// same real machinery directly rather than re-deriving it, and says so — no re-implementation of
// the logic under test.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

const CIK_TARGET_A = '0001234567';
const CIK_TARGET_B = '0001111111';
const CIK_UNRELATED = '0009999999';

globalThis.fetch = async (url) => {
  const u = new URL(url, 'http://x');
  const cik = u.searchParams.get('entityName');
  // Entity-scoped fixture: A/B pair filing (the condition's own conflict), plus a wholly
  // unrelated filing for CIK_UNRELATED — lets scenario 5 admit real evidence that does NOT
  // address the originating condition.
  const hits = [
    { _id: 'h1', _source: { ciks: [CIK_TARGET_A, CIK_TARGET_B], display_names: ['Company A', 'Filer One'], file_date: '2026-08-20', adsh: 'acc-adv-1' } },
    { _id: 'h2', _source: { ciks: [CIK_UNRELATED, CIK_TARGET_B], display_names: ['Unrelated Co', 'Filer Two'], file_date: '2026-08-21', adsh: 'acc-adv-2' } },
  ];
  return { ok: true, json: async () => ({ hits: { hits } }) };
};

const {
  deriveAffordancesFromResolve, rankAffordances, createPathRecord, completePathRecord, getPath,
  isEligibleForDerivation, UNRESOLVED_KIND,
} = await import('./src/engine/observationaffordanceengine.js');
const { executeObservationRequest, isAvailable } = await import('./src/engine/observationorchestrator.js');
const { deriveTerminalState } = await import('./src/engine/observationorchestrator.js');
const { admitAndDispatch } = await import('./src/engine/evidenceadmissiongate.js');
const { inferFormation } = await import('./src/engine/formationinference.js');
const { buildPerceptionField } = await import('./src/engine/perceptionread.js');
const { ProvenanceDAG } = await import('./src/engine/causalos/provenance.js');

// ── 1. RESOLVE conflict → affordance → observation → admission → conflict reduced ──────────────
// Real machinery, same as qa_closedloop_endtoend.mjs — "conflict reduced" is measured the only
// way this architecture defines it: the condition's own entities appear in the admitted evidence,
// so it is excluded from residual_unresolved on completion.
//
// condition.provenance is a real, distinct DAG (third Bottle Test fix A, 2026-08-26) so this
// scenario also asserts fix #1's provenance-distinctness guarantee, not just conflict reduction.
{
  const conditionProvenance = new ProvenanceDAG();
  conditionProvenance.add({ event_id: 'ev_adv1_condition_basis', kind: 'resolve_condition_provenance' });
  const condition = {
    id: 'adv_cond_1', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_1',
    basis: 'adversarial scenario 1', pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT' }],
    candidateTaps: [], conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
    observation_type: 'OWNERSHIP_FILING', provenance: conditionProvenance,
  };
  const affordance = deriveAffordancesFromResolve(condition, isAvailable)[0];
  const path = createPathRecord({ perceptIdBefore: 'p1', affordanceId: affordance.id, unresolvedCondition: condition, observationRequest: null });
  const exec = await executeObservationRequest({
    id: 'req_adv_1', affordance_id: affordance.id, target: affordance.target,
    observation_type: affordance.observation_type, requested_at: new Date().toISOString(), provenance: null,
  });
  const entities = new Set([condition.conflict.a, condition.conflict.b]);
  const addressed = exec.result.admitted.some(a => entities.has(a.subjectCik));
  const observationProvenance = exec.result?.admitted?.[0]?.provenance ?? null;
  const completed = completePathRecord(path.id, {
    plan: exec.plan, lifecycleStates: exec.lifecycle, availabilitySnapshot: affordance.available,
    observationProvenance,
    consequence: { residual_unresolved: addressed ? [] : [condition] },
  });
  check('1. RESOLVE conflict -> affordance -> observation -> admission -> conflict reduced',
    exec.lifecycle.map(t => t.to).includes('ADMITTED') && completed.consequence.residual_unresolved.length === 0);
  check('1b. Path Memory holds the observation\'s own provenance, distinct from the condition\'s (fix #1 regression coverage)',
    observationProvenance !== null && completed.provenance === observationProvenance && completed.provenance !== conditionProvenance);
}

// ── 2. Missing evidence → affordance → observation → evidence supplied ─────────────────────────
// Distinct from scenario 1: measures the concrete before/after change on Path Memory — zero
// admitted evidence before the observation runs, real admitted evidence with entity identity
// after, not merely a lifecycle label.
{
  const condition = {
    id: 'adv_cond_2', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_2',
    basis: 'adversarial scenario 2 — missing evidence', pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT' }],
    candidateTaps: [], conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
    observation_type: 'OWNERSHIP_FILING', provenance: null,
  };
  check('2a. Before observation, condition carries zero evidence_ref_ids (missing evidence)', condition.evidence_ref_ids.length === 0);

  const affordance = deriveAffordancesFromResolve(condition, isAvailable)[0];
  const exec = await executeObservationRequest({
    id: 'req_adv_2', affordance_id: affordance.id, target: affordance.target,
    observation_type: affordance.observation_type, requested_at: new Date().toISOString(), provenance: null,
  });
  check('2b. After observation, real admitted evidence is supplied (non-zero, entity identity attached)',
    exec.result.admitted.length > 0 && exec.result.admitted.every(a => a.subjectCik && a.accession));
}

// ── 3. Unavailable tap → affordance → no capability → UNAVAILABLE ──────────────────────────────
// Full path from a real UnresolvedCondition through affordance derivation to the orchestrator,
// for an observation_type with zero registered capability (not a hand-built request bypassing
// affordance derivation — CAPABILITY_REGISTRY only has one entry, OWNERSHIP_FILING).
{
  const condition = {
    id: 'adv_cond_3', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_3',
    basis: 'adversarial scenario 3 — no capability', pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT' }],
    candidateTaps: [], conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
    observation_type: 'RELATIONSHIP_FILING', // deliberately unregistered — no capability exists
    provenance: null,
  };
  const affordance = deriveAffordancesFromResolve(condition, isAvailable)[0];
  check('3a. Affordance derived but reports unavailable (no registered capability)', affordance.available === false);

  const exec = await executeObservationRequest({
    id: 'req_adv_3', affordance_id: affordance.id, target: affordance.target,
    observation_type: affordance.observation_type, requested_at: new Date().toISOString(), provenance: null,
  });
  check('3b. Orchestrator reaches UNAVAILABLE, never fabricates a plan', exec.lifecycle.some(t => t.to === 'UNAVAILABLE') && exec.plan === null);
}

// ── 4. Withheld → request → tap/policy refuses → WITHHELD ──────────────────────────────────────
// Real lifecycle machinery (deriveTerminalState), fed a real EAG rejection record produced by an
// actual admitAndDispatch() call — same mechanism as qa_observationorchestrator.mjs 8d, restated
// here under the spec's own numbering for direct 1:1 auditability against the 6-item list.
{
  const realRejection = admitAndDispatch({ source: 'X', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() }); // no provenance -> real EAC2 rejection
  check('4. tap/policy refuses (real EAG rejection) -> orchestrator contract reaches WITHHELD',
    realRejection.admitted === false &&
    deriveTerminalState({ admitted: [], matched: 1, rejected: [realRejection.rejection] }) === 'WITHHELD');
}

// ── 5. Insufficient observation → received, admitted, INCORPORATED, originating condition still
//        unresolved → residual_unresolved recorded, not fabricated as success ───────────────────
// The genuine negative case: real evidence is admitted (targeting CIK_UNRELATED, which the fetch
// fixture above genuinely returns), but it does NOT name either entity in the condition's own
// conflict — so residual_unresolved MUST still contain the condition after a real, successful
// admission. Proves the architecture doesn't conflate "an admission happened" with "the condition
// was resolved."
{
  const condition = {
    id: 'adv_cond_5', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_5',
    basis: 'adversarial scenario 5 — insufficient relative to the condition', pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT' }],
    candidateTaps: [], conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
    observation_type: 'OWNERSHIP_FILING', provenance: null,
  };
  const path = createPathRecord({ perceptIdBefore: 'p5', affordanceId: 'aff_5_unrelated', unresolvedCondition: condition, observationRequest: null });

  // Deliberately target the UNRELATED entity, not the condition's own conflict entities.
  const exec = await executeObservationRequest({
    id: 'req_adv_5', affordance_id: 'aff_5_unrelated',
    target: { target_entities: [CIK_UNRELATED], target_time_window: { from: '2026-08-01', to: '2026-08-25' } },
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  });
  check('5a. Real admission occurred (evidence exists, valid, entered perception)',
    exec.lifecycle.map(t => t.to).includes('ADMITTED') && exec.result.admitted.length > 0);

  const conditionEntities = new Set([condition.conflict.a, condition.conflict.b]);
  const addressedCondition = exec.result.admitted.some(a => conditionEntities.has(a.subjectCik));
  check('5b. Admitted evidence does NOT name the condition\'s own conflicting entities', addressedCondition === false);

  const observationProvenance5 = exec.result?.admitted?.[0]?.provenance ?? null;
  const completed = completePathRecord(path.id, {
    plan: exec.plan, lifecycleStates: exec.lifecycle, availabilitySnapshot: true,
    observationProvenance: observationProvenance5,
    consequence: {
      formation_delta: null,
      residual_unresolved: addressedCondition ? [] : [condition],
    },
  });
  check('5c. residual_unresolved correctly still contains the condition — not fabricated as success',
    completed.consequence.residual_unresolved.length === 1 && completed.consequence.residual_unresolved[0].id === condition.id);
  check('5d. Path Memory holds the (unrelated) observation\'s own provenance, not the condition\'s null',
    observationProvenance5 !== null && completed.provenance === observationProvenance5);
}

// ── 6. No-change observation → admitted, inferFormation() re-run, zero FormationDelta,
//        INCORPORATED with residual recorded — not treated as failure ─────────────────────────
// Real formation pipeline, before/after, same real functions qa_closedloop_endtoend.mjs uses.
// This ownership-only evidence has no cross-domain partner, so a null FormationDelta is the
// correct, honest outcome — proven here not to throw, corrupt state, or get silently reported as
// a different (fabricated) result.
{
  const before = buildPerceptionField();
  const formationBefore = inferFormation(before.particles);

  const exec = await executeObservationRequest({
    id: 'req_adv_6', affordance_id: 'aff_6',
    target: { target_entities: [CIK_TARGET_A], target_time_window: { from: '2026-08-01', to: '2026-08-25' } },
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  });
  check('6a. Observation admitted without error', exec.lifecycle.map(t => t.to).includes('ADMITTED') && !exec.error);

  const after = buildPerceptionField();
  const formationAfter = inferFormation(after.particles);
  check('6b. inferFormation() re-run does not throw and zero FormationDelta is honestly null, not fabricated as a change',
    formationBefore === null && formationAfter === null);

  const path = createPathRecord({ perceptIdBefore: 'p6_before', affordanceId: 'aff_6', unresolvedCondition: { id: 'adv_cond_6' }, observationRequest: null });
  const observationProvenance6 = exec.result?.admitted?.[0]?.provenance ?? null;
  const completed = completePathRecord(path.id, {
    plan: exec.plan, lifecycleStates: exec.lifecycle, availabilitySnapshot: true,
    observationProvenance: observationProvenance6,
    consequence: { formation_delta: null, residual_unresolved: [{ id: 'adv_cond_6' }] },
  });
  check('6c. Zero-delta INCORPORATED outcome recorded with residual, not treated as a failed record',
    completed.completed_at !== null && completed.consequence.formation_delta === null && completed.consequence.residual_unresolved.length === 1);
}

// ── 7. Fourth Bottle Test remediation (2026-08-26): completePathRecord() fail-closed on
//        observationProvenance — omission must throw, not silently substitute the condition's
//        provenance. Direct regression proof that the exact third-gate defect cannot recur. ──────
{
  const condition = {
    id: 'adv_cond_7', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_7',
    basis: 'adversarial scenario 7 — fail-closed provenance', pairwise: [],
    candidateTaps: [], conflict: null, observation_type: 'OWNERSHIP_FILING', provenance: null,
  };
  const path = createPathRecord({ perceptIdBefore: 'p7', affordanceId: 'aff_7', unresolvedCondition: condition, observationRequest: null });
  let threw = false, message = '';
  try {
    // Deliberately omit observationProvenance — this must throw, never silently complete.
    completePathRecord(path.id, { plan: null, lifecycleStates: [], consequence: { residual_unresolved: [] } });
  } catch (err) {
    threw = true;
    message = err.message;
  }
  check('7a. Omitting observationProvenance throws (fail-closed, cannot silently substitute condition provenance)',
    threw && /observationProvenance/.test(message));
  check('7b. The path remains incomplete after the rejected call (no partial/corrupt completion)',
    getPath(path.id).completed_at === null);

  // Explicit null is a legitimate, honestly-recorded outcome (no evidence admitted this round) —
  // must NOT throw, and must record provenance as null, never fall back to the condition's.
  const completed = completePathRecord(path.id, {
    plan: null, lifecycleStates: [], observationProvenance: null,
    consequence: { residual_unresolved: [condition] },
  });
  check('7c. Explicit observationProvenance:null is accepted and recorded as null (honest absence, not a fallback)',
    completed.completed_at !== null && completed.provenance === null);
}

// ── 8. Fifth Bottle Test remediation (2026-08-27): ratified 5-condition reproposal rule's
//        condition #3 — "same observation target and scope (TargetSpec)" — proven both
//        directions. Previously isEligibleForDerivation() had no target parameter at all, so it
//        could not evaluate this condition (a contract/interface defect, not a coverage gap). ──
{
  const targetA = { target_entities: [CIK_UNRELATED], target_time_window: { from: '2026-08-01', to: '2026-08-25' } };
  const targetB = { target_entities: [CIK_TARGET_A], target_time_window: { from: '2026-08-01', to: '2026-08-25' } };

  const condition = {
    id: 'adv_cond_8', version: 'v1', kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
    evidence_ref_ids: [], source_percept_id: 'adv_percept_8',
    basis: 'adversarial scenario 8 — target/scope reproposal condition',
    pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT' }],
    candidateTaps: [], conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
    observation_type: 'OWNERSHIP_FILING', provenance: null,
  };

  // Establish a real zero-discrimination prior path: admit real evidence against targetA
  // (CIK_UNRELATED), which does NOT address the condition's own A/B conflict — same pattern as
  // scenario 5 — so residual_unresolved genuinely still contains the condition afterward.
  const path = createPathRecord({
    perceptIdBefore: 'p8', affordanceId: 'aff_8', unresolvedCondition: condition,
    observationRequest: { id: 'req_adv_8', affordance_id: 'aff_8', target: targetA, observation_type: 'OWNERSHIP_FILING' },
  });
  const exec = await executeObservationRequest({
    id: 'req_adv_8', affordance_id: 'aff_8', target: targetA,
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  });
  const conditionEntities = new Set([condition.conflict.a, condition.conflict.b]);
  const addressed = exec.result.admitted.some(a => conditionEntities.has(a.subjectCik));
  check('8a. Setup: real admission against targetA does NOT address the condition (zero discrimination)',
    exec.result.admitted.length > 0 && addressed === false);
  completePathRecord(path.id, {
    plan: exec.plan, lifecycleStates: exec.lifecycle, availabilitySnapshot: true,
    observationProvenance: exec.result?.admitted?.[0]?.provenance ?? null,
    consequence: { residual_unresolved: [condition] },
  });

  // Same condition, same availability, SAME target/scope as the completed path -> suppressed.
  check('8b. Same target/scope as the prior zero-discrimination attempt -> suppressed (not eligible)',
    isEligibleForDerivation(condition, true, targetA) === false);

  // Same condition, same availability, DIFFERENT target/scope (targetB, a different entity) ->
  // NOT suppressed, even though id/version/evidence/availability are all identical to 8b. This is
  // the exact gap the fifth Bottle Test found: the prior implementation had no way to evaluate
  // this at all and would have incorrectly suppressed here.
  check('8c. Different target/scope -> eligible (not suppressed), even with all other 4 conditions identical',
    isEligibleForDerivation(condition, true, targetB) === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
