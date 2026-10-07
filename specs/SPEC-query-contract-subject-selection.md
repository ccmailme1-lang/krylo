# SPEC — Query Contract: Subject Selection Precedes Entity Resolution

**Status:** DRAFT, 2026-10-07. Not authorized for build. No Jira ticket assigned.
**Classification:** §2 Class **E** (actual capability gap). Spec first, no code.
**Traced against:** commit `343d104` (2026-10-06). Line references are from that commit and
must be re-checked against current `main` before build.
**Related, unchanged by this spec:**
`specs/def-subject-resolution-admits-subject-not-in-query-20261006.md` (defect draft — not
modified), `SPEC-subject-scoping-contract.md`, `SPEC-named-unverified-subject.md` (KRYL-1237),
`SPEC-KRYL-1221-query-context-contract.md`, `request-subject-scope-survives-analytical-queries.md`.

---

## 1. The architectural correction

```
SUBJECT SELECTION  = What is the user asking about?
ENTITY RESOLUTION  = Which known entity corresponds to that subject?
```

These are two stages. Today KRYLO runs only the second and reports its output as the first:

> **KRYLO does not currently select a subject. It selects the best registry-matching name in
> the query and calls that the subject.**

Required order:

```
RAW QUERY
  → SUBJECT SELECTION        what is the query about (text span, no registry)
  → OBJECTIVE SELECTION      what the user wants to know about it
  → ENTITY RESOLUTION        resolve the selected subject only
  → LOCK QUERY CONTRACT      once, at session creation
  → EVIDENCE → DOMAIN ANALYSIS → RELATIONSHIPS → FORMATION
```

Forbidden inference (the failure class this spec closes):

```
Subcritical Systems → unresolved
SpaceX              → recognizable
therefore SUBJECT = SpaceX                  ✗
```

---

## 2. Evidence — current implementation (traced 2026-10-07)

### 2.1 Where the subject is decided today

`src/engine/subjectscope.js` `subjectScope()` L64–90:

1. `nameCandidates()` (L36–57) collects every Title-Case span and quoted span **anywhere in the
   query**, then every 1–4-word window of each span.
2. Each window goes to `resolve()` (`entityresolution.js:192`, exact match, then Jaccard ≥ 0.85
   against the 59-entry `entityregistry.json`).
3. The highest-confidence match becomes `{ kind: 'ENTITY' }` (L71–90).

Position, syntax, and grammatical role are never consulted. A name the registry cannot
resolve is silently dropped; any other resolvable name in the text wins.

### 2.2 Reproduction (Node, against `343d104`)

| Input | `subjectScope()` result |
|---|---|
| Subcritical query, truncated at "Khosla leads the" | `UNRESOLVED` |
| Same + "…with former SpaceX engineers on the team." *(reconstructed ending)* | `ENTITY SPACEX`, matchedOn "SpaceX", 1.0 |
| "Is Subcritical Systems a good investment? Capital, Nuclear" | `UNRESOLVED` |
| "Is Daytona a good investment? Meta" *(reconstructed; original text not recorded)* | `ENTITY META PLATFORMS`, matchedOn "Meta", 1.0 |

`normalize('Subcritical Systems')` → `SUBCRITICAL` (suffix `SYSTEMS` stripped): no registry match.

### 2.3 Objective today

`buildAnalysisIntent()` (`analysisintent.js:178`) already returns `subject` and `objective`:

- `subject` = `subjectScope(queryContext)` (L198, L205). Selection and resolution are one call.
- `objective` resolves only on `queryContext.decisionCues` or `scenarioCues` (L213–217).
  `DECISION_CUE_VERBS` (`querycontext.js:76`) matches `invest(?:s|d|ed|ing|e)?` with `\b`, so
  **"investment" does not match**. "Is Subcritical Systems a good investment?" →
  `objective: unresolved`. Same failure class as the documented "acquisition" miss
  (`SPEC-subject-scoping-contract.md` §3a).

### 2.4 No lock — five independent re-derivations

