// WO-2059 — Decision Framework (Intent Injection + Action Selection Kernel)
// First layer where intent, lens preference, and optimization criteria enter the pipeline.
// Governs: lensrouter.js, getSynthesis.js, convergenceclassifier.js, convictionstore.js, targetpacket.jsx
// (Those components continue operating — this WO declares the governing framework contract.
//  Wiring those components into this contract is a separate migration WO.)
//
// Boundary rules:
//   NO scoring or physics mutation — collapsedScore/rbcsScore are immutable from upstream
//   NO graph reconstruction — receives typed DecisionCandidate[] scalars only (no GCBs, no cells)
//   NO upstream feedback — intentScore is a heuristic ordering tool; it never trains upstream scores
//   ONLY: filter(LENS_RELEVANCE_FLOOR) → intentScore(collapsedScore×lensRelevanceScore) → top-N
//
// intentScore   = collapsedScore × lensRelevanceScore              (second-order heuristic)
// collapsedScore = rbcsScore × survivalProbability × propagationStability  (from IB — immutable)
// Neither is semantic truth. Neither feeds back upstream. This is the ordering layer only.

// ── Named constants ───────────────────────────────────────────────────────────

export const LENS_RELEVANCE_FLOOR = 0.40;  // minimum lensRelevanceScore to enter decision set
export const DECISION_TOP_N       = 5;     // maximum IntentWeightedCandidates in DecisionOutput

// lensRelevanceScore components
const LRS_BASE                    = 0.70;  // neutral: most candidates are relevant to most lenses
const LRS_TIER_PRIORITY_BOOST     = 0.15;  // PRIORITY + SHORT/MEDIUM horizon → urgency alignment
const LRS_TIER_CANDIDATE_BOOST    = 0.10;  // CANDIDATE + LONG horizon → discovery alignment
const LRS_FAILURE_PENALTY_RATE    = 0.15;  // per failure mode, scaled by (1 - riskTolerance)
const LRS_INSTABILITY_OPTY_RATE   = 0.03;  // per instability vector, bonus for aggressive lenses
const LRS_TEMPORAL_DECAY_SHORT    = 0.25;  // TEMPORAL_DECAY × SHORT horizon → window closed
const LRS_RUNAWAY_RISK_SCALE      = 0.20;  // AMPLIFICATION_RUNAWAY: +(aggressive) / -(conservative)

// ── Lens profiles ─────────────────────────────────────────────────────────────
// riskTolerance [0,1]: 0=fully conservative (penalizes failures heavily), 1=fully aggressive
// horizon: which tier is preferred ('SHORT'=PRIORITY, 'LONG'=CANDIDATE, 'MEDIUM'=neutral)

const LENS_PROFILES = {
  CEO:         { riskTolerance: 0.70, horizon: 'MEDIUM' },
  CFO:         { riskTolerance: 0.30, horizon: 'MEDIUM' },
  COO:         { riskTolerance: 0.50, horizon: 'SHORT'  },
  EA:          { riskTolerance: 0.50, horizon: 'SHORT'  },
  INVESTOR:    { riskTolerance: 0.80, horizon: 'LONG'   },
  REALTOR:     { riskTolerance: 0.50, horizon: 'SHORT'  },
  ATHLETE:     { riskTolerance: 0.60, horizon: 'SHORT'  },
  SALES:       { riskTolerance: 0.65, horizon: 'SHORT'  },
  STUDENT:     { riskTolerance: 0.55, horizon: 'LONG'   },
  LEGAL:       { riskTolerance: 0.20, horizon: 'LONG'   },
  PROCUREMENT: { riskTolerance: 0.30, horizon: 'MEDIUM' },
  HEALTH:      { riskTolerance: 0.25, horizon: 'MEDIUM' },
  GENERAL:     { riskTolerance: 0.50, horizon: 'MEDIUM' },
};

// ── lensRelevanceScore computation ────────────────────────────────────────────
// Measures how well a candidate's signal profile aligns with the lens's operational parameters.
// Domain alignment is handled upstream (CI-F/RBCS). This layer handles urgency + risk posture.

