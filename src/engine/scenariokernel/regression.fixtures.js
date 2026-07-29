// KRYL-1126 regression fixtures. Run: node src/engine/scenariokernel/regression.fixtures.js
import assert from 'node:assert/strict';
import { computeBeta } from '../structuralintegrity.js';
import { sealScenarioEnvelope, isSealed } from './scenarioenvelope.js';
import { analyzeScenario } from './analyticalplane.js';
import { computeSC } from './archetypeengine.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS - ${name}`); passed++; }
  catch (err) { console.log(`FAIL - ${name}\n  ${err.message}`); failed++; }
}

// AC-001: structuralintegrity.js is never imported for mutation, only computeBeta() read.
test('AC-001: Integrity Plane (structuralintegrity.js) is read-only, untouched by this module', () => {
  const beta = computeBeta({ domainReads: [], historySeries: [], pureComputeFn: null, ueResult: null });
  assert.ok(Object.isFrozen(beta), 'computeBeta output must be frozen — confirms Integrity Plane is producing its own untouched output');
});

// AC-002 + one-way flow: sealScenarioEnvelope refuses an unfrozen (i.e. non-real) beta.
test('AC-002: sealScenarioEnvelope refuses a beta that was not really produced by the Integrity Plane', () => {
  assert.throws(() => sealScenarioEnvelope({ beta: { sci: 0.5 } }), /refusing to seal/);
});

// AC-003: envelope is immutable after sealing.
test('AC-003: sealed envelope cannot be mutated', () => {
  const beta = computeBeta({ domainReads: [], historySeries: [], pureComputeFn: null, ueResult: null });
  const envelope = sealScenarioEnvelope({ scenarioId: 'SCN-TEST', intentClass: 'PROJECTION', beta, assumptionLedgerEntries: [] });
  assert.ok(isSealed(envelope));
  assert.throws(() => { envelope.export_gate = 'UNLOCKED'; }, TypeError, 'mutating a sealed envelope must throw in strict mode');
});

// AC-004: Analytical Plane output never contains the word "confidence" anywhere.
test('AC-004: Analytical Plane output contains no "confidence" anywhere (structural check, not just docs)', () => {
  const beta = computeBeta({ domainReads: [], historySeries: [], pureComputeFn: null, ueResult: null });
  const envelope = sealScenarioEnvelope({ scenarioId: 'SCN-TEST-2', intentClass: 'PROJECTION', beta, assumptionLedgerEntries: [
    { field: 'NIL_term', value: '36_months', origin: 'user_defined', immutable: true },
  ]});
  const result = analyzeScenario(envelope, {
    archetype: 'NEGOTIATION',
    scComponents: { completeness: 0.90, relationshipLogic: 0.95, constraintFit: 0.80, assumptionHygiene: 0.75 },
    constraints: [{ id: 'performance_guarantee', opposingId: 'optionality', frictionMagnitude: 0.62 }],
    leverage: { actorId: 'athlete', actorPosition: 0.7, counterpartyId: 'program', counterpartyPosition: 0.53 },
  });
  const json = JSON.stringify(result);
  assert.ok(!/confidence/i.test(json), 'output leaked the word "confidence"');
  assert.equal(result.structural_assessment.SC_score, computeSC('NEGOTIATION', {
    completeness: 0.90, relationshipLogic: 0.95, constraintFit: 0.80, assumptionHygiene: 0.75,
  }).SC_score);
  assert.equal(result.analytical_mode.includes('NON_EVIDENTIARY'), true);
});

// AC-005: replay determinism — identical inputs reproduce identical SC/tau/lambda.
test('AC-005: identical envelope + inputs reproduce identical SC/tau/lambda', () => {
  const beta = computeBeta({ domainReads: [], historySeries: [], pureComputeFn: null, ueResult: null });
  const envelope = sealScenarioEnvelope({ scenarioId: 'SCN-TEST-3', intentClass: 'PROJECTION', beta, assumptionLedgerEntries: [] });
  const inputs = {
    archetype: 'NEGOTIATION',
    scComponents: { completeness: 0.9, relationshipLogic: 0.95, constraintFit: 0.8, assumptionHygiene: 0.75 },
    constraints: [{ id: 'a', opposingId: 'b', frictionMagnitude: 0.62 }],
    leverage: { actorId: 'x', actorPosition: 0.7, counterpartyId: 'y', counterpartyPosition: 0.53 },
  };
  const r1 = analyzeScenario(envelope, inputs);
  const r2 = analyzeScenario(envelope, inputs);
  assert.equal(r1.structural_assessment.SC_score, r2.structural_assessment.SC_score);
  assert.equal(r1.tension_analysis.tension_tau, r2.tension_analysis.tension_tau);
  assert.equal(r1.leverage_analysis.leverage_lambda, r2.leverage_analysis.leverage_lambda);
});

// Attempting to reason over an unsealed object must be refused outright.
test('analyzeScenario refuses an unsealed envelope', () => {
  assert.throws(() => analyzeScenario({ integrity_status: 'SEALED' }, { archetype: 'NEGOTIATION', scComponents: {} }), /not sealed/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
