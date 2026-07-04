// WO-2062 — System Calibration + Drift Correction
// Consumes LearningEvent[] from feedbackengine (WO-2061) and adjusts behavioral parameter floors.
// "Calibration modifies how the system behaves, not what the system is."
//
// Boundary rules:
//   ADJUSTABLE:   floors + thresholds (COMMIT_INTENT_FLOOR, ALERT_INTENT_FLOOR,
//                 IB_SURVIVAL_FLOOR, LENS_RELEVANCE_FLOOR, RBCS_DISCARD_THRESHOLD)
//   IMMUTABLE:    CI-F decay rates, CI-R ANCHOR_COVERAGE_FLOOR, RBCS formula weights (wT/wD/wC/wA/wV),
//                 LFOS survival/stability physics, ontology rules, edge type definitions
//   WHY:          These immutable values define what the system IS — calibration only tunes
//                 how aggressively it gates. Changing formula weights changes the model, not the tuning.
//
// Distinct from WO-1869 (path memory): WO-1869 records which routes produced leverage (route rankings).
//   This engine tunes parameter floors — orthogonal targets, both consuming observed outcomes.
// Distinct from WO-2061 (feedback): feedbackengine describes outcomes; this engine acts on them.
//
// Architecture: module-scoped CalibrationState (in-memory, per-session).
//   Components call getCalibrated(lever) to opt in to calibrated values.
//   Parameters stay within PARAM_BOUNDS at all times.
//   Accumulators reset per-lever after adjustment to prevent stale evidence compounding.

import { RBCS_INVARIANT_KEYS, RBCS_INVARIANT_VERSION } from './rbcsengine.js';

// ── Calibratable levers (exhaustive list — nothing else may be adjusted) ─────

export const CALIBRATABLE_LEVERS = [
  'COMMIT_INTENT_FLOOR',
  'ALERT_INTENT_FLOOR',
  'IB_SURVIVAL_FLOOR',
  'LENS_RELEVANCE_FLOOR',
  'RBCS_DISCARD_THRESHOLD',
];

// ── Named constants ───────────────────────────────────────────────────────────

export const CALIBRATION_DRIFT_THRESHOLD = 0.20;  // |weightedDirection| must exceed to trigger adjustment
export const MAX_DELTA                   = 0.05;  // maximum parameter shift per calibration run
export const CALIBRATION_WEIGHT_FLOOR   = 5;     // minimum accumulated N (total observations) before adjustment

// ── Parameter bounds + defaults ───────────────────────────────────────────────
// Bounds ensure calibration cannot push floors into pathological ranges.
// Defaults match the named constants in their source engines.

const PARAM_BOUNDS = {
  COMMIT_INTENT_FLOOR:    { min: 0.10, max: 0.70, default: 0.30 },  // executionengine.js
  ALERT_INTENT_FLOOR:     { min: 0.05, max: 0.50, default: 0.15 },  // executionengine.js
  IB_SURVIVAL_FLOOR:      { min: 0.10, max: 0.60, default: 0.30 },  // ibengine.js
  LENS_RELEVANCE_FLOOR:   { min: 0.20, max: 0.70, default: 0.40 },  // decisionengine.js
  RBCS_DISCARD_THRESHOLD: { min: 0.05, max: 0.50, default: 0.20 },  // rbcsengine.js
};

// ── Direction semantics (from feedbackengine LearningEvent) ───────────────────
// 'DOWN': system underpredicted (LR > 1.20) — was too conservative → LOWER the floor (admit more)
// 'UP':   system overpredicted  (LR < 0.80) — was too aggressive   → RAISE the floor (be selective)
// 'NEUTRAL': within tolerance — no adjustment signal

const DIRECTION_SIGN = { DOWN: -1, UP: +1, NEUTRAL: 0 };

// ── Module-scoped state ───────────────────────────────────────────────────────

