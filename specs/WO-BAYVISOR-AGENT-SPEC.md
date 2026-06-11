# BayVisor — AI Agent Build Specification
**File:** `src/components/resonance/bayvisor.jsx`
**Status:** Production — WO-1713 (2026-06-11)

---

## 1. What This Is

BayVisor is a six-panel HUD bar that sits at the bottom of the viewport. Each panel maps 1:1 to one of six signal bays (FINANCIAL / OPERATING / TIME / PERSONAL / MARKET / KNOWLEDGE). Each panel collapses to a 26 px header strip and expands to a 248 px full HUD body. The component is pure React + inline styles. No CSS file. No external UI library. No Tailwind.

---

## 2. Dependencies

```js
import React, { useState, useRef } from "react";
import { BAY_MAP } from "../../engine/cones.js";
import { useBayStore, MODULE_TYPES } from "../../store/usebaystore.js";
```

- `BAY_MAP` — maps bay IDs (e.g. `"B01"`) to cone keys used in the `cones` prop.
- `useBayStore` — Zustand store. Fields consumed: `bays` (bay assignment objects), `coneColorOverrides` (per-bay color override map), `setConeColor` (setter).
- `MODULE_TYPES` — ordered array of module name strings exported from usebaystore: `['HEADLINE', 'METRICS', 'SPARKLINE', 'FIDELITY', 'A/V', 'ALERTS']` (exact order controls the `< >` cycle buttons).

---

## 3. Design Tokens (locked — do not change)

```js
const MONO    = "'IBM Plex Mono', monospace";
const LIME    = '#66FF00';
const DIM     = 'rgba(255,255,255,0.22)';
const MID     = 'rgba(255,255,255,0.50)';
const BRT     = 'rgba(255,255,255,0.88)';

const COLLAPSED_H = 26;   // px — collapsed header strip
const EXPANDED_H  = 248;  // px — full HUD body
```

Background is always `#000`. No alpha background. No fills other than pure black.

---

## 4. Domain Registry (locked)

Six bays, in order, left to right:

| id    | name       | type          |
|-------|------------|---------------|
| B01   | FINANCIAL  | CAPITAL       |
| B02   | OPERATING  | EXECUTION     |
| B03   | TIME       | TEMPORAL      |
| B04   | PERSONAL   | IDENTITY      |
| B05   | MARKET     | SIGNAL        |
| B06   | KNOWLEDGE  | INTELLIGENCE  |

---

## 5. Top-Level Layout: `BayVisor`

```jsx
export default function BayVisor({ cones = {}, isPremium = false })
```

- Outer container: `display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', padding: '0 4px'`
- Renders one `<BayPanel>` per domain entry.
- `expanded` state: `{ [bayNum]: bool }` — keyed by the numeric part of the bay ID (1–6).
- `toggle(bayNum)` flips the boolean.
- Props passed to each panel:
  - `d` — domain object from the registry
  - `cone` — `cones[BAY_MAP[d.id]]` — signal data from parent
  - `assignment` — `bays[bayNum]?.assignment` from useBayStore
  - `isPremium` — boolean
  - `isExpanded` — `!!expanded[bayNum]`
  - `onToggle` — `() => toggle(bayNum)`
  - `bayNum` — numeric (1–6)

---

## 6. `BayPanel` Component

### 6.1 Local state
```js
const [titleHovered, setTitleHovered] = useState(false);
const [modIdx, setModIdx] = useState(0);
```

### 6.2 Store reads
```js
const coneColorOverrides = useBayStore(s => s.coneColorOverrides ?? {});
const setConeColor       = useBayStore(s => s.setConeColor ?? (() => {}));
```

### 6.3 Derived values
```js
const activeModule  = MODULE_TYPES[modIdx];
const colorOverride = coneColorOverrides[bayNum] ?? null;
const baseColor     = cone?.color ?? LIME;
const color         = colorOverride ?? baseColor;
const pct           = Math.round((cone?.value ?? 0) * 100);
const mainLabel     = assignment?.title ?? d.name;
const isLoaded      = !!assignment;
```

