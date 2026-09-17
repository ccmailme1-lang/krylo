// relationshipcondition.js — KRYL-1298, R/T/C structural layer (KRYL-1278,
// specs/SPEC-rtc-structural-friction-appendix-a.md §4.4, §6, §33-35). Schema + factory +
// lifecycle transition ONLY. Classification and measurement, not inference (Founder ruling,
// KRYL-1298): this module never infers a condition exists — it only records one an upstream
// caller has actually observed, against an admitted Relationship it never assumes exists.
//
// §34: Condition ⇒ Relationship, but Relationship ⇏ Condition — a Relationship may exist
// with zero observed Conditions. This module cannot create a Relationship (RI-03) and does
// not verify Relationship admission itself — the caller (relationontology.js is the live
// authority, KRYL-1296) must supply that check via opts.isAdmittedRelationship, mirroring
// cfecotag.js's isValidEcosystem injection pattern: never assume an external registry here.

export const RTC_VERSION = 'v1';

// ── §4.4/§6 — ConditionType: finite Relationship Condition taxonomy ─────────────────────
// §4.4 gives these 7 as the definitional examples of "observed circumstance under which a
// Relationship operates" — treated as the v1 closed-world enumeration of that taxonomy,
// same pattern as relationontology.js's RelationType (frozen, versioned, migration-gated).
export const ConditionType = Object.freeze({
  REGULATORY_RESTRICTION: 'REGULATORY_RESTRICTION',
  RESOURCE_SCARCITY:      'RESOURCE_SCARCITY',
  DEPENDENCY:              'DEPENDENCY',
  CAPACITY_LIMIT:          'CAPACITY_LIMIT',
  APPROVAL_REQUIREMENT:    'APPROVAL_REQUIREMENT',
  COMPETING_RELATIONSHIP:  'COMPETING_RELATIONSHIP',
  TIMING_DEPENDENCY:       'TIMING_DEPENDENCY',
});
const CONDITION_TYPES = Object.freeze(new Set(Object.values(ConditionType)));
export const isConditionType = t => CONDITION_TYPES.has(t);

// ── §33 — Relationship Condition Lifecycle: Q, Σ, q0 = UNOBSERVED ───────────────────────
// Q and Σ and q0 are spec-given; the exact transition edges are implementation-owned (§12
// authorizes this: "exact runtime schema remains implementation-owned provided the
// constitutional fields ... are preserved"). Invalid transitions leave state unchanged and
// report INVALID_TRANSITION, per spec, rather than throwing — a caller attempting an invalid
// transition is a normal, expected event, not a programming error.
export const LifecycleState = Object.freeze({
  UNOBSERVED:  'UNOBSERVED',
  OBSERVED:    'OBSERVED',
  VALIDATED:   'VALIDATED',
  REVISED:     'REVISED',
  EXPIRED:     'EXPIRED',
  INVALIDATED: 'INVALIDATED',
});
export const LifecycleAction = Object.freeze({
  OBSERVE:    'observe',
  VALIDATE:   'validate',
  REVISE:     'revise',
  EXPIRE:     'expire',
  INVALIDATE: 'invalidate',
});
const { UNOBSERVED, OBSERVED, VALIDATED, REVISED, EXPIRED, INVALIDATED } = LifecycleState;
const TRANSITIONS = Object.freeze({
  [UNOBSERVED]: { observe: OBSERVED },
  [OBSERVED]:   { validate: VALIDATED, revise: REVISED, expire: EXPIRED, invalidate: INVALIDATED },
  [VALIDATED]:  { revise: REVISED, expire: EXPIRED, invalidate: INVALIDATED },
  [REVISED]:    { validate: VALIDATED, revise: REVISED, expire: EXPIRED, invalidate: INVALIDATED },
  [EXPIRED]:    {},
  [INVALIDATED]:{},
});

/** applyLifecycleTransition — pure. Never mutates; §30 records revision, never rewrites
 * history, so a REVISED/EXPIRED/etc. condition is always a NEW object (see reviseCondition
 * below for how a caller keeps the prior object retrievable). */
