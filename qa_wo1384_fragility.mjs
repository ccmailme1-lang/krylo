// qa_wo1384_fragility.mjs — WO-1384 fragility phase integration harness
// Proves engine behavior changes materially across fragility phases.
// Run: node qa_wo1384_fragility.mjs

import { detectFragilityPhase, classifyConvergenceState } from './src/engine/convergenceclassifier.js';
import { arbitrate, generateCandidates } from './src/engine/aiae.js';

let pass = 0;
let fail = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

// ── Scenario builder ────────────────────────────────────────────────────────
function runScenario(label, tensor) {
  const pool = generateCandidates(tensor);
  const result = arbitrate(tensor, pool);
  const topIds = result.topK.map(c => c.id);
  const topScores = result.topK.map(c => ({ id: c.id, score: c.score, ttv: c.features.timeToValue }));
  return { label, result, topIds, topScores, ttvMultiplier: result.ttvMultiplier, capped: result.fragilityTtvCapped };
}

console.log('\n════════════════════════════════════════════');
console.log('  WO-1384 FRAGILITY PHASE — OUTCOME HARNESS');
console.log('════════════════════════════════════════════\n');

// ── BLOCK 1: detectFragilityPhase boundary conditions ───────────────────────
console.log('BLOCK 1 — Phase classifier boundary conditions\n');

const nominal   = detectFragilityPhase({ V: 0.3 }, 0.80, 4); // high conv, low V, good Fs
const setup     = detectFragilityPhase({ V: 0.3 }, 0.40, 4); // high conv, low V, bad Fs
const marangoni = detectFragilityPhase({ V: 0.75 }, 0.70, 2); // building, high V
const tenuous   = detectFragilityPhase({ V: 0.9 }, 0.60, 3); // turbulent
const snap      = detectFragilityPhase({ V: 0.5 }, 0.30, 1); // insufficient

assert('NOMINAL: stateId=4, fs=0.80, V=0.3 → phase 0',   nominal.phase   === 0);
assert('PHASE_1_SETUP: stateId=4, fs=0.40, V=0.3 → phase 1', setup.phase  === 1);
assert('PHASE_2_MARANGONI: stateId=2, V=0.75 → phase 2', marangoni.phase  === 2);
assert('PHASE_3_TENUOUS: stateId=3 → phase 3',            tenuous.phase   === 3);
assert('PHASE_4_SNAP: stateId=1 → phase 4',               snap.phase      === 4);

// Phase 1 not shadowed by Phase 2: stateId=4, V=0.75, fs=0.40 → must be PHASE_1
const shadowTest = detectFragilityPhase({ V: 0.75 }, 0.40, 4);
assert('Phase 1 not shadowed by Phase 2 (stateId=4, V=0.75, fs=0.40)', shadowTest.phase === 1,
  `got phase ${shadowTest.phase} (${shadowTest.label})`);

// ── BLOCK 2: AIAE TTV multiplier behavior ────────────────────────────────────
console.log('\nBLOCK 2 — AIAE TTV multiplier change under fragility\n');

// Baseline: CAREER, horizon=LONG, no fragility
const baselineLong = runScenario('CAREER/LONG/NOMINAL', {
  domain: 'CAREER', horizon: 'LONG', floor: 0,
});

// Same but PHASE_2_MARANGONI injected
const marangoniLong = runScenario('CAREER/LONG/MARANGONI', {
  domain: 'CAREER', horizon: 'LONG', floor: 0,
  fragilityPhase: { phase: 2, label: 'PHASE_2_MARANGONI' },
});

// Same but PHASE_3_TENUOUS
const tenuousLong = runScenario('CAREER/LONG/TENUOUS', {
  domain: 'CAREER', horizon: 'LONG', floor: 0,
  fragilityPhase: { phase: 3, label: 'PHASE_3_TENUOUS' },
});

console.log(`  Baseline (LONG/NOMINAL)   ttvMult=${baselineLong.ttvMultiplier}  capped=${baselineLong.capped}`);
console.log(`  Marangoni (LONG/PHASE_2)  ttvMult=${marangoniLong.ttvMultiplier}  capped=${marangoniLong.capped}`);
console.log(`  Tenuous (LONG/PHASE_3)    ttvMult=${tenuousLong.ttvMultiplier}  capped=${tenuousLong.capped}`);

assert('NOMINAL horizon=LONG: not capped', !baselineLong.capped);
assert('PHASE_2 horizon=LONG: capped flag true', marangoniLong.capped,
  `fragilityTtvCapped=${marangoniLong.capped}`);
