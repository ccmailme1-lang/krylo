# Stage 1 Adapt — Relational Substrate (Architecture Only)

Target adaptation architecture, built on the ratified baseline plus Discovery/Inventory/Map/Validate.
**No implementation. No code. No schemas. No `ν_id`/`ν_state` definitions. No invented relationship
types. No silent resolution of any Founder question** — each is named explicitly where it blocks a
decision, with the exact decision required.

---

## `makePolicyProfile` inspection (prerequisite, completed before this document)

Direct read, `relationontology.js:234-253`:

```
makePolicyProfile({ version, typeWeights: T→ℝ⁺, tierWeights, alpha1, alpha2, lambdaP, tauNu,
  tauCreate, tauBreak, tauPos, tauNeg, kappa, phi0Init, vStart })
```

**Correction to the Validate pass's flag**: this is *not* a flat, uniform-only policy. `typeWeights`
and `tierWeights` are explicitly keyed per relationship type/tier — partial, real per-type
parameterization exists in the shape.

**But**: `alpha1, alpha2, lambdaP, tauNu, tauCreate, tauBreak, tauPos, tauNeg, kappa, phi0Init` are
single scalars per profile version, applied uniformly across every type within that version. A
shared threshold formula scaled by a per-type weight is a materially weaker form of type-specificity
than baseline §7's "each type must explicitly define... what evidence establishes strengthening" —
a shared formula is not the same as each type owning its own rule, even with a type-specific weight
multiplied in.

**Confirmed, re-verified this pass**: `makePolicyProfile()` has **zero call sites anywhere in the
repository** besides its own definition. It has never been instantiated, with any values, ever.

This is treated below as genuinely unresolved, not as a confirmed incompatibility — the hybrid shape
*could* satisfy §7 depending on how a real profile is eventually constructed per type, but that can't
be determined without running it against real data (a Validate-level task, correctly out of scope
for this Adapt pass).

---

## A. MAP / Domain Signals

1. **Retain** — the domain-signal pool mechanism itself (`domaingravity.js`), as a real, valid
   observation capability. Nothing about its own data is wrong.
2. **Adapt** — its *labeling*. The MAP's "RELATIONSHIPS" count and `admittedType` surfacing
   currently imply a relationship claim that baseline §9 explicitly prohibits this mechanism from
   making. Terminology/labeling must change to describe co-occurrence, not relationship, regardless
   of what else is decided.
3. **Project** — does not project into CFX at all. Baseline §12 already settles this
   constitutionally: CFX's input is the canonical relational graph. Co-presence observations are
   not a relationship, so they are not a candidate CFX input either — this is not an open question,
   it follows directly from the ratified boundary.
4. **Recover** — nothing of this path's *own* data was found discarded. (The `event.topology`
   recovery item belongs to F, a different boundary, not something `domaingravity.js` dropped of
   its own making — it never had that field's producer in view until surfacerouter's dispatch
   layer, traced separately.)
5. **Deprecate** — the practice of presenting co-presence as if it were a relationship, in any
   surface (MAP UI count, API shape implying `admittedType` is evidence of *this instance's*
   relation). The underlying co-occurrence detection itself is not deprecated.
6. **Order** — independent of B/C/D. Can proceed on its own track — it's a labeling/scope
   correction with no dependency on the canonical `ρ` work.
7. **Verification** — any guest-facing or API surface derived from this path states "N domains
   co-active," never "N relationships," until/unless a real canonical relation also exists for the
   same pair.

No Founder decision is open here. The baseline already settles CFX's input scope (§12); this is a
labeling/scope correction to bring the existing surface in line with a boundary that's already
ratified, not a question still being decided.

---

## B. RelationCore

