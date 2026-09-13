// frictionobservation.js — KRYL-1298, R/T/C structural layer (KRYL-1278,
// specs/SPEC-rtc-structural-friction-appendix-a.md §7-9, §12, §26-28, §38). Schema + factory
// + friction status classification ONLY. Classification and measurement, not inference
// (Founder ruling, KRYL-1298): every field here is either a value an upstream observation
// actually produced, or the explicit absence marker — never a filled-in default, never a
// predicted/estimated value.
//
// NOT to be confused with structuralfriction.js (WO-1714) — that module computes a domain-
// level operational/strategic feasibility-gap SCORE from bayResult tiers, an entirely
// different, pre-existing construct. Spec §19: "A structural constraint is not automatically
// equivalent to friction ... MUST NOT be silently substituted for one another." Do not merge,
// rename, or cross-call between the two modules.

export const RTC_VERSION = 'v1';

// ── §9/§37/RI-06 — Absence (⊥). A dimension that was never grounded MUST be represented as
// this, never as 0 — 0 is a legitimate observed value ("0 FTE required" is a real measurement,
// not an absence). ABSENT is the only value this module ever writes for "not observed."
export const ABSENT = null;
export const isAbsent = v => v === null || v === undefined;

const isNonEmptyString = v => typeof v === 'string' && v.length > 0;
const isFiniteNonNeg   = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isEvidenceArray  = v => Array.isArray(v) && v.every(e => e && isNonEmptyString(e.id));

// §28 — Derived Values: exact required shape. A measurement MAY carry `derivation` when its
// value was computed from other grounded observations rather than directly observed; this
// module implements the shape only (RI-07 lineage), not a derivation rule engine — no
// computation of derived values happens here (Founder ruling: no inferred costs/resources).
function validateDerivation(derivation, dimensionLabel) {
  if (derivation == null) return null;
  const { sourceObservations, derivationRule, ruleVersion, result, unit, createdAt } = derivation;
  if (!Array.isArray(sourceObservations) || sourceObservations.length === 0) {
    throw new Error(`FrictionObservation RI-07 violation: ${dimensionLabel}.derivation.sourceObservations must be non-empty`);
  }
  if (!isNonEmptyString(derivationRule) || !isNonEmptyString(ruleVersion)) {
    throw new Error(`FrictionObservation RI-07 violation: ${dimensionLabel}.derivation requires derivationRule + ruleVersion`);
  }
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error(`FrictionObservation RI-07 violation: ${dimensionLabel}.derivation.result must be a finite number`);
  }
  if (!isNonEmptyString(unit)) {
    throw new Error(`FrictionObservation RI-07 violation: ${dimensionLabel}.derivation.unit is required`);
  }
  return Object.freeze({
    sourceObservations: Object.freeze([...sourceObservations]),
    derivationRule, ruleVersion, result, unit,
    createdAt: derivation.createdAt ?? createdAt ?? Date.now(),
  });
}

/**
 * makeMeasurement — one of M_R/M_T/M_C (§8: ℝ+ × Unit × Type). Pass `null`/`undefined` for a
 * dimension that was not grounded (⊥) — this function returns ABSENT unchanged in that case,
 * it never invents a value. Otherwise every field is required and validated.
 *
 * @param {?object} raw  null/undefined for ⊥, else { value, unit, type, derivation? }
 * @param {string}  dimensionLabel  'resource' | 'time' | 'cost' — for error messages only
 */
export function makeMeasurement(raw, dimensionLabel) {
  if (isAbsent(raw)) return ABSENT;
  const { value, unit, type, derivation = null } = raw;
  if (!isFiniteNonNeg(value)) {
    throw new Error(`FrictionObservation §8 violation: ${dimensionLabel}.value must be a finite number ≥ 0 (ℝ+)`);
  }
  if (!isNonEmptyString(unit)) {
    throw new Error(`FrictionObservation §8 violation: ${dimensionLabel}.unit is required`);
  }
  if (!isNonEmptyString(type)) {
    throw new Error(`FrictionObservation §8 violation: ${dimensionLabel}.type is required (semantic type, §12)`);
  }
  const validatedDerivation = validateDerivation(derivation, dimensionLabel);
  return Object.freeze({
    value, unit, type,
    derivationStatus: validatedDerivation ? 'DERIVED' : 'OBSERVED',
    derivation: validatedDerivation,
  });
}

/**
 * makeFrictionObservation — §9: FrictionObservation = R × C × M_R × M_T × M_C × P_fin(E).
 * Each of resource/time/cost is independently either a measurement or ABSENT (RI-05, RI-06).
 * There is no aggregate/composite field anywhere on the returned object (RI-10) — do not add
 * one under a new name (e.g. "score", "severity", "level"); that is the exact defect KRYL-1293
 * removed and this ticket exists to not reintroduce.
 *
 * @param {object} input
 * @param {string}   input.id             observation identity
 * @param {string}   input.relationshipId RI-01 — the admitted Relationship this observation is attached to
 * @param {string}   input.conditionId    the RelationshipCondition this observation is attached to
 * @param {?object}  [input.resource]     M_R or null/undefined (⊥) — { value, unit, type }
 * @param {?object}  [input.time]         M_T or null/undefined (⊥)
 * @param {?object}  [input.cost]         M_C or null/undefined (⊥)
 * @param {object[]} [input.evidence]     P_fin(E) — required (RI-04) if any of R/T/C is grounded
 * @param {number}   [input.createdAt]
 * @param {object}   opts
 * @param {(relationshipId: string) => boolean} opts.isAdmittedRelationship  RI-01 admission check
 * @param {(conditionId: string) => boolean}     opts.isAdmittedCondition    the conditionId must reference an actually-persisted RelationshipCondition
 * @returns {object} frozen FrictionObservation
 */
