# CF Production-Readiness — WS2: Persistence & Compaction Policy

**Status:** BUILT + VALIDATED (`qa_cf_persistence.mjs`, 2026-09-02). Branch only. No merge/deploy.
**Executes:** WS2 of the production-readiness build (Founder GO 2026-09-02).
**Rulings preserved:** X4 (no hard delete), CF-002 §23 (reconstructible), CF-003 §21 (immutable
events), IS-1 (determinism), CF §34 (no CF-only DB), KRYL-CF-004 memory boundary.

## 1. Persistence model — storage-agnostic snapshot

`src/engine/cf/pathwaystore.js` gains `serialize()` / `hydrate(snapshot)`:

- `serialize()` → a plain JSON-able object (`version` `cf-pathwaystore/1`, `batchIndex`,
  `eventSeq`, `params`, `pathways[]` with `domains` as arrays, `obsIndex[]`, `clusters[]`).
- `hydrate(snapshot)` → restores the module state; **rejects an unknown `version`**.
- The **medium is the caller's choice** — `localStorage` (the existing `pathstore.js` pattern),
  IndexedDB, or a shared server store. **That decision is deferred** (WS2 does not force it); the
  contract is the snapshot shape.
- CF §34 respected: this is the existing client-persistence pattern, not a CF-only database.
- KRYL-CF-004 memory boundary respected: the snapshot is **lineage + ν_t provenance (history)**;
  admission still reads only currently-supported state (X5 firewall), so the store never becomes
  a reasoning substrate.

### Determinism (IS-1) — VALIDATED

The store is append-only and ordered by `logical_time`; `eventSeq` and `obsIndex` are in the
snapshot. Therefore `hydrate → replay` reproduces the identical identity / admission decision
sequence as a no-reload run. `qa_cf_persistence.mjs`:
- serialize→hydrate→replay is **byte-identical** to a no-reload run;
- the snapshot is a fixed point: `serialize(hydrate(s)) === s`.

### Transient state is not persisted (X5 — see WS3)

`_corroboratedThisBatch` is deliberately **not** serialized. After `hydrate` it is empty, so a
reloaded pathway cannot be "corroborated this batch" until it genuinely is.

## 2. Compaction policy (X4 — "compact reconstructible history, never delete a pathway")

`compact({ compactAfter = COMPACT_AFTER })` — `COMPACT_AFTER = 8` batches idle (footprint knob,
**not** Founder-gated — not in FG-CORE).

**Eligible:** a pathway idle `> compactAfter` batches AND in tier `ARCHIVED` or `TOMBSTONED` AND
not already compacted.

**Preserved (never dropped):**
- `pathway_id`, `lineageKey`, `subject`, `domains`
- the **origin** event (`lineage[0]`)
- the **termination** event (if sealed)
- every `CONVERGENCE`, `REVISIT`, `FORMATION_CANDIDATE_CREATED` event
- the **`derives_from` topology** on every retained event (who links to whom)
- `nuHistory` head + tail record (with DEF-05-04 provenance)

**Dropped (recoverable):**
- `OBSERVATION_CREATED._particle` payloads — the raw connector particle, recoverable from the
  connector's own event log via `provenance.source` / the observation's `sourceRef`. The event
  **frame** (`obs_id`, `domain`, `polarity`, `magnitude`, `provenance`) is kept.
- interior `PROCESSING_*` runs → a single `COMPACTED_SPAN {count, from_t, to_t}` marker
- interior `nuHistory` records

**Invariant — VALIDATED:** after `compact()`, `reconstruct(participatingDomains)` still returns
`complete: true` for those domains; `pathwayCount()` is unchanged (0 deletions); a compacted
pathway retains identity + origin + termination + topology; compacted observations carry no
`_particle` and therefore **never feed admission** (guarded in `admissibleParticles`).

## 3. Still deferred (not blocking WS3/WS4/WS5)

- `localStorage` vs IndexedDB vs shared-server backing — an infra decision, taken when
  implementation forces it (e.g. the snapshot exceeds ~4 MB).
- Cross-device / cross-user continuity — requires a shared server store (WS3 defers this).
- A wall-clock compaction trigger for production (batches are the experiment unit).

## 4. Files

- `src/engine/cf/pathwaystore.js` — `serialize` / `hydrate` / `compact` / `SNAPSHOT_VERSION` /
  `COMPACT_AFTER`; `admissibleParticles` guarded against payload-free observations.
- `qa_cf_persistence.mjs` — WS2 + WS3 validation harness.
