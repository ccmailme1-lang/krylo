// WO-1034 — PLI Engine
// 7-Point Universal Schema parser → PLI scalar
// Formula: PLI = (Gap × Velocity × Window) / Coverage
//
// The 7 Schema Points:
//   1. domain        {string}  — finance | legal | real_estate | sports | career | health | general
//   2. subject       {string}  — INVESTOR | REALTOR | ATHLETE | SALES | STUDENT | CAREER | LEGAL
//   3. goal          {string}  — plain-text objective (translates to Velocity direction + Window alignment)
//   4. decision_type {string}  — entry | hold | scale | exit | tactical
//   5. constraints   {Array}   — [{label:string, severity:number 0–1}] — compresses Window
//   6. dependencies  {Array}   — [{id:string, coverage:number 0–1, status:'lit'|'dark', correlated:bool}] — drives Gap
//   7. risk_tolerance{number}  — 0 (conservative) → 1 (aggressive)

export const SCHEMA_VERSION = '1.0';

// ── Domain configuration — ruin thresholds + lens defaults ─────────────────────

const DOMAIN_META = {
  finance:     { lens: 'INVESTOR', time_scale: 'days',   ruin: 'margin call / permanent capital loss',         pli_floor: 0.20 },
  legal:       { lens: 'LEGAL',    time_scale: 'months', ruin: 'disbarment / dismissal with prejudice',        pli_floor: 0.25 },
  real_estate: { lens: 'REALTOR',  time_scale: 'months', ruin: 'foreclosure / negative equity / illiquid hold', pli_floor: 0.15 },
  sports:      { lens: 'ATHLETE',  time_scale: 'days',   ruin: 'career-ending injury / blacklisting',          pli_floor: 0.30 },
  career:      { lens: 'CAREER',   time_scale: 'months', ruin: 'burnout / obsolescence / irreversible exit',   pli_floor: 0.20 },
  health:      { lens: 'STUDENT',  time_scale: 'weeks',  ruin: 'irreversible outcome / treatment window closure', pli_floor: 0.35 },
  general:     { lens: 'INVESTOR', time_scale: 'weeks',  ruin: 'irreversible loss',                            pli_floor: 0.15 },
};

// decision_type → window pressure multiplier
const DECISION_WINDOW = {
  entry:    0.85,
  hold:     0.60,
  scale:    0.75,
  exit:     0.40,
  tactical: 1.00,
};

// ── Schema validation ──────────────────────────────────────────────────────────

function validateSchema(schema) {
  const errors = [];
  if (!schema.domain)                                              errors.push('MISSING_DOMAIN');
  if (!schema.subject)                                             errors.push('MISSING_SUBJECT');
  if (!schema.goal || typeof schema.goal !== 'string' || schema.goal.trim().length < 3)
                                                                   errors.push('MISSING_GOAL');
  if (!schema.decision_type)                                       errors.push('MISSING_DECISION_TYPE');
  if (!Array.isArray(schema.constraints))                          errors.push('MISSING_CONSTRAINTS');
  if (!Array.isArray(schema.dependencies))                         errors.push('MISSING_DEPENDENCIES');
  if (typeof schema.risk_tolerance !== 'number' ||
      schema.risk_tolerance < 0 || schema.risk_tolerance > 1)     errors.push('INVALID_RISK_TOLERANCE');
  return errors;
}

// ── PLI component calculators ──────────────────────────────────────────────────

// Gap — fraction of adjacent signal space that is dark.
// Driven by Point 6 (dependencies) and signal's own coverage deficit.
function computeGap(dependencies, signal) {
  const depDarkRatio = dependencies.length > 0
    ? dependencies.filter(d => d.status === 'dark' || (d.coverage ?? 0.5) < 0.4).length / dependencies.length
    : 0.35;

  const signalGap = signal ? Math.max(0, 1 - (signal.coverage ?? 0.5)) : 0.50;

  // dependencies drive 60% of Gap; signal's own void drives 40%
  return Math.min(1, depDarkRatio * 0.6 + signalGap * 0.4);
}

