# KRYL-RSCH-2026-07 — Uncertainty Envelope

**Status:** Research Note (NOT an implementation ticket) — **FROZEN**
**Author:** Model Playground / Math Track
**Reviewed:** 2026-07-27 (two feedback passes incorporated)
**Disposition:** ✅ Freeze

---

## The invariant (read this first)

> **It quantifies robustness of the current interpretation, nothing else.**

Every section below exists to protect that one sentence. This is the load-bearing line — if a
future implementation drifts from it (toward probability, prediction, or recommendation
semantics), it has broken the artifact, not extended it.

---

## 0. Purpose

`UE_c` answers one, and only one, question:

> "If the missing or weak evidence arrived, how far could this interpretation move?"

It is therefore an **epistemic-stability envelope**, not a probability of truth, market movement,
or recommendation fitness. "Confidence" is deliberately avoided as a name — that word implies
*probability the claim is true*. `UE_c` does not estimate likelihood; it estimates **interpretive
stability under evidence expansion**. That distinction is the whole point of the artifact.

## 1. Formal Definition

For any published claim `c`, let:

```
EQ_c  = Evidence-quality index          ∈ [0,1]
OC_c  = Observation-completeness index  ∈ [0,1]
RR_c  = Relationship-reliability index  ∈ [0,1]
MA_c  = Model-adequacy index            ∈ [0,1]
```

The envelope is a **multiplicative attenuation model** (not a "floor" — a floor implies
`min(EQ,OC,RR,MA)`, a different operator; this is multiplicative composition):

```
UE_c = EQ_c × OC_c × RR_c × MA_c        … (1)
```

Rationale: weakness in any single leg proportionally reduces interpretive stability. A claim with
`EQ=0.95, OC=0.95, RR=0.20, MA=0.95` does not deserve a high envelope simply because three legs
are strong — the weak relationship grounding appropriately collapses the claim strength. This
matches KRYLO's existing "grounded-or-withhold" doctrine (§22) and the multiplicative-only rule
for composite scores (§18) — no leg can be masked by averaging.

## 2. Component Calculators (first-pass)

- **2.1 Evidence Quality (`EQ_c`)** — mean groundedness of all referenced artifacts.
- **2.2 Observation Completeness (`OC_c`)** — (# required facets present) ÷ (# required facets).
  **Governance flag:** "required facets" must eventually be versioned and provenance-linked to a
  domain model / lens contract / prospectus type — otherwise different analysts could silently
  change the denominator. Not needed for this note; capture when implementation begins.
- **2.3 Relationship Reliability (`RR_c`)** — mean groundedness of all edges the claim relies on
  (no edges ⇒ `RR_c = 1`).
- **2.4 Model Adequacy (`MA_c`)** — `MA_c = 1 − ε_v` where `ε_v` is hold-out error on the canonical
  validation set. Works for a single deterministic classifier. **Future note:** once multiple
  classifiers/lenses feed one claim (e.g. Signal classifier 0.94, Facet extractor 0.91,
  Convergence classifier 0.88), `MA_c` becomes a weighted aggregate — placeholder is acceptable
  for a research scaffold, not required now.

All inputs are already stored or derivable — nothing new is sensed.

## 3. Interpretation Bands

Label `UE_c` without ever printing a "%":

```
0.00 – 0.20   Speculative       (internal R&D only)
0.20 – 0.45   Preliminary
0.45 – 0.70   Grounded          (publication floor)
0.70 – 1.00   Strongly Grounded
```

Editorial copy must use these exact tokens.

## 4. Non-Goals (explicit prohibitions)

`UE_c` MUST NOT be presented or consumed as:

- probability of future events
- investment or trading confidence
- recommendation strength
- model-truth likelihood
- outcome-prediction confidence

It quantifies robustness of the current interpretation, nothing else. This section is what closes
the loophole the source papers would otherwise open (forecasting creep, prediction semantics,
recommendation semantics) — see §11a's locked positioning: "We don't predict. We detect."

## 5. QA Fixture

Input:
```
EQ = 0.72   OC = 0.80
RR = 0.65   MA = 0.90
```

Expected:
```
UE = 0.72 × 0.80 × 0.65 × 0.90 = 0.33696 → 0.337 (3 dp)
Band = "Preliminary"
```

Harness fails if `|calc − expected| > 1e-6` (appropriate — the calculation is deterministic).

## 6. Forward Work

- **2027-Q1:** investigate weighted `MA_c` when ≥2 model versions mix.
- **Possible visualization:** an "interpretive-stability indicator" using non-semantic visual
  treatment (avoid "dial" — a dial can imply a scalar measurement of truth, which this explicitly
  is not).
- **Adoption into the Formation Prospectus** gated behind Founder approval and a
  `GOVERNANCE-CHECK-001` review — not automatic.

## 7. Final Classification

| Area | Assessment |
|---|---|
| Mathematical clarity | 9/10 |
| Doctrine alignment | 10/10 |
| Semantic safety | 10/10 |
| Implementation readiness | intentionally not applicable |
| Research value | High |

**Path:** Research Note → Governance Reference → Future adoption candidate. Not an engine, not a
feature, not a ticket — this artifact sits above implementation and constrains future work.

---

*End of research note — frozen 2026-07-27.*
