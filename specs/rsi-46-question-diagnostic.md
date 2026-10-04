# RSI Diagnostic — 46 Questions, Zero Implementation Changes

**Date:** 2026-09-29. Round 2 run against the exact same KRYL-1335 build as the 17-question test
— nothing was changed to run these. Purpose: see the failure distribution to find out what the
evidence substrate is actually missing, per explicit instruction not to touch the implementation
first. Raw data: `specs/rsi-production-test-raw.json`. Reproduce: `node specs/qa_rsi_production_test.mjs`.

## Headline numbers

- **41 of 46** questions reach structural recognition (entities + relationship language extracted)
- **21 of 46** have at least one evidence-backed relationship (all traceable to the single real
  seeded fact: Sysco's $29.1B Restaurant Depot acquisition)
- **48 of 149** total candidate relationship pairs, across all 46 questions, are evidence-backed
- **5 of 46** (#6, #14, #24, #31, #42) don't reach structural recognition at all — vocabulary gaps

## The 5 that don't reach structural recognition

| # | Question | What's missing |
|---|---|---|
| 6 | "...distribution infrastructure...member restaurants?" | no entity term present ("infrastructure" alone isn't in the entity list; domain classifier separately mis-resolves this to TECHNOLOGY via the pre-existing `/\binfrastructure\b/` lexicon match — unrelated defect, not fixed here) |
| 14 | "...restaurant supply chain?" | "supply chain" as a two-word phrase isn't matched (only single-word "supplier" is) |
| 24 | "...distribution networks expanding into new geographic markets?" | MARKET entity found, but no relationship-intent word matched — "expanding" isn't in the intent list |
| 31 | "...transportation or warehouse operations..." | "transportation" and "warehouse" aren't in the entity list |
| 42 | "...multiple relationships changing...supply network?" | "network" alone isn't an entity term (LOGISTICS/FACILITY weren't in this sentence) |

**Pattern:** every miss is a real vocabulary-coverage gap in the minimal entity/intent lists built
for KRYL-1335, not a structural flaw in the approach. Three new entity terms (SUPPLY_CHAIN /
NETWORK, TRANSPORTATION, WAREHOUSE) and one new intent term (EXPANDING) would close all 5 — not
done here, since expanding vocabulary is a deliberate decision, not something to do silently mid-
diagnostic.

## Where the 48 supported pairs come from

All 48 trace to the same one real fact (Sysco → Restaurant Depot acquisition). Every question whose
recognized entities include SUPPLIER, DISTRIBUTOR, COMPANY, and/or OWNERSHIP/ACQUISITION picks up
one or more supported pairs from that single event — 100% concentration in one source. Everything
past the entity-recognition step is therefore bottlenecked on evidence density, exactly as the
17-question round already showed: **the structural-query capability works; the evidence substrate
has one usable event in it.**

## The "especially important test" (#46)

> "A distributor acquires another foodservice distributor. What other companies, facilities,
> suppliers, customers, and markets are connected to that change?"

Result: DISTRIBUTOR, COMPANY, SUPPLIER, LOCATION, MARKET recognized (5 entities, 10 pairs), 6 of 10
supported — the Sysco/Restaurant Depot fact itself literally answers the first half of this question
(a distributor acquiring another distributor). But it stops at the acquisition event itself — it
does **not** propagate from `A → B` to `A → B → facilities → suppliers → customers → markets`,
because no facility/supplier/customer/market-level facts exist in the substrate connected to that
acquisition. This is the precise gap the question was designed to expose, and it's confirmed: KRYLO
reports the edge, not the propagation chain, because the chain's downstream nodes have no evidence
of their own yet.
