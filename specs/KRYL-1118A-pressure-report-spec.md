# KRYL-1118A — PRESSURE Report Design Spec

STATUS: Built (analysisfield.jsx). v2 — refined per Founder review: path (A) confirmed
("Pressure₀ — Structural Pressure Indicator," not "proxy"), pressureScore/dataCompleteness/
modelConfidence kept strictly separate (§23 orthogonality — never `score × confidence`),
asymptotic language not "infinite pressure," no "Critical" label (KRYLO observes, doesn't
alarm), Model Completeness added as its own section. 7 sections, not 6.

## 1. What PRESSURE measures

Unlike SIGNAL (raw activity intensity) or CONVERGENCE (discrete state classification), PRESSURE is
a **constraint gauge** — a real ideal-gas-law-style model already implemented in `pressurevessel.js`:

```
n = signal mass         (sum of magnitude/100 across signals)
T = heat                (mean velocity, or confidence as fallback)
V = structural slack     (derived from magnitude spread — structuralSlack())
P = (n · R · T) / V      (vessel pressure)
gauge = P / CEILING × 100   (% of rated ceiling in use)
```

PRESSURE answers: **"Where is constraint accumulating relative to capacity?"** — not how active a
domain is (SIGNAL), not what state it's in (CONVERGENCE), not whether it's forming (OWNERSHIP).

## 2. The real data gap

`computeVesselPressure(signals)` expects each signal to carry `.magnitude` and `.velocity`. The live
pool (`getDomainSignals()`, §13a) only carries `{ domain, confidence, polarity, ts }` — no separate
magnitude or velocity fields. This is the same class of gap DRIFT hit (needing STRUCTURAL/NARRATIVE
facets the pool doesn't split out).

**Two honest paths, not a third option where we quietly invent the missing fields:**

- **(A) Simplified gauge** — reuse `confidence` as both magnitude and velocity input (T defaults to
  the same value n is built from). Label it explicitly as a simplification in the UI ("T defaulted to
  signal confidence — no independent velocity/heat reading exists yet"). The gauge computes for real,
  but its heat term is not independently observed.
- **(B) Withhold the gauge** — show real n (signal mass) and V (structural slack, computable from
  confidence spread) as their own honest readings, but withhold P/gauge itself as "PENDING —
  requires independent velocity/heat data," same register as DRIFT's divergence figure.

Recommendation: **(A)**, clearly labeled — PRESSURE's formula degrades gracefully with a single input
reused (unlike DRIFT, which needs two genuinely independent facets to mean anything at all). But this
is a judgment call, not a default — flagging both before building.

## 3. Report shape (macro framing, consistent with SIGNAL/CONVERGENCE/DRIFT)

The macro table's framing: **"Where are constraints accumulating?"** — field as subject, domains as
contributors, no per-entity "ranking."

```
01 Macro Pressure Overview     — what PRESSURE measures + the T-simplification caveat, stated early
02 Pressure Thesis             — derived: which domains show the tightest gauge, field-wide framing
03 Domain Constraint Field     — all six domains, gauge (%) + n/T/V components, heat-map style (like SIGNAL §02)
04 Constraint Distribution     — Near-Ceiling / Moderate / Slack band grouping (like SIGNAL's Activity Distribution)
05 Vessel Components           — n (mass) / T (heat, simplification-flagged) / V (slack) field averages
06 Observation Boundary        — SUPPORTED (gauge, components) / WITHHELD (independent heat/velocity, future constraint change)
```

## 4. Visual system

Same shared system as OWNERSHIP/DRIFT/CONVERGENCE/SIGNAL: mono/serif dual voice, hairline cards,
dark §6 palette, no new color. Heat-map wash (white-opacity scaled to gauge) reused from SIGNAL §02,
since "how much of the ceiling is in use" is legitimately a heat-style read, same as raw intensity.

## 5. Open decision before build

Confirm (A) vs (B) for the T/heat term. Everything else in this spec is buildable now with what's
already in the pool (n and V are honestly derivable from confidence alone; only T is the judgment call).
