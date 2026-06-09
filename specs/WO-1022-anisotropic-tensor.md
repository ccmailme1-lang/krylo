# WO-1022 — Anisotropic Tensor
**Status:** SPEC COMPLETE — AWAITING BUILD GO  
**File Target:** `src/math/tensors.js`  
**Date:** 2026-05-26

---

## 1. PURPOSE

The Anisotropic Tensor encodes directional signal weighting for the KRYLO physics engine. It is a 3×3 stiffness matrix C_ijk that defines how signal pressure propagates differently across three orthogonal signal axes. It is not isotropic — equal force applied along different axes produces unequal output.

---

## 2. AXIS DEFINITION

| Index | Axis | Maps To | Description |
|-------|------|---------|-------------|
| 0 | D | Divergence | Rate of signal separation from baseline |
| 1 | V | Velocity | Signal momentum (rate of change) |
| 2 | A | Amplitude | Signal magnitude / convergence intensity |

These three axes align with the D/V/A dimensions already established in the PLI engine (WO-1034) and Convergence Classifier (WO-1126A).

---

## 3. MATRIX STRUCTURE

```
C = | C_DD  C_DV  C_DA |
    | C_VD  C_VV  C_VA |
    | C_AD  C_AV  C_AA |
```

**Diagonal terms (C_DD, C_VV, C_AA):** Self-weighting. How strongly each axis drives its own output.

**Off-diagonal terms:** Cross-coupling. How a change in one axis bleeds into another.

### Default Initialization (Identity-weighted)
```javascript
// Diagonal dominant — minimal cross-coupling at init
[1.0, 0.0, 0.0,
 0.0, 1.0, 0.0,
 0.0, 0.0, 1.0]
```

### Cross-Coupling Constraint
Off-diagonal terms are bounded: `|C_ij| ≤ 0.4` for i ≠ j.  
Violation = directional scaling drift. Enforcement is mandatory.

---

## 4. MEMORY CONTRACT

| Property | Value |
|----------|-------|
| Storage type | `Float32Array(9)` |
| Memory footprint | 36 bytes fixed |
| Allocation | Once at module init — never reallocated per frame |
| Mutability | Read-only during frame loop. Written only via `updateTensor()` |

**Rule:** No dynamic allocation inside the frame loop. The tensor is pre-allocated and updated in place.

---

## 5. API CONTRACT

```javascript
// src/math/tensors.js

export function createTensor()              // → Float32Array(9), identity init
export function updateTensor(t, values)     // in-place update. values = Float32Array(9)
export function applyTensor(t, vec3)        // → Float32Array(3). mat3 × vec3
export function validateTensor(t)           // → { valid: bool, violations: string[] }
```

`validateTensor` must be called after any `updateTensor`. It checks:
- Off-diagonal terms ≤ 0.4
- No NaN or Infinity in any cell
- Determinant ≠ 0 (non-degenerate)

---

## 6. PERFORMANCE BUDGET

| Operation | Budget |
|-----------|--------|
| `applyTensor()` per frame | < 0.05ms |
| `updateTensor()` | Outside frame loop only |
| `validateTensor()` | Called once per update, never per frame |

---

## 7. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default in Spec |
|---|----------|-----------------|
| 1 | Are cross-coupling (off-diagonal) terms permitted in production, or strictly zero? | Permitted, bounded ≤ 0.4 |
| 2 | Update trigger: on each new ETR ingested, or on convergence state change only? | On convergence state change |
| 3 | Should `applyTensor` clamp output to [0,1] or allow unbounded float output? | Unbounded — caller clamps |

---

## 8. VALIDATION HARNESS

File: `qa_wo1022_tensor.mjs`  
Test: `createTensor()` → identity. `applyTensor(t, [1,0,0])` → `[1,0,0]`. `validateTensor()` → valid. Off-diagonal injection → violation caught.
