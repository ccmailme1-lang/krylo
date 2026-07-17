# KRYL-1027 — Gas Go: EIA Average Fallback (Free Tier)
## Slice spec · Hardened per §11a — Bottle Test v1.0 · HIDDEN / NON-BROADCAST UTILITY

---

## HEADER

**KRYL-1027 slice — EIA Average Fallback**
Date: 2026-07-12
Author: qualified draft (Founder-directed)
Target file(s): `as-diff/engine.js` (NEW price proxy route), `src/engine/petrolocator.js` (ADD `findAverageFuel`), `src/components/analysis/petrotemplate.jsx` (free-tier render), `mock-server.cjs` + `vite.config.js` (dev)

Positioning: the **free floor** under the parked Zyla station layer. Same quarantine as the parent Petro Locator — BRAND/UTILITY, never the signal engine. When Zyla subscribes later, the paid per-station result sits on top; this EIA average remains the fallback when a station price is unavailable or withheld.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** On a "Gas Go" query, return the current EIA weekly **average** retail fuel price for the user's region — with no per-station claim.

**Output:** One regional-average result — `{ scope, area, average, period, type, source:'EIA' }` — or an honest `withheld`.

---

## 2. BOUNDARY DECLARATION

**Input contract:** the trigger phrase + the user's real geolocation (`geolocate()`, `weather.js`) → reverse-geocoded **state** (Nominatim, already used by `coordsToZip`).

**Output contract:**
```
AvgResult = { scope: 'STATE'|'PADD'|'NATIONAL', area, average: number, period: 'YYYY-MM-DD',
              type: 'regular'|'diesel'|'premium'|'mid-grade', currency:'USD', source:'EIA' }
```
on success; `{ withheld:true, reason }` on any geo/API/empty failure.

**Explicit exclusions:** does NOT feed `liveSignals` / `surfaceRouter` / the truth engine / any cone, convergence, or metric. Does NOT make a per-station or "cheapest pump" claim — EIA is regional-average only. Does NOT touch the existing `/api/eia` **stocks** proxy or the `eiaconnector.js` signal path. Does NOT replace `findCheapestFuel` (Zyla station layer) — it is a sibling fallback.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → `petrotemplate.jsx` renders the average from `findAverageFuel` output only; NO new signal-engine dependency.
- [x] Inference layer NOT touched → no writeback to any score/signal. EIA price never becomes a signal.

**Drift notes:** Quarantined identically to the parent feature. The only shared reads are `geolocate()` and the reverse-geocode helper. The EIA **price** dataset is distinct from the EIA **stocks** dataset already ingested by `eiaconnector.js` — no overlap, separate proxy route.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** None on the core mission — utility, non-broadcast (§11a Founder-approved as a hidden feature, consistent with the parent Petro Locator spec).

---

## 5. OUTPUT GRAVITY

**"The single thing this produces that matters most is a real EIA weekly average for the user's region — or an honest 'no regional data' — never a fabricated station price."**

---

## 6. FORMULA / CONTRACT

No computation. Pass-through of EIA's published weekly average (USD/gal). §16 0–100 normalization does **not** apply — this is a NON-SIGNAL utility value, exempt exactly as the parent feature's price is.

**EIA v2 — Gasoline and Diesel Fuel retail prices (Weekly):**
```
GET https://api.eia.gov/v2/petroleum/pri/gnd/data/
    ?frequency=weekly
    &data[0]=value
    &facets[product][]=<EPM0|EPD2D|EPMPU|EPMMU>     # regular|diesel|premium|mid-grade
    &facets[duoarea][]=<NUS | PADD code | state code>
    &sort[0][column]=period&sort[0][direction]=desc&length=1
    &api_key=<EIA_API_KEY>                            # proxy-held, never in browser
Response: { response: { data: [ { period:'YYYY-MM-DD', value:<usd/gal>, ... } ] } }
average = data[0].value ; period = data[0].period
```

