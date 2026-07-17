# RFA Integration — the Abduce → Close → Deduce → Argue → Stamp → Heal loop

**Codename: "Steve Alston."** The through-line doc: how KRYL-1066–1072 stop being seven tickets and
become one reasoning organism, with **closure as the spine** that joins open abduction to exact
deduction. Status: DRAFT for Founder ratification. No build authorized by this doc alone.

---

## 0. The claim

The three reasoning traditions are not rivals — they are organs at different points of ONE loop:

| Tradition | Role in the loop |
|---|---|
| **Model-Based causal reasoning** (mental models of bi-directional deterministic rules) | the **substrate** — the C↔E rules, runnable forward (deduction) and backward (abduction) |
| **Probabilistic / Bayesian abduction** (P(C\|E) ∝ P(E\|C)·P(C)) | the **generator** — ranks candidate causes for an observation |
| **Causal / Evidential argumentation** (blend deduction+abduction, weigh reliability, build evidence chains) | the **weigher** — scores the survivors into a ranked chain |

What was missing was never the parts. It was the name of the connective tissue — **closure** — and
the recognition that two RFA tickets already ARE it (Constraint Fabric = closure-scoping; EDL =
closure-deduction).

## 1. Closure — the spine (formal)

Clark completion takes the rules `E ← C₁ … E ← Cₙ` and closes them:
**E ↔ (C₁ ∨ … ∨ Cₙ)** plus the closed-world assumption (nothing else derives E → ¬E).
This upgrades `C → E` (sufficient) to `E iff C` (necessary AND sufficient), and it is exactly the
paper's fn-2 cause definition ("y disappears in absence of x, appears in presence of x") stated
logically. Two consequences that drive the whole architecture:

- **Closure converts abduction's backward guess into deduction.** Under E↔C the contrapositive
  **¬E ⊢ ¬C** is a valid deduction — the *necessity* direction, observationally, without do().
  It tames abduction's non-monotonicity: "best explanation" becomes elimination.
- **A closure violation is a discovery.** E fires with none of the enumerated causes ⇒ the closed
  world was incomplete ⇒ §22 anomalous absence ⇒ **a new cause exists.** The limitation and the
  discovery engine are the same mechanism.

## 2. The loop (stages → RFA tickets → doctrine)

```
observe → ABDUCE → CLOSE → DEDUCE → ARGUE → STAMP → detect-break → (abduce again)
```

- **Substrate — bi-directional rules.** Relation engine / causalMap / SCE output. One model, two
  directions (Thórisson & Talbot 2018). Registry: **KRYL-1067 (RLR)** governs which engines enter.
- **Stage 1 — ABDUCE (generate).** Observation E → ranked candidate causes (Bayesian priors,
  RBCS-style). Open, provisional, non-monotonic. → **KRYL-1069 (AR)**. §11a: ranking is
  retrospective evidence weight, never a forecast.
- **Stage 2 — CLOSE (bound).** Complete the candidate disjunction *within a bounded domain*:
  E ↔ ∨Cᵢ. The domain walls ARE the constraints — POWER_CAP, CAPEX, PERMIT, LABOR. →
  **KRYL-1070 (Constraint Fabric) = closure-scoping.**
- **Stage 3 — DEDUCE (prune).** Forward (C ⟹ expected structure) + backward contrapositive
  (¬E ⊢ ¬C). Kill candidates that fail the absence test. → **KRYL-1071 (EDL)** — "absence test
  only, NO predictions" = negation-as-failure = closure-deduction.
- **Stage 4 — ARGUE (weigh).** Blend deductive support + abductive plausibility, weighted by source
  reliability, into a ranked evidence chain. → modality weighting **KRYL-977**, **KRYL-1044 (EDGE)**,
  packaged by **KRYL-987 (DTL)**. §21 route-don't-aggregate: weigh chains, don't pre-blend.
