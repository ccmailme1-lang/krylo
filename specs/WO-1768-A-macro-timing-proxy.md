# WO-1768-A — Macro Timing Proxy v1

STATUS: BACKLOG — spec locked, approved for sprint.
ORIGIN: WO-1768 phase split 2026-06-17. Burry role-play Fit=8.
PARENT: WO-1768 (INVESTOR Synthesizer — Macro Divergence Signal Layer)
PHASE: A — coarse sector-agnostic timing-risk flag, existing data only.

---

## 1. Goal

Provide a macro-level "don't-press-send" timing flag that prevents premature
execution of structural-divergence calls. Uses FRED, EDGAR, and Kalshi only.
No tick data. No Refinitiv. No per-security analysis.

Output: `{ fsStar, dfcStatus, ycidDays, action, conviction }`
API:    `GET /v1/timing-proxy` on as-diff/engine.js (port 4000)

---

## 2. Architecture: Three Validation Layers

```
INVESTOR INGRESS
      │
      ├─── Layer 1: Truth Engine (Fs*)
      │    FRED BAMLH0A0HYM2 ÷ FRED M2V → structural divergence score
      │
      ├─── Layer 2: Momentum Layer (DFC)
      │    EDGAR Form D totalOfferingAmount by sector → deal-flow concentration
      │
      └─── Layer 3: Time Buffer (YCID)
           FRED T10Y2Y consecutive inversion days → theta-drag flag
                 │
                 ▼
          RECONCILE MODULE
          → FADE_SIGNAL / PASS
```

---

## 3. Layer 1 — Truth Engine (Fs*)

```
Fs* = BAMLH0A0HYM2_raw (%) ÷ M2V_raw (dimensionless ratio)
```

**CRITICAL**: Fs* MUST use raw FRED API values, NOT the 0–100 normalized
scores from useFredSignals.js. The normalized feed is for cone pressure only.
WO-1768-A maintains its own raw FRED fetch — separate call, same API key.

| Condition                    | Value                                   |
|------------------------------|-----------------------------------------|
| BAMLH0A0HYM2 source          | FRED API, series BAMLH0A0HYM2, raw %    |
| M2V source                   | FRED API, series M2V, raw ratio         |
| Fs* normal range             | ~2.0–3.0 (HY ~3.5%, M2V ~1.4)          |
| Fs* stress threshold         | > 8.5 (HY ~9-10%, M2V ~1.1 — COVID-level) |
| Resolution                   | Weekly (FRED update cadence)            |
| FRED API key                 | VITE_FRED_API_KEY (same key as WO-1719) |

**Validation (zod)**:
- `bamlhOas`: number, min 0, max 30 (percentage points)
- `m2v`: number, min 0.5, max 3.0
- Reject if either missing > 2 consecutive observations

---

## 4. Layer 2 — Momentum Layer (Deal-Flow Concentration, DFC)

```
DFC = Σ(totalOfferingAmount per sector) ÷ Σ(totalOfferingAmount all sectors)
      trailing 4 quarters (Form D filings)
```

**EDGAR ETL extension required** (Day 2–3 task):
Current `useEdgarSignals.js` extracts filing count only. Must be extended to:
1. Extract `totalOfferingAmount` from Form D structured fields (EDGAR EFTS)
2. Map to Krylo sector taxonomy (6 domains: TECHNOLOGY/CAPITAL/KNOWLEDGE/LABOR/MEDIA/OWNERSHIP)
3. Aggregate trailing 4 quarters by sector

**Category mapping** (Form D `industryGroupType` → Krylo domain):
| Form D industryGroupType     | Krylo Domain  |
|------------------------------|---------------|
| Technology                   | TECHNOLOGY    |
| Finance (excluding real estate) | CAPITAL    |
| Real Estate                  | OWNERSHIP     |
| Healthcare & Life Sciences   | KNOWLEDGE     |
| Media / Entertainment        | MEDIA         |
| Other / Services             | LABOR         |

**Status thresholds**:
- Top-2 sectors ≥ 55% of total deal value → `HIGH CONCENTRATION`
- Top-2 sectors 40–54% → `ELEVATED`
- Below 40% → `NORMAL`

**Validation (zod)**:
- All `totalOfferingAmount` values: number, min 0, max 1e12
- Reject filings with amount = "Indefinite" (Form D uses this string for open-ended raises)

---

## 5. Layer 3 — Time Buffer (Yield-Curve Inversion Duration, YCID)

```
YCID = running count of consecutive calendar days where T10Y2Y_raw < 0
```

**Implementation**:
- Lives server-side in `as-diff/engine.js`
- Persistent state: JSON file `runtime/ycid_state.json`
  ```json
  { "count": 45, "lastChecked": "2026-06-17", "inverted": true }
  ```
- Poll cadence: 24 hours (separate from the 5-minute useFredSignals.js poll)
- FRED series: T10Y2Y — daily series, raw value (already a spread: T10Y minus T2Y)
- On `T10Y2Y_raw < 0`: increment `count`, set `inverted: true`
- On `T10Y2Y_raw >= 0`: reset `count` to 0, set `inverted: false`
- Survives server restart (JSON persistence, same pattern as frames.ndjson)

**Status thresholds**:
- YCID ≥ 30 days → `THETA_DRAG_ACTIVE`
- YCID 1–29 days → `INVERTING`
- YCID = 0 → `NORMAL`

