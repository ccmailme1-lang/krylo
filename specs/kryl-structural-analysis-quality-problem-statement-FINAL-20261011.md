# KRYLO — Structural Analysis Quality Problem Statement

Version: FINAL for architects · Date: 2026-10-11 · Sections 1 to 7 are the Founder's problem statement, unchanged. Sections 8 to 12 are added context taken from the repository and the work done to date; they describe the current state and the constraints on the design, and they do not prescribe the solution.

## 1. Problem

KRYLO does not yet consistently produce the level of structural analysis required to fulfill its product objective.

Across different subjects, industries, and analytical questions, results frequently identify observations and contextual co-presence without establishing meaningful, evidence-supported relationships between the relevant participants. Even when canonical relationships exist, KRYLO does not consistently synthesize them into a coherent explanation of the structure they form, what that structure reveals, or why it matters.

Consequently, the delivered analysis often falls short of decision-useful structural intelligence. Results remain uneven across queries, and technical correctness, evidence volume, and successful execution do not reliably translate into analytical quality.

This is a system-level capability problem, not an isolated entity, connector, query, or presentation defect.

## 2. Desired Outcome

KRYLO must consistently transform distributed observations into evidence-grounded structural analysis across supported subjects and questions.

The resulting analysis must establish, where supported:

* **Relationships:** Which relevant participants are connected, through what relationship, and on what evidence.

* **Formation:** Which relationships collectively establish an emergent structure, rather than merely co-occurring in the same domain or observation pool.

* **Structural significance:** What the established structure reveals about dependencies, concentration, control, exposure, or changing ecosystem relationships.

* **Change over time:** Which relationships are new, dissolved, reconfigured, or indeterminate, with conclusions bounded by source coverage and dates.

* **Analytical implications:** Why the identified structure matters to understanding the subject, with every material claim traceable to its supporting relationships and source evidence.

* **Limits:** What remains unresolved, unsupported, or unobservable from available evidence.

These capabilities must operate as a coherent analytical system, not as disconnected features or subject-specific fixes.

## 3. Current Capability Gaps

The architecture must account for the following observed gaps:

1. **Relationship coverage:** Discovery and admission are uneven across the six canonical pressures: CAPITAL, LABOR, KNOWLEDGE, TECHNOLOGY, MEDIA, and OWNERSHIP.

2. **Structural synthesis:** Admitted relationships are not consistently assembled into a coherent, cross-domain structural explanation.

3. **Formation integrity:** Domain co-presence can provide contextual leads but cannot, by itself, establish a relationship or formation.

4. **Temporal continuity:** Relationship changes must be evaluated on the same canonical relationship substrate, with incomplete evidence distinguished from proof of a change.

5. **Evidence traceability:** Material interpretations must be traceable to admitted relationships and source evidence.

6. **Analytical consistency:** Quality varies across subjects and queries; improvements to individual cases do not establish a general capability improvement.

7. **Quality measurement:** Technical tests do not adequately establish whether the delivered analysis is materially more useful, structurally deeper, or better supported.

## 4. Constraints and Invariants

* KRYLO detects; it does not predict.

* No fabricated relationships, causal explanations, significance, magnitudes, or confidence claims.

* Canonical relationships require explicit admission rules and source-grounded evidence.

* Co-presence remains contextual evidence for discovery, not a substitute for admitted relationships.

* Missing evidence does not prove that a relationship ended.

* Every material structural claim must be traceable to its supporting relationships and sources.

* When the evidence does not support a structural conclusion, KRYLO must say so.

* Reproducibility across Analysis, MAP, and History must not come at the expense of analytical correctness.

## 5. Required Architectural Response

Provide an integrated architectural solution that addresses the complete path from source observations to the analysis delivered to the user.

The response must explain how the system will achieve relationship discovery and admission, formation, cross-domain synthesis, structural significance, temporal interpretation, evidence traceability, and consistent delivery across supported subjects and queries.

The solution must identify necessary changes to existing components and contracts, shared mechanisms, dependencies, persistence, consumers, and user-facing behavior. It must distinguish foundational changes from downstream capabilities without fragmenting the objective into unrelated projects.

