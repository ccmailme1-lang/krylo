# O (Object) — Exhaustive Scan

Status: Architecture Recon / NOT a build spec. No code changed to produce this document.
Evidence Standard identical to 001/002 (NOT FOUND / UNVERIFIED / INFERRED).

Search performed: broad semantic grep across `src/` for `Entity|Object|Identity|Profile|Company|
Organization|Person|RealityObject`, `entityKey`, `identityId`, `external_key`/`externalKey`,
`resolveIdentity|mergeEntity|upsertEntity|createEntity|createObject`, plus filename search for
`*entity*`/`*identity*`. Per the stated triage rule, the UUID-regex approach was explicitly
**not** used — a Lean O is defined by semantic role (stable identity), not identifier format.

## Candidates found (filename search)

```
src/hooks/useEntitySignal.js
src/data/entityregistry.json          <- static entity data store
src/engine/entitytopologyregistry.js  <- relationship registry (see 004)
src/engine/identitykernel.js          <- audited in 001 (E kernel, not O)
src/engine/identitydynamics.js
src/engine/entityresolution.js        <- WO-2041, "Entity Resolution Kernel (ERK)"
src/engine/entityattribution.js
src/engine/entitystateledger.js       <- KRYL-974
src/engine/identitydrift.js
```

The strongest candidate by far is `entityresolution.js` + `src/data/entityregistry.json`
together. Extraction below covers those two plus the two secondary candidates
(`entityattribution.js`, `entitystateledger.js`) that surfaced in the same search.

## Extraction table

| File | Class / Func | Field(s) | Immutable? | Persistence | created_at? | evidence link? |
|---|---|---|---|---|---|---|
| `src/data/entityregistry.json` | (static JSON array, 56 entries) | `canonicalId, canonicalName, aliases[], identifiers:{edgar,fec,uei}, domainTags[]` | Y — static file, no write path found anywhere in `src/` | File-based, committed to repo (not a DB) | **NOT FOUND** — no timestamp field on any record | **NOT FOUND** — no provenance/source field on the record itself (identifiers are cross-reference keys, not evidence links) |
| `src/engine/entityresolution.js` (`resolve`, `resolveAll`) | Read-only lookup over the registry above | Returns `{...entity, confidence}` | Y — pure function, no mutation, `INDEX` built once at module load | None — in-memory index only | N/A (read function) | N/A |
| `src/engine/entityresolution.js` (`buildCanonicalId`) | `normalize(name)` → slug | `canonicalId` derivation rule: uppercase → strip punctuation/suffixes → lowercase-hyphenate | Deterministic, content-derived | N/A | N/A | N/A |
| `src/engine/entitytopologyregistry.js` (`nodeId`) | `nodeId(cik, fallbackName)` → `` `CIK:${cik}` `` or normalized name | Node identity scheme for the R registry (see 004) | Deterministic | N/A | N/A | N/A |
| `src/engine/entityattribution.js` | `ENTITY_REGISTRY` (hardcoded object literal, 12 named entities: "elon musk", "apple", "nvidia", ...) | `{[domain]: affinity 0-1}` per entity | Y — hardcoded const, no mutation | None (in-memory const) | N/A | N/A |
| `src/engine/entitystateledger.js` (`recordEntityState`) | Append-only ledger keyed by `entityId` | `{entity_id, timestamp, signal_snapshot, metric_snapshot, source_hash, event_trigger_id, ...}` | **Append-only by design** (file comment: "no update/delete API exists") | `localStorage` (`krylo_entity_state_ledger_v1`) — browser-local, not a server store | Y — `timestamp: new Date().toISOString()` on every entry | Y — `sourceHash`, `eventTriggerId` fields exist for this purpose |

## Quick triage (per the stated rules)

- `entityregistry.json` / `entityresolution.js` — does NOT mutate in place (read-only registry);
  id (`canonicalId`) is derived from the entity's own name, not from an event key → **passes**
  the "not merely an event" triage rule.
- `entitystateledger.js` — `entity_id` is a foreign key pointing at *something else's* identity
  (not generated here); this file records *states of* an entity, it does not *define* the
  entity. It is a strong ST/history candidate riding on top of whatever provides O, not O itself.
- `entityattribution.js` — hardcoded, 12 names, no registry/lookup infrastructure, no
  identifiers, no persistence. Closer to a static config table than an object substrate.

## Consumption (confirmed live callers, static-import grep)

| Module | Imports | Confirmed live? |
|---|---|---|
| `entityresolution.js` | `causalimpactview.jsx`, `crediff.js`, `edgar8kconnector.js`, `edgarnarrativeconnector.js`, `capitalrealizationconnector.js` | **Y** — 5 real consumers, including two live EDGAR connectors |
| `entitytopologyregistry.js` (via `entityresolution.js`'s `nodeId` import, and separately) | `crediff.js`, `chokepointedges.js`, `causalimpactmap.js`, `surfacerouter.js`, `secownershipconnector.js`, `supplychainconnector.js`, `patentsviewconnector.js` | **Y** — 7 consumers, including `surfacerouter.js` (the main ingestion router) |
| `entitystateledger.js` | **NOT FOUND** — zero importers anywhere in `src/` | **N** — confirms the file's own header comment: "nothing in the existing pipeline calls it yet" |
| `entityattribution.js` | Not checked in this pass (secondary candidate, deprioritized once `entityresolution.js` emerged as the stronger match) | UNVERIFIED |

## Closure assessment

**`entityresolution.js` + `entityregistry.json` is a materially stronger O candidate than
anything found in the A1 audit (WO-2004's `entityKey`).** It has:

- A real, stable, content-derived `canonicalId` (not a random UUID).
- A committed data store of actual entities (companies), with cross-source identifiers
  (`edgar`/`fec`/`uei` CIK-style keys) — closer to Lean O's "stable identity independent of any
  single observation" than WO-2004's opaque `entityKey` string.
- Confirmed live wiring into real ingestion connectors.

What it does **not** have, per the extraction table (marked `NOT FOUND` above, not inferred):

- No `created_at`/lifecycle timestamp on entity records.
- No mutation/merge/dedup functions — `entityregistry.json` is a static, hand-curated (56-entry)
  file, not a system that creates or updates objects at runtime. There is no `createEntity`,
  `upsertEntity`, or `mergeEntity` function anywhere in the files inspected.
- No direct evidence/provenance link on the entity record itself.

**Verdict: PARTIAL match, materially stronger than the A1 finding.** This is a real, live,
read-only canonical-entity *lookup* layer — closer to Lean O than WO-2004 is, but it is a static
reference table, not a lifecycle-managed object store with creation/mutation semantics. Whether
that gap (no runtime object creation/merge) matters depends on whether Lean O requires objects to
be *creatable at runtime from observations* or merely requires *stable resolvable identity* —
that's a spec-interpretation question for the decision gate, not something this scan can resolve
on its own.