### 6.4 Module cycling
```js
const cycleModule = (dir, e) => {
  e.stopPropagation();
  setModIdx(i => (i + dir + MODULE_TYPES.length) % MODULE_TYPES.length);
};
```

CRITICAL: module cycling is local state only. Never write to Zustand on module change — it causes a full app re-render.

### 6.5 Border + reticle colors
- `borderColor`:
  - Expanded + loaded: `rgba(102,255,0,0.30)`
  - Expanded + empty: `rgba(255,255,255,0.18)`
  - Collapsed: `rgba(255,255,255,0.09)`
- `reticleColor`:
  - Expanded + loaded: `rgba(102,255,0,0.45)`
  - Expanded + empty: `rgba(255,255,255,0.25)`
  - Collapsed: `rgba(255,255,255,0.15)`

### 6.6 Panel container style
```js
{
  flex: 1,
  height: isExpanded ? EXPANDED_H : COLLAPSED_H,
  minWidth: 0,
  position: 'relative',
  background: '#000',
  border: `0.5px solid ${borderColor}`,
  overflow: 'hidden',
  transition: 'height 320ms cubic-bezier(0.4,0,0.2,1), border-color 320ms ease',
  display: 'flex',
  flexDirection: 'column',
}
```

### 6.7 Collapsed header (always rendered)
Height: `COLLAPSED_H` (26 px). Click fires `onToggle`.

Three items in a horizontal row (`justifyContent: 'space-between'`):
1. Bay ID — `d.id` — `fontSize: 7`, `color: LIME`, `letterSpacing: '0.22em'`
2. Title — `mainLabel` — `fontSize: 9`, color: `titleHovered ? '#ffffff' : (isLoaded ? color : MID)`, hover state set on mouseEnter/mouseLeave. `letterSpacing: '0.14em'`, `textTransform: 'uppercase'`
3. Type — `d.type` — `fontSize: 6`, `color: LIME`, `letterSpacing: '0.14em'`, `textTransform: 'uppercase'`

Bottom border when expanded: `0.5px solid rgba(255,255,255,0.07)`.

### 6.8 Module body
```jsx
<ModuleBody module={activeModule} d={d} cone={cone} assignment={assignment} color={color} pct={pct} />
```

### 6.9 Footer (rendered inside the expanded height)
Height: 26 px. `borderTop: '0.5px solid rgba(255,255,255,0.07)'`.

Left side — module selector:
```
< [MODULE NAME] >
```
- `<` and `>` buttons: `fontSize: 10`, `color: LIME`, `cursor: 'pointer'`, no border/background, `onClick = cycleModule(-1/+1, e)`.
- Module name label: `fontSize: 9`, `color: LIME`, `letterSpacing: '0.18em'`, `textTransform: 'uppercase'`, `minWidth: 72`, `textAlign: 'center'`.

Right side — sync tag: `{d.id} · SYNCED`, `fontSize: 6`, `color: LIME`, `letterSpacing: '0.2em'`.

---

## 7. `ModuleBody` Component

```jsx
function ModuleBody({ module, d, cone, assignment, color, pct })
```

Outer container: `flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000'`.

### 7.1 Label row
Rendered for all modules **except HEADLINE** (HEADLINE hides it because its content fills the space).

```jsx
{module !== 'HEADLINE' && (
  <div style={{ padding: '6px 10px 2px', flexShrink: 0 }}>
    <div style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.22em' }}>{label}</div>
    {sublabel && <div style={{ fontFamily: MONO, fontSize: 9, color: assignment ? color : DIM, letterSpacing: '0.1em', lineHeight: 1.4, marginTop: 3 }}>{sublabel}</div>}
  </div>
)}
```

Label map:
```js
{ HEADLINE: d.type, METRICS: 'METRICS', SPARKLINE: 'TREND', FIDELITY: 'FIDELITY SCORE', 'A/V': 'A/V' }[module] ?? module
```

Sublabel map (only HEADLINE has one):
```js
{ HEADLINE: assignment?.title ?? '— NO SIGNAL —' }[module] ?? null
```

### 7.2 Waveform / sparkline strip
Height: 48 px when visible, 0 px when hidden (use `height: 0, padding: 0` — NOT `display: none`). `flexShrink: 0`.

