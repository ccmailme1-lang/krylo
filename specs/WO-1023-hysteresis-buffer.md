# WO-1023 — Hysteresis Buffer
**Status:** SPEC COMPLETE — AWAITING BUILD GO  
**File Target:** `src/engine/memory.js`  
**Date:** 2026-05-26

---

## 1. PURPOSE

The Hysteresis Buffer stores a fixed-depth history of WebGL vertex offsets across render frames. It prevents tick/frame desync and temporal lag accumulation by providing the frame loop with a deterministic prior-state reference. Without it, vertex mutations are stateless — each frame computes from zero, causing jitter and oscillation at transition boundaries.

---

## 2. BEHAVIORAL CONTRACT

- **Ring buffer** — fixed capacity, oldest entry overwritten when full. No dynamic growth.
- **Write:** once per render frame (frame loop writes current vertex offsets)
- **Read:** any subsystem needing prior-frame state (Leverage Lattice, convergence transitions)
- **Flush condition:** explicit reset only — not time-based, not automatic

---

## 3. BUFFER DEPTH

**Depth = 3 frames**

Rationale: WO-1126A (Convergence Classifier) established `PERSISTENCE_REQUIRED = 3` as the hysteresis constant for state transitions. The buffer depth must match this value to maintain a coherent temporal window across both subsystems.

If `PERSISTENCE_REQUIRED` changes, buffer depth must change to match. These are linked constants.

---

## 4. ENTRY SCHEMA

Each buffer slot stores one frame's worth of vertex offset data:

```javascript
{
  frameId:   number,          // monotonic frame counter
  timestamp: number,          // performance.now() at write time
  offsets:   Float32Array,    // vertex offset deltas [x0,y0,z0, x1,y1,z1, ...]
}
```

**Vertex count is fixed at buffer init** — cannot change mid-session.

---

## 5. MEMORY CONTRACT

| Property | Value |
|----------|-------|
| Storage | `Float32Array` per slot — pre-allocated at init |
| Slots | 3 (depth-locked) |
| Per-vertex stride | 3 floats (x, y, z offset) |
| Total footprint | `3 × vertexCount × 3 × 4 bytes` |
| Example (58 verts, high-core) | 3 × 58 × 3 × 4 = **2,088 bytes** |
| Allocation | Once at init — never reallocated per frame |
| Mutability | Write via `writeFrame()` only — no direct slot access |

---

## 6. API CONTRACT

```javascript
// src/engine/memory.js

export function createHysteresisBuffer(vertexCount)   // → buffer instance
export function writeFrame(buf, frameId, offsets)      // ring-write current frame
export function readFrame(buf, ageIndex)               // ageIndex 0=current, 1=prior, 2=oldest
export function flushBuffer(buf)                       // zero all slots, reset head
export function getDepth(buf)                          // → number of valid frames written (0–3)
```

`writeFrame` is the only write path. Direct slot mutation is forbidden.

---

## 7. TICK vs FRAME EXECUTION

| Operation | Execution Context |
|-----------|------------------|
| `writeFrame()` | R3F `useFrame` loop — once per render tick |
| `readFrame()` | R3F `useFrame` loop — read before write |
| `flushBuffer()` | Outside frame loop — on scene reset or domain change only |
| `createHysteresisBuffer()` | Component mount — never inside frame loop |

**Rule:** Read always precedes write within the same frame tick. Write-then-read within the same tick is a sequencing violation.

---

## 8. DESYNC THRESHOLD

If `frameId` gap between consecutive writes exceeds **5 frames**, the buffer is considered desynchronized. The consumer must call `flushBuffer()` and rebuild from zero.

---

## 9. PERFORMANCE BUDGET

| Operation | Budget |
|-----------|--------|
| `writeFrame()` per tick | < 0.1ms |
| `readFrame()` per tick | < 0.02ms |
| Total buffer overhead per frame | < 0.15ms |

---

## 10. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default in Spec |
|---|----------|-----------------|
| 1 | Should `readFrame(ageIndex=0)` return the just-written frame or the prior frame? | Returns last committed frame (prior to current tick's write) |
| 2 | Desync threshold: 5 frames — adjust based on target frame rate? | 5 frames at 60fps ≈ 83ms — confirm acceptable lag window |
| 3 | On `flushBuffer()`, should consumers be notified via an event/callback? | No — caller is responsible for flush coordination |

---

## 11. VALIDATION HARNESS

File: `qa_wo1023_hysteresis.mjs`  
Tests: init → depth=0. Three writes → depth=3. Fourth write → depth=3 (ring, not 4). `readFrame(1)` → prior frame data. Desync gap injection → flush triggered.
