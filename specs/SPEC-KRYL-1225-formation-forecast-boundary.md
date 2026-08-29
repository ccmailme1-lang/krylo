# SPEC — Formation Forecast Boundary

**Title:** Formation Forecast Boundary
**Ticket:** KRYL-1225
**Status:** DRAFT — Founder review
**Type:** Feature · Formation visualization
**Related:** KRYL-1223 · KRYL-1224
**Integration point:** Shared Formation object

---

## 1. Purpose

KRYLO should allow a guest to distinguish, at a glance, **what portion of a formation is grounded in observed evidence and what portion is extrapolated from that evidence**.

The visual treatment must communicate:

> **This is observed. This is extrapolated.**

It must not communicate:

> **This is what will happen.**

Forecast is therefore an **extension of observed structural movement**, not a prediction engine.

---

## 2. Core Principle

Every Formation has an observational boundary.

```
OBSERVED ────────────────│ EXTRAPOLATED ────────────────>
                         ↑
                   forecast boundary
```

The boundary MUST be visually unambiguous. The guest should not need to read a legend to determine where evidence ends and extrapolation begins.

---

## 3. Shared Formation Contract

KRYL-1225 consumes the existing Formation object and its temporal observations.

Required:

```
formation_id
observations
temporal_span
relationships
provenance
```

Where available:

```
direction
velocity
persistence
magnitude
observation timestamps
formation trajectory
```

KRYL-1225 MUST NOT modify Formation membership or relationship admission.

---

## 4. Forecast Definition

- **Observed** — a condition directly supported by available Formation observations.
- **Extrapolated** — a visual extension of an observed structural trajectory beyond the latest available observation.
- **Forecast** — the visual representation of that extrapolated region.

Forecast MUST NOT introduce unsupported entities, relationships, or events.

---

## 5. Visual Boundary

The cone/formation MUST contain a distinguishable transition between observed and extrapolated structure.

```
             OBSERVED
          █████████████
        █████████████████
      █████████████████████
                    │
                    │ boundary
                    │
                     ░░░░░░░
                       ░░░░░░
                         ░░░░
```

The exact visual treatment is an implementation decision, but it MUST preserve:

1. observed vs. extrapolated distinction;
2. spatial continuity;
3. immediate readability;
4. compatibility with the existing Cone Field.

---

## 6. No New Semantic Color

The forecast boundary MUST NOT introduce an additional semantic hue if the existing color registry can represent the distinction through:

- opacity;
- texture;
- density;
- geometry;
- edge treatment;
- material treatment.

The purpose is to avoid creating another color-language dependency in the guest view.

---

## 7. Relationship to Story Type

Story Type and Forecast are separate properties of the same Formation.

```
FORMATION
   │
   ├── STORY TYPE
   │     What kind of structural story?
   │
   └── FORECAST
         Where does observation end
         and extrapolation begin?
```

Example:

```
FORMATION
Emerging cross-domain decline

STORY TYPE
FRACTURE

OBSERVED
Capital ↓
Technology ↓
Labor ↓

FORECAST
trajectory extension
```

The forecast MUST NOT alter the Story Type.

---

## 8. Relationship to Persistence

Persistence is based on observed history. The extrapolated portion MUST NOT be counted as additional observed persistence.

```
Observed:
████████████

Projected:
░░░░░░░░
```

The system may show that the observed condition has persisted for a defined period, but projected time cannot increase the observed persistence value.

---

## 9. Relationship to Direction and Velocity

Forecast may extend an observed direction and velocity. It MUST NOT manufacture direction or velocity where insufficient observed movement exists.

> There must be sufficient temporal evidence to establish an observable trajectory before an extrapolated continuation is rendered.

If the trajectory cannot be established:

```
FORECAST
Not established
```

The system MUST NOT draw a speculative continuation simply to complete the visual.

---

## 10. Forecast Horizon

The forecast horizon MUST be bounded. It MUST NOT extend indefinitely. The horizon should be determined by available temporal evidence and the Formation's established trajectory.

```
observed → │ → bounded extrapolation
```

No infinite cones. No visual implication of unlimited continuation.

---

## 11. Evidence Degradation

As extrapolation moves farther from the latest observation, the visual treatment MAY progressively weaken.

```
Observed        Boundary       Near projection       Far projection

████████████████│░░░░░░░░░░░░░░░░░░
                 ↑
              strongest
```

Any degradation treatment MUST represent **distance from observation**, not probability of occurrence. Do not label the gradient `90% → 70% → 40%` unless those values have an independently defined and validated probabilistic meaning.

---

## 12. Three-Second Requirement

The guest must be able to answer within three seconds:

> **How much of this formation is real observation versus extrapolation?**

The default view MUST make the observational boundary visually apparent without opening inspection, reading methodology, interpreting a legend, hovering, or reading numerical probability.

---

## 13. Failure States

- **Insufficient temporal evidence** — no forecast rendered (`OBSERVED ONLY`).
- **Contradictory trajectory** — no extrapolation rendered (`FORECAST / Not established`).
- **Missing timestamps** — forecast unavailable. The system MUST NOT infer temporal direction from unordered observations.
- **No evidence beyond the boundary** — the forecast region MUST remain visually distinct from observed evidence.

