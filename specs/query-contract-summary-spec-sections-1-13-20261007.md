# Query Contract — Summary Specification

Source: pasted into the session by the Founder, 2026-10-07 (sections 1-13). The file `specs/Query Contract — Summary Specification.md` is a truncated copy of this text (ends inside section 2) and also carries a header and Appendix A that are not in this paste. This file holds the complete body so it is in git. Not authorized for build. Ticket: KRYL-1372.

## 1. Purpose

KRYLO must determine **what the user is asking about** and **what they want to know about it** before entity resolution or structural analysis begins.

The result is a single authoritative **Query Contract**.

### Core invariant

**SUBJECT + OBJECTIVE ARE THE QUERY CONTRACT.**

Required ordering:

**SELECT → LOCK → RESOLVE → ANALYZE**

---

## 2. Query Contract

```ts
interface QueryContract {
  subject: {
    text: string;
    canonicalId: string | null;
    attribution: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "NONE";
  };

  objective:
    | "INVESTMENT"
    | "ACQUISITION"
    | "STRUCTURAL_READ"
    | "DECISION_CONTEXT"
    | "DECISION_FRAME"
    | null;

  mentions: Array<{
    text: string;
    canonicalId: string | null;
    role: "CONTEXT" | "COMPARISON" | "OTHER";
  }>;

  selectionRule: string;
  queryText: string;
  builtAt: number;
}
```

---

## 3. Subject Selection

Subject selection answers:

> **What entity, thing, or decision object is the user asking about?**

Selection operates over the **complete submitted analysis context**, including the user's question and any supplied target/content.

Selection must use the strongest available structural evidence, including:

* explicitly named subjects;
* grammatical/question structure;
* explicit referents such as “this” or “it”;
* the entity represented by supplied target content;
* a single explicit entity when no stronger subject cue exists.

If multiple entities occupy genuinely competing subject positions and no rule establishes precedence:

**AMBIGUOUS — do not guess.**

If no subject can be established:

**NONE.**

### Critical distinction

**Subject selection is not entity resolution.**

The system first determines:

> “The user means X.”

Then it determines:

> “Which real-world entity corresponds to X?”

---

## 4. Subject Lock

Once selected, the subject is authoritative.

Entity resolution, contextual mentions, evidence, relationships, Formation, or downstream UI may **not replace it**.

An unresolved subject remains the selected subject:

```text
SUBJECT = X
ATTRIBUTION = UNRESOLVED
```

It does not become another resolvable entity merely because that entity appears elsewhere in the input.

---

## 5. Objective Selection

Objective is selected independently from subject.

Examples include:

* `INVESTMENT`
* `ACQUISITION`
* `STRUCTURAL_READ`
* `DECISION_CONTEXT`
* `DECISION_FRAME`

Objective describes the analytical purpose. It does **not** authorize KRYLO to produce an investment recommendation, score, or verdict.

---

## 6. Entity Resolution

Only after subject selection and lock:

**Selected subject → entity resolution**

Possible results:

* `RESOLVED`
* `UNRESOLVED`
* `AMBIGUOUS`
* `NONE`

`NAMED_UNVERIFIED` maps to the contract surface as `UNRESOLVED`.

---

## 7. Mentions

All other recognized entities are mentions unless the selection rules establish them as the subject.

A mention may be:

* `CONTEXT`
* `COMPARISON`
* `OTHER`

A mention being highly resolvable does not make it the subject.

---

## 8. Authority and Lifecycle

There is **one authoritative Query Contract per submitted analysis**.

`createSession()` creates it from the original analysis input.

On reload, it may be reconstructed from that persisted input.

No downstream component independently determines subject identity.

All subject-dependent consumers read the contract, including:

* Target Packet
* Structural Brief
* MAP subject node
* packet header
* Formation binding
* narrative/recon payloads
* other subject-dependent analysis surfaces

`subjectScope()` cannot remain an independent subject authority.

---

## 9. Production Regression Cases

These demonstrate the capability but do not define it.

### Subcritical Systems

Question:

> “Is this a good investment?”

Target content identifies **Subcritical Systems** and contains contextual references to SpaceX.

Expected:

```text
SUBJECT = Subcritical Systems
OBJECTIVE = INVESTMENT
ATTRIBUTION = UNRESOLVED
SpaceX = CONTEXT
```

### Daytona

Question:

> “Is this a good investment?”

Target content identifies **Daytona** and contains contextual references to Meta.

Expected:

```text
SUBJECT = Daytona
OBJECTIVE = INVESTMENT
ATTRIBUTION = UNRESOLVED
Meta = CONTEXT
```

The invariant demonstrated by both:

> **A contextual entity cannot displace the selected subject.**

---

## 10. Preserved Behavior

Existing valid behaviors must remain unchanged, including:

* explicit named subjects;
* single-entity queries;
* named-but-unresolved subjects;
* decision-frame queries with no subject;
* existing `subjectscope` / `analysisintent` QA coverage.

---

## 11. Reachability

The capability is not complete from unit tests alone.

Acceptance must traverse the real path:

**User submission → Query Contract → downstream consumers → guest-facing output**

The original Subcritical and Daytona failures must pass through the running application.

Other paths that construct sessions must also be checked for contract consistency.

---

## 12. Non-Goals

This specification does not change:

* entity resolution itself;
* normalization;
* entity registry;
* Formation;
* relationship admission;
* evidence attribution;
* domain measures;
* MAP layout;
* investment recommendation/scoring.

No LLM is required.

If an LLM is evaluated later, it must operate **inside the selection stage** and produce the same contract with the same invariants. It does not become the architecture.

---

## 13. Completion Criterion

The capability is complete when KRYLO can reliably:

1. **select the intended subject;**
2. **select the objective;**
3. **lock both into one Query Contract;**
4. **resolve the selected subject without replacing it;**
5. **classify other entities as mentions;**
6. **carry the same contract through every downstream surface;**
7. **withhold rather than substitute when subject resolution fails.**

The historical failures are regression tests for this general capability—not the scope of the capability.
