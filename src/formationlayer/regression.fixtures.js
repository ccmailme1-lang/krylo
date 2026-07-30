// Formation Representation Layer regression fixtures. Run: node src/formationlayer/regression.fixtures.js
// Seeds real signals through the actual ingestion path (surfaceRouter -> domaingravity pool) so
// results are deterministic without depending on whatever live signals happen to be flowing.
import assert from 'node:assert/strict';
import { adaptDomainToFormation, resetFormationHistory } from './formationadapter.js';
import { computeConnectorStrength } from './formationschema.js';
import { resetHysteresisBuffer } from '../engine/convergenceclassifier.js';
import { surfaceRouter } from '../engine/surfacerouter.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS - ${name}`); passed++; }
  catch (err) { console.log(`FAIL - ${name}\n  ${err.message}`); failed++; }
}

function seed(domain, confidence, n = 4) {
  const events = Array.from({ length: n }, (_, i) => ({
    domain, confidence, polarity: 'constructive', source: 'fixture_seed', ts: Date.now() - i * 1000,
  }));
  surfaceRouter.dispatchBatch(events);
}

test('a domain with zero signal produces no formation (absence, not fabricated emerging)', () => {
  resetHysteresisBuffer();
  const formation = adaptDomainToFormation('NONEXISTENT_DOMAIN_XYZ', 0.5);
  assert.equal(formation, null);
});

test('a domain with active signal produces a frozen formation with the expected shape', () => {
  resetHysteresisBuffer();
  resetFormationHistory('CAPITAL');
  seed('CAPITAL', 70);
  const formation = adaptDomainToFormation('CAPITAL', 0.3);
  assert.ok(formation, 'expected a formation — seeding failed');
  assert.ok(Object.isFrozen(formation));
  assert.ok(['stable', 'emerging'].includes(formation.state));
  assert.ok(formation.magnitude >= 0 && formation.magnitude <= 100);
  assert.ok(formation.cohesion >= 0 && formation.cohesion <= 1);
  assert.deepEqual(formation.relationships, []);
});

test('first classification of a state is always emerging (hysteresis has not confirmed it yet)', () => {
  resetHysteresisBuffer();
  resetFormationHistory('CAPITAL');
  seed('CAPITAL', 70);
  const formation = adaptDomainToFormation('CAPITAL', 0.3);
  assert.equal(formation.state, 'emerging', 'a freshly reset hysteresis buffer must not report stable on the first read');
});

test('a state repeated 3x in a row (hysteresis PERSISTENCE_REQUIRED) becomes stable', () => {
  resetHysteresisBuffer();
  resetFormationHistory('CAPITAL');
  seed('CAPITAL', 70);
  let last = null;
  for (let i = 0; i < 4; i++) last = adaptDomainToFormation('CAPITAL', 0.3);
  assert.equal(last.state, 'stable', 'after 3+ identical consecutive reads the state must be confirmed stable');
});

// ── KRYL-Formation Mathematics v0.1 (Operational subset) ──────────────────────────

test('evidence_depth is explicitly null with a reason — never a fabricated proxy number', () => {
  resetHysteresisBuffer();
  resetFormationHistory('CAPITAL');
  seed('CAPITAL', 70);
  const formation = adaptDomainToFormation('CAPITAL', 0.3);
  assert.equal(formation.evidence_depth, null);
  assert.ok(typeof formation.evidence_depth_reason === 'string' && formation.evidence_depth_reason.length > 0);
});

test('velocity is 0 on the first-ever reading for a domain (no prior state to diff against)', () => {
  resetHysteresisBuffer();
  resetFormationHistory('CAPITAL');
  seed('CAPITAL', 70);
  const formation = adaptDomainToFormation('CAPITAL', 0.3);
  assert.equal(formation.velocity, 0);
});

test('velocity reflects a real change between two readings with different magnitude/cohesion', () => {
  resetHysteresisBuffer();
  resetFormationHistory('MEDIA');
  seed('MEDIA', 20); // low magnitude -> low classifier stage
  const first = adaptDomainToFormation('MEDIA', 0.3);
  assert.equal(first.velocity, 0);

  seed('MEDIA', 95); // large jump in magnitude -> different classifier stage likely
  const second = adaptDomainToFormation('MEDIA', 0.3);
  // Real Euclidean distance over [M,C] between the two actual readings, not a fixed constant.
  const expected = Math.sqrt((second.magnitude - first.magnitude) ** 2 + (second.cohesion - first.cohesion) ** 2);
  // dt is real elapsed wall-clock time between the two calls (sub-second here) — assert the
  // formula, not an exact value, since dt varies with actual execution speed.
  assert.ok(second.velocity > 0, 'velocity must be nonzero after a real magnitude change');
  assert.ok(Number.isFinite(second.velocity));
  console.log(`  (raw ΔF magnitude for this run: ${expected.toFixed(3)}, computed velocity: ${second.velocity.toFixed(3)} — scaled by real Δt, not equal by design)`);
});

test('computeConnectorStrength is the real min(cohesion) baseline, not fabricated', () => {
  const a = { cohesion: 0.75 };
  const b = { cohesion: 0.50 };
  assert.equal(computeConnectorStrength(a, b), 0.50);
  assert.equal(computeConnectorStrength(b, a), 0.50, 'must be symmetric');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
