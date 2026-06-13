// WO-1360 — Fidelity Scoring Engine (Fs)
// Fs = (Mchecksum×0.40) + (Ttelemetry×0.30) + (Ddocs×0.20) + (Vvoice×0.09) + (Eviral×0.01)
// Output tiers: VALIDATED (≥0.85) / ESTIMATED (0.50–0.84) / LOW_FIDELITY (<0.50)
// Amber banned. All tier colors: #66FF00.

// ── WEIGHTS ─────────────────────────────────────────────────────────────────
export const FS_WEIGHTS = {
  Mchecksum:  0.40,
  Ttelemetry: 0.30,
  Ddocs:      0.20,
  Vvoice:     0.09,
  Eviral:     0.01,
};

// ── TIERS ───────────────────────────────────────────────────────────────────
export const FS_TIERS = {
  VALIDATED:    { id: 'VALIDATED',    threshold: 0.85, color: '#66FF00', dimmed: false, blocked: false },
  ESTIMATED:    { id: 'ESTIMATED',    threshold: 0.50, color: '#66FF00', dimmed: true,  blocked: false },
  LOW_FIDELITY: { id: 'LOW_FIDELITY', threshold: 0,    color: '#66FF00', dimmed: true,  blocked: true  },
};

// ── DOMAIN FIELD SCHEMAS ────────────────────────────────────────────────────
// Required high-fidelity fields per domain — drives Ttelemetry score.
export const DOMAIN_FIELDS = {
  INVESTMENTS: ['yield_to_maturity', 'volatility_alpha', 'tax_drag'],
  EDUCATION:   ['apr', 'grace_period_expiry', 'roi_salary_projection'],
  CAR:         ['depreciative_velocity', 'tco', 'equity_floor'],
  HOME:        ['debt_to_service_ratio', 'market_liquidity_index'],
  BUSINESS:    ['cac_ltv_ratio', 'burn_multiple', 'runway_velocity'],
  VACATION:    ['lifestyle_overhead', 'payload_drain_impact'],
  HEALTH:      ['org_status', 'cause_category', 'fundraising_target', 'nonprofit_capacity'],
};

// ── COMPONENT SCORERS ────────────────────────────────────────────────────────

// Mchecksum: data consistency — |computed_net - stated_net| / |stated_net|
// Returns 1.0 on exact match, degrades linearly, 0 at >100% deviation.
// If net not provided: 0.5 (direction computable, balance unverifiable).
// No baseline provided → 0.5 neutral (direction computable, balance unverifiable).
export function scoreMchecksum({ inflow, outflow, net, tolerance = 0.02 } = {}) {
  if (inflow == null && outflow == null) return 0;
  if (inflow == null || outflow == null) return 0.5;
  if (net == null) return 0.5;
  const denominator = Math.abs(net) || 1;
  const delta = Math.abs((inflow - outflow) - net) / denominator;
  return delta <= tolerance ? 1 : Math.max(0, 1 - delta);
}

// Ttelemetry: fractional field coverage — filled / required.
export function scoreTtelemetry({ domain, fields = {} } = {}) {
  const required = DOMAIN_FIELDS[domain?.toUpperCase()] ?? [];
  if (required.length === 0) return 0;
  const filled = required.filter(f => fields[f] != null && fields[f] !== '').length;
  return filled / required.length;
}

// Ddocs: documentation depth — linked references normalized to expected max.
export function scoreDdocs({ docCount = 0, maxExpected = 3 } = {}) {
  return Math.min(1, docCount / maxExpected);
}

// Vvoice: qualitative context — character length normalized to target depth.
export function scoreVvoice({ contextLength = 0, target = 200 } = {}) {
  return Math.min(1, contextLength / target);
}

// Eviral: external noise impact — high noise degrades score (inverse).
export function scoreEviral({ noiseLevel = 0 } = {}) {
  return Math.max(0, 1 - Math.min(1, noiseLevel));
}

// ── CORE FORMULA ─────────────────────────────────────────────────────────────
export function computeFs(components) {
  const { Mchecksum = 0, Ttelemetry = 0, Ddocs = 0, Vvoice = 0, Eviral = 0 } = components;
  return Math.min(1, Math.max(0,
    Mchecksum  * FS_WEIGHTS.Mchecksum  +
    Ttelemetry * FS_WEIGHTS.Ttelemetry +
    Ddocs      * FS_WEIGHTS.Ddocs      +
    Vvoice     * FS_WEIGHTS.Vvoice     +
    Eviral     * FS_WEIGHTS.Eviral
  ));
}

// ── TIER CLASSIFIER ──────────────────────────────────────────────────────────
export function classifyFs(fs) {
  if (fs >= FS_TIERS.VALIDATED.threshold)    return { ...FS_TIERS.VALIDATED,    fs };
  if (fs >= FS_TIERS.ESTIMATED.threshold)    return { ...FS_TIERS.ESTIMATED,    fs };
  return { ...FS_TIERS.LOW_FIDELITY, fs };
}

// ── PRIMARY ENTRY POINT ──────────────────────────────────────────────────────
// inputs: { domain, inflow, outflow, net, fields, docCount, contextLength, noiseLevel }
export function evaluateFidelity(inputs = {}) {
  const components = {
    Mchecksum:  scoreMchecksum(inputs),
    Ttelemetry: scoreTtelemetry(inputs),
    Ddocs:      scoreDdocs(inputs),
    Vvoice:     scoreVvoice(inputs),
    Eviral:     scoreEviral(inputs),
  };
  const fs   = computeFs(components);
  const tier = classifyFs(fs);
  return { fs, tier, components };
}
