# Priority queue (proposed, 2026-10-08). Founder confirms or reorders.

Jira is the record (project KRYL). Two flavors: requests are `KRYL-xxxx` (Task); defects are `DEF-xxxx` (Bug, same number as the key). Order = trust damage to a guest first, then what unblocks others, then polish. Statuses below are Jira as of this date; "built on Dev" means committed locally, not pushed, not deployed.

| # | Ticket | Type | What it is | State | Why this rank | Needs from the Founder |
|---|---|---|---|---|---|---|
| 0 | (action) | Action | Push local `main` to GitHub | 17+ local commits | Claude Web works from stale `main` and its drafts are wrong because of it | "push" |
| 1 | KRYL-1372 | Request | Query Contract (wrong subject on four production fixtures) | v1 built on Dev, Backlog | A guest is shown the wrong subject; blocks KRYL-1370 results | Validate in the live app; name the deal-evaluation objective; re-save spec (full text is in `specs/`) |
| 2 | DEF-1375 | Defect | Pool: repeat ids dropped, 5-min window < 15-min EDGAR poll | refresh fix built on Dev; window value open; not on Prod | The MAP empties on Prod after about 5 minutes | Window value (30 min proposed) and a Deploy-to-Prod ticket path |
| 3 | KRYL-1371 | Request | MAP cleanup per mockup | built on Dev, Backlog | Largest guest-visible change; ready to validate | Validate on localhost; then status moves |
| 4 | DEF-1369 | Defect | Brief sentence: field level vs subject level | built on Dev, Backlog | Spec section 17 divergence, fixed | Validate; status move |
| 5 | KRYL-1368 | Request | MAP brief/legend/scrubber layout | built on Dev (overlaps 1371), Backlog | Reconcile with 1371 so Jira matches the code | Say whether to close as covered by 1371 |
| 6 | DEF-1373 | Defect | Classifier placeholders, TURBULENT unreachable, MAP legend | not started | Legend currently shows states the MAP cannot draw | Define T (temporal alignment) |
| 7 | KRYL-1370 | Request | JPMorgan benchmark classification | 14 queries run, provisional | Informs 1372 and 1373 | Go on reviewing per-domain evidence |
| 8 | DEF-1374 | Defect | Possessive grammar ("nvidia's") | not started, Lightweight | Quick, no decisions | Go |
| 9 | KRYL-1376 | Request | MAP 0.72 scale vs section 7 text sizes | not started | Contract question on screen sizes | Choose (a) or (b) |
| 10 | KRYL-1377 | Request | Header state label beside unresolved subject | investigation | Possible section 17 mismatch | Go |
| 11 | KRYL-1365 | Request | Scrubber change marks | on Prod since 10-05, browser check open | Verification only | Prod check |
| 12 | DEF-1366 | Defect | Chip placement | superseded in practice by 1371 (chip moved into the brief row) | Housekeeping | Close as superseded? |
| 13 | KRYL-1367 | Request | Reskin exploration | approval gate | Waiting on palette decisions | Palette and type decisions |
| - | DEF-1359, DEF-1360, KRYL-1361, KRYL-1362, KRYL-1363, KRYL-1358 | Mixed | Filed 10-05 | Backlog / In Progress (1358) | 1359/1360 are the subject-scope defects now covered by 1372 | Confirm 1359/1360 fold into 1372 |
| - | DEF-1364 | Defect | MAP blank until refresh | Done | - | - |
