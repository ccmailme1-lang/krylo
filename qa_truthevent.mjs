// qa_truthevent.mjs — golden set for src/engine/truthevent.js
// Not wired into any live surface. Run: node qa_truthevent.mjs

import { makeTruthEvent, idempotencyKey, EventType, Vocabulary, RKM_GENEALOGY_TYPES } from './src/engine/truthevent.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}
function throws(fn) {
  try { fn(); return false; } catch { return true; }
}

const SRE_TYPES = new Set([
  'CAUSES', 'CONSTRAINS', 'DEPENDS_ON', 'ENABLES', 'INHIBITS', 'MEDIATES', 'COMPETES_WITH',
  'SUBSTITUTES_FOR', 'COUPLED_WITH', 'RESONATES_WITH', 'DIVERGES_FROM', 'PRECEDES',
  'COMPOSITION', 'REVEALS',
]);

const base = {
  eventId: 'evt_1', eventType: EventType.RELATIONSHIP_ADMITTED,
  vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn',
  relationshipId: 'rel_1', subjectId: 'A', objectId: 'B',
  decision: 'VALIDATED', rationale: [{ ruleId: 'R1', outcome: 'PASS', message: 'ok' }],
  decidedBy: 'authority_x', rulesetVersion: '1.0.0',
  evidenceRefs: ['ev1'], supersedes: null,
  producedAt: 1000, recordedAt: 2000,
};

console.log('\n=== valid construction ===');
{
  const e = makeTruthEvent(base, SRE_TYPES);
  check('constructs successfully', !!e);
  check('is frozen', Object.isFrozen(e));
  check('rationale entries frozen', Object.isFrozen(e.rationale[0]));
  check('evidenceRefs frozen array', Object.isFrozen(e.evidenceRefs));
}

console.log('\n=== append-only by construction ===');
{
  check('no update export exists', typeof (await import('./src/engine/truthevent.js')).updateTruthEvent === 'undefined');
  check('no delete export exists', typeof (await import('./src/engine/truthevent.js')).deleteTruthEvent === 'undefined');
}

console.log('\n=== RKM_GENEALOGY vocabulary validation ===');
{
  check('valid RKM type (dependsOn) accepted', !throws(() => makeTruthEvent(base, SRE_TYPES)));
  check('invalid RKM type rejected', throws(() => makeTruthEvent({ ...base, relationType: 'CAUSES' }, SRE_TYPES)));
  check('SRE type rejected under RKM_GENEALOGY vocabulary', throws(() => makeTruthEvent({ ...base, relationType: 'MEDIATES' }, SRE_TYPES)));
}

console.log('\n=== SRE_RELATIONCORE vocabulary validation ===');
{
  const sre = { ...base, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: 'MEDIATES' };
  check('valid SRE type accepted', !throws(() => makeTruthEvent(sre, SRE_TYPES)));
  check('RKM type rejected under SRE_RELATIONCORE vocabulary', throws(() => makeTruthEvent({ ...sre, relationType: 'dependsOn' }, SRE_TYPES)));
  check('unknown type rejected', throws(() => makeTruthEvent({ ...sre, relationType: 'NOT_A_TYPE' }, SRE_TYPES)));
}

console.log('\n=== self-validation guard (KRYL-1133 I1) ===');
{
  check('missing decidedBy rejected', throws(() => makeTruthEvent({ ...base, decidedBy: '' }, SRE_TYPES)));
  check('missing decidedBy (undefined) rejected', throws(() => makeTruthEvent({ ...base, decidedBy: undefined }, SRE_TYPES)));
}

console.log('\n=== field validation ===');
{
  check('missing eventId rejected', throws(() => makeTruthEvent({ ...base, eventId: '' }, SRE_TYPES)));
  check('bad eventType rejected', throws(() => makeTruthEvent({ ...base, eventType: 'NOT_REAL' }, SRE_TYPES)));
  check('bad vocabulary rejected', throws(() => makeTruthEvent({ ...base, vocabulary: 'NOT_REAL' }, SRE_TYPES)));
  check('non-semver rulesetVersion rejected', throws(() => makeTruthEvent({ ...base, rulesetVersion: 'v1' }, SRE_TYPES)));
  check('rationale missing outcome rejected', throws(() => makeTruthEvent({ ...base, rationale: [{ ruleId: 'R1' }] }, SRE_TYPES)));
  check('rationale bad outcome rejected', throws(() => makeTruthEvent({ ...base, rationale: [{ ruleId: 'R1', outcome: 'MAYBE' }] }, SRE_TYPES)));
  check('non-array evidenceRefs rejected', throws(() => makeTruthEvent({ ...base, evidenceRefs: 'ev1' }, SRE_TYPES)));
  check('missing producedAt rejected', throws(() => makeTruthEvent({ ...base, producedAt: undefined }, SRE_TYPES)));
  check('missing recordedAt rejected', throws(() => makeTruthEvent({ ...base, recordedAt: undefined }, SRE_TYPES)));
}

console.log('\n=== supersedes ===');
{
  check('null supersedes accepted', !throws(() => makeTruthEvent({ ...base, supersedes: null }, SRE_TYPES)));
  check('string supersedes accepted', !throws(() => makeTruthEvent({ ...base, supersedes: 'evt_0' }, SRE_TYPES)));
  check('non-string non-null supersedes rejected', throws(() => makeTruthEvent({ ...base, supersedes: 42 }, SRE_TYPES)));
}

console.log('\n=== idempotency key ===');
{
  const e1 = makeTruthEvent(base, SRE_TYPES);
  const e2 = makeTruthEvent({ ...base, eventId: 'evt_2', recordedAt: 9999 }, SRE_TYPES);
  check('same relationshipId+eventType+rulesetVersion -> same key regardless of eventId/recordedAt',
    idempotencyKey(e1) === idempotencyKey(e2));
  check('key is NOT session-based (does not match the incompatible egress table pattern)',
    !idempotencyKey(e1).includes('session'));
  const e3 = makeTruthEvent({ ...base, relationshipId: 'rel_2' }, SRE_TYPES);
  check('different relationshipId -> different key', idempotencyKey(e1) !== idempotencyKey(e3));
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
