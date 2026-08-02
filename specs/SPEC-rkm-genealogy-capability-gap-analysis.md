# SPEC — RKM Genealogy Capability Gap Analysis
Jira: KRYL-XXXX (pending — no ticket filed yet, per project_jira_exclusive_numbering)
Date: 2026-08-02
Author: drafted by agent at Founder's explicit request, from a live joint investigation this
session — every claim below was verified against the actual codebase in this same session,
not recalled from CLAUDE.md's history or assumed from doctrine.

Status: ANALYSIS ONLY. Not an implementation WO. Produces no code, no schema change, no
integration proposal. Output is a decision point for the Founder, not a build authorization.

**Constraints this document holds itself to (Founder-specified):**
- Analysis only — no implementation tasks
- No new genealogy schema
- No CI-F/LFOS integration proposal
- No modification of `rkmstore.js`'s existing contract
- No assumption that every relationship type should be populated
- Explicit separation from identity lineage and evidence tiers (different axes, not overlaps)

---

## 1. Executive Finding

Initial assumption entering this investigation: *"CI-F needs a genealogy capability → build
genealogy → wire CI-F in."*

Corrected finding, after verifying the actual codebase: **RKM already has a genealogy
contract.** The schema exists, is well-formed, and is sitting in an active production write
path today. What's missing isn't the data model — it's population. Every live write to that
schema leaves it empty.

```
Initial assumption:                Corrected understanding:
CI-F needs genealogy                RKM already has genealogy contract
  → build genealogy capability        → live writers emit empty genealogy
  → wire CI-F                         → define controlled population model
                                       → future engines consume existing substrate
```

That distinction is the entire value of this analysis. The open question is not "should KRYLO
support genealogy" — it already has the slot. The open question is: **under what controlled
conditions does a KRYLO component earn the right to populate an RKM relationship?**

---

## 2. Current State

**RKM contract** (`src/engine/rkmstore.js`, WO-2050) — append-only store of RealityObjects.
Every object carries a `genealogy` field with five relationship arrays, defined at object
creation:

```js
genealogy: {
  causedBy:    [],
  causes:      [],
  dependsOn:   [],
  enables:     [],
  derivedFrom: [],
}
```

`contradictions` is tracked separately, as a sibling top-level field (not nested in
`genealogy`), via `flagContradiction(idA, idB, sourceId, reason)` — this already works and is
a distinct mechanism from causal genealogy.

**Production writer** — `createObject()` is the only way a genealogy field gets initialized.
Searched every file in `src/engine/` (including `src/engine/connectors/`) that imports
`rkmstore.js`. Only one calls `createObject()`: `src/engine/connectors/edgar8kconnector.js`
(line ~196), and it always passes `genealogy: {}` — empty, every call, no exception found.

**This writer is live.** `edgar8kconnector.js` is imported directly by `src/app.jsx`, and also
by `edgarnarrativeconnector.js`, `edgar8kevidence.js`, `edgar8ksignal.js`. This is not a
dormant or theoretical gap — RKM objects are created in production today, continuously, and
every one of them has an empty genealogy the moment it's written.

**Readers are read-only.** `edgar8kevidence.js` and `edgar8ksignal.js` — both reachable from
the live query path (`querysynthesis.js` → `edgar8kevidence.js`) — carry explicit comments:
*"NO createObject — rkmstore is a read-only source here."* Nothing currently reads genealogy
either, since there's nothing populated to read.

---

## 3. Related Systems Review

Two existing live systems were checked for overlap before concluding this is a real gap, not
a duplicate. Both are confirmed to answer a **different question** than genealogy does:

| System | Question it answers | Live? | Overlap with genealogy? |
|---|---|---|---|
| `identitylineage.js` (WO-2007B) | "What happened to this identity?" (CREATED/NODE_ADDED/MERGED/FRAGMENTED transition history) | Yes (via `whytrace.js`) | None — read-only telemetry bus on identity-kernel state changes, explicitly barred from being used for mutation. Tracks *when identity state changed*, not *why objects are causally related*. |
| `evidencetiers.js` (WO-2005A) | "What class/strength of evidence supports this?" (STRUCTURAL, etc.) | Yes (via `whytrace.js`) | None directly — but this is the existing contract an edge-provenance model should extend, not replace. Its own header is explicit: "CONTAINS NO SCORING LOGIC." |

