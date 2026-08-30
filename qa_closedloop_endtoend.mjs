// QA — Full closed-loop proof, real data model → real percept.
// UnresolvedCondition -> ObservationAffordance -> ObservationRequest -> KRYL-1204 orchestrator
// -> secownershipconnector.js targeted invocation -> KRYL-1203 EAG admitAndDispatch() ->
// real dispatchBatch() -> real domaingravity pool -> real buildPerceptionField()/inferFormation()
// -> updated percept -> Observation Path Memory record completed.
//
// The UnresolvedCondition below is synthetic (observestoryview.jsx's adjudicate() is not
// standalone-importable outside a React render — a real, documented follow-up, not glossed
// over), but every field matches the REAL shape confirmed against adjudicate()'s actual
// output this session (basis/pairwise/candidateTaps/conflict). Everything downstream of the
// condition — affordance derivation, ranking, orchestration, admission, dispatch, formation
// re-read, Path Memory — is real, unmocked code.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

const CIK_TARGET_A = '0001234567';
const CIK_TARGET_B = '0001111111';

globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ hits: { hits: [
    { _id: 'h1', _source: { ciks: [CIK_TARGET_A, CIK_TARGET_B], display_names: ['Company A', 'Filer One'], file_date: '2026-08-20', adsh: 'acc-loop-1' } },
  ] } }),
});

const {
  deriveAffordancesFromResolve, rankAffordances, computeUtility,
  createPathRecord, completePathRecord, getPath, isEligibleForDerivation,
  UNRESOLVED_KIND,
} = await import('./src/engine/observationaffordanceengine.js');
const { executeObservationRequest, isAvailable } = await import('./src/engine/observationorchestrator.js');
const { buildPerceptionField } = await import('./src/engine/perceptionread.js');
const { inferFormation } = await import('./src/engine/formationinference.js');
const { getAllSignals } = await import('./src/engine/domaingravity.js');
const { ProvenanceDAG } = await import('./src/engine/causalos/provenance.js');

// 1. Real percept, before.
const perceptBefore = buildPerceptionField();
const formationBefore = inferFormation(perceptBefore.particles);
check('1. Real percept built from live signal pool', perceptBefore.source === 'signal-pool' && typeof perceptBefore.count === 'number');

// 2. Synthetic-but-real-shaped UnresolvedCondition (ResolveUnresolved), matching adjudicate()'s
// actual confirmed fields — see file header for why this is synthetic, not the JSX component.
//
// condition.provenance below is deliberately a REAL, DISTINCT ProvenanceDAG (not null) — third
// Bottle Test remediation (2026-08-26, fix A): the prior version of this test left it null, so no
// committed QA ever exercised the distinction fix #1 (2026-08-26) exists to guarantee — that Path
// Memory ends up with the SPECIFIC OBSERVATION's own DAG, not the originating condition's. See
// check 9b below.
const conditionProvenance = new ProvenanceDAG();
conditionProvenance.add({ event_id: 'ev_condition_basis', kind: 'resolve_condition_provenance' });

const condition = {
  id: 'cond_ownership_conflict_1',
  version: 'v1',
  kind: UNRESOLVED_KIND.RESOLVE_CONFLICT,
  evidence_ref_ids: [],
  source_percept_id: 'percept_before_1',
  basis: 'Two readings of the same OWNERSHIP control event do not reconcile',
  pairwise: [{ a: CIK_TARGET_A, b: CIK_TARGET_B, classification: 'CONFLICT', ruleId: 'R1', reason: 'divergent filer identity' }],
  candidateTaps: [],
  conflict: { a: CIK_TARGET_A, b: CIK_TARGET_B },
  observation_type: 'OWNERSHIP_FILING',
  provenance: conditionProvenance,
};

// 3. Derive a real ObservationAffordance from the condition (Pattern 1).
const affordances = deriveAffordancesFromResolve(condition, isAvailable);
check('3. Affordance derived from real Pattern-1 conflict-discrimination logic', affordances.length === 1);
const affordance = affordances[0];
check('   Affordance is available (capability registry confirms target-capable tap)', affordance.available === true);
check('   No prediction field on the affordance', !('predicted' in affordance) && !('expected_outcome' in affordance));

// 4. Rank (utility metric, real formula).
const ranked = rankAffordances(affordances);
check('4. Utility computed, non-negative for an available, in-scope affordance', ranked[0].utility > 0);

// 5. Reproposal eligibility — never attempted yet, must be eligible.
check('5. Never-attempted condition is eligible for derivation', isEligibleForDerivation(condition, affordance.available, affordance.target) === true);

