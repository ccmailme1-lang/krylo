---
WO: 1856
Title: Patent Intelligence Connector — PatentsView
Status: FILED
Date: 2026-06-23
---

## Single Responsibility
Ingest technology velocity, assignee acceleration, and inventor migration signals from PatentsView, normalize to the shared pool contract, and dispatch via surfacerouter with multi-domain tagging and extended λ decay — without exposing raw patent data to any cone directly.

## Boundary Declaration
IN SCOPE:
- PatentsView API ingestion (technology velocity, assignee acceleration, inventor migration)
- Technology cluster whitelist filter at ingestion (AI, Semiconductor, Robotics, Energy Storage, Quantum, Defense, Biotech)
- Normalization to 0–100 signal scale before dispatch
- Multi-domain tag: TECHNOLOGY + OWNERSHIP + CAPITAL simultaneously
- Extended λ decay constant (quarterly window, not daily)
- ABSENT polarity dispatch when technology cluster velocity drops below established baseline
- Inventor migration edge data piped to entitytopologyregistry.js (WO-1855 dependency)
- dispatchBatch() via surfacerouter — no direct cone wiring

OUT OF SCOPE:
- Raw patent text or claim analysis
- Legal / freedom-to-operate analysis
- Real-time patent monitoring (PatentsView is weekly/monthly — not a live feed)
- Congressional PTRs, FEC filings, or any government political data
- Citation network traversal (deferred — complexity exceeds v1 scope)
- Any UI surface for patent signals

## Zero Drift
This WO touches ingestion and normalization only. It does not change: surfacerouter routing logic, cone pressure calculation, MCV formula, convergence classifier, or any UI component. The entitytopologyregistry.js update is additive only — inventor migration edges added, nothing removed.

## Strategic Leverage Statement
Patents are not invention announcements. They are evidence of future capital allocation — someone spent money to defend a technological position. PatentsView resolves inventor identity and assignee relationships into research-grade graph data, making inventor migration and technology cluster velocity tractable signals without preprocessing overhead. One connector produces three domain signals simultaneously and feeds two open WOs (1854: void detection via velocity baselines, 1855: entity topology via inventor migration). This is the highest-leverage free feed available for Krylo's current architecture.

## Output Gravity
Three signal types dispatched via dispatchBatch():

1. TECHNOLOGY_VELOCITY — normalized acceleration/deceleration of patent filings per cluster
2. ASSIGNEE_ACCELERATION — velocity change per organization within a cluster
3. INVENTOR_MIGRATION — directed edge: source org → destination org, with technology cluster tag

All three carry:
- polarity: POSITIVE | NEGATIVE | ABSENT (WO-1854 contract)
- topology: string[] (WO-1855 contract — inventor migration populates entity graph)
- domain: ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL']
- decay: 'QUARTERLY' (extended λ — patent SVs age out over quarters, not days)

## Formula / Contract
Signal unit (extended shared pool contract):
```
{
  source:   'PATENTSVIEW',
  domain:   ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL'],
  signal:   string,
  confidence: number (0–100),
  ts:       number,
  polarity: 'POSITIVE' | 'NEGATIVE' | 'ABSENT',
  topology: string[],
  decay:    'DAILY' | 'WEEKLY' | 'QUARTERLY'   // NEW FIELD — surfacerouter reads this
}

TECHNOLOGY_VELOCITY normalization:
  baseline = rolling 90-day median filing count per cluster
  delta    = (current_period - baseline) / baseline
  score    = clamp(50 + (delta * 50), 0, 100)
  polarity = delta > +0.15 → POSITIVE | delta < -0.15 → NEGATIVE | ABSENT if no filings in window

ASSIGNEE_ACCELERATION:
  per-org filing velocity change over 90-day rolling window
  score = clamp(50 + (org_delta * 50), 0, 100)

INVENTOR_MIGRATION:
  confidence = patent_count_at_destination / total_inventor_patents (0–1 → 0–100)
  topology   = [source_org_id, destination_org_id]
```

## File Map
- `src/engine/connectors/patentsviewconnector.js` — NEW: PatentsView API client, cluster filter, normalization, dispatchBatch()
- `src/engine/surfacerouter.js` — read `decay` field; apply extended λ for QUARTERLY signals
- `src/engine/entitytopologyregistry.js` — receive inventor migration edges from connector (WO-1855)
- `src/engine/signalconstants.js` — add DECAY constants, PATENTSVIEW source tag, multi-domain array type

## Bottle Test
1. Reduces ambiguity? YES — three signal types with explicit normalization formulas and polarity rules
2. Single dominant output? YES — dispatchBatch() via surfacerouter, no other output path
3. All boundaries defined? YES — ingestion only, no UI, no direct cone wiring, no citation traversal
4. No undefined dependencies? YES — PatentsView API is public, WO-1854/1855 contracts are defined, surfacerouter decay field is additive
5. Does not increase expressive flexibility in core? YES — adds one decay field and one source tag; routing and cone logic unchanged

## Definition of Done
- patentsviewconnector.js dispatches all three signal types via dispatchBatch()
- Technology cluster whitelist enforced at ingestion — no out-of-scope domains pass through
- ABSENT polarity fires when cluster velocity drops below 90-day baseline
- Inventor migration edges confirmed in entitytopologyregistry.js
- surfacerouter applies extended λ to QUARTERLY-tagged signals
- grep confirms `source: 'PATENTSVIEW'` in dispatched signal units
- No regression in existing signal routing
- No raw patent data exposed in any UI component
