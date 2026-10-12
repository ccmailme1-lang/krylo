# Routine-query acceptance population v1: PROPOSED (not frozen)

Date 2026-10-11 · Status: PROPOSED for the Founder's "freeze". Written before any implementation of the next capability, as required. Separate from the 35 frozen benchmark cases (specs/benchmark/); same frozen 10-point rubric and scoring procedure; reported separately; baseline and rules preserved; independent scores kept apart.

## First user (decision of 2026-10-11)
A senior finance professional doing company-level structural analysis for an investment or strategic decision: who owns, finances, influences, supplies, partners with or competes with the company; what is forming or changing across the six domains; what is established, inferred, contradicted or unresolved; what it implies for position, dependencies, exposure and options; which evidence supports each finding and what is unknown.

## Selection method (fixed here)
- 10 existing benchmark subjects, two queries each = 20.
- 10 query patterns, each used exactly twice: P1 broad overview, P2 ownership and control, P3 capital events and financing, P4 technology relationships, P5 labor and leadership, P6 knowledge and intellectual property, P7 media and public attention, P8 change over time, P9 cross-domain relationships and significance, P10 evidence gaps, contradictions, absence of formation.
- A subject is paired with a pattern its actual source coverage can address at least partly, and at least eight queries are deliberately ones the product cannot fully answer today (marked G in the table: a domain with no admitted relationship type). They stay in the set whatever happens; none is replaced after implementation, and a case that cannot reach 8 is reported with its cause (evidence gap, missing type, matching failure).
- Wording is a natural question a finance professional would ask, with no scoring-aware phrasing. Registry-resolved subjects: Oracle, Tesla, Boeing, Verizon, Costco, Netflix, Boston Scientific, Sysco, Broadcom (admitted at runtime in some sessions), Intel (runtime-admitted). Strong evidence: Oracle, Intel (capital events). Weak: Costco, Netflix.

## The 20 queries

| ID | Subject | Pattern | Query | Expected coverage today |
|---|---|---|---|---|
| R01 | Sysco | P1 | What is the overall structural picture around Sysco across ownership, capital, technology, labor, knowledge and media? | G |
| R02 | Sysco | P8 | Which of Sysco's disclosed ownership positions have changed over the last two years, and which are unresolved? | covered (ownership) |
| R03 | Oracle | P3 | Who has Oracle raised capital through in its recent offerings, and what do the filings say about those arrangements? | covered (capital) |
| R04 | Oracle | P9 | How do Oracle's financing relationships connect to who owns it, and what does that connection support? | covered (capital, ownership) |
| R05 | Tesla | P5 | What leadership changes has Tesla disclosed recently and who is involved? | G (labor) |
| R06 | Tesla | P4 | What technology relationships or dependencies can be established for Tesla from public evidence? | G (technology) |
| R07 | Costco | P10 | What is established, and what is not, about the structure around Costco? | covered (ownership), mostly absence |
| R08 | Costco | P2 | Who holds or controls a disclosed stake in Costco and how has that changed? | covered (ownership) |
| R09 | Boeing | P8 | What changed in Boeing's ownership and financing structure in the last twelve months? | covered (ownership, capital) |
| R10 | Boeing | P9 | Which connections between Boeing's ownership and its capital events are established and which are only inferred? | covered |
| R11 | Verizon | P2 | Who are Verizon's disclosed beneficial owners and are any of those positions ending or reconfigured? | covered (ownership) |
| R12 | Verizon | P7 | What public-attention signals around Verizon can be tied to a specific relationship or event? | G (media) |
| R13 | Intel | P3 | Which counterparties are named in Intel's recent capital events and how certain is each identification? | covered (capital) |
| R14 | Intel | P6 | What knowledge or intellectual-property relationships connect Intel to other participants? | G (knowledge) |
| R15 | Broadcom | P1 | What structural relationships are forming around Broadcom across all six domains? | partly (ownership only) |
| R16 | Broadcom | P4 | What technology relationships and dependencies connect Broadcom to other companies? | G (technology) |
| R17 | Netflix | P7 | What can be established about public attention to Netflix that connects to its capital or ownership events? | G (media) |
| R18 | Netflix | P10 | Where does the evidence about Netflix's structure contradict itself or run out? | partly |
| R19 | Boston Scientific | P5 | What leadership and labor-related relationships can be established for Boston Scientific? | G (labor) |
| R20 | Boston Scientific | P6 | What knowledge and intellectual-property relationships can be established for Boston Scientific? | G (knowledge) |

G count: R01, R05, R06, R12, R14, R16, R17, R19, R20 = 9 cases expected to be capped by missing types today.

## Scoring (fixed before implementation)
Each query scored with the frozen rubric (scorer 1 rules, `specs/benchmark/scoring-rules.md` and the m1 rules), separately from the 35-case benchmark, each individually; every score below 8 listed with its root cause; averages never hide a failure. Independent blind scores (finance professionals) recorded separately. This file defines the population only; it does not adopt the v0.4 "every case at or above 8" gate. That gate stays proposed until ratified explicitly.

## Open for the Founder
1. Say "freeze" (or edit rows) and this becomes the frozen set; after that rows are not replaced.
2. Pattern-to-subject pairing is mine (source fit); change any you want before freezing.