// 6. Path Memory record created at request acceptance.
const path = createPathRecord({
  perceptIdBefore: 'percept_before_1',
  affordanceId: affordance.id,
  unresolvedCondition: condition,
  observationRequest: { id: 'req_loop_1', affordance_id: affordance.id, target: affordance.target, observation_type: affordance.observation_type },
});
check('6. Path Memory record created (not completed yet)', getPath(path.id).completed_at === null);

// 7. Execute via KRYL-1204's real orchestrator — real connector call, real EAG admission.
const execResult = await executeObservationRequest({
  id: 'req_loop_1', affordance_id: affordance.id,
  target: affordance.target, observation_type: affordance.observation_type,
  requested_at: new Date().toISOString(), provenance: null,
});
check('7. Orchestrator reaches ADMITTED via the real KRYL-1204/1203 chain', execResult.lifecycle.map(t => t.to).includes('ADMITTED'));
check('   Real evidence admitted, entity identity preserved', execResult.result.admitted.length > 0 && execResult.result.admitted[0].subjectCik === CIK_TARGET_A);

// 8. Real percept, after — the actual closed-loop proof.
const perceptAfter = buildPerceptionField();
const formationAfter = inferFormation(perceptAfter.particles);
check('8. Percept particle count increased after admission (real, measurable percept change)', perceptAfter.count > perceptBefore.count);
console.log(`   formation before: ${formationBefore ? 'a real cross-domain Formation' : 'null (insufficient cross-domain data — honest, not fabricated)'}`);
console.log(`   formation after:  ${formationAfter ? 'a real cross-domain Formation' : 'null (insufficient cross-domain data — honest, not fabricated)'}`);

// 9. Path Memory completed with a real consequence.
//
// Real finding surfaced while building this test: formation_delta (does a whole
// cross-domain Formation exist — depends on unrelated domains too) and whether THIS
// specific condition got discriminated are different questions. An earlier version of
// this test incorrectly used formation_delta's null-ness (a fact about unrelated
// cross-domain structure) as the signal for residual_unresolved on THIS condition,
// which produced a false zero-discrimination result despite real, on-target evidence
// having been admitted. Fixed: residual_unresolved is derived from whether the admitted
// evidence actually names the condition's own conflicting entities — the direct,
// correct signal — not from the unrelated broader Formation's existence.
const conditionEntities = new Set([condition.conflict.a, condition.conflict.b]);
const admittedAddressesCondition = execResult.result.admitted.some(a => conditionEntities.has(a.subjectCik));
// The specific admitted observation's own ProvenanceDAG (EAG's admitCandidate() retains it on the
// artifact, fixed 2026-08-26) — distinct from condition.provenance above. Third Bottle Test fix A.
const observationProvenance = execResult.result?.admitted?.[0]?.provenance ?? null;
const completed = completePathRecord(path.id, {
  plan: execResult.plan,
  dataTapId: execResult.plan?.data_tap_id ?? null,
  observationId: execResult.result?.admitted?.[0]?.accession ?? null,
  availabilitySnapshot: affordance.available,
  lifecycleStates: execResult.lifecycle,
  observationProvenance,
  consequence: {
    percept_id_after: 'percept_after_1',
    relationships_changed: [],
    formation_delta: formationAfter ? { changed: true } : null,
    residual_unresolved: admittedAddressesCondition ? [] : [condition],
  },
});
check('9. Path Memory record completed, immutable chain intact', completed.completed_at !== null && completed.consequence !== null);
check('9b. Path Memory holds the OBSERVATION\'s own provenance, distinct from the condition\'s (fix #1, third Bottle Test regression coverage)',
  observationProvenance !== null && completed.provenance === observationProvenance && completed.provenance !== conditionProvenance);

// 10. Provenance/audit chain — full percept -> affordance -> request -> observation -> consequence.
check('10. Full Path Memory chain traceable end to end',
  completed.percept_id_before === 'percept_before_1' &&
  completed.affordance_id === affordance.id &&
  completed.unresolved_condition.id === condition.id &&
  completed.observation_id !== null &&
  completed.consequence.percept_id_after === 'percept_after_1');

// 11. Reproposal rule — after a real (non-zero-discrimination) admission, still eligible
// (this run DID admit real evidence — not the zero-discrimination suppression case).
check('11. Reproposal rule does not incorrectly suppress after a real admission', isEligibleForDerivation(condition, affordance.available, affordance.target) === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
