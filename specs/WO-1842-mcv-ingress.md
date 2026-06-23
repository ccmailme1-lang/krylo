# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1842 — MCV Resolution at Query Ingress**
Date: 2026-06-23
Author: Mr. XS / Claude
Target file(s): src/engine/querysynthesis.js
Depends on: WO-1841 (mcvresolver.js must exist)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Call `resolveMCV()` at the top of `synthesizeQuery()` and attach the result as `tensor.mcv` on the session output. Strip geographic terms from synthesis display labels. No scoring changes. No formula changes.

**Output:** `session.tensor.mcv` populated on every `synthesizeQuery()` call.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `resolveMCV(query, session)` from WO-1841 — already defined.

**Output contract:** `synthesizeQuery()` return value gains one new field:
```js
tensor: {
  ...existing fields unchanged...
  mcv: MCVObject,  // from resolveMCV — all 6 fields + _meta
}
```

**Explicit exclusions:**
- Does NOT change any existing synthesis formulas (price calculations, arbitration logic, scoring)
- Does NOT change convergenceState, fidelityScore, hpScore, D, E, or WINDOW
- Does NOT remove geographic terms from user-facing query display (only from internal synthesis assumptions)
- Does NOT touch pliengine.js, asdiff.js, or any file outside querysynthesis.js
- Does NOT gate synthesis on MCV — synthesis runs regardless, MCV is attached passively

---

## 3. ZERO DRIFT CONFIRMATION

- [x] One file modified — querysynthesis.js
- [x] Only addition: one import + one function call + one field on output object
- [x] All existing synthesis paths unchanged — MCV is additive at this stage

**Drift notes:** WO-1843 will consume tensor.mcv. This WO only populates it.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** This WO is the insertion point — the single place where geographic contamination is replaced by structural resolution. Every future WO that needs MCV reads from tensor.mcv without re-deriving it.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is tensor.mcv being available to all downstream consumers — one call, one attachment, no geography ever entering synthesis again."**

---

## 6. FORMULA / CONTRACT

**Change in querysynthesis.js:**

```js
// ADD at top of file
import { resolveMCV } from './mcvresolver.js';

// ADD at top of synthesizeQuery(session) — before any synth function is called
const mcv = resolveMCV(session?.query ?? '', session);

// ADD to return object / tensor construction
tensor: {
  ...existingTensorFields,
  mcv,
}
```

**Geographic label stripping rule:**
Inside each synth function (`synthRealEstate`, `synthAuto`, etc.), any hardcoded string that references a location assumption (e.g., `"location-dependent"`, `"Local market conditions may deviate"`) is replaced with:
```
"Market regime conditions may vary — see MCV for structural context."
```
This is the only copy change. No formula touched.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/querysynthesis.js | Add `resolveMCV` import + call at ingress + `mcv` on tensor output + 2–3 label string updates | All synthesis formulas, scoring logic, arbitration, domain detection, all other fields |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — geographic assumptions no longer silently enter synthesis |
| Does this have a single dominant output? | YES — tensor.mcv populated |
| Are all boundaries explicitly defined? | YES — additive only, no formula changes |
| Can this be built without touching an undefined dependency? | YES — depends only on WO-1841 output |
| Does this avoid increasing expressive flexibility in the core? | YES — passive attachment, no routing changes |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```
grep -n "resolveMCV\|tensor\.mcv\|mcv:" src/engine/querysynthesis.js
```
Must return: import line, call site, and mcv field in tensor output.

Functional check: `synthesizeQuery({ query: 'i want to buy a home in long island', lens: 'GENERAL' })` returns an object where `result.tensor.mcv._meta.transactionClass === 'REAL_ESTATE'` and no field in `result.tensor.mcv` contains a geographic string.
