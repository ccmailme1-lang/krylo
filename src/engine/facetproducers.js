// facetproducers.js — KRYL-1052 Proof Implementation: Independent Narrative Facet Producer.
//
// Two grounded observers of a domain, on DELIBERATELY SEPARATE lineages so the admission
// engine's independence invariant has something real to evaluate:
//
//   STRUCTURAL — the observed STRUCTURAL FIELD (operational/economic pressure), read from
//                the surfacerouter shared pool. producer_id 'surfacerouter'.
//   NARRATIVE  — the observed INFORMATION FIELD (coverage attention), read from NewsAPI.ai
//                (Event Registry). producer_id 'eventregistry-narrative'. NEVER routed through
//                surfacerouter — a dedicated fetch keeps its source_set_hash distinct, so it
//                can't share lineage with STRUCTURAL and self-withhold.
//
// SEMANTIC BOUNDARY (locked, Founder 2026-07-16): GDELT is NOT "truth". Structural is NOT
// "reality". Both are grounded OBSERVATIONS of different fields. DRIFT is the measured
// divergence between them — not reality-vs-story.
//
// Both facets share ONTOLOGY 'DOMAIN_ACTIVITY_INTENSITY' (a declared common measurement
// space, 0–100) so they are COMPARABLE — but carry different facet SEMANTICS (what the
// intensity means). Shared numeric range is not shared phenomenon; the ontology layer is
// what declares the comparison valid.

import { buildSignalUnit } from './asdiff.js';
import { makeSignalFacet } from './signalfacet.js';

export const DOMAIN_ACTIVITY_INTENSITY = 'DOMAIN_ACTIVITY_INTENSITY';

// Narrative keyword per canonical domain — SINGLE high-frequency terms. Event Registry
// phrase-matches multi-word keywords, collapsing compound topics to ~0; single terms give
// robust 24h volumes. Domain-scoped for the proof; subject × domain is a follow-on.
export const DOMAIN_TOPIC = Object.freeze({
  TECHNOLOGY: 'technology',
  CAPITAL:    'investment',
  KNOWLEDGE:  'research',
  LABOR:      'employment',
  MEDIA:      'media',
  OWNERSHIP:  'acquisition',
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Coverage volume → narrative intensity (0–100). DERIVED, not tuned: log-scaled because 24h
// keyword coverage spans orders of magnitude (observed ~4.9k–37k across domains), against a
// FIXED saturation ceiling of 100,000 articles/24h (log10 = 5) = maximal single-topic
// attention. Re-derivable by any inspector from that one anchor. count 0 → 0 (→ withhold).
export const COVERAGE_SATURATION_LOG = 5; // log10(100000)
export function coverageToIntensity(count) {
  const n = Math.max(0, count | 0);
  return clamp(Math.round(100 * Math.log10(n + 1) / COVERAGE_SATURATION_LOG), 0, 100);
}

// A minimal as-diff SignalUnit carrying a single 0–100 intensity. velocity/window are 0:
// DRIFT consumes only leverage_margin (a magnitude on projected intensity) + winner, so no
// axis detail is invented. domain is set so same-domain pairs resolve 'direct' (comparable).
function intensityUnit(domain, intensity) {
  const pli = clamp(intensity / 100, 0, 1);
  return buildSignalUnit(
    { domain },
    intensity,
    { pli, components: { velocity: 0, window: 0 } },
    null,
    { domain, tier: 'domain' },
  );
}

// ── STRUCTURAL facet — observed structural field (surfacerouter shared pool) ──
export function makeStructuralFacet({ domain, intensity, volatility = 0, confidence = null, ts = Date.now() }) {
  return makeSignalFacet({
    facet_id:        `structural:${domain}:${ts}`,
    domain_id:       domain,
    ontology:        DOMAIN_ACTIVITY_INTENSITY,
    producer_id:     'surfacerouter',
    source_set_hash: 'structural-pool',
    lineage_id:      `structural:${domain}`,
    timestamp:       ts,
    provenance: {
      field:     'structural',
      semantics: 'observed operational/economic pressure',
      source:    'surfacerouter shared pool (§16 normalized 0–100)',
    },
    signal_unit: intensityUnit(domain, intensity),
    confidence,
    repro: {
      config:           { domain, normalization: '§16 0-100 shared pool' },
      source_refs:      ['surfacerouter:structural-pool'],
      producer_version: 'structural-1.0.0',
    },
    constraints: { volatility },
  });
}

// ── NARRATIVE facet — observed information field (Event Registry) ──────────────
// captureNarrative does its OWN fetch and returns the observation (or null). It never
// calls surfaceRouter — that is the independence guarantee, by construction.
export async function captureNarrative(domain, topic = DOMAIN_TOPIC[domain] ?? domain) {
  try {
    const res = await fetch(`/api/news-doc?q=${encodeURIComponent(topic)}`);
    if (!res.ok) return null;
    const data  = await res.json();
    const count = Number(data.totalResults) || 0;   // 24h coverage volume — the countable signal
    // Zero coverage = insufficient narrative evidence → null → facet absent → admission
    // withholds. Absence produces withholding, never a fabricated intensity masquerading as real.
    if (count === 0) return null;
    const intensity   = coverageToIntensity(count);
    const confidence  = clamp(0.3 + Math.min(1, count / 5000) * 0.6, 0, 1); // more coverage → firmer read
    const source_refs = (data.source_refs ?? [])
      .map(r => r.url ?? r.uri).filter(Boolean).slice(0, 5);
    return { domain, intensity, coverage_count: count, confidence, source_refs, query: topic };
  } catch {
    return null; // network/proxy failure → absence → withhold (never fabricate)
  }
}

export function makeNarrativeFacet({ domain, observation, ts = Date.now() }) {
  if (!observation) return null;
  const { intensity, coverage_count, confidence, source_refs = [], query } = observation;
  return makeSignalFacet({
    facet_id:        `narrative:${domain}:${ts}`,
    domain_id:       domain,
    ontology:        DOMAIN_ACTIVITY_INTENSITY,
    producer_id:     'eventregistry-narrative',
    source_set_hash: 'narrative-eventregistry',
    lineage_id:      `narrative:${domain}`,
    timestamp:       ts,
    provenance: {
      field:     'narrative',
      semantics: 'observed information-field attention',
      source:    'NewsAPI.ai (Event Registry) — 24h coverage volume',
      query,
    },
    signal_unit: intensityUnit(domain, intensity),
    confidence,
    repro: {
      config:           { query, timespan: '24h', formula: '100*log10(totalResults+1)/5' },
      source_refs,
      producer_version: 'eventregistry-narrative-1.0.0',
    },
    constraints: { coverage_count },
  });
}
