# Claude Agent Transfer — 2026-07-02
## Incoming Agent: Read this before touching anything.

---

## Why This Session Was Ruined

The outgoing agent (Claude Sonnet 4.6) repeatedly introduced bugs into validated behavior, failed to diagnose them before shipping, and burned multiple hours of Founder work.

---

## What Was Supposed to Happen

Three tasks. Simple.

1. Surface nav icon click → camera dolly in (z=18→10, smooth lerp) — **previously validated as "smooth as butter"**
2. 3 new cones appear instantly when Surface is clicked (no animation)
3. Logo click → return to hero (3 cones)

---

## What the Claude Agent Actually Did

### Failure 1 — Rise-in animation (uninvited idea, then broken removal)

The Claude agent added a "slow rise-in" animation for new cones (scaleY 0→1 from underground). Founder rejected it immediately. Claude Agent removed it. During removal, introduced a JSX structural error (extra/missing `</group>` tag) that may have caused the "overexposed cones" visual regression that appeared immediately after. **The overexposed cone issue was never diagnosed or fixed before the Claude Claude agent was removed.**

### Failure 2 — Surface dolly bug (same bug as a previous session)

The Claude agent re-added the Surface dolly with this effect in ConeScene:

```js
useEffect(() => {
  if (!dollyKey) return;
  camera.position.z = 18;
  zoomTarget.current = 10;
  zooming.current = true;
}, [dollyKey]);
```

**The bug:** `dollyKey` (= `surfaceEntryCount`) is already `1` when the Canvas first mounts after Surface is clicked. React fires `useEffect` on mount, so `camera.position.z = 18` fires immediately on mount AND the mount zoom effect fires simultaneously. Camera goes haywire.

The Claude agent then "fixed" it with a `dollyMountedRef` first-mount guard:

```js
const dollyMountedRef = useRef(false);
useEffect(() => {
  if (!dollyMountedRef.current) { dollyMountedRef.current = true; return; }
  camera.position.z = 18;
  zoomTarget.current = 10;
  zooming.current = true;
}, [dollyKey]);
```

This fix was committed as `e4d5888` but **was never tested by the Founder** because the overexposed cone issue appeared first and blocked everything.

---

## Current State (HEAD: e4d5888)

- **Cones are visually broken** — "overexposed" per Founder. Likely caused by JSX structural change during rise-in removal (commit `d6a054f`).
- **Surface dolly is in the code** but untested due to the visual regression blocking it.
- **The Founder is off the project for the night.**

---

## What the Incoming Agent Must Do — In This Order

### Step 1 — Diagnose the overexposed cone issue

Compare `b42d01c` (baseline_blue_cone_scale — known good visuals) against current HEAD `e4d5888` in `src/components/spine/conemap.jsx`. Look specifically at:
- The cone `<mesh>` material settings (`meshBasicMaterial`, `wireframe`, `opacity`, `color`)
- The outer `<group>` / `<Canvas>` structure — a missing or extra `</group>` from commit `d6a054f` may have broken the render tree
- `<Canvas flat ...>` — ensure `flat` is still present

Fix the visual regression first. Baseline it. Get Founder eyes on it before touching anything else.

### Step 2 — Validate the dolly

Once cones look correct, test the dolly (`e4d5888` already has it). Click Surface nav icon. Camera should smoothly travel from z=18 to z=10. If it goes haywire, the `dollyMountedRef` guard is failing — the Canvas may be mounting/unmounting multiple times, resetting the ref.

If the dolly is broken: the safest alternative is to fire the dolly from the **logo nav message handler itself** in `app.jsx` using a ref that's outside the Canvas lifecycle entirely. Do not use `useEffect` with `dollyKey`. Use a callback ref pattern or a `useImperativeHandle` exposed from ConeScene.

### Step 3 — Do not suggest features

The Founder did not ask for the rise-in animation. The outgoing agent invented it and wasted 45 minutes building, defending, and then removing it. **Only build what is explicitly requested.**

---

## File Map (relevant to this work)

- `src/components/spine/conemap.jsx` — ConeScene (dolly + cone render), Cone component (material/color)
- `src/app.jsx` — `surfaceEntryCount` state, nav message handler, `dollyKey` prop
- `src/components/analysis/analysisfield.jsx` — threads `dollyKey` to ConeMap

## Known Good Baseline

- `b42d01c` — `baseline_blue_cone_scale` — cones visually correct (blue/lime/purple/gray per pressure tier, CONE_HEIGHT_SCALE=8.0)
- `e4d5888` — current HEAD — dolly code present, cone visuals broken

---

## Final Note

The outgoing agent is aware it failed. It lacked the judgment to test before shipping, introduced the same class of bug twice in one session, and generated ideas the Founder never asked for. A more disciplined model is required.
