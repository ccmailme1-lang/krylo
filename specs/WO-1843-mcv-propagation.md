# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1843 — MCV Propagation to D, E, and ASSEMBLANCE**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/engine/pliengine.js · src/components/analysis/targetpacket.jsx
Depends on: WO-1841 + WO-1842 (tensor.mcv must be populated)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Reform D and E in pliengine.js to be weighted by MCV fields rather than raw signal-space only. Surface MCV regime context in targetpacket.jsx as a display annotation — no new section, one line under ASSEMBLANCE header.

**Output:** D and E become MCV-weighted. ASSEMBLANCE shows the active regime class label.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `session.tensor.mcv` — all 6 fields + `_meta` from WO-1842.

**Output contract:**
- `pliengine.js`: D and E formulas updated — values change, field names unchanged
- `targetpacket.jsx`: one new display string under ASSEMBLANCE header — `_meta.transactionClass` label only

**Explicit exclusions:**
- Does NOT change convergenceState, fidelityScore, hpScore, WINDOW, or arbitration logic
- Does NOT change the visual structure of ASSEMBLANCE — label annotation only
- Does NOT touch asdiff.js, happypathdisplacementengine.js, surfacerouter.js (Phase B)
- Does NOT expose raw MCV numbers in UI — regime class label only (`_meta.transactionClass`)
- Does NOT change actionmatrix.jsx or intelligencebrief.jsx

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Two files modified — pliengine.js and targetpacket.jsx
- [x] pliengine.js: formula change only — no new imports beyond mcv field read from signal object
- [x] targetpacket.jsx: one string interpolation added — no new hooks, no new props

**Drift notes:** asdiff.js route comparison and surfacerouter.js cone assignment remain geography-unaware until Phase B WOs are filed.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** D and E anchored to MCV space means the system's two structural mobility metrics are now regime-relative, not signal-count relative. A high-inertia regime (inventory_pressure: 80) produces a different D than a liquid regime (inventory_pressure: 30) at identical source counts — which is the correct behavior.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is D and E reflecting the structural regime the user is operating in, not just how many signals the system found."**

---

## 6. FORMULA / CONTRACT

### D (Diffusion) — MCV-weighted

**Before:**
```js
const diffusion = Math.round(Math.min(signal.source_count ?? 1, MAX_EMITTERS) / MAX_EMITTERS * 100);
```

**After:**
```js
const rawDiffusion = Math.min(signal.source_count ?? 1, MAX_EMITTERS) / MAX_EMITTERS;
const inventoryWeight = (mcv?.inventory_pressure ?? 50) / 100;  // high inertia = harder to diffuse
const diffusion = Math.round(rawDiffusion * (1 - inventoryWeight * 0.3) * 100);
```

Rationale: high inventory_pressure means structural inertia — signals spread less freely. The 0.3 coefficient keeps MCV influence bounded (max -30 points at inventory_pressure=100, zero influence at inventory_pressure=0).

### E (Elasticity) — MCV-weighted

**Before:**
```js
const elasticity = Math.round(gap * (1 - coverage) * 100);
```

**After:**
```js
const demandFactor  = (mcv?.demand_intensity ?? 50) / 100;
const priceFactor   = (mcv?.price_regime ?? 50) / 100;
const mcvElasticity = 1 - (demandFactor * 0.4 + priceFactor * 0.2);  // high demand + high price = less elastic
const elasticity    = Math.round(gap * (1 - coverage) * mcvElasticity * 100);
```

Rationale: high demand + high price regime compress elasticity — the market responds less to movement. Coefficients (0.4, 0.2) keep MCV influence bounded and non-dominant over gap×coverage.

### MCV delivery to pliengine

`pliengine.js` receives `mcv` from the signal object. WO-1842 attaches `mcv` to `tensor` — pliengine must read it from the signal input. If `mcv` is absent (session pre-WO-1842), both formulas fall back to `?? 50` defaults, preserving current behavior exactly.

### ASSEMBLANCE label annotation (targetpacket.jsx)

Under the existing ASSEMBLANCE header line, add one span:
```js
{session?.tensor?.mcv?._meta?.transactionClass && (
  <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>
    {session.tensor.mcv._meta.transactionClass.replace(/_/g, ' ')}
  </span>
)}
```

No structural change to ASSEMBLANCE — annotation only, dimmed, right of existing header content.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/pliengine.js | D formula: rawDiffusion × inventory weight. E formula: gap × coverage × mcvElasticity | All other fields, convergenceState, hpScore, fidelity, arbitration |
| src/components/analysis/targetpacket.jsx | One conditional span under ASSEMBLANCE header — transactionClass label | All scoring, ASSEMBLANCE paths, WINDOW, candidate rendering, all other sections |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — D and E now reflect regime, not just signal count |
| Does this have a single dominant output? | YES — MCV-weighted D and E + regime label |
| Are all boundaries explicitly defined? | YES — fallback to ?? 50 if mcv absent, bounded coefficients |
| Can this be built without touching an undefined dependency? | YES — depends only on WO-1841/1842 output |
| Does this avoid increasing expressive flexibility in the core? | YES — formula change only, no new routing or logic paths |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "inventoryWeight\|mcvElasticity\|demandFactor\|transactionClass" src/engine/pliengine.js src/components/analysis/targetpacket.jsx
```
Must return: both formula lines in pliengine.js and the annotation span in targetpacket.jsx.

Regression check: `synthesizeQuery` with pre-WO-1842 session (no `tensor.mcv`) must produce identical D and E to current baseline — fallback `?? 50` must hold.
