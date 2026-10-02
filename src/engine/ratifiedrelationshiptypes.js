// ratifiedrelationshiptypes.js — KRYL-1339: registered, Founder-ratified relationship type
// definitions (formalization §7). One file, additive-only -- a new ratified type is a new
// registerRelationshipType() call here, never an edit to canonicalrelationship.js's mechanism.

import { registerRelationshipType, PhiClass } from './canonicalrelationship.js';

// HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE — ratified 2026-10-01, SEC Schedule 13D/13G evidence.
// Canonical meaning: the subject entity is identified in a qualifying SEC Schedule 13D or 13G
// filing associated with a reporting filer. Records the EXISTENCE of the disclosure only --
// does not assert ongoing beneficial ownership, control, economic dependence, magnitude, or the
// 13D-vs-13G distinction (none of that is in the current evidence model; see
// secownershipconnector.js's extractOwnershipPair(), which extracts only
// subjectCik/subjectName/filerCik/filerName/accession/filingDate).
//
// Direction: part = (subjectCik-derived entity, filerCik-derived entity) -- normalized
// subject -> filer per the ratification's stated Implementation Consequences, reversing the
// old DEPENDS_ON direction (filer -> subject), which this type replaces as the legacy label
// for this evidence.
//
// ν_id = {}, ν_state = {} intentionally -- no mutable state properties are defined. Repeated
// qualifying filings for the same pair are evidence-history events (appended to H(ρ) by the
// admission mechanism), never an automatic relational-state change. No STRENGTHENING/
// WEAKENING/RECONFIGURED/DISSOLVED/UNSUPPORTED basis exists for this type -- classifyChange()
// below only ever returns PERSISTENT for a repeat, which is the formally correct outcome for
// an empty ν_state (nothing in nuState can ever differ between prior and incoming).
registerRelationshipType('HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', {
  phiClass: PhiClass.SEMANTIC,
  // Admission rule (ratification §4): a reconstructible SEC 13D/13G filing that identifies
  // both subject and filer (both in `part`, not `ν_id` -- participant identity belongs in
  // `part` per formalization §1; this type adds no identity-defining property beyond the pair
  // itself, hence ν_id = {}), with non-empty provenance. No additional semantic inference.
  admissionRule: (assertion) => {
    const [subjectId, filerId] = assertion.part ?? [];
    if (!subjectId || !filerId) {
      return { admitted: false, reason: 'both subject and filer must be identified (structurally guaranteed by the 13D/13G filing schema)' };
    }
    if (!assertion.evidence?.provenance?.accession) {
      return { admitted: false, reason: 'a real SEC accession number is required as provenance -- no unsourced disclosure' };
    }
    return { admitted: true };
  },
  nuIdKeys: [],
  nuStateKeys: [],
  // No permitted ν_state transitions exist (ratification §7-9) -- every repeat filing for the
  // same (subject, filer) pair is PERSISTENT, appended to evidence history, never a state change.
  classifyChange: () => 'PERSISTENT',
});

// SHARED_PATENT_ASSIGNMENT — ratified 2026-10-01, PatentsView inventor-migration evidence
// (patentsviewmigrationproducer.js). Canonical meaning: two organizations are both identified
// as assignees of patents naming the same inventor. Records only that co-occurrence --
// explicitly does NOT claim migration, direction, influence, coupling, or magnitude (the old
// RelationType.COUPLED_WITH label -- "reasoned choice, not Founder-ratified" per
// SPEC-m7-relationcore-producer-contract.md §3.1 -- is replaced; that spec's own sourceOrg/
// destOrg asymmetry was never supported by the evidence, which has no temporal/direction signal).
//
// φ_class = Statistical: this relationship is derived from patterns across patent records
// (a count-based aggregate), not a single stated real-world claim the way a filing is -- matches
// the baseline's Statistical definition, not Semantic.
//
// part = {orgA, orgB}, UNORDERED -- the evidence is symmetric, no sourceOrg/destOrg.
//
// ν_id = { inventorId } -- same two organizations sharing a DIFFERENT inventor is a DIFFERENT
// relationship; same organizations + same inventor = same relationship (retained id, evidence
// appended to H(ρ)). Without inventorId in ν_id, unrelated inventors would silently collapse
// into one relationship, losing the identity of what was actually evidenced.
//
// ν_state = {} -- same reasoning as HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE: more shared patents for
// the same (orgA, orgB, inventorId) triple is more evidence, never a relational-state change. No
// STRENGTHENING/WEAKENING/RECONFIGURED/DISSOLVED/UNSUPPORTED basis exists.
registerRelationshipType('SHARED_PATENT_ASSIGNMENT', {
  phiClass: PhiClass.STATISTICAL,
  // Admission rule: at least one real patent record names the given inventorId as inventor on
  // a patent assigned to EACH of the two organizations in part, with that patent's id as
  // provenance. No temporal/direction inference is performed or required.
  admissionRule: (assertion) => {
    const part = assertion.part ?? [];
    if (part.length !== 2 || !part[0] || !part[1] || part[0] === part[1]) {
      return { admitted: false, reason: 'part must be two distinct organizations' };
    }
    if (!assertion.nuId?.inventorId) {
      return { admitted: false, reason: 'inventorId is required in ν_id -- this type\'s identity is organizations + the specific shared inventor' };
    }
    const patentIds = assertion.evidence?.provenance?.patentIds;
    if (!Array.isArray(patentIds) || patentIds.length === 0) {
      return { admitted: false, reason: 'at least one real patent_id is required as provenance -- no unsourced co-assignment' };
    }
    return { admitted: true };
  },
  nuIdKeys: ['inventorId'],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});