`useanalysisstore.js` `createSession()` (L44–50) is already the single build point for
`queryContext` and guarantees `tensor.analysisIntent` on every session-creation path. But
downstream consumers do not read it. Each calls `subjectScope()` itself:

| Consumer | Line | Input |
|---|---|---|
| `components/analysis/targetpacket.jsx` | 397 | `session.queryContext ?? session.query` |
| `components/analysis/structurepanel.jsx` | 88 | `query` (string) |
| `engine/briefcontext.js` | 18 | `session.queryContext ?? session.query` |
| `components/analysis/analysisidlefield.jsx` | 579 | `activeSession.queryContext ?? activeSession.query` |
| `components/analysis/domainsubstratetabs.jsx` | 300 | `subject` object if passed, else `subjectScope(subject)` |

Pre-submit (draft, not a consumer of a locked contract): `analysisidlefield.jsx:872` (chip
preview), `analysisintent.js:198` (the producer itself).

Two producers of `analysisIntent`: `analysisidlefield.jsx:1265` (idle-field submit) and
`useanalysisstore.js:50` (every other creation path). Both call the same function, so they
agree today, but there is no single owner.

### 2.5 KRYL-1237 state

`targetpacket.jsx:631, 669` read `subjScope.verification === 'NAMED_UNVERIFIED'`.
`subjectscope.js` at `343d104` contains no `NAMED_UNVERIFIED` branch. Whether KRYL-1237 was
built and later removed, or never built: **UNCONFIRMED**. The consumer branch is currently
unreachable.

### 2.6 Evidence classification

| Capability | Maturity | Verification | Verdict |
|---|---|---|---|
| Subject selection (distinct from resolution) | D | R | NOT BUILT (lexical, concept, behavioral all NO) |
| Entity resolution of a name | A | R | BUILT (`resolve()`) |
| Objective selection | B | R | UNCONFIRMED — exists, incomplete coverage |
| Locked Query Contract | B | R | NOT BUILT as a lock — shape exists (`analysisIntent`), five consumers bypass it |

R = static trace plus Node probe. Not yet observed in the live app (see §9).

---

## 3. The Query Contract

Built once per session, immutable after creation.

```
QueryContract {
  version:     'qc-1'
  rawQuery:    string                       // verbatim, untrimmed

  subject: {
    state:     'SELECTED' | 'AMBIGUOUS' | 'NONE'
    text:      string | null                // as written in the query
    span:      [start, end] | null          // character offsets into rawQuery
    selectedBy: <rule id from §4.2> | null
    kind:      'NAMED' | 'GEO' | 'DECISION_FRAME' | 'PORTFOLIO_FRAME'
               | 'MARKET_THEME' | 'DECISION_SITUATION' | null
    candidates: [{ text, span }]            // populated only when AMBIGUOUS
  }

  attribution: {                            // entity resolution of subject.text ONLY
    state:       'RESOLVED' | 'UNRESOLVED' | 'NOT_APPLICABLE'
    canonicalId: string | null
    entity:      { canonicalId, name, identifiers, domainTags } | null
    confidence:  number | null
    reason:      string | null              // for UNRESOLVED / NOT_APPLICABLE
  }

  objective: {
    state:       'SELECTED' | 'NONE'
    class:       'DECISION_CONTEXT' | 'SCENARIO' | 'STRUCTURAL_READ' | null
    decisionType: 'INVESTMENT' | 'ACQUISITION' | 'DIVESTITURE' | 'HIRING' | 'EXPANSION'
                 | 'OTHER' | null
    delivers:    'STRUCTURAL_CONDITIONS'    // constant, see §5
    cues:        string[]                   // the matched words, verbatim
  }

  mentions: [{
    text, span,
    attribution: { state, canonicalId, confidence }
    role: 'CONTEXT'                         // never 'SUBJECT'
  }]
}
```

`subject` and `attribution` are separate fields so an unresolved subject is reported as
itself, never replaced:

```
SUBJECT:            Subcritical Systems
ENTITY ATTRIBUTION: UNRESOLVED
```

---

