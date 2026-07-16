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
  repro = null,
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
    // repro = the executable recipe (config + source refs + producer version) that
    // regenerates this exact signal_unit. Provenance says WHERE it came from; repro
    // is what lets an auditor RE-DERIVE it. See checkReproducibility.
    repro: repro ? Object.freeze({ ...repro }) : null,
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

// ── Reproducibility Validator (fourth invariant — audit trust) ────────────────
// Returns a classified reason when a facet cannot be regenerated from its declared
// provenance, else null. Independence says two facets don't share ancestry;
// reproducibility says each facet's ancestry is REAL and RECORDED — a facet that
// cannot be re-derived from (producer + source set + config + timestamp) is a
// claim without a receipt, and SHALL NOT participate in divergence.
export function checkReproducibility(f) {
  if (!f)                  return 'FACET_UNAVAILABLE';
  if (!f.producer_id)      return 'NO_PRODUCER';
  if (!f.source_set_hash)  return 'NO_SOURCE_SET';    // nothing to re-read from
  if (!f.timestamp)        return 'NO_TIMESTAMP';     // no as-of point to reconstruct
  const r = f.repro;
  if (!r || r.config == null || r.source_refs == null || !r.producer_version)
    return 'NOT_REPRODUCIBLE';                         // no executable recipe on record
  return null;
}

// ── Comparison Admission Engine (governs WHETHER; AS-DIFF governs WHAT) ────────
// Separation of concerns: admission decides if a comparison is allowed and emits a
// structured AdmissionDecision BEFORE any numeric computation. AS-DIFF (asdiff.js)
// stays mathematically pure — it only ever sees admitted pairs. New trust rules
// (freshness, licensing, jurisdiction, confidence floors) extend HERE, not there.
// Those are deliberately NOT built: each needs a Founder-set threshold; inventing
// one now would be fabricated math on an unused surface (§11a bottle test #5).
export const INVARIANT = Object.freeze({
  AVAILABILITY: 'AVAILABILITY', COMPARABILITY: 'COMPARABILITY',
  ORTHOGONALITY: 'ORTHOGONALITY', REPRODUCIBILITY: 'REPRODUCIBILITY',
});
const REASON_INVARIANT = Object.freeze({
  FACET_UNAVAILABLE:      INVARIANT.AVAILABILITY,
  ONTOLOGY_CONTAMINATION: INVARIANT.COMPARABILITY,
  INCOMPARABLE:           INVARIANT.COMPARABILITY,
  SHARED_LINEAGE:         INVARIANT.ORTHOGONALITY,
  OVERLAPPING_SOURCE:     INVARIANT.ORTHOGONALITY,
  DECLARED_DEPENDENCY:    INVARIANT.ORTHOGONALITY,
  NO_PRODUCER:            INVARIANT.REPRODUCIBILITY,
  NO_SOURCE_SET:          INVARIANT.REPRODUCIBILITY,
  NO_TIMESTAMP:           INVARIANT.REPRODUCIBILITY,
  NOT_REPRODUCIBLE:       INVARIANT.REPRODUCIBILITY,
});

function decision(status, reason = null, side = null) {
  return Object.freeze({
    status, reason, side,
    invariant: reason ? (REASON_INVARIANT[reason] ?? null) : null,
  });
}

// Ordered gates — each eliminates a distinct class of invalid comparison. The order
// is doctrinal: a pair that isn't even in the same ontology is meaningless regardless
// of independence, so comparability is checked before orthogonality.
export function admitComparison(a, b) {
  if (!a || !b)                       return decision('WITHHELD', 'FACET_UNAVAILABLE');       // availability
  if (a.ontology !== b.ontology)      return decision('WITHHELD', 'ONTOLOGY_CONTAMINATION');  // comparability
  const indep = checkIndependence(a, b);
  if (indep && indep !== 'ONTOLOGY_CONTAMINATION') return decision('WITHHELD', indep);        // orthogonality
  const ra = checkReproducibility(a); if (ra) return decision('WITHHELD', ra, 'A');           // reproducibility
  const rb = checkReproducibility(b); if (rb) return decision('WITHHELD', rb, 'B');
  return decision('ADMITTED');
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

  // 1. Admission — availability → comparability → orthogonality → reproducibility.
  //    Fail closed BEFORE any comparison runs; the decision is structured + auditable.
  const adm = admitComparison(a, b);
  if (adm.status === 'WITHHELD') {
    const reason = adm.side ? `${adm.side}_${adm.reason}` : adm.reason;
    return withheld(lensId, reason, adm.invariant);
  }

  // 2. Universal comparator — only ever sees admitted pairs. as-diff still independently
  //    withholds on unresolved ontology / incomparability (comparability, post-projection).
  let cmp;
  try { cmp = compareSignals(a.signal_unit, b.signal_unit); }
  catch { return withheld(lensId, 'COMPARE_ERROR', null); }
  if (cmp.ontology_gap || cmp.incomparability_flag) return withheld(lensId, 'INCOMPARABLE', INVARIANT.COMPARABILITY);

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

function withheld(lens, reason, invariant = null) {
  return Object.freeze({ lens, withheld: true, withholding_reason: reason, invariant, direction: null, margin: null });
}
