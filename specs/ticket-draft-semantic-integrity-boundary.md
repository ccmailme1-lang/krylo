# DRAFT (not filed) — Semantic Integrity Boundary: QUESTION → INTERPRETATION → OBSERVATION → RELATIONSHIP → ANSWER STATUS

Label on filing: `needs-spec` (NOT implementation-ready). Type: Task. Project KRYL.
Blocking relationships are recorded as plain text (Jira "Blocks" links / BLOCKED label are not used in this project).

Dependency chain (governs order of work):

    Materiality rule (Founder-authored) → Relationship admission → Answer status → Validation corpus

The interpretation ledger (80a2f6c) sits OUTSIDE this chain as a disclosure-only mechanism.

---

## The six required fields (CLAUDE.md §10 Ticket Definition Requirement)

### 1. Original intent
Establish a non-negotiable semantic boundary between what the user asked, what the system legitimately interpreted, what the structural field actually contains, whether each required relationship was established by observation, and the answer status that may be claimed. Motivated by the 2026-09-24 validation run: 10/10 queries executed, but the packet for "Lockheed Martin ownership and the Antarctic krill fishery" presented Lockheed-only observations with no statement that the requested relationship was never established. The interim ledger (80a2f6c) discloses uncarried query content; it does not determine whether observations address the question. This ticket owns that determination.

### 2. Acceptance criteria
See section 7 below. Criterion 8 is BLOCKED (see there).

### 3. Current implementation state — Maturity B (primitives exist, composed capability does not); verification: L/C/R
NOT BUILT as a pipeline. The following are **partial primitives, not an implementation of the specified pipeline**:
- `buildAnalysisIntent()` (analysisintent.js): subject/objective/scope/`rCmp` extraction; `eReq` always NOT_DETECTED; objective unresolved for most queries; no per-element ESTABLISHED/AMBIGUOUS/UNRESOLVED contract.
- `subjectScope()`: single-subject authority over a 57-entity registry; no multi-subject or non-registry subject handling.
- RECONN relationship authority: no persisted admissions yet (packet states this); `deriveRelationships()` production gap tracked in KRYL-1280.
- `buildInterpretationLedger()` (80a2f6c, INTERIM): lexical token subtraction; fixed basis sentence chosen by whether an entity resolved; derives nothing from any observation or relationship result. Not a semantic-integrity mechanism.
Verified 2026-09-24/25 by the ten-query run against a clean build of 80a2f6c.

### 4. Dependencies (plain text, no Jira blocks)
- **Materiality rule** — Founder-authored; NOT derivable from the ten-query corpus (see 4.5).
- **Relationship-admission model** — the evidence standard for "relationship ESTABLISHED"; related RECONN work (KRYL-1310, KRYL-1311), relationship production gap (KRYL-1280), relationship-identity registry (KRYL-1296).
- Interpretation-stage overlap with KRYL-1237 / KRYL-1238 (subject/clue handling) — must be reconciled, not duplicated.

### 5. Superseded by / overlapping (Jira duplicate check, 2026-09-25)
No existing ticket owns ANSWER STATUS. Overlaps, none of which cover the observation → relationship → answer-status stages:
- KRYL-1238 (In Progress): interpretation-stage clue extraction/preservation for DECISION_FRAME; never silently bind identity. Overlaps stage 2 only.
- KRYL-1237 (In Progress): named-unverified subject. Overlaps stage 2 only.
- KRYL-1311 / KRYL-1310 (Ready): RECONN canonical contract and gap matrix (incl. `rCmp`). Closest to stage 4 (relationship); does not define answer status.
- KRYL-1234 / WO-5B (In Progress): subject-binding stated absence; covers subject state, not requested-relationship state.
- KRYL-1308 / KRYL-1309 (Ready): decouple structural-field rendering from subject-binding failure; scenarioCues. Adjacent.
- KRYL-1280 (Review): relationship production gap. Dependency, not overlap.
- KRYL-1318 (Ready): audit-only, unrelated.
Search was keyword-based over descriptions (50 hits triaged, ~10 read); comments and other phrasings were not exhaustively searched.

### 6. Maps to the current KRYLO product model
Yes. §20.8 ("expose the relationship — don't make the analyst assemble it") and §21 (present the substantiated structure; the guest interprets). Answer status reports the evidentiary state of a requested relationship; it does not evaluate the question or the decision.

---

## §21 invariant (binding on this ticket)

> **Answer status describes the evidentiary state of the requested relationship. It is not a judgment, verdict, recommendation, or evaluation of the user's question or decision.**

`NOT ESTABLISHED` is a reportable structural absence (Absence-Is-Signal, §1), never a euphemism for withholding observed structure. Structural presentation remains unconditional; answer status is an added, separate statement.

---

## 1. Purpose
Establish a boundary between: what the user asked; what the system legitimately interpreted; what the structural field actually contains; whether any required relationship was established by observation; and the resulting answer status that may be claimed.
This is **not** a UI ticket, **not** a patch to the ledger, and **not** a narrative-generation improvement.

## 2. Problem statement
KRYLO can resolve one or more entities/domains from a question and emit observations about them while failing to establish the relationship, comparison, objective, contextual condition, or constraint the user requested. An observation about a resolved subject can then appear to answer a question containing requirements that were never established.
Canonical failure: "Lockheed Martin ownership and Antarctic krill fishery" → resolves LOCKHEED MARTIN, emits Lockheed observations; Lockheed Martin ↔ Antarctic krill fishery is never established.

