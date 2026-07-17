# WO-[assign KRYL-#]: Causal Chain Epistemic Stamp

**Extend §18's realized-vs-projected + groundedness discipline into the causal engine.**
Status: DRAFT for Founder ratification. Not built.

---

## Doctrine anchor

The system runs abduction (propose the cause) but the deductive/predictive arm — "if this cause
holds, X follows" — is emitted **unlabeled**. Unlabeled projection is the worst epistemic state,
not the safest (§20: silence is concealment). The fix is not to keep blocking deduction; it is to
**run it and label it**, exactly as §18 already does for metrics: projected = modeled, held,
stamped groundedness ~0, sensitivity-controlled. "We predict — and we tell you how much of it is
real." Labeling, not suppression. Reframe: **prediction is the pruning instrument, not the
product** — run it to converge, never ship it as truth.

**Prior art anchor — the asymmetry (load-bearing).** Thórisson & Talbot, *Abduction, Deduction &
Causal-Relational Models* (AEGAP/IJCAI 2018), §4.1: deduction forward is (near-)determinate —
given the state, the model yields the next state; abduction backward "will *always* require a
choice as to what is found the most likely cause," because one observed effect can arise many
ways. This is not a labeling convenience; it is an **intrinsic certainty gradient** across modes
(cf. Cialdea Mayer: "abduction is not deduction-in-reverse"). So the mode tag must carry epistemic
weight: an abductive edge is a pick among alternatives and starts lower than a deductive edge from
a grounded antecedent.

**The survival ladder (why the classifier is graded, not binary).** The paper's convergence
mechanism is bidirectional survival — a model earns "true causal" status only by working forward
(predict) AND backward (intervene to achieve the goal). Its own result is that **prediction alone
is insufficient**: false models (M1: β⇒γ, M2: γ⇒β) predict perfectly and are only killed by
intervention. So "β reliably follows α in the record" must NEVER stamp an edge as confirmed —
that is correlation in a lab coat. But the paper also hands us an honest middle rung: footnote 2's
definition of cause — *"y must disappear in the absence of x and appear in the presence of x"* —
is an **invariance test runnable on the historical record without acting**. That yields a graded
ladder instead of a binary:

- **PROJECTED** — hypothesized; no observed backing. (§22 fail-safe default.)
- **CORROBORATED** — survived observational invariance across the record (α-present → β AND
  α-absent → ¬β). Strictly stronger than prediction-confirmed; NOT interventional. Buildable now.
- **CLOSED** — completeness of the cause set justified within a bounded domain (Clark completion /
  explanatory closure) ⇒ assert α↔β ⇒ backward inference (¬β ⊢ ¬α) becomes *deduction*, and a
  closure-violation detector is armed (a break = §22 anomalous absence = new-cause discovery).
  Obtained observationally, no intervention. Sound ONLY while the closed-world assumption holds for
  that domain — every closure is scoped and revocable. See `rfa-integration-closure-spine.md`.
- **CONFIRMED** — survived intervention (do-calculus). KRYLO is a pure observer today — "doing is
  not reducible to seeing" (Pearl, cited in the paper) — so this rung is **stubbed**: a defined
  state nothing can currently reach, gated on a future capability to act. Filed to §19.

REALIZED is retired in favor of this ladder; groundedness (§18) counts CORROBORATED+CONFIRMED
weight as observed. The system never claims interventional confirmation it cannot earn.

## 1. Single Responsibility

Every causal chain edge and the chain rollup declare (a) inference **mode** — ABDUCTION |
DEDUCTION | INDUCTION — carrying an intrinsic certainty gradient (the §4.1 asymmetry), and (b)
epistemic **status** on the survival ladder — PROJECTED | CORROBORATED | CONFIRMED(stubbed) — with
a chain-level groundedness %. Two orthogonal axes (§23), never blended. Nothing else.

## 2. Boundary Declaration

- DOES: classify + stamp existing causal output; roll up groundedness; render it.
- DOES NOT: change CI-F expansion, CI-R gates, RBCS weights, or LFOS physics. No new suppression
  filter (blocking stays in CI-R). This is a **post-computation labeling layer** (§21: stamp after
  routing, never collapse before it).

## 3. Zero Drift

Reuses the §18 GROUNDEDNESS formula verbatim. Introduces no new scoring, no new gate, no tunable
threshold in core. Classification is **derived**, not configured.

## 4. Strategic Leverage Statement

Turns "we don't predict" from a capability gap into a disciplined capability. It lets KRYLO model
the deductive/predictive arm of causal theory — understand the projection — without fabricating,
because every forecast edge is labeled and groundedness-quarantined. Same virtue as the Truth
Engine, now carried past the fence into the badlands.

## 5. Output Gravity

The single dominant output is the **stamped chain**: each edge tagged, the chain carrying
`groundedness` + `projectedFraction` + `dominantMode`. Surfaced in `causalimpactview.jsx` in the
MetricStrip visual language.

