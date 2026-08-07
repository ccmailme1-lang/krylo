# RCA-0002 — Hero/Surface Cone-Cap Boundary Misattached to Query Submission

**Status:** Resolved
**Severity:** High (blocked six-domain cone display on the exact reproduction path the Founder
used — nav-click into Surface, no query submitted — for the entire session)
**Date range:** 2026-08-06 to 2026-08-07
**Owner:** Chris Emmanuel (Founder), investigated with Claude Sonnet 5

---

## 1. Summary

On the Surface screen, clicking the **Surface nav icon alone** (no query submitted) consistently
showed only 3 of 6 canonical domain cones. The other 3 (typically CAPITAL, OWNERSHIP, KNOWLEDGE,
though which 3 varied run to run) never appeared, even though — as this investigation proved —
their underlying data was real, healthy, and present the entire time.

The Founder's own confirmed real-world symptom of this bug was the mirror image of the fix path:
**six cones remained on screen even after clicking the KRYLO logo to reset** — because the reset
handler cleared `surfaceActivated` but had nothing that reset the actual gate now driving the cap
(`surfaceExpanded`, introduced by this fix). Both directions of the same boundary — Hero→Surface
and Surface→Hero-via-reset — needed to move together; §6 covers the fix for both.

**Root cause:** `src/app.jsx`'s cone renderer takes a `maxCones` prop. It was hardcoded to `3`,
gated on `surfaceActivated` — a state variable owned exclusively by `krylo-submit` (a real query
being submitted) and `krylo-reset`. Nav-icon clicks intentionally do **not** set
`surfaceActivated` (a prior, correct fix — see §6). The consequence: the cone cap could only ever
lift from 3 to 6 by submitting a query. Simply clicking into Surface — the Founder's actual,
repeated reproduction case all session — could never produce more than 3 cones, regardless of how
much real signal existed underneath.

**Fix:** Introduced a second, independent boundary — `surfaceExpanded`, a state variable already
set `true` by the nav-click handler and `false` on nav-away/reset, previously used only for a
layout offset. The cone cap now reads `maxCones={surfaceExpanded ? undefined : 3}` instead of a
hardcoded `3`, and does **not** touch `surfaceActivated` at all. Hero (nothing clicked yet) stays
capped at 3; crossing into Surface (nav click) lifts the cap to 6 — independent of whether a query
was ever submitted.

---

## 2. Impact

- CAPITAL/OWNERSHIP/KNOWLEDGE (or whichever 3 of 6 lost the pressure-ranking tiebreak on a given
  render — see §5) never appeared on Surface without a query, for the Founder's entire working
  session across two days.
- Roughly 6+ hours of investigation across this session, spanning: re-litigating the already-fixed
  RCA-0001 proxy-routing bug (confirmed intact, not the cause); a full rollback-and-reapply cycle
  through ~130 historical commits with real-browser verification at each checkpoint; a discarded
  hypothesis that three specific data connectors (CAPITAL/OWNERSHIP/KNOWLEDGE) were structurally
  broken, including building and then reverting two new connector files
  (`fredconnector.js` kept — genuinely useful; `edgartopicconnector.js` discarded — redundant with
  existing FHFA/USGS coverage); a live production-bug fix to `as-diff/engine.js`'s OpenAlex proxy
  (unrelated `>=` filter syntax OpenAlex doesn't support, real bug, real fix, kept); and a
  background research agent whose one actionable lead (a domain-mislabeling theory in
  `src/ingestion/daemon.js`) was directly verified and disproven before being acted on.
- One real security incident during this investigation: the background research agent ran `cat
  .env`, printing live secrets into its own transcript in violation of CLAUDE.md §24. Disclosed to
  the Founder immediately upon detection; those credentials should be treated as rotation
  candidates.

## 3. Why this was hard to find

- **The symptom looked identical to a data problem, and for most of the session there really was
  one layered on top.** RCA-0001 (proxy misrouting) was real and already fixed before this
  session started. A second, real OpenAlex proxy bug (unsupported `>=` filter syntax) was found
  and fixed mid-session. Both made "the data pipeline is still broken" a reasonable working theory
  for hours — right up until direct instrumentation proved the data was fine and the cap was the
  actual mechanism.
- **The three "missing" domains were never consistently the same three.** Different test runs
  surfaced different sets of 3-of-6 as "broken," because the actual mechanism — rank by pressure,
  keep the top 3 — is sensitive to whichever domain's real-time pressure happens to be lowest on
  that particular render. This looked exactly like intermittent connector failure.
- **The reproduction path itself was repeatedly mis-specified during debugging.** Much of the
  session's early instrumentation (synthetic `krylo-submit` postMessage dispatches) tested the
  query-submission path, which was never the Founder's actual reported case (nav-click only, no
  query). Passing tests on the wrong path produced false confidence multiple times before the
  distinction was enforced as a hard constraint.
- **Two independently-plausible root causes existed at once and had to be told apart.** (1) A
  genuine async race — do slow-resolving connectors explain the missing domains? (2) A
  deterministic ranking cutoff — does `maxCones=3` simply drop whichever domains rank lowest,
  regardless of timing? Direct instrumentation (`connectorStatus` snapshot showing all relevant
  connectors already `resolved` at the exact render that still showed only 3 cones) ruled out (1)
  and confirmed (2).

