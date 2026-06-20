# WO-1815 — Opportunity Ribbon

**Filed:** 2026-06-20
**Status:** APPROVED — SCHEMA COMMITTED, UI PENDING
**Priority:** CRITICAL — NEXT BUILD
**Build target:** krylo2-feed.html (Layer 1 blank-state solver)
**Schema file:** src/data/ribbonSchema.js

---

## Purpose

Solves the blank-state problem on Layer 1. When no query has been submitted, the investor sees a live horizontal ribbon of macro velocity nodes. Clicking any node bypasses the search bar and instantly instantiates a targeted domain packet — feeding the Action Rail (WO-1816) and the Investor Decision Architecture (WO-1822).

---

## Position in Dependency Graph

```
[WO-1815: Opportunity Ribbon]  ← producer
         │
         ▼
[WO-1822: Investor Decision Architecture]  ← consumer
         │
         ▼
[WO-1823: Conviction Record] ──> [WO-1824: Thesis Monitoring]
         │
         ▼
[WO-1825: Decision Lineage] ──> [WO-1821: Happy Path] ──> [WO-1820: Unicorn Alert]
```

---

## Functional Scope

### 1. The Telemetry Stream
Horizontal zero-flash marquee. Continuous scroll. Shows live macro velocity nodes across core structural domains. Each node displays:
- Domain label (ribbon-layer)
- Trend label (human-readable topic)
- Current score (0–100)
- Direction indicator (UP / DOWN / TURB / FLAT)
- Systemic state badge (ACCELERATING / STABLE / TURBULENT / DECELERATING)

### 2. The Direct Ingestion Trigger
Clicking a ribbon node:
1. Halts the marquee scroll
2. Fires `krylo-ribbon-select` postMessage to parent (app.jsx)
3. Bypasses the search bar — no query input required
4. app.jsx routes the payload to the Decision Architecture
5. Action Rail populates with the targeted domain packet

---

## Producer → Consumer Interface Contract

### Event name
`krylo-ribbon-select`

### Message payload (WO-1815 emits on node click)
```json
{
  "type": "krylo-ribbon-select",
  "node_id": "PI_094",
  "domain": "PHYSICAL_INTELLIGENCE",
  "canonicalDomain": "LABOR",
  "label": "Automation Labor Displacement",
  "routing_target": "WO-1795",
  "velocity": {
    "current_score": 84,
    "direction": "UP",
    "intervals": { "1d": 3, "7d": 14, "30d": 38, "90d": 52 }
  },
  "systemic_state": "ACCELERATING",
  "leakage_risk": 0.12
}
```

### What WO-1822 does with this payload

| Field | Consumer use |
|---|---|
| `label` | Pre-populates thesis seed in the Action Plan |
| `canonicalDomain` | Anchors Conviction Record to the correct Krylo cone |
| `velocity` | Sets initial convergence reading at conviction creation |
| `routing_target` | Identifies which synthesizer/WO to invoke |
| `systemic_state` | Maps to Krylo convergence state (see SYSTEMIC_TO_CONVERGENCE in schema) |
| `leakage_risk` | Surfaces as data confidence floor on the Action Plan |
| `node_id` | Links the ribbon node to the resulting conviction record for lineage |

### Routing in app.jsx
```
window.addEventListener('message', (e) => {
  if (e.data?.type === 'krylo-ribbon-select') {
    window.dispatchEvent(new CustomEvent('krylo-ribbon-select', { detail: e.data }));
  }
});
```

---

## Canonical Domain Mapping

Ribbon domains use investor-facing labels. They must resolve to one of the 6 locked Krylo canonical domains before reaching WO-1822.

| Ribbon Domain | Canonical Krylo Domain | Rationale |
|---|---|---|
| PHYSICAL_INTELLIGENCE | LABOR | Automation, displacement, workforce |
| SOVEREIGN_CAPITAL | CAPITAL | State-level capital allocation |
| PRIVATE_CREDIT | CAPITAL | Non-bank credit markets |

**Open item:** Full domain map for all planned ribbon nodes requires Founder sign-off before additional nodes are added. Current 3-node baseline is locked.

---

## Schema File

`src/data/ribbonSchema.js` — committed 2026-06-20

Contains:
- `RIBBON_DOMAIN_MAP` — ribbon → canonical domain mapping
- `SYSTEMIC_TO_CONVERGENCE` — systemic state → Krylo convergence state
- `RibbonNode` typedef
- `RIBBON_BASELINE` — locked 3-node payload
- `resolveCanonicalDomain()` — utility, warns on unmapped domains

---

## Visual Spec (Pending)

- Horizontal marquee, continuous scroll, zero-flash
- Black background (#000000)
- Domain labels in IBM Plex Mono
- Score displayed with convergence state color:
  - ACCELERATING → #66FF00 (lime)
  - TURBULENT → #007FFF (blue)
  - STABLE → #3a3d4a (slate)
  - DECELERATING → #1a1a1a (dark neutral)
- leakage_risk above 0.3 → visual warning marker (color TBD — Founder approval required)

---

## Open Items Before UI Build

1. **Canonical domain map sign-off** — confirm PHYSICAL_INTELLIGENCE → LABOR mapping
2. **leakage_risk warning color** — Founder must approve; no color introduced without sign-off
3. **Marquee scroll speed** — needs Founder input
4. **Node count** — 3 nodes in baseline; confirm whether all 6 active_threads will be visible at launch
5. **Placement in krylo2-feed.html** — above or below the search bar? Confirm before UI build
