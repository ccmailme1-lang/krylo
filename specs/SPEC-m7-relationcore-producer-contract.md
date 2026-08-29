# SPEC — M7: RelationCore Producer Contract (PatentsView Inventor Migration)

Date: 2026-08-20
Status: CONTRACT + VALIDATION. Pure evidence-to-relation mapping implemented and fixture-tested.
**Not implemented: live acquisition.** No network calls. No modification to
`patentsviewconnector.js`. `PATENTSVIEW_ENABLED` not touched, remains `false`. No admission, no
Formation-B, no Structure Map work.

Gate discipline (per explicit instruction): this document distinguishes **M7 Contract** (closed
when the mapping is specified and validated against fixtures) from **M7 Runtime Producer**
(blocked until live evidence acquisition exists). The two are never conflated.

---

## 0. Correction this document depends on

Earlier this session, `patentsviewconnector.js`'s inventor-migration detection was described as
"confirmed live end-to-end," carried forward from a prior session's document without re-checking
current code. Re-verified directly this session: **`PATENTSVIEW_ENABLED = false`** (line 241),
`runPatentsViewSync()` returns `[]` immediately (line 245) without ever reaching the detection
logic. The connector's own comment: *"Legacy PatentsView API... decommissioned; replacement Search
API is key-gated and CORS-blocked from the browser... Disabled until a server-side proxy exists."*
No such proxy exists in this repository. This is the honest starting condition for M7.

## 1. Evidence source

**Source**: PatentsView API (`api.patentsview.org`), queried per `CLUSTER_WHITELIST`'s 7 CPC
section prefixes (AI, SEMICONDUCTOR, ROBOTICS, ENERGY_STORAGE, QUANTUM, DEFENSE, BIOTECH).

**Exact fields used** (transcribed from the real query in `patentsviewconnector.js`, not invented):
`patent_id`, `inventor_id`, `assignee_organization`. One patent record has the shape:
```
{ patent_id, assignees: [{ assignee_organization }], inventors: [{ inventor_id }, ...] }
```

## 2. Detection rule (transcribed from `buildMigrationSignals()`, unchanged)

For each inventor (`inventor_id`) observed across the 90-day window: count how many patents they
appear on per `assignee_organization`. If an inventor's patents span **2 or more distinct
organizations**, the two organizations with the highest and second-highest patent counts for that
inventor are the migration's destination (`destOrg`, highest count) and source (`sourceOrg`,
second-highest). An inventor appearing under only one organization produces no relationship —
this is the connector's own existing rule (`if (orgs.length < 2) continue;`), reused verbatim.

**Deterministic**: same evidence set → same output, every run. No randomness, no inference step.

## 3. RelationCore mapping (new — this is M7's actual deliverable)

The existing connector writes an untyped, symmetric adjacency edge via
`registerInventorMigrationEdge(sourceOrg, destOrg)` — both directions, no `RelationType`, no
`provenanceHash`. M7 does not reuse that function. It specifies a parallel, real `RelationCore`
mapping:

| RelationCore field | Source | Rule |
|---|---|---|
| `sourceId` | `sourceOrg` | Normalized (`toUpperCase().replace(/[\s-]/g,'_')`), matching the connector's own existing key normalization |
| `targetId` | `destOrg` | Same normalization |
| `relationType` | — | **`COUPLED_WITH`** — reasoned choice, not Founder-ratified (see §3.1) |
| `eta` (existence confidence) | evidence volume | `min(1, totalPatents / 10)` clamped to `(0, 1]` — more corroborating patents → higher existence confidence. Arbitrary constant (10), flagged, not derived from any doctrine |
| `phi0` (effect strength) | `destCount / totalPatents` | Same ratio the connector already computes as its signal `confidence` — reused, not reinvented |
| `structuralSupport` | fixed `0.5` pending real calibration | Placeholder — no doctrine or prior art establishes this value; flagged |
| `provenanceHash` | evidence identity | See §3.2 — **placeholder algorithm, not BLAKE3** |
| `createdAt` | evidence window end | The `now` timestamp `buildMigrationSignals` already uses |

### 3.1 — RelationType reasoning (flagged, not ratified)

