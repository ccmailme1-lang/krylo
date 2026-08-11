# DOD Step 4 — Complete πΣ Adoption

Status: Verification pass, citing existing test runs (013/014/020) rather than re-deriving.
One new check performed here: confirming no second element-level traceability mechanism
exists anywhere in the codebase.

Exit criterion (locked): **Every adopted Σ vertex, edge, and property requiring
traceability is individually traceable through the canonical ProvenanceDAG, with the
provenance grade honestly characterized. No second element-level traceability mechanism
exists.**

## Check 1 — ProvenanceDAG is the only element-level traceability mechanism

Grepped for the shape any competing implementation would need (per-element
vertex/edge/property keying, `isTraceable`/`linkEvidence`-equivalent functions):
```
isTraceable / linkEvidence / isFullyTraceable  →  only in causalos/provenance.js
                                                   (definition) and its two consumers
                                                   (sigmaengine.js, chokepointedges.js)
'vertex'/'edge'/'property' element-typing       →  only in causalos/provenance.js
```
**No second implementation exists.** Two systems that could be mistaken for competitors,
checked explicitly and ruled out:
- **WO-2005B's `perTypeContribution`** (audit 002) — keyed by evidence *type*, not by a
  specific vertex/edge/property id. Coarser grain, not the same role.
- **CI-R's `anchorCoverage`/`rkmAnchors`** (audit 016) — operates on `GroundedCausalBranch`
  cells (CI-F's own hypothesis-tree structure), never on a Σ object. Different data model
  entirely, already classified DOWNSTREAM/non-competing — not re-litigated here, just
  confirmed it doesn't also fail *this* specific criterion.

## Check 2 — per-path element-level traceability, with honest grade

| Path | Vertex/edge traceable? | Grade | Evidence |
|---|---|---|---|
| EDGAR/RKM (`edgar8kconnector.js`) | ✅ every vertex, edge, and property individually verified via `isTraceable()` | **Epistemic** — real per-item `evidence[]` (accession + item number), external, dated SEC filings | audit 013 (single cycle) + audit 014 (3 cycles: dedup, accumulation, no cross-Σ leakage, all 10 conditions GREEN) |
| Chokepoint (`chokepointedges.js`) | ✅ every vertex, edge individually verified via `isTraceable()`; idempotent across repeat calls | **Structural, not epistemic** — self-referential (edge is its own evidence for its own inclusion), real `source: 'DOMAIN_DEP_FACT'` field exists but is not threaded into the evidence identity itself. No canonical external artifact exists anywhere in KRYLO to upgrade this grade (checked directly, audit 020 — not assumed) | audit 020, all structural assertions passed |

Both paths satisfy the Traceability Invariant as literally defined (every element has ≥1
evidence link) — they differ in the *strength* of what that link points to, and that
difference is recorded, not hidden or averaged away.

## Check 3 — grade is not conflated with EvidenceTier

Confirmed unchanged from memo 006: neither path's πΣ link carries a weight/score field.
`sigmaengine.js`'s `linkEvidence()` signature is `(evidence_id, sigmaId, elementType,
elementId)` — no confidence parameter exists to smuggle one in. EvidenceTier weighting
(`evidencetiers.js`/`structuralconfirmation.js`/`rkmstore.js`'s three independently-tuned
tables, audit 012 finding) remains entirely downstream and separate, exactly as locked.

## Status

Gate: **Step 4 — GREEN.** `ProvenanceDAG` confirmed as the single element-level
traceability mechanism (no competitor found, checked not assumed). Both adopted Σ
construction paths pass the Traceability Invariant. Provenance grade is honestly
characterized and differs by path (epistemic for EDGAR, structural-only for chokepoint) —
this is recorded as a real difference in evidentiary strength, not smoothed over to make
both look equivalent.

Proceeding to Step 5 (multi-cycle / persistence validation) per the locked sequence. Note:
Step 5's EDGAR portion is already GREEN (audit 014) — this step's remaining work, if any, is
extending the same acceptance logic to the chokepoint path, which audit 020 already
exercised for idempotency (repeat calls, stable counts, no duplicate links) though not
framed as a formal multi-cycle test in the same shape as 014.
