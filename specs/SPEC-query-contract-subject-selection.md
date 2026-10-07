# Query Contract — Summary Specification

**Status:** DRAFT v2, 2026-10-07. Founder-authored normative text (§1–§13). Not authorized
for build. No Jira ticket assigned.
**Classification:** §2 Class **E** (actual capability gap).
**Supersedes:** v1 of this file (organized around the two failures; this version specifies the
general capability, and the failures are regression cases only).
**Evidence base:** Appendix A, traced against commit `343d104` (2026-10-06). Line references
must be re-checked against current `main` before build.
**Not modified:** `specs/def-subject-resolution-admits-subject-not-in-query-20261006.md`.

---

## 1. Purpose

KRYLO must determine what the user is asking about and what they want to know about it before
entity resolution or structural analysis begins.

The result is a single authoritative Query Contract.

**Core invariant:**

> SUBJECT + OBJECTIVE ARE THE QUERY CONTRACT.

**Required ordering:**

```
SELECT → LOCK → RESOLVE → ANALYZE
```

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

> What entity, thing, or decision object is the user asking about?

Selection operates over the **complete submitted analysis context**, including the user's
question and any supplied target/content.

Selection must use the strongest available structural evidence, including:

- explicitly named subjects;
- grammatical/question structure;
- explicit referents such as "this" or "it";
- the entity represented by supplied target content;
- a single explicit entity when no stronger subject cue exists.

If multiple entities occupy genuinely competing subject positions and no rule establishes
precedence: **AMBIGUOUS — do not guess.**

If no subject can be established: **NONE.**

### Critical distinction

**Subject selection is not entity resolution.**

The system first determines: *"The user means X."*
Then it determines: *"Which real-world entity is X?"*

---

## 4. Subject Lock

Once selected, the subject is authoritative.

Entity resolution, contextual mentions, evidence, relationships, Formation, or downstream UI
may not replace it.

An unresolved subject remains the selected subject:

```
SUBJECT     = X
ATTRIBUTION = UNRESOLVED
```

It does not become another resolvable entity merely because that entity appears elsewhere in
the input.

---

## 5. Objective Selection

Objective is selected independently from subject. Examples:

- `INVESTMENT`
- `ACQUISITION`
- `STRUCTURAL_READ`
- `DECISION_CONTEXT`
- `DECISION_FRAME`

Objective describes the analytical purpose. It does not authorize KRYLO to produce an
investment recommendation, score, or verdict. Per CLAUDE.md §21, objective never gates
presentation of substantiated structure.

---

## 6. Entity Resolution

Only after subject selection and lock:

```
Selected subject → entity resolution
```

Possible results: `RESOLVED` · `UNRESOLVED` · `AMBIGUOUS` · `NONE`.

`NAMED_UNVERIFIED` (KRYL-1237) maps to the contract surface as `UNRESOLVED`.

---

## 7. Mentions

All other recognized entities are mentions unless the selection rules establish them as the
subject. A mention may be `CONTEXT`, `COMPARISON`, or `OTHER`.

A mention being highly resolvable does not make it the subject.

---

## 8. Authority and Lifecycle

There is one authoritative Query Contract per submitted analysis.

`createSession()` creates it from the original analysis input. On reload, it may be
reconstructed from that persisted input.

No downstream component independently determines subject identity. All subject-dependent
consumers read the contract, including:

- Target Packet
- Structural Brief
- MAP subject node
- packet header
- Formation binding
- narrative/recon payloads
- other subject-dependent analysis surfaces

`subjectScope()` cannot remain an independent subject authority.

---

## 9. Production Regression Cases

These demonstrate the capability but do not define it.

**Subcritical Systems**
Question: "Is this a good investment?"
Target content identifies Subcritical Systems and contains contextual references to SpaceX.

```
SUBJECT     = Subcritical Systems
OBJECTIVE   = INVESTMENT
ATTRIBUTION = UNRESOLVED
SpaceX      = CONTEXT
```

**Daytona**
Question: "Is this a good investment?"
Target content identifies Daytona and contains contextual references to Meta.

```
SUBJECT     = Daytona
OBJECTIVE   = INVESTMENT
ATTRIBUTION = UNRESOLVED
Meta        = CONTEXT
```

The invariant demonstrated by both: **a contextual entity cannot displace the selected
subject.**

---

## 10. Preserved Behavior

Existing valid behaviors must remain unchanged, including:

- explicit named subjects;
- single-entity queries;
- named-but-unresolved subjects;
- decision-frame queries with no subject;
- existing `subjectscope` / `analysisintent` QA coverage.

---

## 11. Reachability

The capability is not complete from unit tests alone. Acceptance must traverse the real path:

```
User submission → Query Contract → downstream consumers → guest-facing output
```

The original Subcritical and Daytona failures must pass through the running application.
Other paths that construct sessions must also be checked for contract consistency.

---

## 12. Non-Goals

This specification does not change: entity resolution itself; normalization; entity registry;
Formation; relationship admission; evidence attribution; domain measures; MAP layout;
investment recommendation/scoring.

No LLM is required. If an LLM is evaluated later, it must operate inside the selection stage
and produce the same contract with the same invariants. It does not become the architecture.