1. **Retain** — RelationCore is **not** canonical and does not become `ρ` by retention. It is a
   source representation containing useful structural *material* to be adapted into canonical
   `ρ = (id, part, type, φ_class, ν)`, field by field, not as a block:
   - `sourceId`/`targetId` → candidate material for `part`, not `part` itself (identity resolution,
     see below, still required).
   - `relationType` → candidate material for `type`, subject to ratification of that type.
   - existing `id` → **not automatically the canonical id.** Baseline §3: canonical `id` is
     assigned only after same-ness (`part`+`type`+`φ_class`+`ν_id`) is established. An existing
     RelationCore `id` was generated before any same-ness determination against the new ontology
     and cannot simply be carried forward as canonical.
   - `provenanceHash` → evidence/provenance material, not itself a constitutive part of `ρ`.
   - `validity`/`createdAt` → temporal/provenance material, not automatically constitutive — needs
     semantic examination (e.g. does `validity`'s open-ended `[createdAt, Infinity]` interval mean
     the same thing under the baseline's `ν_state` model, or is it itself a `ν_state` property).
   - `eta`/`phi0`/`structuralSupport` → not canonical absent a ratified type's own meaning (below).
2. **Adapt** — must gain an explicit `φ_class` (Semantic/Statistical) field; none exists today, it's
   only implicit per producer. `eta`/`phi0`/`structuralSupport`, per explicit instruction, are **not**
   promoted as-is — they remain non-canonical until a specific ratified relationship type defines
   real meaning for them under its own admission rule (a per-type Founder decision, not a blanket
   one).
3. **Project** — once a relationship type is ratified and same-ness is established for a given
   instance, RelationCore's structural material (per item 1) becomes an input to constructing that
   instance's canonical `ρ`. Typed Edges (C) then derive from canonical `ρ`, not from RelationCore
   directly — RelationCore is upstream raw material in this chain, not the canonical layer itself.
4. **Recover** — nothing lost yet at construction; the recovery concern here is preserving the
   *distinction* between observed evidence and modeled quantity going forward, not recovering lost
   values.
5. **Deprecate** — the current pattern of one adapter constructing a typed edge *and* a RelationCore
   independently from the same raw pair with no cross-reference (confirmed in
   `secownershipconnector.js:106-148`). One canonical construction call per adapter replaces this.
6. **Order** — foundational. Blocks C and D — both need canonical `ρ`'s shape and identity settled
   first.
7. **Verification** — every real producer traced (3 confirmed) can construct a valid canonical `ρ`
   using only fields it already extracts from real evidence today — no new per-source data
   collection required for the structural fields (though `φ_class` assignment, per the open
   question below, may require new per-adapter logic).

**Founder decisions required, not resolved here**:
- What rule assigns `φ_class` (declared explicitly by each adapter? inferred from `relationType`?
  something else?).
- Whether `eta`/`phi0`/`structuralSupport` are ever given real per-type computation rules, or
  retired as a concept entirely in favor of type-specific `ν_state` properties with their own
  names and meanings.

---

## C. Typed Edges

1. **Retain** — the read interface shape exactly as-is: `findPath()`'s traversal API and the raw
   `TYPED_EDGES` array-read pattern both confirmed in live use (`worldgraph.js`, `crediff.js`,
   `gwrealiser.js`, `causalimpactmap.js`). Consumers should see no shape change.
2. **Adapt** — the write path. Direct calls from connectors (`registerOwnershipEdge`,
   `registerTypedEdge`, `registerInventorMigrationEdge`) stop being independent writes and become
   derived from canonical `ρ` admission instead — not from RelationCore directly, since RelationCore
   itself is pre-canonical source material (B), not `ρ`.
3. **Project** — this is the baseline's named projection/index layer (§11) in full: a materialized
   graph-traversal view regenerated from (or incrementally kept in sync with) canonical relations,
   not an independently-written sibling.
4. **Recover** — nothing of this path's own; recovery concerns here are inherited from upstream (B)
   and downstream (D).
5. **Deprecate** — the direct, independent write calls themselves, once B exists to derive from.
6. **Order** — depends on B. Also depends on resolving F's synchronous-resolution requirement
   before the write-path change can be finalized, since `surfacerouter.js` calls `resolveTopology()`
   synchronously inside live dispatch — a projection mechanism that isn't equally fast/available at
   dispatch time would be a regression, not an adaptation.
7. **Verification** — `findPath()` and `getTypedEdgesFor()` return identical results, before and
   after the write-path swap, against a fixed snapshot of canonical relations. A regression-equivalence
   test, not new behavior.

**Open item, not a Founder ontology question, but unresolved**: `supplychainconnector.js` imports
`entityTopologyRegistry` with no confirmed call site found by direct grep. Should be resolved by a
direct code read before this path's writers are enumerated for deprecation — a factual gap, not a
design decision.

---

## D. KRYL-1334 Formation State

1. **Retain** — the real Postgres persistence mechanism itself: the `formation_state` table
   structure's *infrastructure* (write route, fire-and-forget client pattern, `lastFormationState()`
   history-comparison query), confirmed live end-to-end this session. This is valuable, reusable
   infrastructure independent of what schema it ends up storing.
2. **Adapt** — explicitly, per direct instruction: **the text-co-occurrence `SUPPORTED` admission
   mechanism (`allFieldEvidenceFacets()` + substring matching in `structuralentitysynthesis.js`)
   cannot survive under the baseline and must be replaced.** Its replacement candidate is canonical
   `ρ` admission (B) feeding this path instead of ad-hoc text matching. The `evidence_ref` lossy
   string-concatenation format (`sourceId:source`) is also adapted into a structured, retrievable
   provenance payload per baseline §10.
