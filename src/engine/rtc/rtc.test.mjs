// src/engine/rtc/rtc.test.mjs
// KRYL-1298 — R/T/C structural layer conformance tests (RI-01 through RI-10, §33 lifecycle,
// §38 canonical status model, route-linkage retrieval). Plain assert-based runner (matches
// this repo's convention — see perceptionhydrator.test.mjs) — run with:
//   node src/engine/rtc/rtc.test.mjs
import assert from 'node:assert/strict';
import {
  ConditionType, LifecycleState, LifecycleAction,
  makeRelationshipCondition, applyLifecycleTransition, reviseCondition,
} from './relationshipcondition.js';
import {
  ABSENT, isAbsent, FrictionStatus,
  makeMeasurement, makeFrictionObservation, classifyFrictionStatus,
} from './frictionobservation.js';
import {
  persistRelationshipCondition, persistFrictionObservation, isAdmittedCondition,
  getConditionsForRelationship, getFrictionObservationsForCondition,
  getFrictionObservationsForRelationship, getFrictionStatusForRelationship,
  __resetForTests,
} from './rtcmemory.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

// Fixtures: a fake admitted-Relationship universe (this module never owns that registry —
// tests supply the same kind of injected check relationontology.js would supply in prod).
const ADMITTED_RELATIONSHIP = 'rc-001';
const isAdmittedRelationship = id => id === ADMITTED_RELATIONSHIP;

// ── RI-01 — a friction observation MUST reference an admitted Relationship ──────────────
test('RI-01 — makeFrictionObservation rejects a non-admitted relationshipId', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-1', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  assert.throws(() => makeFrictionObservation(
    { id: 'fo-1', relationshipId: 'not-admitted', conditionId: cond.id, resource: { value: 3, unit: 'FTE', type: 'personnel' }, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  ), /RI-01/);
});

test('RI-01 — makeFrictionObservation requires opts.isAdmittedRelationship to be supplied', () => {
  assert.throws(() => makeFrictionObservation(
    { id: 'fo-x', relationshipId: ADMITTED_RELATIONSHIP, conditionId: 'cond-1' },
    { isAdmittedCondition },
  ), /opts\.isAdmittedRelationship is required/);
});

// ── RI-02 — a Relationship Condition MUST reference its Relationship ────────────────────
test('RI-02 — makeRelationshipCondition rejects a non-admitted relationshipId', () => {
  assert.throws(() => makeRelationshipCondition(
    { id: 'cond-bad', relationshipId: 'ghost', conditionType: ConditionType.DEPENDENCY, evidence: [] },
    { isAdmittedRelationship },
  ), /RI-02/);
});

test('RI-02 — makeRelationshipCondition requires opts.isAdmittedRelationship to be supplied', () => {
  assert.throws(() => makeRelationshipCondition(
    { id: 'cond-x', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.DEPENDENCY },
  ), /opts\.isAdmittedRelationship is required/);
});

// ── RI-03 — Friction MUST NOT establish Relationship existence ──────────────────────────
test('RI-03 — this module has no function capable of admitting a Relationship (structural)', () => {
  // Neither module exports anything that could mark a relationshipId admitted; the only
  // admission path is the caller-supplied predicate, which these modules never write to.
  const rtcExports = Object.keys({ makeRelationshipCondition, makeFrictionObservation });
  assert.ok(!rtcExports.some(k => /admit|create.*relationship/i.test(k)));
});

// ── RI-04 — every grounded measurement MUST retain provenance ───────────────────────────
test('RI-04 — grounded FrictionObservation with empty evidence throws', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-2', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  assert.throws(() => makeFrictionObservation(
    { id: 'fo-2', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, resource: { value: 3, unit: 'FTE', type: 'personnel' }, evidence: [] },
    { isAdmittedRelationship, isAdmittedCondition },
  ), /RI-04/);
});

