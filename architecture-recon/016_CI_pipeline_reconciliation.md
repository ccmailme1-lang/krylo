# CI-F / CI-R / RBCS Pipeline — Reconciliation Against the Lean Ontology

Status: Bin-1 reconciliation. No code changed. Answers one question, per direction: is CI
another ontology/structure authority, or a downstream processor that could consume Σ?

Evidence Standard identical to 001-004/012/015. Full field-level read of `cifengine.js`,
`cirgate.js`, `rbcsengine.js` (all three, complete, not excerpted) as the basis.

## What each stage actually produces (fields, not assumptions)

**`expandCI()` (CI-F)** → `CI_F_CausalGraph`: `{seedCI, rootCell, cells[], edges[], branches[],
expandedAt, totalCells, terminatedCells, branchCount}`. Each cell:
`{id, hypothesis:{objectType, domain, realityObjectId, description, antecedent,
estimatedDelay}, confidenceMass, hopDepth, lineageTrace, edges[], children[], terminated}`.

**`validateGraph()` (CI-R)** → `{admitted: GroundedCausalBranch[], rejected: RejectionRecord[]}`.
A GCB: `{id, sourceCI, hypothesis, rkmAnchors[], resolvedEntities[], normalizedStructure,
edgeLegal, temporalLegal, anchorCoverage, uncertaintyBounds, structuralCoherence}` —
`structuralCoherence` is explicitly commented `// TELEMETRY ONLY` in the source, with a
second comment demanding "RBCS/LFOS/IB must NOT consume this."

**`scoreAdmitted()` (RBCS)** → `CandidateLeverageSet`: `{sourceCI, vectors[], candidates[],
computedAt, totalScored, candidateCount}`, where each vector is `{branchId, T, D, C, A, V,
score, tier}` — a weighted-geometric-mean leverage score, not an evidence/traceability score.

## The decisive finding: this is not Σ-shaped, and it says so itself

`cifengine.js`'s own header, line 8: **"expansion is speculative."** `confidenceMass` decays
multiplicatively at every hop (`childMass = parentMass * decay * penalty`,
`cifengine.js:55-59`) — every cell in the output is explicitly a **projection with decaying
confidence**, not an observed structural fact. `cirgate.js` gates on whether a hypothesis
is *legal* and *anchored*, not whether it's *true*. `rbcsengine.js` scores branches for
**leverage potential** (early-detection advantage, divergence, cross-domain reach) — a
completely different question than πΣ's "is this traceable to evidence."

This maps directly onto the M3/M4 distinction already locked earlier this session
("M4 must never silently become M3 — an interpretation cannot retroactively become
structural fact"). **CI-F/CI-R/RBCS is an M4-layer system: it reads RKM facts and projects
forward into speculative hypothesis branches.** Σ (M3) is a claim about what has been
observed. A `GroundedCausalBranch` is a claim about what *might happen next*, scored for
how early/valuable detecting it would be. These are different jobs, not two implementations
of the same job.

## The second decisive finding: the genealogy dependency is currently dead weight

`cifengine.js`'s `GENEALOGY_EDGE_MAP` (lines 30-35) maps `rkmstore.js`'s
`causes`/`enables`/`dependsOn`/`causedBy` genealogy fields directly to expansion edge types.
`expandFromRO()` (line 68) recurses by reading `ro.genealogy?.[genealogyField] ?? []`.

**Audit 012 already established `genealogy` is `{}` at the only live producer
(`edgar8kconnector.js:207`).** That means, in production right now: every call to
`expandFromRO` finds zero related ids for all four genealogy fields, and the recursive
expansion never fires. `expandCI()`'s real live output is limited to depth-1 "anchor" cells
(matching `ci.entityHints`/`ci.sourceType` against RKM objects directly, lines 204-212) —
the deep causal-graph-building capability this file is designed for is real code, currently
inert, for exactly the same reason `genealogy` itself was found inert in 012. This isn't a
new problem — it's the same one gap propagating downstream.

## Verdict

**CI-F/CI-R/RBCS is NOT a competing Σ-construction authority. It is a downstream
interpretation/projection consumer — currently reading directly from `rkmstore.js`
(`listAll()`/`getById()`), bypassing any G_W/Σ layer entirely, rather than consuming a
canonical Σ. It could become a Σ consumer later (Bin-3, not decided here) — e.g. seeding its
anchor-resolution step from a real G_W snapshot instead of a raw `listAll()` dump — but its
core function (speculative branch projection + leverage scoring) is legitimately different
from Σ construction, not a duplicate of it.**

Filling in the table from the original question list:

| Question | Answer |
|---|---|
| Is CI actually live? | GREEN — confirmed, chained after `edgar8kconnector.js` every cycle |
| Does it consume the same RKM objects? | GREEN — confirmed, `listAll()`/`getById()` |
| Does it construct its own structural representation? | GREEN — confirmed, but it's a speculative hypothesis tree, not Σ-shaped |
| Does it perform validation/scoring independently? | GREEN — confirmed, but scores leverage-potential, not evidential traceability |
| **Is CI duplicating a Lean-Ontology role?** | **NO — resolved.** Different question domain (M4 projection vs. M3 structure) |
| Can CI become a consumer of Σ rather than a competing structure builder? | **YES, in principle** — its anchor-resolution step (currently raw `listAll()`) is the natural seam; not implemented here |
| Can its existing scoring remain a downstream interpretation/integrity layer? | **YES** — RBCS's leverage scoring is exactly an M4 interpretation layer, correctly positioned downstream of facts, not competing with them |
| Is anything safe to remove/deprecate? | **NO** — nothing here duplicates anything; nothing needs removing |

## What remains open, not resolved here

- Whether `genealogy` should actually get populated (by `edgar8kconnector.js` or elsewhere)
  is still open from audit 012 — this reconciliation adds evidence that the gap has a real
  downstream cost (CI-F's designed capability is dormant because of it), which strengthens
  the case for eventually closing it, but doesn't decide to.
- Whether CI-F's anchor-resolution should be rewired to consume a real G_W snapshot instead
  of `listAll()` is a genuine future integration seam, not something this document
  recommends doing now — no code changes authorized by this reconciliation.

## Status

Gate: **GREEN — CI pipeline reconciled, no competing authority found, no wiring performed.**
KRYLO-wide adoption gate remains IN PROGRESS on its other open items (§0 of audit 015):
`edgar8kevidence.js`'s dual WO-2004/rkmstore role still unopened, `patentsviewconnector.js`/
`supplychainconnector.js` write real live R edges never yet run through
`gwrealiser`/`sigmaengine`.
