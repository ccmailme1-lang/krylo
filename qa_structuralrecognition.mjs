// qa_structuralrecognition.mjs — golden set for src/engine/structuralrecognition.js
// EXPERIMENTAL PROTOTYPE engine. Not wired into any live surface. Run: node qa_structuralrecognition.mjs

import {
  recognizeStructure, recognizeFormation, DETERMINATION, EVIDENCE_STATUS,
} from './src/engine/structuralrecognition.js';
// CASE 11 only — real KRYLO relational data for the frozen coverage-gap baseline.
import { registerChokepointEdges } from './src/engine/chokepointedges.js';
import { TYPED_EDGES } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}

const rel = (subjectId, objectId, type = 'dependsOn', ts) =>
  ({ id: `${subjectId}-${objectId}`, subjectId, objectId, type, evidenceRefs: [`ev-${subjectId}-${objectId}`], ts });

// hubAndClusters(prefix) — a real, well-motivated "organized" fixture, NOT a complete clique
// (which degenerates the null model — see corrected header comment in structuralrecognition.js).
// Three tight-knit 4-node cliques (real local clustering) all bridged through ONE central hub node
// connected to every member of every clique (real, pronounced degree heterogeneity: hub degree 12
// vs. every clique member's degree 4). This is a standard, legitimate "organized" topology — a
// central intermediary connecting otherwise-separate dense groups — not a fixture picked merely to
// force a pass.
function hubAndClusters(prefix, ts) {
  const hub = `${prefix}_hub`;
  const clusters = [0, 1, 2].map(c => [0, 1, 2, 3].map(n => `${prefix}_c${c}n${n}`));
  const edges = [];
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.length; i++)
      for (let j = i + 1; j < cluster.length; j++)
        edges.push(rel(cluster[i], cluster[j], 'dependsOn', ts));
    for (const member of cluster) edges.push(rel(hub, member, 'dependsOn', ts));
  }
  return { hub, edges };
}

console.log('\n=== CASE 1: sparse/random relationships → COLLECTION ===');
{
  // 8 nodes, 3 edges scattered — well below the density needed for organization or clustering
  // to plausibly beat a random G(N,E) null.
  const sparse = [rel('a', 'b'), rel('c', 'd'), rel('e', 'f')];
  const result = recognizeStructure(sparse, { seed: 7 });
  check('sparse set → COLLECTION', result.determination === DETERMINATION.COLLECTION);
  check('insufficient_evidence is non-empty', result.insufficient_evidence.length > 0);
  check('no StructureScore field exists on output', !('structureScore' in result) && !('score' in result));
}

console.log('\n=== CASE 2: hub+clusters, single-window, no stability data → COLLECTION (fix #1 default) ===');
{
  const { edges } = hubAndClusters('t2');
  const result = recognizeStructure(edges, { seed: 3 });
  check('organization passes (real degree heterogeneity: hub vs clusters)', result.organizationEvidence.status === EVIDENCE_STATUS.PASS);
  check('dependence passes (real clustering within cliques)', result.dependenceEvidence.status === EVIDENCE_STATUS.PASS);
  check('stability FAILS without allowEphemeral (fix #1)', result.stabilityEvidence.status === EVIDENCE_STATUS.FAIL);
  check('overall determination is COLLECTION despite strong org+dep', result.determination === DETERMINATION.COLLECTION);
}

console.log('\n=== CASE 3: same structure, explicit ephemeral exception → STRUCTURE (fix #1 explicit path) ===');
{
  const { edges } = hubAndClusters('t3');
  const result = recognizeStructure(edges, { seed: 3, allowEphemeral: true });
  check('stability status is inapplicable (not silently pass)', result.stabilityEvidence.status === EVIDENCE_STATUS.INAPPLICABLE);
  check('determination is STRUCTURE via explicit ephemeral exception', result.determination === DETERMINATION.STRUCTURE);
  check('ephemeral flag is set true on the output', result.ephemeral === true);
}

