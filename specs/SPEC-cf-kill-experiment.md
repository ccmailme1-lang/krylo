# SPEC — Cognitive Fabric Kill Experiment

Status: DRAFT — operationalizes `SPEC — Cognitive Fabric & Formation Frontier.md` §29–§33,
H5, and CF-I8. Does not introduce new CF architecture; it builds the smallest substrate
needed to measure the architectural proposition.

Governing question (CF §35):

> Does persistent attributed pathway state + governed Formation capture + Frontier
> detection + frontier-directed processing provide **materially useful capability not
> supplied by the constituent primitives alone**, per workload class?

Retention rule (CF H5 / §2.1):

$$
\text{retain CF for class } k \iff \Delta V_{\text{structural}}(k) > \Delta C_{\text{compute+latency}}(k)
$$

---

## 1. PROBLEM

The CF conceptual and constitutional layers are locked (`0ce0ffb`). CF §36 leaves
implementation as NEEDS-SPEC and CF §33 forbids retaining the architecture "because the
metaphor is compelling." There is currently **no measurement** of whether the CF loop beats
the synchronous path. `observationaffordanceengine.js` (Frontier detection) has zero
production callers; pathway persistence across invocations does not exist. We must not build
the full Fabric before testing the proposition.

Non-goal: proving CF is universally better. The experiment is expected to **kill CF for at
least one class** (single-shot). A test that cannot produce a kill is not a test.

---

## 2. SOLUTION

A deterministic, offline harness that runs identical **workloads** (ordered observation
batches with ground-truth structure) through two paths under equated resource budgets, and
emits a per-class KILL / RETAIN verdict from measured `ΔV` and `ΔC`.

### 2.1 The two paths

**Baseline `B` — synchronous.** Each invocation re-derives from the observation window only.
No state carried between invocations beyond what KRYLO already persists (the `domaingravity`
pool window). Per batch: `buildPerceptionField()` → `inferFormation()` →
`admitCrossDomainRelationship()` as today. No Frontier step.

**Candidate `CF` — persistent pathway.** Same observations, plus:
- an **Attributed Pathway store** `γ` that persists `(o₀, c₁, r₁, t₁, …)` lineage across
  invocations (§6), keyed by topology, never discarded at end of invocation;
- a **Pathway Measure** `ν_t` updated per batch (§7) — a positive scalar per pathway that
  accumulates with corroborating observations and decays without them;
- **Frontier detection** via `observationaffordanceengine.deriveAffordancesFromResolve` on
  the admitted Formation's unresolved legs (§13–14);
- a **stub Remote Capability** `C_r`: when a Frontier condition is `reachable`, it releases
  exactly the held-back observation(s) tagged reachable for that leg — nothing else. It
  MUST NOT release a held-back observation that is not a true continuation (§31 Case 1/3B).
- returned observations re-enter `B`'s admission machinery unchanged (CF-I7).

### 2.2 Equated budgets (CF §30)

Both paths run under identical: compute ceiling (max `inferFormation` calls), source
budget (max held-back observations releasable), observation window, batch count.
`C_r` releases count against `CF`'s observation budget; `B` never spends it.

### 2.3 Measurement

**`V_structural`** per workload = weighted sum, ground-truth compared:
- `Recall` — admitted formations/relationships that match ground-truth continuations ÷ total true;
- `FP` — admitted formations/relationships with no ground-truth support (hard constraint, not just weighted);
- §32 secondary: `FormationReuse` (fraction of a later batch's formation served from persisted `γ`/`ν_t` vs recomputed), `TimeToFormationRevision` (batches between a contradicting observation landing and the record revising), `PathReconstruction` (can the admitted formation's lineage be replayed to originating observations — boolean per formation, must be 1).

**`C_compute+latency`** per workload:
- wall-time ms (median of N=5 runs, deterministic inputs);
- compute proxy: Σ(`inferFormation` calls) + Σ(particle scans) + Σ(`C_r` releases × release cost constant).

**Deltas:** `ΔV = V_CF − V_B`, `ΔC = Ĉ_CF − Ĉ_B` where `Ĉ` is min-max normalized across both
paths within the class so `ΔV` and `ΔC` are comparable on [−1, 1].

### 2.4 Verdict per class

```
RETAIN(k)  ⟺  ΔV(k) > ΔC(k)
             AND FP_CF ≤ FP_B                       (§31)
             AND no Case-1 / Case-3B continuation manufactured   (§31, FP_CF = 0 on decoys)
             AND PathReconstruction_CF = 1 for every admitted formation  (§33.5)

KILL(k)    ⟺  any CF §33 criterion (1–8) fires for k
             OR ΔV(k) ≤ ΔC(k)
```

A class that is KILL is declared **out of scope for the Fabric** (H5) — not a tuning target.

---

## 3. COMPONENTS

| File | Role | Notes |
|---|---|---|
| `src/engine/cf/cfpathwaystore.js` | persistent `γ` records + `ν_t` measure | NEW. Wraps the existing path-record model in `observationaffordanceengine.js`; adds cross-invocation persistence (in-memory module singleton for the experiment; not localStorage, not a DB — CF §34) and the `ν_t` update/decay rule. |
| `src/engine/cf/cfrunner.js` | runs one workload through `B` and `CF`, returns a `RunResult` | NEW. Pure over injected workload + budget. Reuses `buildPerceptionField`, `inferFormation`, `admitCrossDomainRelationship`, `deriveAffordancesFromResolve` — no reimplementation. |
| `src/engine/cf/cfworkloads.js` | the 4 workload-class fixtures + ground truth | NEW. Deterministic observation batches with `{ truth: { formations, continuations, decoys } }`. |
| `src/engine/cf/cfmetrics.js` | `V_structural`, `C`, normalization, verdict | NEW. Pure scoring; no engine calls. |
| `qa_cf_kill_experiment.mjs` | executes all classes, prints the verdict table, exits non-zero if the harness itself is broken (not if a class is KILL — a KILL is a valid result) | NEW. |

