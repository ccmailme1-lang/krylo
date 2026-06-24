---
WO: 1855
Title: Entity Topology Linker
Status: FILED
Date: 2026-06-23
---

## Single Responsibility
Resolve entity dependency relationships upstream of surfacerouter, so that signals from structurally linked entities are tagged with their shared topology before domain routing — enabling MCV deformation to reflect ecosystem-level pressure, not isolated entity events.

## Boundary Declaration
IN SCOPE:
- Entity dependency registry: maps entities to their structural peers (shared supply chain, technology stack, capital dependency)
- Topology tag added to signal unit before dispatch: `{ topology: string[] }` — list of related entity IDs
- surfacerouter reads topology tag to co-weight related signals in the same dispatch batch

OUT OF SCOPE:
- UI visualization of entity graphs
- Prediction of linkage strength
- Government/regulatory entity sourcing
- Any change to convergence classifier, cone rendering, or MCV formula
- Dynamic graph construction (registry is static at v1, manually curated)

## Zero Drift
This WO is upstream of surfacerouter only. It does not change: cone pressure math, MCV deformation logic, WINDOW tracking, conviction records, or any UI component.

## Strategic Leverage Statement
Most signal systems treat entities as isolated. NVIDIA, TSMC, ASML, and Microsoft are not four signals — they are one topology deformation across TECHNOLOGY + CAPITAL. The Stanford spillover finding confirms: technological proximity predicts correlated pressure. This WO makes the dependency graph a first-class routing object so that ecosystem-level deformations are detected before they surface as isolated spikes.

## Output Gravity
Single output: signal units enriched with `topology` tag before entering surfacerouter. surfacerouter uses the tag to co-weight signals from the same topology cluster in the same batch cycle.

## Formula / Contract
Signal unit extension:
```
{
  source: string,
  domain: string,
  signal: string,
  confidence: number (0–100),
  ts: number,
  polarity: 'POSITIVE' | 'NEGATIVE' | 'ABSENT',
  topology: string[]   // NEW FIELD — entity IDs sharing structural dependency
}
```

Topology resolution:
```
entityTopologyRegistry[entityId] → string[]  // peer entity IDs

Before dispatchBatch():
  signal.topology = entityTopologyRegistry[signal.source] ?? []

surfacerouter co-weight rule:
  if signals in same batch share topology overlap → apply cluster amplifier (weight × 1.2)
```

## File Map
- `src/engine/entitytopologyregistry.js` — NEW: static entity dependency map, v1 manually curated
- `src/engine/surfacerouter.js` — read topology field, apply cluster amplifier on overlap
- `src/engine/signalconstants.js` — add TOPOLOGY field to signal unit type definition

## Bottle Test
1. Reduces ambiguity? YES — topology is a declared registry lookup, not inferred at runtime
2. Single dominant output? YES — topology-tagged signal units into surfacerouter
3. All boundaries defined? YES — upstream of surfacerouter only, no downstream changes
4. No undefined dependencies? YES — registry is static v1, no external API required
5. Does not increase expressive flexibility in core? YES — adds one field and one co-weight rule, does not change domain logic or cone behavior

## Definition of Done
- `entitytopologyregistry.js` ships with minimum 3 topology clusters (e.g., AI Compute, Housing Finance, Energy Grid)
- `topology` field present in signal unit before surfacerouter dispatch
- Co-weight rule confirmed active for overlapping topology clusters in same batch
- grep confirms `topology` field in dispatched signal units
- No regression in existing signal routing