---

## 6. Reconcile Logic

```js
function reconcile(fsStar, dfcStatus, ycidDays) {
  const structuralDivergence = fsStar > 8.5;
  const crowded = dfcStatus === 'HIGH CONCENTRATION';
  const thetaDrag = ycidDays >= 30;

  if (structuralDivergence && crowded && thetaDrag) {
    return { action: 'FADE_SIGNAL', conviction: 'MAXIMUM' };
  }
  if (structuralDivergence && crowded) {
    return { action: 'FADE_SIGNAL', conviction: 'MEDIUM' };
  }
  return { action: 'PASS', conviction: null };
}
```

No probability bands in v1. Sigma-confidence band deferred to Phase B (requires
back-test calibration before attaching confidence to the output).

---

## 7. API Contract

```
GET /v1/timing-proxy

Response 200:
{
  "fsStar":       number,        // raw Fs* value (not normalized)
  "dfcStatus":    "HIGH CONCENTRATION" | "ELEVATED" | "NORMAL",
  "ycidDays":     number,        // consecutive inversion days (0 if not inverted)
  "action":       "FADE_SIGNAL" | "PASS",
  "conviction":   "MAXIMUM" | "MEDIUM" | null,
  "ts":           number         // Unix ms
}

Response 503:
{
  "error": "UPSTREAM_DATA_UNAVAILABLE",
  "missing": ["BAMLH0A0HYM2" | "M2V" | "T10Y2Y" | "EDGAR"]
}
```

Returns 503 when any required data source has > 2 consecutive missing observations.

---

## 8. Back-Test Events

Back-test markers use NBER recession dates (not Kalshi — Kalshi data predates 2021).

| Event                  | Date range              | Expected signal            |
|------------------------|-------------------------|----------------------------|
| GFC recovery           | 2009-06 → 2009-12       | PASS (post-trough)          |
| COVID crash            | 2020-02 → 2020-04       | FADE_SIGNAL (Fs* ~8.2, HY spike) |
| Rate-hike rotation     | 2022-01 → 2022-12       | FADE_SIGNAL / ELEVATED      |

Note: 2022 was not an NBER-declared recession. It is classified here as a
"rotation event" (S&P -19.4%, tech sector -33%) using market drawdown as marker.
NBER recession dates: December 2007–June 2009; February 2020–April 2020.

**Success criteria**:
- Hit-rate ≥ 70% on FADE_SIGNAL during drawdown windows
- False-positive rate < 15% during non-drawdown periods
- Added latency ≤ 5ms to scenario build
- Zero schema-escape errors on 500K historical FRED record replay

---

## 9. Sprint Timeline

| Day   | Task                                                        |
|-------|-------------------------------------------------------------|
| 0–1   | Raw FRED fetch module (Fs* + YCID raw series), zod validators, NBER date table |
| 2–3   | EDGAR `totalOfferingAmount` ETL extension, DFC aggregation  |
| 4     | YCID stateful counter in as-diff/engine.js + JSON persistence |
| 5     | Reconcile module + `/v1/timing-proxy` endpoint              |
| 6–7   | Back-test against FRED historical series + metrics          |
| 8     | Threshold tuning (Fs* and DFC if needed)                    |
| 9     | Pre-prod canary (5% traffic)                                |
| 10    | Prod deploy + 24h monitoring window                         |

---

## 10. Files created / modified

**New files:**
- `src/engine/timingproxy.js` — Fs* + DFC + YCID compute logic
- `runtime/ycid_state.json` — YCID persistent counter (auto-created on first run)
- `qa_wo1768a_timing_proxy.mjs` — BAU harness

**Modified files:**
- `as-diff/engine.js` — add `GET /v1/timing-proxy` route, YCID daily poll
- `src/hooks/useedgarsignals.js` — add `totalOfferingAmount` extraction + DFC aggregation

---

## 11. Dependencies

- WO-1719 (FRED signals) — COMPLETE. Note: WO-1768-A uses raw FRED fetch, not the normalized hook.
- WO-1720 (EDGAR Form D) — COMPLETE. ETL extension required (Day 2–3).
- WO-1721 (Kalshi) — not consumed by Phase A.
- WO-1766/1767 (domain ambiguity gate + vector) — COMPLETE.

Phase B depends on WO-1769 (Refinitiv procurement) → WO-1770 (schema validation) → WO-1771 (VWSC upgrade).

---

## 12. Validation criteria (BAU)

`qa_wo1768a_timing_proxy.mjs` must pass:

| Test vector                                      | Expected output       |
|--------------------------------------------------|-----------------------|
| Fs*=9.2, DFC=HIGH, YCID=45 days                 | FADE_SIGNAL / MAXIMUM |
| Fs*=9.2, DFC=HIGH, YCID=15 days                 | FADE_SIGNAL / MEDIUM  |
| Fs*=9.2, DFC=NORMAL, YCID=0 days                | PASS                  |
| Fs*=3.0, DFC=HIGH, YCID=60 days                 | PASS                  |
| Missing BAMLH0A0HYM2 (3 consecutive gaps)        | 503 UPSTREAM_UNAVAILABLE |
| All values nominal (Fs*=2.5, DFC=NORMAL, YCID=0) | PASS                 |
