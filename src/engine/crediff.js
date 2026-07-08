// KRYL-1006 — CRE Diff Engine, slice 1 (one-vs-many comparative pass).
//
// Wires the DORMANT as-diff pairwise comparator (compareSignals) around a resolved
// anchor + peer set. This is orchestration only — it adds NO comparison math; the
// leverage margin / dominant axis / asymmetric capture / incomparability all come
// straight from asdiff.js.
//
// §21 Route-Don't-Aggregate: per-peer results are kept UNCOLLAPSED (one row per
// peer), ranked but never reduced to a single composite score here. The
// "vs strongest peer / sector median / whole set" aggregation is a downstream
// display/ranking decision, deliberately deferred.
//
// SLICE 1 HONESTY (§22 absence-is-signal): peer resolution is HARDCODED and the
// SignalUnits are built from NEUTRAL, IDENTICAL placeholder inputs — no per-entity
// data is sourced yet. Identical inputs make compareSignals return PARITY
// (leverage margin ~0) BY DESIGN: the loop is proven without inventing an edge.
// grounding:'PROVISIONAL' surfaces this — it is not hidden. Real per-entity data
// sourcing (which produces genuine leverage margins) is the KRYL-1006 follow-up.

import { buildSignalUnit, compareSignals } from './asdiff.js';
import { parse7PointSchema } from './pliengine.js';

// Slice 1 hardcoded peer set (KRYL-1006). Automated peer-set resolution is a follow-up.
export const HARDCODED_PEER_SETS = {
  GOOGLE: ['MICROSOFT', 'AMAZON'],
};

// Neutral placeholder 7-point schema + signal. IDENTICAL across entities on purpose
// (see honesty note above). Domain TECHNOLOGY so same-domain pairs resolve to
// as-diff's clean 'direct' space (quality 1.0) — the anchor-vs-same-sector-peer case.
function buildPlaceholderUnit(entity) {
  const schema = {
    domain:         'TECHNOLOGY',
    subject:        entity,
    decision_type:  'invest',
    risk_tolerance: 0.5,
    dependencies:   [{ id: 'dep_core', status: 'lit', coverage: 0.6 }],
    constraints:    [{ label: 'placeholder_constraint', severity: 0.4 }],
    goal:           'placeholder',
  };
  const signal = { id: `${entity}_placeholder`, score: 60, velocity: 0.5, coverage: 0.6, source_count: 3, age_days: 1 };
  const pli = parse7PointSchema(schema, signal);
  return buildSignalUnit(schema, signal, pli, null, { tier: 'entity', entity, domain: 'TECHNOLOGY' });
}

/**
 * runComparativeDiff — one-vs-many comparative pass for an anchor.
 * @param {string} anchor  — anchor entity (e.g. 'GOOGLE')
 * @param {Object} [opts]  — { peers?: string[] } override the hardcoded peer set
 * @returns {Object} { anchor, peers, grounding, results[] } — results uncollapsed + ranked
 */
export function runComparativeDiff(anchor, { peers } = {}) {
  const anchorKey = (anchor ?? '').toUpperCase();
  const peerList  = (peers ?? HARDCODED_PEER_SETS[anchorKey] ?? []).map(p => p.toUpperCase());

  if (!anchorKey || peerList.length === 0) {
    return { anchor: anchorKey || null, peers: [], grounding: 'NO_PEERS', results: [] };
  }

  const anchorUnit = buildPlaceholderUnit(anchorKey);

  const results = peerList.map(peer => {
    const cmp = compareSignals(anchorUnit, buildPlaceholderUnit(peer));
    return {
      peer,
      // winner 'A' = anchor holds the edge, 'B' = peer, 'PARITY' = no edge detected
      edge:               cmp.winner === 'A' ? 'ANCHOR' : cmp.winner === 'B' ? 'PEER' : 'PARITY',
      leverage_margin:    cmp.leverage_margin,
      dominant_axis:      cmp.dominant_axis,
      asymmetric_capture: cmp.asymmetric_capture,
      incomparable:       cmp.incomparability_flag,
      shared_space:       cmp.shared_space,
    };
  });

  // §21 — rank only (anchor's leverage margin, descending); do NOT collapse to a composite.
  results.sort((a, b) => b.leverage_margin - a.leverage_margin);

  return {
    anchor:    anchorKey,
    peers:     peerList,
    grounding: 'PROVISIONAL — placeholder SignalUnits (identical inputs → PARITY by design). '
             + 'Real per-entity data sourcing pending (KRYL-1006 follow-up).',
    results,
  };
}
