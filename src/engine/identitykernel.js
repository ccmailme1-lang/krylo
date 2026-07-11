// WO-2004 — CanonicalEvent Identity Kernel
// Pure functional module. Not a service — provides functions that maintain identity invariants.
// CanonicalEvent = stable equivalence class over EvidenceGraphs under allowed transformations.
//
// Layer position:
//   surfacerouter.js (ingestion) → evidencetiers.js (descriptor) → identitykernel.js (identity)
//   → domaingravity.js (overlay) → structuralconfirmation.js (SCI)
//
// Boundary rules:
//   domainPressures attach POST-formation — never influence identity.
//   sci computed POST-formation — never influences merge/split.
//   epistemicClass from evidencetiers.js — set at ingestion, never recomputed.

import { getDescriptor, EPISTEMIC_CLASS, CANONICAL_ROLE } from './evidencetiers.js';
import { dispatch as dispatchLineage } from './identitylineage.js';

// ── Tier stability weights (proxy for anchorStrength without calibration dep) ──────────────
// Structural evidence stabilizes identity more than narrative.
// WO-2005B can override these via getAnchorStrength callback for precise values.
const TIER_STABILITY_WEIGHT = {
  [EPISTEMIC_CLASS.STRUCTURAL]:  0.90,
  [EPISTEMIC_CLASS.OPERATIONAL]: 0.70,
  [EPISTEMIC_CLASS.FINANCIAL]:   0.50,
  [EPISTEMIC_CLASS.NARRATIVE]:   0.25,
  [EPISTEMIC_CLASS.SPECULATIVE]: 0.10,
};

// T1 presence raises structural similarity threshold before merge is allowed.
const STRUCTURAL_SIMILARITY_BOOST = 0.15;

const DEFAULT_THRESHOLDS = {
  tau_structural: 0.60,    // base structural similarity floor for merge
  tau_temporal:   0.30,    // temporal overlap floor for merge
  theta_stability: 0.30,   // stability floor below which split fires
  delta_fragment:  0.55,   // fragmentation factor above which split fires
};

// ── Hash ──────────────────────────────────────────────────────────────────────

// Deterministic FNV-1a-32 hash — no crypto dependency, inspectable, auditable.
function fnv32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function computeVersionHash(nodes, edges) {
  const nodeStr = Array.from(nodes.keys()).sort().join('|');
  const edgeStr = edges.map(e => `${e.from}~${e.type}~${e.to}`).sort().join('|');
  return fnv32(nodeStr + '::' + edgeStr);
}

// ── Graph metrics ─────────────────────────────────────────────────────────────

