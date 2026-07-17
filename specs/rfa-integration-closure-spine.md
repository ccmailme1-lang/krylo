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

## 6. Build order (when authorized)

substrate → RLR (registry) → AR (abduce) → Constraint Fabric (close) → EDL (deduce) →
argumentation + stamp (argue/label) → ADCL + violation detector (heal). Closure is specced with
Constraint Fabric, not bolted on after.
