// WO-1868 — Metrics Truth Engine
// Single computational authority for all six hero metrics.
// computeMetrics(synthesis, hpState, persona) → canonical metrics object.
// Components are render-only sinks — never recompute metrics inline.

// H5: convergence state → numeric score (signal-field, not prediction)
const CONV_SCORE = {
  'INSUFFICIENT SIGNAL':   0.05,
  'LOW SIGNAL YIELD':      0.25,
  'BUILDING CONVERGENCE':  0.55,
  'TURBULENT CONVERGENCE': 0.40,
  'HIGH CONVERGENCE':      0.90,
};

// H1 — unified groundedness: Σ(observed_weight) / Σ(all_weight)
function g(observedWeight, totalWeight) {
  if (!totalWeight) return 0;
  return Math.min(1, Math.max(0, observedWeight / totalWeight));
}

// lrPrior: { avgLR, rank, n, earlyRatio } from pathstore.getLRPrior(), or null if N<5
// sciData: { sci, sps } from structuralconfirmation.computeStructuralSuite(), or null if no EvidenceGraph yet
export function computeMetrics(synthesis, hpState = null, persona = null, lrPrior = null, sciData = null) {
  const ambiguous = !synthesis
    || synthesis?.resolutionEligible === false
    || synthesis?.queryDomain === 'AMBIGUOUS';
  const conf     = synthesis?.confidence ?? 0.5;
  const hasNums  = (synthesis?.inputNumbers?.length ?? 0) > 0;
  const firstNum = synthesis?.inputNumbers?.[0] ?? 0;

  // ── Signal ────────────────────────────────────────────────────────────────
  // HP peakScore (0–100): ambient convergence engine output. Observed.
  // Observed weight 0.75 (live signals) | Assumed 0.25 (floor/smoothing)
  const signalVal = ambiguous ? 0 : (hpState?.happyPath?.peakScore ?? 0) / 100;
  const signalGnd = ambiguous ? 0 : g(0.75, 1.0);

  // ── Validity ──────────────────────────────────────────────────────────────
  // Internal soundness of query resolution. Maps to synthesis.confidence.
  // Observed ~0.60 (live feeds in synthesis) | Assumed ~0.40 (heuristic defaults)
  const validityVal = ambiguous ? 0 : conf;
  const validityGnd = ambiguous ? 0 : g(0.60, 1.0);

  // ── Convergence ───────────────────────────────────────────────────────────
  // Signal-field state ONLY. H4: do not overload with realized-vs-projected.
  const convLabel      = synthesis?.stateLabel ?? 'INSUFFICIENT SIGNAL';
  const convergenceVal = ambiguous ? 0 : (CONV_SCORE[convLabel] ?? 0.05);
  const hpDomains      = hpState?.happyPath?.domains ?? [];
  const queryRelevant  = !ambiguous && hpDomains.length > 0;
  // query-relevant → 80% grounded (live HP engine); ambient → 20% (field signal, not query-specific)
  const convergenceGnd = ambiguous ? 0 : (queryRelevant ? g(0.80, 1.0) : g(0.20, 1.0));

  // ── CAC — Generalized Acquisition Cost ────────────────────────────────────
  // H1 input weights (persona-neutral, H8):
  //   realized monetary: 0.60 | realized ancillary: 0.20 | modeled time: 0.20
  // Realized monetary: stated $ × 4% (transaction/decision cost estimate)
  const cacModeled  = Math.round(120 + (1 - conf) * 80); // $120–$200 modeled range
  const cacRealized = hasNums ? Math.round(firstNum * 0.04) : 0;
  const cacValue    = cacRealized + cacModeled;
  const cacGnd      = g(hasNums ? 0.60 : 0, 1.0);

  // ── ROAS — Return on Acquisition Spend ────────────────────────────────────
  // Realized value captured = 0 at emission (no outcome yet).
  // H6: denominator (modeled spend) counts against groundedness.
  //   realized (either side): 0 | realized denominator if nums present: 0.25
  const roasProjected = parseFloat((1.8 + conf * 2.5).toFixed(1));
  const roasValue     = roasProjected; // realized component = 0 at emission
  const roasGnd       = g(hasNums ? 0.25 : 0, 1.0);

  // ── LTV — Lifetime Value ──────────────────────────────────────────────────
  // Pure projection at emission. Realized component = 0; rises as outcomes land.
  const horizon      = persona?.horizon      ?? 5;
  const discountRate = persona?.discountRate ?? 0.08;
  const annual       = cacValue * 0.35;
  const ltvProjected = Math.round(annual * (1 - Math.pow(1 + discountRate, -horizon)) / discountRate);
  const ltvValue     = ltvProjected;
  const ltvGnd       = g(0, 1.0); // 0% grounded at emission — honest; rises as LR data accrues

  // ── Derived ───────────────────────────────────────────────────────────────
  const ltvCacRatio           = cacValue > 0 ? parseFloat((ltvValue / cacValue).toFixed(1)) : 0;
  const economicsGroundedness = parseFloat(((cacGnd + roasGnd + ltvGnd) / 3).toFixed(2));
  const avgGnd                = (signalGnd + validityGnd + convergenceGnd + economicsGroundedness) / 4;
  // H5 — Decision Emission Score: MULTIPLICATIVE. Any weak leg craters the total.
  const decisionEmissionScore = parseFloat(
    (signalVal * validityVal * convergenceVal * Math.max(avgGnd, 0.01)).toFixed(4)
  );

  // ── Leverage Realization (7th vital metric, WO-1869) ─────────────────────
  // LR-prior: historical track record of matching routes, shown at emission.
  // WITHHELD when N<5 (pathstore enforces — null means "recording, not enough history").
  // Groundedness = pure observation once outcome lands. Scales with N as proxy quality.
  const lr = lrPrior ? {
    avgLR:      lrPrior.avgLR,
    rank:       lrPrior.rank,
    n:          lrPrior.n,
    earlyRatio: lrPrior.earlyRatio,
    groundedness: Math.min(1, lrPrior.n / 15), // rises with N; saturates at ~N=15
  } : null;

  return {
    signal:      { value: signalVal,      groundedness: signalGnd },
    validity:    { value: validityVal,    groundedness: validityGnd },
    convergence: { value: convergenceVal, groundedness: convergenceGnd, queryRelevant, state: convLabel },
    cac:  { value: cacValue,  realized: cacRealized, projected: cacModeled,    groundedness: cacGnd,  label: 'MODELED' },
    roas: { value: roasValue, realized: 0,           projected: roasProjected, groundedness: roasGnd, label: 'MODELED' },
    ltv:  { value: ltvValue,  realized: 0,           projected: ltvProjected,  groundedness: ltvGnd,  label: 'MODELED' },
    leverageRealization: lr,
    // SCI (8th) + SPS (9th) — populated when EvidenceGraph exists (WO-2004/2005B pipeline)
    sci: sciData?.sci ?? null,
    sps: sciData?.sps ?? null,
    ltvCacRatio,
    economicsGroundedness,
    decisionEmissionScore,
  };
}
