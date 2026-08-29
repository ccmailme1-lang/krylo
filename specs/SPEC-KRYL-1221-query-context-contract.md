# KRYL-1221 — Query Context Contract

**Title:** Query context parsed repeatedly per-surface instead of established once at intake
**Type:** Contract-establishing (architecture)
**Labels:** NEEDS-SPEC, architecture
**Assignee:** Mr. XS
**Status:** Spec complete — ready for implementation planning. No code started.
**Baseline for equivalence:** `15a1d5a` / `baseline_targetpacket_kryl1218_20260828`

---

## 0. The one constraint that governs everything

> **Query Context is an intake artifact, not a second analytical engine.**
>
> It does not determine what is true. It tells the rest of KRYLO **what the user
> actually submitted**, in normalized deterministic form.

Every design decision below serves that line. If a proposed field or behavior
would let Query Context resolve a domain, weigh evidence, or influence a
formation, it is out of contract.

---

## 1. Intent

Establish a single, deterministic **Query Context** object at session bootstrap.

Today the same raw query is re-parsed (or fragment-parsed) independently by
`synthesizeQuery`/`detectDomain`, `parseIntent` (called from `ingestionbuilder`
and `analysisidlefield`), `routeLens`, the Oracle/Happy Path surface, and
`getDisplayEntity`. `resolveGeo` runs at intake but its result is discarded
unless it blocks the disambiguation gate. This produces duplicated logic,
inconsistent extractions, and cross-surface contradictions.

The contract replaces repeated per-surface parsing with one authoritative,
immutable Query Context created once at intake and consumed everywhere.

---

## 2. Load-bearing authority boundary (non-negotiable)

| Concern | Authority |
|---|---|
| Raw submitted query | Session intake |
| Geographic extraction | **Query Context** |
| Numeric extraction | **Query Context** |
| Intent characteristics | **Query Context** |
| Asset / entity class | **Query Context** |
| Decision cues | **Query Context** |
| Domain classification | Truth Engine |
| Live domain signal | Truth Engine |
| Evidence | Truth Engine |
| Relationships | Truth Engine |
| Formation | Truth Engine |
| Convergence | Truth Engine |
| Observation Affordance loop | Truth Engine |

```
QUERY → INTAKE / QUERY CONTEXT → SESSION → { UI consumers, Truth Engine, other views }
```

The Truth Engine reads `queryContext` as an input. It does not move into it.
Domain resolution, signal, evidence, relationships, formation, convergence stay
where they are — the `15a1d5a` architecture is preserved.

---

## 3. Canonical shape (contract)

```typescript
interface QueryContext {
  id:            string;              // stable identifier for this intake
  rawQuery:      string;              // original input, immutable
  geo:           Resolvable<GeoDescriptor>;
  intent:        IntentDescriptor;    // always present (see §4)
  numbers:       NumberDescriptor[];  // [] when none
  assetClass:    Resolvable<AssetClass>;
  decisionCues:  DecisionCue[];       // [] when none
  parseConfidence: number;            // 0–1, deterministic scoring only
  provenance: {
    parserVersion: string;
    parsedAt:      number;            // ms epoch
    source:        "intake";
  };
}

// Every optional field carries an explicit resolved / absent state —
// it never silently disappears and never manufactures a value.
type Resolvable<T> =
  | { state: "resolved"; value: T }
  | { state: "absent";  reason: string };   // e.g. "no location token in query",
                                             //      "ambiguity table does not cover this name"
```

All fields are deterministic functions of `rawQuery` + `parserVersion`. No
external calls, no evidence lookup, no formation influence, no randomness.

---

## 4. Field authority — which parser produces each

| field | producer | notes |
|---|---|---|
| `id`, `rawQuery`, `provenance` | intake (`handleSessionBootstrap`) | `rawQuery` is the post geo-gate text |
| `geo` | `resolveGeo` result when non-null → `resolved`; else `absent` with reason. `resolveGeo` is currently an **ambiguity detector against a static table**, not a general extractor — so unambiguous locations (e.g. "New York city") legitimately return `absent`. A real geo extractor is a **follow-on ticket**, not KRYL-1221. |
| `intent` | `parseIntent` (existing) — verb / entities / domains / ambiguity. Always present (empty query → `INVESTIGATE`, `ambiguity 1.0`). |
| `numbers` | `extractNumbers` (existing, exported) — normalized ("$2.5 million" → 2500000). `[]` when none. |
| `assetClass` | thin deterministic mapping over `intent.entities` + `intent.domains` + a fixed keyword set → `resolved` / `absent`. No new NLP/ML. |
| `decisionCues` | `intent.verb` + a fixed verb→cue set (buy / sell / lease / acquire / divest / refinance / purchase …). These are **surface language hits, not a resolved decision.** `[]` when none. |
| `parseConfidence` | deterministic aggregate of per-field confidences. |

