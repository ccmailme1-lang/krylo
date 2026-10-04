# Stage 1 Inventory — Relational Substrate

Classifies what currently exists in the repository against `specs/SPEC-relational-substrate-stage1-baseline.md`.
Identification and classification only — no redesign, no implementation, no resolution of any
open Founder decision. Every line cites the specific fact already established in
`specs/engineering-discovery-relational-substrate-20261001.md`.

---

## A. Domain Signals / MAP (`domaingravity.js` + `formationinference.js`)

**Maps to `ρ`?** No. Produces an edge `{a, b, property: 'co_presence', admittedType}` with no
`id`, no `part` as an evidenced pair (both `a`/`b` qualify independently, never jointly), and no
`φ_class` or `ν` partition.

**Relationship class (§2):** Neither. This is the baseline's **explicitly prohibited** case —
§9 names "co-presence alone" and "endpoint magnitude" as the first two items on the list of
things that may *not* create a relationship. `buildGraph()` admits a pair purely by each domain
independently crossing `CO_PRESENCE_FLOOR` — exactly that prohibition, confirmed at the
mechanism level, not by inference.

**Evidence & Admission (§5):** No per-relationship admission rule exists. `admitCrossDomainRelationship()`
is a static lookup by domain-pair *name*, consulted after the floor test — it never reads the
particles that produced the floor crossing. Fails §5's requirement that admission establish
"admissible evidence" and "provenance" for the relationship itself (per-domain provenance exists;
per-relationship provenance does not).

**Observable Relationship Change (§6):** Not applicable — there is no relationship object to have
a state history. The MAP has no change predicate today.

**Acceptance tests:**
- A (Traceability) — **FAIL**. An admitted edge traces to two independent domain floor-crossings,
  not to evidence that the relationship itself exists.
- C (No Fabrication) — **FAIL** per the §9 prohibition match above.
- Others — not applicable (no relationship object exists to test).

