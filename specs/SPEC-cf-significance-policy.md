# SPEC — CF Significance Policy (νₜ + support as a versioned policy component)

**Status:** CANDIDATE — subordinate to `KRYL-CF-001`; pending Founder ratification.
**Date:** 2026-09-02 · **Policy id:** `cf-sig-policy/0.2`
**Executes:** X2 (νₜ = observable, algorithm = versioned policy) + the CF-005 §2.1/§2.2/§5 patch
set from `SPEC-cf-002-is-reconciliation.md` §0a. **Consumes:** `SPEC-cf-pathway-data-model.md` (IS-1).
**Implemented:** `src/engine/cf/significance.js`, exercised by `qa_cf_canonical.mjs`.

## 0. What this is

The Fabric exposes `νₜ(p)` as a contract-level observable (X2). *This document is one versioned
policy that produces it and answers "what is currently supported for admission?".* Replaceable
without touching the CF contract, IS-1 identity, or the pathway lifecycle.

## 1. Three separated concepts (INVARIANT — X2)

| Concept | Question | Mechanism |
|---|---|---|
| **Pathway memory** `νₜ(p)` | what does the Fabric still hold? | §2 — decays; governs RETENTION only |
| **Admission support** | may this pathway's state be evidence for a relationship/formation *now*? | §3 — **reference continuity**, not time |
| **Admission** | FC-REQ-05 | §4 — currently-supported only |

## 2. Pathway memory — `νₜ(p)`

```
νₜ(p, b) = max(0,  νₜ(p, b−1)·(1 − λ)  +  Σ magnitude of batch-b events that EXTEND p)
```

- `λ` — memory decay per batch. **Parameter.** Proposed `0.15`.
- `νₜ` decay is **benign** — it governs *retention tier* (§5), never admission. A wrong `λ` costs
  memory footprint, not a false formation. (This is the X2 correction: the failed
  `persistent-strong-decoy` proved a decay constant alone cannot both preserve true staggered
  structure and reject a stale decoy — so decay was demoted out of the admission path entirely.)
- **DEF-05-04 provenance (REQUIRED for any persisted νₜ):** `{ value, policy_version,
  input_reference: [event_ids], logical_time }`.
- **ΔS classification (optional label, CF-005 §5):** `Δνₜ < −ε → DECAY`, `|Δνₜ| ≤ ε →
  PERSISTENCE`, `Δνₜ > +ε → AMPLIFICATION`; cites `policy_version`; absence never blocks anything.

## 3. Admission support — reference continuity, not a time window

### 3.1 The v0.1 → v0.2 finding (empirical — `qa_cf_canonical.mjs`)

A **pure recency window `W`** cannot serve both requirements:

| workload | needs |
|---|---|
| `multi-event` (staggered legs, gap ≥ 1 batch) | `W ≥ 2` to bridge the stagger |
| `persistent-strong-decoy` (strong signal stops, genuine formation 1 batch later) | `W < 1` to reject the stale leg |

The decoy's staleness at the moment the genuine formation appears (**1 batch**) is *smaller* than
the multi-event stagger (**2 batches**). Any window wide enough for one admits the other. Measured:
`W=2` → multi-event recall 1.0 **and** decoy `FP_CF = 2`. No `W` gives both.

### 3.2 The discriminator that works — reference continuity (IS-1 §3)

A pathway `p` is **support-eligible for admission at batch `b`** iff:

```
corroborated(p, b)                    — p received a new event this batch
  OR
∃ q ∈ cluster(p) : corroborated(q, b) — a convergence-cluster co-member did
```

**No time window.** Persistence alone never satisfies this.

- **Convergence cluster** — the set of pathways that have co-participated in an admitted formation
  (CF-005 §8: recognized, identity not collapsed). Recorded by the runner after each
  `inferFormation` via `recordConvergence(participatingDomains)`.
- **`multi-event`** — its three referentially-connected legs (`dependsOn`) EXTEND **one pathway**
  (IS-1 §3.2). That pathway is corroborated every batch → always support-eligible → the triangle
  is recovered. `pathways = 2` (the connected structure + the unconnected LABOR decoy).
- **`persistent-strong-decoy`** — LABOR is its own pathway, never referentially connected to
  CAPITAL/OWNERSHIP, never in their cluster. After it stops it is not corroborated and not
  cluster-live → **excluded from admission** even though `ν_LABOR = 0.79` still in memory.
  Measured `FP_CF = 0`.
- **`formation-revision`** — CAPITAL+OWNERSHIP converge at b0. At b2 the OWNERSHIP-fracture event
  EXTENDs the OWNERSHIP pathway → cluster co-member corroborated → CAPITAL re-enters admission via
  the cluster → the formation reflects the polarity flip. `ttr = 0`.

