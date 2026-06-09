# WO-1308 — Historical Flux Trajectory (Ghost Cones)
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/spine/conemap.jsx`  
**Date:** 2026-05-26

---

## 1. PURPOSE

Prior-tick wireframe silhouette offset behind each live cone. Renders the delta between current state and t-1 tick state. Visualizes signal momentum without 2D UI overlays.

---

## 2. MESH ARCHITECTURE

- Geometry: copied from primary cone — `wireframe={true}`
- Material: `THREE.MeshStandardMaterial`, `metalness: 0.8`, opacity decayed per frame
- Decay formula: `Opacity(t) = max(0, Opacity(t-1) - λ · Δt)`
- Garbage collection: unmount mesh when `opacity ≤ 0.01`

**All ghost cones share ONE material and ONE geometry.** Opacity is a per-instance attribute — never unique materials per ghost.

---

## 3. SNAPSHOT RING BUFFER

```javascript
const MAX_GHOSTS = activeSignals * 3;
```

- Circular indexing only — no push/pop dynamic allocation
- Snapshot triggered on Kernel Stack state divergence only
- Transformation matrix captured at divergence tick

---

## 4. GHOST MANAGER

Decay authority belongs to a centralized `GhostManager` — NOT individual cone instances. Per-instance decay causes frame-order nondeterminism under concurrent signal churn.

`GhostManager` responsibilities:
- Owns the ring buffer
- Drives opacity mutation in `useFrame` via `state.clock.getDelta()`
- Issues unmount signal when `opacity ≤ 0.01`

---

## 5. CONSTRAINTS

| Constraint | Value |
|---|---|---|
| Max ghosts | `activeSignals × 3` |
| Allocation | Ring buffer — no dynamic alloc |
| Material | Shared single instance |
| Geometry | Shared single instance |
| Decay ownership | `GhostManager` only |
| GC threshold | `opacity ≤ 0.01` → unmount |

---

## 6. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | λ decay rate value — how fast do ghosts fade? | 0.8 per second |
| 2 | Ghost material color — metallic gray or inherit from convergence state? | Metallic gray, `metalness: 0.8` |
