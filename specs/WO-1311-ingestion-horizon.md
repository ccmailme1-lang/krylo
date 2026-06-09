# WO-1311 — Ingestion Horizon
**Status:** SPEC COMPLETE — CONDITIONAL LOCK  
**File Target:** `src/components/` (new HUD overlay component)  
**Date:** 2026-05-26

---

## 1. PURPOSE

Fixed HUD element at the bottom 120px of the viewport. Renders real-time vector throughput as #66FF00 phosphor sparklines from the FlowController SSE feed. Replaces the static ticker.

---

## 2. RENDER ARCHITECTURE

- DOM/SVG overlay — entirely decoupled from R3F `useFrame` loop
- No GPU resource competition with primary 3D canvas
- Fixed position: bottom 120px, full width

---

## 3. DATA CONTRACT

```javascript
const [sparkData, setSparkData] = useState([]);

useEffect(() => {
  const source = new EventSource('/api/signals/stream');
  source.onmessage = throttle((e) => {
    setSparkData(prev =>
      prev.length >= 100
        ? [...prev.slice(1), e.data.throughput]
        : [...prev, e.data.throughput]
    );
  }, 250);
  return () => source.close();
}, []);
```

---

## 4. CONSTRAINTS

| Constraint | Value |
|---|---|
| Buffer cap | 100 frames — hard limit |
| Buffer eviction | `slice(1)` — oldest dropped first |
| SSE throttle | 250ms — never raw firehose |
| Render thread | DOM/SVG only — never R3F |
| Color | `#66FF00` phosphor — locked |

---

## 5. BACKPRESSURE VISIBILITY

Telemetry loss must be visible. Required indicators:
- Dropped packet counter (running total)
- Ingestion lag indicator (delta between SSE timestamp and `performance.now()`)

The sparkline must never falsely imply ingestion health during backpressure events.

---

## 6. SSE ENDPOINT

Consumes: `GET /api/signals/stream` — already live via FlowController (WO-1093).  
Field consumed: `throughput` from each SSE frame payload.

---

## 7. OPEN ITEMS — FOUNDER DECISION REQUIRED

| # | Question | Default |
|---|---|---|
| 1 | Sparkline height within 120px band — single line or multi-channel? | Single channel |
| 2 | Dropped packet counter placement — inside the 120px band or separate HUD element? | Inside band, right-aligned |
