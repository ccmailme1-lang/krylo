# WO-1821 — Happy Path Qualification Spec

**Filed:** 2026-06-20
**Status:** OPEN
**Priority:** Critical — load-bearing dependency for WO-1820 (Unicorn Alert System) and Action Plan premium tier
**Depended on by:** WO-1820, Action Plan, Conviction Record lineage

---

## Foundational Principle

The Happy Path is the most **statistically viable** option — not the most optimistic.

This distinction is non-negotiable. Other scenario tools produce optimistic / base / pessimistic triads. These are editorial. They reflect the analyst's disposition, not the signal field's evidence.

The Happy Path reflects what the convergence engine demonstrates most strongly. It is empirical. The system does not decide to be confident — the qualification criteria decide. The system reports what the evidence supports.

**Absence of a Happy Path is a correct outcome.** Most Action Plans will not carry one. The signal field is often ambiguous. When it is, the Action Plan reflects that honestly: here are viable paths ranked by convergence backing, with no unicorn designation. This is not a failure. It is the system being accurate.

---

## Binary Designation

The Happy Path designation is binary. It is present or absent.

There is no:
- "Approaching Happy Path"
- "Near unicorn"
- "Emerging qualification"
- Proximity score or percentage

The moment the system telegraphs proximity, investors begin acting on incomplete signal. This corrupts the value of the designation entirely. The qualification criteria are a door — open or closed. Nothing in between.

---

## The Five Qualification Criteria

**All five must hold simultaneously. Failure on any single criterion disqualifies.**

---

### Criterion 1 — Cross-Domain Convergence

Minimum **two independent domains** from the 6 (TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP) must reach HIGH convergence simultaneously.

- Single-domain HIGH is a strong signal. It is not a Happy Path.
- The two qualifying domains must be **independent** — convergence driven by the same underlying event across both domains does not satisfy the criterion. The system must assess causal independence.
- Three or more domains at HIGH strengthens confidence but does not change the binary designation.

**Rationale:** Isolated domain pressure is noise. Multi-domain alignment is signal. A single cone can be moved by one large event. Two independent cones aligning is a structural condition, not an event reaction.

---

### Criterion 2 — Persistence Threshold

The qualifying domains must hold at HIGH convergence for a **minimum sustained window** without dropping below threshold.

- Default minimum: **72 hours**
- Spikes do not qualify. A domain that reaches HIGH and retreats within 24 hours never earned the designation.
- The clock resets if convergence drops below threshold during the window.
- The persistence window is configurable by lens (investor default: 72h — may vary by use case in future lens-specific calibration).

**Rationale:** Markets generate momentary convergence on news events constantly. Structural convergence is what persists. The persistence threshold separates event-driven spikes from genuine pressure accumulation.

---

### Criterion 3 — Velocity Direction

Each qualifying domain must be **building** — convergence score increasing over the measurement window — not decaying.

- A domain at convergence score 80 that was at 90 yesterday is a **warning signal**, not a Happy Path contributor.
- Velocity is measured over the persistence window. Direction must be positive or flat. Negative velocity disqualifies.
- Flat velocity (holding steady at HIGH) qualifies. The domain has found equilibrium at strength.

**Rationale:** A decaying signal at HIGH may cross the threshold today and be gone tomorrow. The investor needs to know the direction of travel, not just the current position.

---

### Criterion 4 — Counter-Signal Resistance

Active counter-signals within the qualifying domains must be **below the counter-signal ceiling**.

- Counter-signals are ETRs or external data points that directly contradict the convergence direction within the same domain.
- Counter-signal ceiling: **[threshold to be defined from live signal calibration — flag for first production data pass]**
- A domain at HIGH convergence with strong active counter-signals is a contested domain. Contested domains do not qualify.
- Counter-signals in non-qualifying domains are assessed but do not automatically disqualify.

**Rationale:** A signal that cannot survive contradiction is fragile. The Happy Path must be robust — it should represent the preponderance of evidence, not a majority that is actively contested.

