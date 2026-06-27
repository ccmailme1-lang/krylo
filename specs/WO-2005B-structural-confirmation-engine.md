# WO-2005B — Structural Confirmation Engine
Date: 2026-06-26
Status: SPEC — blocked on WO-2004 (Identity Kernel) + WO-2005A (Taxonomy)
Consumes: WO-2004 EvidenceGraph, WO-2005A EvidenceDescriptors
Outputs: SCI, Structural Coverage, Structural Momentum, Structural Divergence, Structural Precursor Score
Position in sequence: WO-1879 → WO-2005A → WO-2004 → **WO-2005B** → WO-2006 → MetricStrip

---

## Core Principle

SCI is a **derived property** of a completed EvidenceGraph, not a primitive.
It cannot be computed until WO-2004 has resolved identity and assembled the graph.
It is computed POST identity formation and never influences merge/split decisions.

**SCI asks:** How many independent, non-fabricable reality checks has this hypothesis survived?
**SPS asks:** How often has this structural pattern historically preceded the outcome? (orthogonal)

These are different questions with different data requirements and different latencies.
They must not be collapsed.

---

## 1. Single Responsibility

**Job:** Given a resolved CanonicalEvent and its EvidenceGraph, compute the full
Structural Confirmation suite and attach it to `CanonicalEvent.metadata`.
**Output:** `{ sci, structuralCoverage, structuralMomentum, structuralDivergence, structuralPrecursorScore }`

---

## 2. Calibration Seed (WO-2005B owns these values)

Calibrated properties (`anchorStrength`, `independencePrior`) are initial priors
maintained here — not in WO-2005A. WO-2005A defines what evidence is; this file
defines what we currently believe about its behavioral values.

```ts
// Seeded priors — maintained by WO-2005B; overridden at N≥20 by independenceObserved
const CALIBRATION_PRIORS: Record<string, EvidenceCalibration> = {
  POWER_CONSUMPTION:       { anchorStrength: 0.95, independencePrior: 0.98 },
  POWER_LOAD:              { anchorStrength: 0.90, independencePrior: 0.97 },
  POWER_INFRA:             { anchorStrength: 0.97, independencePrior: 0.96 },
  POWER_DATACENTER_DEMAND: { anchorStrength: 0.88, independencePrior: 0.92 },
  POWER_DISCONTINUITY:     { anchorStrength: 0.82, independencePrior: 0.94 },
  WATER_USAGE:             { anchorStrength: 0.91, independencePrior: 0.97 },
  NETWORK_TRAFFIC:         { anchorStrength: 0.85, independencePrior: 0.93 },
  FREIGHT_LOGISTICS:       { anchorStrength: 0.88, independencePrior: 0.95 },
  CONSTRUCTION_PERMITS:    { anchorStrength: 0.93, independencePrior: 0.93 },
  COMPUTE_CAPACITY:        { anchorStrength: 0.87, independencePrior: 0.91 },
  SEC_FILING:              { anchorStrength: 0.72, independencePrior: 0.78 },
  EARNINGS_CALL:           { anchorStrength: 0.60, independencePrior: 0.62 },
  ANALYST_REPORT:          { anchorStrength: 0.40, independencePrior: 0.35 },
  NEWS_ARTICLE:            { anchorStrength: 0.30, independencePrior: 0.30 },
  PRESS_RELEASE:           { anchorStrength: 0.28, independencePrior: 0.45 },
  SOCIAL_MEDIA:            { anchorStrength: 0.12, independencePrior: 0.18 },
};
```

**Calibration discipline:** Priors are updated toward `independenceObserved` once
N ≥ 20 co-occurrence records exist in path memory. They are NEVER tuned toward
desired SCI outcomes. Correction must be toward observed reality only.

---

## 3. Structural Confirmation Index (SCI)

### Formula

The SCI rewards **independence × anchor strength** — not volume.
Ten correlated analyst reports count less than one independent power reading.

```
For each distinct evidenceType t covered in the EvidenceGraph:
  independence(t) = independenceObserved(t) ?? independencePrior(t)
  contribution(t) = anchorStrength(t) × independence(t)

Tier weights (reflect non-fabricability hierarchy):
  STRUCTURAL  (epistemic class) → weight 0.50
  OPERATIONAL                   → weight 0.25
  FINANCIAL                     → weight 0.15
  NARRATIVE + SPECULATIVE        → weight 0.10

Raw = Σ [ contribution(t) × tierWeight(t) ] across all covered distinct types
SCI = clamp(Raw / MaxPossible, 0, 1) × 10
```

**Stacking rule:** Multiple sources of the same evidenceType do not increase SCI.
POWER_CONSUMPTION covered once = covered. Adding more EIA readings doesn't raise the score.
Independence is measured by type diversity, not source volume.

### Display (MetricStrip — Phase C)

```
SCI  8.7
  ✓ Power  ✓ Construction  ✓ Freight  ✓ Hiring  △ Filings  ✗ Announcement
```

