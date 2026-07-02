// WO-2041 — Constraint Impact Engine
// ImpactDelta = (Σ rankedSignal.rank_score * pressureByDomain[rankedSignal.domain]) * deltaState

export function computeImpact(rankedSignals, pressureByDomain, deltaState) {
  const weightedSum = (rankedSignals ?? []).reduce((sum, s) => {
    const pressure = pressureByDomain?.[s.domain] ?? 0;
    return sum + (s.rank_score ?? 0) * pressure;
  }, 0);
  return weightedSum * (deltaState ?? 0);
}
