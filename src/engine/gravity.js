// WO-1002 — AHP Gravity Field
// Computes u_gravityCoefficient: asymmetric influence efficiency.
// Pull = consequence / size
// Locked spec: 2026-05-05

const EPSILON = 1e-6;

// ── Normalization (LOCAL baseline) ────────────────────────────────────────────
// Each component is normalized against its own topic-class baseline,
// not a global max. Prevents loud domains from overwhelming niche signals.

/**
 * Normalize raw signal metrics against local baselines.
 * Any metric not requiring normalization (consensusFragility,
 * crossNetworkPermeability) passes through as-is [0,1].
 *
 * @param {Object} raw       — raw metric values from signal pipeline
 * @param {Object} baselines — local topic-class reference values
 * @returns {Object}         — normalized metrics ready for gravity formula
 */
export function normalizeMetrics(raw, baselines) {
  return {
    semanticDeviation:        raw.signalEmbeddingDistance / Math.max(EPSILON, baselines.averageClusterRadius),
    propagationVelocity:      raw.currentAcceleration     / Math.max(EPSILON, baselines.baselineAcceleration),
    engagementDensity:        raw.engagementPerExposure   / Math.max(EPSILON, baselines.baselineEngagementDensity),
    crossNetworkPermeability: Math.min(1, Math.max(0, raw.crossNetworkPermeability ?? 0)),
    consensusFragility:       Math.min(1, Math.max(0, raw.consensusFragility       ?? 0)),
    signalMass:               Math.max(0, raw.signalMass ?? 0.1),
  };
}

// ── Gravity formula ────────────────────────────────────────────────────────────

/**
 * computeGravity
 *
 * @param {Object} metrics — normalized metric object (output of normalizeMetrics,
 *                           or pre-normalized values passed directly)
 * @returns {number}       — u_gravityCoefficient, clamped [0, 3]
 */
export function computeGravity(metrics) {
  const {
    semanticDeviation        = 0,
    propagationVelocity      = 0,
    crossNetworkPermeability = 0,
    engagementDensity        = 0,
    consensusFragility       = 0,
    signalMass               = 0.1,
  } = metrics;

  const numerator =
    Math.pow(Math.max(0, semanticDeviation),        0.30) *
    Math.pow(Math.max(0, propagationVelocity),      0.20) *
    Math.pow(Math.max(0, crossNetworkPermeability), 0.20) *
    Math.pow(Math.max(0, engagementDensity),        0.15) *
    Math.pow(Math.max(0, consensusFragility),       0.15);

  const denominator = Math.pow(signalMass + EPSILON, 0.45);

  const raw = numerator / denominator;
  return Math.min(3.0, Math.max(0.0, raw));
}

// ── Tier classification ────────────────────────────────────────────────────────

const TIERS = [
  { max: 0.3, tier: 'weak',    label: 'Weak Pull'         },
  { max: 0.7, tier: 'visible', label: 'Visible Deformation' },
  { max: 1.2, tier: 'strong',  label: 'Strong Anomaly'    },
  { max: 3.0, tier: 'severe',  label: 'Severe Field Event' },
];

/**
 * resolveGravityTier
 * Maps a gravity coefficient to its named tier and consumer label.
 *
 * @param {number} coefficient — output of computeGravity
 * @returns {{ tier: string, label: string, coefficient: number }}
 */
export function resolveGravityTier(coefficient) {
  const match = TIERS.find(t => coefficient <= t.max) ?? TIERS[TIERS.length - 1];
  return { tier: match.tier, label: match.label, coefficient };
}

// ── Consumer label map ────────────────────────────────────────────────────────
// Maps internal metric names to user-facing vocabulary.

export const GRAVITY_LABELS = {
  semanticDeviation:        'Narrative Shift',
  propagationVelocity:      'Momentum',
  crossNetworkPermeability: 'Spread',
  consensusFragility:       'Volatility',
  engagementDensity:        'Signal Intensity',
  gravityCoefficient:       'Pull',
  curvatureRadius:          'Influence Field',
};

// ── Full pipeline helper ──────────────────────────────────────────────────────

/**
 * resolveSignalGravity
 * Convenience: normalize → compute → classify in one call.
 *
 * @param {Object} raw       — raw signal metrics
 * @param {Object} baselines — local topic-class baselines
 * @returns {{ coefficient, tier, label, metrics }}
 */
export function resolveSignalGravity(raw, baselines) {
  const metrics     = normalizeMetrics(raw, baselines);
  const coefficient = computeGravity(metrics);
  const { tier, label } = resolveGravityTier(coefficient);
  return { coefficient, tier, label, metrics };
}