---

## 14. Provenance

The forecast boundary MUST retain provenance to the observations from which the extrapolation was derived.

```
Forecast
  ├── source observations
  ├── temporal span
  ├── trajectory basis
  └── boundary timestamp
```

A guest inspecting the formation must be able to determine: *what observations produced this extrapolation?*

---

## 15. Acceptance Criteria

- **AC-1 — Boundary.** Observed and extrapolated portions are visually distinguishable.
- **AC-2 — Grounding.** Every extrapolation derives from observed Formation data.
- **AC-3 — No prediction.** The system never represents extrapolation as a predicted outcome.
- **AC-4 — Finite horizon.** Every forecast has a bounded endpoint.
- **AC-5 — Persistence integrity.** Projected duration is never counted as observed persistence.
- **AC-6 — Direction integrity.** No forecast is rendered without sufficient temporal evidence for a trajectory.
- **AC-7 — Provenance.** Every forecast can identify its source observations.
- **AC-8 — Failure honesty.** Insufficient or contradictory evidence produces no forecast rather than a fabricated continuation.
- **AC-9 — Three-second read.** A guest can distinguish observed from extrapolated structure in ≤3 seconds without a legend.
- **AC-10 — Formation integrity.** KRYL-1225 does not modify Formation membership, relationship admission, or Story Type.

---

## 16. Non-Goals

KRYL-1225 does NOT:

- predict outcomes;
- assign probabilities;
- generate future events;
- create new relationships;
- create Formation membership;
- determine Story Type;
- replace the evidence model;
- redesign the Inspection surface.

---

## 17. Governing Principle

> **Forecast is not prediction.**
>
> **It is the explicit visualization of where observation ends and structural extrapolation begins.**
>
> **The farther KRYLO moves from observed evidence, the more visibly it must distinguish that extension from what is known.**

---

## 18. Mathematical Hardening — the validation contract

### 18.0 Governing calibration rule

> **Defined → measurable → calibrated → eligible for guest semantics.**
> An uncalibrated threshold may participate in development/testing but MUST NOT
> produce a guest-facing forecast extension. Uncalibrated → `OBSERVED ONLY`.

### 18.1 Observed / extrapolated partition

`O_F = {o_1, …, o_n}` ordered by timestamp; `t_n` = latest observation time.

```
trajectory_exists(F)  ⟺
      n ≥ n_min
   ∧  |velocity(F)| > θ_v
   ∧  direction_consistency(F) > θ_dir

  velocity(F)              := least-squares slope of magnitude over O_F
  direction_consistency(F) := fraction of consecutive steps whose delta sign
                              matches the sign of velocity(F)   ∈ [0,1]
```

`¬ trajectory_exists(F)` → `FORECAST = Not established`, no visual extension.

### 18.2 Bounded horizon

```
t_horizon = t_n + min( α · persistence_span(F),  H_max )      α < 1
```

Always finite. No infinite cones.

### 18.3 Visual degradation (distance from observation, not probability)

```
opacity(t) = 1                          for  t ≤ t_n
           = exp( −λ · (t − t_n) )       for  t_n < t ≤ t_horizon
           = 0                          for  t > t_horizon        λ > 0
```

The gradient encodes **distance from the last observation only**. It MUST NOT be
labelled `90% → 70% → 40%` unless those values carry an independently validated
probabilistic meaning (they do not, at present).

### 18.4 Invariants

- Projected interval never increments `persistence_span(F)` or observed persistence.
- No entity, relationship, or event appears in the extrapolated region.
- Boundary provenance = the exact observation set that established the trajectory
  (`{o_i}` used by `velocity` / `direction_consistency`), plus `t_n`.

### 18.5 Threshold register

| θ | meaning | derivation | status |
|---|---|---|---|
| `n_min` | min observations for a trajectory | trajectory policy (TBD) | **UNCALIBRATED** |
| `θ_v` | min trajectory velocity | — | **UNCALIBRATED** |
| `θ_dir` | directional-consistency floor | defined statistic (§18.1); floor value TBD | **UNCALIBRATED** |
| `α` | horizon-to-span ratio, `α < 1` | — | **UNCALIBRATED** |
| `H_max` | absolute max forecast horizon | product constraint | **CALIBRATED** once the constraint is stated |
| `λ` | opacity fall-off rate | — | **UNCALIBRATED** |

**Starting state:** every trajectory parameter is `UNCALIBRATED` → the forecast region
does not render for guests; the field shows `OBSERVED ONLY` until `n_min` / `θ_v` /
`θ_dir` / `α` / `λ` carry a documented basis. The observed portion and the boundary
marker are unaffected.


---

## Cross-cutting principles

This ticket is part of the Formation Guest Model — see `specs/SPEC-CROSSCUTTING-formation-guest-model.md`.

- **Provenance Boundary** — KRYLO shows where the evidence supports the read and where it stops.
- **Trusted Read → Early Action** — the read must be groundable enough that the guest decides whether to act; KRYLO never tells them to.
- **Layered, not dumbed down** — the guest view provides the read; inspection provides the reasoning. Three seconds means compressed evidence, not less intelligence.