function computeContinuityScore(nodes, edges, rootSeeds) {
  if (nodes.size === 0) return 0;
  if (!rootSeeds || rootSeeds.length === 0) return 0.5;
  // BFS from root seeds — fraction of nodes reachable = continuity
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const visited = new Set(rootSeeds);
  const queue   = [...rootSeeds];
  while (queue.length) {
    const curr = queue.shift();
    for (const next of (adj.get(curr) ?? [])) {
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return parseFloat((visited.size / nodes.size).toFixed(3));
}

function computeBranchingFactor(nodes, edges) {
  if (nodes.size === 0) return 0;
  const outDegree = new Map();
  for (const id of nodes.keys()) outDegree.set(id, 0);
  for (const e of edges) outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
  const total = Array.from(outDegree.values()).reduce((s, d) => s + d, 0);
  return parseFloat((total / nodes.size).toFixed(2));
}

// Fragmentation points: nodes with no predecessors other than rootSeeds
// (potential independent subgraphs that could split).
function findFragmentationPoints(nodes, edges, rootSeeds) {
  const inDegree = new Map();
  for (const id of nodes.keys()) inDegree.set(id, 0);
  for (const e of edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  const rootSet = new Set(rootSeeds ?? []);
  return Array.from(nodes.keys()).filter(id => !rootSet.has(id) && (inDegree.get(id) ?? 0) === 0);
}

// stabilityScore: weighted stability from node tier composition + continuity.
// Accepts optional getAnchorStrength(evidenceType) → number for precise calibration.
function computeStabilityScore(nodes, edges, rootSeeds, continuityScore, getAnchorStrength) {
  if (nodes.size === 0) return 0;
  let weightSum = 0;
  let stabilitySum = 0;
  for (const node of nodes.values()) {
    const descriptor = getDescriptor(node.evidenceType);
    const tierWeight = descriptor ? (TIER_STABILITY_WEIGHT[descriptor.epistemicClass] ?? 0.25) : 0.25;
    const anchor     = getAnchorStrength ? (getAnchorStrength(node.evidenceType) ?? tierWeight) : tierWeight;
    // Squared anchor: high-anchor nodes disproportionately stabilize the graph
    stabilitySum += anchor * anchor;
    weightSum    += anchor;
  }
  const nodeStability  = weightSum > 0 ? stabilitySum / weightSum : 0;
  const stabilityScore = nodeStability * (continuityScore ?? 1);
  return parseFloat(Math.min(1, stabilityScore).toFixed(3));
}

// ── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(nodes, edges, rootSeeds, getAnchorStrength) {
  const continuityScore      = computeContinuityScore(nodes, edges, rootSeeds);
  const branchingFactor      = computeBranchingFactor(nodes, edges);
  const fragmentationPoints  = findFragmentationPoints(nodes, edges, rootSeeds);
  const stabilityScore       = computeStabilityScore(nodes, edges, rootSeeds, continuityScore, getAnchorStrength);
  const versionHash          = computeVersionHash(nodes, edges);
  // structuralBurdenScore placeholder — populated by structuralconfirmation.js post-formation
  return {
    nodes,
    edges,
    rootSeeds: rootSeeds ?? [],
    versionHash,
    continuityScore,
    branchingFactor,
    fragmentationPoints,
    stabilityScore,
    structuralBurdenScore: 0,   // filled by WO-2005B
  };
}

// ── EvidenceNode factory ──────────────────────────────────────────────────────

export function createEvidenceNode({
  id,
  seedId,
  evidenceType,
  content     = '',
  metadata    = {},
  predecessorIds = [],
  successorIds   = [],
  timestamp   = new Date(),
}) {
  const descriptor = getDescriptor(evidenceType);
  return {
    id:             id ?? crypto.randomUUID(),
    seedId:         seedId ?? id ?? crypto.randomUUID(),
    timestamp,
    content,
    metadata,
    predecessorIds,
    successorIds,
    evidenceType,
    // Intrinsic epistemic properties from WO-2005A — set at creation, never recomputed
    epistemicClass:  descriptor?.epistemicClass  ?? EPISTEMIC_CLASS.NARRATIVE,
    canonicalRole:   descriptor?.canonicalRole   ?? CANONICAL_ROLE.STATE_TRANSITION,
    persistence:     descriptor?.persistence     ?? 'SHORT',
    decayModel:      descriptor?.decayModel      ?? 'EXPONENTIAL',
    canCreate:       descriptor?.canCreateCanonicalEvent     ?? false,
    canStrengthen:   descriptor?.canStrengthenCanonicalEvent ?? true,
    canSplit:        descriptor?.canSplitCanonicalEvent      ?? false,
  };
}

// ── CanonicalEvent factory ─────────────────────────────────────────────────────

export function createCanonicalEvent({
  nodes       = new Map(),
  edges       = [],
  rootSeeds   = [],
  identityId,
  lineageRoot,
  timeWindow  = { start: new Date(), end: null },
  getAnchorStrength,
} = {}) {
  const graph  = buildGraph(nodes, edges, rootSeeds, getAnchorStrength);
  const event  = {
    identityId:         identityId ?? crypto.randomUUID(),
    currentVersionHash: graph.versionHash,
    evidenceGraph:      graph,
    timeWindow,
    structuralSignature: {
      graphHash:       graph.versionHash,
      temporalWaveform: fnv32(timeWindow.start.toISOString()),
    },
    status:       'ACTIVE',
    lineageRoot:  lineageRoot ?? (rootSeeds[0] ?? null),
    metadata:     {},   // domainPressures + SCI attached post-formation
  };
  dispatchLineage({ type: 'CREATED', identityId: event.identityId, trigger: 'INIT', stabilityBefore: 0, stabilityAfter: graph.stabilityScore });
  return event;
}

// ── Structural similarity ─────────────────────────────────────────────────────

// Jaccard similarity on evidenceType sets — fast, inspectable, no ML.
function computeStructuralSimilarity(graphA, graphB) {
  const typesA = new Set(Array.from(graphA.nodes.values()).map(n => n.evidenceType));
  const typesB = new Set(Array.from(graphB.nodes.values()).map(n => n.evidenceType));
  const intersection = [...typesA].filter(t => typesB.has(t)).length;
  const union        = new Set([...typesA, ...typesB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

// Temporal overlap [0–1] normalized to the longer span.
function computeTemporalOverlap(eventA, eventB) {
  const now = Date.now();
  const sA  = eventA.timeWindow.start.getTime?.() ?? eventA.timeWindow.start;
  const eA  = (eventA.timeWindow.end?.getTime?.() ?? eventA.timeWindow.end) ?? now;
  const sB  = eventB.timeWindow.start.getTime?.() ?? eventB.timeWindow.start;
  const eB  = (eventB.timeWindow.end?.getTime?.() ?? eventB.timeWindow.end) ?? now;
  const overlapStart = Math.max(sA, sB);
  const overlapEnd   = Math.min(eA, eB);
  if (overlapEnd <= overlapStart) return 0;
  const spanMax = Math.max(eA - sA, eB - sB);
  if (spanMax === 0) return 1;
  return (overlapEnd - overlapStart) / spanMax;
}

function hasStructuralNodes(event) {
  return Array.from(event.evidenceGraph.nodes.values())
    .some(n => n.epistemicClass === EPISTEMIC_CLASS.STRUCTURAL);
}

// ── Merge / Split ─────────────────────────────────────────────────────────────

export function shouldMerge(eventA, eventB, thresholds = DEFAULT_THRESHOLDS) {
  const structuralFloor = (hasStructuralNodes(eventA) || hasStructuralNodes(eventB))
    ? Math.min(thresholds.tau_structural + STRUCTURAL_SIMILARITY_BOOST, 0.90)
    : thresholds.tau_structural;

  const sim = computeStructuralSimilarity(eventA.evidenceGraph, eventB.evidenceGraph);
  if (sim <= structuralFloor) return false;

  const overlap = computeTemporalOverlap(eventA, eventB);
  if (overlap <= thresholds.tau_temporal) return false;

  // Merged stability approximation: weighted average by node count
  const nA = eventA.evidenceGraph.nodes.size;
  const nB = eventB.evidenceGraph.nodes.size;
  const mergedStability = nA + nB > 0
    ? (eventA.evidenceGraph.stabilityScore * nA + eventB.evidenceGraph.stabilityScore * nB) / (nA + nB)
    : 0;
  const minStability = Math.min(eventA.evidenceGraph.stabilityScore, eventB.evidenceGraph.stabilityScore);
  if (mergedStability < minStability) return false;

  return true;
}

export function shouldSplit(event, thresholds = DEFAULT_THRESHOLDS) {
  const g = event.evidenceGraph;
  if (g.stabilityScore < thresholds.theta_stability) return true;
  const fragmentationFactor = g.fragmentationPoints.length / Math.max(1, g.nodes.size);
  if (fragmentationFactor > thresholds.delta_fragment) return true;
  return false;
}

// ── Mutations (immutable — return new event) ──────────────────────────────────

export function addNode(event, node, newEdges = [], getAnchorStrength) {
  const stabilityBefore = event.evidenceGraph.stabilityScore;
  const newNodes = new Map(event.evidenceGraph.nodes);
  newNodes.set(node.id, node);
  const allEdges = [...event.evidenceGraph.edges, ...newEdges];
  const graph    = buildGraph(newNodes, allEdges, event.evidenceGraph.rootSeeds, getAnchorStrength);
  const nodeTs   = node.timestamp?.getTime?.() ?? node.timestamp ?? 0;
  const eventEnd = event.timeWindow.end?.getTime?.() ?? event.timeWindow.end ?? 0;
  const updated  = {
    ...event,
    currentVersionHash: graph.versionHash,
    evidenceGraph:      graph,
    structuralSignature: {
      graphHash:       graph.versionHash,
      temporalWaveform: event.structuralSignature.temporalWaveform,
    },
    timeWindow: {
      start: event.timeWindow.start,
      end:   nodeTs > eventEnd ? node.timestamp : event.timeWindow.end,
    },
  };
  dispatchLineage({ type: 'NODE_ADDED', identityId: event.identityId, trigger: node.id, stabilityBefore, stabilityAfter: graph.stabilityScore });
  return updated;
}

export function mergeEvents(eventA, eventB, getAnchorStrength) {
  const stabilityBefore = (eventA.evidenceGraph.stabilityScore + eventB.evidenceGraph.stabilityScore) / 2;
  const mergedNodes = new Map([...eventA.evidenceGraph.nodes, ...eventB.evidenceGraph.nodes]);
  const mergedEdges = [...eventA.evidenceGraph.edges, ...eventB.evidenceGraph.edges];
  const rootSeeds   = [...new Set([...eventA.evidenceGraph.rootSeeds, ...eventB.evidenceGraph.rootSeeds])];
  const graph       = buildGraph(mergedNodes, mergedEdges, rootSeeds, getAnchorStrength);
  const startA = eventA.timeWindow.start?.getTime?.() ?? eventA.timeWindow.start ?? 0;
  const startB = eventB.timeWindow.start?.getTime?.() ?? eventB.timeWindow.start ?? 0;
  const endA   = eventA.timeWindow.end?.getTime?.() ?? eventA.timeWindow.end ?? 0;
  const endB   = eventB.timeWindow.end?.getTime?.() ?? eventB.timeWindow.end ?? 0;
  const merged = {
    ...eventA,
    currentVersionHash: graph.versionHash,
    evidenceGraph:      graph,
    structuralSignature: { graphHash: graph.versionHash, temporalWaveform: eventA.structuralSignature.temporalWaveform },
    timeWindow: {
      start: startA <= startB ? eventA.timeWindow.start : eventB.timeWindow.start,
      end:   endA >= endB     ? eventA.timeWindow.end   : eventB.timeWindow.end,
    },
    status: 'ACTIVE',
    metadata: { ...eventA.metadata, ...eventB.metadata },
  };
  dispatchLineage({ type: 'MERGED', identityId: merged.identityId, trigger: [eventA.identityId, eventB.identityId], stabilityBefore, stabilityAfter: graph.stabilityScore });
  return merged;
}

// ── Identity resolution pass ──────────────────────────────────────────────────
// Runs merge/split over an array of CanonicalEvents.
// Returns { events: CanonicalEvent[], merges: string[][], splits: string[] }

export function resolveIdentity(events, thresholds = DEFAULT_THRESHOLDS, getAnchorStrength) {
  const log = { merges: [], splits: [] };
  let working = [...events];

  // Split pass first — fragmented events can't merge cleanly
  working = working.map(event => {
    if (shouldSplit(event, thresholds)) {
      log.splits.push(event.identityId);
      const trigger = event.evidenceGraph.stabilityScore < thresholds.theta_stability
        ? 'LOW_STABILITY' : 'FRAGMENTATION';
      dispatchLineage({ type: 'FRAGMENTED', identityId: event.identityId, trigger, stabilityBefore: event.evidenceGraph.stabilityScore, stabilityAfter: event.evidenceGraph.stabilityScore });
      return { ...event, status: 'FRAGMENTED' };
    }
    return event;
  });

  // Merge pass — O(n²) over active events; acceptable at current scale
  const merged = new Set();
  const output = [];
  for (let i = 0; i < working.length; i++) {
    if (merged.has(i)) continue;
    let current = working[i];
    for (let j = i + 1; j < working.length; j++) {
      if (merged.has(j)) continue;
      if (current.status !== 'ACTIVE' || working[j].status !== 'ACTIVE') continue;
      if (shouldMerge(current, working[j], thresholds)) {
        log.merges.push([current.identityId, working[j].identityId]);
        current = mergeEvents(current, working[j], getAnchorStrength);
        merged.add(j);
      }
    }
    output.push(current);
  }

  return { events: output, ...log };
}

// ── Attach post-formation metadata ────────────────────────────────────────────

export function attachDomainPressures(event, domainPressures) {
  return { ...event, metadata: { ...event.metadata, domainPressures } };
}

export function attachSCI(event, sci) {
  return { ...event, metadata: { ...event.metadata, structuralConfirmationIndex: sci } };
}
