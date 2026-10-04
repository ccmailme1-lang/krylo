# KRYL-1329 — VALIDATION RESULTS (localhost, commit ebca65d, 2026-09-27)

Each block states the goal that block of code must reach, then the validation evidence for it. Real browser, localhost (`npm run dev`, :5173), Playwright. 11/11 pass. Production build compiles. 0 page errors. Screenshots: round 1 (three chips) and round 2 (two chips after one selection) captured and reviewed.

## STATED GOAL 1 — never more than 3 chips, on any input, in any round
Code: `MAX_CHIPS_PER_ROUND = 3` slice in `deriveNextDirections` (inquirygeneration.js).
Validation: `tests/e2e/kryl1329-next-directions.spec.js` GOAL 1 — 31-input corpus, chip count asserted <= 3 on every input; the six-pressure phrase set never appears. PASS.

## STATED GOAL 2 — up to three rounds, one selection per round, hard stop after round 3
Code: `appended.length >= MAX_ROUNDS` guard; round state `assistAppended` in analysisidlefield.jsx.
Validation: GOAL 2 tests — "Digital Software Platform" runs 3 chips -> select -> 2 chips -> select -> 1 chip -> select -> 0 chips, no fourth round even after more typing; a single-direction input (round 1 = 1 chip) stops after that one selection (zero candidates ends assistance). PASS.

## STATED GOAL 3 — grounded only in the guest's own words; KRYLO's own text never grounds; no repeats
Code: `guestAuthoredText()` strips KRYLO-appended phrases before grounding; `hits.find`/`appended.includes`/`lowerAll.includes` gates.
Validation: GOAL 3 tests — parser-misfire and ungrounded inputs give 0 chips; after one selection, no further chip is grounded in KRYLO's own appended word "technology" (R-F verified live, not just by unit test); an already-present phrase is never re-offered; editing the text between rounds changes what the next round offers. PASS.

## STATED GOAL 4 — complete questions and cue-bearing input get zero by default
Code: the "ends with ?" check and the decisionCues/scenarioCues/numbers/geo checks in `deriveNextDirections`.
Validation: GOAL 4 test — 7 question/cue/comparison/noise inputs all give 0 chips. PASS.

## STATED GOAL 5 — exact append, never submits, ordinary editable text, no + ADDED, no clear-all
Code: `appendAssist` writes `ta.value + cand.appendText` directly; no token state, no + ADDED render path for this feature.
Validation: GOAL 5 test — selecting the second chip appends exactly that phrase, no TARGET PACKET renders (no submit), no + ADDED row, no clear-all, and the guest can freely backspace/edit the appended text. PASS.

## STATED GOAL 6 — stop conditions; submit uses the exact text; structuralRefinements untouched
Code: `setAssistStopped(true)` in `handleExecute`; the useEffect that resets on an empty query.
Validation: GOAL 6 tests — clearing the box resets the sequence (a fresh input starts fresh); submitting sends the exact box string as `session.query` and `analysisIntent.question.value.text`, `structuralRefinements` stays `[]`, and no chip renders after submit. PASS.

## Also checked
- Production build: `npm run build` succeeds.
- 0 page errors during the full run.
- Visual: round 1 (3 chips) and round 2 (2 chips) screenshots match the code's behavior.
- Not touched: intentparser.js entity extraction, analysisintent.js, querysynthesis.js, the store beyond the existing createSession path, chipsubstrate.js.

## Outstanding (not validated because not yet ruled — recorded, not silently assumed)
- D4: the DRAFT catalog phrases/triggers are unratified; this run validates the MECHANISM against the stated goals, not the specific wording.
- D6: "adjacent direction" license is ASSUMED for this localhost build only (T2, T3, F2, F3, M3, H3, C2, C3 all use it); if the Founder rejects D6, those 8 catalog rows are removed and only T1 (CHANGE, limited to the generic triggers) and L2 (CHANGE) remain candidates.
- D7/D8: implemented as the "?" check and cue suppression; not separately re-confirmed against a Founder ruling.
- Not deployed. Local commit ebca65d only. Ships only through the Jira Deploy to Prod gate and an explicit "deploy".
