// WO-2054 — CI-R Gate (Constitutional Validator)
// Structural admissibility gate for CI-F branch candidates.
// Answers one question per branch: "Can this hypothesis legitimately exist in this universe?"
//
// Boundary rules:
//   NO scoring — RBCS handles that
//   NO physics simulation — LFOS handles that
//   NO mutation of CI-F output — read-only consumer
//   Binary gate only: edgeLegal + temporalLegal (absolute) + anchorCoverage (graded floor)

import { getById } from './rkmstore.js';
import { DEFAULT_ONTOLOGY } from './cifengine.js';

// ── Named constant ────────────────────────────────────────────────────────────

export const ANCHOR_COVERAGE_FLOOR = 0.35;  // minimum RKM anchor ratio to pass; root cell excluded

// ── Predicate: edgeLegal ──────────────────────────────────────────────────────
// Checks every edge in the branch path against the ontology.
// One forbidden edge → false (absolute gate).

function checkEdgeLegal(path, ontology) {
  for (const cell of path) {
    for (const edge of cell.edges) {
      const fromCell = path.find(c => c.id === edge.from);
      const fromType = fromCell?.hypothesis?.objectType ?? null;
      const toType   = cell.hypothesis?.objectType ?? null;
      if (!ontology.isEdgePermitted(fromType, edge.type, toType)) return false;
    }
  }
  return true;
}

// ── Predicate: temporalLegal ──────────────────────────────────────────────────
// For adjacent cells where both have RKM-backed timestamps: cause must precede effect.
// Cells without realityObjectId are skipped (no timestamp available).

function checkTemporalLegal(path) {
  let lastTimestamp = null;

  for (const cell of path) {
    if (!cell.hypothesis?.realityObjectId) continue;  // skip unanchored cells

    const ro = getById(cell.hypothesis.realityObjectId);
    if (!ro?.observedAt) continue;

    const ts = new Date(ro.observedAt).getTime();

    if (lastTimestamp !== null && ts < lastTimestamp) {
      return false;  // effect precedes cause — temporal paradox
    }

    lastTimestamp = ts;
  }

  return true;
}

// ── Predicate: anchorCoverage ─────────────────────────────────────────────────
// Ratio of cells with a confirmed RKM RealityObject to total non-root cells.
// Root cell (depth 0) excluded — it represents the CI seed, not a reality object.

function computeAnchorCoverage(path) {
  const nonRootCells = path.filter(c => c.hopDepth > 0);
  if (nonRootCells.length === 0) return 0;

  const anchored = nonRootCells.filter(c => {
    if (!c.hypothesis?.realityObjectId) return false;
    return getById(c.hypothesis.realityObjectId) !== null;
  });

  return anchored.length / nonRootCells.length;
}

// ── Path reconstruction ───────────────────────────────────────────────────────

function resolvePath(terminalCellId, cellIndex) {
  const path    = [];
  let   current = cellIndex.get(terminalCellId);

  while (current) {
    path.unshift(current);
    const antecedentId = current.hypothesis?.antecedent;
    current = antecedentId ? cellIndex.get(antecedentId) ?? null : null;
  }

  return path;
}

// ── GroundedCausalBranch builder ──────────────────────────────────────────────

function buildGCB(branch, path, anchorCoverage) {
  const anchoredCells = path.filter(c => c.hopDepth > 0 && c.hypothesis?.realityObjectId);

  const resolvedEntities = anchoredCells.map(c => ({
    cellId:          c.id,
    realityObjectId: c.hypothesis.realityObjectId,
    objectType:      c.hypothesis.objectType,
    title:           getById(c.hypothesis.realityObjectId)?.title ?? null,
  }));

  const terminal     = path[path.length - 1];
  const epistemicU   = parseFloat((1 - (terminal?.confidenceMass ?? 0)).toFixed(3));
  const structuralU  = parseFloat((1 - anchorCoverage).toFixed(3));

  // Composite coherence — telemetry only; RBCS/LFOS/IB must NOT consume this
  const structuralCoherence = parseFloat(
    (0.33 + 0.33 + anchorCoverage * 0.34).toFixed(3)
    // edgeLegal=true + temporalLegal=true guaranteed at this point (only admitted branches reach here)
  );

  return {
    id:               `gcb_${branch.id}`,
    sourceCI:         branch.terminalCellId.split('_')[1] ?? '',  // seedCI extracted from cell ID
    hypothesis: {
      objectType:      terminal?.hypothesis?.objectType ?? null,
      domain:          terminal?.hypothesis?.domain ?? null,
      realityObjectId: terminal?.hypothesis?.realityObjectId ?? null,
      description:     terminal?.hypothesis?.description ?? '',
      antecedent:      terminal?.hypothesis?.antecedent ?? null,
      estimatedDelay:  null,
    },
    rkmAnchors:         anchoredCells.map(c => c.hypothesis.realityObjectId),
    resolvedEntities,
    normalizedStructure: {
      hopCount:        branch.hopCount,
      edgeSequence:    branch.edgeTypes,
      domainSequence:  branch.domainsReached,
      hasAmplification: branch.hasAmplification,
      crossDomainCount: branch.crossDomainCount,
    },
    edgeLegal:      true,   // guaranteed — only admitted branches reach builder
    temporalLegal:  true,   // guaranteed — only admitted branches reach builder
    anchorCoverage: parseFloat(anchorCoverage.toFixed(3)),
    uncertaintyBounds: {
      epistemic:  epistemicU,
      structural: structuralU,
    },
    structuralCoherence,   // TELEMETRY ONLY
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * validateGraph — apply CI-R gate to all branches in a CI_F_CausalGraph
 *
 * @param {object} graph    — CI_F_CausalGraph from cifengine.expandCI()
 * @param {object} ontology — injectable; defaults to DEFAULT_ONTOLOGY
 * @returns {{ admitted: GroundedCausalBranch[], rejected: RejectionRecord[] }}
 */
export function validateGraph(graph, ontology = DEFAULT_ONTOLOGY) {
  const cellIndex = new Map(graph.cells.map(c => [c.id, c]));
  const admitted  = [];
  const rejected  = [];

  for (const branch of graph.branches) {
    const path = resolvePath(branch.terminalCellId, cellIndex);

    if (path.length === 0) {
      rejected.push({ branchId: branch.id, reason: 'PATH_UNRESOLVABLE', predicate: null });
      continue;
    }

    // Predicate 1: edgeLegal (absolute)
    const edgeLegal = checkEdgeLegal(path, ontology);
    if (!edgeLegal) {
      rejected.push({ branchId: branch.id, reason: 'EDGE_ILLEGAL', predicate: 'edgeLegal' });
      continue;
    }

    // Predicate 2: temporalLegal (absolute)
    const temporalLegal = checkTemporalLegal(path);
    if (!temporalLegal) {
      rejected.push({ branchId: branch.id, reason: 'TEMPORAL_PARADOX', predicate: 'temporalLegal' });
      continue;
    }

    // Predicate 3: anchorCoverage (graded floor)
    const anchorCoverage = computeAnchorCoverage(path);
    if (anchorCoverage < ANCHOR_COVERAGE_FLOOR) {
      rejected.push({
        branchId:       branch.id,
        reason:         'INSUFFICIENT_ANCHOR',
        predicate:      'anchorCoverage',
        value:          parseFloat(anchorCoverage.toFixed(3)),
        floor:          ANCHOR_COVERAGE_FLOOR,
      });
      continue;
    }

    admitted.push(buildGCB(branch, path, anchorCoverage));
  }

  return { admitted, rejected };
}

export { DEFAULT_ONTOLOGY };
