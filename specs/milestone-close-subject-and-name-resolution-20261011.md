# Local milestone close: subject selection (DEF-1406) and canonical name resolution (KRYL-1407)

Date 2026-10-11 · Environment: localhost (Dev) · Committed locally, not pushed, not deployed · Tickets: DEF-1406 and KRYL-1407, both in Review (only the Founder moves a ticket to Deploy to Prod).

## 1. Review of the diff

Range `69380e9..d393341` plus `8f63d83`: 20 files, all belonging to the two tickets. No unrelated changes.

| Area | Files |
|---|---|
| Sentence-opener fix (DEF-1406) | `src/engine/querycontract.js`; tests in `qa_querycontract.mjs`, `qa_subjectscope.mjs` |
| Name source and route (KRYL-1407) | `as-diff/secnames.js`, `as-diff/engine.js` (`GET /api/sec-names`), `vite.config.js` (local proxy entry) |
| Matching and verification | `src/engine/secnamematch.js` (pure), `src/engine/secfileradmission.js` (CIK verification, suggestion note), `src/engine/topicconnectors.js` (name lookup binding) |
| Display of the suggestion | `targetpacket.jsx`, `structuralbrief.jsx`, `domainsubstratetabs.jsx` (text only, no new control), `useentityadmissiontick.js` |
| Tests and fixtures | `qa_secnames.mjs` (41), `tests/fixtures/sec/company-tickers-sample.json` (real SEC rows), `scripts/namecheck-acceptance.mjs` |
| Records | proposal, two ticket CSVs, this file |

Review findings and actions:
1. The acceptance script's "unbound suggestion" check was close to vacuous. Tightened: it now requires no formation line and no admitted relationships. Re-run: all 8 cases pass.
2. A redundant first live script (`namecheck-live.mjs`) was removed.
3. Nothing else needed fixing. The route validates name length and returns 400 or 502 errors; it never guesses.

## 2. Matching rules as built (approved 2026-10-11, not reopened)

| Tier | Behaviour |
|---|---|
| Exact legal name | eligible to bind; verified by the filing-index record of that CIK |
| Unique prefix (4+ characters) | a candidate only; binds only after the same CIK verification succeeds |
| Near match (edit distance; misspelt legal suffix tolerated) | suggestion only, never bound: "Closest listed registrant: <NAME>, not assumed." |
| Ambiguous | stays unresolved; candidates listed ("Several listed registrants match: ... None is assumed.") |
| No match, or the route unavailable | falls back to the earlier name-based check |

Suffix tolerance affects suggestions only and can never make a name EXACT.

## 3. Live acceptance (rendered analysis, MAP and stored relationships)

`node scripts/namecheck-acceptance.mjs` (vite :5173, engine :4000): 8 of 8 passed, no page errors.

| # | Query | Result |
|---|---|---|
| 1 | Ford Motor Company, then Ford | both resolve to `ford-motor`, CIK 0000037996; the same 2 admitted relationships, each with that CIK as a participant; MAP shows "2 admitted"; no unresolved-subject line |
| 2 | Ford Motor Compnany, Frod, Fordd | no entity, 0 relationships; subject line ends "Closest listed registrant: FORD MOTOR CO, not assumed."; MAP: "None, because the subject entity is not resolved"; no formation attributed |
| 2 | Tesle | same, with "Closest listed registrant: Tesla, Inc., not assumed." |
| 3 | Meta | resolves to `meta-platforms` through the static registry (3 admitted relationships) |
| 4 | Across all six domains, what formation exists around Oracle? | Oracle selected (not "Across"); 10 admitted relationships; CAPITAL ↔ OWNERSHIP formation |

Evidence limit stated by the output itself: Ford's two relationships are ownership disclosures only, so "No formation established ... one domain only (OWNERSHIP)". No capital events were admitted for Ford in this run.

## 4. Tests run

qa_secnames 41/41 · qa_secfileradmission 22/22 · qa_subjectscope 25/25 · qa_querycontract 83/83 · qa_query_corpus 57/57 · qa_querycontext 22/22 · qa_subjectbinding 18/18 · qa_counterpartymatch 22/22 · qa_capitalevent_admission 26/26 · qa_canonicalstore 19/19 · qa_snapshot_live 46/46. The full benchmark was not rerun and nothing was rescored.

## 5. Boundaries held

- Local and unpushed; nothing deployed.
- `/api/sec-names`: the production nginx `location` block is specified in `specs/proposal-canonical-name-resolution-20261011.md` and NOT applied. Exposure in production needs the Founder's separate explicit approval.
- `/v1/canonical-store` is not exposed in production.
- TECHNOLOGY, KNOWLEDGE, LABOR and MEDIA relationship types remain blocked pending their own proposal and ratification.

## 6. Local commits

957cad8 (DEF-1406) · 20699fe · eca6bcd (proposal) · f798241 (KRYL-1407) · d393341 (acceptance script) · 8f63d83 (review fixes) · 69380e9 (milestone-1 report: unrounded means, run 1 and final run kept distinct).