**Geo → duoarea resolution (fail up, never fabricate):**
```
state (from reverse-geocode)
  → if state ∈ EIA covered states {CA,CO,FL,MA,MN,NY,OH,TX,WA} → STATE duoarea  (scope:'STATE')
  → else map state → its PADD region → PADD duoarea               (scope:'PADD')
  → else / on any miss → NUS (national)                           (scope:'NATIONAL')
```
NATIONAL is the guaranteed floor: `duoarea=NUS` series always resolve. The exact STATE/PADD `duoarea` codes are read at build time from EIA's own facet listing (`/v2/petroleum/pri/gnd/facet/duoarea`) — a **defined** dependency (EIA authoritative facet endpoint), not an open TBD. If a code does not resolve, the row falls to NATIONAL rather than guessing.

**Withhold (§19/§22):** empty `data`, non-200, or any geo/fetch failure → `{ withheld:true }`. Never a fabricated or interpolated price.

Units: USD/gallon.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `as-diff/engine.js` | ADD `/api/eia-fuel` proxy pinned to `/v2/petroleum/pri/gnd/data/`, same key-from-env + cache pattern as `handleEiaProxy`, longer TTL (weekly data → ≥6h). | existing `/api/eia` stocks proxy, all other routes |
| `src/engine/petrolocator.js` | ADD `findAverageFuel({ type })`: geolocate → reverse-geocode state → duoarea resolve → `/api/eia-fuel` faceted query → `AvgResult` / withheld. ADD a small `STATE→duoarea` + `STATE→PADD` map. | `findCheapestFuel`, `isPetroQuery`, `petroType`, `coordsToZip` |
| `src/components/analysis/petrotemplate.jsx` | ADD free-tier render: when the station result is absent/withheld, show the honest regional-average line (`"<AREA> <type> avg · wk of <period> · $<avg> — EIA"`). | station-result render path |
| `src/components/analysis/targetpacket.jsx` | Orchestration: call `findAverageFuel` alongside/as fallback to `findCheapestFuel`; pass both into `PetroTemplate`. | signal panels, all engine wiring |
| `mock-server.cjs` + `vite.config.js` | Dev: `/api/eia-fuel` mock/proxy so it is testable on localhost. | — |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — one deterministic regional-average output |
| Does this have a single dominant output? | YES — `AvgResult` |
| Are all boundaries explicitly defined? | YES — quarantined; separate proxy; national floor guaranteed |
| Can this be built without touching an undefined dependency? | YES — EIA prices dataset + facet endpoint are defined; key already provisioned |
| Does this avoid increasing expressive flexibility in the core? | YES — core untouched; isolated utility |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**SI:** No engine invariant touched; new proxy route is additive; stocks proxy untouched. **SC:** "petro/fuel" namespace already non-signal; "average" is honestly distinct from the Zyla "cheapest station" claim. **EC:** Side effects bounded to the module, one proxy route, and the Petro template. **DE:** Static contract; scope tag makes granularity self-declaring, no living definition.

**Outcome tag:** CONSTRAINED — PASS with note: **honesty of scope** — the UI must always print which geographic scope it achieved (STATE/PADD/NATIONAL) so a national number is never read as a local one. A regional average must never be dressed as a station price.

---

## 10. DEFINITION OF DONE

**Verification:**
1. `GET /api/eia-fuel?...&facets[duoarea][]=NUS&facets[product][]=EPM0&frequency=weekly&length=1` returns a real `{ period, value }` through the proxy (no key in the response).
2. `findAverageFuel({ type:'regular' })` returns a populated `AvgResult` with a real `average` + `period`, or `{ withheld:true }` on failure.
3. A "Gas Go" query with no Zyla subscription renders the EIA regional-average line **with its scope label**; a no-data case shows "no regional data," never a fabricated number.
4. `grep` confirms the EIA key string appears in NEITHER `dist/` NOR any client file — only server-side (`process.env.EIA_API_KEY`).

---

## NOTES

- Free tier. Weekly cadence (EIA releases Mondays). Cache ≥6h.
- Relationship to Zyla: station layer (paid, parked) is the upgrade; this EIA average is the always-available floor and the withhold-safe fallback.
- Coverage limit is real and permanent: EIA is national/PADD/9 states/~10 metros. It will never resolve a per-ZIP or per-station price. The scope label is the honesty mechanism.