`✓` = STRUCTURAL/OPERATIONAL covered
`△` = FINANCIAL covered (legally constrained but retractable)
`✗` = not covered by anything above NARRATIVE

---

## 3. Structural Momentum

Rate of acceleration across T1 structural signals within a rolling window.
Signals when the physical world is changing faster than narrative has recognized.

```
StructuralMomentum = Δ(StructuralBurdenScore) / Δt   [normalized 0–1]

Where StructuralBurdenScore = Σ [ contribution(t) ] for STRUCTURAL types only
Window: configurable; default 30 days
```

**Interpretation:** High momentum + low narrative coverage = pre-consensus structural shift.
This is the earliest detectable Happy Path precursor the system can surface.

---

## 4. Structural Divergence

Disagreement between STRUCTURAL tier and NARRATIVE tier on the same hypothesis.
The Burry signal: physical world diverging from consensus story.

```
StructuralBurdenScore  = Σ [ contribution(t) × independenceClass(t) ] for STRUCTURAL
NarrativeBurdenScore   = Σ [ contribution(t) × independenceClass(t) ] for NARRATIVE+SPECULATIVE

StructuralDivergence = |StructuralBurdenScore - NarrativeBurdenScore|   [0–1]
```

**Direction matters:**
- `Structural > Narrative` + constructive polarity → under-recognized opportunity
- `Structural > Narrative` + fracture polarity → under-recognized risk (§20 primary trigger)
- `Narrative > Structural` → consensus narrative ahead of physical evidence; downgrade confidence

High Structural Divergence in either direction = primary §20 Direction Honesty Principle
trigger. The system does not silence this. It surfaces it.

---

## 5. Structural Precursor Score (SPS)

**Distinct from SCI.** SPS is longitudinal; SCI is cross-sectional.

SPS asks: historically, when a structural signal composition similar to the current one
appeared, how long before the outcome materialized — and how reliably?

This extends §19 Path Memory (WO-1869) to apply to structural signal compositions,
not just query routes.

```
structuralSignatureKey = hash({ STRUCTURAL evidenceTypes present, convergenceBand, domain })
SPS = getLRPrior({ routeKey: structuralSignatureKey })   // reuses pathstore.js
```

**Constraints (inherited from §19 WITHHOLD discipline):**
- Surface only at N ≥ 5 attributed structural-signature records in path memory.
- Never claim SPS without N + attributionConfidence in the display.
- Coincidence is not causation. Attribution requires `followed: full | partial`.

**Display:** `SPS  0.82× (N=7, 86% early)` — historical leverage × sample size × earliness.

The Burry case: this is the metric that would have shown "structural fracture patterns
of this class have historically realized within 14–18 months in N=12 prior observations."
That's the hold signal he didn't have. This is how KRYLO closes that gap.

---

## 6. Competing Hypothesis Ranking Implication

With SCI, the Happy Path engine compares hypotheses by structural burden, not narrative volume.

**Hypothesis A:** CEO confirms expansion. Three analysts agree. SCI = 1.8.
**Hypothesis B:** Grid demand ↑. Permits accelerate. Freight ↑. Hiring ↑. SCI = 8.7.

Hypothesis B ranks higher regardless of media coverage delta. This is the system doing
what it's supposed to do: finding advantageous positions before they become obvious.

**Happy Path gate implication (Founder's call at build time):**
A candidate with SCI < 3.0 is structurally under-confirmed — surface with caveat.
A candidate with SCI > 7.0 has survived multiple independent reality checks — elevate.
SCI threshold values are not locked here. They are locked at build.

---

## 7. File Map

| File | Change |
|------|--------|
| `src/engine/structuralconfirmation.js` | NEW — computeSCI(), computeStructuralMomentum(), computeStructuralDivergence(), computeSPS() |
| `src/engine/pathstore.js` | Tag structural-signature routes at emission; SPS reads from existing getLRPrior() |
| `src/engine/metricsengine.js` | Add SCI + SPS as additional outputs of computeMetrics() |
| `src/components/analysis/metricstrip.jsx` | Render SCI as 8th metric; SPS as 9th; tier coverage row |

---

## 8. Bottle Test

1. **Reduces ambiguity?** YES — SCI and SPS answer distinct, defined questions
2. **Single dominant output?** YES — SCI as primary; SPS and momentum are named secondaries
3. **All boundaries defined?** YES — both blocked deps (WO-2004, WO-2005A) explicit
4. **No undefined deps?** YES — all inputs named; pathstore.js for SPS
5. **No core flexibility growth?** YES — post-formation only; never influences identity

**Verdict: SPEC — blocked on WO-2004 + WO-2005A**

---

## 9. Definition of Done

SCI computed on a live CanonicalEvent. Structural Divergence detectable and surfaced as
§20 trigger. Structural Momentum visible on CanonicalEvent detail panel. SPS surfaces on
MetricStrip when N ≥ 5. Hypothesis ranking by SCI functional in Happy Path engine.
