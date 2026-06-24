// WO-1724 — QA harness: Ingress Keyword Contamination
// Verifies \b boundary fixes in resolvePrimary() (querysynthesis.js)
// Groups: A (regex boundary), D (cross-domain leakage), E (determinism)
// Groups B/C: NOT APPLICABLE — no matching system in current codebase (VOLATILITY_SHOCK_OVERRIDE,
//   interest ratio constraints) — stubs reserved for when relevant WOs are built
// Run: node qa_wo1724_keyword_contamination.mjs

import { detectDomain } from './src/engine/querysynthesis.js';

let pass = 0; let fail = 0;

function check(label, query, expectedPrimary, lens = null) {
  const result = detectDomain(query, lens);
  const ok = result.primary === expectedPrimary;
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) console.log(`  query:    "${query}"\n  expected: ${expectedPrimary}\n  got:      ${result.primary}`);
  ok ? pass++ : fail++;
}

function checkNot(label, query, forbiddenPrimary, lens = null) {
  const result = detectDomain(query, lens);
  const ok = result.primary !== forbiddenPrimary;
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) console.log(`  query:    "${query}"\n  must NOT be: ${forbiddenPrimary}\n  got:         ${result.primary}`);
  ok ? pass++ : fail++;
}

// ── GROUP A: Regex boundary contamination ─────────────────────────────────────
console.log('\n── A: Contamination guards (substring must not trigger domain) ──');

// A1
check('A1 auto: "automation strategy" ≠ AUTO',
  'automation strategy for our supply chain', 'GENERAL');

// A2
check('A2 lease: "press release analysis" ≠ AUTO',
  'press release signal for media coverage', 'GENERAL');

// A3
check('A3 truck: "struck by volatility" ≠ AUTO',
  'market was struck by volatility last quarter', 'GENERAL');

// A4
check('A4 condo: "condone the risk exposure" ≠ REAL_ESTATE',
  'should we condone the risk exposure in this position', 'GENERAL');

// A5
check('A5 raise: "fundraise acceleration" ≠ CAREER',
  'fundraise acceleration signals this quarter', 'GENERAL');

// A6 — camelCase structured string (from validation suite)
checkNot('A6 role: "userRole is undefined" ≠ CAREER',
  'userRole is undefined in system', 'CAREER');

// A7 — rehire prefix (from validation suite)
checkNot('A7 hire: "rehire policy update" ≠ CAREER',
  'rehire policy update in HR system', 'CAREER');

// Bonus: mixed adversarial input — must not collapse into multi-domain noise via substrings
checkNot('A8 mixed adversarial: "automation hiring role release struck fundraising" ≠ AUTO',
  'automation of hiring role release struck fundraising press report', 'AUTO');
checkNot('A8 mixed adversarial: same input ≠ CAREER via role/hire substrings',
  'automation of hiring role release struck fundraising press report', 'CAREER');

// ── GROUP A: Regression guards (clean inputs must route correctly) ─────────────
console.log('\n── A: Regression guards (clean inputs must resolve correctly) ───');

check('auto: "buy a used auto" → AUTO',
  'what to look for when buying a used auto', 'AUTO');

check('lease: "car lease options" → AUTO',
  'best car lease options for 2026', 'AUTO');

check('truck: "pickup truck financing" → AUTO',
  'pickup truck financing options', 'AUTO');

check('condo: "downtown condo market" → REAL_ESTATE',
  'downtown condo market trends this quarter', 'REAL_ESTATE');

check('raise: "salary raise negotiation" → CAREER',
  'how to negotiate a salary raise at my current job', 'CAREER');

check('role: "new role at tech company" → CAREER',
  'starting a new role at a tech company next month', 'CAREER');

check('hire: "we need to hire engineers" → CAREER',
  'we need to hire three engineers before Q4', 'CAREER');

// ── GROUP D: Cross-domain leakage ─────────────────────────────────────────────
console.log('\n── D: Cross-domain leakage guards ───────────────────────────────');

// D1 — job offer with equity must stay CAREER, not bleed into RETIREMENT or REAL_ESTATE
check('D1 job offer + equity → CAREER (no leakage)',
  'job offer negotiation with equity upside', 'CAREER');

checkNot('D1 job offer + equity ≠ RETIREMENT',
  'job offer negotiation with equity upside', 'RETIREMENT');

checkNot('D1 job offer + equity ≠ REAL_ESTATE',
  'job offer negotiation with equity upside', 'REAL_ESTATE');

// D2 — savings gap: no domain anchor → must NOT trigger negotiation/CAREER
// Note: GENERAL/HOLD is the correct current output (no explicit retirement anchor).
// RETIREMENT routing is aspirational pending DEF-1864 (intent lock).
checkNot('D2 savings gap ≠ CAREER (no negotiation leakage)',
  '$250,000 savings gap analysis', 'CAREER');

checkNot('D2 savings gap ≠ REAL_ESTATE',
  '$250,000 savings gap analysis', 'REAL_ESTATE');

checkNot('D2 savings gap ≠ AUTO',
  '$250,000 savings gap analysis', 'AUTO');

// ── GROUP E: Determinism ──────────────────────────────────────────────────────
console.log('\n── E: Determinism (10× same input → same output) ───────────────');

const DETERMINISM_QUERY = 'press release analysis';
const runs = Array.from({ length: 10 }, () => detectDomain(DETERMINISM_QUERY, null).primary);
const allSame = runs.every(r => r === runs[0]);
console.log(`${allSame ? '✓' : '✗'} E1 determinism: 10 runs of "${DETERMINISM_QUERY}" → ${runs[0]}`);
if (!allSame) console.log(`  drift detected: ${[...new Set(runs)].join(', ')}`);
allSame ? pass++ : fail++;

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