function makeDefaultState() {
  const parameters   = {};
  const accumulators = {};
  for (const [lever, bounds] of Object.entries(PARAM_BOUNDS)) {
    parameters[lever]   = bounds.default;
    accumulators[lever] = { totalScore: 0, totalWeight: 0, eventCount: 0 };
  }
  return { parameters, accumulators, calibrationCount: 0, lastCalibrated: null };
}

let _state = makeDefaultState();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * resetCalibration — restore all parameters to defaults, clear accumulators.
 * Intended for test isolation and session restart.
 */
export function resetCalibration() {
  _state = makeDefaultState();
}

/**
 * getCalibrated — return the current calibrated value for a lever.
 * Returns null for unknown levers.
 * Components call this instead of reading their own named constant directly.
 */
export function getCalibrated(lever) {
  if (!(lever in PARAM_BOUNDS)) return null;
  return _state.parameters[lever];
}

/**
 * getCalibrationState — snapshot of current calibrated parameters.
 * For inspection, telemetry, and test assertions.
 */
export function getCalibrationState() {
  return {
    parameters:       { ..._state.parameters },
    calibrationCount: _state.calibrationCount,
    lastCalibrated:   _state.lastCalibrated,
  };
}

/**
 * applyLearningEvents — accumulate LearningEvents and apply parameter adjustments
 *
 * @param {object[]} events — LearningEvent[] from feedbackengine.processOutcomes()
 * @returns {object}        — CalibrationOutput
 *
 * Withheld events are skipped. Events for non-calibratable levers are skipped.
 * Accumulators persist across calls — adjustment only fires when sufficient evidence accumulates.
 * Per-lever accumulator resets after adjustment to avoid compounding stale evidence.
 */
export function applyLearningEvents(events) {
  // ── Step 1: Filter eligible events ──────────────────────────────────────
  const eligible = events.filter(e =>
    !e.withheld && CALIBRATABLE_LEVERS.includes(e.lever) && e.direction !== 'NEUTRAL'
  );

  // ── Step 2: Accumulate into per-lever buckets ────────────────────────────
  for (const event of eligible) {
    const acc  = _state.accumulators[event.lever];
    const sign = DIRECTION_SIGN[event.direction] ?? 0;

    // totalScore  = Σ(sign × magnitude × N) — keeps magnitude as signal strength
    // totalWeight = Σ(N)                    — pure observation count in denominator
    // weightedDirection = totalScore / totalWeight = average(sign × magnitude), N-weighted
    acc.totalScore  += sign * event.magnitude * event.N;
    acc.totalWeight += event.N;
    acc.eventCount  += 1;
  }

  // ── Step 3: Evaluate each lever — adjust if drift threshold exceeded ──────
  const adjustments = [];

  for (const lever of CALIBRATABLE_LEVERS) {
    const acc    = _state.accumulators[lever];
    const bounds = PARAM_BOUNDS[lever];

    // Not enough accumulated evidence yet
    if (acc.totalWeight < CALIBRATION_WEIGHT_FLOOR) continue;

    const weightedDirection = acc.totalScore / acc.totalWeight;

    // Signal too weak — within noise band
    if (Math.abs(weightedDirection) <= CALIBRATION_DRIFT_THRESHOLD) continue;

    const currentValue     = _state.parameters[lever];
    const rawDelta         = weightedDirection * MAX_DELTA;
    const recommendedValue = parseFloat(
      Math.min(bounds.max, Math.max(bounds.min, currentValue + rawDelta)).toFixed(4)
    );

    // Clamping may produce no net change (already at boundary)
    if (recommendedValue === currentValue) {
      _state.accumulators[lever] = { totalScore: 0, totalWeight: 0, eventCount: 0 };
      continue;
    }

    _state.parameters[lever] = recommendedValue;

    adjustments.push({
      lever,
      previousValue:     currentValue,
      newValue:          recommendedValue,
      delta:             parseFloat((recommendedValue - currentValue).toFixed(4)),
      weightedDirection: parseFloat(weightedDirection.toFixed(4)),
      totalWeight:       parseFloat(acc.totalWeight.toFixed(3)),
      eventCount:        acc.eventCount,
      reason:            weightedDirection > 0
        ? `Consistent UP signal (${lever} too permissive) — raising floor by ${parseFloat(Math.abs(recommendedValue - currentValue).toFixed(4))}`
        : `Consistent DOWN signal (${lever} too conservative) — lowering floor by ${parseFloat(Math.abs(recommendedValue - currentValue).toFixed(4))}`,
    });

    // Reset accumulator after applying — prevents stale evidence from compounding
    _state.accumulators[lever] = { totalScore: 0, totalWeight: 0, eventCount: 0 };
  }

  _state.calibrationCount += 1;
  _state.lastCalibrated    = Date.now();

  return {
    adjustments,
    processedAt:    Date.now(),
    totalEvents:    events.length,
    eligibleEvents: eligible.length,
    skippedEvents:  events.length - eligible.length,
    totalAdjusted:  adjustments.length,
  };
}

