# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1837 — Asymmetry Decay Function (Life Expectancy Score)**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/components/spine/conemap.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Compute and display a single Life Expectancy (LE) score that quantifies how long a structural gap will survive against the forces of diffusion and elasticity.

**Output:** One normalized scalar (0–100) + one label (LONG / MED / SHORT / CLOSING) displayed as a WINDOW row in the InspectionPanel STATS section.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `cone.pressure` (0–100), `D` (diffusion, 0–100), `E` (elasticity, 0–100) — all already computed in the STATS block of InspectionPanel.

**Output contract:** `LE` scalar (0–100) and a label string. Read-only display. No write-back to any store or engine.

**Explicit exclusions:**
- Does NOT alter pressure, D, or E values
- Does NOT touch pliengine.js, convergenceclassifier.js, or surfacerouter.js
- Does NOT feed LE into convergence state classification
- Does NOT generate a recommendation — LE is a structural measurement, not an action

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies — LE is computed inline from pressure, D, and E already present in the same STATS block

**Drift notes:** LE is purely derived from existing computed values in the same render scope. No new props, no new hooks, no store reads.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** LE surfaces the time-bounded survivability of a structural gap — the first metric in KRYLO that directly quantifies how long an asymmetry can be exploited before diffusion and elasticity close it.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a number that tells you how long the opportunity window stays open."**

---

## 6. FORMULA / CONTRACT

**Formula:**
```
LE = (1 - P/100) × (1 - D/100) × (1 - E/100) × 100
```
Where:
- P = cone.pressure (0–100)
- D = diffusion score (0–100, computed in same block)
- E = elasticity score (0–100, computed in same block)

**Label thresholds:**
- LE 70–100 → LONG
- LE 40–69  → MED
- LE 15–39  → SHORT
- LE 0–14   → CLOSING

**Units:** 0–100 normalized scalar. Conforms to §16 signal scale.

**Sanity checks (structural — not tests):**
- P=100, any D, any E → LE = 0. No gap = no window. Correct.
- P=0, D=0, E=0 → LE = 100. Maximum window. Correct.
- P=50, D=33, E=0 → LE ≈ 33. Short window under moderate diffusion. Correct.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/components/spine/conemap.jsx | Add LE computation + WINDOW row inside existing D/E STATS block | Everything outside that block |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — names and quantifies the opportunity decay force |
| Does this have a single dominant output? | YES — one scalar, one label |
| Are all boundaries explicitly defined? | YES — no external deps, no write-back |
| Can this be built without touching an undefined dependency? | YES — all inputs already in scope |
| Does this avoid increasing expressive flexibility in the core? | YES — read-only derived metric |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "WINDOW\|lifeExp\|LE " src/components/spine/conemap.jsx
```
Must return the LE computation and WINDOW display row.

Visual check: CONE tab → STATS — WINDOW row appears below ELASTICITY showing score + label.

---

## NOTES

LE is the structural bridge between WO-1836 (D + E measured) and future WO-1838 (Assemblance). D and E become architecture here — they now produce a downstream output that changes with them.
