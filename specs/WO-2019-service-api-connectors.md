# WO HARDENING — Service API Connector Batch
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2019 — Service API Connectors (Free Signal Sources)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/{connector}.js (13 files) · server.cjs (13 proxy routes)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** For each free public API listed below, fetch structural data,
normalize to a 0–100 signal, and dispatch into surfacerouter.js via
dispatchBatch(). One connector per source. No interpretation — raw
observable facts only.

**Output:** dispatchBatch([{ source, domain, signal, confidence, ts }]) per
connector. All connectors follow the same shared contract (§6).

---

## 2. BOUNDARY DECLARATION

**Shared input contract (all connectors):**
- Public/free API endpoint — no paid tier required
- Server-side proxy route in server.cjs — no CORS exposure
- `topic` or `query` param forwarded from caller

**Shared output contract:**
- `signal` ∈ [0, 100] — normalized structural activity measure
- `confidence` ∈ [0, 1] — data freshness + result density
- Dispatch: `dispatchBatch([{ source, domain, signal, confidence, ts }])`
- No direct cone writes. surfacerouter assigns domain pressure.

**Explicit exclusions (all connectors):**
- No modification of surfacerouter routing logic
- No write operations to any external API
- No user PII collected or stored
- No modification of convergenceclassifier, metricsengine, or HP logic
- No new signal schema — existing { source, domain, signal, confidence, ts }

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  NOTE: All 13 connectors are read-only ingestion adapters. They do not
  alter what any domain means in KRYLO's model — they add pressure to it.

**Drift notes:** Each connector is isolated. A broken connector returns
signal=0, confidence=0 — it cannot contaminate the shared pool.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** KRYLO's 6-domain model currently reads lagging indicators.
These 13 free APIs surface structural facts 6–24 months before mainstream
coverage: commit velocity before press, research preprints before patents,
BLS quit rates before wage headlines, yield auction demand before rate
commentary. Each connector independently advances the "know first" mission.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces is 13 normalized signal dispatches —
one per free public API — flowing into surfacerouter.js and enriching the
6-domain pressure field with structural evidence that precedes consensus."**

---

## 6. FORMULA / CONTRACT

### Universal normalization rule

```
signal     = clamp(rawScore, 0, 100)  // all formulas output 0–100
confidence = clamp(freshnessWeight × densityWeight, 0, 1)
ts         = Date.now()
```

### Connector registry

| # | Connector file | Source tag | Domain | API endpoint | Signal formula |
|---|----------------|------------|--------|--------------|----------------|
| 1 | githubconnector.js | GITHUB | TECHNOLOGY | `api.github.com/search/repositories` | `0.40×log_repo_count + 0.35×log_avg_stars + 0.25×commit_vel/500 × 100` |
| 2 | arxivconnector.js | ARXIV | KNOWLEDGE | `export.arxiv.org/api/query` | `min(100, papers_per_week / baseline_rate × 50)` where baseline=2/wk |
| 3 | npmconnector.js | NPM | TECHNOLOGY | `api.npmjs.org/downloads/point/last-week/{pkg}` | `min(100, current_dl / 52wk_avg × 50)` |
| 4 | pubmedconnector.js | PUBMED | KNOWLEDGE | `eutils.ncbi.nlm.nih.gov/esearch.fcgi` | `min(100, result_count / 500 × 100)` (last 12mo publications) |
| 5 | openalexconnector.js | OPENALEX | KNOWLEDGE | `api.openalex.org/works` | `min(100, cited_by_count_velocity / 50 × 100)` (citation growth rate) |
| 6 | blsconnector.js | BLS | LABOR | `api.bls.gov/publicAPI/v2/timeseries/data/` | quit rate series JOLTS: `quit_rate / 3.5 × 100` (3.5% = historical peak) |
| 7 | usajobsconnector.js | USAJOBS | LABOR | `data.usajobs.gov/api/search` | `min(100, posting_count / 500 × 100)` (keyword-filtered federal postings) |
| 8 | treasuryconnector.js | TREASURY | CAPITAL | `api.fiscaldata.treasury.gov/v1/accounting/od/avg_interest_rates` | yield curve stress: `clamp((10yr - 2yr + 2) / 4 × 100, 0, 100)` |
| 9 | worldbankconnector.js | WORLDBANK | CAPITAL | `api.worldbank.org/v2/country/{cc}/indicator/NY.GDP.MKTP.KD.ZG` | `clamp(50 + gdp_growth_delta × 10, 0, 100)` |
| 10 | gdeltconnector.js | GDELT | MEDIA | `api.gdeltproject.org/api/v2/doc/doc` | `min(100, article_count / 200 × 100)` (tone-weighted, 24hr window) |
| 11 | redditconnector.js | REDDIT | MEDIA | `www.reddit.com/search.json` | `min(100, post_velocity × upvote_ratio × 100 / 50)` |
| 12 | fhfaconnector.js | FHFA | OWNERSHIP | `api.stlouisfed.org/fred/series/observations?series_id=USSTHPI` | `clamp(50 + hpi_yoy_change × 5, 0, 100)` |
| 13 | usgsconnector.js | USGS | OWNERSHIP | `waterservices.usgs.gov/nwis/iv/` | `clamp(100 - drought_percentile, 0, 100)` (physical constraint inversion) |

