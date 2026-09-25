// Run: node src/engine/interpretationledger.test.mjs
import assert from 'node:assert/strict';
import { buildAnalysisIntent, buildInterpretationLedger } from './analysisintent.js';

let fail = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
const L = q => buildInterpretationLedger(buildAnalysisIntent(q));
const has = (arr, w) => arr.some(x => x.toLowerCase().split(/\s+/).includes(w.toLowerCase()));

test('Lockheed + krill: verbatim kept, krill NOT carried, Lockheed established, basis says not answered', () => {
  const q = 'How does Lockheed Martin relate to the Antarctic krill fishery?';
  const l = L(q);
  assert.equal(l.verbatim, q);
  assert.ok(l.established.includes('subject: LOCKHEED MARTIN'));
  for (const w of ['Antarctic', 'krill', 'fishery']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
  assert.ok(!has(l.notCarried, 'Lockheed'), 'Lockheed must not be listed as uncarried');
  assert.ok(l.basis.startsWith('Observations in this packet are bound to LOCKHEED MARTIN alone.'));
  assert.ok(l.basis.includes('do not answer'));
});
test("Possessive: Lockheed Martin's ownership -> Martin's is NOT listed as uncarried", () => {
  const l = L("What is the structural relationship between Lockheed Martin's ownership and the Antarctic krill fishery?");
  assert.ok(!has(l.notCarried, 'Martin') && !has(l.notCarried, "Martin's"), 'possessive of a resolved name must be covered');
  assert.ok(has(l.notCarried, 'krill'));
});
test('FedEx and UPS: both names not carried; basis is live-field and says not answered', () => {
  const l = L('Compare FedEx and UPS supply chain exposure');
  assert.ok(has(l.notCarried, 'FedEx'));
  assert.ok(has(l.notCarried, 'UPS'));
  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
  assert.ok(l.basis.includes('do not answer it'));
});
test('Google vs Microsoft: Google unobserved, Microsoft observed, Google in unaddressed once', () => {
  const l = L('Compare Google vs Microsoft acquisition strategy');
  assert.equal(l.comparison.length, 2);
  assert.equal(l.comparison.find(c => c.operand === 'Google').observed, false);
  assert.equal(l.comparison.find(c => /^Microsoft/.test(c.operand)).observed, true);
  assert.equal(l.unaddressed.filter(x => x.toLowerCase() === 'google').length, 1);
  assert.ok(l.basis.includes('do not answer'));
});
test('Investment: nothing established; 55/old/male and investment not carried; live-field basis', () => {
  const l = L('What investment options make sense for a 55 year old male?');
  assert.deepEqual(l.established, []);
  for (const w of ['investment', '55', 'male']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
});
test('Unnamed logistics: nothing established; ports/container/shipping/failure not carried', () => {
  const l = L('Which ports create the largest single point of failure for our container shipping?');
  assert.deepEqual(l.established, []);
  for (const w of ['ports', 'container', 'shipping', 'failure']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
});
test('No intent / empty question returns null (no crash)', () => {
  assert.equal(buildInterpretationLedger(null), null);
  assert.equal(buildInterpretationLedger(undefined), null);
  assert.equal(buildInterpretationLedger(buildAnalysisIntent('')), null);
});

// Operand matching edge cases (hand-built intents; matcher only)
function opIntent(entityName, matchedOn, a, b) {
  return {
    question: { state: 'resolved', value: { text: `${a} vs ${b}` } },
    subject: { state: 'resolved', value: { kind: 'ENTITY', entity: { name: entityName }, matchedOn } },
    objective: { state: 'unresolved' }, observationalScope: { state: 'unresolved' },
    rCmp: { state: 'resolved', value: { subject_a: a, subject_b: b, condition: null } },
  };
}
test('operand edge: "metadata vendor" must NOT match entity META PLATFORMS', () => {
  const l = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'metadata vendor', 'Acme'));
  assert.equal(l.comparison.find(c => c.operand === 'metadata vendor').observed, false);
});
test('operand edge: "Apple" must NOT match entity PINEAPPLE HOLDINGS', () => {
  const l = buildInterpretationLedger(opIntent('PINEAPPLE HOLDINGS', 'Pineapple', 'Apple', 'Acme'));
  assert.equal(l.comparison.find(c => c.operand === 'Apple').observed, false);
});
test('operand edge: exact "Meta" and "Meta Platforms" DO match', () => {
  const l1 = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'Meta', 'Acme'));
  const l2 = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'Meta Platforms', 'Acme'));
  assert.equal(l1.comparison[0].observed, true);
  assert.equal(l2.comparison[0].observed, true);
});
console.log(fail ? `${fail} FAILED` : 'ALL PASS');
process.exit(fail ? 1 : 0);
