# Acceptance trace: Broadcom ownership classifications back to SEC filings

Date: 2026-10-10 · Read-only trace through the local engine (spaced requests). Subject: Broadcom Inc., CIK 0001730168, admitted by the SEC-filer path (10-K 0001730168-25-000121 filed 2025-12-18, ticker AVGO, rule exact-base-name). T = 2026-10-10: current period 2025-10-10 to 2026-10-10, prior period 2024-10-10 to 2025-10-10, E0 = 2025-10-10, as-of lookback 24 months.

**Fresh session:** in a new process nothing is known; Broadcom and Costco (CIK 0000909832) are admitted again from SEC records (outcome ADMITTED each). Admission is in memory and repeats each session (recorded limitation).

**Retrieval coverage:** complete. New-format family answered (3 filings), legacy family answered (12 filings), 15 observations, 0 excluded, no failed window or document.

| Holder (class CUSIP 11135F101) | Classification | Evidence (accession, reported values, dates) | Check |
|---|---|---|---|
| Vanguard Group Inc | existence DISSOLVED; configuration RECONFIGURED (participants) | E0: SC 13G/A 0000932471-24-000182, 10.03% (468,544,898 shares), filing date 2024-10-04 (event date not recovered, so the filing date is used and labeled). P1: SCHEDULE 13G/A 0000102909-26-000847, 0% (0 shares), event 2026-03-13, filed 2026-03-26, item 5 "5 percent or less" flag set | Positive evidence: the filer's own percent is 0 (the flag alone would not qualify). Its comment states an internal realignment on 2026-01-12 under SEC Release 34-39538 |
| Vanguard Capital Management LLC | existence NEW; configuration RECONFIGURED (participants) | P1: SCHEDULE 13G 0002100119-26-000179, 7.49% (354,715,196 shares), event 2026-03-31, filed 2026-04-29. No filing by this CIK dated on or before 2025-10-10 | NEW requires coverage complete: yes. Its comment cites the same release 34-39538 and lists its affiliates |
| BlackRock Inc | existence INDETERMINATE (NO_CURRENT_OBSERVATION) | E0: SC 13G/A 0001086364-24-004241, 7.4%, filing date 2024-01-26; nothing in the current period | Absence of a filing is not termination: not DISSOLVED |
| Capital International Investors | INDETERMINATE (NO_CURRENT_OBSERVATION) | E0: SCHEDULE 13G/A 0001562230-25-000007, 4.1% (below 5 percent flag set), event 2024-09-30, filed 2025-02-07 | held (4.1% is above 0); no current filing |
| Capital Research Global Investors | INDETERMINATE (NO_CURRENT_OBSERVATION) | E0: SC 13G/A 0001422848-24-000032, 3.8%, filing date 2024-02-09 | same |
| Capital World Investors | INDETERMINATE (NO_CURRENT_OBSERVATION) | E0: SC 13G/A 0001422849-24-000066, 4.6%, filing date 2024-11-13 | same |

## Reading limits (carried into the guest-facing text)
- DISSOLVED here means the Vanguard Group filer reports zero. It does not show that Vanguard sold: the same filing documents a realignment that moves reporting to affiliated entities, and Vanguard Capital Management reports 7.49%. The brief now states this ("does not show the shares were sold, and a related filer may report them").
- Event dates for the 2024 legacy filings were not recovered; the filing date is used and labeled `filing date`.
- Vanguard Portfolio Management (a second successor) has no filing for Broadcom in the window, consistent with a position under 5 percent; this is not established by the filings retrieved.
- The admission provenance (a 2025 annual report) establishes the company's identity only. Each ownership relationship rests on its own filing as listed above.
