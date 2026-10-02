// qa_reconnpayload.mjs — RECONN Factor v1.1 (KRYL-1311) canonical payload, Category (A)
// verification. Matches this repo's plain assert/pass-fail convention (rtc.test.mjs,
// qa_formationinference.mjs). Exercises every real upstream path (analysisintent.js,
// formationinference.js, surfacerouter.js → domaingravity.js, rtcmemory.js) — no mocked
// substrate — and proves assembleReconnPayload() carries all five Category (A) components.
//   node qa_reconnpayload.mjs
import assert from 'node:assert/strict';

import { buildAnalysisIntent } from './src/engine/analysisintent.js';
import { inferFormation } from './src/engine/formationinference.js';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import {
  ConditionType, makeRelationshipCondition,
} from './src/engine/rtc/relationshipcondition.js';
import { makeMeasurement, makeFrictionObservation } from './src/engine/rtc/frictionobservation.js';
import {
  persistRelationshipCondition, persistFrictionObservation, isAdmittedCondition, __resetForTests,
} from './src/engine/rtc/rtcmemory.js';

import {
  RECONN_PAYLOAD_VERSION, ratifyIntent, relationshipCoverage, structuralCoverage,
  temporalState, rtcCoverage, assembleReconnPayload,
} from './src/engine/reconnpayload.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

console.log('RECONN canonical payload — Category (A) verification\n');

// ── 1. INTENT ratification — real buildAnalysisIntent() output ──────────────────────────────
console.log('1. INTENT ratification (RECONN §6):');
test('resolved question → RATIFIED with real V_req/S_req', () => {
  const ai = buildAnalysisIntent('Is Nanopath a good investment compared to its Series A peers?');
  const r = ratifyIntent(ai);
  assert.equal(r.state, 'RATIFIED');
  assert.equal(r.sourceVersion, ai.version);
  assert.deepEqual(r.S_req, ai.sReq);
  assert.deepEqual(r.V_req, ai.vReq);
  assert.deepEqual(r.E_req, ai.eReq);
  assert.deepEqual(r.T_req, ai.tReq);
});
test('null analysisIntent → WITHHELD, not fabricated', () => {
  const r = ratifyIntent(null);
  assert.equal(r.state, 'WITHHELD');
  assert.ok(r.reason);
});
test('empty question → RATIFIED shape, empty/unresolved sub-fields (no crash, no invention)', () => {
  const ai = buildAnalysisIntent('');
  const r = ratifyIntent(ai);
  assert.equal(r.state, 'RATIFIED');
  assert.deepEqual(r.S_req, []);
  assert.deepEqual(r.V_req, []);
  assert.equal(r.E_req.state, 'unresolved');
});

// ── 2/3. Relationship Coverage (BLOCKED, always) + Structural Coverage (classified substrate) ─
console.log('\n2/3. Relationship + Structural Coverage (RECONN §9/§10):');
const P = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

// KRYL-1347 (2026-10-02): relationshipCoverage() is now query-dependent (subjScope-keyed),
// not unconditionally BLOCKED — the persistence layer this was architecturally waiting on
// (KRYL-1339/1340's canonical ρ) now exists. With no subjScope at all there is nothing to
// look up, so the honest result is WITHHELD, not a fabricated BLOCKED-forever default.
test('relationshipCoverage with no subjScope → honest WITHHELD, not a fabricated BLOCKED default', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  assert.ok(formation, 'precondition: formation must actually assert');
  const rc = relationshipCoverage();
  assert.equal(rc.state, 'WITHHELD');
  assert.deepEqual(rc.relationships, []);
});
test('real 2-domain formation → structuralCoverage CLASSIFIED (not the §9 ratio), covered matches participatingDomains', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  const sc = structuralCoverage(formation);
  assert.equal(sc.state, 'CLASSIFIED');
  assert.equal(sc.ratioComputed, false);
  assert.deepEqual(sc.covered, formation.participatingDomains);
});
test('real below-floor particles → no formation → structuralCoverage WITHHELD, not fabricated', () => {
  const particles = [P('TECHNOLOGY', 20), P('CAPITAL', 20)];
  const formation = inferFormation(particles, { now: 1000 });
  assert.equal(formation, null, 'precondition: this particle set must not assert a formation');
  assert.equal(structuralCoverage(formation).state, 'WITHHELD');
});
test('real 3-domain, one weak → structuralCoverage.excluded surfaces the real E_NO_EDGE particle', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80), P('KNOWLEDGE', 30)];
  const formation = inferFormation(particles, { now: 1000 });
  assert.ok(formation);
  const sc = structuralCoverage(formation);
  assert.ok(sc.excluded.some(x => x.domain === 'KNOWLEDGE'));
});