## 6. Formula / Contract

Per edge (two orthogonal axes, §23):
```
{ from, to,
  mode:   'ABDUCTION' | 'DEDUCTION' | 'INDUCTION',   // AXIS 1 — inference kind
  status: 'PROJECTED' | 'CORROBORATED' | 'CLOSED' | 'CONFIRMED', // AXIS 2 — survival ladder
  weight,                        // existing edge weight (unchanged)
  evidenceRef,                   // CanonicalEvent id(s) / grounded-signal ref, or null
  invariance                     // { present, absent } counts from the record, or null
}
```
AXIS 1 — mode + asymmetry certainty (derived, no knobs; §4.1):
- mode: CI-F hypothesis (backward-inferred cause) → ABDUCTION; forward-derived consequence →
  DEDUCTION; cross-case generalization (N ≥ MIN_N) → INDUCTION.
- modeCertainty: DEDUCTION = determinate; INDUCTION = f(N); ABDUCTION = under-determined (a forced
  choice among antecedents) — structurally the weakest, never treated as determinate. This is an
  intrinsic property of the mode, NOT a tunable weight.

AXIS 2 — survival-ladder classifier (derived, no knobs):
- PROJECTED    ⇔ hypothesized; evidenceRef = null; no invariance support.
- CORROBORATED ⇔ observational invariance holds on the record: α-present → β AND α-absent → ¬β
  (paper fn 2). Stronger than "prediction confirmed"; NOT interventional.
- CONFIRMED    ⇔ survived intervention (do-calculus). **STUBBED** — unreachable until KRYLO can act;
  the enum value exists so downstream code is forward-compatible, but nothing may set it today.

Chain rollup:
```
groundedness      = Σ(weight | status ∈ {CORROBORATED, CONFIRMED}) / Σ(weight) × 100  // green>70 amber40-70 red<40
projectedFraction = 1 − groundedness/100
abductiveFraction = Σ(weight | mode = ABDUCTION) / Σ(weight)   // orthogonal to groundedness (§23)
dominantMode      = argmax mode by Σ weight
```
Groundedness (evidence axis) and abductiveFraction (inference-certainty axis) are reported side by
side, never merged (§23). A chain can be well-grounded yet abductive-heavy, or vice versa — both
must be visible.

FAIL-SAFE (§22 absence-is-signal): an edge with no derivable status is **PROJECTED, groundedness
contribution 0** — never silently CORROBORATED/CONFIRMED. Missing provenance can only lower
groundedness.

## 7. File Map

- NEW `src/engine/causalepistemicstamp.js` — `stampChain(chain)` → returns chain with per-edge
  `mode` + `modeCertainty` + `status` + rollup. Imports the §18 groundedness helper (no
  re-implementation). Holds the invariance test: `invariance(edge, record)` → {present, absent} →
  CORROBORATED when α-present→β and α-absent→¬β both hold. CONFIRMED is a stubbed branch (unreachable).
- `src/engine/cifengine.js` / `src/engine/causalimpactmap.js` — adapter only: each emitted edge
  carries `evidenceRef` (from `causalos/provenance.js` / CanonicalEvent) + an origin tag (expansion
  vs derivation) for the mode classifier. No logic change.
- Historical record access — the invariance test needs α/β presence-absence over time; source from
  the existing event/signal history (CanonicalEvent stream). If per-edge history isn't reachable,
  CORROBORATED is unattainable and every edge falls to PROJECTED (fail-safe, not failure).
- `src/components/analysis/causalimpactview.jsx` — render the groundedness bar + the mode profile
  as two separate readouts, MetricStrip language. Render-only sink.

## 8. Bottle Test

1. Reduces ambiguity? YES — every chain declares observed vs forecast.
2. Single dominant output? YES — the stamped chain.
3. All boundaries defined? YES — labeling layer; no logic touched.
4. No undefined dependencies? Classifier derives from CanonicalEvent provenance (WO-2004) +
   CI-F origin tag — both exist. **Verify** provenance reaches the edge level before build; if an
   edge cannot resolve its origin, that is the one prerequisite to close first.
5. Does not increase expressive flexibility in core? YES — adds a constraint (must declare status),
   loosens nothing.

## 9. Definition of Done

- grep-confirmed `stampChain` applied to causal output; every edge carries `mode` + `status`.
- Fail-safe verified: an edge with no evidence/invariance → PROJECTED, 0 groundedness contribution;
  no path sets CONFIRMED (stubbed).
- CORROBORATED verified against the fn-2 test: only edges where α-present→β AND α-absent→¬β on the
  record earn it; a prediction-only match does NOT.
- `causalimpactview` renders groundedness % and the mode profile as two separate readouts (§23).
- grep-confirmed NO change to CI-R gates, RBCS weights, CI-F expansion math (labeling only).
- Validity metric (§18) unchanged — this is the causal-side stamp, not the metric join (that is a
  separate, later WO: pipe causal groundedness into Validity).
