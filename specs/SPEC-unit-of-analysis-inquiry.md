# SPEC — Unit-of-Analysis Inquiry: what is a Formation a formation *of*?

Date: 2026-08-19
Status: METHODOLOGICAL INQUIRY — reasoning from existing ontology and doctrine. No code written.
No Phase 3 rerun. No component cherry-picking. No metric change. No ontology change. No empirical
determination claimed.
Input: existing ontology (`src/engine/ontology.js`), the ratified Formation Inference spec, the
proposed v0.2 Structure Recognition contract, and Phase 3's observations.
Output: candidate analytical units, their theoretical justifications, and explicit unresolved
dependencies.

---

## 1. The finding that reorders this inquiry

**KRYLO's ontology already answers Question 2 — but only for one of two distinct Formation
concepts, and the Phase 3 substrate does not satisfy it.**

`specs/formation-inference-layer-spec.md` states it directly:

> §3, Decision #1 (LOCKED): *"a formation's participating domains are a SUBSET of the six…
> A formation is a **combination over** the six. The ontology does not move."*

> §6: *"**Vertices** = participating canonical domains (particles attach to their domain vertex)."*

For that engine, the answer is settled and Founder-ratified (2026-07-25): **a Formation is a
formation of canonical domains.** Vertices are domains. There are at most 6. The unit of analysis
is the domain set.

This was not a gap. It was answered, in a locked spec, before this session began.

## 2. But there are two different Formation concepts, and they were never unified

| | **Formation-A (ratified)** | **Formation-B (proposed)** |
|---|---|---|
| Source | `formation-inference-layer-spec.md`, KRYL-1117 | v0.2 Structure Recognition contract (unratified) |
| Implemented in | `src/engine/formationinference.js` (live) | `src/engine/structuralrecognition.js` (experimental) |
| A Formation is a formation *of* | **Canonical domains** (⊆ the six) | **Structures**, which are organized sets of admitted Relationships |
| Vertices | Domains (max 6) | Whatever the Relationships connect (entities, evidence, …) |
| Edge meaning | Co-presence of domain activity in a window | Admitted, evidence-grounded relationship |
| Unit of analysis | The domain set — settled | **Unsettled — this inquiry** |

The v0.2 contract itself insists on the separation: *"The live Formation engine… operates on a
different substrate. It must not be repurposed as the Structure Map's recognition engine. The two
remain independent."*

So the question "what is a Formation a formation of?" has **one ratified answer (Formation-A) and
one open question (Formation-B)**. They are not the same question and the ratified answer does not
transfer — it is precedent, not authority, for Formation-B.

## 3. Consequence for the Phase 3 result

Phase 3 ran a hierarchy battery over `TYPED_EDGES`, whose nodes are (measured): **7 companies**
(6 CIK-keyed, 1 name-keyed) and **21 capability/transaction-type concepts**.

Under Formation-A's ratified ontology, none of those 28 nodes is a valid Formation vertex — a
Formation-A vertex is a canonical domain, and `TYPED_EDGES` contains no domain nodes at all.

This does not invalidate Phase 3, which never claimed to test Formation-A. It does establish
something previously unstated: **the Phase 3 substrate is not the substrate the ratified Formation
ontology describes.** Phase 3 was testing structural organization in a relationship graph
(Formation-B territory), where the unit of analysis is precisely what has never been settled.

## 4. Candidate analytical units for Formation-B

Reasoned from doctrine, not measured. None is recommended here.

### Unit 1 — Whole relational substrate
- *Justification available*: matches how Phase 3 was actually run; simplest definition; no
  additional selection step to justify.
- *Objection from doctrine*: nothing in KRYLO's ontology asserts that a collection of relationships
  gathered by a query or a connector constitutes one object. Phase 3's C.3 finding shows the
  practical consequence — two components structurally incapable of expressing hierarchy still
  contributed 29% of nodes to a whole-graph statistic.
- *Status*: **used by default in Phase 3, never justified.**

### Unit 2 — Connected component
- *Justification available*: components are the natural boundary of relational reachability; no
  relationship crosses them, so no structural claim spans them either.
- *Objection from doctrine*: a component is a **graph-theoretic artifact**, not a KRYLO-recognized
  object. Nothing in the ontology says connectivity confers objecthood. Two things can be
  unconnected in the current evidence and still be the same structure; two things can be connected
  by one weak edge and not be.
