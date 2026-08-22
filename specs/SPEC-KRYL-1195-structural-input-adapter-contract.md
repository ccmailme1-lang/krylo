# SPEC — KRYL-1195: Structural Input Adapter Contract

Status: DRAFT — Bottle Test passes (see VALIDATION). Not yet authorized to build.
Architecture ruling recorded on KRYL-1195 (Jira): C — provenance-gate then statistical
recognition, complementary by explicit new contract, not a merge. Resolved by KRYL-1198;
not reopened here.

## PROBLEM

`sigmaengine.js`'s `buildStructure()` produces a provenance-verified graph (Σ). `structuralrecognition.js` performs statistical organization/dependence detection on a `RelationshipSet`. Nothing today translates one into the other. 1195 is that translation layer — nothing more.

**Out of scope, explicitly (per Founder ruling):** discovering relationships, repairing provenance, making scalar connectors relational, expanding ERK, remediating any connector, reopening the pipeline-reconciliation question KRYL-1198 already closed.

## SOLUTION

**Pipeline:** Source evidence → entity/relationship admission → `sigmaengine` provenance gate → `RelationshipSet` (1195, this contract) → `structuralrecognition` statistical recognition → validation/adjudication (KRYL-1196).

**Verified input shape** (`sigmaengine.js` lines 40-115, read directly, not inferred from comments):
```
buildStructure(...) → {
  sigmaId,
  vertices: [{ id, kind }],                                    // V_Σ
  edges:    [{ id, from, to, type, source, validFrom, validTo }], // E_Σ
  props:    {...},                                              // props_Σ, may be empty
  traceable: boolean,                                           // see VALIDATION #1
  provenanceDAG,
}
```

**Required output shape** (`structuralrecognition.js` line 65, `toGraph()` lines 72-88):
```
RelationshipSet: [{ id, subjectId, objectId, type, evidenceRefs, ts? }]
```

**Gate order (whole-Σ provenance gate first, then per-edge checks):**
1. **Provenance gate (whole-structure, coarse).** If `buildStructure()`'s returned `traceable !== true`, reject the entire Σ — emit nothing from it. If `traceable === true`, proceed to translate its admitted, non-synthetic relationships. This is a structure-level gate, not a per-edge one — see VALIDATION #1.
2. **Per-edge translation, `E_Σ` → `RelationshipSet` element** (only for edges from a Σ that passed step 1):
   - `from` → `subjectId`, `to` → `objectId` — only after both pass the identity check (COMPONENTS #3).
   - `type` → `type` — only if it passes the type-admissibility check (COMPONENTS #2).
   - `source`/edge `id` → `evidenceRefs` — the edge's own id plus its DAG-linked evidence (see `buildStructure` lines 75-79: every edge is itself an evidence element, self-linked).
   - `validFrom` → `ts`.

## COMPONENTS (checks the adapter must perform, each with cited grounding)

1. **Provenance gate.** RESOLVED — whole-Σ, coarse (Founder ruling). See VALIDATION #1 for why per-edge gating was rejected.
2. **Type admissibility.** `entitytopologyregistry.js` (lines 54-58, 68-73) confirms `RELATION_TYPES` includes `BRIDGES_TO`, explicitly documented as **synthetic** — "not a real-world relationship," added by `bridgeV1ToV2()`, kept in the enum specifically so consumers can filter it. `isKnownRelationType()` exists but does **not** gate `registerTypedEdge()` (informational only, by design — comment explains a hard gate there would break every future connector). So 1195 must do its own allowlist: forward only `{BENEFICIAL_OWNER_OF, OPERATES, GATES, PROVIDES, POWERS, ENABLES}`; refuse `BRIDGES_TO` and anything unrecognized. This is the concrete mechanism behind "never manufacture a relationship" — a synthetic bridge edge reaching `structuralrecognition.js` would be exactly that.
3. **Identity check.** Confirmed (`entityresolution.js` line 8, 278-279): `entityresolution.js` imports and uses the *same* `nodeId()` function `registerTypedEdge()` uses to key `from`/`to` — a resolved entity from `resolveAny()` keys identically to a registered edge's endpoint. So the check is concrete: for each edge, both `from` and `to` must resolve via `entityresolution.js`; if either doesn't, refuse the edge, don't emit it with an invented identity.
4. **Evidence preservation.** `evidenceRefs` must be the edge's real DAG-linked evidence, not a placeholder — `buildStructure()` already links every edge to itself and both endpoints as evidence (lines 75-79), so this is a direct carry-through, not new logic.

## VALIDATION — Bottle Test

**Can another engineer implement this without making a product/design decision? Yes.**

1. **`traceable` granularity — RESOLVED by Founder ruling, whole-Σ gate.** Verified at `sigmaengine.js` line 112: `traceable: dag.isFullyTraceable(sigmaId, elementsToCheck)`, where `elementsToCheck` is *every* vertex, edge, and prop in the whole structure (lines 101-105) — one boolean for the entire Σ object, no per-edge flag anywhere in the returned shape. Ruling: 1195 reads this single flag and gates the whole structure on it (`traceable !== true` → reject everything from that Σ run). 1195 explicitly does **not** walk `provenanceDAG` to build a per-edge traceability layer — that would fabricate a capability the upstream contract doesn't provide, and would be a new provenance capability requiring its own contract, not something introduced quietly here. **1195 may say "this entire input passed the provenance gate." It may never say "these five edges are individually provenance-verified."**

Type admissibility and identity checks are both fully grounded in existing, verified code (see COMPONENTS #2-3). No remaining TBDs in file map or formula.

**Proposed file location** (naming convention only, not a design decision — lowercase, no CamelCase per repo rule): `src/engine/structuralinputadapter.js`, exporting a single function, e.g. `toRelationshipSet(sigmaStructure) → RelationshipSet[] | []`.

## ROLLBACK

New file(s) only (the translation function itself). No changes to `sigmaengine.js`, `structuralrecognition.js`, `entitytopologyregistry.js`, or `entityresolution.js`. Revert = delete the new file.

## GUIDELINES

- Never emit a `RelationshipSet` element for an edge whose type is `BRIDGES_TO` or unrecognized.
- Never emit a `RelationshipSet` element for an edge whose `from` or `to` doesn't resolve via `entityresolution.js`.
- Never fabricate `evidenceRefs` — carry through only what `buildStructure()` actually linked.
- Never treat two entities' mere co-presence in a Σ structure as a relationship — only real `E_Σ` edges become `RelationshipSet` elements; vertices are never paired into synthetic edges.
- **Never downgrade whole-structure provenance into per-edge provenance.** 1195 may claim "this input passed the provenance gate" (structure-level fact). It may never claim "this specific edge is individually provenance-verified" (a fact the upstream contract doesn't establish). Partial admission of a partially-traceable Σ is a new capability requiring its own contract, not something to introduce here.