// Velocity — normalized signal acceleration, shaped by decision_type urgency.
// Driven by signal.velocity (ETR data) and Point 4 (decision_type).
function computeVelocity(signal, decision_type) {
  const rawVel     = signal?.velocity ?? 0;
  const normalized = Math.min(1, rawVel / 5000); // 5K mentions/day = ceiling
  const dtWeight   = DECISION_WINDOW[decision_type] ?? 0.75;
  return Math.min(1, normalized * (0.70 + dtWeight * 0.30));
}

// Window — time before saturation closes the opportunity.
// Driven by Point 4 (decision_type), Point 5 (constraints), and signal freshness.
function computeWindow(schema, signal) {
  const dtWeight = DECISION_WINDOW[schema.decision_type] ?? 0.75;

  // Each high-severity constraint compresses the window
  const heavyConstraints   = (schema.constraints ?? []).filter(c => (c.severity ?? 0.5) > 0.5);
  const constraintPressure = Math.min(0.50, heavyConstraints.length * 0.12);

  // Signal freshness: 30-day linear decay
  const ageDays   = signal?.age_days ?? 3;
  const freshness = Math.max(0, 1 - ageDays / 30);

  return Math.max(0.05, dtWeight * (1 - constraintPressure) * (0.65 + freshness * 0.35));
}

// Coverage — how saturated the signal already is.
// Driven by Point 6 (dependencies) and signal source density.
function computeCoverage(signal, dependencies) {
  const sourceCount   = signal?.source_count ?? 1;
  const sourceDensity = Math.min(1, sourceCount / 20); // 20 sources = fully saturated

  const depAvg = dependencies.length > 0
    ? dependencies.reduce((acc, d) => acc + (d.coverage ?? 0.5), 0) / dependencies.length
    : 0.50;

  const raw = sourceDensity * 0.60 + depAvg * 0.40;
  return Math.max(0.01, Math.min(1, raw)); // floor prevents division by zero
}

// ── AXIS six-dimension scorer ──────────────────────────────────────────────────

function scoreAXIS(schema, components) {
  const { gap, velocity, window: win, coverage } = components;
  const rt       = schema.risk_tolerance;
  const corrDeps = schema.dependencies.filter(d => d.correlated === true);

  return {
    asymmetry:     Math.min(1, gap * (1 - coverage)),
    tail:          Math.min(1, (1 - rt) * gap),
    ruin:          Math.max(0, 1 - coverage - (1 - rt) * 0.3),
    path_dep:      Math.min(1, win * velocity),
    reversibility: Math.min(1, win * (1 - coverage)),
    stress_corr:   corrDeps.length > 0
                   ? Math.min(1, corrDeps.length / Math.max(1, schema.dependencies.length))
                   : 0.20,
  };
}

// ── Asymmetry Ratio ────────────────────────────────────────────────────────────

function computeAR(components, risk_tolerance) {
  const { gap, velocity, window: win, coverage } = components;
  const upside   = gap * velocity * (1 - coverage);
  const downside = (1 - gap) * coverage * (1 - risk_tolerance);
  if (downside < 0.001) return upside > 0 ? 9.99 : 1.0;
  return Math.max(0, upside / downside);
}

// ── Expected Value ─────────────────────────────────────────────────────────────

function computeEV(pliScalar, ar, components) {
  const { coverage } = components;
  const pGain  = pliScalar;
  const pLoss  = 1 - pliScalar;
  const avgGain = pliScalar;
  const avgLoss = coverage * pLoss;
  return pGain * avgGain - pLoss * avgLoss;
}

// ── Fold degree ────────────────────────────────────────────────────────────────
// 90° The Fold  — attractor resolve; leap over life noise
// 45° The Trend — Bayesian extrapolation; moderate assumption
//  0° The Mirror — pure empirical parity; no leap

function resolveFold(domain, pliScalar) {
  const conservative = ['health', 'legal'];
  const highVelocity = ['finance', 'sports'];
  if (conservative.includes(domain))                   return '45°';
  if (highVelocity.includes(domain) && pliScalar >= 0.70) return '90°';
  if (pliScalar >= 0.80)                               return '90°';
  if (pliScalar >= 0.45)                               return '45°';
  return '0°';
}

// ── Confidence band ────────────────────────────────────────────────────────────

