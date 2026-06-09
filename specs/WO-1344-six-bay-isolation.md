# WO-1344 — Six-Bay Domain Isolation Network

**STATUS:** BACKLOG  
**DATE:** 2026-05-30  
**SOURCE:** SAB Consensus Vote (5 participants, quorum met)

---

## Summary

Six horizontally-stacked domain bays, each containing a WebGL mesh + HUD telemetry overlay. Bays dilate on hover. Domain resonance fires per bay based on `activeQuery`.

## Domains

`FINANCIAL · MARKET · LEGAL · HEALTH · CAREER · TECHNOLOGY`

## Architecture

### Rendering
- **Development path:** One `<Canvas>` per bay (6 WebGL contexts)
- **Production path (required):** Single `<Canvas>` with `@react-three/drei` `<View>` components for viewport slicing — one WebGL context across all 6 bays

### Layout
- `flex-1` per bay, vertical stack
- Hover → `flex-[1.5]` dilation on active bay
- Siblings: `opacity-20 grayscale` when any bay is focused

### Per-Bay Mesh (`DomainMesh`)
- Icosahedron wireframe, ambient rotation
- Active state: `#66FF00`, scale 2, opacity 0.9
- Idle state: `#3f3f46`, scale 1.5, opacity 0.3

### State
- `activeQuery` — global, passed from app.jsx
- `domainResonance` — calculated locally per bay (not global)
- `focusedBay` — local hover state in container

### HUD Overlay (per bay)
- Domain label + RESONANCE LOCK indicator when active
- Domain vector metric: `V_DOM: +14.2%` (active) / `-1.4%` (idle)
- Left rail, z-10, backdrop blur

### SAB Notes
- Architect_01: `<View>` required for 60fps at scale — individual `<Canvas>` only for prototype
- Architect_02: Flex dilation + grayscale suppression is the interaction model
- Architect_04: domainResonance is local, not derived from global state
- Architect_05: Reference implementation provided (see source spec)

## Integration Point

**Lives in Analysis bay — TargetPacket or ActionPlan surface.**  
Replaces or extends the existing left panel in the Analysis split layout. Six bays render per query result, each domain bay firing resonance when the query maps to it.

## Open Items
- Resonance logic: define matching rules (query keyword → domain list)
- Mesh design: icosahedron confirmed for prototype; final geometry pending Founder approval
- Colors: #66FF00 active confirmed; idle color `#3f3f46` needs Founder approval
- Which panel: TargetPacket (left 62%) or ActionPlan section

## Reference Implementation
Source: SAB Consensus spec `IsolationField.jsx` — stored in session context.

## Dependencies
None. Standalone component.
