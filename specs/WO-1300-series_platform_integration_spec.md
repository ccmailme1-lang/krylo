# KRYLO — Platform Integration Spec
## WO-1300 Series: Agent Transfer Summary → Platform Reality
**Status:** PENDING FOUNDER REVIEW
**Authored:** 2026-05-13
**Revised:** 2026-05-13 (deployment topology corrected — see revision notes at bottom)
**Source:** Agent Transfer Summary (restore/Agent transfer summary.md)

---

## EXECUTIVE PROBLEM STATEMENT

The Agent Transfer Summary session produced a substantial conceptual architecture covering:
- Signal/Fidelity/OracleSignal data contract
- Constitutional runtime FSM
- SAB-approved guest acquisition funnel (5 phases)
- Performance governance doctrine
- Event algebra substrate

**The critical gap:** All of this was developed with no visibility to the actual KRYLO platform.
The following spec maps each concept to what ALREADY EXISTS and what NEEDS TO BE BUILT.

---

## WHAT ALREADY EXISTS (DO NOT REBUILD)

| Transfer Summary Concept | KRYLO Reality | File |
|---|---|---|
| **Fidelity Score (Fₛ)** | `fs` field + `fidelity: { m_checksum, t_telemetry, e_viral }` on every signal | `src/app.jsx` stub signals, `src/hooks/useingest.js` |
| **Signal Score** | `node.strength` / `signal.fs` — already drives node size/color in Signal Map | `src/components/spine/spinemap.jsx` |
| **"Signals are non-authoritative"** | Already true — signals propose, convergenceclassifier decides state | `src/engine/convergenceclassifier.js` |
| **5-state convergence system** | classifyConvergenceState() — INSUFFICIENT/LOW/BUILDING/TURBULENT/HIGH | `src/engine/convergenceclassifier.js` |
| **Hysteresis buffer** | applyTransitionPolicy() — 3-frame gate, lockedCognitiveState | `src/engine/convergenceclassifier.js` |
| **FSM "IDLE" state** | SURFACE_PHASE.AMBIENT + RENDER_OWNER.CLUSTER | `src/engine/surfacecontract.js`, `src/context/SurfaceContext.jsx` |
| **FSM "INTERACT" state** | SURFACE_PHASE.SCANNING + RENDER_OWNER.MAP (post-submit Signal Map) | `src/context/SurfaceContext.jsx` |
| **FSM "DRILLDOWN→VERIFY"** | RENDER_OWNER.ORACLE (node click → OracleView) | `src/app.jsx` view:'oracle' |
| **Event bus (postMessage)** | `type: 'krylo-submit'` listener — already the cross-document bridge | `src/app.jsx` |
| **Physics tier discrimination** | HIGH_CORE constant — hardware.concurrency gates LOD | `src/components/spine/spinemap.jsx`, `src/components/spine/leveragelattice.jsx` |
| **Render owner authority** | RENDER_OWNER.CLUSTER/MAP/ORACLE — exactly "who owns the canvas" | `src/engine/surfacecontract.js` |
| **Guest funnel Phase 1 (Entry)** | ClusterField ambient canvas behind krylo-feed.html | `src/components/spine/clusterfield.jsx` (WO-1215) |
| **Cluster-to-submit collapse** | useClusterTransition — morphs clusters to centroid on submit | `src/hooks/useclustertransition.js` (WO-1201) |

---

## GAPS — WHAT NEEDS TO BE BUILT

### GAP 1: No formal OracleSignal output contract
The Transfer Summary defines OracleSignal as:
```
{ value (0-1), state, confidence, trend, volatility, priority, timestamp }
```
Currently: oracleview.jsx reads raw signal data and convergence state separately with no normalized output shape. Different layers read different fields. No canonical schema.

### GAP 2: Constitutional FSM — active drift already occurring
Currently split across three independent state authorities:
- `PrismContext.jsx` → status: AMBIENT | THINKING | ORACLE (3 states)
- `app.jsx` → view: 'funnel' | 'map' | 'oracle' | 'vault' | 'proxy' (5 states, 17 hooks)
- `SurfaceContext.jsx` → renderOwner + phase (6 combinations)

