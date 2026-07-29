// KRYL-1126 — Leverage Differential (λ). Analytical Plane only. Answers "who has negotiating
// advantage under stated assumptions" — an intentionally interpretive decision-analysis primitive,
// never an evidentiary claim, never fed back into confidence/provenance/export gate.

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// actorPosition/counterpartyPosition: 0-1 declared strength scores (caller-supplied, not observed).
// Returns a signed differential in [-1, 1] plus which side it favors.
export function computeLambda(actorId, actorPosition, counterpartyId, counterpartyPosition) {
  const a = clamp(actorPosition ?? 0, 0, 1);
  const c = clamp(counterpartyPosition ?? 0, 0, 1);
  const lambda = parseFloat((a - c).toFixed(3));
  const advantage = lambda > 0 ? actorId : lambda < 0 ? counterpartyId : 'NEUTRAL';
  return {
    leverage_lambda: lambda,
    lambda_advantage: advantage,
    analysis_state: 'COMPUTED',
  };
}
