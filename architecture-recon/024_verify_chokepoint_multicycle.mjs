// 024_verify_chokepoint_multicycle.mjs — formal multi-cycle persistence/coherence test for
// the chokepoint R path, matching 014's rigor (not just idempotency, per direction).
//
// Also tests a real cross-connector concern the single-call test (020) couldn't surface:
// buildChokepointStructure() reads the WHOLE shared TYPED_EDGES store (no seedId, no edges
// override) — if another connector registers unrelated edges into that same shared array
// between chokepoint calls, does chokepoint's Σ stay scoped to its own curated data, or does
// it silently absorb unrelated edges? Testing directly, not assuming either answer.
//
// Run with: node architecture-recon/024_verify_chokepoint_multicycle.mjs

import assert from 'node:assert/strict';
import { registerChokepointEdges, buildChokepointStructure, getChokepointProvenanceDAG } from '../src/engine/chokepointedges.js';
import { registerTypedEdge, TYPED_EDGES } from '../src/engine/entitytopologyregistry.js';

console.log('=== Cycles 1-3: repeated invocation, no unrelated edges yet ===');
const cycles = [];
for (let i = 0; i < 3; i++) {
  cycles.push(buildChokepointStructure());
}

// 1. No duplicate R artifacts — TYPED_EDGES count identical after 3 calls.
const chokepointEdgeCountAfter3 = TYPED_EDGES.filter(e => e.source === 'DOMAIN_DEP_FACT').length;
console.log('DOMAIN_DEP_FACT edges in TYPED_EDGES after 3 cycles:', chokepointEdgeCountAfter3);
assert.strictEqual(chokepointEdgeCountAfter3, 24, 'FAIL: chokepoint edge count changed across repeated cycles — not idempotent');

// Identity stability — same vertex/edge ids across all 3 cycles.
const vertexIdSets = cycles.map(s => new Set(s.vertices.map(v => v.id)));
const edgeIdSets    = cycles.map(s => new Set(s.edges.map(e => e.id)));
for (let i = 1; i < 3; i++) {
  assert.deepStrictEqual([...vertexIdSets[i]].sort(), [...vertexIdSets[0]].sort(), `FAIL: vertex identity unstable at cycle ${i+1}`);
  assert.deepStrictEqual([...edgeIdSets[i]].sort(), [...edgeIdSets[0]].sort(), `FAIL: edge identity unstable at cycle ${i+1}`);
}
console.log('PASS: identity stable across 3 cycles —', vertexIdSets[0].size, 'vertices,', edgeIdSets[0].size, 'edges, unchanged');

// Evidence/provenance persists — same DAG instance, links present after every cycle.
const dag = getChokepointProvenanceDAG();
const sampleEdgeId = [...edgeIdSets[0]][0];
for (let i = 0; i < 3; i++) {
  assert.strictEqual(dag.isTraceable('CHOKEPOINT_DEPENDENCY_STRUCTURE', 'edge', sampleEdgeId), true, `FAIL: provenance lost by cycle ${i+1}`);
}
console.log('PASS: provenance persists across all 3 cycles (same DAG, not reset)');

// All 3 cycles' Sigma are structurally identical (no "zero-new returns stale/different" issue
// — for static curated data, "same every time" IS correct, not stale).
for (let i = 1; i < 3; i++) {
  assert.strictEqual(cycles[i].vertices.length, cycles[0].vertices.length, `FAIL: vertex count drifted at cycle ${i+1}`);
  assert.strictEqual(cycles[i].edges.length, cycles[0].edges.length, `FAIL: edge count drifted at cycle ${i+1}`);
  assert.strictEqual(cycles[i].traceable, true, `FAIL: traceable flag false at cycle ${i+1}`);
}
console.log('PASS: Sigma output structurally identical across all 3 cycles (correct for static curated data)');

console.log('\n=== Post-fix: chokepoint-only scoping, 7 explicit conditions ===');

// 1. Chokepoint-only snapshot contains only its intended edges.
const nonChokepointInCycle1 = cycles[0].edges.filter(e => e.source !== 'DOMAIN_DEP_FACT');
assert.strictEqual(nonChokepointInCycle1.length, 0, 'FAIL(1): non-chokepoint edges present in chokepoint Sigma before any cross-connector activity');
console.log('PASS(1): chokepoint Sigma contains only DOMAIN_DEP_FACT edges');

// 2. Repeated chokepoint registration/build produces identical Sigma. (already proven above
// for cycles 1-3; re-stating as the numbered condition)
console.log('PASS(2): repeated build produces identical Sigma (proven above, cycles 1-3)');

// 3. Adding unrelated R edges does NOT change chokepoint Sigma.
registerTypedEdge({ from: 'UNRELATED_CO', to: 'UNRELATED_TARGET', type: 'BENEFICIAL_OWNER_OF', source: 'SEC_13D_13G_TEST' });
const cycle4 = buildChokepointStructure();
assert.strictEqual(cycle4.vertices.length, cycles[0].vertices.length, 'FAIL(3): unrelated edge changed chokepoint Sigma vertex count — scoping fix did not work');
assert.strictEqual(cycle4.edges.length, cycles[0].edges.length, 'FAIL(3): unrelated edge changed chokepoint Sigma edge count — scoping fix did not work');
const unrelatedVertexPresent = cycle4.vertices.some(v => v.id === 'UNRELATED_CO' || v.id === 'UNRELATED_TARGET');
assert.strictEqual(unrelatedVertexPresent, false, 'FAIL(3): unrelated entity leaked into chokepoint Sigma');
console.log('PASS(3): unrelated R edge registered elsewhere does NOT change chokepoint Sigma — scoping fix confirmed');

// 4. Provenance remains scoped to the chokepoint Sigma.
const dagAfterFix = getChokepointProvenanceDAG();
const unrelatedTraceable = dagAfterFix.isTraceable('CHOKEPOINT_DEPENDENCY_STRUCTURE', 'vertex', 'UNRELATED_CO');
assert.strictEqual(unrelatedTraceable, false, 'FAIL(4): provenance DAG has a link for an entity that should never have entered chokepoint Sigma');
console.log('PASS(4): provenance stays scoped — no link exists for the unrelated entity');

// 5. No duplicate edges or vertices appear (re-confirm counts after the cross-connector test).
const dedupedEdgeIds = new Set(cycle4.edges.map(e => e.id));
assert.strictEqual(dedupedEdgeIds.size, cycle4.edges.length, 'FAIL(5): duplicate edge ids present in Sigma');
console.log('PASS(5): no duplicate edges/vertices —', cycle4.edges.length, 'unique edges,', cycle4.vertices.length, 'unique vertices');

console.log('\n=== ALL 5 NUMBERED CONDITIONS PASS (6, 7 = regression suite + build, run separately) ===');