These are manually paired at every call site (e.g., `goToOracle()` calls both `transitionTo()` and `setview()`). The convention holds today. With 17 hooks and 3 independent state authorities, invalid composite states are statistically inevitable as the codebase grows. This is not "cleanup" — it is **state legality enforcement** before the surface becomes trust-critical.

**Critical unmapped states:** app.jsx has 5 view values — 'funnel', 'map', 'oracle', 'vault', 'proxy'. The Transfer Summary FSM covers only 5 states (AMBIENT/ENGAGE/DRILLDOWN/VERIFY/RECOVERY). The 'vault' and 'proxy' views have no FSM equivalents. WO-1301 MUST resolve this mapping before building.

### GAP 3: Guest funnel Phases 2-5 not built
- Phase 2 (Tactile Mutation): ClusterField canvas has no raycaster, no ripple displacement
- Phase 3 (Multi-view): Not built. Infrastructure-heavy. Deferred.
- Phase 4 (Forensic Probe): OracleView shows synthesis but no fidelity breakdown, no lineage display
- Phase 5 (State Lock): No email capture. No session persistence.

### GAP 4: No frame budget enforcement
Hardware LOD exists (WO-1044) but is binary and set at mount. No rolling FPS monitor. No thermal degradation detection. No self-preservation under sustained load.

### GAP 5: No event ledger / replay
No persistent event log. No deterministic replay. No hash chain on signal events.
(Infrastructure-scale work — Phase 3.)

---

## WORK ORDER REGISTRY — WO-1300 SERIES

---

### WO-1300: Signal-Fidelity-Oracle Contract (SFO-1.0)
**Status:** PENDING GO
**Classification:** SCHEMA STABILIZATION BOUNDARY — mandatory before any user-facing trust surface

**Problem:** Fidelity Score and Signal Score exist on signals but have no formal output contract. The Translation Plane is uncontrolled — different layers pull different fields, confidence derivation is implicit, and fallback logic is scattered. Without this, downstream WOs (1303, 1304) operate against unstable semantic reads.

**What gets built:**
A single normalization function in `src/engine/oraclesignal.js`. Every UI layer reads from OracleSignal only — raw signal fields are non-authoritative past this boundary.

**Evidentiary pipeline (locked):**
```
Raw Signal
  ↓
normalizeToOracleSignal()
  ↓
OracleSignal Contract
  ↓
All Layer 2 / Layer 3 / Layer 4 display
```

**OracleSignal schema (locked):**
```js
{
  id:          string,
  value:       number (0-1),   // normalized from signal.strength / signal.fs
  state:       string,         // convergence label: 'INSUFFICIENT' | 'LOW' | 'BUILDING' | 'TURBULENT' | 'HIGH'
  stateId:     number (0-4),   // convergence stateId from classifier
  confidence:  number (0-1),   // telemetryConfidence — from fidelity components
  trend:       'rising' | 'falling' | 'stable',
  theme:       string,         // color token from classifier
  priority:    number (0-1),   // derived: value × confidence
  timestamp:   number,         // signal.born or Date.now()
  _raw:        object          // original signal (non-authoritative, debug only)
}
```

**Fidelity → confidence derivation:**
```js
// Weighted inputs already present on signals in app.jsx:
confidence = (fs.m_checksum × 0.40) + (fs.t_telemetry × 0.30) + (fs.docs × 0.20) + (fs.voice × 0.09) + (fs.viral × 0.01)
// Fallback: use signal.fs directly if no fidelity breakdown present
```

**Hidden value beyond the schema:**
- Centralizes all fallback logic in one place
- Eliminates React render ambiguity from inconsistent field reads
- Makes confidence derivation deterministic and testable
- Creates the foundation for the forensic panel (WO-1304) to be non-stale

