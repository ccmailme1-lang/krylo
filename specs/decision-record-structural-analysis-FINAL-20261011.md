# KRYLO Structural Analysis — Final Decision Record

Version: Decision · 2026-10-11 · Recorded verbatim from the Founder's paste. Supersedes the open rulings in `decision-record-evidence-to-formation-build-order-20261010.md` (its Amendment A proposal is superseded by this record). Status: Architecture approved with the four corrections below. Implementation may proceed only in the dependency order stated. Settled questions are not reopened.

Recording notes (added by the engineer, not part of the decision text): (1) The text refers to "four corrections" but does not list them; they are not separately identifiable here. (2) CAPITAL_EVENT_INVOLVES is marked "proposed for ratification" in section 3 and section 10; it is not recorded here as ratified. (3) Environment: development machine only; nothing described is deployed.

---

## 1. Approved architecture direction

The core design is adopted:

**Admitted, evidence-backed relationships → Formation → Temporal interpretation → Structural synthesis → Consistent delivery**

Governed by **maximum analytical disclosure with evidence integrity**.

- Capture and expose what the data supports.
- Preserve relationships, context, contradictions and implications present in the evidence.
- Make provenance, uncertainty, coverage and evidence strength fully visible.
- Do not invent findings or misrepresent the evidence.
- Do not suppress a finding or implication because it is consequential, predictive or decision-relevant.
- Do not present an inference as a directly established fact.

**Transparent evidence attribution (replaces prior categorical prohibition)**
Every material statement is explicitly labelled by its evidentiary status:

- **Directly documented** — stated in the source.
- **Supported by relationships** — licensed by the admitted graph and its evidence packages.
- **Inferred** — a reasonable implication of the supported structure that goes beyond what is directly documented.
- **Unresolved** — evidence is missing, insufficient or contradictory.

Users see the full chain and can assess the findings themselves. KRYLO neither withholds evidence-supported implications nor elevates inference to established fact.

---

## 2. Settled architectural rulings

| Topic | Ruling |
|-------|--------|
| Formation | Consumes only admitted relationships present in the analytical snapshot. Co-presence remains a discovery lead only and never becomes structural proof or a formation member. |
| Temporal interpretation | Operates on the canonical relationship substrate. Existing rules retained: two adjacent 12-month windows, source event dates, ownership magnitude 1.0 pt, capital-event magnitude INDETERMINATE, two RECONFIGURED subtypes, incomplete evidence → INDETERMINATE. |
| Persistence | Canonical relationships are durable and versioned (entity-scoped, time-stamped, evidence-linked). |
| Relationship coverage | Expands only through explicit, source-grounded admission criteria. The type set remains closed. |
| Consistency | Analysis, MAP and History must present consistent, fully traceable views of the same analytical state. |
| Success measure | Delivered structural-analysis quality on the existing 1–10 product scale. Target: routine supported queries consistently ≥ 8/10. Engineering suites, observation volume or relationship count alone do not demonstrate improvement. |

---

## 3. CAPITAL_EVENT_INVOLVES — proposed ruling for this decision

**Status**: Proposed for ratification in this decision record (not pre-ratified).

**Admission criteria** (confirmed):
- Source is an 8-K (or equivalent) already classified by the existing extractor as containing a capital-event item.
- Required extracted fields present: event date, instrument (or equivalent), one or more named counterparties, supporting passage.
- Counterparty matching outcome ∈ {same entity confirmed, affiliation confirmed, transaction link confirmed}.
- Evidence ladder step ≥ supported connection.
- Magnitude recorded as INDETERMINATE (existing decision).

**End-to-end path**:
Existing capital-event extractor → counterparty matching → admission via the single write path → durable Canonical Relationship Store → inclusion in analytical snapshot → available to Formation, Temporal Interpreter and Synthesis → expandable from every delivery surface.

No new connector is required. Implementation is reachable once this ruling is recorded.

---

## 4. History alignment (required in the architecture now)

**Decision**: History is a consumer of the same durable Canonical Relationship Store and of analytical snapshots.

- An analytical snapshot remains the reproducibility boundary for a single analysis session (frozen pool + admitted relationships + pinned temporal result, atomic refresh only).
- History views are constructed from the durable store and from persisted snapshots, so that the relationships, formations, temporal states and evidence packages a user sees over time are consistent with those shown in Analysis and MAP.
- The existing formation-history scrubber (KRYL-1334) is recognised as a separate legacy object. The architecture requires a defined migration or replacement path so that History does not diverge from the canonical store. Implementation of that migration may be sequenced after the core store and snapshot path are stable; the relationship itself is decided now.

This eliminates a permanent split between what users see in live analysis and what they see over time.

---

## 5. Representative benchmark (defined before implementation)

**Purpose**
Provide a stable, external measure of whether the architecture materially improves delivered structural analysis.

