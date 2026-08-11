// 010_verify_ontology_chain.mjs — runnable proof, not just a compile check.
// Run with: node architecture-recon/010_verify_ontology_chain.mjs
//
// Exercises the real chain built in this session: R edge -> O entity -> G_W snapshot ->
// Σ structure -> πΣ traceability check. Prints actual output at each step so you can see
// it, not just take a report's word for it.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerTypedEdge, bridgeV1ToV2, RELATION_TYPES } from '../src/engine/entitytopologyregistry.js';
import { resolve, createEntity } from '../src/engine/entityresolution.js';
import { realiseSnapshot } from '../src/engine/gwrealiser.js';
import { buildStructure } from '../src/engine/sigmaengine.js';
import { createEvidenceNode } from '../src/engine/identitykernel.js';
import { computeSCI as computeSCIContradiction } from '../src/engine/structuralintegrity.js';

console.log('=== 1. R — register a real-shaped typed edge ===');
registerTypedEdge({
  from: 'ACME_HOLDINGS', to: 'ACME_SUBSIDIARY',
  type: RELATION_TYPES.BENEFICIAL_OWNER_OF,
  source: 'SEC_13D_13G_TEST',
});
console.log('registered: ACME_HOLDINGS -[BENEFICIAL_OWNER_OF]-> ACME_SUBSIDIARY');

console.log('\n=== 2. O — resolve an existing entity, create a new one ===');
const lockheed = resolve('Lockheed Martin Corp');
console.log('resolve("Lockheed Martin Corp") ->', lockheed ? `${lockheed.canonicalId} (confidence ${lockheed.confidence})` : 'null');

const created = createEntity({ canonicalName: 'Test Runtime Entity Co', domainTags: ['TECHNOLOGY'] });
console.log('createEntity("Test Runtime Entity Co") ->', created);
const reResolved = resolve('Test Runtime Entity Co');
console.log('resolve() finds the runtime-created entity ->', reResolved ? reResolved.canonicalId : 'NOT FOUND (bug)');

console.log('\n=== 3. G_W — realise a virtual snapshot from live TYPED_EDGES ===');
const snapshot = realiseSnapshot({ window: { start: Date.now() - 1000 * 60 * 60, end: null } });
console.log(`snapshot: ${snapshot.vertices.size} vertices, ${snapshot.edges.length} edges (window: last 1h)`);
console.log('vertex ids:', [...snapshot.vertices.keys()]);

console.log('\n=== 4. Σ — build a real structure object from G_W, check πΣ traceability ===');
const sigma = buildStructure({ sigmaId: 'TEST_SIGMA_1', snapshot, seedId: 'ACME_HOLDINGS' });
console.log('Σ.vertices:', sigma.vertices);
console.log('Σ.edges:', sigma.edges);
console.log('Σ.traceable (rc3 Traceability Invariant, verified not asserted):', sigma.traceable);
console.log('πΣ direct check — evidence for the ACME_HOLDINGS vertex:',
  sigma.provenanceDAG.evidenceFor('TEST_SIGMA_1', 'vertex', 'ACME_HOLDINGS'));

console.log('\n=== 5. Bridge check (v1/v2 identity gap) ===');
const bridged = bridgeV1ToV2('Lockheed Martin', resolve);
console.log('bridgeV1ToV2("Lockheed Martin", resolve) ->', bridged);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Σ/σ integration — the gap flagged in the prior run: does buildStructure()
// actually execute WO-2005B's computeSCI/computeStructuralDivergence and populate
// props_Σ, or does it just not throw? This uses ONLY real, shipped constructors —
// createEvidenceNode from identitykernel.js, real evidenceType values confirmed
// present in BOTH evidencetiers.js's descriptors AND structuralconfirmation.js's
// CALIBRATION_PRIORS (SEC_FILING, NEWS_ARTICLE) — not invented field names or a
// fictional buildEvidenceGraph() API.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== 6. Σ/σ — real evidenceGraph through buildStructure(), asserted not just logged ===');

const evNode1 = createEvidenceNode({ evidenceType: 'SEC_FILING', content: 'Test 13D filing' });
const evNode2 = createEvidenceNode({ evidenceType: 'NEWS_ARTICLE', content: 'Test coverage article' });
const evidenceGraph = { nodes: new Map([[evNode1.id, evNode1], [evNode2.id, evNode2]]) };

const sigmaWithEvidence = buildStructure({
  sigmaId: 'TEST_SIGMA_2', snapshot, seedId: 'ACME_HOLDINGS', evidenceGraph,
});

assert.ok(Object.keys(sigmaWithEvidence.props).length > 0, 'FAIL: props_Σ is empty even with a real evidenceGraph supplied');
console.log('PASS: props_Σ is non-empty:', Object.keys(sigmaWithEvidence.props));

