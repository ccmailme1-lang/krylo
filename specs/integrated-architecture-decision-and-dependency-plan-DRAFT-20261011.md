# Integrated architecture decision and dependency plan: DRAFT for Founder and architect review

Date 2026-10-11 · Input: Systemic Capability Specification v0.4 and the Founder-relayed direction of 2026-10-11 · Status: DRAFT. Nothing here is ratified, built or scheduled. Local only; nothing deployed.
Foundation unchanged (canonical store, snapshot, admitted-only formation, temporal interpreter, evidence-attributed synthesis, History). Settled decisions are not reopened. Labels: FACT (read in the repo or a recorded run), JUDGMENT (mine, preliminary).

## 1. Facts that shape the design

1. FACT: relationships are admitted from live evidence for two types: HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE (13D/13G) and CAPITAL_EVENT_INVOLVES (8-K, confirmed counterparties). SHARED_PATENT_ASSIGNMENT and ACQUIRED were ratified on 2026-10-01 and are in the formation domain map (TECHNOLOGY; CAPITAL and OWNERSHIP), but no benchmark case produced either (TECHNOLOGY covered in 0 of 35 cases). Whether their producers are wired into a live call path is UNCONFIRMED (name found, behaviour not traced).
2. FACT: eight connectors (GitHub, arXiv, npm, PubMed, OpenAlex, USAJobs, GDELT, Reddit) are called with the query text only (`topicconnectors.js`). They yield field-level observations with no entity identifier; they cannot become admitted relationships until an entity-binding rule exists for each.
3. FACT: entity-bound lookups exist for ownership (13D/13G), capital events and 8-K signals, capital realization (USAspending).
4. FACT: the same page quotes counts with different scopes and no shared definition: "28 signals" (field), "17 observations bound to the subject", "12 subject-bound observations admitted into Formation", "193 observations across 6 domains", "evidence (10)". Each is computed where it is displayed.
5. FACT: synthesis (`analyticalsynthesis.js`) states supported facts with labels and evidence; it has no finding object that ties statements to the question asked, and nothing connects domains beyond the formation sentence and recurrence counts.
6. FACT: scores: scorer 1 mean 7.943 (30 of 35 at 8 or above), independent GPT 5.5 then 7 on one page (Broadcom), the blind eight-case review not done.

## 2. One design (four parts, one contract)

### 2.1 Analytical contract (build first)
One module, `analyticalmodel.js`, builds from the frozen snapshot a single `analysisModel`: the seven counts below, the findings (2.4) and the evidence index. Analysis, MAP and History render that object (History already rebuilds from the stored snapshot with the same builders). A surface may not compute a count itself.

| Term | Scope | Producer (authoritative) |
|---|---|---|
| Field signals | all live signals in the pool at freeze, all domains | frozen pool (`domaingravity.js` freeze) |
| Retrieved observations | everything fetched for the query, by source | connector results in the snapshot |
| Subject-bound observations | observations whose own identifier resolves to the subject | subject binding (`subjectbinding.js`) |
| Candidate relationships | proposed links not yet admitted, with the reason | admission report (extend `admissionreport.js`) |
| Admitted relationships | passed a ratified type's admission rule | canonical store view in the snapshot |
| Formations | links between domains from admitted relationships only | `admittedformation.js` |
| Contextual leads / unresolved evidence | co-presence; unmatched or insufficient items | `formationinference.js`; admission report |

Each count carries its scope and population in the model, so a label reads "17 subject-bound observations (of 203 field signals)".

### 2.2 Relationship type contract and coverage discovery
Extend the existing registry (`registerRelationshipType`, no new pipeline) so every type declares the ten fields in v0.4 section 5: semantic definition, domain mapping, eligible sources, required evidence, entity matching, admission conditions, exclusions, temporal semantics, provenance, failure behaviour. Existing types are back-filled and must score identically.

Gap analysis (repeatable): for each source class, list what it observes, whether the observation carries an entity identifier, what link it could establish, and the evidence a reader would see; rank by evidence quality, value to structural questions, feasibility. First pass, JUDGMENT, to be re-run as the formal first deliverable:

| Rank | Candidate | Domain | Source | Identity | Note |
|---|---|---|---|---|---|
| 1 | ACQUIRED (ratified) | CAPITAL, OWNERSHIP | 8-K Items 1.01, 2.01 | both parties by CIK | confirm the live producer is wired |
| 2 | SHARED_PATENT_ASSIGNMENT (ratified) | TECHNOLOGY | PatentsView | assignee to CIK | needs an assignee-to-registrant match rule |
| 3 | Officer appointment or departure disclosed | LABOR | 8-K Item 5.02 (observations already extracted as EXECUTIVE_CHANGE) | company by CIK; person by name only | person identity is weak; a person-level rule is a Founder question |
| 4 | Authorship affiliation | KNOWLEDGE | OpenAlex, PubMed | institution string to registrant | matching is weak; defer until a rule exists |
| 5 | Named in coverage | MEDIA | GDELT, Reddit | text only | co-mention is not a documented relationship; recommend MEDIA stays observation-only until a documented-relationship source exists |

Nothing unratified enters production admission.

### 2.3 Entity binding as shared infrastructure
Name resolution (done: KRYL-1407) plus a per-source binding rule feed the same matching outcomes already used for counterparties (confirmed, unnamed affiliate, candidate, unresolved). New sources use that path; no source writes relationships directly.

### 2.4 Synthesis model
Add a `finding` object to the model: supporting relationship ids with provenance, participant roles, temporal basis or "atemporal", strength (DOCUMENTED, SUPPORTED, INFERRED, UNRESOLVED), alternatives where material, and significance to the question asked (the needed domains for the question, already derived in the scorer, selected from the question). Findings are ordered with the lead finding first; statements that are inventory stay as evidence under the finding. Claim strength follows the evidence ladder already built.

### 2.5 Delivery
Analysis leads with findings and what changed, then structure, unresolved items, then diagnostics behind disclosure (layout is a Founder decision). MAP renders admitted relationships only; signal dots stay observation indicators (live-wired). History is the stored model.

## 3. Dependency order, risk, acceptance evidence

| # | Workstream | Depends on | Risk | Acceptance evidence |
|---|---|---|---|---|
| 1 | Analytical contract (`analyticalmodel.js`; surfaces consume it) | none | low (snapshot and store reused) | one model object; the five count variants above replaced; same snapshot gives identical numbers on Analysis, MAP, History |
| 2 | Type contract + first formal gap analysis | 1 | medium (over or under proposing) | ten-field contract on all types; ranked proposals with evidence, value, feasibility |
| 3 | Ratified types admitted (start with ACQUIRED and SHARED_PATENT_ASSIGNMENT wiring, then ratified LABOR) | 1, 2, ratification | medium (matching edge cases) | new relationships in the store with provenance; candidates stay distinct |
| 4 | Synthesis findings | 3 | medium | each finding satisfies the six-point standard; question alignment recorded |
| 5 | Presentation and History alignment | 1, 4 | low | identical relationship sets, counts, temporal results across surfaces |
| 6 | Acceptance | 1 to 5 | low | section 4 |

Earliest end-to-end milestone: after step 3 for one type and a minimal step 4, a previously ownership-only case showing an admitted cross-domain relationship with a finding (candidate: a patent-heavy company, if the PatentsView producer proves wired).
Migration risks: snapshot and store contracts untouched; existing ownership and capital relationships must score identically; History stays compatible with stored snapshots (the identity-key matching already added).

## 4. Acceptance method
Freeze before implementation: the routine-query set (size, selection method, scoring procedure), covering the six domains, registry-resolved and runtime-admitted entities, strong and weak evidence, ambiguous identity, temporal change and no-formation cases, easy and hard. The 35-case benchmark and the routine set are evaluated separately; baseline and rules preserved; every score under 8 is listed with its root cause; zero regressions on previously passing cases; independent blind scores kept separate from scorer 1. A fixed set shows performance on that set, not for every future query; production failures are monitored for new systemic gaps. C07 and C11 (fixed by DEF-1406) are re-measured inside this evaluation, not as a separate cycle.

## 5. Decisions that need the Founder
1. **First user and the routine-query population** (blocks the frozen set and the acceptance method).
2. Ratify extending the type registry with the ten-field contract (a change to a ratified mechanism).
3. Person identity for LABOR (type 3 in the table): name-only matching is weak; accept a documented-name rule or hold LABOR.
4. MEDIA policy: observation-only, or name a documented-relationship source.
5. Sources and licences for LABOR, KNOWLEDGE, MEDIA beyond those already connected.
6. Presentation direction (lead finding first; diagnostics behind disclosure).
7. Whether the v0.4 gate (every case at or above 8 in both populations) is adopted as written, given the honesty clause that insufficient evidence caps a score.
8. Production exposure items, unchanged: `/api/sec-names` and `/v1/canonical-store` stay unexposed until approved.

## 6. Not reopened
Canonical store, snapshot, formation input, temporal interpreter, evidence attribution, name-resolution rules, benchmark baseline and rubric.