// ACQUIRED — ratified 2026-10-01, rsievidencemigration.js's Sysco/Restaurant Depot evidence.
// Canonical meaning: a real, sourced disclosure that one entity (acquirer) is acquiring another
// (target). Replaces RelationCore's COMPOSITION label (verified against relationontology.js §IV:
// COMPOSITION means structural containment -- "X is part of Y" -- not an acquisition/event; a
// forced compromise from the closed 14-value RelationType enum). ACQUIRED itself is not new --
// it already exists, purpose-built, in entitytopologyregistry.js's RELATION_TYPES (added
// specifically because nothing else fit a full-company acquisition); this registers it as the
// canonical ρ type, not just a typed-edge label.
//
// part = (acquirer, target), ORDERED -- genuinely directional, unlike SHARED_PATENT_ASSIGNMENT.
//
// ν_id = { transactionId } -- OPTIONAL, empty when unavailable. Without it, (acquirer, target,
// ACQUIRED) could only ever exist once; a transactionId (SEC accession number, merger agreement
// id, or a future connector's transaction id) lets a prior terminated deal, a later unrelated
// deal between the same two parties, or competing/partial offers remain distinct relationships
// instead of silently colliding into one.
//
// ν_state = { dealStatus }, values PENDING/CLOSED/TERMINATED -- a real, discrete lifecycle
// property (not a continuum), grounded directly in the real filing's own language ("targeted
// close Q3 FY2027, subject to regulatory review" = PENDING today).
//
// Lifecycle: NEW on first disclosure (dealStatus: PENDING). RECONFIGURED on PENDING->CLOSED
// (real completion evidence, e.g. an 8-K Item 2.01). DISSOLVED on PENDING->TERMINATED (real
// positive termination evidence, formalization §6). No STRENGTHENING/WEAKENING -- dealStatus is
// categorical, not a degree. No UNSUPPORTED -- an acquisition announcement is a historical fact
// like the SEC disclosure case; absence of later filings does not make the original
// announcement unsupported. Only positive evidence changes state; no evidence means PENDING
// remains PENDING.
registerRelationshipType('ACQUIRED', {
  phiClass: PhiClass.SEMANTIC,
  // Admission rule: acquirer and target both identified, real provenance present. No deal-status
  // or transaction-id requirement at admission -- those are optional/mutable, not gating.
  admissionRule: (assertion) => {
    const [acquirer, target] = assertion.part ?? [];
    if (!acquirer || !target) {
      return { admitted: false, reason: 'both acquirer and target must be identified' };
    }
    if (!assertion.evidence?.provenance?.accession && !assertion.evidence?.provenance?.filingRef) {
      return { admitted: false, reason: 'a real citable disclosure (accession number or equivalent filing reference) is required as provenance' };
    }
    const status = assertion.nuState?.dealStatus;
    if (status && !['PENDING', 'CLOSED', 'TERMINATED'].includes(status)) {
      return { admitted: false, reason: `dealStatus must be PENDING, CLOSED, or TERMINATED -- got "${status}"` };
    }
    return { admitted: true };
  },
  nuIdKeys: ['transactionId'],
  nuStateKeys: ['dealStatus'],
  classifyChange: ({ prior, incoming }) => {
    const priorStatus = prior.nuState?.dealStatus ?? 'PENDING';
    const incomingStatus = incoming.nuState?.dealStatus ?? priorStatus;
    if (incomingStatus === priorStatus) return 'PERSISTENT';
    if (priorStatus === 'PENDING' && incomingStatus === 'CLOSED') return 'RECONFIGURED';
    if (priorStatus === 'PENDING' && incomingStatus === 'TERMINATED') return 'DISSOLVED';
    // Any other transition (e.g. CLOSED -> PENDING) is not a case this ratification defines --
    // conservative fallback, not a fabricated predicate for an unevidenced transition shape.
    return 'PERSISTENT';
  },
});
