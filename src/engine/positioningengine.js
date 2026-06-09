// src/engine/positioningengine.js
// WO-1125 — Signal Positioning Engine (Phase A)
// Output: bounded vector PL = { D, V, A, R, T } — each dimension [0,1]
// UI contract: raw vector NEVER surfaces directly. Only compressed convergence states displayed.

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// D — Dependency Density
// Ecosystem interconnectedness. NOT importance/authority/popularity.
// Logarithmic to prevent winner-take-all topology collapse.
function computeD(signal, n_max) {
  const n = signal.dependency_count
    ?? (Array.isArray(signal.deps) ? signal.deps.length : 0);
  return clamp01(Math.log(1 + n) / Math.log(1 + n_max));
}

// V — Environmental Instability
// Rate of environmental state fluctuation. NOT opportunity quality. High V is NOT bullish.
function computeV(signal, sigma_max) {
  const sigma_t = signal.arrival_variance ?? signal.volatility ?? 0;
  return clamp01(sigma_t / sigma_max);
}

// A — Distribution Exposure Estimate
// Potential visibility footprint. NOT virality/conversion certainty.
// Phase A: approximated from source type when precise reach is unavailable.
function computeA(signal, r_max) {
  const r = signal.reach
    ?? signal.audience_estimate
    ?? SOURCE_TIER_REACH[signal.source_class] ?? 0;
  return clamp01(Math.log(1 + r) / Math.log(1 + r_max));
}

// Source tier → estimated reach band (Phase A approximation)
const SOURCE_TIER_REACH = {
  national_broadcast: 1e7,
  major_publication:  5e6,
  regional_outlet:    5e5,
  trade_press:        1e5,
  social_platform:    1e6,
  wire_service:       3e6,
  blog:               1e4,
  internal:           500,
};

// T — Timing Favorability
// Heuristic only — derived from V patterns + convergence acceleration + signal persistence.
// No predictive claims. Phase A: heuristic composition.
function computeT(V, signal) {
  const acceleration = signal.convergence_acceleration ?? 0;
  const persistence  = signal.signal_persistence       ?? 0;
  const acc_clamped  = clamp01(acceleration);
  return clamp01(V * 0.4 + acc_clamped * 0.35 + persistence * 0.25);
}

// R — Activation Friction (Phase A: optional + user-augmented)
// Execution difficulty for this user/context. Do NOT force onboarding friction.
// Returns null when not supplied — callers must handle null R gracefully.
function resolveR(opts) {
  return opts.R ?? null;
}

/**
 * computePositionVector(signal, opts) → { D, V, A, R, T }
 *
 * signal fields consumed (all optional with safe defaults):
 *   dependency_count | deps[]        → D
 *   arrival_variance | volatility    → V
 *   reach | audience_estimate | source_class → A
 *   convergence_acceleration         → T
 *   signal_persistence               → T
 *
 * opts:
 *   n_max     {number}  normalization ceiling for D (default 100)
 *   sigma_max {number}  normalization ceiling for V (default 1.0)
 *   r_max     {number}  normalization ceiling for A (default 1e7)
 *   R         {number|null} user-supplied activation friction (default null)
 */
export function computePositionVector(signal, opts = {}) {
  if (!signal) return null;

  const {
    n_max     = 100,
    sigma_max = 1.0,
    r_max     = 1e7,
  } = opts;

  const D = computeD(signal, n_max);
  const V = computeV(signal, sigma_max);
  const A = computeA(signal, r_max);
  const T = computeT(V, signal);
  const R = resolveR(opts);

  return { D, V, A, R, T };
}

/**
 * validatePositionVector(vec) → { valid, violations[] }
 * Each present dimension must be in [0,1]. R may be null.
 */
export function validatePositionVector(vec) {
  if (!vec) return { valid: false, violations: ['null vector'] };
  const violations = [];
  for (const dim of ['D', 'V', 'A', 'T']) {
    const v = vec[dim];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      violations.push(`${dim}=${v} out of [0,1]`);
    }
  }
  if (vec.R !== null && vec.R !== undefined) {
    if (typeof vec.R !== 'number' || vec.R < 0 || vec.R > 1) {
      violations.push(`R=${vec.R} out of [0,1]`);
    }
  }
  return { valid: violations.length === 0, violations };
}
