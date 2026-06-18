// qa_wo1767_superposition.mjs — WO-1767 Weighted Domain Superposition BAU
// Tests detectDomain() DomainVector output + synthesizeQuery() no-regression.
// All vectors must pass.

import { detectDomain, synthesizeQuery } from './src/engine/querysynthesis.js';

let pass = 0;
let fail = 0;

function check(label, got, assertions, note) {
  const errors = [];
  for (const [field, expected] of Object.entries(assertions)) {
    const actual = field.split('.').reduce((o, k) => o?.[k], got);
    if (actual !== expected) errors.push(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  const ok = errors.length === 0;
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  [${label}]`);
  if (note) console.log(`       note: ${note}`);
  if (!ok) errors.forEach(e => console.log(`       ✗ ${e}`));
  else console.log(`       state=${got.state} primary=${got.primary} entropy=${got.entropy?.toFixed(3)} coActive=[${got.coActive?.join(',')}]`);
  console.log('');
}

function checkSynth(label, session, assertions, note) {
  const result = synthesizeQuery(session);
  const errors = [];
  for (const [field, expected] of Object.entries(assertions)) {
    const actual = field.split('.').reduce((o, k) => o?.[k], result);
    const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
    if (!ok) errors.push(`${field}: expected ${typeof expected === 'function' ? '[fn]' : JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  const ok = errors.length === 0;
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  [${label}]`);
  if (note) console.log(`       note: ${note}`);
  if (!ok) errors.forEach(e => console.log(`       ✗ ${e}`));
  else console.log(`       queryDomain=${result?.queryDomain} state=${result?.domainVector?.state}`);
  console.log('');
}

console.log('=== WO-1767 — Weighted Domain Superposition ===\n');

// ── detectDomain() return type checks ────────────────────────────────────────

const v1 = detectDomain('buy a house in Austin', null);
check('T1 real-estate clear HARD', v1, { primary: 'REAL_ESTATE', state: 'HARD', resolutionEligible: true },
  'Single-domain clear — existing routing preserved');

const v2 = detectDomain("should I roll over my 401k into an IRA", null);
check('T2 retirement clear HARD', v2, { primary: 'RETIREMENT', state: 'HARD', resolutionEligible: true },
  'Existing RETIREMENT routing preserved exactly');

const v3 = detectDomain("I'm a pro player thinking about my future career options", null);
check('T3 player+career HARD or SOFT', v3,
  { primary: 'CAREER', resolutionEligible: true },
  'CAREER primary expected; state depends on co-signal count');
// state can be HARD or SOFT — just verify primary and eligibility

const v4 = detectDomain('rent career capital growth opportunity', null);
check('T4 rent+career SOFT', v4, { state: 'SOFT', resolutionEligible: true },
  'rent→REAL_ESTATE and career→CAREER both active → SOFT');

const v5 = detectDomain('', null);
check('T5 empty HOLD', v5, { state: 'HOLD', resolutionEligible: false },
  'Empty query → HOLD');

// DomainVector shape validation
const v6 = detectDomain('my mortgage rate just went up', null);
const shapeOk = v6 && typeof v6.primary === 'string' && typeof v6.weights === 'object'
  && typeof v6.state === 'string' && typeof v6.entropy === 'number'
  && Array.isArray(v6.coActive) && typeof v6.resolutionEligible === 'boolean';
if (shapeOk) { pass++; console.log('✓ PASS  [T6 DomainVector shape]\n       All required fields present and correctly typed\n'); }
else { fail++; console.log(`✗ FAIL  [T6 DomainVector shape]\n       Missing or mistyped fields: ${JSON.stringify(v6)}\n`); }

// ── synthesizeQuery() no-regression checks ────────────────────────────────────

checkSynth('T7 synthesizeQuery REAL_ESTATE',
  { query: 'buy a house in Austin', lens: null },
  {
    queryDomain: 'REAL_ESTATE',
    'domainVector.state': 'HARD',
    'domainVector.primary': 'REAL_ESTATE',
    stateLabel: v => typeof v === 'string' && v.length > 0,
  },
  'synthesizeQuery preserves queryDomain string + adds domainVector'
);

checkSynth('T8 synthesizeQuery RETIREMENT',
  { query: 'should I roll over my 401k', lens: null },
  {
    queryDomain: 'RETIREMENT',
    'domainVector.state': 'HARD',
  },
  'RETIREMENT routing unchanged through synthesizeQuery'
);

checkSynth('T9 synthesizeQuery null session',
  null,
  {},
  'null session must return null'
);
// special-case: synthesizeQuery(null) must return null
{
  const r = synthesizeQuery(null);
  if (r === null) { pass++; console.log('✓ PASS  [T9 null session guard]\n       synthesizeQuery(null) === null\n'); }
  else { fail++; console.log(`✗ FAIL  [T9 null session guard]\n       expected null, got ${JSON.stringify(r)}\n`); }
}

// ── Protected domain gate — must still produce HARD vector ───────────────────
const v7 = detectDomain('my son has down syndrome and needs physical therapy', null);
check('T10 protected-domain HARD', v7,
  { primary: 'HEALTH', state: 'HARD', resolutionEligible: true },
  'detectProtectedDomain gate produces synthetic HARD vector'
);

console.log(`=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
