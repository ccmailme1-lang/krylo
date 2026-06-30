// WO-2061 — Feedback / Learning Loop
// Processes ObservedOutcome[] into LearningEvent[] for system calibration (WO-2062).
// Descriptive only — no system mutation. WO-2062 reads these events and adjusts parameters.
//
// Boundary rules:
//   NO system mutation  — WO-2062 (Calibration) applies parameter changes; this engine only describes
//   NO path memory      — WO-1869 records which routes produced leverage (route rankings in convictionstore)
//                         This engine informs parameter calibration, not route memory — distinct systems
//   NO fabrication      — WITHHOLD BEATS FABRICATE: direction withheld below ATTRIBUTION_FLOOR or MIN_N
//   NO upstream scoring — LearningEvents are forward-only telemetry; RBCS/LFOS/IB never consume them
//   ONLY: ObservedOutcome → leverageRatio → attribution gate → direction + lever → LearningEvent

// ── Named constants ───────────────────────────────────────────────────────────

export const ATTRIBUTION_FLOOR   = 0.60;  // below this → withheld (WITHHOLD BEATS FABRICATE)
export const MIN_N_FOR_DIRECTION = 3;     // minimum sample size; single events cannot drive parameter shifts
export const LR_UPPER_THRESHOLD  = 1.20;  // LR > this → system underpredicted → direction DOWN
export const LR_LOWER_THRESHOLD  = 0.80;  // LR < this → system overpredicted  → direction UP
// LR within [LR_LOWER, LR_UPPER] → NEUTRAL (within tolerance, no adjustment signal)

// ── Lever identification ──────────────────────────────────────────────────────
// Maps each outcome's actionType to the parameter it most directly informs.
// WO-2062 reads lever + direction to determine which named constant to adjust.

const LEVER_MAP = {
  COMMIT:  'COMMIT_INTENT_FLOOR',    // over/undercommit → raise/lower commit floor
  ALERT:   'ALERT_INTENT_FLOOR',     // over/underalert  → raise/lower alert floor
  MONITOR: 'ALERT_INTENT_FLOOR',     // monitor that should have alerted (or correctly stayed quiet)
  EXPORT:  'LENS_RELEVANCE_FLOOR',   // export relevance mismatch → lens floor tuning
};

function selectLever(actionType) {
  return LEVER_MAP[actionType] ?? 'RBCS_DISCARD_THRESHOLD';
}

// ── leverageRatio ─────────────────────────────────────────────────────────────
// LR = actualScore / projectedScore — same instrument as §19.
// Answers: "did the action produce what the system predicted?"
// null when projectedScore = 0 (undefined — outcome cannot be attributed).

function computeLR(actualScore, projectedScore) {
  if (!projectedScore || projectedScore <= 0) return null;
  return parseFloat((actualScore / projectedScore).toFixed(4));
}

// ── Direction + magnitude ─────────────────────────────────────────────────────

function computeDirection(lr) {
  if (lr === null)               return 'NEUTRAL';
  if (lr > LR_UPPER_THRESHOLD)  return 'DOWN';   // system was too conservative
  if (lr < LR_LOWER_THRESHOLD)  return 'UP';     // system was too aggressive
  return 'NEUTRAL';
}

function computeMagnitude(lr) {
  if (lr === null) return 0;
  return parseFloat(Math.min(1.0, Math.abs(lr - 1.0)).toFixed(3));
}

// ── Attribution gate ──────────────────────────────────────────────────────────
// Coincidence is not causation. Direction withheld until both conditions are met:
//   1. attributionConf >= ATTRIBUTION_FLOOR
//   2. N >= MIN_N_FOR_DIRECTION
// Emitting a LearningEvent with withheld=true keeps the audit trail complete
// while signaling to WO-2062 that this event must not drive parameter changes.

function shouldWithhold(attributionConf, N) {
  return attributionConf < ATTRIBUTION_FLOOR || N < MIN_N_FOR_DIRECTION;
}

