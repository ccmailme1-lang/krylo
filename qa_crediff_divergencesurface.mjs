// qa_crediff_divergencesurface.mjs
// Producer wiring: crediff.runDivergenceSurface -> computeDivergenceSurface (end-to-end).
// Validates the live path runs on a real entity set; data is placeholder-grounded (parity by
// design) until KRYL-1006, so the assertions check the PIPELINE, not divergence magnitude.

import { runDivergenceSurface } from './src/engine/crediff.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('crediff.runDivergenceSurface — producer -> surface\n');

const r = runDivergenceSurface(['google', 'microsoft', 'amazon']);

console.log('pipeline runs on a real entity set:');
assert('entities uppercased', JSON.stringify(r.entities) === JSON.stringify(['GOOGLE', 'MICROSOFT', 'AMAZON']));
assert('surface built', r.surface && r.surface.version === 1 && r.surface.n === 3);
assert('all C(3,2) pairs accounted (no silent drop)', r.surface.pairs.length + r.surface.incomparable.length === 3);
assert('byItem present for the field', Array.isArray(r.surface.byItem));

console.log('\ngrounding honesty (§ provisional, not faked real):');
assert('grounding flagged PROVISIONAL (placeholder data)', /PROVISIONAL/.test(r.grounding) && /KRYL-1006/.test(r.grounding));

console.log('\nedge case:');
const few = runDivergenceSurface(['google']);
assert('<2 entities -> INSUFFICIENT_ENTITIES, empty surface', few.grounding === 'INSUFFICIENT_ENTITIES' && few.surface.pairs.length === 0);

console.log(`\n     grounding: ${r.grounding.split('.')[0]}.`);
console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
