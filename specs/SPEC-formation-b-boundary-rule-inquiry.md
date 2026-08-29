# SPEC — Formation-B Boundary Rule Inquiry (provisional)

Date: 2026-08-19
Status: INQUIRY — candidate rules only. No producer built. No ontology modified. No Phase 3 rerun.
No visualization chosen. No recommendation made. **Founder ruling required to close.**
Question, and the only question: **what rule should provisionally bound a set of admitted
Relationships into one Formation-B?**
Framing: whatever is ruled is **provisional** — declared before production, expected to face the
first real relational substrate, and revised on contact. Revision is the designed outcome, not a
failure.

---

## 1. What the ontology actually gives a boundary rule to work with

Every `RelationCore` carries exactly these fields (`relationontology.js`, frozen contract v1.2):

| Field | Type | Available to a boundary rule as |
|---|---|---|
| `sourceId` / `targetId` | string, **unconstrained** | connectivity, reachability |
| `relationType` | closed 14-type enum | semantic class of the relation |
| `eta` (η) | (0,1] — confidence the relation **exists** | strength-of-existence filter |
| `phi0` (φ₀) | [0,1] — strength of the relation's **effect** | strength-of-effect filter |
| `structuralSupport` (σ) | (0,1] | structural corroboration filter |
| `provenanceHash` (π) | required, non-null — *"no unsourced relation"* | shared-evidence lineage |
| `validity` | `[t0, t1]`, t1 may only decrease | temporal co-existence |

Also available: `InfluenceClass` — the ontology already partitions relation types into
`POSITIVE` (CAUSES, ENABLES, MEDIATES, REVEALS), `STRUCTURAL` (CONSTRAINS, DEPENDS_ON,
COMPETES_WITH), `NON_DIRECTIONAL` (RESONATES_WITH, COUPLED_WITH).

Candidates B3–B5 below are built from these fields. Candidates B1–B2 are imposed from outside the
relation object. That difference is itself evidence and is noted per candidate.

---

## 2. Candidate boundary rules

### B1 — Scope declaration (investigator-bounded)

**A Formation-B is:** whatever set of relations falls inside a declared `ScopeDescriptor` (domain,
node set, time window, or query provenance).

**Ontology/doctrine support:** the only candidate any KRYLO document actually specifies — v0.2's
`StructureCandidate.scope: ScopeDescriptor`. Scope is recorded as provenance, so the boundary is
auditable.

**Excludes:** any relation outside the declared scope, regardless of how strongly it relates.

**Objection:** makes the object investigator-dependent. Two analysts get two Formations from
identical substrate. Risks the "structure is whatever you framed it as" failure mode the
anti-fabrication doctrine exists to prevent.

**Grounded in RelationCore fields:** No — imposed externally.

### B2 — Connectivity closure (reachability-bounded)

**A Formation-B is:** a maximal set of relations connected through shared `sourceId`/`targetId`
(weakly connected component, or directed reachable closure from a seed).

**Ontology/doctrine support:** `sourceId`/`targetId` are real fields; reachability is well-defined.
`causalimpactmap.js` already does directed reachable closure ("blast radius") on live data.

**Excludes:** anything not reachable — including relations that are structurally about the same
thing but not yet evidentially connected.

**Objection:** connectivity is a graph-theoretic artifact, not a KRYLO semantic. One weak edge
merges two Formations; one missing edge splits one. Phase 3's C.3 showed the practical hazard.

**Grounded in RelationCore fields:** Partly — uses ids, but connectivity itself is imposed.

### B3 — Validity-interval co-existence (temporally bounded)

**A Formation-B is:** a maximal set of relations whose `validity` intervals mutually overlap — the
relations were all simultaneously in force.

**Ontology/doctrine support:** `validity: [t0, t1]` is a mandatory RelationCore field with a
strong invariant (t1 may only decrease, never expand). The SRE layer chain includes
`RelationEvents` — the ontology already treats relations as things that begin and end.

**Excludes:** relations that never co-existed, however similar. A Formation cannot span two eras.

**Objection:** temporal overlap is necessary but plausibly not sufficient — everything in force at
the same moment overlaps, which on a dense substrate would bound almost nothing.

**Grounded in RelationCore fields:** **Yes** — `validity`.

### B4 — Provenance lineage (evidence-bounded)

**A Formation-B is:** a set of relations whose `provenanceHash` values derive from an overlapping
evidence bundle — relations that were seen *through the same evidence*.

**Ontology/doctrine support:** `provenanceHash` is mandatory and defined as
`BLAKE3(evidence bundle ⊕ observation ids ⊕ path)`. The ontology's stated boundary law —
*"relations are derived semantic objects anchored to immutable observations"* — makes evidence the
anchor. §19's evidence discipline and §22's absence rules both operate at evidence level.

**Excludes:** relations about the same entities derived from disjoint evidence. Two independent
observations of the same structure would form two Formations, not one.