**Files:**
- NEW: `src/engine/oraclesignal.js` — `normalizeToOracleSignal(signal, convergenceResult)`
- MODIFY: `src/components/oracleview.jsx` — consume OracleSignal instead of raw signal
- MODIFY: `src/engine/surfacecontract.js` — update `signalToNode()` to include normalized value/confidence

**Rule:** UI is forbidden from computing scores. OracleSignal is the only input to any Layer 2/3/4 display.

---

### WO-1301: Constitutional Runtime (Unified FSM)
**Status:** PENDING GO
**Classification:** FOUNDATIONAL STABILITY LAYER — not architectural hygiene, active drift prevention

**Problem:** app.jsx currently manages view routing with 5 view values, 17 hooks, and manual pairing of `setview()` + `transitionTo()` at every call site. Three independent state authorities (PrismContext, app.jsx view, SurfaceContext) govern surface behavior with no legality enforcement. The manual pairing convention holds today but is not resilient. With 17 hooks and growing surface complexity, invalid composite states are statistically inevitable.

**Unmapped state requirement (MUST RESOLVE BEFORE BUILD):**
app.jsx has 5 view values: 'funnel', 'map', 'oracle', 'vault', 'proxy'. The proposed FSM covers AMBIENT/ENGAGE/DRILLDOWN/VERIFY/RECOVERY. The 'vault' (Layer 3 Ground Level) and 'proxy' (PersonaProxy) views must be explicitly mapped before any code is written. Agent must stop and present the mapping to Founder before proceeding.

**What gets built (after mapping resolved):**
A constitutional state machine in `src/engine/constitutionalfsm.js` that defines:
- Complete Tier-0 state set covering all 5 existing view values
- Legal transition graph
- degradationProfile as orthogonal modifier (NOT a state)

**Tier-0 KRYLO States (base mapping — vault/proxy positions TBD):**
```
AMBIENT    → Pre-submit. ClusterField owns canvas. (= 'funnel' view)
ENGAGE     → Signal Map active. User exploring nodes. (= 'map' view)
DRILLDOWN  → Node selected. Oracle loading. (= transition into 'oracle')
VERIFY     → Oracle view resolved with signal data. (= 'oracle' view)
VAULT      → Ground Level active. (= 'vault' view) ← POSITION TBD
PROXY      → PersonaProxy active. (= 'proxy' view) ← POSITION TBD
RECOVERY   → Error state. Fallback render. (= new)
```

**degradationProfile (orthogonal, NOT a state):**
```
NONE | DEGRADED_1 | DEGRADED_2
```
Physics layer sets degradationProfile. FSM does NOT know about it.

**Files:**
- NEW: `src/engine/constitutionalfsm.js` — state graph, `canTransition()`, `transition()`
- MODIFY: `src/context/SurfaceContext.jsx` — wire FSM into transitionTo(), enforce legality
- MODIFY: `src/app.jsx` — replace manual view switching with FSM transitions
- DEPRECATE: PrismContext status field (AMBIENT/THINKING/ORACLE) — FSM replaces this

**Key rule:** FSM is the ONLY system that mutates surface state. React view switching must go through it.

---

### WO-1302: Frame Budget Watchdog
**Status:** PENDING GO
**Classification:** RUNTIME SURVIVABILITY ADAPTATION — not LOD management

**Problem:** Hardware LOD (WO-1044) is binary and set at mount. No continuous performance monitoring. No thermal degradation detection. No self-preservation under sustained load. This becomes critical once tactile mutation (WO-1303) and forensic panel (WO-1304) add GPU cost.

**What gets built:**
A lightweight runtime watchdog in `src/engine/watchdog.js` that runs inside the existing rAF loop (spinemap.jsx useFrame) and:
1. Tracks rolling 30-frame FPS window
2. Detects sustained downward slope
3. Sets degradationProfile (feeds into WO-1301 FSM)
4. Strips expensive renders without touching constitutional state

**Watchdog behavior:**
```
IF rolling_avg_fps < 40 for 5 consecutive seconds:
  → set degradationProfile = DEGRADED_1
  → reduce leveragelattice segment count
  → disable clusterfield particle trails
  → notify SurfaceContext

IF rolling_avg_fps < 25:
  → set degradationProfile = DEGRADED_2
  → pause SignalMap animation
  → static fallback mode
```

