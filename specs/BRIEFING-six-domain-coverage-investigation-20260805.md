# BRIEFING — Six-Domain Cone Coverage Investigation (2026-08-05/06)

**Purpose:** Grounded factual input for a Founder-authored spec. Not a spec itself. Every
claim below is labeled by evidence class per §25/§26 (verified live / verified via code /
inference / still unknown). Nothing in this document should be cited as fact without its
evidence label.

**Symptom (user-facing, real, reproduced repeatedly on the Founder's actual browser):**
On the activated Surface screen, OWNERSHIP/MEDIA/LABOR consistently show real values
(~92/91/89). CAPITAL/TECHNOLOGY/KNOWLEDGE consistently show 0% / no signal. Same three
domains, every time, across many hours of testing.

---

## 1. What's VERIFIED — runtime-proven, not inferred

### 1a. The six-domain contract itself is intact
- `src/engine/ontology.js` — `CANONICAL_DOMAINS` = exactly 6: capital, ownership, labor,
  media, technology, knowledge. Single source of truth, imported everywhere else.
- `ConeMap`'s domain-state construction (in every version tested tonight, from 7/09 through
  the current build) always produces exactly 6 entries. Confirmed via direct instrumentation
  of the render loop and the `Cone` component invocation — never fewer than 6, never more.
- **Evidence class: runtime-verified (direct console instrumentation + screenshots).**

### 1b. It is not a rendering/geometry bug
- Cone height/radius formula (`src/engine/coneencoding.js`) and `CONE_HEIGHT_SCALE` (6.5) are
  byte-identical between the confirmed-working 7/24 build and the confirmed-broken pre-session
  build (`aa7a42f`). The only difference anywhere in cone-sizing code across that whole range
  is a height floor constant (0.2 vs 0.6) — cosmetic, affects only how a zero-pressure cone
  looks, cannot affect whether a domain has data in the first place.
- The affected domains show **0% as literal panel text** (24H VOLATILITY INDEX list), not just
  a small/invisible 3D shape. This is a data value, independent of any 3D rendering.
- **Evidence class: runtime-verified (diff comparison + screenshot).**

### 1c. It is not a regression in this codebase's commit history
- `git bisect` (retry-hardened against network flakiness — 2-of-3 majority per candidate) was
  run across the entire range from the confirmed-good 7/27 baseline (`1af0e2d`) through the
  pre-session HEAD (`aa7a42f`) — roughly 40 commits. **Every single commit tested clean**
  (6/6 real domains) under repeated automated testing.
- The bisect could not identify a "first bad commit" inside this range because there wasn't
  one under that test. This means: whatever produces the symptom on the Founder's actual
  browser is not a function of which commit is checked out.
- **Evidence class: runtime-verified (automated git bisect, retry-hardened, ~50 test runs).**

### 1d. A real, separate build-breaking bug was found and fixed (different issue)
- The Founder's own local `yarn dev` terminal session (separate process, confirmed via pasted
  terminal output) was hitting a genuine error: `querysynthesis.js` imports
  `groundSignalMetrics` from `canonicalresolution.js`, which didn't export it at that commit
  (introduced by commit `e2c364a`, 7/21, never fixed at that point in history).
- Fixed by restoring the working implementation (recovered from commit `1182489`). Applied at
  both the 7/24 and 7/27 baselines. **This fix is real and necessary, but is NOT confirmed to
  be the cause of the six-domain symptom** — the symptom has been observed both with and
  without this bug present.
- **Evidence class: verified via code (missing export, confirmed by build error) + fix
  verified via successful build.**

### 1e. Domain → data source mapping (verified via code read)
| Domain | Primary sources | API key required locally? |
|---|---|---|
| OWNERSHIP, MEDIA, LABOR | Large bundled/pool dataset (`/api/signals`, proxied to krylo.org production) — confirmed balanced, ~1,300+ records per domain across all six, including CAPITAL/TECHNOLOGY/KNOWLEDGE | No |
| TECHNOLOGY | `githubconnector.js`, `npmconnector.js` | No |
| KNOWLEDGE | `arxivconnector.js`, `pubmedconnector.js`, `openalexconnector.js` | No |
| CAPITAL | `financialmarketconnector.js` (needs `VITE_ALPHA_VANTAGE_KEY`/`VITE_FINNHUB_KEY`), `eiaconnector.js` (needs `EIA_API_KEY`), Treasury + World Bank (fixed endpoint, no key) | Partially — 2 of CAPITAL's sources need keys that are **confirmed absent** from local `.env`/`.env.local` |

- The pool (`/api/signals`) itself was directly queried and found balanced across all 6
  domains (knowledge 1354, labor 1315, media 1315, ownership 1315, capital 1312,
  technology 1311) — so the imbalance is not in the shared background pool.
- **Evidence class: verified via code read (connector files) + live API query (pool balance)
  + existence-only checks (§24-compliant, confirmed absent, values never printed).**

### 1f. A real, external resource constraint exists and was confirmed live
- GitHub's unauthenticated API rate limit was checked live, twice, hours apart: **9 requests
  remaining** both times (out of a much higher normal ceiling) — not recovering between
  checks, consistent with continuous consumption from extensive testing.
- This directly affects TECHNOLOGY (GitHub/npm-dependent). It does not, by itself, explain
  CAPITAL or KNOWLEDGE, whose primary blocking sources (missing local API keys; Treasury/World
  Bank respectively) are different constraints.
- **Evidence class: verified live (direct `curl` against GitHub's API, `x-ratelimit-remaining`
  header read twice).**

