# Hero/Surface Cone Rendering — State Machine Reference

Written 2026-08-06 after a multi-hour session lost to re-deriving this same structure
repeatedly. Read this before touching cone-count/Hero/Surface logic again.

## The three state variables (do not confuse these)

| Variable | Where it lives | Set by | What it actually means |
|---|---|---|---|
| `navMode` | `useState('surface')` in app.jsx | Left sidebar nav clicks, `krylo-submit`, `krylo-reset` | Which top-level page/tab is showing (surface/analysis/oracle/history/community/news/...). **Defaults to `'surface'` on page load** — this is not a Hero-vs-Surface signal, it's a page router. |
| `surfaceActivated` | `useState(false)` in app.jsx | `krylo-submit` handler sets `true`; `krylo-reset` sets `false`. **Nav clicks do NOT set this** — deliberately, per an existing code comment (app.jsx ~line 1043) recording a prior incident where nav-click activation caused a full ConeMap unmount/remount and popped FloatingToolbar over the ribbon. | Whether a real query has been submitted. **This is the correct Hero-vs-Surface cone gate.** |
| `activeSessionId` | Zustand `useAnalysisStore` | Something downstream of query processing (ETR selection or later in the funnel — not set by submit alone) | Session/analysis lifecycle state. Confirmed by runtime probe: a real `krylo-submit` leaves this `null`. **Not a valid cone-count gate** — using it makes the 6-cone state unreachable from a normal query submit. |

## KNOWN GOOD — commit `abd2ce9`

Rendering contract, confirmed by real browser test:

```jsx
<AnalysisField
  ...
  maxCones={surfaceActivated ? undefined : 3}
  ...
/>
```

One component only. No separate `OrientationSurface` component exists at this commit (that's
introduced later in the delta, by commit `5831620`, and reintroducing it requires re-wiring its
gate to `surfaceActivated`, not `activeSessionId` — confirmed twice by direct runtime probe evidence
during tonight's session).

### Verification signals (check all four, not just cone count)

A "looks right" screenshot is not enough — the sidebar carries independent confirmation:

1. **Cone count**: 6 cones visible in the 3D viewport, one per canonical domain (CAPITAL,
   OWNERSHIP, LABOR, MEDIA, TECHNOLOGY, KNOWLEDGE).
2. **`PROJECTION: N=6`** — top-right DOMAIN panel header. Reads `N=3` in the Hero/capped state.
3. **Bottom domain index bar** lists `C01`–`C06`, all six domains.
4. **`24H VOLATILITY INDEX`** (right sidebar) — all six rows show a real directional value
   (`↑`/`↗` with a nonzero %). This is the exact panel that read `→ 0%` for
   TECHNOLOGY/CAPITAL/KNOWLEDGE during both the original RCA-0001 bug and the false-regression
   scares tonight. If any row reads `0%`/flat, something is broken even if cones are visually
   present.
5. **`FIELD CONVERGENCE`** — informational, reads `AMPLIFYING 100%` in the known-good state.

### Known cosmetic issue (not in scope for cone-count work)

TECHNOLOGY/KNOWLEDGE (and sometimes LABOR/OWNERSHIP) text labels can visually overlap when their
cones sit close together in the layout. Pre-existing, unrelated to gate logic. Do not fix this
while isolating a rendering regression — it's a separate, lower-priority label-collision issue.

## Left nav sidebar

Visible items in the known-good screenshot: SURFACE, ANALYSIS, NEWS FEED, COMMUNITY, NOTES.
`HISTORY` (present in earlier-session screenshots, between COMMUNITY and NOTES) was not visible
in the same screenshot — not yet confirmed whether this is a crop artifact or a real conditional
hide. Unresolved, flagged for a future check, not investigated further during this session.

The nav item highlighted lime/green in the known-good screenshot was `SURFACE`, matching
`navMode === 'surface'`.

## Reapplication protocol (post-rollback discipline)

```
abd2ce9 (known good)
    |
    + one commit only
    |
    + real browser proof (all 4 verification signals above)
    |
    + capture: cone count / PROJECTION N / volatility panel / screenshot
    |
    + continue to next commit

If a commit breaks the contract:
    bad commit identified → revert that one commit → back to known good → continue
```

No batching. No "reapply the rest of the delta." One commit, one proof, every time — this
document exists so re-deriving `navMode`/`surfaceActivated`/`activeSessionId` semantics from
scratch never has to happen again.

## Full remaining delta (from `63fc8e1`, chronological, first commit to reapply is first in list)

Starts at `2481467` (feat(formation): raw domain signal accessors), ends at `aa7a42f`
(the pre-session tip). 129 commits total in the original range; how many remain depends on how
far reapplication has progressed — check `git log --oneline 63fc8e1..aa7a42f` for the live list,
this document does not duplicate the ledger to avoid drift.

Known exclusions from the delta (do not reapply):
- 5 `cognitivefabric/` commits (`6e1c067`, `345e188`, `f30b367`, `e797a55`, `360f2dd`) — Founder
  confirmed this was prior-agent work, not Founder-authored; retired via `e62c184` in the original
  timeline. Skip both the 5 commits and the revert (nothing to revert if never applied).
- Net-zero revert/reapply pairs: `0066fd4`/`748724b`/`02b5c80`/`d88c97e` (all four skip — they
  cancel out), `e33e7e8`/`94bd929` (both skip), and the `4720918`/`b72cbc0`/`5ffb058`/`ec8b748`
  revert/reapply cluster near the end (skip all four; apply the original commits `8be93fa` and
  `6cd3a28` directly instead, once reached).
