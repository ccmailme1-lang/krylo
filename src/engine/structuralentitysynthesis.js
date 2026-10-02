// structuralentitysynthesis.js — KRYL-1335/1341, RSI Structural Query Path.
//
// Evidence-grounding for a structuralQuery (structuralqueryinterpreter.js's output). Answers
// exactly one question per entity pair: "is there a canonical, admitted relationship between
// these structural participants?" Never fabricates.
//
// KRYL-1341 — the text-substring admission mechanism this file previously used
// (facetText()/termFor(): a pair was SUPPORTED whenever both entity terms happened to co-occur
// as substrings in some evidence blob's free text) is retired. Confirmed incompatible with the
// Stage 1 baseline (specs/SPEC-relational-substrate-stage1-baseline.md §9: "co-presence alone"
// and similar proxies may not create a relationship) -- evidence mentioning A and B is not
// evidence establishing a relationship between A and B. Replaced with exact lookups against
// canonical ρ (canonicalrelationship.js, ratified types registered in
// ratifiedrelationshiptypes.js, admitted via the real producers through
// canonicalrelationshipprojection.js).
//
// This changes what a query entity must be to get a real answer. A query entity is first run
// through entityresolution.js's real name resolver (resolveAny()/toTopologyNodeId() -- exact +
// Jaccard-fuzzy matching against the curated entity registry, already built for exactly this
// purpose, WO-2041). A generic structural-role noun ("SUPPLIER", "DISTRIBUTOR") will not match
// anything in a company-name registry and correctly resolves to nothing -- that is not a defect
// introduced here, it is the honest consequence of retiring a mechanism that answered that case
// by fabricating a match via loose text search. A query naming an actual real entity ("Sysco")
// can resolve and get a real, canonical-ρ-grounded answer. This is a real, load-bearing
// capability reduction for role-noun-only queries versus the old (incorrect) behavior -- stated
// plainly, not hidden.

import { resolveAny, toTopologyNodeId } from './entityresolution.js';
import { findAdmittedRelationshipsBetween, findAdmittedRelationshipsFor } from './canonicalrelationshipprojection.js';
import './producers/rsievidencemigration.js'; // side-effect: populates real canonical ρ on import

const EVIDENCE_STATE = Object.freeze({
  SUPPORTED:   'SUPPORTED',
  NO_EVIDENCE: 'NO_EVIDENCE',
  UNRESOLVED:  'UNRESOLVED',
});
export { EVIDENCE_STATE };

function pairsOf(entities) {
  const pairs = [];
  for (let i = 0; i < entities.length; i++)
    for (let j = i + 1; j < entities.length; j++)
      pairs.push([entities[i], entities[j]]);
  return pairs;
}

// facetFromRelationship — the real canonical ρ fields, in the same {sourceId, source, semantics,
// relationType} shape downstream consumers (formationsnapshot.js) already expect, so this
// ticket's change is isolated to HOW a relationship is found, not the shape callers receive.
// relationType is always real here (every ratified type is a real, named type) -- the old
// `?? 'OBSERVED'` fallback is no longer reachable for a SUPPORTED result and is not carried
// forward.
function facetFromRelationship(rho) {
  return {
    sourceId: rho.id,
    source: Object.keys(rho.nuId ?? {}).length ? JSON.stringify(rho.nuId) : null,
    semantics: `${rho.part.join(' ↔ ')} — ${rho.type}`,
    relationType: rho.type,
  };
}

/**
 * synthStructuralEntity — evidence-grounds a structuralQuery against canonical ρ. Never called
 * for state:'UNRESOLVED' structuralQuery (caller's job to check that first -- this is the
 * structuralQuery's own INTERPRETABLE/UNRESOLVED state, a different concept from this file's
 * per-entity EVIDENCE_STATE.UNRESOLVED below).
 * @param {{entities: string[], relationshipIntent: string[], context: string}} structuralQuery
 * @returns {{ relationships: Array<{a,b,state,facet|null}>, singleEntities: Array<{entity,state}> }}
 */
export function synthStructuralEntity(structuralQuery) {
  const { entities, relationshipIntent } = structuralQuery;

  const relationships = pairsOf(entities).map(([a, b]) => {
    const cardA = resolveAny(a), cardB = resolveAny(b);
    if (!cardA || !cardB) {
      return { a, b, state: EVIDENCE_STATE.UNRESOLVED, facet: null };
    }
    const idA = toTopologyNodeId(a), idB = toTopologyNodeId(b);
    const hits = findAdmittedRelationshipsBetween(idA, idB);
    return hits.length > 0
      ? { a, b, state: EVIDENCE_STATE.SUPPORTED, facet: facetFromRelationship(hits[0]) }
      : { a, b, state: EVIDENCE_STATE.NO_EVIDENCE, facet: null };
  });

  // Fewer than 2 entities → no pair to relate; still report whether the lone entity itself
  // resolves to a real identity, and if so, whether it participates in any admitted canonical
  // relationship at all. UNRESOLVED (not NO_EVIDENCE) when it doesn't resolve -- "we don't know
  // who this is" and "we know who this is, no evidence" are different, real states.
  const singleEntities = entities.length < 2 ? entities.map(e => {
    const card = resolveAny(e);
    if (!card) return { entity: e, state: EVIDENCE_STATE.UNRESOLVED };
    const hits = findAdmittedRelationshipsFor(toTopologyNodeId(e));
    return { entity: e, state: hits.length > 0 ? EVIDENCE_STATE.SUPPORTED : EVIDENCE_STATE.NO_EVIDENCE };
  }) : [];

  return Object.freeze({
    relationships: Object.freeze(relationships),
    singleEntities: Object.freeze(singleEntities),
    relationshipIntent: Object.freeze([...relationshipIntent]),
  });
}