No changes to `formationinference.js`, `domainintelligence.js`, `querysynthesis.js`,
`observationaffordanceengine.js`, or any live render path. The experiment is additive and
offline.

### 3.1 Workload classes (CF §29 H5, Founder 2026-08-31)

1. **`single-shot`** — one batch, one implicit query, one candidate formation.
   *Prediction: `ΔV ≈ 0`, `ΔC > 0` → KILL.* This class exists to prove the test discriminates.
2. **`multi-event`** — 3 staggered batches: Real-Estate-Acquisition → Press-Release →
   FCC-Filing, a true cross-domain continuation (OWNERSHIP → MEDIA → CAPITAL/KNOWLEDGE).
   Batch 3 alone is below `FORMATION_EXISTENCE_FLOOR`; the formation is only recoverable with
   batch-1/2 pathway state. *Prediction: `Recall_CF > Recall_B`, `FormationReuse_CF > 0`.*
   Includes a decoy batch (unrelated LABOR signal) — `FP_CF` must stay ≤ `FP_B`.
3. **`formation-revision`** — batches 1–2 form a constructive formation; batch 4 lands a
   fracture-polarity observation on one leg. Measure `TimeToFormationRevision` for both.
   *Prediction: `B` does not revise a prior record (it has none); `CF` revises within 1 batch.*
4. **`frontier-resolution`** (CF §31 Case 3A — decisive positive regime) — batches 1–2 admit
   a formation missing one domain leg; a held-back observation tagged `reachable` completes
   it; a second held-back observation tagged `unreachable` is a decoy (not a true
   continuation). *Prediction: `Recall_CF > Recall_B` while `FP_CF = 0` (decoy not released),
   `Recall_B` unchanged (B never asks).* Also runs a Case-3B variant where the true
   continuation is `unreachable` → require `Recall_CF = Recall_B = 0`, `FP_CF = 0`.

---

## 4. VALIDATION

`node qa_cf_kill_experiment.mjs` must:

1. run all 4 classes × {B, CF} × N=5 deterministically — identical output across runs;
2. print a table: class | `V_B` | `V_CF` | `ΔV` | `Ĉ_B` | `Ĉ_CF` | `ΔC` | FP_B | FP_CF | verdict;
3. assert the harness invariants (not the verdicts):
   - `single-shot` produces `verdict = KILL` (if it doesn't, the discriminator is broken);
   - every admitted formation in every class has `PathReconstruction = 1`;
   - no decoy / `unreachable` observation is ever released by `C_r`;
   - Case-3B variant yields `Recall_CF = 0` and `FP_CF = 0`;
   - `B` and `CF` see byte-identical observation batches (minus `C_r` releases).
4. exit 0 if invariants hold (regardless of per-class KILL/RETAIN); exit 1 if any invariant fails.

The **result** (which classes retain) is written to `specs/SPEC-cf-kill-experiment-RESULT.md`
by hand after the run, with the printed table pasted verbatim and a one-line verdict per class.
No code is written to make a class RETAIN.

---

## 5. ROLLBACK

Entirely additive: delete `src/engine/cf/` and `qa_cf_kill_experiment.mjs`. No live path
imports them. No migration, no data. `git revert` of the build commit is clean.

---

## 6. GUIDELINES

- **CF-I8 / §21:** the experiment measures **structure recall**, never decision correctness.
  No workload has a "correct decision" as ground truth — only a correct **formation**. `C_r`
  releases observations; it never emits a conclusion.
- **CF §31 Case 1:** the Fabric MUST NOT manufacture continuation. Every class carries at
  least one decoy; a released decoy or an admitted unsupported formation is an automatic KILL
  for that class.
- **CF-I7:** `CF` reuses `B`'s admission machinery byte-for-byte. The only additions are
  persistence of `γ`, the `ν_t` update, the Frontier step, and the stub `C_r`.
- **Route-don't-aggregate (§17):** `ν_t` is a per-pathway measure, updated from uncollapsed
  particles. It is never a pre-routing composite.
- **No fabricated precedent (CLAUDE.md §1):** every constant (`ν_t` decay rate, release cost,
  `V_structural` weights) is declared in `cfmetrics.js` with a one-line basis or marked
  `PROPOSED — needs Founder ruling`. None animate anything; none are load-bearing on the
  verdict beyond the stated formula.
- **Batch edits, one validation pass (memory):** build all five files, then run the harness
  once; fix all failures together.

---

## 7. OPEN — Founder rulings needed before RETAIN is acted on

- `ν_t` update rule: additive-with-decay vs. multiplicative corroboration. Spec assumes
  additive: `ν_{t+1} = max(0, ν_t·(1−λ) + Σ corroboration)`, `λ` PROPOSED 0.15.
- `V_structural` leg weights (Recall / FormationReuse / revision speed / reconstruction).
  Spec assumes Recall 0.5, FormationReuse 0.2, revision 0.2, reconstruction as a gate not a weight.
- Whether a single RETAIN class is sufficient to authorize CF IS-1..IS-6 build, or a
  threshold (e.g. ≥2 classes, or `frontier-resolution` specifically) is required.