## 3. Required architecture (immutable pipeline)

    RAW QUESTION     ← immutable evidence of user intent
      ↓
    INTERPRETATION   ← structured extraction of what was asked
      ↓
    OBSERVATION      ← what the structural field actually contains
      ↓
    RELATIONSHIP     ← explicit evaluation of every required relation
      ↓
    ANSWER STATUS    ← ADDRESSED | PARTIALLY ADDRESSED | NOT ESTABLISHED
      ↓
    NARRATIVE / PRESENTATION ← may not invent status or imply unestablished relations

No stage may silently rewrite, drop, or redefine the semantic content of the prior stage.

## 4. Stage contracts

### 4.1 QUESTION
Preserved exactly as asked. Immutable evidence. No downstream stage may remove, rewrite, or replace any semantic component.

### 4.2 INTERPRETATION
Structured representation of what the question establishes. Possible elements (non-exhaustive): primary subject(s); additional subject / comparison operand; objective; requested relationship (ownership, dependence, capacity, acquisition strategy…); context/domain; scope; temporal condition; explicit constraints. Each element carries a state: ESTABLISHED | AMBIGUOUS | UNRESOLVED.
Rules: missing information is not manufactured. Interpretation answers only "what is the user asking about?", never whether the requested thing exists in the field.

### 4.3 OBSERVATION
What the field actually contains: signals, entities, events, relationships, formations, absences.
Hard prohibitions: subject resolution ≠ relationship establishment; domain presence ≠ relationship establishment; lexical overlap ≠ relationship establishment; co-occurrence ≠ relationship establishment (unless the observation model explicitly establishes it).

### 4.4 RELATIONSHIP
Evaluate every relationship required by the Interpretation against the Observation layer. ESTABLISHED only when observation provides evidence sufficient to support that specific relationship.
Forbidden inference sources: both entities present; same domain; names in related text; one entity resolved; a connector containing information about one side; the relationship being "plausible".

### 4.5 ANSWER STATUS
| Status | Definition |
|---|---|
| ADDRESSED | All material elements of the interpreted question are supported by established observations and relationships. |
| PARTIALLY ADDRESSED | Some material elements established; one or more material elements unresolved or unestablished. Output must identify what was and was not addressed. |
| NOT ESTABLISHED | The requested relationship or material question cannot be established from the observed field. Subject observation alone does not upgrade this. |

Status is derived solely from relationship/observation state — never from parsing success, entity resolution, packet generation, or narrative fluency.

**OPEN — Materiality rule.** What makes an unresolved or unestablished element *material* for purposes of distinguishing `PARTIALLY ADDRESSED` from `NOT ESTABLISHED` is undefined. It must be **Founder-authored**. It must **not** be defined or tuned from the ten-query validation corpus: the corpus can validate the eventual rule; it cannot define it.

## 5. Core invariants
1. Interpretation is not Observation.
2. Observation is not Answer.
3. Subject resolution does not satisfy relational intent (resolving A does not satisfy A ↔ B).
4. Missing evidence remains missing — never filled with inference, plausibility, generic domain knowledge, or unrelated observations.
5. Absence is reportable and distinguishable from system failure.
6. Answer status follows evidence, never parsing success, entity resolution, or narrative generation.

## 6. Data boundary
No presentation or narrative layer may manufacture an answer status, convert an observation into an implied relationship, or silently redefine the interpreted question.

## 7. Acceptance criteria
1. Two entities in a query does not yield ADDRESSED solely because either or both are observed.
2. A requested relationship does not yield ADDRESSED unless observation establishes it.
3. A resolved subject with an unestablished requested relationship yields PARTIALLY ADDRESSED or NOT ESTABLISHED per the materiality rule.
4. Unresolved query elements remain visible to the answer-status layer.
5. No semantic element is silently dropped between QUESTION and INTERPRETATION.
6. No relationship is inferred solely from lexical overlap, domain co-occurrence, entity resolution, or plausibility.
7. Narrative cannot describe an unestablished relationship as though observed.
8. **[BLOCKED — pending (a) the Founder-authored materiality rule and (b) the relationship-admission model.]** The system distinguishes: subject observed / relationship not established; both subjects observed / relationship not established; relationship established; insufficient observation to establish the requested relationship.
9. `buildInterpretationLedger()` remains a disclosure mechanism unless this architecture supersedes it through a separately reviewed implementation.
10. Existing answer content is not retroactively declared semantically valid because the ledger identifies uncarried terms.

## 8. Validation corpus (minimum) — validates the rule, never defines it
Record per query: QUESTION → INTERPRETATION (element states) → OBSERVATION → RELATIONSHIP (per required relation) → ANSWER STATUS. Must demonstrate not merely that omitted terms are disclosed, but whether the interpreted question is actually addressed.
Cases: FedEx + UPS + last-mile delivery capacity; Google + Microsoft + acquisition strategy; NVIDIA + advanced semiconductor manufacturing dependence; Lockheed Martin + Antarctic krill fishery; regional logistics company + ownership/technology relationships; Amazon + warehouse automation + logistics labor; Autodesk + acquisition ownership control; unnamed logistics-acquirer dependency question; Automation labor displacement; investment question involving Google/Alphabet.

## 9. Explicit non-goals
Redesign the search interface; add another chip/filter system; create M&A or Supply Chain modes; add a generic fallback field; expand queries artificially; manufacture missing subjects or relationships; introduce prediction or recommendation logic; modify the six-domain model; treat the ledger as semantic-integrity completion.

## 10. Relationship to 80a2f6c
| | Role |
|---|---|
| 80a2f6c | INTERIM: interpretation ledger, disclosure only. Exposes the current gap. |
| This ticket | Defines the work needed to determine whether the question was actually addressed. |
The interim ledger must never be represented as having completed this work.
