// qa_kryl1218_recommendedaction.mjs — KRYL-1218
// synthGeneral().recommendedAction was a fixed string constant. Every sibling field
// in that function (primaryInsight, bluf, purpose, assessment, fiveWs) interpolates
// the query; ~15 other synthesizers compute recommendedAction dynamically. This one
// didn't — so any query routed to synthGeneral got the identical "Refine with a
// specific decision…" line regardless of what the query said.
//
// Fix: derive recommendedAction from what THIS query carries vs. omits (the same
// three dimensions keyDrivers assesses). No routing change, no new field.
//
// Proof: two materially different queries that both route to synthGeneral (via the
// STARTUP_FINANCE → synthGeneral mapping) must yield two different, query-grounded
// signals — including at low confidence (fidelity ESTIMATED / confidence null).
// Run: node qa_kryl1218_recommendedaction.mjs

import { synthesizeQuery } from './src/engine/querysynthesis.js';

let pass = 0, fail = 0;
const check = (label, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
};

// Query A — a decision + a horizon ("8 months"); no dollar figure.
const QA = 'startup runway is 8 months and we must decide whether to raise a bridge round';
// Query B — a decision only; no figure, no horizon.
const QB = 'our startup is deciding whether to pivot the product line or expand the current one';

const A = synthesizeQuery({ id: 'qa_a', query: QA, lens: 'OPEN', tensor: {} });
const B = synthesizeQuery({ id: 'qa_b', query: QB, lens: 'OPEN', tensor: {} });

console.log('\nQUERY A →', JSON.stringify(A.recommendedAction));
console.log('QUERY B →', JSON.stringify(B.recommendedAction));
console.log(`A: domain=${A.queryDomain} confidence=${A.confidence ?? 'null'} fidelity=${A.fidelity ?? 'null'} narrativeFidelity=${A.narrativeFidelity}`);
console.log(`B: domain=${B.queryDomain} confidence=${B.confidence ?? 'null'} fidelity=${B.fidelity ?? 'null'} narrativeFidelity=${B.narrativeFidelity}\n`);

// 0. Both reached synthGeneral (stateLabel is synthGeneral's signature; recAction is present).
check('A ran through synthGeneral', A.stateLabel === 'SIGNAL ACTIVE' && typeof A.recommendedAction === 'string');
check('B ran through synthGeneral', B.stateLabel === 'SIGNAL ACTIVE' && typeof B.recommendedAction === 'string');

// 1. Signal A ≠ Signal B — the core acceptance condition.
check('recommendedAction differs between A and B', A.recommendedAction !== B.recommendedAction);

// 2. Each signal is grounded in its own query text.
check('A quotes its own query', A.recommendedAction.includes(QA.slice(0, 45)));
check('B quotes its own query', B.recommendedAction.includes(QB.slice(0, 45)));

// 3. Each reflects its own detected context (perception, from real inputs).
check('A reads its "8 months" horizon into the signal', /a horizon/.test(A.recommendedAction));
check('A reads its decision into the signal', /a decision/.test(A.recommendedAction));
check('B (decision only) reads just the decision', /a decision/.test(B.recommendedAction) && !/a horizon/.test(B.recommendedAction));

// 4. PERCEPTION ONLY — no query coaching in the Primary Signal.
const both = A.recommendedAction + B.recommendedAction;
check('no "Add …" coaching clause', !/\bAdd (a|the) /.test(both));
check('no "move it … to a scored signal" coaching', !/move it .* to a scored signal/.test(both));
check('no "Re-run it" coaching', !/Re-run it/.test(both));

// 5. The missing-input list is separated into structured data, not lost.
check('A exposes missingInputs as an array', Array.isArray(A.missingInputs));
check('A.missingInputs names the missing dollar figure', A.missingInputs.some(m => /dollar figure/.test(m)));
check('B.missingInputs also names the missing horizon', B.missingInputs.some(m => /horizon/.test(m)));

// 6. Grounded and substantive even though confidence is low / fidelity estimated.
check('A confidence is low (null or < 0.5)', A.confidence == null || A.confidence < 0.5);
check('A signal still substantive at low confidence', A.recommendedAction.length > 40);
check('B signal still substantive at low confidence', B.recommendedAction.length > 40);

// 7. The old fixed constant is gone from the codepath entirely.
check('neither signal is the old fixed constant',
      !/The more concrete the input, the more precise the output/.test(both));

// ── KRYL-1222 — a horizon set via the scrubber (tensor) counts like a query-text horizon ──
// QC: a decision, no temporal word in the text, but the guest set the horizon control.
const QC = 'our startup is deciding whether to pivot the product line or expand the current one';
const C_noHz = synthesizeQuery({ id: 'qa_c0', query: QC, lens: 'OPEN', tensor: {} });
const C_hz   = synthesizeQuery({ id: 'qa_c1', query: QC, lens: 'OPEN', tensor: { horizonSet: true, horizon: 'LONG' } });
const C_hzDefault = synthesizeQuery({ id: 'qa_c2', query: QC, lens: 'OPEN', tensor: { horizon: 'MED' } }); // reset default, not touched

console.log('\nQUERY C (no horizon)      →', JSON.stringify(C_noHz.recommendedAction));
console.log('QUERY C (horizon set LONG) →', JSON.stringify(C_hz.recommendedAction));

check('C without a horizon still reads decision-only', /a decision/.test(C_noHz.recommendedAction) && !/a horizon/.test(C_noHz.recommendedAction));
check('C with an explicit horizon reads it into the signal', /a horizon \(LONG\)/.test(C_hz.recommendedAction));
check('C with an explicit horizon drops it from missingInputs', !C_hz.missingInputs.some(m => /horizon/.test(m)));
check('a tensor.horizon WITHOUT horizonSet is ignored (reset default is not a choice)',
      !/a horizon/.test(C_hzDefault.recommendedAction) && C_hzDefault.missingInputs.some(m => /horizon/.test(m)));
check('the query-text horizon path is unchanged (A still reads "a horizon")', /a horizon/.test(A.recommendedAction) && !/\(/.test(A.recommendedAction.match(/a horizon[^,]*/)[0]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