## 4. Subject selection

### 4.1 Invariants

1. Subject selection never reads the entity registry. Whether a name is resolvable cannot
   influence whether it is the subject.
2. **Explicit subject precedence.** If the query explicitly identifies a subject, every other
   named span is a mention, never a competing subject.
3. A mention is never promoted to subject: not at selection, not at resolution, not
   downstream.
4. Two or more explicit subjects that no rule distinguishes → `AMBIGUOUS` with `candidates`.
   No silent pick. *(Precedent: KRYL-1237 §2 rule 4.)*

### 4.2 Selection rules (deterministic, evaluated in order, first match wins)

Each rule's precedent is named. A rule with no precedent is marked **[FOUNDER RULING]**.

| ID | Rule | Example | Precedent |
|---|---|---|---|
| S1 | Question-stem subject: `(Is\|Are\|Should\|Would\|Can\|Does) <Name> (a\|an\|the)? …` | "Is Subcritical Systems a good investment?" → Subcritical Systems | `subjectscope.js` TRIM_WORDS stem handling; `SPEC-subject-scoping-contract.md` §3a (Anduril) |
| S2 | Declarative subject position: `<Name> (is raising\|is a\|has\|is building\|announced\|…)` at sentence start | "Oriole Networks is raising…"; "Subcritical Systems has an NRC-confirmed path…" | KRYL-1237 §2 rule 1 (explicit-subject positions) |
| S3 | Leading title: the query begins with a named span, optionally repeated (`<Name> <Name> …`), before the first sentence | "Subcritical Systems Subcritical Systems has…" | **[FOUNDER RULING]** — pasted headline/title convention; observed in the live Subcritical query, no codebase precedent |
| S4 | Object-of-inquiry: `(about\|on\|into\|invest in\|evaluate\|analyze) <Name>` | "Tell me about Daytona" | KRYL-1237 §2 rule 1 (`invest in <Name>`) |
| S5 | Bare name: after stem/filler trim, the whole query is one named span | "Anduril" | `nameCandidates()` bare-query path (L54–55) |
| S6 | No named subject: fall through to the existing non-entity kinds — resolved geo, decision frame, `classifyFrame()` | "should we open a second facility" | `subjectScope()` steps 2–4, unchanged |

**Context positions — never subject** (KRYL-1237 §2 rule 2, reused verbatim):
`led by` · `participation from` · `backed by` · `alongside` · `ex-` / `former … (at|of)` ·
`advisor(s)` · `partner … `. Spans in these positions go straight to `mentions[]`.

**Open [FOUNDER RULING] items for §4.2:**

- **Q1 — S3 leading title.** Adopt as a rule? Without it, the Subcritical query still selects
  Subcritical Systems via S2 ("Subcritical Systems has…"), so S3 is not required for that
  regression case. It matters for pasted headlines with no verb.
