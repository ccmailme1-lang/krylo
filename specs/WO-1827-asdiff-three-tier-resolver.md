# WO-1827 — AS-DIFF Three-Tier Resolver Extension

**Filed:** 2026-06-20
**Status:** OPEN
**Priority:** Infrastructure — ships before any entity or product-level comparison feature
**Depends on:** WO-1038 (AS-DIFF core — COMPLETE)
**Depended on by:** WO-1347 (Per-Bay Controls), entity/product bay assignment

---

## The Problem

AS-DIFF (`src/engine/asdiff.js`) is correctly structured as a tier-agnostic pairwise comparator. The core math — `PLI_A − PLI_B` adjusted by shared projection space — applies identically whether the two comparands are domains, companies, or products.

The current `SPACE_RESOLVER` is hardcoded to lens-level vocabulary:
`finance`, `real_estate`, `career`, `sports`, `legal`, `health`

This vocabulary predates the 6 canonical signal domains and has no concept of entity or product comparands. The engine is correct. The resolver is scoped too narrowly.

---

## The Three Tiers

```
DOMAIN   — The signal field at macro level
           TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP

ENTITY   — A named company operating within the field
           Google · Meta · SpaceX · JPMorgan

PRODUCT  — A specific service or offering from an entity
           Google Cloud · Meta Ads · Starlink · Chase Sapphire
```

Each tier is a valid comparand for AS-DIFF. The comparison operation is the same at every level.

---

## What Changes

### 1. SPACE_RESOLVER — remap to 6 canonical domains

Replace lens-vocabulary keys with canonical domain pairs:

```js
const SPACE_RESOLVER = {
  TECHNOLOGY_CAPITAL:   'market_valuation',
  CAPITAL_TECHNOLOGY:   'market_valuation',
  TECHNOLOGY_LABOR:     'competitive_positioning',
  LABOR_TECHNOLOGY:     'competitive_positioning',
  TECHNOLOGY_KNOWLEDGE: 'innovation_throughput',
  KNOWLEDGE_TECHNOLOGY: 'innovation_throughput',
  CAPITAL_LABOR:        'capital_allocation',
  LABOR_CAPITAL:        'capital_allocation',
  CAPITAL_MEDIA:        'narrative_premium',
  MEDIA_CAPITAL:        'narrative_premium',
  CAPITAL_OWNERSHIP:    'asset_concentration',
  OWNERSHIP_CAPITAL:    'asset_concentration',
  KNOWLEDGE_LABOR:      'path_dependency',
  LABOR_KNOWLEDGE:      'path_dependency',
  MEDIA_OWNERSHIP:      'brand_equity',
  OWNERSHIP_MEDIA:      'brand_equity',
  // all remaining pairs resolve to 'direct'
};
```

### 2. Comparand shape — add tier and entity fields

Current SignalUnit shape:
```js
{ schema, signal, pli, math? }
```

Extended shape:
```js
{
  schema, signal, pli, math?,
  tier:   'domain' | 'entity' | 'product',   // granularity level
  entity: string | null,                       // null for domain-tier
  parent: string | null,                       // entity name when tier = 'product'
  domain: string,                              // canonical domain — required at all tiers
}
```

`domain` is always required. Entity and product comparands resolve their shared space via their dominant canonical domain, not a new lookup table.

### 3. resolveSharedSpace — extend for entity/product

```js
function resolveSharedSpace(unitA, unitB) {
  // Same-entity, different product: direct comparison
  if (unitA.entity && unitA.entity === unitB.entity) return 'direct';

  // Cross-entity or cross-product: resolve via canonical domain
  const domainA = unitA.domain.toUpperCase();
  const domainB = unitB.domain.toUpperCase();
  if (domainA === domainB) return 'direct';
  const key = `${domainA}_${domainB}`;
  return SPACE_RESOLVER[key] ?? 'direct';
}
```

### 4. SPACE_QUALITY — remap to canonical domains

Replace lens-vocabulary quality tables with canonical domain quality scores per shared space. Same structure, new keys.

---

## What Does NOT Change

- `computeDominantAxis()` — untouched
- `computeConstraintIntersection()` — untouched
- `projectPLI()` — untouched
- Core `PLI_A − PLI_B` math — untouched
- `INCOMPARABILITY_THRESHOLD` — untouched

The comparator logic is correct. Only the resolver vocabulary changes.

---

## What This Enables

| Comparison | Tier | Shared Space |
|---|---|---|
| TECHNOLOGY vs CAPITAL | Domain | market_valuation |
| Google vs Meta | Entity | resolved via dominant domain |
| Google Cloud vs Azure | Product | resolved via TECHNOLOGY domain |
| Google Cloud vs Starlink | Product cross-entity | resolved via TECHNOLOGY vs MEDIA |

A user assigning Google to Bay 1 and Meta to Bay 2 gets a real-time AS-DIFF read: which entity has higher convergence leverage in the shared space, which axis is dominant, where the asymmetric capture sits.

---

## Build Notes

- All changes in `src/engine/asdiff.js` only
- No changes to leverageengine.jsx, oraclelens.jsx, or any consumer
- Legacy lens-vocabulary keys (`finance_real_estate` etc.) can be retained during transition — they simply never match the new canonical inputs
- Validate: same-domain entity comparison returns `'direct'` space
- Validate: cross-domain entity comparison returns correct shared space
- Validate: product comparand with null entity falls back gracefully
