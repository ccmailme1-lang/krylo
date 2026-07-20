# KRYLO PRESSURE — Vesselization Doctrine (Constraint Analysis)

**Status:** DOCTRINE (locked concept, Founder-originated 2026-07-19). Model, not literal thermodynamics.
**Governs:** the PRESSURE lens (Constraint Analysis) — definition, unit, and formula.
**Origin:** Founder proposed vesselizing gas-pressure physics to represent domain constraint. This
document formalizes that concept; it does not originate it.

---

## 1 · The core idea

Each of the six domains (CAPITAL · TECHNOLOGY · OWNERSHIP · LABOR · MEDIA · KNOWLEDGE) is a
**pressure vessel**. Constraint is the pressure inside it. A fault line is a vessel approaching its
rated ceiling.

PRESSURE does not measure activity. It measures **how little room a domain has left to move** —
constraint per unit of remaining capacity. This is what "Constraint Analysis" means.

## 2 · The formula (modeled on the ideal gas law)

```
P = (n · R · T) / V
```

| Term | Physics | KRYLO mapping | Computed from |
|------|---------|---------------|---------------|
| **n** | moles of gas | volume of signals/events pressing on the domain | count/mass of normalized signals routed to the domain (§16) |
| **T** | temperature | intensity/velocity of those signals | rate-of-change / velocity of the signal field |
| **V** | container volume | the domain's structural slack — optionality, degrees of freedom, room to maneuver | inverse of concentration/lock-in; higher when the domain has options |
| **R** | gas constant | scaling constant | fixed calibration constant, published, never tuned per-query |
| **P** | pressure | **constraint pressure** | the output |

Reading: pressure rises when signal **accumulates** (n↑), **heats up** (T↑), or the domain's
**room to move shrinks** (V↓). A domain with heavy, fast signal and little slack is near fault.

## 3 · The unit — gauge pressure, % of ceiling

Report **gauge pressure**, not absolute — pressure relative to the vessel's own baseline, exactly like
PSIG vs PSIA (`PSIA = PSIG + atmosphere`).

- **Unit:** **% of ceiling.** 100% = at the domain's rated constraint limit (fault imminent).
  50% = normal operating pressure. 0% = slack, unconstrained.
- This is the same "% of peak/ceiling" discipline locked for SIGNAL — one honest, bounded scale.
- The "atmosphere" (baseline) is the domain's own trailing normal, so a reading means the same thing
  across domains.

## 4 · Re-derivability (non-negotiable, ties to §18 groundedness)

Any outside inspector must be able to back out **n, T, V** from the raw signal feed and reproduce **P**.
No hidden scalar, no `f(confidence)` costume. R is published. The math checks out or the number is void.

## 5 · Guardian boundaries (do not overclaim)

- This is a **defensible model, not literal physics.** Do NOT claim real Kelvin, real R, or true
  thermodynamic units. Frame it as "constraint per unit capacity, modeled on gas-vessel behavior."
- The moment the copy asserts literal thermodynamics, a critic breaks it. Keep it at model altitude.
- PRESSURE detects constraint; it does not predict the fault's timing. Detection, not prediction (§11a).

## 6 · How it feeds the lens

- The PRESSURE heatmap renders **6 domain rows × time columns**, each cell = **gauge pressure (% of
  ceiling)**, near-black → deep green, hottest constraint cells → lime (lime = highlight only, doctrine).
- Distinct from SIGNAL (which is Signal Strength % of peak): PRESSURE is the *constraint* vessel read,
  SIGNAL is the *strength* field read. Same visual family, orthogonal metric.
- Legend label: **"Constraint Pressure (% of ceiling)."**

## 7 · Relationship to existing doctrine

- §16 Signal Ingestion — n and T are computed from the normalized 0–100 shared pool.
- §18 Metrics Truth — % of ceiling = a bounded, grounded unit; re-derivable.
- §20 Direction Honesty — a vessel near ceiling is a fracture signal; PRESSURE surfaces it with full
  authority, never suppressed.
- §23 Orthogonal Axis Integrity — n, T, V must stay independent inputs; if two collapse to one latent
  variable, the model inflates. Audit before shipping the computation.
