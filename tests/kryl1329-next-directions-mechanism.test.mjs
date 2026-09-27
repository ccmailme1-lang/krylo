// tests/kryl1329-next-directions-mechanism.test.mjs — KRYL-1329 mechanism verification.
// Rewritten 2026-09-27, second pass (Founder correction: guest words establish which DIMENSION is
// missing -- domain, then structural -- not the literal vocabulary of every candidate value; see
// src/engine/inquirygeneration.js header). Pure-function tests of deriveNextDirections.
//
// Run: node tests/kryl1329-next-directions-mechanism.test.mjs
import assert from 'node:assert/strict';
import { deriveNextDirections, establishedDirections, NEXT_DIRECTION_CATALOG } from '../src/engine/inquirygeneration.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failed++; console.log(`  FAIL - ${name}\n    ${e.message}`); }
}

console.log('ACCEPTANCE TEST — exact sequence specified by the Founder, 2026-09-27');
test('Vendor Platform Decoupling -> domain candidates (six canonical pressures)', () => {
  assert.deepEqual(
    deriveNextDirections({ text: 'Vendor Platform Decoupling' }).map(c => c.label),
    ['Technology', 'Capital', 'Knowledge'], // ontology.js CANONICAL_DOMAINS order, capped at 3
  );
});
test('select Technology -> domain established -> structural-dimension candidates appear', () => {
  assert.deepEqual(
    deriveNextDirections({ text: 'Vendor Platform Decoupling + Technology' }).map(c => c.label),
    ['architecture changes', 'vendor changes', 'adoption changes'],
  );
});
test('select Architecture changes -> no further material dimension remains -> []', () => {
  assert.deepEqual(
    deriveNextDirections({ text: 'Vendor Platform Decoupling + Technology + architecture changes' }),
    [],
  );
});
test('typed entirely as free text -> identical resulting state -> []', () => {
  assert.deepEqual(
    deriveNextDirections({ text: 'Vendor Platform Decoupling Technology Architecture changes' }),
    [],
  );
});
test('delete "Architecture changes" -> structural-dimension candidates become eligible again', () => {
  assert.deepEqual(
    deriveNextDirections({ text: 'Vendor Platform Decoupling Technology' }).map(c => c.label),
    ['architecture changes', 'vendor changes', 'adoption changes'],
  );
});

console.log('\nCANDIDATE VALUES NEED NOT BE IN THE GUEST\'S TEXT (only which dimension is missing does)');
test('domain candidates are the six canonical pressures verbatim, none of which appear in the input text', () => {
  const labels = deriveNextDirections({ text: 'Vendor Platform Decoupling' }).map(c => c.label);
  for (const l of labels) assert.ok(!'vendor platform decoupling'.includes(l.toLowerCase()));
});
test('the domain menu is GATED, not unconditional: it does not appear once a domain is already established', () => {
  assert.ok(!deriveNextDirections({ text: 'Vendor Platform Decoupling + Technology' }).some(c => c.label === 'Capital'));
});

console.log('\nDOMAIN and STRUCTURAL are each a single-value slot, not a checklist');
test('after ANY one domain is picked, no other domain is ever offered again', () => {
  const afterKnowledge = deriveNextDirections({ text: 'Vendor Platform Decoupling + Knowledge' }).map(c => c.label);
  assert.ok(!afterKnowledge.includes('Capital') && !afterKnowledge.includes('Technology'));
});
test('after ANY one structural value is picked, the other structural values are not offered again', () => {
  const afterVendor = deriveNextDirections({ text: 'Vendor Platform Decoupling + Technology + vendor changes' });
  assert.deepEqual(afterVendor, []);
});

console.log('\nLEGACY WORD-GROUNDED ROWS — preserved independently (validated on real production input earlier)');
test('AI Data Center Pushback still offers "local politician reaction" (word-grounded, no domain word present)', () => {
  assert.deepEqual(deriveNextDirections({ text: 'AI Data Center Pushback' }).map(c => c.label), ['local politician reaction']);
});
test('a legacy row is never re-offered once its exact phrase is present (domain is still a separately missing dimension)', () => {
  const r = deriveNextDirections({ text: 'AI Data Center Pushback + local politician reaction' }).map(c => c.label);
  assert.ok(!r.includes('local politician reaction'));
  assert.deepEqual(r, ['Technology', 'Capital', 'Knowledge']); // domain is a distinct, still-open dimension
});

console.log('\nGETS OUT OF THE WAY — complete questions and cue-bearing input, regardless of what dimension is open');
test('a complete question, decision-cue, number, or comparison yields zero even for a bare-subject-shaped input', () => {
  for (const q of ['Is Vendor Platform Decoupling a good investment?', 'Buy Vendor Platform Decoupling now',
                   'Vendor Platform Decoupling for $5 million', 'AWS vs Azure', '', '???']) {
    assert.deepEqual(deriveNextDirections({ text: q }), [], q);
  }
});
test('a subject with no missing dimension and no legacy trigger yields []', () => {
  assert.deepEqual(deriveNextDirections({ text: 'Vendor Platform Decoupling Technology architecture changes' }), []);
});

console.log('\nestablishedDirections — used by the UI/tests to inspect current state');
test('reports both dimensions once both are present', () => {
  const e = establishedDirections('Vendor Platform Decoupling Technology architecture changes');
  assert.equal(e.length, 2);
  assert.ok(e.some(x => x.phrase === 'Technology'));
  assert.ok(e.some(x => x.phrase === 'architecture changes'));
});

console.log('\nPURITY / CONCURRENCY — no module-level mutable state; safe under any call order or interleaving');
test('500 randomly interleaved calls across 6 distinct texts match each text\'s independently-computed baseline', () => {
  const inputs = ['Vendor Platform Decoupling', 'Vendor Platform Decoupling + Technology',
                  'Vendor Platform Decoupling + Technology + architecture changes', 'AI Data Center Pushback',
                  'Regional Bank Consolidation', ''];
  const baseline = new Map(inputs.map(q => [q, JSON.stringify(deriveNextDirections({ text: q }).map(c => c.id))]));
  for (let i = 0; i < 500; i++) {
    const q = inputs[Math.floor(Math.random() * inputs.length)];
    assert.equal(JSON.stringify(deriveNextDirections({ text: q }).map(c => c.id)), baseline.get(q), `iteration ${i}, ${JSON.stringify(q)}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
