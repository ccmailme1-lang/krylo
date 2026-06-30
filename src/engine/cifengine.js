// WO-2053 — CI-F Engine (Causal Expansion System)
// Bounded causal expansion: transforms a ChangeItem into a CI_F_CausalGraph
// by traversing RKM genealogy relationships under strict energy/depth/ontology/cycle constraints.
//
// Boundary rules:
//   NO scoring — RBCS handles that
//   NO structural validation beyond ontology permission — CI-R handles that
//   NO grounding decisions — RKM is read-only; expansion is speculative
//   NO dispatch — output is consumed by CI-R pipeline, not surfacerouter

import { listAll } from './rkmstore.js';

// ── Named constants ───────────────────────────────────────────────────────────

export const EXPANSION_FLOOR         = 0.15;  // minimum confidenceMass to spawn children
export const MAX_EXPANSION_DEPTH     = 5;     // maximum hops from seed CI root
export const DOMAIN_CROSSING_PENALTY = 0.85;  // multiplied when edge crosses domain boundary

// Edge type decay rates — AMPLIFIES propagates best; ATTENUATES decays fastest
export const EDGE_TYPE_DECAY = {
  AMPLIFIES:  0.85,
  DEPENDS_ON: 0.75,
  TRIGGERS:   0.70,
  ATTENUATES: 0.55,
};

// ── Genealogy → LFOS edge type mapping ───────────────────────────────────────
// RKM genealogy fields encode known causal relationships; CI-F expands along them.

const GENEALOGY_EDGE_MAP = {
  causes:    'TRIGGERS',
  enables:   'AMPLIFIES',
  dependsOn: 'DEPENDS_ON',
  causedBy:  'ATTENUATES',
};

// ── Default ontology ──────────────────────────────────────────────────────────
// Injectable — pass custom ontology to expandCI() to override.

