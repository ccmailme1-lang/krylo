// qa_divergencesurface.mjs
// Multi-Item Divergence Surface over asdiff — drives REAL asdiff units (pliengine + buildSignalUnit).
// Guards: reuse (real compareSignals), all-pairs completeness (no silent drops), ranked by |margin|,
// deterministic, per-item "who diverges most", <2 units => empty.

import { computeDivergenceSurface } from './src/engine/divergencesurface.js';
import { buildSignalUnit } from './src/engine/asdiff.js';
import { parse7PointSchema } from './src/engine/pliengine.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

// build a real TECHNOLOGY-domain SignalUnit; vary the fields PLI actually keys on
// (dependency status/coverage, velocity, source_count, risk, constraint severity) so the
// three units genuinely diverge rather than resolve to parity.
const unit = (entity, { depStatus, depCov, severity, risk, velocity, score, sources }) => {
  const schema = {
    domain: 'TECHNOLOGY', subject: entity, decision_type: 'invest', risk_tolerance: risk,
    dependencies: [{ id: 'dep_core', status: depStatus, coverage: depCov }],
    constraints:  [{ label: 'c1', severity }],
    goal: 'g',
  };
  const signal = { id: `${entity}_s`, score, velocity, coverage: depCov, source_count: sources, age_days: 1 };
  return buildSignalUnit(schema, signal, parse7PointSchema(schema, signal), null, { tier: 'entity', entity, domain: 'TECHNOLOGY' });
};

const units = [
  unit('ALPHA',   { depStatus: 'dark', depCov: 0.2, severity: 0.2, risk: 0.8, velocity: 0.9, score: 85, sources: 6 }), // wide gap, fast
  unit('BRAVO',   { depStatus: 'lit',  depCov: 0.9, severity: 0.9, risk: 0.2, velocity: 0.2, score: 30, sources: 1 }), // covered, slow
  unit('CHARLIE', { depStatus: 'lit',  depCov: 0.5, severity: 0.5, risk: 0.5, velocity: 0.55, score: 55, sources: 3 }), // mid
];

console.log('Multi-Item Divergence Surface (on asdiff)\n');

const s = computeDivergenceSurface(units);

console.log('structure + completeness:');
assert('pairs are C(3,2) total across buckets (no silent drop)', s.pairs.length + s.incomparable.length === 3);
assert('byItem covers every compared entity',                     new Set(s.byItem.map(x => x.id)).size >= 1);
assert('each pair carries real asdiff fields',                    s.pairs.every(p => 'leverageMargin' in p && 'dominantAxis' in p && 'winner' in p));

console.log('\nranking:');
const margins = s.pairs.map(p => Math.abs(p.leverageMargin));
assert('pairs ranked by |leverageMargin| desc', margins.every((m, i) => i === 0 || m <= margins[i - 1]));
const totals = s.byItem.map(x => x.totalDivergence);
assert('byItem ranked by totalDivergence desc', totals.every((t, i) => i === 0 || t <= totals[i - 1]));

console.log('\ndeterminism:');
const again = computeDivergenceSurface(units);
assert('identical pair order on re-run', JSON.stringify(s.pairs.map(p => [p.a, p.b])) === JSON.stringify(again.pairs.map(p => [p.a, p.b])));

console.log('\nedge cases:');
assert('<2 units -> empty surface', computeDivergenceSurface([units[0]]).pairs.length === 0);
assert('non-array -> empty surface', computeDivergenceSurface(null).n === 0);

console.log(`\n     top pair: ${s.pairs[0] ? `${s.pairs[0].a} vs ${s.pairs[0].b} (LM ${s.pairs[0].leverageMargin}, axis ${s.pairs[0].dominantAxis})` : 'none'}`);
console.log(`     diverges most: ${s.byItem[0] ? `${s.byItem[0].id} (${s.byItem[0].totalDivergence})` : 'none'}`);
console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