### 1g. A real gap in the existing prewarm/caching system was found and fixed
- `as-diff/engine.js` already had a daily 4AM prewarm mechanism — but it covered **only**
  Gas Go fuel price sources (`apify:`, `eiafuel:` cache keys). GitHub, npm, arXiv, Treasury,
  World Bank were never included — every request to those was a live, on-demand call.
- Fixed: extended the same daily-4AM pattern to Treasury + World Bank (fixed-endpoint,
  no-API-key, no-user-query-text sources — the only ones that can be blanket-prewarmed
  without depending on what a user searches for). Verified server-side: "2/2 fixed-endpoint
  macro source(s)" refreshed successfully on server start.
- **This fix is real, committed, and verified server-side — but a follow-up real-browser test
  after this fix still showed CAPITAL at 0%.** This is a direct, confirmed contradiction that
  is NOT yet explained: the cache has real data, but it is not reaching CAPITAL's displayed
  value. Either the cached data isn't actually consumed by whatever computes CAPITAL's score,
  or CAPITAL's score depends on something else that this fix didn't address.
- **Evidence class: fix verified server-side (log output); downstream effect on the
  user-visible symptom explicitly NOT confirmed — retested and still failing.**

---

## 2. What was tested and RULED OUT tonight (with evidence)

| Hypothesis | Test performed | Result |
|---|---|---|
| Login/access-code gate blocking rendering | Removed the gate entirely (`ProfilePicker` unmounted), retested | Symptom unchanged |
| Browser cache | Full cache clear | Symptom unchanged |
| Browser choice | Switched browsers | Symptom unchanged |
| Extensions/ad-blockers | Incognito window | Symptom unchanged |
| Stale/duplicate local server processes | Killed all, clean restart of vite/mock-server/as-diff | Symptom unchanged |
| Long-lived browser tab / WebGL context accumulation | Brand new tab | Symptom unchanged |
| Missing WebGL context-loss guard on some Canvas mounts | Audited all 5 `<Canvas>` mount points in the codebase | 4/5 already guarded; the 1 unguarded one (`signalmap.jsx`) is dead code, not imported anywhere live |
| Code regression in commit history | Retry-hardened `git bisect`, ~40 commits, ~50 test runs | Every commit tested clean |
| Cone geometry/sizing code | Direct diff of `coneencoding.js` and `CONE_HEIGHT_SCALE` across working/broken builds | Byte-identical except a cosmetic floor constant |
| Pool data imbalance | Direct query of `/api/signals` | Balanced across all 6 domains |
| Separate `yarn dev` process on a broken checkout | Found real missing-export build error, fixed it | Fixed a real bug, but symptom was observed both before and after this fix |

---

## 3. What remains genuinely UNKNOWN

1. **Why does the exact same 3-domain split persist across every local variable tested** —
   browser, tab, cache, extensions, commit, server-restart — while my own automated
   (headless, server-side) tests on this same machine consistently show all 6 domains
   resolving correctly within ~10 seconds?
2. **Why did the Treasury/World Bank prewarm fix not change CAPITAL's displayed value**, given
   the cache was confirmed to actually contain fresh data server-side immediately after the
   fix? This is the single most concrete unresolved contradiction — it implies the connector
   or aggregation code that's supposed to read that cache and turn it into CAPITAL's score is
   not doing so, for a reason not yet identified.
3. **Is the Founder's actual browser hitting the same local server processes I've been
   testing against**, or is there still an unresolved environment/networking difference? (This
   was investigated at length — health-check endpoints on `localhost:4000` and `localhost:5173`
   responded correctly from the Founder's browser — but the underlying question of whether
   *all* traffic from that browser resolves to this same machine's processes was never fully,
   independently confirmed beyond those two health checks.)
4. No Jira ticket or prior commit matching "fixed the same three-cone issue in late July" was
   found despite a targeted search of both git history and Jira. The Founder's memory may be of
   a different but adjacent fix (e.g., `KRYL-1085` absence-as-state, `KRYL-1088` convergence
   honesty, both July 20) rather than this exact six-domain-coverage symptom.

---

## 4. Parameters likely relevant to a real spec

- Which layer is authoritative for "does CAPITAL have data": the cache (`as-diff/engine.js`
  `PROXY_CACHE`), the connector fetch functions, the aggregation step (`aggregateSignals`),
  or something else? This chain was never traced end-to-end with live instrumentation at
  every hop in a single test — only at the endpoints (cache confirmed warm; final displayed
  value confirmed still 0%).
- Whether CAPITAL's connector code (`financialmarketconnector.js`) is even being called for a
  typical query, or whether it's gated behind something (e.g., a domain-relevance check) that
  never fires for the test queries used tonight.
- Whether the real, root fix requires actual API keys (`VITE_ALPHA_VANTAGE_KEY`,
  `VITE_FINNHUB_KEY`, `EIA_API_KEY`) that are confirmed absent locally — in which case no
  amount of caching or code fixes can produce genuine live CAPITAL data locally, only from the
  bundled pool (which is confirmed balanced and available).
- Whether the acceptance bar for "fixed" should be: (a) real, live, per-query data for all 6
  domains at all times, or (b) the already-committed `AWAITING SIGNAL` / explicit-state
  behavior (KRYL-1158, built and verified earlier tonight, currently reverted out of `main`)
  where a domain honestly shows its real absence-of-data state instead of a bare 0, while the
  pool/ambient data still provides a real (if less fresh) baseline reading.
