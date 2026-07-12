// relationaudit.js — WO-20XX SRE Phase 1: boundary-law audit hooks A2/A4/A5.
// Appendix A v1.2 §8. A1 (immutability) and A3 (event Δϕ) already live in
// relationontology.js; this closes the remaining three. Each throws on violation
// so CI can prove the invariants over synthetic history.

// A2 — Time monotonicity: dynamics stream is strictly increasing in time.
export function assertTimeMonotonic(prev, next) {
  if (!prev) return true;
  if (!(next.timestamp > prev.timestamp)) {
    throw new Error(`SRE A2 violation: timestamp not strictly increasing (${prev.timestamp} → ${next.timestamp}).`);
  }
  return true;
}

// A4 — Governance freeze: every write uses the ACTIVE profile version; downgrades illegal.
//   policy 𝒫 must have a version and vStart; the write timestamp must be ≥ vStart.
export function assertGovernanceActive(policy, writeTs) {
  if (!policy || !policy.version) throw new Error('SRE A4 violation: no governance profile version bound to write.');
  if (policy.vStart != null && writeTs < policy.vStart) {
    throw new Error(`SRE A4 violation: write ts ${writeTs} precedes active profile vStart ${policy.vStart} (stale/downgraded 𝒫).`);
  }
  return true;
}

// A5 — Observation purity: a relation's support_set ⊆ O ∪ ℛ_core, and ℛ_core never
// re-types an observation. Guards the evidence layer from derived-object contamination
// (§22 absence / latent-state disjointness).
export function assertObservationPurity(supportSet, observationIds, relationCoreIds) {
  const O = observationIds instanceof Set ? observationIds : new Set(observationIds ?? []);
  const R = relationCoreIds instanceof Set ? relationCoreIds : new Set(relationCoreIds ?? []);
  for (const id of supportSet ?? []) {
    if (!O.has(id) && !R.has(id)) {
      throw new Error(`SRE A5 violation: support member '${id}' is neither an Observation nor a RelationCore.`);
    }
  }
  // ℛ_core ∩ 𝑂 = ∅ — no id may be both an observation and a relation.
  for (const id of R) {
    if (O.has(id)) throw new Error(`SRE A5 violation: id '${id}' co-typed as Observation AND RelationCore.`);
  }
  return true;
}
