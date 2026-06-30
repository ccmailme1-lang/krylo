// WO-2060 — Action Execution Layer
// Translates DecisionOutput + execution mode into ActionSpec[] and ExecutionRecord[].
// Three modes: SIMULATION (no side effects) | PARTIAL (signal only) | LIVE (full execution).
// Every record is trace-linked to a convictionId — persistence is convictionstore's responsibility (WO-1823).
//
// Boundary rules:
//   NO scoring     — intentScore/collapsedScore are immutable from upstream
//   NO graph data  — DecisionCandidate carries typed scalars only; no reconstruction
//   NO path memory — convictionId is a trace anchor emitted outward; this engine does not store
//   NO calibration — WO-2061 (feedback) and WO-2062 (calibration) handle learning; this engine acts
//   ONLY: mode-gated action type → ActionSpec → ExecutionRecord

// ── Named constants ───────────────────────────────────────────────────────────

export const COMMIT_INTENT_FLOOR = 0.30;  // intentScore >= this → COMMIT type in LIVE mode
export const ALERT_INTENT_FLOOR  = 0.15;  // intentScore >= this → ALERT type; below → MONITOR

// ── Action type selection ─────────────────────────────────────────────────────
// SIMULATION forces MONITOR — no commitment, no emission, pure observation.
// PARTIAL caps at ALERT — signal emitted, no structural commitment.
// LIVE allows full range based on intentScore tier.

const ACTION_TYPES = ['MONITOR', 'ALERT', 'COMMIT', 'EXPORT'];

function selectActionType(intentScore, mode) {
  if (mode === 'SIMULATION') return 'MONITOR';

  if (intentScore >= COMMIT_INTENT_FLOOR) {
    // PARTIAL caps at ALERT; LIVE allows COMMIT
    return mode === 'LIVE' ? 'COMMIT' : 'ALERT';
  }
  if (intentScore >= ALERT_INTENT_FLOOR) return 'ALERT';
  return 'MONITOR';
}

// ── Execution status ──────────────────────────────────────────────────────────
// SIMULATED: mode=SIMULATION — no side effect occurred
// EMITTED:   signal dispatched (MONITOR or ALERT, any mode that isn't SIMULATION)
// COMMITTED: structural commitment recorded (COMMIT or EXPORT in LIVE mode)

function selectStatus(mode, actionType) {
  if (mode === 'SIMULATION') return 'SIMULATED';
  if (actionType === 'COMMIT' || actionType === 'EXPORT') return 'COMMITTED';
  return 'EMITTED';
}

// ── Payload derivation ────────────────────────────────────────────────────────
// Payload is derived from DecisionCandidate scalars only. No graph data crosses this boundary.

function buildPayload(candidate, actionType, lens) {
  switch (actionType) {
    case 'MONITOR':
      return {
        watchSignal:    `tier:${candidate.tier} score:${candidate.collapsedScore}`,
        watchCondition: candidate.failureModes.length > 0
          ? `WATCH_FAILURES: ${candidate.failureModes.join(', ')}`
          : 'STABLE',
      };

    case 'ALERT':
      return {
        urgency:    candidate.tier === 'PRIORITY' ? 'HIGH' : 'MEDIUM',
        conditions: [
          ...candidate.instabilityVectors.map(v => `INSTABILITY:${v}`),
          ...candidate.failureModes.map(f => `FAILURE:${f}`),
        ],
      };

    case 'COMMIT':
      return {
        thesis:     `${lens} signal convergence — ${candidate.tier}`,
        conviction: candidate.intentScore,
        horizon:    candidate.tier === 'PRIORITY' ? 'NEAR' : 'MEDIUM',
      };

    case 'EXPORT':
      return {
        format:     'STRUCTURED',
        conviction: candidate.intentScore,
        tier:       candidate.tier,
      };

    default:
      return {};
  }
}

// ── convictionId ──────────────────────────────────────────────────────────────
// Deterministic trace anchor. convictionstore.js (WO-1823) is responsible for
// creating/persisting the conviction record against this ID.

function deriveConvictionId(sourceCI, candidateId) {
  return `cv_${sourceCI}_${candidateId}`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * executeDecision — translate DecisionOutput into ExecutionRecord[]
 *
 * @param {object} decision — DecisionOutput from decisionengine.applyDecisionFramework()
 * @param {string} mode     — 'SIMULATION' | 'PARTIAL' | 'LIVE'
 * @returns {object}        — ExecutionOutput
 *
 * convictionId on each record is a trace anchor for convictionstore (WO-1823).
 * This engine DOES NOT write to convictionstore — caller is responsible.
 */
export function executeDecision(decision, mode) {
  if (!['SIMULATION', 'PARTIAL', 'LIVE'].includes(mode)) {
    throw new Error(`executeDecision: invalid mode "${mode}"`);
  }

  const { sourceCI, lens, candidates } = decision;
  const records = [];

  for (const candidate of candidates) {
    const actionType   = selectActionType(candidate.intentScore, mode);
    const status       = selectStatus(mode, actionType);
    const convictionId = deriveConvictionId(sourceCI, candidate.candidateId);
    const actionId     = `act_${convictionId}_${actionType.toLowerCase()}`;

    records.push({
      recordId:     `rec_${actionId}`,
      actionId,
      candidateId:  candidate.candidateId,
      convictionId,             // trace link — persist via convictionstore (WO-1823)
      branchId:     candidate.branchId,
      sourceCI,
      lens,
      actionType,
      mode,
      status,
      intentScore:  candidate.intentScore,
      payload:      buildPayload(candidate, actionType, lens),
      executedAt:   Date.now(),
    });
  }

  const committed  = records.filter(r => r.status === 'COMMITTED');
  const emitted    = records.filter(r => r.status === 'EMITTED');
  const simulated  = records.filter(r => r.status === 'SIMULATED');

  return {
    sourceCI,
    lens,
    mode,
    records,
    executedAt:      Date.now(),
    totalInput:      candidates.length,
    totalCommitted:  committed.length,
    totalEmitted:    emitted.length,
    totalSimulated:  simulated.length,
  };
}