- **Q2 — single unpositioned name.** A query with exactly one named span that matches no
  S1–S5 position (e.g. "nuclear permitting exposure for Subcritical Systems"). Option A:
  subject `NONE`, name to `mentions[]` (strict). Option B: select it (rule S7, "sole named
  span"). No precedent for either.
- **Q3 — comparisons.** "X vs Y" currently resolves through `deriveRCmp()`
  (`analysisintent.js`, `subject_a` / `subject_b`). Is a comparison one contract with two
  subjects, or `AMBIGUOUS`? This spec treats it as out of scope and leaves `rCmp` unchanged.

### 4.3 Entity resolution after selection

- `resolve()` runs on `subject.text` only, never on a mention, to fill `attribution`.
- Mentions are resolved separately into `mentions[].attribution`. Their result never touches
  `subject` or `attribution`.
- `resolve()`, `normalize()`, and `entityregistry.json` are unchanged by this spec.
- Whether an unresolved explicit subject is scopable (KRYL-1237 `NAMED_UNVERIFIED`) is a
  downstream consumer question. This spec only guarantees the subject is preserved and
  labelled `UNRESOLVED`. Integrating KRYL-1237 needs a separate decision (§2.5).

---

## 5. Objective selection

**Rule:** objective is selected from the query's own words, independently of subject.

| Query shape | Objective |
|---|---|
| "Is X a good investment?" / "invest in X" / "investment" | `DECISION_CONTEXT`, `decisionType: INVESTMENT` |
| "acquisition target" / "acquire X" | `DECISION_CONTEXT`, `decisionType: ACQUISITION` |
| scenario structure (existing `scenarioCues`) | `SCENARIO` |
| no decision or scenario words | `STRUCTURAL_READ` |

`delivers` is always `STRUCTURAL_CONDITIONS`. Per §21 (Formation Is Not a Verdict):

- The objective tells KRYLO **which structure is relevant to the user's question**. It never
  instructs KRYLO to produce a recommendation, verdict, score, or "good/bad" judgment.
- The objective **never gates presentation**. A query with `objective.state: NONE` receives the
  same structural presentation as one with an objective. Acceptance test: *if a qualifying
  structural formation exists, can the guest see it without supplying a decision?* Must be yes.
- Cue coverage gap: `DECISION_CUE_VERBS` must match noun forms (`investment`, `acquisition`,
  `divestiture`, `expansion`). The exact vocabulary is part of the build ticket. Precedent for
  the class of fix: `SPEC-subject-scoping-contract.md` §3a (`acquir` → `acquir|acquisition`).

---

## 6. Single authoritative contract

1. **One producer.** `createSession()` (`useanalysisstore.js`, already the single build point
   for `queryContext`, KRYL-1221) builds `session.queryContract` once. The idle-field submit
   path (`analysisidlefield.jsx:1265`) stops building its own and relies on `createSession()`.
2. **Immutable.** No consumer writes to, recomputes, or overrides `session.queryContract`.
3. **Every consumer reads it.** The five call sites in §2.4 replace `subjectScope(...)` with a
   read of `session.queryContract`. The adapter from contract to the existing
   `{ kind, canonicalId, entity, … }` shape that consumers expect is one shared function, not
   five inline conversions.
4. **Pre-submit preview is not a consumer.** `analysisidlefield.jsx:872` (chip preview, before
   a session exists) may call the selection function directly. It never writes to a session.
5. **`subjectScope()` fate.** After migration, `subjectScope()` either becomes the internal
   implementation of contract building or is retired. It does not remain a second public
   subject authority. **[FOUNDER RULING Q4]**
6. **Legacy sessions.** Sessions persisted before this change have no `queryContract`.
   **[FOUNDER RULING Q5]**: build it once on load through the same producer, or show those
   sessions as `subject: NONE / reason: pre-contract session`. A per-consumer fallback to
   `subjectScope()` is not allowed (it would recreate the parallel authority, §2 hard stop).

---

## 7. Regression cases (acceptance)

Each case runs against the contract builder and against at least one live consumer
(`targetpacket.jsx` or `structurepanel.jsx`).

| # | Query | subject.text | attribution | mentions | objective |
|---|---|---|---|---|---|
| R1 | Full Subcritical query naming SpaceX later in the text *(exact text required from Founder; the recorded draft is truncated)* | Subcritical Systems | UNRESOLVED | SpaceX (RESOLVED, CONTEXT), Khosla | STRUCTURAL_READ or DECISION_CONTEXT per cues |
| R2 | "Is Subcritical Systems a good investment? Capital, Nuclear" | Subcritical Systems | UNRESOLVED | — | DECISION_CONTEXT / INVESTMENT |
| R3 | "Subcritical Systems has an NRC-confirmed path to meltdown-proof nuclear plants." | Subcritical Systems | UNRESOLVED | — | STRUCTURAL_READ |
| R4 | "…with former SpaceX engineers on the team." appended to R3 | Subcritical Systems | UNRESOLVED | SpaceX, role CONTEXT | STRUCTURAL_READ |
| R5 | Daytona/Meta query *(exact text required; reconstructed: "Is Daytona a good investment? Meta")* | Daytona | UNRESOLVED | Meta (RESOLVED, CONTEXT) | DECISION_CONTEXT / INVESTMENT |
| R6 | Invariant across R1–R5: no downstream surface (packet header, Structural Brief, MAP subject node, Formation binding) shows SPACEX or META PLATFORMS as the subject | — | — | — | — |

**Preserved behavior (must not regress):**

| # | Query | Expected |
|---|---|---|
| P1 | "Is Anduril a good acquisition target?" | subject Anduril, RESOLVED; objective ACQUISITION |
| P2 | "Anduril" | subject Anduril (S5), RESOLVED |
| P3 | Oriole fixture (`SPEC-named-unverified-subject.md`) | subject Oriole Networks (S2); Engine Ventures, Carbon Direct Capital, AMD are mentions |
| P4 | "should we open a second facility" | subject NONE → kind DECISION_FRAME (S6), unchanged |
| P5 | All existing `qa_*` harnesses touching `subjectscope` / `analysisintent` | green |

---

## 8. §2 Shared-change gate statement

- **Target:** subject determination for a submitted query.
- **Authoritative source (proposed):** `session.queryContract`, built once in `createSession()`.
- **Known writers:** `createSession()`; `analysisidlefield.jsx:1265` (to be removed as a writer).
- **Known consumers:** the five sites in §2.4, plus `assembleReconnPayload` and
  `assembleNarrative` via `targetpacket.jsx:435, 443` (they receive `subjScope`).
  A repo-wide grep for `subjScope`, `subjectScope`, `analysisIntent.subject` and `.canonicalId`
  reads must be re-run against `main` before build.
- **Runtime path verified:** static trace plus Node probe, yes. Live app, no.
- **Defect class:** E (actual gap). Subject selection does not exist.
- **Minimal change:** add the selection stage; build the contract once; migrate consumers to
  read it. Resolution, registry, formation, and evidence binding untouched.
- **Acceptance test:** §7.

---

## 9. Reachability (Full Gate — this changes subject identity)

Real user input: search-box submit in the ANALYSIS idle field → `createSession()` →
`session.queryContract` → `targetpacket.jsx` / `structurepanel.jsx` (MAP subject node,
Structural Brief). The build must show R1, R2 and R5 entered through that box on a running
build, with the packet header, Structural Brief and MAP all naming the selected subject. A
passing unit harness alone does not close this ticket.

Other creation paths that reach `createSession()` (history re-run, cone assignment, ingestion,
brief re-run — per the `useanalysisstore.js` L45–48 comment) each need one traced run.

---

## 10. Non-goals

- No LLM in this spec. If one is evaluated later, it may only implement §4.2 rule matching and
  must emit the same contract shape, with the same invariants. It is not the architecture.
- No change to `resolve()`, `normalize()`, `entityregistry.json`, or runtime entity admission.
- No change to Formation, relationships, domain measures, or evidence attribution.
- No change to the MAP layout work (separate handoff).
- No change to the existing defect draft. It is updated after this spec is accepted.
- No investment recommendation, score, or verdict of any kind (§21).

---

## 11. Founder rulings needed before build

| ID | Question | Section |
|---|---|---|
| Q1 | Adopt S3 (leading-title rule)? | §4.2 |
| Q2 | Single unpositioned name: strict (mention) or select (S7)? | §4.2 |
| Q3 | Comparisons: two-subject contract or AMBIGUOUS? (proposed: out of scope) | §4.2 |
| Q4 | `subjectScope()`: becomes the contract's internals, or retired? | §6 |
| Q5 | Legacy sessions: build contract on load, or mark pre-contract? | §6 |
| Q6 | Exact text of the original Subcritical and Daytona queries, for R1 and R5 | §7 |
| Q7 | KRYL-1237 `NAMED_UNVERIFIED`: integrate with `attribution: UNRESOLVED`, or keep separate? | §2.5, §4.3 |

Bottle Test status: **BLOCKED** until Q1, Q2 and Q6 are answered. Q2 decides how a whole class
of queries is handled. Q6 is needed to write the acceptance cases.
