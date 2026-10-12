# Specification for architectural review: entity-resolution contract and coverage (submitted 2026-10-12)

Status: SPECIFICATION FOR REVIEW. Nothing in it is ratified. Form D, GLEIF, Companies House and UEI are PROPOSED identity classes and each needs explicit ratification; none is implemented. Local and unpushed.
Governing requirement (Founder): every target analysis packet and MAP scores at least 8/10 on the frozen rubric, from genuine evidence-backed analysis: no lowering of the bar, no invented relationships, no scoring manipulation. Identity coverage is one contributor to that requirement, not proof of it.

## 1. Invariants (preserved, not reopened)
1. A selected subject is not necessarily a resolved entity. The subject stays selected and unresolved until a deterministic rule resolves it.
2. Identity comes from a canonical identifier and a source-specific rule; never from name similarity, web search, news, or co-occurrence.
3. An unresolved entity receives no attributed relationships and no subject-specific scores derived from field-level signals.
4. Evidence integrity, relationship admission (ratified types only), the canonical store, the analytical snapshot and the three surfaces (Analysis, MAP, History) are unchanged.

## 2. The pipeline today (verified in the repository and live, 2026-10-12)
| Stage | Mechanism | Identity classes it serves |
|---|---|---|
| Subject selection | `buildQueryContract` selects the subject text (fronted scope phrases handled, DEF-1406) | none: selection only |
| Registry | static registry (59 entities) plus entities admitted at runtime | known entities |
| Name source | `GET /api/sec-names` over the SEC listed-company file: exact name binds as a candidate, unique 4+ character prefix binds as a candidate, near and ambiguous never bind (KRYL-1407) | SEC listed companies |
| Verification and admission | SEC filing-index check by that CIK (annual reports, ticker), identity-only admission (KRYL-1380) | SEC listed companies |
| Entity-scoped producers | all keyed by the SEC CIK: ownership (13D/13G), 8-K capital events and acquisitions, counterparty matching, officers and directors (Forms 3, 4, 5), capital realization | entities with an SEC CIK |
| Admission and delivery | ratified types through the single write path, store, snapshot, Analysis, MAP, History | all |

Admitted relationship types producing today: HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE, CAPITAL_EVENT_INVOLVES, ACQUIRED, HAS_OFFICER_OR_DIRECTOR_DISCLOSURE. Ratified but not producing: SHARED_PATENT_ASSIGNMENT (no key provisioned).

## 3. Shared failure points
| # | Failure point | Evidence |
|---|---|---|
| F1 | Identity covers listed companies only. A private company can never resolve. | Databento packet 2026-10-12: "entity not resolved", every domain field-level, formation not established |
| F2 | Every entity-scoped producer is keyed by the SEC CIK. An entity resolved through any other registry would receive NO relationship producer, so identity alone yields an empty packet. | `topicconnectors.js` fires producers only when `identifiers.edgar` exists |
| F3 | For a private company the requested relationships (technology, ownership, labor) have no ratified source: ownership of a private company is not disclosed in SEC filings; the only SEC evidence a private issuer files is Form D (offering, related persons by name). | gap analysis `specs/coverage-gap-analysis-four-domains-20261012.md`; Form D measured below |
| F4 | An unresolved subject states a nearest-name suggestion but not which sources were checked and what each returned. | current message |
| F5 | Look-alike registrants are the norm for a private company's name (investor vehicles named after it). | Anduril: 75 look-alike Form D registrants; Databento: 2 |

## 4. Measured identity coverage for the four subjects the Founder queries (live sources, 2026-10-12)
| Subject | SEC listed | SEC Form D issuer (exact name) | GLEIF (LEI) | Result |
|---|---|---|---|---|
| Databento | no | **Databento Inc., CIK 0001784241** (look-alikes AVSF - Databento 2026, LLC and FDC DATABENTO LLC do not equal the name) | **DATABENTO INC., US** | resolvable by two registries |
| Integrated Biosciences | no | **Integrated Biosciences, Inc., CIK 0002148371** | none | resolvable by Form D only |
| Daytona | no | none exact (Daytona Platforms Inc. and 11 unrelated vehicles carry the word) | only French and Italian entities named DAYTONA | unresolved: ambiguous or no defensible match |
| Anduril | no | none exact among 100 returned (75 are investor vehicles; Anduril Industries not in the capped result) | only ETFs and a Finnish company | unresolved: look-alikes only |
Companies House and the federal contractor registry (UEI) were not probed (each needs an API key): their coverage is unmeasured.
Form D states the issuer name and CIK, state and year of incorporation, industry group, the offering (date of first sale, total offering amount, amount sold, number of investors), and the related persons (executive officers, directors, promoters) by name and role. It names no investors.

