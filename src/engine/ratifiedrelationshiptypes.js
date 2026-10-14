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

// CAPITAL_EVENT_INVOLVES -- ratified by the Founder 2026-10-11 under Decision Record section 3 (decision-record-structural-analysis-FINAL-20261011.md).
// Canonical meaning: a capital event reported in a Form 8-K (a Capital-event Item 1.01, 2.01, 2.03 or 3.02) names a counterparty whose identity is
// confirmed. Records the EXISTENCE of that involvement as the filing states it. It does not assert the size of the event (magnitude is INDETERMINATE
// in this version), the purpose, the outcome, or anything about the counterparty's other relationships.
//
// part = (filer entity, counterparty entity), ORDERED -- the filer reports the event; the counterparty is named in it.
// nu_id = { event, partyQualifier } -- event is the filing accession (a different filing is a different event, so repeat business with the same bank
// stays distinct events); partyQualifier is 'UNNAMED_AFFILIATE_OF' when the filing says the party is "an affiliate of <named entity>" (the
// relationship is then to an unnamed affiliate, never to the named entity itself) and 'NONE' otherwise. The qualifier is part of identity, so the two
// are never merged.
// nu_state = {} -- no mutable state property is defined; a repeat of the same event is more evidence, never a state change.
//
// Admission rule (all required): the source is a Form 8-K with a capital-event item; the event date; at least one instrument (or equivalent); the
// supporting passage; the counterparty matching outcome is SAME_ENTITY_CONFIRMED or AFFILIATION_CONFIRMED (a candidate match, an unresolved name or a
// failed lookup is never admitted); evidence-ladder step at least SUPPORTED_CONNECTION; magnitude recorded INDETERMINATE.
const CAPITAL_ITEMS = ['1.01', '2.01', '2.03', '3.02'];
const LADDER_OK = new Set(['SUPPORTED_CONNECTION', 'ESTABLISHED_RELATIONSHIP', 'ESTABLISHED_STRUCTURAL_CHANGE']);
registerRelationshipType('CAPITAL_EVENT_INVOLVES', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [filerId, partyId] = assertion.part ?? [];
    if (!filerId || !partyId || filerId === partyId) return { admitted: false, reason: 'filer and counterparty must be two distinct identified entities' };
    const nuId = assertion.nuId ?? {};
    if (!nuId.event) return { admitted: false, reason: 'the event (filing accession) is required in nu_id: identity is filer + counterparty + the specific event' };
    if (!['NONE', 'UNNAMED_AFFILIATE_OF'].includes(nuId.partyQualifier)) return { admitted: false, reason: 'partyQualifier must be NONE or UNNAMED_AFFILIATE_OF (the filing\'s own wording is preserved)' };
    const p = assertion.evidence?.provenance ?? {};
    if (!/^8-K/i.test(String(p.form ?? ''))) return { admitted: false, reason: 'the source must be a Form 8-K' };
    if (!(p.items ?? []).some(i => CAPITAL_ITEMS.includes(String(i)))) return { admitted: false, reason: 'the 8-K must carry a capital-event item (1.01, 2.01, 2.03 or 3.02)' };
    if (!p.accession || !p.filingDate) return { admitted: false, reason: 'accession and event date are required' };
    if (!p.instrument) return { admitted: false, reason: 'at least one instrument (or equivalent) stated in the filing is required' };
    if (!p.passage || !String(p.passage).includes(p.counterpartyName ?? '\u0000')) return { admitted: false, reason: 'the supporting passage must contain the counterparty name as the filing states it' };
    const m = p.counterpartyMatch ?? {};
    if (m.outcome !== 'SAME_ENTITY_CONFIRMED' && m.outcome !== 'AFFILIATION_CONFIRMED') return { admitted: false, reason: `counterparty matching outcome "${m.outcome ?? 'none'}" is not a confirmed outcome (same entity confirmed or affiliation confirmed required)` };
    if (!m.identifier?.value || !m.evidence?.accession) return { admitted: false, reason: 'a confirmed match must carry its identifier and its evidence' };
    if ((nuId.partyQualifier === 'UNNAMED_AFFILIATE_OF') !== (m.outcome === 'AFFILIATION_CONFIRMED' && m.partyIsNamed === false)) return { admitted: false, reason: 'the unnamed-affiliate qualifier and the matching outcome must agree (an unnamed affiliate is AFFILIATION_CONFIRMED with partyIsNamed false)' };
    if (!LADDER_OK.has(p.ladderStep)) return { admitted: false, reason: 'evidence-ladder step must be at least SUPPORTED_CONNECTION' };
    if (p.magnitude !== 'INDETERMINATE') return { admitted: false, reason: 'magnitude must be recorded INDETERMINATE in this version' };
    return { admitted: true };
  },
  nuIdKeys: ['event', 'partyQualifier'],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});

