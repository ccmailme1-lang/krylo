// QA harness — WO-1360 Fidelity Scoring Engine
import {
  FS_WEIGHTS, computeFs, classifyFs, evaluateFidelity,
  scoreMchecksum, scoreTtelemetry, scoreDdocs, scoreVvoice, scoreEviral
} from './src/engine/fidelityscoring.js';

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

console.log('\nWO-1360 — Fidelity Scoring Engine\n');

// ── TEST 1: Weights sum to 1.0 ───────────────────────────────────────────────
console.log('T1: Weight integrity');
const weightSum = Object.values(FS_WEIGHTS).reduce((a, b) => a + b, 0);
assert('weights sum to 1.00', Math.abs(weightSum - 1.0) < 0.0001, `sum=${weightSum}`);

// ── TEST 2: Perfect inputs → VALIDATED ──────────────────────────────────────
console.log('T2: Perfect inputs → VALIDATED');
const perfect = evaluateFidelity({
  domain: 'BUSINESS',
  inflow: 50000, outflow: 30000, net: 20000,
  fields: { cac_ltv_ratio: 3.2, burn_multiple: 1.5, runway_velocity: 18 },
  docCount: 3,
  contextLength: 250,
  noiseLevel: 0,
});
assert('Fs ≥ 0.85', perfect.fs >= 0.85, `fs=${perfect.fs.toFixed(4)}`);
assert('tier=VALIDATED', perfect.tier.id === 'VALIDATED');
assert('not blocked', perfect.tier.blocked === false);

// ── TEST 3: Partial inputs → ESTIMATED ──────────────────────────────────────
console.log('T3: Partial inputs → ESTIMATED');
const partial = evaluateFidelity({
  domain: 'HOME',
  inflow: 8000, outflow: 7000, net: 1000,
  fields: { debt_to_service_ratio: 0.42 }, // missing market_liquidity_index
  docCount: 0,
  contextLength: 80,
  noiseLevel: 0.3,
});
assert('Fs in [0.50, 0.85)', partial.fs >= 0.50 && partial.fs < 0.85, `fs=${partial.fs.toFixed(4)}`);
assert('tier=ESTIMATED', partial.tier.id === 'ESTIMATED');
assert('not blocked', partial.tier.blocked === false);

// ── TEST 4: Minimal inputs → LOW_FIDELITY ───────────────────────────────────
console.log('T4: Minimal inputs → LOW_FIDELITY');
const minimal = evaluateFidelity({
  domain: 'INVESTMENTS',
  fields: {},
  docCount: 0,
  contextLength: 0,
  noiseLevel: 0.9,
});
assert('Fs < 0.50', minimal.fs < 0.50, `fs=${minimal.fs.toFixed(4)}`);
assert('tier=LOW_FIDELITY', minimal.tier.id === 'LOW_FIDELITY');
assert('blocked=true', minimal.tier.blocked === true);

// ── TEST 5: Mchecksum — balance verification ─────────────────────────────────
console.log('T5: Mchecksum balance logic');
assert('exact match → 1.0', scoreMchecksum({ inflow: 10000, outflow: 6000, net: 4000 }) === 1);
assert('missing net → 0.5', scoreMchecksum({ inflow: 10000, outflow: 6000 }) === 0.5);
assert('no data → 0',       scoreMchecksum({}) === 0);
assert('mismatch degrades',  scoreMchecksum({ inflow: 10000, outflow: 6000, net: 5000 }) < 1);

// ── TEST 6: Ttelemetry — domain field coverage ───────────────────────────────
console.log('T6: Ttelemetry field coverage');
assert('all fields filled → 1.0',
  scoreTtelemetry({ domain: 'CAR', fields: { depreciative_velocity: 0.2, tco: 32000, equity_floor: 8000 } }) === 1);
assert('no fields → 0',
  scoreTtelemetry({ domain: 'CAR', fields: {} }) === 0);
assert('partial → fractional',
  scoreTtelemetry({ domain: 'CAR', fields: { tco: 32000 } }) > 0 &&
  scoreTtelemetry({ domain: 'CAR', fields: { tco: 32000 } }) < 1);

// ── TEST 7: Tier colors are lime, never amber ────────────────────────────────
console.log('T7: No amber — all tier colors #66FF00');
const { FS_TIERS } = await import('./src/engine/fidelityscoring.js');
Object.values(FS_TIERS).forEach(tier => {
  assert(`${tier.id} color is #66FF00`, tier.color === '#66FF00');
});

// ── TEST 8: Fs clamped [0, 1] ────────────────────────────────────────────────
console.log('T8: Fs output clamped [0,1]');
assert('clamps at 0', computeFs({ Mchecksum: -1, Ttelemetry: -1, Ddocs: -1, Vvoice: -1, Eviral: -1 }) === 0);
assert('clamps at 1', computeFs({ Mchecksum: 2,  Ttelemetry: 2,  Ddocs: 2,  Vvoice: 2,  Eviral: 2  }) === 1);

console.log(`\n${pass + fail} tests — ${pass} PASS  ${fail} FAIL\n`);
if (fail > 0) process.exit(1);