## 5. The contract for an identity class (one shape for every class)
Each class is a declared, versioned contract; adding one does not change the canonical identity or relationship-admission invariants.
1. Source and semantics: what a record in the registry asserts (for example "this legal entity filed a Form D under this CIK").
2. Identifier scheme and validation (CIK: 10 digits; LEI: ISO 17442 with check digits; UK company number; UEI: 12 characters).
3. Matching rule: the query's name with legal suffixes removed equals exactly ONE record's name; jurisdiction and entity-type filters where the registry carries them; similarity never binds.
4. Ambiguity: several equal names stay unresolved and the candidates are listed, not assumed.
5. Verification: a second fact from the same registry under that identifier (for Form D, a Form D filed by that CIK).
6. Provenance: registry, record id, retrieval time and as-of date, carried on the entity card.
7. Label shown to the reader: the class, for example "private SEC filer (Form D), not listed".
8. Failure behaviour: a failed lookup is reported as failed, never as "no match".
9. Producers it enables: the identifiers each entity-scoped producer requires (see F2).

Cross-registry rule (for decision): an entity may carry several identifiers only when each was resolved independently by its own rule and the registries agree on legal name and jurisdiction; any disagreement leaves the subject unresolved with both candidates listed.

## 6. Actionable unresolved states (all classes)
When no class resolves a subject the message states: the sources actually checked and what each returned (no match, ambiguous with candidate names listed, lookup failed, similar names found and not assumed), the sources NOT checked, and the identifier or evidence that would resolve it. A registry is never reported as checked if it was not.

## 7. Dependency order
**Can proceed now (no new ratification; uses existing sources and rules):**
1. Record the checked-sources outcome inside the resolution result and render the actionable unresolved message (F4), for the registry, SEC listed, SEC annual-report filer sources that already exist.
2. Producer dispatch by identifier: each entity-scoped producer declares the identifier it requires; the entity carries a set of identifiers (F2). No new capability by itself; it is the prerequisite that lets a non-SEC identity class receive producers.
3. The identity-class contract in section 5 as a code interface, with the SEC listed class re-expressed through it, results unchanged.

**Requires ratification before any implementation:**
4. SEC Form D issuer identity class (identity only).
5. GLEIF identity class (and Companies House, UEI after probing).
6. Any relationship or observation drawn from Form D (related persons as LABOR; the offering as a CAPITAL observation), and person identity without a CIK.
7. KNOWLEDGE (clinical-trial sponsorship) and TECHNOLOGY (FDA authorization) types, already proposed; MEDIA stays observation-only.
8. PatentsView: the key, provisioned by the Founder.

## 8. Decisions requested of the Architects
D1. Accept the identity-class contract (section 5) as the single extension point, with the invariants unchanged?
D2. The cross-registry identifier rule (section 5): accept, change, or require a single anchor per entity?
D3. Evaluation order and acceptance for the identity classes: recommended Form D, then GLEIF, then Companies House and UEI once probed.
D4. Producer dispatch by identifier (F2): accept as a prerequisite?
D5. Person identity without a SEC CIK (Form D related persons): admit a name-scoped identity within one issuer's filing, or exclude?
D6. May a Form D offering be a dated CAPITAL observation (amounts quoted as stated) although it names no counterparty?
D7. Acceptance population: the frozen 20-query set uses listed companies; the Founder's real subjects are private. Add a separate private-company population (Databento, Integrated Biosciences, Daytona, Anduril and their queries), frozen before implementation, without altering the frozen set?

## 9. Acceptance criteria
- Existing SEC identity resolution is unchanged and takes precedence.
- Each approved class resolves only defensible matches; ambiguous and absent matches stay unresolved with the actionable explanation of section 6.
- No relationship, score or evidence is attributed from a similar-name entity or from field-level activity.
- Resolution status and provenance reach the store, snapshot, Analysis, MAP and History and agree.
- Measured as one contributor to the overall requirement; success is claimed only when every target packet and MAP scores at least 8/10 on genuine evidence. Where a requested relationship has no ratified source the packet is reported unmet with that cause.

## 10. Non-goals
Unratified identity classes or relationship types in production; resolution by name similarity, web search or news; any parallel identity system; production exposure of any route.
