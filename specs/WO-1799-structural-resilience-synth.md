# WO-1799: Structural Resilience Synthesizer (Dimon Protocol)

**Status:** BACKLOG  
**Origin:** Jamie Dimon / JPMorgan Chase role-play, Fit=9  
**Filed:** 2026-06-17  
**Depends on:** WO-1719 (COMPLETE), WO-1126A (COMPLETE)  
**Enhanced by:** WO-1800 (ships standalone, upgrades with private_credit_stress when available)  
**Unblocks:** N/A (WO-1800 is standalone signal layer, not blocked by this)

---

## Problem

Dimon's analytical framework is not about growth — it is about **survivability under the "treacherous cocktail"**: fiscal expansion, sticky inflation, and global fragmentation simultaneously. No Krylo synthesizer models range-of-outcomes resilience. Every current synth produces a directional signal ("buy," "fade," "watch"). Dimon's methodology requires three-scenario simulation (base/stress/severe) before any positioning decision.

`synthStructuralResilience()` is the Dimon lens: evaluate entities not on growth but on their ability to survive the cocktail.

---

## The Treacherous Cocktail

Three simultaneous macro conditions Dimon monitors:
1. **Fiscal expansion** — government deficit spending crowding out private credit → yield pressure → HY spread widening (BAMLH0A0HYM2)
2. **Sticky inflation** — CPI refuses to normalize → Fed stays restrictive → yield curve (T10Y2Y) under pressure
3. **Global fragmentation** — trade bloc fracturing, supply chain re-regionalization → KNOWLEDGE cone pressure on geopolitical signals

The "cocktail" is dangerous because each component amplifies the others. FRED feeds (WO-1719) provide BAMLH0A0HYM2 + T10Y2Y as direct inputs.

---

## Range-of-Outcomes Model (3 Scenarios)

Instead of a single forecast, every output produces three scenarios:

| Scenario | HY Spread | Yield Curve | Private Credit | Label |
|----------|-----------|-------------|----------------|-------|
| Base | < 400 bps | Flat/normal | Contained | FORTRESS_HOLDING |
| Stress | 400–600 bps | Inverted | PIK proliferating | COCKTAIL_ACTIVE |
| Severe | > 600 bps | Deep inversion | Fractures visible | SYSTEMIC_PRESSURE |

`private_credit_stress` from WO-1800 upgrades the Private Credit column from heuristic to signal-driven.

---

## Intent Classification

Fires `synthStructuralResilience()` when INVESTOR lens is active and query contains:

```
dimon|jpmorgan|fortress|systemic|treacherous cocktail|resilience|
shadow banking|private credit|cockroach|range of outcomes|
fiscal deficit|sticky inflation|global fragmentation|
basel|regulatory|policy impact|preparedness|crisis
```

---

## Four Branches

### 1. isMacro — TREACHEROUS_COCKTAIL_ACTIVE
All three cocktail components elevated simultaneously.

### 2. isCredit — SHADOW_BANKING_FRACTURE
Private credit stress dominant. PIK toggle proliferation detected (WO-1800 `private_credit_stress` HIGH, or CAPITAL cone proxy).

### 3. isPolicy — REGULATORY_CONSTRAINT_BUILDING
Policy impact synthesis: Basel III endgame, credit card interest caps, Dodd-Frank revisions. KNOWLEDGE cone regulatory signal building. Regulatory friction modeled as CAPITAL pressure attenuation — reduces effective capital deployment velocity.

### 4. Default — FORTRESS_POSTURE_ACTIVE
Baseline "range of outcomes" output across all three cocktail components.

---

## Output Contract (additional fields)

```
scenario_base    — base case resilience assessment
scenario_stress  — cocktail active: HY spread 400–600 bps
scenario_severe  — systemic: HY spread > 600 bps, private credit fracturing
cocktail_score   — 0.0–1.0 composite of three cocktail components
policy_friction  — LOW / MODERATE / HIGH (regulatory attenuation on capital deployment)
private_credit_stress_input  — echo of WO-1800 field or 'PROXY' if WO-1800 not available
```

---

## Pass Criteria

- [ ] All four branches fire correctly via INVESTOR lens
- [ ] Three-scenario output present in all branches
- [ ] `cocktail_score` present and non-zero on macro queries
- [ ] Ships clean without WO-1800 (uses CAPITAL cone proxy)
- [ ] Upgrades gracefully when WO-1800 `private_credit_stress` is available
- [ ] Build clean, node --check passes
