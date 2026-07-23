// qa_kryl1112_archetype_boundary.mjs
// KRYL-1112 (KRYL-PAYLOAD-0001) — Archetype Boundary Verification, formalized as a standing regression.
//
// Boundary under test: "When does a plausible narrative stop being evidence?"
// A synthetic demographic-financial archetype must NEVER produce an individual dollar/ratio figure.
// The guard is metricsengine's ECONOMICS_GROUNDEDNESS_FLOOR (0.70): CAC/ROAS/LTV are MODELED and,
// below the floor, `withheld: true` / `value: null` — so no surface can render a per-person number.
// Detect generalized projection · prevent individual inference. (§18 persona guardrail, §19 withhold-beats-fabricate)

import { computeMetrics } from './src/engine/metricsengine.js';

let pass = 0, fail = 0;
const assert = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else      { fail++; console.log(`  ✗ ${name}`); }
};

// A synthetic archetype: generalized profile, resolvable, with a *plausible stated figure*.
// The hard case — a number is present, but it describes an archetype, not an observed anchor.
const archetypeWithFigure = {
  confidence:          0.62,
  inputNumbers:        [150000],   // stated, but archetype-level — not an individual observed anchor
  queryDomain:         'CAPITAL',
  stateLabel:          'BUILDING CONVERGENCE',
  resolutionEligible:  true,
};

// Same archetype, no figures at all.
const archetypeNoFigure = { ...archetypeWithFigure, inputNumbers: [] };

const persona = { horizon: 5, discountRate: 0.08 };

console.log('KRYL-1112 — Archetype Boundary Verification');
console.log('  Input: synthetic demographic-financial archetype (persona conflation risk)\n');

// ── Case 1: archetype WITH a plausible stated figure — the boundary must still hold ──
const m1 = computeMetrics(archetypeWithFigure, null, persona);
console.log('Case 1 — archetype with stated $150k figure:');
assert('CAC labeled MODELED (never real)',        m1.cac.label  === 'MODELED');
assert('ROAS labeled MODELED',                    m1.roas.label === 'MODELED');
assert('LTV labeled MODELED',                     m1.ltv.label  === 'MODELED');
assert('CAC withheld — no individual dollar',     m1.cac.withheld  === true && m1.cac.value  === null);
assert('ROAS withheld — no individual ratio',     m1.roas.withheld === true && m1.roas.value === null);
assert('LTV withheld — no individual dollar',     m1.ltv.withheld  === true && m1.ltv.value  === null);
assert('economics groundedness below floor 0.70', m1.economicsGroundedness < 0.70);

// ── Case 2: archetype with NO figures — nothing to fabricate from ──
const m2 = computeMetrics(archetypeNoFigure, null, persona);
console.log('\nCase 2 — archetype with no stated figures:');
assert('CAC withheld, value null',                m2.cac.withheld  === true && m2.cac.value  === null);
assert('ROAS withheld, value null',               m2.roas.withheld === true && m2.roas.value === null);
assert('LTV withheld, value null',                m2.ltv.withheld  === true && m2.ltv.value  === null);
assert('economics groundedness == 0 (no anchor)', m2.economicsGroundedness === 0);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
