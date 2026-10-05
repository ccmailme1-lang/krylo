// src/engine/subjectattribution.js — AC-11 (specs/spec-field-signal-vs-entity-attribution.md §17)
//
// The one definition of "is evidence bound to this subject?", extracted unchanged from
// targetpacket.jsx's 05 PROVENANCE (KRYL-1235, DEF-1301) so the Target Packet and the Analysis
// header read the same rule instead of two copies that can drift. Two real evidence classes
// establish attribution, checked in PROVENANCE's own order:
//   1. a resolved EDGAR-8K CanonicalEvent structural trace (whytraceresolver.js)
//   2. real subject-attributed observations in the domaingravity.js pool — the SAME
//      buildPerceptionField({ subject }) read fieldFormation uses
// Neither present -> no subject-scoped evidence bound. A non-ENTITY scope never has class 2.

import { resolveWhyTrace, WT_STATE } from './whytraceresolver.js';
import { getCanonicalEvents } from './connectors/edgar8kevidence.js';
import { buildPerceptionField } from './perceptionread.js';

export const SUBJECT_ATTRIBUTION = Object.freeze({
  TRACE_RESOLVED:       'TRACE_RESOLVED',
  SUBJECT_OBSERVATIONS: 'SUBJECT_OBSERVATIONS',
  NONE:                 'NONE',
});

export function countSubjectObservations(subjScope, now = Date.now()) {
  if (subjScope?.kind !== 'ENTITY') return 0;
  try { return buildPerceptionField({ now, subject: subjScope.canonicalId }).particles.length; }
  catch { return 0; }
}

export function classifySubjectAttribution({ wtResolved, subjectObservationCount }) {
  if (wtResolved) return SUBJECT_ATTRIBUTION.TRACE_RESOLVED;
  if (subjectObservationCount > 0) return SUBJECT_ATTRIBUTION.SUBJECT_OBSERVATIONS;
  return SUBJECT_ATTRIBUTION.NONE;
}

// For callers that hold only the session's scope + display entity (the Analysis header). The
// Target Packet keeps its own whyTrace (it also feeds sciData) and calls the two pieces above.
export function resolveSubjectAttribution({ subjScope, entity, now = Date.now() }) {
  const wtResolved = resolveWhyTrace(entity, getCanonicalEvents()).state === WT_STATE.RESOLVED;
  const subjectObservationCount = countSubjectObservations(subjScope, now);
  return { state: classifySubjectAttribution({ wtResolved, subjectObservationCount }), wtResolved, subjectObservationCount };
}

// AC-11 / KRYL-1358 — the Analysis header's subject-level status. On the canonical path the
// synthesis stateLabel is deriveState() of the primary domain's live FIELD magnitude
// (canonicalresolution.js), not a statement about the subject. With no subject-bound evidence the
// header shows three separate states instead of that label; otherwise (or off the canonical path,
// or withheld) it returns null and the header keeps its existing label. Magnitude = the canonical
// confidence, which is magnitude/100 (canonicalresolution.js). Display text only — stateLabel and
// its consumers are untouched.
export function headerFieldSplit(synthesis, attributionState) {
  const canon = synthesis?.canonical;
  if (!canon || canon.withheld || attributionState !== SUBJECT_ATTRIBUTION.NONE) return null;
  return [
    `FIELD CONCENTRATION — ${canon.signalDomain} ${Math.round(canon.confidence * 100)}/100`,
    'ENTITY ATTRIBUTION — UNRESOLVED',
    'RELATIONSHIP FORMATION — NOT ESTABLISHED',
  ];
}
