// fecfacets.js — WO-1D (KRYL-1233).
//
// Same precedent (KRYL-1231): **evidence is not a measure**, and — the specific
// WO-1D rule — **no rescaling or relabeling of the capital number to make a MEDIA
// facet.** FEC PAC-committee activity is CAPITAL evidence ("money in motion"). A
// MEDIA facet must come independently from the independent-expenditure / ad-spend
// endpoint, which is not wired (Class D) — until it is, MEDIA gets NO facet, not a
// scaled copy of CAPITAL.
//
// Facets: capital-flow evidence (CAPITAL) now; attention-pressure (MEDIA) pending
// the IE endpoint + a Founder-set saturation anchor.

import { makeSignalFacet } from '../signalfacet.js';

export const DOMAIN_EVIDENCE = 'DOMAIN_EVIDENCE';
const PRODUCER_VERSION = 'fec-facets-1.0.0';

const isFec = (s) => s && s.source === 'FEC' && typeof s.signal === 'number' && s.signal > 0;

// CAPITAL — PAC-committee filing activity ("total money in motion"). NOT capital
// concentration (no per-holder shares) and NOT deployment velocity / intensity.
export function capitalFlowFacet(fecSignals = []) {
  const s = fecSignals.find(x => isFec(x) && x.domain === 'CAPITAL');
  if (!s) return null;
  return makeSignalFacet({
    facet_id:        `fec-evidence:CAPITAL:pac-activity:${Date.now()}`,
    domain_id:       'CAPITAL',
    ontology:        DOMAIN_EVIDENCE,
    producer_id:     'fec-facets',
    source_set_hash: 'fec:pac-committee-count',
    lineage_id:      'fec-evidence:CAPITAL:pac-activity',
    provenance: {
      source:    'FEC — active PAC committees filing this cycle',
      field:     'evidence',
      semantics: 'observed campaign-finance money-in-motion — domain evidence, NOT a Class-E measure',
      formula:   'min(100, count / 5000 × 100)',
    },
    signal_unit: { kind: 'evidence', scale: '0-100', level: s.signal },
    repro: {
      config:           { derivation: 'pac-committee-activity', from: 'FEC connector signal' },
      source_refs:      ['fec:/committees'],
      producer_version: PRODUCER_VERSION,
    },
  });
}

// MEDIA — independent-expenditure ad-spend pressure. Deliberately NOT derived
// from the CAPITAL number. Needs the IE endpoint + a Founder saturation anchor
// (cf. facetproducers.js COVERAGE_SATURATION_LOG). Returns null until both exist.
export function mediaAdSpendFacet(/* fecSignals */) {
  return null;   // WO-1D open item — IE endpoint not wired, no anchor authored
}

export function fecEvidenceFacets(fecSignals = []) {
  const out = {};
  const cap = capitalFlowFacet(fecSignals);
  if (cap) out.CAPITAL = [cap];
  const med = mediaAdSpendFacet(fecSignals);
  if (med) out.MEDIA = [med];
  return out;
}

let _fecSignals = [];
export function setFecSignals(signals) { _fecSignals = Array.isArray(signals) ? signals : []; }

export const fecEvidenceSource = {
  id: 'fec',
  produce({ domain }) {
    return fecEvidenceFacets(_fecSignals)[String(domain).toUpperCase()] ?? [];
  },
};