// HAS_OFFICER_OR_DIRECTOR_DISCLOSURE -- ratified by the Founder 2026-10-12 (KRYL-1411, Decision Record section 3). LABOR.
// Canonical meaning: an SEC Form 3, 4 or 5 states that a reporting person is an officer or a director of the issuer. It records the role as the FILING states it,
// as of that filing. It does not assert that the role continues (a Form 4 does not state that a role ended), the person's holdings (ownership is a different
// relationship), compensation, tenure or anything about the person's other roles. That someone filed an insider form is not the relationship: a ten-percent owner or
// an "other" reporting person who states neither isDirector nor isOfficer is NOT admitted.
// part = (issuer, person), ORDERED, both identified by SEC CIK (never by name). nu_id = { role } (DIRECTOR or OFFICER: one person holding both is two relationships).
// nu_state = { title } (the officer title as written, null for a director). A different title stated later is RECONFIGURED; a repeat is PERSISTENT.
// Admission rule (all required): the source is Form 3, 4 or 5 (or an amendment); both CIKs present and equal to the filing's own issuer and reporting-owner ids; the filing's own
// flag for the role is true (roleStated); a citable accession and filing date; the period of report recorded.
const INSIDER_FORMS_OK = new Set(['Form 3', 'Form 4', 'Form 5', 'Form 3/A', 'Form 4/A', 'Form 5/A']);
registerRelationshipType('HAS_OFFICER_OR_DIRECTOR_DISCLOSURE', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [issuerId, personId] = assertion.part ?? [];
    if (!issuerId || !personId || issuerId === personId) return { admitted: false, reason: 'issuer and person must be two distinct identified entities' };
    const p = assertion.evidence?.provenance ?? {};
    if (!['DIRECTOR', 'OFFICER'].includes(assertion.nuId?.role)) return { admitted: false, reason: 'role must be DIRECTOR or OFFICER, as the filing states it' };
    if (p.source !== 'SEC_FORM_3_4_5' || !INSIDER_FORMS_OK.has(String(p.form ?? ''))) return { admitted: false, reason: 'the source must be an SEC Form 3, 4 or 5' };
    if (p.roleStated !== true) return { admitted: false, reason: 'the filing itself must state the role (isDirector or isOfficer); an insider form alone is not the relationship' };
    if (!p.issuerCik || !p.personCik || issuerId !== `CIK:${String(p.issuerCik).padStart(10, '0')}` || personId !== `CIK:${String(p.personCik).padStart(10, '0')}`) return { admitted: false, reason: 'both parties must be identified by the SEC CIKs the filing states' };
    if (!p.accession || !p.filingDate || !p.periodOfReport) return { admitted: false, reason: 'accession, filing date and period of report are required' };
    return { admitted: true };
  },
  nuIdKeys: ['role'],
  nuStateKeys: ['title'],
  classifyChange: ({ prior, incoming }) => ((prior.nuState?.title ?? null) !== (incoming.nuState?.title ?? null) ? 'RECONFIGURED' : 'PERSISTENT'),
});

// HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE -- ratified by the Founder 2026-10-12 (KRYL-1413, Decision Record section 3). LABOR, for PRIVATE SEC filers.
// Canonical meaning: the issuer's own newest Form D states that a related person is an executive officer or a director of the issuer. It records the role as that FILING states
// it, as of that filing. It does not assert that the role continues, the person's holdings, compensation or other roles. Only "Executive Officer" (OFFICER) and "Director" (DIRECTOR)
// are admitted; "Promoter" and any other relationship are not.
// part = (issuer, person), ORDERED. The issuer is identified by its SEC CIK. The PERSON HAS NO SEC CIK: the person node is the NAME AS THE ISSUER'S FILING STATES IT, scoped to that
// issuer (personIdentity NAME_SCOPED_TO_ISSUER_FILING): never matched, merged or shared with any other person or entity. nu_id = { role }, nu_state = { clarification }.
const FORM_D_OK = new Set(['Form D', 'Form D/A']);
registerRelationshipType('HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [issuerId, personId] = assertion.part ?? [];
    const p = assertion.evidence?.provenance ?? {};
    if (!issuerId || !personId || issuerId === personId) return { admitted: false, reason: 'issuer and person must be two distinct entities' };
    if (!['DIRECTOR', 'OFFICER'].includes(assertion.nuId?.role)) return { admitted: false, reason: 'role must be DIRECTOR or OFFICER, as the Form D states it (Promoter and other relationships are not admitted)' };
    if (p.source !== 'SEC_FORM_D' || !FORM_D_OK.has(String(p.form ?? ''))) return { admitted: false, reason: 'the source must be the issuer\'s own SEC Form D' };
    if (p.roleStated !== true) return { admitted: false, reason: 'the Form D itself must state the role' };
    const ic = String(p.issuerCik ?? '').padStart(10, '0');
    if (!p.issuerCik || issuerId !== `CIK:${ic}`) return { admitted: false, reason: 'the issuer must be identified by the SEC CIK of the Form D' };
    if (p.personIdentity !== 'NAME_SCOPED_TO_ISSUER_FILING' || !p.personName || !String(personId).startsWith(`FORMD_PERSON:${ic}:`)) return { admitted: false, reason: 'the person is identified only as the name the issuer\'s Form D states, scoped to that issuer' };
    if (!p.accession || !p.filingDate) return { admitted: false, reason: 'accession and filing date are required' };
    return { admitted: true };
  },
  nuIdKeys: ['role'],
  nuStateKeys: ['clarification'],
  classifyChange: ({ prior, incoming }) => ((prior.nuState?.clarification ?? null) !== (incoming.nuState?.clarification ?? null) ? 'RECONFIGURED' : 'PERSISTENT'),
});

// LEAD_SPONSOR_OF_CLINICAL_TRIAL -- ratified by the Founder 2026-10-12 (KRYL-1414, Decision Record section 3). KNOWLEDGE, for companies already resolved by their SEC CIK.
// Canonical meaning: ClinicalTrials.gov states that the company is the LEAD sponsor of a registered study. It records that fact as the registry states it, as of the registry record's
// last update. It does not assert the study's results, its funding, the company's other trials, or that the status continues.
// part = (sponsor entity by SEC CIK, trial node NCT:<registry id>), ORDERED. The registry never creates identity: the sponsor is matched to an entity ALREADY resolved by its SEC CIK, by
// exact legal-name equality (suffixes removed); collaborator roles, non-industry sponsors and near names are not admitted. nu_state = { status } (the registry's overall status; a change is RECONFIGURED).
registerRelationshipType('LEAD_SPONSOR_OF_CLINICAL_TRIAL', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [sponsorId, trialId] = assertion.part ?? [];
    const p = assertion.evidence?.provenance ?? {};
    if (!sponsorId || !trialId || sponsorId === trialId) return { admitted: false, reason: 'sponsor and trial must be two distinct nodes' };
    if (p.source !== 'CLINICALTRIALS_GOV') return { admitted: false, reason: 'the source must be ClinicalTrials.gov' };
    if (!/^NCT\d{8}$/.test(String(p.nctId ?? '')) || trialId !== `NCT:${p.nctId}`) return { admitted: false, reason: 'the trial must be identified by its registry id (NCT number)' };
    if (p.leadSponsorClass !== 'INDUSTRY') return { admitted: false, reason: 'only an industry lead sponsor is admitted (collaborators and other classes are not)' };
    if (p.sponsorMatch !== 'EXACT_LEGAL_NAME_OF_RESOLVED_ENTITY' || !p.leadSponsorName) return { admitted: false, reason: 'the lead sponsor must equal the resolved entity\'s legal name exactly; the registry never creates identity' };
    if (!/^CIK:\d{10}$/.test(String(sponsorId))) return { admitted: false, reason: 'the sponsor must be an entity identified by its SEC CIK' };
    if (!p.lastUpdated && !p.retrievedAt) return { admitted: false, reason: 'the registry record\'s date is required' };
    return { admitted: true };
  },
  nuIdKeys: [],
  nuStateKeys: ['status'],
  classifyChange: ({ prior, incoming }) => ((prior.nuState?.status ?? null) !== (incoming.nuState?.status ?? null) ? 'RECONFIGURED' : 'PERSISTENT'),
});

