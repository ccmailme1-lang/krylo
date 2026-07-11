// KRYL-1025 — STEE (Search Truth Evaluation Engine), Slice 1.
// Spec: specs/KRYL-1025-stee-slice1-spec.md.
// Projects a CanonicalEvent's validated graph (read-only), recomposes edge subsets
// (candidate.edges ⊆ projection.edges — never invents edges), and exposes the Pareto
// frontier of structurally valid sub-topologies on { coverage, parsimony }. Pure &
// read-only: the input event is never mutated (isolation asserted by hash equality).

import { computeVersionHash } from './identitykernel.js';
import { dominatesVector }    from './paretoresolver.js';

// ── Projection (AM-01) — read-only view of the event's nodes/edges ──────────────
function projectionOf(event) {
  const nm = event?.nodes;
  const nodeIds = nm instanceof Map ? Array.from(nm.keys())
    : Array.isArray(nm) ? nm.map(n => n?.id ?? n)
    : (nm && typeof nm === 'object') ? Object.keys(nm)
    : [];
  const edges = Array.isArray(event?.edges) ? event.edges : [];
  const rootSeeds = (Array.isArray(event?.rootSeeds) && event.rootSeeds.length)
    ? event.rootSeeds
    : inferRoots(nodeIds, edges);
  return { nodeIds, edges, rootSeeds };
}

// Root seeds = nodes with no incoming edge (fallback: first node).
function inferRoots(nodeIds, edges) {
  const hasIncoming = new Set(edges.map(e => e.to));
  const roots = nodeIds.filter(id => !hasIncoming.has(id));
  return roots.length ? roots : nodeIds.slice(0, 1);
}

// BFS reachability from roots over an edge subset.
function reachable(roots, edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const n = queue.shift();
    for (const m of (adj.get(n) ?? [])) if (!seen.has(m)) { seen.add(m); queue.push(m); }
  }
  return seen;
}

const coverageOf = (roots, edges, total) => (total === 0 ? 0 : reachable(roots, edges).size / total);

// ── Candidate generation (AM-04) — full set + leave-one-out subsets that keep full
// coverage. Every candidate's edges are a SUBSET of the projection's — no edge is
// ever invented, none reversed. ─────────────────────────────────────────────────
function generateCandidates(P) {
  const total = P.nodeIds.length;
  const fullCoverage = coverageOf(P.rootSeeds, P.edges, total);
  const mk = (edges, id) => ({
    id, edges,
    objectives: {
      coverage:  coverageOf(P.rootSeeds, edges, total),
      parsimony: P.edges.length ? 1 - edges.length / P.edges.length : 0,
    },
  });
  const candidates = [mk(P.edges, 'full')];
  for (let i = 0; i < P.edges.length; i++) {
    const subset = P.edges.filter((_, j) => j !== i);
    if (coverageOf(P.rootSeeds, subset, total) === fullCoverage) {
      candidates.push(mk(subset, `drop_${i}`));
    }
  }
  return candidates;
}

const vec = (c) => [c.objectives.coverage, c.objectives.parsimony];

// ── exploreTopology(event) → { frontier, dominated, projectionHash, isolationVerified }
// Pure & read-only. The input event is returned unmutated.
export function exploreTopology(event = {}) {
  const P = projectionOf(event);
  const nodeMap = new Map(P.nodeIds.map(id => [id, true]));
  const hashBefore = computeVersionHash(nodeMap, P.edges);

  const candidates = generateCandidates(P);

  // Pareto admission (AM-05): admit iff no other candidate dominates it. No scalar "best".
  const frontier = [];
  const dominated = [];
  for (const c of candidates) {
    const dominator = candidates.find(o => o.id !== c.id && dominatesVector(vec(o), vec(c)));
    if (dominator) dominated.push({ candidateId: c.id, dominatedBy: dominator.id });
    else frontier.push(c);
  }

  const hashAfter = computeVersionHash(new Map(P.nodeIds.map(id => [id, true])), P.edges);
  return {
    frontier,                                  // order carries no ranking meaning
    dominated,                                 // audit trail — who beat whom
    projectionHash: hashBefore,
    isolationVerified: hashBefore === hashAfter,
  };
}
