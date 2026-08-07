# RCA-0001 — Six-Domain Cone Coverage Failure (CAPITAL/TECHNOLOGY/KNOWLEDGE stuck at 0%)

**Status:** Resolved
**Severity:** High (blocked a live investor/founder demo; symptom was live-reproducible for approximately two days)
**Date range:** First reported ~2026-08-04, root cause identified and fixed 2026-08-06
**Owner:** Chris Emmanuel (Founder), investigated with Claude Sonnet 5

---

## 1. Summary

On the activated Surface screen, three of the six canonical domain cones (OWNERSHIP, MEDIA,
LABOR) consistently rendered with real signal values. The other three (CAPITAL, TECHNOLOGY,
KNOWLEDGE) consistently showed 0% / no signal — same three domains, every time, across
roughly two days of testing.

**Root cause:** `vite.config.js`'s dev-server proxy configuration only had explicit local
routing rules for 3 API paths (`/api/fuel`, `/api/eia-fuel`, `/api/news-doc`). Every other
`/api/*` path — including `worldbank`, `treasury`, `eia`, `github`, `npm`, `arxiv`, `pubmed`,
`openalex`, `financialmarket`, `kalshi`, `usajobs`, `gdelt`, `reddit`, and more — had no
explicit rule and silently fell through to a generic `/api` catch-all pointing at production
(`https://krylo.org`), instead of the local `as-diff/engine.js` server (port 4000) that
actually implements them and was running correctly the entire time. Production either 404s
or otherwise fails to serve these paths. The connectors that call these routes catch any
failure internally and dispatch a fallback record (`signal: 0, confidence: 0`) rather than
throwing — so the failure was invisible: no console error, no network-tab red row that stood
out from normal traffic, and the async call itself always resolved successfully.

**Fix:** `817c3fc` — added explicit proxy rules for all ~30 routes `as-diff/engine.js`
implements, pointing at `http://localhost:4000`, placed before the generic `/api` catch-all.

---

## 2. Impact

- CAPITAL, TECHNOLOGY, KNOWLEDGE domains showed fabricated-looking zero readings instead of
  real signal, on every local dev session, for the duration of the incident.
- A scheduled Founder demo/meeting was rescheduled due to this issue being unresolved at
  meeting time.
- Approximately two days of investigation time, spanning: git archaeology and bisection
  across ~100 commits, multiple full environment resets (7/24, 7/27, and pre-session
  baselines), browser cache/tab/extension elimination, external API rate-limit
  investigation, WebGL context-loss investigation, and a full rebuild of a temporary "demo
  override" workaround (hardcoded fallback values) that was applied and later reverted.

## 3. Why this was hard to find

- The failure mode produced **no error** anywhere in the stack. The connector's own
  try/catch swallowed the routing failure and dispatched a real-shaped record with
  `signal: 0`, indistinguishable at the aggregation layer from a genuine zero-magnitude
  observation.
- A large background signal pool (`/api/signals`, itself correctly proxied to production)
  provided partial, inconsistent coverage for all six domains regardless of the broken
  routes, which sometimes masked the symptom and produced misleading "it's working now"
  readings depending on timing.
- Automated headless browser tests run against `localhost:5173` throughout the
  investigation consistently showed all six domains resolving correctly — because those
  tests were subject to the exact same broken proxy routing as the real browser, but the
  pool's partial coverage happened to be sufficient in that specific, repeatable test
  scenario. This made the automated tests an unreliable signal for the entire investigation
  and was not identified as such until very late.
- `git bisect` across the full commit range from the last confirmed-good baseline through
  the session start correctly found **zero regressions in application code** — because the
  defect was in a config file's proxy rules, not in any commit under test, and reproduced
  identically regardless of which commit was checked out.

## 4. How it was actually found

A purpose-built diagnostic tool (see §5) traced the CAPITAL domain's connector call and
showed: `connector: worldbank · status: resolved · records: 0 · latency: ~2.5s`. This was
the first evidence that distinguished "the connector ran and failed silently" from every
other hypothesis tested (data pipeline logic, rendering/geometry code, browser cache,
extensions, WebGL context loss, external rate limits, git history regression).

From there, a direct `curl` comparison made the defect immediate and undeniable:
```
curl http://localhost:5173/api/worldbank   -> 404 Not Found   (via Vite's broken proxy)
curl http://localhost:4000/api/worldbank   -> 200 OK, real data (direct to as-diff/engine.js)
```

## 5. Detection tooling built during this investigation

- **KRYL-DIAG-1 — Domain Provenance Trace** (`3c67576`): extends the existing
  `telemetry.js` event backbone (no new store) with a `DOMAIN_PROVENANCE_EVENT` type,
  emitted at connector dispatch/resolve/fail boundaries. A dev-only panel
  (`?debug=1`, `src/components/diagnostics/domainprovenancepanel.jsx`) renders the latest
  status per canonical domain plus an environment fingerprint (host, port, commit SHA,
  build timestamp). This is what actually surfaced the "resolved, 0 records" signature that
  cracked the case.
- **KRYL-DIAG-2 — Proxy Route Drift Prevention** (`abd2ce9`):
  `scripts/verify-proxy-routes.mjs`, wired as `predev` in `package.json`. Diffs the routes
  `as-diff/engine.js` implements against the routes `vite.config.js` explicitly maps to a
  local target, fails loudly on any gap. Runs automatically before every local dev server
  start.

## 6. Root cause, restated precisely

`vite.config.js` carried a stale top-of-file comment: *"Local mock server no longer
required — all traffic routed to VPS."* This appears to reflect an earlier architecture
decision that predates the `as-diff/engine.js` local proxy engine's current scope. As
`as-diff/engine.js` grew to implement ~30 real connector routes over time, no corresponding
process existed to ensure each new route also got an explicit local Vite proxy rule — routes
were added to the server without a matching rule being added to the proxy config, and
nothing caught the drift because the failure mode was silent by design (connectors are
built to degrade gracefully on failure, which is correct behavior — but that same graceful
degradation is what hid the routing defect).

## 7. Prevention

1. `scripts/verify-proxy-routes.mjs` (§5) makes this specific drift impossible to introduce
   silently going forward — any new `as-diff/engine.js` route without a matching proxy rule
   now fails the dev server startup immediately.
2. The Domain Provenance Trace panel remains available as a general-purpose diagnostic for
   *other* future failure modes this specific check can't catch (e.g., a route that's
   proxied correctly but the upstream API itself changes behavior or starts failing).

## 8. Open follow-up (not yet done)

- The stale "all traffic routed to VPS" comment in `vite.config.js` should be corrected to
  reflect the current, real architecture (local routes for local development, VPS-only for
  what's genuinely VPS-only).
- Extend `verify-proxy-routes.mjs` coverage/CI integration beyond local `predev` (e.g., a
  CI check) if this class of drift should also be caught before merge, not just before a
  local session.
- The Domain Provenance Trace panel currently reports `outputCount: 0` for every connector
  regardless of how many records were actually dispatched, because most connector functions
  return `undefined` rather than the dispatched array — the count reflects the function's
  return value, not what reached `surfaceRouter`. Cosmetic imprecision, did not affect this
  investigation's outcome, but worth fixing for future accuracy.
