// WO-2055 — RBCS Scoring Engine (Reality Branch Convergence Scoring)
// Asymmetry-based viability ranking over structurally admitted causal branches.
// Pure comparative ranking — no structural validation, no physics, no RKM mutation.
//
// Boundary rules:
//   NO structural validation — CI-R handles that (input is already admitted GCBs)
//   NO ontology logic — ontology authority stays in CI-R
//   NO RKM mutation — read-only context only
//   NO physics simulation — LFOS handles that
//   ONLY: score, rank, tier, filter

import { MAX_EXPANSION_DEPTH } from './cifengine.js';

// ── Named constants ───────────────────────────────────────────────────────────

export const RBCS_WEIGHTS = {
  wT: 0.30,   // temporal advantage — intentionally overweighted: mission = early detection
  wD: 0.175,  // divergence potential
  wC: 0.175,  // cross-domain coupling
  wA: 0.175,  // amplification gradient
  wV: 0.175,  // volatility utility
};

// KRYL-981: authoritative, versioned invariant surface for anything that needs to
// guard against RBCS weight mutation (e.g. calibrationengine.js's per-domain
// profile enforcement). Derived from RBCS_WEIGHTS directly — never hand-duplicate
// this key list elsewhere, or a future change here won't propagate to the guard.
export const RBCS_INVARIANT_KEYS    = Object.freeze(Object.keys(RBCS_WEIGHTS));
export const RBCS_INVARIANT_VERSION = 1; // bump only if RBCS_WEIGHTS' key set changes

export const RBCS_EPSILON = 0.01;  // log-space floor — prevents ln(0) collapse

export const RBCS_THRESHOLDS = {
  DISCARD:   0.2,
  MONITOR:   0.5,   // DISCARD < score < MONITOR
  CANDIDATE: 0.75,  // MONITOR <= score < CANDIDATE → LFOS eligible
  // PRIORITY: score >= CANDIDATE → priority LFOS evaluation
};

// ── Factor computation ────────────────────────────────────────────────────────

/**
 * T — Temporal Proximity Advantage [0,1]
 * Measures how early in a causal chain we detected the signal.
 * Earlier hop = higher T. Amplification penalizes visibility (amplified = more obvious).
 */
function computeT(gcb) {
  const hopCount      = gcb.normalizedStructure.hopCount;
  const denominator   = MAX_EXPANSION_DEPTH + 1;
  const base          = Math.max(0, 1 - hopCount / denominator);
  // Visible amplification slightly reduces T (more observable = less edge)
  const ampPenalty    = gcb.normalizedStructure.hasAmplification ? 0.1 : 0;
  return Math.min(1, Math.max(0, base - ampPenalty));
}

/**
 * D — Divergence Potential [0,1]
 * How much does this branch separate possible futures?
 * AMPLIFIES/TRIGGERS edges + multi-domain reach + speculative depth all increase D.
 */
function computeD(gcb) {
  const edgeSeq        = gcb.normalizedStructure.edgeSequence;
  const hopCount       = Math.max(edgeSeq.length, 1);
  const divergentEdges = edgeSeq.filter(e => e === 'AMPLIFIES' || e === 'TRIGGERS').length;
  const edgeRatio      = divergentEdges / hopCount;
  const domainScore    = Math.min(1, gcb.normalizedStructure.crossDomainCount / 6);
  const speculativeU   = gcb.uncertaintyBounds.structural;  // unanchored cells = unknown futures

  return Math.min(1, edgeRatio * 0.5 + domainScore * 0.3 + speculativeU * 0.2);
}

/**
 * C — Cross-Domain Coupling [0,1]
 * How many independent systems does this branch touch?
 * Normalized against 6 (total domain count in KRYLO).
 */
function computeC(gcb) {
  return Math.min(1, gcb.normalizedStructure.crossDomainCount / 6);
}

/**
 * A — Amplification Gradient [0,1]
 * Net compounding strength over hops.
 * AMPLIFIES adds; ATTENUATES subtracts. Clamped to [0,1].
 */
function computeA(gcb) {
  const edgeSeq      = gcb.normalizedStructure.edgeSequence;
  const hopCount     = Math.max(edgeSeq.length, 1);
  const ampCount     = edgeSeq.filter(e => e === 'AMPLIFIES').length;
  const attenuateCount = edgeSeq.filter(e => e === 'ATTENUATES').length;
  return Math.min(1, Math.max(0, (ampCount - attenuateCount) / hopCount));
}

/**
 * V — Volatility Utility [0,1]
 * V = 4u(1-u) — inverted U-curve, peak at u=0.5.
 * Moderate uncertainty = maximum leverage potential.
 * u = 0 (known) = no edge; u = 1 (noise) = no edge; u = 0.5 = maximum.
 */
function computeV(gcb) {
  const { epistemic, structural } = gcb.uncertaintyBounds;
  const u = Math.min(1, Math.max(0, epistemic * 0.5 + structural * 0.5));
  return 4 * u * (1 - u);
}

// ── Scoring formula ───────────────────────────────────────────────────────────
// score = exp(Σ wi · ln(Fi + ε))
// Weighted geometric mean in log-space. Weak factor craters score — no masking.

function computeScore(factors) {
  const { T, D, C, A, V } = factors;
  const { wT, wD, wC, wA, wV } = RBCS_WEIGHTS;
  const ε = RBCS_EPSILON;

  const logSum =
    wT * Math.log(T + ε) +
    wD * Math.log(D + ε) +
    wC * Math.log(C + ε) +
    wA * Math.log(A + ε) +
    wV * Math.log(V + ε);

  return Math.min(1, Math.max(0, Math.exp(logSum)));
}

function classifyTier(score) {
  if (score >= RBCS_THRESHOLDS.CANDIDATE) return 'PRIORITY';
  if (score >= RBCS_THRESHOLDS.MONITOR)   return 'CANDIDATE';
  if (score >= RBCS_THRESHOLDS.DISCARD)   return 'MONITOR';
  return 'DISCARD';
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * scoreAdmitted — score and rank GroundedCausalBranch[] from CI-R
 *
 * @param {object[]} admittedBranches — GroundedCausalBranch[] (CI-R admitted only)
 * @param {string}   sourceCI         — ChangeItem ID for traceability
 * @returns {object} CandidateLeverageSet
 */
export function scoreAdmitted(admittedBranches, sourceCI = '') {
  const vectors = admittedBranches.map(gcb => {
    const T     = computeT(gcb);
    const D     = computeD(gcb);
    const C     = computeC(gcb);
    const A     = computeA(gcb);
    const V     = computeV(gcb);
    const score = parseFloat(computeScore({ T, D, C, A, V }).toFixed(4));

    return {
      branchId: gcb.id,
      T: parseFloat(T.toFixed(3)),
      D: parseFloat(D.toFixed(3)),
      C: parseFloat(C.toFixed(3)),
      A: parseFloat(A.toFixed(3)),
      V: parseFloat(V.toFixed(3)),
      score,
      tier: classifyTier(score),
    };
  });

  // Rank descending by score
  vectors.sort((a, b) => b.score - a.score);

  // LFOS receives CANDIDATE + PRIORITY only (score >= MONITOR threshold)
  const candidates = vectors.filter(v => v.tier === 'CANDIDATE' || v.tier === 'PRIORITY');

  return {
    sourceCI,
    vectors,          // all scored (for telemetry + calibration)
    candidates,       // LFOS input
    computedAt:       Date.now(),
    totalScored:      vectors.length,
    candidateCount:   candidates.length,
  };
}