assert.ok('sciConfirmation' in sigmaWithEvidence.props, 'FAIL: sciConfirmation missing from props_Σ');
assert.ok(sigmaWithEvidence.props.sciConfirmation.score !== undefined, 'FAIL: sciConfirmation.score is undefined — computeSCI did not actually execute');
console.log('PASS: sciConfirmation actually executed ->', sigmaWithEvidence.props.sciConfirmation);

assert.ok('structuralDivergence' in sigmaWithEvidence.props, 'FAIL: structuralDivergence missing from props_Σ');
assert.ok(sigmaWithEvidence.props.structuralDivergence.divergence !== undefined, 'FAIL: structuralDivergence.divergence is undefined — computeStructuralDivergence did not actually execute');
console.log('PASS: structuralDivergence actually executed ->', sigmaWithEvidence.props.structuralDivergence);

// πΣ traceability — every vertex, edge, AND property, via the real ProvenanceDAG API.
for (const v of sigmaWithEvidence.vertices) {
  assert.ok(sigmaWithEvidence.provenanceDAG.isTraceable('TEST_SIGMA_2', 'vertex', v.id), `FAIL: vertex ${v.id} not traceable`);
}
for (const e of sigmaWithEvidence.edges) {
  assert.ok(sigmaWithEvidence.provenanceDAG.isTraceable('TEST_SIGMA_2', 'edge', e.id), `FAIL: edge ${e.id} not traceable`);
}
for (const p of Object.keys(sigmaWithEvidence.props)) {
  assert.ok(sigmaWithEvidence.provenanceDAG.isTraceable('TEST_SIGMA_2', 'property', p), `FAIL: property ${p} not traceable`);
}
assert.strictEqual(sigmaWithEvidence.traceable, true, 'FAIL: sigma.traceable is false despite every element passing isTraceable individually');
console.log('PASS: every vertex, edge, and property is individually traceable via the real ProvenanceDAG API');

// No-fabrication check (§22): omitting evidenceGraph must leave props_Σ empty — not
// zeroed, not defaulted, genuinely absent. This is the earlier run's step 4 sigma,
// which was built with no evidenceGraph.
assert.deepStrictEqual(sigma.props, {}, 'FAIL: props_Σ was populated with NO evidenceGraph supplied — fabrication, not withhold');
console.log('PASS: no evidenceGraph -> props_Σ stays empty (no fabricated metric) — confirmed on step 4\'s sigma object');

// SCI-CONTRADICTION (structuralintegrity.js) vs SCI-CONFIRMATION (structuralconfirmation.js)
// — a real semantic/contract check, not a typeof coincidence check (typeof alone doesn't
// prove non-collision: two unrelated functions could both happen to return numbers).
const contradictionResult = computeSCIContradiction([{ direction: 'constructive', mag: 0.5 }]);

// 1. Contract shape: SCI-CONTRADICTION returns a bare number|null (per structuralintegrity.js's
// own docstring: "SCI ∈ [0,1], or null"). SCI-CONFIRMATION returns a named-field object.
// These are documented contracts, not incidental — asserting both, not just one.
assert.strictEqual(typeof contradictionResult, 'number', 'FAIL: SCI-CONTRADICTION no longer returns a bare number — contract changed');
assert.ok(
  !('score' in Object(contradictionResult)) && !('groundedness' in Object(contradictionResult)),
  'FAIL: SCI-CONTRADICTION output now carries SCI-CONFIRMATION-shaped fields — possible collision'
);
assert.ok(
  typeof sigmaWithEvidence.props.sciConfirmation === 'object' &&
  'score' in sigmaWithEvidence.props.sciConfirmation &&
  'groundedness' in sigmaWithEvidence.props.sciConfirmation &&
  'coveredTypes' in sigmaWithEvidence.props.sciConfirmation,
  'FAIL: SCI-CONFIRMATION missing its documented field shape (score/groundedness/coveredTypes)'
);
console.log('PASS: SCI-CONTRADICTION and SCI-CONFIRMATION have distinct, documented contract shapes ->',
  { contradictionResult, confirmationShape: Object.keys(sigmaWithEvidence.props.sciConfirmation) });

// 2. Static, source-level check: neither file imports the other. This is an architectural
// fact, not a runtime behavior — checked by reading the actual source text, not inferred.
const integritySrc     = readFileSync(new URL('../src/engine/structuralintegrity.js', import.meta.url), 'utf8');
const confirmationSrc  = readFileSync(new URL('../src/engine/structuralconfirmation.js', import.meta.url), 'utf8');
assert.ok(!integritySrc.includes('structuralconfirmation'), 'FAIL: structuralintegrity.js now imports structuralconfirmation.js — collision risk');
assert.ok(!confirmationSrc.includes('structuralintegrity'), 'FAIL: structuralconfirmation.js now imports structuralintegrity.js — collision risk');
console.log('PASS: no cross-import between structuralintegrity.js and structuralconfirmation.js (verified against actual source text)');

console.log('\n=== ALL STEPS COMPLETED, ALL ASSERTIONS PASSED — no exceptions thrown ===');
