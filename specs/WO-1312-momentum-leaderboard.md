# WO-1312 — Momentum Leaderboard
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/` (new right-rail panel component)  
**Date:** 2026-05-26

---

## 1. PURPOSE

Volatility Index tab in the inspection panel. Sorted view of the top 10 nodes exhibiting the highest structural divergence. Ranks by rate of change (Δv/Δt), not absolute volume.

---

## 2. RENDER ARCHITECTURE

- Collapsible right-rail panel
- Obsidian glass aesthetic
- DOM only — no R3F dependency

---

## 3. DATA CONTRACT

| Property | Source | Description |
|---|---|---|
| `ticker` | Kernel Stack | Signal identifier |
| `delta_v` | Temporal delta records | Rate of change |
| `momentum_rank` | Derived sort position | 1–10 |

**Data source:** Derived strictly from Kernel Stack temporal delta records — not raw ingestion volume.

**Sort matrix:** Ranked by Integrated Resonance Score derivative, not absolute volume.

**Render limit:** Top 10 only. All others dropped.

---

## 4. EMA SMOOTHING

Raw derivatives flicker violently without smoothing. Mandatory:

```
EMA_t = α · x_t + (1 - α) · EMA_(t-1)
α = 0.18
```

α = 0.18 preserves momentum readability without suppressing anomaly emergence.

---

## 5. CONSTRAINTS

| Constraint | Value |
|---|---|
| Max rendered entries | 10 |
| Sort key | IRScore derivative (Δ) |
| Smoothing | EMA α=0.18 |
| Typography | Monospace, lowercase (`ticker`, `delta_v`, `momentum_rank`) |
| Update frequency | On Kernel Stack tick — not on timer |

---

## 6. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Panel trigger — always visible or tab-activated? | Tab-activated |
| 2 | Color coding for positive vs. negative momentum? | Awaiting Founder |
