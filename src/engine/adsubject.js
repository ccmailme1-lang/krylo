// adsubject.js — WO-5B stage 5B-1 (KRYL-1234). The subject-scoped application fn.
//
//   A(domain, subjectScope) →
//     {
//       subject,                       canonicalId | null
//       domain,
//       scoped: boolean,               true only for ENTITY scope
//       observations: SubjectObservation[],   evidence IDENTIFIER-bound to the subject (5B-2)
//       formationObservations: [...],  DEF-1301 — real observations already admitted into
//                                       Formation (domaingravity.js pool), a DIFFERENT
//                                       evidence class from `observations` above -- see below
//       measures: { [measureKey]: <resolveClassEMeasure(scope:'subject')> },
//       fieldContext: <computeDomainPressure(domain)>,   CONTEXT ONLY — never the subject's answer
//       absence: { absenceClass, reason } | null
//     }
//
// Locked boundaries (SPEC-WO5B §1):
//   - no subject-level value inferred from field pressure (fieldContext is
//     labelled context, never promoted);
//   - no cross-domain substitution;
//   - no evidence facet becomes a Class-E measure (CLASS_E_ONTOLOGY guard);
//   - non-ENTITY scope → classified absence for every domain (the observation is
//     still owed; it is not a bug).
//
// DEF-1301 — `observations` (WO-5B evidence facets, getDomainEvidenceFacets) and
// `formationObservations` (KRYL-1220's gravity-pool observations, getAllSignals) are TWO
// genuinely distinct evidence classes that were being conflated by omission: this file only
// ever reported the WO-5B class, which is still genuinely empty (no registered facet source
// attributes provenance.subject to an entity yet) -- so every caller concluded "no evidence"
// even once KRYL-1220 landed real, subject-attributed, Formation-admitting observations
// through a separate pipeline. Both are now surfaced, honestly, as what they actually are.

import { domainIntelligence } from './domainintelligence.js';
import { resolveClassEMeasure, getDomainEvidenceFacets } from './domainsignalresolution.js';
import { computeDomainPressure, getAllSignals } from './domaingravity.js';
import { isScopable } from './subjectscope.js';
import { ANALYSIS_DOMAIN_ORDER } from './ontology.js';

export const AD_SUBJECT_VERSION = '5b-2';

export const CANON_DOMAINS = ANALYSIS_DOMAIN_ORDER; // KRYL-1065 — sourced from ontology

function authoredMeasureKeys(domain) {
  const di = domainIntelligence(domain);
  return Object.entries(di?.signalDefs ?? {})
    .filter(([, d]) => d?.maturity === 'AUTHORED')
    .map(([k]) => k);
}

export function A(domain, scope) {
  const D = String(domain ?? '').toUpperCase();
  const subject = scope?.kind === 'ENTITY' ? scope.canonicalId : null;

  if (!isScopable(scope)) {
    // Not subject-scopable → the authored measures still resolve, at FIELD scope,
    // so the panel keeps its honest per-measure absence (WO-1A). They are just
    // not bound to a subject.
    const fieldMeasures = {};
    for (const key of authoredMeasureKeys(D))
      fieldMeasures[key] = resolveClassEMeasure({ domain: D, measureKey: key, scope: 'field' });
    return {
      subject: null,
      domain: D,
      scoped: false,
      observations: [],
      formationObservations: [],
      measures: fieldMeasures,
      fieldContext: safePressure(D),
      absence: {
        absenceClass: 'structural',
        reason: scope?.kind === 'DECISION_FRAME'
          ? 'subject is a decision frame — unit-of-analysis unsettled; no subject-scoped observation'
          : scope?.kind === 'GEO'
            ? 'geo subject — no geo-scoped domain source wired'
            : (scope?.reason ?? 'subject not resolved'),
      },
    };
  }

  // ENTITY path. 5B-1: observations stay empty (no non-fabricating attribution
  // method until 5B-2 structural containment). Measures resolve subject-scoped —
  // today every one returns STRUCTURAL_ABSENCE naming its required source class.
  const measures = {};
  for (const key of authoredMeasureKeys(D))
    measures[key] = resolveClassEMeasure({ domain: D, measureKey: key, scope: 'subject', subject });

  // Evidence facets bound to this subject by IDENTIFIER CONTAINMENT (5B-2,
  // subjectbinding.js). getDomainEvidenceFacets does the filtering — a facet with
  // no subject attribution, or one attributed to a different entity, never
  // appears here. No fuzzy match, no field-evidence promotion.
  const observations = getDomainEvidenceFacets(D, { subject: scope })
    .map(f => ({
      kind: 'evidence',
      domain: D,
      source: f.provenance?.source ?? f.sourceId,
      semantics: f.provenance?.semantics ?? null,
      boundVia: f.boundVia ?? null,
      facet_id: f.facet_id,
      source_set_hash: f.source_set_hash,
    }));

  // DEF-1301 — real, subject-attributed observations already admitted into Formation, read
  // from the SAME domaingravity.js pool / same canonicalId match that fieldFormation
  // (targetpacket.jsx/intelligencebrief.jsx) and inferFormation() already use. This is not a
  // new resolution path: it is the existing KRYL-1220 pipeline, surfaced here so this panel
  // stops contradicting the FORMATION section that reads the identical underlying data.
  const formationObservations = getAllSignals()
    .filter(s => s.canonicalId === subject && s.domain === D)
    .map(s => ({
      kind: 'formation',
      domain: D,
      source: s.source,
      signal: s.signal,
      confidence: s.confidence,
      eventDate: s.eventDate ?? null,
      ts: s.ts,
    }));

  const anyMeasure = Object.values(measures).some(m => m.status === 'FACET');
  return {
    subject,
    domain: D,
    scoped: true,
    observations,
    formationObservations,
    measures,
    fieldContext: safePressure(D),
    absence: (observations.length === 0 && formationObservations.length === 0 && !anyMeasure)
      ? { absenceClass: 'structural', reason: `no ${D} evidence or measure attributable to the subject yet` }
      : null,
  };
}

// All six domains for a subject.
export function allDomains(scope) {
  return CANON_DOMAINS.map(d => [d, A(d, scope)]);
}

function safePressure(domain) {
  try { return computeDomainPressure(domain); } catch { return null; }
}
