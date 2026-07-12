# Petro Locator — Cheapest US Fuel Near Me
## Hardened per §11a — Bottle Test v1.0 · HIDDEN / NON-BROADCAST UTILITY

---

## HEADER

**Petro Locator**
Date: 2026-07-11
Author: qualified draft (Founder-directed feature)
Target file(s): `as-diff/engine.js` (proxy), `src/engine/petrolocator.js` (NEW client), `src/components/analysis/targetpacket.jsx` (materialization), `mock-server.cjs` + `vite.config.js` (dev)

Positioning: consumer utility, **off the core detect-asymmetry mission** — hidden, not broadcast. It is BRAND/UTILITY, never the signal engine. Isolation is load-bearing (Engine-vs-Brand).

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** On a "cheapest fuel/gas near me" query, geolocate the user and return the cheapest nearby US station.

**Output:** One cheapest-station result — `{ station, address, price, average, lowest, zip, type }` — or an honest `withheld`.

---

## 2. BOUNDARY DECLARATION

**Input contract:** the query string (trigger phrase) + the user's real geolocation (`geolocate()`, `weather.js`).

**Output contract:** `PetroResult = { station, address, price, average, lowest, zip, type }` on success; `{ withheld: true, reason }` when no station / API failure.

**Explicit exclusions:** does NOT feed `liveSignals` / `surfaceRouter` / the truth engine. Does NOT contribute to any signal, cone, convergence, or metric. Does NOT expose the Zyla key to the browser (proxy-held). It is a self-contained module that renders ONE isolated block in the Target Packet on its trigger only.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → the Target Packet block introduces NO new signal-engine data dependency; it reads only `petrolocator.js` output.
- [x] Inference layer NOT touched → no writeback to any score/signal.

**Drift notes:** Petro Locator is quarantined from the engine. A fuel price never becomes a signal. The only shared thing is `geolocate()` (read-only).

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** None on the core mission — this is a utility, explicitly non-broadcast. (Per §11a: infrastructure that does not advance the mission is allowed only with Founder approval — granted, as a hidden feature.)

---

## 5. OUTPUT GRAVITY

**"The single thing this produces that matters most is the cheapest fuel station near you — or an honest 'no local data'."**

---

## 6. FORMULA / CONTRACT

**Zyla Gas Price Locator (verified 2026-07-11):**
```
GET https://zylalabs.com/api/4808/gas+price+locator+api/5997/get+pices?zip={zip}&type={regular|mid-grade|premium|diesel}
Header: Authorization: Bearer <key>                (key from specs/petro_locator — proxy-held, never in browser)
Response: { status, zip, gas_type, currency, gas_prices: [ {average,lowest}, {station,address,price}, … ] }
  gas_prices[0] = aggregate {average,lowest} ; gas_prices[1..] = stations {station,address,price} ; price like "$2.33"
```
**Cheapest** = `argmin( parseFloat(price.replace('$','')) )` over `gas_prices[1..]`.
**Location → ZIP:** `geolocate()` → lat/lon → US Census Geocoder (free, no key: `geocoding.geo.census.gov/geocoder/geographies/coordinates`) → ZIP.
**Withhold (§19):** empty `gas_prices` stations, non-`success` status, or any fetch/geo failure → `{ withheld:true }`. Never a fabricated price.

Units: USD/gallon (strings normalized to numbers for comparison only).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `as-diff/engine.js` | ADD `/api/fuel?zip=&type=` proxy: sources key from `specs/petro_locator`, adds Bearer, calls Zyla, returns JSON. Key never leaves server. | existing routes |
| `src/engine/petrolocator.js` (NEW) | `findCheapestFuel({ type })`: geolocate → Census ZIP → `/api/fuel` → parse cheapest / withhold. Isolated, no engine imports. | — |
| `src/components/analysis/targetpacket.jsx` | Trigger detect (fuel/gas + near-me) → render ONE isolated Petro Locator block; withhold-safe. No other panel touched. | all signal panels |
| `mock-server.cjs` + `vite.config.js` | Dev: `/api/fuel` mock/proxy so it's testable on localhost without a prod deploy. | — |
| `specs/petro_locator` | The Zyla key — SECRET. Sourced, never printed. | — |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — one deterministic cheapest-station output |
| Does this have a single dominant output? | YES — `PetroResult` |
| Are all boundaries explicitly defined? | YES — quarantined from the engine, key proxy-held |
| Can this be built without touching an undefined dependency? | YES — Zyla contract verified, backend + geolocate located |
| Does this avoid increasing expressive flexibility in the core? | YES — the core is untouched; this is an isolated utility |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**SI:** No engine invariant touched; isolated module. **SC:** No new engine concepts; "petro" namespace is self-evidently non-signal. **EC:** Side effects bounded to the module + one Target Packet block; the proxy is the only server change. **DE:** Static contract; no living definition.

**Outcome tag:** CONSTRAINED — PASS with note: **key hygiene** — the proxy must never echo the key; the browser bundle must never contain it (verify no key string in `dist/`).

---

## 10. DEFINITION OF DONE

**Verification:**
1. `GET /api/fuel?zip=77478&type=regular` returns Zyla JSON (through the proxy, no key in the response).
2. `findCheapestFuel()` returns the min-price station, or `{ withheld:true }` on empty/failure.
3. The trigger query renders the Petro Locator block in the Target Packet; a no-data case shows "no local station data," never a fabricated price.
4. `grep` confirms the Zyla key string appears in NEITHER the browser bundle (`dist/`) NOR any client file — only server-side.

---

## NOTES

- Hidden / non-broadcast. Must never wear the KRYLO signal-intelligence badge.
- Dev-testability: `/api/fuel` needs a local mock (mock-server) + vite proxy, since dev otherwise proxies `/api/*` to prod krylo.org.
- Zyla is a 7-day trial; watch `X-Zyla-API-Calls-Monthly-Remaining` and fail closed (withhold) on quota exhaustion.