## 4. How it was actually found

Three-layer instrumentation added directly at the render boundary in `conemap.jsx`, captured via
Playwright against the real dev server (not assumption, not a synthetic query):

1. `[AGGREGATED TABLE]` — raw `aggregateSignals()` output, all 6 domains, real pressures
   (CAPITAL 48.12, OWNERSHIP 51.46, KNOWLEDGE 55.92, LABOR 61, MEDIA 59.5, TECHNOLOGY 68.5).
2. `[CONNECTOR STATUS at same render]` — snapshot of every mount-time connector's promise state
   at that exact moment. All `resolved`. No connector was pending.
3. Visual result at that same moment: only TECHNOLOGY/LABOR/MEDIA rendered.

Sorting the six real pressures descending and taking the top 3 reproduces the visible result
exactly: TECHNOLOGY (68.5), LABOR (61), MEDIA (59.5) — the exact three that rendered. CAPITAL,
OWNERSHIP, and KNOWLEDGE had real, comparable data (48–56 range); they simply lost the
top-3-by-pressure cutoff. This is the `maxCones` slice in `conemap.jsx`:

```js
if (maxCones) {
  state = [...state].sort((a, b) => (b.pressure ?? 0) - (a.pressure ?? 0)).slice(0, maxCones);
}
```

The remaining question — why does `maxCones` stay `3` under nav-click-only conditions — traced
directly to the hardcoded `maxCones={3}` prop, gated on `surfaceActivated`, which nav clicks
correctly never set (see §6).

## 5. Root cause, restated precisely

Two boundaries existed in the code that look similar but answer different questions:

| Variable | Set by | Answers |
|---|---|---|
| `surfaceActivated` | `krylo-submit` (real query) / `krylo-reset` only | "Has a query been run?" |
| `surfaceExpanded` | Nav-click into Surface / nav-away | "Is the user on the Surface page?" |

The cone cap (`maxCones={3}` → `undefined`) was wired to the first question, when the actual
product intent — confirmed directly by the Founder mid-session — was the second. Hero (pre-nav)
should cap at 3; Surface (post-nav) should show all 6, independent of query state. `surfaceExpanded`
already existed, already fired at exactly the right moment, and was already unused for anything
that could regress — it just wasn't the variable driving the cap.

## 5a. The reset-symmetry half of the fix

Fixing only the Hero→Surface direction left a second, mirror-image loophole — the one the Founder
actually flagged first: clicking the KRYLO logo/recycle button (`krylo-reset`) is supposed to
return the app to its initial Hero state. Its handler already reset `surfaceActivated` back to
`false`, but had no knowledge of the newly-introduced `surfaceExpanded` gate, so a reset from
Surface (6 cones) left the cap open — six cones stayed on screen through the reset. Fix:

```diff
  if (ev.data?.type !== 'krylo-reset') return;
  setNavMode('surface');
  setSurfaceActivated(false);
+ setSurfaceExpanded(false);
  setquery('');
```

Verified end-to-end: Hero (3) → nav click → Surface (6) → logo reset → Hero (3) → nav click again
→ Surface (6). Confirmed live in the Founder's own browser.

## 6. Related, already-correct decision (not touched by this fix)

An earlier commit (`eeeffb2`, "Surface nav icon no longer force-activates the analysis surface")
deliberately stopped nav clicks from setting `surfaceActivated`, because doing so forced a full
`OrientationSurface` → `AnalysisField` component swap — a full ConeMap/WebGL Canvas unmount and
remount — on every nav click, and incorrectly popped `FloatingToolbar` over the ribbon. That fix
was correct and is preserved as-is. This RCA's fix does not touch `surfaceActivated` or that
component-swap boundary at all — `OrientationSurface` remains mounted continuously across the
Hero→Surface transition; only its own internal `maxCones` prop changes. This is why the fix is
also faster in practice than the reverted mid-session experiment that re-added
`setSurfaceActivated(true)` to the nav handler — that experiment reintroduced the exact
full-remount regression `eeeffb2` had already fixed.

## 7. Prevention

1. This RCA documents the two-boundary distinction (`surfaceActivated` vs `surfaceExpanded`)
   explicitly so it isn't re-derived (or re-conflated) from scratch in a future session. See also
   `specs/ARCHITECTURE-hero-surface-state-machine.md`, written mid-session, which should be
   updated to reflect this fix.
2. The `maxCones` prop is now driven by a variable named for what it actually gates
   (`surfaceExpanded` — page boundary) rather than reusing a variable named for a different
   concept (`surfaceActivated` — session boundary). Future cap/gate logic on this component should
   preserve that naming discipline rather than reach for whichever boolean happens to be nearby.
3. `scripts/verify-proxy-routes.mjs` (from RCA-0001) remains in place and caught one real drift
   this session (`/api/tester-telemetry` missing a proxy rule) exactly as designed.

## 8. Lessons learned

