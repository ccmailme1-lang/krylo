// confounders.js — ValidationContext provider: named third-variable series, for the
// Independence operator. Implements SPEC-relationship-validator-operator-contract.md §3
// `confounders`.
//
// Per the common contract, "named third-variable series, empty unless supplied" — this is a
// pass-through by design, not a gap. Independence's applicability predicate (operators doc §6)
// must treat an empty/absent result as explicit N/A, never a silent skip — that conversion is
// the operator's job (Phase 3), not this provider's.

// getConfounders(candidate, { requested, supplied } = {}) → ConfounderSeries[] | null
//   requested?: string[] — names of confounders the calling operator wants, for future filtering
//   supplied?:  ConfounderSeries[] — caller-provided series
export function getConfounders(_candidate, { requested, supplied } = {}) {
  if (!Array.isArray(supplied) || supplied.length === 0) return null;
  if (!Array.isArray(requested) || requested.length === 0) return Object.freeze([...supplied]);
  const filtered = supplied.filter(c => requested.includes(c?.label));
  return filtered.length ? Object.freeze(filtered) : null;
}
