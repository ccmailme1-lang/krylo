# SPEC — CF-002 ↔ IS-1…IS-6 Authority & Reconciliation Matrix

**Status:** ANALYSIS — classification only. No conflict resolved, no parameter set.
**Date:** 2026-09-02
**Author:** assistant, per Founder request (CF-002 pickup, step 2)
**Governing status of all CF material:** DRAFT. Nothing Founder-ratified.

**AGREED HOLD (Founder, 2026-09-02):** Do **not** repair `src/engine/cf/cfpathwaystore.js`
around the current per-domain `γ` model. IS-4's implementation *direction* is sound; the
blocker is **IS-1's pathway identity/history model** (X3 + the missing ordered typed event
history, CF-003 §10–11). Settling X3 first avoids a clean implementation of the wrong identity
model. The uncommitted IS-4 diff stays uncommitted and untouched until X1 / version / X3 / X4
are ruled. Next artifact is **Founder rulings**, not code.

Related: `Core Processor & Remote Processor Capability.md` (CF-002 v0.1 + CF-003),
`CF-002 — …Capabil.txt` / `…Capabil.md` (CF-002 v0.2/v0.3 + CF-004…CF-010),
`SPEC — Cognitive Fabric & Formation Frontier.md` §36 (IS-1…IS-12),
`KRYLCF-1-through-6-canonical.md` (KRYL-CF-001 constitutional set),
`SPEC-closed-loop-observation-architecture.md` (Path Memory / Fabric distinctness rule),
`src/engine/cf/cfpathwaystore.js` + `cfrunner.js` (uncommitted IS-4 work).

---

## 0. Source-read status

| Doc | Read | Notes |
|---|---|---|
| CF-002 v0.1 §1–29 | ✅ full | 62 KB file |
| CF-002 v0.2 consolidated contract §0–§10 | ✅ full | 78 KB thread |
| CF-002 "5 corrections" → proposed v0.3 AI-1…AI-9 | ✅ full | 78 KB thread; **not ratified** |
| CF-003 §1–30 | ✅ full | 62 KB file |
| CF-004…CF-010 v0.1 drafts | ✅ full | both files (duplicated content) |
| IS-1…IS-12 | ✅ | `SPEC — Cognitive Fabric & Formation Frontier.md` §36; all NEEDS-SPEC |
| Uncommitted IS-4 diff | ✅ | `cfpathwaystore.js` (+85/−53), `cfrunner.js` (1 line) |
| KRYL-CF-001 constitutional set | ✅ headers + KRYLCF-1/2 body | `KRYLCF-1-through-6-canonical.md` |

**CF-001 provenance — RULED (X1, Founder, 2026-09-02).** See Decision Record below. Three
artifacts carry "CF-001"/"CF-00x" numbering:
1. **KRYL-CF-001…006** (Jira project KRYLCF, filed 2026-07-29) — node-based cognition, SIL truth
   authority, Edge Arbitration Protocol (KRYL-CF-002, **APPROVED**), Cognitive Coherence Protocol
   (KRYL-CF-004, **APPROVED / "Implementation Ready"**), **"no Brain Router" anti-pattern**.
   Implementation built + removed (`e62c184`, unreviewed). Prose is the surviving spec.
2. **September CF-002…CF-010 stack** (the 3 Sep-1 files) — 9 Core capability classes + N Remote,
   central capability router `ρ(s)`, CF-003 data model, ν_t / Formation Frontier.
3. **`SPEC — Cognitive Fabric & Formation Frontier.md`** v0.2 — CF-I1…I7, Frontier, ν_t, IS-1…IS-12.

**X1 ruling: KRYL-CF-001…006 govern.** The September stack is a set of *candidate subordinate
specifications requiring reconciliation* — not a parallel architecture, not an authority.

