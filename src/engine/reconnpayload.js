// reconnpayload.js — RECONN Factor v1.1 (KRYL-1311) canonical payload assembler.
// Category (A) completion — see memory project_reconn_narrative_assembly_p1.md §13(A) for the
// exact five-item boundary this satisfies, and specs/SPEC-reconn-factor-v1.1.md /
// specs/SPEC-narrative-assembly-contract-v1.md for the governing contracts.
//
// Naming: deliberately "reconnpayload", not "recon*" — KRYL-1310's audit flagged
// src/engine/reconlayer.js + src/components/analysis/recondashboard.jsx as an existing, live,
// unrelated "recon" concept (blind-spot/hypothesis exploration). This module must not collide.
//
// Scope discipline: this module ASSEMBLES already-real, already-live substrate into RECONN's
// canonical shape. It adds exactly one piece of new computation — temporalState()'s Θ(x) delta,
// a direct arithmetic derivation from real ts/eventDate, never an inference or forecast (SRE
// §11a: detect-only). Everything else is packaging/renaming of substrate that already computes
// and already reaches Formation/Target Packet. It does NOT invent relationships, does NOT
// fabricate R/T/C values, and does NOT touch Narrative Assembly or targetpacket.jsx.
//
// Relationship Coverage authority ruling (Founder, 2026-09-20, review-gate pass): §10/§21 require
// Relationship Coverage to derive from "the existing governed relationship ontology" —
// relationontology.js, per §21's explicit naming of relationshipcondition.js's externally
// injected admission authority. domainintelligence.js's CROSS_DOMAIN_RELATIONSHIPS answers a
// different, orthogonal question (which domains are connected) from relationontology.js's
// RelationType (what relationship exists between them) — it is real, governed Formation-admission
// substrate, but it is NOT a legitimate substitute for RECONN's canonical relationship authority.
// A first draft of this module made that substitution silently; the review gate caught it and the
// ruling reversed it. relationontology.js's admission decisions are not persisted anywhere
// (admissionengine.js's admitCandidate() explicitly does not persist its TruthEvent — module's own
// header: "Storage ... is the caller's responsibility" — and secownershipconnector.js, the one
// real production caller, discards it after an optional console.info), so Relationship Coverage
// cannot be computed against its canonical authority without new persistence infrastructure. That
// work is outside Category (A)'s wiring-only boundary — see relationshipCoverage() below, which
// reports this honestly as BLOCKED rather than substituting a different vocabulary to force a
// green checkmark.

import { getAllSignals } from './domaingravity.js';
import { getFrictionStatusForRelationship } from './rtc/rtcmemory.js';

export const RECONN_PAYLOAD_VERSION = 'reconn-payload-0.1';

// ── 1. INTENT ratification (RECONN §6) ───────────────────────────────────────────────────────
// analysisintent.js's buildAnalysisIntent() already carries vReq/sReq/eReq/rCmp/tReq as an
// additive extension (Founder GO 2026-09-18, shipped live commit f765047). This maps that
// existing shape onto RECONN's canonical INTENT naming — no new computation, a ratification.
export function ratifyIntent(analysisIntent) {
  if (!analysisIntent) {
    return { state: 'WITHHELD', reason: 'no analysisIntent supplied' };
  }
  const { vReq, sReq, eReq, rCmp, tReq, version } = analysisIntent;
  return {
    state: 'RATIFIED',
    sourceVersion: version ?? null,
    V_req: vReq ?? [],
    S_req: sReq ?? [],
    E_req: eReq ?? { state: 'unresolved', reason: 'NOT_DETECTED' },
    R_cmp: rCmp ?? { state: 'unresolved', reason: 'NOT_DETECTED' },
    T_req: tReq ?? { state: 'unresolved', reason: 'NOT_DETECTED' },
  };
}

