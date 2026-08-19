// evidence.js — ValidationContext provider: E (evidence bundle).
// Implements SPEC-relationship-validator-operator-contract.md §3 `evidence`.
//
// NOT LIVE-WIRED — genuine gap, not an oversight. RelationCore.provenanceHash is a BLAKE3 hash
// of "evidence bundle ⊕ observation ids ⊕ path" (relationontology.js). No function anywhere in
// this codebase resolves that hash back to the actual evidence bundle — evidencetiers.js's
// getDescriptor()/listByClass() are static per-TYPE metadata lookups, not per-instance evidence
// stores. This was verified by direct read, not assumed.
//
// Per §22 (Absence-Is-Signal), this returns null (STRUCTURAL ABSENCE — the resolution mechanism
// does not exist, not "no evidence was found") rather than fabricating one. A caller with a real
// evidence store may inject a resolver; until then every consumer of this provider correctly
// sees "no evidence context available," which the applicability contract (common contract §4)
// already handles as N/A, not a penalized failure.

// getEvidence(candidate, { resolver } = {}) → E[] | null
//   resolver?: (provenanceHash: string) => E[] | null — injection point for a future evidence
//   store; this module supplies no default implementation because none exists to supply.
export function getEvidence(candidate, { resolver } = {}) {
  if (!candidate?.provenanceHash) return null;
  if (typeof resolver !== 'function') return null;
  const result = resolver(candidate.provenanceHash);
  return result ? Object.freeze([...result]) : null;
}
