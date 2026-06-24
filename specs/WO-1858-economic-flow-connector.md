---
WO: 1858
Title: Economic Flow Connector — Macro Baseline
Status: FILED
Date: 2026-06-24
---

## HEADER

**WO-1858 — Economic Flow Connector (UN Comtrade / World Bank)**
Date: 2026-06-24
Author: Mr. XS
Target file(s): src/engine/connectors/economicflowconnector.js (NEW), src/engine/signalconstants.js

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Ingest sector-level trade flow and economic indicator data from UN Comtrade and World Bank, compute a macro regime baseline per domain, and dispatch MACRO_BASELINE signals via surfacerouter so velocity and confidence calculations have a structural reference floor.

**Output:** MACRO_BASELINE signal units carrying `baselineIndex` field (0–100) per domain — dispatched via dispatchBatch(), no other output path.

---

## 2. BOUNDARY DECLARATION

**Input contract:** UN Comtrade REST API (public — trade flows by commodity/country). World Bank Indicators API (public — GDP, sectoral output, development indices). Domain mapping applied at ingestion: commodity/sector tags mapped to KRYLO's 6 domains (TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP).

**Output contract:** Signal units:
```
{
  source:        'ECONOMIC_FLOW',
  domain:        string,          // single domain per signal — one signal per domain per cycle
  signal:        string,          // e.g. MACRO_BASELINE:TECHNOLOGY
  confidence:    number (0–100),  // normalized baseline strength
  ts:            number,
  polarity:      'POSITIVE' | 'NEGATIVE' | 'ABSENT',
  decay:         'QUARTERLY',     // macro data moves on quarter cycles
  topology:      [],              // no entity-level topology at v1
  baselineIndex: number (0–100),  // normalized macro regime strength for this domain
}
```

**Explicit exclusions:**
- No country-level political risk signals
- No currency or forex signals (Financial/Market scope — WO-1859)
- No direct write to convergence classifier or cone pressure formulas
- No UI surface for macro data
- No per-entity signals — domain-level only at v1
- No real-time data (UN Comtrade and World Bank update quarterly/annually)

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. baselineIndex is an additional field on the signal unit. No schema change to surfacerouter or cone pressure.

**Drift notes:** MACRO_BASELINE signals provide reference context, not pressure. They do not override existing signals — they establish the floor against which velocity signals (WO-1856 TECHNOLOGY_VELOCITY) can be compared. surfacerouter routes them as standard signals; no special dispatch logic required.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Sector-wide demand baselines are the only reference that separates a genuine acceleration signal from noise — without a macro floor, every velocity spike looks like alpha when most is just the tide.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a baselineIndex per domain that contextualizes whether current velocity signals are moving with or against the macro regime."**

---

## 6. FORMULA / CONTRACT

Domain mapping at ingestion:
```
UN Comtrade commodity groups → KRYLO domains:
  Machinery / Electronics / ICT        → TECHNOLOGY
  Financial services / Insurance        → CAPITAL
  Education / R&D outputs              → KNOWLEDGE
  Labour-intensive manufactures        → LABOR
  Media / Publishing / IP              → MEDIA
  Real estate / Construction materials → OWNERSHIP

World Bank indicators → KRYLO domains:
  GDP per sector                       → mapped by sector classification above
```

baselineIndex normalization:
```
raw = sector trade volume or indicator value (varies by source)
z   = (raw - rolling_5yr_median) / rolling_5yr_stddev
baselineIndex = clamp(50 + (z * 10), 0, 100)
  // 50 = at median, >50 = above-trend, <50 = below-trend
```

polarity:
```
baselineIndex > 60 → POSITIVE
baselineIndex < 40 → NEGATIVE
40–60              → POSITIVE (neutral band — baseline is holding)
no data in window  → ABSENT
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/connectors/economicflowconnector.js | NEW — UN Comtrade + World Bank clients, domain mapper, normalization, dispatchBatch | — |
| src/engine/signalconstants.js | Add SIGNAL_SOURCE.ECONOMIC_FLOW, MACRO_BASELINE signal type | All existing constants |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — baselineIndex is a declared normalized reference per domain |
| Does this have a single dominant output? | YES — MACRO_BASELINE signal units via dispatchBatch |
| Are all boundaries explicitly defined? | YES — domain-level only, no entity topology, no cone touch |
| Can this be built without touching an undefined dependency? | YES — both APIs are public, no key required |
| Does this avoid increasing expressive flexibility in the core? | YES — adds one field, no routing logic change |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

- `economicflowconnector.js` dispatches one MACRO_BASELINE signal per KRYLO domain per sync cycle
- Domain mapping confirmed: all 6 KRYLO domains covered
- baselineIndex in range [0, 100] for all dispatched signals
- grep confirms `source: 'ECONOMIC_FLOW'` in dispatched signal units
- ABSENT polarity fires when no data available for a domain
- No raw trade or indicator data exposed in any UI component
- No regression in existing signal routing