**Namespace convention for this document:** bare `CF-00x §y` = the **September stack**.
Constitutional artifacts are always written `KRYL-CF-00x`. The two numberings collide
(`CF-002` = September processor contract *and* KRYL-CF-002 = Edge Arbitration Protocol;
likewise CF-003, CF-004) — treat this as a **namespace collision**, resolved only by the
prefix, pending the artifact-taxonomy ruling (#2).

---

## 0a. Decision Record

### X1 — Constitutional authority (Founder, 2026-09-02)

> **KRYL-CF-001…006 govern. The September CF-002…CF-010 artifacts are candidate subordinate
> specifications requiring reconciliation. No September artifact may establish a competing
> architectural authority.**

Basis: **explicit constitutional authority**, not recency or implementation status. KRYL-CF-001
identifies itself as the surviving authoritative artifact; KRYL-CF-002 (Edge Arbitration) and
KRYL-CF-004 (Cognitive Coherence Protocol) are **APPROVED** in-ticket — the most-ratified CF
material in existence. The September stack has no standalone ratification.

**Three findings from the constitutional audit:**

1. **Capability routing is not itself the conflict.** KRYL-CF-004 CCP already defines a Node
   Capability Registry and Participation Selection whose priority #1 is *"direct capability
   match."* `ρ(s) = req(s) ⊆ cap(c)` may be compatible **as a capability-matching mechanism.**
2. **Centralized cognitive dispatch is the conflict.** Reading `ρ(s)` as a central dispatcher
   conflicts with the "no Brain Router" prohibition and CCP's forbidden behavior *"become a
   global router."* The September formulation also **omits the CCP minimum-coherent-cluster /
   CCS / arbitration model** that KRYL-CF-002/004 establish, and its "exactly nine Core
   capability classes" echoes the **explicitly rejected** *"Fixed brain assignment (Brain 1-9)."*
3. **The September stack is not a parallel CF architecture.** Its ingress / connector /
   persistence / data-model material may fill genuine KRYLCF gaps (KRYLCF has *no* raw-data →
   SIL-artifact admission, *no* transport/queue, *no* connector concept), but it must become
   **subordinate to and structurally compatible with** the constitutional architecture.

**Namespace collision (structural, not cosmetic):** September `CF-002/003/004` collide with
KRYL-CF-002 (EAP) / KRYL-CF-003 / KRYL-CF-004 (CCP). Unprefixed "CF-003 §21" is now ambiguous.
Resolution deferred to ruling #2 (artifact taxonomy). Interim convention: this document writes
constitutional artifacts as `KRYL-CF-00x`; bare `CF-00x` = September stack.

**Consequences carried forward:**
- Every routing-related matrix row (IS-1 identity, IS-5 interface, AI-4/AI-6/AI-7) is now
  reconciled against KRYL-CF-002/004, not just the September thread.
- Version ruling #2 is **partly premature**: "which September CF-002 formulation governs" matters
  less until the artifact-taxonomy question (one child spec? several? folded into existing
  KRYLCF artifacts?) is answered. #2 will cover taxonomy + version together.
- CF substrate implementation stays on **HOLD**. IS-1…IS-6 are **not invalidated** — X1
  establishes the constitutional layer they must now reconcile against.

### #2 — Version / Artifact taxonomy (Founder, 2026-09-02)

> **The September CF-002…CF-010 stack is not a competing CF architecture. It is reparented
> beneath KRYL-CF-001 and must not retain the bare `CF-00x` namespace as if constitutional.
> Do NOT renumber the stack mechanically yet.**

- **Constitutional namespace:** `KRYL-CF-00x` = authoritative. Bare `CF-002`/`CF-003`/… =
  **non-authoritative / ambiguous identifiers**, September material only.
- **The September stack does not survive as one monolithic spec.** It contains ≥3 kinds of work
  with different authority and purpose, to become separate subordinate artifacts (numbering
  deferred until contents reconciled):
  1. **architectural/protocol claims** — capability/reach separation, Core/Remote topology, routing
  2. **substrate/data contracts** — ingress, evidence, pathway representation, persistence, history
  3. **research/frontier contracts** — ν_t, Formation Frontier, IS-1…IS-12
  Eventual shape: `KRYL-CF constitutional → subordinate architectural/protocol specs → substrate/
  data-model specs → research/falsifiable/implementation specs`.
- **Which September CF-002 formulation survives?** **Neither v0.2 nor the v0.3 corrections is
  canonical.** Both are *candidate material*. Useful parts survive as candidate requirements;
  conflicting parts do not gain authority by being in the later version:

  | September element | Disposition |
  |---|---|
  | capability declaration / matching | candidate — compatible |
  | centralized cognitive dispatch (`ρ(s)` as central router) | candidate — **conflict** |
  | Core / Remote distinction | candidate — extension requiring reconciliation |
  | nine capability classes | **unratified proposal** |
  | ν_t | research / frontier primitive, **not** constitutional architecture |
  | CF-003 data model | candidate substrate specification |

- **IS-4 stays HOLD** — precise reason: cannot finalize the pathway implementation against a
  September architecture whose identity / routing / artifact authority are not yet
  constitutionally reconciled. The IS-4 three-way split is not thereby wrong; its underlying
  **pathway identity model cannot be promoted to canonical** yet.

**#2 disposition:** AUTHORITY → KRYL-CF-001…006 · September stack → subordinate candidate ·
bare `CF-00x` → non-authoritative · automatic renumbering → HOLD · v0.2 → candidate · v0.3
corrections → candidate · constitutional reconciliation → REQUIRED · substrate impl → HOLD.

### X3 — Pathway identity axis (Founder, 2026-09-02)

> **A pathway SHALL NOT be keyed by canonical domain.** `γ = domain → one persistent pathway`
> is an experimental fixture, **not** the canonical IS-1 identity model.

- Pathway identity derives from its **structural lineage**, not its observational domain.
  *"A pathway is the persistent identity of a particular evolving sequence of observations and
  transformations — not the container for everything observed in a domain."*
- Domain is **metadata/context**, never the identity key. Separation stands:
  `domain ≠ capability ≠ pathway ≠ relationship ≠ formation`.
- **Many pathways per domain** and **one pathway spanning multiple domains** are both allowed
  and required.
- **Same pathway** = a new event can legitimately attach to the existing lineage under the IS-1
  identity contract. **Different pathway** = it cannot without creating a new lineage. This is
  decided from **explicit identity evidence** — never domain equality, temporal proximity,
  similarity alone, processor origin, or storage convenience.
- **Ordered typed event history is REQUIRED by IS-1** (not an optional enhancement) — it is what
  makes pathway identity reconstructible. Canonical shape:
  `Pathway { identity · lineage(ordered typed events) · observations · transitions ·
  current_state · ν_t · termination/continuation history }`.
- **Not ruled here:** the exact identity function (canonical seed vs lineage signature vs
  continuity relation vs other) — **defers to the IS-1 specification.**
- X3 does not settle X4, but constrains it: **whatever termination means, the resulting history
  must not destroy the ability to distinguish pathway identity across time.**

**X3 disposition:** domain-keyed pathway → REJECTED as canonical · domain as identity → REJECTED ·
domain as metadata → RETAINED · multiple pathways per domain → REQUIRED · cross-domain lineage →
REQUIRED · ordered typed history → REQUIRED by IS-1 · exact identity function → DEFER to IS-1 ·
current `γ` → experimental fixture only · IS-4 impl → HOLD pending X4.

Consequence: IS-4 **cannot** be "fixed" by making the six-domain containers more sophisticated —
**the container itself is the wrong abstraction.**

### X4 — Termination semantics (Founder, 2026-09-02)

> **Tiered lifecycle is canonical: `ACTIVE → ARCHIVED → TOMBSTONED`. Hard deletion of a pathway
> is prohibited as a canonical operation.**

- **ACTIVE** — currently supported, eligible to contribute to current pathway state.
- **ARCHIVED** — outside the active support window; lineage + state retained for inexpensive
  reactivation.
- **TOMBSTONED** — no longer active; retain identity, ordered typed lineage, termination event;
  removed from live contribution / ν_t / current-support evaluation. Physical removal of *live
  working state* is allowed on tombstoning; removal of *identity/history* is not.
- **Hard delete / domain-map eviction → REJECTED.** No "provably never contributed" exception at
  this stage (avoids a second deletion regime + proof obligation). If production storage later
  needs physical GC, it is specified as **storage compaction of reconstructible history**, never
  pathway deletion.
- **Tombstone minimum contents:** `pathway_id · identity material · ordered typed event history ·
  termination event · termination reason/classification · provenance references`.
- **Reactivation MUST be explicit** — emits a `REVISIT` event; no silent resurrection; the
  original termination stays immutable. `ACTIVE→ARCHIVED→TOMBSTONED→(REVISIT + new evidence)→ACTIVE`.
- **`NU_MEMORY_FLOOR` redefined** from an eviction threshold to a **tombstoning threshold** — it
  answers "when does this pathway cease to participate in live memory?", never "when may the
  system forget it existed?"
- **Experiment vs production:** full in-memory retention of the tiered records is acceptable for
  the bounded IS-4 experiment. Production compaction/archival deferred to the IS-1/IS-4 spec.
  The experiment tests the semantic invariant without solving the storage-engine problem.

**X4 disposition:** hard-delete → REJECTED · domain-map eviction → REJECTED · tiered lifecycle →
ADOPTED · silent reactivation → PROHIBITED · `REVISIT` event → REQUIRED · history rewriting →
PROHIBITED · `NU_MEMORY_FLOOR` → active→tombstone threshold · experiment retention → full
in-memory permitted · production compaction → DEFERRED.

### X2 + X5 — ν_t policy location & traversed ≠ admitted (Founder, 2026-09-02)

Resolved together via a **7-delta patch set (➊–➐)** amending the **candidate** CF-004/CF-005/CF-006
material (September stack — subordinate per ruling #2; final artifact numbering deferred).
Ratified with one wording change to MET-01. These deltas are incorporated when the September
material is extracted into proper subordinate specs.

**X2 — ν_t is a contract-level *observable*; its algorithm is versioned *policy*.**

- **➊ CF-005 §2.1 Pathway Significance Observable (νₜ).** DEF-05-01: the Fabric SHALL expose an
  observable scalar `νₜ(p)` for any active pathway p at logical time t. DEF-05-02: the producing
  algorithm — window length λ, decay/aggregation function, thresholds — is a **versioned POLICY
  COMPONENT, not a fixed architectural element.** DEF-05-03: `νₜ` and `Δνₜ` MAY be computed
  asynchronously/incrementally; implementations are **NOT REQUIRED** to complete it before a
  signal is normalised, published, or rendered. Informative: SHOULD use background/streaming so
  guest ingestion/rendering do not depend on the size or growth rate of active Fabric state.
  *(the earlier "O(1) w.r.t. N(t)" phrasing was removed — performance guidance, not a complexity
  bound.)*
- **➋ CF-005 §2.2 Provenance for νₜ.** DEF-05-04: any persisted `νₜ(p)` or derived classification
  SHALL include `policy_version`, `input_reference` (IDs/hashes of inputs consumed), `logical_time`.
  Distinguishes "same policy, different evidence" from "different policy" — required for
  deterministic replay.
- **➌ CF-005 §5 Observation vs Derived Classification.** Depth `d` and `νₜ(p)` stored as **raw
  observables**; DECAY / PERSISTENCE / AMPLIFICATION are **optional policy-derived labels** that
  MUST cite `policy_version`; their absence/delay/recompute MUST NOT impede ingestion, pathway
  extension, or rendering.
- **Contract/policy/param split (confirmed):** the **separation** (memory ≠ current-support ≠
  admission) = **invariant** (it enforces X5); the **shape** (decay-with-corroboration / recency
  window / `inferFormation` over the supported set) = **policy**, in the CF-005-equivalent
  significance spec; the **values** (`λ`, `SUPPORT_WINDOW`, `NU_MEMORY_FLOOR`) = **parameters**,
  deferred to the parameter step.

**X5 — "traversed ≠ admitted" as a named invariant.**

- **➍ CF-006 §5 FC-REQ-05.** Only pathway state **currently supported under the active support
  policy** MAY be used as evidence for relationship or formation admission. Historical, archived,
  **tombstoned**, or otherwise unsupported state SHALL NOT constitute admission evidence by
  itself. Admission evaluation MAY be scheduled asynchronously.
  *("currently supported under the active support policy" replaced "not yet expired" — support is
  pluggable, not necessarily a time window; preserves X3/X4.)*
- **Acceptance test:** the `persistent-strong-decoy` scenario → **FP_CF = 0** on every later
  formation. A permanent invariant test, not a one-time check.
- **Doctrine link:** persistence-domain cousin of FORMATION IS NOT A VERDICT / CLAUDE.md §21 —
  there *structure ≠ conclusion*; here *memory of structure ≠ current structure*.

**New invariant — CF Guest-Path Non-Interference.**

- **➎ CF-004-INV-006.** (a) CF analytical processing (νₜ computation, pathway traversal, support
  evaluation, relationship admission, formation inference) SHALL NOT be a synchronous prerequisite
  for signal normalisation, publication, or guest-facing rendering. (b) analytical workloads MUST
  execute via asynchronous / incremental / scheduled mechanisms. (c) guest-facing rendering MUST
  consume already-available authoritative state and MUST NOT trigger on-demand execution of the
  (a) processes.
- **➏ CF-004-MET-01** (§11 Operational Metrics). Implementations SHALL expose telemetry for
  independent measurement of: guest-facing end-to-end latency (ingest→render), analytical queue
  delay, analytical processing time, state objects examined/written per input event.
  **➐ [wording change]** *"This telemetry MUST permit independent analysis of whether variations
  in analytical workload increase guest-facing latency."* (was: "…MUST make it possible to
  demonstrate that variations… do not proportionally increase…" — the spec requires measurement
  capability, not a pre-asserted empirical result.)
- Clean separation: **INV-006 = architectural requirement · MET-01 = ability to measure
  compliance · validation = empirical demonstration (later).**
- **Consistency:** matches CF Formation Frontier spec §2.1 (CF runs *beside* the synchronous
  analytical path, doesn't gate single-shot queries) and CLAUDE.md §20 (signal-latency doctrine).
  Adds architectural **separation**, not runtime **serialization** — no new synchronous layer on
  KRYLO's guest path.

**X2 + X5 disposition:** νₜ → contract-level observable, algorithm = versioned policy ·
νₜ provenance (`policy_version` + `input_reference` + `logical_time`) → REQUIRED for persisted
values · DECAY/PERSISTENCE/AMPLIFICATION → optional policy labels citing `policy_version` ·
memory/support/admission separation → INVARIANT · FC-REQ-05 (current-support-only admission) →
ADOPTED · CF-004-INV-006 Guest-Path Non-Interference → ADOPTED · CF-004-MET-01 telemetry →
REQUIRED (measurement capability, not asserted result) · parameters → still DEFERRED.

**Ratification (Founder confirmation, 2026-09-02):** **X2 CLOSED · X5 CLOSED · Guest-Path
Non-Interference LOCKED · Independent Measurement LOCKED as a requirement.** MET-01 final wording
is ➐ ("permit independent analysis of *whether* …") — a measurement requirement, never a claim
the architecture has already demonstrated non-interference. `DEF-05-04` noted as load-bearing
beyond X2/X5: a persisted `νₜ` is *a versioned observation of a policy execution against
identified inputs at a logical time* — lets the Fabric answer "why was this pathway significant
then?" without today's policy reproducing yesterday's result. No further changes to this
patch set.

### X6 — Nine capability classes (Founder, 2026-09-02) — CLOSED

> **The Cognitive Fabric defines nine canonical capability classes as an *ontology of cognitive
> function*. Runtime capability availability SHALL be declared and resolved through the
> KRYL-CF-004 Node Capability Registry. Capability classes SHALL NOT imply fixed processor
> instances, cardinality, topology, or execution order. Runtime nodes MAY implement one or more
> capability classes, and multiple nodes MAY implement the same class. IS-5 SHALL reference
> capabilities by stable `capability_id`, not node identity or unconstrained string.**

- **Nine-class framing → ADOPT, as a capability *taxonomy* only.** Not nine processors, not nine
  runtime stages, not nine singletons, not a fixed execution sequence, not a central 1→9
  dispatcher. "Nine" is an **ontology cardinality, not an infrastructure cardinality.**
- **Canonical capability model → KRYL-CF-004 Node Capability Registry is authoritative** for
  runtime. The nine classes sit *above* it as the taxonomy. September answers "what capabilities
  exist?"; KRYL-CF-004 answers "which node instances currently expose them?".
  `TAXONOMY (9 classes) → Node Capability Registry → node instances (caps[])`.
- **Routing → registry-based eligibility**, not fixed processor routing:
  `required capability → capability registry → eligible node instances → execution`. No
  `Capability n → Processor n`. **Architectural layering SHALL NOT imply sequential runtime
  layering.** Horizontal scaling (10 more instances of one class) does not alter the ontology.
- **IS-5 field type → `capability_id`** drawn from the canonical nine-class taxonomy. Not
  `string`, not `node_id`. A node may advertise multiple `capability_id` values.
- **No Brain Router reintroduced; no nine synchronous runtime stages.**

**X6 disposition:** nine classes → ADOPT (taxonomy) · nine runtime processors/stages → REJECT ·
September fixed runtime set → REJECT as runtime authority · KRYL-CF-004 Node Capability Registry →
authoritative · capability routing via registry → YES · fixed upper bound on instances → NO ·
IS-5 field → stable `capability_id` · central Brain Router implied → NO.

**Open follow-on (not a blocker for IS-4):** the nine classes are **still not enumerated**
anywhere. Authoring the nine `capability_id`s + their behavioural contracts is Founder-side work,
required **before IS-5** can be typed against the taxonomy. Not required before IS-4.

### Architectural reconciliation — COMPLETE

**X1 [RULED] → #2 taxonomy/version [RULED] → X3 identity axis [RULED] → X4 termination [RULED] →
X2 [CLOSED] → X5 [CLOSED] → X6 [CLOSED].**

X7 (CON-05 conformance vs validation) is **subsumed** — the September CF-002 is candidate-only
per #2, so CON-05 carries no authority. X8 (Path Memory distinctness) is **resolved by
implication** — X3 makes pathway identity = structural lineage, categorically distinct from
`pathstore.js`'s decision→outcome Path Memory; `cfpathwaystore.js` stays a separate module.

### Canonical dependency chain (Founder, 2026-09-02)

**#2 taxonomy extraction → significance policy spec → IS-1 pathway identity → parameters →
IS-4 canonical implementation → IS-5.** Nine-class enumeration sits **outside** this chain until
IS-5. **IS-4 is no longer the next thing to fix.**

### Post-reconciliation locks (Founder, 2026-09-02)

1. **`cfpathwaystore.js` is an experiment fixture / prototype — not the foundation for IS-4.** It
   demonstrated exactly one valid invariant (current-support-only admission); its storage model
   contradicts X3/X4/X2. No further work on it *as canonical implementation*.
2. **IS-1 is the critical architectural dependency.** X3 established *what pathway identity must
   mean*; it did **not** freeze the identity function. IS-1's decisive question is **not** "what
   fields are in a Pathway?" — it is:
   > **What exact equivalence relation causes two event histories to belong to the same Pathway?**
   Anchored requirement: *pathway identity is derived from structural lineage, represented by
   ordered typed events — not domain membership, storage location, temporal proximity, or
   processor origin.* This is where the architecture becomes executable.
3. **Parameters come after identity.** `COST_BUDGET_RATIO`, `RELEASE_COST`, frontier weighting,
   ν_t values operate on objects whose identity and lifecycle must already be well-defined —
   otherwise tuning compensates for an undefined ontology.
4. **IS-4 is rewritten against the resulting contracts, not patched incrementally.** Once IS-1
   fixes identity, IS-4 implements cleanly:
   `event → lineage association → Pathway state {ACTIVE|ARCHIVED|TOMBSTONED} → current support →
   νₜ + provenance → admission candidates → Relationship/Formation analysis`, preserving the
   INV-006 fast-path separation.

### The semantic firewall around memory (X3 + X4 + X5)

Persistent memory may tell CF *"this pathway existed and has this lineage."* It may **not**
silently become *"this pathway currently supports this relationship."* That requires **current
support**, which is itself distinct from pathway **identity** and from historical **persistence**.
Three separated concepts, never one scalar. This is the architectural correction the failed
`persistent-strong-decoy` experiment was exposing.

### CF canonical substrate — BUILT + kill experiment run (2026-09-02)

Executed the chain: `SPEC-cf-artifact-taxonomy.md` (#2 extraction) → `SPEC-cf-significance-policy.md`
(`cf-sig-policy/0.2`) → `SPEC-cf-pathway-data-model.md` (IS-1 minimum executable identity contract)
→ canonical implementation → kill experiment.

**New code (canonical, IS-1/X3/X4/X2/X5-compliant):**
- `src/engine/cf/pathwaystore.js` — lineage-keyed pathways, reference-continuity identity (IS-1),
  tiered ACTIVE/ARCHIVED/TOMBSTONED (no hard delete, X4), νₜ with DEF-05-04 provenance,
  convergence clusters, `admissibleParticles()` = FC-REQ-05 (X5).
- `src/engine/cf/significance.js` — `cf-sig-policy/0.2`.
- `src/engine/cf/runner.js` — canonical two-path runner.
- `qa_cf_canonical.mjs` — harness.
The frozen `cfpathwaystore.js` / `cfrunner.js` / `cfworkloads.js` are untouched except an
additive optional `opts` arg on `cfworkloads.mk` (obsId/dependsOn/subject) — the original
`qa_cf_kill_experiment.mjs` still passes all invariants.

**KEY FINDING — a pure recency window cannot work.** The decoy's staleness at the moment the
genuine formation appears (1 batch) is *smaller* than the multi-event stagger (2 batches); any
window wide enough for one admits the other (measured: `W=2` → multi-event recall 1.0 AND decoy
FP=2). The discriminator is **reference continuity (IS-1 §3)**, not time: a pathway feeds
admission iff corroborated this batch OR a convergence-cluster co-member was. No `W` parameter.

**RESULT (`qa_cf_canonical.mjs`, COST_BUDGET_RATIO=4 PROPOSED):**

| class | V_B | V_CF | ΔV | FP_CF | verdict |
|---|---|---|---|---|---|
| multi-event | 0.000 | 1.000 | +1.000 | 0 | **RETAIN** — CF recovers the referentially-connected staggered triangle the window-only baseline structurally cannot |
| formation-revision | 0.500 | 0.900 | +0.400 | 0 | **RETAIN** — reflects the OWNERSHIP fracture, ttr=0 |
| single-shot | 0.714 | 0.714 | 0 | 0 | KILL — correct (no continuity; discriminator works) |
| frontier-resolution | 0.357 | 0.357 | 0 | — | KILL — frontier (IS-7/8) is out of the authorized scope |
| frontier-inaccessible | 0.714 | 0.714 | 0 | 0 | KILL — correct |
| **persistent-strong-decoy** | FP_B 0 | — | — | **FP_CF 0** | **✓ clean** — LABOR excluded from admission though `ν_LABOR=0.79` still in memory (firewall holds) |

IS-1 acceptance: determinism ✓, input not mutated ✓, full-lineage reconstruct across tiers ✓,
identity/admission independent of νₜ (λ 0.15 vs 0.95 identical) ✓, no hard delete ✓.

**Verdict (Founder wording, 2026-09-02):** **CF earns continued development as a bounded
architectural capability** — *not* a blanket "CF works." The experiment established a semantic win
for the tested formation classes AND a boundary where CF has **zero demonstrated value**
(single-shot ΔV = 0 → correctly killed).

**The precise finding** (what CF actually contributed — not persistence alone, not a wider window,
not domain matching):

> **Persistent reference continuity can distinguish a structurally corroborated multi-event
> formation from temporally coincident observations when a recency-only baseline cannot.**

**Two distinct gates — keep separate:**

| Gate | Status |
|---|---|
| Experiment passed → **CF development authorized** | ✅ reached |
| Experiment result → **production integration authorized** | ❌ NOT reached — a separate Founder decision |

The decoy result validates the X5 separation directly: `ν_LABOR = 0.79` persists in memory while
producing no formation — *memory can persist without becoming current structure.*

### Still open (parallel / later)

- Nine-class enumeration (Founder) — before IS-5.
- **Parameters** (`λ`, `archiveGap`, `memoryFloor`, `ε`, `COST_BUDGET_RATIO`, `RELEASE_COST`) —
  Founder values. None load-bearing for the RETAIN/decoy result above; `COST_BUDGET_RATIO` moves
  the KILL/RETAIN line for the marginal classes only.
- Frontier (IS-7…IS-12) — deferred, out of the authorized build.
- Production: real connector provenance for `dependsOn` (fixtures stand in), INV-006 latency
  measurement against real connector I/O, cross-session persistence, storage engine.
- Wire into a live path — **not done.** Production integration is a separate gate from
  "CF development authorized" and requires its own Founder ruling.

---

## 1. Layer-ownership finding (reframes the reconciliation)

IS-1…IS-6 are primarily **CF-003 / CF-005 / CF-006** concerns. CF-002's processor-contract and
capability-routing layer is **largely orthogonal** to them.

| IS | Primary governing CF doc | CF-002 relevance |
|---|---|---|
| IS-1 concrete pathway representation (γ, ν_t) | CF-003 §10–14, §18, §21–22 | low — CF-002 only carries `pathway` in the envelope |
| IS-2 transition semantics | CF-004 §10 (runtime state machine), CF-005 §9 (revisit) | low |
| IS-3 pathway identity | CF-003 §12 (branch/converge/parent-child), CF-005 §8 (convergence) | low |
| IS-4 pathway persistence | CF-003 §21–22, CF-005 §10 (budget ≠ epistemic cap) | low |
| IS-5 ν_t ↔ RelationCore | CF-003 §6, CF-006 §5, CF-009 §4; **KRYLO `admitCrossDomainRelationship`** | medium — CF-002 §7 MUST-NOT ("no manufactured relationship") |
| IS-6 pathway ↔ Relationship ↔ Formation governance | CF-006 §2/§7/§8; **KRYLO `inferFormation` / Formation-B rules** | medium — CF-002 §24 output-class separation |

**Consequence:** the worry that "CF-002 supersedes IS routing/persistence/processing" is mostly
misplaced. The binding constraints on the authorized build come from CF-003 and CF-005, plus the
Path-Memory-distinctness rule from the closed-loop spec.

---

## 2. CF Architectural Authority Map

| Standing | Items |
|---|---|
| **LOCK — already ratified in KRYLO** (CF restates, doesn't create) | Formation Candidate ≠ Formation; governance owns admission; observation → interpretation → formation separation; provenance additive & reconstructable; Non-Inference ≠ Information-Withholding (CF-009 §7) |
| **PROPOSED-LOCK** (drafted, no Founder stamp) | capability/reach separation; 9 capability **classes**, 0..n instances (v0.3 #1/#2); Remote = capture/normalize/map/transmit only (AI-5); capability indirection (AI-7); route by required capability not origin/domain (AI-6); recursive re-entry, no architectural depth cap (AI-8/AI-9); both genealogies captured (CF-009 §6); N no fixed architectural upper bound (AI-3) |
| **FALSIFIABLE** | CF-002-CLAIM-001…007; CF-003-CLAIM-001…008 — tested in CF-008, never true-by-spec |
| **OPTIONAL MODEL** (implementation guidance only) | M/M/m queueing, Erlang-C latency, Markov processor health |
| **VALIDATION NULL MODEL ONLY** | exponential significance decay `S(n)=S₀·λⁿ` — CF-005 explicitly bars it as the exploration rule |
| **DEFERRED / EXTENSION POINT** | universal uncertainty-propagation function `u(b)=g_Op(…)` |
| **UNSPECIFIED** | the nine capability classes (names, `capability_id`s); CF-001 as a formal ratified document |

---

## 3. Reconciliation matrix

Legend — **Compatible**: IS can be built to satisfy the CF requirement with no architectural
change. **Conflict**: CF requirement and current material/code point in different directions;
needs a ruling. **Missing**: CF requires something IS/current code does not yet provide.

Current code = the uncommitted `cfpathwaystore.js` (IS-4 substrate) + existing `inferFormation` /
`admitCrossDomainRelationship`.

### IS-1 — Concrete pathway representation (γ, ν_t storage/indexing)

| CF-002/CF-003 requirement | IS-1 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-003 §10 Pathway = **ordered processing history** (`events[]`, `current_state`, `relational_depth`, `structural_significance`) | γ must store an ordered event list, not just a lineage bag | **Missing** | current store keeps `lineage:[{batch,particle}]` — a per-domain bag, no `events[]`, no `current_state`, no RoutingEvent/ProcessingEvent refs | N (impl) — but IS-1 spec must adopt CF-003 §10 shape |
| CF-003 §11 pathway event types (`SIGNAL_RECEIVED`…`FORMATION_ADMITTED`…`EXPLORATION_TERMINATED/ESCALATED`) | γ events typed from this closed set | **Missing** | not represented at all today | N (impl) |
| CF-003 §14 `structural_significance` is **a data field; the algorithm belongs to CF-005** | ν_t stored as a field on γ; its update rule is not fixed by IS-1 | **Compatible** | current code puts the ν_t rule in the store itself — acceptable as experiment, but IS-1 must expose ν_t as a field and treat the rule as swappable policy | Y — the ν_t update rule (memory-decay + recency split) is a CF-005-level policy; needs Founder sign-off as policy, not contract |
| CF-003 §18 provenance additive; §21 Observation/Relationship/ProcessingEvent/RoutingEvent **immutable after admission** | γ append-only; corrections = successor objects | **Compatible** | current `reconstruct()` walks full memory, "never rewrite history" — aligns | N |
| CF-003 §22 derived state ≠ event history (must reconstruct current state FROM history) | `current_state`/`current_significance` are derived, not authoritative | **Compatible** | current `nuByDomain()` / `supportByDomain()` are derived accessors — aligns | N |
| CF-003 §26 + AI-6: **unit of analysis declared; route by capability not domain** | γ identity must not be "pathway == domain" | **Conflict** | current store is hard-keyed on the 6 domains (`SIX = {CAPITAL…}`, one pathway per domain). Fine for the kill experiment; **wrong as the IS-1 production identity model** | Y — Founder must confirm IS-1 identity axis (capability? subject? relationship-chain?) — cannot be "domain" |

### IS-2 — Transition semantics

| CF requirement | IS-2 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-004 §10 runtime state machine (`INGRESSED`→…→`EVALUATED`→`CONTINUE`/`TERMINATE`/`ESCALATE`) | permitted pathway state transitions defined against this | **Missing** | no pathway state machine exists; pathways only decay | N (impl) — adopt CF-004 §10 |
| CF-005 §9 revisit: `TERMINATED → REVISIT → ACTIVE`, **original termination event preserved** | revisit transition allowed; history not rewritten | **Compatible** | current `NU_MEMORY_FLOOR` eviction *deletes* a pathway — arguably loses the ability to revisit/record termination | Y — is hard eviction (delete) acceptable, or must an evicted pathway leave a `TERMINATED` tombstone for CF-005 §9 revisit? |
| CF-003 §21 immutability | transitions emit successor events, never mutate prior events | **Compatible** | aligns with current "never rewrite history" | N |

### IS-3 — Pathway identity (identical / equivalent / related / derived / independent)

| CF requirement | IS-3 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-003 §12 branching / convergence / parent-child (`CF-REQ-PATH-001/002/003`) | identity model must express branch (derived) and convergence (related) | **Missing** | current model: one flat pathway per domain, no branch/converge/parent-child | N (impl) |
| CF-005 §8 convergence is **evidence toward Formation, never auto-Formation**; two pathways hitting the same structure are *recognized*, not *merged* | "equivalent" pathways recorded as convergence, not collapsed | **Compatible** | not yet implemented, but no conflict; current code has nothing to merge | N |
| CF-002 §2 `processor_id` stable vs `instance_id` per-run | pathway identity ≠ processor instance identity | **Compatible** | orthogonal; current experiment has no processors | N |

### IS-4 — Pathway persistence (active / archived / retention)

| CF requirement | IS-4 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-005 §10 exploration budget = **resource controls, NOT epistemic claims about max useful depth** ("that distinction is mandatory") | retention gate must be a resource/eligibility control, not a significance cap | **Compatible** | uncommitted `SUPPORT_WINDOW` is exactly a recency/eligibility gate, explicitly *not* a significance cut — on contract | Y — `SUPPORT_WINDOW = 2` value needs Founder sign-off (a 4th param; empirically backed by the IS-4 re-run) |
| CF-003 §21–22 immutability + reconstruct from full history | archived pathways retained for reconstruction | **Compatible** | `reconstruct()` walks full memory including out-of-window particles — on contract | N |
| CF-005 §9 revisit possible from archive | archived ≠ destroyed | **Conflict (minor)** | `NU_MEMORY_FLOOR` eviction deletes the Map entry → cannot revisit, no termination record | Y — same ruling as IS-2 row 2 (tombstone vs delete) |
| Closed-loop spec: **CF must extend the existing Fabric, not create a parallel state architecture; Path Memory and Formation-driven perception stay distinct** | CF pathway store must not merge with `pathstore.js` (Path Memory = decision-emission→outcome) | **Compatible** | `cfpathwaystore.js` is a separate module; does not touch `pathstore.js` | Y — confirm the separation is intentional and permanent (naming collision: CF "pathway" ≠ KRYLO "Path Memory") |
| CF-002 §23 provenance boundary (`SOURCE→REMOTE→SIGNAL→FABRIC→CORE→DERIVED OBS→RELATIONSHIP→FORMATION` reconstructable) | persistence must not drop any link in this chain | **Missing** | current γ only holds `particle` lineage; no SOURCE/REMOTE/SIGNAL/routing links (experiment has no such objects) | N (impl) — required only when IS-1 gains the CF-003 event shape |

### IS-5 — ν_t ↔ RelationCore interface

| CF requirement | IS-5 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-002 §7 MUST-NOT: "manufacture a relationship without satisfying the applicable relationship contract" | ν_t/pathway state produces **candidate** relationships only | **Compatible** | uncommitted code routes `pathwayParticles()` → `inferFormation()` which calls `admitCrossDomainRelationship` (the KRYLO gate) — correct direction | N |
| CF-006 §5 / CF-009 §4: Fabric produces candidate; **KRYLO governance admits** | interface hands candidates to `admitCrossDomainRelationship` (15 ratified types), never bypasses | **Compatible** | existing `admitCrossDomainRelationship` stays authoritative | N |
| CF-003 §25 five semantic layers distinct (received / observed / admitted / traversed / formed) | interface must not collapse "traversed" (pathway) into "admitted" (relationship) | **Conflict (latent)** | the adversarial-probe failure was exactly this collapse — a persistent pathway ("traversed") was treated as current admitted structure. Fixed by the recency gate, but the *interface contract* must state the separation explicitly | Y — ratify that pathway support ≠ relationship admission input, as a named IS-5 invariant |
| **AI-1 / §19: capability produces the relationship; capability named on the candidate** | IS-5 candidate must carry which capability/attribution produced it | **Missing / blocked** | current code attributes by **domain**, not capability; and the nine capability classes are unnamed → the interface field cannot be typed | Y — **enumerate the 9 capability classes** (blocks IS-5, not IS-1…IS-4) |
| CF-003 §19 uncertainty types (source/observation/relationship/processing/formation), propagated not discarded | candidate relationship carries relationship-level uncertainty | **Missing** | ν_t carries no uncertainty today | N (impl) |

### IS-6 — pathway state ↔ admitted Relationships ↔ Formation governance interface

| CF requirement | IS-6 requirement | Class | Implementation consequence | Ratification required |
|---|---|---|---|---|
| CF-006 §2 pipeline (`OBSERVATIONS → ADMITTED REL → PATHWAYS → STRUCTURAL CONFIG → CANDIDATE → ADMISSION → FORMATION`) | IS-6 adopts this pipeline | **Compatible** | matches existing `inferFormation` flow; no change | N — adopt verbatim |
| CF-006 §7 / CF-003 §16: **every Formation identifies its contributing pathways** (Formation ← Pathways ← Processing, not Formation ← Graph) | Formation object carries `pathway_ids[]` back to γ | **Missing** | per memory, `inferFormation` edges are `co_presence` only; no pathway attribution on the formation | Y (impl-spec) — IS-6 must add pathway_ids to the formation candidate; confirm this doesn't disturb the ratified Formation-B boundary rules |
| CF-006 §8 evolution events (`CREATED/EXTENDED/CONTRADICTED/REVISED/DISSOLVED`), historical states reconstructable | IS-6 emits these events; supports `formation-revision` | **Compatible** | the kill experiment already models `formation-revision` (fracture-polarity flip same batch); event vocabulary not yet formalized | N (impl) |
| CF-006 §5: Fabric **SHALL NOT bypass Formation Admission** | IS-6 defers to KRYLO Formation governance | **Compatible** | existing `inferFormation` θ_D≥2 + ≥1 admitted cross-domain relationship rule stays the gate | N |
| CF-003 §17 Formation boundary is **data, not visualization** — "why these relationships, why not those" | IS-6 candidate carries an explicit boundary + rationale | **Missing** | not represented today | N (impl) |
| CF-009 §7: Non-Inference ≠ Information-Withholding (CLAUDE.md §21 constitutional) | IS-6 never withholds a substantiated formation because a guest might conclude something | **Compatible** | consistent with existing constitutional pass; no CF-specific change | N |

---

## 4. Cross-cutting conflicts (carry forward; do not resolve here)

| ID | Conflict | Rows affected | Needs |
|---|---|---|---|
| X1 | **RULED (0a).** KRYL-CF-001…006 govern; September stack is subordinate/candidate. Conflict is *centralized cognitive dispatch* + the missing CCP coherence-cluster model + "9 classes" ≈ rejected "Brain 1-9" — **not** capability matching itself. Namespace collision September CF-00x ↔ KRYL-CF-00x. | all routing rows; AI-4/AI-6/AI-7; IS-1/IS-5 | #2 artifact taxonomy + version |
| X2 | **RULED (0a).** νₜ = contract-level observable; algorithm = versioned policy component (CF-005 §2.1). Persisted νₜ needs `policy_version`+`input_reference`+`logical_time` (§2.2). memory/support/admission *separation* = invariant; shape = policy; λ/window/floor = params (deferred). New: CF-004-INV-006 Guest-Path Non-Interference + CF-004-MET-01 telemetry. | IS-1, IS-4 | — |
| X3 | **RULED (0a).** Pathway NOT keyed by domain; identity = structural lineage; domain = metadata. Many pathways/domain + cross-domain lineage required. Ordered typed event history REQUIRED by IS-1. Exact identity function defers to IS-1. Current `γ` = experimental fixture only. | IS-1, IS-3, IS-5 | exact identity function → IS-1 spec |
| X4 | **RULED (0a).** Tiered `ACTIVE→ARCHIVED→TOMBSTONED`; hard delete PROHIBITED as canonical; `REVISIT` event required, no silent resurrection; `NU_MEMORY_FLOOR` = tombstone threshold not delete; full in-memory retention OK for the bounded experiment, production compaction deferred. | IS-2, IS-4 | — |
| X5 | **RULED (0a).** CF-006 §5 FC-REQ-05: only pathway state *currently supported under the active support policy* may be admission evidence; historical/archived/tombstoned state SHALL NOT be, by itself. Acceptance = `persistent-strong-decoy` FP_CF=0, permanent. Doctrine cousin of §21. | IS-5 | — |
| X6 | **RULED (0a). CLOSED.** Nine-class framing ADOPTED as a capability *taxonomy* only (ontology cardinality ≠ infrastructure); KRYL-CF-004 Node Capability Registry = runtime authority; IS-5 field = stable `capability_id`. Follow-on: enumerate the nine (Founder) — gates IS-5, not IS-4. | IS-5, IS-6 | enumerate the nine `capability_id`s |
| X7 | **SUBSUMED by #2.** September CF-002 is candidate-only; CON-05 carries no authority. | — | — |
| X8 | **RESOLVED by implication.** X3 makes pathway identity = structural lineage, categorically distinct from `pathstore.js` decision→outcome Path Memory; `cfpathwaystore.js` stays a separate module. | IS-4, IS-6 | — |

---

## 5. Verdict on the uncommitted IS-4 code (post-rulings)

**Correct *direction*; does not yet satisfy the ruled contract. Cannot be committed as canonical.**

| Ruling | Requirement | Current `cfpathwaystore.js` | Gap |
|---|---|---|---|
| X3 | pathway identity = structural lineage; NOT domain-keyed; ordered typed event history | `_pathways: Map<domain, {domain,nu,lastCorroboratedBatch,lineage[]}>` — one entry per canonical domain; `lineage` is a `{batch,particle}` bag | **wrong identity axis**; no `events[]`, no `current_state`, no typed event vocab |
| X4 | tiered `ACTIVE→ARCHIVED→TOMBSTONED`; hard delete prohibited; `REVISIT` events | `if (pw.nu < NU_MEMORY_FLOOR && !corroboration.has(d)) _pathways.delete(d)` | **hard delete**; no tiers, no termination event, no REVISIT |
| X2 | νₜ = observable; DEF-05-04 provenance (`policy_version`+`input_reference`+`logical_time`) | `nu` is a bare scalar; the update rule is inlined in the store | no provenance; rule not extracted as a versioned policy component |
| X5 | FC-REQ-05 — only currently-supported state feeds admission | `pathwayParticles()` already filters to `currentlySupported()` + in-window lineage | **satisfied** — this is the one part that lands |
| INV-006 | analytics never a synchronous guest-path prerequisite | offline harness only; no guest path involved | N/A for the experiment; a production constraint |

**What lands:** the memory ≠ support ≠ admission *separation* (now an invariant per X2), and the
current-support gate (X5 / FC-REQ-05). That was the correct response to `persistent-strong-decoy`.

**What does not:** the identity model (X3), the lifecycle (X4), and νₜ provenance (X2 DEF-05-04).

**Path to a commit — two options:**
- **(a) Rework** `cfpathwaystore.js` to lineage-keyed identity + tiered lifecycle + νₜ provenance,
  against the IS-1 spec (which must be authored first — exact identity function).
- **(b) Designate the current code experiment-fixture-only** (explicit header + rename, e.g.
  `cfpathwaystore.experiment.js` / a `FIXTURE:` banner), keep it for the bounded kill-experiment
  re-run, and spec + build the IS-4 canonical implementation separately.

Either way: **do not commit the current diff as an IS-4 implementation.** The kill-experiment
re-run (FP_CF=0 on `persistent-strong-decoy`, V_CF=1.0 on `multi-event`) still gates any
experiment-fixture commit, and `qa_cf_kill_experiment.mjs` has not been verified as updated.

---

## 6. Ratified decision order (Founder, 2026-09-02)

1. **X1 — Constitutional authority. [RULED — see 0a]** KRYL-CF-001…006 govern; September stack
   subordinate/candidate; namespace collision recorded.
2. **Artifact taxonomy + version. [RULED — see 0a]** September stack reparented under
   KRYL-CF-001; bare `CF-00x` non-authoritative; splits into ≥3 subordinate artifacts (numbering
   deferred); neither v0.2 nor v0.3 corrections canonical — both candidate material.
3. **X3 — pathway identity axis. [RULED — see 0a]** Not domain-keyed; identity = structural
   lineage; domain = metadata; ordered typed event history REQUIRED by IS-1; exact identity
   function defers to IS-1; current `γ` = experimental fixture only.
4. **X4 — termination semantics. [RULED — see 0a]** Tiered `ACTIVE→ARCHIVED→TOMBSTONED`; hard
   delete prohibited as canonical; `REVISIT` event required; `NU_MEMORY_FLOOR` = tombstone
   threshold; production compaction deferred.
5. **X2 + X5. [RULED — see 0a]** 7-delta patch set (➊–➐) to candidate CF-004/005/006: νₜ =
   contract-level observable + versioned-policy algorithm + provenance; FC-REQ-05 current-support-
   only admission; CF-004-INV-006 Guest-Path Non-Interference; CF-004-MET-01 telemetry.
6. **X6 — nine capability classes. [RULED — see 0a] CLOSED.** ADOPT as a capability *taxonomy*
   only (ontology cardinality, not infrastructure); KRYL-CF-004 Node Capability Registry is the
   runtime authority; IS-5 field = stable `capability_id`. Follow-on: enumerate the nine
   `capability_id`s (Founder authoring) — gates IS-5, not IS-4.

### Architectural reconciliation COMPLETE. Remaining work:

7. **#2 artifact-taxonomy extraction** (can run in parallel) — renumber September stack into
   subordinate specs under KRYL-CF-001; author the CF-005-equivalent significance-policy spec;
   author the **IS-1 spec** (exact identity function — X3 deferred this).
8. **Parameters** — `COST_BUDGET_RATIO`, `RELEASE_COST` / frontier weight, ν_t policy values
   (`λ`, `SUPPORT_WINDOW`, `NU_MEMORY_FLOOR`). After IS-1.
9. **IS-4** — per §5: rework against IS-1/X3/X4/X2, **or** designate the current code
   experiment-fixture-only + spec the canonical implementation separately. Kill-experiment re-run
   (FP_CF=0 decoy, V_CF=1.0 multi-event) gates any fixture commit.
10. **Nine-class enumeration** — before IS-5.

---

## 7. Not verified in this pass

- CF-001 (either version) read in full — only as referenced/summarized and via KRYLCF-1/2 body.
- `qa_cf_kill_experiment.mjs` current contents / whether the decoy assertion was added.
- CF-004…CF-010 cross-checked only for IS-relevant sections, not line-by-line.
- KRYLCF-3…6 bodies (headers only).
- Whether `admitCrossDomainRelationship` / `inferFormation` signatures still match memory's
  description (memory is 4–9 days old).