---

### Criterion 5 — Hard Convergence Floor

Each qualifying domain must meet a **minimum convergence score floor**. No exceptions.

- Floor: **[minimum score to be defined — HIGH convergence state begins at convergence classifier threshold — lock this value from convergenceclassifier.js before build]**
- Below the floor: no qualification, regardless of persistence, velocity, or cross-domain alignment.
- The floor is not adjustable by the investor or by lens configuration. It is a system-level constant.

**Rationale:** The floor prevents edge cases where criteria 1–4 are technically met but the underlying signal strength is marginal. All five criteria must be genuinely strong, not merely passing.

---

## Disqualification Conditions

A path is explicitly disqualified from Happy Path status when any of the following are true:

| Condition | Reason |
|---|---|
| Single domain at HIGH, all others below | Criterion 1 fails |
| Multi-domain alignment but < 72h persistence | Criterion 2 fails |
| Any qualifying domain trending negative | Criterion 3 fails |
| Counter-signal strength above ceiling in qualifying domain | Criterion 4 fails |
| Any qualifying domain below convergence floor | Criterion 5 fails |
| Convergence driven by single underlying event across domains | Causal independence fails — Criterion 1 |
| TURBULENT convergence state active in qualifying domain | Turbulence indicates contested signal — disqualifies |

---

## Relationship to Convergence States

Krylo's convergence states (locked 2026-05-09):

```
INSUFFICIENT SIGNAL   — #3a3d4a  — nearly static
LOW SIGNAL YIELD      — #1a1a1a  — slow drift
BUILDING CONVERGENCE  — #66FF00  — coherent pulse
TURBULENT CONVERGENCE — #007FFF  — irregular jitter
HIGH CONVERGENCE      — #8A2BE2  — gravitational compression
```

The Happy Path requires **HIGH CONVERGENCE (#8A2BE2)** in qualifying domains. BUILDING CONVERGENCE (#66FF00) does not qualify — it indicates the signal is accumulating, not yet proven. TURBULENT explicitly disqualifies regardless of score, because turbulence indicates the signal is contested and unstable.

The unicorn color (#8A2BE2) is already the visual language of HIGH CONVERGENCE. The Happy Path designation and the purple state are the same thing — rendered as a system verdict when all criteria hold.

---

## Action Plan Integration

When qualification is met, the Action Plan renders:

```
HAPPY PATH IDENTIFIED

Domains:          CAPITAL · TECHNOLOGY
Convergence:      HIGH (both — 72h sustained)
Velocity:         Building
Counter-signals:  None active above threshold
Confidence:       [convergence score at time of designation]

[Thesis statement derived from synthesis]
[Recommended action]
[What would invalidate this path]
```

When qualification is not met, the Action Plan renders viable paths ranked by convergence backing — no unicorn section, no proximity indicator. The absence is silent. The system does not explain why no unicorn appeared. It simply isn't there.

---

## Lineage and Calibration

Every Happy Path designation is recorded with:
- Timestamp of qualification
- Domain configuration at fire time
- Convergence scores at fire time
- Full ETR set that contributed

When the investor marks a conviction as resolved, the system records whether the Happy Path proved accurate. Over time:

*"Happy Path has designated 6 times in your history. Confirmed accurate: 5. Resolution rate: 83%."*

This is the system earning trust through calibration — not through confidence, but through demonstrated accuracy over time.

---

## Open Items Before Build

1. **Counter-signal ceiling value** — requires first production data pass against live signal field
2. **Hard convergence floor value** — read from `src/engine/convergenceclassifier.js` HIGH threshold before build
3. **Causal independence assessment** — method for detecting whether two-domain convergence is driven by single event needs definition (heuristic vs. model-based)
4. **Persistence window by lens** — 72h is investor default; other lenses may need different calibration
5. **Turbulence override rule** — confirm TURBULENT in a qualifying domain always disqualifies, even if score is technically above floor
