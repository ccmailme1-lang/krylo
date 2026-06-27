// WO-2012 — State-Conditioned Path Rendering Layer (SCPRL)
// Modulates display ordering and tone label of paths based on DistressIndex.
// Read-only. Hard layer (path topology, signal scores) is never touched.
// buildRenderDirective(paths, synthesis, metrics) → { toneLabel, sortedPathIds, riskHighlightLevel }

const W_VOL  = 0.35;
const W_COMP = 0.25;
const W_LIQ  = 0.25;
const W_RED  = 0.15;

// DistressBias by path type: defensive paths rise under distress, speculative paths dim.
const DISTRESS_BIAS = {
  risk:        +1.0,
  defensive:   +1.0,
  action:       0.0,
  opportunity: -0.8,
  expansion:   -0.8,
};

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export function computeDistressIndex(synthesis, metrics) {
  if (!synthesis || !metrics) return 0;

  // NormalizedVolatility: inverse of convergence stability
  const convergence     = metrics?.convergence?.value ?? 0.5;
  const NV              = clamp(1 - convergence, 0, 1);

  // NarrativeCompression: domain pressure variance proxy — use signal breadth inverse
  const signal          = metrics?.signal?.value ?? 0.5;
  const NC              = clamp(1 - signal * 0.8, 0, 1);

  // LiquidityStress: map convergence state to stress level
  const STRESS_MAP = {
    'HIGH CONVERGENCE':      0.05,
    'BUILDING CONVERGENCE':  0.20,
    'TURBULENT CONVERGENCE': 0.65,
    'LOW SIGNAL YIELD':      0.75,
    'INSUFFICIENT SIGNAL':   0.90,
  };
  const LS = STRESS_MAP[synthesis.stateLabel] ?? 0.40;

  // SignalRedundancy: proxy from validity gap (low validity = high redundancy risk)
  const validity        = metrics?.validity?.value ?? 0.5;
  const SR              = clamp(1 - validity, 0, 1);

  return clamp(W_VOL * NV + W_COMP * NC + W_LIQ * LS + W_RED * SR, 0, 1);
}

export function buildRenderDirective(paths, synthesis, metrics) {
  const di = computeDistressIndex(synthesis, metrics);

  const toneLabel = di < 0.35 ? 'NEUTRAL' : di < 0.70 ? 'COMPRESSED' : 'CAUTIONARY';
  const riskHighlightLevel = di < 0.35 ? 0 : di < 0.70 ? 1 : 2;

  // Compute DisplayWeight per path — sort only, no score mutation
  const weighted = paths.map(p => {
    const bias   = DISTRESS_BIAS[p.type] ?? 0;
    const weight = (p.score ?? 0.5) * (1 + bias * di);
    return { id: p.id, weight };
  });

  weighted.sort((a, b) => b.weight - a.weight);
  const sortedPathIds = weighted.map(w => w.id);

  return { toneLabel, sortedPathIds, riskHighlightLevel };
}
