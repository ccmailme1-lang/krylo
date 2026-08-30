// diag_structuralrecognition_real_data.mjs — the decisive experiment.
// Feeds structuralrecognition.js REAL, live data — chokepointedges.js's 25 curated, evidence-
// backed infrastructure dependency edges (source: 'DOMAIN_DEP_FACT', see that file's own header:
// "Curated, VERIFIABLE dependency facts... Everything here is a verifiable domain fact") — not a
// test fixture, not synthetic. Diagnostic only. Does not modify anything. Does not wire anything
// into a live surface. Run: node diag_structuralrecognition_real_data.mjs

import { registerChokepointEdges } from './src/engine/chokepointedges.js';
import { TYPED_EDGES } from './src/engine/entitytopologyregistry.js';
import { recognizeStructure, DETERMINATION } from './src/engine/structuralrecognition.js';

registerChokepointEdges();

console.log(`\nReal TYPED_EDGES registered: ${TYPED_EDGES.length}\n`);

// Adapter — pure field renaming, no fabrication. TYPED_EDGES already carries real provenance in
// `source` ('DOMAIN_DEP_FACT' for every edge here); we fold it into evidenceRefs as-is.
function toRelationship(e) {
  return { id: `${e.from}->${e.to}`, subjectId: e.from, objectId: e.to, type: e.type, evidenceRefs: [e.source], ts: e.ts };
}

const relationships = TYPED_EDGES.map(toRelationship);
console.log('Nodes involved:', [...new Set(relationships.flatMap(r => [r.subjectId, r.objectId]))].sort().join(', '));
console.log('');

// Case A — single window, no stability data (honest default: real data, but only one observation).
console.log('=== CASE A: single window (as currently available — no repeated observation over time) ===');
const singleWindow = recognizeStructure(relationships, { seed: 1 });
report(singleWindow);

// Case B — same edges, explicit ephemeral exception (this data genuinely has no time-series substrate
// today — chokepointedges.js is a one-time curated seed, not a recurring observation; using
// allowEphemeral here is the honest way to ask "if we treat this as reliably known rather than
// observed-over-time, does the underlying configuration look organized?").
console.log('\n=== CASE B: same real edges, explicit ephemeral exception (curated data has no natural repeat-observation window) ===');
const ephemeral = recognizeStructure(relationships, { seed: 1, allowEphemeral: true });
report(ephemeral);

function report(result) {
  console.log(`Determination: ${result.determination}${result.ephemeral ? ' (ephemeral)' : ''}`);
  console.log(`Reason: ${result.determination_rationale}`);
  console.log(`Organization: ${result.organizationEvidence.status}` +
    (result.organizationEvidence.z != null ? ` (z=${result.organizationEvidence.z.toFixed(2)}, observed=${result.organizationEvidence.observed?.toFixed(3)}, null-mean=${result.organizationEvidence.nullMean?.toFixed(3)})` : ` — ${result.organizationEvidence.reason}`));
  console.log(`Dependence:   ${result.dependenceEvidence.status}` +
    (result.dependenceEvidence.z != null ? ` (z=${result.dependenceEvidence.z.toFixed(2)}, observed=${result.dependenceEvidence.observed?.toFixed(3)}, null-mean=${result.dependenceEvidence.nullMean?.toFixed(3)})` : ` — ${result.dependenceEvidence.reason}`));
  console.log(`Stability:    ${result.stabilityEvidence.status}` +
    (result.stabilityEvidence.reason ? ` — ${result.stabilityEvidence.reason}` : ''));
  console.log(`Temporal:     ${result.temporalEvidence.status}` +
    (result.temporalEvidence.reason ? ` — ${result.temporalEvidence.reason}` : ''));
  console.log(`Insufficient evidence: [${result.insufficient_evidence.join(', ')}]`);
  console.log(`Scope: ${result.scope.nodeCount} nodes, ${result.scope.edgeCount} edges`);
}