function computeLensRelevanceScore(candidate, profile) {
  const { riskTolerance, horizon } = profile;
  let score = LRS_BASE;

  // Tier-horizon alignment
  if (candidate.tier === 'PRIORITY' && (horizon === 'SHORT' || horizon === 'MEDIUM')) {
    score += LRS_TIER_PRIORITY_BOOST;
  } else if (candidate.tier === 'CANDIDATE' && horizon === 'LONG') {
    score += LRS_TIER_CANDIDATE_BOOST;
  }

  // Failure penalty: conservative lenses cannot tolerate structural failure modes
  const failureCount = candidate.failureModes.length;
  if (failureCount > 0) {
    score -= (1 - riskTolerance) * LRS_FAILURE_PENALTY_RATE * failureCount;
  }

  // Instability as opportunity: aggressive lenses treat instability vectors as signal, not noise
  const instabilityCount = candidate.instabilityVectors.length;
  if (instabilityCount > 0 && riskTolerance > 0.65) {
    score += instabilityCount * LRS_INSTABILITY_OPTY_RATE;
  }

  // Temporal decay × horizon: SHORT horizon lenses cannot act on eroded signals
  if (candidate.instabilityVectors.includes('TEMPORAL_DECAY') && horizon === 'SHORT') {
    score -= LRS_TEMPORAL_DECAY_SHORT;
  }

  // Amplification runaway: bonus for aggressive (riskTolerance > 0.5), penalty for conservative
  if (candidate.instabilityVectors.includes('AMPLIFICATION_RUNAWAY')) {
    score += (riskTolerance - 0.50) * LRS_RUNAWAY_RISK_SCALE;
  }

  return parseFloat(Math.min(1.0, Math.max(0.0, score)).toFixed(3));
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * applyDecisionFramework — apply lens intent weighting to IB decision candidates
 *
 * @param {object} ibResult     — IBCollapseResult from ibengine.collapseToDecisionCandidates()
 * @param {object} lensContext  — { lens: string } — resolved by lensrouter.js before this call
 * @returns {object}            — DecisionOutput
 *
 * LensContext is resolved externally (lensrouter.js). This engine consumes it; does not route.
 * intentScore is a heuristic ordering signal — NEVER feeds back to RBCS/LFOS/IB.
 */
export function applyDecisionFramework(ibResult, lensContext) {
  const { sourceCI, candidates } = ibResult;
  const { lens } = lensContext;

  const profile  = LENS_PROFILES[lens] ?? LENS_PROFILES.GENERAL;
  const admitted = [];
  const rejected = [];

  // ── Step 1: Filter — lensRelevanceScore >= LENS_RELEVANCE_FLOOR ───────────
  for (const candidate of candidates) {
    const lensRelevanceScore = computeLensRelevanceScore(candidate, profile);

    if (lensRelevanceScore < LENS_RELEVANCE_FLOOR) {
      rejected.push({
        candidateId:        candidate.candidateId,
        reason:             'BELOW_LENS_RELEVANCE_FLOOR',
        lensRelevanceScore,
        floor:              LENS_RELEVANCE_FLOOR,
      });
      continue;
    }

    // ── Step 2: Compute intentScore — heuristic only ─────────────────────────
    const intentScore = parseFloat((candidate.collapsedScore * lensRelevanceScore).toFixed(4));

    admitted.push({ ...candidate, lensRelevanceScore, intentScore });
  }

  // ── Step 3: Rank — descending by intentScore ───────────────────────────────
  admitted.sort((a, b) => b.intentScore - a.intentScore);

  // ── Step 4: Cap — top DECISION_TOP_N ──────────────────────────────────────
  const capped   = admitted.slice(0, DECISION_TOP_N);
  const overflow = admitted.slice(DECISION_TOP_N);

  for (let i = 0; i < overflow.length; i++) {
    rejected.push({
      candidateId: overflow[i].candidateId,
      reason:      'DECISION_CAP_EXCEEDED',
      rank:        DECISION_TOP_N + i + 1,
      cap:         DECISION_TOP_N,
    });
  }

  return {
    sourceCI,
    lens,
    candidates:    capped,       // IntentWeightedCandidate[] — ordered by intentScore
    rejected,
    decidedAt:     Date.now(),
    totalInput:    candidates.length,
    totalAdmitted: capped.length,
    totalRejected: rejected.length,
  };
}
