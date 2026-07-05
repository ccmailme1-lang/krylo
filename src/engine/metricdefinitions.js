// Metric Definition Layer ("Instrument Manual")
// Spec: specs/WO-metric-definition-layer.md (Bottle Test PASS, 4AR CONSTRAINED)
//
// Static, structured definitions for the metrics computeMetrics() (metricsengine.js)
// already produces. Every definition below is drawn directly from metricsengine.js's
// own existing comments — this module does not author new descriptions independently,
// to keep the "instrument manual" in sync with the engine's actual stated intent.
//
// Boundary: this answers "what does this metric mean in general" (static, same text
// regardless of which event you're looking at). It does NOT answer "why does THIS
// event have this value" — that's whytrace.js (KRYL-980), a live per-event causal
// trace. Different questions, no overlap. This module computes nothing, mutates
// nothing, and is a render-only sink for definition text, same discipline
// metricstrip.jsx already follows for values (metricsengine.js: "Components are
// render-only sinks — never recompute metrics inline.").
//
// Content-drift note (4AR Drift Exposure mitigation): each definition below cites
// the metricsengine.js line/section it was drawn from. If that engine's formula or
// weighting ever changes, check the cited section for whether the prose here also
// needs updating — this file will not detect that automatically.

const METRIC_DEFINITIONS = {
  signal: {
    key: 'signal',
    definition: 'Ambient convergence-engine output for the current query\'s domain field.',
    scope: 'Not query-specific unless queryRelevant is true — otherwise this is an ambient field signal, not a reading on your specific query.',
    units: '0-1 fraction',
    sensitivity: 'Moves with live Happy Path engine activity in the relevant domain(s).',
    groundednessNote: 'Observed weight 0.75 (live signals), assumed 0.25 (floor/smoothing) — metricsengine.js "Signal" section.',
  },
  validity: {
    key: 'validity',
    definition: 'Internal soundness of how the query was resolved.',
    scope: 'Not a truth claim about the underlying subject matter — it describes resolution quality, not real-world accuracy.',
    units: '0-1 fraction (maps to synthesis.confidence)',
    sensitivity: 'Moves with how many live feeds vs. heuristic defaults contributed to resolution.',
    groundednessNote: 'Observed ~0.60 (live feeds), assumed ~0.40 (heuristic defaults) — metricsengine.js "Validity" section.',
  },
  convergence: {
    key: 'convergence',
    definition: 'Current signal-field state classification (e.g. BUILDING CONVERGENCE, HIGH CONVERGENCE).',
    scope: 'Deliberately kept as pure field state, not blended with realized/projected framing (metricsengine.js H4).',
    units: 'Categorical label, plus a derived 0-1 score',
    sensitivity: 'Moves with domain overlap between the Happy Path engine\'s active domains and the query\'s own domain.',
    groundednessNote: 'Query-relevant: 80% grounded (live HP engine). Ambient (no domain overlap): 20% grounded — "field signal, not query-specific."',
  },
  cac: {
    key: 'cac',
    definition: 'Generalized acquisition-cost estimate.',
    scope: '"Generalized" means not strict-business-only — always labeled MODELED, not a real invoice figure.',
    units: '$ (realized + modeled components)',
    sensitivity: 'Realized component only appears when the query carries a stated dollar figure; otherwise fully modeled.',
    groundednessNote: 'Realized monetary weight 0.60 when numbers are present, 0 otherwise — metricsengine.js "CAC" section.',
  },
  roas: {
    key: 'roas',
    definition: 'Return-on-acquisition-spend projection.',
    scope: 'Zero realized component at emission — pure projection until an outcome lands.',
    units: 'Ratio, labeled MODELED',
    sensitivity: 'Moves with query confidence.',
    groundednessNote: 'Realized component = 0 at emission by design — metricsengine.js "ROAS" section.',
  },
  ltv: {
    key: 'ltv',
    definition: 'Lifetime-value projection.',
    scope: 'Zero realized value and zero groundedness at emission — "honest; rises as outcomes land" (verbatim from the engine\'s own comment).',
    units: '$ (projected), labeled MODELED',
    sensitivity: 'Moves with persona horizon/discount-rate inputs and the CAC value.',
    groundednessNote: '0% grounded at emission by design, rises as Leverage Realization data accrues — metricsengine.js "LTV" section.',
  },
  leverageRealization: {
    key: 'leverageRealization',
    definition: 'Historical track record of structurally similar past routes.',
    scope: 'WITHHELD (returns null) below 5 recorded instances — this is an explicit withhold, not a missing/zero value.',
    units: 'Ratio (observed ÷ projected), plus N (sample size)',
    sensitivity: 'Only appears once enough historical instances exist; groundedness rises with N, saturating around N=15.',
    groundednessNote: 'Groundedness = min(1, N/15) — pure observation once an outcome lands, per metricsengine.js "Leverage Realization" section.',
  },
  sci: {
    key: 'sci',
    definition: 'Structural Confirmation Index — how much of a detected event\'s evidence is hard-to-fabricate.',
    scope: 'Populated only once a real EvidenceGraph exists (the WO-2004/2005B identity-kernel pipeline) — null otherwise.',
    units: '0-10 score, plus 0-1 groundedness',
    sensitivity: 'Moves with the mix of evidence tiers (structural vs. narrative) backing the detected event.',
    groundednessNote: 'Computed by structuralconfirmation.computeSCI() — see that engine directly for tier-weighting behavior.',
  },
  sps: {
    key: 'sps',
    definition: 'Structural Precursor Score.',
    scope: 'WITHHELD below 5 recorded instances, same discipline as leverageRealization.',
    units: 'Historical frequency, N-gated',
    sensitivity: 'Only appears once enough historical instances exist.',
    groundednessNote: 'Sourced from pathstore\'s LR-prior lookup — WITHHOLD enforced by pathstore itself, not this module.',
  },
};

/**
 * getMetricDefinition — retrieve the static definition for a metric key.
 * Returns null for an unknown key (no fabricated definition for something
 * that doesn't exist in metricsengine.js's output).
 */
export function getMetricDefinition(key) {
  return METRIC_DEFINITIONS[key] ?? null;
}

/**
 * listMetricKeys — the exact set of keys this module has definitions for.
 * Should always match computeMetrics()'s actual return-object keys exactly.
 */
export function listMetricKeys() {
  return Object.keys(METRIC_DEFINITIONS);
}
