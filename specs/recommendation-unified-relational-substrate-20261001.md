# Recommendation — Unified Upstream Relational Foundation for CFX (2026-10-01)

Recommendation only. No implementation. Builds strictly on the verified facts in
`specs/engineering-discovery-relational-substrate-20261001.md` — every claim below traces back to
a cited file/line in that document, nothing new asserted without that grounding. This is an
engineering recommendation for Founder ruling, not a ratified decision.

---

## 1. Canonical relational primitive

Reuse **RelationCore's structural shape** (`id, sourceId, targetId, relationType, provenance,
validity`) as the canonical envelope — it's the only one of the three representations with
enforced invariants (`provenanceHash` required, typed `relationType`) and a real detection layer
sitting behind it (`relationdynamics.js`, currently unwired).

Do **not** reuse its current `eta`/`phi0`/`structuralSupport` fields as-is. Confirmed in §4 of the
discovery doc: `phi0 = 0.5` is an admitted placeholder in 2 of 3 producers; `structuralSupport` is
copied by analogy in the third. Carrying those forward unchanged would persist fabricated-looking
precision under a canonical name — the exact failure this investigation exists to prevent.

## 2. Semantic vs. statistical relationships

Two genuinely different evidence grains were found tonight, and they should stay distinct kinds
under one identity/provenance contract, not one confidence scale:

- **Semantic/claim relations** — a real citable statement that two entities did something to/with
  each other (e.g. the Sysco/Restaurant Depot acquisition). Evidence contract: a real,
  independently-verifiable citation is mandatory (SEC accession number, filing, etc.).
- **Statistical/co-occurrence relations** — what `formationinference.js` actually detects today:
  two domains independently crossing a threshold in the same window. Evidence contract: a real
  co-occurrence measure (e.g. how often, how reliably) — never a stand-in "strength" score, and
  never relabeled as a claim about what happened between them.

Collapsing these was the original mistake (the MAP's "RELATIONSHIPS" counter implying claims that
are really just co-presence). Keep them as two `kind` values on the same canonical object, each
with its own required-evidence contract, rather than inventing a shared confidence number that
has to lie about one of them.

## 3. Identity / sameness

Make `entityresolution.js`'s `canonicalId` registry the single mandatory identity reference.
It's the one store already designed (per its own comments) to be the stable, deduped, cross-system
key. Every relation's `sourceId`/`targetId` should resolve through it. Connector-local keys (SEC
CIK, `nodeId(cik, name)`) become *inputs* to canonicalId resolution, not parallel identity systems
— today they're accidentally consistent in one connector and not guaranteed anywhere else.

## 4. Evidence that must be retained

Per relation instance, retain — structured, not concatenated into a lossy string (KRYL-1334's
current `sourceId:source` pattern loses exactly this):
- the real citation/provenance object, kept whole and re-parseable (the `rsi-production-test-raw.json`
  example already does this correctly: `{sourceId, source, semantics}` as separate fields)
- the real per-endpoint observations already retained in tonight's edge-enrichment
  (`formationinference.js`'s `aMeanMag/aNet/aCount/bMeanMag/bNet/bCount`) where the relation is
  statistical
- an explicit `kind` tag (semantic vs. statistical, per §2)

## 5. Provenance

Keep RelationCore's "no unsourced relation" invariant (`provenanceHash` required, constructor
throws otherwise) — it's the single best-enforced rule found in any of the three systems. Extend
it from a bare hash to a structured, retrievable citation object, matching §4. Never let a
canonical relation exist with `provenance: null`.

## 6. What happens to RelationCore

Keep it, but narrow its job: canonical shape + validation gate (`admitCandidate`-style), not the
source of strength numbers. Wire `relationdynamics.js` behind it rather than leaving it dormant —
it already does real entropy/volatility/φ-grounded detection work that duplicates, more
rigorously, what KRYL-1334's informal `NEW/STRENGTHENING/WEAKENING` labels were reaching for.
Require every producer to either compute `eta`/`phi0`/`structuralSupport` from real per-instance
inputs or mark them explicitly `NOT_MEASURED` (this repo already has that honest-absence pattern —
e.g. the validation-profile disclosure in `structure-field.html`'s detail panel) rather than a
copied constant.

## 7. What happens to typed edges

Keep `entitytopologyregistry.js` as the **live traversal/index layer** — `worldgraph.js`'s
`findPath()` and `chokepointedges.js`'s `buildChokepointStructure()` already depend on it directly
and work today. But stop building it as an independent sibling straight from raw evidence (as
`secownershipconnector.js` does now, in parallel with RelationCore). Make it a **projection
derived from the canonical relation**, not a second source of truth — same traversal API,
regenerated from canonical relations instead of built independently alongside them.

## 8. What happens to the existing formation/CFX machinery

`formationinference.js`'s co-presence model stays — it's real, and it answers a real question
("which domains are co-active"). But it should be relabeled/scoped honestly as co-occurrence
detection, not relationship detection, so the MAP's "RELATIONSHIPS" count stops implying claims
that were never observed (directly connects to tonight's "binary, not building" finding). Once a
canonical relation store exists, the MAP can additionally surface real semantic relations
alongside the domain view — not replace it; they answer different questions.

## 9. What should be persisted

The canonical relation object should become the **one durably persisted relational table** —
confirmed finding: today, *nothing* relational is durably persisted except KRYL-1334's
`formation_state`, and that's built from the most lossy of the three paths (typed-edge facet,
stripped of `eta/phi0/structuralSupport` one hop upstream). Persisting the canonical object
directly, with structured provenance and real identity, replaces that lossy derivative rather than
adding a fourth store.

## 10. Adapters vs. canonical infrastructure

**Adapters** (keep, unchanged in spirit): each connector's real-source parser —
`extractOwnershipPair()`, the patent-migration extractor, etc. Their job stays "turn one real
source's native schema into a structured pair + citation." Correctly scoped already.

**Canonical infrastructure** (new, shared): one constructor + validator (`admitCandidate`-style) +
persistence + typed-edge projection, fed by every adapter's output. Today, each adapter calls two
unrelated constructors directly (`registerOwnershipEdge` + `makeRelationCore`, confirmed built
side-by-side with no cross-reference in `secownershipconnector.js:106-148`) — that duplication is
exactly what should collapse into one call per adapter.

## 11. Architectural risks

- Collapsing semantic and statistical relations onto one confidence number silently repeats the
  `phi0 = 0.5` problem at a higher level.
- Migrating KRYL-1334 off `formation_state` is a real-data migration (already-shipped, guest-facing
  history), not a greenfield schema swap — needs an explicit compatibility plan, not a rewrite.
- Wiring `relationdynamics.js` in without confirming its equations were validated against real (not
  synthetic/golden-set-only) evidence risks promoting an unvalidated model to production authority
  under the cover of "it's already built."
- `entitytopologyregistry.js` is in-memory only (`const _registry = {}`) — making it "the" index
  layer without also giving it persistence means a restart silently empties the relational index.
- Domain-signal and entity-relational evidence are different observation grains (aggregate
  pressure vs. discrete claims). Forcing one object to represent both risks fabricating equivalence
  between "two domains are both active" and "X did something to Y" — the core tension this whole
  investigation surfaced.

## 12. What should not be changed yet

Everything already frozen earlier tonight still holds: don't touch `formationinference.js` further,
don't wire `RelationCore` directly into the MAP, don't resurrect a fourth `RelationshipObservation`
schema, don't modify KRYL-1334, don't restore `eta/phi0/sigma` into the facet in isolation, don't
merge the three representations opportunistically.

Additionally, from this recommendation: don't retire `worldgraph.js`/`chokepointedges.js`'s direct
typed-edge calls until a canonical-relation-backed projection is proven equivalent; don't persist
`RelationCore` objects as-is until the observed-vs-modeled field split (§1/§6) is resolved —
otherwise placeholder numbers get written to durable storage as if they were real, permanently.
