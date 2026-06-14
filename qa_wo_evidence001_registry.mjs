// BAU harness — WO-EVIDENCE-001 Signal Outcome Registry
// Load-bearing. Do not delete.

import assert from 'assert';
import {
  emitPrediction,
  resolvePrediction,
  checkExpiry,
  getPending,
  getResolved,
  getRecord,
  getRunningAccuracy,
  exportRegistry,
  clearRegistry,
  OUTCOME,
  PREDICTION_SOURCES,
} from './src/engine/evidenceregistry.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✔ ${name}`);
    passed++;
  } catch (e) {
    console.error(`✘ ${name}: ${e.message}`);
    failed++;
  }
}

clearRegistry();

// ── T01 — emitPrediction returns a string id ─────────────────────────────────
test('T01 — emitPrediction returns string id', () => {
  const id = emitPrediction({
    domains:             ['TECHNOLOGY'],
    convergenceScore:    0.72,
    hypothesis:          'AI compute regulation forming — 6–12 months to codification',
    expectedHorizonDays: 180,
    source:              'WO-1736',
  });
  assert.strictEqual(typeof id, 'string');
  assert.ok(id.length > 0);
});

// ── T02 — stored with PENDING status ─────────────────────────────────────────
test('T02 — prediction stored with PENDING status', () => {
  const pending = getPending();
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].actualOutcome, OUTCOME.PENDING);
  assert.strictEqual(pending[0].resolutionDate, null);
  assert.strictEqual(pending[0].leadTimeDays, null);
});

// ── T03 — resolve VALIDATED ───────────────────────────────────────────────────
test('T03 — resolve VALIDATED updates outcome + lead time', () => {
  const id       = getPending()[0].id;
  const resolved = resolvePrediction(id, OUTCOME.VALIDATED, 'SEC announced AI framework draft');
  assert.strictEqual(resolved.actualOutcome, OUTCOME.VALIDATED);
  assert.ok(resolved.resolutionDate > 0);
  assert.ok(resolved.leadTimeDays >= 0);
  assert.strictEqual(resolved.resolutionNote, 'SEC announced AI framework draft');
});

// ── T04 — resolve INVALIDATED ────────────────────────────────────────────────
test('T04 — resolve INVALIDATED updates outcome', () => {
  const id = emitPrediction({
    domains:          ['CAPITAL'],
    convergenceScore: 0.55,
    hypothesis:       'Credit spread compression — CAPITAL domain signal',
    expectedHorizonDays: 90,
    source:           'WO-1734',
  });
  const resolved = resolvePrediction(id, OUTCOME.INVALIDATED, 'Spread widened instead');
  assert.strictEqual(resolved.actualOutcome, OUTCOME.INVALIDATED);
  assert.ok(resolved.leadTimeDays >= 0);
});

// ── T05 — double-resolve throws ──────────────────────────────────────────────
test('T05 — double-resolve throws already resolved error', () => {
  const resolved = getResolved();
  const id = resolved[0].id;
  assert.throws(
    () => resolvePrediction(id, OUTCOME.VALIDATED),
    /already resolved/
  );
});

// ── T06 — running accuracy = validated / decisive ────────────────────────────
test('T06 — running accuracy = validated / (validated + invalidated)', () => {
  const acc = getRunningAccuracy();
  assert.strictEqual(acc.validated, 1);
  assert.strictEqual(acc.invalidated, 1);
  assert.strictEqual(acc.overallAccuracy, 0.5);
});

// ── T07 — getPending returns only unresolved ──────────────────────────────────
test('T07 — getPending returns only PENDING entries', () => {
  const id = emitPrediction({
    domains:          ['MEDIA', 'KNOWLEDGE'],
    convergenceScore: 0.81,
    hypothesis:       'Narrative permission forming in AI governance space',
    expectedHorizonDays: 120,
    source:           'WO-1722',
  });
  const pending = getPending();
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].id, id);
});

// ── T08 — getResolved excludes PENDING ───────────────────────────────────────
test('T08 — getResolved excludes PENDING entries', () => {
  const resolved = getResolved();
  assert.ok(resolved.every(e => e.actualOutcome !== OUTCOME.PENDING));
  assert.strictEqual(resolved.length, 2);
});

