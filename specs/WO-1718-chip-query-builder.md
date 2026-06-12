# WO-1718: Chip-Based Query Builder

**Status:** SPEC  
**Replaces:** `analysisidlefield.jsx` textarea + stacked situation/floor/horizon sections  
**Target file:** `src/components/analysis/analysisidlefield.jsx`

---

## 1. What Goes Away

- `<textarea>` ("What are you trying to figure out?")
- `// attractor-active` animation on textarea
- `WHAT DESCRIBES YOUR SITUATION?` chip grid (current wrap layout)
- `HOW MUCH CAN YOU PUT TOWARD THIS?` floor row
- `HOW FAR OUT ARE YOU THINKING?` horizon row
- `DESCRIBE YOUR SITUATION TO CONTINUE` error nudge
- `SELECT YOUR SITUATION TO CONTINUE` error nudge

## 2. What Stays

- `OptionCapital` widget (above intake body)
- `ADVANCED CONSTRAINTS` expandable section
- `COMPLETE YOUR PROFILE` / `FIND MY PLAN` footer button
- `RETURN TO LIVE` replay gate
- All downstream state: `activeSituation`, `selectedFloor`, `horizon`, `seedQuery` — these remain but are written by the chip chain, not the old form

---

## 3. Chip Chain Architecture

The query is built by progressing through **4 slots** left-to-right. Each slot is a horizontal scrollable row of chips. Selecting a chip in slot N locks it and reveals slot N+1.

```
[SLOT 1: SITUATION] → [SLOT 2: FLOOR] → [SLOT 3: HORIZON] → [SLOT 4: CONTEXT]
```

Slots render stacked vertically with a connector line between them.

---

## 4. Slot Definitions

### Slot 1 — SITUATION
**Label:** `I'M FOCUSED ON`  
**Source:** `SITUATIONS` array (existing)  
**Chips:** one per situation label (BUYING A HOME, CAREER MOVE, etc.)  
**Behavior:** selecting fires `selectSituation(sit)` — same as today. Deselect = tap again.  
**Reveals:** Slot 2

### Slot 2 — FLOOR
**Label:** `WITH`  
**Type:** Signal density histogram + dual-handle range slider (replaces discrete chips)  
**Visual:**
- Histogram: 20 vertical bars showing signal density per capital bucket. Bars inside selected range: `#66FF00` full opacity. Bars outside: `rgba(255,255,255,0.12)`.
- Track: `1px solid rgba(255,255,255,0.12)`, full width
- Handles: 6×6px square, `#66FF00`, draggable
- Floor labels below handles: mono 8px lime (`$10K — $100K`)
- Axis labels: `$0` left, `$100K+` right, dim mono 8px
- Avg. signal density marker: dim horizontal tick above histogram midpoint

**Behavior:** dragging handles writes `setSelectedFloor(value)` with the selected band midpoint. Deselect = drag handles to full range.  
**Reveals:** Slot 3

### Slot 3 — HORIZON
**Label:** `OVER`  
**Source:** `HORIZON_ORDER` (existing)  
**Chips:** NOW · SHORT · MED · LONG · YEARS  
**Behavior:** selecting fires `setHorizon(h)`. Deselect = tap again.  
**Reveals:** Slot 4

### Slot 4 — CONTEXT (optional)
**Label:** `SPECIFICALLY`  
**Type:** single-line text input, not textarea  
**Placeholder:** `any detail that sharpens the signal...`  
**Behavior:** writes to `seedQuery`. Not required for `canExecute`.  
**Reveals:** nothing — chain is complete. Footer CTA activates.

---

## 5. Progressive Reveal

- On mount: only Slot 1 visible
- Each slot fades in (`opacity 0 → 1, translateY 6px → 0`) when its predecessor is filled
- Clearing a slot hides all subsequent slots and their values
- All 4 slots visible simultaneously once chain is fully built

## 6. Chip Style

**Shape:** `border-radius: 999px` — full pill  
**Padding:** `6px 14px`  
**Font:** IBM Plex Mono, 9px, `letterSpacing: 0.14em`, uppercase  

**Unselected:** `background: transparent` · `border: 1px solid rgba(255,255,255,0.2)` · `color: rgba(255,255,255,0.4)`  
**Selected:** `background: transparent` · `border: 1px solid #66FF00` · `color: #66FF00` · checkmark prefix `✓ `  
**Hover (unselected):** `border-color: rgba(255,255,255,0.5)` · `color: #fff`  
**Transition:** `border-color 120ms, color 120ms`  

