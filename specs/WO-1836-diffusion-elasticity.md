# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1836 — Diffusion + Elasticity Variables (D + E)**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/engine/pliengine.js, src/components/spine/conemap.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

> What is the one structural job this module does?

**Job:** Extend the PLI components object with two new structural variables — Diffusion (D) and Elasticity (E) — and surface them in the InspectionPanel STATS section.

> What is the one dominant output type this produces?

**Output:** Two new normalized scalar values (0–100) added to the `components` object returned by `computePLI()` in pliengine.js, displayed as read-only metrics in the CONE tab STATS section.

---

## 2. BOUNDARY DECLARATION

> What does this module receive as input?

**Input contract:** `signal.source_count` (already present on ETR signal objects) and `components.gap`, `components.velocity`, `components.coverage` (already computed in pliengine.js before PLI scalar is calculated).

> What does this module produce as output?

**Output contract:** `components.diffusion` (0–100) and `components.elasticity` (0–100) added to the existing components object. No change to `pliScalar`. No change to `ar`, `ev`, `confidence`, or `fold`.

> What does this module NOT touch?

**Explicit exclusions:**
- Does NOT alter the PLI scalar formula `(gap × velocity × window) / coverage`
- Does NOT feed D or E back into pliScalar computation
- Does NOT change convergence state classification in convergenceclassifier.js
- Does NOT touch surfacerouter.js or signal routing
- Does NOT modify any inference layer (Ollama calls, synthesis, resonance path)

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema — D and E are computed purely from existing structural variables; no inference call involved
- [ ] Scoring layer touched → output is NOT a recommendation — N/A, these are display metrics only
- [ ] Inference layer touched → N/A
- [x] UI layer touched → display does NOT introduce new data dependencies — panel reads from the existing `cone` prop which already carries PLI components

**Drift notes:** D and E are downstream of detection. They describe the gap structure; they do not alter it. Adding them to `components` is additive only.

---

## 4. STRATEGIC LEVERAGE STATEMENT

> "What asymmetry does this WO surface, protect, measure, or exploit?"

**Statement:** Diffusion surfaces how broadly a structural gap has been independently detected across emitters — the metric no competitor tracks. Elasticity measures how sensitive the gap is to external shock — the timing signal that justifies urgency. Together they give KRYLO's "We don't predict. We detect." claim two quantitative legs it currently lacks.

---

## 5. OUTPUT GRAVITY

> Complete this sentence in one line:

**"The single thing this WO produces that matters most is ___ ."**

Two new structural metrics that distinguish gap breadth (D) from gap sensitivity (E) — neither of which exists anywhere in the current signal surface.

---

## 6. FORMULA / CONTRACT

**Diffusion (D):**
```
D = min(signal.source_count, MAX_EMITTERS) / MAX_EMITTERS × 100
```
- `MAX_EMITTERS` = 6 (the six canonical domain emitters: FRED, EDGAR, Kalshi, news, HN, mock)
- Units: 0–100 normalized scalar
- Interpretation: 100 = all active emitters independently detect this gap; 0 = single source

**Elasticity (E):**
```
E = gap × (1 − coverage) × 100
```
- Uses already-computed `components.gap` (0–1) and `components.coverage` (0–1)
- Units: 0–100 normalized scalar
- Interpretation: high E = gap is wide AND poorly covered = highly sensitive to shock
- Volatility is NOT included in E formula — it lives in a separate layer (convergenceclassifier.js) and must not contaminate the structural gap measurement

Normalization: both D and E conform to 0–100 signal scale per §16.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/pliengine.js | Add `diffusion` and `elasticity` to `components` object (lines ~234–242). Add `MAX_EMITTERS = 6` constant. | PLI scalar formula, all other component computations, AR, EV, confidence, fold |
| src/components/spine/conemap.jsx | Add D and E display rows to CONE tab STATS section in InspectionPanel | All other panel sections, HUD projector, ConeScene, routing logic |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — names two structural properties that exist implicitly but were unmeasured |
| Does this have a single dominant output? | YES — two scalar values added to components |
| Are all boundaries explicitly defined? | YES — explicit exclusions listed, no PLI scalar mutation |
| Can this be built without touching an undefined dependency? | YES — source_count, gap, and coverage already exist |
| Does this avoid increasing expressive flexibility in the core? | YES — additive only, no logic changes |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "diffusion\|elasticity" src/engine/pliengine.js
```
Must return both variable assignments within the `components` object.

```
grep -n "diffusion\|elasticity\|DIFFUSION\|ELASTICITY" src/components/spine/conemap.jsx
```
Must return display rows in the InspectionPanel STATS section.

Visual check: open CONE tab in InspectionPanel, click any cone, confirm D and E values appear in STATS below SIGNAL and FORECAST rows.

---

## NOTES

`signal.source_count` is currently passed into `computePLI()` via the `signal` argument. Confirmed present at pliengine.js:226. No new data wiring required.
