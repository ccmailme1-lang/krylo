# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1835 — CEO Competitive Edge Delivery**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/engine/lensrouter.js · src/components/analysis/targetpacket.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Add CEO persona routing to lensrouter.js and render a competitive positioning brief in targetpacket.jsx when that lens is active — in executive summary format, distinct from CFO ROI output.

**Output:** One new PERSONA_MAP entry (CEO → DEFENDER/CAPITAL_ALLOCATOR) + one new `CompetitiveEdgeBrief` section in targetpacket.jsx that fires only when `session.lens === 'CEO'` and `primaryLensId === 'DEFENDER'`.

---

## 2. BOUNDARY DECLARATION

**Input contract:** All inputs already in scope in targetpacket.jsx:
- `session.lens` — persona key from session
- `lensProfiles` — from `routeLens(session)`, already computed
- `session.query` — the entity under analysis
- `topCandidates[0]` — winning arbitration path
- `arbitration.passed / arbitration.total` — window survival rate (already computed for ASSEMBLANCE)
- `session.tensor.convergenceState` — structural signal quality

**Output contract:** A static text section (no inference, no generation) that re-expresses existing findings in executive summary framing: SIGNAL POSITION · STRUCTURAL WINDOW · EDGE CLAIM.

**Explicit exclusions:**
- Does NOT touch decisionframe.jsx — CEO routes through existing DEFENDER DecisionFrameCard
- Does NOT add new persona types beyond CEO
- Does NOT touch arbitration logic, scoring, or any engine file
- Does NOT create a new component file — renders inline in targetpacket.jsx
- Does NOT touch WO-1834 (CFO ROI) surface — zero overlap
- Does NOT generate or infer copy — all text is derived from existing tensor fields

---

## 3. ZERO DRIFT CONFIRMATION

- [x] lensrouter.js: one new key in PERSONA_MAP (read-only addition, no logic change)
- [x] targetpacket.jsx: one new conditional section — reads existing state, no new hooks, no new store reads, no new props

**Drift notes:** CEO brief section is gated on `session.lens === 'CEO'` — does not fire for any other persona. Zero interference with existing DecisionFrameCard, ASSEMBLANCE section, or Action Plan.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The CEO persona is the highest-value entry point — roundtable-ready intelligence that positions Krylo as a competitive edge instrument, not a data dashboard. This WO makes that value visible on the surface without adding a new data layer.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is the COMPETITIVE EDGE brief — a board-ready competitive signal framing derived entirely from signals Krylo already holds."**

---

## 6. FORMULA / CONTRACT

**CEO persona routing (lensrouter.js):**
```
CEO: { primary: 'DEFENDER', secondary: 'CAPITAL_ALLOCATOR' }
```

**CompetitiveEdgeBrief render gate (targetpacket.jsx):**
```
renders when:
  session.lens?.toUpperCase() === 'CEO'
  AND lensProfiles[0]?.lensId === 'DEFENDER'
  AND hpScore >= 65  (HP_FALLBACK — same gate as DecisionFrameCard)
```

**Three output fields (static derivation, no inference):**
```
SIGNAL POSITION:   session.query + " — " + convergenceState label
STRUCTURAL WINDOW: WINDOW label from arbitration survival rate (reuse ASSEMBLANCE formula)
EDGE CLAIM:        topCandidates[0]?.label ?? '—'  (top path label, verbatim from arbitration)
```

**Convergence state label map (existing values from tensor):**
```
INSUFFICIENT_SIGNAL   → "insufficient signal — no position warranted"
LOW_SIGNAL_YIELD      → "low signal — monitor only"
BUILDING_CONVERGENCE  → "building convergence — early position window"
TURBULENT_CONVERGENCE → "turbulent — asymmetric risk, caution warranted"
HIGH_CONVERGENCE      → "high convergence — structural shift detected"
```

**Units:** All string derivations from existing integer and enum fields. No normalization required.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/lensrouter.js | Add `CEO` key to PERSONA_MAP | All other PERSONA_MAP entries, QUERY_SIGNALS, routeLens logic |
| src/components/analysis/targetpacket.jsx | Add `CompetitiveEdgeBrief` section (inline, conditional) after DecisionFrameCard | All other sections, ASSEMBLANCE, HP canvas, arbitration rendering, scoring |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — CEO persona had no defined routing; output was undefined |
| Does this have a single dominant output? | YES — one brief section, one new PERSONA_MAP entry |
| Are all boundaries explicitly defined? | YES — CEO-only gate, no cross-contamination |
| Can this be built without touching an undefined dependency? | YES — all inputs in scope |
| Does this avoid increasing expressive flexibility in the core? | YES — static derivation only, no new logic paths |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "CEO\|CompetitiveEdge\|SIGNAL POSITION\|EDGE CLAIM" src/engine/lensrouter.js src/components/analysis/targetpacket.jsx
```
Must return:
- `CEO` entry in lensrouter.js PERSONA_MAP
- CEO gate + three output fields in targetpacket.jsx

Visual check: When session.lens = 'CEO' and hpScore ≥ 65, a "COMPETITIVE EDGE" section appears in the target packet showing SIGNAL POSITION · STRUCTURAL WINDOW · EDGE CLAIM.

---

## NOTES

CFO distinction lock: WO-1834 (CFO ROI Proof Layer) targets quantifiable spend justification and outcome tracking. WO-1835 targets competitive positioning and structural edge — different persona, different framing, no shared surface.

Phase B (deferred): CEO brief could be enriched with peer company convergence comparison when multi-entity sessions land. Not in this WO.
