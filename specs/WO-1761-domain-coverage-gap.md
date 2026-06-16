# WO-1761 — Domain Coverage Gap (Gig-Income / Alt-Asset) — SCOPE

STATUS: SCOPED, not built. Spun out of BUG-001A / BUG-005.
EVIDENCE: `.batchtest3.mjs` (30-query diversity batch, 2026-06-16) + live
reverse-mortgage and debt-consolidation repros confirmed via raw-output grep.

## Method note

The UI's `Domain:` label is unreliable for this analysis — per WO-1757, it
reads `LENS_BROKER_DOMAIN_MAP[activeLens]`, which is hardcoded to `GENERAL`
for any lens-less query regardless of what actually ran. To determine which
synthesizer *actually* executed, this scope used each synthesizer's
hardcoded `confidence` value as a signature (AUTO=0.82, REAL_ESTATE=0.79,
CAREER=0.84, RETIREMENT=0.81, EXPENSE_REDUCTION=0.81, HEALTH=0.84,
GENERAL=0.71) and confirmed against raw output text.

## Finding: this is three distinct problems, not one

### (a) True coverage gaps — 17 of 25 batch queries (68%)

No domain's keyword set matches at all; correctly falls to GENERAL given the
current domain list. Confirmed by signature: Small Business, Creator
Economy/LLC, Life Insurance, 529 Plan, Elder Care, RSU Vesting,
Crowdfunding, Veteran Benefits, HSA Optimization, Alimony, Franchise
Purchase, Precious Metals, Timeshare Exit, Adoption Costs, Immigration
Cost, P2P Lending, Day Trading.

These don't share one shape — they're not all "gig economy." Building a
single new domain off them would repeat the mistake BUG-005 already warned
against. This needs a real taxonomy decision (how many new domains, which
groupings) before any code — product/Founder call, not an engineering one.

### (b) Substring/keyword contamination — confirmed bug, cheap fix

`detectDomain()`'s regexes in `src/engine/querysynthesis.js` have no word
boundaries. Confirmed: the AUTO regex (`/car|vehicle|suv|.../`) matches
"car" inside "card"/"cards" — a credit-card-debt-consolidation query
("$32,000 in credit card debt across 5 cards") fired the AUTO synthesizer
and produced "regional dealer network," "dealer margin," "MSRP" advice for
a debt question that has nothing to do with vehicles.

This is the same bug class as WO-1724 (ARK substring match in keyword
ingress) but in `querysynthesis.js`'s own router, not `normalizer.js`. Fix
shape: audit all 7 domain regexes for unbounded short tokens (`car`, `home`
already has a partial guard, `ira` risks matching "**ira**te" or names like
"M**ira**", `bath` risks matching "**bath**room" fine but also potentially
other compounds) and add `\b` word boundaries where missing. Low risk,
mechanical, no taxonomy judgment required — this could ship independently
of (a)/(c).

### (c) Content-model mismatch on correct routing — found, not yet scoped to fix

Even when a keyword match is "correct" (the word is genuinely present),
the synthesizer assumes one specific transaction shape that doesn't fit
every query containing that word:

- **Divorce equity split** → REAL_ESTATE (via "house"/"mortgage") — model
  assumes a *buyer* taking out a *new* loan, not two co-owners splitting
  existing equity.
- **Landlord renting out a condo** → REAL_ESTATE (via "condo"/"mortgage") —
  model assumes a purchase decision, not a cash-flow-on-existing-asset
  question.
- **Solar ROI on an owned house** → REAL_ESTATE (via "house") — model
  computes a full PITI/loan breakdown for a $28,000 solar quote, not
  payback-period economics.
- **Co-signing an auto loan** → AUTO (via "auto") — model assumes the
  *primary borrower* buying a car, not a *guarantor's* risk exposure.
- **Inherited IRA RMDs** → RETIREMENT (via "IRA") — model assumes
  accumulation-phase savings-gap math, not distribution-phase RMD rules.
- **Reverse mortgage income** → REAL_ESTATE (via "mortgage") — model
  assumes a forward purchase loan; combined with (no price/down floor, see
  below) produces the catastrophic negative-loan output confirmed in this
  session: `$68 purchase, $480,000 down (705882%). Financed: $-479,932`.

This is harder than (a) or (b) — it's not "missing a domain" or "fix a
regex," it's "one synthesizer per domain assumes one transaction shape, and
real queries have several." No fix shape proposed yet; needs its own
design pass (e.g., sub-routing within a domain by transaction type, or a
shared "plausibility floor" on extracted numbers regardless of domain — the
REAL_ESTATE `price`/`down` fields have no minimum-value guard at all, unlike
AUTO's `n >= 1000` filter, which is why bare ages keep getting bound as
home prices).

## Recommendation

Treat (b) as its own small, low-risk fix — ship independently, no taxonomy
decision needed. Treat (a) and (c) as open product/architecture questions
requiring Founder input before any code: (a) needs a taxonomy decision on
how many new domains and what they cover; (c) needs a design decision on
whether domains gain sub-routing by transaction type or whether a shared
numeric-plausibility-floor guard (mirroring AUTO's `>=1000` filter) is
applied universally first as a cheaper partial mitigation.

## Not started

No code written for (a), (b), or (c). This document is scope only.