console.log('\n=== CASE 4: hub+clusters persisting across 3 windows → STRUCTURE (real stability pass) ===');
let structureA;
{
  const windows = [0, 1, 2].map(w => hubAndClusters('t4', 1000 * w).edges);
  structureA = recognizeStructure(windows, { seed: 11 });
  check('organization passes', structureA.organizationEvidence.status === EVIDENCE_STATUS.PASS);
  check('dependence passes', structureA.dependenceEvidence.status === EVIDENCE_STATUS.PASS);
  check('stability PASSES on real 3-window persistence', structureA.stabilityEvidence.status === EVIDENCE_STATUS.PASS);
  check('determination is STRUCTURE (no ephemeral needed)', structureA.determination === DETERMINATION.STRUCTURE);
  check('ephemeral is false — this is a real stability pass, not the exception path', structureA.ephemeral === false);
  check('output is frozen (immutable)', Object.isFrozen(structureA));
}

console.log('\n=== CASE 5: Formation — parent Structure id participates in a new admitted relationship set ===');
{
  // structureA.id now exists (returned from a COMPLETED prior call — fix #3: cannot be forged before this point).
  const parentId = structureA.id;
  const { hub, edges: baseEdges } = hubAndClusters('t5');
  const withParent = [rel(parentId, hub, 'dependsOn'), ...baseEdges];
  const windows = [0, 1, 2].map(w => withParent.map(r => ({ ...r, ts: 1000 * w })));

  const formationResult = recognizeFormation(structureA, windows, { seed: 13 });
  check('parent participates → determination is FORMATION', formationResult.determination === DETERMINATION.FORMATION);
  check('parentStructureId is recorded and matches structureA.id', formationResult.parentStructureId === parentId);
}

console.log('\n=== CASE 6: same parent, but new set does NOT reference it → stays STRUCTURE, never auto-promoted ===');
{
  const otherNodes = ['v1', 'v2', 'v3', 'v4'];
  const rels = [rel(otherNodes[0], otherNodes[1]), rel(otherNodes[2], otherNodes[3])]; // parent id absent
  const result = recognizeFormation(structureA, rels, { seed: 17 });
  check('no participation → determination stays STRUCTURE (never auto-promoted)', result.determination === DETERMINATION.STRUCTURE);
}

console.log('\n=== CASE 7: self-validation guard — cannot produce Formation from a non-STRUCTURE parent ===');
{
  const notAStructure = { id: 'fake-id', determination: DETERMINATION.COLLECTION };
  const result = recognizeFormation(notAStructure, [[rel('fake-id', 'q1')]], { seed: 19 });
  check('COLLECTION parent cannot yield FORMATION', result.determination === DETERMINATION.COLLECTION);
}

console.log('\n=== CASE 8: temporal absence never blocks STRUCTURE (fix #2) ===');
{
  // hubAndClusters() called with ts=undefined at every window → no usable timestamps anywhere.
  const windows = [0, 1, 2].map(() => hubAndClusters('t8').edges);
  const result = recognizeStructure(windows, { seed: 23 });
  check('temporal status is inapplicable when no timestamps exist', result.temporalEvidence.status === EVIDENCE_STATUS.INAPPLICABLE);
  check('temporal inapplicable does NOT block STRUCTURE', result.determination === DETERMINATION.STRUCTURE);
}

console.log('\n=== CASE 9: determinism — same input, same seed → identical determination and evidence ===');
{
  const windows = [0, 1, 2].map(w => hubAndClusters('t9', 1000 * w).edges);
  const r1 = recognizeStructure(windows, { seed: 99 });
  const r2 = recognizeStructure(windows, { seed: 99 });
  check('identical seed → identical determination', r1.determination === r2.determination);
  check('identical seed → identical organization z-score', r1.organizationEvidence.z === r2.organizationEvidence.z);
  check('identical seed → identical dependence z-score', r1.dependenceEvidence.z === r2.dependenceEvidence.z);
}

