# SPEC — Findings: H1 (Authority Application) and H2 (Vocabulary Adequacy)

Date: 2026-08-20
Status: INQUIRY FINDINGS. No extension text drafted. No Gate-0 assignments. No WO-2049 work. No
producer work. No Formation-B changes.
Sources used, both read directly from the repository this session — not inferred, not summarized
from an external search that failed to retrieve them:
- `specs/SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133, full text)
- `src/engine/relationontology.js` (SRE Appendix A v1.2, `RelationType` enum, `InfluenceClass`,
  full text)

---

# INQ-H1 — Authority Application: FINDINGS

Every KRYL-1133 rule, catalogued and classified.

| KRYL-1133 item | Classification | Note |
|---|---|---|
| §1 `admissionState` vocabulary (PROPOSED/VALIDATED/REJECTED/CHALLENGED/SUPERSEDED) | **Applies directly** | Abstract lifecycle states, not RKM-typed |
| §1 `operationalStatus` (AWAITING_EVIDENCE/AWAITING_REVIEW/AWAITING_RULESET) | **Applies directly** | Same — generic workflow vocabulary |
| §1 "only VALIDATED may populate the **active genealogy**" | **Requires adaptation** | Names "genealogy" specifically; RelationCore has no equivalent "active store" concept beyond its `validity` interval — needs an explicit analogous statement written for RelationCore |
| §2.1 `RelationshipProposal.type` (enum: derivedFrom \| dependsOn \| causes \| causedBy \| enables) | **Requires adaptation** | Hardcoded to the 5-kind vocabulary; cannot admit a `CONSTRAINS` or `MEDIATES` proposal as written |
| §2.1 "no `confidence` field, no `tier` field" rationale | **Applies directly** | Reasoning is general (ambiguous score problem), not RKM-specific; extends cleanly — note RelationCore's own η/φ₀/σ are NOT confidence scores in this sense and this rule's rationale should govern whether they may ever be read as one |
| §2.2 `AdmissionDecision` shape | **Applies directly** | Fully generic — `relationshipId`, `decision`, `rationale[]`, `decidedBy`, `decidedAt`, `supersedes?`, `rulesetVersion` reference nothing RKM-specific |
| §2.3 Lifecycle Constraints | **Applies directly** | Generic state-machine rules |
| §2.4 Truth Event Ledger dependency | **Applies directly** | Generic requirement — any admission needs an append-only event history regardless of subject |
| §3 Rule-Evaluation Semantics (pure PASS/FAIL/ESCALATE, no numeric aggregation) | **Applies directly** | Explicitly general principle; already cites §21 Route-Don't-Aggregate as its own justification |
| §4 Gate-0 relationship-type policy table | **Requires adaptation** | Hardcoded to 5 kinds, `enabled: true/false` per kind; has zero entries for 9 of 14 RelationCore types |
| §4 "changes to this table require separate governance approval" | **Applies directly** | This meta-rule is exactly the mechanism this extension is exercising |
| I1 — no self-validation | **Applies directly** | Fully generic; this is the rule `makeRelationCore()` currently violates by omission (D1 finding), not by contradiction |
| I2 — "admission authority runs inside same trust perimeter that protects **RKM writes** generally" | **Requires adaptation** | Named RKM-specifically; needs RelationCore named alongside it |
| I3 — "mutations to **RKM `genealogy` fields**... solely from VALIDATED decisions" | **Requires adaptation** | The single most RKM-coupled invariant; this is the exact sentence that must gain a RelationCore counterpart |
| I4 — append-only history | **Applies directly** | Generic |
| I5 — admission authority stateless re: verdict persistence | **Applies directly** | Generic |
| I6 — relationship semantics are type-specific, no generic `validateRelationship(edge)` | **Applies directly, and is load-bearing here** | This rule already anticipates per-type rules — directly supports writing new per-RelationType rules for RelationCore rather than reusing RKM's genealogy-kind rules unchanged |
| §6 Roadmap A–F | **Applies directly, as a pattern** | The roadmap's narrative names "genealogy," but its structure (ratify → schemas → ledger → null endpoint → rules → reactivate consumers) is generic and mirrors cleanly for a RelationCore track |

## H1 tally

- **Applies directly, no change**: 11 items — every abstract governance principle (self-validation ban, append-only history, statelessness, type-specificity, pure-predicate evaluation, the ledger dependency, the AdmissionDecision shape, the meta-rule requiring governance approval for table changes).
- **Requires explicit adaptation**: 5 items — all concrete, RKM-named artifacts: the "active genealogy" sentence, the `RelationshipProposal.type` enum, the Gate-0 table, and invariants I2/I3's literal wording.
- **Not extendable without fundamental revision**: 0 items.

No item required abandoning a governing principle. Every required change is additive naming (add RelationCore alongside RKM genealogy) or table extension (new Gate-0 rows), never a rewrite of what admission means.

## H1 — OUTCOME

> **Extendable with explicit contract amendments.**

Required amendments, exhaustive:
1. `RelationshipProposal.type` must accept RelationCore's `relationType` values (pending H2).
2. I2 and I3 must be textually amended to name RelationCore/SRE alongside RKM genealogy.
3. §1's "active genealogy" population rule needs an explicit RelationCore-equivalent statement.
4. Gate-0 (§4) needs new rows for every RelationCore type not already covered.

This is the outcome R2 already anticipated — extension via amendment, not doctrinal revision, and
not a parallel authority.

---

# INQ-H2 — Vocabulary Adequacy: FINDINGS

All 14 `RelationType` values (`relationontology.js`), classified against the 5 RKM genealogy kinds
(`causedBy`, `causes`, `dependsOn`, `enables`, `derivedFrom`). No mapping forced.

| RelationType | Classification | Rationale |
|---|---|---|
| `CAUSES` | **Exact equivalent** | `causes` |
| `DEPENDS_ON` | **Exact equivalent** | `dependsOn` |
| `ENABLES` | **Exact equivalent** | `enables` |
| `COMPOSITION` | **Legitimate specialization** | KRYL-1133 describes `derivedFrom` as "usually lineage/transformation" — conceptually adjacent to part/whole composition, and `CompositionDirection` (PARENT_TO_CHILD/CHILD_TO_PARENT) gives it the directionality `derivedFrom` implies. Weakest of the four positive entries; recorded as specialization, not exact |
| `CONSTRAINS` | **No legitimate equivalent** | A limiting/bounding relation is not lineage, causation, dependency, or enablement. KRYL-1133's own Gate-0 draft table (§4) already lists `causes` as "materially heavier" than `derivedFrom" — it already cares about exactly this kind of distinction being preserved, not collapsed |
| `INHIBITS` | **No legitimate equivalent** | Carries negative/suppressive polarity. None of the 5 kinds encode polarity at all — collapsing into `causes` would fabricate an unsigned causal claim from a signed one, in direct tension with §20 Direction Honesty (KRYLO's own doctrine that polarity/direction must never be flattened) |
| `MEDIATES` | **No legitimate equivalent** | Indirection/pathway relation (X's effect on Z passes through Y). No RKM kind represents a three-party mediation structure |
| `COMPETES_WITH` | **No legitimate equivalent** | Peer/adversarial relation. All 5 RKM kinds are hierarchical/directional (X derives-from, depends-on, causes, enables Y); none is peer-symmetric |
| `SUBSTITUTES_FOR` | **No legitimate equivalent** | Interchangeability relation. No RKM kind represents "X can replace Y" |
| `COUPLED_WITH` | **No legitimate equivalent** | Symmetric co-variation (ontology's own `NON_DIRECTIONAL` class). No RKM kind is non-directional |
| `RESONATES_WITH` | **No legitimate equivalent** | Thematic/pattern alignment, `NON_DIRECTIONAL`. Same gap as `COUPLED_WITH` |
| `DIVERGES_FROM` | **No legitimate equivalent** | A difference/divergence relation — structurally the inverse of resonance. No RKM kind represents divergence |
| `PRECEDES` | **No legitimate equivalent** | Temporal-only ordering, asserting nothing causal. Collapsing into `causes` would fabricate a causal claim from a merely temporal one — precisely the error KRYL-1133's own evidence discipline (Policy §3, distinguishing evidence types) exists to prevent |
| `REVEALS` | **No legitimate equivalent** | Epistemic relation (X reveals information about Y) — about what is learned, not about structural or causal connection between the entities themselves. No RKM kind is evidentiary/epistemic in this sense |

## H2 tally

- **Exact equivalent**: 3 of 14 (CAUSES, DEPENDS_ON, ENABLES) — 21%
- **Legitimate specialization**: 1 of 14 (COMPOSITION) — 7%
- **No legitimate equivalent**: 10 of 14 — **71%**

The 10 unmapped types are not a scattered edge case — they span distinct structural categories the
5-kind vocabulary has no mechanism for at all: **polarity** (INHIBITS), **indirection** (MEDIATES),
**peer-symmetry** (COMPETES_WITH, COUPLED_WITH, RESONATES_WITH), **substitution**
(SUBSTITUTES_FOR), **divergence** (DIVERGES_FROM), **temporal-only ordering** (PRECEDES), and
**epistemic relation** (REVEALS).

Applying the pre-declared evaluation criterion exactly as specified — *"If collapsing a
RelationType into one of the five kinds erases semantic information that downstream consumers
need in order to function correctly, the hypothesis fails for that type"* — the criterion is met
for 10 of 14 types.

## H2 — OUTCOME

> **Inadequate.**

Not "partially adequate": the failure is not a small residual of edge cases against an otherwise-
sufficient baseline. It spans the majority of the vocabulary and covers structurally distinct
categories the five kinds were never built to express — the five kinds are a lineage/dependency
memory vocabulary (KRYL-1133's own stated purpose), and RelationCore is a general relational
calculus. The mismatch is architectural, not incidental.

---

# Consequence for the sequence

Per the Updated Sequence, H1 and H2 close together before Gate-0 assignment. Result:

- **H1: extendable with amendments.** No blocker here.
- **H2: inadequate.** This is the blocking result.

Per KRYL-1133's own text (§4): *"Changes to this table require separate governance approval — it
is not something a producer or the admission engine can alter unilaterally."* Since the vocabulary
itself is inadequate (not merely the table's current entries), closing this gap is not a Gate-0
disposition exercise — it requires either:

(a) **Vocabulary expansion** — amending KRYL-1133's governed vocabulary beyond the original 5
    kinds to cover some or all of the 10 unmapped types, itself a separate governance decision per
    KRYL-1133's own quoted rule above; or

(b) **Restricted scope** — RelationCore governance under this extension covers only the 4 mappable
    types (CAUSES, DEPENDS_ON, ENABLES, COMPOSITION); the other 10 receive Gate-0 dispositions of
    Reject, Defer, or Experimental (per the extension draft's disposition table) and remain
    permanently or temporarily outside admitted status.

No recommendation between (a) and (b) is made here — that is itself a Founder decision, and it is
a new one, not previously anticipated by the R2 ruling or the extension draft as written.

# Standing state

Phase 3: FAILED (separation), null VALID, untouched by this inquiry. Phase 4: not opened. Mesh
control: 33/33, untouched. Formation-B boundary: provisional, B3 ∧ B4 ∧ B5. "Admitted": RULED — R2.
**H1: extendable with amendments.** **H2: inadequate — 10 of 14 RelationTypes have no legitimate
equivalent in the governed vocabulary.** Gate-0 assignment: blocked pending a new Founder decision
between vocabulary expansion and restricted scope. KRYL-1133 extension: not ratified. WO-2049: not
opened. Producer: blocked.

---

# ADDENDUM A — DECISION-VOCAB-001: PATH A (EXPAND) (2026-08-20)

## Ruling

> **PATH A — EXPAND.** Governed KRYLO recognizes the full 14-type SRE/RelationCore relational
> vocabulary. The five RKM genealogy kinds remain the valid vocabulary for RKM genealogy. KRYL-1133
> becomes the common governance authority over both vocabularies — it does not force one ontology
> to become the semantic vocabulary of the other.

Path B (restrict Formation-B/RelationCore governance to the 4 mappable types; the other 10 receive
Reject/Defer/Experimental) was the alternative on record and is **not adopted**.

## Rationale (Founder, recorded in substance)

H2 did not discover that KRYLO needs ten new relational concepts — the 14 types already exist,
ratified, in SRE Appendix A v1.2. H2 discovered that KRYL-1133's governed vocabulary is narrower
than the relational ontology KRYLO has already declared. Restricting the governed substrate to the
4 mappable types would force governance to treat 10 already-defined relationship semantics as
ungovernable — including several (INHIBITS, MEDIATES, COMPETES_WITH, SUBSTITUTES_FOR, COUPLED_WITH,
RESONATES_WITH/DIVERGES_FROM, PRECEDES, REVEALS) that are plausibly central to what structural
intelligence needs to represent, not peripheral to it.

## Explicit constraint carried into the amendment

Path A does not make all 14 types automatically admissible. Vocabulary expansion establishes that
all 14 are legitimate governed relational concepts; Gate-0 subsequently determines which are
currently eligible for admission and under what policy. Ontology recognition ≠ admission
eligibility — preserved without exception.

## Deliverable

Full amendment text: `specs/SPEC-krylo1133-vocabulary-amendment.md`. Content complete;
**ratification pending** (inherits KRYL-1133's unratified Jira status — verified `Ready`,
Resolution `None`, this session).

## Updated sequence

```
H1 — CLOSED (extendable with amendments)
H2 — CLOSED (vocabulary inadequate)
DECISION-VOCAB-001 — CLOSED → Path A (expand)
Vocabulary amendment — content complete, ratification pending
        ↓
Gate-0 dispositions          ← next
        ↓
KRYL-1133 (+ amendment) ratification
        ↓
WO-2049 specification + ratification
        ↓
RelationCore producer
        ↓
Governed relational substrate
        ↓
Formation-B
```

## Standing state

Phase 3: FAILED (separation), null VALID, untouched. Phase 4: not opened. Mesh control: 33/33,
untouched. Formation-B boundary: provisional, B3 ∧ B4 ∧ B5. "Admitted": RULED — R2.
**DECISION-VOCAB-001: RULED — Path A.** Vocabulary amendment: content complete, unratified.
**Gate-0: next legitimate task, not yet opened.** WO-2049: not opened. Producer: blocked.
Formation-B: blocked. Structure Map: unchanged, synthetic, honestly labeled.
