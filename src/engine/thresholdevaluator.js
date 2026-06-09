// src/engine/thresholdevaluator.js
// WO-256-A — Threshold Evaluator (Biological Hardening)
// Establishes HEX colors and evaluation logic for the Truth Engine.

import { THRESHOLDS } from "../components/spine/constants.js";

export { THRESHOLDS };

// Normalized HEX palette for the UI
export const THRESHOLD_COLORS = {
  green: "#4ADE80",
  amber: "#007FFF",
  red: "#FF4444",
};

/**
 * Evaluate core metrics against established thresholds.
 * @param {Object} metrics { heartbeat, velocity, velocityNegDuration, headroom, signal, reaction }
 */
export function evaluateThresholds(metrics) {
  const out = {};
  if (!metrics) return out;

  // 1. Heartbeat / Resonance (Higher is better)
  if (metrics.heartbeat !== undefined) {
    const v = metrics.heartbeat;
    out.heartbeat =
      v >= THRESHOLDS.heartbeat.amber
        ? "green"
        : v >= THRESHOLDS.heartbeat.red
        ? "amber"
        : "red";
  }

  // 2. Velocity / Motion (Checks for rate and staleness)
  if (metrics.velocity !== undefined) {
    const v = metrics.velocity;
    const dur = metrics.velocityNegDuration ?? 0;
    out.velocity =
      v <= THRESHOLDS.velocity.redRate
        ? "red"
        : dur >= THRESHOLDS.velocity.amberDuration
        ? "amber"
        : "green";
  }

  // 3. Headroom / Vault Capacity
  if (metrics.headroom !== undefined) {
    const v = metrics.headroom / 100;
    out.headroom =
      v > THRESHOLDS.headroom.amber
        ? "green"
        : v > THRESHOLDS.headroom.red
        ? "amber"
        : "red";
  }

  // 4. Signal Category Mapping
  if (metrics.signal !== undefined) {
    const v = metrics.signal.toLowerCase();
    out.signal =
      v === THRESHOLDS.signal.red
        ? "red"
        : v === THRESHOLDS.signal.amber
        ? "amber"
        : "green";
  }

  return out;
}