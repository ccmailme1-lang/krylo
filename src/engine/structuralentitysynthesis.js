// structuralentitysynthesis.js — KRYL-1335, RSI Structural Query Path.
//
// Evidence-grounding for a structuralQuery (structuralqueryinterpreter.js's output). Answers
// exactly one question per entity pair: "is there evidence of a relationship between these
// structural participants, and what does that evidence show?" Never fabricates. Reuses the
// EXISTING real evidence-facet extension point (domainsignalresolution.js's
// EVIDENCE_FACET_SOURCES / getDomainEvidenceFacets) -- the same one
// realsubjectevidenceseed.js already registers real facts through. No new evidence system,
// no synthetic relationship score, no default entity.
//
// This is field-scoped (subject:null) because RSI's structural participants (Supplier,
// Distributor, Facility, ...) are generic structural-role nouns, not resolved canonicalIds --
// adsubject.js's A(domain, scope) requires an already-resolved scope.canonicalId (a named
// entity like "alphabet"), which a generic noun like "supplier" is not and cannot become
// without a name-resolution capability that does not exist (§2 Shared Data Gate: checked
// subjectbinding.js -- identifier-containment only, no fuzzy/category matching, by design).
// A real named-entity match ("Alphabet" as a specific supplier) is future scope, not invented
// here.

import { CANONICAL_DOMAINS } from './ontology.js';
import { getDomainEvidenceFacets } from './domainsignalresolution.js';
// Real bug found 2026-09-29: realsubjectevidenceseed.js's registerEvidenceFacetSource() only
// ran as a side effect of app.jsx importing it for the live UI -- any consumer reachable
// without app.jsx in its import graph (this module included) saw zero registered sources,
// not because no evidence existed, but because registration never executed. Importing for
// its side effect here too, so this consumer's evidence check is correct regardless of entry
// point (React UI or a plain-Node script). Does not change what app.jsx does.
import './facetproducers/realsubjectevidenceseed.js';
// KRYL-1336 — the persistent, queryable store the reconciled spec identified
// (entitytopologyregistry.js's TYPED_EDGES), plus the migration producer that populates the
// real Sysco/Restaurant Depot edge into it. Same side-effect-import necessity as above.
import { TYPED_EDGES, NODE_LABELS } from './entitytopologyregistry.js';
import './producers/rsievidencemigration.js';

const EVIDENCE_STATE = Object.freeze({
  SUPPORTED:   'SUPPORTED',
  NO_EVIDENCE: 'NO_EVIDENCE',
  UNRESOLVED:  'UNRESOLVED',
});
export { EVIDENCE_STATE };

function facetText(f) {
  return [f?.provenance?.semantics, f?.provenance?.source, f?.facet_id]
    .filter(Boolean).join(' ').toLowerCase();
}

function termFor(entityLabel) {
  // ENTITY_PATTERNS labels are UPPER_SNAKE (e.g. 'SUPPLIER'); match against the plain
  // lowercase word a real evidence facet's text would actually contain.
  return entityLabel.toLowerCase().replace(/_/g, ' ');
}

// All field-scoped (subject:null) evidence facets across all six canonical domains, once,
// so every entity pair in a query is checked against the same real snapshot.
function allFieldEvidenceFacets() {
  const out = [];
  for (const d of CANONICAL_DOMAINS) {
    try { out.push(...getDomainEvidenceFacets(d.toUpperCase(), { subject: null })); }
    catch { /* honest absence, not a crash */ }
  }
  return out;
}

// KRYL-1336 — typed edges as a second real candidate source, text-matched the same way as a
// facet (same honesty rule: a pair is SUPPORTED only when both entity terms co-occur in a real
// edge's own text). from/to resolved through NODE_LABELS for the human-readable name; type and
// source are included so a query mentioning the relationship kind (e.g. "acquisitions") or the
// evidence origin also matches, same as facetText()'s inclusion of facet_id.
function typedEdgeText(e) {
  const fromLabel = NODE_LABELS[e.from] ?? e.from;
  const toLabel   = NODE_LABELS[e.to] ?? e.to;
  return [fromLabel, toLabel, e.type, e.source].filter(Boolean).join(' ').toLowerCase();
}

function typedEdgeAsFacetShape(e) {
  const fromLabel = NODE_LABELS[e.from] ?? e.from;
  const toLabel   = NODE_LABELS[e.to] ?? e.to;
  return {
    sourceId: 'entity-topology-registry',
    relationType: e.type, // real, structured typed-edge type (e.g. 'ACQUIRED') -- KRYL-1334 gap fix
    provenance: {
      source: e.source,
      semantics: `${fromLabel} — ${e.type} — ${toLabel}`,
    },
  };
}

function pairsOf(entities) {
  const pairs = [];
  for (let i = 0; i < entities.length; i++)
    for (let j = i + 1; j < entities.length; j++)
      pairs.push([entities[i], entities[j]]);
  return pairs;
}

/**
 * synthStructuralEntity — evidence-grounds a structuralQuery. Never called for
 * state:'UNRESOLVED' structuralQuery (caller's job to check that first).
 * @param {{entities: string[], relationshipIntent: string[], context: string}} structuralQuery
 * @returns {{ relationships: Array<{a,b,state,facet|null}>, singleEntities: Array<{entity,state}> }}
 */
export function synthStructuralEntity(structuralQuery) {
  const { entities, relationshipIntent } = structuralQuery;
  // Two real, independent evidence sources, merged: domain evidence facets (KRYL-1335) and
  // typed edges (KRYL-1336's actual persistent store). Same candidate shape, same text-match
  // discipline, so a pair is SUPPORTED from either source, never a synthetic combination of
  // partial matches from each.
  // Typed edges first: when the same real fact exists in both sources (e.g. Sysco/Restaurant
  // Depot, present as both a one-entity text facet and a typed edge), the typed edge is the
  // more structured, more authoritative source (it carries a real relationType; a one-entity
  // facet cannot). .find() returns the first match, so order here determines which source's
  // relationType (if any) reaches formationsnapshot.js.
  const candidates = [...TYPED_EDGES.map(typedEdgeAsFacetShape), ...allFieldEvidenceFacets()];

  const relationships = pairsOf(entities).map(([a, b]) => {
    const ta = termFor(a), tb = termFor(b);
    const hit = candidates.find(f => {
      const text = facetText(f);
      return text.includes(ta) && text.includes(tb);
    });
    return hit
      ? { a, b, state: EVIDENCE_STATE.SUPPORTED, facet: { sourceId: hit.sourceId, source: hit.provenance?.source ?? null, semantics: hit.provenance?.semantics ?? null, relationType: hit.relationType ?? null } }
      : { a, b, state: EVIDENCE_STATE.NO_EVIDENCE, facet: null };
  });

  // Fewer than 2 entities → no pair to relate; still report the lone entity's own presence
  // in the evidence substrate (never asserts a relationship where there's nothing to relate).
  const singleEntities = entities.length < 2 ? entities.map(e => {
    const t = termFor(e);
    const hit = candidates.find(f => facetText(f).includes(t));
    return { entity: e, state: hit ? EVIDENCE_STATE.SUPPORTED : EVIDENCE_STATE.NO_EVIDENCE };
  }) : [];

  return Object.freeze({
    relationships: Object.freeze(relationships),
    singleEntities: Object.freeze(singleEntities),
    relationshipIntent: Object.freeze([...relationshipIntent]),
  });
}
