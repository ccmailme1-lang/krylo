# DISCOVERY — Cognitive Fabric & Formation Frontier vs. Existing KRYLO

**Purpose:** Prior-art / overlap discovery for `SPEC — Cognitive Fabric & Formation
Frontier` (v0.2, 2026-08-31), satisfying that spec's own §35 research gate. Answers:
what in the CF spec already exists in KRYLO, what is a rename/formalization, what is
genuinely new, and where the names collide.

**Method (from `SPEC-the-evolution-built-vs-vision.md`):** three tiers —
**1 Implemented** (production code, live-demonstrable) · **2 Architecturally
decomposed** (a real enabling primitive exists; the composed capability does not) ·
**3 Research / vision** (prose/doctrine only). Checked by grep + direct file read,
2026-08-31. "Module wired into infra" ≠ "actively scheduled/executed."

**First pass.** Not yet read: the 3 Cognitive Mesh specs (KRYL-1136 v0.4,
KRYL-CF-006A), RFA (KRYL-1066), `structuralintegrity.js`, `rfa-integration-closure-
spine.md`, CEPH-001. A v2 of this doc should fold those in.

---

## 1. The "Fabric" lineage — five iterations, one name

KRYLO has proposed a distributed-cognition / fabric architecture **five times**. The
CF v0.2 spec is the fifth and does not reference the first four.

| # | Artifact | Date | Framing | State |
|---|---|---|---|---|
| 1 | **RFA** — Reasoning Fabric Architecture (`KRYL-1066`) | 2026-07 | reasoning fabric over the surface layer | doctrine; `rfa-integration-closure-spine.md` exists |
| 2 | **KRYLCF-1..6** (`specs/KRYLCF-1-through-6-canonical.md`) | 2026-07-29 | distributed **cognitive NODES** + Cognitive Coherence Protocol (CCP / CCS) + Edge Arbitration Protocol (EAP) + Structural Integrity Layer (SIL v0.2) | all 6 tickets "To Do". Code built (`6e1c067` + 4) then **removed as unreviewed agent work** (`e62c184`, 2026-08-04), deferred pending a meeting "that has since passed" |
| 3 | **Cognitive Mesh** (`SPEC-cognitive-mesh-*`, `KRYL-1136` v0.4) | 2026-08-02 | Cognitive Primitive (CP), primitive doctrine + relationship-topology model | **FROZEN for reconciliation**; `KRYL-CF-006A` (boundary reconciliation) never written; "nothing here authorizes implementation" |
| 4 | **Closed-Loop Observation** (`SPEC-closed-loop-observation-architecture.md`, `KRYL-1202/1203/1204`) | 2026-08-27 | percept → observation affordance → request → targeted invocation → EAG/SIL admission → `inferFormation()` → ↺ | **BUILT — FINAL GATE GO.** Explicitly a *transitional* architecture routed **around** the not-yet-built CF; "v1 KRYLCF Compatibility Rule": MUST NOT introduce components named Structural Integrity / Cognitive Fabric to simulate absent KRYLCF layers |
| 5 | **Cognitive Fabric & Formation Frontier** (this spec) | 2026-08-31 | persistent **attributed pathways** `γ` + **pathway measure** `ν_t` + heterogeneous **capabilities** `C_i` + **Formation Frontier** + Remote Processing | DRAFT — NEEDS-SPEC |