- `showWave = module === 'FIDELITY'` → renders `<Wave color={color} />`
- `showSparkline = module === 'SPARKLINE'` → renders inline SVG chart (see 7.2.1)

#### 7.2.1 SPARKLINE chart (inside the 48 px strip)
Data: `trend = cone?.trend ?? []`

SVG `viewBox="0 0 200 42"`, `preserveAspectRatio="none"`, `width="100%"`, `height={42}`.

- Normalize: `min = Math.min(...trend)`, `max = Math.max(...trend)`, `range = max - min || 1`
- Point array: `{ x: (i / (trend.length - 1)) * 200, y: 42 - ((v - min) / range) * (42 - 4) - 2 }`
- Segments: each segment is a `<line>` between consecutive points. Color: rising = `#66FF00`, falling = `#FF3B3B`, flat = `rgba(255,255,255,0.25)`. `strokeWidth="1.8"`, `strokeLinecap="round"`.
- Y-axis labels: `<text>` at top-left (`max%`) and bottom-left (`min%`), `fontSize="5"`, `fill="rgba(255,255,255,0.25)"`.
- Endpoint dot: `<circle r="2"` at final point, filled with the last segment's color.
- If no trend data: show `NO TREND DATA` in DIM mono, `fontSize: 6`.

#### 7.2.2 Wave (FIDELITY module)
Animated dual-path resonance wave. Inject CSS keyframes via `<style>` tag:

```css
@keyframes wave-fwd { from { transform: translateX(0); } to { transform: translateX(-600px); } }
@keyframes wave-rev { from { transform: translateX(0); } to { transform: translateX(600px);  } }
```

Two SVG path strings (sinusoidal, phase-inverted):
```js
const P1 = "M0,40 C50,6 100,74 150,40 C200,6 250,74 300,40 C350,6 400,74 450,40 C500,6 550,74 600,40 C650,6 700,74 750,40 C800,6 850,74 900,40 C950,6 1000,74 1050,40 C1100,6 1150,74 1200,40";
const P2 = "M0,40 C50,72 100,8 150,40 C200,72 250,8 300,40 C350,72 400,8 450,40 C500,72 550,8 600,40 C650,72 700,8 750,40 C800,72 850,8 900,40 C950,72 1000,8 1050,40 C1100,72 1150,8 1200,40";
```

SVG `viewBox="0 0 600 80"`, `preserveAspectRatio="none"`, `width="100%"`, `height="100%"`, `overflow="hidden"`.

- Static baseline: `<line x1="0" y1="40" x2="600" y2="40" stroke={color} strokeWidth="0.5" opacity="0.12" />`
- P1 `<path>`: `animation: wave-fwd 4s linear infinite`, `strokeWidth="2"`, `opacity="0.9"`
- P2 `<path>`: `animation: wave-rev 6s linear infinite`, `strokeWidth="1"`, `opacity="0.38"`
- Both paths: `stroke={color}`, `fill="none"`

### 7.3 Content area
```jsx
<div style={{ flex: 1, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'stretch', background: '#000' }}>
```

Six module branches rendered via conditional expressions:

---

#### 7.3.1 HEADLINE module

Derived:
```js
const t        = cone?.trend ?? [];
const velocity = t.length >= 2 ? (t[t.length - 1] - t[t.length - 2]).toFixed(2) : null;
const trendUp  = t.length >= 2 ? t[t.length - 1] > t[t.length - 2] : null;
```

Outer layout: `flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 10px 6px', gap: 6`

**Score block** (`flex: 1`, vertically centered):
```jsx
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
  <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', marginBottom: 4 }}>SIGNAL SCORE</span>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
    <span style={{ fontFamily: MONO, fontSize: 52, lineHeight: 0.9, color: color, letterSpacing: '-0.04em' }}>{pct}</span>
    <span style={{ fontFamily: MONO, fontSize: 14, color: color, opacity: 0.6 }}>%</span>
  </div>
</div>
```

**Two small cards** (`flexShrink: 0`, `display: 'flex', gap: 5`):

Card shared style: `flex: 1, border: '0.5px solid rgba(255,255,255,0.09)', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 3`

