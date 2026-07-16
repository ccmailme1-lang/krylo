// signalfacet.js — KRYL-1052: SignalFacet Substrate & Universal Divergence Framework.
//
// SignalFacet = an atomic grounded observation of a domain. AS-DIFF = the universal comparator.
// A Lens = a declarative request for a facet-pair interpretation. The Independence invariant is
// the trust boundary that prevents circular divergence.
//
// DOCTRINE (fail-closed): "A divergence lens compares two INDEPENDENT grounded SignalFacets that
// share a valid ontology. If independence or ontology cannot be established, the comparison SHALL
// WITHHOLD." No bespoke DRIFT engine exists — DRIFT is just the first facet-pair config.

import { compareSignals } from './asdiff.js';

export const SIGNAL_FACET_VERSION = 'v1';

// ── SignalFacet contract (new canonical type) ────────────────────────────────
// signal_unit is a normalized as-diff SignalUnit. source_set_hash + lineage_id +
// dependency_graph are what make independence machine-enforceable.
export function makeSignalFacet({
  facet_id, domain_id, ontology, producer_id, source_set_hash,
  lineage_id = null, dependency_graph = [], timestamp = Date.now(),
  provenance = null, signal_unit, confidence = null, constraints = {},
}) {
  if (!facet_id || !domain_id || !ontology || !producer_id)
    throw new Error('SignalFacet: facet_id/domain_id/ontology/producer_id required');
  if (!source_set_hash) throw new Error('SignalFacet: source_set_hash required (independence lineage)');
  if (signal_unit == null) throw new Error('SignalFacet: signal_unit required (grounded — no facet without an observation)');
  return Object.freeze({
    version: SIGNAL_FACET_VERSION,
    facet_id, domain_id, ontology, producer_id, source_set_hash,
    lineage_id: lineage_id ?? facet_id,
    dependency_graph: Object.freeze([...dependency_graph]),
    timestamp, provenance, signal_unit, confidence,
    constraints: Object.freeze({ ...constraints }),
  });
}

// ── Independence Validator (hard invariant — the moat) ────────────────────────
// Returns a classified reason string when the pair is NOT independent/comparable, else null.
// Comparability = shared ontology; independence = no shared lineage/source/declared dependency.
export function checkIndependence(a, b) {
  if (!a || !b)                                     return 'FACET_UNAVAILABLE';
  if (a.lineage_id === b.lineage_id)                return 'SHARED_LINEAGE';        // same ancestry
  if (a.source_set_hash === b.source_set_hash)      return 'OVERLAPPING_SOURCE';    // same feed → circular
  if ((a.dependency_graph ?? []).includes(b.producer_id) ||
      (b.dependency_graph ?? []).includes(a.producer_id)) return 'DECLARED_DEPENDENCY';
  if (a.ontology !== b.ontology)                    return 'ONTOLOGY_CONTAMINATION'; // no valid shared space
  return null;
}

// ── Declarative Lens Registry (lenses are config, not code) ───────────────────
// facetA/facetB are ROLE names resolved from a domain's facet set. Adding a grounded facet
// makes every existing lens work over it — no new comparator code.
export const DIVERGENCE_LENSES = Object.freeze({
  DRIFT:       { facetA: 'STRUCTURAL', facetB: 'NARRATIVE',        render: 'reality-vs-story',
                 direction: { A_ahead: 'STRUCTURE_LEADS', B_ahead: 'NARRATIVE_LEADS' } },
  OPPORTUNITY: { facetA: 'STRUCTURAL', facetB: 'PEER_STRUCTURAL',  render: 'edge-vs-peer',
                 direction: { A_ahead: 'HOLDS_EDGE', B_ahead: 'PEER_AHEAD' } },
});
export const DIVERGENCE_LENS_IDS = Object.freeze(Object.keys(DIVERGENCE_LENSES));

// ── Universal divergence dispatcher ──────────────────────────────────────────
// facets: { [roleName]: SignalFacet }. Returns a grounded result or a withheld one (§22, fail-closed).
export function computeDivergence(lensId, facets = {}) {
  const lens = DIVERGENCE_LENSES[lensId];
  if (!lens) throw new Error(`divergence: unknown lens '${lensId}'`);
  const a = facets[lens.facetA], b = facets[lens.facetB];

  // 1. Independence + ontology gate — fail closed BEFORE any comparison runs.
  const bar = checkIndependence(a, b);
  if (bar) return withheld(lensId, bar);

  // 2. Universal comparator. as-diff independently withholds on unresolved ontology / incomparability.
  let cmp;
  try { cmp = compareSignals(a.signal_unit, b.signal_unit); }
  catch { return withheld(lensId, 'COMPARE_ERROR'); }
  if (cmp.ontology_gap || cmp.incomparability_flag) return withheld(lensId, 'INCOMPARABLE');

  // 3. Grounded divergence — magnitude + doctrine-defined direction.
  const dir = cmp.winner === 'A' ? lens.direction.A_ahead
            : cmp.winner === 'B' ? lens.direction.B_ahead
            : 'PARITY';
  return Object.freeze({
    lens: lensId, withheld: false, withholding_reason: null,
    direction: dir, margin: Math.abs(cmp.leverage_margin),
    facetA: a.facet_id, facetB: b.facet_id, ontology: a.ontology,
  });
}

function withheld(lens, reason) {
  return Object.freeze({ lens, withheld: true, withholding_reason: reason, direction: null, margin: null });
}
