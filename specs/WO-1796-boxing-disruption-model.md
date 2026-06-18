# WO-1796: Boxing Disruption Model (White/TKO Protocol)

**Status:** BACKLOG — BLOCKED on WO-1795  
**Origin:** Dana White / TKO Group Holdings role-play, Fit=9  
**Filed:** 2026-06-17  
**Depends on:** WO-1795 (LABOR_VOLATILITY_SYNTH — must ship first), WO-1720 (COMPLETE), WO-1719 (COMPLETE)

---

## Problem

Zuffa Boxing is Dana White's attempt to apply the UFC's centralized vertical-integration model to the fragmented boxing market. The UFC model works because of three structural components: (1) exclusive talent rights contracts, (2) centralized promotional control, and (3) the independent contractor classification that keeps fixed labor costs near zero. Boxing's fragmentation — multiple competing promoters, non-exclusive fighter contracts, inconsistent broadcast deals — is the arbitrage opportunity.

Krylo cannot currently model whether this disruption is succeeding. It has no framework for measuring the UFC-model's portability to boxing, and critically, it cannot see whether the contractor model (WO-1795) is structurally intact enough to make the boxing expansion economically viable.

---

## Blocking Dependency

**Cannot build before WO-1795.** The `contractor_model_integrity` (CMI) field from `synthLaborVolatility()` is a required input. If CMI is declining (regulatory pressure building), the economics of the boxing expansion change before the first Zuffa card runs. Expanding into boxing with a deteriorating contractor model is not a growth play — it is a compounding risk position.

```
if CMI < 0.6:  boxing_expansion_posture = RISK_COMPOUNDING (not opportunity)
if CMI >= 0.6: boxing_expansion_posture = DISRUPTION_VIABLE
```

---

## Three States

### DISRUPTION_ACTIVE
**Trigger:** CMI >= 0.6 + MEDIA cone = BUILDING CONVERGENCE (boxing narrative forming) + OWNERSHIP cone rising (exclusive fighter rights being secured)

Zuffa Boxing is penetrating the fragmented boxing market. UFC model is being applied successfully. Characteristics:
- Top-tier boxing talent signing exclusive Zuffa contracts (EDGAR Form D / deal flow signals)
- Broadcast rights consolidating (fewer competing promoters with network deals)
- Saudi PIF capital amplifying promotion scale (sovereign_influence_score HIGH)
- Legacy promoters (Top Rank, Matchroom) losing exclusive talent to Zuffa

Output: disruption on track, talent pipeline strength, consolidation velocity.

### DISRUPTION_STALLED
**Trigger:** CMI >= 0.6 + MEDIA cone flat + OWNERSHIP cone flat or declining

Zuffa promotional penetration is decelerating. Legacy boxing structure is resisting consolidation. Characteristics:
- Fighter acquisition rate declining (exclusive contracts not being signed at pace)
- Broadcast deals for Zuffa Boxing underperforming UFC benchmarks
- Legacy promoters maintaining relationships with top talent
- Saudi capital deployed but not converting to market share

Output: stall warning, legacy resistance strength, minimum catalyst for resumption.

### DISRUPTION_UNDERMINED
**Trigger:** CMI < 0.6 (contractor model under pressure from WO-1795)

Contractor model stress makes boxing expansion economically unviable regardless of promotional success. The UFC's margin architecture is the prerequisite for the boxing model. If that foundation is cracking, Zuffa Boxing is being built on unstable ground.

This state fires regardless of how well the boxing disruption itself is tracking — CMI below threshold overrides promotional signals.

Output: halt expansion signal, CMI_at_risk level, recommendation to stabilize core UFC model before committing boxing capital.

---

## Saudi PIF Influence Model

The Saudi PIF / Sela partnership is an accelerator AND an autonomy constraint:

**Accelerator:** PIF capital funds promotion scale that individual boxing events cannot generate. Zuffa Boxing's ability to pay fighter guarantees that legacy promoters cannot match.

**Autonomy constraint:** Saudi cultural restrictions on certain fighter profiles, booking constraints for Riyadh event obligations, potential conflict with UFC's US-market promotional autonomy.

`sovereign_boxing_premium` = net capital advantage from PIF after autonomy discount:
- HIGH: PIF amplifies without material restriction
- MODERATE: restrictions exist but manageable
- LOW: autonomy constraints erode the capital advantage — effectively paying for restricted access

---

## Output Contract

```
disruption_state          — DISRUPTION_ACTIVE / DISRUPTION_STALLED / DISRUPTION_UNDERMINED
boxing_expansion_posture  — DISRUPTION_VIABLE / RISK_COMPOUNDING (driven by CMI)
talent_pipeline_strength  — HIGH / MODERATE / WEAK
consolidation_velocity    — ACCELERATING / STABLE / DECELERATING
sovereign_boxing_premium  — HIGH / MODERATE / LOW
cmi_input                 — echo of WO-1795 contractor_model_integrity (audit trail)
legacy_resistance_score   — strength of incumbent promoter resistance (0.0–1.0)
synthesis                 — plain-language boxing disruption posture
```

---

## Implementation Notes

- File: `src/engine/boxingdisruptionmodel.js` — standalone module
- Export: `computeBoxingDisruption(contractor_model_integrity, signals)` → disruption output object
- No direct wiring to SYNTH_MAP — consumed by `synthLaborVolatility()` via import
- EDGAR Form D (WO-1720) → exclusive contract deal flow proxy (sports/entertainment category)
- MEDIA cone → boxing narrative density, promotional velocity signal
- OWNERSHIP cone → exclusive rights consolidation proxy
- CMI threshold (0.6) is the gate — below this, disruption_state = DISRUPTION_UNDERMINED regardless of market signals

---

## Pass Criteria

- [ ] `computeBoxingDisruption(cmi=0.8, signals_positive)` → DISRUPTION_ACTIVE
- [ ] `computeBoxingDisruption(cmi=0.8, signals_flat)` → DISRUPTION_STALLED
- [ ] `computeBoxingDisruption(cmi=0.4, signals_positive)` → DISRUPTION_UNDERMINED (CMI gate overrides)
- [ ] CMI < 0.6 always produces DISRUPTION_UNDERMINED regardless of promotional signals
- [ ] `sovereign_boxing_premium` present in all states
- [ ] Output slots into `synthLaborVolatility()` opportunities[] / threats[] arrays
- [ ] Build clean, node --check passes
