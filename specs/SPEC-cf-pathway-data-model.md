# SPEC — CF Pathway Data Model  ·  IS-1 Minimum Executable Identity Contract

**Status:** CANDIDATE — subordinate to `KRYL-CF-001`; pending Founder ratification + final
KRYL-CF numbering (see `SPEC-cf-artifact-taxonomy.md`).
**Date:** 2026-09-02
**Executes:** the IS-1 slot of `SPEC — Cognitive Fabric & Formation Frontier.md` §36, under the
rulings in `SPEC-cf-002-is-reconciliation.md` §0a (X3 identity, X4 lifecycle, X2/X5 firewall).
**Derived from, not invented:** CF-003 §10–12/§18/§21/§25–26, CF-005 §8–9, CF-006 §5 (FC-REQ-05),
the Phase-3 / unit-of-analysis failure.

## 0. Objective and scope boundary

The objective is **not** a production pathway ontology. It is the **minimum identity function
that makes the kill experiment meaningful** — enough to distinguish, deterministically and
without inference leakage:

```
same structural lineage        → extend
plausible branch of a lineage  → branch (identity not collapsed)
no qualifying lineage          → new Pathway
related but independently originated → new Pathway
```

**IS-1 deliberately does NOT define:** a similarity threshold, a decay/aggregation function, a
storage key, a database schema, a production clustering algorithm, or the νₜ rule. Those are
`SPEC-cf-significance-policy.md` and IS-4 implementation concerns.

## 1. Objects

### 1.1 Typed event `e`

The atomic unit that moves through the Fabric. Immutable after creation (CF-003 §21).

```
Event {
  event_id            unique, stable
  event_type          ∈ closed vocab (CF-003 §11):
                        SIGNAL_RECEIVED · OBSERVATION_CREATED · RELATIONSHIP_ADMITTED ·
                        PROCESSING_STARTED · PROCESSING_COMPLETED · ROUTING_DECISION ·
                        REMOTE_EXPANSION · CORE_PROCESSING · CONVERGENCE ·
                        FORMATION_CANDIDATE_CREATED · FORMATION_ADMITTED ·
                        EXPLORATION_TERMINATED · EXPLORATION_ESCALATED · REVISIT
  logical_time        monotone sequence marker (not wall-clock)
  object_refs[]       ids of the objects this event concerns / produces
                        (observation_ids, relationship_ids, subject_reference, …)
  edges[]             typed directed edges this event asserts, each { to, type }
                        where type ∈ { OBSERVES · EMITS · ROUTES_TO · PROCESSES ·
                        DERIVES · EXPANDS · CONTRIBUTES_TO }  (Founder 2026-09-02).
                        These describe the RUNTIME/analytical genealogy — never the
                        processor topology (P-A, SPEC-cf-artifact-taxonomy.md).
  provenance {
    derives_from[]    event_ids and/or object_ids this event is a structural
                       consequence of — supplied by the producer, never inferred
    source            the producing processor / connector (metadata only, see §4)
  }
}
```

### 1.2 Pathway `p`

```
Pathway {
  pathway_id          unique, stable
  parent_pathway_id   nullable (set on branch)
  lineage[]           ordered-by-logical_time list of Event references
  origin_event_id     lineage[0]
  lifecycle_state     ACTIVE | ARCHIVED | TOMBSTONED   (IS-4 / X4)
  convergence_links[] pathway_ids this pathway has converged with (never merged)
  contract_version    IS-1 version under which this pathway's identity was decided
}
```

A Pathway is **exactly one ordered lineage** — a sequence of typed events connected by explicit
reference continuity (§3). It is never "the connected component containing these events", never
"all events touching subject X", never a graph. (Unit-of-analysis protection, CF-003 §26 —
guards the Phase-3 failure.)

## 2. Identity decision — signature

```
identity_decision(e, C, v) → { action, target?, links? }

  e : incoming typed event
  C : candidate pathway set (§3.1) — NOT all pathways
  v : IS-1 contract version

  action ∈ { EXTEND, BRANCH, CONVERGE, NEW }
```

