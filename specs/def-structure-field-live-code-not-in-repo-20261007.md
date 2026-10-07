# DEFECT (DRAFT): Code behind the live Structural Resolution Field is not in the repository

Status: DRAFT, 2026-10-07. Not filed in Jira. Environment where observed: Founder screenshot; Dev or Prod not recorded.

## Observed

Founder screenshot of STRUCTURAL RESOLUTION FIELD shows a header row "FORMATIONS 5 · CO-PRESENT PAIRS 10 · FORMATION INTEGRITY 1.00" and a five-state convergence legend under the map (INSUFFICIENT SIGNAL, LOW SIGNAL YIELD, BUILDING, TURBULENT, HIGH).

`git grep "FORMATION INTEGRITY"` returns nothing on `origin/main` or any pushed branch (checked 2026-10-07 after `git fetch origin`). `public/structure-field.html` on `main` has no five-state legend.

So the screen exists only in an uncommitted or unpushed local working copy.

## Why it is a defect

CLAUDE.md §11 Data preservation: "A file isn't saved until it's in a git commit." §23: a build can't be tied to a Deploy-to-Prod ticket if its source isn't in git. If this screen is on Prod, the deployed build has no matching commit.

## Six-field definition (Ticket Definition Requirement)

1. **Original intent:** every surface a guest can see is built from committed, pushed source.
2. **Acceptance criteria:** `git grep "FORMATION INTEGRITY" origin/<branch>` finds the code on a pushed branch; the branch is linked to a KRYL ticket; whether Prod carries it is recorded.
3. **Current implementation state:** code location unknown beyond "Founder's local machine". Not traced.
4. **Dependencies:** access to the local working copy that renders the screenshot.
5. **Superseded by a newer ticket:** none found locally. Jira not searched (no access from this session).
6. **Maps to current product model:** yes (MAP / structure-field.html, navMode 'structure').

## Related

`def-structure-field-state-legend-unwired-20261007.md`: what the legend is wired to can't be verified until this code is pushed.

## Non-goals

No code change. Commit and push only.