function withholdReason(attributionConf, N) {
  const reasons = [];
  if (attributionConf < ATTRIBUTION_FLOOR) {
    reasons.push(`attributionConf ${attributionConf.toFixed(2)} < floor ${ATTRIBUTION_FLOOR}`);
  }
  if (N < MIN_N_FOR_DIRECTION) {
    reasons.push(`N=${N} < MIN_N=${MIN_N_FOR_DIRECTION}`);
  }
  return reasons.join('; ');
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * processOutcomes — convert ObservedOutcome[] to LearningEvent[]
 *
 * @param {object[]} outcomes — ObservedOutcome[]
 * @returns {object}          — FeedbackOutput
 *
 * ObservedOutcome schema:
 *   outcomeId:       string    — stable ID for this observation
 *   recordId:        string    — trace link to ExecutionRecord (WO-2060)
 *   convictionId:    string    — trace link to conviction (WO-1823)
 *   branchId:        string    — trace link to GCB (for WO-1869 path memory — consumed separately)
 *   sourceCI:        string
 *   actionType:      string    — COMMIT | ALERT | MONITOR | EXPORT (from ExecutionRecord)
 *   actualScore:     number    — realized outcome score [0–100]
 *   projectedScore:  number    — system prediction (intentScore scaled to same range)
 *   attributionConf: number    — [0,1] confidence that outcome is caused by this action
 *   N:               number    — count of similar outcomes in evidence
 *   observedAt:      number    — Unix ms
 *
 * LearningEvents with withheld=true are audit records — WO-2062 must not use them for adjustment.
 * WO-1869 (path memory) is NOT fed here — it consumes branchId + outcome directly from convictionstore.
 */
export function processOutcomes(outcomes) {
  const events = [];

  for (const outcome of outcomes) {
    const { outcomeId, recordId, convictionId, actionType, attributionConf, N, observedAt } = outcome;

    const lr        = computeLR(outcome.actualScore, outcome.projectedScore);
    const withheld  = shouldWithhold(attributionConf, N);
    const lever     = selectLever(actionType);

    let direction = 'NEUTRAL';
    let magnitude = 0;
    let reason    = '';

    if (withheld) {
      reason = withholdReason(attributionConf, N);
      // direction and magnitude stay at defaults — withheld events carry no adjustment signal
    } else {
      direction = computeDirection(lr);
      magnitude = computeMagnitude(lr);
      reason    = lr === null
        ? 'projectedScore=0 — leverageRatio undefined'
        : direction === 'NEUTRAL'
          ? `LR=${lr} within tolerance [${LR_LOWER_THRESHOLD}, ${LR_UPPER_THRESHOLD}]`
          : direction === 'DOWN'
            ? `LR=${lr} > ${LR_UPPER_THRESHOLD} — system underpredicted; ${lever} may be too conservative`
            : `LR=${lr} < ${LR_LOWER_THRESHOLD} — system overpredicted; ${lever} may be too permissive`;
    }

    events.push({
      eventId:         `le_${outcomeId}`,
      outcomeId,
      recordId,
      convictionId,
      lever,           // which named constant this event informs (WO-2062 reads this)
      direction,       // UP | DOWN | NEUTRAL
      magnitude,       // [0,1] — how strongly this event suggests adjustment
      leverageRatio:   lr,
      attributionConf,
      N,
      withheld,        // if true: WO-2062 must not apply this event to parameter adjustment
      reason,
      observedAt,
      processedAt:     Date.now(),
    });
  }

  const withheldCount    = events.filter(e => e.withheld).length;
  const directionalCount = events.filter(e => !e.withheld && e.direction !== 'NEUTRAL').length;
  const neutralCount     = events.filter(e => !e.withheld && e.direction === 'NEUTRAL').length;

  return {
    events,
    processedAt:      Date.now(),
    totalInput:       outcomes.length,
    totalWithheld:    withheldCount,
    totalDirectional: directionalCount,
    totalNeutral:     neutralCount,
  };
}
