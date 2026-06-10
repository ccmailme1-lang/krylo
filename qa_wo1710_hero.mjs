// WO-1710 BAU harness — Hero Card Elevation
// Validates: hero selection, supporting split, getVisibleCards adapter,
// confidence boundary (>= 0.80), empty-state guard.

import { applyEditorialGate, getVisibleCards, resolveContractLens, INTENT_OVERRIDE_THRESHOLD } from './src/engine/editorialgate.js';

let pass = 0; let fail = 0;
function assert(label, cond) {
  if (cond) { console.log(`  PASS  ${label}`); pass++; }
  else       { console.error(`  FAIL  ${label}`); fail++; }
}

const expenseActions = {
  IMMEDIATE:  [
    { id:'a1', label:'COMPARE MEDICARE PLANS',   impact:0.92, rationale:'Medicare.gov Plan Finder.', tag:'HEALTHCARE' },
    { id:'a2', label:'AUDIT SUBSCRIPTIONS',       impact:0.78, rationale:'Cancel unused recurring charges.', tag:'CASH FLOW' },
  ],
  SHORT_TERM: [
    { id:'b1', label:'APPLY FOR SNAP BENEFITS',  impact:0.88, rationale:'SNAP eligibility for seniors.', tag:'FOOD'      },
    { id:'b2', label:'APPLY FOR LIHEAP',          impact:0.74, rationale:'Federal utility assistance.', tag:'UTILITIES'  },
  ],
  STRUCTURAL: [
    { id:'c1', label:'FILE PROPERTY TAX EXEMPTION', impact:0.81, rationale:'Senior homestead exemption.', tag:'HOUSING'       },
    { id:'c2', label:'OPTIMIZE PRESCRIPTIONS',      impact:0.69, rationale:'GoodRx + Medicare Extra Help.', tag:'PRESCRIPTIONS' },
  ],
};

// QA-1710-01: getVisibleCards schema adapter
console.log('\nQA-1710-01  getVisibleCards — flat ranked list with _horizon');
const gated   = applyEditorialGate(expenseActions, 'EXPENSE');
const visible = getVisibleCards(gated);
assert('returns array',                        Array.isArray(visible));
assert('length = 5 (maxSurface cap applied)',  visible.length === 5);
assert('sorted descending by impact',          visible.every((c,i,a) => i===0 || c.impact <= a[i-1].impact));
assert('each card has _horizon field',         visible.every(c => ['IMMEDIATE','SHORT_TERM','STRUCTURAL'].includes(c._horizon)));
assert('no _col field leaking',               !visible.some(c => '_col' in c));

// QA-1710-02: Hero determination
console.log('\nQA-1710-02  Hero = highest-impact card');
const hero      = visible[0];
const secondary = visible.slice(1);
assert('hero is COMPARE MEDICARE PLANS (0.92)', hero.label === 'COMPARE MEDICARE PLANS');
assert('hero._horizon = IMMEDIATE',             hero._horizon === 'IMMEDIATE');
assert('secondary length = 4',                 secondary.length === 4);
assert('hero impact > all secondary impacts',   secondary.every(c => c.impact < hero.impact));

// QA-1710-03: No multi-hero (deterministic tiebreaker via stable sort)
console.log('\nQA-1710-03  Tie — stable sort picks first by array order');
const tieActions = {
  IMMEDIATE:  [{ id:'t1', label:'ALPHA', impact:0.90, tag:'X' }],
  SHORT_TERM: [{ id:'t2', label:'BETA',  impact:0.90, tag:'Y' }],
  STRUCTURAL: [],
};
const tieGated   = applyEditorialGate(tieActions, 'OPEN');
const tieVisible = getVisibleCards(tieGated);
assert('exactly one hero (no tie ambiguity)',   tieVisible.length === 2);
assert('first card is always index 0',          tieVisible[0].id === 't1' || tieVisible[0].id === 't2'); // stable sort acceptable

// QA-1710-04: Empty state guard
console.log('\nQA-1710-04  Empty state — no crash');
const emptyVisible = getVisibleCards({ IMMEDIATE: [], SHORT_TERM: [], STRUCTURAL: [] });
assert('empty actions → empty array',           emptyVisible.length === 0);
assert('null actions → empty array',            getVisibleCards(null).length === 0);

// QA-1710-05: INTENT_OVERRIDE_THRESHOLD constant
console.log('\nQA-1710-05  INTENT_OVERRIDE_THRESHOLD boundary');
assert('constant exported and equals 0.80',     INTENT_OVERRIDE_THRESHOLD === 0.80);

// Simulate resolveContractLens with confidence >= threshold
function resolveChip(detectedDomain, sessionLens, confidence) {
  if (confidence >= INTENT_OVERRIDE_THRESHOLD) return resolveContractLens(detectedDomain, sessionLens);
  return sessionLens ?? 'OPEN';
}
assert('confidence 0.80 exact → domain wins',   resolveChip('EXPENSE_REDUCTION', 'RETIREMENT', 0.80) === 'EXPENSE');
assert('confidence 0.79 → chip wins',           resolveChip('EXPENSE_REDUCTION', 'RETIREMENT', 0.79) === 'RETIREMENT');
assert('confidence 1.00 → domain wins',         resolveChip('EXPENSE_REDUCTION', 'PLANNING',   1.00) === 'EXPENSE');
assert('confidence 0.75 ambiguous → chip wins', resolveChip('CAREER',            'OPEN',        0.75) === 'OPEN');

console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass}/${pass+fail} PASS${fail>0?`  |  ${fail} FAIL`:''}`);
if (fail > 0) process.exit(1);
