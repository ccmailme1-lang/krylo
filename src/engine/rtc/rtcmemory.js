// rtcmemory.js — KRYL-1298, R/T/C structural layer (KRYL-1278). Persistence + retrieval
// ONLY for already-validated RelationshipCondition/FrictionObservation records (from
// relationshipcondition.js / frictionobservation.js) — this module never classifies or
// measures anything itself, matching cfecomemory.js's separation-of-concerns precedent.
//
// RI-08 (historical observations MUST remain immutable) / RI-09 (conflicting observations
// MUST remain separately retrievable): records are NEVER overwritten or mutated here. A
// later observation of the same Relationship/Condition is a NEW record, appended alongside
// the earlier ones — both remain independently retrievable (same append-only pattern as
// cfecomemory.js / entitytopologyregistry.js's TYPED_EDGES; not a database, the minimal real
// implementation for current scope, CLAUDE.md §1).
//
// "Route linkage" (Founder ruling, KRYL-1298): this module is the surface the KRYL-1293
// route-selection machinery will call once a real observed-route/traversal substrate exists
// — getFrictionStatusForRelationship() answers "what is the grounded friction state of this
// one admitted Relationship," per-relationship, which a future route (a sequence of
// Relationships) can query per step. This ticket does NOT construct routes from relationship
// adjacency (KRYL-1293 §1 hard rule: Relationship ≠ route) and does not modify
// happypathdisplacementengine.js — it only makes these observations usable, not used.

import { classifyFrictionStatus } from './frictionobservation.js';

const conditionsById            = new Map(); // conditionId    -> RelationshipCondition
const conditionsByRelationship  = new Map(); // relationshipId -> RelationshipCondition[]
const observationsByCondition   = new Map(); // conditionId    -> FrictionObservation[]
const observationsByRelationship= new Map(); // relationshipId -> FrictionObservation[]

/**
 * persistRelationshipCondition — append a validated RelationshipCondition (from
 * makeRelationshipCondition() or reviseCondition()). Not re-validated here — this module
 * persists what the factory already classified (separation of concerns, same as
 * cfecomemory.js's persistEcoTag()).
 */
export function persistRelationshipCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    throw new Error('persistRelationshipCondition: condition is required');
  }
  if (!condition.id || !condition.relationshipId) {
    throw new Error('persistRelationshipCondition: not a well-formed RelationshipCondition (missing id/relationshipId) — did this come from makeRelationshipCondition()?');
  }
  conditionsById.set(condition.id, condition);

  const list = conditionsByRelationship.get(condition.relationshipId) ?? [];
  list.push(condition);
  conditionsByRelationship.set(condition.relationshipId, list);

  return condition;
}

/**
 * persistFrictionObservation — append a validated FrictionObservation (from
 * makeFrictionObservation()). Never overwrites (RI-08); a revised observation is a new
 * record, the prior one stays retrievable (RI-09).
 */
export function persistFrictionObservation(observation) {
  if (!observation || typeof observation !== 'object') {
    throw new Error('persistFrictionObservation: observation is required');
  }
  if (!observation.id || !observation.relationshipId || !observation.conditionId) {
    throw new Error('persistFrictionObservation: not a well-formed FrictionObservation (missing id/relationshipId/conditionId) — did this come from makeFrictionObservation()?');
  }

  const byCondition = observationsByCondition.get(observation.conditionId) ?? [];
  byCondition.push(observation);
  observationsByCondition.set(observation.conditionId, byCondition);

  const byRelationship = observationsByRelationship.get(observation.relationshipId) ?? [];
  byRelationship.push(observation);
  observationsByRelationship.set(observation.relationshipId, byRelationship);

  return observation;
}

/** isAdmittedCondition — for makeFrictionObservation()'s opts.isAdmittedCondition. */
export function isAdmittedCondition(conditionId) {
  return conditionsById.has(conditionId);
}

/** getConditionsForRelationship — every RelationshipCondition observed for this admitted
 * Relationship, append order. Empty array is a real, honest state (no condition observed
 * yet for this Relationship), not an error — §34: Relationship ⇏ Condition. */
export function getConditionsForRelationship(relationshipId) {
  return Object.freeze([...(conditionsByRelationship.get(relationshipId) ?? [])]);
}

/** getFrictionObservationsForCondition — every FrictionObservation attached to one
 * RelationshipCondition, append order — includes conflicting observations (RI-09), never
 * deduplicated or merged. */
export function getFrictionObservationsForCondition(conditionId) {
  return Object.freeze([...(observationsByCondition.get(conditionId) ?? [])]);
}

/** getFrictionObservationsForRelationship — every FrictionObservation attached to any
 * RelationshipCondition on this Relationship, across all its conditions. */
export function getFrictionObservationsForRelationship(relationshipId) {
  return Object.freeze([...(observationsByRelationship.get(relationshipId) ?? [])]);
}

/**
 * getFrictionStatusForRelationship — the route-linkage surface (Founder ruling, KRYL-1298).
 * Per admitted Relationship: classifies friction status independently per RelationshipCondition
 * (§38, via classifyFrictionStatus), since status is defined over the observations attached to
 * ONE condition, not pooled across unrelated conditions (RI-05/§18 Route-Don't-Aggregate — do
 * not aggregate across conditions here).
 *
 * Returns Object.freeze([{ conditionId, conditionType, status }, ...]) — empty array means no
 * RelationshipCondition has ever been observed for this Relationship (NOT the same as
 * NO_GROUNDED_FRICTION, which means a condition exists but its friction was never grounded —
 * absence-is-signal, CLAUDE.md §1: these are two different, non-collapsible absence states).
 */
export function getFrictionStatusForRelationship(relationshipId) {
  const conditions = getConditionsForRelationship(relationshipId);
  return Object.freeze(conditions.map(condition => ({
    conditionId:   condition.id,
    conditionType: condition.conditionType,
    status:        classifyFrictionStatus(getFrictionObservationsForCondition(condition.id)),
  })));
}

// Test-only escape hatch — production code must never call this.
export function __resetForTests() {
  conditionsById.clear();
  conditionsByRelationship.clear();
  observationsByCondition.clear();
  observationsByRelationship.clear();
}
