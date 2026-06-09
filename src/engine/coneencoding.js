// src/engine/coneencoding.js
// WO-1100 / WO-1106 — Visual Binding Contract
// Pure function: ConeState → visual primitives for GPU/R3F cone rendering.
// No state. No animation logic. No randomness.

const EMISSIVE_MIN = 0.08;
const EMISSIVE_MAX = 0.92;
const NOISE_FLOOR  = 0.12;

/**
 * @param {{ domain: string, pressure: number, volatility: number }} coneState
 * @param {{ focusId: string | null }} [opts]
 * @returns {{ height: number, radius: number, emissive: number, motion: number, focused: boolean }}
 */
export function encodeCone(coneState, { focusId = null } = {}) {
  const pressure   = Math.min(100, Math.max(0, coneState.pressure  ?? 0));
  const volatility = Math.min(1,   Math.max(0, coneState.volatility ?? 0));
  const focused    = focusId !== null && focusId === coneState.domain;

  const height   = pressure / 100;
  const radius   = 0.3 + (pressure * 0.01);
  const emissive = focused
    ? 1.0
    : EMISSIVE_MIN + volatility * (EMISSIVE_MAX - EMISSIVE_MIN);
  const motion   = volatility * 0.6 + NOISE_FLOOR;

  return { height, radius, emissive, motion, focused };
}
