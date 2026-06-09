// Resolution Arbitration Model v1 — Telemetry Injection Point Spec v1.0
//
// confidenceScore is not entropy.
// It is weighted outcome dominance over total evidentiary weight.
//
// Source weights define epistemic authority, not frequency.
// TTL is closure enforcement, not truth signal.

import { emitTelemetry } from './telemetry.js';

const SOURCE_WEIGHTS = { user: 1.0, ingestion: 0.6, ttl: 0.2 };

// Tie-breaking margin: if computed outcome and user result differ by ≤ this, user wins.
const USER_DOMINANCE_MARGIN = 0.2;

// Append-only resolution log keyed by actionId.
// NOTE: "partial" is currently treated as structurally symmetric with success/fail.
// Semantics of partial vs success/fail dominance is an open calibration item — do not
// collapse partial into fail without an explicit spec change.
const _resolutionLog = new Map();

// ---------------------------------------------------------------------------
// emitResolutionEvent
// Single entry point for all resolution signals.
// source defaults are only applied when confidenceWeight is not explicitly provided.
// ---------------------------------------------------------------------------
export function emitResolutionEvent({ sessionId, actionId, result, source, confidenceWeight }) {
  if (!sessionId || !actionId) return;

  const weight = confidenceWeight ?? SOURCE_WEIGHTS[source] ?? 0.2;
  const event  = { sessionId, actionId, result, source, confidenceWeight: weight, timestamp: Date.now() };

  if (!_resolutionLog.has(actionId)) _resolutionLog.set(actionId, []);
  _resolutionLog.get(actionId).push(event);

  emitTelemetry({ type: 'action_resolved', sessionId, actionId, result, source, confidenceWeight: weight, timestamp: event.timestamp });
}

// ---------------------------------------------------------------------------
// computeFinalOutcome
// Runs arbitration over all resolution events for an actionId.
// Returns deterministic final state. Same inputs always produce same output.
// ---------------------------------------------------------------------------
export function computeFinalOutcome(actionId) {
  const events = _resolutionLog.get(actionId) ?? [];
  if (events.length === 0) return null;

  const hasUserEvent = events.some(e => e.source === 'user');

  // TTL guard: TTL cannot apply when a user event exists.
  const eligible = events.filter(e => !(e.source === 'ttl' && hasUserEvent));

  let successScore = 0;
  let failScore    = 0;
  let partialScore = 0;
  let totalWeight  = 0;

  for (const e of eligible) {
    totalWeight += e.confidenceWeight;
    if (e.result === 'success')      successScore += e.confidenceWeight;
    else if (e.result === 'fail')    failScore    += e.confidenceWeight;
    else if (e.result === 'partial') partialScore += e.confidenceWeight;
  }

  // Arbitration rule (spec §5.2)
  let finalOutcome;
  if (successScore > failScore && successScore > partialScore) {
    finalOutcome = 'success';
  } else if (failScore > successScore) {
    finalOutcome = 'fail';
  } else {
    finalOutcome = 'partial';
  }

  // User dominance tie-break (spec §6.2)
  // If the latest user event disagrees with the computed outcome and
  // the margin between them is within USER_DOMINANCE_MARGIN, user wins.
  if (hasUserEvent) {
    const userEvents = eligible.filter(e => e.source === 'user');
    const latestUserResult = userEvents[userEvents.length - 1]?.result;

    if (latestUserResult && latestUserResult !== finalOutcome) {
      const computedScore = finalOutcome === 'success' ? successScore
        : finalOutcome === 'fail' ? failScore
        : partialScore;
      const userScore = userEvents.reduce((acc, e) => acc + e.confidenceWeight, 0);

      if (Math.abs(computedScore - userScore) <= USER_DOMINANCE_MARGIN) {
        finalOutcome = latestUserResult;
      }
    }
  }

  // Dominant source: source with highest weight contribution to the winning outcome.
  const winBySource = {};
  for (const e of eligible) {
    if (e.result === finalOutcome) {
      winBySource[e.source] = (winBySource[e.source] ?? 0) + e.confidenceWeight;
    }
  }
  const dominantSource = Object.entries(winBySource).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

  // confidenceScore = normalized dominance (spec §conf1/conf2)
  const winningScore   = finalOutcome === 'success' ? successScore
    : finalOutcome === 'fail' ? failScore
    : partialScore;
  const confidenceScore = totalWeight > 0 ? winningScore / totalWeight : 0;

  return {
    actionId,
    finalOutcome,
    confidenceScore,
    dominantSource,
    resolutionCount: eligible.length,
  };
}

// Read-only accessor for the resolution log (for reconciliation engine).
export function getResolutionLog(actionId) {
  return (_resolutionLog.get(actionId) ?? []).slice();
}
