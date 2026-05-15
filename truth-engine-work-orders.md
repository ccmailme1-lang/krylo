# THE TRUTH ENGINE — Architecture Breakdown & Work Orders
## Migration: krylo.html → React/Vite Stack
### Project: Ablinq + Nooma | Deadline: Feb 27, 2026, 18:00 EST

---

## ARCHITECTURE OVERVIEW

### Current State (krylo.org/krylo.html)
Single HTML file. Pure vanilla JS. 2D Canvas Signal Map. Cloud backdrop (#F2F5F7). Anthropic API. No build tools.

### Target State
React + Vite app. Three.js 3D point cloud. #000000 void shell. 4.4Hz metabolic clock. 719ms slam animation. Friction gate at 0.844.

### Component Tree
```
App.jsx (#000000 Void Shell)
├── MetabolicClock (4.4Hz pulse provider)
│   └── SharedSignalBus (useSyncExternalStore)
├── LookingFunnel (Layer 1)
│   ├── CrawlTrack (scrolling phrases)
│   └── SearchBox (truth query input)
├── OracleView (Layer 2)
│   ├── LensToggle (10K View | Ground Level | Signal Map)
│   ├── TenKView
│   │   ├── SignalScore
│   │   ├── TruthStatement (glass panel)
│   │   └── PatternCards (glass panels)
│   ├── GroundLevel
│   │   └── ReceiptRows (velocity, signal count, convergence)
│   └── SignalMapSpine (280px — KRYL-208)
│       └── R3F Canvas
│           └── InstancedMesh (point cloud)
├── AuditDesk (560px — Nooma)
│   ├── FrictionGate (0.844 threshold)
│   ├── SlamAnimation (719ms Z-axis spring)
│   └── FrictionRecord (ghost photo log)
└── TruthEngine (hook: useTruthEngine)
    ├── computeFidelity(Fs)
    ├── computeTemporalWeight(Wt)
    ├── computePressure(Pa)
    ├── computeConvergence(C)
    └── deriveState/Trend
```

### Shared Signal Bus
```
SHARED_SIGNAL_BUS (single source of truth)
├── record: { metadata, telemetry, docs, signature, age, pressure }
├── computed: { Fs, Wt, Pa, C, state, trend }
├── clock: { tick, phase, drift }
└── subscribers: [SpineMap, AuditDesk, MetricDisplay]
```

### What Migrates From krylo.html
| Current Code | Becomes | Owner |
|---|---|---|
| Looking Funnel HTML/CSS | LookingFunnel.jsx | shadcn |
| renderOracle() | OracleView.jsx + child components | shadcn |
| fetchTruth() | useTruthFetch hook | Linsley |
| Truth Engine math (Fs, Wt, C) | useTruthEngine hook | Erikson |
| SignalMap class | R3F InstancedMesh in SpineMap.jsx | Henschel |
| switchLayer() + depth-of-field | LensToggle.jsx + framer-motion | shadcn |
| Glass panel CSS | Tailwind + glassmorphism utilities | shadcn |
| Anthropic API call | api/truth.js (server route or edge fn) | Linsley |

---

## WORK ORDERS

---

### WO-205: Core Oracle Foundation
**Owner:** Mark Erikson
**AI Platform:** Claude 4.5 Sonnet
**Deadline:** T-20h (Feb 26, 22:00 EST)

**Scope:** The metabolic clock and React state synchronization layer.

**Deliverables:**
1. `useMetabolicClock.ts` — 4.4Hz (227ms) tick generator
   - Uses `setInterval` with drift correction (compare expected vs actual timestamps)
   - Exposes `tick` count and `phase` (0-1 sawtooth)
   - Must NOT trigger React re-renders — use `useSyncExternalStore`
2. `SharedSignalBus.ts` — singleton external store
   - Holds all Truth Engine state (record, computed values, clock)
   - `subscribe(listener)` / `getSnapshot()` pattern
   - Any component can read without re-render coupling
3. `useTruthEngine.ts` — hook wrapping the existing math
   - Port from krylo.html: Fs = 0.40*metadata + 0.30*telemetry + 0.20*docs + 0.10*signature
   - Wt = (age/48)^1.5
   - C = (Fs * Wt) - Pa, clamped [0,1]
   - State thresholds: CALM < 0.25, WATCH < 0.60, ALERT ≥ 0.60
   - Trend: ΔC > 0.03 = RISING, < -0.03 = FADING, else STABLE
   - Epsilon = 0.03, firstFrame guard

**Existing code to port (from krylo.html):**
```javascript
// This exact math lives in the current SignalMap._computeState()
// Port it into the hook, wire it to SharedSignalBus
```

**Acceptance Criteria:**
- [ ] 4.4Hz clock runs independently of render cycle
- [ ] Drift stays under 5ms over 60 seconds
- [ ] useTruthEngine produces identical outputs to current krylo.html math
- [ ] No component re-renders from clock tick alone

---

### WO-206: Data Pipeline
**Owner:** Tanner Linsley
**AI Platform:** DeepSeek V3/R1
**Deadline:** T-6h (Feb 27, 12:00 EST)

**Scope:** Data ingestion and API integration.

**Deliverables:**
1. `useTruthFetch.ts` — async hook for truth queries
   - Port existing `fetchTruth()` from krylo.html
   - Anthropic API call (claude-sonnet-4-20250514, max_tokens: 1000)
   - JSON parse with fallback data (exact fallback object exists in current build)
   - Error boundary: always returns valid data shape
2. `ingestPipeline.ts` — zero-copy signal ingestion
   - YouTube/Audio stream → signal extraction
   - Push to SHARED_SIGNAL_BUS without intermediate copies
   - Backpressure handling for high-throughput streams
3. `api/truth.ts` — server-side API route
   - Move Anthropic API key server-side (currently exposed in client fetch)
   - Proxy endpoint: POST /api/truth { query } → { truth data }

**Existing code to port:**
```javascript
// fetchTruth() in krylo.html — the entire try/catch block
// including the system prompt, JSON parsing, and fallback data
```

**Acceptance Criteria:**
- [ ] API key not exposed in client bundle
- [ ] Fallback data renders when API fails
- [ ] Zero-copy ingestion verified (no intermediate array allocations)
- [ ] Response shape matches current: { signal_score, truth_statement, truth_supporting, signals[], patterns[], tags[], ground{} }

---

### WO-207: Content System (The Void Shell)
**Owner:** shadcn
**AI Platform:** Gemini 3 Pro
**Deadline:** T-20h (Feb 26, 22:00 EST)

**Scope:** All UI components, styling, layout. The #000000 void shell.

**Deliverables:**
1. `App.jsx` — root shell
   - Background: #000000 (replacing #F2F5F7 cloud)
   - Font stack: DM Sans 300/400/500/600, Instrument Serif, IBM Plex Mono
   - 10px tracked typography where specified
   - No 1px gray borders. No padding leaks.
2. `LookingFunnel.jsx` — port existing funnel
   - Crawl phrases (vertical scroll animation)
   - Search box with recede transition
   - Adapt colors for void: white text on black
3. `OracleView.jsx` — port existing Layer 2
   - Glass panels with backdrop-filter (adapt for dark bg)
   - Emergence blur animation (1.5s filter, 1.2s opacity — current tuned values)
   - Signal score, truth statement, signal cards, patterns, contribute CTA
4. `LensToggle.jsx` — port existing lens switching
   - 10K View | Ground Level | Signal Map
   - Depth-of-field pulse transition (80ms exit, 140ms enter — current values)
   - Signal Map desktop-only (≥769px)
5. `GroundLevel.jsx` — port existing receipt rows
   - Velocity, Signal Count, Last Signal, Convergence bar
   - Sentiment, Momentum, Tags
6. Layout: Spine (280px) + Desk (560px) side-by-side on desktop

**Existing code to port:**
```
All CSS from krylo.html <style> block
renderOracle() HTML template
switchLayer() transition logic
```

**Acceptance Criteria:**
- [ ] #000000 void — no gray leaks anywhere
- [ ] Glass panels render correctly on dark background
- [ ] Emergence blur timing matches current build (1.5s)
- [ ] Lens switching depth-of-field pulse matches current build
- [ ] Mobile responsive: Signal Map hidden, panels stack
- [ ] All fonts loading (DM Sans, Instrument Serif, IBM Plex Mono)

---

### WO-208: 3D Spinning Signal Map (The Spine)
**Owner:** Paul Henschel
**AI Platform:** Claude 4.5 Opus
**Deadline:** T-12h (Feb 27, 06:00 EST)

**Scope:** Three.js point cloud replacing 2D Canvas Signal Map.

**Deliverables:**
1. `SpineMap.jsx` — R3F Canvas component (280px width)
   - InstancedMesh with 80 point/sphere instances
   - Continuous Y-axis rotation synced to 4.4Hz metabolic clock
   - "Kinetic Jitter" — per-point displacement scaled by signal intensity from SHARED_SIGNAL_BUS
   - Cyan-to-purple color gradient (port from current: y-position mapped)
   - Radial glow per point (shader or sprite)
2. `useSpineData.ts` — hook connecting R3F to signal bus
   - Reads convergence (C), state, trend from SharedSignalBus
   - Convergence → cluster tightness (spread radius = 200 * (1 - C))
   - State → glow intensity (CALM: 0.7, WATCH: 1.0, ALERT: 1.4)
   - Trend → rotation speed modifier (RISING: 1.3x, FADING: 0.7x)
3. Ghost Photo capture
   - `gl.toDataURL()` on friction breach (C > 0.844)
   - Returns base64 PNG for the Friction Record

**Current behavior to match (from krylo.html SignalMap class):**
```
- 80 nodes with radial glow halos
- Slow drift motion
- Boundary wrapping
- Cyan-to-purple gradient based on Y position
- Truth Engine drives convergence/intensity
- CALM = soft/slow, ALERT = bright/fast
```

**New behavior to add:**
```
- 3D space (not 2D canvas)
- Y-axis rotation at 4.4Hz
- Kinetic jitter per point
- gl.toDataURL() snapshot capability
```

**Acceptance Criteria:**
- [ ] 80 points render as InstancedMesh (not individual meshes)
- [ ] Y-axis rotation locked to metabolic clock (no drift)
- [ ] Point coordinates accessible by Friction Gate (via SharedSignalBus)
- [ ] Ghost Photo produces valid base64 PNG
- [ ] 60fps maintained on mid-range hardware
- [ ] Color gradient matches current cyan→purple aesthetic

---

### WO-209: Real Data Integration (The Audit Desk)
**Owner:** David Khourshid
**AI Platform:** OpenAI o3
**Deadline:** T-6h (Feb 27, 12:00 EST)

**Scope:** Friction gate logic, slam animation, accountability layer.

**Deliverables:**
1. `FrictionGate.ts` — XState machine
   - Threshold: 0.844
   - Reads convergence (C) from SharedSignalBus
   - States: CLEAR → APPROACH → BREACH → COOLDOWN
   - APPROACH: C > 0.75 (warning zone)
   - BREACH: C > 0.844 (triggers slam + ghost photo)
   - COOLDOWN: 3s lockout after breach
2. `SlamAnimation.jsx` — 719ms Z-axis spring collision
   - react-spring `useSpring` with config:
     - tension: 300, friction: 20
     - duration: exactly 719ms decay
   - Visual: translateZ snap + bounce-back
   - Color transition: #FFFFFF → #FF4400 on breach
3. `FrictionRecord.tsx` — accountability log
   - Stores: { timestamp (ISO 8601), convergence value, ghost photo (base64), state }
   - Appends on each breach event
   - Renders as scrollable log in Audit Desk (560px panel)
4. `AuditDesk.jsx` — 560px container
   - Intensity bar: 1:1 mapped to Spine Map vertex movement
   - Friction gate status indicator
   - Slam target area
   - Friction Record display

**Acceptance Criteria:**
- [ ] 0.844 threshold fires consistently
- [ ] Slam animation decays in exactly 719ms (±10ms)
- [ ] #FFFFFF → #FF4400 color transition on breach
- [ ] Ghost Photo captured and logged with ISO 8601 timestamp
- [ ] Intensity bar tracks 1:1 with 3D map movement
- [ ] XState machine handles rapid successive breaches without race conditions

---

## DEPENDENCY CHAIN

```
WO-205 (Erikson: Clock + Bus) ──────┐
                                     ├── WO-208 (Henschel: 3D Map) ──┐
WO-207 (shadcn: UI Shell) ──────────┤                                ├── INTEGRATION
                                     ├── WO-209 (Khourshid: Desk) ───┘
WO-206 (Linsley: Data Pipeline) ────┘
```

**Critical path:** WO-205 must ship first. Everything depends on the SharedSignalBus.

**Parallel work:**
- WO-207 (UI) can start immediately — pure components, mock data
- WO-206 (Data) can start immediately — API layer independent of UI
- WO-208 and WO-209 block on WO-205 (need the bus to read from)

---

## VALIDATION GATES

### Gate 1: Foundation Lock (T-20h)
- [ ] `npm run dev` → localhost:5173 responds 200
- [ ] #000000 void renders, no gray leaks
- [ ] 4.4Hz clock running, verified in console
- [ ] SharedSignalBus accepting subscriptions

### Gate 2: Metabolic Sync (T-12h)
- [ ] 3D Map spinning at metabolic rate
- [ ] Point cloud reflects convergence from bus
- [ ] UI components rendering with mock data

### Gate 3: Slam Activation (T-6h)
- [ ] 0.844 friction gate firing
- [ ] #FF4400 color flash on breach
- [ ] 719ms slam decay verified
- [ ] Ghost photo captured on breach

### Gate 4: Final Audit (T-1h)
- [ ] Ghost Photo + ISO 8601 timestamp in Friction Record
- [ ] 3D Map vertex movement 1:1 with Audit Desk intensity bar
- [ ] No node_modules errors
- [ ] three, react-spring, xstate all resolving
- [ ] Anthropic API key server-side only
- [ ] Mobile fallback graceful

---

## VITE PROJECT SETUP

```
krylo/
├── index.html
├── vite.config.ts
├── package.json
├── src/
│   ├── App.jsx
│   ├── core/
│   │   ├── useMetabolicClock.ts      (WO-205)
│   │   ├── SharedSignalBus.ts        (WO-205)
│   │   └── useTruthEngine.ts         (WO-205)
│   ├── api/
│   │   ├── truth.ts                  (WO-206)
│   │   └── ingestPipeline.ts         (WO-206)
│   ├── components/
│   │   ├── LookingFunnel.jsx         (WO-207)
│   │   ├── OracleView.jsx            (WO-207)
│   │   ├── LensToggle.jsx            (WO-207)
│   │   ├── GroundLevel.jsx           (WO-207)
│   │   ├── GlassPanel.jsx            (WO-207)
│   │   └── AuditDesk.jsx             (WO-209)
│   ├── spine/
│   │   ├── SpineMap.jsx              (WO-208)
│   │   └── useSpineData.ts           (WO-208)
│   ├── friction/
│   │   ├── FrictionGate.ts           (WO-209)
│   │   ├── SlamAnimation.jsx         (WO-209)
│   │   └── FrictionRecord.tsx        (WO-209)
│   └── styles/
│       └── void.css                  (WO-207)
```

### Dependencies
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "three": "^0.160",
    "@react-three/fiber": "^8",
    "@react-three/drei": "^9",
    "react-spring": "^9",
    "framer-motion": "^10",
    "xstate": "^5",
    "@xstate/react": "^4"
  }
}
```
