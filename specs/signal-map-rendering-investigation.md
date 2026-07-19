# KRYLO — Signal/Node Map Rendering Investigation

## Objective

Implement the **Lens Surface Contract (LSC-001)** so selecting the **Signal** lens renders the Signal/Node Map inside the primary Surface canvas (Region C).

This is currently the primary UAT blocker.

---

# Current Symptoms

### Rendering

* Signal lens activates correctly.
* No node map is ever displayed.
* Founder confirms the node map has **not rendered for months** ("never happened").

### Surface Failure

During this investigation the Surface page also began failing to load, presenting only a dark/frozen screen.

Console showed repeated WebGL context-loss messages:

```text
[WebGL] context lost
INVALID_OPERATION: loseContext: context already lost
```

After a clean restart:

* Surface loads normally.
* Lens interactions work.
* Signal map remains blank.

---

# Environment (Verified)

* Single Vite dev server running (`localhost:5173`)
* Mock API (`mock-server.cjs`) running on port 3001
* `.vite` cache cleared
* Duplicate dev servers terminated
* Working tree restored to clean baseline

Git history:

```
c68e615  KRYL-1009
↓
c8d7e62  LSC Step 1
↓
e1230f1  Revert to baseline
```

---

# Technical Findings

## 1. Strongest Hypothesis — Canvas Ready Gate Never Recovers

**Location**

```
spinemap.jsx
~3456
```

Current logic:

```jsx
useEffect(() => {
    if (containerRef.current?.offsetHeight > 0) {
        setCanvasReady(true);
    }
}, []);
```

### Failure mode

The effect executes exactly once.

If the container height is `0` during initial mount (layout incomplete, hidden parent, flex sizing, etc.):

```
offsetHeight == 0

↓

canvasReady remains false

↓

<Canvas> never mounts

↓

Scene never initializes

↓

Permanent blank render
```

There is no retry mechanism.

No:

* ResizeObserver
* requestAnimationFrame retry
* polling
* layout observer

This is currently the leading explanation for the "never renders" behavior.

### Candidate Fix

Replace the one-shot readiness check with a persistent readiness detector (ResizeObserver or equivalent) that promotes `canvasReady` once the container acquires a valid size.

---

## 2. Signal Map Is Not Connected to the Surface Architecture

The renderer currently exists only behind legacy entry points:

```
oracleview.jsx
```

(gated by `isMap`)

and

```
App.jsx
```

(via `BaySignalMapProjection` when `viewMode === signalmap/xray`)

Neither path is exercised by the current Surface/Lens flow.

This means the Lens Surface Contract currently has no active render path to the Signal Map.

---

## 3. SignalNode Is Legacy Code

`SignalNode` (around line 197) is not the active renderer.

The actual visualization is the GPU-instanced **Signal Field** (WO-896) inside the Scene implementation (~line 2686).

Future debugging should target the Scene rather than the older component.

---

## 4. public/signalmap.html Is Not Production Code

The HTML file under `/public` is a standalone CDN demo containing ~30 random spheres.

It is unrelated to the production Signal Map implementation.

It should not be used as a debugging reference.

---

## 5. WebGL Context Loss Appears Secondary

Hot Module Reload is currently disabled.

Every source change causes a complete application reload, repeatedly constructing heavy WebGL scenes.

Over long debugging sessions this can exhaust browser GPU contexts, matching the observed errors:

```
context lost
loseContext: context already lost
```

Current assessment:

This likely explains the temporary frozen/dark page but does **not** explain why the Signal Map has historically never rendered.

---

# Highest-Priority Validation

Before modifying the Lens architecture, prove the renderer itself.

## Test 1

Render

```jsx
<SignalMap isActive />
```

inside a guaranteed full-screen container.

Example:

```jsx
<div style={{ width: "100vw", height: "100vh" }}>
    <SignalMap isActive />
</div>
```

Observe:

* Does `canvasReady` become `true`?
* Does `<Canvas>` mount?
* Does WebGL initialize?
* Does the Scene render?

---

## Test 2

Instrument the readiness gate.

Log:

```jsx
containerRef.current?.offsetHeight
canvasReady
```

Expected failure pattern:

```
0
false
```

with no subsequent update.

---

## Test 3

Temporarily bypass the gate.

Force:

```jsx
const canvasReady = true;
```

If the Signal Map renders immediately, the readiness gate is confirmed as the root cause.

---

# Open Questions

1. Is the readiness gate preventing Canvas creation?
2. Does the Scene render correctly once Canvas mounts?
3. Is the Surface architecture simply failing to mount SignalMap?
4. Is WebGL context loss an unrelated development artifact?

---

# Recommended Next Steps

1. Validate the readiness-gate hypothesis.
2. Prove the Signal Map renders independently of the Surface.
3. Replace the one-shot initialization gate with a persistent readiness mechanism.
4. Connect the validated Signal Map into the Lens Surface Contract.

---

## Assessment

Based on the evidence collected so far:

* **Most likely root cause:** One-shot `canvasReady` initialization prevents the `<Canvas>` from ever mounting.
* **Secondary architectural issue:** The Signal Map is not currently connected to any reachable Surface render path.
* **Likely unrelated development issue:** GPU context exhaustion from repeated full-page reloads during WebGL development.