function computeConfidence(pliScalar, ar, schemaErrors, integrityFlags) {
  if (schemaErrors.length > 0)                                        return 'LOW';
  if (integrityFlags.some(f => f.severity === 'hard'))                return 'LOW';
  if (pliScalar >= 0.70 && ar >= 1.5)                                 return 'HIGH';
  if (pliScalar >= 0.45 && ar >= 1.0)                                 return 'MODERATE';
  return 'LOW';
}

// ── Integrity checks — 4 gates (non-negotiable) ────────────────────────────────

function runIntegrityChecks(schema, signal, ar) {
  const flags = [];

  // Gate 1 — Signal Confidence Decay
  if ((signal?.age_days ?? 0) > 14) {
    flags.push({
      code:     'SIGNAL_STALE',
      message:  'SIGNAL STALE — leverage window unverifiable',
      severity: 'warn',
    });
  }

  // Gate 2 — Coverage Miscalculation
  if ((signal?.source_count ?? 0) < 3) {
    flags.push({
      code:     'LOW_SOURCE_DENSITY',
      message:  'LOW SOURCE DENSITY — potential leverage overstated',
      severity: 'warn',
    });
  }

  // Gate 3 — Posture declaration
  const domainDefault = (DOMAIN_META[schema.domain] ?? DOMAIN_META.general).lens;
  if (schema.subject && schema.subject !== domainDefault) {
    flags.push({
      code:     'CROSS_LENS',
      message:  `OUTPUT GENERATED UNDER: ${schema.subject} (domain default: ${domainDefault})`,
      severity: 'info',
    });
  }

  // Gate 4 — AR floor — hard gate, position has more downside than upside
  if (ar < 1.0) {
    flags.push({
      code:     'NO_ASYMMETRIC_ADVANTAGE',
      message:  'NO ASYMMETRIC ADVANTAGE DETECTED',
      severity: 'hard',
    });
  }

  return flags;
}

// ── Main parser ────────────────────────────────────────────────────────────────

/**
 * parse7PointSchema
 *
 * Translates Goal (Point 3), Constraints (Point 5), and Dependencies (Point 6)
 * into the PLI scalar via PLI = (Gap × Velocity × Window) / Coverage.
 *
 * @param {Object} schema  — 7-point universal input (see Point definitions at top)
 * @param {Object} signal  — ETR data: { id, score, velocity, coverage, source_count, age_days }
 * @returns {Object}       — pliResult
 */
export function parse7PointSchema(schema, signal = {}) {
  const schemaErrors = validateSchema(schema);
  const domain       = DOMAIN_META[schema.domain] ?? DOMAIN_META.general;

  // Component calculation
  const gap      = computeGap(schema.dependencies, signal);
  const velocity = computeVelocity(signal, schema.decision_type);
  const win      = computeWindow(schema, signal);
  const coverage = computeCoverage(signal, schema.dependencies);
  const components = { gap, velocity, window: win, coverage };

  // PLI scalar
  const pliRaw    = (gap * velocity * win) / coverage;
  const pliScalar = Math.min(1, Math.max(0, pliRaw));

  // AXIS + AR + EV
  const axis = scoreAXIS(schema, components);
  const ar   = computeAR(components, schema.risk_tolerance ?? 0.5);
  const ev   = computeEV(pliScalar, ar, components);

  // Integrity checks (4 gates)
  const integrityFlags = runIntegrityChecks(schema, signal, ar);

  // Derived outputs
  const confidence = computeConfidence(pliScalar, ar, schemaErrors, integrityFlags);
  const fold       = resolveFold(schema.domain, pliScalar);
  const ruinHit    = pliScalar < domain.pli_floor;
  const breakingPt = pliScalar >= 0.65 && ar >= 1.0 && ev > 0;
  const outputValid = schemaErrors.length === 0 &&
                      !integrityFlags.some(f => f.severity === 'hard');

  return {
    pli:             pliScalar,
    pli_raw:         pliRaw,
    components,
    axis,
    ar,
    ev,
    confidence,
    fold,
    breaking_point:  breakingPt,
    lens:            schema.subject ?? domain.lens,
    ruin_proximity:  ruinHit,
    ruin_label:      domain.ruin,
    integrity_flags: integrityFlags,
    schema_errors:   schemaErrors,
    output_valid:    outputValid,
    legal_qualifier: 'potential',
    schema_version:  SCHEMA_VERSION,
    generated_at:    new Date().toISOString(),
  };
}