**Classification: does not produce a `ρ` under this baseline. It is a domain-co-occurrence
observation, explicitly named as non-relational in §13 ("The existing domain co-presence
mechanism may remain useful as an observation capability, but it must not silently become a
semantic relationship") and explicitly prohibited from being read as one in §9.**

---

## B. RelationCore (`relationontology.js`)

**Maps to `ρ`?** Partially, structurally. Has `id`, two participants (`sourceId`/`targetId`),
`relationType` (maps to `type`). Has no explicit `φ_class` (Semantic/Statistical) field — every
observed producer uses it for what the baseline would call a Semantic claim (ownership,
inventor-migration, acquisition), but the class isn't declared as its own field.

**`ν` partition:** Does not exist today. `eta`, `phi0`, `structuralSupport` are undifferentiated
numeric fields, not partitioned into `ν_id`/`ν_state`. Per baseline §1: "not automatically
canonical merely because they exist." Per §4's prohibited-content list, these three fields read
as exactly the forbidden categories: "a universal notion of strength" (`phi0`), "a universal
notion of confidence" (`eta`), "force/intensity as generic relationship quantities"
(`structuralSupport`) — confirmed non-authoritative independently in the discovery doc (`phi0 =
0.5` admitted placeholder in 2 of 3 producers).

**Evidence & Admission (§5):** Closest existing match to the baseline's requirement.
`provenanceHash` is a hard constructor requirement (throws without it) — satisfies "no evidence
means no admitted relationship" at the type level. `admitCandidate()` provides a real,
auditable decision (`VALIDATED` + rationale). Observation time (`createdAt`) is present and real
in every producer traced (SEC filing date, migration date).

**Observable Relationship Change (§6):** No state-history mechanism exists in RelationCore
itself. `relationdynamics.js` (see E, below) implements change-detection machinery that operates
on RelationCore's primitives but is unwired.

**Acceptance tests:**
- A (Traceability) — **PASS** for the 3 real producers traced (SEC accession, migration source).
- C (No Fabrication) — **PARTIAL**. The relationship's *existence* is evidence-gated
  (`provenanceHash` required); its *numeric fields* are not (placeholders, confirmed).
- D (Temporal Integrity) — **PASS** (`createdAt` is real, not synthesized).
- E (Provenance Preservation) — **PASS** at construction; **not evaluated** past construction
  (no confirmed persistence — see D below).
- Others — undetermined (no state-history mechanism to test B/F/G/H against).

**Classification: closest existing candidate for the canonical `id`/`part`/`type` fields of `ρ`.
Its `eta`/`phi0`/`structuralSupport` fields are not canonical under this baseline and must not be
mapped into `ν` without a type-specific rule, per §1 and §4 — this is an explicit prohibition on
treating existing fields as the ontology, already stated in the baseline, not a new finding here.**

---

## C. Typed Entity Edges (`entitytopologyregistry.js`)

**Maps to `ρ`?** No — simpler shape (`{from, to, type, source}`), no `id` distinct from the
pair+type, no `φ_class`, no `ν` partition, no admission predicate beyond being registered.

**Evidence & Admission (§5):** `source` is a free string field, not a hard constructor
requirement (confirmed — unlike RelationCore's `provenanceHash`, nothing was found that enforces
its presence).

**Relational Graph role (§11):** This is exactly the role the baseline assigns it: "traversal /
connectivity / indexing... It may not create relationships independently of the Relational
Substrate." Today it *does* create relationships independently — confirmed sibling construction
alongside RelationCore in `secownershipconnector.js`, with zero cross-reference. That is the
baseline's named target for correction (§11, §13): "should ultimately derive from canonical
relationships rather than remain an independent sibling truth system" — stated in the baseline
itself as the required end-state, not something this inventory is deciding.

**Acceptance tests:**
- A (Traceability) — **PARTIAL**. `source` exists but isn't enforced; some edges in this registry
  may be unsourced (not confirmed either way — would require per-call-site audit beyond this
  inventory's scope).
- Others — not applicable in current form (no `ρ`-shaped object, no state history).

**Classification: valid traversal/index infrastructure per §11, currently also acting as an
independent relationship-creation point, which §11 already identifies as the thing to change.**

---

## D. KRYL-1334 Formation State (`formationsnapshot.js` + `structuralentitysynthesis.js`)

**Maps to `ρ`?** No, but closest to the baseline's *change-predicate* vocabulary in spirit —
already uses `NEW`/`STRENGTHENING` (via `RELATIONAL_CHANGE_STATE`), which the baseline also
defines (§6) — but the resemblance is nominal only. Confirmed divergence:

- Baseline §6: `STRENGTHENING` requires "the evidence satisfies the relationship type's explicit
  rule for an increased state." Current `decideWrite()`: assigns `STRENGTHENING` whenever
  `evidence_ref` *or* `relationship_type` differs from `lastKnown` at all — no type-specific rule
  distinguishes a genuine increase from any other change. This is the exact failure mode §7
  warns against: "Every observed transition must resolve to exactly one change predicate" via a
  type-specific rule, not a generic diff.
- Baseline §8 (`UNSUPPORTED` vs `DISSOLVED`): current system has no `UNSUPPORTED`/`DISSOLVED`
  predicate at all — confirmed in the discovery doc: "only SUPPORTED pairs reach this function...
  detecting a pair that WAS SUPPORTED and no longer is requires the caller to also check pairs
  that dropped OUT of the SUPPORTED list, not built here." The absence-handling gap the baseline's
  §8 Uncertainty Doctrine exists to close is confirmed, concretely, as currently unbuilt.

**Evidence & Admission (§5):** `provenance: r.facet` retained whole (structured) — the one place
in the repository already doing this correctly, per the baseline's §10 requirement that evidence
survive transformation. But upstream of this file, `typedEdgeAsFacetShape()` already dropped
`eta`/`phi0`/`structuralSupport` one hop earlier (confirmed) — so what's "preserved whole" here is
already a reduced object by the time it arrives.

**Persistence (§9 of discovery doc / relevant to baseline §14):** The only one of the three
representations with real, confirmed database persistence (`pool.query()`, per its own header
comment) — relevant to the baseline's Migration Principle (§14), since this is the one existing
path with a working persistence story, not a design-stage concern.

**Acceptance tests:**
- A (Traceability) — **PASS** structurally (`provenance` retained), **PARTIAL** in practice (the
  object it retains is already missing RelationCore's confidence/strength fields one hop upstream).
- B (Identity Stability) — **UNDETERMINED/LIKELY FAIL**. `formation_id` incorporates
  `relationshipType` into the identity key itself (§25-28 of `formationsnapshot.js`); the baseline
  (§3) defines same-ness via `ν_id`, with `ν_state` explicitly excluded from identity. Whether
  `relationship_type` here is acting as `type` (identity-defining, correct) or as `ν_state`
  (should NOT affect identity) is not resolved by current code — a real open question for the Map
  phase, not decided here.
- G (Unsupported State) — **FAIL**, confirmed above (no `UNSUPPORTED` predicate exists).

**Classification: the only representation with real, working persistence and a change-predicate
vocabulary already nominally aligned with the baseline's §6 — but its actual predicate-assignment
logic does not satisfy the baseline's §7 (type-specific rules) or §8 (unsupported-vs-dissolved)
requirements as currently implemented.**

---

## E. RelationDynamics (`relationdynamics.js`)

**Maps to `ρ`'s Observable Relationship Change (§6)?** Structurally the most sophisticated
existing candidate — real entropy over evidence support, EMA-based volatility, explicit
`assertNoForecast` boundary matching the baseline's detection-not-prediction posture throughout
(§6, §9's prohibition on inferring structure backward).

**Status: confirmed zero importers anywhere in `src/`.** Non-operational, exactly as the baseline
itself already states in §13: "currently non-operational and should be evaluated against this
architecture rather than wired into the canonical path merely because it exists."

**Acceptance tests:** Not evaluated — no live invocation exists to test against real data. This
inventory does not assess its equations' correctness; that is a Map/Validate-phase question, not
an Inventory-phase one.

**Classification: a real, unwired candidate implementation of part of §6/§7's machinery. Its
fitness is undetermined — this inventory confirms *existence and dormancy*, not *validity*.**

---

## Summary table

| System | Produces `ρ`? | Class (§2) | Admission (§5) | Change predicates (§6/§7) | Persisted? | Baseline role per §13 |
|---|---|---|---|---|---|---|
| MAP co-presence | No — prohibited (§9) | Neither | No per-relationship rule | None | No | Observation capability only, not relational |
| RelationCore | Partial (id/part/type only) | Implicit Semantic, undeclared | Strong (provenanceHash required) | None (unwired) | No | Candidate internal representation; numeric fields non-canonical |
| Typed edges | No | N/A | Weak (source unenforced) | None | No (in-memory) | Traversal/index infra; currently also an independent sibling (to be corrected per §11) |
| KRYL-1334 facet | No | Implicit Semantic | Structural (whole facet retained) | Nominal only — fails §7/§8 | **Yes** | Existing data path to migrate, not final ontology |
| RelationDynamics | N/A (operates on `ρ`-like inputs) | N/A | N/A | Most rigorous existing match (unvalidated against real data) | N/A | Evaluate before wiring, not assume |

---

## What this inventory does not do

Per the baseline's §17 and this directive: it does not decide which system becomes the canonical
persistence target, does not define any relationship type's `ν_id`/`ν_state` partition, does not
resolve the `relationship_type`-as-identity-vs-state question raised in D, and does not validate
`relationdynamics.js`'s equations. Those are Map/Validate-phase questions, each requiring its own
explicit go.
