// qa_wo1879_gravity.mjs — WO-1879 Domain Gravity Wells behavioral validation
// Tests: pool mechanics, polarity threshold, query domain mapping, routing influence.
// Run: node qa_wo1879_gravity.mjs

import { surfaceRouter }                                from './src/engine/surfacerouter.js';
import {
  computeDomainPressure,
  getDomainPressure,
  getQueryDomainPressure,
  getAllDomainPressures,
  FRACTURE_POLARITY_THRESHOLD,
  GRAVITY_TIE_THRESHOLD,
} from './src/engine/domaingravity.js';
import { detectDomain } from './src/engine/querysynthesis.js';

// ── Harness ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(id, description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  PASS  ${id}: ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${id}: ${description}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertApprox(id, description, actual, expected, delta = 1) {
  const ok = typeof actual === 'number' && Math.abs(actual - expected) <= delta;
  if (ok) {
    console.log(`  PASS  ${id}: ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${id}: ${description}`);
    console.error(`        expected: ~${expected} (±${delta})`);
    console.error(`        actual:   ${actual}`);
    failed++;
  }
}

function assertIs(id, description, condition) {
  if (condition) {
    console.log(`  PASS  ${id}: ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${id}: ${description} — condition was false`);
    failed++;
  }
}

// Dispatch a signal event to surfaceRouter so it reaches the gravity pool.
// domain must be a signal domain (TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP).
function seedSignal(domain, confidence, polarity = 'POSITIVE') {
  surfaceRouter.dispatch({
    domain,
    confidence,
    polarity,
    ts: Date.now(),
    source: 'qa_seed',
  });
}

// Dispatch a fracture signal (NEGATIVE polarity)
function seedFracture(domain, confidence) {
  seedSignal(domain, confidence, 'NEGATIVE');
}

// ── Section A: Pool mechanics ──────────────────────────────────────────────────

console.log('\nSection A — Pool mechanics\n');

// Empty pool returns zero-pressure safe default
{
  const p = computeDomainPressure('MEDIA');
  assert('A-01', 'empty pool → magnitude 0',     p.magnitude,   0);
  assert('A-02', 'empty pool → polarity constructive', p.polarity, 'constructive');
  assert('A-03', 'empty pool → signalCount 0',   p.signalCount, 0);
}

// Seed TECHNOLOGY with 3 constructive signals
seedSignal('TECHNOLOGY', 70);
seedSignal('TECHNOLOGY', 80);
seedSignal('TECHNOLOGY', 90);

{
  const p = computeDomainPressure('TECHNOLOGY');
  assertApprox('A-04', 'TECHNOLOGY magnitude ≈ avg(70,80,90) = 80', p.magnitude, 80);
  assert('A-05', 'TECHNOLOGY polarity = constructive (0% fracture)', p.polarity, 'constructive');
  assert('A-06', 'TECHNOLOGY signalCount = 3', p.signalCount, 3);
}

// getDomainPressure wraps computeDomainPressure
{
  const p = getDomainPressure('TECHNOLOGY');
  assert('A-07', 'getDomainPressure delegates to computeDomainPressure', p.domain, 'TECHNOLOGY');
  assertIs('A-08', 'getDomainPressure returns magnitude > 0', p.magnitude > 0);
}

// getAllDomainPressures returns all 6 signal domains
{
  const all = getAllDomainPressures();
  const keys = Object.keys(all).sort();
  assert('A-09', 'getAllDomainPressures returns all 6 domains', keys,
    ['CAPITAL','KNOWLEDGE','LABOR','MEDIA','OWNERSHIP','TECHNOLOGY'].sort()
  );
  assert('A-10', 'TECHNOLOGY present in full field', all.TECHNOLOGY.domain, 'TECHNOLOGY');
  assert('A-11', 'MEDIA still empty (not seeded)', all.MEDIA.signalCount, 0);
}

// ── Section B: Polarity threshold ─────────────────────────────────────────────

console.log('\nSection B — Polarity threshold (FRACTURE_POLARITY_THRESHOLD = 40%)\n');

// Seed OWNERSHIP: 6 constructive + 2 fracture = 25% fracture → polarity stays constructive
for (let i = 0; i < 6; i++) seedSignal('OWNERSHIP', 60);
for (let i = 0; i < 2; i++) seedFracture('OWNERSHIP', 40);

{
  const p = computeDomainPressure('OWNERSHIP');
  assert('B-01', 'OWNERSHIP 25% fracture → polarity=constructive', p.polarity, 'constructive');
  assert('B-02', 'OWNERSHIP signalCount = 8', p.signalCount, 8);
}

// Seed LABOR: 3 constructive + 3 fracture = 50% fracture → polarity flips to fracture
for (let i = 0; i < 3; i++) seedSignal('LABOR', 60);
for (let i = 0; i < 3; i++) seedFracture('LABOR', 70);

