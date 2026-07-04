// KRYL-980 — Concept-level "Why" Trace (Phase 1, post-audit)
//
// Phase 0 audit (specs/KRYL-980-audit-report.md) found the "why was this detected"
// legibility already exists across three modules — identitylineage, structuralconfirmation,
// and identitydynamics — just never joined into one explanation surface. This is a thin
// join/presentation layer over those existing, already-working exports. It computes
// NOTHING new: no new formula, no new attribution model, no dependency on KRYL-976/977.
//
// Provenance constraint (locked 2026-07-04 review): this trace layer must not reconstruct
// or reinterpret any downstream aggregate as causal truth. It only reads forward from
// permitted, already-computed upstream artifacts and presents them together.
//
// Boundary: read-only. Never feeds back into scoring, identity resolution, or routing.
// Must never be imported by structuralconfirmation.js, identitykernel.js, or any
// scoring/routing module — same OBSERVATION BOUNDARY rule as identitylineage.js/
// identitydynamics.js, which this module itself consumes.

import { getHistory } from './identitylineage.js';
import { computeSCI } from './structuralconfirmation.js';
import { computeTruthDynamics } from './identitydynamics.js';

/**
 * buildWhyTrace — assemble a human-legible explanation for a CanonicalEvent.
 *
 * @param {object} event — CanonicalEvent (as produced by identitykernel.js)
 * @returns {object} WhyTrace — {
 *   identityId,
 *   sci: { score, groundedness, coveredTypes, classCoverage, discountedTypes, perTypeContribution },
 *   lineage: LineageEvent[]  (chronological, from identitylineage.getHistory),
 *   dynamics: { stabilityVelocity, truthLifecycle } (from identitydynamics.computeTruthDynamics),
 *   trace_edges: [{ from, to, relation }]  — linear provenance edges reconstructed from
 *                lineage history only; no inferred or synthesized causal edges.
 * }
 *
 * FR: trace generation never alters the original event or any upstream state — every
 * call here is a pure read (getHistory/computeSCI/computeTruthDynamics are all
 * side-effect-free reads over existing state).
 */
export function buildWhyTrace(event) {
  if (!event?.identityId) {
    return { identityId: null, sci: null, lineage: [], dynamics: null, trace_edges: [], flag: 'NO_IDENTITY' };
  }

  const sci      = computeSCI(event.evidenceGraph);
  const lineage  = getHistory(event.identityId);
  const dynamics = computeTruthDynamics(event.identityId);

  // trace_edges: a linear reconstruction of the lineage sequence only — each edge
  // connects consecutive lineage events for this identity. Per the locked provenance
  // constraint, no inferred/synthesized edges (e.g. no edge invented between an SCI
  // contribution and a lineage event unless the lineage event itself named that trigger).
  const chronological = [...lineage].reverse(); // getHistory returns newest-first
  const trace_edges = [];
  for (let i = 1; i < chronological.length; i++) {
    trace_edges.push({
      from: `${chronological[i - 1].type}@${chronological[i - 1].ts}`,
      to:   `${chronological[i].type}@${chronological[i].ts}`,
      relation: 'PRECEDES',
    });
  }

  return {
    identityId: event.identityId,
    sci,
    lineage: chronological,
    dynamics,
    trace_edges,
  };
}