The architecture is not predetermined by this problem statement. The architects are responsible for proposing the design, sequencing, and implementation approach.

## 6. Acceptance Criteria

The proposed solution must support verification that:

* Relationships are discovered and admitted under explicit, source-grounded rules across the supported relationship types and domains.

* Formations are grounded in admitted relationships; co-presence alone cannot establish them.

* Structural explanations synthesize connected relationships rather than simply enumerate observations.

* Significance and analytical implications are supported by identifiable evidence.

* Temporal comparisons use canonical relationships and handle incomplete coverage correctly.

* Claims can be traced from the delivered analysis through relationships to source evidence.

* Analysis, MAP, and History present consistent interpretations of the same underlying analytical state.

* Improvements generalize across a fixed, representative set of subjects, industries, and questions rather than only the examples used during implementation.

* Evaluation measures delivered analytical quality, including subject alignment, structural depth, evidence quality, significance where supported, consistency, and unsupported claims.

The existing KRYLO quality scale remains the product measure: 1–10, with 10 representing Goldman-approved decision usefulness. The target is **8/10 or better for routine supported queries, consistently**, without inventing conclusions to improve scores. The benchmark must establish whether that target is achieved; it must not assume success.

## 7. Requested Deliverable

Return one integrated architectural proposal containing:

1. Root-cause analysis of the current quality gap.

2. Target architecture and end-to-end analytical flow.

3. Required changes to relationship discovery, admission, formation, synthesis, temporal interpretation, and evidence traceability.

4. Component ownership, data contracts, persistence, and consumer impacts.

5. Dependency-aware implementation sequence.

6. Representative evaluation method and measurable acceptance criteria.

7. Explicit unresolved decisions, risks, and limitations.

**The central question:** What architectural changes will make KRYLO consistently produce materially better, evidence-grounded structural analysis across subjects and queries—not merely collect more observations, admit more relationships, or pass more engineering tests?

---

## 8. Current state of the pipeline (verified in the repository, 2026-10-11)

How an analysis is produced today, source to screen. Items marked (verified) were read in code or observed in a running build this week; the rest are stated from documentation and were not re-verified.

| Stage | What exists | Observed limit |
|---|---|---|
| Entity resolution | A 59-entry registry plus runtime admission of verified SEC filers by CIK (identity only). (verified) | Names SEC lists differently stay unresolved. Runtime admission is in memory per page session. |
| Observation | Connectors dispatch signals into one shared pool (`domaingravity.js`): domain, confidence, polarity, source, entity id, event date. 8-K filings now also carry the event class, accession, and, for filings with capital-event items, a quoted amount, instrument and named counterparties. (verified) | Most pool entries are source, class and date only. The pool is a 30-minute window of signals, not a store of relationships. |
| Canonical relationships | Admission engine with a closed set of ratified types; entity-scoped admission through `admitAndProject`. Only the ownership-disclosure type (Schedule 13D/13G) is produced from live filings. (verified) | One relationship type is produced from live evidence. Canonical relationships live in memory per runtime; no persistence for this path. |
| Temporal comparison | Source-dated comparison of two adjacent 12-month periods for ownership: existence (new, persisting, dissolved, indeterminate), magnitude, configuration, with explicit coverage rules. (verified) | It runs on its own retrieval path and result store. It does not read canonical relationships and does not feed formation. |
| Formation | Inference over the pool: domains co-present with enough pressure form edges; formation existence is a deterministic product of cohesion, pressure coherence and groundedness. (verified) | Its input is the signal pool, not admitted relationships. Cross-domain lines in the brief are co-presence and are labelled "not admitted". |
| Delivery | Analysis brief, MAP (iframe), domain tabs, header state, relationship-change block, and a persisted formation-history scrubber (a separate server-side record). | The scrubber's persisted snapshots (KRYL-1334) are a different object from the analytical snapshot below and are not merged. |
| Reproducibility | An analytical snapshot freezes the pool and the canonical relationships at lookup settlement; one explicit atomic refresh replaces it; the relationship-change result is pinned to it (KRYL-1398, in Review). (verified in a running build) | It makes the answer repeatable. It does not add analytical depth. |

## 9. Existing contracts that bind the design

These are already ratified or locked in the product; the architecture should work inside them or propose a recorded change.

