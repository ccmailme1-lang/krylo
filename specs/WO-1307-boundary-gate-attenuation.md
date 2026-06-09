# WO-1307 — Boundary Gate Attenuation
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/spine/conemap.jsx`  
**Date:** 2026-05-26

---

## 1. PURPOSE

Ground threshold rings rendered at y=0 on each cone footprint. Establishes the absolute geospatial boundary of a signal without volumetric intersection rendering. Allows visual parsing of signal overlap at the ground plane.

---

## 2. MESH ARCHITECTURE

- Geometry: `THREE.RingGeometry(0.95, 1.0, 32)` — shared instance, never per-signal
- Material: `meshBasicMaterial`, color `#404040`, transparent, opacity `0.15`, `depthWrite={false}`
- Render: `<Instances>` with `<BoundaryRing>` per signal, scale driven by `attenuationFactor`
- Position: `[sig.x, 0, sig.z]` — y=0 fixed

```jsx
const sharedRingGeometry = useMemo(
  () => new THREE.RingGeometry(0.95, 1.0, 32),
  []
);
```

**Rule:** Scale instances only. Never generate per-signal geometries.

---

## 3. CONSTRAINTS

| Constraint | Value |
|---|---|
| Geometry allocation | Once at mount via `useMemo` |
| Opacity | Fixed `0.15` — not signal-driven |
| Frustum culling | DISABLED — `frustumCulled={false}` |
| `depthWrite` | `false` — rings are semantic, not occluding |

**Frustum cull must be disabled.** Boundary rings are semantic infrastructure. Culling causes attenuation artifacts during camera edge sweeps.

---

## 4. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Should `attenuationFactor` scale linearly from signal score, or use a fixed radius per zone tier? | Linear from signal score |
| 2 | Ring color — `#404040` confirmed or subject to convergence state override? | `#404040` fixed |
