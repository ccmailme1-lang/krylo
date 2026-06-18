# WO-1798: Brand-Equity-to-Enterprise-Stability (Cross-Cutting Infrastructure)

**Status:** BACKLOG  
**Class:** INFRASTRUCTURE  
**Origin:** SAB cohort analysis 2026-06-17 — gap identified across Beast Industries, VaynerX, TKO, Jenner, Paul, Brady, Woods  
**Filed:** 2026-06-17  
**Analogy:** Same architectural role as WO-1743 (Meta-Signal Registry) for persona protocols  
**Unblocks:** WO-1803, WO-1804, WO-1805 (and all future personality-brand synths)

---

## Problem

Five synthesizers already filed (WO-1775/DEP, WO-1785/VPV-VIM, WO-1803, WO-1804, WO-1805) each independently define a "brand equity as enterprise variable" concept. Without a shared schema, each synth invents its own field names, scales, and stress-test logic. The result will be four incompatible representations of the same underlying construct.

WO-1798 defines the Universal Brand Equity Variable (BEV) schema once. All personality-brand synthesizers import `computeBEV()` and produce a standardized `bev_score` output. The stress-test protocol — what happens to enterprise value when `brand_velocity → 0` — is defined here, not re-invented per synth.

---

## Universal BEV Schema

```js
{
  brand_velocity:      // PRIMARY SIGNAL — current algorithmic/market relevance velocity
                       // HIGH / DECLINING / STALLING / COLLAPSED
  moat_durability:     // IP/structural independence from the personality
                       // 0.0–1.0 (0 = entity IS the brand, 1 = brand fully independent)
  dilution_risk:       // transition friction: advice→infrastructure, legacy→venture, athlete→entrepreneur
                       // LOW / MODERATE / HIGH / CRITICAL
  concentration_risk:  // single-personality single-point-of-failure exposure
                       // LOW (diversified) / MODERATE / HIGH / EXTREME (one person = entire enterprise)
  bev_score:           // composite 0.0–1.0
                       // = brand_velocity_weight × 0.40
                       // + moat_durability × 0.35
                       // + (1 - dilution_risk_normalized) × 0.15
                       // + (1 - concentration_risk_normalized) × 0.10
}
```

---

## Personality-Moat Collapse Stress Test

The universal stress scenario: `brand_velocity → 0` (reputational collapse, algorithmic irrelevance, or death/incapacitation).

For each synthesizer that consumes BEV, the stress test answers: **what % of enterprise value survives when the personality is removed?**

```
survival_value = enterprise_value × moat_durability
at_risk_value  = enterprise_value × (1 - moat_durability)
```

This is the foundational "Brand-Equity-to-Enterprise-Stability" ratio the SAB identified as the universal engine gap.

| Entity | moat_durability (est.) | at_risk_value |
|--------|----------------------|---------------|
| MrBeast (WO-1775) | ~0.15 | ~85% of enterprise value at risk |
| Vaynerchuk (WO-1785) | ~0.35 (VeeFriends hedge) | ~65% at risk |
| Kris Jenner (WO-1804) | ~0.55 (independent CPG entities) | ~45% at risk |
| Rich Paul (WO-1803) | ~0.30 (KLUTCH brand) | ~70% at risk |
| Tom Brady (WO-1805) | ~0.40 (TB12 methodology) | ~60% at risk |

---

## BEV Computation Function

```js
// src/engine/brandequity.js
export function computeBEV(inputs) {
  const {
    brand_velocity,      // 'HIGH'|'DECLINING'|'STALLING'|'COLLAPSED'
    moat_durability,     // 0.0–1.0
    dilution_risk,       // 'LOW'|'MODERATE'|'HIGH'|'CRITICAL'
    concentration_risk,  // 'LOW'|'MODERATE'|'HIGH'|'EXTREME'
  } = inputs;

  const vMap = { HIGH: 1.0, DECLINING: 0.6, STALLING: 0.3, COLLAPSED: 0.0 };
  const dMap = { LOW: 0.0, MODERATE: 0.33, HIGH: 0.67, CRITICAL: 1.0 };
  const cMap = { LOW: 0.0, MODERATE: 0.33, HIGH: 0.67, EXTREME: 1.0 };

  const bev_score = parseFloat((
    vMap[brand_velocity] * 0.40 +
    moat_durability * 0.35 +
    (1 - dMap[dilution_risk]) * 0.15 +
    (1 - cMap[concentration_risk]) * 0.10
  ).toFixed(3));

  return {
    brand_velocity,
    moat_durability,
    dilution_risk,
    concentration_risk,
    bev_score,
    at_risk_ratio: parseFloat((1 - moat_durability).toFixed(3)),
  };
}
```

---

## Architecture Rule (LOCKED)

**Persona-brand synthesizers may not define their own BEV logic.** They call `computeBEV()` and use the returned `bev_score` and `at_risk_ratio`. The same constraint as WO-1743 (persona protocols may not implement trigger logic — only subscribe to meta-signals).

File: `src/engine/brandequity.js`  
Exported: `computeBEV(inputs)`, `BEV_WEIGHTS`, `BEV_STRESS_TEST_THRESHOLD = 0.40`

---

## BAU Harness

`qa_wo1798_bev.mjs` — test cases:
- MrBeast profile: HIGH velocity, 0.15 moat → bev_score ~0.55, at_risk ~85%
- Jenner profile: DECLINING velocity, 0.55 moat → bev_score ~0.45
- Collapsed scenario: COLLAPSED velocity, 0.20 moat → bev_score ~0.11

---

## Pass Criteria

- [ ] `computeBEV()` exported from `src/engine/brandequity.js`
- [ ] `bev_score` is `[0.0, 1.0]` for all valid inputs
- [ ] `at_risk_ratio = 1 - moat_durability` exactly
- [ ] BAU: qa_wo1798_bev.mjs — all test cases PASS
- [ ] WO-1803/1804/1805 specs reference `computeBEV()` — no duplicate BEV logic
- [ ] Build clean, node --check passes
