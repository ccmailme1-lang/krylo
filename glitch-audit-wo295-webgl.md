# GLITCH AUDIT — WO-295 | WebGL Context Loss
**Date:** 2026-03-23
**Component:** `src/components/spine/spinemap.jsx`
**Status:** UNRESOLVED — Requesting external assistance

---

## THE SYMPTOM

The Signal Map (Layer 4) WebGL canvas loses its rendering context after ~2–3 minutes of being open. After context loss, R3F attempts to remount the canvas and calls `onCreated` with a partially-initialized `gl` object, causing a crash loop.

Console output (recurring):
```
WebGL context was lost. chunk-FD2NSRRT.js:17587
```

---

## ENVIRONMENT

| Package | Version |
|---|---|
| react | 18.x |
| @react-three/fiber | 8.17.10 |
| three | 0.169.0 |
| vite | 5.x |
| Node | v25 |
| Browser | Firefox (macOS) |

---

## ROOT ARCHITECTURE

The Signal Map canvas is **conditionally mounted** inside `oracleview.jsx`:

```jsx
{isMap && <SignalMap signalMapData={signalMapData} />}
```

Where `isMap = lens === "Signal Map"`. The Canvas mounts/unmounts on every tab switch.

The `SignalMap` component:

```jsx
export default function SignalMap({ signalMapData }) {
  const signals = signalMapData?.signals ?? [];
  return (
    <Canvas
      frameloop="always"
      onCreated={({ gl }) => {
        if (gl.domElement) {
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
        }
      }}
      style={{ width: '100%', height: 'calc(100dvh - 160px)', background: '#000000' }}
    >
      <CameraSetup />
      <FunnelScene signals={signals} />
    </Canvas>
  );
}
```

**Shared geometries** are created at module level (not per-render) to prevent GPU memory leaks:

```js
const SHARED_GEOM = {
  low:      new THREE.SphereGeometry(2, 32, 32),
  neutral:  new THREE.BoxGeometry(3, 3, 3),
  high:     new THREE.OctahedronGeometry(2),
  critical: new THREE.TetrahedronGeometry(2),
};
const SHARED_WIRE = new THREE.WireframeGeometry(SHARED_GEOM.critical);
```

---

## ATTEMPTS MADE

### Attempt 1 — `onContextLost` prop on Canvas
```jsx
<Canvas onContextLost={(e) => e.preventDefault()} ...>
```
**Result:** `Warning: Unknown event handler property 'onContextLost'. It will be ignored.`
R3F's Canvas does not forward this as a native DOM event.

---

### Attempt 2 — `frameloop="demand"` + `gl.canvas` listener
```jsx
<Canvas
  frameloop="demand"
  onCreated={({ gl }) => {
    gl.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
  }}
>
```
**Result:** `TypeError: can't access property "addEventListener", gl.canvas is undefined`
`gl.canvas` does not exist on Three.js `WebGLRenderer`. Correct property is `gl.domElement`.

---

### Attempt 3 — `frameloop="demand"` + `gl.domElement` + null guard
```jsx
<Canvas
  frameloop="demand"
  onCreated={({ gl }) => {
    if (gl.domElement) {
      gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
    }
  }}
>
```
**Result:** TypeError eliminated. But context still lost after ~2.5 minutes.
Hypothesis: `frameloop="demand"` causes the browser GPU process to treat the context as idle and reclaim it.

---

### Attempt 4 — `frameloop="always"` + `gl.domElement` listener
```jsx
<Canvas
  frameloop="always"
  onCreated={({ gl }) => {
    if (gl.domElement) {
      gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
    }
  }}
>
```
**Result:** Context still lost after ~2.5 minutes. Active render loop did not prevent reclamation.

---

## CURRENT HYPOTHESIS

The browser (Firefox, macOS) is aggressively reclaiming WebGL contexts even when `frameloop="always"` is active. Possible causes:

1. **Too many total WebGL contexts** — The conditional mount/unmount pattern creates a new context each time the user switches to Signal Map. Old contexts may not be fully released. Browser limit is typically 8–16.
2. **GPU memory pressure** — macOS may be reclaiming GPU resources for other processes.
3. **R3F 8.x context handling** — This version may not properly call `gl.dispose()` on unmount, causing context leaks.

---

## QUESTIONS FOR ASSISTANCE

1. In R3F 8.x, does `Canvas` properly call `renderer.dispose()` on unmount? If not, is there a manual cleanup path via `useEffect` + `useThree`?
2. Is there a known pattern to prevent WebGL context loss for conditionally-mounted R3F canvases in Firefox/macOS?
3. Should the Canvas be **always mounted** (with `display: none` when not on Signal Map tab) to preserve the context across tab switches?
4. Is `e.preventDefault()` on `webglcontextlost` sufficient to trigger restoration, or does explicit `gl.getContext().getExtension('WEBGL_lose_context').restoreContext()` need to be called?

---

## FILES

- `src/components/spine/spinemap.jsx` — Signal Map component (full source)
- `src/components/oracleview.jsx` — Parent component with conditional mount (`{isMap && <SignalMap />}`)