// ── T09 — byDomain accuracy breakdown ────────────────────────────────────────
test('T09 — byDomain breakdown is accurate', () => {
  const { byDomain } = getRunningAccuracy();
  assert.ok('TECHNOLOGY' in byDomain);
  assert.ok('CAPITAL' in byDomain);
  assert.strictEqual(byDomain['TECHNOLOGY'].validated, 1);
  assert.strictEqual(byDomain['CAPITAL'].invalidated, 1);
  assert.strictEqual(byDomain['TECHNOLOGY'].accuracy, 1.0);
  assert.strictEqual(byDomain['CAPITAL'].accuracy, 0.0);
});

// ── T10 — bySource accuracy breakdown ────────────────────────────────────────
test('T10 — bySource breakdown is accurate', () => {
  const { bySource } = getRunningAccuracy();
  assert.ok('WO-1736' in bySource);
  assert.ok('WO-1734' in bySource);
  assert.strictEqual(bySource['WO-1736'].validated, 1);
  assert.strictEqual(bySource['WO-1734'].invalidated, 1);
});

// ── T11 — exportRegistry shape ───────────────────────────────────────────────
test('T11 — exportRegistry has complete required shape', () => {
  const exp = exportRegistry();
  assert.ok(exp.exportedAt > 0);
  assert.ok(Array.isArray(exp.predictions));
  assert.ok(typeof exp.accuracy === 'object');
  assert.ok('overallAccuracy'  in exp.accuracy);
  assert.ok('avgLeadTimeDays'  in exp.accuracy);
  assert.ok('byDomain'         in exp.accuracy);
  assert.ok('bySource'         in exp.accuracy);
  assert.ok('totalPredictions' in exp.accuracy);
});

// ── T12 — unknown source throws ──────────────────────────────────────────────
test('T12 — unknown source throws', () => {
  assert.throws(
    () => emitPrediction({
      domains:          ['TECHNOLOGY'],
      convergenceScore: 0.6,
      hypothesis:       'Test hypothesis',
      source:           'WO-9999',
    }),
    /unknown source/
  );
});

// ── T13 — missing hypothesis throws ──────────────────────────────────────────
test('T13 — empty hypothesis throws', () => {
  assert.throws(
    () => emitPrediction({
      domains:          ['TECHNOLOGY'],
      convergenceScore: 0.6,
      hypothesis:       '',
      source:           'MANUAL',
    }),
    /hypothesis is required/
  );
});

// ── T14 — missing domains throws ─────────────────────────────────────────────
test('T14 — empty domains array throws', () => {
  assert.throws(
    () => emitPrediction({
      domains:          [],
      convergenceScore: 0.6,
      hypothesis:       'Test hypothesis',
      source:           'MANUAL',
    }),
    /at least one domain/
  );
});

// ── T15 — checkExpiry returns 0 for fresh predictions ────────────────────────
test('T15 — checkExpiry returns 0 for fresh predictions', () => {
  const count = checkExpiry();
  assert.strictEqual(count, 0);
});

// ── T16 — getRecord returns newest first ─────────────────────────────────────
test('T16 — getRecord sorts newest first', () => {
  const record = getRecord();
  for (let i = 1; i < record.length; i++) {
    assert.ok(record[i - 1].timestamp >= record[i].timestamp);
  }
});

// ── T17 — avgLeadTimeDays computed from validated only ───────────────────────
test('T17 — avgLeadTimeDays derived from VALIDATED entries only', () => {
  const { avgLeadTimeDays } = getRunningAccuracy();
  assert.ok(avgLeadTimeDays >= 0);
  assert.strictEqual(typeof avgLeadTimeDays, 'number');
});

// ── T18 — clearRegistry empties all state ────────────────────────────────────
test('T18 — clearRegistry resets to empty state', () => {
  clearRegistry();
  assert.strictEqual(getRecord().length, 0);
  assert.strictEqual(getPending().length, 0);
  const acc = getRunningAccuracy();
  assert.strictEqual(acc.totalPredictions, 0);
  assert.strictEqual(acc.overallAccuracy, null);
  assert.strictEqual(acc.avgLeadTimeDays, null);
});

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
console.log('  WO-EVIDENCE-001 — Signal Outcome Registry');
console.log('════════════════════════════════════════');
console.log(`\n  ${passed}/${passed + failed} PASS\n`);
if (failed > 0) {
  console.error(`  ✘ ${failed} FAILED`);
  process.exit(1);
}