- **Stage 5 — STAMP (label).** Every edge: mode (abduction/deduction/induction, asymmetry-weighted)
  + ladder status + groundedness. Two orthogonal axes (§23). → `causal-epistemic-stamp-spec.md`.
- **Stage 6 — HEAL (close the loop).** Watch every asserted iff; a violation feeds a fresh abduction
  target. → **KRYL-1072 (ADCL)** "repair, don't just reject" + **KRYL-1068 (RDG)** versioned AR↔EDL
  refinement (a refinement loop, NOT an execution cycle). §19 closed-loop; living-organism vision.

**KRYL-1066 (RFA Epic)** is this whole tier.

## 3. The survival ladder gains a rung (CLOSED)

From `causal-epistemic-stamp-spec.md`, extended:
- **PROJECTED** — hypothesized (open, sufficient-only).
- **CORROBORATED** — invariance holds on the record (E↔C observationally), CWA unverified.
- **CLOSED** — completeness justified within a bounded domain (Constraint Fabric walls) ⇒ assert
  E↔C ⇒ backward inference is deduction ⇒ closure-violation detector armed. Obtained observationally,
  no intervention.
- **CONFIRMED** — survived intervention (do-calculus). STUBBED — KRYLO is a pure observer.

CLOSED is the rung that does the real epistemic work — and it is reachable now, *scoped*.

## 4. Boundary (non-negotiable)