* **Six canonical domains only:** TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP.
* **Formation is not a verdict (constitutional).** KRYLO presents substantiated structure; the guest derives meaning, prediction and decision. The Non-Inference Boundary bars converting observed structure into an unsupported conclusion, prediction, recommendation, risk judgment, prioritization or prescribed action. It is a boundary on conversion, not on presentation: structure that satisfies the admission and formation contracts is shown. **Design tension to resolve explicitly:** this statement asks for "structural significance" and "analytical implications". The architecture must define where evidence-grounded significance (what the structure shows about dependencies, concentration, control or change) ends and unsupported inference begins.
* **Direction honesty:** every domain pressure carries magnitude and polarity (constructive or fracture); suppressing a fracture signal is treated as fabrication by omission.
* **Route, don't aggregate:** routing operates on atomic or minimally normalized inputs; aggregation only after routing.
* **Orthogonal axes:** scoring axes must be independent unless declared dependent.
* **Absence is a classified state** (source does not exist; exists but not obtained; obtained but insufficient; measure not defined), never a null that reads as "none".
* **Signal ingestion:** normalize to 0 to 100, tag source, domain, signal, confidence and time, dispatch through the router; no single source dominates.
* **Closed-loop principle:** a decision is complete when its outcome is observed, attributed and incorporated; attribution is the highest-risk layer; ranking should weight earliness and non-consensus, not only past leverage.

## 10. Decisions already made (not reopened by this statement)

* Temporal comparison: two adjacent 12-month periods; dates are source event dates.
* Ownership magnitude: 1.0 percentage point on the same share class and reporting person.
* Capital-event magnitude: indeterminate in the first version.
* Reconfiguration has two subtypes (documented rights change; verified participant change).
* Cross-domain fracture is a lead only in the first version, not an established relationship.
* Analytical snapshot: frozen when the subject lookups settle, with an explicit atomic refresh; mechanism is frozen input (pool and relationships copied), with the relationship-change result pinned.
* Evidence ladder for relationships: lead, supported connection, established relationship, established structural change; entity identity, relationship existence and change are separate questions.
* Counterparty matching outcomes: same entity confirmed, affiliation confirmed, transaction link confirmed, candidate match, unresolved.

## 11. Evidence of the gap

* Reviewer scores on delivered analyses of tested subjects have been in the 3 to 7 range on the 1 to 10 scale; a single subject scored 6 on the working rubric and 4 from an independent reviewer on the same page after the evidence work. The consistent reading: more auditable, not yet structurally deeper.
* A fixed, representative benchmark does not exist. The query corpus (57) tests query parsing, not analytical quality; one benchmark run exists from 2026-10-06.
* Engineering evidence is strong and does not move the analytical score: unit and live suites pass for the classifier, retrieval, extraction, snapshot and render paths; about 120 test suites run, with 21 long-standing failures unchanged by recent work.
* Capital-event extraction works on filings that carry capital-event items (amount, instrument and named counterparties are quoted with the supporting passage) and correctly shows nothing for subjects whose filings do not. Filings reported under Item 8.01 ("Other Events") are not read.

## 12. Open decisions, risks and known limits

Open (Founder):
1. Which additional relationship types to ratify; the set is closed.
2. Whether formation should consume only admitted relationships, with co-presence retained only as labelled contextual leads (replacing the current mechanism), or run alongside it.
3. Whether the temporal comparison moves onto the canonical relationship substrate.
4. Whether capital-event extraction should read Item 8.01 filings.
5. Persistence of canonical relationships across sessions and runtimes (currently none for the live path).
6. The shape and size of the representative benchmark; it must stay light enough not to delay delivery.

Risks and limits to carry into the proposal:
* A replacement of an existing mechanism (formation input) must be declared as a replacement, not added beside it.
* Two parallel representations of relationships must not result.
* Rule-based extraction from filing text is conservative and incomplete by design (amounts without a currency symbol and counterparties without a legal suffix are not extracted); other relationship types will need their own source-grounded admission rules.
* Reproducibility mechanisms must not freeze incorrect or incomplete analysis into a stable result.
* Environment: all work to date is on a development machine; nothing described here is deployed to production.
