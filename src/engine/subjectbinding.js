// subjectbinding.js — WO-5B stage 5B-2 (KRYL-1234).
//
// Evidence binding by IDENTIFIER CONTAINMENT, not semantic similarity:
//
//   subject identity → identifier resolution → evidence facet     ✅
//   subject name → semantic similarity → probably-related evidence ❌
//
// A(d, Subject) may consume an evidence facet ONLY when the facet's own
// provenance carries a subject attribution that resolves — deterministically —
// to this subject. No fuzzy match, no affinity weighting, no field-level
// evidence promoted to subject evidence, no cross-domain substitution.
//
// Facet subject-attribution contract — `facet.provenance.subject` is one of:
//   { canonicalId: '<erk-canonical-id>' }                       direct
//   { identifier: { source: 'edgar'|'fec'|'uei'|'ticker', id } } resolved via ERK
// Anything else (absent, name string, free text) → NOT bound.

import { resolveByIdentifier } from './entityresolution.js';

export const BINDING_VERSION = '5b-2';

// → { bound: true, via, canonicalId } | { bound: false, reason }
export function facetBelongsToSubject(facet, scope) {
  if (scope?.kind !== 'ENTITY' || !scope.canonicalId)
    return { bound: false, reason: 'no entity subject to bind to' };
  if (!facet || typeof facet !== 'object')
    return { bound: false, reason: 'no facet' };

  const attr = facet.provenance?.subject;
  if (!attr || typeof attr !== 'object')
    return { bound: false, reason: 'facet carries no subject attribution — field-level evidence, not subject evidence' };

  // 1. direct canonicalId — exact only
  if (typeof attr.canonicalId === 'string') {
    return attr.canonicalId === scope.canonicalId
      ? { bound: true, via: 'canonicalId', canonicalId: attr.canonicalId }
      : { bound: false, reason: `facet attributed to "${attr.canonicalId}", not "${scope.canonicalId}"` };
  }

  // 2. identifier — resolve deterministically, compare canonicalId
  if (attr.identifier && attr.identifier.source && attr.identifier.id != null) {
    const { source, id } = attr.identifier;
    const e = resolveByIdentifier(source, String(id));
    if (!e)
      return { bound: false, reason: `identifier ${source}:${id} did not resolve to any entity` };
    return e.canonicalId === scope.canonicalId
      ? { bound: true, via: `identifier:${source}`, canonicalId: e.canonicalId }
      : { bound: false, reason: `identifier ${source}:${id} resolves to "${e.canonicalId}", not "${scope.canonicalId}"` };
  }

  return { bound: false, reason: 'subject attribution shape not recognized (need canonicalId or identifier)' };
}

// Filter a facet list to those bound to the subject. Preserves each facet's own
// source_set_hash / lineage / provenance untouched — just annotates `boundVia`.
export function bindFacetsToSubject(facets, scope) {
  const out = [];
  for (const f of facets ?? []) {
    const r = facetBelongsToSubject(f, scope);
    if (r.bound) out.push({ ...f, boundVia: r.via });
  }
  return out;
}

// Helper for evidence-facet producers (WO-1B/C/D) once their data is entity-scoped:
// the provenance.subject block to attach.
export function subjectAttribution({ canonicalId, identifier } = {}) {
  if (canonicalId) return { canonicalId };
  if (identifier?.source && identifier?.id != null) return { identifier: { source: identifier.source, id: String(identifier.id) } };
  return null;
}
