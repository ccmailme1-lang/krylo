# WO HARDENING — RKM Core Schema & Execution Engine
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2050 — Reality Knowledge Model (RKM) Core**
Date: 2026-06-30
Author: Mr. XS + Agent
Target file(s): src/engine/rkmstore.js (NEW)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Define the `RealityObject` schema and enforce execution semantics (create / merge / supersede / contradiction) as an append-only store that sits on top of existing `identitykernel.js` and `evidencetiers.js`.

**Output:** `RealityObject` — a versioned, provenance-bearing, epistemically-typed knowledge primitive consumed by WO-2047 (connector) and WO-2051 (integration).

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- Evidence descriptor (EPISTEMIC_CLASS from `evidencetiers.js` — read-only)
- Identity result from `identitykernel.js` — read-only
- Raw observation content (string, structured by caller)

**Output contract:**
- `RealityObject` — schema-valid, immutable on creation, versioned on update
- Epistemic transition log (append-only trace per object)
- `truthStability` score (0–1, recomputed on merge/supersede)

**Explicit exclusions:**
- No signal dispatch — zero imports from `surfacerouter.js`
- No cone pressure writes — no `dispatchBatch()` calls
- No UI rendering — no JSX, no React
- No EDGAR-specific logic — connector-agnostic
- No deletion — objects are superseded or merged, never removed

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  NOTE: RKM defines schema only. Signal schema (surfacerouter, cones) is untouched.

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: `truthStability` is a measurement (observed-evidence ratio), not a recommendation.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: `rkmstore.js` has no import path to `convergenceclassifier.js` or `metricsengine.js`.

**Drift notes:** RKM is a write-isolated knowledge substrate. It produces objects; it does not route, score signals, or influence cone state.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** RKM grounds every downstream signal in a verifiable, contradiction-aware, epistemically-typed reality object — making "how real is this?" a first-class computable property rather than an assumed baseline.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a `RealityObject` — a versioned, append-only knowledge primitive with explicit epistemic state, truth stability score, and contradiction tracking."**

---

## 6. FORMULA / CONTRACT

### RealityObject schema (locked)

```js
{
  id:               string,          // 'robj_<uuid>'
  identityId:       string | null,   // stable cross-instance anchor (from identitykernel)
  objectType:       'EVENT' | 'COMMITMENT' | 'RELATIONSHIP' | 'ENTITY_STATE' | 'CONSTRAINT',
  title:            string,
  summary:          string,
  observedAt:       string,          // ISO timestamp
  validFrom:        string | null,
  validUntil:       string | null,
  state:            string,          // domain-specific (e.g. 'ANNOUNCED', 'FULFILLED')
  epistemicState:   'KNOWN' | 'OBSERVED' | 'VERIFIED' | 'GROUNDED' | 'DISPUTED' | 'SUPERSEDED' | 'RETRACTED' | 'UNKNOWN',
  epistemicHistory: [ { state, at, sourceId, reason } ],
  truthStability:   number,          // 0–1, recomputed on merge/supersede
  evidence:         string[],        // evidenceIds supporting this object
  contradictions:   string[],        // robj IDs this conflicts with
  genealogy: {
    causedBy:    string[],
    causes:      string[],
    dependsOn:   string[],
    enables:     string[],
    derivedFrom: string[],
  },
  metadata:         object,
  ingestedAt:       string,
  lastUpdatedAt:    string,
}
```

### Execution semantics (locked)

| Operation | Rule |
|-----------|------|
| create | Append new RealityObject; no mutation of existing |
| merge | New object created; evidence arrays unioned; truthStability recomputed; old object epistemicState → SUPERSEDED |
| supersede | Old object validUntil = now; epistemicState → SUPERSEDED; new object inherits identityId |
| contradiction | Both objects get contradictions[] updated; epistemicState → DISPUTED; truthStability ↓ |

### truthStability formula

```
truthStability = clamp(
  (evidenceCount × avgEpistemicWeight) / (1 + contradictionPenalty),
  0, 1
)
```

- `avgEpistemicWeight`: STRUCTURAL=1.0, OPERATIONAL=0.8, FINANCIAL=0.7, NARRATIVE=0.3
- `contradictionPenalty`: 0.25 per unresolved contradiction
- Never increases without new evidence

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/rkmstore.js` | NEW — RealityObject schema, createObject(), mergeObjects(), supersedeObject(), flagContradiction(), getById(), listByIdentity() | — |
| `src/engine/evidencetiers.js` | READ-ONLY consumer — EPISTEMIC_CLASS weights | No structural change |
| `src/engine/identitykernel.js` | READ-ONLY consumer — identityId lookup | No structural change |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — explicit epistemic states replace implicit confidence assumptions |
| Does this have a single dominant output? | YES — RealityObject |
| Are all boundaries explicitly defined? | YES — no surfacerouter, no UI, no EDGAR logic |
| Can this be built without touching an undefined dependency? | YES — evidencetiers.js and identitykernel.js both exist |
| Does this avoid increasing expressive flexibility in core? | YES — append-only store; no mutation path |

**Verdict: PASS**

---

## 9. DEFINITION OF DONE

1. `grep -n "dispatchBatch\|surfacerouter\|metricsengine" src/engine/rkmstore.js` → zero results
2. `grep -n "SUPERSEDED\|DISPUTED" src/engine/rkmstore.js` → present in both supersedeObject() and flagContradiction()
3. Create two conflicting objects → flagContradiction() → both carry contradictions[], both epistemicState = DISPUTED
4. merge() two objects → new object truthStability > either source; old objects epistemicState = SUPERSEDED
5. No object ID is ever deleted from the store
