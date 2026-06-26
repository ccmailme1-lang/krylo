# WO-1877 — EIA Inventory Delta Signal Connector

**Status:** BUILD-READY  
**Filed:** 2026-06-25  
**Source spec:** WO-PE-001  
**Priority:** Medium

---

## 1. Single Responsibility

Ingest EIA Weekly Petroleum Status Report (WPSR) inventory deltas for crude, gasoline, and distillates. Normalize to 0–100 signal scale. Dispatch via surfaceRouter. No forecasting, no enrichment, no interpretation beyond the raw delta.

---

## 2. Boundary Declaration

**IN scope:**
- ΔCrude Inventory (bbl/week)
- ΔGasoline Inventory (bbl/week)
- ΔDistillate Inventory (bbl/week)
- NetSignal = ΔCrude + ΔGasoline + ΔDistillates (combined pressure index)
- Normalization to 0–100
- Dispatch via dispatchBatch → surfacerouter
- WEEKLY decay tag

**OUT of scope:**
- Price forecasting
- Smoothing or rolling averages
- Enrichment or interpretation layer
- Cross-commodity correlation
- No direct cone wiring

---

## 3. Zero Drift

This WO does NOT:
- Add new domains
- Modify surfacerouter
- Touch any existing connector
- Add UI

---

## 4. Strategic Leverage Statement

EIA inventory drawdowns are structural precursors — they move before price signals become obvious. Negative Δ (demand > supply) detected here before it appears in headline data = "know first." Fits CAPITAL domain pressure field directly.

---

## 5. Output Gravity

Three individual signals + one composite NetSignal, all dispatched as a batch:

```js
[
  { id: 'eia_crude_delta',      source: 'EIA', domain: 'CAPITAL', signal: 0–100, confidence: 0–100, decay: 'WEEKLY', ts, direction: 'DRAWDOWN'|'BUILD', rawDelta: number },
  { id: 'eia_gasoline_delta',   source: 'EIA', domain: 'CAPITAL', signal: 0–100, confidence: 0–100, decay: 'WEEKLY', ts, direction: 'DRAWDOWN'|'BUILD', rawDelta: number },
  { id: 'eia_distillate_delta', source: 'EIA', domain: 'CAPITAL', signal: 0–100, confidence: 0–100, decay: 'WEEKLY', ts, direction: 'DRAWDOWN'|'BUILD', rawDelta: number },
  { id: 'eia_net_pressure',     source: 'EIA', domain: 'CAPITAL', signal: 0–100, confidence: 0–100, decay: 'WEEKLY', ts, direction: 'DRAWDOWN'|'BUILD', rawDelta: number },
]
```

---

## 6. Formula / Contract

### Signal(t)
```
ΔCrude      = Inventory_crude(t)      - Inventory_crude(t-1)
ΔGasoline   = Inventory_gasoline(t)   - Inventory_gasoline(t-1)
ΔDistillate = Inventory_distillate(t) - Inventory_distillate(t-1)
NetSignal   = ΔCrude + ΔGasoline + ΔDistillate
```

### Normalization
- Clamp each delta to historical range (±30M bbl for crude, ±10M for gasoline/distillates)
- Map to 0–100: drawdown (negative Δ) → high signal (50–100); build (positive Δ) → low signal (0–50)
- Magnitude = stress intensity; direction = polarity

### Confidence
- Full EIA response received + both weeks present → confidence 85
- Single week only (first run, no prior) → confidence 40
- Fetch failure → no dispatch

### Interpretation
- Negative Δ → DRAWDOWN (demand > supply) → high signal value
- Positive Δ → BUILD (supply > demand) → low signal value
- No smoothing

---

## 7. File Map

| File | Change |
|------|--------|
| `src/engine/connectors/eiaconnector.js` | NEW — fetch EIA WPSR, compute deltas, normalize, dispatchBatch |
| `src/app.jsx` | Import `runEiaSync`; add to connector useEffect (WEEKLY interval = 7 days) |

### EIA API
- Endpoint: `https://api.eia.gov/v2/petroleum/stoc/wstk/data/`
- Series needed: `PET.WCRSTUS1.W` (crude), `PET.WGTSTUS1.W` (gasoline), `PET.WDISTUS1.W` (distillates)
- Auth: API key via environment variable `EIA_API_KEY` — set on VPS, never in source
- Proxy: add `/api/eia` route to API server (same pattern as /api/fred)

---

## 8. Bottle Test

1. Reduces ambiguity? YES — raw precursor signal, deterministic
2. Single dominant output? YES — 4 signals dispatched as batch
3. All boundaries defined? YES
4. No undefined dependencies? PARTIAL — EIA_API_KEY must be set on VPS before build goes live; /api/eia proxy route must be added to API server
5. Does not increase expressive flexibility in core? YES — signal only, no engine changes

**BLOCKER before deploy:** EIA_API_KEY set in VPS environment + `/api/eia` proxy route added to API server.

---

## 9. Definition of Done

- `eiaconnector.js` dispatches 4 signals on `runEiaSync()` call
- Build clean
- Wired into app.jsx connector useEffect at WEEKLY interval
- Console shows EIA signals dispatching on load (no errors)
- CAPITAL cone reflects pressure on drawdown weeks
- Key never appears in source, logs, or conversation