**Determinism (mandatory).** `identity_decision` is a pure function. Same `e`, same relevant
candidate histories, same `v` → identical result. No randomness, no wall-clock, no dependence on
arrival order beyond `logical_time`, no dependence on any pathway's `lifecycle_state`, `νₜ`, or
support status.

## 3. The contract

### 3.1 Eligibility — which candidates are even comparable

```
C = { p ∈ Pathways | lineage(p) contains an object_id or event_id that appears in
                      e.provenance.derives_from OR e.object_refs }
```

A pathway with **zero structural reference overlap** with `e` is not a candidate. This bounds the
comparison to pathways `e` is explicitly, reproducibly connected to. `lifecycle_state` does **not**
filter eligibility — a TOMBSTONED pathway may still be a candidate (its revival is governed by
§3.3, not by hiding it here).

### 3.2 Extension predicate `extend(p, e)`

`extend(p, e)` holds **iff all** of:

1. **Reference continuity.** `e.provenance.derives_from` contains at least one `id` that is an
   output or subject of an event already in `lineage(p)`. The link is read from `e`'s own
   provenance — never inferred, never reconstructed from similarity.
2. **Type-successor validity.** `e.event_type` is an admissible successor of `p`'s current
   lineage state under the CF-003 §11 event grammar / CF-004 §10 runtime state machine
   (e.g. `FORMATION_ADMITTED` may not precede `FORMATION_CANDIDATE_CREATED` on the same lineage).
3. **Temporal monotonicity.** `e.logical_time ≥ logical_time(last(lineage(p)))`. Events never
   insert into the past; a correction is a *successor* event (CF-003 §21).
4. **Not sealed.** `p.lifecycle_state ≠ TOMBSTONED`, **or** `e.event_type = REVISIT` (§3.3).

### 3.3 New-pathway predicate `new(e)`

`new(e)` holds iff **either**:

- `e` is an **origin event** — `event_type ∈ {SIGNAL_RECEIVED, OBSERVATION_CREATED}` and
  `e.provenance.derives_from` resolves to nothing in any eligible candidate's lineage; **or**
- `e` has provenance, but `extend(p, e)` is false for **every** `p ∈ C` (the references exist but
  none lands on an admitted event of an eligible lineage).

"Related but independently originated" resolves here: two observations about the same real-world
subject that carry no shared `derives_from` are **two pathways**. Their relationship is recognized
downstream (relationship admission / convergence), not by fusing their identity.

### 3.4 Outcome resolution

```
matches = { p ∈ C | extend(p, e) }

|matches| = 1  →  EXTEND    target = the single p; append e to lineage(p)
|matches| ≥ 2  →  CONVERGE  append e (type CONVERGENCE) to each matched p;
                            record links = matches in every matched p.convergence_links;
                            identity is NOT collapsed — the pathways stay distinct.
|matches| = 0  ∧ new(e)     →  NEW   create Pathway; origin_event_id = e.event_id
```

**BRANCH** is the sub-case of EXTEND where a single prior event on `p` produced multiple derived
objects that are now being processed independently: the first successor per derived object
EXTENDs `p`; a second concurrent successor on the same fork creates a child Pathway with
`parent_pathway_id = p.pathway_id` and its lineage seeded from the shared prefix. For the minimum
experiment, workloads that produce single-line lineages never hit BRANCH; it is specified so the
identity model does not silently collapse a real fork.

### 3.5 No-inference-leakage (hard)

The following MAY be recorded as event/pathway attributes but **MUST NOT** independently
establish `extend`, `new`, `CONVERGE`, or eligibility:

- semantic / embedding similarity
- domain equality (X3)
- temporal proximity (adjacency in wall-clock or batch index)
- processor / connector origin
- co-occurrence in the same batch or window
- shared subject label without shared `derives_from`

Only **explicit reference continuity + type-successor validity + temporal monotonicity** decide
identity.

