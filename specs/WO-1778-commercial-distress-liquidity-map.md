# WO-1778: Commercial Distress Liquidity Map (Mallah Protocol)

**Status:** BACKLOG — BLOCKED on WO-1777  
**Origin:** Mallah Real Estate Ventures role-play, Fit=7  
**Filed:** 2026-06-17  
**Depends on:** WO-1777 (NON_INSTITUTIONAL_ALPHA_SYNTH — must ship first), WO-1719 (COMPLETE), WO-1720 (COMPLETE)

---

## Problem

Mallah's exit risk is not visible in Krylo's current model. He can buy distressed assets at scale — the EDGAR Form D feed (WO-1720) already surfaces REIT offloading signals. What Krylo cannot currently answer is: **when does the secondary market for his specific Class C/B regional asset class thin to illiquidity?** At that point, the portfolio he has acquired becomes management-intensive and illiquid simultaneously — the worst-case scenario for a highly leveraged, high-turnover operator.

The same distress signal (institutional REITs offloading Class C/B Southeast commercial) means opposite things depending on Mallah's current leverage state:
- `leverage_headroom` > 0 → DISTRESS_ENTRY: deploy capital, buy the dislocation
- `leverage_headroom` < 0 → LIQUIDITY_WATCH: you are part of the problem, not the buyer

Without WO-1777's `leverage_headroom` field, this WO cannot resolve that ambiguity.

---

## Blocking Dependency

**Cannot build before WO-1777.** The `leverage_headroom` field from `synthNonInstitutionalAlpha()` is a required input. WO-1778 is a market-level signal module — it observes the distress condition in the market. WO-1777 determines whether Mallah is the acquirer or the exposed party in that condition.

---

## Dual-Use Signal Architecture

The COMMERCIAL_DISTRESS_LIQUIDITY_MAP is a single signal with two consumption modes, resolved by `leverage_headroom`:

```
if leverage_headroom > threshold:
    state = DISTRESS_ENTRY  // buy signal
else:
    state = LIQUIDITY_WATCH  // risk signal
```

Both modes read from the same underlying data (EDGAR offloading velocity + FRED yield curve + OWNERSHIP cone pressure). The posture — buy or watch — is determined by the portfolio state, not the market signal.

---

## Three States

### DISTRESS_ENTRY
**Trigger:** Institutional REIT offloading velocity above threshold + leverage_headroom positive

Mallah's prime hunting ground is active. Characteristics:
- REITs are bulk-offloading Class C/B assets (EDGAR Form D volume spike in real estate category)
- Yield curve pressure has compressed institutional REIT margins below serviceable levels
- Non-institutional buyers (cash-heavy, leverage-tolerant) have structural advantage
- cap_rate_spread (from WO-1777) is at maximum spread — arbitrage window fully open

Output: deploy signal, estimated acquisition window duration, cap rate floor estimate.

### LIQUIDITY_WATCH
**Trigger:** Secondary market transaction velocity declining + exit_liquidity_horizon < 18 months

The secondary market for Class C/B assets in Mallah's regional concentration is thinning. Characteristics:
- EDGAR Form D shows declining buyer-side deal flow (not just seller-side)
- FRED yield curve inversion signals rate environment that discourages levered buyers
- OWNERSHIP cone pressure declining (fewer transactions at any price)
- management_intensity_score (from WO-1777) HIGH — assets are resource-intensive but losing liquidity

Output: exit pressure, estimated months to illiquidity, repositioning options.

### EXIT_WINDOW_CLOSING
**Trigger:** LIQUIDITY_WATCH conditions sustained + leverage_headroom negative + MEDIA cone elevated (regional economic downturn coverage)

Critical state. Secondary market liquidity is actively closing. Characteristics:
- Both buyer and seller sides of the secondary market are contracting
- Regional economic pressure (Florida/Southeast occupancy decline) is becoming narrative (MEDIA cone = BUILDING or TURBULENT)
- Levered holders are being forced into distress simultaneously — supply glut with no buyers

Output: exit urgency, estimated window before full illiquidity, asset prioritization for liquidation sequence.

---

## Data Sources

| Signal | Source WO | What It Measures |
|--------|-----------|------------------|
| REIT offloading velocity | WO-1720 (EDGAR Form D) | Institutional exit pressure in real estate category |
| Yield curve carry cost | WO-1719 (FRED T10Y2Y) | Rate environment for levered buyers |
| OWNERSHIP cone pressure | WO-1126A convergence classifier | Broad real estate transaction activity |
| Regional narrative | MEDIA cone | Florida/Southeast economic coverage density |
| leverage_headroom | WO-1777 output | Buy vs. risk posture resolver |
| exit_liquidity_horizon | WO-1777 output | Estimated months to secondary market illiquidity |

---

## Output Contract

```
distressState         — DISTRESS_ENTRY / LIQUIDITY_WATCH / EXIT_WINDOW_CLOSING
posture               — BUY / WATCH / EXIT (resolved from leverage_headroom)
acquisition_window    — months estimate (DISTRESS_ENTRY only)
exit_urgency          — LOW / MODERATE / HIGH / CRITICAL
cap_rate_floor        — estimated floor for distressed acquisitions in current window
months_to_illiquidity — secondary market thinning estimate
regional_pressure     — Florida/Southeast MEDIA cone state
edgar_offload_velocity — HIGH / MODERATE / LOW (REIT bulk offloading rate)
synthesis             — plain-language posture summary
```

---

## Implementation Notes

- File: `src/engine/commercialdistressliquidity.js` — standalone module
- Export: `computeDistressState(leverage_headroom, exit_liquidity_horizon, signals)` → distress output object
- No direct wiring to SYNTH_MAP — consumed by `synthNonInstitutionalAlpha()` in WO-1777 via import
- EDGAR Form D (WO-1720) already dispatches to surfaceRouter — read from OWNERSHIP cone pressure
- FRED T10Y2Y (WO-1719) already dispatched — read from CAPITAL cone pressure
- Regional narrative: MEDIA cone state filtered for Florida/Southeast geographic signals (future enhancement — Phase B)

---

## Pass Criteria

- [ ] `computeDistressState(headroom=50000, horizon=24, signals)` → DISTRESS_ENTRY + BUY posture
- [ ] `computeDistressState(headroom=-20000, horizon=8, signals)` → EXIT_WINDOW_CLOSING + EXIT posture
- [ ] `computeDistressState(headroom=5000, horizon=14, signals)` → LIQUIDITY_WATCH + WATCH posture
- [ ] `leverage_headroom` sign correctly resolves buy vs. risk posture on identical market signal
- [ ] `edgar_offload_velocity` reads from WO-1720 dispatch (no new EDGAR fetch)
- [ ] Output slots into `synthNonInstitutionalAlpha()` threats[] / opportunities[] arrays
- [ ] Build clean, node --check passes