**Objection:** binds the Formation to *how KRYLO looked*, not to *what is there*. Arguably inverts
the intent — the same real structure seen twice should plausibly be one Formation, not two. May
also require exposing evidence-bundle membership, which `provenanceHash` deliberately hashes away.

**Grounded in RelationCore fields:** **Yes** — `provenanceHash`.

### B5 — Influence-class coherence (semantically bounded)

**A Formation-B is:** a maximal set of relations drawn from one `InfluenceClass` —
e.g. all-`STRUCTURAL` (CONSTRAINS / DEPENDS_ON / COMPETES_WITH), or all-`POSITIVE`.

> **Corrected 2026-08-19, post-ruling.** This candidate originally read *"a maximal **connected**
> set of relations…"*. That word made connectivity a membership condition inside B5, which would
> have silently reintroduced B2 into the ruled conjunction B3 ∧ B4 ∧ B5 despite Addendum A
> excluding it. The word is struck. B5 bounds by InfluenceClass alone; connectivity plays no part
> in membership under any adopted candidate.

**Ontology/doctrine support:** `InfluenceClass` is an existing, ratified partition in
`relationontology.js` §XIII.4, introduced precisely to replace raw causal-distance decay. It is the
ontology's own statement that these relation types behave differently.

**Excludes:** mixed-class configurations. A structure held together by both constraint and
causation would split into two Formations.

**Objection:** the most interesting real structures are plausibly mixed-class — a dependency held
in place by a constraint. This rule may bound out exactly the configurations worth detecting.

**Grounded in RelationCore fields:** **Yes** — `relationType` via `InfluenceClass`.

### B6 — Strength closure (η/φ₀/σ-threshold bounded)

**A Formation-B is:** the transitive closure of relations exceeding a threshold on η, φ₀, and/or σ.

**Ontology/doctrine support:** all three are mandatory bounded fields.

**Excludes:** weak relations, by construction.

