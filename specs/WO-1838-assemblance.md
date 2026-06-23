# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1838 — Assemblance Surface Layer**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/components/analysis/targetpacket.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Rename and reframe the existing alternatives section as "ASSEMBLANCE" — a named structural path surface — and add a WINDOW label computed from arbitration survival rate.

**Output:** The word "Alternatives" replaced by "ASSEMBLANCE" with a path count and WINDOW label (OPEN / TIGHT / CLOSING). No new components, no new data.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `arbitration.passed`, `arbitration.total`, `arbitration.dominated`, `topCandidates` — all already present via `session.tensor.arbitration`.

**Output contract:** New header label + WINDOW label string. The candidates, scores, types, and ranking are unchanged.

**Explicit exclusions:**
- Does NOT alter candidate scores, ranks, or types
- Does NOT change arbitration logic or filtering
- Does NOT wire in cone-level LE (that is Phase B — separate WO)
- Does NOT touch actionmatrix.jsx, pliengine.js, or any engine file
- Does NOT reorder paths — ranking is unchanged

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies — WINDOW label derives from arbitration fields already in scope

**Drift notes:** Zero new props, zero new hooks, zero new store reads. Pure relabeling + derived label from existing integers.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Assemblance names and surfaces the multi-path structural reality that already exists in the arbitration engine — making it visible that KRYLO preserves multiplicity rather than collapsing to a single answer, and showing the temporal constraint (WINDOW) against which paths were measured.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is the ASSEMBLANCE label and WINDOW indicator — the first visible signal that KRYLO shows paths, not predictions."**

---

## 6. FORMULA / CONTRACT

**WINDOW label:**
```
survival_rate = arbitration.passed / arbitration.total
OPEN:    survival_rate > 0.5
TIGHT:   survival_rate 0.25–0.5
CLOSING: survival_rate < 0.25
```

**Units:** Categorical label derived from existing integer fields. No normalization required.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/components/analysis/targetpacket.jsx | Replace "Alternatives · X/Y survived · Z eliminated" header with "ASSEMBLANCE · X PATHS · WINDOW: [label]" | All candidate rendering, scores, arbitration engine, all other sections |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — names a concept that was anonymous |
| Does this have a single dominant output? | YES — one label change + one new derived string |
| Are all boundaries explicitly defined? | YES — read-only, no score mutation |
| Can this be built without touching an undefined dependency? | YES — all inputs in scope |
| Does this avoid increasing expressive flexibility in the core? | YES — no new logic paths |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "ASSEMBLANCE\|WINDOW" src/components/analysis/targetpacket.jsx
```
Must return the header label and WINDOW string in the alternatives section.

Visual check: targetpacket alternatives section shows "ASSEMBLANCE · N PATHS · WINDOW: OPEN/TIGHT/CLOSING"

---

## NOTES

Cone-level LE (from WO-1836/1837) wired into targetpacket is Phase B. That requires passing LE through the query pipeline — a separate WO. This WO establishes the concept on the surface using arbitration-native data.