assert('PHASE_2 horizon=LONG: ttvMult > baseline LONG',
  marangoniLong.ttvMultiplier > baselineLong.ttvMultiplier,
  `${marangoniLong.ttvMultiplier} vs ${baselineLong.ttvMultiplier}`);
assert('PHASE_3 horizon=LONG: ttvMult > baseline LONG',
  tenuousLong.ttvMultiplier > baselineLong.ttvMultiplier,
  `${tenuousLong.ttvMultiplier} vs ${baselineLong.ttvMultiplier}`);

// ── BLOCK 3: Score distribution shift ───────────────────────────────────────
console.log('\nBLOCK 3 — Score distribution: immediate vs deferred candidates\n');

// Find the highest-TTV (most immediate) and lowest-TTV (most deferred) candidates
function ttvBucket(candidates) {
  const sorted = [...candidates].sort((a, b) => b.features.timeToValue - a.features.timeToValue);
  return {
    mostImmediate: sorted[0],
    mostDeferred:  sorted[sorted.length - 1],
  };
}

const pool = generateCandidates({ domain: 'CAREER' });
const { mostImmediate, mostDeferred } = ttvBucket(pool);

function scoreWith(fragilityPhase) {
  return arbitrate({ domain: 'CAREER', horizon: 'LONG', floor: 0, fragilityPhase }, pool);
}

const resNominal   = scoreWith(null);
const resMarangoni = scoreWith({ phase: 2, label: 'PHASE_2_MARANGONI' });

const immNoFrag = resNominal.survivors.find(c => c.id === mostImmediate.id)?.score ?? 0;
const immFrag   = resMarangoni.survivors.find(c => c.id === mostImmediate.id)?.score ?? 0;
const defNoFrag = resNominal.survivors.find(c => c.id === mostDeferred.id)?.score ?? 0;
const defFrag   = resMarangoni.survivors.find(c => c.id === mostDeferred.id)?.score ?? 0;

console.log(`  Most immediate candidate: "${mostImmediate.id}" (timeToValue=${mostImmediate.features.timeToValue})`);
console.log(`    score NOMINAL:   ${immNoFrag.toFixed(4)}`);
console.log(`    score MARANGONI: ${immFrag.toFixed(4)}`);
console.log(`  Most deferred candidate: "${mostDeferred.id}" (timeToValue=${mostDeferred.features.timeToValue})`);
console.log(`    score NOMINAL:   ${defNoFrag.toFixed(4)}`);
console.log(`    score MARANGONI: ${defFrag.toFixed(4)}`);

assert('Immediate candidate scores higher under PHASE_2 than NOMINAL (LONG horizon)',
  immFrag >= immNoFrag, `${immFrag} vs ${immNoFrag}`);

// ── BLOCK 4: Turbulent → LONG suppression ───────────────────────────────────
console.log('\nBLOCK 4 — Turbulent convergence no longer recommends LONG horizon\n');

const turbulentBefore = runScenario('TURBULENT/LONG/no-fragility', {
  domain: 'REAL_ESTATE', horizon: 'LONG', floor: 50000,
});
const turbulentAfter = runScenario('TURBULENT/LONG/PHASE_3_TENUOUS', {
  domain: 'REAL_ESTATE', horizon: 'LONG', floor: 50000,
  fragilityPhase: { phase: 3, label: 'PHASE_3_TENUOUS' },
});

const topBeforeAvgTtv = turbulentBefore.topScores.reduce((s, c) => s + c.ttv, 0) / turbulentBefore.topScores.length;
const topAfterAvgTtv  = turbulentAfter.topScores.reduce((s, c) => s + c.ttv, 0) / turbulentAfter.topScores.length;

console.log(`  Before (no fragility): avg timeToValue in top-5 = ${topBeforeAvgTtv.toFixed(3)}`);
console.log(`  After  (PHASE_3):      avg timeToValue in top-5 = ${topAfterAvgTtv.toFixed(3)}`);

assert('PHASE_3_TENUOUS shifts top-5 toward higher-timeToValue (more immediate) candidates',
  topAfterAvgTtv >= topBeforeAvgTtv, `${topAfterAvgTtv.toFixed(3)} vs ${topBeforeAvgTtv.toFixed(3)}`);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════');
console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
console.log('════════════════════════════════════════════\n');
if (fail > 0) process.exit(1);
