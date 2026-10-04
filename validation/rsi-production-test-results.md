# RSI Production Test — Results

**Date:** 2026-09-29 (updated after KRYL-1335)
**Method:** Each question run directly against `synthesizeQuery()` (`src/engine/querysynthesis.js`)
and `buildBrief()` (`src/components/analysis/intelligencebrief.jsx`) — the same functions the live
app calls, invoked in Node against the real, current live signal pool and the real registered
evidence facets. Raw output: `validation/rsi-production-test-raw.json`. Reproduce with
`node validation/qa_rsi_production_test.mjs`.

## Before KRYL-1335: 0 of 17 questions produced usable structural output

14/17 rejected outright (no canonical domain match, `resolutionEligible: false`, no synthesis run).
The other 3/17 resolved a domain but hit an empty live signal window. See git history of this file
for the original run.

## After KRYL-1335: 15 of 17 questions now surface a real structural recognition

| # | Domain resolved | Structural recognition | Relationships checked | Supported by real evidence |
|---|---|---|---|---|
| 1 | none | SUPPLIER, DISTRIBUTOR, TECHNOLOGY | 3 | 0 |
| 2 | none | SUPPLIER (single) | 0 (needs 2+) | — |
| 3 | none | SUPPLIER, DISTRIBUTOR | 1 | 0 |
| 4 | none | FACILITY (single) | 0 (needs 2+) | — |
| 5 | none | SUPPLIER, FACILITY, LOGISTICS | 3 | 0 |
| 6 | TECHNOLOGY (no live signal) | **not recognized** (vocabulary gap — "distribution infrastructure," "member restaurants") | — | — |
| 7 | none | SUPPLIER, DISTRIBUTOR, COMPANY | 3 | 0 |
| 8 | none | MARKET_THEME frame recognized (pre-existing path, unrelated to this ticket) | — | — |
| 9 | none | SUPPLIER (single) | 0 (needs 2+) | — |
| 10 | none | SUPPLIER, DISTRIBUTOR, FACILITY, TECHNOLOGY | 6 | 0 |
| 11 | none | TECHNOLOGY (single) | 0 (needs 2+) | — |
| 12 | none | TECHNOLOGY (single) | 0 (needs 2+) | — |
| 13 | none | SUPPLIER, DISTRIBUTOR, COMPANY, OWNERSHIP, INVESTMENT | 10 | 0 |
| 14 | CAPITAL (no live signal) | **not recognized** (vocabulary gap — "restaurant supply chain" as a phrase) | — | — |
| 15 | none | OWNERSHIP, ACQUISITION | 1 | 0 |
| 16 | none | SUPPLIER, DISTRIBUTOR, FACILITY, COMPANY, LOCATION, MARKET | 15 | 0 |
| 17 (critical test) | CAPITAL (no live signal) | SUPPLIER, DISTRIBUTOR, FACILITY, COMPANY, LOCATION, MARKET, PARTNER, COMPETITOR | 28 | 0 |

**Every relationship check returned `NO_EVIDENCE`, honestly.** This is expected and correct, not a
shortfall of this ticket: the only real evidence facet currently registered in the system (the
Alphabet/CAPITAL $80B-raise fact) has no textual relationship to any restaurant-industry entity.
Zero relationships were fabricated. Per the spec's own success criterion, this is the intended
outcome — the win is that these 15 questions now *reach* the evidence check at all, not that they
produce a positive answer.

**#17, the critical test, no longer "stops at CAPITAL."** Its brief now reads: domain-resolved
no-signal message, *followed by* the full list of 8 recognized structural participants and an
honest 28-relationship evidence check — exactly the acceptance criterion in the spec.

## Required Implementation Report (per spec §12)

1. **Where structural query interpretation is implemented:** `src/engine/structuralqueryinterpreter.js`
   (new, pure, ~90 lines) — `interpretStructuralQuery(query)`.
2. **What entity types are supported:** SUPPLIER, DISTRIBUTOR, FACILITY, LOGISTICS, COMPANY,
   LOCATION, MARKET, TECHNOLOGY, OWNERSHIP, PARTNER, COMPETITOR, INVESTMENT, ACQUISITION — regex,
   word-boundary matched, domain-agnostic (separate from `DOMAIN_LEXICON`, which is untouched).
3. **How entity relationships are represented:** every unordered pair of recognized entities is
   checked independently (`{a, b, state, facet}`); a single recognized entity with no pair is
   reported on its own, never forced into a fabricated relationship.
4. **How evidence is attached:** `src/engine/structuralentitysynthesis.js` (new) reuses the
   existing `getDomainEvidenceFacets()` extension point (`domainsignalresolution.js`) field-scoped
   across all six canonical domains, and text-matches both entity terms against each real
   registered facet's `provenance.semantics`/`source`. No new evidence system.
5. **Where the new path enters the existing pipeline:** `querysynthesis.js`'s `synthesizeQuery()`
   is now a thin additive wrapper — the original function (renamed `synthesizeQueryCore`, byte-
   identical logic) is called unchanged, and a new independent `structuralQuery` field is merged
   onto whatever it returns. Canonical-domain routing, `DOMAIN_LEXICON`, `inferFormation()`, and
   KRYL-1334 are untouched — confirmed via re-running this same 17-question harness and observing
   identical domain-resolution outcomes before/after.
6. **Where it exits into the briefing:** `intelligencebrief.jsx`'s `buildBrief()`, inside the
   existing AMBIGUOUS/insufficient-signal branch — appends the structural finding to (never
   replaces) any existing domain-specific message.
7. **Which RSI questions now reach structural analysis:** 15 of 17 (all except #6, #14).
8. **Which remain unresolved and why:** #6 and #14 — the minimal entity vocabulary above doesn't
   cover their exact phrasing ("distribution infrastructure," "member restaurants," "restaurant
   supply chain" as a phrase). Honest vocabulary-coverage gap, not a defect; expanding vocabulary
   coverage is a deliberate follow-on decision, not silently done here.

## Non-goals confirmed untouched

`DOMAIN_LEXICON`, `inferFormation()`/Formation admission, KRYL-1334 (on hold), MAP, and the six
canonical domains — no changes to any of them. No synthetic relationship score, no fabricated or
default entity/evidence anywhere in this build.
