# BUG-005 — Domain coverage gap (gig-income / alt-asset scenarios)

STATUS: BACKLOG
FILED: 2026-06-16
WO: WO-1761
SPLIT FROM: BUG-001 (BUG-001A)

## Evidence

20/20 queries in the same-day batch run (`.batchtest.mjs`, 20 phrasings of an
18-month co-living entry + 15% freelance revenue volatility + $45k student
debt scenario) returned identical `Anchor: OPEN`, `Domain: GENERAL`. These are
not vague or ambiguous questions — they contain specific decision-grade
concepts: DTI, lender requirements, co-living, freelance/gig income
volatility, alternative financing. No existing domain
(AUTO/REAL_ESTATE/CAREER/RETIREMENT/HEALTH) has a keyword set that covers
this persona shape.

## Why this isn't a quick keyword patch

Hardcoding `freelance → GIG_ECONOMY` or `co-living → ALT_ASSETS` off a single
incident set risks building taxonomy around one test corpus. Recommended
approach: re-run a broader query corpus through the router first, collect the
actual GENERAL-fallback misses, and derive the new domain(s) — if any — from
that data rather than from this one batch.

## Depends on

BUG-001C (numeric unit collision) fix landing first — confirmed in
BUG-001-unit-contamination.md, 2026-06-16. Re-running the corpus before this
fix would have produced misleading capital-context data alongside the
routing data.

## Scoped (2026-06-16)

Full scope written up at `specs/WO-1761-domain-coverage-gap.md`, based on
the broader 30-query corpus this doc called for (`.batchtest3.mjs`). Turns
out to be three distinct problems, not one:

- **(a) True coverage gaps** — 17/25 new-persona queries, no domain matches
  at all. Confirmed not one shape (not just gig-income) — needs a real
  taxonomy decision, not a one-off keyword patch. Still needs Founder
  input, as this doc originally said.
- **(b) Substring/keyword contamination** — confirmed bug, not a coverage
  gap: `detectDomain()`'s AUTO regex has no word boundary and matches
  "car" inside "card"/"cards." A credit-card-debt query got routed to the
  car-buying synthesizer. Cheap, mechanical fix, no taxonomy judgment
  needed — can ship independently.
- **(c) Content-model mismatch on correct routing** — even a *correct*
  keyword match (e.g. "mortgage" in a reverse-mortgage query) routes into a
  synthesizer that assumes the wrong transaction shape, sometimes
  producing genuinely broken output (a confirmed `$68 purchase, $480,000
  down (705882%), Financed: $-479,932` from a reverse-mortgage query).
  Harder than (a) or (b) — needs its own design pass.

## Not started

No code written for any of (a)/(b)/(c). Scope only — see spec file for full
breakdown and recommendation.