export function applyLifecycleTransition(state, action) {
  const next = TRANSITIONS[state]?.[action];
  if (!next) return { state, status: 'INVALID_TRANSITION' };
  return { state: next, status: 'OK' };
}

const isNonEmptyString = v => typeof v === 'string' && v.length > 0;
const isEvidenceArray  = v => Array.isArray(v) && v.every(e => e && isNonEmptyString(e.id));

/**
 * makeRelationshipCondition — §6: c ∈ C = R × CondType × P_fin(E). Validates every field
 * against the frozen contract; never guesses a value, never assumes Relationship admission.
 *
 * @param {object} input
 * @param {string}   input.id             condition identity
 * @param {string}   input.relationshipId RI-02 — the admitted Relationship (RelationCore.id) this condition is contextual to
 * @param {string}   input.conditionType  one of ConditionType — §6 CondType
 * @param {object[]} [input.evidence]     P_fin(E) — supporting Evidence refs, each {id, ...}; MAY be empty (finite set, not required non-empty by §6)
 * @param {number}   [input.createdAt]
 * @param {object}   opts
 * @param {(relationshipId: string) => boolean} opts.isAdmittedRelationship  RI-02 admission check — MUST be supplied by the caller (relationontology.js's live registry); this module holds no Relationship store itself
 * @returns {object} frozen RelationshipCondition, lifecycleState = UNOBSERVED
 */
export function makeRelationshipCondition(input, opts) {
  const { id, relationshipId, conditionType, evidence = [], createdAt } = input ?? {};
  const { isAdmittedRelationship } = opts ?? {};

  if (typeof isAdmittedRelationship !== 'function') {
    throw new Error('makeRelationshipCondition: opts.isAdmittedRelationship is required (RI-02 — Relationship admission is never assumed here)');
  }
  if (!isNonEmptyString(id)) {
    throw new Error('RelationshipCondition: id is required');
  }
  // RI-02 — a Relationship Condition MUST reference its Relationship, and that Relationship
  // MUST already be admitted (§34: Condition ⇒ Relationship).
  if (!isNonEmptyString(relationshipId)) {
    throw new Error('RelationshipCondition RI-02 violation: relationshipId is required');
  }
  if (!isAdmittedRelationship(relationshipId)) {
    throw new Error(`RelationshipCondition RI-02 violation: relationshipId "${relationshipId}" is not an admitted Relationship`);
  }
  if (!isConditionType(conditionType)) {
    throw new Error(`RelationshipCondition §6 violation: conditionType "${conditionType}" not in the ConditionType taxonomy`);
  }
  if (!isEvidenceArray(evidence)) {
    throw new Error('RelationshipCondition §6 violation: evidence must be an array of {id, ...} refs (P_fin(E))');
  }

  // §33: q0 = UNOBSERVED describes the (Relationship, ConditionType) pair before any
  // RelationshipCondition object exists — constructing one at all requires the evidence that
  // constitutes an observation (§6's P_fin(E) is part of the tuple), so this factory always
  // applies the implicit "observe" transition rather than returning an object already at q0.
  return Object.freeze({
    id,
    relationshipId,
    conditionType,
    evidence: Object.freeze(evidence.map(e => Object.freeze({ ...e }))),
    lifecycleState: LifecycleState.OBSERVED,
    createdAt: createdAt ?? Date.now(),
    rtcVersion: RTC_VERSION,
  });
}

/** reviseCondition — §30/RI-08: produces a NEW frozen condition at the target lifecycle
 * state; the prior object is untouched and remains retrievable as history by whatever store
 * holds it (rtcmemory.js never overwrites — see RI-08/RI-09 there). Returns
 * { condition, status } — on INVALID_TRANSITION, condition is the ORIGINAL object unchanged. */
export function reviseCondition(condition, action) {
  const { state, status } = applyLifecycleTransition(condition.lifecycleState, action);
  if (status !== 'OK') return { condition, status };
  return {
    condition: Object.freeze({ ...condition, lifecycleState: state }),
    status: 'OK',
  };
}