{
  const p = computeDomainPressure('LABOR');
  assert('B-03', 'LABOR 50% fracture → polarity=fracture', p.polarity, 'fracture');
  assert('B-04', 'LABOR signalCount = 6', p.signalCount, 6);
}

// Seed CAPITAL: exactly at threshold — 4 constructive + 4 fracture = exactly 40% fracture (of 10 total below)
// 4 fracture / 10 total = 40% → >= FRACTURE_POLARITY_THRESHOLD → fracture
for (let i = 0; i < 6; i++) seedSignal('CAPITAL', 60);
for (let i = 0; i < 4; i++) seedFracture('CAPITAL', 50);

{
  const p = computeDomainPressure('CAPITAL');
  assert('B-05', 'CAPITAL 40% fracture → polarity=fracture (at threshold)', p.polarity, 'fracture');
}

// Verify POLARITY.NEGATIVE and POLARITY.ABSENT both register as fracture
// Seed KNOWLEDGE with one ABSENT signal
surfaceRouter.dispatch({ domain: 'KNOWLEDGE', confidence: 50, polarity: 'ABSENT', ts: Date.now(), source: 'qa_seed' });

{
  const p = computeDomainPressure('KNOWLEDGE');
  // 1 signal, 1 fracture → 100% fracture
  assert('B-06', 'ABSENT polarity → fracture classification', p.polarity, 'fracture');
}

// TURBULENT_CONVERGENCE convergenceState also registers as fracture
surfaceRouter.dispatch({ domain: 'MEDIA', confidence: 60, convergenceState: 'TURBULENT_CONVERGENCE', ts: Date.now(), source: 'qa_seed' });

{
  const p = computeDomainPressure('MEDIA');
  assert('B-07', 'TURBULENT_CONVERGENCE → fracture polarity', p.polarity, 'fracture');
}

// ── Section C: Query domain mapping ───────────────────────────────────────────

console.log('\nSection C — Query domain → signal domain bridge\n');

// STARTUP_FINANCE → CAPITAL (already seeded with pressure)
{
  const p = getQueryDomainPressure('STARTUP_FINANCE');
  assert('C-01', 'STARTUP_FINANCE maps to CAPITAL signal domain', p.domain, 'CAPITAL');
  assertIs('C-02', 'STARTUP_FINANCE pressure > 0 (CAPITAL was seeded)', p.magnitude > 0);
}

// CAREER → LABOR (already seeded)
{
  const p = getQueryDomainPressure('CAREER');
  assert('C-03', 'CAREER maps to LABOR signal domain', p.domain, 'LABOR');
  assertIs('C-04', 'CAREER/LABOR pressure > 0', p.magnitude > 0);
}

// REAL_ESTATE → OWNERSHIP (already seeded)
{
  const p = getQueryDomainPressure('REAL_ESTATE');
  assert('C-05', 'REAL_ESTATE maps to OWNERSHIP signal domain', p.domain, 'OWNERSHIP');
  assertIs('C-06', 'REAL_ESTATE/OWNERSHIP pressure > 0', p.magnitude > 0);
}

// HEALTH → KNOWLEDGE (already seeded)
{
  const p = getQueryDomainPressure('HEALTH');
  assert('C-07', 'HEALTH maps to KNOWLEDGE signal domain', p.domain, 'KNOWLEDGE');
}

// Unmapped query domain → zero-pressure safe default
{
  const p = getQueryDomainPressure('UNKNOWN_DOMAIN_XYZ');
  assert('C-08', 'unmapped query domain → magnitude 0', p.magnitude, 0);
  assert('C-09', 'unmapped query domain → polarity constructive (safe default)', p.polarity, 'constructive');
}

// AUTO → OWNERSHIP
{
  const p = getQueryDomainPressure('AUTO');
  assert('C-10', 'AUTO maps to OWNERSHIP signal domain', p.domain, 'OWNERSHIP');
}

// FORWARD_COMPUTE → TECHNOLOGY
{
  const p = getQueryDomainPressure('FORWARD_COMPUTE');
  assert('C-11', 'FORWARD_COMPUTE maps to TECHNOLOGY signal domain', p.domain, 'TECHNOLOGY');
}

// ── Section D: Behavioral routing — gravity influence on detectDomain() ────────

console.log('\nSection D — Behavioral routing (gravity tie-breaker in detectDomain)\n');

// CRITICAL NOTE: tie-case queries must avoid PROTECTED_ENTITY_REGISTRY terms
// (grant, nonprofit, donation, disability, etc.) — those lock the domain BEFORE
// the gravity tie-breaker runs, which is correct behavior (tested in D-06 below).
//
// Valid tie-case queries (CAREER vs HEALTH — no protected terms):
//   "streamer health"  → CAREER(1 via streamer) + HEALTH(1 via \bhealth\b)
//   "player adaptive"  → CAREER(1 via player)   + HEALTH(1 via adaptive)
//   "esports therapy"  → CAREER(1 via esports)  + HEALTH(1 via therapy)
// None of these trigger resolvePrimary compound rules or the protected entity gate.

