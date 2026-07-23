// src/engine/divergencesurface.js
// Multi-Item Divergence Surface — field-wide leverage comparison built ON asdiff.
//
// Generalizes crediff's one-vs-many pattern to an all-pairs field: given N SignalUnits, compare
// every pair via asdiff.compareSignals (REUSE — no new comparator), rank the pairs by |leverage
// margin|, and surface per-item aggregate divergence ("who diverges most across the field").
//
// GUARDRAILS:
//   · REUSE — every comparison is asdiff.compareSignals; nothing re-derived (§4).
//   · §21 route-don't-aggregate — atomic pairwise first; ranking/aggregation is post-route only.
//   · §22 absence-is-signal — incomparable pairs are surfaced in their own list, never zeroed or
//     dropped. pairs + incomparable together account for every C(n,2) pair (completeness).
//   · Deterministic — stable tie-break on equal margins.
//   · No hardcoded thresholds; no cap — the caller slices the ranked list.

import { compareSignals } from './asdiff.js';

export const DIVERGENCE_SURFACE_VERSION = 1;

/**
 * computeDivergenceSurface — all-pairs leverage divergence over a set of SignalUnits.
 * @param {object[]} units — asdiff SignalUnits (build via asdiff.buildSignalUnit)
 * @returns {{ version:number, n:number, pairs:object[], byItem:object[], incomparable:object[] }}
 */
export function computeDivergenceSurface(units = []) {
  const list = Array.isArray(units) ? units : [];
  if (list.length < 2) {
    return { version: DIVERGENCE_SURFACE_VERSION, n: list.length, pairs: [], byItem: [], incomparable: [] };
  }
  const idOf = (u, i) => u?.entity ?? (u?.domain ? `${u.domain}#${i}` : `unit_${i}`);

  const comparable = [], incomparable = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const c = compareSignals(list[i], list[j]);
      const rec = {
        a: idOf(list[i], i), b: idOf(list[j], j),
        leverageMargin: c.leverage_margin, divergence: c.divergence,
        winner: c.winner, dominantAxis: c.dominant_axis, sharedSpace: c.shared_space,
        ontologyGap: c.ontology_gap, incomparable: c.incomparability_flag,
      };
      (rec.incomparable ? incomparable : comparable).push(rec);
    }
  }

  // rank comparable pairs by |leverageMargin| desc; deterministic tie-break by pair key
  comparable.sort((x, y) => {
    const d = Math.abs(y.leverageMargin) - Math.abs(x.leverageMargin);
    if (d !== 0) return d;
    const kx = `${x.a}|${x.b}`, ky = `${y.a}|${y.b}`;
    return kx < ky ? -1 : kx > ky ? 1 : 0;
  });

  // per-item aggregate divergence across comparable pairs (post-route aggregation, §21)
  const agg = new Map();
  for (const r of comparable) {
    agg.set(r.a, (agg.get(r.a) ?? 0) + Math.abs(r.leverageMargin));
    agg.set(r.b, (agg.get(r.b) ?? 0) + Math.abs(r.leverageMargin));
  }
  const byItem = [...agg.entries()]
    .map(([id, total]) => ({ id, totalDivergence: parseFloat(total.toFixed(4)) }))
    .sort((x, y) => {
      const d = y.totalDivergence - x.totalDivergence;
      return d !== 0 ? d : (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
    });

  return { version: DIVERGENCE_SURFACE_VERSION, n: list.length, pairs: comparable, byItem, incomparable };
}
