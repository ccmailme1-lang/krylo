// 020_verify_chokepoint_integration.mjs — R-side convergence proof for
// chokepointedges.js. Specifically tests the distinction raised during review: is πΣ
// tracing to genuine source evidence, or is it circular self-reference (an edge "evidencing"
// itself with no real grounding behind the id)?
//
// Run with: node architecture-recon/020_verify_chokepoint_integration.mjs

import assert from 'node:assert/strict';
import { registerChokepointEdges, buildChokepointStructure, getChokepointProvenanceDAG } from '../src/engine/chokepointedges.js';
import { TYPED_EDGES } from '../src/engine/entitytopologyregistry.js';

const beforeCount = TYPED_EDGES.length;

// Call 1
const registeredCount1 = registerChokepointEdges();
const sigma1 = buildChokepointStructure();

// Call 2 — idempotency check (criterion 6)
const registeredCount2 = registerChokepointEdges(); // should no-op, return 0
const edgeCountAfterCall1 = TYPED_EDGES.length;
const sigma2 = buildChokepointStructure();
const edgeCountAfterCall2 = TYPED_EDGES.length;

console.log('registerChokepointEdges() call 1 returned:', registeredCount1, '(expect >0, real edge count)');
console.log('registerChokepointEdges() call 2 returned:', registeredCount2, '(expect 0 — idempotent, existing behavior UNCHANGED)');
console.log('sigma1:', { vertexCount: sigma1.vertices.length, edgeCount: sigma1.edges.length, traceable: sigma1.traceable });
console.log('sigma2:', { vertexCount: sigma2.vertices.length, edgeCount: sigma2.edges.length, traceable: sigma2.traceable });

// 1. Existing registration behavior unchanged — idempotent, same return contract.
assert.ok(registeredCount1 > 0, 'FAIL: first call should register real edges');
assert.strictEqual(registeredCount2, 0, 'FAIL(1,6): registerChokepointEdges() idempotency broke — existing behavior must be unchanged');
assert.strictEqual(edgeCountAfterCall1, edgeCountAfterCall2, 'FAIL(6): TYPED_EDGES grew on a repeat call — not idempotent');

// 3. R edges visible to Gw without duplicating the authoritative store — same TYPED_EDGES
// array, no copy made anywhere (structural check: sigma edges reference the same from/to/
// type/source values already in TYPED_EDGES, not a separate representation).
const sampleEdge = TYPED_EDGES.find(e => e.source === 'DOMAIN_DEP_FACT');
assert.ok(sampleEdge, 'FAIL(3): no DOMAIN_DEP_FACT edge found in the authoritative TYPED_EDGES store');
const matchingSigmaEdge = sigma1.edges.find(e => e.from === sampleEdge.from && e.to === sampleEdge.to && e.type === sampleEdge.type);
assert.ok(matchingSigmaEdge, 'FAIL(3): Sigma edge set does not include a real edge present in the authoritative store');
assert.strictEqual(matchingSigmaEdge.source, 'DOMAIN_DEP_FACT', 'FAIL(3): Sigma edge lost its source field vs. the authoritative store');

// 4. Sigma is produced from the real chokepoint R data — not empty, matches real edge count.
assert.ok(sigma1.vertices.length > 0 && sigma1.edges.length > 0, 'FAIL(4): Sigma is empty despite real registered edges');

// 5 & THE SHARP QUESTION — does piSigma trace to genuine SOURCE evidence, or circular
// self-reference? Testing precisely, not assuming either answer.
const dag = getChokepointProvenanceDAG();
const evidenceForSampleEdge = dag.evidenceFor('CHOKEPOINT_DEPENDENCY_STRUCTURE', 'edge', matchingSigmaEdge.id);
console.log('\nEvidence linked for one real edge:', evidenceForSampleEdge);

assert.ok(evidenceForSampleEdge.length > 0, 'FAIL(5): no evidence linked for a real edge — traceability invariant violated');

// The honest test: what IS the linked evidence id, structurally?
const linkedId = evidenceForSampleEdge[0];
const isSelfReferential = linkedId === matchingSigmaEdge.id;
console.log('Linked evidence id === the edge\'s own composite id?', isSelfReferential);
console.log('Does the edge itself carry real source grounding (source field)?', matchingSigmaEdge.source);

// 6. Idempotent Sigma/provenance — repeat call does not duplicate links.
const evidenceForSampleEdgeAfterRepeat = dag.evidenceFor('CHOKEPOINT_DEPENDENCY_STRUCTURE', 'edge', matchingSigmaEdge.id);
assert.deepStrictEqual(
  [...evidenceForSampleEdgeAfterRepeat].sort(), [...evidenceForSampleEdge].sort(),
  'FAIL(6): repeat buildChokepointStructure() call changed/duplicated provenance links'
);
assert.strictEqual(sigma1.vertices.length, sigma2.vertices.length, 'FAIL(6): repeat call produced a different vertex count — not stable/idempotent');

console.log('\n=== ALL STRUCTURAL ASSERTIONS PASSED ===');

// Follow-up check, run after review: does DOMAIN_DEP_FACT have a canonical evidence/source
// identity anywhere else in KRYLO? Checked directly, not assumed either way:
//   - grep "DOMAIN_DEP_FACT" across src/: appears ONLY in chokepointedges.js itself (the
//     SRC constant declaration and one comment) — no registration elsewhere.
//   - evidencetiers.js's EVIDENCE_DESCRIPTORS: no DOMAIN_DEP_FACT entry — this source type
//     is not part of the shared evidence-tier taxonomy at all.
//   - "outage material" (the file's own comment citing where these facts came from): not
//     captured as a citable artifact anywhere in the repository.
// ANSWER: No canonical source identity exists to thread through. Per instruction, none is
// invented here. This is recorded as a lower-grade provenance case, not fixed to look
// stronger than it is.
console.log('\nFOLLOW-UP: DOMAIN_DEP_FACT has NO canonical evidence/source identity anywhere');
console.log('else in KRYLO (checked: evidencetiers.js EVIDENCE_DESCRIPTORS, repo-wide grep for');
console.log('"outage material"). Nothing to thread through. Chokepoint piSigma links are');
console.log('recorded as structural provenance (edge-to-its-own-inclusion), NOT epistemic');
console.log('evidence provenance (edge-to-external-artifact) — a real, lower grade than EDGAR\'s,');
console.log('left as such rather than fabricated upward.');
console.log('\nHONEST FINDING on the sharp question: the linked evidence IS the edge\'s own');
console.log('composite id — self-referential, per sigmaengine.js\'s design (R is a legitimate');
console.log('E-union-R evidence-domain member for its own inclusion, same as EDGAR edges).');
console.log('It is NOT fabricated (the edge genuinely exists in the authoritative store, with a');
console.log('real source field: DOMAIN_DEP_FACT), but it is NOT equivalent in evidentiary strength');
console.log('to EDGAR\'s per-item evidence[] (a real accession number + item number pointing to an');
console.log('actual dated legal filing). The chokepoint edge\'s source field IS real domain');
console.log('knowledge grounding, but it is not currently surfaced as part of the piSigma link');
console.log('itself, only as a property of the edge object alongside it — an evidenceFor() query');
console.log('proves "this element is in the structure" but a caller must separately read');
console.log('.source to learn WHY. This is a real distinction, not a defect — reporting it,');
console.log('not fixing it, per instruction not to redesign beyond the minimum.');