**Card 1 — VELOCITY:**
- Label: `VELOCITY` — `fontSize: 5.5`, `color: DIM`, `letterSpacing: '0.18em'`
- Body: mini velocity sparkline SVG when `t.length > 1`, else `—` in DIM
  ```js
  const vels   = t.slice(1).map((v, i) => v - t[i]);
  const vmin   = Math.min(...vels);
  const vmax   = Math.max(...vels);
  const vrange = vmax - vmin || 1;
  const W = 80, H = 22;
  // segs: { x1, y1, x2, y2, c }
  // x: (i / (vels.length - 1)) * W
  // y: H - ((v - vmin) / vrange) * (H - 2) - 1
  // c: v > 0 ? '#66FF00' : v < 0 ? '#FF3B3B' : 'rgba(255,255,255,0.25)'
  ```
  SVG: `width="100%"`, `height={H}`, `viewBox="0 0 80 22"`, `preserveAspectRatio="none"`. Each seg is a `<line>` with `strokeWidth="1.5"`, `strokeLinecap="round"`.

**Card 2 — 24H TREND:**
- Label: `24H TREND` — `fontSize: 5.5`, `color: DIM`, `letterSpacing: '0.18em'`
- Arrow: `fontSize: 24`, `lineHeight: 1`
  - `trendUp === null` → `—` in `DIM`
  - `trendUp === true` → `↑` in `#66FF00`
  - `trendUp === false` → `↓` in `#FF3B3B`

---

#### 7.3.2 METRICS module

Derived:
```js
const t        = cone?.trend ?? [];
const velocity = t.length >= 2 ? (t[t.length - 1] - t[t.length - 2]).toFixed(3) : null;
const trendUp  = t.length >= 2 ? t[t.length - 1] > t[t.length - 2] : null;
```

Layout: `flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 10`

Three rows, each `display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'`:

| Label | Value | Value style |
|-------|-------|-------------|
| `SIGNAL SCORE` | `{pct}%` | `fontSize: 18`, `color: LIME` — `%` at `fontSize: 9` |
| `VELOCITY` | `{velocity} pts/tick` or `—` | `fontSize: 11`, `color: BRT` — unit `fontSize: 6`, `color: DIM`, `marginLeft: 2` |
| `TREND` | `↑` / `↓` / `—` | `fontSize: 16`, color lime/red/DIM |

All label text: `fontSize: 6, color: DIM, letterSpacing: '0.20em'`. Trend row uses `alignItems: 'center'` (not baseline) because the arrow is not text-baseline aligned.

---

#### 7.3.3 SPARKLINE module

Content area (below the sparkline strip at top):

Layout: `flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px'`

Three stat columns:

```jsx
// column structure:
<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  <span style={{ fontFamily: MONO, fontSize: 5, color: DIM, letterSpacing: '0.14em' }}>LABEL</span>
  <span style={{ fontFamily: MONO, fontSize: 9, color: BRT, letterSpacing: '0.06em' }}>
    {value}<span style={{ fontSize: 5, color: DIM, marginLeft: 1 }}>UNIT</span>
  </span>
</div>
```

- MIN: `Math.min(...trend).toFixed(1)` or `—`, unit `%`, `color: BRT`
- RANGE: `(Math.max(...trend) - Math.min(...trend)).toFixed(1)` or `—`, unit `pts`, `color: DIM`
- MAX: `Math.max(...trend).toFixed(1)` or `—`, unit `%`, `color: BRT`

RANGE column: `alignItems: 'center'`. MIN: default. MAX: `alignItems: 'flex-end'`.

---

#### 7.3.4 FIDELITY module

```js
const fs       = assignment?.fs ?? null;
const fpct     = fs !== null ? Math.round(fs * 100) : null;
const tier     = fpct === null ? '—' : fpct >= 85 ? 'VALIDATED' : fpct >= 50 ? 'ESTIMATED' : 'LOW FIDELITY';
const tierColor = fpct === null ? DIM : fpct >= 85 ? '#66FF00' : fpct >= 50 ? '#007FFF' : '#FF3B3B';
```

Layout: `flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px', gap: 5`

