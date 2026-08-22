# SPEC — KRYL-1201: Entity Identity Authority & Runtime Admission Contract

Status: DRAFT — Bottle Test passes (see VALIDATION). Not yet authorized to build.
Founder ruling recorded: Two-Tier Identity Model (Tier 1 curated registry, Tier 2
evidence-discovered entities via SEC/EDGAR CIK). No auto-expansion of the curated 56.
`resolveByIdentifier()`'s asymmetry against `resolve()` is in scope here, not a separate
ticket. KRYL-1196 stays unbuilt until this contract passes its own Bottle Test and is
implemented/validated.

## PROBLEM

`entityresolution.js` already has real runtime entity-admission machinery
(`createEntity`/`upsertEntity`/`mergeEntity`, backed by `RUNTIME_REGISTRY`) built for
exactly this — admitting entities beyond the static 56 — but it has zero live callers,
and even if called, the CIK-lookup path (`resolveByIdentifier`) can't find what it
admits. Meanwhile `entitytopologyregistry.js`'s `registerTypedEdge`/`registerOwnershipEdge`
already accept any CIK a connector hands them with no identity check at all. KRYL-1195's
adapter sits between these two facts and, correctly, refuses everything that isn't in the
static registry — which is why a real, verified 724-subject SEC evidence window currently
produces zero admissible relationships.

## SOLUTION

**Tier 1 — Curated Registry (`entityregistry.json`, unchanged).** Authoritative for
curated/product contexts. This ticket does not touch it, does not add to it, and no
downstream case result may trigger an addition to it.

