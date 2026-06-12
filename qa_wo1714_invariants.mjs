// WO-1714 — Invariants test harness
// Proves: V is unaffected by F pipeline; friction math is correct; boundary holds.

import { computeStructuralFriction } from './src/engine/structuralfriction.js';
import { classifyConvergenceState, applyTransitionPolicy } from './src/engine/convergenceclassifier.js';

let pass = 0, fail = 0;
function assert(label, condition) {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}`); fail++; }
}
function near(a, b, eps = 0.001) { return Math.abs(a - b) < eps; }

const mockVector = { D: 0.5, V: 0.3, A: 0.6, T: 0.4 };

// ── 1. V invariance ──────────────────────────────────────────────────────────
const v1 = classifyConvergenceState(mockVector, 0.85);
computeStructuralFriction('CAREER', { feasibility: 0.72, tierIdx: 2 }); // force F path
const v2 = classifyConvergenceState(mockVector, 0.85);
assert('V stateId invariant when F pipeline runs', v1.stateId === v2.stateId);
assert('V label invariant when F pipeline runs',   v1.label  === v2.label);

// ── 2. Score range ───────────────────────────────────────────────────────────
const r1 = computeStructuralFriction('CAREER', { feasibility: 0.72, tierIdx: 2 });
assert('friction score ≥ 0', r1.structuralFriction.score >= 0);
assert('friction score ≤ 1', r1.structuralFriction.score <= 1);

// ── 3. HIGH_FRICTION — retirement under liquidity stress (spec Example B) ───
// INVESTMENTS: op mix=0.20, str mix=0.80
// T0: opFeas≈0.95, strFeas≈0.4275 → opGap=-0.75 (surplus), strGap=+0.3725 (deficit)
// distance=0.837, score≈0.592 → above INVESTMENTS driftingMax=0.42 → HIGH_FRICTION
const r2 = computeStructuralFriction('INVESTMENTS', { feasibility: 0.95, tierIdx: 0 });
assert('retirement@T0 = HIGH_FRICTION', r2.structuralFriction.state === 'HIGH_FRICTION');

// ── 4. ALIGNED — career at open-leaning tier ─────────────────────────────────
// CAREER: op mix=0.65, str mix=0.35
// T1: opFeas≈0.740, strFeas≈0.551 → both near or above mix → low distance
const r3 = computeStructuralFriction('CAREER', { feasibility: 0.87, tierIdx: 1 });
assert('career@T1 = ALIGNED', r3.structuralFriction.state === 'ALIGNED');

// ── 5. Directional vector signs (INVESTMENTS@T0) ─────────────────────────────
const r4 = computeStructuralFriction('INVESTMENTS', { feasibility: 0.95, tierIdx: 0 });
assert('op surplus → negative opGap',     r4.structuralFriction.vector.operational < 0);
assert('str deficit → positive strGap',   r4.structuralFriction.vector.strategic   > 0);

// ── 6. HorizonMix sums to 1.0 ────────────────────────────────────────────────
const r5 = computeStructuralFriction('BUDGET', { feasibility: 0.90, tierIdx: 1 });
assert('horizonMix sums to 1.0', near(r5.horizonMix.operational + r5.horizonMix.strategic, 1.0));

// ── 7. Adaptive thresholds — BUDGET tighter than default ─────────────────────
// BUDGET: op=0.85, str=0.15, T3: opFeas≈0.319, strFeas≈0.58
// opGap=0.531 (large deficit) → HIGH_FRICTION even with tight 0.38 ceiling
const r6 = computeStructuralFriction('BUDGET', { feasibility: 0.58, tierIdx: 3 });
assert('budget@T3 = HIGH_FRICTION (tight thresholds)', r6.structuralFriction.state === 'HIGH_FRICTION');

// ── 8. ALIGNED example from spec (negotiation ≈ CAREER@T1) ──────────────────
// Spec Example A: friction ≈ 0.04 → ALIGNED
assert('spec Example A score < 0.25', r3.structuralFriction.score < 0.25);

console.log(`\n  ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exit(1);
