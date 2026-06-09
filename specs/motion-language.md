# KRYLO — Canonical Motion Language (LOCKED 2026-05-22)

One motion system. Every transition uses these values. No exceptions.

---

## Swipe (nav bay page transitions)
- Mechanism: GPU translateX on continuous mount track
- Duration: 700ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1)  — spring-out, no bounce
- Direction: horizontal only
- Pages: never unmounted, never re-mounted

## Nav Bay Switch (left nav click)
- Mechanism: opacity + translateY on bay container
- In:  opacity 0→1, translateY 12px→0, duration 220ms, ease-out
- Out: opacity 1→0, translateY 0→8px, duration 160ms, ease-in
- WebGL canvas: stays mounted, never torn down

## Panel Emergence (inspection panel, overlays)
- In:  translateX 100%→0, opacity 0→1, duration 280ms, cubic-bezier(0.16,1,0.3,1)
- Out: translateX 0→100%, opacity 1→0, duration 180ms, ease-in
- Never scale — panels slide, they do not grow

## Focus Lock (selected cone / node)
- Camera lerp: THREE.Vector3.lerp, factor 0.06 per frame (~60fps)
- Duration to lock: ~400ms perceived
- Unlock: same lerp back to rest position

## Depth Transition (Surface → Analysis)
- Not a route change — nav item click, bay swaps
- ConeMap stays live in background at opacity 0.08 during Analysis
- No full black-out transitions

## Cone Expansion (on selection)
- Scale: 1.0 → 1.12 over 300ms, cubic-bezier(0.16,1,0.3,1)
- No color change on expand — state color is fixed
- Label: opacity 0.4 → 1.0 over 200ms

## Oracle Tension Line (WO-1317)
- Low dissonance: opacity 0.6, strokeWidth 1, color #1A1A1A, no motion
- High dissonance: opacity 1.0, strokeWidth 2–4 (driven by dissonance score),
  color #66FF00, sine wave vertex offset: amplitude = dissonance * 0.3, freq 3Hz
- Silence: dashed, opacity fades 0.4→0 over 2s, no endpoint

## Pagination Dots
- Active: width 20px, opacity 1.0, color #66FF00
- Inactive: width 6px, opacity 0.3, color #ffffff
- Transition: width + opacity, 200ms, ease

## Data Row Stagger (Waterfall Ledger — existing spec)
- Delay: 100ms × row index
- Opacity: 0→1 over 300ms

---

## Banned
- scale() on panels or bays
- rotate() on any UI element
- bounce easing (any cubic that overshoots)
- simultaneous opacity + blur transitions (GPU overload)
- setTimeout-based animation (use CSS transition or rAF only)