### Proxy route pattern (server.cjs)

```js
app.get('/api/{source}', async (req, res) => {
  const { q } = req.query;
  const data = await fetch(UPSTREAM_URL + encodeURIComponent(q));
  res.json(await data.json());
});
```

### Connector module pattern (each connector)

```js
export async function run{Source}Sync(topic) {
  const raw  = await fetch('/api/{source}?q=' + encodeURIComponent(topic));
  const data = await raw.json();
  const signal     = normalize(data);
  const confidence = computeConfidence(data);
  dispatchBatch([{ source: '{SOURCE}', domain: '{DOMAIN}', signal, confidence, ts: Date.now() }]);
}
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/githubconnector.js` | NEW | — |
| `src/engine/arxivconnector.js` | NEW | — |
| `src/engine/npmconnector.js` | NEW | — |
| `src/engine/pubmedconnector.js` | NEW | — |
| `src/engine/openalexconnector.js` | NEW | — |
| `src/engine/blsconnector.js` | NEW | — |
| `src/engine/usajobsconnector.js` | NEW | — |
| `src/engine/treasuryconnector.js` | NEW | — |
| `src/engine/worldbankconnector.js` | NEW | — |
| `src/engine/gdeltconnector.js` | NEW | — |
| `src/engine/redditconnector.js` | NEW | — |
| `src/engine/fhfaconnector.js` | NEW | — |
| `src/engine/usgsconnector.js` | NEW | — |
| `server.cjs` | EXTEND — 13 proxy routes added | All existing routes untouched |

No other files touched. surfacerouter.js, convergenceclassifier.js, and
metricsengine.js are read-only consumers of dispatchBatch output.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Reduces ambiguity? | YES — each signal is a discrete observable fact with a deterministic normalization formula |
| Single dominant output? | YES — one dispatchBatch() call per connector; 13 connectors, 13 signals |
| All boundaries defined? | YES — all APIs are public/free; proxy routes in server.cjs; normalization formulas fully specified |
| No undefined dependencies? | YES — dispatchBatch() exists in surfacerouter.js; all endpoints publicly documented |
| No expressive flexibility increase in core? | YES — connectors are isolated adapters; zero changes to routing, scoring, or HP logic |

**Verdict: PASS — BUILD-READY.**

---

## 9. DEFINITION OF DONE

Per connector:
1. `/api/{source}?q={topic}` returns valid JSON from upstream.
2. `normalize()` returns signal ∈ [0, 100] for any valid response.
3. Empty/error response → signal=0, confidence=0, no crash, no dispatch.
4. `run{Source}Sync(topic)` calls dispatchBatch() with correct schema.
5. `grep "dispatchBatch"` in connector file — present and correct.
6. `grep "cone\|convergence\|metrics"` in connector file — zero direct writes.

Batch complete when all 13 connectors pass all 6 checks.