- *Status*: **plausible, unjustified.** Attractive after Phase 3, which is itself a reason for
  caution.

### Unit 3 — Scope-declared subgraph (query, domain, time window, or explicit node set)
- *Justification available*: the v0.2 contract already specifies this — `StructureCandidate.scope:
  ScopeDescriptor // domain, node set, time window, query provenance`. The unit is whatever the
  investigator declared, and the declaration is recorded as provenance.
- *Objection from doctrine*: makes the analytical object investigator-dependent. Two analysts asking
  different questions of the same substrate get different Structures — which may be correct, or may
  be exactly the "structure is whatever you framed" failure mode the anti-fabrication doctrine
  exists to prevent.
- *Status*: **has explicit contract support**, and is the only candidate that any KRYLO document
  actually specifies. Unratified.

### Unit 4 — Canonical domain projection (Formation-A's answer, extended)
- *Justification available*: consistency with the one ratified answer KRYLO has. Every relationship
  would be projected onto the domains of its endpoints, and recognition would run over domains.
- *Objection from doctrine*: collapses relationship-level structure into 6 buckets before
  recognition — a §21 route-don't-aggregate violation, and it would make Formation-B redundant with
  Formation-A rather than a distinct layer.
- *Status*: **inconsistent with Formation-B's stated purpose.** Recorded for completeness.

## 5. What this inquiry can and cannot settle

**Settled by existing doctrine:** Formation-A's unit (canonical domains, ⊆ six). Locked, ratified,
implemented, not in question.

**Not settled by existing doctrine:** Formation-B's unit. Four candidates exist; one (Unit 3) has
contract support in an unratified document; none has been ratified; the substrate cannot
adjudicate between them because a component boundary is a property of the graph, not evidence
about what KRYLO should treat as an object.

**Therefore the honest output is the outcome anticipated before this inquiry opened:**

> **No analytical unit for Formation-B can be justified from KRYLO's current ontology without a
> ruling on what Formation-B is a formation *of*. That is a Founder decision boundary, structurally
> analogous to KRYL-1133's unratified ratification gate.**

## 6. The decision that would unblock this

One ruling, in this form:

> *A Formation-B is a formation of ______, and its analytical unit is ______.*

Candidates for the first blank that appear in existing material: admitted Relationships (v0.2
contract), Structures composed of admitted Relationships (v0.2 §6 recursion), or canonical domains
(Formation-A precedent). Candidates for the second blank are Units 1–4 above.

Until that ruling exists, any Formation-B test — including a redesigned successor to Phase 3 — is
testing a property of an object that has not been defined. That is the condition Phase 3 was
already in, discovered after the fact.

## 7. Explicit non-conclusions

- Not concluded that Formation-B is local/component-level. Unit 2 remains one unjustified candidate
  among four, and its post-Phase-3 attractiveness is a bias to guard against, not evidence.
- Not concluded that Phase 3 was invalid. It ran honestly against a declared substrate; what is now
  visible is that its analytical unit was assumed rather than justified.
- Not concluded that Formation-A's answer should extend to Formation-B (Unit 4's objection stands).
- No recommendation among Units 1–4 is made or implied.
- No change to any spec, engine, threshold, or the standing Phase 3 state.

## 8. Standing state after this inquiry

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Signal genealogy: DEFER. Subcategory tier: not justified. Formation-B unit of analysis: **blocked
on a Founder ruling**, per §5.

---

# ADDENDUM A — Can Formation-B be expressed without an ontology change? (2026-08-19)

Inquiry: whether Formation-B can be defined as a derived configuration of existing ontological
objects and Relationships, keeping the ontology lean, rather than adding a `Formation` primitive
or a `Subcategory` tier. Reasoned from `src/engine/ontology.js`, `src/engine/relationontology.js`
(Appendix A — Formal Structural Relation Calculus v1.2, frozen contract),
`src/engine/relationtopology.js`, and the ratified Formation-A spec. No code written, no ontology
changed, no primitive proposed.

## A.1 — The five questions, answered from what exists

### Q1 — What can participate in a Relationship under the current ontology?

