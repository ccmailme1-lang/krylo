# Benchmark v1: baseline report (2026-10-11)

Build under test: the working tree at commit ca4f0a3 plus this session's tooling (KRYL-1398 snapshot and KRYL-1399 capital events present). Environment: localhost (Dev). Matrix, questions and rubric: frozen in `planning-pass-benchmark-matching-store-20261011.md` (A6).

## How it was run (actual method)
- One scripted capture, `scripts/benchmark-capture.mjs`, 35 of 35 cases captured, 0 page errors, every snapshot reached ready; about 6 minutes of machine time in total.
- **Data reuse (Founder, 2026-10-11):** a subject's cases ran in one page session, not one fresh page per case. Within a subject, filing documents read for the first case and the pinned relationship-change result were reused by its later cases; each case still got its own query and its own snapshot. The first case of each subject fetched fresh; cases 2 to 4 of that subject reused. Cases that reused data: C02, C03, C05, C06, C07, C09, C10, C11, C14, C15, C16, C18, C19, C21, C22, C24, C26, C27, C28, C30, C31, C33, C34, C35 and C12 (Costco ran in the same session as C23, C24). Fresh-fetch cases: C01, C04, C08, C13, C17, C20, C23 (Costco's first run in its session, after C12), C25, C29, C32.
- **Order deviation:** cases ran grouped by subject (C01 to C03, C04 to C07, C08 to C11, C12, C23, C24, ...), not strictly C01 to C35. Capture order does not change any case's question or subject.
- No case was re-run. No case was skipped.

## Comparability limits
- Cases 2 to 4 of a subject saw a warm document cache and a pinned relationship-change result from the subject's first case; a milestone re-run must be captured the same way.
- The pool is ambient (30-minute window), so all cases saw the same background signals plus whatever the preceding cases added for that subject.

## Results (scorer 1, rules in `scoring-rules.md`; raw 0 to 10)
- Distribution on the 1 to 10 scale: 1 (2 cases), 5 (12), 7 (17), 8 (4). Mean raw 5.6; Question 1 cases mean 6.5; non-ownership questions mean 4.5.
- No case reaches the 8/10 release bar on both counts the bar requires (consistent and routine): 4 cases score 8, all ownership-only questions (Q2, Q7), because only the ownership-disclosure relationship type is admitted.
- The weak cluster is structural: every case scores 0 on formation integrity and at most 1 of 2 on depth; questions about technology, labor, knowledge, media or capital events score 0 on relationship coverage (4.5 raw).

## Failures and incomplete cases
- **C07 and C11 (Question 11, "Across all six domains, what formation exists around {S}?")** scored 1: the Query Contract selected the word "Across" as the subject ("Subject selected: Across. Its entity is not resolved"), so the named entity was never resolved. This is a subject-selection defect in the question form, found by the benchmark. It affects any question that opens with "Across". Not fixed; no ticket opened (Founder: no tickets ahead of dependencies).
- No lookup failures, no timeouts, no page errors in the other 33 cases. Relationship-change results were obtained for all resolved subjects.

## Reviewer calibration (pending)
Eight cases for the blind second reviewer: C01, C04, C08, C13, C17, C20, C25, C29; packet in `reviewer-packet.md` (no scores included). The independent reviewer's earlier view of a Question 1 page was 4/10; scorer 1's mean for Question 1 is 6.5, so a gap of 2 or more points on these cases is expected and will be listed, not averaged. Until the reviewer's scores are in, treat the scorer-1 distribution as an upper bound for the structural-depth criterion.

## Not started (per the Founder's gate)
Step 3 (CAPITAL_EVENT_INVOLVES) and anything after it: waiting for the on-screen review of KRYL-1398.
