# Analysis Bay Domain Taxonomy Unification

**Status: SPEC DRAFT — not built. Part of the larger "domain-organized signal field" initiative (replacing analysissubstrate.jsx's random particles with real signal nodes, US-geo constraint removed, domain-filterable).**

## Problem

Two different domain taxonomies exist in the codebase today:
- **Locked six-domain taxonomy** (used everywhere in the engine — `domainpackage.js`'s `DOMAINS`, surfacerouter.js, RBCS, etc.): `TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP`
- **Analysis Bay UI pills** (`analysisidlefield.jsx`, `domains` array + `DOMAIN_PRECURSORS`): `FINANCIAL, MARKET, LEGAL, HEALTH, CAREER, TECHNOLOGY`

This split means "filter by domain" in the Analysis Bay can't cleanly connect to any real engine-side domain filtering without a mapping layer.

## Derived mapping (from real `DOMAIN_PRECURSORS` keyword content, `analysisidlefield.jsx` lines 73-79 — not invented)

| Analysis pill | Real keywords | → Locked domain |
|---|---|---|
| FINANCIAL | RATE ENVIRONMENT, CREDIT SPREADS, M2 VELOCITY | CAPITAL |
| MARKET | EQUITY FLOW, VOLATILITY IDX, SECTOR ROTATION | CAPITAL |
| LEGAL | REGULATORY SHIFT, CASE VELOCITY, COMPLIANCE FLUX | KNOWLEDGE |
| HEALTH | COVERAGE GAP, COST TRAJECTORY, ACCESS SIGNAL | LABOR |
| CAREER | LABOR PRESSURE, HIRE VELOCITY, WAGE FLUX | LABOR |
| TECHNOLOGY | ADOPTION RATE, PATENT FLUX, DEPLOY SIGNAL | TECHNOLOGY |

Note: FINANCIAL and MARKET both map to CAPITAL, and HEALTH and CAREER both map to LABOR — this is a real many-to-one relationship, not an error.

**RESOLVED 2026-07-06:** MEDIA and OWNERSHIP pills added directly (`analysisidlefield.jsx`) — no consumer-friendly rename needed, both words are already plain-language. Precursor keywords derived from what the real connectors for each domain actually measure: MEDIA (`gdeltconnector.js` — news article volume/tone; `fecconnector.js` — political spend) → `NEWS VELOCITY, NARRATIVE SHIFT, MESSAGE SPEND`. OWNERSHIP (`maerskconnector.js` — "physical supply chain constraint"; `censusconnector.js` — ownership/demographic data) → `SUPPLY CONSTRAINT, CONTROL SHIFT, ASSET CONCENTRATION`. Now 8 pills total, all mapping cleanly to the locked six.

An earlier draft of this mapping proposed secondary domains (MARKET→CAPITAL/OWNERSHIP, LEGAL→OWNERSHIP/KNOWLEDGE, HEALTH→LABOR/KNOWLEDGE, CAREER→LABOR/KNOWLEDGE). Those secondary assignments are **not supported by the real keyword content** in `DOMAIN_PRECURSORS` and are not included here. If real evidence for them surfaces elsewhere in the codebase, this table should be revised — not guessed forward from here.

## Scope (this spec only)

- Add a mapping constant (e.g. `ANALYSIS_PILL_TO_DOMAIN` in `analysisidlefield.jsx` or a shared location) implementing the table above.
- Does NOT touch `domainpackage.js`'s locked `DOMAINS` array — the locked six stay exactly as they are.
- Does NOT yet wire this into the node-field filtering (that's the larger initiative this spec supports — see Related).

## Open questions

1. ~~MEDIA and OWNERSHIP have no Analysis pill today~~ — RESOLVED 2026-07-06, both added.
2. Where does the mapping constant live — `analysisidlefield.jsx` itself, or a shared file importable by both the UI and whatever node-filtering logic consumes it? Still open — not needed until the node-field filtering is actually built.

## Related

Part of the larger initiative: replace `analysissubstrate.jsx`'s random particle field with domain-positioned signal nodes (pattern adapted from `spinemap.jsx`, US-geo constraint removed), with these 8 pills as live filters. Architecture decided: **new component**, not modifying `spinemap.jsx` in place. Data access decided: Analysis Bay gets full/unrestricted signal access, not a filtered subset. Not yet built.
