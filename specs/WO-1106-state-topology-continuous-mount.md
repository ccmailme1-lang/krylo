# WO-1106: STATE TOPOLOGY & CONTINUOUS MOUNT
# Status: LOCKED
# Date: 2026-05-22

---

## 1. DECENTRALIZED STATE TOPOLOGY (ZUSTAND)

Three strictly isolated stores. No cross-store reactivity.

### useAnalysisStore — Semantic & Inference State
- sessions: Record<id, Session>
- activeSessionId
- createSession(id, lens)
- appendSignal(sessionId, signalId, payload)

Session shape: { id, targets[], evidence{}, oracle: TensionMatrix, metadata: { created, lens } }

### useUIStore — Ephemeral Interaction State
- swipeIndex: 0=Search, 1=Oracle, 2=Lens, 3=Action
- expandedNodes[]
- activeHoverContext
- setSwipeIndex(index)
- setHoverContext(ctx)

### useRenderStore — R3F & Animation State (NO DOM binding)
- cameraTarget: [0,0,0]
- tensionMultipliers: { base: 1.0, spike: 0.0 }
- activeShaderUniforms: {}
- updateCamera(vec3)
- triggerTensionSpike(val)

---

## 2. CONTINUOUS MOUNT — ANALYSIS CONTINUUM

P1–P4 are NEVER unmounted. Horizontal track, GPU-accelerated translation.

```
<div overflow-hidden>
  <div flex translate-x={-swipeIndex * 100vw} transition 700ms ease-[cubic-bezier(0.16,1,0.3,1)]>
    <section w-screen> P1: SearchProfile    </section>
    <section w-screen> P2: OracleEngine     </section>
    <section w-screen> P3: LensProjection   </section>
    <section w-screen> P4: ActionMatrix     </section>
  </div>
  <PaginationController activeIndex={swipeIndex} />
</div>
```

File: src/components/analysiscontinuum.jsx

---

## 3. ORACLE (P2) — BIPARTITE TENSION GRAPH

The Oracle measures Narrative Fracture. Not a diff viewer — a cognitive instrument.

### Two axes:
- Node Alpha (Spoken Claim) — exact quotes/transcripts, left axis
- Node Beta (Telemetry) — numerical ground-truth, right axis
- Fracture Vector — ShaderMaterial line connecting A to B

### Tension rendering (tensionMultipliers from useRenderStore):
- Low dissonance (Truth): solid #1A1A1A line, stable
- High dissonance (Lie/Blindspot): #66FF00, sine wave vibration in fragment shader, thickens
- Silence (Claim with no Telemetry): fading dashed line into empty space

### Layers:
- DOM layer: text, quotes, numbers, hover interactions
- WebGL layer: invisible anchor points, ShaderMaterial fracture edges

---

## BUILD ORDER
1. Install zustand
2. src/store/useanalysisstore.js
3. src/store/useuistore.js
4. src/store/userenderstore.js
5. src/components/analysiscontinuum.jsx (continuous mount shell)
6. P1: searchprofile.jsx
7. P2: oracleengine.jsx (tension graph — ShaderMaterial)
8. P3: lensprojection.jsx
9. P4: actionmatrix.jsx

---

## OPEN ITEM
- ShaderMaterial logic for tension lines between DOM nodes — awaiting Founder direction
