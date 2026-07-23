// qa_realitycomparator.mjs
// Residual / Reality Comparator — expected−observed operator.
// Guards: correct signed residual + direction + relative scale; direction-neutral (no good/bad);
// non-finite input => null (no fabricated 0, §22); no hardcoded thresholds; series is element-wise.

import { computeResidual, computeResidualSeries, RESIDUAL_DIRECTION as D } from './src/engine/realitycomparator.js';

let pass = 0, fail = 0;
const eq = (a, b, t = 1e-9) => Math.abs(a - b) < t;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('Reality Comparator — residual operator\n');

// ── core: signed residual + direction + relative scale ──
console.log('core operator:');
const above = computeResidual({ expected: 0.5, observed: 0.8 });
assert('observed > expected -> ABOVE', above.direction === D.ABOVE);
assert('residual = observed - expected', eq(above.residual, 0.3));
assert('magnitude = |residual|', eq(above.magnitude, 0.3));
assert('relativeResidual = |resid| / |expected|', eq(above.relativeResidual, 0.3 / 0.5));

const below = computeResidual({ expected: 0.8, observed: 0.5 });
assert('observed < expected -> BELOW', below.direction === D.BELOW && eq(below.residual, -0.3));

const match = computeResidual({ expected: 0.7, observed: 0.7 });
assert('equal -> MATCH, residual 0', match.direction === D.MATCH && match.residual === 0);

// ── expected = 0: no div-by-zero, stays finite ──
console.log('\nexpected = 0 (guarded):');
const fromZero = computeResidual({ expected: 0, observed: 0.5 });
assert('finite relativeResidual (EPS guard)', Number.isFinite(fromZero.relativeResidual) && fromZero.relativeResidual > 0);

// ── §22: non-finite input -> null, never a fabricated 0 ──
console.log('\nno fabricated absence (§22):');
const missing = computeResidual({ expected: 0.5, observed: undefined });
assert('missing observed -> residual null (not 0)', missing.residual === null && missing.direction === null);
assert('no-args -> null residual', computeResidual().residual === null);

// ── direction-neutral: no good/bad judgment leaks into the output ──
console.log('\ndirection-neutral (§20/§21):');
const keys = Object.keys(above).join(',').toLowerCase();
assert('output carries no good/bad/positive/negative field', !/good|bad|positive|negative|favorable/.test(keys));

// ── series: element-wise, shorter length, no padding ──
console.log('\nseries:');
const series = computeResidualSeries([0.2, 0.5, 0.9], [0.3, 0.5]);
assert('series length = shorter input (no padding)', series.length === 2);
assert('series element 0 correct', eq(series[0].residual, 0.1) && series[0].direction === D.ABOVE);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
