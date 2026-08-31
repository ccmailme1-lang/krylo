// briefcontext.js — KRYL-1239.
//
// The Export Brief and the P4 Action Matrix are DOWNSTREAM of the Target Packet.
// They must render the same canonical subject the packet resolved — subjectScope()
// over the session's query context — never a fresh parse of the raw query string.
// This module is the single seam both surfaces read, so their identity fields can
// never diverge from the packet again.
//
// It does NOT resolve, extract, or infer a subject of its own: subjectScope() is
// the one resolver, called with the same input the packet uses.

import { subjectScope } from './subjectscope.js';
import { getDisplayEntity } from '../utils/formatters.js';

// The canonical subject for a session, exactly as the Target Packet displays it.
//   { label, canonicalId, resolved, kind, domainTags, scope }
export function canonicalBriefSubject(session) {
  const scope = subjectScope(session?.queryContext ?? session?.query ?? '');

  if (scope.kind === 'ENTITY') {
    return {
      label:       scope.entity?.name ?? scope.canonicalId ?? 'Unknown Signal',
      canonicalId: scope.canonicalId ?? null,
      resolved:    true,
      kind:        'ENTITY',
      domainTags:  scope.entity?.domainTags ?? [],
      scope,
    };
  }
  if (scope.kind === 'GEO' && scope.location) {
    return {
      label: String(scope.location), canonicalId: null, resolved: true,
      kind: 'GEO', domainTags: [], scope,
    };
  }
  // Unresolved — DEF-1239 residual: do NOT paste the raw query string into the
  // Subject / Anchor fields. State the honest absence, matching the packet.
  const UNRESOLVED_LABEL = {
    DECISION_FRAME: 'DECISION FRAME — NO SUBJECT',
    GEO:            'GEO — NO SUBJECT',
    UNRESOLVED:     'NO SUBJECT RESOLVED',
  };
  return {
    label:       UNRESOLVED_LABEL[scope.kind] ?? 'NO SUBJECT RESOLVED',
    canonicalId: null,
    resolved:    false,
    kind:        scope.kind,
    domainTags:  [],
    scope,
  };
}

// A lens value is real signal only if it is a single clean token. The upstream lens
// detector can mint multi-word pseudo-lenses from raw query text ("REVENUE GROWTH
// SERIAL FOUNDER INVESTING AGAIN") — those are query text, not an anchor. Mirrors
// the lensOK guard in querysynthesis.js.
export function cleanLens(lens) {
  return (typeof lens === 'string'
    && lens !== 'OPEN' && lens !== 'GENERAL'
    && lens.length > 0 && lens.length <= 24
    && /^[A-Za-z0-9]+$/.test(lens)) ? lens : null;
}

// True when the advisory synthesis pipeline returned a real domain-anchored analysis
// — NOT its open-lens / ambiguous / comparative fallback. When this is false but the
// packet resolved an ENTITY, the synthesis narrative (BLUF / 5Ws / actions) is the
// open-lens template built from the raw query and must not be presented as
// subject-scoped analysis.
export function synthesisIsDomainAnchored(synthesis) {
  if (!synthesis) return false;
  if (synthesis.openLensFallback === true) return false;
  const d = synthesis.queryDomain;
  if (!d || ['GENERAL', 'AMBIGUOUS', 'COMPARATIVE'].includes(d)) return false;
  if (synthesis.resolutionEligible === false) return false;
  return true;
}
