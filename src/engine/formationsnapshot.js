// formationsnapshot.js — KRYL-1334 Part 1, capture layer.
//
// PURE. Converts structuralentitysynthesis.js's real evidence-check output into formation_state
// candidate rows, and decides -- against the last known persisted row for the same formation_id
// -- whether a new row should be written at all. Never writes to the DB itself (that's the
// caller's job, same Discovery/Admission/Storage separation admissionengine.js already
// establishes); this module only decides WHAT would be written and WHETHER it represents a
// material change, so the actual pool.query() call stays a thin, untested-logic-free caller.
//
// Only SUPPORTED relationship pairs ever produce a row -- an unestablished (NO_EVIDENCE)
// relationship is not a "formation" to snapshot; persisting a NO_EVIDENCE row would be the
// architectural invariant violation the spec explicitly forbids ("Persistence captures state;
// it does not manufacture state").

import { RELATIONAL_CHANGE_STATE } from './relationalchange.js';

/**
 * formationIdFor — the locked comparison-granularity key (GUIDELINES #4): subject + field
 * scope + formation scope + entity pair + relationship type. Entity pair is order-normalized
 * (alphabetical) so `SUPPLIER<->DISTRIBUTOR` and `DISTRIBUTOR<->SUPPLIER` are the same
 * formation, matching structuralentitysynthesis.js's own pairsOf() (which already only ever
 * produces one ordering per unordered pair, but this guards independently rather than trusting
 * caller order).
 */
export function formationIdFor({ subject, fieldScope, formationScope, entityA, entityB, relationshipType }) {
  const [a, b] = [entityA, entityB].sort();
  return [subject ?? 'NULL', fieldScope ?? 'NULL', formationScope ?? 'NULL', a, b, relationshipType ?? 'NULL'].join('|');
}

/**
 * buildCandidateRows — one candidate row per SUPPORTED relationship pair in a structuralQuery's
 * evidence result. `relationshipType` is the real typed-edge type (e.g. 'ACQUIRED') when the
 * supporting evidence came from entitytopologyregistry.js's typed-edge store (KRYL-1336 gap
 * fix, structuralentitysynthesis.js's typedEdgeAsFacetShape() now carries it through
 * structurally instead of folding it into free text). A one-entity domain facet
 * (EVIDENCE_FACET_SOURCES) genuinely has no relation type -- 'OBSERVED' for that case is an
 * honest label for "a real fact exists, but it doesn't classify a relation type," not a
 * placeholder standing in for something unbuilt.
 * @param {{entities, evidence}} structuralQuery
 * @param {{subject: string|null, fieldScope: string|null, formationScope: string|null}} scope
 * @returns {object[]} candidate rows, NOT yet compared against prior state
 */
export function buildCandidateRows(structuralQuery, scope) {
  const rels = structuralQuery?.evidence?.relationships ?? [];
  return rels
    .filter(r => r.state === 'SUPPORTED')
    .map(r => {
      const relationshipType = r.facet?.relationType ?? 'OBSERVED';
      return {
        formation_id: formationIdFor({ ...scope, entityA: r.a, entityB: r.b, relationshipType }),
        subject_scope: scope.subject ?? null,
        entity_a: r.a,
        entity_b: r.b,
        relationship_type: relationshipType,
        evidence_ref: r.facet?.sourceId ? `${r.facet.sourceId}:${r.facet.source ?? ''}` : null,
        provenance: r.facet ?? null,
      };
    });
}

/**
 * decideWrite — hybrid sampling policy (Founder-ruled, GUIDELINES #2): write when there's no
 * prior row for this formation_id (NEW), or when the evidence_ref materially changed since the
 * last write (material_change trigger). Never writes an identical row twice -- that's exactly
 * the false-positive case relationalchange.js's STABLE classification exists to catch, but
 * catching it HERE too means the DB never accumulates redundant identical rows in the first
 * place, not just that they'd be correctly classified later.
 * @param {object} candidate — one row from buildCandidateRows
 * @param {object|null} lastKnown — the most recent formation_state row for this formation_id, or null
 * @param {'clock'|'material_change'} trigger — why capture is running right now
 * @returns {object|null} the row to write (candidate + state + trigger), or null to skip
 */
export function decideWrite(candidate, lastKnown, trigger) {
  if (!lastKnown) {
    return { ...candidate, state: RELATIONAL_CHANGE_STATE.NEW, trigger };
  }
  if (lastKnown.evidence_ref === candidate.evidence_ref && lastKnown.relationship_type === candidate.relationship_type) {
    return null; // no material change -- do not write a redundant row
  }
  // A real evidence_ref change on an existing formation -- classify as STRENGTHENING (more/
  // different real evidence appeared). WEAKENING/DISSOLUTION require the evidence to actually
  // disappear or contradict, which this function -- given only "a new SUPPORTED pair exists" as
  // input -- cannot honestly distinguish from a strengthening; a NO_EVIDENCE result for a
  // formerly-SUPPORTED pair is a separate caller-side check (see header note: only SUPPORTED
  // pairs reach this function at all today -- detecting a pair that WAS SUPPORTED and no longer
  // is requires the caller to also check pairs that dropped OUT of the SUPPORTED list, not
  // built here).
  return { ...candidate, state: RELATIONAL_CHANGE_STATE.STRENGTHENING, trigger };
}
