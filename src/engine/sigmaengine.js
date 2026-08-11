// sigmaengine.js — KRYL-Lean-Ontology M3: Structure Engine (Σ)
//
// Constructs Σ = ⟨G_Σ = (V_Σ, E_Σ), props_Σ, π_Σ⟩ — the confirmed gap from audit 002.
// WO-2005B (structuralconfirmation.js) is REUSED here as a metrics producer for props_Σ,
// not duplicated: audit 002 established that WO-2005B never reads evidenceGraph.edges and
// never constructs a graph — this module is what actually builds V_Σ/E_Σ from real O/R
// data (via gwrealiser.js), then folds WO-2005B's scores in as properties ABOUT the
// structure, not as the structure itself. That distinction is the audit's core finding
// and this file is built to preserve it, not collapse it.
//
// πΣ discipline (memo 006): every vertex/edge/property is linked to real evidence AS it
// is built, not after the fact, and the domain of evidence is strictly E∪R — an O vertex
// is never its own evidence (O is not in the Lean evidence domain), it is evidenced by
// the R edge(s) that reference it. An E vertex IS a legitimate evidence element and can
// serve as its own evidence for its own inclusion.

import { connectedSubgraph } from './gwrealiser.js';
import { computeSCI as computeSCIConfirmation, computeStructuralDivergence } from './structuralconfirmation.js';
import { ProvenanceDAG } from './causalos/provenance.js';

/**
 * buildStructure({ sigmaId, snapshot, seedId, maxDegrees, evidenceGraph, provenanceDAG })
 *   → Σ object, or null if snapshot/sigmaId missing.
 *
 * snapshot: a realiseSnapshot() output (gwrealiser.js) — the G_W this Σ is drawn from.
 * seedId: vertex to grow the connected subgraph from (rc3 §7 — Σ consumes C ⊆ G_W, not
 *   the whole graph). If omitted, the entire snapshot is used as C (caller's choice —
 *   this function does not force scoping that wasn't asked for).
 * evidenceGraph: optional WO-2004-shaped {nodes: Map} object. When supplied, WO-2005B's
 *   computeSCI/computeStructuralDivergence run against it and their output becomes
 *   props_Σ, each linked to the real EvidenceNode ids that produced it. When omitted,
 *   props_Σ stays empty rather than fabricating a score with nothing behind it (§22).
 * provenanceDAG: an existing ProvenanceDAG to accumulate links into, or a new one is
 *   created. Passing an existing DAG lets multiple Σ objects share one provenance store.
 *
 * Returns: { sigmaId, vertices: V_Σ, edges: E_Σ, props: props_Σ, traceable: boolean,
 * provenanceDAG }. `traceable` is the literal rc3 Traceability Invariant, checked at
 * construction time via the DAG's isFullyTraceable() — not asserted, verified.
 */
export function buildStructure({ sigmaId, snapshot, seedId, maxDegrees = 6, evidenceGraph = null, provenanceDAG = null } = {}) {
  if (!sigmaId || !snapshot) return null;

  const dag = provenanceDAG ?? new ProvenanceDAG();
  const C = seedId
    ? connectedSubgraph(snapshot, seedId, maxDegrees)
    : { vertices: snapshot.vertices, edges: snapshot.edges };

  const V_Sigma = [];
  for (const [id, v] of C.vertices) {
    V_Sigma.push({ id, kind: v.kind });
    if (v.kind === 'E' && v.ref?.identityId) {
      // E is a legitimate member of the Lean evidence domain (E∪R) — it can be its own
      // evidence for its own inclusion in the structure.
      dag.linkEvidence(v.ref.identityId, sigmaId, 'vertex', id);
    }
    // O-kind vertices are NOT in E∪R — they are never self-evidenced. They get linked
    // below, via the R edges that reference them (gwrealiser.js only ever admits an O
    // vertex into a snapshot via an edge, so every O vertex here has at least one).
  }

  const E_Sigma = [];
  for (const e of C.edges) {
    const edgeId = `${e.from}|${e.type}|${e.to}|${e.ts}`;
    E_Sigma.push({
      id: edgeId, from: e.from, to: e.to, type: e.type,
      source: e.source, validFrom: e.validFrom, validTo: e.validTo,
    });
    // The edge is itself an R element — real evidence for its own inclusion in E_Σ,
    // and for both endpoint O vertices' presence in V_Σ.
    dag.linkEvidence(edgeId, sigmaId, 'edge', edgeId);
    dag.linkEvidence(edgeId, sigmaId, 'vertex', e.from);
    dag.linkEvidence(edgeId, sigmaId, 'vertex', e.to);
  }

  const props_Sigma = {};
  if (evidenceGraph?.nodes?.size) {
    const evidenceIds = [...evidenceGraph.nodes.values()].map(n => n.id).filter(Boolean);

    const confirmation = computeSCIConfirmation(evidenceGraph);
    if (confirmation) {
      // Aliased per the SCI-CONTRADICTION/SCI-CONFIRMATION naming-collision note
      // (audits 001/002/005) — never stored under the bare name "sci".
      props_Sigma.sciConfirmation = confirmation;
      for (const evId of evidenceIds) dag.linkEvidence(evId, sigmaId, 'property', 'sciConfirmation');
    }

    const divergence = computeStructuralDivergence(evidenceGraph);
    if (divergence) {
      props_Sigma.structuralDivergence = divergence;
      for (const evId of evidenceIds) dag.linkEvidence(evId, sigmaId, 'property', 'structuralDivergence');
    }
  }

  const elementsToCheck = [
    ...V_Sigma.map(v => ({ elementType: 'vertex', elementId: v.id })),
    ...E_Sigma.map(e => ({ elementType: 'edge', elementId: e.id })),
    ...Object.keys(props_Sigma).map(p => ({ elementType: 'property', elementId: p })),
  ];

  return {
    sigmaId,
    vertices: V_Sigma,
    edges: E_Sigma,
    props: props_Sigma,
    traceable: dag.isFullyTraceable(sigmaId, elementsToCheck),
    provenanceDAG: dag,
  };
}
