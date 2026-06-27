# WO HARDENING — Divergence Spectrum
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2016 — Divergence Spectrum**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/components/analysis/metricstrip.jsx
  (read-only consumer: synthesis.compositeMetrics from WO-2014)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Render a single horizontal bar below the MetricStrip that
positions a pointer on a Consensus → Edge spectrum, derived from
`compositeMetrics.advantage`. FSM-gated: visible only in ACTIVE and
CRITICAL states (WO-2009).

**Output:** A visual bar — no data produced, no writes, no store mutations.
Display-only surface for a value already computed by WO-2014.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `synthesis.compositeMetrics.advantage` — 0–1 scalar from WO-2014
- `synthesis.compositeMetrics.edge` — 0–1 scalar from WO-2014 (pointer velocity tint)
- FSM state from WO-2009 (QUIET / ACTIVE / CRITICAL) — controls visibility

**Output contract:**
- Rendered bar below MetricStrip. No data emitted.
- Visible: ACTIVE (dimmed) and CRITICAL (full brightness)
- Hidden: QUIET state, AMBIGUOUS queries, INSUFFICIENT signal

**Explicit exclusions:**
- No writes to any engine, store, or schema
- No modification of compositeMetrics or synthesis object
- No new data sources — reads only from WO-2014 output
- No tooltip, no label expansion, no interaction beyond passive display

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies
  NOTE: Divergence Spectrum reads compositeMetrics.advantage only.
  No new store subscriptions. No new engine hooks.

**Drift notes:** This is a read-only rendering component. The only
dependency is WO-2014 (compositeMetrics). If WO-2014 is not mounted,
the bar renders at center position (advantage = 0.5 default).

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** KRYLO users currently have no single visual that answers
"am I ahead of the market or aligned with it?" The Divergence Spectrum
makes that question answerable at a glance — pointer right means the
structural read is ahead of consensus; pointer left means the market has
caught up. It is the "Edge-o-meter" that makes position quality legible
without adding dashboard complexity.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a pointer
position on a Consensus–Edge bar — one horizontal visual that tells
the user whether their structural read is ahead of or aligned with
market consensus, derived entirely from existing engine output."**

---

## 6. FORMULA / CONTRACT

### Bar layout

```
[CONSENSUS ←————————————————————————→ EDGE]
              ▲ pointer
```

Pointer position = `advantage × 100%` of bar width.
- advantage = 0.0 → pointer at far left (full consensus)
- advantage = 0.5 → pointer at center
- advantage = 1.0 → pointer at far right (maximum structural edge)

### Pointer color — edge tint

| edge value | pointer color |
|------------|---------------|
| 0.0 – 0.35 | `rgba(255,255,255,0.35)` — neutral |
| 0.35 – 0.70 | `#66FF00` — lime, building edge |
| 0.70 – 1.0 | `#66FF00` with glow `drop-shadow(0 0 4px #66FF00)` — strong edge |

### FSM visibility rules (WO-2009 gates)

| State | Bar visibility | Opacity |
|-------|---------------|---------|
| QUIET | hidden | 0 |
| ACTIVE | visible | 0.5 |
| CRITICAL | visible | 1.0 |

### Visual spec

- Bar height: 2px
- Bar background: `rgba(255,255,255,0.06)` — hairline track
- Pointer: 6px × 6px diamond, centered on track
- Left label: `CONSENSUS` — `rgba(255,255,255,0.18)`, 7px, letterSpacing 0.14em
- Right label: `EDGE` — `rgba(255,255,255,0.18)`, 7px, letterSpacing 0.14em
- Margin: 8px top from MetricStrip bottom edge
- No animation. Pointer moves instantly on value change.

### Fallback (WO-2014 not mounted)

If `compositeMetrics` is null or undefined:
- Bar renders at center position (pointer at 50%)
- Both labels dimmed to `rgba(255,255,255,0.08)`
- No error thrown

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/components/analysis/metricstrip.jsx` | EXTEND — render Divergence Spectrum bar below existing strip; FSM gate on WO-2009 state | All existing metric tiles untouched |

One file. No new files required.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity? | YES — pointer position is a deterministic function of advantage scalar |
| Single dominant output? | YES — one bar, one pointer, one position |
| All boundaries defined? | YES — reads compositeMetrics only; FSM gate is explicit; exclusions enumerated |
| No undefined dependencies? | YES — depends on WO-2014 (compositeMetrics) and WO-2009 (FSM state); both exist |
| No expressive flexibility increase in core? | YES — display-only; no engine changes |

**Verdict: PASS — BUILD-READY.**
Depends on WO-2014 (compositeMetrics) being mounted first.

---

## 9. DEFINITION OF DONE

1. advantage = 0.0 → pointer at far left.
2. advantage = 1.0 → pointer at far right.
3. advantage = 0.5 → pointer at center.
4. edge > 0.70 → pointer has lime glow.
5. QUIET state → bar not visible.
6. ACTIVE state → bar visible at 50% opacity.
7. CRITICAL state → bar visible at full opacity.
8. Null compositeMetrics → bar renders at center, no crash.
9. `grep -n "dispatch\|store.*set\|engine.*write"` in metricstrip.jsx
   returns zero new write references.
