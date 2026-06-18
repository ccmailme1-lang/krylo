# WO-1801: Sovereign Capital Synthesizer (Alwaleed Protocol)

**Status:** BACKLOG  
**Origin:** Prince Alwaleed Bin Talal / Kingdom Holding role-play, Fit=8.6  
**Filed:** 2026-06-17  
**Depends on:** WO-1719 (COMPLETE), WO-1720 (COMPLETE), WO-1126A (COMPLETE)

---

## Problem

Sovereign and ultra-HNWI capital (Kingdom Holding, PIF, Gulf family offices) operates on a fundamentally different time horizon and risk tolerance than institutional or retail capital. Alwaleed's strategy: large-scale, long-term concentrated stakes in globally disruptive sectors — the "whale fall" approach where one massive bet on the right category (SpaceX, AI, Aerospace) generates compounding returns over decades, not quarters.

Krylo has no synthesizer for this capital class. `synthInvestor()` outputs are optimized for 6–18 month positioning. Sovereign capital operates on 10–30 year conviction windows with unlimited carry tolerance.

---

## Key Constructs

**Whale Fall Asset:** A globally disruptive technology monopoly so large that its success creates a cascading ecosystem of secondary opportunities (SpaceX → satellite internet → Gulf connectivity infrastructure → NEOM dependency).

**National Alignment Premium:** The premium applied when an investment aligns with a sovereign nation's strategic economic diversification goals (Saudi Vision 2030 → SpaceX/AI/Aerospace fits directly; consumer tech does not).

**Political Stability → Liquidity Coupling:** For sovereign capital, the global asset liquidity of holdings is directly coupled to national political stability. A sovereign risk event reduces asset liquidity independently of fundamentals.

---

## Intent Classification

```
alwaleed|kingdom holding|sovereign|pif|gulf|family office|whale fall|
spacex|neom|ai aerospace|frontier tech|long duration|concentrated|
vision 2030|national alignment|strategic stake|100 year|generational
```

---

## Four Branches

1. **isWhalefall** — WHALE_FALL_ACTIVE / WHALE_FALL_MISSED (concentrated frontier tech opportunity)
2. **isNational** — NATIONAL_ALIGNMENT_PREMIUM (stake aligns with sovereign diversification goal)
3. **isPolitical** — SOVEREIGN_LIQUIDITY_RISK (political stability event coupling to asset liquidity)
4. **Default** — SOVEREIGN_CAPITAL_SIGNAL_ACTIVE

---

## Output Contract

Standard contract plus:
```
whale_fall_score        — frontier tech monopoly concentration opportunity (0.0–1.0)
national_alignment      — ALIGNED / PARTIAL / MISALIGNED (vs. Vision 2030 equivalent)
political_liquidity_coupling — LOW / MODERATE / HIGH (political risk → asset liquidity risk)
conviction_window       — SHORT(<5yr) / MEDIUM(5-15yr) / LONG(15-30yr) / GENERATIONAL(30yr+)
```

---

## Pass Criteria

- [ ] isWhalefall fires on "SpaceX concentrated stake frontier tech monopoly"
- [ ] isNational fires on "Saudi Vision 2030 alignment technology aerospace"
- [ ] `conviction_window` = GENERATIONAL on 30yr+ horizon signals
- [ ] Build clean, node --check passes