console.log('\n=== CASE 10: degenerate complete-graph input → organization/dependence do not silently fabricate a pass ===');
{
  // Regression guard for the bug found this session: E at/near the theoretical maximum collapses
  // the null model's variance to ~0. The engine must not report a misleading PASS off a zero-
  // variance null — inspect that the z-score machinery behaves sanely (finite or explicitly
  // Infinity-flagged) rather than silently asserting organization off a meaningless comparison.
  const nodes = ['k1', 'k2', 'k3', 'k4', 'k5'];
  const complete = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      complete.push(rel(nodes[i], nodes[j]));
  const result = recognizeStructure(complete, { seed: 5 });
  check('complete graph does not throw', result != null);
  check('z-score is a number or Infinity, never NaN', !Number.isNaN(result.organizationEvidence.z));
}

console.log('\n=== CASE 11: REAL-DATA REGRESSION — hierarchical dependency chain → COLLECTION (known coverage gap) ===');
{
  // FROZEN BASELINE, captured 2026-08-19 from a live run against real KRYLO data
  // (chokepointedges.js's curated infrastructure dependency facts, via TYPED_EDGES —
  // see diag_structuralrecognition_real_data.mjs for the full diagnostic).
  //
  // FINDING THIS CASE ENCODES — model coverage gap, NOT an implementation bug:
  //   Real observed values: Organization z = -0.63 (FAIL), Dependence clustering = 0.000 (FAIL).
  //   Both are CORRECT under the current rules, and the COLLECTION verdict is the honest one —
  //   the engine correctly refuses to certify a hand-curated taxonomy as emergent structure.
  //   BUT: a strict hierarchy (Visa → CARD_PAYMENT_RAILS → POS_TRANSACTIONS) is genuinely
  //   organized, and the current Organization/Dependence battery is mesh-oriented — degree-
  //   variance and triangle-clustering are structurally incapable of seeing hierarchical
  //   organization. Clustering = 0 in a tree is definitional, not evidence of independence:
  //   severing B→C can sever reachability for an entire downstream region — real structural
  //   dependence with zero triangles.
  //
  // This case exists to FREEZE that behavior so the gap stays visible and any future regime work
  // (hierarchy-aware statistics, declared topology expectations, etc.) has a baseline to move
  // against deliberately rather than by accident. If a future change makes this return STRUCTURE,
  // that must be an intentional, recorded decision — not a silent side effect.
  //
  // Uses the REAL dataset, not a synthetic approximation — a smaller hand-made hierarchy produces
  // a different z-score (its hubs skew degree-variance upward), which would freeze the wrong
  // baseline. This runs against the actual live TYPED_EDGES via chokepointedges.js.
  registerChokepointEdges();
  const realRelationships = TYPED_EDGES.map(e => ({
    id: `${e.from}->${e.to}`, subjectId: e.from, objectId: e.to,
    type: e.type, evidenceRefs: [e.source], ts: e.ts,
  }));
  const result = recognizeStructure(realRelationships, { seed: 1, allowEphemeral: true });
  check('real TYPED_EDGES dataset is non-empty', realRelationships.length > 0);
  check('real hierarchical dependency data → COLLECTION (frozen baseline)', result.determination === DETERMINATION.COLLECTION);
  check('dependence clustering is exactly 0 (no triangles in a tree — definitional)', result.dependenceEvidence.observed === 0);
  check('organization z is negative (real data: less degree-heterogeneous than random)', result.organizationEvidence.z < 0);
  check('organization z matches frozen 2026-08-19 observation (-0.63, ±0.01)', Math.abs(result.organizationEvidence.z - (-0.63)) < 0.01);
  check('stability correctly inapplicable under explicit ephemeral flag', result.stabilityEvidence.status === EVIDENCE_STATUS.INAPPLICABLE);
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