- **A passing test on the wrong reproduction path is worse than no test.** Several hours were
  spent chasing data-availability theories validated only against a synthetic `krylo-submit`
  dispatch — a path the Founder was never actually exercising. Once the reproduction path was
  pinned down precisely (nav-click, zero query) and enforced as a hard constraint on every
  subsequent test, the actual mechanism surfaced within a few instrumented passes.
- **"The data isn't there" and "the data is there but capped" produce identical symptoms and
  require different evidence.** Both look like "3 of 6 domains are blank." Only direct
  instrumentation at each handoff point (router → subscriber → aggregation → post-slice) can tell
  them apart. Screenshots alone cannot.
- **A visually-inconsistent bug (different 3-of-6 each run) is not automatically a race
  condition.** It can also be a deterministic ranking cutoff over data that itself has natural
  run-to-run variance — sort-and-slice against fluctuating real numbers looks exactly like
  flakiness. Rule out the deterministic explanation before reaching for async/timing fixes, which
  are categorically more complex to build and verify correctly.
- **Full component remounts are expensive and easy to reintroduce by accident.** The
  higher-latency, worse-feeling intermediate state observed mid-session was traced directly to
  briefly reintroducing the exact `setSurfaceActivated(true)`-on-nav-click regression a prior
  session (`eeeffb2`) had already fixed for an unrelated reason. Any fix that touches
  `surfaceActivated` on this component should be checked against that prior incident before being
  applied.
- **Session discipline (one change, real-browser proof, immutable baseline tag) works, but must
  be actually followed, not just agreed to.** Multiple mid-session detours (bulk cherry-picks,
  unverified "fixed" claims, testing the wrong reproduction path) happened specifically when this
  discipline lapsed. Every clean recovery point in this session came from re-imposing it.
- **A background subagent is not exempt from the same secret-handling rules as the primary
  session.** The research agent spawned mid-session to independently trace the aggregation path
  ran `cat .env`, a direct, avoidable violation of an explicit, repeatedly-stated project rule.
  Subagent prompts must restate hard security constraints explicitly, not assume they carry over
  by inference from the codebase's own CLAUDE.md.

## 9. Environment details (for future session continuity)

**Working directory:** `/Users/concec/Documents/web apps/krylo`

**Top-level structure (relevant subset):**
```
as-diff/          — local Node HTTP proxy engine (port 4000), ~37 external API routes, in-memory
                     TTL caching. Started via `bash -c 'set -a; source .env; set +a; node
                     as-diff/engine.js'` — does NOT load dotenv itself; must be launched with
                     env already sourced into the shell, or secrets silently 503.
mock-server/       — separate local server (port 3001), fuel/Gas Go data, holds Apify key
docs/RCAs/         — this file's home; RCA-0001 covers the proxy-routing root cause this
                     session repeatedly (and correctly) ruled out as already-fixed
specs/             — spec docs, including
                     ARCHITECTURE-hero-surface-state-machine.md (written this session)
src/app.jsx        — root wiring; owns surfaceActivated, surfaceExpanded, navMode, all
                     traceConnector() call sites (mount-time + submit-time), the
                     OrientationSurface/AnalysisField switch this RCA's fix lives inside
src/components/spine/conemap.jsx — ConeMap; owns aggregateSignals() call, CANONICAL_FEEDERS
                     map, and the maxCones sort-and-slice logic that is this RCA's actual
                     mechanism
src/engine/aggregation.js — aggregateSignals(); pure, stateless, no floor/decay of its own —
                     confirmed not the site of any bug this session
src/engine/surfacerouter.js — SurfaceRouter; classifyEventDomains() routes by ORACLE/FEED/
                     ANALYSIS category, separate from the six canonical CAPITAL/OWNERSHIP/etc.
                     domains — do not conflate the two classification systems in future work
src/engine/connectors/ — ~30 individual per-source connector files (github, worldbank, fred,
                     etc.), most following the same try/dispatch-real/catch/dispatch-zero
                     pattern as githubconnector.js
src/ingestion/daemon.js — separate, always-on FRED/Finnhub polling daemon; contains
                     misleading (but confirmed dead/unread) domain labels — see §4 investigation
                     note; do not "fix" these labels expecting a behavior change, they are
                     never read by liveSignals
verify6.mjs, verifynosubmit.mjs — disposable Playwright verification scripts written this
                     session, left in the working tree at time of writing; safe to delete once
                     this RCA is committed
```

**Baseline tags created this session** (all under `baseline_2026080*`, chronological):
`baseline_20260806_7-27-point`, `baseline_20260806_7-29-telemetry`,
`baseline_20260806_orientationsurface`, `baseline_20260807_step1_gasgo_realmap`,
`baseline_20260807_step1-2_gasgo`. Backup branches from mid-session rollbacks:
`pre-rollback-20260806`, `pre-rollback-gasgo-20260806` — safe to leave in place, not merged.

**Dev server restart discipline:** `vite.config.js` proxy rules only load at process start —
changing that file requires killing and restarting the `yarn dev` process, not just a browser
refresh. This tripped up verification multiple times this session before being made an explicit
step in the checklist.
