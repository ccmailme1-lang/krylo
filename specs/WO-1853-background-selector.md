# WO-1853 — Analysis Background Selector Drawer
Date: 2026-06-23
Author: Mr. XS
Target file(s): src/components/analysis/analysisidlefield.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Render a slide-out drawer triggered by an icon adjacent to the analysis query box, allowing the user to select a background preset for the analysis surface.

**Output:** Active background style applied to the analysis query/surface container.

---

## 2. BOUNDARY DECLARATION

**Input contract:** User click on drawer trigger icon.

**Output contract:** `activeBackground` state (one of: DARK | STORM | SUNNY | VOID | SIGNAL) applied as CSS/inline style to the analysis surface background layer.

**Explicit exclusions:**
- No engine changes
- No signal data reads
- No changes to query logic, session state, or arbitration
- SIGNAL option = Phase B stub only (no live 3D render in Phase A)
- No changes to any file outside analysisidlefield.jsx

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies

**Drift notes:** Background state is purely cosmetic. No signal schema, scoring, or inference layer touched. SIGNAL stub displays a placeholder — live cone render deferred to Phase B.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Surface-level differentiation — makes the analysis environment feel like a workspace the user inhabits, not a tool they operate.

Note: valid UX infrastructure, not core mission advancement. Proceeding as cosmetic layer.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a user-selectable background state on the analysis surface with no engine coupling."**

---

## 6. FORMULA / CONTRACT

No calculation. State machine only:

```
activeBackground ∈ { DARK, STORM, SUNNY, SIGNAL }
default: DARK
SIGNAL: Phase B stub — renders placeholder, not live cone field
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/components/analysis/analysisidlefield.jsx | Add drawer trigger icon + drawer panel + activeBackground state + background style application | All query logic, session handling, arbitration, engine calls |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES |
| Does this have a single dominant output? | YES |
| Are all boundaries explicitly defined? | YES |
| Can this be built without touching an undefined dependency? | YES |
| Does this avoid increasing expressive flexibility in the core? | YES |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

- Drawer icon visible adjacent to analysis query input
- Clicking icon opens/closes drawer
- All 5 options render (SIGNAL shows Phase B stub label)
- Selected option applies background to analysis surface
- DARK is default
- No query/engine behavior changed — grep confirms no arbitrate/tensor/session changes
