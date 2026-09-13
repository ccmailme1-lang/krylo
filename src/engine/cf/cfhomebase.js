// cfhomebase.js — CF-ECO v1.2 §14 (Homebase Responsibilities) / §24.6 (Recurrence example).
//
// Homebase compares. It does not decide what comparison means. It reads persisted EcoTags
// (cfecomemory.js) and exposes descriptive traversal comparisons only -- counts, timestamps,
// distinct routes, observed-value changes. It NEVER returns a formation verdict, a
// significance score, or any §18-forbidden semantic field.
//
// "Recurrence does not automatically equal formation" (§14). §14's own example: a
// relationship observed 10 times does not mean FORMATION ESTABLISHED -- the structural
// layer (separate, downstream, NOT this file) is the only place formation testing happens.
// Every function here returns facts about what was observed, never a conclusion about
// what it means. Field names are deliberately chosen to avoid every term in the §18.1/
// §18.2 forbidden set (no `formation`, `significance`, `importance`, `risk`, etc. anywhere
// in this module's output shapes).

import { getEntityHistory } from './cfecomemory.js';

/**
 * compareRelationshipRecurrence -- how many times has this relationship_id been
 * observed, across how many distinct routes, over what time span. Purely descriptive.
 *
 * @param {string} relationshipId
 * @param {object[]} ecoTags  the history to compare over -- caller supplies scope
 *   (e.g. getEcosystemHistory('SEMICONDUCTOR') or getEntityHistory('NVIDIA') from
 *   cfecomemory.js). This function does not decide scope; it only compares within it.
 */
export function compareRelationshipRecurrence(relationshipId, ecoTags) {
  const matches = (ecoTags ?? []).filter(t => t.relationship_id === relationshipId);
  const routes  = new Set(matches.map(t => t.route_id).filter(Boolean));
  const types   = new Set(matches.map(t => t.relationship_type));
  const sorted  = [...matches].sort((a, b) => a.observed_at.localeCompare(b.observed_at));

  return Object.freeze({
    relationshipId,
    observationCount: matches.length,
    distinctRoutes: Object.freeze([...routes]),
    firstObservedAt: sorted[0]?.observed_at ?? null,
    lastObservedAt: sorted[sorted.length - 1]?.observed_at ?? null,
    observedRelationshipTypes: Object.freeze([...types]),
  });
}

/**
 * detectTypeChange -- has the SAME relationship_id been observed with more than one
 * relationship_type across its history? Reports the fact only. §16: new evidence may
 * reinforce/modify/contradict an existing relationship -- "the processor itself does
 * not perform those structural operations," and neither does Homebase; it only surfaces
 * that more than one type has been observed, for the structural layer to act on.
 */
export function detectTypeChange(relationshipId, ecoTags) {
  const summary = compareRelationshipRecurrence(relationshipId, ecoTags);
  return Object.freeze({
    relationshipId,
    hasMultipleObservedTypes: summary.observedRelationshipTypes.length > 1,
    observedRelationshipTypes: summary.observedRelationshipTypes,
  });
}

/**
 * compareEntityAcrossEcosystems -- which ecosystems has this entity actually been
 * classified into, per persisted history (§17 Multi-Ecosystem Membership). Descriptive
 * enumeration only -- not a claim that the entity "belongs" anywhere beyond what was
 * actually observed and persisted.
 */
export function compareEntityAcrossEcosystems(entityId) {
  const history = getEntityHistory(entityId);
  const ecosystems = new Set(history.map(t => t.ecosystem_id));
  return Object.freeze({
    entityId,
    ecosystems: Object.freeze([...ecosystems]),
    observationCount: history.length,
  });
}

/**
 * candidateRecurrencePatterns -- relationship_ids observed more than once within the
 * given scope, surfaced as CANDIDATES for the structural layer to examine -- never as
 * formations. This is exactly §14's own example made concrete: a count, not a verdict.
 * A relationship_id of ⊥ (null) is excluded -- there is nothing to recur on when no
 * relationship identity was ever attached.
 */
export function candidateRecurrencePatterns(ecoTags) {
  const counts = new Map();
  for (const tag of ecoTags ?? []) {
    if (!tag.relationship_id) continue;
    counts.set(tag.relationship_id, (counts.get(tag.relationship_id) ?? 0) + 1);
  }
  return Object.freeze(
    [...counts.entries()]
      .filter(([, observationCount]) => observationCount > 1)
      .map(([relationshipId, observationCount]) => Object.freeze({ relationshipId, observationCount }))
  );
}

/**
 * compareRoutes -- for a given scope of EcoTags, which distinct routes contributed
 * observations, and how many each. §11: "a route identifies traversal, not meaning...
 * Homebase may subsequently compare traversals. The processor does not decide which
 * traversal is better" -- and neither does this function; it only counts.
 */
export function compareRoutes(ecoTags) {
  const counts = new Map();
  for (const tag of ecoTags ?? []) {
    if (!tag.route_id) continue;
    counts.set(tag.route_id, (counts.get(tag.route_id) ?? 0) + 1);
  }
  return Object.freeze(
    [...counts.entries()].map(([routeId, observationCount]) => Object.freeze({ routeId, observationCount }))
  );
}