**Composition (initial fixed set)**
- **Subjects**: 8–12 entities spanning at least four industries and all six canonical domains, including both registry-resolved and runtime-admitted entities. Exact list to be finalised by product before the first implementation sprint; the set is frozen once chosen.
- **Questions**: 15–25 analytical questions that require relationship discovery, formation, temporal change, cross-domain synthesis, and explicit handling of missing or contradictory evidence. Questions are fixed and versioned.
- **Baseline**: Each subject/question pair is scored once on the current system (pre-implementation) using the rubric below. Scores are recorded and never altered.
- **Scoring rubric** (applied to the delivered analysis, not to intermediate artifacts):
  - Subject alignment (0–2)
  - Relationship coverage & admission correctness (0–2)
  - Formation integrity (admitted relationships only) (0–1)
  - Structural depth & synthesis quality (0–2)
  - Evidence attribution & traceability (0–1)
  - Temporal correctness & coverage honesty (0–1)
  - Consistency across Analysis / MAP / History (0–1)
  Total mapped to the existing 1–10 product scale.
- **Target**: Routine supported queries in the benchmark consistently achieve ≥ 8/10 after the architecture is in place.
- **Governance**: The benchmark is owned by product. It may be expanded later but the original set and baseline scores remain the reference for measuring improvement.

Benchmark definition and baseline scoring are prerequisites to the first implementation work that claims structural improvement.

---

## 6. Component contracts and dependencies (explicit)

| Component | Contract | Depends on |
|-----------|----------|------------|
| Signal pool | Unchanged; discovery input only | — |
| Relationship Discovery & Admission | Single write path; type-specific source-grounded rules; evidence ladder + matching | Extractors, matching service |
| Canonical Relationship Store | Durable, versioned, entity-scoped, evidence-linked | Admission path |
| Analytical Snapshot | Freezes pool + relationships + pinned temporal result; atomic refresh only | Store |
| Formation Engine | Input = admitted graph in snapshot only; co-presence = labelled lead | Snapshot |
| Temporal Interpreter | Reads store; writes result into snapshot; existing coverage rules | Store, Snapshot |
| Structural Synthesis | Assembles connected structure; applies transparent evidence attribution; full provenance | Snapshot |
| Delivery (Analysis, MAP) | Read identical snapshot; every material claim expandable to evidence | Snapshot |
| History | Constructed from durable store + persisted snapshots; migration path from KRYL-1334 required | Store, Snapshot |

Documented dependencies that travel with the design (do not re-probe): existing XBRL investigation and the documented cross-entity inconsistency between canonical relationships and the prior temporal result. Cite the existing artifacts in implementation tickets.

---

## 7. Dependency-aware implementation sequence

1. Finalise and freeze the representative benchmark subjects, questions and baseline scores.
2. Complete analytical snapshot freeze + atomic refresh (already in Review).
3. Ratify CAPITAL_EVENT_INVOLVES and implement its end-to-end admission path into the durable store.
4. Stand up the durable, versioned Canonical Relationship Store and migrate temporal interpretation onto it.
5. Replace formation input (admitted graph only).
6. Implement structural synthesis with transparent evidence attribution.
7. Align Analysis and MAP to the snapshot and evidence-expansion contract.
8. Define and execute the History migration/replacement path from the legacy scrubber.
9. Measure against the frozen benchmark; iterate only on evidence-integrity and structural-quality gaps.

No ticket is opened for a step whose architectural dependencies are unmet. Local test-green changes that leave benchmark scores unchanged do not count as progress on the core problem.

---

## 8. Acceptance gate (binding)

A change counts as structural progress only when it demonstrates:

- ≥ 2 entities (registry-resolved + runtime-admitted),
- frozen analytical snapshot with atomic refresh,
- materially improved answer to a cross-domain benchmark question based on admitted, time-comparable relationships,
- transparent evidence attribution (documented / supported / inferred / unresolved) on every material claim,
- full expandability to source evidence,
- existing regression suites still green,
- no fabrication or misrepresentation of evidence,
- consistent view across Analysis, MAP and (once migrated) History.

---

## 9. Remaining risks and limitations (accepted)

- Formation replacement will reduce surface edge counts until additional types are admitted; quality is judged by benchmark scores, not edge volume.
- Durable store requires versioning and migration discipline.
- Conservative extraction leaves many candidates as leads; preferred to fabrication.
- Snapshot freeze of still-sparse analysis must not be mistaken for high quality.
- Rule-based extraction remains incomplete by design.
- Capital-event magnitude stays INDETERMINATE in v1.
- Cross-domain fracture remains a lead only.
- All work is currently on the development environment.
- Item 8.01 extension of the capital-event extractor is a bounded enhancement outside this architecture.

---

## 10. Decisions recorded by this document

- Overall architecture direction approved.
- Four corrections incorporated.
- Formation, temporal substrate, durability, consistency and success-measure rulings settled.
- CAPITAL_EVENT_INVOLVES proposed for ratification with confirmed criteria and reachable path.
- History relationship to store and snapshots decided; migration sequenced.
- Representative benchmark required and defined before implementation.
- Implementation sequence and acceptance gate binding.

**Architecture questions are closed.** Implementation proceeds in the order above. Further relationship types, benchmark expansion, or History migration details are handled as ordinary follow-on work inside the settled design.
