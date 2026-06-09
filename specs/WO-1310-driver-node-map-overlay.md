# WO-1310 — Driver Node-Map Overlay
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/spine/conemap.jsx`  
**Date:** 2026-05-26

---

## 1. PURPOSE

On cone click, the inspection panel flips to a 2D directed graph revealing the leverage points and hidden relationships driving the spatial signal. Overlays the 3D viewport without texture atlas complexity.

---

## 2. RENDER ARCHITECTURE

- Container: `@react-three/drei <Html>` component — preserves Z-index integrity and depth-contextual interaction
- Edges: SVG — not Canvas2D. Deterministic scaling, CSS compositing, DOM-level interaction hooks
- Aesthetic: Obsidian glass container overlaying minimalist gray gradient viewport

---

## 3. TOPOLOGY CONSTRAINTS

| Constraint | Value |
|---|---|
| Max connections per node | 3 |
| Edge culling policy | Drop lowest-weight edges when `connections > 3` |
| Typography | Monospace, lowercase labels only (`driver`, `node_id`, `weight`) |
| Trigger | Cone click event |

**Topology limit is hard:** if a node has >3 inbound/outbound vectors, cull lowest-weight edges. Visual static from over-connected graphs destroys structural clarity.

---

## 4. PROJECTION OWNERSHIP

Projection calculations (3D → 2D screen coordinates) must execute:
- Once per frame
- Globally — single pass for all visible overlays

**Never per-node.** Per-node projection becomes O(n²) complexity during graph churn.

---

## 5. EDGE RENDERING

SVG directed edges. Requirements:
- Arrowhead markers on directed edges
- Edge weight encoded as stroke-width or opacity
- No Canvas2D — SVG only for deterministic scaling and accessibility

---

## 6. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Panel dismiss trigger — second click on same cone, or explicit close button? | Second click dismisses |
| 2 | Max nodes visible in graph — cap at a fixed number or show all drivers? | Cap at 7 nodes |
| 3 | Edge color — fixed or convergence-state-driven? | Fixed, awaiting Founder |