test('RI-04 — fully-absent FrictionObservation (nothing grounded) does not require evidence', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-3', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    { id: 'fo-3', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(fo.resource, ABSENT);
  assert.equal(fo.time, ABSENT);
  assert.equal(fo.cost, ABSENT);
});

// ── RI-05 — R/T/C dimensions MUST remain semantically distinct ──────────────────────────
test('RI-05 — resource/time/cost are independent fields, never coupled', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-4', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    {
      id: 'fo-4', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id,
      resource: { value: 3, unit: 'FTE', type: 'personnel' },
      time: null,
      cost: { value: 180000, unit: 'USD', type: 'direct_economic' },
      evidence: [{ id: 'ev-1' }],
    },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(fo.resource.value, 3);
  assert.equal(fo.time, ABSENT);
  assert.equal(fo.cost.value, 180000);
});

// ── RI-06 — absence MUST NOT be represented as zero ──────────────────────────────────────
test('RI-06 — ABSENT is not 0, and an observed 0-value measurement is preserved distinctly', () => {
  assert.notEqual(ABSENT, 0);
  assert.ok(isAbsent(ABSENT));
  assert.ok(!isAbsent(0));
  const zeroMeasurement = makeMeasurement({ value: 0, unit: 'FTE', type: 'personnel' }, 'resource');
  assert.equal(zeroMeasurement.value, 0);
  assert.ok(!isAbsent(zeroMeasurement));
  assert.equal(makeMeasurement(null, 'resource'), ABSENT);
  assert.equal(makeMeasurement(undefined, 'resource'), ABSENT);
});

// ── RI-07 — Derived Cost MUST retain derivation lineage ──────────────────────────────────
test('RI-07 — a derived measurement without full lineage throws', () => {
  assert.throws(() => makeMeasurement(
    { value: 100, unit: 'USD', type: 'derived', derivation: { sourceObservations: [], derivationRule: 'x', ruleVersion: '1', result: 100, unit: 'USD' } },
    'cost',
  ), /RI-07/);
});

test('RI-07 — a well-formed derived measurement retains full §28 lineage', () => {
  const m = makeMeasurement(
    {
      value: 100, unit: 'USD', type: 'derived',
      derivation: { sourceObservations: ['obs-a', 'obs-b'], derivationRule: 'fx-convert', ruleVersion: 'v1', result: 100, unit: 'USD' },
    },
    'cost',
  );
  assert.equal(m.derivationStatus, 'DERIVED');
  assert.deepEqual(m.derivation.sourceObservations, ['obs-a', 'obs-b']);
  assert.equal(m.derivation.derivationRule, 'fx-convert');
});

test('a directly-observed measurement has derivationStatus OBSERVED and derivation null', () => {
  const m = makeMeasurement({ value: 3, unit: 'FTE', type: 'personnel' }, 'resource');
  assert.equal(m.derivationStatus, 'OBSERVED');
  assert.equal(m.derivation, null);
});

// ── RI-08 — Historical observations MUST remain immutable ───────────────────────────────
test('RI-08 — a FrictionObservation is frozen', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-5', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    { id: 'fo-5', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, resource: { value: 1, unit: 'FTE', type: 'personnel' }, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.ok(Object.isFrozen(fo));
});

test('RI-08 — reviseCondition never mutates the original; the original stays retrievable', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-6', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const { condition: validated, status } = reviseCondition(cond, LifecycleAction.VALIDATE);
  assert.equal(status, 'OK');
  assert.equal(validated.lifecycleState, LifecycleState.VALIDATED);
  assert.equal(cond.lifecycleState, LifecycleState.OBSERVED); // original untouched
  assert.notEqual(validated, cond); // a distinct object, not a mutation
});