---

## 13. Completion Criterion

The capability is complete when KRYLO can reliably:

1. select the intended subject;
2. select the objective;
3. lock both into one Query Contract;
4. resolve the selected subject without replacing it;
5. classify other entities as mentions;
6. carry the same contract through every downstream surface;
7. withhold rather than substitute when subject resolution fails.

The two historical failures are regression tests for this general capability — not the scope
of the capability.

---
---

## Appendix A — Current state (evidence, traced at `343d104`)

### A.1 Where the subject is decided today

`src/engine/subjectscope.js` `subjectScope()` L64–90. `nameCandidates()` (L36–57) collects every
Title-Case and quoted span anywhere in the input, plus every 1–4-word window of each. Each
window goes to `resolve()` (`entityresolution.js:192`: exact match, then Jaccard ≥ 0.85 against
the 59-entry `entityregistry.json`). The highest-confidence match becomes the subject.

Position, grammar, referents, and target content are never consulted. **KRYLO does not select
a subject today; it selects the best registry-matching name and calls that the subject.**

### A.2 Reproduction (Node probe)

| Input | `subjectScope()` |
|---|---|
| Subcritical text, truncated before any SpaceX reference | `UNRESOLVED` |
| Same + "…with former SpaceX engineers on the team." *(reconstructed)* | `ENTITY SPACEX` (matchedOn "SpaceX", 1.0) |
| "Is Daytona a good investment? Meta" *(reconstructed)* | `ENTITY META PLATFORMS` (matchedOn "Meta", 1.0) |

`normalize('Subcritical Systems')` → `SUBCRITICAL` (suffix stripped), so it has no registry match.

### A.3 Objective today

`buildAnalysisIntent()` (`analysisintent.js:178`) returns `subject` and `objective`, but
`subject` is just `subjectScope()` (L198, L205), so selection and resolution are one call.
`objective` resolves only on `decisionCues` / `scenarioCues`. `DECISION_CUE_VERBS`
(`querycontext.js:76`) matches `invest(?:s|d|ed|ing|e)?` with `\b`, so "investment" does not
match: "Is … a good investment?" → `objective: unresolved`.

### A.4 Authority today — five independent re-derivations

`useanalysisstore.js` `createSession()` (L44–50) is already the single build point for
`queryContext` (KRYL-1221) and ensures `tensor.analysisIntent` on every creation path. Consumers
bypass it and call `subjectScope()` directly:

| Consumer | Line |
|---|---|
| `components/analysis/targetpacket.jsx` (also feeds `assembleReconnPayload` L435, `assembleNarrative` L443) | 397 |
| `components/analysis/structurepanel.jsx` (MAP) | 88 |
| `engine/briefcontext.js` | 18 |
| `components/analysis/analysisidlefield.jsx` | 579 |
| `components/analysis/domainsubstratetabs.jsx` | 300 |

Pre-submit preview (not a contract consumer): `analysisidlefield.jsx:872`.
Two `analysisIntent` producers: `analysisidlefield.jsx:1265` and `useanalysisstore.js:50`.

### A.5 KRYL-1237

`targetpacket.jsx:631, 669` read `verification === 'NAMED_UNVERIFIED'`. `subjectScope()` at
`343d104` never produces it. Whether KRYL-1237 was built and removed, or never built:
UNCONFIRMED. §6 maps it to `UNRESOLVED` either way.

### A.6 Evidence classification

| Capability | Maturity | Verification | Verdict |
|---|---|---|---|
| Subject selection | D | R | NOT BUILT |
| Entity resolution of a name | A | R | BUILT |
| Objective selection | B | R | UNCONFIRMED (incomplete coverage) |
| Locked Query Contract | B | R | NOT BUILT as a lock |

R = static trace plus Node probe. Not yet observed in the running app.

---

## Appendix B — Items the build ticket must define

These are implementation definitions, not changes to §1–§13.

1. **Submission shape.** §3 requires selection over "question + supplied target/content". At
   `343d104` the idle field submits one textarea (`analysisidlefield.jsx:1239`, `flushedQuery`).
   How question and target content are distinguished (separate fields, or segmentation of
   one input) must be stated, and checked against `main`.
2. **Evidence precedence order.** §3 lists five kinds of subject evidence and says "strongest".
   The ticket must give the deterministic order and the rule ID recorded in `selectionRule`
   for each.
3. **Context positions.** Which syntactic positions make an entity a `CONTEXT` mention
   (KRYL-1237 §2 rule 2 is the existing precedent: `led by`, `backed by`, `former … at`, etc.).
4. **Objective vocabulary.** Noun forms (`investment`, `acquisition`) and the mapping to the §2
   enum values. Precedent for the class of fix: `SPEC-subject-scoping-contract.md` §3a.
5. **Comparison queries.** When a mention is `COMPARISON` versus a competing subject
   (`AMBIGUOUS`), and how this relates to the existing `deriveRCmp()` (`analysisintent.js`).
6. **`subjectScope()` fate.** Becomes the internal implementation of selection plus resolution
   behind the contract, or is retired. Either way, §8 holds.
7. **Full regression texts.** The exact question and target content for both §9 cases.
