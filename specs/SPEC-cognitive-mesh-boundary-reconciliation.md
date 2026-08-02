# SPEC — Cognitive Mesh: Boundary Reconciliation (KRYL-CF-006A)
Jira: KRYL-1138 — Cognitive Mesh: Boundary Reconciliation (KRYL-CF-006A)
Date: 2026-08-02
Author: drafted by agent, at Founder's explicit request, per the mandate in
`SPEC-cognitive-mesh-primitive-doctrine.md` (KRYL-1136) §10: "No implementation RFC may
proceed until KRYL-CF-006A is ratified."

Status: **RATIFIED 2026-08-02.** Two of four recommendations amended by the Founder, not
accepted verbatim — see each section for the exact final disposition. The mandate in KRYL-1136
§10 is now satisfied. An Implementation RFC for the Cognitive Mesh Reference Runtime is
unblocked.

Depends on: KRYL-1136 (Cognitive Mesh Primitive Doctrine), KRYL-1137 (Relationship Topology
Model), KRYL-1133 (Genealogy Admission Policy), KRYL-1134 (TEL Reconciliation).

---

## GAP-002 — Connector Placement

**Question:** is the existing connector layer a Cognitive Primitive (CP) subtype, or an
upstream evidence producer?

**RATIFIED: Option B — connector is an upstream adaptor producing Evidence.**

```
Connector Layer → Evidence → Cognitive Primitive → Relationship Proposal
```

A connector answers *"what information entered KRYLO?"* A Cognitive Primitive answers *"what
structure can be extracted from available evidence?"* — kept separate.

**Grounding:** matches the verified live architecture directly — `edgar8kconnector.js` (the
only live RKM writer, checked this session) already does exactly the connector job: ingestion,
domain translation, external discovery, with no local interpretation loop and no
relationship-proposal step of its own. Making connectors a CP subtype would retrofit them with
A1–A4 (KRYL-1136 §1) axioms they were never built to satisfy. Existing connectors don't change.

---

## GAP-004 — Governance Evolution

**Question:** is the Coherence Fabric a static constitution, or does governance itself evolve?

**RATIFIED (amended): Hybrid — core admission invariants are constitutional and immutable;
governance *policies* may evolve through governed change.**

```
Constitution (immutable)
      ↓
Policy Evolution (governed)
      ↓
Admission Decisions
```

The Fabric cannot rewrite its own foundations without governance, but thresholds, models, and
policies can improve over time.

**Grounding:** this is a refinement of, not a departure from, the original recommendation —
`calibrationengine.js` (WO-2062) already *is* a live "governed policy evolution" mechanism:
*"Calibration modifies how the system behaves, not what the system is."* It adjusts named
floors/thresholds (`CALIBRATABLE_LEVERS`) under explicit governance, while CI-F/CI-R/RBCS logic
and LFOS's physics model stay immutable. The ratified Hybrid model applies this exact same
split to the Coherence Fabric: the admission *decision lattice* (KRYL-1136 §2's five-state `D`)
and the four-object chain (§6) are the constitutional core, never self-rewriting — consistent
with A3 (No-Self-Truth), since governance reasoning about its own rules would be the same
collapse-of-roles problem one level up. Admission *thresholds/policies* (evidence requirements
per relationship class, Gate-0-style tables) are the governed-evolution surface, versioned via
the same `rulesetVersion` mechanism KRYL-1133 already established.

---

## GAP-006 — Primitive Identity

**Question:** does a Cognitive Primitive have stable identity that mutates, a fork/retire
lineage model, or a versioned root+overlay model?

**RATIFIED: Fork & retire with lineage.** Identity is not mutable in place.

```
Primitive A
    ├── Primitive B
    └── Primitive C
```

**Grounding:** `rkmstore.js` (WO-2050, live, verified this session) already implements this
precise pattern for RKM objects — `supersedeObject(oldId, replacement)`: *"Successor inherits
identityId + genealogy,"* old id retained as history (`derivedFrom: [..., oldId]`), never
mutated, never deleted. A CP that changes meaningfully doesn't silently mutate — it's retired,
a successor is created, and the successor's lineage points back. This makes CP identity and
RKM object identity the *same* mechanism, not two parallel ones. The Mesh is explicitly a
learning topology — if primitives mutated in place, historical reconstruction of *why* the
mesh looks the way it does at any past time would become ambiguous. Capability evolution is
represented as lineage, not as an invisible in-place change.

---

## GAP-007 — Relationship Scope

**Question:** can an admitted edge only connect CP↔CP, or also CP↔Evidence, CP↔Formation,
CP↔RKM Entity?

**RATIFIED (amended): staged expansion, wider Phase 1 than originally proposed.**

```
Phase 1:  CP ↔ CP,  CP ↔ Evidence
Phase 2:  CP ↔ Formation
Phase 3:  CP ↔ RKM Entity
```

**Reasoning (Founder):** the closer a relationship gets to durable-reality representation, the
stronger admission requirements become — so scope expands in step with how much trust each tier
requires, rather than gating everything behind a single CP↔CP-only floor.

**Grounding, reconciled with the original recommendation:** this keeps the same earned-
expansion discipline as KRYL-1133's Gate-0 table (`derivedFrom`/`dependsOn` enabled,
`causes`/`causedBy`/`enables` disabled — *"causal memory must be earned, not defaulted"*) — it
just draws the Phase 1 line one tier wider. CP↔Evidence is a lower-risk inclusion than it might
first appear: a CP asserting a link to the evidence it was itself derived from is close to a
provenance record, not a new causal or structural claim about reality. CP↔Formation and
CP↔RKM Entity remain gated to later phases — those are the tiers that make a real, durable-
reality claim, and still require demonstrated need before admission requirements are relaxed
enough to allow them. Widening a phase later is a config change to the same Gate-0-style policy
table, not an architecture change.

---

## Ratification Summary

| GAP | Decision | Amended from proposal? |
|---|---|---|
| GAP-002 Connector Placement | Option B — connector produces Evidence, stays outside CP boundary | No — accepted as proposed |
| GAP-004 Governance Evolution | Hybrid — immutable constitutional core + governed policy evolution | Yes — widened from "static only" to explicit governed evolution of policies/thresholds |
| GAP-006 Primitive Identity | Fork & retire with lineage, reusing `rkmstore.js`'s supersession model | No — accepted as proposed |
| GAP-007 Relationship Scope | Staged: Phase 1 = CP↔CP + CP↔Evidence, Phase 2 = CP↔Formation, Phase 3 = CP↔RKM Entity | Yes — Phase 1 widened to include CP↔Evidence |

---

## Reconciliation Outcome

```
KRYL-1136 Primitive Doctrine (CP definition, four-object chain, admission semantics)
        +
KRYL-1138 (this document, RATIFIED): connectors stay upstream, governance is hybrid
(immutable core + governed policy evolution), identity is fork/retire via RKM's existing
supersession model, relationship scope expands in three staged phases starting at CP↔CP+Evidence
        ↓
KRYL-1137 Relationship Topology Model — now an accepted baseline, not a speculative model
        ↓
Implementation RFC: Cognitive Mesh Reference Runtime — UNBLOCKED
```

The runtime can now implement against fixed, ratified assumptions instead of becoming the
place where architecture decisions accidentally happen. The next artifact is the first
build-oriented specification: **Implementation RFC — Cognitive Mesh Reference Runtime**
(in-memory state, synthetic evidence, single-process execution — proving the cognitive
mechanics before any real infrastructure).
