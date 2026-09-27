// tests/kryl1329-next-directions-mechanism.test.mjs — KRYL-1329 mechanism verification.
// Pure-function tests of deriveNextDirections against _TEST_ONLY_DRAFT_CATALOG (see
// src/engine/inquirygeneration.js for why that catalog is test-only and never read by product
// code). The PRODUCTION catalog (NEXT_DIRECTION_CATALOG) is separately asserted empty/frozen here
// (D4/D6 unratified) — that assertion is the actual deployment gate; if the Founder ratifies rows
// into NEXT_DIRECTION_CATALOG, this file's mechanism coverage still applies unchanged.
//
// Run: node tests/kryl1329-next-directions-mechanism.test.mjs
import assert from 'node:assert/strict';
import {
  deriveNextDirections, guestAuthoredText, MAX_CHIPS_PER_ROUND, MAX_ROUNDS,
  NEXT_DIRECTION_CATALOG, _TEST_ONLY_DRAFT_CATALOG as CAT,
} from '../src/engine/inquirygeneration.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failed++; console.log(`  FAIL - ${name}\n    ${e.message}`); }
}

console.log('KRYL-1329 deploy gate');
test('production catalog is frozen empty (D4/D6 unratified -> no executable candidates)', () => {
  assert.equal(NEXT_DIRECTION_CATALOG.length, 0);
  assert.deepEqual(deriveNextDirections({ text: 'Digital Software Platform', appended: [] }), []);
});

console.log('\nGOAL 1 — never more than MAX_CHIPS_PER_ROUND, on any input, in any round');
test('corpus-wide chip count bound', () => {
  const corpus = ['Digital Software Platform', 'Private Equity Roll-Up', 'Contract Liability Review',
    'Thai Restaurant Chain', 'Tesla', 'warehouse robotics', 'Is Anduril a good acquisition target?',
    'AWS vs Azure', '', '???'];
  for (const q of corpus) {
    assert.ok(deriveNextDirections({ text: q, appended: [], catalog: CAT }).length <= MAX_CHIPS_PER_ROUND, q);
  }
});

console.log('\nGOAL 2 — up to MAX_ROUNDS rounds, one selection per round, hard stop, zero ends immediately');
test('a 3-direction input runs 3 -> 2 -> 1 -> stop, catalog order, no repeats', () => {
  let text = 'Digital Software Platform', appended = [];
  const seen = [];
  for (let round = 1; round <= MAX_ROUNDS + 1; round++) {
    const r = deriveNextDirections({ text, appended, catalog: CAT });
    seen.push(r.map(c => c.id));
    if (!r.length) break;
    text += r[0].appendText; appended.push(r[0].label);
  }
  assert.deepEqual(seen, [['nd:T1', 'nd:T2', 'nd:T3'], ['nd:T2', 'nd:T3'], ['nd:T3'], []]);
});
test('a 1-direction input stops after that single selection (zero ends assistance)', () => {
  const r1 = deriveNextDirections({ text: 'Vendor Platform', appended: [], catalog: CAT });
  assert.deepEqual(r1.map(c => c.id), ['nd:T1']);
  const r2 = deriveNextDirections({ text: 'Vendor Platform' + r1[0].appendText, appended: [r1[0].label], catalog: CAT });
  assert.deepEqual(r2, []);
});
test('MAX_ROUNDS is enforced structurally, independent of catalog size', () => {
  const appended = ['a', 'b', 'c'];
  assert.deepEqual(deriveNextDirections({ text: 'Digital Software Platform a b c', appended, catalog: CAT }), []);
});