// ── KRYL-981 — Domain Profile enforcement (Perception-as-a-Service boundary) ───
//
// Classification: pure guard/gate — validates a proposed write, never mutates
// RBCS/identity/routing state itself and never reads back a prior inference
// result. This is the same category as CI-R's admission gate, not a scoring
// or reconstruction step.
//
// Enforcement Point: this is the single authoritative boundary for all DomainProfile
// writes. verifyDomainProfile() MUST be called before any DomainProfile is persisted.
//
// RBCS weights (wT/wD/wC/wA/wV, defined in rbcsengine.js) are IMMUTABLE per this
// file's own header comment above — no per-domain profile may touch them. A domain
// profile may only ever adjust the five CALIBRATABLE_LEVERS already defined in this
// file. Any other key is a schema violation.

// Derived from rbcsengine.js's own versioned export — never hand-duplicate this
// key list. If RBCS_INVARIANT_VERSION ever bumps (i.e. the weight key set itself
// changes), profiles validated against a stale version are treated as needing
// re-validation rather than silently assumed still-compliant.
const RBCS_FORBIDDEN_KEYS = RBCS_INVARIANT_KEYS;

const DOMAIN_PROFILE_ALLOWED_KEYS = [
  'domain_id',
  'interpretation_tier',
  ...CALIBRATABLE_LEVERS,                 // the five real, already-adjustable floors
  'additive_explain_boost',               // presentation-only
  'summary_length_target',                // presentation-only
];

/**
 * verifyDomainProfile — hard guard against RBCS-weight mutation and schema drift.
 * Throws E_RBCS_LOCK if any forbidden RBCS weight key is present.
 * Throws E_SCHEMA_VIOLATION if any key outside the allowed set is present.
 * Throws E_RBCS_VERSION_STALE if the profile was validated against an
 * RBCS_INVARIANT_VERSION older than the current one — forces re-validation
 * instead of silently trusting a guard that assumed a prior invariant set.
 * Call this as the first line of any DomainProfile write path, before persistence.
 */
export function verifyDomainProfile(domainProfile, { assumedRbcsVersion } = {}) {
  const keys = Object.keys(domainProfile ?? {});

  if (Number.isFinite(assumedRbcsVersion) && assumedRbcsVersion !== RBCS_INVARIANT_VERSION) {
    const err = new Error('E_RBCS_VERSION_STALE');
    err.code = 'E_RBCS_VERSION_STALE';
    throw err;
  }

  if (keys.some(k => RBCS_FORBIDDEN_KEYS.includes(k))) {
    const err = new Error('E_RBCS_LOCK');
    err.code = 'E_RBCS_LOCK';
    throw err;
  }

  if (!keys.every(k => DOMAIN_PROFILE_ALLOWED_KEYS.includes(k))) {
    const err = new Error('E_SCHEMA_VIOLATION');
    err.code = 'E_SCHEMA_VIOLATION';
    throw err;
  }

  return { valid: true, rbcsInvariantVersion: RBCS_INVARIANT_VERSION };
}
