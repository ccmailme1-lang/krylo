// WO-2009 — MetricStrip Epistemic Visibility Controller
// Hysteretic finite-state machine. Sits between computation layer and perception layer.
//
// Invariant (§20): a metric may be QUIET but never excluded from computation
// or from eligibility to surface. Visibility is latency, not suppression.
//
// States:    QUIET | ACTIVE | CRITICAL
// Anti-flicker: dual-threshold bands (entry ≠ exit) + 2.5s minimum dwell + hard overrides
// Asymmetric: upgrades are immediate; downgrades require sustained signal drop

export const VISIBILITY_MODE = {
  QUIET:    'QUIET',
  ACTIVE:   'ACTIVE',
  CRITICAL: 'CRITICAL',
};

// ── Threshold bands (entry ≠ exit — the hysteresis gap) ──────────────────────
const SCI_ACTIVE_ENTRY    = 4.2;    // QUIET → ACTIVE
const SCI_ACTIVE_EXIT     = 3.6;    // ACTIVE → QUIET  (0.6 gap)
const SCI_CRITICAL_ENTRY  = 7.2;    // ACTIVE → CRITICAL
const SCI_CRITICAL_EXIT   = 6.4;    // CRITICAL → ACTIVE (0.8 gap)

// Divergence overrides (fractureDensity from identitydynamics.js field signals)
const DIVERGENCE_FORCE_ACTIVE   = 0.75;   // force minimum ACTIVE regardless of SCI
const DIVERGENCE_FORCE_CRITICAL = 0.90;   // force CRITICAL when also FRACTURING

// Minimum time in a state before any downgrade is allowed
const MIN_DWELL_MS = 2_500;

const MODE_RANK = { QUIET: 0, ACTIVE: 1, CRITICAL: 2 };

// ── Core FSM ─────────────────────────────────────────────────────────────────
// Pure function. current = { mode, enteredAt } | null on first call.

function nextState(current, sci, divergence, velocity) {
  const fracturing = velocity === 'FRACTURING';

  // ── Hard overrides (highest precedence — fractures must surface immediately) ─
  if (fracturing || (divergence >= DIVERGENCE_FORCE_CRITICAL)) {
    return VISIBILITY_MODE.CRITICAL;
  }

  const mode = current?.mode ?? VISIBILITY_MODE.QUIET;
  const dwellMs = Date.now() - (current?.enteredAt ?? 0);

  // ── CRITICAL ──────────────────────────────────────────────────────────────
  if (mode === VISIBILITY_MODE.CRITICAL) {
    if (sci <= SCI_CRITICAL_EXIT && !fracturing && dwellMs >= MIN_DWELL_MS) {
      return VISIBILITY_MODE.ACTIVE;
    }
    return VISIBILITY_MODE.CRITICAL;
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  if (mode === VISIBILITY_MODE.ACTIVE) {
    if (sci >= SCI_CRITICAL_ENTRY || fracturing) return VISIBILITY_MODE.CRITICAL;
    if (sci <= SCI_ACTIVE_EXIT && dwellMs >= MIN_DWELL_MS) return VISIBILITY_MODE.QUIET;
    return VISIBILITY_MODE.ACTIVE;
  }

  // ── QUIET ─────────────────────────────────────────────────────────────────
  if (sci >= SCI_ACTIVE_ENTRY || divergence >= DIVERGENCE_FORCE_ACTIVE || fracturing) {
    return VISIBILITY_MODE.ACTIVE;
  }
  return VISIBILITY_MODE.QUIET;
}

// ── Public API ────────────────────────────────────────────────────────────────
// metrics:  output of computeMetrics() — must include .sci
// dynamics: output of computeTruthDynamics() — optional; null until identity bridge wired
// current:  { mode, enteredAt } — previous state; null on first call
//
// returns: { mode, enteredAt, sciTileMode, spsTileMode, triggers }

export function computeVisibilityState(metrics, dynamics = null, current = null) {
  const sci        = metrics?.sci?.score ?? 0;
  const velocity   = dynamics?.velocity?.direction ?? 'STABLE';
  const divergence = dynamics?.field?.fractureDensity?.density ?? 0;

  const targetMode = nextState(current, sci, divergence, velocity);
  const enteredAt  = current?.mode === targetMode ? (current.enteredAt ?? Date.now()) : Date.now();

  // Tile rendering modes: dormant | active | critical
  // SPS becomes equally prominent to SCI in CRITICAL — historical context is most needed when fracturing.
  const tileMode = targetMode === VISIBILITY_MODE.QUIET
    ? 'dormant'
    : targetMode === VISIBILITY_MODE.CRITICAL
      ? 'critical'
      : 'active';

  return {
    mode:        targetMode,
    enteredAt,
    sciTileMode: tileMode,
    spsTileMode: tileMode,
    triggers: {
      sci,
      velocity,
      divergence,
      criticalVelocity:   velocity === 'FRACTURING',
      criticalDivergence: divergence >= DIVERGENCE_FORCE_CRITICAL,
      criticalSCI:        sci >= SCI_CRITICAL_ENTRY,
    },
  };
}
