# KRYLO Site Map — Navigation → Component → Data Source

Built 2026-08-03 after a long trace to find why cone coverage differed between screens.
Purpose: answer "which component renders here, and where does its data actually come from"
without re-deriving it from scratch. Update this file whenever a trace like that happens again
— that's the entire point of it existing.

---

## Top-level nav modes (`navMode` state in `src/app.jsx`)

| `navMode` value | Renders | Notes |
|---|---|---|
| `'surface'` | `OrientationSurface` (pre-activation) → `AnalysisField` (post-activation) | Default mode on load. Mutually exclusive on `surfaceActivated`. |
| `'analysis'` | `AnalysisIdleField` (idle/query state) → `TargetPacket` (once a session exists) | Separate component tree from Surface — do not assume they share behavior. |

**Known gotcha (fixed 2026-06-xx, see CLAUDE.md DEF-2087 history):** Surface and Analysis
activation used to be conflated (Surface nav icon force-activated Analysis). Now separate —
don't reintroduce that coupling.

---

## Surface flow (`navMode === 'surface'`)

```
OrientationSurface (pre-activation)
  props: signals={liveSignals}, maxCones={3}   <-- INTENTIONAL, by design, not a bug
  "hero" moment of Surface — deliberately capped to 3 cones for orientation.
        |
        | surfaceActivated becomes true
        v
AnalysisField (post-activation)
  props: signals={liveSignals}
  Should have access to all 6 domains — it does NOT submit queries or fire connectors
  itself; it's purely fed by liveSignals from the parent.
```

`surfaceActivated` + the query that populates `liveSignals` for this flow come from the
**hero iframe's `krylo-submit` postMessage** (`krylo2-feed.html` → `window.postMessage` →
`onSubmit` listener in `app.jsx`, ~line 1083). That listener already fires all 8 topic
connectors (see below) — Surface's post-activation view should already have real access to
all 6 cones, independent of the Analysis-tab fix made 2026-08-03.

---

## Analysis flow (`navMode === 'analysis'`)

```
AnalysisIdleField (src/components/analysis/analysisidlefield.jsx)
  Submits its own session directly: createSession(id, lens, query, tensor)
  — does NOT go through app.jsx's postMessage listener or handleSessionBootstrap.
        |
        v
TargetPacket (once activeSessionId exists)
```

**Bug found and fixed 2026-08-03:** `AnalysisIdleField`'s own `createSession` call never fired
the 8 topic connectors below — only the hero's `postMessage` path did. Result: submitting a
query from the Analysis tab's own search box never populated CAPITAL/TECHNOLOGY/KNOWLEDGE
cones (those connectors are the only source for those 3 domains). Fixed by adding the same
connector calls directly into `AnalysisIdleField`'s submit handler. **If a third query-entry
point is ever added, it needs these same calls too — this is not automatically shared.**

---

## The 8 "topic connectors" (query-gated, NOT ambient)

Fire only when a query is actually submitted — unlike EIA/network-topology/FRED/EDGAR/Kalshi,
which run on mount + interval regardless of user activity.

| Connector | Function | Dispatches to domain |
|---|---|---|
| `capitalrealizationconnector.js` | `runCapitalRealizationSync(q)` | `CAPITAL` |
| `githubconnector.js` | `runGithubSync(q)` | `TECHNOLOGY` |
| `npmconnector.js` | `runNpmSync(q)` | `TECHNOLOGY` |
| `arxivconnector.js` | `runArxivSync(q)` | `KNOWLEDGE` |
| `pubmedconnector.js` | `runPubmedSync(q)` | `KNOWLEDGE` |
| `openalexconnector.js` | `runOpenAlexSync(q)` | `KNOWLEDGE` |
| `usajobsconnector.js` | `runUsajobsSync(q)` | `LABOR` |
| `gdeltconnector.js` | `runGdeltSync(q)` | `MEDIA` |
| `redditconnector.js` | `runRedditSync(q)` | `MEDIA` |

Called from: `app.jsx` `onSubmit` (krylo-submit postMessage listener) AND
`analysisidlefield.jsx`'s submit handler (added 2026-08-03). **Any new query-submission entry
point must call these too, or its cones will be incomplete for CAPITAL/TECHNOLOGY/KNOWLEDGE.**

---

## The cone pipeline (data → visual)

```
liveSignals (src/app.jsx, useMemo from mergedRecords)
        |
        v
buildActiveCones(liveSignals, coneColorOverrides)   <-- src/engine/cones.js
        |
        | Always returns 6 keys (capital, ownership, labor, media, technology, knowledge).
        | Each key gets REAL derived data if any live signal mapped to it via SIG_TO_CONE,
        | else falls back to a static MOCK value (CONES[d] in cones.js).
        v
activeCones
        |
        +--> <BayVisor cones={activeCones} />           (app.jsx)
        +--> <AnalysisIdleField activeCones={activeCones} />  (Analysis tab)
```

**Doctrine note (§22 Absence-is-Signal):** whatever actually renders cones on screen must
show only domains with REAL data, not the static `CONES[d]` mock fallback — that fallback
exists in `cones.js` for a reason but should never reach the user as if it were live
(`STUB_SIGNALS` fabricated-fallback removal, commit `ab1c2ea`, 2026-07-04, was exactly this
fix). If a cone is missing on screen, first ask "does this domain have real signals mapped to
it" before assuming the renderer is broken.

---

## Cluster/multi-cone rendering (`spinemap.jsx` + `clusterfield.jsx`)

`ClusterField` is single-use — only ever rendered by `spinemap.jsx`, nowhere else in the
codebase (checked 2026-08-03). If this pair needs another debugging pass, that split is worth
reconsidering as its own scoped architecture WO (per CLAUDE.md §4 — a rendering-architecture
change needs explicit sign-off, not a casual merge).

`ClusterField` takes up to 8 items (`source.slice(0, 8)`) from either a `topology` prop (never
actually passed by any current caller — always falls through) or a `signals` prop.

---

## How to extend this file

When a "why doesn't X show up" trace like this happens again: add the finding here as its own
section, in the same format (component → data source → known gotcha). Don't let this go stale
— it exists specifically to prevent redoing multi-hour traces from scratch.
