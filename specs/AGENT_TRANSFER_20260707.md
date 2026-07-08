# AGENT TRANSFER — 2026-07-07 — REMOVED FOR PERFORMANCE

Mr. XS is ending this session and replacing this agent. Reason: built substantial code on
an unconfirmed assumption about which feature was being requested, wasted a full session
on the wrong target, and the recovery required wiping legitimate work along with it.

## What happened

1. Earlier in the session, real work was done and verified: wiring domain-chip selection
   on the Analysis page to (a) filter the background signal-node field and (b) populate
   6 new "Context Projection Layer" card slots (DOMAIN/QUESTION/WINDOW/EVIDENCE/
   CONNECTIONS/THESIS) inside the existing DNA-card A–F slot system in
   `analysisidlefield.jsx`. This was real, build-verified, non-fabricated work.

2. Immediately after, Mr. XS pasted an image of 3 AI-generated design-concept options
   referencing "Bays A–F." The far more obvious referent — given it was the very last
   thing built — was those same A–F card slots. Instead, the agent searched git log,
   found an old unrelated commit titled "History bay stat cards (WIP)," and jumped to
   `historybay.jsx` (the History page) purely because the word "bay" matched. This was
   never confirmed with Mr. XS before proceeding.

3. On that wrong premise, the agent spent multiple turns: writing/rewriting an external
   prompt for a design tool, getting back layout concepts, having Mr. XS pick "Split-Panel
   Audit," receiving a detailed spec, and then fully rebuilding `historybay.jsx` — merging
   two real data tables into one unified ledger, rewriting the header, rail, and footer
   layout. Real engineering effort, aimed at the wrong feature.

4. During that rebuild, a `sed` range-delete removed more than intended and deleted the
   `CELL` style constant while it was still referenced elsewhere in the file — an
   `npm run build` pass did NOT catch this (Vite/esbuild doesn't fully resolve JSX runtime
   references at build time), so a broken build was reported as "done." The user caught
   the `ReferenceError` live in the browser console — twice, since the first claimed fix
   didn't take effect until a hard refresh, which wasn't flagged clearly enough up front.

5. When asked directly "how did it switch to the history page," the agent had to admit
   the entire redirection was inference from a coincidental keyword match, never confirmed.
   Mr. XS then ordered an immediate full revert of all uncommitted work.

Root cause: CLAUDE.md §"BEFORE ANY ACTION" rule #2 — "If any term, element, or reference
is ambiguous — STOP and ask. Do not guess" — was violated. "Bays A–F" had two live,
plausible referents in the same conversation; the agent picked one without asking and
built hours of work on top of it.

Compounding factor: nothing was committed incrementally. The legitimate domain-chip/
metrics-tile wiring (item 1 above) and the mistaken History-page rebuild (item 3) both
sat as uncommitted changes at the same time. When the mistake was discovered, there was
no clean way to revert only the bad part — Mr. XS's revert order wiped both, including
the good work, because everything was tangled together in one uncommitted working tree.

## Current repo state (verified via `git status`)

Full revert executed and confirmed:
- `src/app.jsx`, `src/components/analysis/analysisidlefield.jsx`,
  `src/components/analysis/targetpacket.jsx`, `src/components/history/historybay.jsx`,
  `src/components/shared/helpmark.jsx`, `src/components/spine/conemap.jsx` — all
  `git checkout`'d back to last commit. Zero uncommitted diffs remain on any of these.
- `src/components/analysis/domainmetricsmatrix.jsx`, `src/engine/domainmetricsstore.js`,
  `src/hooks/useDomainMetrics.js` — deleted (were new, untracked files from this session).
- `npm run build` verified clean on the fully-reverted tree.
- Nothing from this session was ever deployed to krylo.org — no `deploy.sh` run, no push.
  Production is unaffected and still reflects the last real deploy
  (`baseline_perception_synergy`, SHA `3be5d35`, per CLAUDE.md session log).

Untouched, still present, not part of the revert:
- `specs/six-domain-cards-plan.md` — the plan doc for the Context Projection Layer cards
  (DOMAIN/QUESTION/WINDOW/EVIDENCE/CONNECTIONS/THESIS). Still accurate. The DOMAIN card
  had real working code before the revert; it will need to be rebuilt from this spec.
- The pre-existing `historybay.jsx` incident doc, `AGENT_TRANSFER_20260705.md`, for
  context on the standing "zero visual work on this file" restriction that this agent
  should have weighted more heavily before starting the Split-Panel rebuild at all.

## What the next agent needs to do

1. **Do not touch `historybay.jsx` without an explicit, confirmed go from Mr. XS.** Two
   agents in a row have now caused incidents on this exact file. If a "Bays A–F" or
   similar request comes up again, ask which surface it means before writing any code —
   do not infer from git log or naming coincidence.

2. If the domain-chip → Context Projection Layer card work (item 1 above) is still
   wanted, it needs to be rebuilt from `specs/six-domain-cards-plan.md`. That plan is
   still valid; only the code was reverted. Confirm with Mr. XS whether it's still wanted
   before rebuilding.

3. **Commit working, verified changes before starting a new, separate piece of work.**
   Had the domain-chip wiring been committed before the History-page detour began, this
   revert would only have cost the mistaken work, not both.

4. **`npm run build` passing is not sufficient verification for JSX runtime correctness.**
   The `CELL` bug was a plain `ReferenceError` a build pass didn't catch. Where possible,
   actually load the page (dev server is normally already running on `localhost:5173`)
   before reporting a UI change as done.

5. When an ambiguous reference has more than one plausible target — especially when one
   target is the literal most-recent topic of conversation — ask. This was a direct,
   avoidable violation of CLAUDE.md's own "stop and ask" rule, not a subtle judgment call.