// ── 4. Temporal State Θ(x) — real surfaceRouter.dispatchBatch() → domaingravity.js pool ─────
// 5-state classification from real anchor availability. value_latest/delta stay unresolved
// (Founder ruling — no governed scalar to trace to); deltaT (pure timestamp math) is reported.
console.log('\n4. Temporal State Θ(x) (RECONN §13):');
test('two real dated events, same domain+canonicalId → PRESENT, real deltaT, value scalar left unresolved', () => {
  const t0 = Date.parse('2026-01-01T00:00:00Z');
  const t1 = Date.parse('2026-03-01T00:00:00Z');
  surfaceRouter.dispatchBatch([
    { domain: 'TECHNOLOGY', source: 'QA_RECONN_TEST_A', polarity: 'constructive', confidence: 40, ts: Date.now(),
      meta: { eventDate: t0, canonicalId: 'QA_ENTITY_1' } },
    { domain: 'TECHNOLOGY', source: 'QA_RECONN_TEST_A', polarity: 'constructive', confidence: 65, ts: Date.now(),
      meta: { eventDate: t1, canonicalId: 'QA_ENTITY_1' } },
  ]);
  const theta = temporalState('TECHNOLOGY', 'QA_ENTITY_1');
  assert.equal(theta.state, 'PRESENT');
  assert.equal(theta.deltaT, t1 - t0);
  assert.equal(theta.value_latest, null);
  assert.equal(theta.delta, null);
  assert.equal(theta.valueScalarUnresolved, true);
});
test('exactly one dated event for a fresh canonicalId → PARTIAL, no prior anchor to compare', () => {
  const t0 = Date.parse('2026-02-01T00:00:00Z');
  surfaceRouter.dispatchBatch([
    { domain: 'TECHNOLOGY', source: 'QA_RECONN_TEST_B', polarity: 'constructive', confidence: 50, ts: Date.now(),
      meta: { eventDate: t0, canonicalId: 'QA_ENTITY_PARTIAL' } },
  ]);
  const theta = temporalState('TECHNOLOGY', 'QA_ENTITY_PARTIAL');
  assert.equal(theta.state, 'PARTIAL');
  assert.equal(theta.latestAnchor, t0);
  assert.equal(theta.deltaT, null);
});
test('zero observations for an unused canonicalId → NOT MEASURED, never defaulted to a delta', () => {
  const theta = temporalState('TECHNOLOGY', 'QA_ENTITY_NEVER_SEEN');
  assert.equal(theta.state, 'NOT MEASURED');
  assert.equal(theta.delta, undefined);
});
test('no domain supplied → NOT MEASURED', () => {
  assert.equal(temporalState(null).state, 'NOT MEASURED');
});

// ── 5. R/T/C — real rtcmemory.js persistence + read path ────────────────────────────────────
console.log('\n5. R/T/C (RECONN §14):');
test('no relationshipId → WITHHELD', () => {
  assert.equal(rtcCoverage(null).state, 'WITHHELD');
});
test('real relationshipId with zero persisted observations → WITHHELD (honest current-state absence)', () => {
  __resetForTests();
  assert.equal(rtcCoverage('rc-never-persisted').state, 'WITHHELD');
});
test('real persisted RelationshipCondition + FrictionObservation → rtcCoverage PRESENT with real status', () => {
  __resetForTests();
  const relationshipId = 'rc-qa-001';
  const isAdmittedRelationship = id => id === relationshipId;
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-qa-1', relationshipId, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-qa-1' }] },
    { isAdmittedRelationship },
  ));
  persistFrictionObservation(makeFrictionObservation(
    {
      id: 'fo-qa-1', relationshipId, conditionId: cond.id,
      resource: { value: 3, unit: 'FTE', type: 'personnel' },
      time: { value: 14, unit: 'days', type: 'lead_time' },
      evidence: [{ id: 'ev-qa-1' }],
    },
    { isAdmittedRelationship, isAdmittedCondition },
  ));
  const rtc = rtcCoverage(relationshipId);
  assert.equal(rtc.state, 'PRESENT');
  assert.equal(rtc.conditions.length, 1);
  assert.equal(rtc.conditions[0].status, 'PARTIAL'); // resource+time grounded, cost ABSENT
});

// ── End-to-end: one assembled canonical payload, real substrate throughout ──────────────────
console.log('\nEnd-to-end assembleReconnPayload():');
test('real question + real formation + real subjScope → one canonical payload, all components present, correct shape', () => {
  const ai = buildAnalysisIntent('Is Nanopath a good investment compared to its Series A peers?');
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  const subjScope = { kind: 'ENTITY', canonicalId: 'QA_ENTITY_1' };

  const payload = assembleReconnPayload({ analysisIntent: ai, fieldFormation: formation, subjScope });

  assert.equal(payload.version, RECONN_PAYLOAD_VERSION);
  assert.equal(payload.intent.state, 'RATIFIED');
  // KRYL-1347 (2026-10-02): relationshipCoverage() is no longer unconditionally BLOCKED — the
  // canonical-ρ persistence layer it was waiting on (KRYL-1339/1340) now exists. 'QA_ENTITY_1'
  // is a synthetic id with no real admitted relationship, so the honest result is NO_EVIDENCE,
  // not a fabricated match and not the stale always-BLOCKED default. See reconnpayload.js's
  // relationshipCoverage() header for the full lineage.
  assert.equal(payload.relationshipCoverage.state, 'NO_EVIDENCE');
  assert.equal(payload.structuralCoverage.state, 'CLASSIFIED');
  assert.ok(Array.isArray(payload.temporalState));
  assert.equal(payload.temporalState.length, formation.participatingDomains.length);
  // TECHNOLOGY carries the two real dated events seeded above for this same canonicalId —
  // proves temporalState is actually wired into the assembled payload, not just unit-callable.
  const techTheta = payload.temporalState.find(t => t.domain === 'TECHNOLOGY');
  assert.equal(techTheta.state, 'PRESENT');
  assert.equal(techTheta.valueScalarUnresolved, true);
  assert.ok(Object.isFrozen(payload));
  assert.ok(Object.isFrozen(payload.intent));
});
test('no inputs at all → payload still assembles, every component honestly WITHHELD/BLOCKED', () => {
  const payload = assembleReconnPayload({});
  assert.equal(payload.intent.state, 'WITHHELD');
  // No subjScope at all -> honest WITHHELD (nothing to look up), not the stale always-BLOCKED
  // default -- see KRYL-1347 comment above.
  assert.equal(payload.relationshipCoverage.state, 'WITHHELD');
  assert.equal(payload.structuralCoverage.state, 'WITHHELD');
  assert.deepEqual(payload.temporalState, []);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
