// qa_lenscontract.mjs
// THE LENS CONTRACT — specs/lens-contract.md. Every lens declares ONE layer; the layer binds the
// rules. Proves the classification is locked and the two enforcement guards actually bite.

import {
  LAYER, LAYER_RULES, LENS_CONTRACT, LENS_IDS, REPORTING_LENSES, SELL_LENSES,
  layerOf, rulesFor, isSellLens, isReportingLens,
  checkReportingRead, checkSellClaim, VIOLATION,
} from './src/config/lenscontract.js';

let pass = 0, fail = 0;
const assert = (name, cond) => { cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)); };

console.log('Lens Contract — layer binding + enforcement\n');

// ── classification (LOCKED table) ──
console.log('classification (locked):');
assert('six lenses declared',            LENS_IDS.length === 6);
assert('SIGNAL is REPORTING',            layerOf('SIGNAL') === LAYER.REPORTING);
assert('FLOW is REPORTING',              layerOf('FLOW') === LAYER.REPORTING);
assert('PRESSURE is REPORTING',          layerOf('PRESSURE') === LAYER.REPORTING);
assert('CONVERGENCE is REPORTING',       layerOf('CONVERGENCE') === LAYER.REPORTING);
assert('DRIFT is REPORTING',             layerOf('DRIFT') === LAYER.REPORTING);
assert('OPPORTUNITY is the lone SELL',   layerOf('OPPORTUNITY') === LAYER.SELL && SELL_LENSES.length === 1);
assert('five lenses sense',              REPORTING_LENSES.length === 5);
assert('unknown lens has no layer',      layerOf('NONSENSE') === null);
assert('contract table frozen',          Object.isFrozen(LENS_CONTRACT) && Object.isFrozen(LENS_CONTRACT.SIGNAL));

// ── rules of engagement differ by layer (the whole point of the spec) ──
console.log('\nrules of engagement are NOT the same:');
assert('reporting is under truth law',   LAYER_RULES.REPORTING.truthLaw === true);
assert('sell is NOT under truth law',    LAYER_RULES.SELL.truthLaw === false);
assert('reporting may not assert',       rulesFor('DRIFT').mayAssert === false);
assert('sell may assert',                rulesFor('OPPORTUNITY').mayAssert === true);
assert('sell may aspire',                rulesFor('OPPORTUNITY').mayAspire === true);
assert('reporting may not aspire',       rulesFor('SIGNAL').mayAspire === false);
assert('sell must keep a proof door',    rulesFor('OPPORTUNITY').requiresProofDoor === true);
assert('reporting needs no proof door',  rulesFor('SIGNAL').requiresProofDoor === false);
assert('predicates agree with table',    isReportingLens('DRIFT') && isSellLens('OPPORTUNITY') && !isSellLens('DRIFT'));

// ── reporting guard: a read must stay a read ──
console.log('\nreporting lens may not borrow sell grammar:');
assert('plain read passes',              checkReportingRead('SIGNAL', { text: 'TECHNOLOGY is running hot.' }).ok);
assert('read with a pick violates',      checkReportingRead('SIGNAL', { pick: 'TECHNOLOGY' }).violations.includes(VIOLATION.REPORTING_ASSERTS_PICK));
assert('read with recommendation violates', checkReportingRead('FLOW', { recommendation: 'rotate' }).violations.includes(VIOLATION.REPORTING_ASSERTS_PICK));
assert('conviction language violates',   checkReportingRead('DRIFT', { text: 'The move is CAPITAL.' }).violations.includes(VIOLATION.REPORTING_CONVICTION));
assert('sell lens fails reporting check', checkReportingRead('OPPORTUNITY', { text: 'x' }).violations.includes(VIOLATION.WRONG_LAYER));
assert('unknown lens flagged',           checkReportingRead('NONSENSE', {}).violations.includes(VIOLATION.UNKNOWN_LENS));

// ── sell guard: bold is fine, unproven is not ──
console.log('\nsell claim must keep the proof door open:');
const goodClaim = { state: 'GROUNDED', citation: 'DRIFT', drill: { lens: 'DRIFT', withheld: false, margin: 0.26 } };
assert('cited + drilled claim passes',   checkSellClaim('OPPORTUNITY', goodClaim).ok);
assert('no drill = SELL_WITHOUT_PROOF',  checkSellClaim('OPPORTUNITY', { state: 'GROUNDED', citation: 'DRIFT' })
                                            .violations.includes(VIOLATION.SELL_WITHOUT_PROOF));
assert('no citation = SELL_WITHOUT_CITATION', checkSellClaim('OPPORTUNITY', { state: 'GROUNDED', drill: {} })
                                            .violations.includes(VIOLATION.SELL_WITHOUT_CITATION));
assert('GROUNDED over a withheld receipt = costume',
  checkSellClaim('OPPORTUNITY', { state: 'GROUNDED', citation: 'DRIFT', drill: { withheld: true } })
    .violations.includes(VIOLATION.SELL_WEARS_REPORT_COSTUME));
assert('WITHHELD claim over withheld receipt is legal',
  checkSellClaim('OPPORTUNITY', { state: 'WITHHELD', citation: 'DRIFT', drill: { withheld: true } }).ok);
assert('reporting lens fails sell check', checkSellClaim('DRIFT', goodClaim).violations.includes(VIOLATION.WRONG_LAYER));

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