// Pool state at D-01:
//   LABOR:     6 signals @ avg=65  (3 constructive + 3 fracture from Section B)
//   KNOWLEDGE: 1 signal  @ avg=50  (1 ABSENT from Section B)
// → LABOR magnitude > KNOWLEDGE magnitude → CAREER should win the tie

{
  const result = detectDomain('streamer health', 'OPEN');
  assert('D-01', 'tie-case "streamer health" — gravity picks CAREER (LABOR>KNOWLEDGE)',
    result.primary, 'CAREER');
  assert('D-02', 'state is not HOLD (tie resolved, not ambiguous)', result.state !== 'HOLD', true);
}

{
  const result = detectDomain('player adaptive', 'OPEN');
  assert('D-03', 'tie-case "player adaptive" — gravity picks CAREER (LABOR>KNOWLEDGE)',
    result.primary, 'CAREER');
}

// Reverse test: boost KNOWLEDGE well above LABOR
// Add 5 high-confidence constructive signals to KNOWLEDGE → new avg >> 65
for (let i = 0; i < 5; i++) seedSignal('KNOWLEDGE', 90);

{
  const result = detectDomain('streamer health', 'OPEN');
  assert('D-04', 'tie-case "streamer health" — gravity picks HEALTH (KNOWLEDGE>LABOR after boost)',
    result.primary, 'HEALTH');
}

{
  const result = detectDomain('esports therapy', 'OPEN');
  assert('D-05', 'tie-case "esports therapy" — gravity picks HEALTH (KNOWLEDGE boosted)',
    result.primary, 'HEALTH');
}

// Gap too wide — resolvePrimary fires first; gravity block never reached
{
  const result = detectDomain('career job salary negotiation', 'OPEN');
  assert('D-06', 'compound rule CAREER fires — gravity block never reached',
    result.primary, 'CAREER');
}

// Protected entity gate fires BEFORE gravity tie-breaker.
// "esports grant application" contains "grant" → PROTECTED_ENTITY_REGISTRY.HEALTH
// → gate returns HEALTH as HARD before any scoring or gravity runs.
{
  const result = detectDomain('esports grant application', 'OPEN');
  assert('D-07', 'protected entity "grant" → HEALTH locked before gravity runs',
    result.primary, 'HEALTH');
  assert('D-08', 'protected entity result is HARD state', result.state, 'HARD');
}

// ── Section E: Non-interference — compound rules override gravity ──────────────

console.log('\nSection E — Non-interference (compound rules immune to gravity)\n');

// Even if TECHNOLOGY has the highest pressure, a hard compound rule must win.
// "startup seed round" → resolvePrimary → STARTUP_FINANCE (compound rule)
// CAPITAL currently has fracture polarity — gravity must not override compound rule
{
  const result = detectDomain('startup seed round', 'OPEN');
  assert('E-01', 'hard compound rule STARTUP_FINANCE — gravity cannot override', result.primary, 'STARTUP_FINANCE');
}

// "toyota camry" → resolvePrimary → AUTO (compound rule for brand name)
{
  const result = detectDomain('toyota camry price 2026', 'OPEN');
  assert('E-02', 'hard compound rule AUTO (toyota) — gravity cannot override', result.primary, 'AUTO');
}

// "retire at 55 with 401k" → resolvePrimary → RETIREMENT
{
  const result = detectDomain('retire at 55 with 401k', 'OPEN');
  assert('E-03', 'hard compound rule RETIREMENT — gravity cannot override', result.primary, 'RETIREMENT');
}

// "job offer salary negotiation" → resolvePrimary → CAREER
{
  const result = detectDomain('job offer salary negotiation', 'OPEN');
  assert('E-04', 'hard compound rule CAREER (job) — gravity cannot override', result.primary, 'CAREER');
}

// ── Section F: DEF-1864 gate — bare queries still AMBIGUOUS ───────────────────

console.log('\nSection F — DEF-1864 gate (bare queries → AMBIGUOUS)\n');

{
  const r = detectDomain('guest win?', 'OPEN');
  assert('F-01', '"guest win?" → AMBIGUOUS (zero score, DEF-1864 gate)', r.primary, 'AMBIGUOUS');
  assert('F-02', '"guest win?" state → HOLD', r.state, 'HOLD');
  assert('F-03', '"guest win?" resolutionEligible false', r.resolutionEligible, false);
}

{
  const r = detectDomain('dogs', 'OPEN');
  assert('F-04', '"dogs" → AMBIGUOUS (zero score, DEF-1864 gate)', r.primary, 'AMBIGUOUS');
}

{
  const r = detectDomain('', 'OPEN');
  assert('F-05', 'empty string → AMBIGUOUS', r.primary, 'AMBIGUOUS');
}

// ── Result ─────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`WO-1879 QA — ${passed + failed} checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`RESULT: FAIL (${failed} failures)`);
  process.exit(1);
} else {
  console.log('RESULT: PASS — Domain Gravity Wells behavioral validation complete.');
  process.exit(0);
}
