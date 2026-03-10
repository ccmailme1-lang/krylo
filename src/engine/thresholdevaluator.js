// src/engine/thresholdevaluator.js
// WO-253 Step 2 — Threshold Evaluator
// Evaluates live metric values against THRESHOLDS, returns per-metric band.

import { THRESHOLDS } from '../components/spine/constants.js';

export { THRESHOLDS };

export const THRESHOLD_COLORS = {
  green: 'rgba(232,244,255,0.85)',
  amber: '#FFB347',
  red:   '#FF4444',
};

/**
 * evaluateThresholds(metrics) → { [metric]: 'green'|'amber'|'red' }
 *
 * metrics shape (all optional):
 *   heartbeat            — 0–1 score
 *   velocity             — Fs/s rate (signed)
 *   velocityNegDuration  — seconds of continuous negative velocity
 *   headroom             — percentage 0–100
 *   signal               — 'Strong'|'Moderate'|'Weak' (case-insensitive)
 *   reaction             — milliseconds
 */
export function evaluateThresholds(metrics) {
  const out = {};

  if (metrics.heartbeat !== undefined) {
    const v = metrics.heartbeat;
    out.heartbeat = v >= THRESHOLDS.heartbeat.amber ? 'green'
      : v >= THRESHOLDS.heartbeat.red               ? 'amber'
      : 'red';
  }

  if (metrics.velocity !== undefined) {
    const v   = metrics.velocity;
    const dur = metrics.velocityNegDuration ?? 0;
    out.velocity = v <= THRESHOLDS.velocity.redRate             ? 'red'
      : dur >= THRESHOLDS.velocity.amberDuration                ? 'amber'
      : 'green';
  }

  if (metrics.headroom !== undefined) {
    const v = metrics.headroom / 100;
    out.headroom = v > THRESHOLDS.headroom.amber ? 'green'
      : v > THRESHOLDS.headroom.red              ? 'amber'
      : 'red';
  }

  if (metrics.signal !== undefined) {
    const v = metrics.signal.toLowerCase();
    out.signal = v === THRESHOLDS.signal.red                              ? 'red'
      : v === THRESHOLDS.signal.amber || v === 'moderate'                 ? 'amber'
      : 'green';
  }

  if (metrics.reaction !== undefined) {
    const v = metrics.reaction;
    out.reaction = v <= THRESHOLDS.reaction.amber ? 'green'
      : v <= THRESHOLDS.reaction.red              ? 'amber'
      : 'red';
  }

  return out;
}
