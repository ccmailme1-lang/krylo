# WO-1345 — Bay Occupancy & Identity

**STATUS:** NEXT  
**DATE:** 2026-05-30

## Purpose

Before any assignment mechanic exists, each cone bay needs a visible identity and state. Without this, node assignment has no visual confirmation and the user has no answer to "which cone got it?"

## Bay States

```
EMPTY       — no vector assigned
LOADED      — vector assigned, data present
ANALYZING   — convergence processing active
XRAY        — causal decomposition active
```

## Visual Per State

### EMPTY
```
CONE 01
NO VECTOR ASSIGNED
[ Assign Signal ]
```

### LOADED
```
CONE 01
PALANTIR
TECHNOLOGY
Confidence 82
```

### ANALYZING
```
CONE 01
PALANTIR
BUILDING CONVERGENCE...
```

### XRAY
```
CONE 01
PALANTIR
CAUSAL DECOMPOSITION ACTIVE
```

## Implementation Notes
- Each cone carries: `{ id, state, label, domain, confidence, vector }`
- State is driven by the bay store (new: `useBayStore`)
- Visual renders as a HUD chip above/on the cone
- Empty cones show a dim "[ Assign Signal ]" affordance
- Loaded cones show label + domain + confidence
- State transitions: EMPTY → LOADED → ANALYZING → XRAY → LOADED

## Dependencies
None. Foundational. All subsequent WOs depend on this.
