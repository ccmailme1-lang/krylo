# KRYL-RSCH-2026-07 — Structural Integrity Layer

**Status:** Research Note (NOT an implementation ticket) — **FROZEN**
**Reviewed:** 2026-07-27
**Disposition:** ✅ Freeze, with scope locked

---

## Scope decision (read this first — governs everything below)

> **Internal Assurance Layer, not Universal Reasoning Auditor.**

β evaluates **only KRYLO's own formations and prospectuses** — outputs already anchored to real,
provenance-linked signal data (§13a pool, real edges, real facet flags). It does **not** evaluate
external AI outputs, analyst reports, or third-party systems.

**Why locked this way:** every component of β is only meaningful because it traces back to real
provenance. `g_e` (groundedness) means something because KRYLO's own edges/facets are anchored to
signals with a known source. Point β at an arbitrary third-party claim and there is no equivalent
provenance chain — `g_e` would compute but measure nothing grounded, the same failure mode this
build cycle has repeatedly refused elsewhere (DRIFT withholding N rather than fabricate it, FLOW
withholding the edge rather than draw a fake one, PRESSURE flagging T as an explicit stand-in). A
"Universal Reasoning Auditor" is a categorically different product — a generic claim-extraction/NLP
system for arbitrary text — not a KRYLO subsystem. If ever wanted, it is its own initiative with
its own doctrine and provenance model, not an extension of this layer.

## 0. Mission

Quantify the internal coherence, reproducibility, and logical satisfiability of every published
KRYLO interpretation — without adding prediction. The lenses (SIGNAL/FLOW/PRESSURE/CONVERGENCE/
DRIFT/OWNERSHIP) generate interpretations; this layer evaluates the *quality of the reasoning
process* that produced them. Distinct capability, same doctrine (§18 multiplicative, §22
grounded-or-withhold, §11a detect-not-predict).

## 1. Metric 1 — Structural Contradiction Index (SCI), groundedness-weighted

Un-weighted form treats every contradiction equally — wrong, since a contradiction between two
highly grounded artifacts should matter more than one involving weak evidence. Locked form:

```
w⁺ = Σ_{e∈E⁺} g_e      (sum of groundedness over supporting relationships)
w⁻ = Σ_{e∈E⁻} g_e      (sum of groundedness over contradictory relationships)
SCI_c = w⁻ / (w⁺ + w⁻)                                          … (1)
```
`g_e ∈ [0,1]` per relationship. Range 0–1 unchanged. If denominator = 0 (no relationships),
`SCI = 0`. Bands: 0–0.15 Low · 0.15–0.35 Moderate · >0.35 High (editorial must flag).

QA fixture: `w⁺ = 21.4, w⁻ = 6.8 ⇒ SCI = 6.8/28.2 ≈ 0.241`.

## 2. Metric 2 — Case Satisfiability (CSAT)

Boolean: can every structural assertion coexist logically? Propositional clauses `P` generated
from lens outputs, fed to an SAT/SMT solver:
```
CSAT = 1  if SAT(P)
       0  if UNSAT(P)                                            … (2)
```
If `CSAT=0`, report the minimal unsat core. QA fixture: `{A, ¬A} ⇒ UNSAT ⇒ CSAT=0`.

## 3. Metric 3 — Interpretation Stability Index (ISI)

Volatility of an interpretation across `n` successive windows. `s_t` = vector of all scalar
outputs a claim exposes at window `t` (each component normalized 0–1):
```
Δ_t = ‖s_t − s_{t−1}‖₁                     (L¹ / Manhattan delta)
μΔ  = (1/(n−1)) Σ Δ_t
ISI = 1 − clamp01(μΔ / d_max)                                    … (3)
```
`d_max` = max possible L¹ distance (= #components). Range 1 = rock-steady, 0 = rewrites every
tick. QA fixture: `μΔ=0.18, d_max=1 ⇒ ISI=0.82`.

**v2 note (not spec'd now):** new evidence arriving legitimately changes an interpretation — that
isn't instability. Future refinement: `Δ_t = α·Δ_structure + (1−α)·Δ_evidence`, α TBD, to separate
structural drift from expected evidence growth. Current v1 formula stands as-is until then.

## 4. Metric 4 — Replay Consistency Coefficient (RCC), canonical-hash

Run the pipeline `k` times on identical frozen evidence:
```
RCC = (# identical canonical hashes) / k                         … (4)
```
**Locked as canonical, not raw hash** — a raw serialization hash would falsely register
divergence if key order or a timestamp changes while the Formation is semantically identical.
Canonicalize before hashing: remove volatile fields (`generatedAt`, runtime ids) → deep-sort all
object keys alphabetically → serialize without whitespace → hash (SHA-256). Deterministic engines
should yield `RCC=1`; stochastic generators expose real variance. QA fixture: `k=20, 19 identical
⇒ RCC=0.95`.

## 5. Aggregated Integrity Vector (β) — no composite score

```
β_c = (SCI_c, CSAT_c, ISI_c, RCC_c, UE_c)
```
`UE_c` = Uncertainty Envelope (KRYL-RSCH-2026-07-UncertaintyEnvelope.md, `src/engine/
uncertaintyenvelope.js`). **No aggregate scalar — analysts read the tuple; the weakest leg speaks
loudest.** Example: `SCI=0.08, CSAT=1, ISI=0.94, RCC=1.00, UE=0.39` reads immediately as
"internally consistent, deterministic, stable, but under-observed" — a single aggregate would
hide that entirely. This mirrors §23 orthogonal-axis integrity: distinct axes stay distinct,
never collapsed into one number that erases the diagnosis.

## 6. Deferred metric — Evidence Coverage Ratio (ECR)

```
ECR = |F_observed| / |F_required|                                … (5)
```
Orthogonal to `UE` (which folds observation completeness into a product rather than exposing it
standalone). Distinguishes "internally coherent but sparsely observed" from "internally coherent
with broad observational coverage" — a real, useful distinction UE alone can't surface. **Not
required now** — park in a Deferred Metrics appendix; add to β as a 6th element only if leadership
wants explicit coverage exposed independently.

## 7. Guardrails & Non-Goals

- No forward prediction, recommendation, or market-risk scoring.
- Metrics are descriptive; they do not assert truth or estimate ground-truth probability.
- SCI/ISI/RCC never override the Formation existence floor (§ KRYL-1117) — they audit it, never
  gate it.
- "Confidence" is avoided throughout — use "epistemic envelope" (matches the Uncertainty Envelope
  note's own locked wording rule).
- **Scope boundary (see top of document):** internal KRYLO formations/prospectuses only.

## 8. QA Harness Outline

1. Canned fixtures triggering: low/medium/high SCI · SAT vs. UNSAT clauses · steady vs. volatile
   ISI · forced stochastic variance for RCC.
2. Recompute (1)–(4) offline; fail if engine diverges `> 1e-6`.
3. Validate the β tuple is exposed but never collapsed into a hidden scalar.

## 9. Status

Research Note only. No engine ticket. No file placement in `src/engine/` until an explicit
implementation ticket is opened, scoped, and Founder-approved — same governance gate as the
Uncertainty Envelope note.

---

*End of research note — frozen 2026-07-27.*
