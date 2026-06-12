# WO-1719: Bay Simulators

**Status:** SPEC  
**Extends:** WO-1713 (Bay Module Selector), WO-1344 (Six-Bay Domain Isolation)  
**Target files:**  
- `src/components/resonance/bayvisor.jsx` — add SIMULATOR module type  
- `src/store/usebaystore.js` — add SIMULATOR to MODULE_TYPES  
- `src/components/resonance/simulators/` — one component per domain

---

## 1. Concept

Each bay panel gains a `SIMULATOR` module. The simulator is a purpose-built interactive applet that makes the domain's signal tangible — a two-way control surface. The user manipulates parameters; the applet visualizes the output. The cone in the 3D scene optionally reflects the simulation state via the existing pressure/color path.

Cones are canvases. Bays are the palette.

---

## 2. Module Registration

Add `'SIMULATOR'` to `MODULE_TYPES` in `usebaystore.js`:

```js
export const MODULE_TYPES = ['HEADLINE', 'METRICS', 'SPARKLINE', 'FIDELITY', 'A/V', 'ALERTS', 'COLOR', 'SIMULATOR'];
```

`ModuleBody` routes `module === 'SIMULATOR'` to `<SimulatorModule bayNum={bayNum} domain={d} cone={cone} />`.

`SimulatorModule` reads `d.id` → selects the correct simulator component from a registry.

---

## 3. Simulator Registry

```js
const SIMULATOR_MAP = {
  B01: FinancialSimulator,   // FINANCIAL / CAPITAL
  B02: MarketSimulator,      // OPERATING / EXECUTION
  B03: TimelineSimulator,    // TIME / TEMPORAL
  B04: RiskSimulator,        // PERSONAL / IDENTITY
  B05: VolatilitySimulator,  // MARKET / SIGNAL
  B06: CoverageSimulator,    // KNOWLEDGE / INTELLIGENCE
};
```

---

## 4. Simulator Definitions

### B01 — Financial Simulator (Rate Band / Distribution)
**Concept:** Signal pressure distribution histogram + dual-handle range slider  
**Visual:**
- 20 vertical bars showing signal density per pressure bucket
- Bars inside selected band: cone accent color at full opacity. Outside: `rgba(255,255,255,0.10)`
- Track: `1px solid rgba(255,255,255,0.12)`, full width
- Handles: 6×6px square, accent color, draggable
- Band labels below handles: mono 8px accent (`42% — 78%`)
- Avg. density marker: dim horizontal tick above histogram midpoint
**Controls:** min/max pressure handles (drag)  
**Output label:** `SIGNAL BAND: 42% – 78%`  
**Cone feedback:** cone color intensity maps to selected band midpoint

---

### B02 — Market Simulator (Supply / Demand Curve)
**Concept:** Simplified supply/demand crossover — where does signal equilibrium sit?  
**Visual:** Two crossing SVG lines (supply ascending, demand descending), intersection dot  
**Controls:** two sliders — Supply Pressure and Demand Pressure (0–100)  
**Output label:** `EQUILIBRIUM: 61`  
**Cone feedback:** equilibrium value maps to cone pressure

---

### B03 — Timeline Simulator (Event Window Scrubber)
**Concept:** Time window selector — which horizon is the signal most dense in?  
**Visual:** Horizontal sparkline with event density bars + draggable window bracket  
**Controls:** drag window left/right to select time range (NOW / SHORT / MED / LONG / YEARS)  
**Output label:** `PEAK DENSITY: MED TERM`  
**Cone feedback:** selected window maps to temporal horizon weight

---

### B04 — Risk Simulator (Exposure Dial)
**Concept:** Personal exposure meter — how exposed is the user to this signal?  
**Visual:** Arc gauge (180°), needle, zone bands (LOW / MOD / HIGH / CRITICAL)  
**Controls:** single slider — exposure level (0–100)  
**Output label:** `EXPOSURE: HIGH`  
**Cone feedback:** exposure level maps to cone volatility

---

### B05 — Volatility Simulator (Signal Scenario Toggle)
**Concept:** Bull / Base / Bear scenario selector with signal strength readout per scenario  
**Visual:** Three pill toggles (BULL / BASE / BEAR), selected scenario shows signal bar  
**Controls:** scenario toggle (single select)  
**Output label:** `BASE CASE: SIGNAL 66`  
**Cone feedback:** scenario signal value maps to cone pressure

---

### B06 — Coverage Simulator (Knowledge Depth Bar)
**Concept:** How much of the signal space has been covered vs. unknown?  
**Visual:** Segmented horizontal bar — COVERED (lime) / ESTIMATED (blue) / UNKNOWN (dim)  
**Controls:** coverage slider (0–100) — simulates what happens as more data arrives  
**Output label:** `COVERAGE: 63% · GAP: 37%`  
**Cone feedback:** coverage % maps to cone Fs score proxy

---

## 5. Shared Simulator Style

- **Background:** `#000`
- **Font:** IBM Plex Mono throughout
- **Accent:** domain cone color (from `color` prop — respects `coneColorOverride`)
- **Labels:** 8px dim mono, `letterSpacing: 0.18em`
- **Values:** 13px accent color, `letterSpacing: 0.06em`
- **Controls:** hairline track (`1px solid rgba(255,255,255,0.12)`), accent-colored handle (6×6px square, no border-radius)
- **No tooltips.** Output label updates live as handles move.
- **Padding:** `8px 10px`

---

## 6. Cone Feedback (Phase A — Soft)

Phase A: simulator output writes to a local `simulatorState` in `useBayStore` keyed by bayNum. This is read-only from the cone's perspective in Phase A — it does not override live signal pressure.

Phase B (future): `simulatorState` feeds into `buildActiveCones` as a simulation layer, allowing the cone to visually reflect the simulated scenario.

---

## 7. File Structure

```
src/components/resonance/simulators/
  financial.jsx
  market.jsx
  timeline.jsx
  risk.jsx
  volatility.jsx
  coverage.jsx
  index.js          ← exports SIMULATOR_MAP
```

---

## 8. Out of Scope (Phase A)

- Simulator state persistence across sessions
- Cross-bay simulator comparison
- Cone height/geometry changes from simulator (visual color feedback only)
- Exporting simulator output to acquisition payload
