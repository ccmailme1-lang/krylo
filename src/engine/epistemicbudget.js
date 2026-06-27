// WO-2007.2 — Epistemic Budget
// Hard caps on Recon Layer expansion — prevents combinatorial explosion.
// All limits are immutable constants. Tunable only via spec revision (not runtime config).

export const BUDGET = {
  MAX_DEPTH:         4,     // max hops upstream from observed signal
  MAX_BRANCHING:     3,     // max upstream candidates per node per expansion pass
  MIN_SCORE:         0.35,  // ExplorationScore floor — below this, candidate is discarded
  MAX_ACTIVE_SCPS:   50,    // FIFO eviction above this (enforced in scpstore.js)
};

// canExpand — returns { allowed, reason }
export function canExpand({ depth, branchCount, explorationScore }) {
  if (depth      >= BUDGET.MAX_DEPTH)     return { allowed: false, reason: 'MAX_DEPTH_REACHED' };
  if (branchCount >= BUDGET.MAX_BRANCHING) return { allowed: false, reason: 'MAX_BRANCHING_REACHED' };
  if (explorationScore < BUDGET.MIN_SCORE) return { allowed: false, reason: 'SCORE_BELOW_FLOOR' };
  return { allowed: true, reason: null };
}

// computeExplorationScore — locked formula from WO-2007 spec
// All inputs 0–1. Score clamped to 0–1.
export function computeExplorationScore({
  informationGain,
  leadTimeFactor,
  causalStrength,
  integrationCost,
  noiseFactor,
  redundancyFactor,
  maintenanceRisk,
}) {
  const num = informationGain * leadTimeFactor * causalStrength;
  const den = integrationCost * noiseFactor * redundancyFactor * maintenanceRisk;
  if (den <= 0) return 0;
  return Math.min(1, num / den);
}

// leadTimeFactor — maps lag days to 0–1 discovery value (longer lead = higher value, diminishing)
export function leadTimeFactor(lagDays) {
  if (lagDays <= 0)   return 0.05;
  if (lagDays <= 3)   return 0.20;
  if (lagDays <= 7)   return 0.40;
  if (lagDays <= 30)  return 0.65;
  if (lagDays <= 90)  return 0.80;
  if (lagDays <= 365) return 0.90;
  return 0.95;
}
