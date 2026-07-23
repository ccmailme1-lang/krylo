// qa_kryl1113_counter_evidence.mjs
// KRYL-1113 — Counter-Evidence must not assert false absence (§20/§22).
// The core guard: "not evaluated" must NEVER render as "none found."

import { computeCounterEvidenceState, COUNTER_EVIDENCE_STATE as S } from './src/engine/counterevidence.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('KRYL-1113 — Counter-Evidence state contract\n');

// ── the four states ──
const notRun   = computeCounterEvidenceState({ evaluated: false, contradictions: [] });
const searched = computeCounterEvidenceState({ evaluated: true,  contradictions: [] });
const found    = computeCounterEvidenceState({ evaluated: true,  contradictions: [{ id: 'c1' }, { id: 'c2' }] });
const withheld = computeCounterEvidenceState({ evaluated: true,  withheldReason: 'ungrounded — groundedness below floor' });

console.log('four states:');
assert('not evaluated -> NOT_EVALUATED', notRun.state === S.NOT_EVALUATED);
assert('evaluated + empty -> SEARCHED_NO_MATCH', searched.state === S.SEARCHED_NO_MATCH);
assert('evaluated + contradictions -> FOUND', found.state === S.FOUND);
assert('evaluated + boundary -> WITHHELD', withheld.state === S.WITHHELD);

console.log('\nthe §20/§22 core — unknown is not a negative assertion:');
assert('NOT_EVALUATED label != SEARCHED_NO_MATCH label', notRun.label !== searched.label);
assert('NOT_EVALUATED never says "none found"', !/none|no qualifying/i.test(notRun.label));
assert('empty + not-evaluated does NOT become "none found"', notRun.state !== S.SEARCHED_NO_MATCH);

console.log('\npayload discipline:');
assert('FOUND carries the contradictions', found.contradictions.length === 2);
assert('SEARCHED_NO_MATCH carries no list', searched.contradictions.length === 0);
assert('WITHHELD surfaces the boundary reason', withheld.label === 'ungrounded — groundedness below floor');
assert('default (no args) is NOT_EVALUATED (fail-safe)', computeCounterEvidenceState().state === S.NOT_EVALUATED);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
