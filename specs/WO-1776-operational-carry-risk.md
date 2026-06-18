# WO-1776: Operational Carry Risk Modeler (Beast Industries Protocol)

**Status:** BACKLOG — BLOCKED on WO-1775  
**Origin:** MrBeast / Beast Industries role-play, Fit=8  
**Filed:** 2026-06-17  
**Depends on:** WO-1775 (CREATOR_HOLDCO_SYNTH — must ship first)

---

## Problem

Beast Industries is structurally exposed to a risk class that does not exist in traditional media or CPG companies: **personality-collapse carry risk**. The same DEP (Donaldson Equity Premium) that inflates the enterprise multiple above comparable media companies can revert to near-zero on a single reputational event. Additionally, the transition from creator-culture governance to audited public-market governance introduces operational friction that scales non-linearly with company complexity.

Krylo currently has no model for this risk class. `synthInvestor()` (WO-1768) covers generic downside scenarios; `synthCreatorHoldco()` (WO-1775) covers the upside valuation. This WO is the stress-test layer that answers: **what threatens the flywheel premium, and how fast does it collapse?**

---

## Blocking Dependency

**Cannot build before WO-1775.** The carry risk model requires the `dep` scalar from `synthCreatorHoldco()` as its baseline input. Stress-testing without a baseline produces commentary, not signal. The formula is:

```
CarryRisk = DEP × reputational_volatility
```

If `DEP` is not computed, `CarryRisk` is undefined.

---

## Three Risk Vectors

### Vector 1: Personality Impairment Risk (PIR)
**The Donaldson moat collapse scenario.**

The Jimmy Donaldson identity is the primary structural asset of Beast Industries. It is also the primary single-point-of-failure. A reputational event (controversy, health event, sustained platform algo shift) can compress DEP from its premium value toward zero in a compressed timeframe.

- **PIR_HIGH:** Single reputational event with media saturation (MEDIA cone = TURBULENT) → DEP trajectory toward 0.3× baseline
- **PIR_ELEVATED:** Sustained platform algorithm shift (TECHNOLOGY cone declining) → DEP erosion over 6–12 months
- **PIR_LOW:** Isolated operational dispute (Virtual Dining Concepts model) — brand equity impaired but recoverable

Formula: `PIR = DEP × reputational_velocity` where reputational_velocity is derived from MEDIA cone state.

### Vector 2: Governance Transition Friction (GTF)
**Scale-to-compliance lag.**

The transition from a "move-fast creator entity" to an "audited public-market company" introduces friction that scales non-linearly. Krylo maps this as a Governance Discount (GD) from WO-1775. GTF quantifies the drag on operating velocity during the IPO-readiness window.

- **GTF_HIGH:** GD = high friction + CAPITAL cone declining → compliance cost erodes operating margin
- **GTF_MODERATE:** GD = moderate + KNOWLEDGE cone rising (regulatory clarity forming) → manageable transition
- **GTF_LOW:** GD = low + existing governance infrastructure → IPO process on track

Governance readiness score: `governance_readiness = 1 - GD_normalized` (0.0–1.0 scale)

### Vector 3: Operational Chokepoint Risk (OCR)
**Third-party dependency collapse.**

Beast Industries has demonstrated exposure to operational partners (Virtual Dining Concepts dispute) where a single counterparty failure can collapse a revenue stream and generate negative brand signal simultaneously — a double-hit not modeled by standard operational risk frameworks.

- **OCR_HIGH:** >40% of non-Feastables revenue concentrated in one operational partner
- **OCR_ELEVATED:** Single partner accounts for 25–40% + MEDIA coverage of dispute = TURBULENT
- **OCR_LOW:** Distributed partner mix, no single-point-of-failure in operational stack

---

## Output Contract

```
carryRiskState   — LOW / ELEVATED / CRITICAL
dep_at_risk      — DEP scalar × PIR coefficient = premium at risk
governance_readiness_score — 0.0–1.0 (1.0 = fully IPO-ready)
chokepoint_exposure        — LOW / ELEVATED / HIGH
pir              — Personality Impairment Risk state
gtf              — Governance Transition Friction state
ocr              — Operational Chokepoint Risk state
synthesis        — Plain-language summary of dominant risk vector
```

This output slots into the `threats[]` array of `synthCreatorHoldco()` output — it enriches the creator synth rather than replacing it.

---

## CARRY_RISK_STATE Reconciliation

| PIR | GTF | OCR | CARRY_RISK_STATE |
|-----|-----|-----|-----------------|
| HIGH | any | any | CRITICAL |
| ELEVATED | HIGH | any | CRITICAL |
| ELEVATED | MODERATE | HIGH | CRITICAL |
| ELEVATED | MODERATE | LOW | ELEVATED |
| LOW | HIGH | HIGH | ELEVATED |
| LOW | LOW | LOW | LOW |

Priority: PIR > GTF > OCR. A personality impairment event dominates regardless of governance or operational state.

---

## Integration Points

- **Reads from:** `synthCreatorHoldco()` output — `dep`, `gd` fields
- **Feeds into:** `synthCreatorHoldco()` `threats[]` array and `assessment` field
- **Attention Stack override:** On CARRY_RISK_STATE = CRITICAL, reorder attentionStack to place PIR signal at rank 1
- **No new cone:** Routes through existing MEDIA (PIR) + CAPITAL (GTF) + OWNERSHIP (OCR) cones

---

## Implementation Notes

- File: `src/engine/operationalcarryrisk.js` — standalone module, imported by `synthCreatorHoldco()`
- Export: `computeCarryRisk(dep, gd, signals)` → carry risk output object
- No direct wiring to `SYNTH_MAP` — consumed internally by WO-1775 synth
- MEDIA cone state → PIR coefficient lookup table
- GD scalar from WO-1775 output → GTF classification

---

## Pass Criteria

- [ ] `computeCarryRisk(dep=2.5, gd=0.7, signals)` → CARRY_RISK_STATE = CRITICAL on PIR_HIGH
- [ ] `computeCarryRisk(dep=1.2, gd=0.3, signals)` → CARRY_RISK_STATE = LOW on all vectors low
- [ ] `dep_at_risk` field present and equals `dep × PIR_coefficient`
- [ ] `governance_readiness_score` is `1 - GD_normalized`
- [ ] CARRY_RISK_STATE = CRITICAL overrides attentionStack rank 1 in `synthCreatorHoldco()` output
- [ ] Build clean, node --check passes
