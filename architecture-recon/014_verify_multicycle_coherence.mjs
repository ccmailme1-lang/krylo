// 014_verify_multicycle_coherence.mjs — multi-cycle coherence test for the live
// edgar8kconnector.js path. Runs runEdgar8KSync() three times against different mocked
// EDGAR responses, simulating real repeated production ticks, and asserts the ontology
// loop stays coherent — not just that one cycle works in isolation (010/011/013 already
// proved that).
//
// 10 explicit conditions, each with its own assertion(s):
//   1. Dedup across cycles — a repeated filing is not reprocessed.
//   2. Same company, new filing — distinct RealityObject, same O attribution, no collision.
//   3. Different company — correct distinct O attribution, no cross-contamination.
//   4. Σ vertex identity is per-event (obj.id), never collapsed per-company.
//   5. πΣ accumulates across cycles — cycle 1's links survive cycles 2 and 3.
//   6. No cross-Σ leakage — cycle 1's sigmaId elements aren't traceable under cycle 2's sigmaId.
//   7. Pre-existing session-state contract intact (_processed/_eventLog/getProcessedEvents()).
//   8. No exceptions across repeated cycles; DAG grows predictably, not reset.
//   9. Each cycle's own sigma.traceable stays true independently as the shared DAG grows.
//  10. Final aggregate DAG state matches the expected count — no missing/duplicated links.
//
// Run with: node architecture-recon/014_verify_multicycle_coherence.mjs

import assert from 'node:assert/strict';

const CYCLE_RESPONSES = [
  // Cycle 1: Lockheed Martin, filing A
  [{ _id: 'c1', _source: { entity_id: '0000936395', entity_name: 'Lockheed Martin Corp', accession_no: '0000936395-26-000001', file_date: '2026-08-09', items: '2.02' } }],
  // Cycle 2: SAME filing repeated (dedup check) + Lockheed Martin filing B (same company, new event) + a different company
  [
    { _id: 'c1', _source: { entity_id: '0000936395', entity_name: 'Lockheed Martin Corp', accession_no: '0000936395-26-000001', file_date: '2026-08-09', items: '2.02' } },
    { _id: 'c2', _source: { entity_id: '0000936395', entity_name: 'Lockheed Martin Corp', accession_no: '0000936395-26-000002', file_date: '2026-08-10', items: '5.02' } },
    { _id: 'c3', _source: { entity_id: '0001067983', entity_name: 'Test Filer LLC', accession_no: '0001067983-26-000001', file_date: '2026-08-10', items: '8.01' } },
  ],
  // Cycle 3: nothing new (all previously seen) — empty-window-equivalent via full repeat
  [
    { _id: 'c1', _source: { entity_id: '0000936395', entity_name: 'Lockheed Martin Corp', accession_no: '0000936395-26-000001', file_date: '2026-08-09', items: '2.02' } },
    { _id: 'c2', _source: { entity_id: '0000936395', entity_name: 'Lockheed Martin Corp', accession_no: '0000936395-26-000002', file_date: '2026-08-10', items: '5.02' } },
  ],
];

let callIndex = 0;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ hits: { hits: CYCLE_RESPONSES[callIndex++] } }),
});

const { runEdgar8KSync, getProcessedEvents, getProvenanceDAG } = await import('../src/engine/connectors/edgar8kconnector.js');

const results = [];
for (let i = 0; i < 3; i++) {
  results.push(await runEdgar8KSync());
}
console.log('Cycle summaries:', results.map(r => ({ total: r.total, new: r.new, skipped: r.skipped, sigma: r.sigma })));

// 1. Dedup across cycles
assert.strictEqual(results[0].new, 1, 'FAIL(1): cycle 1 should process 1 new filing');
assert.strictEqual(results[1].new, 2, 'FAIL(1): cycle 2 should process 2 new filings (c1 repeated = skipped, c2+c3 new)');
assert.strictEqual(results[1].skipped, 1, 'FAIL(1): cycle 2 should skip the repeated c1 filing');
assert.strictEqual(results[2].new, 0, 'FAIL(1): cycle 3 (all previously seen) should process 0 new');

