// tests/kryl1329-next-directions-mechanism.test.mjs — KRYL-1329 mechanism verification.
// Rewritten 2026-09-27 (Founder: "stop patching the chip filter — recompute from the current query,
// no chip-sequence memory, guest-typed text and chip selection are the same input").
// Pure-function tests of deriveNextDirections against NEXT_DIRECTION_CATALOG (the real, ratified
// product catalog — there is no separate test-only catalog now; the mechanism has no session state
// to fixture around).
//
// Run: node tests/kryl1329-next-directions-mechanism.test.mjs
import assert from 'node:assert/strict';
import {
  deriveNextDirections, establishedDirections, MAX_CHIPS_PER_ROUND, MAX_ROUNDS, NEXT_DIRECTION_CATALOG,
} from '../src/engine/inquirygeneration.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failed++; console.log(`  FAIL - ${name}\n    ${e.message}`); }
}

console.log('KRYL-1329 product contract (2026-09-27 rewrite)');
test('catalog is ratified and non-empty', () => {
  assert.ok(NEXT_DIRECTION_CATALOG.length > 0);
});

console.log('\nGOVERNING QUESTION — "is there a materially useful, grounded direction not yet established?"');
test('Vendor Platform Decoupling: both grounded directions offered together (the fixed bug)', () => {
  const r = deriveNextDirections({ text: 'Vendor Platform Decoupling' }).map(c => c.label);
  assert.deepEqual(r, ['technology / architecture changes', 'technology / vendor changes']);
});
test('a candidate is suppressed ONLY by its own exact phrase being present, never by one coincidental word', () => {
  // "vendor" appears in the SUBJECT ("Vendor Platform"); that must not suppress the unrelated
  // candidate "technology / vendor changes", which the guest never actually stated.
  const r = deriveNextDirections({ text: 'Vendor Platform Decoupling' }).map(c => c.label);
  assert.ok(r.includes('technology / vendor changes'), 'wrongly suppressed by coincidental word overlap');
});
test('AI Data Center Pushback: every grounded direction offered', () => {
  const r = deriveNextDirections({ text: 'AI Data Center Pushback' }).map(c => c.label);
  assert.deepEqual(r, ['technology / architecture changes', 'technology / adoption changes', 'local politician reaction']);
});
test('no grounded word anywhere in the text -> []', () => {
  assert.deepEqual(deriveNextDirections({ text: 'Regional Bank Consolidation' }), []);
});

console.log('\nFREE TEXT === CHIP SELECTION — identical treatment, no remembered sequence');
test('a guest who types the appended phrase by hand gets the same result as one who selected it', () => {
  const viaChip = (() => {
    const r1 = deriveNextDirections({ text: 'Vendor Platform Decoupling' });
    return 'Vendor Platform Decoupling' + r1[0].appendText;
  })();
  const viaTyping = 'Vendor Platform Decoupling + technology / architecture changes';
  assert.equal(viaChip, viaTyping);
  assert.deepEqual(deriveNextDirections({ text: viaChip }), deriveNextDirections({ text: viaTyping }));
});
test('a guest who types the FULL 2-component query in one go, never touching a chip, sees []', () => {
  const r = deriveNextDirections({ text: 'Vendor Platform Decoupling + technology / architecture changes + technology / vendor changes' });
  assert.deepEqual(r, []);
});

console.log('\nEDITING IS AUTHORITATIVE — no memory of a prior round, every call recomputes from current text');
test('deleting an established direction from the text makes it eligible again', () => {
  const withBoth = 'Vendor Platform Decoupling + technology / architecture changes + technology / vendor changes';
  assert.deepEqual(deriveNextDirections({ text: withBoth }), []);
  const withOneDeleted = 'Vendor Platform Decoupling + technology / vendor changes'; // guest deleted T1's segment
  assert.deepEqual(deriveNextDirections({ text: withOneDeleted }).map(c => c.id), ['nd:T1']);
});
test('order of establishment does not matter (pure function of current text only)', () => {
  const a = deriveNextDirections({ text: 'Vendor Platform Decoupling + technology / vendor changes' });
  const b = deriveNextDirections({ text: 'Vendor Platform Decoupling + technology / architecture changes' });
  assert.deepEqual(a.map(c => c.id), ['nd:T1']);
  assert.deepEqual(b.map(c => c.id), ['nd:T2']);
});

console.log('\n3-COMPONENT CEILING — a maximum, not a goal (fewer than 3 is a valid, correct end state)');
test('establishedDirections counts correctly and the ceiling stops offers once reached', () => {
  const q = 'AI Data Center Pushback + technology / architecture changes + technology / adoption changes + local politician reaction';
  assert.equal(establishedDirections(q).length, 3);
  assert.deepEqual(deriveNextDirections({ text: q }), []);
});
test('2 established with nothing further grounded is a valid, correct stop (never forces a 3rd)', () => {
  const q = 'Vendor Platform Decoupling + technology / architecture changes + technology / vendor changes';
  assert.equal(establishedDirections(q).length, 2);
  assert.deepEqual(deriveNextDirections({ text: q }), [], 'must not invent a candidate to fill the ceiling');
});
test('MAX_CHIPS_PER_ROUND bounds a single offer regardless of how many directions are grounded at once', () => {
  const r = deriveNextDirections({ text: 'AI Data Center Pushback' });
  assert.ok(r.length <= MAX_CHIPS_PER_ROUND);
});

console.log('\nGETS OUT OF THE WAY — complete questions and cue-bearing input');
test('a complete question, decision-cue, number, or comparison yields zero, regardless of grounded words present', () => {
  for (const q of ['Is Vendor Platform Decoupling a good investment?', 'Buy Vendor Platform Decoupling now',
                   'Vendor Platform Decoupling for $5 million', 'AWS vs Azure', '', '???']) {
    assert.deepEqual(deriveNextDirections({ text: q }), [], q);
  }
});

console.log('\nPURITY / CONCURRENCY — no module-level state; safe under any call order or interleaving');
test('500 randomly interleaved calls across 6 distinct texts match each text\'s independently-computed baseline', () => {
  const inputs = ['Vendor Platform Decoupling', 'Vendor Platform Decoupling + technology / architecture changes',
                  'AI Data Center Pushback', 'Contract Liability Review', 'Regional Bank Consolidation', ''];
  const baseline = new Map(inputs.map(q => [q, JSON.stringify(deriveNextDirections({ text: q }).map(c => c.id))]));
  for (let i = 0; i < 500; i++) {
    const q = inputs[Math.floor(Math.random() * inputs.length)];
    assert.equal(JSON.stringify(deriveNextDirections({ text: q }).map(c => c.id)), baseline.get(q), `iteration ${i}, ${JSON.stringify(q)}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
