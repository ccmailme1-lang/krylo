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

test('computeCandidatePairs uses the real ARC_THESIS registry — CAPITAL+TECHNOLOGY is a known pair', () => {
  const formations = [
    { formation_id: 'TECHNOLOGY', cohesion: 0.8 },
    { formation_id: 'CAPITAL', cohesion: 0.6 },
  ];
  const pairs = computeCandidatePairs(formations);
  assert.equal(pairs.length, 1, 'CAPITAL+TECHNOLOGY is an ARC_THESIS pair — must produce exactly one candidate');
  const ids = pairs[0].map(f => f.formation_id).sort();
  assert.deepEqual(ids, ['CAPITAL', 'TECHNOLOGY']);
});

test('computeCandidatePairs requires BOTH formations active — one missing side yields no candidate', () => {
  const formations = [{ formation_id: 'TECHNOLOGY', cohesion: 0.8 }]; // CAPITAL not active
  assert.deepEqual(computeCandidatePairs(formations), []);
});

test('computeCandidatePairs does not invent pairs outside ARC_THESIS — unrelated domain has none', () => {
  const formations = [
    { formation_id: 'TECHNOLOGY', cohesion: 0.8 },
    { formation_id: 'KNOWLEDGE', cohesion: 0.6 }, // not an ARC_THESIS pair with TECHNOLOGY
  ];
  assert.deepEqual(computeCandidatePairs(formations), []);
});

test('deriveRelationships produces a real relationship for a grounded ARC_THESIS pair, not a fabricated graph', () => {
  resetRelationshipHistory();
  const formations = [
    { formation_id: 'TECHNOLOGY', cohesion: 0.8 },
    { formation_id: 'CAPITAL', cohesion: 0.6 },
  ];
  const relationships = deriveRelationships(formations);
  assert.equal(relationships.length, 1, 'exactly the grounded CAPITAL+TECHNOLOGY ARC_THESIS pair');
  assert.equal(relationships[0].strength, 0.6); // min(0.8, 0.6)
  assert.equal(relationships[0].confidence, null); // withheld, not fabricated
  assert.equal(relationships[0].direction, 'UNKNOWN');
});

test('a domain absent from ARC_THESIS entirely produces no relationships even with an active formation', () => {
  resetRelationshipHistory();
  // LABOR is adjacent to CAPITAL and TECHNOLOGY in ARC_THESIS -- pick formations where the
  // *only* active domains have no entry together at all is not possible with the current 6-domain
  // registry (every canonical domain pairs with CAPITAL). This test instead confirms a single
  // isolated formation (no partner active) yields zero relationships, which the "requires BOTH
  // formations active" test above already covers structurally -- kept here as a scene-level sanity
  // check with just one active domain.
  const formations = [{ formation_id: 'KNOWLEDGE', cohesion: 0.7 }];
  assert.deepEqual(deriveRelationships(formations), []);
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