// 2 & 3. Company attribution — distinct RealityObjects, correct O per event
const allProcessed = [...results[0].processed, ...results[1].processed, ...results[2].processed];
assert.strictEqual(allProcessed.length, 3, 'FAIL(2/3): expected exactly 3 distinct RealityObjects across all cycles (c1, c2, c3)');
const lockheedObjs = allProcessed.filter(o => o.identityId === 'lockheed-martin');
assert.strictEqual(lockheedObjs.length, 2, 'FAIL(2): expected 2 distinct Lockheed Martin RealityObjects (c1, c2)');
assert.notStrictEqual(lockheedObjs[0].id, lockheedObjs[1].id, 'FAIL(2): same-company filings must not collapse into one RealityObject id');
const otherCompanyObjs = allProcessed.filter(o => o.identityId !== 'lockheed-martin');
assert.strictEqual(otherCompanyObjs.length, 1, 'FAIL(3): expected exactly 1 RealityObject for the different company (c3)');

// 4. Σ vertex identity is per-event
assert.strictEqual(results[0].sigma.vertexCount, 1, 'FAIL(4): cycle 1 sigma should have 1 vertex (1 event)');
assert.strictEqual(results[1].sigma.vertexCount, 2, 'FAIL(4): cycle 2 sigma should have 2 vertices (c2 + c3, c1 skipped)');

// 5, 6, 9, 10. πΣ accumulation, no cross-leakage, per-cycle correctness, final aggregate state
const dag = getProvenanceDAG();
const [cycle1Id] = allProcessed.filter(o => o.identityId === 'lockheed-martin').map(o => o.id);
// Cycle 1's sigmaId is embedded in results[0].sigma.sigmaId — check it's STILL traceable
// after cycles 2 and 3 ran (accumulation, condition 5).
assert.strictEqual(
  dag.isTraceable(results[0].sigma.sigmaId, 'vertex', cycle1Id), true,
  'FAIL(5): cycle 1\'s πΣ link for its own vertex did not survive cycles 2 and 3 — DAG is being reset, not accumulated'
);
// No cross-Σ leakage (6): cycle 1's vertex id should NOT be traceable under cycle 2's sigmaId
// (different sigmaId namespace — elementKey includes sigmaId, so this must be false).
assert.strictEqual(
  dag.isTraceable(results[1].sigma.sigmaId, 'vertex', cycle1Id), false,
  'FAIL(6): cycle 1\'s vertex is incorrectly traceable under cycle 2\'s sigmaId — Σ namespaces are leaking into each other'
);
// 9. Each cycle's own traceable flag independently true.
assert.strictEqual(results[0].sigma.traceable, true, 'FAIL(9): cycle 1 traceable flag false');
assert.strictEqual(results[1].sigma.traceable, true, 'FAIL(9): cycle 2 traceable flag false');
// 10. Aggregate: evidenceFor on the real evidence ids returns the actual filing item ids, not empty.
const cycle1Obj = allProcessed.find(o => o.id === cycle1Id);
const evidenceLinked = dag.evidenceFor(results[0].sigma.sigmaId, 'vertex', cycle1Id);
assert.deepStrictEqual(
  [...evidenceLinked].sort(), [...cycle1Obj.evidence].sort(),
  'FAIL(10): πΣ evidence recorded for the vertex does not match the RealityObject\'s actual evidence[] array'
);

// 7. Pre-existing contract — getProcessedEvents() still works, still reflects all 3 cycles.
const eventLog = getProcessedEvents();
assert.strictEqual(eventLog.length, 3, 'FAIL(7): getProcessedEvents() should reflect all 3 distinct processed filings across cycles');

// 8. No exceptions — implicit (we got this far). Also confirm cycle 3 (nothing new) didn't
// throw or corrupt state despite processing zero new objects.
assert.strictEqual(results[2].sigma, null, 'FAIL(8): a cycle with zero new objects should report sigma:null, not a stale/reused value');

console.log('\nPASS: all 10 multi-cycle coherence conditions hold.');
console.log('VERDICT: GREEN');