Three elements:
1. Row `display: flex, justifyContent: space-between, alignItems: baseline`:
   - Label `TRUST`: `fontSize: 6, color: DIM, letterSpacing: '0.18em'`
   - Value `{fpct !== null ? fpct + '%' : '—'}`: `fontSize: 18, color: tierColor`
2. Progress bar: `height: 2, background: rgba(255,255,255,0.07), borderRadius: 1`. Inner fill: `height: 100%, width: ${fpct}%, background: tierColor, borderRadius: 1, transition: 'width 400ms ease, background 400ms ease'`. Render fill only when `fpct !== null`.
3. Tier label: `{tier}`, `fontSize: 6, color: tierColor, letterSpacing: '0.16em'`

---

#### 7.3.5 A/V module

Self-contained `AVModule` component — mount as `{module === 'A/V' && <AVModule />}`.

```js
const AV_MAX_BYTES = 100 * 1024 * 1024; // 100MB

function AVModule() {
  const [src,     setSrc]     = useState(null);
  const [error,   setError]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const fileRef = useRef();
  const vidRef  = useRef();
```

Outer container: `flex: 1, display: 'flex', flexDirection: 'column', background: '#000'`, `onClick={e => e.stopPropagation()}`.

**Empty state** (no src):
- Centered column: `alignItems: center, justifyContent: center, gap: 8`
- Optional error: `fontSize: 6, color: '#FF3B3B', letterSpacing: '0.16em'`
- IMPORT MP4 button: `border: '0.5px solid rgba(102,255,0,0.35)', color: LIME, fontSize: 6, letterSpacing: '0.20em', padding: '4px 12px'`, onClick triggers hidden file input click
- MAX 100MB subtext: `fontSize: 5.5, color: DIM, letterSpacing: '0.14em'`
- Hidden `<input ref={fileRef} type="file" accept="video/mp4,video/*" />`

**Loaded state** (src set):
- `<video ref={vidRef}>`: `flex: 1, width: 100%, objectFit: contain, background: #000, display: block`, `onEnded={() => setPlaying(false)}`
- Controls bar: `height: 24, borderTop: '0.5px solid rgba(255,255,255,0.07)', display: flex, alignItems: center, gap: 8, padding: 0 10px`
  - Play/pause button: `{playing ? '⏸' : '▶'}`, `color: LIME, fontSize: 9`, `onClick={togglePlay}`
  - EJECT button: `color: DIM, fontSize: 6, marginLeft: auto`, `onClick={eject}`

File handler validation:
```js
if (file.size > AV_MAX_BYTES) { setError('FILE EXCEEDS 100MB LIMIT'); return; }
if (!file.type.startsWith('video/')) { setError('MP4 FILES ONLY'); return; }
```
Use `URL.createObjectURL(file)` for src. Revoke with `URL.revokeObjectURL(src)` on eject and on re-upload.

All internal click handlers: `e.stopPropagation()` to prevent panel toggle.

---

#### 7.3.6 ALERTS module

```jsx
function AlertsMode({ isPremium })
```

**Non-premium** (blur paywall):
- Blurred placeholder: `filter: 'blur(2px)'`, text `when signal exceeds...`, `fontSize: 7, color: DIM`
- Overlay: `position: absolute, inset: 0, backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.80)'`
  - Left label `ALERTS`: `fontSize: 6, color: DIM, letterSpacing: '0.2em'`
  - Right UPGRADE button: `border: '1px solid rgba(102,255,0,0.35)', color: LIME, fontSize: 6, letterSpacing: '0.16em', padding: '2px 8px'`

**Premium** (active trigger input):

State: `const [input, setInput] = useState(''); const [trigger, setTrigger] = useState(null);`

When `trigger` is set: show `● {trigger}` in LIME + CLEAR button in `rgba(255,60,60,0.7)`.

When no trigger: text input, `onKeyDown: Enter fires setTrigger(input.trim())`. Input style: `background: transparent, border: none, borderBottom: '0.5px solid rgba(255,255,255,0.12)', color: MID, fontSize: 7`.

All internal clicks: `e.stopPropagation()`.

---

## 8. `Reticles` Component