### 3.3 What CF's advantage actually is (honest, bounded)

CF recovers a formation whose legs are **referentially connected** (an explicit provenance chain
across the legs) but arrive in **separate batches** — which the synchronous window-only baseline
structurally cannot, because it never holds the earlier legs. CF does **not** claim to detect a
formation from legs that are merely coincident in time with no provenance link — that would be
fabrication, and the decoy result shows the substrate refuses it.

## 4. Admission input — `FC-REQ-05` (LOCKED, X5)

The particle set handed to `inferFormation` / `admitCrossDomainRelationship` this invocation =

```
⋃ { OBSERVATION_CREATED particles of p  |  p support-eligible at now (§3.2) }
```

All other pathway state (unconnected-and-stale, ARCHIVED, TOMBSTONED) stays in memory for
reconstruction; it does not feed admission.

## 5. Retention tier (X4)

`tierOf(p)` — `ACTIVE` while corroborated within `archiveGap` batches (proposed `3`); `ARCHIVED`
beyond that with `νₜ ≥ memoryFloor`; `TOMBSTONED` when `νₜ < memoryFloor` and uncorroborated, or
explicitly terminated. **Never deleted.** Tier governs footprint, not admission (§3).

## 6. Parameter surface — FOUNDER-GATED (ratified 2026-09-02)

### FG-CORE — Founder-Gated Parameters (governance clause, applies to every CF spec)

The parameters `λ`, `r`, `ε`, `COST_BUDGET_RATIO`, `RELEASE_COST` are **CLASSIFIED
"FOUNDER-GATED"**. Their numeric values may be created, modified, or revoked only by explicit
governance action of the KRYLO founding authority. Implementations SHALL surface them as
**read-only** runtime configuration and MUST record any change in a durable, auditable
`PolicyChangeEvent` (`policy_version`, `effective_from`). No guest-facing path SHALL depend on
synchronous updates of these parameters.

**Ratified: the governance and semantics — NOT arbitrary numeric values.** The values below are
PROPOSED; only the Founder sets them.

| param | scope | type | semantics | proposed | effect if wrong |
|---|---|---|---|---|---|
| `λ` (lambda) | significance decay/accumulation | REAL (0,1] or PolicyEnum | per-batch νₜ memory multiplier | `0.15` | retention footprint only (benign) |
| `r` (reference-continuity) | corroboration recurrence | REAL ≥ 0 | weight on repeated evidence of the *same* pathway in the νₜ update (`νₜ += r·Σmag`); `r=1` = each corroboration adds its magnitude | `1.0` | νₜ scale only — does not affect admission (§3.2 is structural) |
| `ε` (epsilon) | significance-change tolerance | REAL ≥ 0 | min \|Δνₜ\| for two successive νₜ to be "materially different" (ΔS labelling, notification throttling) | `0.02` | label noise only (labels optional) |
| `archiveGap` | retention tier | INT ≥ 1 | batches idle → ARCHIVED (NOT Founder-gated — pure footprint) | `3` | ACTIVE-tier footprint only |
| `memoryFloor` | tombstone threshold | REAL ≥ 0 | νₜ below this + uncorroborated → TOMBSTONE (NOT Founder-gated) | `0.05` | how long tombstoned lineage stays queryable |

`COST_BUDGET_RATIO` and `RELEASE_COST` are Founder-gated but belong to CF-004 §7.1 (runtime cost
governance), not this policy — see the name-collision note in `SPEC-cf-002-is-reconciliation.md`
§0a.

**No `W` / support-window parameter** — v0.2 removed it. Support is structural (§3.2), not tuned.

## 7. Guest-path non-interference (INV-006 — LOCKED)

νₜ, ΔS, support evaluation, and admission are never synchronous prerequisites for
`signal → normalize → publish → render`. `CF-004-MET-01` telemetry must permit independent
analysis of whether analytical workload variation moves guest latency. (Offline experiment:
asserted structurally, not measured.)

## 8. Acceptance — RESULT (`qa_cf_canonical.mjs`, 2026-09-02)

| check | required | measured |
|---|---|---|
| νₜ exposed per pathway with §2 provenance | yes | ✓ |
| support-eligibility independent of νₜ magnitude | yes | ✓ (λ 0.15 vs 0.95 → identical formation output) |
| admission set = support-eligible particles only | yes | ✓ |
| `multi-event` forms the structure the baseline misses | yes | ✓ V_CF 1.00 vs V_B 0.00 |
| `persistent-strong-decoy` FP_CF = 0 | yes | ✓ FP_CF = 0 (ν_LABOR = 0.79 in memory, firewalled) |
| `single-shot` CF = baseline (no false advantage) | yes | ✓ KILL |
| determinism, no input mutation, full-lineage reconstruct, no hard delete | yes | ✓ all |
