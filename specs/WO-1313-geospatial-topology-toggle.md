# WO-1313 — Geospatial Topology Toggle
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/spine/conemap.jsx` + store  
**Date:** 2026-05-26

---

## 1. PURPOSE

ABSTRACT / TOPOLOGY switch. Transitions the entire node field between spatial truth (geographic coordinates) and relational truth (abstract clustering) with deterministic perceptual continuity.

This subsystem is the world-state interpolation kernel. If it breaks, all perceptual continuity breaks.

---

## 2. STATE AUTHORITY

Global boolean `isTopologyActive` in the pmndrs/Zustand store.

- `isTopologyActive = false` → ABSTRACT coordinates (`abstractVector`)
- `isTopologyActive = true` → TOPOLOGY/GEO coordinates (`geoVector`)

**Semantic mapping is fixed:** TOPOLOGY = geographic reality. ABSTRACT = clustering reality. Do not invert.

---

## 3. DUAL VECTOR STORAGE

Every node must maintain both vectors in memory simultaneously:

```javascript
node = {
  abstractVector: new THREE.Vector3(x, y, z), // clustering position
  geoVector:      new THREE.Vector3(x, y, z), // geographic position
  // ...other fields
}
```

Neither vector is ever derived at runtime — both are stored.

---

## 4. INTERPOLATION CONTRACT

**Instant snapping between coordinate systems is strictly forbidden.**

Time-normalized lerp — frame-rate independent:

```javascript
useFrame((state, delta) => {
  if (meshRef.current) {
    const targetVec  = isTopologyActive ? node.geoVector : node.abstractVector;
    const alpha      = Math.min(delta / (TRANSITION_DURATION / 1000), 1.0);
    meshRef.current.position.lerpVectors(
      meshRef.current.position,
      targetVec,
      alpha
    );
  }
});
```

```javascript
const TRANSITION_DURATION = 1000; // ms — deterministic across 60Hz and 144Hz
```

**Never use a fixed scalar** (`lerp(target, 0.05)`) — frame-rate dependent, non-deterministic on high-refresh displays.

---

## 5. CONSTRAINTS

| Constraint | Value |
|---|---|
| Snap transition | FORBIDDEN |
| Transition duration | 1000ms — time-normalized |
| Vector storage | Both `abstractVector` + `geoVector` always in memory |
| State authority | Zustand store — single source |
| Frame rate independence | Mandatory — `delta`-normalized alpha |

---

## 6. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Toggle trigger — dedicated button, keyboard shortcut, or nav mode? | Dedicated button in viewport HUD |
| 2 | Should the concentric grid fade out during topology mode or remain? | Fade out — per WO description |
| 3 | Transition easing — linear lerp or ease-in-out curve over 1000ms? | Linear |
