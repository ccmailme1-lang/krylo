// qa_kryl1334_relationalchange.mjs — validates relationalchange.js against the spec's own
// VALIDATION section (specs/SPEC-relational-change-temporal-axis.md). Pure, no DB, no network.
//   node qa_kryl1334_relationalchange.mjs
import assert from 'node:assert/strict';
import { classifyTransition, diffFormationHistory, RELATIONAL_CHANGE_STATE as S } from './src/engine/relationalchange.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

const base = { formation_id: 'f1', entity_a: 'SUPPLIER', entity_b: 'DISTRIBUTOR', relationship_type: 'ACQUIRED', captured_at: '2026-09-01T00:00:00Z' };

test('a real relationship change correctly classifies (NEW then STRENGTHENING on new evidence)', () => {
  const t1 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-01T00:00:00Z' };
  const t2 = { ...base, state: S.STRENGTHENING, evidence_ref: 'ev2', captured_at: '2026-09-15T00:00:00Z' };
  const [c1, c2] = diffFormationHistory([t1, t2]);
  assert.equal(c1.state, S.NEW);
  assert.equal(c2.state, S.STRENGTHENING);
});

test('false-positive guard: identical consecutive rows never report a change', () => {
  const t1 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-01T00:00:00Z' };
  const t2 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-08T00:00:00Z' };
  const t3 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-15T00:00:00Z' };
  const results = diffFormationHistory([t1, t2, t3]);
  assert.equal(results[0].state, S.NEW); // first observation ever
  assert.equal(results[1].state, S.STABLE);
  assert.equal(results[2].state, S.STABLE);
});

test('diffs are performed only within a formation_id -- cross-scope comparison forbidden', () => {
  const other = { ...base, formation_id: 'f2', entity_a: 'FACILITY', entity_b: 'MARKET', state: S.NEW, evidence_ref: 'ev9', captured_at: '2026-09-02T00:00:00Z' };
  assert.throws(() => classifyTransition(base_row(), other), /cross-scope comparison is forbidden/);
});
function base_row() { return { ...base, state: S.NEW, evidence_ref: 'ev1' }; }

test('grouping never mixes two different formation_ids into one trajectory', () => {
  const f1a = { ...base, formation_id: 'f1', state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-01T00:00:00Z' };
  const f2a = { ...base, formation_id: 'f2', entity_a: 'FACILITY', entity_b: 'MARKET', state: S.NEW, evidence_ref: 'ev9', captured_at: '2026-09-01T00:00:00Z' };
  const results = diffFormationHistory([f1a, f2a]);
  assert.equal(results.length, 2);
  assert.ok(results.every(r => r.state === S.NEW)); // both are each formation's first observation
});

test('dissolution is honestly reported when a later row explicitly records it', () => {
  const t1 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-01T00:00:00Z' };
  const t2 = { ...base, state: S.DISSOLUTION, evidence_ref: null, captured_at: '2026-09-20T00:00:00Z' };
  const [, c2] = diffFormationHistory([t1, t2]);
  assert.equal(c2.state, S.DISSOLUTION);
});

test('when only one persisted state exists, the result is NEW (first observation), never inferred change', () => {
  const t1 = { ...base, state: S.NEW, evidence_ref: 'ev1', captured_at: '2026-09-01T00:00:00Z' };
  const results = diffFormationHistory([t1]);
  assert.equal(results.length, 1);
  assert.equal(results[0].state, S.NEW);
  assert.equal(results[0].from, null);
});

test('observation_count delta alone never produces a classification (no such input exists in this function\'s signature)', () => {
  // Structural guarantee, not a runtime check: classifyTransition's only inputs are two
  // formation_state rows (relationship-specific), it has no observation_count parameter at all.
  assert.equal(classifyTransition.length <= 2, true);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