**Key finding — iteration 5 diverges sharply from iteration 2 (same name "Cognitive
Fabric"):**

| KRYLCF-1..6 (iter 2) | CF v0.2 (iter 5) |
|---|---|
| unit = **cognitive node** (domain-interpretation agent) | unit = **attributed pathway** `γ` (computational lineage) |
| **Cognitive Coherence Protocol** — CCS, minimum coherent cluster, dormancy | *absent* — no CCP, no CCS, no clusters, no dormancy |
| **Edge Arbitration Protocol** — "NO under constraint X" | *absent* — no EAP |
| **SIL** = truth/provenance authority, "observes only finished artifacts" | SIL kept as an integration point (§26) but not elaborated; provenance is a fabric-wide invariant instead |
| doctrine: **Evidence → Structural Integrity → Cognitive Fabric → Action** | doctrine: **Observation → Capability → Pathway → Relationship → Formation → Frontier → Remote → ↺** |
| examples: hotel / guest-service nodes | examples: Formation discovery / continuation |
| "no Brain Router" anti-pattern | frontier-directed capability routing (arguably a bounded router by frontier condition) |

CF v0.2 is **not** a refinement of KRYLCF-1..6 — it replaces the node/coherence/
arbitration model with a pathway/measure/frontier model. This should be an explicit
Founder decision, not an implicit supersession.

---

## 2. CF v0.2 concept → existing KRYLO artifact

| CF spec element | KRYLO artifact | Tier | Verdict |
|---|---|---|---|
| **Observation space** `O_t = (x,d,s,τ,p,a)` (§4) | `signalfacet.js` (KRYL-1052) — full contract: provenance / lineage / `source_set_hash` / repro / normalized unit. `dispatchBatch` event `{source,domain,signal,confidence,ts}` (§16). `buildQueryContext` (KRYL-1221). Domain set D = KRYLO's canonical 6, verbatim. | **1** | rename — this IS the signal-facet + connector-event contract |
| **Processing capability** `C_i: X_i → R_i` (§5), paradigm-agnostic | ~34 connectors; `facetproducers/*.js`; `domainsignalresolution.js` `EVIDENCE_FACET_SOURCES` registry + `resolveClassEMeasure` seam; `WIRED_PRODUCERS` (empty) | **2** | the producer/connector model exists; a unified version-tagged `C_i` abstraction with declared input space does not |
| **Attributed pathway** `γ` (§6) — persistent cross-capability lineage, reconstructable | `signalgenealogy.js` (signal derivation); provenance chains on facets; `EventEnvelope` fossilization (WO-1700, append-only); `CanonicalEvent` (WO-2004, immutable); `whytraceresolver.js` / WhyTracePanel | **2 → 3** | **the genuinely new primitive.** Genealogy + provenance chains exist, but "pathway as a first-class persistent object spanning heterogeneous capabilities" is not built |
| **Pathway measure** `ν_t ∈ M_+(Γ)` (§7) | `_pool` (dispatched-signal pool, cap 200); `computeDomainPressure` magnitude; `domainmetricsstore.js` `recordMetricsSnapshot`; domain-pressure field | **3** | a formal positive measure over pathways does not exist; the domain-pressure field is a crude endpoint analog (which §7 explicitly warns against — "not endpoint embeddings alone") |
| **Fabric transition** `ν_{t+Δt} = Φ(...)` (§8) | `surfacerouter.js` `dispatchBatch()` bus; backpressure (`setBackpressure`, KRYL-1196 incident — built, ~0 real callers); `convergenceclassifier.js` | **2** | event-driven state evolution exists; a governed transition operator does not |
| **Relationship admission** `R_t = A_R(ν_t)`; `ν_t(x,y)>0 ⇏ R(x,y)` (§9) | `admitCrossDomainRelationship(a,b)` + `CROSS_DOMAIN_RELATIONSHIPS` (15 ratified closed-set types) in `domainintelligence.js` (WO-3, `441cfa6`); `relationontology.js` (14 semantic types — orthogonal); `relationtopology.js`; `subjectrelationships.js` (5B-3a, `__quarantined`); EAG/EAC1-EAC5 (`evidenceadmissiongate.js`, `SPEC-evidence-admission-gate.md` RATIFIED) | **1** | this IS RelationCore + the EAG. CF-I2 ("pathway ≠ relationship") = existing contract |
| **Formation admission** `F_t = A_F(R_t, ν_t)`; θ_P/θ_T/θ_D/θ_I/θ_K (§10) | `formationinference.js` `inferFormation` / `buildGraph`; `formationrelationship.js`; the rule "≥2 domains + ≥1 admitted cross-domain relationship" (targetpacket.jsx `NO_FORMATION_ESTABLISHED`, KRYL-1235) = θ_D≥2, ≥1 relationship. `formationintegrity.js`, `structuralintegrity.js`, `formationschema.js`. Multiplicative Decision Emission Score (CLAUDE.md §14) ↔ §10 "MUST NOT be unconstrained coherence maximization" | **1** | this IS the Formation contract. Thresholds partly implicit, need explicit parameterization |
| **Formation record** `Rec(F_t, ν_t)`; LIVE `ν_t` vs PERSISTENT `Rec(F)` (§11) | `rkmstore.js` (RKM); `EventEnvelope` (append-only); `CanonicalEvent` (immutable, no-deletion); replay/live phase boundary (LOCKED); `identitykernel.js` FRAGMENTED-status pattern; `mergeEntity` never deletes | **2** | append-only history + live/replay separation exist; not unified as `Rec(F)` + `ν_t`, and "Formation Record" as a named durable object with revision/frontier history is not built |
| **Formation revision** UNCHANGED/EXTENDED/REVISED/WEAKENED/SPLIT/MERGED/TERMINATED (§12) | `identitydynamics.js` `computeTruthDynamics`; RBCS causal branching (`rbcsengine.js`, WO-2055 — Maturity A/Verification R for CI-F→CI-R→RBCS, but 100% of live branches classify DISCARD — data too thin); CI-R "constitutional court" (`cirgate.js`); RFA/Closure fabric | **2** | revision *mechanisms* exist (RBCS branching, closure); the 7-outcome revision vocabulary + lineage `F_old → Frontier → Task → … → F_new` is new |
| **Formation Frontier** `FF = S∧G∧R∧T∧P` (§13-16); 8 typed reason codes; Fringe = observation condition not ontology | `observationaffordanceengine.js` (KRYL-1202) — Observation Affordance derived from unresolved percept conditions. **Built, ZERO production callers** (confirmed 6× in Bottle Tests). Packet `04 ATTENTION` / `06 SHARPEN` sections = stubbed frontier ("directed re-observation not yet wired"). `completionchips.js` (KRYL-1222 "COMPLETE THE PICTURE"). `frameanchoring.jsx` (KRYL-1236 — the anchors that would resolve a frame). `missingInputs` / KRYL-1218. Absence-Is-Signal → CF-I5 typed absence. `voidclassifier.js` (WO-1854, Structural Void — real, unscheduled) | **2** | the concept is everywhere in prose + one unwired engine; the formal 5-condition gate + reason codes + the wiring do not exist. This + `ν_t` is the bulk of the real work |
| **Frontier Task** `Task_F = Ψ(F,∂F,Q,K)` — executable observation request (§17) | `SPEC-closed-loop-observation-architecture.md` §2 `TargetSpec` (`target_entities` / `target_domains` / `target_relationships` / `target_sources` / `target_time_window`) — **spec'd, part of KRYL-1204**; `SPEC-targeted-connector-adapter.md` NEEDS-SPEC (connector set + field→param mapping still Founder calls) | **2** | `TargetSpec` is a direct match for `Task_F`'s target/domain/temporal/source fields; the full 10-field task contract + budget + termination condition is not complete |
| **Remote processing** `C_r: Task_F → ΔΓ`; never produces Formation directly (§18, §22) | KRYL-1204 "TARGETED INVOCATION" — `secownershipconnector.js` `runTargetedOwnershipObservation()`, real EDGAR call, `evidence_class: 'CATEGORICAL_PRESENCE'`; `observationorchestrator.js` `isAvailable/planFor` (`CAPABILITY_REGISTRY` with `value_validators`); `admissionengine.js` | **1 (scoped)** | a working targeted-remote-observation path exists for exactly one connector; "heterogeneous capability directed at a frontier" is the generalization |
| **Closed fabric loop** — "closed through state, not prediction" (§19, §37) | Closed-Loop Leverage Principle (CLAUDE.md §15); `SPEC-closed-loop-observation-architecture.md` v1 loop (BUILT, GO); KRYL-1202/1203/1204 chain (`project_kryl1202_formation_closed_loop_chain.md`); the "closed-loop analytical bridge (KRYL-1220)" the packet keeps citing as unwired | **1 (v1) / 2 (full)** | the v1 loop is built and gated GO. The full loop with `ν_t` + formal Frontier is not |
| **Memory / Scope** `Scope(ν_T, q)` — "Capture once → scope repeatedly → synthesize afterward" (§20) | **Verbatim** the Frozen Architecture v0.2.2 principle (`SPEC-structural-domain-substrate-architecture.md`, `2acacf3`). `subjectScope`, `A(d, Subject)`, all of WO-5B; `session.queryContext` built once; this session's `canonicalBriefSubject` shared seam | **1** | same sentence, already the governing principle |
| **Provenance invariant** `F → R → γ → o → source` (§6, §21) | CLAUDE.md §1 / §2 (Shared Data Change Gate); `source_set_hash`; `signalfacet` provenance; `whytraceresolver`; KRYL-1125 provenance export gate; `checkIndependence`; Data Tap exit criterion (`feedback_data_taps_exit_criterion.md`) | **1** | core KRYLO discipline. CF-I6 = §1 |
| **Invariants CF-I1..I7** | CF-I1 (Formation is THE analytical object) = integration-contract doctrine ("panels ARE the I_d fields", "Formation-after-six"). CF-I5 (typed absence) = Absence-Is-Signal + this session's `absenceClass: STRUCTURAL`. CF-I7 (no parallel authoritative state) = §2 "no second state store". | **1 (as principles)** | already ratified; CF just names them |
| **Kill criteria + material-advantage experiment** (§29-33) | "Falsification not design mode" doctrine (`feedback_falsification_not_design_mode.md`); the Bottle Test (CLAUDE.md §10); "no evidence found, remove it"; H1-H7 open in the Metrics Truth Engine | **1 (as posture)** | the discipline exists; the specific CF experiment harness (§30, IS-12) does not |
| **No-result semantics** (§24) — NO_DATA / SOURCE_UNAVAILABLE / INSUFFICIENT_COVERAGE / OBSERVED_ABSENCE / … distinguishable | this session's `DATA UNAVAILABLE · SOURCE REQUIRED` + `absenceClass` + KRYL-1246 SUBJECT/FIELD scope labels; EAG's ADMITTED/INSUFFICIENT/WITHHELD `deriveTerminalState()`; DEF-1240 typed adjudication outcomes | **1** | already the surface-honesty contract |

---

## 3. Naming collisions (must be resolved before implementation)

| CF term | Collides with | Nature |
|---|---|---|
| **Pathway** / Path Memory | `pathstore.js` Path Memory (`logEmission`/`logOutcome`/`getLRPrior`) = **decision-emission → outcome** memory. CF's "pathway" = **computational-traversal lineage**. CF-I2 guards relationship≠pathway; it does not guard against this. | different objects, same word — high confusion risk |
| **Cognitive Fabric** | KRYLCF-1..6 (nodes/CCP/EAP), Cognitive Mesh (CP). Three different architectures. | supersession must be explicit |
| **Structural Integrity Layer / SIL** | KRYLCF's SIL v0.2 (truth authority, "observes only finished artifacts"). `structuralintegrity.js`, `formationintegrity.js`. Also `SPEC-evidence-admission-gate.md` §21 notes *two unrelated things* already share "Structural Integrity Layer / SIL v0.2". | already an overloaded name before CF |
| **Frontier** | `WO-1309-dynamic-frontier-waveforms.md`, `WO-1802-contrarian-frontier-synth.md`, the `CONTRARIAN_FRONTIER` synthesis domain (Thiel Protocol). | unrelated meaning |
| **Fabric** | RFA "Reasoning Fabric", `temporal-observation-fabric-spec.md`, RFA closure spine. | lineage, arguably OK |
| **Capability** | `observationorchestrator.js` `CAPABILITY_REGISTRY` (already exists, connector-target capabilities). KRYLCF CCP's "Node Capability Registry". | CF's `C_i` should reuse or explicitly redefine |

---

## 4. Genuinely new in CF v0.2

1. **Attributed Pathway `γ` as a first-class persistent object** spanning heterogeneous
   capabilities — with capability id/version, intermediate representation, and
   admission state per transition. Nothing in KRYLO persists this today.
2. **Pathway Measure `ν_t ∈ M_+(Γ)`** — a formal positive measure over pathways
   (existence / recurrence / persistence / relevance / cross-domain traversal),
   explicitly *not* reducible to endpoint embeddings. This is the load-bearing new
   idea and the least specified (IS-1).
3. **Formation Frontier as a formally gated object** — `FF = S∧G∧R∧T∧P` conjunction
   + 8 typed reason codes, finer than KRYL-1202's Observation Affordance and
   actually wired (KRYL-1202's engine has zero callers).
4. **Heterogeneous capability orchestration** — `C_i` paradigm-agnostic
   (JEPA / GNN / reservoir / retrieval / agents as interchangeable capability
   nodes). KRYL-1204 is EDGAR-connector-specific.
5. **LIVE `ν_t` vs PERSISTENT `Rec(F)` as a normative distinction** — the
   replay/live boundary exists but is not framed as two named substrates with
   revision/frontier history on the Record.
6. **The material-advantage experiment (§30-33) as the retention gate** — Cases
   1 / 2 / 3A / 3B with FP/Recall requirements; kill criteria §33. New rigor
   framing for whether the layer earns its existence.

---

## 5. The §35 question, restated

> Does the specific combination of **persistent attributed pathway state** +
> **governed Formation capture** + **Formation Frontier detection** +
> **frontier-directed heterogeneous processing** provide material capability not
> supplied by the constituent primitives alone?

**Current honest position:** Of the four, KRYLO already has governed Formation
capture (Tier 1) and, at v1 scope, frontier-directed processing (Tier 1, one
connector). It has Frontier detection at Tier 2 (one unwired engine + prose). It
has **nothing** of persistent attributed pathway state (`γ` / `ν_t`) — Tier 3.

So the CF spec's material claim rests almost entirely on the one component KRYLO has
not built and has least specified. The experiment (§30) is therefore the right gate:
build a minimal `γ` / `ν_t` + wire the existing Observation Affordance engine + run
Case 3A against the existing v1 loop as baseline. If pathway persistence + frontier
detection beats the v1 closed loop on Recall at equal FP and equal budget, CF earns
its place. If not — per §33 kill-criterion 8 — it is "an alternate implementation of
existing KRYLO components without architectural benefit."

---

## 6. Recommended next steps

1. **Founder decision:** CF v0.2 supersedes KRYLCF-1..6 (drop CCP / EAP / node
   model) — yes/no. If yes, KRYLCF-1..6 tickets close as superseded and the
   `KRYLCF` Jira project is retired or repurposed.
2. **Reconcile with the built v1 loop:** CF v0.2 §26 says it integrates with, not
   replaces, KRYL-1202/1203/1204. Confirm the mapping in §2 above is the intended
   integration (Observation Affordance → Frontier; TargetSpec → `Task_F`; targeted
   invocation → `C_r`; EAG → `A_R`; `inferFormation` → `A_F`).
3. **v2 of this discovery:** fold in the 3 Cognitive Mesh specs, RFA (KRYL-1066),
   `structuralintegrity.js`, CEPH-001.
4. **Name the collisions out** (§3) before any code — especially Path Memory vs
   pathway.
5. **Scope IS-1 (`γ` / `ν_t` representation) as the first NEEDS-SPEC** — everything
   downstream depends on it, and it is the only genuinely new primitive.

---

## Appendix — JEPA

The CF spec's own tail (and §34 Non-Goals) settle it: **JEPA is not the Fabric.**
It is one candidate Processing Capability `C_i` (§5). §34 lists "implementation of
JEPA" as a Fabric-level Non-Goal. Where it might specifically earn a place: a
JEPA-like capability operating on the *known context around a Frontier gap* to
produce a latent representation of what is structurally compatible — which then
**still requires new observation → canonical admission** before touching a
Relationship (evidence doctrine preserved). That is a capability-level research
question (§35 item 7), gated by the same material-advantage experiment: does a
JEPA-like `C_i` improve Frontier resolution vs. the same Fabric without it.

Founder ruling 2026-08-31: the earlier "disregard the we-don't-predict guardrail"
was **retracted same session ("no override")**. "We detect, we don't predict"
stands; the CF spec agrees throughout.