export function makeFrictionObservation(input, opts) {
  const {
    id, relationshipId, conditionId,
    resource = null, time = null, cost = null,
    evidence = [], createdAt,
  } = input ?? {};
  const { isAdmittedRelationship, isAdmittedCondition } = opts ?? {};

  if (typeof isAdmittedRelationship !== 'function') {
    throw new Error('makeFrictionObservation: opts.isAdmittedRelationship is required (RI-01 — Relationship admission is never assumed here)');
  }
  if (typeof isAdmittedCondition !== 'function') {
    throw new Error('makeFrictionObservation: opts.isAdmittedCondition is required (the Relationship Condition this observation is attached to is never assumed here)');
  }
  if (!isNonEmptyString(id)) {
    throw new Error('FrictionObservation: id is required');
  }
  // RI-01 — a friction observation MUST reference an admitted Relationship.
  if (!isNonEmptyString(relationshipId)) {
    throw new Error('FrictionObservation RI-01 violation: relationshipId is required');
  }
  if (!isAdmittedRelationship(relationshipId)) {
    throw new Error(`FrictionObservation RI-01 violation: relationshipId "${relationshipId}" is not an admitted Relationship`);
  }
  if (!isNonEmptyString(conditionId)) {
    throw new Error('FrictionObservation §7 violation: conditionId is required (Relationship Condition identity)');
  }
  if (!isAdmittedCondition(conditionId)) {
    throw new Error(`FrictionObservation §7 violation: conditionId "${conditionId}" is not an admitted RelationshipCondition`);
  }

  // RI-05 — each dimension validated and stored independently; never coupled/derived from
  // one another here.
  const resourceM = makeMeasurement(resource, 'resource');
  const timeM     = makeMeasurement(time, 'time');
  const costM     = makeMeasurement(cost, 'cost');

  const anyGrounded = !isAbsent(resourceM) || !isAbsent(timeM) || !isAbsent(costM);
  if (!isEvidenceArray(evidence)) {
    throw new Error('FrictionObservation §7 violation: evidence must be an array of {id, ...} refs (P_fin(E))');
  }
  // RI-04 — every grounded measurement MUST retain provenance. Enforced at the observation
  // level (§9's P_fin(E) is one evidence set for the whole observation, not per-dimension):
  // if nothing is grounded there is nothing to source, so evidence MAY be empty only then.
  if (anyGrounded && evidence.length === 0) {
    throw new Error('FrictionObservation RI-04 violation: evidence is required when any of resource/time/cost is grounded');
  }

  return Object.freeze({
    id,
    relationshipId,
    conditionId,
    resource: resourceM,
    time: timeM,
    cost: costM,
    evidence: Object.freeze(evidence.map(e => Object.freeze({ ...e }))),
    createdAt: createdAt ?? Date.now(),
    rtcVersion: RTC_VERSION,
  });
}

// ── §38 — Canonical Status Model ─────────────────────────────────────────────────────────
export const FrictionStatus = Object.freeze({
  NO_GROUNDED_FRICTION: 'NO_GROUNDED_FRICTION',
  PARTIAL:              'PARTIAL',
  COMPLETE:             'COMPLETE',
  CONFLICTING:          'CONFLICTING',
  INDETERMINATE:        'INDETERMINATE',
});

/**
 * classifyFrictionStatus — pure function over the grounded observation state (§38). Takes
 * every FrictionObservation attached to ONE RelationshipCondition.
 *
 * Phase boundary (KRYL-1298 AC-5, matches the ticket's explicit deferral): RI-15/16/17
 * (Compatibility Judgment / Materiality Judgment audit-trail machinery) are not implemented
 * in this ticket. With 0 or 1 observation, that machinery is never needed and this function
 * is fully correct. With 2+ observations for the same condition, determining CONFLICTING vs.
 * compatible-multiplicity requires exactly that machinery — rather than guessing
 * compatibility (fabrication) or silently picking one observation (§29 forbids this
 * explicitly), this function honestly reports INDETERMINATE. CONFLICTING is therefore
 * intentionally unreachable until RI-15/16/17 land in a follow-on ticket — not a stub, a
 * real function correctly bounded by what it can determine today.
 */
export function classifyFrictionStatus(observations) {
  const obs = observations ?? [];
  if (obs.length === 0) return FrictionStatus.NO_GROUNDED_FRICTION;
  if (obs.length > 1)   return FrictionStatus.INDETERMINATE;

  const [only] = obs;
  const groundedCount = [only.resource, only.time, only.cost].filter(d => !isAbsent(d)).length;
  if (groundedCount === 0) return FrictionStatus.NO_GROUNDED_FRICTION;
  if (groundedCount === 3) return FrictionStatus.COMPLETE;
  return FrictionStatus.PARTIAL;
}
