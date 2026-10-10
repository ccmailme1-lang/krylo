# Broadcom rating, build 25ccc17 (localhost, Dev)

Date: 2026-10-10 · Query: "What structural relationships are forming around Broadcom across ownership, technology, and capital?" · Rubric: `specs/rubric-alphabet-10of10-20261009.md` · Environment: localhost only; committed (aca23e8, 25ccc17), not pushed, not deployed.

**Overall: 6 / 10, upper edge of the band.** The earlier self-contradiction in the brief is gone. The snapshot gate stays provisional.

## Acceptance criteria for DEF-1396 / DEF-1397 (checked on the rendered brief)

| # | Criterion | Result |
|---|---|---|
| 1 | Each canonical relationship shows form, filing date and accession | Pass. Vanguard Capital Management: SCHEDULE 13G, filed 2026-04-29, accession 0002100119-26-000179. Vanguard Group: SCHEDULE 13G/A, filed 2026-03-26, accession 0000102909-26-000847. |
| 2 | Retrieval basis under Vanguard Group DISSOLVED and Vanguard Capital Management NEW | Pass. Both carry the block from this browser run. |
| 3 | Block shows window, form families, counts, unavailable items, name-narrowed limitation | Pass. Window 2022-10-10 to 2026-10-10; both form families; 2 of 2 windows answered; 15 filings returned; 15 observations built; 0 set aside; 0 documents not obtained; 2 search and 15 document requests; boundary line "not proof that no other filing exists". |
| 4 | Lookup failure notice only on a real failure | Pass. No notice; the lookup settled; 2 relationships listed. |
| 5 | A new lookup does not show a previous lookup's success as current | Untested. Needs a second Broadcom query in the same tab. |

## Rubric table

| Item | Result | Evidence in the payload | Absence class |
|---|---|---|---|
| 1 Temporal change | Partly (upper) | Ownership existence and configuration established with accessions and SEC Release 34-39538. Magnitude "not assessed" (no comparable pair). Four holders INDETERMINATE with reason codes. No temporal comparison for capital events. | c (magnitude); d (capital) |
| 2 Capital structure | Not met | 12 EDGAR_8K observations listed by date only, with no event content or amounts. All three subject measures DATA UNAVAILABLE. | b / d |
| 3 Ownership detail | Partly | Percent of class, CUSIP, form, accession and dates shown. Voting and dispositive rights not shown. | b |
| 4 Cross-domain | Partly | Three pairs co-present. CAPITAL↔OWNERSHIP has dated evidence on both sides. LABOR remains an incomplete lead. Technology appears only as field context. | b |
| Gate: one snapshot | Provisional | The brief no longer contradicts itself. The same query gave 1 pair and CAPITAL magnitude 74 on the earlier run, and 3 pairs and magnitude 78 on this run, with 17 bound observations both times. KRYL-1389 (snapshot freeze) is spec only. | |

## Findings

- **Earlier trace item 2 is closed.** The browser run's own retrieval record matches the Node acceptance trace: 3 new-format plus 12 legacy filings gives 15, with 0 failures. NEW for Vanguard Capital Management rests on a complete 48-month search, now visible to the guest. Limit stated on screen: completeness applies to the name-narrowed SEC search, not proof that no other filing exists.
- **Earlier trace item 1** (why the hook missed the event): cause still Unresolved. This run showed no failure notice and no contradiction. Criterion 5 would test the reset-to-pending behaviour.
- **Pool drift between runs** is the unfrozen-snapshot behaviour. Cause in this pool not traced.

## Reviews compared (Broadcom, earlier build 23b47c8)

| | Review 3 | SAB | Assistant |
|---|---|---|---|
| Overall | 6 | 7 | 6 |
| Temporal | 6 | 8 | Partly |
| Capital | 3 | 6 | Not met |
| Ownership | 7 | 7 | Partly |
| Cross-domain | 4 | 4 | Partly |
| Gate | Not verified | Pass | Fail (provisional) |

## Tickets

- KRYL-1396 / DEF-1396 and KRYL-1397 / DEF-1397: built, tested, committed locally, in Review. Not moved further; only the Founder moves a ticket to Deploy to Prod.
- Open: criterion 5 run; KRYL-1389 build; capital-event wiring; technology evidence binding; DEF-1394.

## Second query, same tab (stamp a6cc65f, 11:21)

- Criterion 5: not decidable from the pasted end state. No failure notice appeared and the RELATIONSHIP CHANGE section was already present. The comparison run is skipped when one for the entity finished within 10 minutes (`topicconnectors.js`), so the section and its retrieval basis are the cached record of the earlier run in this page session (identical counts: 2 of 2 windows, 15 filings, 0 failures). Whether "checking" showed for the lookup in between needs the transient, not the final page.
- Gate evidence, same page: the brief reads CAPITAL 97 observations, magnitude 77, and 173 signals; the By Domain panel on the same page reads "CAPITAL pressure 78 (constructive), 109 signals". Three runs of the same query: pairs 1, 3, 1; CAPITAL magnitude 74, 78, 77; signals 191, 192, 173; bound observations 17 each time. One page disagreeing with itself fails the one-snapshot gate. Cause not traced; KRYL-1389 (snapshot freeze) is spec only.
- Observation: the retrieval basis is labelled "this browser run" but carries no retrieval time, so a cached record up to 10 minutes old reads as current. Not yet a ticket.
