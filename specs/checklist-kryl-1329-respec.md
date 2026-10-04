# KRYL-1329 RESPEC — Founder requirements checklist (DRAFT; nothing built)

Source: Founder, 2026-09-26, verbatim: "I don't need a flood of options for the first sequence. I want a 2nd and 3rd sequence. No more than 3 chips max... ever! ... You will respec 1329 with the correct requirements this time. Validate line by line that you are meeting my objective. I want a check list that you will validate before the build and before you hand it to me."

Process rule: this checklist is validated line by line (a) BEFORE the build, against the written spec, and (b) BEFORE handoff, against a real-browser run with evidence per line. The record (PASS/FAIL + evidence) is posted on the ticket. No line may be marked PASS without evidence; no build starts with an unresolved question below; the Founder rules on every open question.

## Requirements taken verbatim from the Founder
- R1. The first sequence does NOT flood: it shows a small set, never the six-pressure menu.
- R2. There is a SECOND sequence and a THIRD sequence (three sequences in total).
- R3. No more than 3 chips are shown at any time, ever — in every sequence, for every input.

## Checklist (validated pre-build and pre-handoff)
- [ ] C1. At no point in any sequence, for any input or state, are more than 3 suggestion chips rendered. (Test: assert chip count <= 3 in every state; the limit is one constant and a test fails if it is exceeded.)
- [ ] C2. The first sequence shows at most 3 chips (not six).
- [ ] C3. A second sequence is offered after the first (trigger and content per the answers below).
- [ ] C4. A third sequence is offered after the second (trigger and content per the answers below).
- [ ] C5. Behavior after the third sequence is as ruled below.
- [ ] C6. Each chip appends exactly its displayed wording to the guest's text; never submits; guest text is otherwise never altered (carried over from KRYL-1326 — Founder to confirm it still applies).
- [ ] C7. No "+ ADDED" token or "clear all" for these suggestions (carried over — confirm).
- [ ] C8. The exact submitted text is the QUESTION; structuralRefinements untouched (carried over — confirm).
- [ ] C9. Verified in a real browser on localhost BEFORE handoff; production only after the ticket reaches Deploy to Prod and an explicit "deploy".
- [ ] C10. Wording of every chip is Founder-approved before the build (no invented copy).

## OPEN QUESTIONS the Founder must answer before any spec or build
Q1. What is a "sequence"? (For example: the guest picks a chip, and the next set of up to 3 chips appears — sequence 1 -> 2 -> 3 — each set showing on top of the text so far?)
Q2. What are the chips in sequence 1, in sequence 2, and in sequence 3 — the actual wording — and what decides which chips appear for a given input?
Q3. What is the trigger for each sequence (after the previous selection? only on certain text?) and what does the guest see if there is nothing to offer?
Q4. What happens after the third sequence (nothing more offered)?
Q5. Does the "bare subject" gate still decide when sequence 1 appears, or something else?
Q6. What stays deployed today (see the ticket comment): the single-suggestion assist from KRYL-1326 is live; keep it, or remove it too?
