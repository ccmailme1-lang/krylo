// WO-2014 — Composite Metrics Engine (CME)
// Derives LEVERAGE / ADVANTAGE / VISIBILITY / EDGE from existing engine outputs.
// Read-only. No writes to any engine or store.
// computeCompositeMetrics(synthesis, metrics) → { leverage, advantage, visibility, edge }

// Maps convergence state label to a structural horizon proxy (0–1)
const HORIZON_PROXY = {
  'HIGH CONVERGENCE':      1.00,
  'BUILDING CONVERGENCE':  0.70,
  'TURBULENT CONVERGENCE': 0.45,
  'LOW SIGNAL YIELD':      0.25,
  'INSUFFICIENT SIGNAL':   0.10,
};

export function computeCompositeMetrics(synthesis, metrics) {
  if (!synthesis || !metrics) return { leverage: 0, advantage: 0, visibility: 0, edge: 0 };
  if (synthesis.resolutionEligible === false || synthesis.queryDomain === 'AMBIGUOUS') {
    return { leverage: 0, advantage: 0, visibility: 0, edge: 0 };
  }

  const signalVal      = metrics.signal?.value      ?? 0;
  const validityVal    = metrics.validity?.value    ?? 0;
  const convergenceVal = metrics.convergence?.value ?? 0;
  const SCI            = metrics.sci                ?? convergenceVal; // fallback to convergence if no EvidenceGraph yet

  // Narrative consensus proxy: inverse of structural convergence.
  // High structural convergence = narrative consensus is lagging.
  const narrativeConsensus = Math.max(0, 0.5 - convergenceVal * 0.4);

  // LEVERAGE — actionability-to-effort ratio
  // High signal × high validity × structural confirmation / (1 + uncertainty cost)
  const leverage = clamp(
    (signalVal * validityVal * SCI) / (1 + (1 - convergenceVal)),
    0, 1
  );

  // ADVANTAGE — structural read vs. narrative consensus gap
  // Positive = structural evidence is ahead of what the narrative says
  const advantage = clamp(SCI - narrativeConsensus, 0, 1);

  // VISIBILITY — how far forward the verified evidence reaches
  const stateLabel   = synthesis.stateLabel ?? '';
  const horizonProxy = HORIZON_PROXY[stateLabel] ?? 0.10;
  const visibility   = clamp(horizonProxy * validityVal, 0, 1);

  // EDGE — rate at which structural truth is diverging from consensus
  const edge = clamp(
    (advantage * convergenceVal) / Math.max(0.1, 1 + narrativeConsensus),
    0, 1
  );

  return { leverage, advantage, visibility, edge };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
