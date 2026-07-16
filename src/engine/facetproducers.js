// facetproducers.js — KRYL-1052 Proof Implementation: Independent Narrative Facet Producer.
//
// Two grounded observers of a domain, on DELIBERATELY SEPARATE lineages so the admission
// engine's independence invariant has something real to evaluate:
//
//   STRUCTURAL — the observed STRUCTURAL FIELD (operational/economic pressure), read from
//                the surfacerouter shared pool. producer_id 'surfacerouter'.
//   NARRATIVE  — the observed INFORMATION FIELD (coverage attention), read from GDELT DOC
//                2.0. producer_id 'gdelt-narrative'. NEVER routed through surfacerouter —
//                a dedicated fetch keeps its source_set_hash distinct, so it can't share
//                lineage with STRUCTURAL and self-withhold.
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

// GDELT query topic per canonical domain. Generic domain-scoped for the proof; subject-
// scoped queries (subject × domain) are a follow-on refinement, not part of this slice.
export const DOMAIN_TOPIC = Object.freeze({
  TECHNOLOGY: 'technology innovation',
  CAPITAL:    'capital markets investment',
  KNOWLEDGE:  'research science',
  LABOR:      'labor employment workforce',
  MEDIA:      'media coverage attention',
  OWNERSHIP:  'acquisition merger ownership',
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

// ── NARRATIVE facet — observed information field (GDELT DOC 2.0) ───────────────
// captureNarrative does its OWN fetch and returns the observation (or null). It never
// calls surfaceRouter — that is the independence guarantee, by construction.
export async function captureNarrative(domain, topic = DOMAIN_TOPIC[domain] ?? domain) {
  try {
    const res = await fetch(`/api/gdelt-doc?q=${encodeURIComponent(topic)}`);
    if (!res.ok) return null;
    const data     = await res.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const count    = articles.length;
    // Zero coverage = insufficient narrative evidence → return null → facet absent →
    // admission withholds (FACET_UNAVAILABLE). Absence produces withholding, never a
    // fabricated intensity of 0 masquerading as a real reading.
    if (count === 0) return null;
    const intensity  = clamp(Math.round((count / 200) * 100), 0, 100);
    const confidence = clamp(0.3 + Math.min(1, count / 100) * 0.6, 0, 1);
    const source_refs = articles.slice(0, 5).map(a => a.url).filter(Boolean);
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
    producer_id:     'gdelt-narrative',
    source_set_hash: 'narrative-gdelt',
    lineage_id:      `narrative:${domain}`,
    timestamp:       ts,
    provenance: {
      field:     'narrative',
      semantics: 'observed information-field attention',
      source:    'GDELT DOC 2.0',
      query,
    },
    signal_unit: intensityUnit(domain, intensity),
    confidence,
    repro: {
      config:           { query, timespan: '24h', formula: 'min(100, count/200*100)' },
      source_refs,
      producer_version: 'gdelt-narrative-1.0.0',
    },
    constraints: { coverage_count },
  });
}
