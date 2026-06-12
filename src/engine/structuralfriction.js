// WO-1714 — Structural Friction Engine
// Computes HorizonMix + StructuralFriction from domain × bayResult.
// ISOLATION RULE: this module MUST NOT import convergenceclassifier.js or positioningengine.js.
// Only assembleAnalysisProjection.js may combine V and F outputs.

// Per-domain horizon mix [operational, strategic] — domain-driven, not intent-driven
export const DOMAIN_HORIZON_MIX = {
  HOME:        { operational: 0.55, strategic: 0.45 },
  INVESTMENTS: { operational: 0.20, strategic: 0.80 },
  CAREER:      { operational: 0.65, strategic: 0.35 },
  EDUCATION:   { operational: 0.30, strategic: 0.70 },
  HEALTH:      { operational: 0.75, strategic: 0.25 },
  BUSINESS:    { operational: 0.45, strategic: 0.55 },
  GENERAL:     { operational: 0.50, strategic: 0.50 },
  BUDGET:      { operational: 0.85, strategic: 0.15 },
};

// Adaptive state thresholds per domain [ALIGNED_max, DRIFTING_max]
// Calibrated to domain natural volatility — BUSINESS/HOME wider, BUDGET/HEALTH tighter
export const DOMAIN_THRESHOLDS = {
  HOME:        [0.22, 0.45],
  INVESTMENTS: [0.20, 0.42],
  CAREER:      [0.25, 0.50],
  EDUCATION:   [0.22, 0.46],
  HEALTH:      [0.20, 0.40],
  BUSINESS:    [0.28, 0.55],
  GENERAL:     [0.25, 0.50],
  BUDGET:      [0.18, 0.38],
};

const clamp01 = v => Math.max(0, Math.min(1, v));

// Derive feasibility from bayResult tier position.
// Operational feasibility peaks at lower tiers (immediate capacity available).
// Strategic feasibility peaks at higher tiers (long-term runway available).
function deriveFeasibility(bayResult) {
  const f       = bayResult?.feasibility ?? 0.75;
  const tierIdx = bayResult?.tierIdx ?? 1;
  const frac    = tierIdx / 3; // 0→T0, 1.0→T3

  return {
    operational: clamp01(f * (1 - frac * 0.45)),     // T0=1.0x  → T3=0.55x
    strategic:   clamp01(f * (0.45 + frac * 0.55)),  // T0=0.45x → T3=1.0x
  };
}

function classifyState(score, domain) {
  const [alignedMax, driftingMax] = DOMAIN_THRESHOLDS[domain] ?? [0.25, 0.50];
  if (score <= alignedMax)  return 'ALIGNED';
  if (score <= driftingMax) return 'DRIFTING';
  return 'HIGH_FRICTION';
}

// Main entry point.
// domain:    string — LENS_BROKER_DOMAIN_MAP value
// bayResult: { feasibility, tierIdx, tierName, ... } — from baylogic.js
//
// Returns:
//   horizonMix:         { operational, strategic } — domain-driven, engine-derived
//   feasibility:        { operational, strategic } — tier-derived capacity
//   structuralFriction: { score, state, vector }   — Euclidean distance + direction
export function computeStructuralFriction(domain, bayResult) {
  const norm = domain ?? 'GENERAL';
  const mix  = { ...(DOMAIN_HORIZON_MIX[norm] ?? DOMAIN_HORIZON_MIX.GENERAL) };
  const feas = deriveFeasibility(bayResult);

  // Signed gaps: positive = deficit (desired > available), negative = surplus
  const opGap  = mix.operational - feas.operational;
  const strGap = mix.strategic   - feas.strategic;

  // Euclidean distance normalized by √2 (maximum theoretical distance in 2D unit space)
  const score = clamp01(Math.sqrt(opGap * opGap + strGap * strGap) / Math.SQRT2);
  const state = classifyState(score, norm);

  return {
    horizonMix:         mix,
    feasibility:        feas,
    structuralFriction: {
      score,
      state,
      vector: { operational: opGap, strategic: strGap },
    },
  };
}
