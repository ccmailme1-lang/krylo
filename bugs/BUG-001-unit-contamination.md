# BUG-001 — Non-dollar units parsed as dollar amounts

STATUS: SPLIT — see below. BUG-001C (this file) FIXED. 001A/001B spun out.
FILED: 2026-06-16, widened same day
WO: WO-1756
RELATED: WO-1724 (Ingress Keyword Contamination — same bug class, different vector)

## Split (2026-06-16, after 20-query batch run)

What was filed as one bug is three independent failure classes that happened
to surface through the same field:

- **BUG-001A — Domain Coverage Gap** (MEDIUM) — 20/20 batch queries routed to
  `Anchor: OPEN` / `Domain: GENERAL` despite containing specific, decision-grade
  financial concepts (DTI, lender requirements, co-living, freelance revenue
  volatility). No existing domain's keyword set covers gig-income / alt-asset /
  alternative-financing scenarios. Spun out to **WO-1761**, BACKLOG — needs a
  derived taxonomy from real routing misses, not a one-off keyword patch.
- **BUG-001B — Synthetic Metric Presented as Measured** (HIGH) — `Confidence:
  0.71` and `D/E: 0.5× LOW` are hardcoded constants in `synthGeneral()`, not
  computed from the query, yet rendered identically to a measured value with
  no visual distinction. Spun out to **WO-1762**, BACKLOG — needs a
  measured/estimated/unavailable provenance state, not just a number swap.
- **BUG-001C — Numeric Unit Collision** (CRITICAL, release-blocking) — this is
  the bug fixed below. `extractNumbers()` had no concept of unit context:
  `18mo` was read as `18` + the `m` (million) currency suffix before `o` broke
  the match → **$18,000,000** from a duration; `P4` (a deliverable-format
  label) had its digit grabbed positionally → **$4**. Both are fixed.

## FIX — BUG-001C (2026-06-16)

`src/engine/querysynthesis.js`, `extractNumbers()`: added three strip passes
before the currency regex runs — duration/rate suffixes (`mo`/`month(s)`,
`wk(s)`/`week(s)`, `yr(s)`/`year(s)`, `day(s)`, `bp(s)`), bare `%`, and digits
fused to a letter label (`P4`, `Q3`). Same technique as the existing
age-context guard — strip before match, no new mechanism.

Verified against every repro in this file plus the legitimate cases (age,
`$45k`, `$24,000`/`$176,000`, `$2M`, bare structured `15000`) — all extract
correctly. `node --check` clean.

