# KRYLO Autonomous Inquiry Chips — Specification v1.1 (Behavioral)

**Status:** GOVERNING SPEC — ratified, pre-implementation
**Supersedes:** `WO-1718-chip-query-builder.md` (see disposition record below)

## 1. Purpose

Autonomous Inquiry Chips enable KRYLO to help a user formulate an analytical question when the
user knows what they are interested in but does not yet know what to ask.

The user supplies an interest, observation, entity, condition, objective, or partial thought.
KRYLO identifies possible lines of inquiry from that starting material. The user is **not**
required to know how to formulate a KRYLO query.

## 2. Core Principle (Non-Negotiable Constraint)

**KRYLO does not require a fully formed query before it can help formulate one.**

The chips are an exploratory mechanism that sits strictly between:

```
USER INTEREST → ANALYTICAL QUESTION → KRYLO ANALYSIS
```

They are **not** query shortcuts, prompt templates, or a form. This principle is the primary
guardrail against accidental reimplementation as a glorified prompt library or five-field
input form.

## 3. Analysis Intent Model (Internal Only)

KRYLO represents an analytical question across five internal dimensions:

- **ACTOR** — who is examining the question
- **SUBJECT** — what is being examined
- **OBJECTIVE** — what outcome or decision is being considered
- **QUESTION** — what the user wants to understand
- **OBSERVATIONAL SCOPE** — the domains across which KRYLO examines relevant structure

These dimensions constitute the **Analysis Intent** model. They are an **internal analytical
representation**, never a required user-input sequence or form.

## 4. Natural-Language Independence & Partial Intent (Hard Requirements)

KRYLO **MUST**:

- Accept elements in any order
- Accept one or more omitted elements
- Accept elements expressed only implicitly
- Accept a partial thought or incomplete utterance
- Attempt to identify all available intent from whatever material is supplied

KRYLO **MUST NOT**:

- Require the user to supply ACTOR, SUBJECT, OBJECTIVE, QUESTION, or OBSERVATIONAL SCOPE
- Require those dimensions in any particular order
- Reject or block progress solely because one or more dimensions cannot be resolved
- Force the user to complete missing dimensions before inquiry chips may appear

Partial intent is fully valid and sufficient for chip generation.

## 5. Autonomous Inquiry Generation (Behavioral Contract)

When sufficient observable context exists, KRYLO **MAY** generate one or more Inquiry Chips.

An Inquiry Chip represents **only**: something that could be examined.

An Inquiry Chip **MUST NOT** represent a conclusion, a prediction, a recommendation, or an
assertion that a relationship or condition exists.

Chips **MUST** be derived from the current analytical context. They **MUST NOT** be presented
as a static, unrelated menu.

## 6. Chip → Question Transition

Selecting an Inquiry Chip **MAY** cause KRYLO to construct a natural-language analytical
question grounded in the available context.

The generated question:

- Remains fully editable by the user
- Is offered as a starting point, not a final commitment
- Does not imply that the selected inquiry is the "correct" or preferred path

## 7. Strict Prohibitions (What Chips Are Forbidden From Doing)

Autonomous Inquiry Chips **MUST NOT**:

- Predict any outcome
- Recommend any investment, action, or decision
- Assert that a relationship, concentration, constraint, or condition exists
- Fabricate missing evidence
- Convert an unresolved condition into a resolved subject
- Imply that any selected inquiry is the correct or best inquiry
- Function as a recommendation engine or prediction engine

The chip exposes a possible analytical path only. KRYLO remains responsible solely for exposing
observable structure; interpretation of meaning belongs to the user.

## 8. Analysis Intent Read (Post-Formation Only)

After a question has been formed (by chip selection + optional user edit), KRYLO **SHOULD**
expose its current interpretation of the question in the five-dimensional form.

This "KRYLO READ" is an interpretation of the user's question — **not** a form the user must
fill out, **not** a prerequisite for further progress.

## 9. Dynamic Behavior

Inquiry Chips **SHOULD** respond to changes in analytical context. As the user adds, removes,
or refines information, the set of available inquiry directions **MAY** change. The chip set
therefore represents **current analytical possibility**, not a fixed taxonomy.

## 10. Responsibility Boundary

**User responsibility** is limited to expressing curiosity, interest, examination, or desire to
understand.

**KRYLO responsibility** is limited to:

1. Identifying available analytical structure from the supplied material
2. Exposing potential lines of inquiry
3. Helping form a usable analytical question
4. Representing the resulting Analysis Intent
5. Proceeding into the existing observable analysis flow

This boundary deliberately eliminates any "junk in / junk out" model that requires the user to
already know how to construct a valid KRYLO query.

## 11. Position in Analytical Flow

Autonomous Inquiry Chips operate strictly upstream of the established KRYLO analytical flow:

```
USER INTEREST
      ↓
AUTONOMOUS INQUIRY CHIPS
      ↓
ANALYTICAL QUESTION
      ↓
ANALYSIS INTENT (internal)
      ↓
SUBJECT → OBSERVABLE SUBSTRATE → FORMATION
```

Formation remains the product output. The chips are solely an input-discovery mechanism.

## 12. Guest & Demo Requirements

A first-time guest **MUST** be able to understand, without documentation:

> "I don't need to know the perfect question. KRYLO can help me discover what to examine."

For live demonstrations, the system **SHOULD** support the uninterrupted sequence:

```
INTEREST → POSSIBLE INQUIRIES → QUESTION → KRYLO READ → OBSERVABLE STRUCTURE → FORMATION
```

A presenter **MUST NOT** need to pre-author a library of perfectly worded queries.

## 13. Explicit Non-Goals

Autonomous Inquiry Chips are **not**:

- A prompt-engineering assistant
- A required five-field query form
- A static list of canned questions
- A recommendation or prediction engine
- A chatbot conversation layer
- A replacement for (or parallel to) KRYLO's analytical engine

Their purpose is inquiry discovery and question formation.

## 14. Acceptance Criteria (Behavioral)

- **AC-01** Partial natural-language interest is sufficient to expose relevant inquiry directions.
- **AC-02** The same intent is recognized regardless of linguistic order of elements.
- **AC-03** Missing dimensions never block inquiry exploration.
- **AC-04** Chips are derived from current context and may change as context changes.
- **AC-05** A chip never asserts existence of any relationship or condition.
- **AC-06** Chip selection can produce an editable natural-language question grounded in
  available context.
- **AC-07** A formed question can be represented via the five-dimensional Analysis Intent model.
- **AC-08** A user who has never seen the Analysis Intent model can still succeed.
- **AC-09** A presenter can start from raw interest and reach a viable analytical path without
  pre-authored queries.
- **AC-10** A formed question enters the existing KRYLO analytical flow without creating any
  parallel system.

## 15. Governing Constraint (Repeated for Emphasis)

**KRYLO does not require a fully formed query before it can help formulate one.**

Any design, implementation, or UI decision that violates this constraint is out of scope and
must be rejected.

---

See `specs/ASSET-DISPOSITION-autonomous-inquiry-chips.md` for the pre-implementation
reconciliation against existing code (`intentparser.js`, `completionchips.js`) and the
superseded spec (`WO-1718-chip-query-builder.md`). Implementation may not begin until that
disposition record and this spec are both ratified.