**Absent is a first-class state.** A consumer reading an `absent` field must treat
it as "not established from the query", never as "absent therefore zero / default".

---

## 5. Lifecycle

```
USER QUERY
    ↓
handleSessionBootstrap
    ↓  (after the geo-disambiguation gate clears)
buildQueryContext(rawQuery, geo, now)   → frozen QueryContext
    ↓
createSession(..., queryContext)
    ↓
session.queryContext                     (read-only for the session lifetime)
    ↓
┌──────────────┬──────────────┬──────────────┐
│ UI consumers │ Truth Engine │ other views  │
└──────────────┴──────────────┴──────────────┘
```

- Created **exactly once**, at the intake boundary, before any surface or engine
  consumer runs.
- **Immutable** — `Object.freeze` (deep). Never mutated. A query edit produces a
  **new session**, not a mutation.
- After intake, consumers **read** `session.queryContext`. They do not
  independently reinterpret `rawQuery`.
- Serializable — appears in traces / debug payloads under the stable key
  `queryContext`.

---

## 6. Current state (grounded, 2026-08-28)

- `resolveGeo` (`georesolver.js`, "Phase A: static lookup table") called at
  `app.jsx:889`; result used only for the disambiguation gate, then discarded.
- `createSession` (`useanalysisstore`) stores raw query + lens only — no geo /
  intent / numbers / asset class.
- `synthesizeQuery` re-parses via `detectDomain` / `resolvePrimary` /
  `classifyCanonicalDomain`; calls `extractNumbers(query)` internally; never sees
  geo or `parseIntent`.
- `parseIntent` (`intentparser.js:105`) called independently from
  `ingestionbuilder.jsx:141`, `analysisidlefield.jsx:1095`.
- `routeLens` (`lensrouter.js:141`) and the Oracle/Happy Path surface each
  interpret the raw query again.
- Observed contradiction — *"Looking to purchase commercial unit in New York
  city"*: Analysis anchor `REAL ESTATE`; Happy Path domain `GENERAL`, BLUF "no
  geographic context detected".

---

## 7. Acceptance criteria

### Contract-level (always)

1. **Single establishment point.** Query Context is created exactly once, at
   intake, before any surface or engine consumer runs.
2. **Immutability.** Once created, never mutated; consumers get a deep-frozen
   reference.
3. **Determinism.** Identical `rawQuery` + identical `parserVersion` always
   yields an identical Query Context, including `parseConfidence`.
4. **Explicit resolved/absent.** Every optional field is `{state:"resolved",…}`
   or `{state:"absent", reason}`. Never silently missing, never a manufactured
   value.
5. **Boundary enforcement.** A static or runtime check prevents Query Context
   from acquiring any domain-resolution / signal / evidence / relationship /
   formation / convergence field.
6. **Observability.** Fully serializable; present in traces under key
   `queryContext`.

### Phase 1 boundary — successful only if ALL hold

1. `queryContext` is created at intake.
2. It is persisted on the session (`session.queryContext`).
3. The NYC test query produces the expected geographic context state (per §4 —
   for the current static resolver that is `geo: {state:"absent", reason:"…"}`;
   document it, do not treat it as a Phase-1 failure).
4. `intent` / `numbers` / `assetClass` / `decisionCues` populate per the contract.
5. Existing consumers remain **unchanged**.
6. Existing Truth Engine behavior remains **unchanged**.
7. Baseline behavior remains **equivalent to `15a1d5a`** — `synthesizeQuery`
   output byte-identical for a representative query set (Phase 1 converts no
   consumer, so this must hold trivially).
8. **No consumer migration occurs in Phase 1.**

Then Phase 1 stops.

---

## 8. Phasing

**Phase 1 — additive introduction**
- Implement `buildQueryContext` + construction at intake.
- Prove the object against the NYC query and other representative inputs.
- Emit alongside existing paths; zero consumer changes.
- Verify equivalence vs `15a1d5a`.

**Phase 2 — consumer migration (separate, atomic)**

Per consumer, in its own commit:

```
consumer → read session.queryContext → remove local parse → render test → commit
```

Order (each isolated): `synthesizeQuery` (numbers/intent/geo input only — domain
resolution logic untouched) → `parseIntent` callers → `routeLens` → Oracle/Happy
Path → `getDisplayEntity` sites. Repeat until no residual per-surface parser
remains. Residual parsers are deleted as their consumer migrates.

No multi-consumer change in a single commit.

---

## 9. Components

