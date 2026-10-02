# SPEC — KRYL-1350: Formation-History Scrubber Reachability

**Status:** DRAFT — continue investigation; not implementation-ready.
**Date:** 2026-10-02 (revised)

## EXIT CRITERIA (hard stop — added 2026-10-02)

Complete when all four are true, test case = Sysco / Restaurant Depot:

1. **Real entry path confirmed** — a real named-entity query reaches the existing
   resolved-entity Formation path. **Confirmed** (Sysco, verified live in production).
2. **Formation-history write confirmed** — that real path creates at least one legitimate
   `formation_state` record for the entity's formation identity. **Required test:** Sysco →
   Restaurant Depot.
3. **Formation-history read confirmed** — `formationIdFor()` retrieves that same real formation
   identity and returns the persisted record.
4. **Scrubber renders it** — MAP displays the persisted real snapshot/history. No synthetic data,
   no ambient-signal substitution.

**If all four pass: KRYL-1350 COMPLETE. Stop.** If one fails, fix only the failing link. If
investigation surfaces another, unrelated architectural gap: document it and stop — it does not
expand this ticket's scope. No new tickets, no substrate redesign, no interpreter expansion, no
adjacent cleanup under this ticket. This ticket exists to make the real formation-history journey
work, once, for the known fact — not to fix every adjacent thing found along the way.

## PROBLEM

The current real-user path for the MAP's formation-history scrubber (KRYL-1334) has no verified
reachability — not merely "empty because no time has passed," but lacking a demonstrated path
that can ever populate history for a real named-entity query, on both the write side and the read
side.

**Traced chain (confirmed live, 2026-10-02):**

```
WRITE
raw query text
  → interpretStructuralQuery()        [structuralqueryinterpreter.js]
  → synthStructuralEntity()           [structuralentitysynthesis.js]
  → buildCandidateRows()              [formationsnapshot.js]
  → captureFormationSnapshots()       [formationsnapshotclient.js]
  → POST /v1/formation-state          [as-diff/engine.js]
  → formation_state table

READ
formation identity
  → formationIdFor()                  [structurepanel.jsx]
  → GET /v1/formation-state           [as-diff/engine.js]
  → scrubber renders                  [structure-field.html]
```

These are deliberately drawn as two separate chains, not one continuous path — whether and where
they actually converge on the same formation identity is itself unresolved (see Decision Gate,
below).

`interpretStructuralQuery()`'s `ENTITY_PATTERNS` extracts only a fixed list of generic
role-category words (`SUPPLIER`, `DISTRIBUTOR`, `FACILITY`, `COMPANY`, ...) via regex — never
real company names. Confirmed: the query *"What is the structural relationship between Sysco and
Restaurant Depot?"* extracts `entities: []`.

The write path therefore has no real named-entity entry point. The read path requires a formation
identity that is never established for a real named-entity query. The two paths fail to meet at a
reachable formation identity.

**Why this wasn't visible until now:** before KRYL-1341, `structuralentitysynthesis.js` matched
entities by text-substring against real evidence blobs — a role word like "supplier" could
coincidentally match evidence text and produce a false-but-functioning `SUPPORTED` result, which
*did* reach the write path. KRYL-1341 correctly retired that fabrication (role words are honestly
`UNRESOLVED` now — they are not real entities and were never checkable). That fix was correct.
Its side effect, undetected until now, was removing the scrubber's only observed (if semantically
invalid) reachability. Real company-name queries were never reachable through this chain either
before or after KRYL-1341.

## Two architectural facts that constrain the solution

1. **Write-side and read-side failures are linked through formation identity, but not through a
   single shared broken module.** Fixing only the read side (e.g. pointing the scrubber at the
   already-correct `isEntity`/canonical-ρ lookup used by `structuralbrief.jsx`) would let the
   scrubber show the *current* relationship state, but nothing would ever write a second snapshot
   over time — a scrubber that shows one static point forever is not a real fix for a *history*
   feature.
2. **`structuralqueryinterpreter.js`'s role-word-only scope is declared, not accidental.** Its own
   header states: *"This is NOT a domain classifier and NOT an entity resolver... investigated
   before writing."* Extending it to also resolve real company names changes a documented,
   intentional architectural boundary — not a simple additive extension.