Four corner L-bracket marks, absolutely positioned within the panel.

```js
const L = 7;  // arm length in px
const T = 1;  // border thickness in px
const corners = [
  { top: 0, left: 0,      borderTop: `${T}px solid ${color}`, borderLeft:   `${T}px solid ${color}` },
  { top: 0, right: 0,     borderTop: `${T}px solid ${color}`, borderRight:  `${T}px solid ${color}` },
  { bottom: 0, left: 0,   borderBottom: `${T}px solid ${color}`, borderLeft:  `${T}px solid ${color}` },
  { bottom: 0, right: 0,  borderBottom: `${T}px solid ${color}`, borderRight: `${T}px solid ${color}` },
];
```

Each corner: `position: absolute, width: L, height: L, pointerEvents: none`. Spread the corner object as additional styles.

---

## 9. Cone Data Shape

Each entry in the `cones` prop (keyed by cone identifier from `BAY_MAP`) may contain:

```js
{
  value: Number,   // 0.0–1.0 — signal score
  color: String,   // hex — overrides LIME default
  trend: Array,    // Array<Number> — time-series of score values (same 0–100 scale as pct)
}
```

All fields are optional. Defaults: `value → 0`, `color → LIME`, `trend → []`.

---

## 10. Assignment Shape

From `useBayStore`: `bays[bayNum]?.assignment`:

```js
{
  title: String,  // displayed as mainLabel and sublabel in HEADLINE
  fs: Number,     // 0.0–1.0 — fidelity score, consumed by FIDELITY module
}
```

---

## 11. Behavioral Rules

1. Panels are independently expandable — expanding one does not collapse others.
2. `modIdx` is per-panel local state. Module selection is not shared between panels.
3. All click events inside the expanded body must call `e.stopPropagation()` to avoid triggering the collapse toggle.
4. The label row is suppressed only for the HEADLINE module.
5. The waveform/sparkline strip uses `height: 0, padding: 0` when hidden — not `display: none`. This preserves flex flow.
6. Color selector mode (`'color'`) is in `MODES` array but not rendered in `ModuleBody` — if reached via cycling, content area is empty black.
7. `setConeColor` is available from store but the color picker UI is not implemented in this file.

---

## 12. What NOT to Add

- No `pointLight`, `ambientLight`, `emissive`, or `meshStandardMaterial` — DOM component only.
- No Tailwind, no CSS modules, no className-based styling.
- No framer-motion — transitions are CSS only via inline `transition:` style.
- No amber (`#D4AF37` or any amber shade) — permanently banned.
- No color values not listed in Section 3 or CLAUDE.md §6.
- No external icon library — arrows (`↑`/`↓`), chevrons (`<`/`>`), and bullets (`●`) are Unicode literals.
- No `display: none` on the waveform strip — use `height: 0` + `padding: 0`.
- No Zustand writes in module cycling — local state only.

---

## 13. Validation Checklist

Before marking complete:

- [ ] All 6 bays expand/collapse independently
- [ ] Module selector cycles HEADLINE → METRICS → SPARKLINE → FIDELITY → A/V → ALERTS → HEADLINE
- [ ] Switching modules changes the ENTIRE bay body (label row + waveform + content)
- [ ] No full-page re-render when cycling modules
- [ ] HEADLINE: big score (52px number) unclipped, VELOCITY mini sparkline, 24H TREND arrow — all fit in 248px height
- [ ] METRICS: three rows (SIGNAL SCORE / VELOCITY pts/tick / TREND arrow), no clipping
- [ ] SPARKLINE: colored segments (lime/red/dim), Y-axis labels, MIN/RANGE/MAX stats below
- [ ] FIDELITY: animated sine wave, TRUST label, tier-colored score + progress bar + tier name
- [ ] A/V: IMPORT MP4 button, plays inline after import, EJECT works, 100MB limit enforced with error text
- [ ] ALERTS: non-premium = blur paywall + UPGRADE button; premium = text input + trigger display
- [ ] No duplicate values anywhere
- [ ] All numbers labeled
- [ ] All backgrounds `#000`
- [ ] No amber anywhere
- [ ] Reticles visible in correct color at each expand/collapse/load state
