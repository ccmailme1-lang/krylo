// regimes.js — ValidationContext provider: regime labels, for the Stability operator.
// Implements SPEC-relationship-validator-operator-contract.md §3 `regimes`.
//
// Per the common contract, this is "caller-supplied or derived from signalState history" — no
// derivation logic exists yet (deriving regimes from signal history is itself part of
// Stability's Phase-3 new-logic work, not foundation-layer plumbing). This provider is a
// pass-through for explicitly supplied regime labels only.

// getRegimes(candidate, { supplied } = {}) → RegimeLabel[] | null
export function getRegimes(_candidate, { supplied } = {}) {
  if (!Array.isArray(supplied) || supplied.length === 0) return null;
  return Object.freeze([...supplied]);
}
