// BAU harness — WO-LEV-02: AIAE
// Run: node qa_wo_lev02_aiae.mjs

import { arbitrate, generateCandidates } from './src/engine/aiae.js';

let pass = 0;
let fail = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`);
    pass++;
  } else {
    console.log(`  ✗  ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

// ── Test 1: REAL_ESTATE — top survivor is rate-lock ───────────────────────────
console.log('\n[1] REAL_ESTATE · NOW horizon · $35,000 floor');
const r1 = arbitrate({ domain: 'REAL_ESTATE', horizon: 'NOW', floor: 35000 });
check('survivors length >= 1', r1.survivors.length >= 1);
check('top survivor is re-rate-lock', r1.topK[0]?.id === 're-rate-lock', `got ${r1.topK[0]?.id}`);
check('dominated count > 0', r1.dominated > 0, `got ${r1.dominated}`);
check('all survivors have dominanceRank', r1.survivors.every(s => s.dominanceRank > 0));

// ── Test 2: CAREER · SHORT horizon ────────────────────────────────────────────
console.log('\n[2] CAREER · SHORT horizon · no floor');
const r2 = arbitrate({ domain: 'CAREER', horizon: 'SHORT', floor: 0 });
check('survivors length >= 3', r2.survivors.length >= 3);
const careerIds = r2.topK.map(s => s.id);
check('career-anchor or career-silence in top-3', careerIds.includes('career-anchor') || careerIds.includes('career-silence'));
check('confidence floor is 0.20 (no floor set)', r2.confidenceFloor === 0.20, `got ${r2.confidenceFloor}`);

// ── Test 3: confidence floor gate ─────────────────────────────────────────────
console.log('\n[3] Confidence floor gate — floor=100000 raises gate to 0.40');
const r3 = arbitrate({ domain: 'GENERAL', horizon: 'MED', floor: 100000 });
const r3_nofloor = arbitrate({ domain: 'GENERAL', horizon: 'MED', floor: 0 });
check('floor gate = 0.40', r3.confidenceFloor === 0.40);
check('floor raises gate (fewer or equal pass)', r3.passed <= r3_nofloor.passed, `${r3.passed} vs ${r3_nofloor.passed}`);

// ── Test 4: TTV multiplier effect ────────────────────────────────────────────
console.log('\n[4] TTV multiplier — NOW vs LONG same domain');
const r4_now  = arbitrate({ domain: 'REAL_ESTATE', horizon: 'NOW',  floor: 0 });
const r4_long = arbitrate({ domain: 'REAL_ESTATE', horizon: 'LONG', floor: 0 });
const topNow  = r4_now.topK[0];
const topLong = r4_long.topK[0];
check('NOW ttvMultiplier = 1.00', r4_now.ttvMultiplier === 1.00);
check('LONG ttvMultiplier = 0.15', r4_long.ttvMultiplier === 0.15);
check('high-TTV candidate scores lower under LONG', topNow.score >= topLong.score, `NOW top: ${topNow.score}, LONG top: ${topLong.score}`);

// ── Test 5: Pareto pruning — dominated candidate excluded ─────────────────────
console.log('\n[5] Pareto pruning — strictly dominated candidate excluded from frontier');
const dominated = {
  id: 'strictly-dominated',
  type: 'insight',
  content: 'Dominated on all dims.',
  features: { impact: 0.10, confidence: 0.10, novelty: 0.10, actionability: 0.10, timeToValue: 0.10, evidenceStrength: 0.10 },
};
const custom = [...generateCandidates({ domain: 'REAL_ESTATE' }), dominated];
const r5 = arbitrate({ domain: 'REAL_ESTATE', horizon: 'NOW', floor: 0 }, custom, 5);
const frontierIds = r5.paretoAdditions.map(c => c.id);
check('dominated candidate not in pareto additions', !frontierIds.includes('strictly-dominated'));
check('dominated candidate not in topK', !r5.topK.map(c => c.id).includes('strictly-dominated'));

// ── Test 6: Ranking stability — same input yields same output ─────────────────
console.log('\n[6] Ranking stability — identical tensor produces identical ranked order');
const t = { domain: 'RETIREMENT', horizon: 'LONG', floor: 50000 };
const s1 = arbitrate(t).survivors.map(s => s.id).join(',');
const s2 = arbitrate(t).survivors.map(s => s.id).join(',');
check('identical output on repeat call', s1 === s2, `run1: ${s1} | run2: ${s2}`);

// ── Test 7: Domain weight differentiation ─────────────────────────────────────
console.log('\n[7] Domain weights differ across domains');
const r7_auto = arbitrate({ domain: 'AUTO',       horizon: 'NOW', floor: 0 });
const r7_ret  = arbitrate({ domain: 'RETIREMENT', horizon: 'NOW', floor: 0 });
check('AUTO and RETIREMENT use different weights',
  JSON.stringify(r7_auto.weights) !== JSON.stringify(r7_ret.weights));

// ── Test 8: Slot count — topK respects limit ──────────────────────────────────
console.log('\n[8] Slot count — topK respects limit');
const r8 = arbitrate({ domain: 'REAL_ESTATE', horizon: 'NOW', floor: 0 }, null, 3);
check('topK.length <= 3', r8.topK.length <= 3, `got ${r8.topK.length}`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
console.log(`WO-LEV-02 AIAE  ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exit(1);
