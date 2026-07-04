// KRYL-980 — Concept-level "Why" Trace (Phase 1, post-audit)
//
// Phase 0 audit (specs/KRYL-980-audit-report.md) found the "why was this detected"
// legibility already exists across three modules — identitylineage, structuralconfirmation,
// and identitydynamics — just never joined into one explanation surface. This is a thin
// join/presentation layer over those existing, already-working exports. It computes
// NOTHING new: no new formula, no new attribution model, no dependency on KRYL-976/977.
//
// Classification (important, revised 2026-07-04): this module is NOT a pure join
// like pathmemoryretrieval.js or perceptionprofile.js. computeSCI() is called fresh
// here rather than reading a value already attached via identitykernel.attachSCI —
// it recomputes a real inference-derived result for explanation purposes. computeSCI
// is deterministic and side-effect-free, so the recomputed value is provably
// identical to whatever was originally attached — but the mechanism (recompute, not
// retrieve) is a materially different risk category from pure retrieval, and must be
// treated as such by anything that consumes this module's output in the future.
//
// No-Rewrite Rule (enforced below, not just documented): this module may recompute
// and expose existing structure, but must never introduce a NEW evidence type,
// epistemic class, or canonical role that isn't already defined in evidencetiers.js.
// assertNoNewPrimitives() checks every type name that flows through a trace against
// the real evidencetiers.js taxonomy and throws if one isn't found there.
//
// Provenance constraint (locked 2026-07-04 review): this trace layer must not reconstruct
// or reinterpret any downstream aggregate as causal truth. It only reads forward from
// permitted, already-computed upstream artifacts and presents them together.
//
// Boundary: read-only. Never feeds back into scoring, identity resolution, or routing.
// Must never be imported by structuralconfirmation.js, identitykernel.js, or any
// scoring/routing module — same OBSERVATION BOUNDARY rule as identitylineage.js/
// identitydynamics.js, which this module itself consumes. Nothing in the codebase
// may import buildWhyTrace's output back into a scoring/identity/routing path.

import { getHistory } from './identitylineage.js';
import { computeSCI } from './structuralconfirmation.js';
import { computeTruthDynamics } from './identitydynamics.js';
import { getDescriptor } from './evidencetiers.js';

/**
 * assertNoNewPrimitives — No-Rewrite Rule enforcement. Every evidence type name
 * appearing in an SCI result must already be a known descriptor in
 * evidencetiers.js. Throws E_NEW_PRIMITIVE_INTRODUCED if not — this module must
 * only ever expose/recompute existing taxonomy, never invent a new one.
 */
function assertNoNewPrimitives(sci) {
  if (!sci?.coveredTypes) return;
  for (const type of sci.coveredTypes) {
    if (!getDescriptor(type)) {
      const err = new Error(`E_NEW_PRIMITIVE_INTRODUCED: "${type}" is not a known evidencetiers.js descriptor`);
      err.code = 'E_NEW_PRIMITIVE_INTRODUCED';
      throw err;
    }
  }
}

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

  const sci = computeSCI(event.evidenceGraph);
  assertNoNewPrimitives(sci); // No-Rewrite Rule — throws if sci names an unknown evidence type

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
