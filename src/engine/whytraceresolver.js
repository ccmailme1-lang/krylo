// KRYL-2101 — WhyTrace Resolver: the bridge from a query entity to a rendered provenance trace.
//
// This closes the Loop #10 (Provenance ↔ Artifact) rendering gap end-to-end. CanonicalEvents are
// built by the EDGAR evidence connector (runEdgar8KEvidenceSync, run at session bootstrap in
// app.jsx) and held in a queryable store (getCanonicalEvents). buildWhyTrace (KRYL-980) turns one
// event into a human-legible explanation. Nothing joined the two to the render surface. This does.
//
// DISCIPLINE (locked doctrine, load-bearing here):
//   WITHHOLD BEATS FABRICATE — a query with no single, unambiguous matching structural event
//     returns a CLASSIFIED ABSENCE (§22), never a borrowed or guessed trace. A wrong-entity
//     provenance trace is the Provenance-layer equivalent of fabrication.
//   ENGINE DECIDES, REACT RENDERS (§18) — all match/withhold logic lives here (pure, testable);
//     the panel is a render-only sink.
//   READ-ONLY (whytrace.js OBSERVATION BOUNDARY) — this never feeds scoring, identity, or routing.
//
// Absence is a first-class state (§22), not a null.

import { buildWhyTrace } from './whytrace.js';

export const WT_STATE = Object.freeze({
  RESOLVED:           'RESOLVED',            // a single event matched and produced a real trace
  STRUCTURAL_ABSENCE: 'STRUCTURAL_ABSENCE',  // §22 — no structural event exists (or matches) for this entity
  NO_QUERY:           'NO_QUERY',            // nothing asked yet — render nothing
  TRACE_ERROR:        'TRACE_ERROR',         // event matched but trace build was rejected (No-Rewrite guard threw)
});

const AWAITING = 'AWAITING SIGNAL';

/**
 * matchEvent(entity, events) — conservative entity → CanonicalEvent match. CanonicalEvent keys are
 * `ENTITY::<canonicalId>` / `CIK::<cik>` (entityKey) and `<entityKey>::<eventClass>` (identityId).
 * Matches only on a substring hit of the normalized entity token inside a key. Returns the event
 * ONLY when exactly one event matches — zero matches is absence, more than one is ambiguous and is
 * withheld (never a guess). Pure; no side effects.
 */
export function matchEvent(entity, events = []) {
  const norm = String(entity ?? '').trim().toUpperCase();
  if (!norm || norm === AWAITING) return null;
  if (!Array.isArray(events) || events.length === 0) return null;
  const hits = events.filter(ev => {
    const key = String(ev?.entityKey ?? ev?.identityId ?? '').toUpperCase();
    return key.length > 0 && key.includes(norm);
  });
  return hits.length === 1 ? hits[0] : null;
}

/**
 * resolveWhyTrace(entity, events) — the single decision point the panel consumes.
 * @returns {{ state, entity, event, trace, reason? }}
 */
export function resolveWhyTrace(entity, events = []) {
  const norm = String(entity ?? '').trim().toUpperCase();
  if (!norm || norm === AWAITING) {
    return { state: WT_STATE.NO_QUERY, entity: norm, event: null, trace: null };
  }

  const event = matchEvent(norm, events);
  if (!event) {
    return {
      state: WT_STATE.STRUCTURAL_ABSENCE, entity: norm, event: null, trace: null,
      reason: `No structural evidence event recorded for ${norm}. A provenance trace requires a filed structural event.`,
    };
  }

  let trace = null;
  try {
    trace = buildWhyTrace(event);
  } catch (err) {
    // No-Rewrite Rule (buildWhyTrace throws E_NEW_PRIMITIVE_INTRODUCED) — withhold, never render a
    // trace that names an evidence type outside the locked taxonomy.
    return { state: WT_STATE.TRACE_ERROR, entity: norm, event, trace: null, reason: err?.code ?? err?.message ?? 'TRACE_ERROR' };
  }

  if (!trace || trace.flag === 'NO_IDENTITY' || !trace.sci) {
    return {
      state: WT_STATE.STRUCTURAL_ABSENCE, entity: norm, event, trace: null,
      reason: `Event matched for ${norm} but carries no structural confirmation evidence.`,
    };
  }

  return { state: WT_STATE.RESOLVED, entity: norm, event, trace };
}