export const DEFAULT_ONTOLOGY = {
  isEdgePermitted(fromType, edgeType, _toType) {
    // CONSTRAINT cannot amplify or attenuate directly
    if (fromType === 'CONSTRAINT' && (edgeType === 'AMPLIFIES' || edgeType === 'ATTENUATES')) return false;
    return true;
  },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function normalizeConfidence(raw) {
  if (typeof raw !== 'number') return 0.85;
  return raw > 1 ? raw / 100 : raw;
}

function computeChildMass(parentMass, edgeType, crossesDomain) {
  const decay   = EDGE_TYPE_DECAY[edgeType] ?? EDGE_TYPE_DECAY.DEPENDS_ON;
  const penalty = crossesDomain ? DOMAIN_CROSSING_PENALTY : 1.0;
  return parentMass * decay * penalty;
}

function makeCellId(seedCIId, depth, idx) {
  return `cif_${seedCIId}_d${depth}_n${idx}`;
}

// ── Recursive expansion ───────────────────────────────────────────────────────
// Expands parentCell by following genealogy relationships on the given RealityObject.

function expandFromRO(ro, parentCell, seedCIId, rkmIndex, ontology, depth, counter, allCells, allEdges) {
  for (const [genealogyField, edgeType] of Object.entries(GENEALOGY_EDGE_MAP)) {
    const relatedIds = ro.genealogy?.[genealogyField] ?? [];

    for (const relatedId of relatedIds) {
      const relatedRO = rkmIndex.get(relatedId);
      if (!relatedRO) continue;

      // Hard stop: cycle detection
      if (parentCell.lineageTrace.includes(relatedId)) continue;

      // Ontology gate
      if (!ontology.isEdgePermitted(ro.objectType, edgeType, relatedRO.objectType)) continue;

      const crossesDomain = (relatedRO.metadata?.domain ?? null) !== (ro.metadata?.domain ?? null);
      const childMass     = computeChildMass(parentCell.confidenceMass, edgeType, crossesDomain);

      // Hard stop: energy floor
      if (childMass < EXPANSION_FLOOR) continue;

      const childId   = makeCellId(seedCIId, depth, counter.value++);
      const childCell = {
        id:            childId,
        seedCI:        seedCIId,
        hypothesis: {
          objectType:      relatedRO.objectType,
          domain:          relatedRO.metadata?.domain ?? null,
          realityObjectId: relatedId,
          description:     `${edgeType}: ${ro.title ?? ro.id} → ${relatedRO.title ?? relatedId}`,
          antecedent:      parentCell.id,
          estimatedDelay:  null,
        },
        confidenceMass: childMass,
        hopDepth:       depth,
        lineageTrace:   [...parentCell.lineageTrace, relatedId],
        edges: [{
          from:   parentCell.id,
          to:     childId,
          type:   edgeType,
          weight: EDGE_TYPE_DECAY[edgeType] ?? EDGE_TYPE_DECAY.DEPENDS_ON,
          delay:  null,
        }],
        children:   [],
        terminated: false,
      };

      parentCell.children.push(childCell);
      allCells.push(childCell);
      allEdges.push(...childCell.edges);

      // Hard stop: depth cap (cell recorded, no further expansion)
      if (depth >= MAX_EXPANSION_DEPTH) {
        childCell.terminated = true;
        continue;
      }

      expandFromRO(relatedRO, childCell, seedCIId, rkmIndex, ontology, depth + 1, counter, allCells, allEdges);

      // Hard stop: ontological dead end (no children generated)
      if (childCell.children.length === 0) childCell.terminated = true;
    }
  }
}

// ── Branch extraction ─────────────────────────────────────────────────────────
// A branch = path from root to a terminal cell. Pre-RBCS scoring format.

function extractBranches(allCells) {
  return allCells
    .filter(c => c.terminated)
    .map(terminal => {
      const domains    = new Set();
      const edgeTypes  = [];
      let   current    = terminal;

      while (current) {
        if (current.hypothesis.domain) domains.add(current.hypothesis.domain);
        if (current.edges[0]?.type) edgeTypes.push(current.edges[0].type);
        const antecedentId = current.hypothesis.antecedent;
        current = antecedentId ? allCells.find(c => c.id === antecedentId) ?? null : null;
      }

      edgeTypes.reverse();
      const hasAmplification = edgeTypes.includes('AMPLIFIES');

      return {
        id:               `branch_${terminal.id}`,
        terminalCellId:   terminal.id,
        hopCount:         terminal.hopDepth,
        terminalMass:     terminal.confidenceMass,
        edgeTypes,
        domainsReached:   Array.from(domains),
        crossDomainCount: domains.size,
        hasAmplification,
      };
    });
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * expandCI — transform a ChangeItem into a CI_F_CausalGraph
 *
 * @param {object} ci       — ChangeItem (from Signal Stabilization / Hybrid Engine)
 * @param {object} ontology — injectable; defaults to DEFAULT_ONTOLOGY
 * @returns {object}        — CI_F_CausalGraph
 */
export function expandCI(ci, ontology = DEFAULT_ONTOLOGY) {
  const rkmObjects = listAll();
  const rkmIndex   = new Map(rkmObjects.map(ro => [ro.id, ro]));
  const seedMass   = normalizeConfidence(ci.confidence);
  const counter    = { value: 1 };

  const rootCell = {
    id:            makeCellId(ci.id, 0, 0),
    seedCI:        ci.id,
    hypothesis: {
      objectType:      null,
      domain:          null,
      realityObjectId: null,
      description:     `Seed: ${ci.signalType ?? 'UNKNOWN'} / ${ci.sourceType ?? 'UNKNOWN'}`,
      antecedent:      null,
      estimatedDelay:  0,
    },
    confidenceMass: seedMass,
    hopDepth:       0,
    lineageTrace:   [],
    edges:          [],
    children:       [],
    terminated:     false,
  };

  const allCells = [rootCell];
  const allEdges = [];

  // Resolve anchor RealityObjects from entityHints, then fallback to source match
  const hints   = ci.entityHints ?? [];
  const anchors = hints.length > 0
    ? rkmObjects.filter(ro =>
        hints.some(h => ro.title?.includes(h) || ro.metadata?.entityName === h)
      )
    : rkmObjects
        .filter(ro => ro.metadata?.source === ci.sourceType)
        .sort((a, b) => (b.ingestedAt ?? '').localeCompare(a.ingestedAt ?? ''))
        .slice(0, 3);

  if (anchors.length === 0) {
    // No RKM contact — zero-branch graph (CI-R will gate on anchorCoverage=0)
    rootCell.terminated = true;
  } else {
    for (const anchor of anchors) {
      if (rootCell.lineageTrace.includes(anchor.id)) continue;

      const anchorMass = computeChildMass(seedMass, 'DEPENDS_ON', false);
      if (anchorMass < EXPANSION_FLOOR) continue;

      const anchorId   = makeCellId(ci.id, 1, counter.value++);
      const anchorCell = {
        id:            anchorId,
        seedCI:        ci.id,
        hypothesis: {
          objectType:      anchor.objectType,
          domain:          anchor.metadata?.domain ?? null,
          realityObjectId: anchor.id,
          description:     `Anchor: ${anchor.title ?? anchor.id}`,
          antecedent:      rootCell.id,
          estimatedDelay:  null,
        },
        confidenceMass: anchorMass,
        hopDepth:       1,
        lineageTrace:   [anchor.id],
        edges: [{
          from:   rootCell.id,
          to:     anchorId,
          type:   'DEPENDS_ON',
          weight: EDGE_TYPE_DECAY.DEPENDS_ON,
          delay:  null,
        }],
        children:   [],
        terminated: false,
      };

      rootCell.children.push(anchorCell);
      allCells.push(anchorCell);
      allEdges.push(...anchorCell.edges);

      if (anchorCell.hopDepth < MAX_EXPANSION_DEPTH) {
        expandFromRO(anchor, anchorCell, ci.id, rkmIndex, ontology, 2, counter, allCells, allEdges);
      }

      if (anchorCell.children.length === 0) anchorCell.terminated = true;
    }

    if (rootCell.children.length === 0) rootCell.terminated = true;
  }

  const branches = extractBranches(allCells);

  return {
    seedCI:          ci.id,
    rootCell,
    cells:           allCells,
    edges:           allEdges,
    branches,
    expandedAt:      Date.now(),
    totalCells:      allCells.length,
    terminatedCells: allCells.filter(c => c.terminated).length,
    branchCount:     branches.length,
  };
}
