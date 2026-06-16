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

## Not started

No code written. Needs Founder/product input on whether a new domain is the
right shape before any routing keywords are added.