| file | change | phase |
|---|---|---|
| `src/engine/querycontext.js` (new) | `buildQueryContext({ rawQuery, geo, now })` — pure; assembles from `parseIntent`, `extractNumbers`, `resolveGeo` result, + the thin `assetClass` / `decisionCues` mappings. `QUERY_CONTEXT_VERSION`. `Object.freeze` (deep). Exported for tests. A guard (`assertNoEngineFields`) enforcing §7.5. | 1 |
| `src/app.jsx` | `handleSessionBootstrap` — after geo gate, build + pass `queryContext` to `createSession`. | 1 |
| `src/store/useanalysisstore.js` | `createSession` gains a `queryContext` slot; stored frozen on the session. | 1 |
| `src/components/analysis/ingestionbuilder.jsx`, `analysisidlefield.jsx` | build + pass `queryContext` at their `createSession` calls. | 1 |
| `qa_querycontext.mjs` (new) | Phase 1 proof — contract ACs + the NYC object + `$2.5 million`→2500000 carry + determinism + frozen. | 1 |
| consumer files (per §8) | one migration per commit. | 2 |

---

## 10. Validation

**Phase 1** (`qa_querycontext.mjs`):
- NYC query → `intent.verb` set, `decisionCues` contains a purchase cue,
  `assetClass` resolved to `COMMERCIAL_REAL_ESTATE`, `numbers` `[]`, `geo`
  `{state:"absent",reason}`, object frozen.
- `$2.5 million` query → `numbers` === `[2500000]` (guards KRYL-1218).
- Bare query (*"what should I do"*) → every optional field `{state:"absent"}` /
  `[]`; `intent` still present.
- Determinism — same input twice → deep-equal contexts incl. `parseConfidence`.
- Boundary guard rejects an object carrying a `domain` / `signal` / `formation` key.
- `synthesizeQuery` output byte-identical to `15a1d5a` for the representative set.

**Phase 2** (per consumer):
- Converted consumer's output unchanged vs its pre-conversion behavior for
  grounded cases.
- The specific contradiction that consumer caused is gone (e.g. after Oracle/Happy
  Path: NYC geography consistent across surfaces; domain routing no longer
  contradicts the anchor).
- `qa_kryl1218_*`, `qa_capital_flow`, `qa_extractnumbers` still pass.
- `vite build --mode development` clean.

---

## 11. Rollback

- **Phase 1:** `git revert` the single commit. `session.queryContext` becomes an
  unused field; no consumer reads it; zero runtime effect.
- **Phase 2:** each consumer conversion is its own commit — revert individually;
  the consumer falls back to re-parsing raw query (current behavior).
- No baseline retag until Phase 2 completes and the NYC contradiction is proven
  resolved.

---

## 12. Out of scope

- Any change to domain resolution, RESOLVE, formation, Observation Affordance, or
  ConeMap pipelines.
- A real geography extractor (follow-on ticket).
- Predictive or probabilistic enrichment of the context object.
- The analytical state machine (`STRUCTURE_INSUFFICIENT` / `FORMATION_CANDIDATE` /
  `FORMATION_ESTABLISHED`) — separate.
- Measurement / formation eligibility gates — KRYL-1220.
- Targeted re-observation replacing "refine your query" — KRYL-1202.
- Subject-scoped signal field — KRYL-1219.
- Any packet / UI change beyond surfacing the object in debug/trace views.
- Making `queryContext` mutable or re-derivable mid-session.
- New NLP / ML. Everything deterministic, regex/keyword level.
- Background session-creation paths (`app.jsx:1061`, `app.jsx:1154`) — Phase 1b.

---

## 13. Guidelines

- **One build point.** Only `handleSessionBootstrap` (and the two builder
  surfaces in Phase 1) construct `queryContext`. No surface builds its own.
- **Additive first.** Phase 1 writes only the new field; converts nothing.
- **Immutable.** Deep `Object.freeze` at `createSession`.
- **Honest absence.** Unresolvable → `{state:"absent", reason}` / `[]`. Never a
  default. Consumers treat absent as "not established".
- **Truth Engine boundary.** `queryContext` never holds domain resolution,
  signal, evidence, relationships, formation, or convergence. Enforced by guard.
- **Per-consumer commits in Phase 2**, each verified against the live render and
  `15a1d5a`.
- **No proxy, no fabrication** anywhere in extraction.


---

## Cross-cutting principles

This ticket is part of the Formation Guest Model — see `specs/SPEC-CROSSCUTTING-formation-guest-model.md`.

- **Provenance Boundary** — KRYLO shows where the evidence supports the read and where it stops.
- **Trusted Read → Early Action** — the read must be groundable enough that the guest decides whether to act; KRYLO never tells them to.
- **Layered, not dumbed down** — the guest view provides the read; inspection provides the reasoning. Three seconds means compressed evidence, not less intelligence.
