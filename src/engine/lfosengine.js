// WO-2056 — LFOS Engine (Propagation Physics)
// Simulates propagation physics over RBCS-admitted candidates.
// Adds survivalProbability, propagationStability, instabilityVectors, failureModes
// to each candidate. rbcsScore is carried immutably — no mutation permitted.
//
// Boundary rules:
//   NO scoring     — RBCS handles that; rbcsScore is immutable input
//   NO validation  — CI-R handles that; all input is already admitted
//   NO ontology    — ontology authority stays in CI-R
//   NO ranking     — IB owns ranking (rbcsScore × survivalProbability × propagationStability)
//   ONLY: propagation physics simulation

// ── Named constants ───────────────────────────────────────────────────────────

// Survival base + coefficients
export const SURVIVAL_BASE          = 0.35;  // floor: no chain is guaranteed to die
export const SURVIVAL_AMPLIFICATION = 0.40;  // A: net amplification is the primary survival driver
export const SURVIVAL_TEMPORAL      = 0.15;  // T: earlier detection = more time to manifest
export const SURVIVAL_DOMAIN_COST   = 0.10;  // C: each domain crossing introduces failure friction

// Stability base + coefficients
export const STABILITY_BASE              = 0.80;  // default: chains are stable unless divergent/fragmented
export const STABILITY_DIVERGENCE_COST   = 0.35;  // D: divergent branches are inherently unstable
export const STABILITY_DOMAIN_COST       = 0.25;  // C: cross-domain paths lose coherence
export const STABILITY_AMPLIFICATION     = 0.10;  // A: mild boost — concentrated channels = more stable

// Instability vector thresholds (warning-level flags)
export const INSTABILITY_DIVERGENCE_FLOOR   = 0.70;  // D above this → propagation too diffuse
export const INSTABILITY_DOMAIN_FLOOR       = 0.50;  // C above this → compounding domain friction
export const INSTABILITY_AMPLIFICATION_CEIL = 0.85;  // A above this → runaway amplification risk
export const INSTABILITY_TEMPORAL_FLOOR     = 0.25;  // T below this → edge may have eroded
export const INSTABILITY_VOLATILITY_FLOOR   = 0.10;  // V below this → near-certain or near-chaotic (no edge)

// Failure mode thresholds (IB should apply high penalty or filter)
export const FAILURE_ATTENUATION_FLOOR  = 0.20;  // A: net attenuation dominates — chain likely dies
export const FAILURE_DOMAIN_CEIL        = 0.80;  // C: extreme friction; propagation physically impeded
export const FAILURE_TEMPORAL_FLOOR     = 0.10;  // T: too late — advantage already realized by others
export const FAILURE_VOLATILITY_FLOOR   = 0.05;  // V: degenerate signal (crowded consensus or pure noise)

const PHYSICS_MIN = 0.05;
const PHYSICS_MAX = 0.95;

// ── Physics computation ───────────────────────────────────────────────────────

/**
 * survivalProbability — probability the causal chain propagates to observable reality.
 * Amplification drives survival. Domain friction and late detection reduce it.
 *
 * Range: [PHYSICS_MIN, PHYSICS_MAX]
 * V is not in the survival formula — volatility utility is a scoring signal, not a physics constraint.
 */
function computeSurvival(T, _D, C, A, _V) {
  const raw = SURVIVAL_BASE
    + A  * SURVIVAL_AMPLIFICATION
    + T  * SURVIVAL_TEMPORAL
    - C  * SURVIVAL_DOMAIN_COST;
  return parseFloat(Math.min(PHYSICS_MAX, Math.max(PHYSICS_MIN, raw)).toFixed(3));
}

/**
 * propagationStability — consistency and predictability of the propagation path.
 * Divergence and cross-domain coupling reduce stability. Amplification provides mild stabilization.
 *
 * Range: [PHYSICS_MIN, PHYSICS_MAX]
 */
function computeStability(_T, D, C, A, _V) {
  const raw = STABILITY_BASE
    - D  * STABILITY_DIVERGENCE_COST
    - C  * STABILITY_DOMAIN_COST
    + A  * STABILITY_AMPLIFICATION;
  return parseFloat(Math.min(PHYSICS_MAX, Math.max(PHYSICS_MIN, raw)).toFixed(3));
}

/**
 * instabilityVectors — named risk flags present in this candidate.
 * Informs IB risk assessment. Does not prevent admission — IB may still include.
 */
function detectInstabilityVectors(T, D, C, A, V) {
  const vectors = [];
  if (D > INSTABILITY_DIVERGENCE_FLOOR)    vectors.push('HIGH_DIVERGENCE');
  if (C > INSTABILITY_DOMAIN_FLOOR)        vectors.push('DOMAIN_FRICTION');
  if (A > INSTABILITY_AMPLIFICATION_CEIL)  vectors.push('AMPLIFICATION_RUNAWAY');
  if (T < INSTABILITY_TEMPORAL_FLOOR)      vectors.push('TEMPORAL_DECAY');
  if (V < INSTABILITY_VOLATILITY_FLOOR)    vectors.push('EPISTEMIC_EXTREMES');
  return vectors;
}

/**
 * failureModes — conditions that would cause propagation to collapse entirely.
 * IB survival filter (IB_SURVIVAL_FLOOR) gates on these implicitly via survivalProbability,
 * but named modes are available for explicit rejection logging.
 */
function detectFailureModes(T, _D, C, A, V) {
  const modes = [];
  if (A < FAILURE_ATTENUATION_FLOOR)  modes.push('ATTENUATION_COLLAPSE');
  if (C > FAILURE_DOMAIN_CEIL)        modes.push('DOMAIN_BARRIER');
  if (T < FAILURE_TEMPORAL_FLOOR)     modes.push('TEMPORAL_MISS');
  if (V < FAILURE_VOLATILITY_FLOOR)   modes.push('VOLATILITY_DISSOLUTION');
  return modes;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * simulatePropagation — apply LFOS physics to an RBCS CandidateLeverageSet
 *
 * @param {object} candidateSet — CandidateLeverageSet from rbcsengine.scoreAdmitted()
 * @returns {object}            — LFOSValidatedCandidates (WO-2058 schema)
 *
 * Output ordering: input order preserved. IB owns ranking by
 *   rbcsScore × survivalProbability × propagationStability.
 */
export function simulatePropagation(candidateSet) {
  const { sourceCI, candidates } = candidateSet;

  const validated = candidates.map(v => {
    const { T, D, C, A, V } = v;

    return {
      branchId:             v.branchId,
      rbcsScore:            v.score,           // immutable — IB/Decision must not recompute
      T:                    v.T,
      D:                    v.D,
      C:                    v.C,
      A:                    v.A,
      V:                    v.V,
      tier:                 v.tier,
      survivalProbability:  computeSurvival(T, D, C, A, V),
      propagationStability: computeStability(T, D, C, A, V),
      instabilityVectors:   detectInstabilityVectors(T, D, C, A, V),
      failureModes:         detectFailureModes(T, D, C, A, V),
    };
  });

  return {
    sourceCI,
    candidates:  validated,    // LFOSValidatedCandidate[] — IB ranks these, not LFOS
    simulatedAt: Date.now(),
    totalInput:  candidates.length,
    totalOutput: validated.length,
  };
}
