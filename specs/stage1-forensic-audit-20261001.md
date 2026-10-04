# Stage 1 Forensic Audit — KRYL-1338 Effort

Every claim below is sourced to a direct file read performed in this pass (not a prior comment,
not a grep hit, not an inference). Where a prior claim is being re-verified, the file was
re-opened and re-read here, not recalled. Classification: **Confirmed / Contradicted /
Unresolved**, with file/line evidence for each.

---

## Chain trace: Evidence → producer → admission → canonical ρ → identity → persistence → projection → consumers → UI/API

### Evidence → Producer (3 real producers)

| Producer | File | Status |
|---|---|---|
| SEC 13D/13G | `secownershipconnector.js` | **Confirmed live.** Two real dispatch paths exist in this one file, not previously distinguished: `runSecOwnershipSync()` dispatches directly via `surfaceRouter.dispatchBatch()` on error (line ~94-96); `runTargetedOwnershipObservation()` goes through `admitAndDispatch()` (`evidenceadmissiongate.js`) instead. Both also independently call `registerOwnershipEdge()` and `makeRelationCore()`+`admissionengine.js`'s `admitCandidate()`. |
| Patent inventor migration | `patentsviewmigrationproducer.js` (fixture-only, confirmed not live — own header) + `patentsviewconnector.js` (confirmed live, calls `admissionengine.js`'s `admitCandidate()` directly, line 233) | **Confirmed two separate files**, one live one not, both real. |
| Sysco/Restaurant Depot | `rsievidencemigration.js` | **Confirmed**, one-off (`if (migrated) return`), calls both `registerTypedEdge()` and `makeRelationCore()`+`admitCandidate()`. |

### Admission layer — THREE unrelated systems confirmed, not two

1. **`admissionengine.js`'s `admitCandidate()`** — read in full this pass. Confirmed: never persists (returns `{decision, event}`, no storage call in the function body — this directly verifies, rather than repeats, `reconnpayload.js`'s comment about it). Consults `gate0policy.js`'s `GATE0_POLICY` (also read in full this pass): **two vocabularies** exist — `SRE_RELATIONCORE` (all 14 types `enabled: false`, confirmed verbatim match to `specs/SPEC-gate0-sre-dispositions.md`, which was read in full this pass, not inferred from the comment) and **`RKM_GENEALOGY`** (a *different* vocabulary, with `derivedFrom`/`dependsOn` `enabled: true`) — **confirmed dormant**: grepped for all usage, only `gate0policy.js` and `truthevent.js` (its own enum definition) reference it; zero real producers use it. Real confirmed callers of this function: `secownershipconnector.js`, `rsievidencemigration.js`, `patentsviewconnector.js` — three, re-confirmed this pass.
2. **`evidenceadmissiongate.js`'s own, separately-defined `admitCandidate()`** — read in full this pass. Unrelated naming collision, confirmed. Its own header states it is scoped **narrow**: "does NOT retrofit the ~30 existing connectors already flowing through surfaceRouter.dispatchBatch() directly." Its public export `admitAndDispatch()` has **one direct caller**: `secownershipconnector.js`. Correction to an earlier, grep-based claim in this same audit: a prior pass counted `observationorchestrator.js` as a direct caller based on a grep match against that file's *comments* (which describe where EAG admission happens) — a full read (below) shows it does not call `admitAndDispatch()` itself; it's one layer removed.

**`observationorchestrator.js` — traced in full.** KRYL-1204's request-lifecycle orchestrator (`REQUESTED → PLANNED → DISPATCHED → OBSERVING → RECEIVED → NORMALIZED → terminal state`). Exactly one registered capability (`CAPABILITY_REGISTRY`, line 75-86): `secownershipconnector` / `OWNERSHIP_FILING` — the same SEC case already ratified as `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE`. Imports only `runTargetedOwnershipObservation` from `secownershipconnector.js` (line 15) — nothing from `entitytopologyregistry.js` or `relationontology.js`. Not a fourth relational system; it's a thin orchestration layer over an already-traced path.

**Real, concrete finding from this trace**: `deriveTerminalState({admitted, matched, rejected})` (line 143-148) destructures exactly those three field names from `runTargetedOwnershipObservation()`'s return value (`{admitted, rejected, matched, total}`, confirmed against `secownershipconnector.js:230`). Whatever KRYL-1340/1341 do to that function's internals, **this return shape must be preserved** or `observationorchestrator.js` breaks silently — a real consumer contract not previously named in any ticket.
3. **Stage 1's new `canonicalrelationship.js`'s `admitRelationship()`** — built and tested this session, consults none of the above.

