# WO-1347 — Stats Panel Bay Controller

**STATUS:** BACKLOG  
**DATE:** 2026-05-30  
**DEPENDS ON:** WO-1346

## Purpose

Stats panel becomes a per-bay controller. When a cone is active, its panel controls only affect that cone — not the whole system.

## Panel Layout (active cone)
```
CONE 03
PALANTIR

[ XRAY     ]
[ FREEZE   ]
[ COMPARE  ]
[ CLEAR    ]
```

## Controls
- **XRAY** — triggers X-Ray Snapshot for this bay's loaded vector
- **FREEZE** — locks this bay's state (no updates from live signals)
- **COMPARE** — flags this bay for cross-bay comparison (WO-1348)
- **CLEAR** — empties the bay, returns to EMPTY state
