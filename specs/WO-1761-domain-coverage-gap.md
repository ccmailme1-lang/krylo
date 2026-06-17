# WO-1761 — Domain Coverage Gap (Gig-Income / Alt-Asset) — SCOPE

STATUS: (a) BACKLOG — taxonomy decision required. (b) COMPLETE — 2026-06-16. (c) BACKLOG — design decision required.
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
shape: audit all 7 domain regexes for unbounded short tokens and add `\b`
word boundaries where missing. Low risk, mechanical, no taxonomy judgment
required — this could ship independently of (a)/(c).

**Confirmed vectors (updated 2026-06-16, batch IDs 81–100 — formatted pass):**

| Token fired | Source word(s) | Domain contaminated | Notes |
|-------------|----------------|---------------------|-------|
| `car`       | "card/cards"   | AUTO                | Prior batch (original finding) |
| `ira`       | "irate"        | RETIREMENT/INVESTOR | 19/20 queries — all with "irate" |
| `ford`      | "afford/affordable" | AUTO           | 19/20 queries — query 81 clean (no "affordable") |
| `rent`      | "parent/parents" | REAL_ESTATE      | Starts at ID 87, not 97 (earlier than first reported) |
| `rent`      | "current/currently" | REAL_ESTATE   | cu-r-RENT suffix — IDs 82,86,88,91,98 |
| `rent`      | "transparent"  | REAL_ESTATE         | transpa-RENT suffix — IDs 84,89,93,98 |

**Key diagnostic — query 84:** `"Transparent appraisal of an affordable car for an irate migrant."`
Contains zero instances of the word "rent" yet fires `rent` in the trigger list.
Source confirmed: `transparent` ends in the substring "rent". This is the clearest
proof of the word-boundary failure mode.

**Key diagnostic — query 97:** fires `rent` THREE times.
Sources: "rent" (literal) + "parent" (pa-RENT) + "current" (cu-r-RENT).
Nine total triggers — highest contamination density in the batch.

**`ira` double-fire** in queries 92, 95, 97: both "IRA" (legitimate) and "irate"
(contamination) present in same query, producing duplicate token.

**Fix shape (unchanged):** `\b` word boundaries on all short tokens in
`detectDomain()` regexes. The `rent` vector now has four confirmed source words
(`parent`, `transparent`, `current`, `renting`) — all resolved by a single
boundary guard on `\brent\b`.

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

## Additional findings — batch IDs 161–180 (2026-06-16)

### `marketing` → `market` substring confirmed

Query 169 fires both `market` AND `marketing` as separate tokens from the
word "marketing" — "marketing" contains "market" as a prefix. Same
word-boundary failure class as the other vectors in section (b). Fix:
add `\bmarket\b` to the boundary guard pass.

| Token fired | Source word   | Domain contaminated | Notes |
|-------------|---------------|---------------------|-------|
| `market`    | "marketing"   | MARKET/CAPITAL      | Confirmed Q169 — fires alongside `marketing` as two separate tokens |

### Proper noun bleed — filed as WO-1764

"Google" fires as a domain trigger in all 20 queries in batch 161–180.
Not a substring issue — clean proper noun. Logged separately in
`specs/WO-1764-proper-noun-bleed.md`. Fix shape: `PROPER_NOUN_EXCLUSIONS`
set in `detectDomain()` before keyword scoring.

### `health` from `terminally ill` — working correctly

Queries 162, 164, 172 fire `health` via "terminally ill." This is the
protected entity detector functioning as designed. First confirmed true
positive in the batch series.

## Additional findings — batch IDs 101–120 (2026-06-16)

### `veteran` — domain-priority conflict, not a substring bug

"Veteran" fires as its own keyword in every query in the 101–120 batch. It
is a clean word (no substring contaminants). The issue is domain destination:
veteran benefits (VA, GI Bill, disability ratings, VA home loans, TAP
transition) has no matching synthesizer and falls to HEALTH or GENERAL — both
wrong. Founder confirmed: VETERAN needs to be its own domain. Filed as
WO-1763.

### `parent` fires as its own keyword

In queries 108, 110, 111, 113, 114, 115, 119, 120 — "parent" appears as a
standalone trigger token in addition to contributing `rent` via the pa-RENT
substring. Something in the keyword set is matching "parent" directly, likely
a caregiver/pediatric HEALTH signal. Correct in a medical context; false
positive in car/rent/appraisal queries. Needs a keyword audit to identify
which regex is matching it and whether a domain guard is needed.

## Not started

No code written for (a), (b), or (c). This document is scope only.
WO-1763 (VETERAN domain) filed separately.