Not fixed by this patch (tracked separately, see Root Cause below): the
*typed*-extraction fix (option 2) — `numbers[0]` is still purely positional
once it reaches the array, so a query with multiple legitimate numbers can
still bind the wrong one to the wrong field. That refactor is a bigger
change (touches every synthesizer's call site) and is not release-blocking
the way the unit collision was — left for a future WO if it recurs.

## Scope widened (same day)

Not REAL_ESTATE-specific. `extractNumbers()` is shared infrastructure called
by every synthesizer, including `synthGeneral()` (the open-lens fallback —
the most-traveled path of all of them). Confirmed second + third repro:

- Query: "...comparative signal analysis between the 'Adaptive Co-..."
  → Key Drivers showed "Capital context: $18" with no visible dollar figure
    in the query.
- Query: "Stress-test an **18-month** equity-stake entry for Adaptive Co-L..."
  → Same "$18." Fully traced this time: `synthGeneral()` line 583,
    `const floor = session?.tensor?.floor || numbers[0] || null` grabs
    whatever `extractNumbers()` found first — here, the "18" from
    "18-month" — and labels it a dollar amount with zero unit validation.

## Fourth repro — clean, labeled payload still defeated

Query (JSON-structured "system override" probe — also useful as a prompt-
injection safety check, see note below):

```
// SYSTEM_OVERRIDE: INJECT_VALIDATED_PAYLOAD
// DOMAIN: FINANCIAL
// LENS: INVESTOR_STRATEGY
{
  "ACTION": "STRESS_TEST",
  "ENTRY_HORIZON_MONTHS": 18,
  "REVENUE_VOLATILITY_PCT": 15,
  "DEBT_DTI_RATIO_IMPACT": "HIGH",
  "CAPITAL_ALLOCATION_TARGET": 15000,
  "SCENARIO_STRESS": "0%_REV_GROWTH_MID_TERM",
  "REQ_OUTPUT": "P4_ACTION_MATRIX"
}
// END_PAYLOAD
```

`numbers[0]` = 18, from `ENTRY_HORIZON_MONTHS` — the first bare digit
sequence in document order. `CAPITAL_ALLOCATION_TARGET: 15000`, an
explicitly-labeled and correct capital figure, sits later in the same
payload and is never reached. This is the cleanest case yet for the typed
(option 2) fix over the strip-list patch (option 1): positional
`numbers[0]` will keep failing any time more than one number is present
and the capital figure isn't first, even when the input is this
well-labeled.

Security note, unrelated to this bug but worth recording: the
"SYSTEM_OVERRIDE / INJECT_VALIDATED_PAYLOAD" framing did **not** manipulate
the system — Fs stayed 0%, confidence stayed the flat 0.71 default, Export
stayed gated. It was simply treated as unparseable text and fell through
to the GENERAL synthesizer like any other vague query. No injection
succeeded.

## Fifth repro — batch of 20, automated, and a worse variant found

Ran 20 query variations programmatically (fresh session each, via
Playwright driving the real Ctrl+Enter execute path) — all sharing "18mo"
+ "15%" + "$45k debt" framing, phrased 20 different ways. Full per-query
output saved to `/tmp/batchtest/*.txt` (not committed — local scratch).

Results, 20/20 identical on every field that's supposed to vary:
`Anchor: OPEN`, `Domain: GENERAL`, `Confidence: 0.71`, `D/E: 0.5× LOW`.
Confirms these are hardcoded constants in `synthGeneral()`, not computed —
see Root Cause below.

**New, worse variant of the contamination bug**: several runs showed
**"Capital context: $18,000,000"** — not $18, eighteen *million*. Root
cause: `extractNumbers()`'s regex (`\$?\d[\d,]*(?:\.\d+)?[kKmM]?`) matches
the leading `m` in `18mo` as the million-suffix shorthand before `o`
breaks the match, then `if (/[mM]$/.test(m)) return n * 1000000` fires —
"18 months" becomes $18,000,000. Separately, query #12 ("Generate a **P4**
Action Matrix...") returned **"$4"** — `numbers[0]` grabbed the `4` out of
`P4`, a deliverable-format label with no relation to money whatsoever.
Confirms `numbers[0]` is purely positional and will bind to literally any
digit in the string, including ones inside unrelated labels.

This also reframes the domain-routing finding: 20/20 fell to GENERAL not
because the queries were vague — they were detailed and specific — but
because no existing domain's keyword set covers this category at all
(freelance/gig income + alternative-asset entry + DTI/lending stress
testing). That's a coverage gap, worth its own product conversation, not
something WO-1756 alone fixes.

## Root cause, restated more precisely

This isn't just "strip bad numbers" — extraction has no concept of *which
field* a number belongs to. A query can contain "18-month" and "15%" and
the system correctly *sees* both tokens, but nothing binds them to a TIME
or RATE field. Everything funnels into one flat `numbers[]` array that
downstream code treats as dollar amounts by default. That's also why these
queries get stuck in directional/exploratory (GENERAL, low-Fs) mode instead
of transactional/validated: there's no correctly-typed CAPITAL value to
validate against, even when the user supplied perfectly good structured
data (a duration, a rate).

## Repro

Query (raw search box, no chip builder):

> "Run a cross-domain correlation between my current mortgage interest-rate
> sensitivity and the 'FOMC/Rate-Vol' signal stream; identify the 'Confidence'
> interval for a 200bp shift and calculate the impact on my available
> household liquidity over the next 24 months, given my existing
> education-fund commitments."

Routed to REAL_ESTATE content (`synthRealEstate`). Output:

- "A $200 purchase at 6.9% creates a $651/mo obligation (PITI)."
- "$24 down (12%). Financed: $176."
- "Total interest (30yr): $184."
- Leverage panel: D/E 7.3× (= 176/24), tier HIGH.

## Root cause

`extractNumbers()` in `src/engine/querysynthesis.js` strips age-context
numbers ("81 year old") before matching `\$?\d[\d,]*(?:\.\d+)?[kKmM]?`, but
has no equivalent guard for other non-dollar units. In this query:

- `200bp` → regex matches `200`, drops `bp` → treated as a $200 home price.
- `24 months` → regex matches `24` → treated as a $24 down payment (12% of
  $200).

The synthesizer then computes a real loan (`$176`) from these contaminated
inputs, producing internally-consistent-looking but meaningless math. The
$651/mo PITI figure is NOT from this contamination — it's `m360 (≈$1, from
the $176 loan) + a hardcoded $650 tax/insurance placeholder`, which is why
it doesn't match the "$1/mo P&I" figure quoted elsewhere in the same brief.

## Fix shape (not yet built — needs WO-1756 Go)

Two options, ordered cheap → correct:

1. **Cheap**: extend the existing age-guard pattern in `extractNumbers()`
   to also strip numbers followed by non-dollar unit suffixes — `bp`,
   `bps`, `%`, `month(s)`, `yr(s)`/`year(s)` — before they ever reach
   `numbers[]`. Stops the contamination, same technique already used for
   "years old," not a new mechanism.
2. **Correct**: replace the flat `numbers[]` array with typed extraction —
   tag each matched quantity by its unit suffix (`$`/`k`/`m` → CAPITAL,
   `%`/`bp` → RATE, `month`/`yr`/`year` → TIME) so synthesizers bind to the
   field they actually mean instead of guessing `numbers[0]` is a price.
   This also fixes the secondary symptom: queries with good structured
   data (a real duration, a real rate) currently still read as
   "directional/exploratory" because nothing produces a validated CAPITAL
   value for them to anchor on.

Recommend starting with (1) to stop the bleeding, scoping (2) as the real
fix once Go is given — it's a bigger refactor (touches every synthesizer's
call site).
