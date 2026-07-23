// WO-2057 — IB Collapse Engine (Interpretation Boundary)
// The seam between Leverage Physics (LFOS) and Decision Framework.
// Four operations only: filter → rank → cap → emit.
//
// Boundary rules:
//   NO graph artifacts cross this boundary — DecisionCandidate carries only scalars + trace IDs
//   NO scoring or physics — collapsedScore is a synthetic ordering heuristic, not truth
//   NO interpretation — Decision Framework owns intent and lens context
//   ONLY: filter(IB_SURVIVAL_FLOOR) → rank(collapsedScore) → cap(IB_TOP_N) → emit DecisionCandidate[]
//
// collapsedScore = rbcsScore × survivalProbability × propagationStability
// intentScore    = collapsedScore × lensRelevanceScore  (computed downstream in WO-2059)
// Neither feeds back upstream. RBCS/LFOS scores are immutable after commit.

// ── Named constants ───────────────────────────────────────────────────────────

export const IB_SURVIVAL_FLOOR = 0.30;  // minimum survivalProbability to enter decision space
export const IB_TOP_N          = 10;    // maximum DecisionCandidates emitted per CI

// ── collapsedScore ────────────────────────────────────────────────────────────
// Synthetic ordering heuristic. Weak leg craters score — same geometric property as RBCS.
// MULTIPLICATIVE only. Weighted-average/additive variants forbidden.

function computeCollapsedScore(rbcsScore, survivalProbability, propagationStability) {
  return parseFloat((rbcsScore * survivalProbability * propagationStability).toFixed(4));
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * collapseToDecisionCandidates — filter, rank, cap LFOSValidatedCandidates
 *
 * @param {object} lfosValidated — LFOSValidatedCandidates from lfosengine.simulatePropagation()
 * @returns {object}             — IBCollapseResult
 *
 * DecisionCandidate carries NO graph artifacts (no cells, edges, branches, GCBs).
 * Decision Framework receives typed scalars + trace IDs only.
 */
export function collapseToDecisionCandidates(lfosValidated) {
  const { sourceCI, candidates } = lfosValidated;
  const admitted  = [];
  const rejected  = [];

  // ── Step 1: Filter — survivalProbability >= IB_SURVIVAL_FLOOR ────────────
  for (const v of candidates) {
    if (v.survivalProbability < IB_SURVIVAL_FLOOR) {
      rejected.push({
        branchId:           v.branchId,
        reason:             'BELOW_SURVIVAL_FLOOR',
        survivalProbability: v.survivalProbability,
        floor:              IB_SURVIVAL_FLOOR,
      });
    } else {
      admitted.push(v);
    }
  }

  // ── Step 2: Rank — descending by collapsedScore, deterministic tie-break ───
  // KRYL-1105 (G-F): on equal collapsedScore, order previously fell back to input
  // arrival order — non-deterministic across runs. Secondary key = ascending branchId
  // (raw code-point compare, locale-independent) gives a total order: identical input
  // → identical ranking every run. collapsedScore is already rounded to 4dp, so equal
  // to 4dp is a true tie. branchId is the stable trace identity — no new hash needed.
  admitted.sort((a, b) => {
    const sb = computeCollapsedScore(b.rbcsScore, b.survivalProbability, b.propagationStability);
    const sa = computeCollapsedScore(a.rbcsScore, a.survivalProbability, a.propagationStability);
    if (sb !== sa) return sb - sa;
    const ab = String(a.branchId), bb = String(b.branchId);
    return ab < bb ? -1 : ab > bb ? 1 : 0;
  });

  // ── Step 3: Cap — top IB_TOP_N ───────────────────────────────────────────
  const capped   = admitted.slice(0, IB_TOP_N);
  const overflow = admitted.slice(IB_TOP_N);

  for (let i = 0; i < overflow.length; i++) {
    rejected.push({
      branchId: overflow[i].branchId,
      reason:   'CAP_EXCEEDED',
      rank:     IB_TOP_N + i + 1,
      cap:      IB_TOP_N,
    });
  }

  // ── Step 4: Emit — typed DecisionCandidate[], no graph artifacts ──────────
  const decisionCandidates = capped.map((v, idx) => ({
    candidateId:          `dc_${sourceCI}_${idx}`,
    branchId:             v.branchId,     // trace ID only — Decision Framework must not reconstruct graph
    sourceCI,
    collapsedScore:       computeCollapsedScore(v.rbcsScore, v.survivalProbability, v.propagationStability),
    rbcsScore:            v.rbcsScore,            // immutable reference
    survivalProbability:  v.survivalProbability,  // immutable reference
    propagationStability: v.propagationStability, // immutable reference
    tier:                 v.tier,
    instabilityVectors:   v.instabilityVectors,   // telemetry — string[] only, not graph data
    failureModes:         v.failureModes,         // telemetry — string[] only, not graph data
  }));

  return {
    sourceCI,
    candidates:    decisionCandidates,
    rejected,
    collapsedAt:   Date.now(),
    totalInput:    candidates.length,
    totalAdmitted: decisionCandidates.length,
    totalRejected: rejected.length,
  };
}