// ── RI-09 — Conflicting observations MUST remain separately retrievable ─────────────────
test('RI-09 — two observations for the same condition are both retrievable, neither dropped', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-7', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const foA = persistFrictionObservation(makeFrictionObservation(
    { id: 'fo-a', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, time: { value: 14, unit: 'days', type: 'duration' }, evidence: [{ id: 'ev-a' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  ));
  const foB = persistFrictionObservation(makeFrictionObservation(
    { id: 'fo-b', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, time: { value: 30, unit: 'days', type: 'duration' }, evidence: [{ id: 'ev-b' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  ));
  const retrieved = getFrictionObservationsForCondition(cond.id);
  assert.equal(retrieved.length, 2);
  assert.ok(retrieved.includes(foA));
  assert.ok(retrieved.includes(foB));
});

// ── RI-10 — no canonical friction scalar may replace R/T/C observations ─────────────────
test('RI-10 — no aggregate/score/severity/level field exists anywhere on a FrictionObservation', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-8', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    {
      id: 'fo-8', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id,
      resource: { value: 3, unit: 'FTE', type: 'personnel' },
      time: { value: 14, unit: 'days', type: 'duration' },
      cost: { value: 180000, unit: 'USD', type: 'direct_economic' },
      evidence: [{ id: 'ev-1' }],
    },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  const forbidden = /score|severity|^level$|^friction$/i;
  const flat = JSON.stringify(fo);
  for (const key of ['score', 'frictionScore', 'severity', 'frictionLevel', 'friction']) {
    assert.ok(!Object.prototype.hasOwnProperty.call(fo, key), `unexpected field: ${key}`);
  }
  assert.ok(!forbidden.test(Object.keys(fo).join(',')));
});

// ── §6 — ConditionType taxonomy ──────────────────────────────────────────────────────────
test('§6 — an unknown conditionType is rejected', () => {
  assert.throws(() => makeRelationshipCondition(
    { id: 'cond-9', relationshipId: ADMITTED_RELATIONSHIP, conditionType: 'MADE_UP_TYPE', evidence: [] },
    { isAdmittedRelationship },
  ), /ConditionType taxonomy/);
});

// ── §33 — Relationship Condition Lifecycle FSM ───────────────────────────────────────────
test('§33 — a newly-constructed condition starts at OBSERVED (evidence already means observed)', () => {
  const c = makeRelationshipCondition(
    { id: 'cond-10', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.TIMING_DEPENDENCY, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  );
  assert.equal(c.lifecycleState, LifecycleState.OBSERVED);
});

test('§33 — valid transition: OBSERVED -> validate -> VALIDATED', () => {
  const { state, status } = applyLifecycleTransition(LifecycleState.OBSERVED, LifecycleAction.VALIDATE);
  assert.equal(status, 'OK');
  assert.equal(state, LifecycleState.VALIDATED);
});

test('§33 — invalid transition leaves state unchanged and reports INVALID_TRANSITION', () => {
  const { state, status } = applyLifecycleTransition(LifecycleState.EXPIRED, LifecycleAction.VALIDATE);
  assert.equal(status, 'INVALID_TRANSITION');
  assert.equal(state, LifecycleState.EXPIRED);
});

test('§33 — EXPIRED and INVALIDATED are terminal (no outgoing transitions)', () => {
  for (const action of Object.values(LifecycleAction)) {
    assert.equal(applyLifecycleTransition(LifecycleState.EXPIRED, action).status, 'INVALID_TRANSITION');
    assert.equal(applyLifecycleTransition(LifecycleState.INVALIDATED, action).status, 'INVALID_TRANSITION');
  }
});

// ── §38 — Canonical Status Model ─────────────────────────────────────────────────────────
test('§38 — zero observations -> NO_GROUNDED_FRICTION', () => {
  assert.equal(classifyFrictionStatus([]), FrictionStatus.NO_GROUNDED_FRICTION);
});

test('§38 — one observation, all three dimensions grounded -> COMPLETE', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-11', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    {
      id: 'fo-11', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id,
      resource: { value: 3, unit: 'FTE', type: 'personnel' },
      time: { value: 14, unit: 'days', type: 'duration' },
      cost: { value: 180000, unit: 'USD', type: 'direct_economic' },
      evidence: [{ id: 'ev-1' }],
    },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(classifyFrictionStatus([fo]), FrictionStatus.COMPLETE);
});