## SOLUTION (draft — two options, neither implemented)

**Option A — extend the interpreter's extraction.** Add real entity-name recognition (reusing
`entityresolution.js`'s `resolveAny()`, the same mechanism `subjectscope.js` already uses) to
`interpretStructuralQuery()`, additively alongside the existing role-word regex list, so a query
naming real companies produces real `entities`. This would feed the already-correct,
already-working downstream write pipeline (`synthStructuralEntity` → `buildCandidateRows` →
`captureFormationSnapshots` → write).
- **Proven so far:** repairs the write-side entry point.
- **Unproven:** whether the entities produced by this change are the exact inputs
  `structurepanel.jsx` uses to construct `formationIdFor()`. Until a concrete continuity trace is
  performed, Option A cannot be claimed to repair the read side.
- **Risk:** changes a file whose header explicitly scopes it away from entity resolution. Needs
  an explicit ruling on whether that boundary should move, or whether real-name extraction
  belongs in a new, separate module that *feeds* `interpretStructuralQuery()`'s output rather
  than modifying it directly.

**Option B — a second write/read trigger for the canonical-ρ/isEntity case.** Build a parallel
capture path: when a single resolved entity subject (`subjScope.kind === 'ENTITY'`) has real
canonical-ρ relationships, write formation_state snapshots for those directly (bypassing
`interpretStructuralQuery()`/`synthStructuralEntity()` entirely for this case), and read them the
same way.
- **Unresolved (blocking):** what is the resulting formation identity? The entity alone, entity +
  relationship type, entity + counterpart, the entire canonical relationship set, or something
  else? This must be traced against the existing `formationIdFor()` contract before Option B can
  be considered a legitimate alternative. The comparison-granularity key was not designed with a
  second producer in mind.

**No recommendation locked in.** Both options carry real tradeoffs. A concrete end-to-end identity
continuity trace is required before either can be selected.

## Decision Gate (required before choosing A or B)

Produce one concrete trace classified at every arrow:

```
REAL USER QUERY
  ↓
entity resolution
  ↓
canonical entity identity
  ↓
formation identity
  ↓
formation_state write
  ↓
formation identity used by read
  ↓
formation_state read
  ↓
MAP scrubber
```

Classify each arrow: **Confirmed / Contradicted / Unresolved**. Only after this chain is fully
classified may Option A or Option B be advanced to implementation-ready status.

## COMPONENTS (touched if Option A; TBD if Option B)

- `src/engine/structuralqueryinterpreter.js` — entity extraction (Option A only)
- `src/engine/structuralentitysynthesis.js` — unchanged either way (already correct)
- `src/engine/formationsnapshot.js` / `formationsnapshotclient.js` — unchanged either way
  (already correct)
- `as-diff/engine.js` — unchanged (write/read endpoints already correct)
- `src/components/analysis/structurepanel.jsx` — unchanged either way (already correct trigger
  logic, just never fed real entities)

## VALIDATION

Golden Journey C (per `feedback_reachability_gate_sop.md`, memory): real entity query → canonical
entity resolved → formation identity computed → `formation_state` write succeeds → a second real
query later → `formation_state` read returns ≥1 row → scrubber renders real history, not the
disabled/no-history state. Must pass with the real Sysco/Restaurant Depot fact as the concrete
test case, not a synthetic fixture. Full Reachability Gate applies.

## ROLLBACK

Both options are additive (new extraction logic, or a new parallel write/read path) — neither
requires touching canonical ρ's own ratified identity contract or the already-shipped Stage 1
work (KRYL-1339–1343/1347/1348). Revertible by removing the new code path with no effect on
anything already shipped.

## GUIDELINES

- Do not reintroduce text-substring fabrication under either option — every write must trace to a
  real, admitted canonical-ρ relationship or a real resolved entity pair, never a coincidental
  text match.
- Do not touch canonical ρ's identity contract (ratified, `nodeId()`-based, confirmed in
  KRYL-1342).
- Full Reachability Gate applies (this is a substrate/interpretation-layer change) — golden
  journey required before close, not just regression-suite pass.