**Restoration (hysteresis-gated):**
```
IF rolling_avg_fps > 55 for 8 seconds while DEGRADED:
  → restore degradationProfile one level toward NONE
  → re-enable one capability at a time (spectacle before function)
```

**Files:**
- NEW: `src/engine/watchdog.js` — `FrameWatchdog` class, `useFpsMonitor()` hook
- MODIFY: `src/components/spine/spinemap.jsx` — integrate useFpsMonitor() in useFrame
- MODIFY: `src/context/SurfaceContext.jsx` — expose degradationProfile state

---

### WO-1303: Guest Funnel — Tactile Mutation Layer
**Status:** PENDING GO — dep: WO-1300 complete
**Classification:** PERCEPTUAL THRESHOLD EVENT — upgrades canvas from passive media to responsive topology

**Parallelization note:** WO-1303 and WO-1301 are intentionally parallelizable. WO-1303 operates entirely within ClusterField perceptual rendering and does not mutate constitutional application state. WO-1301 operates at the application-state governance layer and does not depend on tactile rendering semantics. Both may execute concurrently after WO-1300 is complete.

**Problem:** ClusterField is ambient-only — no interaction. The SAB funnel requires Phase 2: sensory proof that the canvas is physics, not wallpaper.

**What gets built:**
Pointer tracking + vertex displacement in `clusterfield.jsx`. Cursor proximity triggers Y-axis displacement in nearby cluster nodes.

**Behavior spec:**
- Displacement falloff: `Δy = amplitude × 1/(d² + ε)` where d = distance from cursor to node in world space
- Amplitude: starting value 0.3 units — **subject to Founder calibration gate before shipping**
- Wave radius: 2.5 units in world space — **subject to Founder calibration gate**
- Decay: 300ms ease-out after cursor leaves proximity — **subject to Founder calibration gate**
- Color: NO new colors introduced. Node material opacity modulates only — no new hex values.

**Founder calibration gate (MANDATORY):**
WO-1303 is not considered complete until Founder-approved tactile calibration is finalized under live hardware conditions. Engineering completion alone is insufficient. Acceptance requires Founder validation of:
- Damping curve
- Displacement ceiling
- Latency smoothing
- Perceptual weight (does it feel alive or does it feel like a game UI)
- Motion comfort

**Design constraint:** This is SENSORY PROOF OF PHYSICS. Bad tactile tuning causes nausea, parallax feel, or "game UI" degradation. The calibration session is not optional.

**Files:**
- MODIFY: `src/components/spine/clusterfield.jsx`
  - Add pointer tracking via `onPointerMove` on Canvas
  - Pass cursor world position to vertex shader via uniform
  - Add displacement calculation in useFrame

---

### WO-1304: Guest Funnel — Forensic Signal Panel
**Status:** PENDING GO — dep: WO-1300 + (WO-1301 ‖ WO-1303) complete
**Classification:** TRUST MATERIALIZATION — the actual platform moat

**Problem:** OracleView shows synthesis but lacks the evidence exposure moment. The SAB funnel requires the user to inspect HOW a signal's confidence was constructed. This is the moment the platform exits "visualization" territory and becomes an evidentiary instrument.

**What gets built:**
A collapsible forensic panel within OracleView that exposes:
1. Signal origin chain: source name, timestamp, fidelity components
2. Convergence state: current label + what drove it (D/V/A/T vector summary)
3. Confidence breakdown: m_checksum / t_telemetry / e_viral displayed as proportion bars
4. Signal integrity line: OracleSignal.confidence rendered as a single authoritative value

**Critical data rule:**
```
Raw Signal
  ↓
normalizeToOracleSignal()  (WO-1300)
  ↓
OracleSignal Contract
  ↓
Forensic Projection (this panel)
```
The forensic panel MUST NOT read raw signal fields directly. OracleSignal is the only permitted input. No exceptions.

