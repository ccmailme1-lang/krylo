# KRYL-RSCH-2026-07 — Structural Integrity Layer

**Status:** Research Note (NOT an implementation ticket) — **FROZEN v0.2**
**Reviewed:** 2026-07-27
**Disposition:** ✅ Freeze, with scope locked

---

## v0.2 — the critical invariant (read this first, governs every metric below)

> **InterpretationStrength(F_after) ≤ InterpretationStrength(F_before), for any formation F.**

Structural Integrity metrics may **preserve, reduce, or quarantine** a formation's evidential
authority. They may **never increase** it. In plain language: the layer can expose weakness; it
cannot manufacture confidence. This is the lock that prevents a future implementer from doing
`high SCI stability + high RCC = upgrade formation confidence` — the same semantic drift this
whole layer exists to prevent, arriving through a side door instead of the front one.

Three supporting rules, all enforced by that one invariant:
- `g_e` (groundedness) remains the **sole source of evidential authority** — this layer never
  raises it, never overrides a lens floor, never injects an artifact.
- **Read-only.** No evidence creation, no edge creation, no training loop.
- **Edge semantics are strict, not decaying:** an edge exists only while every supporting
  evidence node stays valid AND the `g_e` floor is met AND relationship conditions hold. The
  instant any of those fails, `E = false` — zero residual lifetime, no decay period, no memory
  artifact pretending the relationship still exists ("no ghost topology").

## Scope decision (still governs everything below, unchanged from v0.1)

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

## 6a. Signal Admission Integrity (v0.2)

**Nested σ-envelope, immutable windows.** A signal is admitted only when it satisfies the
dispersion envelope of every active window simultaneously. Window definitions are frozen platform
records, stored explicitly so the environment stays deterministic across replays, not just the
math:
```
window_id | window_size | sampling_rule | κ
```
Without this, the formula is deterministic but the environment it runs in isn't — two replays
could silently use different `W_short/medium/long` and produce different results for reasons
invisible to the inspector.

**`g_e`-weighted coincidence, normalized.** Absolute thresholds are wrong here — a domain with 3
authoritative streams and a domain with 300 low-authority streams must not have different
admission behavior just from stream count. Locked form:
```
Σ_k g_e^(k) · 𝟙(|t_k − t_0| ≤ Δt) / S_max ≥ τ
```
`S_max` = theoretical maximum weighted sum for the domain — authority-weighted, not
volume-weighted. A hundred weak streams cannot outvote three strongly grounded ones.

**Quarantine ledger.** Every rejection writes an immutable record (payload hash, rejecting
windows, contributing `g_e` values, timestamp) — a first-class native artifact, not a silent drop.

## 6b. Signal Transformation Integrity (v0.2)

**Snapshot object — the replay anchor.**
```
Snapshot
├── raw evidence IDs
├── g_e set
├── μ̂
├── σ̂
├── normalization version
└── divergence inputs
```
All downstream metrics compute exclusively from these versioned, grounded snapshots. This is
what gives "why did this formation change?" an actual answer — every input to every computation
is reconstructible.

**Divergence gate — asymmetry matters.** `P` = current distribution, `Q` = reference distribution.
KL can explode when `Q` has zero probability where `P` exists — an unbounded, asymmetric metric
must never be a hard structural decision. Locked split:
- `D_KL(P‖Q)` — **diagnostic only.**
- `D_JS(P‖Q) < ε` — **the sole bounded release criterion** (JS is symmetric and finite).

## 6c. Relationship Integrity Mapping (v0.2)

**Naming correction (locked):** "Gated Cross-Mapping (GCDM)," not "Convergent Cross-Mapping."
"Convergent" implies causal inference — KRYLO detects, it doesn't assert causation. The layer
says *"given grounded evidence, these structures maintain an acceptable relationship,"* never
*"A causes B."*

**Skill gate:** geometric reconstruction skill `ρ` accepted only when `ḡ_e · ρ ≥ 0.40`.

**Directional + magnitude gate:**
```
cos θ > 0.7   AND   min(‖v_i‖,‖v_j‖) / max(‖v_i‖,‖v_j‖) > 0.5
```

**Strict evidence collapse (no ghost topology):**
```
E_ij ≡ (∀k valid(wT_k)) ∧ (g_e floor met) ∧ (relationship conditions hold)
```
Any single failure forces `E_ij = false` — no decay period, no residual topology pretending the
edge still exists.

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

| Area | Result |
|---|---|
| Ontology fit | ✅ |
| Provenance fit | ✅ |
| Determinism | ✅ |
| Replayability | ✅ |
| Doctrine compliance | ✅ |
| Mathematical coherence | ✅ |
| Product boundary | ✅ |

**This is not a reasoning engine — it is an instrument-calibration layer for KRYLO's own
perception instruments.** It reports whether the instruments, relationships, and interpretations
remain structurally coherent. It never asserts truth and never increases interpretive strength.

Research Note only. No engine ticket. No file placement in `src/engine/` until an explicit
implementation ticket is opened, scoped, and Founder-approved — same governance gate as the
Uncertainty Envelope note.

---

*End of research note — frozen v0.2, 2026-07-27.*