console.log('\nGOAL 3 — grounded only in the guest\'s own words; KRYLO text never grounds; no repeats');
test('R-F: guestAuthoredText strips exactly an appended phrase, nothing else, for every catalog row', () => {
  for (const c of CAT) {
    assert.equal(guestAuthoredText(`Some Guest Text + ${c.phrase}`, [c.phrase]), 'Some Guest Text');
  }
});
test('selecting T1 never makes a different family (F/M/L/H/C) eligible purely from KRYLO\'s own words', () => {
  const r1 = deriveNextDirections({ text: 'Digital Software Platform', appended: [], catalog: CAT });
  const text2 = 'Digital Software Platform' + r1[0].appendText;
  const r2 = deriveNextDirections({ text: text2, appended: [r1[0].label], catalog: CAT });
  for (const c of r2) assert.ok(c.id.startsWith('nd:T'), `non-T family ${c.id} appeared after only a T selection`);
});
test('an already-appended phrase is never re-offered', () => {
  const q = `Digital Software Platform + technology / architecture changes`;
  const r = deriveNextDirections({ text: q, appended: ['technology / architecture changes'], catalog: CAT });
  assert.ok(!r.some(c => c.label === 'technology / architecture changes'));
});
test('guest edits between rounds change what the next round offers', () => {
  const r1 = deriveNextDirections({ text: 'Digital Software Platform', appended: [], catalog: CAT });
  const edited = 'Digital Software Platform' + r1[0].appendText + ' cloud';
  const r2 = deriveNextDirections({ text: edited, appended: [r1[0].label], catalog: CAT });
  assert.deepEqual(r2.map(c => c.id), ['nd:T2', 'nd:T3']);
});

console.log('\nGOAL 4 — complete questions and cue-bearing input get zero by default');
test('question, decision-cue, number, comparison, empty, noise all give zero', () => {
  for (const q of ['Is Digital Software Platform a good investment?', 'Buy Digital Software Platform now',
                   'Digital Software Platform for $5 million', 'AWS vs Azure', '', '???']) {
    assert.deepEqual(deriveNextDirections({ text: q, appended: [], catalog: CAT }), [], q);
  }
});
test('KNOWN LIMITATION (disclosed, out of scope): geo suppression does not fire for a plain place name, because querycontext.js\'s own geo detector does not recognize one (its comment: "real geo extraction is a follow-on ticket") — this is a pre-existing capability gap, not a KRYL-1329 defect', () => {
  const r = deriveNextDirections({ text: 'Digital Software Platform in Austin', appended: [], catalog: CAT });
  assert.ok(r.length > 0, 'documents the known gap; will start failing (a good thing) once geo extraction is built');
});

console.log('\nCROSS-ROW CONTAMINATION MATRIX — every selection order, for every multi-candidate input');
test('order never introduces an out-of-family candidate, never re-offers a selected one, respects the hard stop', () => {
  function permutations(arr) {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permutations(rest)) out.push([arr[i], ...p]);
    }
    return out;
  }
  for (const base of ['Digital Software Platform', 'Private Equity Roll-Up', 'Contract Liability Review']) {
    const round1 = deriveNextDirections({ text: base, appended: [], catalog: CAT });
    const round1Ids = new Set(round1.map(c => c.id));
    if (!round1.length) continue;
    for (const order of permutations(round1.map(c => c.id))) {
      let text = base, appended = [];
      for (const id of order) {
        const avail = deriveNextDirections({ text, appended, catalog: CAT });
        for (const c of avail) assert.ok(round1Ids.has(c.id), `${base} ${order}: out-of-family ${c.id}`);
        const cand = avail.find(c => c.id === id);
        assert.ok(cand, `${base} ${order}: ${id} not offered when it should be, appended=${JSON.stringify(appended)}`);
        text += cand.appendText; appended.push(cand.label);
      }
      const after = deriveNextDirections({ text, appended, catalog: CAT });
      if (appended.length >= MAX_ROUNDS) assert.deepEqual(after, [], `${base} ${order}: round offered past MAX_ROUNDS`);
    }
  }
});

console.log('\nCONCURRENCY / PURITY — the function has no module-level mutable state, so interleaved calls');
console.log('from concurrent renders/edits cannot contaminate each other\'s results');
test('500 randomly interleaved calls across 7 distinct inputs match each input\'s independently-computed baseline', () => {
  const inputs = ['Digital Software Platform', 'Vendor Platform', 'Private Equity Roll-Up', 'Contract Liability Review',
                  'Career Role Organization', 'Thai Restaurant Chain', ''];
  const baseline = new Map(inputs.map(q => [q, JSON.stringify(deriveNextDirections({ text: q, appended: [], catalog: CAT }).map(c => c.id))]));
  for (let i = 0; i < 500; i++) {
    const q = inputs[Math.floor(Math.random() * inputs.length)];
    const r = JSON.stringify(deriveNextDirections({ text: q, appended: [], catalog: CAT }).map(c => c.id));
    assert.equal(r, baseline.get(q), `iteration ${i}, input ${JSON.stringify(q)}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