// ── 2. Relationship Coverage (RECONN §10) ────────────────────────────────────────────────────
// BLOCKED, per Founder ruling — not a bug, not a missing wiring step this module can close. §10's
// canonical authority (relationontology.js) has no persistence layer (see header). This function
// takes no data — the blocker is architectural, not query-dependent, so it cannot resolve to
// PRESENT for any input until the persistence work lands upstream (out of Category A's scope).
export function relationshipCoverage() {
  return Object.freeze({
    state: 'BLOCKED',
    reason: 'RECONN §10/§21 require the governed formal relationship ontology (relationontology.js) '
      + 'as Relationship Coverage\'s authority. Its admission decisions are not persisted anywhere '
      + '(admissionengine.js\'s admitCandidate() explicitly does not persist; its one production '
      + 'caller, secownershipconnector.js, discards the TruthEvent). Computing Relationship '
      + 'Coverage against its canonical authority requires new persistence infrastructure, outside '
      + 'Category (A)\'s wiring-only boundary. Not substituted with domainintelligence.js\'s '
      + 'CROSS_DOMAIN_RELATIONSHIPS — that answers an orthogonal question (which domains are '
      + 'connected), not the formal relationship ontology §10 requires (what relationship exists '
      + 'between them).',
    relationships: [],
  });
}

// ── 3. Structural Coverage (RECONN §9) ───────────────────────────────────────────────────────
// NOT the §9 ratio (U_S = |S_req ∩ S_rep| / |S_req|) — this function is never given S_req and does
// not compute it. It packages formationinference.js's existing boundary.excluded /
// participatingDomains — real, already-live substrate (domainintelligence.js-driven absence
// classification) — as the governed classification from which U_S COULD eventually be derived,
// once this is joined against a query's actual S_req. State uses CLASSIFIED rather than PRESENT
// specifically so a caller can never read this as "the coverage ratio is satisfied."
export function structuralCoverage(fieldFormation) {
  if (!fieldFormation) {
    return { state: 'WITHHELD', reason: 'no formation to classify structural substrate for', ratioComputed: false, covered: [], excluded: [] };
  }
  const excluded = fieldFormation.boundary?.excluded ?? [];
  return {
    state: 'CLASSIFIED',
    ratioComputed: false, // §9's U_S formula is not computed here — see header note
    covered: fieldFormation.participatingDomains ?? [],
    excluded: excluded.map(x => Object.freeze({ domain: x.domain, code: x.code })),
  };
}

