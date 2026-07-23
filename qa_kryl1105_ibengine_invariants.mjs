// qa_kryl1105_ibengine_invariants.mjs
// KRYL-1105 — Deterministic Ranking (G-F) + reabsorbed invariants slice (from 1106/1107/1109 re-verification).
//
// Guards three properties of ibengine.collapseToDecisionCandidates that exist in code but were untested:
//   G-E completeness — totalAdmitted + totalRejected == totalInput (no candidate silently dropped)
//   rank_cut_exact   — exactly IB_TOP_N admitted when input >= N; overflow all rejected CAP_EXCEEDED
//   G-F determinism  — identical ranking under shuffled input (branchId tie-break on equal collapsedScore)

import { collapseToDecisionCandidates, IB_TOP_N, IB_SURVIVAL_FLOOR } from './src/engine/ibengine.js';

let pass = 0, fail = 0;
const assert = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else      { fail++; console.log(`  ✗ ${name}`); }
};

// candidate factory — survivalProbability controls admit/reject at the floor
const mk = (id, score, survival = 0.9) => ({
  branchId: id,
  rbcsScore: score, survivalProbability: survival, propagationStability: 1.0,
  tier: 'X', instabilityVectors: [], failureModes: [],
});

console.log('KRYL-1105 — ibengine invariants\n');

// ── G-E completeness: mix of below-floor rejects + admitted + cap overflow ──
console.log('G-E completeness:');
const belowFloor = [mk('lo1', 0.5, IB_SURVIVAL_FLOOR - 0.01), mk('lo2', 0.5, 0.10)];
const admittable = Array.from({ length: IB_TOP_N + 3 }, (_, i) => mk(`ok${i}`, 0.9 - i * 0.01));
const mixed = [...belowFloor, ...admittable];
const r1 = collapseToDecisionCandidates({ sourceCI: 'ci1', candidates: mixed });
assert('totalInput == candidates supplied',            r1.totalInput === mixed.length);
assert('admitted + rejected == input (no silent drop)', r1.totalAdmitted + r1.totalRejected === r1.totalInput);

// ── rank_cut_exact: exactly IB_TOP_N admitted, overflow CAP_EXCEEDED ──
console.log('\nrank_cut_exact:');
assert(`exactly IB_TOP_N (${IB_TOP_N}) admitted`,       r1.totalAdmitted === IB_TOP_N);
const capRejects   = r1.rejected.filter(x => x.reason === 'CAP_EXCEEDED');
const floorRejects = r1.rejected.filter(x => x.reason === 'BELOW_SURVIVAL_FLOOR');
assert('overflow admittable rejected CAP_EXCEEDED',     capRejects.length === admittable.length - IB_TOP_N);
assert('below-floor rejected BELOW_SURVIVAL_FLOOR',     floorRejects.length === belowFloor.length);

// ── G-F determinism: equal collapsedScore, shuffled input → identical order ──
console.log('\nG-F determinism:');
const orderOf = ids => collapseToDecisionCandidates({
  sourceCI: 'ci2', candidates: ids.map(id => mk(id, 0.5)),   // identical score → pure tie
}).candidates.map(c => c.branchId).join(',');
const a = orderOf(['b3', 'b1', 'b4', 'b2']);
const b = orderOf(['b2', 'b4', 'b1', 'b3']);
assert('two shuffles produce identical ranking',        a === b);
assert('tie order is ascending branchId',               a === 'b1,b2,b3,b4');

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