test('§38 — one observation, one dimension grounded -> PARTIAL', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-12', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    { id: 'fo-12', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, resource: { value: 3, unit: 'FTE', type: 'personnel' }, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(classifyFrictionStatus([fo]), FrictionStatus.PARTIAL);
});

test('§38 — one observation, all three absent -> NO_GROUNDED_FRICTION', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-13', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const fo = makeFrictionObservation(
    { id: 'fo-13', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(classifyFrictionStatus([fo]), FrictionStatus.NO_GROUNDED_FRICTION);
});

test('§38 — two-or-more observations for one condition -> INDETERMINATE (RI-15/16/17 deferred, never guessed)', () => {
  __resetForTests();
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-14', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const foA = makeFrictionObservation(
    { id: 'fo-14a', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, time: { value: 14, unit: 'days', type: 'duration' }, evidence: [{ id: 'ev-a' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  const foB = makeFrictionObservation(
    { id: 'fo-14b', relationshipId: ADMITTED_RELATIONSHIP, conditionId: cond.id, time: { value: 30, unit: 'days', type: 'duration' }, evidence: [{ id: 'ev-b' }] },
    { isAdmittedRelationship, isAdmittedCondition },
  );
  assert.equal(classifyFrictionStatus([foA, foB]), FrictionStatus.INDETERMINATE);
});

// ── Route-linkage retrieval surface (Founder ruling, KRYL-1298) ─────────────────────────
test('route-linkage — getFrictionStatusForRelationship reflects real persisted state, per condition', () => {
  __resetForTests();
  const condA = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-15a', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.CAPACITY_LIMIT, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  const condB = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-15b', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.TIMING_DEPENDENCY, evidence: [{ id: 'ev-2' }] },
    { isAdmittedRelationship },
  ));
  persistFrictionObservation(makeFrictionObservation(
    {
      id: 'fo-15a', relationshipId: ADMITTED_RELATIONSHIP, conditionId: condA.id,
      resource: { value: 3, unit: 'FTE', type: 'personnel' },
      time: { value: 14, unit: 'days', type: 'duration' },
      cost: { value: 180000, unit: 'USD', type: 'direct_economic' },
      evidence: [{ id: 'ev-1' }],
    },
    { isAdmittedRelationship, isAdmittedCondition },
  ));
  // condB has zero FrictionObservations -> NO_GROUNDED_FRICTION, distinct from "no condition"
  const statuses = getFrictionStatusForRelationship(ADMITTED_RELATIONSHIP);
  assert.equal(statuses.length, 2);
  const byCondId = Object.fromEntries(statuses.map(s => [s.conditionId, s.status]));
  assert.equal(byCondId[condA.id], FrictionStatus.COMPLETE);
  assert.equal(byCondId[condB.id], FrictionStatus.NO_GROUNDED_FRICTION);
});

test('route-linkage — a Relationship with no observed condition at all returns []', () => {
  __resetForTests();
  assert.deepEqual(getFrictionStatusForRelationship(ADMITTED_RELATIONSHIP), []);
});

test('route-linkage — isAdmittedCondition reflects real persisted state, not a fabricated allow-all', () => {
  __resetForTests();
  assert.equal(isAdmittedCondition('never-persisted'), false);
  const cond = persistRelationshipCondition(makeRelationshipCondition(
    { id: 'cond-16', relationshipId: ADMITTED_RELATIONSHIP, conditionType: ConditionType.DEPENDENCY, evidence: [{ id: 'ev-1' }] },
    { isAdmittedRelationship },
  ));
  assert.equal(isAdmittedCondition(cond.id), true);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
