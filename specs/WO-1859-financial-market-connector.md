---
WO: 1859
Title: Financial/Market Connector — σN² Jitter Adjuster
Status: FILED
Date: 2026-06-24
---

## HEADER

**WO-1859 — Financial/Market Connector (Alpha Vantage / Finnhub)**
Date: 2026-06-24
Author: Mr. XS
Target file(s): src/engine/connectors/financialmarketconnector.js (NEW), src/engine/surfacerouter.js, src/engine/signalconstants.js

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Ingest real-time market variance data from Alpha Vantage and Finnhub, compute a normalized jitter factor (σN²) per domain, and apply it as a confidence downscaler to signals in the same dispatch batch — reducing confidence when markets are behaving irrationally.

**Output:** MARKET_JITTER signal units carrying `jitterFactor` field (0–1) per domain — dispatched via dispatchBatch(), surfacerouter applies jitterFactor as confidence multiplier to domain-matched co-occurring signals.

---

## 2. BOUNDARY DECLARATION

**Input contract:** Alpha Vantage API (free tier — daily/intraday price data, requires ALPHA_VANTAGE_KEY env var). Finnhub API (free tier — real-time quotes, earnings sentiment, requires FINNHUB_KEY env var). Both keys required; connector skips gracefully if either absent. Domain mapping applied at ingestion: ticker/sector tags mapped to KRYLO's 6 domains.

**Output contract:** Signal units:
```
{
  source:       'FINANCIAL_MARKET',
  domain:       string,          // single domain per signal
  signal:       string,          // e.g. MARKET_JITTER:TECHNOLOGY
  confidence:   number (0–100),  // normalized jitter magnitude
  ts:           number,
  polarity:     'NEGATIVE',      // jitter is always a negative pressure signal
  decay:        'DAILY',         // market jitter is intraday — expires fast
  topology:     [],
  jitterFactor: number (0–1),    // 0 = calm market, 1 = maximum irrational variance
}
```

surfacerouter reads `jitterFactor` in dispatchBatch and applies:
```
C_adjusted = C_raw × (1 - jitterFactor)
```
to all non-FINANCIAL_MARKET signals in the same batch sharing the same domain.

**Explicit exclusions:**
- No price prediction or price targets
- No trading signals or buy/sell recommendations
- No portfolio-level aggregation
- No direct cone pressure write
- No UI surface for market jitter data
- No forex or commodity price signals (Economic Flow scope — WO-1858)
- Jitter applies to confidence only — does not change polarity of other signals

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. jitterFactor is a field on the signal unit. surfacerouter applies it as a multiplier at dispatch time only — symmetric with suppressionFactor (WO-1857).
- [x] Scoring layer touched → output is NOT a recommendation. jitterFactor reduces confidence; it does not recommend action.

**Drift notes:** jitterFactor and suppressionFactor share the same insertion point in surfacerouter.dispatchBatch — same pattern, different trigger condition. jitterFactor is domain-scoped (affects all signals in that domain); suppressionFactor (WO-1857) is topology-scoped (affects signals sharing entity overlap). Both are multiplicative and non-destructive.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Market variance is the only real-time signal that distinguishes structural pressure from crowd irrationality — attenuating confidence during high-jitter periods prevents the system from treating panic as signal.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a jitterFactor per domain that reduces confidence on co-occurring signals when markets are exhibiting irrational variance."**

---

## 6. FORMULA / CONTRACT

σN² computation:
```
price_returns    = [ln(P_t / P_t-1)] for last N=14 trading days
σN²              = variance(price_returns)
σN²_max          = 95th percentile σN² over rolling 252-day window (calibration constant)
jitterFactor     = clamp(σN² / σN²_max, 0, 1)
```

Confidence normalization (connector output):
```
confidence = clamp(jitterFactor * 100, 0, 100)
```

Application in surfacerouter.dispatchBatch():
```
jitterSignals = batch.filter(e => e.jitterFactor !== undefined)

for each jitterSignal J:
  affectedSignals = batch.filter(e =>
    e.domain === J.domain &&
    e.source !== 'FINANCIAL_MARKET'
  )
  for each affected signal A:
    A.confidence = clamp(A.confidence * (1 - J.jitterFactor), 0, 100)
```

Precedence: suppressionFactor (WO-1857) applied before jitterFactor. Both are multiplicative — order matters, topology suppression runs first.

Domain mapping (ticker → KRYLO domain):
```
Technology sector ETFs / tickers  → TECHNOLOGY
Financial sector ETFs / tickers   → CAPITAL
Education / EdTech                → KNOWLEDGE
Labor / HR / Staffing             → LABOR
Media / Communications            → MEDIA
Real estate REITs                 → OWNERSHIP
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/connectors/financialmarketconnector.js | NEW — Alpha Vantage + Finnhub clients, σN² computation, domain mapper, dispatchBatch | — |
| src/engine/surfacerouter.js | dispatchBatch: read jitterFactor, apply after suppressionFactor to domain-matched signals | All routing, TTL, backpressure, topology amplifier |
| src/engine/signalconstants.js | Add SIGNAL_SOURCE.FINANCIAL_MARKET, MARKET_JITTER signal type | All existing constants |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — jitterFactor is a declared formula with explicit precedence order |
| Does this have a single dominant output? | YES — MARKET_JITTER signal units via dispatchBatch |
| Are all boundaries explicitly defined? | YES — domain-scoped only, no topology touch, no cone write |
| Can this be built without touching an undefined dependency? | YES — both APIs have free tiers; connector skips gracefully if keys absent |
| Does this avoid increasing expressive flexibility in the core? | YES — adds one field and one multiplier pass, symmetric with WO-1857 |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

- `financialmarketconnector.js` dispatches one MARKET_JITTER signal per KRYLO domain per sync cycle
- σN² computed from 14-day rolling price returns
- jitterFactor in range [0, 1] for all dispatched signals
- surfacerouter applies jitterFactor AFTER suppressionFactor (WO-1857) — order confirmed via grep
- grep confirms `source: 'FINANCIAL_MARKET'` in dispatched signal units
- Connector skips gracefully when ALPHA_VANTAGE_KEY or FINNHUB_KEY absent
- No price data, predictions, or trading signals exposed anywhere
- No regression in existing signal routing or topology amplification (WO-1855)