3. **Project** — the removed `structure-field.html` scrubber was this table's sole confirmed UI
   consumer (now gone, this session). Any future UI consumer re-derives from the canonical store's
   own projection, not from this table's current schema directly.
4. **Recover** — two items: (a) `eta`/`phi0`/`structuralSupport`, dropped one hop upstream
   (`typedEdgeAsFacetShape()`) before this path ever sees them — if B feeds this path instead,
   whatever real per-relation fields `ρ` retains flow through for the first time; (b) `r.state`
   itself — `NO_EVIDENCE` pairs currently produce no row at all. Baseline §8's `UNSUPPORTED`
   predicate requires this absence become an explicit recorded state, not silence.
5. **Deprecate** — the text-substring admission mechanism, full stop, independent of any other
   decision (explicit instruction). The lossy `evidence_ref` string format.
6. **Order** — depends on B (canonical `ρ` must exist to feed this) and on the identity-vs-state
   decision below (determines what `formation_id`'s composite key becomes).
7. **Verification** — every row currently in the live `formation_state` table is classified against
   the migration categories below (preservable without transformation / requires canonical
   transformation / cannot enter as currently represented) as a concrete audit — not just a design
   statement that migration is possible.

**Founder decision required, not resolved here**:
- Whether `relationship_type` (part of today's `formation_id` composite key) is canonical `type`
  (identity-defining, per §3) or a `ν_state` property (excluded from identity, per the same
  section).

**Migration/data-retention policy, not a Founder ontology question**: historical rows whose *sole*
admission basis was the text-substring match cannot become canonical relationships merely because
they historically exist — baseline §5 already settles that (no evidence, no admitted relationship;
confirmed the substring mechanism doesn't establish the required relationship-specific evidence).
That part is not in question. What remains is a retention-policy choice, not an ontology question:
preserve these rows as labeled noncanonical/historical records, or discard them from what migrates
into the canonical substrate.

---

## E. MAP/domain-signal boundary

Covered under A; no separate adaptation beyond what A specifies. Cross-referenced here only
because it was named as its own validation target — the boundary itself (co-presence ≠
relationship) is the finding; the adaptation is A's labeling/scope correction.

---

## F. `event.topology` path (`surfacerouter.js` ↔ `domaingravity.js`)

**Status: candidate preservation path pending factual validation — not yet adaptation
architecture.** The established fact is narrow and already confirmed: topology data exists at
dispatch (`surfacerouter.js:178`) and is currently discarded downstream (`domaingravity.js` never
reads `event.topology`). Whether that information belongs anywhere, and in what form, is a factual
question not yet answered, not an architecture decision this document can make.

Note also: since A establishes that co-presence/domain-signal observations are not a CFX input at
all (§12 already settles that), retaining `event.topology` on a domain-signal particle would not
feed CFX either way. If this preservation has value, it is for some other, non-CFX purpose (e.g.
a richer observation-only surface) — narrower than originally framed, and itself unconfirmed.

1. **Retain** — the dispatch-layer tagging mechanism (`resolveTopology(e.source)`, called
   synchronously inside `dispatchBatch()`) exactly as-is, regardless of what's decided below. This
   is real, live infrastructure; its synchronous-resolution behavior must not be weakened.
2. **Adapt** — not specified yet. A change to `domaingravity.js`'s `__gravity__` subscriber to read
   `event.topology` is a *candidate*, not a specified adaptation — it depends on the verification
   step below, which hasn't run.
3. **Project** — not specified yet, for the same reason.
4. **Recover** — the fact to preserve is narrower than "recover the data": `event.topology` is
   resolved by the dispatch layer and silently dropped at the one point that currently ignores it.
   Whether recovering it is worth doing, and for what purpose, is unconfirmed.
5. **Deprecate** — nothing proposed.
6. **Order** — independent of B/C/D regardless of outcome.
7. **Verification** — the actual next step, unperformed this pass: inspect `resolveTopology()`'s
   implementation directly — its real output shape, whether it's ever non-empty for real dispatched
   events, and its performance cost if read by an additional subscriber. Until that runs, this
   section cannot be converted into adaptation architecture.

No Founder ontology decision is posed here. This is a factual/Validate-level task, named for
follow-up, not a decision point.

---

## G. RelationDynamics

1. **Retain** — the mathematical machinery (entropy over evidence support, EMA volatility,
   φ-grounding assertions, the explicit `assertNoForecast` boundary) as candidate reusable logic.
   None of it is confirmed wrong — only confirmed unconfigured and unvalidated.
2. **Adapt** — not specifiable yet. Whether it needs adaptation, and what kind, depends on
   constructing one real `PolicyProfile` with real per-type `typeWeights` and testing whether the
   hybrid shared-formula/per-type-weight design produces defensible predicates under baseline §7 —
   a Validate-level task, not an architecture decision this document can make.
3. **Project** — not applicable; no live consumer exists to project from.
4. **Recover** — not applicable; nothing has ever been produced by this path.
5. **Deprecate** — nothing, yet. Not proven incompatible — only proven unconfigured (zero
   instantiations) and untested against real data.
6. **Order** — independent and low-priority relative to B/C/D. A dead branch either way until
   tested; doesn't block or get blocked by the canonical `ρ` work.
7. **Verification** — construct one real `PolicyProfile`, run the v1.2 update function against one
   real relationship's real evidence history (KRYL-1334's existing rows, or the 3 real RelationCore
   instances traced, are the available real inputs), and check whether the resulting predicate is
   defensible under §7 for that specific type. This is explicitly future Validate-phase work, named
   here, not performed in this Adapt pass.

**No Founder ontology decision is blocked here** — this path remains genuinely open pending the
verification step above, which is itself the next appropriately-scoped task, not a design choice.

---

## Migration classification

Deliberately not called "directly migratable" — that phrase would blur preserved *source material*
with *canonical status*, which is exactly the inertia this whole process exists to prevent. Three
categories instead:

**Preservable without semantic transformation** (the raw value carries forward unchanged; it is
still source material, not thereby canonical):
- `provenanceHash` — preserved as provenance material feeding `ρ`'s evidence, not as `ρ` itself.
- `createdAt` — preserved as temporal metadata.
- KRYL-1334's `provenance` payload (the whole retained facet object) — the *data* isn't the
  problem; its *origin* (the admission mechanism that produced it) is, handled separately under D.
- The real Postgres persistence infrastructure (table-write mechanics, HTTP route pattern,
  fire-and-forget client pattern) — reusable regardless of final schema.

**Requires canonical transformation** (the value or its status changes on the way into the
substrate, not just a storage move):
- RelationCore's `id` → cannot carry forward as canonical `id`; same-ness (§3) must be established
  first, and canonical `id` is a *consequence* of that determination, not a pre-existing value.
- RelationCore's `relationType` → candidate input to `type`, subject to ratification of that type —
  not automatically `type` merely by existing.
- RelationCore's `sourceId`/`targetId` → resolved through `canonicalId` (a lookup/mapping step, not
  a value change).
- RelationCore's `validity` → requires semantic examination (e.g. whether its open-ended interval
  maps to `ν_state` or to something outside `ν` entirely) before any transformation can be specified.