The migration is a real, symmetric, non-causal observation: two organizations share a migrating
inventor. It is not a causal claim (`CAUSES`), not a hierarchical dependency (`DEPENDS_ON`), not a
capability grant (`ENABLES`). Of the 14 SRE types, `COUPLED_WITH` is the only one whose own
classification (`InfluenceClass.NON_DIRECTIONAL`, per H2 findings) matches what's actually
observed: symmetric co-variation, not directional causation or dependency. **This is this
document's reasoned choice, not a Founder ruling** — a different type may be selected on review.
Note also: per Gate-0 (`SPEC-gate0-sre-dispositions.md`), `COUPLED_WITH` is currently `Defer` like
all 14 SRE types — a correctly-typed candidate would still be rejected at admission today, which is
expected and correct, not a defect in this producer.

### 3.2 — provenanceHash: explicit non-conformance, flagged

`relationontology.js` specifies `π = BLAKE3(evidence bundle ⊕ observation ids ⊕ path)`. No BLAKE3
implementation exists in this repository (checked: no import, no dependency). The fixture-validated
implementation below uses a deterministic FNV-1a hash over the same conceptual inputs (evidence
patent IDs + inventor ID + org pair) as an explicit, labeled placeholder. **This does not conform
to the ratified provenance algorithm** and must not be presented as if it does — it proves the
*shape* of provenance construction (deterministic, evidence-derived, reproducible), not the
*specified* algorithm.

## 4. No-fabrication constraints (enforced in code, §5)

- No relationship is emitted when an inventor has patents at only one organization (evidence
  says "no migration" — output is nothing, not a weak/low-confidence relationship).
- No relationship is emitted when evidence is empty or malformed (missing `assignee_organization`,
  missing `inventor_id`) — such records are skipped, never defaulted.
- No relationship is emitted from fewer than 1 corroborating patent per organization — the
  detection rule structurally cannot produce a relationship without ≥2 organizations each backed
  by ≥1 real patent record.
- The producer never calls `makeRelationCore()`'s admission — it only constructs a schema-valid
  candidate. Admission is M6's exclusive concern (Discovery ≠ Admission ≠ Storage, unchanged).

## 5. Implementation — pure, fixture-only, no network

See `src/engine/producers/patentsviewmigrationproducer.js`. Takes an array of patent-record
fixtures (real API response shape, §1) and returns `RelationCore[]`. Does not import
`patentsviewconnector.js`, does not import `surfaceRouter`, makes no network calls.

## 6. Validation

See `qa_patentsviewmigrationproducer.mjs`. Golden fixtures cover: a real 2-organization migration
(positive case), a single-organization inventor (negative case — no output), missing/malformed
evidence fields (skipped, not defaulted), determinism (same fixture twice → identical output,
including identical `provenanceHash`), and provenance traceability (the hash changes if the
underlying evidence changes).

## 7. Availability state — the actual gate

```
PatentsView detection algorithm       EXISTS (patentsviewconnector.js, transcribed into M7's
                                       pure mapping)
RelationCore mapping                  SPECIFIED + VALIDATED (this document, §3, §6)
Live evidence acquisition             DOES NOT EXIST — PATENTSVIEW_ENABLED = false, no server-side
                                       proxy exists anywhere in this repository
```

**M7 Contract — CLOSED.** The producer contract and evidence-to-relation mapping are specified and
validated against fixtures.

**M7 Runtime Producer — BLOCKED.** No live evidence acquisition path exists. Requires a
server-side PatentsView proxy (does not exist) before this producer can run against real data.
Flipping `PATENTSVIEW_ENABLED` alone would not be sufficient — the connector's own comment states
the legacy API is decommissioned and the replacement requires a key-gated, CORS-blocked path a
server-side proxy would be needed to bridge.

## 8. Standing state

M1–M6: closed per prior addenda. **M7 Contract: CLOSED.** M7 Runtime Producer: **BLOCKED** on
server-side acquisition capability (new, distinct blocker from the KRYL-1133/WO-2049 chain — this
one is infrastructure, not governance). Formation-B: still blocked upstream (no admitted
substrate exists regardless of M7, since Gate-0 is currently all-Defer). Structure Map: unchanged,
synthetic, honestly labeled.