// ASSIGNEE_OF_GRANTED_PATENT -- ratified by the Founder 2026-10-13, narrowly (KRYL-1416, Decision Record section 3). TECHNOLOGY, for companies already resolved by their SEC CIK.
// Canonical meaning: the USPTO PatentsView granted-patent table states that a granted patent is assigned to the company. It records that fact as the USPTO record states it, as of the
// dataset file's date. It does not assert what the patent covers, its value, whether it is still in force, or any other patent held by a different legal entity (a subsidiary or a similarly
// named company is NOT the company: only the EXACT legal name matches). part = (company by SEC CIK, patent node PATENT:US<number>), ORDERED. nu_state = {}.
registerRelationshipType('ASSIGNEE_OF_GRANTED_PATENT', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [companyId, patentId] = assertion.part ?? [];
    const p = assertion.evidence?.provenance ?? {};
    if (!companyId || !patentId || companyId === patentId) return { admitted: false, reason: 'company and patent must be two distinct nodes' };
    const byLei = /^LEI:[A-Z0-9]{20}$/.test(String(companyId));
    if (!/^CIK:\d{10}$/.test(String(companyId)) && !byLei) return { admitted: false, reason: 'the company must be an entity identified by its SEC CIK or (KRYL-1417) its GLEIF LEI' };
    if (byLei) {
      // GLEIF identity class (Founder ratified 2026-10-13): identity only; the assignee must equal the GLEIF legal name exactly, and no subsidiary rule applies (there is no 10-K Exhibit 21).
      const id = p.identity ?? {};
      if (id.source !== 'GLEIF' || id.class !== 'GLEIF_LEI' || `LEI:${id.lei}` !== companyId || !id.legalName) return { admitted: false, reason: 'an LEI-identified company must cite its GLEIF record' };
      if (id.entityStatus !== 'ACTIVE' || id.registrationStatus !== 'ISSUED') return { admitted: false, reason: 'the GLEIF record must show an ACTIVE entity with an ISSUED registration' };
      if (p.assigneeMatch !== 'EXACT_LEGAL_NAME_OF_RESOLVED_ENTITY') return { admitted: false, reason: 'an LEI-identified company matches only by the exact GLEIF legal name' };
    }
    if (p.source !== 'USPTO_PATENTSVIEW_BULK' || p.table !== 'g_assignee_disambiguated') return { admitted: false, reason: 'the source must be the USPTO PatentsView granted-patent assignee table' };
    if (!/^(?:\d{7,8}|D\d{6,7}|RE\d{5,6}|PP\d{5,6}|T\d{6,7}|X\d{6,7})$/.test(String(p.patentId ?? '')) || patentId !== `PATENT:US${p.patentId}`) return { admitted: false, reason: 'the patent must be identified by its granted patent number' };
    if (p.assigneeMatch === 'EXACT_LEGAL_NAME_OF_EXHIBIT_21_SUBSIDIARY') {
      // Exhibit 21 rule (Founder ratified 2026-10-13): the assignee is a subsidiary the company's OWN Form 10-K lists in Exhibit 21, matched by exact legal name; the exhibit is cited.
      const sub = p.subsidiary ?? {}, ex = sub.exhibit21 ?? {};
      if (!p.assigneeName || !sub.name || assertion.nuId?.heldBy !== sub.name) return { admitted: false, reason: 'a subsidiary-held patent must name the subsidiary the Exhibit 21 lists' };
      if (!/^\d{10}-\d{2}-\d{6}$/.test(String(ex.accession ?? '')) || !/^EX-21/i.test(String(ex.form ?? '')) || !ex.filedAt || ex.filerCik !== String(companyId).replace(/^CIK:/, '')) return { admitted: false, reason: 'the company\'s own 10-K Exhibit 21 (accession, filing date, filer CIK) must be cited' };
    } else if (p.assigneeMatch !== 'EXACT_LEGAL_NAME_OF_RESOLVED_ENTITY' || !p.assigneeName) return { admitted: false, reason: 'the assignee must equal the resolved entity\'s legal name exactly, or a subsidiary the company\'s own 10-K Exhibit 21 lists exactly; no fuzzy matching' };
    if (!p.fileAsOf) return { admitted: false, reason: 'the dataset file\'s date is required' };
    return { admitted: true };
  },
  nuIdKeys: ['heldBy'],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});