**Tier 2 — Evidence-Discovered Entities.** For SEC ownership evidence specifically, the
admission authority is the CIK itself, as extracted directly from a real SEC 13D/13G
filing (already "structurally guaranteed" per `secownershipconnector.js`'s own header —
the connector doesn't assert identity, the filing schema does). Identity and provenance
are separate: CIK establishes *identity authority*; the triggering filing establishes
*why this entity entered the runtime population*. A discovered CIK is admitted via:

```
createEntity({
  canonicalName,
  identifiers: { edgar: cik },
  domainTags: [],                    // always empty on admission — see below
  admissionSource: 'SEC/EDGAR',
  admissionEvidence: pair.accession, // the real SEC accession number already extracted
})                                   // by extractOwnershipPair() — reuses the same
                                     // provenance identifier already used for
                                     // provenanceHash in this connector's RelationCore
                                     // construction, not a new provenance primitive.
```

`domainTags` stays `[]` on admission, always — no SIC-code derivation or any other
classification scheme. That's explicitly out of scope: deriving KRYLO canonical domains
from an external taxonomy is a separate ontology/normalization contract, not part of
identity admission. If KRYLO ever wants SIC→domain mapping, it gets its own ticket.

**Guardrail, stated explicitly:** a runtime-admitted entity is not evidence merely
because it exists. The entity is identity substrate; the filing/relationship that caused
its admission remains the evidence substrate. `admissionEvidence` records provenance —
it is never itself treated as a relationship or formation signal.

**The `resolveByIdentifier` fix, precisely scoped:** `resolve()` (lines 178-207) already
searches `[...INDEX, ...RUNTIME_INDEX]` when runtime entities exist. `resolveByIdentifier()`
iterates only the static `REGISTRY` array. The fix is symmetric with what `resolve()`
already does: also iterate `RUNTIME_REGISTRY`'s entries' `identifiers[source]` field,
same normalization (strip leading zeros), same return shape (`{...entity, confidence: 1.0}`).
Not new logic — matching an existing, already-correct pattern.

**Where admission actually gets called — a real constraint, not a free choice.**
`entityresolution.js` already imports `nodeId` from `entitytopologyregistry.js` (line 8).
`entitytopologyregistry.js` importing `createEntity` back from `entityresolution.js` would
be a circular import. So admission cannot be wired inside `entitytopologyregistry.js`'s
`registerTypedEdge`/`registerOwnershipEdge` — it has to happen one layer up, in the
connector itself (`secownershipconnector.js`), before or alongside its existing
`registerOwnershipEdge` call: resolve first (`resolveByIdentifier('edgar', cik)`), and if
null, `createEntity(...)` before registering the topology edge.

## COMPONENTS

- **`resolveByIdentifier` fix** — extend to also search `RUNTIME_REGISTRY`. Grounded,
  no TBD (mirrors `resolve()`'s existing pattern exactly).
- **Admission call site** — `secownershipconnector.js`'s `runSecOwnershipSync`, inside its
  existing per-hit loop, before `registerOwnershipEdge`. Grounded, no TBD on *where*.
- **Admission provenance** — RESOLVED. `createEntity` gains two new optional fields,
  `admissionSource` and `admissionEvidence`, set once at creation (immutable, like
  `createdAt`) — not a mutation path, so re-encountering the same CIK doesn't repeatedly
  rewrite provenance. `admissionEvidence` reuses the connector's existing SEC accession
  number (already used as `provenanceHash` elsewhere in this same connector) rather than
  inventing a new provenance shape.
- **Domain tagging for Tier 2 entities** — RESOLVED. Always `[]` on admission. No SIC
  derivation, no classification scheme. Out of scope.
- **No changes to**: `entityregistry.json`, `structuralinputadapter.js`, `structuralrecognition.js`,
  `sigmaengine.js`, `gwrealiser.js`. This ticket is entity-identity only.

## VALIDATION — Bottle Test

**Can another engineer implement this without making a product/design decision? Yes.**

Both prior open points are resolved by Founder ruling (see SOLUTION and COMPONENTS
above): admission provenance is CIK + the connector's existing accession number, not a
new provenance architecture; `domainTags` is always `[]` on admission, no SIC mapping.
The circular-import constraint (admission lives in the connector, not
`entitytopologyregistry.js`) was already resolved, not open. No remaining TBDs in file
map or formula. This ticket adds no new architectural machinery beyond the existing
runtime-admission mechanism — it extends `createEntity`'s param list, fixes
`resolveByIdentifier`'s search scope, and adds one call site in
`secownershipconnector.js`.

## ROLLBACK

New: one small addition to `entityresolution.js` (`resolveByIdentifier` extended) and one
small addition to `secownershipconnector.js` (an admission check before its existing
`registerOwnershipEdge` call). No new files. No change to `entityregistry.json`,
`entitytopologyregistry.js`'s registration functions, or any structural-recognition-side
file. Revert = revert those two diffs.

## GUIDELINES

- Tier 2 admission never writes to the static `REGISTRY`/`entityregistry.json` — only
  `RUNTIME_REGISTRY`. Structurally guaranteed already (`createEntity`/`upsertEntity` only
  ever call `RUNTIME_REGISTRY.set`), not something to newly enforce.
- No automatic bulk-admission of "all discovered entities" from a sync — admission is
  per-entity, at the point a real, filing-sourced CIK is encountered, same discipline as
  everything else already gated on real evidence in this pipeline.
- 1195's CIK-only refusal behavior is not touched or weakened by this ticket — Tier 2
  admission means more entities *become* resolvable via ERK, not that 1195's gate gets
  looser.
- **Admission is idempotent by construction, not by convention.** The call site checks
  `resolveByIdentifier('edgar', cik)` (CIK-first, not name-first) before ever calling
  `createEntity` — the same real filing/CIK encountered again in a later sync resolves
  to the existing runtime entity rather than creating a duplicate or re-triggering
  admission.
- **A runtime-admitted entity is not evidence merely because it exists.** It is identity
  substrate. The filing that caused its admission (`admissionEvidence`) remains the
  evidence substrate. Never let the entity's mere presence in `RUNTIME_REGISTRY` be read
  downstream as if it were itself a detected relationship or formation signal.
