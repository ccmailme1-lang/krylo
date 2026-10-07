# KRYLO — Problem Markets

**Status:** DRAFT (2026-10-07). Subordinate to `specs/PROBLEM-STATEMENT-and-commercial-funnel.md`
(FROZEN). Positioning: `docs/product/positioning.md`.

**Read this first.** Each section states (a) the industry's structural problem, (b) what KRYLO
presents, and (c) a **real event** proposed as a retrospective test subject. No retrospective test
has been run. Nothing below claims KRYLO detected, would have detected, or produced value on any
real event. Results, when run, go to `docs/evidence/evidence-log.md`.

Industries are **subjects**, not buyers. The buyer is the professional whose job is to detect
change (gtm-strategy.md §2).

---

## The common problem

Every industry below has the same failure mode: the relevant signals already exist, spread across
sources organized by domain, and nobody sees them assembled into structure until the consequence
is public. The industry changes. The problem — **the distributed answer** — does not.

```
SIGNAL → RELATIONSHIP → FORMATION → PROPAGATION   │   GUEST → INTERPRETATION → DECISION
```

---

## 1. Semiconductors & advanced electronics

**Structural problem.** Tier-1 buyers see their direct suppliers. They usually cannot see that
several "diversified" suppliers share a lower-tier dependency — one region, utility, chemical
input, equipment vendor, or corridor. Diversification on paper is not structural diversification.

**What KRYLO presents.** Relationships between observations across TECHNOLOGY, CAPITAL,
OWNERSHIP, and LABOR that indicate shared dependency, and the paths along which a disruption at
that shared node propagates. KRYLO does not tell the buyer where to source or what to hedge.

**Retrospective test candidate — 2021 Texas winter storm (Uri), Feb 2021.** Grid failure shut
Austin-area fabs (Samsung, NXP, Infineon) and Gulf Coast petrochemical plants, with downstream
resin and chip effects that year. Test: given only observations available before and during the
storm, does KRYLO admit relationships connecting the energy event to downstream electronics and
materials exposure, and when?

**Second candidate — 2011 Tōhoku earthquake (Mar 11, 2011).** Damage to Renesas' Naka fab was
widely reported as disrupting automotive microcontroller supply. *Market-share figures must be
sourced before use.*

## 2. Biopharma & healthcare

**Structural problem.** A clinical, regulatory, or reimbursement signal rarely stays inside the
entity where it starts. It can move through treatment economics → payer incentives → prescribing →
procurement → revenue → pipeline funding → valuation → M&A. Each event is tracked separately;
whether they form a connected chain is left to the analyst.

**What KRYLO presents.** Admitted relationships across KNOWLEDGE (research, trials), CAPITAL, and
OWNERSHIP showing whether a scientific or regulatory signal is connecting to commercial and
corporate structure. KRYLO does not price or approve a deal.

**Retrospective test candidate.** *To be selected* — a documented case where published clinical or
regulatory evidence preceded a material change in an incumbent's position or a deal's terms.
Selection criterion: pre-event evidence is public and dated. No candidate is named until sourced.

## 3. Defense, aerospace & advanced technology

**Structural problem.** Strategic capability increasingly emerges at intersections — commercial
space, semiconductors, AI, telecom, cloud — outside traditional defense primes. Monitoring known
actors misses newly important ones.

**What KRYLO presents.** Cross-domain relationships (TECHNOLOGY, CAPITAL, OWNERSHIP, KNOWLEDGE)
showing which entities are becoming connected to a capability area, and which existing structure
those connections alter.

**Boundary.** KRYLO has no classified, signals-intelligence, or satellite-telemetry sources. Any
defense use is limited to open evidence (patents, contracts, filings, research, hiring).

**Retrospective test candidate.** *To be selected* from open-source evidence (e.g. federal contract
awards, patents, research output) around a commercial entrant becoming a defense supplier.

## 4. Automotive & mobility

**Structural problem.** The question is not "is EV/SDV adoption rising" but **which relationships
in the legacy structure are turning from assets into liabilities** — supplier commitments,
factory utilization, dealer-franchise structure, software capability, battery inputs.

**What KRYLO presents.** Relationships across LABOR (hiring mix), TECHNOLOGY (patents, software),
CAPITAL, and OWNERSHIP showing whether an OEM's structure is reorganizing in step with the shift it
announces — or not. KRYLO presents the alignment or misfit; it does not rate the OEM.

**Retrospective test candidate — 2021 Tōhoku/chip-shortage overlap** (see §1), or an OEM software
program publicly delayed or restructured. *Specific program to be sourced.*

## 5. Global logistics & supply networks

**Structural problem.** Logistics operators have abundant real-time data — congestion, closures,
weather, fuel. Data is not structural understanding: *which relationships make this disruption
matter to this business?*

**What KRYLO presents.** Propagation paths from an event across route → carrier → port → supplier
→ manufacturer → contract, using available observations.

**Retrospective test candidate — Ever Given, Suez Canal, Mar 23–29, 2021.** Test: which downstream
relationships does KRYLO admit from observations dated during the blockage week?

## 6. Media & ownership (added)

**Structural problem.** Media consolidation changes control of distribution, content, and
regulatory exposure at once; deal analysis is usually split by function (legal, financial,
content).

**Retrospective test candidate — Paramount / Skydance** (announced July 2024; closed Aug 2025
following FCC approval). Test: relationships across MEDIA, OWNERSHIP, and CAPITAL in the period
between announcement and close. *Dates to be re-verified against primary sources before external
use.*

## 7. Government & resilience (added)

**Structural problem.** Multiple systems begin to experience the same pressure before officials
see it as one situation.

**Retrospective test candidate — Nepal, September 2025.** A social-media ban was followed by mass
youth-led protests and the Prime Minister's resignation. Test: did MEDIA and LABOR observations
(youth unemployment, emigration, platform activity) show related pressure before the ban?
*Dates and sequence to be verified against primary sources before external use.*

---

## Summary matrix

| Subject | Structural problem | What KRYLO presents | Retrospective candidate | Status |
|---|---|---|---|---|
| Semiconductors | Hidden shared lower-tier dependency | Shared-dependency relationships + propagation | Texas freeze 2021; Tōhoku 2011 | Not run |
| Biopharma | Signal-to-commercial chain is opaque | Cross-domain chain from evidence to corporate structure | To be selected | Not selected |
| Defense / aerospace | Capability emerges outside known actors | Newly connected entities (open sources only) | To be selected | Not selected |
| Automotive | Legacy relationships becoming liabilities | Alignment/misfit between announced shift and structure | To be sourced | Not selected |
| Logistics | Data without systemic exposure | Event propagation paths | Ever Given 2021 | Not run |
| Media / ownership | Consolidation split across functions | Ownership-media-capital relationships | Paramount/Skydance | Not run |
| Government | Same pressure across separate systems | Convergent pressure across domains | Nepal Sept 2025 | Not run |

## Domain mapping note

"Regulatory", "geopolitical", and "supply" are not domains. They are observed through connectors
that feed the six locked domains. Connector modules present on disk include (by file name):
`fdaconnector`, `fecconnector`, `usaspendingconnector`, `gdeltconnector`, `supplychainconnector`,
`maerskconnector`, `eiaconnector`, `patentsviewconnector`, `secownershipconnector`,
`edgar8kconnector`, `fredconnector`, `blsconnector`, `usajobsconnector`, `openalexconnector`,
`pubmedconnector`. Which domain each feeds, and whether each is live, is **not runtime-traced** in
this document (verification level: lexical).