// NAMED_IN_ARTICLE -- ratified by the Founder 2026-10-13 (KRYL-1418, MEDIA). Canonical meaning: a dated article, as GDELT states it, explicitly names the company: the article's TITLE contains the
// company's SEC registered name (legal form set aside). It records that fact and the citation (title, publisher domain, URL, first-seen date). It does NOT establish endorsement, causation, event
// participation, sentiment, importance or any other connection between the article and the company. part = (company by SEC CIK, article node ARTICLE:<id>), ORDERED. nu_state = {}.
const ARTICLE_KEY = (t) => ` ${String(t ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
registerRelationshipType('NAMED_IN_ARTICLE', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const [companyId, articleId] = assertion.part ?? [];
    const p = assertion.evidence?.provenance ?? {};
    if (!companyId || !articleId || companyId === articleId) return { admitted: false, reason: 'company and article must be two distinct nodes' };
    if (!/^CIK:\d{10}$/.test(String(companyId))) return { admitted: false, reason: 'the company must be an entity identified by its SEC CIK' };
    if (p.source !== 'GDELT' || p.phraseSource !== 'SEC_REGISTERED_NAME') return { admitted: false, reason: 'the source must be GDELT, queried by the company\'s SEC registered name' };
    if (!/^https?:\/\//.test(String(p.url ?? '')) || !p.title || !p.domain) return { admitted: false, reason: 'the article must be cited by URL, title and publisher domain' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.seenDate ?? ''))) return { admitted: false, reason: 'the article\'s date is required' };
    if (!/^ARTICLE:[a-z0-9]+$/.test(String(articleId)) || articleId !== `ARTICLE:${p.articleId}`) return { admitted: false, reason: 'the article must be identified by its article id' };
    if (!p.phrase || !ARTICLE_KEY(p.title).includes(ARTICLE_KEY(p.phrase))) return { admitted: false, reason: 'the article\'s title must explicitly name the company (its SEC registered name); an article that matched only in its text is an observation, not a relationship' };
    return { admitted: true };
  },
  nuIdKeys: [],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});

// HAS_STATED_ROLE_ON_ISSUER_PAGE (LABOR) and LED_FUNDING_ROUND_PER_ISSUER (CAPITAL) -- ratified by the Founder 2026-10-14 (KRYL-1419): the issuer's OWN published page as a source for officers and
// financing, for a company already identified by a GLEIF LEI that carries a curated official domain. Canonical meaning: the company's own page states that a person holds a role / that investors
// led its funding round, as the page states it, as of the retrieval time. It is the company's own statement: it is not independently confirmed, it is not a filing, a listing on a web page is not a
// formal officer disclosure, and the page does not state other investors, board membership or later rounds. The person and the investor are the names as the page states them, SCOPED to the issuer's
// page (no matching, no merging with any other identity). part = (company by LEI, scoped node), ORDERED.
const PAGE_KEY = (t) => ` ${String(t ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const issuerPageCommon = (assertion, nodePrefix) => {
  const [companyId, nodeId_] = assertion.part ?? [];
  const p = assertion.evidence?.provenance ?? {};
  if (!companyId || !nodeId_ || companyId === nodeId_) return { admitted: false, reason: 'company and named party must be two distinct nodes' };
  if (!/^LEI:[A-Z0-9]{20}$/.test(String(companyId))) return { admitted: false, reason: 'the company must be an entity identified by its GLEIF LEI' };
  const id = p.identity ?? {};
  if (id.source !== 'GLEIF' || id.class !== 'GLEIF_LEI' || `LEI:${id.lei}` !== companyId || !id.legalName || id.entityStatus !== 'ACTIVE' || id.registrationStatus !== 'ISSUED') return { admitted: false, reason: 'the company must be confirmed by an ACTIVE, ISSUED GLEIF record' };
  if (p.source !== 'ISSUER_PAGE' || !p.officialDomain) return { admitted: false, reason: 'the source must be the company\'s own published page' };
  let host = ''; try { host = new URL(String(p.url ?? '')).hostname.toLowerCase(); } catch { /* not a URL */ }
  if (!String(p.url ?? '').startsWith('https://') || !(host === p.officialDomain || host.endsWith('.' + p.officialDomain))) return { admitted: false, reason: 'the page must be on the company\'s own domain' };
  if (!p.retrievedAt) return { admitted: false, reason: 'the retrieval time is required' };
  if (!new RegExp(`^${nodePrefix}:[A-Z0-9]{20}:[a-z0-9_]+$`).test(String(nodeId_))) return { admitted: false, reason: 'the named party must be a node scoped to the issuer\'s page' };
  return { admitted: true, p };
};
registerRelationshipType('HAS_STATED_ROLE_ON_ISSUER_PAGE', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const c = issuerPageCommon(assertion, 'ISSUER_PAGE_PERSON'); if (!c.admitted) return c; const p = c.p;
    if (p.pageKind !== 'LEADERSHIP' || !p.personName || !p.role || assertion.nuId?.role !== p.role) return { admitted: false, reason: 'a person and the role the page states are required' };
    if (p.personIdentity !== 'NAME_SCOPED_TO_ISSUER_PAGE') return { admitted: false, reason: 'the person is identified only by the name the page states, scoped to the issuer\'s page' };
    return { admitted: true };
  },
  nuIdKeys: ['role'],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});
registerRelationshipType('LED_FUNDING_ROUND_PER_ISSUER', {
  phiClass: PhiClass.SEMANTIC,
  admissionRule: (assertion) => {
    const c = issuerPageCommon(assertion, 'ISSUER_PAGE_INVESTOR'); if (!c.admitted) return c; const p = c.p;
    if (p.pageKind !== 'FINANCING_ANNOUNCEMENT' || !p.investorName || !p.round || !p.sentence || assertion.nuId?.round !== p.round) return { admitted: false, reason: 'an investor and the round the page states are required' };
    if (!PAGE_KEY(p.sentence).includes(PAGE_KEY(p.investorName))) return { admitted: false, reason: 'the stated sentence must name the investor' };
    if (p.investorIdentity !== 'NAME_SCOPED_TO_ISSUER_PAGE') return { admitted: false, reason: 'the investor is identified only by the name the page states, scoped to the issuer\'s page' };
    return { admitted: true };
  },
  nuIdKeys: ['round'],
  nuStateKeys: [],
  classifyChange: () => 'PERSISTENT',
});
