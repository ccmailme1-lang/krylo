# WO-1800: Private Credit Fracture Map (Dimon Protocol)

**Status:** BACKLOG  
**Origin:** Jamie Dimon / JPMorgan Chase role-play, Fit=9  
**Filed:** 2026-06-17  
**Depends on:** WO-1719 (COMPLETE), WO-1720 (COMPLETE)  
**Standalone:** Yes — does not require WO-1799. WO-1799 upgrades when this ships.

---

## Problem

The $3T private credit sector is Dimon's primary "cockroach" concern — the hidden stress that signals systemic decay before it appears in public markets. Payment-in-Kind (PIK) toggle loans (where borrowers pay interest in additional debt rather than cash) are the specific indicator he watches. PIK proliferation is a leading indicator of borrower stress that doesn't appear in default rates until the fracture is already spreading.

Krylo currently has no model for shadow-banking fracture signals. The EDGAR Form D feed (WO-1720) captures private placement volume but not credit quality or PIK toggle frequency.

---

## Three States

### COCKROACH_SIGNAL
PIK toggle frequency rising in private credit portfolios. Stress is hidden — borrowers are extending rather than defaulting. The cockroach is in the walls.

Indicators:
- EDGAR Form D: debt issuance volume spike in private placement without corresponding equity issuance (leverage-only capital raises = PIK proxy)
- FRED BAMLH0A0HYM2 (HY credit spread) rising but not yet at systemic levels (< 400 bps)
- CAPITAL cone pressure: BUILDING CONVERGENCE without OWNERSHIP cone confirmation

### FRACTURE_VISIBLE
Private credit stress breaking into public market signals.

Indicators:
- HY spread > 400 bps (FRED BAMLH0A0HYM2)
- EDGAR Form D: private placement volume declining (capital pulling back)
- MEDIA cone: private credit / shadow banking narrative building
- CAPITAL cone: TURBULENT CONVERGENCE

### CONTAGION_RISK
Systemic cascade probability elevated. Shadow-banking fracture spreading to broader credit markets.

Indicators:
- HY spread > 600 bps
- Yield curve (T10Y2Y) deep inversion
- EDGAR Form D: private placement effectively frozen (near-zero volume)
- CAPITAL cone: HIGH CONVERGENCE (systemic)

---

## Output

```
private_credit_stress  — COCKROACH_SIGNAL / FRACTURE_VISIBLE / CONTAGION_RISK / STABLE
stress_scalar          — 0.0–1.0 (consumed by WO-1799)
hy_spread_level        — current BAMLH0A0HYM2 reading (from WO-1719)
pik_proxy_signal       — HIGH / MODERATE / LOW (EDGAR debt-vs-equity ratio proxy)
contagion_probability  — LOW / MODERATE / HIGH / CRITICAL
```

---

## Implementation Notes

- File: `src/engine/privatecreditfracture.js`
- Export: `computePrivateCreditFracture(signals)` → fracture output
- Reads BAMLH0A0HYM2 from WO-1719 dispatch (already in surfaceRouter)
- Reads EDGAR Form D volume from WO-1720 dispatch (already in surfaceRouter)
- PIK proxy: private debt issuance / (private debt + private equity issuance) ratio from EDGAR data
- No new data fetches required — both feeds already live

---

## Pass Criteria

- [ ] COCKROACH_SIGNAL fires when HY spread 300–400 bps + EDGAR debt ratio elevated
- [ ] FRACTURE_VISIBLE fires when HY spread > 400 bps
- [ ] CONTAGION_RISK fires when HY spread > 600 bps
- [ ] `stress_scalar` consumed by WO-1799 without contract change
- [ ] No new data fetches — reads from existing WO-1719/1720 dispatch
- [ ] Build clean, node --check passes