**Contradiction found, not previously stated**: a stale comment inside `evidenceadmissiongate.js` (lines 130-131) claims `domaingravity.js`'s pool "stores only `{confidence, polarity, ts}` per entry." Directly re-verified against `domaingravity.js`'s actual push (`:96-103`): it stores `{confidence, polarity, ts, source, signal}` plus optionally `canonicalId` — five to six fields, not three. This is a pre-existing inaccurate comment in the repository, unrelated to anything built tonight, but it is direct, first-hand proof that **comments in this codebase can be wrong** — the same caution applied to every claim in this audit.

### Canonical ρ (KRYL-1339) — Confirmed implemented and tested

`canonicalrelationship.js` + `ratifiedrelationshiptypes.js`, 23/23 checks pass (`qa_canonicalrelationship.mjs`, runnable directly). **Confirmed**: uses raw `nodeId()`-derived strings for `part` today, not `canonicalId` — KRYL-1342 is a required rewrite of this already-shipped code, not a parallel input.

### Identity — real, confirmed fragmentation beyond what was previously stated

Read `entitytopologyregistry.js` in full this pass (previously only fragments). New findings:
- **Two separate live stores**, not one: `entityTopologyRegistry` (flat, symmetric adjacency object — what `findPath()` actually traverses) and `TYPED_EDGES` (array of directed, typed edges). `registerTypedEdge()` writes to *both* simultaneously. KRYL-1340's "projection" must account for both, not just `TYPED_EDGES` — a scope gap not previously identified.
- **A self-documented v1/v2 identity split already exists**: plain uppercased names (`'NVIDIA'`) vs. CIK-prefixed keys (`'CIK:0001045810'`) coexist in the same flat registry, bridgeable only via an explicit `BRIDGES_TO` edge (`bridgeV1ToV2()`, which takes a resolver function as a parameter specifically to avoid a circular import with `entityresolution.js` — confirmed by the file's own comment, directly verified). KRYL-1342 (entity identity unification) inherits this pre-existing split; it is not creating a new problem, but its scope should explicitly include it.
- **Direction contradiction, confirmed, not previously found**: `registerOwnershipEdge()` (line 127-133) writes `from: filerName, to: subjectName` — **filer→subject**. The ratified `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE` type uses `part = [subjectId, filerId]` — **subject→filer**, the opposite order, per the explicit ratification instruction ("direction normalized to subject → filer"). `findPath()`'s `typeForHop()` (line 146-149) surfaces this direction to consumers as `FORWARD`/`REVERSE` — a real, consumer-visible value that would flip if KRYL-1340's projection naively maps canonical `ρ`'s `part` order onto `from`/`to`.
- **`supplychainconnector.js`'s usage resolved** (was unresolved in the prior pass — the earlier grep pattern missed it): confirmed reader, via bracket notation (`entityTopologyRegistry[entityId]`, line 131; `Object.keys(entityTopologyRegistry)`, line 40), not dot notation.

### Persistence

`formation_state` (Postgres) — re-confirmed end-to-end: `formationsnapshotclient.js` → `as-diff/engine.js:319-340` → `formationstatestore.js:12-16`. Real, live, the only durably persisted relational representation. `admissionengine.js`'s `admitCandidate()` and `canonicalrelationship.js`'s `admitRelationship()` both currently have **no** persistence path of their own, confirmed.

### Consumers — UI/API

- **MAP** (`structure-field.html`): confirmed, deliberately **not** a canonical-ρ consumer. `formationinference.js` imports none of the relational-authority files, re-confirmed.
- **Target Packet Relationship Coverage**: `targetpacket.jsx:27` → `assembleReconnPayload()` (`reconnpayload.js:185`) → `relationshipCoverage()` (`reconnpayload.js:191`, hardcoded `BLOCKED`, takes zero parameters) — full chain traced and confirmed this pass, not inferred.

---

## Final matrix

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | `admitCandidate()` (admissionengine.js) never persists | **Confirmed** | Full file read; function returns `{decision, event}`, no storage call |
| 2 | Gate-0 locks all 14 SRE types to Defer | **Confirmed** | `gate0policy.js` full read, verbatim match to `SPEC-gate0-sre-dispositions.md` full read |
| 3 | `RKM_GENEALOGY` vocabulary is dormant | **Confirmed** | Repo-wide grep: zero real callers, only its own definition sites |
| 4 | Three real callers of `admissionengine.js`'s `admitCandidate()` | **Confirmed** | `secownershipconnector.js`, `rsievidencemigration.js`, `patentsviewconnector.js:233` |
| 5 | `evidenceadmissiongate.js`'s `admitCandidate` is unrelated | **Confirmed** | Full file read; separate local function, narrow-scoped by its own header |
| 6 | `admitAndDispatch()` callers | **Corrected**: 1 direct caller (`secownershipconnector.js`); `observationorchestrator.js` is an indirect path via `runTargetedOwnershipObservation()`, now fully traced — not a 4th relational system, but it imposes a real return-shape contract (`{admitted, rejected, matched, total}`) on whatever rewrites that function |
| 7 | domaingravity pool stores only 3 fields | **Contradicted** | Comment says 3; `domaingravity.js:96-103` shows 5-6 fields |
| 8 | KRYL-1339 uses `canonicalId` for `part` | **Contradicted** | Actual shipped code uses raw `nodeId()` strings; KRYL-1342 must rewrite it |
| 9 | KRYL-1340 covers both `entityTopologyRegistry` and `TYPED_EDGES` | **Contradicted / scope gap** | Ticket only names `TYPED_EDGES`-adjacent consumers; `entityTopologyRegistry` is the actual structure `findPath()` reads |
| 10 | Ratified SEC type direction matches existing typed-edge direction | **Contradicted** | Ratification: subject→filer. `registerOwnershipEdge()`: filer→subject |
| 11 | `supplychainconnector.js` usage | **Resolved this pass** | Confirmed reader via bracket notation |
| 12 | KRYL-1341 still needs `TYPED_EDGES` after its own rewrite | **Unresolved** | Not stated either way in ticket text |
| 13 | KRYL-1340's `makeRelationCore`/`admitCandidate` scope | **Unresolved** | Not stated in ticket text |
| 14 | `observationorchestrator.js`'s role | **Unresolved** | Not traced in this or any prior pass |
| 15 | MAP is unaffected by any Stage 1 ticket | **Confirmed** | `formationinference.js` imports nothing relational-authority-related |
| 16 | Target Packet Relationship Coverage is the one real consumer | **Confirmed** | Full chain traced, `targetpacket.jsx:27` → `reconnpayload.js:185,191` |

---

## The brutal test

**If KRYL-1339–1348 land exactly as currently written:**

- **What changes**: the MAP's "RELATIONSHIPS" label is relit as co-occurrence (1343). `formation_state` eventually admits via canonical `ρ` instead of text-substring matching (1341, once its own open item is resolved). Target Packet's Relationship Coverage section stops being hardcoded `BLOCKED` (1347) — **this is the only confirmed user-visible change in the entire 10-ticket set.**
- **What does not change**: the MAP's rendered relationships (by design). The old Gate-0/SRE admission path (disposition undecided, 1348). The direction convention mismatch (not addressed by any ticket as written — found this pass).
- **Can every claimed change be traced through real code to the user?** For the one confirmed change (1347), yes, now that the full call chain is traced. For everything else claimed as "landing," **no — not yet**, because of the unresolved items above (12, 13, 14) and the newly-found contradiction (10), none of which are decided in any ticket's current text.

**Per your own stated bar: this was not airtight at first pass.** Three unresolved items and one direction contradiction needed explicit resolution before implementation proceeds on KRYL-1340/1341.

## Reconciliation (2026-10-01)

All 10 Jira tickets reconciled against this report. Six amended directly in their descriptions
(not just comments): **KRYL-1339** (blocking note on the direction contradiction, ratification
itself unchanged), **KRYL-1340** (both registry stores, explicit direction-transform
requirement, return-shape preservation, the `makeRelationCore`/`admitCandidate` decision point,
finalized consumer list), **KRYL-1341** (dependency corrected to KRYL-1339 only — the
`TYPED_EDGES` read dependency is removed by this ticket's own work, not inherited), **KRYL-1342**
(resequenced as a rewrite of already-shipped code; scope expanded to the pre-existing v1/v2
identity split), **KRYL-1347** (scope note on `assembleReconnPayload()`'s call site needing new
parameters), **KRYL-1348** (consolidated three comments into one corrected description:
3 real callers, `observationorchestrator.js` correctly reattributed to KRYL-1340, the
`SPEC-gate0-sre-dispositions.md` grounding). Four confirmed unaffected: KRYL-1343, 1344, 1345,
1346 — checked against every finding above, no contradiction or gap found.

One decision remained open after the first reconciliation pass: whether the legacy
`makeRelationCore()`/`admitCandidate()` construction calls are removed or retained. Resolved by
direct trace of all three real call sites (`secownershipconnector.js`, `rsievidencemigration.js`,
`patentsviewconnector.js:224-247`) — identical confirmed pattern in all three: the real write
(typed-edge registration / signal dispatch) happens unconditionally, before or independent of the
`makeRelationCore()`/`admitCandidate()` block; the block's result is discarded after an optional
log line; nothing downstream ever reads it. **Determination: remove it as part of KRYL-1340.**
Recorded in both KRYL-1340 and KRYL-1348 (which narrows to the disposition of the
`admissionengine.js`/`gate0policy.js` vocabulary/table themselves, not the now-settled call sites).

**Full closure, all 10 tickets**: every item the brutal test found is now either resolved in
ticket text (directly traced, not inferred) or correctly classified as out-of-ontology
implementation detail. No open blocker remains.