**Anything with a string id.** `makeRelationCore()` validates `sourceId`/`targetId` only for
presence (`if (!id || !sourceId || !targetId) throw`). There is **no type constraint, no node
registry, no closed world of participants**. The ontology constrains the *relation* (14-type closed
enum, η/φ₀/σ in bounded ranges, `provenanceHash` mandatory) but never the *participants*.

Consequence: a Formation-B could appear as `sourceId` or `targetId` in a later Relationship
**without any ontology change**. The v0.2 §6 recursion requirement is already expressible.

### Q2 — What does "admitted Relationship" formally mean?

**Two different, unreconciled definitions exist.**

| | SRE (`relationontology.js`) | KRYL-1133 |
|---|---|---|
| Admission means | Passing `makeRelationCore()` schema validation | A `VALIDATED` `AdmissionDecision` from an authority independent of the producer |
| Enforces | Type ∈ enum; η,σ ∈ (0,1]; φ₀ ∈ [0,1]; `provenanceHash` required ("no unsourced relation") | Rule battery (PASS/FAIL/ESCALATE), no self-validation, type-specific gates, append-only decision history |
| Status | Implemented, frozen contract | Unratified (Jira: `Ready`, unresolved) |

These are not the same bar. SRE admission is **structural validity**; KRYL-1133 admission is
**governance**. A RelationCore can be schema-valid and never governance-admitted. Any Formation-B
definition must state which it requires — this is an unresolved dependency, not a gap I can close.

### Q3 — Can Formation-B be defined entirely as a configuration over existing Relationships?

**Materially yes, with one specific gap.** The SRE ontology's own declared layer chain is:

> `Observation → RelationCore → RelationDynamics → RelationEvents → Topology`

Topology is **already the top layer** — Formation-B is not proposing a level the ontology lacks.
But `relationtopology.js` implements that layer as **metrics over relations** (constraint
centrality, Jaccard distance, topology drift), never as a **bounded, identified object**.

So the gap is narrow and specific: **the ontology has no notion of "this particular subset of
relations constitutes one thing."** It can measure a relation set; it cannot delimit one and name
it. That is not a missing primitive — it is a missing **boundary/selection** semantic. And it is
the unit-of-analysis question from §4 of this document, now located precisely inside the ontology
rather than inferred from a failed test.

### Q4 — Must Formation-B be an ontological entity, or can it stay derived?

**Derived is sufficient**, on current evidence, provided identity is deterministic.

The only requirement that would force primitive status is recursion — a Formation-B must be
referenceable as a participant in further Relationships (v0.2 §6). Per Q1, participants are
unconstrained strings, so a derived object with a stable id satisfies this with no ontology change.

Precedent exists for exactly this: FORMATION-ID-001 (Formation-A) derives identity deterministically
from topology alone — *"same topology ⇒ same id, every run, every path"* — with no primitive
required. `structuralrecognition.js` already implements the same pattern experimentally.

### Q5 — Does Formation-A remain untouched?

**Yes.** Different engine (`formationinference.js`), different substrate (signal particles →
domains), explicitly declared independent by the v0.2 contract. Nothing in a derived Formation-B
requires reading, altering, or extending Formation-A.

## A.2 — Net finding

**A `Formation` primitive and a `Subcategory` tier both appear unnecessary.** The ontology already
supplies: unconstrained relation participants (Q1), a declared Topology layer above relations (Q3),
mandatory relation provenance (Q2, SRE), and a working deterministic-identity pattern (Q4). Adding
primitives would expand the ontology to obtain properties it already has.

What is genuinely missing is narrower than a primitive:

> **A boundary semantic — the rule by which some subset of relations is delimited and treated as one
> object.**

That is the same open question as §5 of this document, and it remains a Founder ruling: not "what
new primitive do we add," but **"by what rule is a set of relations bounded into one object?"** The
four candidate units in §4 are four candidate answers to exactly that.

Secondary unresolved dependency surfaced here: **which admission standard Formation-B requires**
(SRE schema-validity vs. KRYL-1133 governance-admission). Recorded, not resolved.

## A.3 — Explicit non-conclusions

- Not concluded that Formation-B *should* be derived rather than primitive — only that the ontology
  does not currently force primitive status.
- Not concluded which boundary rule is correct (§4's Units 1–4 remain unranked and unjustified).
- Not concluded which admission standard applies.
- No ontology, spec, engine, or standing state changed by this addendum.
