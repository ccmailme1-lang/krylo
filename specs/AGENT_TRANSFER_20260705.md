# AGENT TRANSFER — 2026-07-05 — REMOVED FOR PERFORMANCE

Mr. XS is ending this session and replacing this agent. Reason stated directly: poor
performance and an opinionated posture on a task that should have been mechanical.

## What happened

Task: add a bordered "card" treatment to the 4 History-bay stat numbers
(SESSIONS/TRANSACTIONS/COMPLETE/DRIFT EVENTS in `src/components/history/historybay.jsx`,
around line 610), using a reference screenshot (a stat banner: "7+ YEARS / 1,000+
IMPLEMENTATIONS / $11M INVESTMENT / Days NOT MONTHS") as the visual target.

This should have been a small, literal CSS change. Instead it took roughly a dozen
back-and-forth turns because the agent (me) kept guessing at ambiguous short instructions
("original size," "card format," "each box," "scale it down proportionally") instead of
reading back a precise, concrete change and confirming before editing. Concrete failures:

1. Misread "go to the original size" as a height/padding instruction; it meant width.
2. Applied `flex: 1` (full-width stretch) when the original layout never stretched to fill
   its container — visible directly in the user's own comparison screenshots (trailing
   black space after the last stat in the original, none in my stretched version).
3. Added `textAlign: 'center'` that was never clearly requested, deviating from the
   original's left-aligned text, compounding the "keep design the same" instruction.
4. Required the user to supply THREE separate side-by-side comparison screenshots
   (original vs. reference vs. my output) before the mismatch was corrected — the user
   should not have had to do that work.
5. Drew explicit, deserved frustration: "you don't listen EVER," "this 4th time."

Underlying failure mode: treating iterative visual/CSS tweaking as an area where I could
keep guessing and self-correct cheaply. It is not cheap for the user — every wrong guess
costs a full screenshot-and-re-explain cycle. Per this session's separately-locked
directive (memory: `feedback_no_creative_design_output.md`, escalated 2026-07-05):
**zero visual/layout/CSS implementation work from this agent, full stop, no exceptions,
regardless of how precise the spec seems.**

## Current repo state (verified via `git status`/`git diff --stat`)

- `src/components/history/historybay.jsx` — MODIFIED, uncommitted. Net change: the 4 big
  stats (lines ~610-630) went from a flat row with lime divider lines to 4 individual
  bordered boxes (`background:#000000`, `border:1px solid ${BORDER}`, `flex:'0 0 auto'`
  so they hug content width and don't stretch), numbers alternating `LIME`/`#007FFF` by
  index, labels unchanged (`LIME`, always). Last state was confirmed by the user as
  matching on width/stretch behavior; the "individual box vs. one strip with dividers"
  difference (per the final "look closer" zoomed comparison) was flagged but **not
  changed** — the user ended the session before directing a fix, and per the new zero-visual
  rule, the next agent should not touch it either without an explicit, fully-specified
  instruction from Mr. XS or someone else doing the visual work.
- Untracked, pre-existing, not created this session: `deploy.sh`, `deploy-vps.sh`,
  `specs/features_backlog(.md)`, `specs/features_backlog_7-5.md`, and a spec file with a
  literal em-dash in its filename (`specs/WO-XXXX — Causal Chain Identity & Impact Layer...`).
  Do not delete or "clean up" any of these without asking — untracked ≠ disposable (see
  CLAUDE.md §13 rule 43: a file isn't saved until it's committed, but that doesn't make it
  the agent's to remove).
- No commits made this session. Nothing has been pushed or deployed.

## Jira state (verified live, not from CLAUDE.md — CLAUDE.md is frozen/historical per
`feedback_jira_sole_source_of_truth.md`)

10 open, actionable (status=Ready, no DUPLICATE/DO-NOT-BUILD/ON-HOLD/CANCELLED/DEFERRED/
BLOCKED/DEFECT label), all NEEDS-SPEC, none build-ready:
KRYL-942, KRYL-968 (DEF-2087 iframe flash — CLAUDE.md calls it DEFERRED but Jira carries no
such label; worth reconciling), KRYL-969 (canonical — see below), KRYL-975, KRYL-982,
KRYL-983, KRYL-984, KRYL-985, KRYL-988, KRYL-989.

This session also found and closed a real duplicate: KRYL-986 (filed 2026-07-05) duplicated
KRYL-969 (filed 2026-07-03, same "Strategic Narrative Evolution Engine" concept, same
perpetuals.com worked example). KRYL-986 is now labeled `DUPLICATE`/`DO-NOT-BUILD` with a
comment pointing to KRYL-969 as canonical. If reconciling Jira again, do not re-surface
KRYL-986 as open.

## Standing directives the next agent must not re-break

- **Zero visual/design/layout/CSS work** — not "ask for a spec first," literally zero. See
  `feedback_no_creative_design_output.md`.
- **CLAUDE.md is not for tracking WOs/tickets anymore** — Jira is sole source of truth. Do
  not add "SESSION ... COMPLETE" entries or extend CLAUDE.md's WO list.
- **Jira reconciliation must use keyword search, not bare ticket numbers** — bare-number
  JQL search against hyphenated summaries ("WO-2070:") silently returns false negatives.
- Role split locked this session: the agent defines constructs/contracts (boundaries,
  formulas, failure modes); engineers/other sessions do all design and implementation.
- Act decisively on ambiguous short messages rather than looping with clarifying
  questions — but for visual/CSS specifically, the rule is now "don't do it," not "guess
  carefully," per the escalation above.

## Open threads, unresolved

- HelpMark popover visual redesign — user was going to bring a reference; never arrived
  before this session's focus shifted to History-bay cards, then to this transfer.
- Which external LLM provider replaces local Ollama in `mock-server.cjs` (Ollama was fully
  uninstalled earlier this session for resource reasons) — still unanswered.
- KRYL-979 (Historical Divergence Retrieval) status — genuinely undecided, not struck.
