# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0
### Every WO must pass this before review. No exceptions.

---

## HEADER

**WO-[NUMBER] — [TITLE]**
Date:
Author:
Target file(s):

---

## 1. SINGLE RESPONSIBILITY CHECK

> What is the one structural job this module does?

**Job:**

> What is the one dominant output type this produces?

**Output:**

If you wrote more than one sentence for either — the WO is too large. Split it.

---

## 2. BOUNDARY DECLARATION

> What does this module receive as input?

**Input contract:**

> What does this module produce as output?

**Output contract:**

> What does this module NOT touch?

**Explicit exclusions:**

If you cannot answer the exclusions line — the boundary is not defined. Do not build.

---

## 3. ZERO DRIFT CONFIRMATION

Check each that applies. Every checked box must have a note confirming it is NOT violated.

- [ ] Detection layer touched → inference does NOT redefine signal schema
- [ ] Scoring layer touched → output is NOT a recommendation
- [ ] Inference layer touched → result does NOT write back to signal scores
- [ ] UI layer touched → display does NOT introduce new data dependencies

**Drift notes:**

---

## 4. STRATEGIC LEVERAGE STATEMENT

> "What asymmetry does this WO surface, protect, measure, or exploit?"

**Statement:**

If this cannot be answered in one sentence — the WO may be valid infrastructure but it is not advancing the core mission. Note that explicitly and proceed only with Founder approval.

---

## 5. OUTPUT GRAVITY

> Complete this sentence in one line:

**"The single thing this WO produces that matters most is ___."**

If you cannot complete it in one line — the WO has no gravity. Rewrite it.

---

## 6. FORMULA / CONTRACT (if applicable)

If this WO introduces a calculation, metric, or data contract — write it explicitly here.
No hand-waving. No "derived from context."

**Formula / contract:**

Units:

Normalization (must conform to 0–100 signal scale per §16):

> If the formula is unknown, write: **Formula: TBD — WO BLOCKED.**
> Do not invent numbers to unblock a WO. A blocked WO is honest. An invented formula is technical debt.

---

## 7. FILE MAP

List every file this WO touches. For each file, state what changes and what does not.

| File | Change | Unchanged |
|------|--------|-----------|
| | | |

If a file is listed as "TBD" — the WO is not ready to build.

---

## 8. BOTTLE TEST

Answer each with YES or NO. Any NO = WO fails. Rewrite before proceeding.

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | |
| Does this have a single dominant output? | |
| Are all boundaries explicitly defined? | |
| Can this be built without touching an undefined dependency? | |
| Does this avoid increasing expressive flexibility in the core? | |

**Verdict:** PASS / FAIL

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

Second-pass filter, run only after the Bottle Test passes. The Bottle Test checks buildability
and scope; 4AR checks whether the WO is actually worth the architectural weight — in particular
it has the one check the Bottle Test has no equivalent for: Risk of Contamination.

**1. Structural Integrity (SI)**
- Does the change preserve existing invariants?
- Are any hidden dependencies introduced?
- Are runtime contracts unchanged or explicitly versioned?

**2. Semantic Consistency (SC)**
- Does terminology align with existing ontology?
- Are new concepts derivable from existing definitions?
- Any duplication of existing constructs under new naming?

**3. Execution Containment (EC)**
- Does this WO require runtime changes, or is it declarative-only?
- Are side effects bounded to the described module(s)?
- Does it avoid implicit cross-module mutation?

**4. Drift Exposure (DE)**
- Does this introduce ambiguity over time?
- Could future interpretations diverge from intended meaning?
- Does it require a "living definition," or is it static?

**Outcome tag (one per WO):**
- **PASS** — no escalation required
- **CONSTRAINED** — acceptable but requires a downstream note
- **BLOCKED** — violates structural/semantic integrity

---

## 10. DEFINITION OF DONE

State the exact grep or visual check that confirms this WO is complete.
Memory and registries are updated only after this check passes.

**Verification:**

---

## NOTES

(Optional — for context that doesn't fit above. Keep short.)
