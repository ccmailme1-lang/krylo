# Six Domain Cards — Completion Plan

Request: Mr. XS — wire all 6 cards (DOMAIN / QUESTION / WINDOW / EVIDENCE / CONNECTIONS / THESIS)
as the Context Projection Layer on the search page (distinct from §18's Truth Projection Layer /
Domain Metrics Matrix).

Status: STARTED or DONE only. Unlisted status = not touched yet.

---

## 1. DOMAIN
No card exists yet. Data source is real and free: `selectedDomains[0]` (analysisidlefield.jsx)
→ `ANALYSIS_PILL_TO_DOMAIN` map. No Founder decision needed to build.

## 2. CONNECTIONS
No card exists yet. Data source is real: `entitytopologyregistry.js` — `getTypedEdgesFor()` /
`findPath()`, live SEC 13D/13G data. Card = gateway (click opens Six Degrees view), not a raw
number. No Founder decision needed to build.

## 3. QUESTION
Source: `querysynthesis.js` — `resolutionEligible` / `state: HOLD` fields, real.
Needs from Mr. XS: label wording for the card (e.g. "UNRESOLVED" / "ACTIVE", or your terms).

## 4. EVIDENCE
Blocker: `availabilityfilter.js` only scores already-fetched connector output — no free
pre-search count exists today.
Needs from Mr. XS: pick one — (a) live-fetch on chip click (real API cost per click), or
(b) last-known count from prior queries in that domain (persisted, no live cost).

## 5. WINDOW
Blocker: `computeStructuralMomentum()` (structuralconfirmation.js) exists but its
`eventHistory` input is fed by nothing anywhere in the app — dead code, no live data.
Needs a new append-only per-domain event-history store (same pattern as pathstore.js).
Needs from Mr. XS: thresholds mapping momentum's -1..1 output to Immediate / Developing /
Structural / Historical.

## 6. THESIS
Blocker: `computeSCI()` / `computeSPS()` output numeric scores only — no existing classifier.
Needs a new classifier module reading those scores.
Needs from Mr. XS: thresholds mapping SCI/SPS ranges to Unknown / Forming / Supported /
Confirmed / Fractured.