**Layout:** `display: flex; gap: 8px; flexWrap: wrap` — chips are natural-width (no fixed size, no grid). Label length drives width.

**Row-to-row stagger:** Odd rows get `paddingLeft: 12px`, even rows `paddingLeft: 0` — creating a deliberate brick-offset between rows. Implemented by wrapping each row in a flex-row div after grouping chips by line via a layout pass, or via `nth-child` CSS row detection. The stagger is intentional, not incidental.

**Weighted stacking (standard):** Chips render in signal-weight order — highest relevance/frequency first, reading left-to-right, top-to-bottom. The arrangement itself communicates priority. After a chip is selected, remaining chips re-rank around it (`sortedSituations()` already implements this for Slot 1). Apply same re-rank principle to Slot 3 (HORIZON) based on signal density per time bucket.

## 7. Slot Label Style

`fontFamily: MONO, fontSize: 8, color: rgba(255,255,255,0.18), letterSpacing: 0.28em`  
Sits above the chip row with `marginBottom: 8`.

## 8. Connector

Between each revealed slot: a `1px solid rgba(255,255,255,0.06)` horizontal rule, `margin: 14px 0`.

## 9. Submit Gate (`canExecute`)

Same logic as today: Slot 1 (situation) required. Slots 2–4 optional but contribute to Fs score.

## 10. Downstream Contract

No changes to `submitQuery()`, `handleExecute()`, `acquisitionbroker`, or `querysynthesis`. The chip chain writes the same state fields the old form wrote. Backend contract unchanged.

---

## 11. Disambiguation Screen

Triggered when `processAcquisition` returns more than one candidate signal. Replaces the normal transition to analysis until the user selects one.

### Trigger condition
`acquisitionResult.candidates.length > 1`

### Layout
Full-width overlay within the intake panel (replaces the chip chain). Header + pill grid + confirm button.

```
MULTIPLE SIGNALS FOUND         3 matches
─────────────────────────────────────────
[✓ FINANCIAL · RATE HOLD]   [  MARKET · YIELD CURVE  ]
[  LEGAL · SPV INSTRUMENT  ] [  CAREER · LABOR SIGNAL ]
─────────────────────────────────────────
                    [ ANALYZE SELECTED ]
```

### Pill chip style (KRYLO palette)
- **Shape:** `border-radius: 999px` — full pill
- **Size:** `padding: 6px 14px`
- **Font:** IBM Plex Mono, 9px, `letterSpacing: 0.14em`, uppercase
- **Layout:** icon slot (domain glyph, 10px) + label, `gap: 6px`
- **Unselected:** `background: transparent`, `border: 1px solid rgba(255,255,255,0.2)`, `color: rgba(255,255,255,0.4)`
- **Selected:** `background: transparent`, `border: 1px solid #66FF00`, `color: #66FF00`, checkmark prefix `✓ `
- **Hover (unselected):** `border-color: rgba(255,255,255,0.5)`, `color: #fff`
- **Transition:** `border-color 120ms, color 120ms`

### Domain glyphs (text, mono)
`FINANCIAL → $` · `MARKET → ◈` · `LEGAL → ⚖` · `CAREER → ▲` · `HEALTH → ✦` · `TECHNOLOGY → ⬡`

### Selection behavior
- Single-select only (tapping a new chip deselects previous)
- `ANALYZE SELECTED` activates only when one chip is selected
- Tapping the selected chip again deselects it (ANALYZE SELECTED dims)

### ANALYZE SELECTED button
`background: transparent`, `border: 1px solid #66FF00`, `color: #66FF00`, mono, full width, `letterSpacing: 0.3em`. Dims to `border-color: rgba(255,255,255,0.1)`, `color: rgba(255,255,255,0.2)` when no chip selected. Fires the same `handleExecute` path with the selected candidate injected as `pendingAcquisition`.

### Back link
`← REFINE QUERY` — dim mono text, top-left, returns user to the chip chain with current slot values preserved.

### Max display
Show up to 6 candidates. If `candidates.length > 6`, show top 6 by Fs score descending + a dim `+N more` label (non-interactive, phase A).

---

## 12. Out of Scope

- Slot ordering is fixed (not drag-to-reorder)
- No multi-select per slot
- No chip search/filter within a slot
- No persistence of chain state across sessions (phase A)
- Disambiguation multi-select (phase A: single pick only)
