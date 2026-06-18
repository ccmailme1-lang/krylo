# WO-1804: Brand Spin-off Multiplier Synthesizer (Jenner Protocol)

**Status:** BACKLOG  
**Origin:** Kris Jenner / KKW / Jenner-Kardashian portfolio role-play, Fit=8.9  
**Filed:** 2026-06-17  
**Depends on:** WO-1798 (Brand-Equity-to-Enterprise-Stability infrastructure), WO-1126A (COMPLETE)

---

## Problem

The Jenner model is the most structurally sophisticated personal-brand architecture in consumer enterprise: a family umbrella brand that amplifies individual member spin-offs (SKIMS, Kylie Cosmetics, Good American) while each spin-off reinforces the umbrella. Kris Jenner is the orchestration layer — not the personality asset herself. Her value is systemic: she converts attention into enterprise via the "spin-off multiplication" effect.

The gap: no model for **familial risk** — how does one member's reputational event impact the valuation of all other spin-offs? And critically: at what point does accelerating spin-off velocity dilute the umbrella brand rather than compound it?

---

## Key Constructs

**Spin-off Multiplier (SOM):** The amplification factor each new spin-off applies to the umbrella brand. `SOM > 1.0` = net addition. `SOM < 1.0` = dilution (too many spin-offs, umbrella attention diffuses).

**Familial Risk Coefficient (FRC):** The correlation between individual member reputational events and enterprise-wide valuation impact. High FRC = the family brand is tightly coupled (one event moves everything). Low FRC = spin-offs have achieved sufficient independence.

**Umbrella Saturation Threshold:** The point at which adding more spin-offs reduces per-spin-off attention velocity below the cost of launching. When crossed, the Jenner model's marginal value of each new spin-off turns negative.

---

## BEV Integration

Imports `computeBEV()` from WO-1798:
- `brand_velocity`: current family umbrella velocity
- `moat_durability`: degree to which individual spin-offs (SKIMS, Kylie Cosmetics) can survive umbrella brand damage
- `concentration_risk`: HIGH if the umbrella brand depends heavily on one member's output
- `dilution_risk`: HIGH as spin-off velocity accelerates past umbrella absorption capacity

---

## Intent Classification

```
kris jenner|kardashian|skims|kylie cosmetics|good american|
jenner|spin-off|family brand|umbrella brand|momager|
personal brand empire|cpg|celebrity brand|brand portfolio|
familial risk|enterprise orchestration|lifestyle brand
```

---

## Four Branches

1. **isSpinoff** — SPINOFF_MULTIPLIER_ACTIVE / SPINOFF_DILUTING (SOM above/below 1.0)
2. **isFamilial** — FAMILIAL_RISK_ELEVATED (FRC high, one member event cascades)
3. **isUmbrella** — UMBRELLA_SATURATION_APPROACHING (too many simultaneous spin-offs)
4. **Default** — JENNER_PORTFOLIO_SIGNAL_ACTIVE

---

## Output Contract

Standard + WO-1798 BEV fields + Jenner-specific:
```
bev_score                     — from computeBEV()
spinoff_multiplier            — current SOM (>1.0 = compounding, <1.0 = diluting)
familial_risk_coefficient     — 0.0–1.0 (coupling between members)
umbrella_saturation_risk      — LOW / WATCH / ELEVATED / CRITICAL
active_spinoff_count          — number of simultaneous active spin-offs
at_risk_per_member_event      — at_risk_ratio × FRC = blended enterprise exposure
```

---

## Pass Criteria

- [ ] `computeBEV()` imported, `bev_score` present
- [ ] `spinoff_multiplier` > 1.0 on compounding queries, < 1.0 on dilution signals
- [ ] `familial_risk_coefficient` fires on "Kim Kardashian reputational event enterprise impact" framing
- [ ] `umbrella_saturation_risk` = CRITICAL when multiple concurrent spin-offs + bev declining
- [ ] Build clean, node --check passes