**Telemetry invalidation requirement (load-bearing):**
The forensic panel MUST subscribe to normalized OracleSignal update events and invalidate/recompute forensic projections on signal refresh. Mount-time normalization is prohibited. The panel may never display stale fidelity, checksum, telemetry, or confidence data after a signal mutation cycle. Stale forensic data LOOKS authoritative — users cannot visually detect the drift. That is a trust-killer.

**Implementation:** Subscribe to signal updates via useEffect dependency on the records array from usetruthlens. Re-normalize on every records change. Do not cache OracleSignal beyond a single render cycle.

**NOT built in this WO:** Cryptographic hash chains, ledger persistence, replay. Those are Phase 3 infrastructure. This WO surfaces the concept using data that already exists.

**Aesthetic:** Warm White (#F5F5F7) surface. IBM Plex Mono for all data rows (Forensic Voice). Serif for synthesis text (Oracle Voice). Follows existing oracle.css. No new colors introduced — all values from locked palette.

**Trigger:** Forensic panel opens when user clicks an ETR card in OracleView. Collapses on click-outside.

**Files:**
- MODIFY: `src/components/oracleview.jsx` — add forensic panel, wire OracleSignal subscription
- MODIFY: `src/styles/oracle.css` — forensic panel layout styles
- READS FROM: `src/engine/oraclesignal.js` (WO-1300) exclusively

---

### WO-1305: Guest Funnel — Session Acquisition (State Lock)
**Status:** PENDING GO — dep: WO-1304
**Priority:** LOW — retention before trust is wasted engineering. Build after 1304 is validated.

**Problem:** Phase 5 of the SAB funnel — user has validated signal integrity and wants to preserve their session. No mechanism exists to capture user identity or persist session state.

**What gets built:**
A minimal acquisition strip that appears AFTER forensic panel engagement. Not a modal.

**Exact copy (locked by SAB):**
```
SIGNAL TRACE SECURED
Session: [generated short ID]

Enter your transmission address to bind this signal sequence permanently:
[ Email Address input ]  [ LOCK IN ]
```

**Behavior:**
- Strip fades in after 45 seconds of active Oracle view time
- OR: User explicitly clicks "PRESERVE SESSION" (visual design TBD — color awaiting Founder approval)
- On submit: stores email + session query + OracleSignal snapshot to localStorage (Phase A only)
- Phase B (live backend): POST to endpoint, convert to account — backend unspecced, blocked

**Files:**
- NEW: `src/components/statelock.jsx`
- MODIFY: `src/components/oracleview.jsx` — render statelock.jsx conditionally after dwell timer
- NO backend work in Phase A

---

### WO-1306: Typed Event Bus
**Status:** PENDING GO — dep: WO-1301
**Priority:** LOW — not urgent, but app.jsx as integration nexus will become a scaling hazard

**Problem:** All cross-layer communication flows through a single `type: 'krylo-submit'` postMessage. Adding new cross-layer events requires editing app.jsx directly. As surface complexity grows, app.jsx will become untouchable.

**What gets built:**
A thin typed event bus in `src/engine/eventbus.js`.

**Event domains (locked):**
```
Signal Domain  (10-19): krylo-submit, node-hover, node-select
FSM Domain     (20-39): state-transition, recovery-request
Physics Domain (40-49): degradation-change, fps-report
```

**What does NOT change:** The existing `type: 'krylo-submit'` postMessage from krylo-feed.html is untouched. EventBus wraps it internally.

**Files:**
- NEW: `src/engine/eventbus.js` — EventBus singleton, `emit()`, `on()`, `off()`
- MODIFY: `src/app.jsx` — replace manual message listener with EventBus.on()
- MODIFY: `src/context/SurfaceContext.jsx` — consume FSM domain events

---

## SCOPE DELINEATION — NOT IN SCOPE (WO-1300 SERIES)

| Concept | Reason |
|---|---|
| Formal State Machine Verification (TLA+) | Research-grade. No runtime infra. Phase 3+. |
| Event Algebra (trace monoids, KSIS-ALGEBRA-001) | Research-grade. Theoretical only. Phase 4+. |
| Cryptographic hash chain / ledger | Backend infrastructure. Phase 3. Requires Render.com persistence. |
| Deterministic replay engine | Depends on ledger. Phase 3. |
| CI/CD performance gates | DevOps. Not in frontend WO scope. |
| Nightly GPU determinism farm | Infrastructure. $230/month. Phase 3. |
| Guest Funnel Phase 3 (Multi-view navigator) | GPU-intensive infrastructure. Defer. |
| Distributed event system | Scale-phase. Not required until multi-server. |
| SBC-1.0 formal contract as code | WO-1300 builds the practical subset. |

---

## DEPENDENCY CHAIN (CORRECTED)

```
WO-1300 (Schema stabilization boundary — serial, mandatory first)
  ↓
WO-1303 ‖ WO-1301  (intentionally parallel — independent concerns)
  │          │
  │          └── WO-1302 (Watchdog — feeds degradationProfile into 1301 FSM)
  │
  └── WO-1304 (requires both 1303 complete + 1301 complete)
        ↓
      WO-1305 (State Lock — after 1304 validated)
      WO-1306 (Event Bus — after 1301 stable)
```

**Parallelization rule:** WO-1303 operates entirely within ClusterField rendering and does not mutate constitutional application state. WO-1301 operates at the state governance layer and does not depend on tactile rendering semantics. They may execute concurrently after WO-1300 is complete. This declaration exists to prevent accidental serialization by future engineers.

---

## RECOMMENDED BUILD SEQUENCE

**Phase A — Stabilize Semantics**
1. **WO-1300** — OracleSignal contract. Mandatory first. Blocks 1303 start (semantic reads must be stable before perceptual layer).

**Phase B — Establish Perceptual Credibility + Constitutional Order (parallel)**
2. **WO-1303** — Tactile mutation. ClusterField only. Followed by Founder calibration gate.
2. **WO-1301** — Constitutional FSM. After vault/proxy state mapping resolved with Founder.
3. **WO-1302** — Watchdog. After 1301 (feeds degradationProfile into FSM).

**Phase C — Materialize Trust**
4. **WO-1304** — Forensic panel. After 1300 + 1301 + 1303 complete.

**Phase D — Optimize and Extend**
5. **WO-1305** — Session acquisition. After 1304 is validated by users.
6. **WO-1306** — Event bus. After 1301 is stable.

---

## GOVERNING PRINCIPLE (from Transfer Summary — confirmed actionable)

> **"Fidelity ≠ Priority ≠ Truth ≠ Presentation"**

This is the governing principle for WO-1300. The `fs` field already IS Fidelity. `strength` already IS the priority proxy. The missing piece is a Translation Plane that enforces these never contaminate each other — which is what OracleSignal normalization provides.

The formal algebra work (trace monoids, TLA+, KSIS-ALGEBRA-001) documents a potential future for KRYLO's backend architecture. It cannot be built on the current stack without significant infrastructure investment. It is documented and preserved, not discarded.

---

## REVISION NOTES

**2026-05-13 v1 → v2:**
- WO-1301 reclassified from "HIGH IMPACT, MEDIUM RISK" to FOUNDATIONAL STABILITY LAYER. Reason: app.jsx has 17 hooks + 3 independent state authorities. Manual pairing convention is not resilient. Invalid composite states are statistically inevitable.
- Added unmapped state requirement to WO-1301: vault/proxy views have no FSM equivalents. Mapping must be resolved with Founder before build begins.
- Dependency chain corrected: 1303 ‖ 1301 are parallel after 1300. Previous spec incorrectly serialized them.
- WO-1303 Founder calibration gate added. Engineering completion ≠ WO complete.
- WO-1304 telemetry invalidation requirement added as load-bearing constraint. Mount-time normalization prohibited.
- WO-1304 data pipeline formalized: forensic panel reads OracleSignal only — never raw signals.
- Build sequence reorganized into Phase A/B/C/D to reflect deployment-oriented topology.
