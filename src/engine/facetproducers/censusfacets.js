// censusfacets.js — WO-1C (KRYL-1232).
//
// Same precedent as WO-1B (KRYL-1231): **evidence is not a measure.** Census ACS
// gives national employment and household-income observations. Those are
// legitimate domain EVIDENCE (LABOR, OWNERSHIP) — they do NOT populate any of the
// 12 authored Class-E measures. A national employment rate is not a subject's
// workforce-geographic concentration; median household income is not a subject's
// ownership control-share. No concentration population unless Census supplies the
// complete authored quantities (it does not).
//
// Facets: employment evidence (LABOR), establishment / household-wealth evidence
// (OWNERSHIP). Ontology DOMAIN_EVIDENCE — structurally barred from becoming a
// Class-E value by the CLASS_E_ONTOLOGY guard in domainsignalresolution.js.

import { makeSignalFacet } from '../signalfacet.js';

export const DOMAIN_EVIDENCE = 'DOMAIN_EVIDENCE';
const PRODUCER_VERSION = 'census-facets-1.0.0';

const isCensus = (s) => s && s.source === 'CENSUS' && typeof s.signal === 'number' && s.signal > 0;

function evidenceFacet({ domain, facetKind, level, sourceHash, provenanceExtra }) {
  return makeSignalFacet({
    facet_id:        `census-evidence:${domain}:${facetKind}:${Date.now()}`,
    domain_id:       domain,
    ontology:        DOMAIN_EVIDENCE,
    producer_id:     'census-facets',
    source_set_hash: sourceHash,
    lineage_id:      `census-evidence:${domain}:${facetKind}`,
    provenance: {
      source:    'US Census Bureau ACS 1-Year Estimates (national)',
      field:     'evidence',
      semantics: `observed ${facetKind.replace(/-/g, ' ')} — domain evidence, NOT a Class-E measure`,
      scope:     'national (not subject-scoped)',
      ...provenanceExtra,
    },
    signal_unit: { kind: 'evidence', scale: '0-100', level },
    repro: {
      config:           { derivation: facetKind, from: 'Census ACS connector signals' },
      source_refs:      ['census:acs-1yr'],
      producer_version: PRODUCER_VERSION,
    },
  });
}

// LABOR — national employment-rate evidence. NOT geographic concentration /
// redistribution / skill-mix (all subject-scoped, two-point, or per-partition).
export function employmentFacet(censusSignals = []) {
  const s = censusSignals.find(x => isCensus(x) && x.domain === 'LABOR');
  if (!s) return null;
  return evidenceFacet({
    domain: 'LABOR', facetKind: 'national-employment-rate',
    level: s.signal, sourceHash: 'census:acs-b23025-employment',
    provenanceExtra: { variables: ['B23025_003E', 'B23025_005E'], note: 'national ACS — no subject, no geography breakdown' },
  });
}

// OWNERSHIP — household-wealth evidence (median income vs baseline). NOT ownership
// concentration (a holder control-share — no holders, no denominator here).
export function householdWealthFacet(censusSignals = []) {
  const s = censusSignals.find(x => isCensus(x) && x.domain === 'OWNERSHIP');
  if (!s) return null;
  return evidenceFacet({
    domain: 'OWNERSHIP', facetKind: 'household-wealth',
    level: s.signal, sourceHash: 'census:acs-b19013-income',
    provenanceExtra: { variables: ['B19013_001E'], note: 'median household income vs $60K–$110K band; not a control-share' },
  });
}

export function censusEvidenceFacets(censusSignals = []) {
  const out = {};
  for (const f of [employmentFacet(censusSignals), householdWealthFacet(censusSignals)])
    if (f) out[f.domain_id] = [f];
  return out;
}

let _censusSignals = [];
export function setCensusSignals(signals) { _censusSignals = Array.isArray(signals) ? signals : []; }

export const censusEvidenceSource = {
  id: 'census',
  produce({ domain }) {
    return censusEvidenceFacets(_censusSignals)[String(domain).toUpperCase()] ?? [];
  },
};