Three distinct axes, confirmed, not collapsed into one generic "provenance" layer:

```
Identity Lineage    → what happened to this identity (state transition history)
Evidence Tiers       → what kind of evidence supports a claim (class/strength taxonomy)
RKM Genealogy         → what relationship exists between knowledge objects (contract exists, population missing)
```

`canonicalresolution.js` (the live identity-resolution path) was also checked — it does not
import `identitykernel.js` (WO-2004's CanonicalEvent kernel), meaning identity resolution
itself currently runs on a separate path from the formal identity kernel. Noted as a related,
adjacent finding — out of scope for this document, which is genealogy-only.

---

## 4. Capability Gap Definition

**The gap is population, not definition.** The schema is real, live, and already receiving
writes. No downstream reasoning capability can consume causal relationships from RKM today,
because none exist in any live object — not because the field is missing, but because nothing
in the current write path is authorized or built to fill it in.

---

## 5. Non-Goals / Exclusions

This document does NOT:
- Propose a new genealogy schema (the existing five fields — `causedBy`, `causes`,
  `dependsOn`, `enables`, `derivedFrom` — are the contract; extend them, never replace them)
- Propose wiring CI-F or LFOS into the live path
- Propose changes to `rkmstore.js`'s existing function signatures or object shape
- Assume every one of the five relationship types needs a population strategy — some may
  remain intentionally unpopulated pending a real consumer
- Merge identity lineage or evidence tiers into a single "provenance" concept — they stay
  separate, per §3

---

## 6. Open Architectural Questions

These are unresolved and are exactly the boundary that must be defined before any population
work is authorized:

1. **Who is allowed to create a genealogy edge?** A `causes` assertion is a reasoning claim,
   not metadata — asserting "A causes B" carries different weight than asserting "A has
   confidence 0.8." Not every writer should automatically earn this.
2. **What evidence/confidence model does an edge itself carry?** A flat `{ causes: ["id"] }`
   has no lineage — no source, no confidence, no timestamp, no validation state. Does an edge
   need its own provenance record, and if so, does it reuse `evidencetiers.js`'s existing
   `EPISTEMIC_CLASS` taxonomy rather than invent a new confidence scale?
3. **Is a relationship observed, inferred, proposed, or validated?** These are different
   trust levels and may need different write permissions or a review/promotion step.
4. **Which live process owns genealogy creation going forward?** Today only
   `edgar8kconnector.js` writes objects at all. Does population belong there, in a new
   dedicated step, or is it structurally a separate concern from object creation entirely
   (i.e., a relationship-extraction pass that runs after creation, not during)?

---

## 7. Downstream Impact

Capabilities currently blocked by absent genealogy data — listed as **consumers of a decision
still to be made**, not as drivers of this analysis or a reason to rush it:

- **CI-F** (`cifengine.js`, WO-2053) — causal graph expansion over RKM genealogy. Already
  orphaned (zero live importers, verified this session); even if wired in, it would traverse
  a graph with no edges today.
- **LFOS** (`lfosengine.js`, WO-2056) — propagation physics over admitted candidates. Same
  dependency and same orphan status.
- Any future causal-reasoning capability that assumes object-to-object relationships exist.

---

## 8. Recommendation

**No implementation until the ownership and edge-semantics questions in §6 are answered by
the Founder.** The risk here is not "missing code" — CI-F and LFOS already exist as code. The
risk is allowing causal assertions into the system without a governed origin, which would
undermine the same truth-boundary discipline this codebase already enforces elsewhere (§21
Route-Don't-Aggregate, §22 Absence-is-Signal — an unpopulated relationship should stay
absent/unpopulated rather than be inferred casually to unblock a downstream engine).

This document's job ends at defining the boundary. Whether and how to populate genealogy is a
decision, not a default.
