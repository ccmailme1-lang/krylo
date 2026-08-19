// candidateview.js — Relationship Validator, Phase 1 (foundation).
// Implements SPEC-relationship-validator-operator-contract.md §2.
//
// The ONLY function permitted to construct an ImmutableRelationshipCandidate. Pure projection
// of RelationCore's five identity/grounding fields — no eta, phi0, structuralSupport, dynamics,
// or lifecycle state (Independent Evidence Rule, common contract §6). RelationCore itself is
// never imported here, never constructed here — only read from whatever the caller passes in.

const CANDIDATE_FIELDS = Object.freeze(['id', 'sourceId', 'targetId', 'relationType', 'provenanceHash']);

// toValidatorCandidate(core: RelationCore) → ImmutableRelationshipCandidate
// Throws on missing identity fields rather than silently producing a partial candidate —
// matches relationontology.js's own makeRelationCore() fail-fast discipline.
export function toValidatorCandidate(core) {
  if (!core || typeof core !== 'object') {
    throw new Error('toValidatorCandidate: RelationCore required');
  }
  for (const field of CANDIDATE_FIELDS) {
    if (core[field] == null) {
      throw new Error(`toValidatorCandidate: RelationCore.${field} required, got ${core[field]}`);
    }
  }
  return Object.freeze({
    id:             core.id,
    sourceId:       core.sourceId,
    targetId:       core.targetId,
    relationType:   core.relationType,
    provenanceHash: core.provenanceHash,
  });
}

// isValidatorCandidate — shape guard for downstream code (orchestrator, tests). Does not
// verify the object came from toValidatorCandidate(); only that it has exactly the locked
// five-field shape and no more.
export function isValidatorCandidate(value) {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  if (keys.length !== CANDIDATE_FIELDS.length) return false;
  return CANDIDATE_FIELDS.every(f => Object.prototype.hasOwnProperty.call(value, f));
}
