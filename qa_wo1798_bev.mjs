// qa_wo1798_bev.mjs — WO-1798 Brand-Equity-to-Enterprise-Stability BAU
// Tests computeBEV() directly. All 8 vectors must pass.

import { computeBEV, BEV_STRESS_TEST_THRESHOLD, BEV_WEIGHTS } from './src/engine/brandequity.js';

let pass = 0;
let fail = 0;

function check(label, fn, assertions, note) {
  try {
    const result = fn();
    const failures = [];
    for (const [key, expected] of Object.entries(assertions)) {
      const actual = result[key];
      const ok = Math.abs(actual - expected) < 0.001;
      if (!ok) failures.push(`${key}: expected ${expected}, got ${actual}`);
    }
    if (failures.length === 0) {
      pass++;
      console.log(`✓ PASS  [${label}]`);
      if (note) console.log(`        ${note}`);
    } else {
      fail++;
      console.log(`✗ FAIL  [${label}]`);
      failures.forEach(f => console.log(`        ${f}`));
      if (note) console.log(`        note: ${note}`);
    }
  } catch (err) {
    fail++;
    console.log(`✗ FAIL  [${label}] threw: ${err.message}`);
  }
  console.log('');
}

function checkThrows(label, fn, note) {
  try {
    fn();
    fail++;
    console.log(`✗ FAIL  [${label}] expected throw but did not throw`);
  } catch {
    pass++;
    console.log(`✓ PASS  [${label}] threw as expected`);
    if (note) console.log(`        ${note}`);
  }
  console.log('');
}

console.log('=== WO-1798 — Brand-Equity-to-Enterprise-Stability ===\n');

// T1: MrBeast profile — HIGH velocity, very low moat, high concentration + dilution
// bev = 1.0×0.40 + 0.15×0.35 + (1-0.67)×0.15 + (1-1.0)×0.10 = 0.400+0.0525+0.0495+0 = 0.502
check(
  'T1 MrBeast — HIGH velocity, low moat, high concentration',
  () => computeBEV({ brand_velocity: 'HIGH', moat_durability: 0.15, dilution_risk: 'HIGH', concentration_risk: 'EXTREME' }),
  { bev_score: 0.502, at_risk_ratio: 0.850, stress_flag: false },
  'Personality at peak — enterprise heavily dependent on one person'
);

// T2: Jenner profile — DECLINING velocity, moderate moat (CPG independence), moderate risk
// bev = 0.6×0.40 + 0.55×0.35 + (1-0.33)×0.15 + (1-0.33)×0.10 = 0.240+0.1925+0.1005+0.067 = 0.600
check(
  'T2 Jenner — DECLINING velocity, moderate moat (spin-offs partially independent)',
  () => computeBEV({ brand_velocity: 'DECLINING', moat_durability: 0.55, dilution_risk: 'MODERATE', concentration_risk: 'MODERATE' }),
  { bev_score: 0.600, at_risk_ratio: 0.450, stress_flag: false },
  'Umbrella brand fading but spin-offs (SKIMS, Kylie) hold partial independent value'
);

// T3: Collapse scenario — COLLAPSED velocity, low moat, high risk
// bev = 0×0.40 + 0.20×0.35 + (1-0.67)×0.15 + (1-0.67)×0.10 = 0+0.070+0.0495+0.033 = 0.153
check(
  'T3 Collapse — COLLAPSED velocity, minimal moat',
  () => computeBEV({ brand_velocity: 'COLLAPSED', moat_durability: 0.20, dilution_risk: 'HIGH', concentration_risk: 'HIGH' }),
  { bev_score: 0.152, at_risk_ratio: 0.800, stress_flag: true },
  'Reputational collapse: personality gone, little structural enterprise survives'
);

// T4: Thiel / Analytical Framework — HIGH velocity, strong moat, low dilution/concentration
// bev = 1.0×0.40 + 0.90×0.35 + 1.0×0.15 + 1.0×0.10 = 0.40+0.315+0.15+0.10 = 0.965
check(
  'T4 Thiel — HIGH velocity, strong moat (enterprise independent of personality)',
  () => computeBEV({ brand_velocity: 'HIGH', moat_durability: 0.90, dilution_risk: 'LOW', concentration_risk: 'LOW' }),
  { bev_score: 0.965, at_risk_ratio: 0.100, stress_flag: false },
  'Palantir / Anduril thesis holds without Thiel — methodology moat is strong'
);

// T5: Absolute minimum — COLLAPSED + zero moat + CRITICAL + EXTREME
// bev = 0 + 0 + 0 + 0 = 0.000
check(
  'T5 Absolute minimum — full collapse, zero moat',
  () => computeBEV({ brand_velocity: 'COLLAPSED', moat_durability: 0.0, dilution_risk: 'CRITICAL', concentration_risk: 'EXTREME' }),
  { bev_score: 0.000, at_risk_ratio: 1.000, stress_flag: true },
  'Enterprise is entirely the person — enterprise = zero when person = zero'
);

// T6: stress_flag fires below threshold
// bev = 0.3×0.40 + 0.25×0.35 + (1-0.67)×0.15 + (1-0.67)×0.10 = 0.12+0.0875+0.0495+0.033 = 0.290
check(
  'T6 stress_flag — STALLING velocity, low moat → below 0.40 threshold',
  () => computeBEV({ brand_velocity: 'STALLING', moat_durability: 0.25, dilution_risk: 'HIGH', concentration_risk: 'HIGH' }),
  { bev_score: 0.290, stress_flag: true },
  `bev_score 0.290 < BEV_STRESS_TEST_THRESHOLD ${BEV_STRESS_TEST_THRESHOLD}`
);

// T7: at_risk_ratio = exactly 1 - moat_durability
check(
  'T7 at_risk_ratio invariant — moat 0.37 → at_risk 0.63',
  () => computeBEV({ brand_velocity: 'DECLINING', moat_durability: 0.37, dilution_risk: 'MODERATE', concentration_risk: 'HIGH' }),
  { at_risk_ratio: 0.630 },
  'at_risk_ratio must equal 1 - moat_durability exactly (within float precision)'
);

// T8: Invalid brand_velocity throws
checkThrows(
  'T8 invalid brand_velocity throws',
  () => computeBEV({ brand_velocity: 'STRONG', moat_durability: 0.5, dilution_risk: 'LOW', concentration_risk: 'LOW' }),
  'Enum guard: "STRONG" is not a valid brand_velocity'
);

// Summary
console.log('─────────────────────────────────────────');
console.log(`WO-1798 BAU: ${pass}/${pass + fail} PASS`);
if (fail > 0) {
  console.log(`FAIL COUNT: ${fail}`);
  process.exit(1);
}
