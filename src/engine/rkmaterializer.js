// WO-2052 — Signal Stabilization Contract
// Single normalization point for all signal connectors.
// Every connector calls materializeSignal() before dispatch — no hidden arithmetic in adapters.
//
// Boundary rules:
//   NO surfacerouter, NO dispatchBatch — connectors own dispatch.
//   NO RKM mutation — read truthStability from caller; never write.
//   NO connector-specific logic — domain routing, event classification stay in the connector.

// ── Named constants ───────────────────────────────────────────────────────────
// Previously embedded as literals in edgar8ksignal.js buildSignals().
// Declared here so policy is visible and auditable, never inferred from arithmetic.

export const CONFIDENCE_STABILITY_WEIGHT  = 0.5;    // groundedness:stability blend ratio
export const SECONDARY_SIGNAL_ATTENUATION = 0.65;   // multi-domain secondary signal reduction
export const SECONDARY_CONF_ATTENUATION   = 0.80;   // multi-domain secondary confidence reduction
export const STALENESS_BOUND_MS           = 300_000; // 5 min — for time-sensitive connectors

// ── materializeSignal ─────────────────────────────────────────────────────────
// Blends raw confidence with RKM truthStability to produce a normalized signal packet.
// Call once per primary signal before dispatch.
//
// @param {object} raw          — { signal, confidence (0–100), ts, ...rest }
// @param {number} truthStability — RealityObject.truthStability (0–1); default 1.0 if RO absent
// @returns {object} — raw with confidence field normalized; all other fields pass through unchanged
export function materializeSignal(raw, truthStability = 1.0) {
  const confidence = Math.round(
    Math.min(100, raw.confidence * (CONFIDENCE_STABILITY_WEIGHT + truthStability * CONFIDENCE_STABILITY_WEIGHT))
  );
  return { ...raw, confidence };
}

// ── attenuateSecondary ────────────────────────────────────────────────────────
// Reduces signal + confidence for secondary domain emissions.
// Call when index > 0 in a multi-domain expansion, after materializeSignal on the primary.
//
// @param {number} signal     — materialized primary signal value (0–100)
// @param {number} confidence — materialized primary confidence value (0–100)
// @returns {{ signal: number, confidence: number }}
export function attenuateSecondary(signal, confidence) {
  return {
    signal:     Math.round(signal     * SECONDARY_SIGNAL_ATTENUATION),
    confidence: Math.round(confidence * SECONDARY_CONF_ATTENUATION),
  };
}
