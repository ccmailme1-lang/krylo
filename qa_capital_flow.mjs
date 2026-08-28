// qa_capital_flow.mjs — end-to-end: "$2.5 million" in the query text must reach
// 2,500,000 at every synthesis-side consumer, not the pre-fix 2.5 / rounded $3.
// Complements qa_extractnumbers.mjs (which tests the parser in isolation).
// Run: node qa_capital_flow.mjs

import { synthesizeQuery, extractNumbers } from './src/engine/querysynthesis.js';

let pass = 0, fail = 0;
const check = (label, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
};

// Capital-specific, routes to synthGeneral (STARTUP_FINANCE) which surfaces the figure.
const Q = 'our startup needs to raise a bridge round; budget on the table is $2.5 million to decide within 6 months';
const r = synthesizeQuery({ id: 'cap', query: Q, lens: 'OPEN', tensor: {} });
const capDriver = (r.keyDrivers || []).find(d => /capital/i.test(d.label));

console.log('\nextractNumbers   :', extractNumbers(Q));
console.log('PRIMARY SIGNAL   :', r.recommendedAction);
console.log('keyDrivers cap   :', capDriver?.delta);
console.log('missingInputs    :', r.missingInputs, '\n');

check('extractNumbers → 2,500,000',                 extractNumbers(Q)[0] === 2_500_000);
check('PRIMARY SIGNAL carries $2,500,000',          /\$2,500,000/.test(r.recommendedAction || ''));
check('PRIMARY SIGNAL has no $3 artifact',          !/\$3\b/.test(r.recommendedAction || ''));
check('keyDrivers capital context = $2,500,000',    !!capDriver && /2,500,000/.test(capDriver.delta));
check('$2.5M figure not flagged as a missing input', !(r.missingInputs || []).some(m => /dollar figure/.test(m)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