- Typed edges' `{from,to,type,source}` → becomes a derived projection FROM canonical `ρ`, reversing
  today's construction direction.
- KRYL-1334's `formation_id` composite key → pending the identity-vs-state Founder decision.

**Cannot enter the canonical substrate as currently represented:**
- RelationCore's current `eta`/`phi0`/`structuralSupport` *values* (as distinct from the fields'
  potential future meaning under a specific type's own rule) — these specific placeholder numbers
  are not real data and cannot be carried forward as if they were.
- KRYL-1334 rows whose sole admission basis was the text-substring match, uncorroborated by a
  structurally-guaranteed typed edge — cannot become canonical relationships merely because they
  historically exist; baseline §5 ("no evidence means no admitted relationship") already settles
  this. What remains open is a migration/data-retention *policy* question (preserve as a
  noncanonical historical record vs. discard), not a question about what a relationship is — see D.
- `formationinference.js`'s `admittedType` static category label, when treated as if it were
  per-instance evidence — it's a constant per domain-pair name (confirmed, same value every time
  that pair appears), never varying per instance, so it has no canonical meaning as "this specific
  relationship's type."

**Not yet classified — pending factual validation, not a migration decision:**
- `event.topology` — whether this is preservable, requires transformation, or isn't viable at all
  depends on inspecting `resolveTopology()`'s actual output (not done this pass). See F.

---

## Consolidated list of Founder decisions this Adapt pass stops at

1. What rule assigns a relation's `φ_class` (Semantic/Statistical)? (B)
2. Are `eta`/`phi0`/`structuralSupport` ever given real per-type meaning, or retired as a concept?
   (B)
3. Is `relationship_type` canonical `type` or `ν_state`? (D)

Not a Founder ontology question, but still open: the KRYL-1334 legacy-rows retention *policy*
(preserve as noncanonical historical record vs. discard — D), and the `event.topology` factual
validation (inspect `resolveTopology()` directly — F). CFX's input scope is not open at all; the
baseline already settles it (§12).

No implementation, schema, or ontology definition was produced in this document. Each path above
distinguishes what is architecturally necessary under the ratified baseline from what would merely
be implementation convenience (e.g., KRYL-1334's existing Postgres table and RelationCore's
existing code are retained as *infrastructure*, not as license to keep their current *semantics*
unchanged).
