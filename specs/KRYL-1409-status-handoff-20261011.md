# KRYL-1409 (ACQUIRED producer): status at the end of 2026-10-11

State: IN PROGRESS, partly built, NOT wired into the live path, nothing delivered as coverage. Local, unpushed. Founder gave GO 2026-10-11 (ACQUIRED producer through the existing counterparty matching and admission path; no parallel pipeline). KRYL-1410 stays in Backlog (needs the PatentsView key, provisioned by the Founder, never printed or committed). Routine-query set v1 is FROZEN (specs/benchmark/routine-query-set-v1-FROZEN-20261011.md).

## Built
- `src/engine/connectors/edgar8kacquisition.js` (pure): reads Item 1.01 (merger and purchase agreements, PENDING) and Item 2.01 (completed acquisitions, CLOSED) from the Item text; finds the other principal, which side the filer is on, the deal status and the passage; skips with a stated reason (NO_ACQUISITION_AGREEMENT, DISPOSITION, AMBIGUOUS_DIRECTION, AMBIGUOUS_COUNTERPARTY).
- `edgar8kcontent.js`: Item headings now match in upper case ("ITEM 1.01 ENTRY INTO ..."); qa_capitalevent_extraction still 44/44, qa_capitalevent_admission 26/26.
- Real filings saved as fixtures: `tests/fixtures/sec/8k-acq-*.htm` (public SEC 8-Ks of Verizon, Boston Scientific, Broadcom, Intel, Netflix, Boeing, Sysco, Tesla).

## Result of the extractor on those filings (no test file written yet)
Correct: Boeing 2024-07-01 (Spirit AeroSystems Holdings, Inc.), Boston Scientific 2024-01-08 (Axonics, Inc.) and 2026-01-15 (Penumbra, Inc.), Netflix 2026-01-20 (Warner Bros. Discovery, Inc.), Sysco 2026-03-30 (JRD Unico, Inc., private, will not match). Correctly NOT acquisitions: Boeing NPA, Broadcom credit agreement, Intel DOC warrant agreement, Tesla indemnification, Intel Altera and SK hynix completions (dispositions).
Still wrong or skipped (to fix next): Verizon-Frontier 2024-09-05 and Netflix 2025-12-05 (AMBIGUOUS_COUNTERPARTY: the principal list still picks up more than one other party), Broadcom-VMware 2.01 completion 2023-11-22 (AMBIGUOUS_DIRECTION: "VMware, Inc. ("VMware")" has no legal description and the subsidiary clauses of the Merger Subs need reading).

## Not yet done (in order)
1. Fix the three skipped cases above; write `qa_acquisition_extraction.mjs` over the saved fixtures (positives, negatives, the three direction cases).
2. Wire the extractor into the same document read (`extractCapitalEvent` adds `acquisition`), plus a small extra read budget for Item 1.01/2.01 filings beyond the newest eight capital-event filings (acquisition-only, so Oracle-type capital counts do not change).
3. `admitAcquisitions` beside `admitCapitalEvents` in `capitaleventadmission.js`: match the other principal (confirmed identity only), build the ACQUIRED assertion (part = acquirer, target; nuState dealStatus; provenance accession, item, passage, matching outcome), admit via `admitAndProject`; unresolved or private targets reported, never admitted.
4. Relationship text and detail lines for ACQUIRED (`canonicalrelationshiptext.js`, MAP sentence exists), a DOCUMENTED synthesis statement, admission report entries, History check.
5. Live acceptance: at least one real company other than Sysco with a persisted, subject-bound ACQUIRED relationship that reaches the snapshot, Analysis, MAP and History (candidates: Boeing-Spirit, Netflix-Warner Bros. Discovery, Boston Scientific-Penumbra, Verizon-Frontier; each depends on the other party matching an SEC registrant); existing ownership and capital relationships score identically (Oracle 10, Broadcom 6, Ford 2).
6. Ticket to Review only after step 5 passes.
