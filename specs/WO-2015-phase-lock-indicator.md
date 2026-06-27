# WO HARDENING — Phase-Lock Indicator
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2015 — Phase-Lock Indicator**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/phaselock.js · src/components/analysis/metricstrip.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Detect which of three quarterly phases (COMMITMENT / EXECUTION /
REFLECTION) the current calendar position falls in, and render a single
Phase Dot in the MetricStrip with the corresponding visual state.

**Output:** A `phaseLock` object `{ phase, dotState }` consumed only by
MetricStrip for dot rendering. No data pipeline involvement.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- Current date (system clock — `new Date()`)
- No engine inputs required. Phase is calendar-derived only.

**Output contract:**
- `phaseLock: { phase: 'COMMITMENT'|'EXECUTION'|'REFLECTION', dotState: 0|1|2 }`
- Consumed by metricstrip.jsx only. No writes anywhere.

**Explicit exclusions:**
- No connection to signal engine, convergence state, or HP logic
- No modification of synthesis.metrics or compositeMetrics
- No external API calls
- Phase detection is purely calendar-based — no market data involved

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies
  NOTE: Phase dot reads only the system clock. No new store subscriptions,
  no new engine hooks, no new data sources.

**Drift notes:** Phase-Lock is a display-only calendar utility. It cannot
influence path topology, signal scores, or HP qualification. Its only
surface is a visual dot in MetricStrip.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The engine processes signals without temporal anchoring to
the market's operational cycle. Phase-Lock gives the user instant context:
are we in a period of target-setting, execution, or outcome validation?
This changes how the user reads convergence signals — the same score means
something different in week 1 vs. week 12 of a quarter.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a Phase Dot —
one small visual indicator that tells the user where they are in the
operational reality cycle, without requiring them to read a date."**

---

## 6. FORMULA / CONTRACT

### Quarter phase mapping (calendar-based)

Each calendar quarter divided into thirds:

| Days into quarter | Phase | dotState | Visual |
|-------------------|-------|----------|--------|
| 0 – 30 | COMMITMENT | 0 | Unlit ring — `rgba(255,255,255,0.15)`, no fill |
| 31 – 60 | EXECUTION | 1 | Soft fill — `rgba(102,255,0,0.4)`, no pulse |
| 61 – 92 | REFLECTION | 2 | Filled + slow pulse animation (1.8s ease-in-out) |

### Quarter boundaries
Q1: Jan 1 – Mar 31
Q2: Apr 1 – Jun 30
Q3: Jul 1 – Sep 30
Q4: Oct 1 – Dec 31

### phaseLock schema
```js
{
  phase:    'COMMITMENT' | 'EXECUTION' | 'REFLECTION',
  dotState: 0 | 1 | 2,
}
```

### Dot visual spec (MetricStrip)
- Size: 6px diameter circle
- Position: inline right of S.DENSITY label
- Dot color: `rgba(255,255,255,0.15)` (state 0) / `rgba(102,255,0,0.40)` (state 1) /
  `#66FF00` with pulse (state 2)
- Pulse: CSS animation, opacity 0.4→1.0→0.4, 1.8s ease-in-out infinite
- No label, no tooltip — the dot is the signal

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/phaselock.js` | NEW — getDayOfQuarter(), getPhase(), getPhaseLock() | — |
| `src/components/analysis/metricstrip.jsx` | EXTEND — import phaselock.js, render Phase Dot inline with S.DENSITY tile | All existing metrics untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity? | YES — phase state is discrete and deterministic from calendar |
| Single dominant output? | YES — phaseLock object, one phase, one dotState |
| All boundaries defined? | YES — calendar only; no engine inputs; no writes |
| No undefined dependencies? | YES — only `new Date()` |
| No expressive flexibility increase in core? | YES — display-only; MetricStrip is the only consumer |

**Verdict: PASS — BUILD-READY.**
Depends on nothing. Can be built independently of WO-2014 and WO-2016.

---

## 9. DEFINITION OF DONE

1. Test Jan 15 date → phase = COMMITMENT, dotState = 0.
2. Test Feb 15 date → phase = EXECUTION, dotState = 1.
3. Test Mar 20 date → phase = REFLECTION, dotState = 2.
4. Dot renders in MetricStrip at correct position (right of S.DENSITY).
5. State 2 pulse animation is visible and does not flicker.
6. `grep -n "synthesis\|convergence\|hp\|signal"` in phaselock.js returns zero.
