# WO-1343 — Kinetic Optics: Field-Sampling Lens
**Status:** PHASE A COMPLETE  
**Date:** 2026-05-29  
**File:** `src/components/spine/spatiallens.jsx`  
**Surface:** `analysisfield.jsx` Layer 0

---

## System Identity

The SpatialLens is an **instrumented perception layer** embedded in the AnalysisField. It is not a visual effect. It samples local field convergence under the cursor and exposes it as a readable signal.

---

## Core Invariant

```text
LensPhysics ∩ FieldState = ∅
```

The lens reads the field. It never writes to it. No mutations, no feedback loops, no influence on convergence scores, signal positions, or session state.

---

## Architecture

### Kinetics Model
All position and scale state lives in a `ref`, not React state. The physics path is:

```text
gesture/pointer event → kinetics ref (raw input)
    ↓
requestAnimationFrame tick → smoothed state (DAMPING = 0.14)
    ↓
direct DOM mutation (ringRef, readoutRef)
    ↓
onSample callback (parent receives readout — read only)
```

Zero React re-renders on the physics path. The ring and readout elements are mutated directly via refs inside the RAF loop.

### Geometry
Phase A: CSS border-radius circle (DOM, not WebGL). Correct approach — avoids the invalid EllipseCurve → TubeGeometry pattern.

Phase B (deferred): `<ringGeometry args={[1.95, 2.05, 64]} />` inside the same Canvas as SignalMap for true refractive transmission. Requires same-canvas injection — deferred until SignalMap exposes a lens mount point.

### Field Sampling (Phase A)
Cursor position is normalized against the container width and mapped proportionally across the signals array. Signals within the lens radius (by index proximity) are averaged for convergence score.

```text
Phase A: index-space proximity (approximation)
Phase B: world-space raycast into SignalMap scene (accurate)
```

### Scale Input
- **Mouse wheel** — `rawScale *= 1.1 or 0.9` per tick
- **Two-pointer pinch** — ratio of current distance to initial pinch distance × scale₀
- Range: `[0.4, 4.0]`

---

## OrbitControls
The AnalysisField's Layer 0 wraps SignalMap which owns its own Canvas and any internal OrbitControls. The SpatialLens does not touch OrbitControls — it attaches to the container div, not the Canvas internals. Wheel events use `stopPropagation()` to prevent leaking to underlying scroll handlers.

Phase B note: when the lens is injected into the same Canvas as SignalMap, OrbitControls must be gated: `controls.enabled = !gestureActive`. See architectural critique (2026-05-29) for the correct constraint.

---

## Convergence Color Semantics
Consistent with the locked color/motion specification:

| Local Convergence | Color     | Meaning                  |
|-------------------|-----------|--------------------------|
| ≥ 0.70            | `#8A2BE2` | HIGH CONVERGENCE field   |
| ≥ 0.40            | `#66FF00` | BUILDING CONVERGENCE     |
| < 0.40            | `#007FFF` | LOW / TURBULENT signal   |

---

## Readout Fields
Emitted via `onSample` callback and displayed floating near the ring and in the AnalysisField header (◎ indicator):

| Field              | Meaning                                              |
|--------------------|------------------------------------------------------|
| `localConvergence` | Average convergence score of nodes under lens        |
| `nodeCount`        | Number of nodes sampled in lens radius               |
| `pressureGradient` | Normalized pressure density (total / count × N)      |

---

## Integration Points
- **Mounted in:** `analysisfield.jsx` Layer 0 div (`layer0Ref`)
- **Receives:** `signals[]`, `onSample`, `containerRef`
- **Header readout:** `◎ {localConvergence}` in AnalysisField header bar, colored by convergence state

---

## Two-Physics-System Boundary
The AnalysisField now runs two physics systems:

| System       | Owner          | State              | Mutates Field? |
|--------------|----------------|--------------------|----------------|
| Field        | SignalMap      | Node positions, convergence scores | — |
| Lens         | SpatialLens    | Scale, position, smoothed kinetics | No |

These are physically separated. The lens reads from `signals[]` (a prop snapshot). It has no reference to SignalMap internals, no WebGL context access, no shared mutable state.

---

## Deferred (Phase B)
- World-space raycast sampling (requires SignalMap to expose scene ref)
- WebGL ring mesh via `<ringGeometry>` injected into same Canvas
- OrbitControls gating when lens gesture is active
- Anomaly density heatmap overlay

---

## Open Items
1. `signals[]` passed from AnalysisField may be `replayedSignals` (WO-1091) which do not carry `convergenceScore` unless the convergence classifier runs on them. Wire `convergenceclassifier.js` scoring pass before sampling.
2. Phase B canvas injection requires spinemap.jsx to expose a `lensSlot` or R3F portal.
3. Founder approval required before any color changes to the ring or readout.