**Objection — doctrinal, and serious:** this makes the boundary a function of confidence scores.
§21 (route-don't-aggregate) and KRYL-1133 §3 both prohibit exactly this shape — KRYL-1133 states
relationships are *"admitted through constraints, not confidence accumulation,"* and explicitly
rejects `0.8 + 0.9 + 0.7 - 0.3 = 2.1 → "truth"`. A threshold-closure boundary reintroduces that
pattern at the boundary layer instead of the admission layer.

**Grounded in RelationCore fields:** Yes — but likely doctrinally barred. Recorded for completeness
and to make the prohibition explicit rather than tacit.

---

## 3. Combination is possible and is itself a ruling

The candidates are not mutually exclusive. B3 ∧ B2 ("co-existing *and* connected") or B3 ∧ B5
("co-existing *and* semantically coherent") are coherent rules. Any conjunction is a distinct
ruling and needs to be stated as one — not assembled implicitly during implementation.

Doctrinal constraint on any combination: it must remain a **constraint conjunction**
(pass/fail per condition), never a weighted blend. That is the same rule KRYL-1133 §3 and §21
already impose one layer down.

---

## 4. Dependencies that a ruling does not by itself resolve

**D1 — the meaning of "admitted" (unresolved, blocking in practice).** Two definitions exist and
have never been reconciled:
- SRE: schema validity via `makeRelationCore()` — type in enum, bounds respected,
  `provenanceHash` present.
- KRYL-1133: governance admission via an independent `VALIDATED AdmissionDecision`.

A boundary rule operates on "admitted Relationships." Which bar applies changes what is in the set
before any boundary is drawn. **This must be ruled separately** and should not be folded into the
boundary ruling.

**D2 — recursion interaction.** v0.2 §6 allows a Formation-B to participate in further relations.
Whichever rule is chosen must remain well-defined when a participant is itself a Formation-B. B4
(provenance) and B3 (validity) both require deciding what a Formation-B's own provenance and
validity interval are — neither is currently defined.

**D3 — no runtime producer.** Per the Phase 2 inventory, nothing currently emits `RelationCore`.
The rule cannot be exercised against real data until a producer exists. This is why the ruling is
provisional.

---

## 5. What would falsify or force revision of a provisional rule

Declared in advance, so revision is evidence-driven rather than preference-driven:

| Observation on the first real substrate | Forces revision because |
|---|---|
| The rule bounds everything into **one** Formation | It is not discriminating; boundary is doing no work |
| The rule bounds every relation into its **own** Formation | It is over-partitioning; no structure can span relations |
| Two Formations are produced that domain experts consider one thing (or vice versa) | The rule's semantics diverge from the reality it claims to bound |
| The rule's output changes materially on re-run with identical input | Non-determinism — violates the identity discipline FORMATION-ID-001 established |
| Adding one weak relation merges or splits Formations | Boundary is unstable to marginal evidence (specific hazard for B2) |
| The rule cannot be evaluated because a required field is absent in practice | Field availability assumption was wrong (specific hazard for B3/B4) |

A rule surviving first contact is not confirmed — only not-yet-falsified.

---

## 6. Ruling required

One statement closes this inquiry:

> **A Formation-B is bounded by ______ (one of B1–B6, or a stated conjunction), provisionally,
> pending first contact with a real relational substrate.**

And separately, per D1:

> **"Admitted," for boundary purposes, means ______ (SRE schema validity / KRYL-1133 governance
> admission / both).**

No candidate is recommended here. B6 is flagged as likely doctrinally barred; B3, B4, and B5 are
the candidates grounded in mandatory RelationCore fields; B1 is the only one with existing (though
unratified) contract support; B2 is the one Phase 3 implicitly assumed without justification.

---

## 7. Sequence this unblocks

```
Provisional boundary rule  ← this ruling
        ↓
Relational producer specification
        ↓
First real relational substrate
        ↓
Test / revise boundary rule (per §5)
        ↓
Formation recognition
```

## 8. Standing state, unchanged

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Signal genealogy: DEFER. Subcategory tier: not justified. Ontology: no expansion required
(unit-of-analysis inquiry, Addendum A). RelationCore production: absent at runtime. Formation-B
boundary: **this inquiry, awaiting ruling.**

---

# ADDENDUM A — PROVISIONAL FOUNDER RULING (2026-08-19)

## A.1 — The ruling

> **Provisionally define Formation-B as a semantically bounded set of admitted Relationships
> satisfying validity co-existence, provenance coherence, and InfluenceClass coherence.
> Connectivity is descriptive, not constitutive.**

Boundary constraints, as a conjunction (constraints, never a weighted score — §3 of this document):

```
Formation-B membership  =  B3 ∧ B4 ∧ B5

  B3  validity co-existence      — members' `validity` intervals mutually overlap
  B4  provenance coherence       — members' `provenanceHash` lineage overlaps
  B5  InfluenceClass coherence   — members share one InfluenceClass
```

**B2 (connectivity) is excluded as a boundary requirement.** B6 (strength closure) is not adopted.
B1 (scope declaration) is not adopted as the boundary rule.

## A.2 — Rationale (Founder, recorded verbatim in substance)

Requiring connectivity would make Formation membership depend on an observed graph shape, encoding
*"things must already be structurally connected to constitute a structure"* — backwards for the
hypothesis under test.

If two relational observations are temporally coherent, evidentially coherent, and semantically
within the same influence class, they may constitute a Formation **before a direct graph connection
between them is observable**.

Therefore: **a Formation-B may contain structurally disconnected Relationships.** This is a
deliberate semantic claim, not a defect. The Structure Map must represent that honestly and must
not manufacture a connecting edge to make a Formation look connected.

## A.3 — B2's reassigned status

Connectivity is **not** a membership condition. It becomes a **derived, descriptive property** of a
Formation:

```
Membership        :  B3 ∧ B4 ∧ B5
Observed topology :  connected | partially connected | disconnected   (descriptive)
```

Connectivity is therefore information *about* a Formation, never a rule determining whether it
exists.

## A.4 — Required recursive derivations (not yet defined; blocking recursion only)

Before a Formation-B may itself participate as an endpoint in a higher-order Relationship
(v0.2 §6 recursion), two derivations must be defined:

- **Formation validity** — derived from member validity intervals.
- **Formation provenance** — deterministically derived from member provenance.

Neither is defined by this ruling. Both are required only at the recursion step; a first-order
Formation-B is fully specified without them.

## A.5 — What this ruling does NOT resolve

**D1 — the meaning of "admitted" remains open and is blocking in practice.** The ruling operates on
"admitted Relationships" without specifying whether that means SRE schema validity
(`makeRelationCore()`) or KRYL-1133 governance admission (`VALIDATED AdmissionDecision`). That
determines the input set before any boundary is drawn. It requires its own separate ruling, per §4
of this document, and must not be folded into this one.

Also unresolved: no runtime producer of `RelationCore` exists (Phase 2 inventory), so this rule
cannot yet be exercised against real data.

## A.6 — Provisional status (binding)

This is recorded as a **provisional** ruling, not settled ontology. Per §5 of this document, the
first real `RelationCore` substrate is expected to test it, and the declared falsification criteria
apply unchanged — including the two pathological outcomes (everything bounds into one Formation;
every relation bounds into its own). Revision on contact is the designed outcome, not a failure.

## A.7 — Sequence position

```
Provisional boundary rule            ← COMPLETE (this addendum)
        ↓
D1 ruling: meaning of "admitted"     ← OPEN, blocking
        ↓
Relational producer specification    ← not started
        ↓
First real relational substrate      ← does not exist
        ↓
Test / revise boundary rule (§5)
        ↓
Formation recognition
```

## A.8 — Standing state

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Signal genealogy: DEFER. Subcategory tier: not justified. Ontology: no expansion required.
RelationCore production: absent at runtime. Formation-B boundary: **provisionally ruled, B3 ∧ B4 ∧
B5, connectivity descriptive.** Meaning of "admitted": **open.**
