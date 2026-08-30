// patentsviewfacets.js — WO-1B (KRYL-1231).
//
// PatentsView feeds DISTINCT evidence facets to more than one domain. Founder
// ruling (KRYL-1231): **facets yes; Class-E population no.** None of these facets
// populates any of the 12 authored Class-E measures — "one assignee has 40 patents
// and another has 20" does not establish 67% of capital / control / capability /
// knowledge. Those need an authored population + denominator. These facets are
// legitimate domain EVIDENCE, preserved with provenance, and become inputs to
// A(d, Subject) later (WO-5B). Their ontology is DOMAIN_EVIDENCE, never
// CLASS_E_MEASURE, so the resolution seam structurally refuses to turn them into a
// measure even if mis-wired.
//
// Built now (legitimate evidence): patent/capability activity (TECHNOLOGY),
// assignee activity (OWNERSHIP), inventor migration (KNOWLEDGE — attribution
// resolved in the cross-domain pass: person movement → LABOR, knowledge carried →
// KNOWLEDGE). NOT built ("no — not yet", KRYL-1231): assignee-concentration,
// R&D-intensity.

import { makeSignalFacet } from '../signalfacet.js';

export const DOMAIN_EVIDENCE = 'DOMAIN_EVIDENCE';
const PRODUCER_VERSION = 'patentsview-facets-1.0.0';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// PatentsView connector signals look like:
//   { id, source:'PATENTSVIEW', domain, signal:'TECHNOLOGY_VELOCITY:AI'|'ASSIGNEE_ACCELERATION:AI:ORG'|'INVENTOR_MIGRATION:a→b', confidence(0-100), ts, polarity, ... }
const isPV = (s) => s && s.source === 'PATENTSVIEW' && typeof s.confidence === 'number';
const startsWith = (s, p) => typeof s?.signal === 'string' && s.signal.startsWith(p);

// Evidence facet: an activity/observation, NOT a measure. signal_unit carries a
// 0–100 activity level for orientation; it is explicitly labelled `kind:'evidence'`.
function evidenceFacet({ domain, facetKind, level, count, provenanceExtra, sourceHash, signalRefs }) {
  return makeSignalFacet({
    facet_id:        `pv-evidence:${domain}:${facetKind}:${Date.now()}`,
    domain_id:       domain,
    ontology:        DOMAIN_EVIDENCE,
    producer_id:     'patentsview-facets',
    source_set_hash: sourceHash,
    lineage_id:      `pv-evidence:${domain}:${facetKind}`,
    provenance: {
      source:    'PatentsView (Search API, via server-side proxy)',
      field:     'evidence',
      semantics: `observed ${facetKind.replace(/-/g, ' ')} — domain evidence, NOT a Class-E measure`,
      observation_count: count,
      ...provenanceExtra,
    },
    signal_unit: { kind: 'evidence', scale: '0-100', level, observation_count: count },
    repro: {
      config:           { derivation: facetKind, from: 'PatentsView connector signals' },
      source_refs:      signalRefs.slice(0, 8),
      producer_version: PRODUCER_VERSION,
    },
  });
}

// TECHNOLOGY — patent / capability activity (velocity + assignee acceleration).
export function technologyActivityFacet(pvSignals = []) {
  const rel = pvSignals.filter(s => isPV(s) &&
    (startsWith(s, 'TECHNOLOGY_VELOCITY:') || startsWith(s, 'ASSIGNEE_ACCELERATION:')));
  if (!rel.length) return null;
  return evidenceFacet({
    domain: 'TECHNOLOGY', facetKind: 'patent-capability-activity',
    level: clamp(Math.round(mean(rel.map(s => s.confidence))), 0, 100),
    count: rel.length,
    provenanceExtra: { clusters: [...new Set(rel.map(s => s.signal.split(':')[1]))] },
    sourceHash: 'patentsview:velocity+assignee-acceleration',
    signalRefs: rel.map(s => s.id),
  });
}

// OWNERSHIP — assignee activity (association / control-related evidence around
// patent assets). NOT assignee concentration (a denominator claim — "not yet").
export function assigneeActivityFacet(pvSignals = []) {
  const rel = pvSignals.filter(s => isPV(s) && startsWith(s, 'ASSIGNEE_ACCELERATION:'));
  if (!rel.length) return null;
  return evidenceFacet({
    domain: 'OWNERSHIP', facetKind: 'assignee-activity',
    level: clamp(Math.round(mean(rel.map(s => s.confidence))), 0, 100),
    count: rel.length,
    provenanceExtra: {
      assignees: [...new Set(rel.map(s => s.signal.split(':')[2]).filter(Boolean))].slice(0, 10),
      note: 'assignee ACTIVITY, not assignee concentration (no population/denominator)',
    },
    sourceHash: 'patentsview:assignee-acceleration',
    signalRefs: rel.map(s => s.id),
  });
}

// KNOWLEDGE — inventor migration (specialized knowledge carried by person
// movement). NOT knowledge concentration (#4) — migration ≠ concentration.
export function inventorMigrationFacet(pvSignals = []) {
  const rel = pvSignals.filter(s => isPV(s) && startsWith(s, 'INVENTOR_MIGRATION:'));
  if (!rel.length) return null;
  return evidenceFacet({
    domain: 'KNOWLEDGE', facetKind: 'inventor-migration',
    level: clamp(Math.round(mean(rel.map(s => s.confidence))), 0, 100),
    count: rel.length,
    provenanceExtra: {
      edges: rel.map(s => s.signal.replace('INVENTOR_MIGRATION:', '')).slice(0, 10),
      note: 'attribution: person movement → LABOR; specialized knowledge carried → KNOWLEDGE (cross-domain pass)',
    },
    sourceHash: 'patentsview:inventor-migration',
    signalRefs: rel.map(s => s.id),
  });
}

// All PatentsView evidence facets, keyed by domain. Empty domains omitted.
export function patentsViewEvidenceFacets(pvSignals = []) {
  const out = {};
  for (const f of [technologyActivityFacet(pvSignals), assigneeActivityFacet(pvSignals), inventorMigrationFacet(pvSignals)])
    if (f) out[f.domain_id] = [f];
  return out;
}

// The registerEvidenceFacetSource() shape for domainsignalresolution.js.
// `produce({ domain, subject })` — subject is threaded for WO-5B; today the
// PatentsView connector data is cluster-scoped, so a subject filter is a no-op and
// this returns [] until a live signal batch is supplied via setPatentsViewSignals.
let _pvSignals = [];
export function setPatentsViewSignals(signals) { _pvSignals = Array.isArray(signals) ? signals : []; }

export const patentsViewEvidenceSource = {
  id: 'patentsview',
  produce({ domain }) {
    return patentsViewEvidenceFacets(_pvSignals)[String(domain).toUpperCase()] ?? [];
  },
};