// ── 4. Temporal State Θ(x) (RECONN §13) ──────────────────────────────────────────────────────
// §13's 5-state model, classified from real anchor (timestamp) availability only — PRESENT/
// PARTIAL/NOT MEASURED/UNAVAILABLE are literally defined in §13 by anchor count, so this
// classification needs no value scalar to be honest and complete.
//
// value_latest/delta are left UNRESOLVED (null, valueScalarUnresolved: true) rather than computed
// from `confidence` — reviewed and reversed (Founder ruling, 2026-09-20): the substrate carries no
// single governed magnitude field. domaingravity.js's own header calls `signal` "overloaded" (a
// raw 0-100 value for some connectors, a named label string for others); `confidence` is
// evidentiary certainty, not an observed domain-pressure value. §13 and §12 (Comparative State)
// both leave their scalar ("value"/"val_a"/"val_b") abstract per-object, so there is nothing to
// trace to. Resolving this is a Founder/architecture decision, same class as Relationship
// Coverage's authority question — not an engineering default. deltaT (pure timestamp arithmetic)
// does not depend on this and is reported when available.
//
// WITHHELD ("policy restriction," §13) has no trigger condition here — this module implements no
// governance/policy layer, so nothing this function reads is ever withheld by rule. Named for
// completeness against §13's model, not a state this function can currently return; a future
// policy layer would slot in here rather than requiring a new state to be invented.
export function temporalState(domain, canonicalId = null, windowMs = undefined) {
  const D = String(domain ?? '').toUpperCase();
  if (!D) return { state: 'NOT MEASURED', reason: 'no domain supplied — temporal computation not attempted', domain: null };

  const raw = (windowMs == null ? getAllSignals() : getAllSignals(windowMs))
    .filter(s => s.domain === D && (canonicalId == null || s.canonicalId === canonicalId));

  if (!raw.length) {
    return { state: 'NOT MEASURED', reason: `no observations at all for ${D} — temporal computation not attempted`, domain: D };
  }

  // Anchor = eventDate (real event time) when the connector distinguishes it, else ts (ingestion
  // time). domaingravity.js's pool-write guarantees `ts` is always a real number
  // (`event.ts ?? Date.now()`), so "observations exist but none carry a usable anchor" cannot
  // currently occur from this substrate — UNAVAILABLE is named per §13's model, for completeness
  // and to describe a real condition this function would report if the ts guarantee ever changed,
  // not fabricated to force a branch (same pattern as relationshipcondition.js's documented-
  // unreachable CONFLICTING state).
  const anchors = raw
    .map(s => s.eventDate ?? s.ts)
    .filter(at => typeof at === 'number')
    .sort((a, b) => a - b);

  if (anchors.length === 0) {
    return { state: 'UNAVAILABLE', reason: `observations exist for ${D} but none carry a usable timestamp anchor`, domain: D };
  }
  if (anchors.length === 1) {
    return {
      state: 'PARTIAL', domain: D,
      reason: 'only the latest anchor is available for this domain/scope, no prior anchor to compare against',
      latestAnchor: anchors[0], deltaT: null,
      value_latest: null, delta: null, valueScalarUnresolved: true,
    };
  }
  const latestAnchor = anchors[anchors.length - 1];
  const priorAnchor = anchors[anchors.length - 2];
  return {
    state: 'PRESENT', domain: D,
    latestAnchor, priorAnchor, deltaT: latestAnchor - priorAnchor,
    value_latest: null, delta: null, valueScalarUnresolved: true,
  };
}

// ── 5. R/T/C (RECONN §14) ────────────────────────────────────────────────────────────────────
// Wires the real R/T/C read path (rtcmemory.js) into a consumer for the first time (KRYL-1310:
// zero production consumers previously). No new values — Resource/Time/Cost are only ever what
// a real FrictionObservation recorded via persistFrictionObservation(); no production connector
// calls that function yet, so this honestly reports WITHHELD today. That is the correct
// Absence-Is-Signal state for this wiring pass, not a defect — wiring real connector producers
// into persistFrictionObservation() is separate, later, downstream work (ledger §13 Category B).
export function rtcCoverage(relationshipId) {
  if (!relationshipId) {
    return { state: 'WITHHELD', reason: 'no relationshipId supplied', conditions: [] };
  }
  const conditions = getFrictionStatusForRelationship(relationshipId);
  if (!conditions.length) {
    return { state: 'WITHHELD', reason: 'no RelationshipCondition observed for this relationship yet', conditions: [] };
  }
  return { state: 'PRESENT', conditions };
}

// ── Canonical payload assembler ──────────────────────────────────────────────────────────────
// One canonical object, per RECONN §5/§22: consumed identically by every surface. Domain-scoped
// (matches fieldFormation's shape) — rtcCoverage is relationship-scoped (keyed by relationshipId,
// which this domain-scoped payload does not carry) and is exposed as a standalone export for a
// caller that has one, not folded into this object.
export function assembleReconnPayload({ analysisIntent, fieldFormation, subjScope } = {}) {
  const canonicalId = subjScope?.kind === 'ENTITY' ? subjScope.canonicalId : null;
  const domains = fieldFormation?.participatingDomains ?? [];
  return Object.freeze({
    version: RECONN_PAYLOAD_VERSION,
    intent: Object.freeze(ratifyIntent(analysisIntent)),
    relationshipCoverage: relationshipCoverage(), // BLOCKED, always — see function header
    structuralCoverage: Object.freeze(structuralCoverage(fieldFormation)),
    temporalState: Object.freeze(domains.map(d => Object.freeze(temporalState(d, canonicalId)))),
    generatedAt: Date.now(),
  });
}
