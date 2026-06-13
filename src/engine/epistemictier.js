// src/engine/epistemictier.js — Epistemic Tier Boundary Enforcement
//
// Defines the three inference layers and enforces downward-only flow.
// Enforcement is schema-level (boundary gates), not property-level (freezing).
// Philosophy: correctness at crossing points, not immutability of objects.
//
// Layer order (downward only):
//   META (0) → WEAK (1) → NC (2)
//
// WO-1743: META — authoritative schema / declarative truth space
// WO-1726: WEAK — probabilistic emergence / sub-threshold detection
// WO-1734: NC   — divergence topology / disagreement detection

export const EPISTEMIC_TIER = {
  META: 'META',
  WEAK: 'WEAK',
  NC:   'NC',
};

const TIER_ORDER = { META: 0, WEAK: 1, NC: 2 };

// tagWithTier(obj, tier)
// Returns a new object with _epistemicTier and promotable attached.
// Call this at the OUTPUT boundary of each layer before returning data.
export function tagWithTier(obj, tier) {
  if (!EPISTEMIC_TIER[tier]) {
    throw new Error(`EpistemicInvariantViolation: unknown tier "${tier}"`);
  }
  return { ...obj, _epistemicTier: tier, promotable: false };
}

// validateFlowDirection(fromTier, toTier)
// Throws if data would flow upward (e.g. NC → WEAK, WEAK → META).
// Call this at the INPUT boundary of each layer consumer.
export function validateFlowDirection(fromTier, toTier) {
  const from = TIER_ORDER[fromTier];
  const to   = TIER_ORDER[toTier];
  if (from === undefined) {
    throw new Error(`EpistemicInvariantViolation: unknown fromTier "${fromTier}"`);
  }
  if (to === undefined) {
    throw new Error(`EpistemicInvariantViolation: unknown toTier "${toTier}"`);
  }
  if (to < from) {
    throw new Error(
      `EpistemicInvariantViolation: upward flow forbidden — ` +
      `"${fromTier}" → "${toTier}". DOWNWARD FLOW ONLY: META → WEAK → NC.`
    );
  }
}

// validateBoundary(obj, expectedTier)
// Call at every layer gate before consuming an object from another layer.
// Enforces: correct tier tag + promotable === false.
export function validateBoundary(obj, expectedTier) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('EpistemicInvariantViolation: boundary object must be a non-null object');
  }
  if (!EPISTEMIC_TIER[expectedTier]) {
    throw new Error(`EpistemicInvariantViolation: unknown expectedTier "${expectedTier}"`);
  }
  if (obj._epistemicTier !== expectedTier) {
    throw new Error(
      `EpistemicInvariantViolation: expected tier "${expectedTier}", ` +
      `got "${obj._epistemicTier ?? 'untagged'}"`
    );
  }
  if (obj.promotable !== false) {
    throw new Error(
      `EpistemicInvariantViolation: promotable must be false at tier "${expectedTier}" boundary — ` +
      `got ${JSON.stringify(obj.promotable)}`
    );
  }
}
