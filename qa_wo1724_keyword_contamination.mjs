// WO-1724 — QA harness: Ingress Keyword Contamination
// Verifies \b boundary fixes in resolvePrimary() (querysynthesis.js)
// Run: node qa_wo1724_keyword_contamination.mjs

import { detectDomain } from './src/engine/querysynthesis.js';

let pass = 0; let fail = 0;

function check(label, query, expectedPrimary) {
  const result = detectDomain(query, null);
  const ok = result.primary === expectedPrimary;
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) console.log(`  query:    "${query}"\n  expected: ${expectedPrimary}\n  got:      ${result.primary}`);
  ok ? pass++ : fail++;
}

// ── Contaminated inputs — must NOT trigger wrong domain ──────────────────────
console.log('\n── Contamination guards (must resolve correctly) ────────────────');

check('auto: "automation strategy" ≠ AUTO',
  'automation strategy for our supply chain',
  'GENERAL');

check('lease: "press release analysis" ≠ AUTO',
  'press release signal for media coverage',
  'GENERAL');

check('truck: "struck by volatility" ≠ AUTO',
  'market was struck by volatility last quarter',
  'GENERAL');

check('condo: "condone the risk exposure" ≠ REAL_ESTATE',
  'should we condone the risk exposure in this position',
  'GENERAL');

check('raise: "fundraise acceleration" ≠ CAREER',
  'fundraise acceleration signals this quarter',
  'GENERAL');

check('role: "parole board decision signal" ≠ CAREER',
  'parole board decision impact on recidivism signal',
  'GENERAL');

check('hire: "entire market shift analysis" ≠ CAREER',
  'entire market shift in semiconductor supply',
  'GENERAL');

// ── Clean inputs — correct domain routing must be preserved ──────────────────
console.log('\n── Regression guards (clean inputs must resolve correctly) ──────');

check('auto: "buy a used auto" → AUTO',
  'what to look for when buying a used auto',
  'AUTO');

check('lease: "car lease options" → AUTO',
  'best car lease options for 2026',
  'AUTO');

check('truck: "pickup truck financing" → AUTO',
  'pickup truck financing options',
  'AUTO');

check('condo: "downtown condo market" → REAL_ESTATE',
  'downtown condo market trends this quarter',
  'REAL_ESTATE');

check('raise: "salary raise negotiation" → CAREER',
  'how to negotiate a salary raise at my current job',
  'CAREER');

check('role: "new role at tech company" → CAREER',
  'starting a new role at a tech company next month',
  'CAREER');

check('hire: "we need to hire engineers" → CAREER',
  'we need to hire three engineers before Q4',
  'CAREER');

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
