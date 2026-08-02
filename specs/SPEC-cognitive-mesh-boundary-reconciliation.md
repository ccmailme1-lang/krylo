# SPEC — Cognitive Mesh: Boundary Reconciliation (KRYL-CF-006A)
Jira: KRYL-1138 — Cognitive Mesh: Boundary Reconciliation (KRYL-CF-006A)
Date: 2026-08-02
Author: drafted by agent, at Founder's explicit request, per the mandate in
`SPEC-cognitive-mesh-primitive-doctrine.md` (KRYL-1136) §10: "No implementation RFC may
proceed until KRYL-CF-006A is ratified."

Status: BOUNDARY DECISION DRAFT. Not implementation. Every recommendation below is grounded
in a pattern that already exists and is already live in this codebase — none is picked
arbitrarily. Each is marked **RECOMMENDED**, pending Founder ratification — same dynamic as
the retention-policy decision in `SPEC-rkm-genealogy-admission-policy.md` (KRYL-1133 §2.4).
This document does not self-ratify; it proposes.

Depends on: KRYL-1136 (Cognitive Mesh Primitive Doctrine), KRYL-1137 (Relationship Topology
Model), KRYL-1133 (Genealogy Admission Policy), KRYL-1134 (TEL Reconciliation).

---

## GAP-002 — Connector Placement

**Question:** is the existing connector layer a Cognitive Primitive (CP) subtype, or an
upstream evidence producer?

**RECOMMENDED: Option B — connectors stay upstream, outside the CP boundary.**

```
Connector → Evidence → Cognitive Primitive → Relationship Proposal
```

**Grounding:** this was already the working hypothesis in KRYL-1136 §9, and it matches the
verified live architecture directly. `edgar8kconnector.js` (the only live RKM writer, checked
this session) already does exactly the connector job: ingestion, domain translation, external
discovery — and it hands off a finished object, not a proposal-generating process. It has no
local interpretation loop, no feature extraction beyond parsing, and no "propose a
relationship" step of its own. Making connectors a CP subtype would require retrofitting them
with A1-A4 (KRYL-1136 §1) axioms they were never built to satisfy, and would blur exactly the
boundary §9 already flagged as adjacent-not-identical. Keeping them upstream costs nothing —
existing connectors don't change — and avoids inventing a second connector model.

---

## GAP-004 — Governance Evolution

**Question:** is the Coherence Fabric a static constitution, or does governance itself evolve?

**RECOMMENDED: static constitution — rules are versioned and admission-tuned only, never
self-rewriting.**

**Grounding:** this is not a new pattern — it's the exact discipline already locked for
`calibrationengine.js` (WO-2062): *"Calibration modifies how the system behaves, not what the
system is."* That engine can adjust named floors/thresholds (`CALIBRATABLE_LEVERS`) but is
explicitly forbidden from touching CI-F/CI-R/RBCS logic or LFOS's physics model — parameters
move, structure doesn't. Applying the same split here: the Coherence Fabric's admission
*thresholds* (e.g., evidence requirements per relationship class) may be calibrated by
observed outcomes, exactly like WO-2062 already does elsewhere. The admission *rules
themselves* — what counts as a valid proposal, what the decision lattice is — stay static and
versioned (KRYL-1133's `rulesetVersion` field already exists for this exact purpose). A
self-rewriting rule engine would also directly violate KRYL-1136 A3 (No-Self-Truth) one level
up — governance reasoning about its own rules is the same collapse-of-roles problem the whole
Admission Policy chain was built to prevent.

---

## GAP-006 — Primitive Identity

**Question:** does a Cognitive Primitive have stable identity that mutates, a fork/retire
lineage model, or a versioned root+overlay model?

**RECOMMENDED: fork/retire with lineage — reuse `rkmstore.js`'s existing supersession model
exactly, don't invent a second one.**

**Grounding:** `rkmstore.js` (WO-2050, live, verified this session) already implements this
precise pattern for RKM objects: `supersedeObject(oldId, replacement)` — *"Successor inherits
identityId + genealogy"* — the old id is retained as history (`derivedFrom: [...,  oldId]`),
never mutated in place, never deleted. This is the identical shape GAP-006 is asking about: a
CP that changes meaningfully doesn't silently mutate — it's retired, a successor is created,
and the successor's lineage points back. Reusing this pattern means CP identity and RKM object
identity are the *same* mechanism, not two parallel ones — directly consistent with this whole
session's governing rule (don't create parallel infrastructure for something that already
exists). Option A (mutate in place) would break KRYL-1136 §5's identity/lineage requirement
outright — you can't have historical accountability if the old state is overwritten.

---

## GAP-007 — Relationship Scope

**Question:** can an admitted edge only connect CP↔CP, or also CP↔Evidence, CP↔Formation,
CP↔RKM Entity?

**RECOMMENDED: start narrow — CP↔CP only for v1. Everything else disabled pending
demonstrated need, same Gate-0 discipline already locked in KRYL-1133.**

**Grounding:** this is a direct re-application of the Genealogy Admission Policy's own Gate-0
table (KRYL-1133 §4), which already establishes exactly this posture for relationship types:
`derivedFrom`/`dependsOn` enabled, `causes`/`causedBy`/`enables` disabled — *"causal memory
must be earned, not defaulted."* Relationship *scope* is the same kind of decision as
relationship *type*, and deserves the same earned-expansion treatment: CP↔CP is the narrowest,
lowest-risk case (matches the Topology Model's own primary examples in KRYL-1137 §2-3).
CP↔Formation and CP↔RKM Entity are real, larger claims — a CP asserting a link directly into
durable RKM territory is a bigger trust jump than two CPs relating to each other, and doesn't
yet have a concrete driving use case. Widening scope later is a config change to the same
Gate-0-style policy table, not an architecture change — low cost to defer, real cost to open
prematurely (an ontology mistake here is much harder to walk back than a disabled flag).

---

## Reconciliation Outcome

With all four gaps resolved (pending ratification), the chain becomes:

```
KRYL-1136 Primitive Doctrine (CP definition, four-object chain, admission semantics)
        +
KRYL-CF-006A (this document): connectors stay upstream, governance stays static/versioned,
identity reuses RKM's supersession model, relationship scope starts CP↔CP-only
        ↓
KRYL-1137 Relationship Topology Model — now has enough resolved ontology to be an accepted
baseline, not just a speculative model
        ↓
Implementation RFC / Reference Runtime — no longer choosing architecture accidentally
```

**This document does not authorize implementation on its own.** Per KRYL-1136 §10, it needs
Founder ratification of the four recommendations above (accept, reject, or amend each
independently) before the mandate is satisfied and an Implementation RFC can begin.