### 3.6 Persistence firewall (X5 / semantic firewall)

`identity_decision` reads candidate **lineage structure only** — the events, their refs, types,
and logical times. It does **not** read a pathway's `νₜ`, current-support status, or
`lifecycle_state` (except the §3.2.4 sealed check). Consequences:

- A pathway being *in memory* (ACTIVE, ARCHIVED, or TOMBSTONED) is never, by itself, evidence
  for anything downstream. Identity ≠ support ≠ admission.
- Persistence changes **what lineage exists to be compared against** — it does not change the
  admission rule. Whether an extended/archived pathway's state feeds relationship or formation
  admission is decided solely by `FC-REQ-05` (current-support-only), in
  `SPEC-cf-pathway-data-model.md` §formation-interface / `SPEC-cf-significance-policy.md`.

This is the exact separation the failed `persistent-strong-decoy` experiment was exposing:
*"this pathway exists with this lineage"* must never silently become *"this pathway currently
supports this relationship."*

## 4. `source` is metadata, not identity

`e.provenance.source` (the producing processor/connector) is retained for the processing
genealogy (CF-009 §6) and is queryable. It is **never** an input to `identity_decision`
(§3.5). Two events from different connectors that carry shared `derives_from` extend the same
pathway; two events from the same connector with no shared `derives_from` do not.

## 5. Worked resolutions (kill-experiment scenarios)

| Scenario | Events | IS-1 result |
|---|---|---|
| **single-shot** | one OBSERVATION_CREATED, no `derives_from` | NEW → one pathway, one event. |
| **recursive derivation** | OBSERVATION_CREATED `o1` → CORE_PROCESSING produces `o2` with `derives_from=[o1]` | second event EXTENDs (reference continuity on `o1`). One pathway, two events. |
| **multi-event / staggered cross-domain** | OWNERSHIP obs (batch 0), MEDIA obs (batch 3), CAPITAL obs (batch 5), **no shared `derives_from`** | **three pathways** (each `new(e)`). Cross-domain structure is recognized at relationship/convergence + formation, per FC-REQ-05 — *not* by fusing identity. CF's advantage over the baseline is therefore that the three lineages **persist to be compared**, bounded by the active support policy; it is not unbounded recovery. |
| **persistent-strong-decoy** | LABOR obs batches 0–2 then silent; genuine CAPITAL+OWNERSHIP batches 3–5 | LABOR = its own pathway, ARCHIVED after the support window. It remains a valid *identity* candidate but its state does **not** feed admission (§3.6 + FC-REQ-05) → the CAPITAL+OWNERSHIP formation admits without a stale LABOR leg. **FP = 0.** |

Note the multi-event / decoy rows share a mechanism: persistence keeps lineages available; the
**support policy**, not identity, decides what contributes. That boundary is what the significance
policy spec must get right, and what the kill experiment tests.

## 6. Deferred (explicitly out of IS-1)

- Exact νₜ update rule, decay, ΔS classification → `SPEC-cf-significance-policy.md`.
- Current-support determination (the window / the "a pathway persists a little longer than a raw
  observation" question) → `SPEC-cf-significance-policy.md`. **This is the load-bearing choice for
  whether multi-event recovery survives FC-REQ-05.**
- Storage engine, indexing, production identity clustering, cross-session persistence → IS-4
  implementation + a later production spec.
- Formation-interface detail (IS-6), full lifecycle transition table (IS-2) → later sections of
  this spec.

## 7. Acceptance for IS-1 (experiment-level)

IS-1 is sufficient when a harness can, for every kill-experiment workload:

1. produce a deterministic `{EXTEND|BRANCH|CONVERGE|NEW}` decision per event,
2. reproduce the identical decision sequence on replay,
3. show that no decision used any signal from §3.5,
4. show that the resulting pathways are single ordered lineages (no component/graph collapse),
5. show identity decisions are independent of `νₜ` / support / lifecycle state (§3.6).