Closure's power is entirely borrowed from the closed-world assumption, and KRYLO's real world is
open (unobservable variables always present — the paper's own premise). Therefore:
- Every closure is **domain-scoped and revocable** — asserted only where Constraint Fabric can
  justify completeness. Assert it wider and you fabricate (deduce ¬C from ¬E when an unseen C′ did it).
- The **completeness claim is itself evidence-gated** — closure is a first-class object with its own
  groundedness, not a free assumption.
- The **violation detector is mandatory** — it is what makes a scoped closure safe: the instant the
  bet is wrong it says so AND surfaces the new cause. No silent closures.

## 5. Definition of Done (integration-level)

- Each of KRYL-1067–1072 carries, in its own contract, which loop stage it is and its closure role.
- RLR manifest fields extended: `closureScope` + `epistemicStatus` required per engine.
- CI enforces: AR↔EDL is a *versioned refinement* loop, never an execution cycle; no engine asserts
  CLOSED without a Constraint-Fabric completeness justification; no CONFIRMED path exists (stubbed).
- The closure-violation detector is wired to the §22 absence pipeline (a break emits an
  anomalous-absence event, not a log line).
- Sibling docs stay in their lanes: this = the loop (how engines plug in); the stamp spec = the skin
  (how edges are labeled). Neither re-implements the other.

## 5b. Formal contract, the three freezes, and one rejected property

**IP thesis (one sentence):** *Closure is the reversible boundary condition that converts abductive
possibility into deductive testability while preserving open-world discovery through violation
recovery.* This is why the system collapses into neither a prediction engine nor a static knowledge
graph — it is a self-repairing causal-perception fabric.

**Operator sketch** (Σ = open-world hypothesis space, O = observation):
```
α abduce   H0 = α(O) ⊆ Σ            candidates, all PROJECTED
κ close     H1 = κ(H0 | B)           B = Constraint-Fabric boundary; H1 finite, decidable
δ deduce    H2 ⊆ H1                  survivors: forward-consistent AND pass the absence test
ω argue     H3 = ω(H2, Evid)         ranked lattice, lineage preserved (no scalar collapse, §21)
ε stamp     H4 = ε(H3)               {(h, mode, status)} — two orthogonal axes (§23)
violation   ∀h∈H4 status ∉ {CORROBORATED,CLOSED,CONFIRMED} ⇒ κ broken ⇒ re-abduce over Σ′
```

**REJECTED property — monotonicity.** An external audit claimed the pipeline is monotone in
information gain ("status can only rise, never fall, until κ is violated"). **False, and harmful if
built.** Abduction is non-monotonic; the absence test (§22 / EDL) exists precisely to *demote*.
- **Append-only:** the closure boundary and provenance. These never mutate; they version.
- **Revisable DOWNWARD:** hypothesis *status*. A later failed absence/deduction test must be able to
  knock CORROBORATED (or CLOSED) back down. A monotone-up ladder cannot self-correct — it only
  accretes — which is the opposite of a healing organism.

**The three freezes (spec must nail before organ-by-organ build):**
1. **Versioned closure boundaries.** Every κ carries `κ_id` (UUID + timestamp); every downstream
   artifact carries the `κ_id` it was reasoned under, so a boundary shift is a diff/merge, not a
   silent overwrite. (Realizes "scoped + revocable"; sits on the existing `ProvenanceDAG`.)
2. **Immutable evidence addressing.** Evidence items get content-hash addresses so lineage survives
   repeated κ-revisions in constant time. **Reuse `src/engine/identitykernel.js` FNV-1a — do not
   invent a new hasher.**
3. **Absence as an explicit predicate.** "Expected but missing" evidence is a first-class token
   (`⟂_expected`), never NULL — closed-world negation, computable, not a nullity. This is §22 made
   executable and is what makes EDL solvable.

**Deduction correctness note.** δ keeps a candidate on positive support AND on the absence test read
correctly: expected-evidence *absent* WEAKENS the candidate (diagnostic), it does not gate survival
on expected-evidence *present*. (Corrects the audit's inverted `¬(¬O_expected)`.)

**FENCED — storage vendor.** The property-graph *model* (nodes = observations|hypotheses; edges =
supports|refutes|expects_absent) is adopted as a conceptual shape. A property-graph *database*
(Neo4j et al.) is NOT — that is heavy infra of the same class already deferred in KRYL-1043. KRYLO
reasons in-JS today; the DB decision is out of scope for this spec.

**Scheduling.** Stages form a dependency DAG (→ RDG, KRYL-1068) and may run in parallel on
*dependency* order. Do NOT justify parallelism via monotonicity (rejected above); justify it via the
partial order alone.

**Properties adopted (sound):**
- **Idempotence within a cycle:** κ∘α is idempotent given no new information — re-closing the same
  candidate set over the same boundary yields the same H1. (Prevents boundary churn.)
- **Reversibility (retractable morphism Σ ⇄ L):** a closure can be retracted and the boundary
  reopened *without losing provenance* — this is the formal statement of "reversible reasoning" and
  is exactly what makes violation-recovery (Stage 6) non-destructive rather than a model wipe.

**Illustrative, NON-BINDING** (shape only; not a committed interface): observe → `{κ_id, H0_id}`;
hypothesis fetch → `{mode, status, provenance}`; closure violation → spawns a new abduction over Σ′.
Node/edge model: nodes = {observation, hypothesis}; edges = {supports, refutes, expects_absent}.
Concrete API + persistence are deferred to build-time WOs, not frozen here.

## 5c. What we pull from the advanced causal theories (and what we refuse)

The point of surveying SCM / ALP / Mental Models / Integrated Causal-Evidential is NOT to add a
fifth engine. It is to stop inventing and instantiate known, solver-backed formalisms — with
KRYLO's epistemic-groundedness discipline as the skin those frameworks lack.

- **ALP (Abductive Logic Programming) — the load-bearing pull.** ALP = ⟨background theory,
  abducibles, integrity constraints⟩ with negation-as-failure NATIVE. This IS our core:
  **Constraint Fabric (KRYL-1070) = the ⟨abducibles, integrity-constraints⟩ pair.** Abducibles =
  what may be hypothesized (the closure candidate set); integrity constraints = forbidden
  combinations. A hypothesis set violating a constraint is **eliminated** (§21 route-don't-aggregate:
  eliminate, never down-weight). Our absence test (EDL/§22) is ALP's negation-as-failure. Framing:
  the heavy-hitter build is **ALP instantiated + epistemic stamp**, not a novel cathedral — decades
  of theory and solvers behind it, and the defensible IP line.
- **SCM (Pearl) — the latent pull, first half only.** SCM's division of labor: abduction
  *instantiates the unobserved background state* (exogenous U); deduction via do-calculus computes
  interventions. **Take the abduction half:** AR must output *latent* causes explicitly (its
  `latent_factors` field), each flagged `latent:true` and **capped at CORROBORATED** — you cannot
  CLOSE over what you cannot observe. **Refuse the interventional half:** do-calculus = the CONFIRMED
  rung, already stubbed (KRYLO is an observer). Consistent, no new fence needed.
- **Integrated Causal/Evidential — the argumentation pull.** Stage 4 (ARGUE) is a formal
  argumentation framework (support / refute / attack, Dung-style) that resolves competing survivors
  WITHOUT collapsing to a scalar (§21). Maps directly onto the adopted edge model
  {supports, refutes, expects_absent}.
- **Mental Models — confirmatory only.** Keep multiple models live and surface the possibility
  distribution (already KRYL-1003). Take the principle; spend no new build.

**Refused across the board:** anything requiring intervention / do() (KRYLO observes, does not act);
any single-scalar collapse of competing explanations (§21); any monotone-up status ladder (§5b).

## 5d. Doctrine backing — hardened positions

Each KRYLO position is now an instantiation of an established, citable formalism (borrowed =
defensible) — EXCEPT the epistemic-groundedness discipline, which the base frameworks lack
(original = the moat).

| KRYLO position | Established backing | Hardens against |
|---|---|---|
| Detect, don't predict (§11a) | Cialdea Mayer & Pirri 1996 "abduction is not deduction-in-reverse"; Thórisson-Talbot 2018 §4.1 asymmetry; Pearl "doing ≠ seeing" | "detection is a limitation" — it's the honest boundary of an observer without do() |
| Absence-is-signal (§22) | Clark 1978 negation-as-failure + completion (closed-world negation); ALP; absence as predicate, not NULL | false-neutrality bias (missing ≠ 0) |
| Route-don't-aggregate (§21) | ALP integrity-constraint elimination; Dung 1995 argumentation (resolve without scalar collapse) | hidden averaging artifacts |
| Orthogonal axes (§23) | Peirce inference-mode categories ⊥ evidence state; SCM separates graph from distribution | confidence inflation via double-counting |
| Closure scoped + revocable | domain-relative CWA (logic programming); Wang — insufficient knowledge & resources (open world) | overclaiming completeness |
| Status revises downward (self-heal, §5b) | non-monotonic reasoning (Reiter/McCarthy); AGM belief revision 1985 | the monotonicity trap |
| CORROBORATED = invariance | Mill's method of difference; Peters-Bühlmann-Meinshausen 2016 invariant causal prediction; paper fn-2 (necessary + sufficient) | "just correlation" |
| **Epistemic stamp — realized/projected + groundedness (§18)** | **NONE — original.** ALP / SCM / Mental-Models carry no groundedness discipline | this is the differentiator, not a borrowing |

**Strategic read.** The borrowed spine (ALP + SCM-latent + Dung argumentation + non-monotonic
revision) makes us *defensible* — decades of proof behind every move; a reviewer cannot call it
hand-waving. The one thing we ADD — the epistemic-groundedness skin (how much of each edge is
observed vs projected, stamped and gated) — is the *moat*: none of the source frameworks do it.
**Harden on the borrowed; differentiate on the added.**

## 6. Build order (when authorized)

substrate → RLR (registry) → AR (abduce) → Constraint Fabric (close) → EDL (deduce) →
argumentation + stamp (argue/label) → ADCL + violation detector (heal). Closure is specced with
Constraint Fabric, not bolted on after.
