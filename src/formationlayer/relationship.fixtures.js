// Formation Relationship regression fixtures. Run: node src/formationlayer/relationship.fixtures.js
import assert from 'node:assert/strict';
import {
  relationshipId, deriveStrength, deriveState, deriveConfidence,
  computeCandidatePairs, deriveRelationships, filterForHero, filterForSurface,
  RELATIONSHIP_STATE, resetRelationshipHistory,
} from './formationrelationship.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS - ${name}`); passed++; }
  catch (err) { console.log(`FAIL - ${name}\n  ${err.message}`); failed++; }
}

test('relationshipId is deterministic and order-independent', () => {
  assert.equal(relationshipId('TECHNOLOGY', 'CAPITAL'), relationshipId('CAPITAL', 'TECHNOLOGY'));
});

test('deriveStrength is the real min(cohesion) baseline', () => {
  assert.equal(deriveStrength({ cohesion: 0.75 }, { cohesion: 0.5 }), 0.5);
});

test('deriveState is UNKNOWN with no prior reading — never guessed', () => {
  assert.equal(deriveState(0.6, null), RELATIONSHIP_STATE.UNKNOWN);
  assert.equal(deriveState(0.6, undefined), RELATIONSHIP_STATE.UNKNOWN);
});

test('deriveState classifies rising/falling/stable strength correctly', () => {
  assert.equal(deriveState(0.60, 0.40), RELATIONSHIP_STATE.CONVERGING);
  assert.equal(deriveState(0.60, 0.59), RELATIONSHIP_STATE.STABLE);
  assert.equal(deriveState(0.45, 0.55), RELATIONSHIP_STATE.WEAKENING); // delta -0.10, between STABLE_EPS and LARGE_NEGATIVE
  assert.equal(deriveState(0.10, 0.50), RELATIONSHIP_STATE.DIVERGING);
});

test('deriveConfidence is withheld (null), never averaged from a nonexistent field', () => {
  assert.equal(deriveConfidence({ cohesion: 0.5 }, { cohesion: 0.5 }), null);
});

test('computeCandidatePairs is empty — no real domain-association registry exists yet', () => {
  const formations = [
    { formation_id: 'TECHNOLOGY', cohesion: 0.8 },
    { formation_id: 'CAPITAL', cohesion: 0.6 },
  ];
  assert.deepEqual(computeCandidatePairs(formations), []);
});

test('deriveRelationships returns [] when there are no candidate pairs — not a fabricated graph', () => {
  const formations = [
    { formation_id: 'TECHNOLOGY', cohesion: 0.8 },
    { formation_id: 'CAPITAL', cohesion: 0.6 },
    { formation_id: 'OWNERSHIP', cohesion: 0.9 },
  ];
  const relationships = deriveRelationships(formations);
  assert.deepEqual(relationships, [], 'must not manufacture relationships just because formations exist');
});

test('filterForHero and filterForSurface apply strength floors without crashing on an empty set', () => {
  assert.deepEqual(filterForHero([]), []);
  assert.deepEqual(filterForSurface([]), []);
});

test('filterForHero honors the strength floor and cap on a synthetic relationship set', () => {
  const synthetic = [
    { id: 'a', strength: 0.9 }, { id: 'b', strength: 0.5 }, { id: 'c', strength: 0.7 },
  ];
  const hero = filterForHero(synthetic, { minStrength: 0.65, cap: 10 });
  assert.deepEqual(hero.map(r => r.id), ['a', 'c'], 'only strength >= 0.65, sorted descending');
});

resetRelationshipHistory();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
