# WO-1309 — Dynamic Frontier Waveforms
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/spine/conemap.jsx` + vertex shader  
**Date:** 2026-05-26

---

## 1. PURPOSE

Per-frame vertex noise on cone rings driven by signal volatility. High-volatility signals communicate instability geometrically, not just through color. Displacement computed entirely on GPU — no CPU vertex mutation.

---

## 2. VERTEX SHADER

```glsl
uniform float uTime;
uniform float uVolatility;

void main() {
  vec3 pos = position;
  float noise = snoise(vec3(pos.x * 2.0, pos.y * 2.0, uTime * 0.5));
  noise = clamp(noise, -0.35, 0.35);
  pos += normal * (noise * uVolatility);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Noise clamp is mandatory:** `clamp(noise, -0.35, 0.35)`. Without it, volatility spikes can invert normals and destabilize the mesh silhouette.

---

## 3. UNIFORM CONTRACT

| Uniform | Type | Update Frequency |
|---|---|---|
| `uTime` | `float` | Every `useFrame` tick |
| `uVolatility` | `float` | On signal state change |

`uTime` updated via `state.clock.elapsedTime` in `useFrame`. `uVolatility` normalized to `[0, 1]`.

---

## 4. GPU BUDGET GATE

```javascript
const GPU_WAVE_BUDGET = 120; // active signals
```

When `activeSignals > GPU_WAVE_BUDGET`:
- Preserve animation cadence
- Drop deformation fidelity first (reduce noise frequency, not framerate)
- Disable displacement entirely at `activeSignals > GPU_WAVE_BUDGET × 1.5`

**Degradation hierarchy:**
1. Preserve framerate
2. Preserve spatial integrity
3. Preserve waveform aesthetics

---

## 5. CONSTRAINTS

| Constraint | Value |
|---|---|
| Noise clamp | `[-0.35, 0.35]` — hard limit |
| GPU budget | `120` active signals |
| CPU vertex mutation | FORBIDDEN — GPU only |
| `uVolatility` range | `[0, 1]` normalized |

---

## 6. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Noise frequency multiplier (`pos.x * 2.0`) — adjust per zone tier? | Fixed at `2.0` |
| 2 | `uTime` speed scalar (`uTime * 0.5`) — slower for low-volatility signals? | Fixed at `0.5` |
