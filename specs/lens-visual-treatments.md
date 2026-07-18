# KRYLO — Lens Visual Treatments (reference set)

Visual-first. One concrete, recognizable visual per lens, with a real reference to look at.
No backend here — this is the LOOK we lock before wiring.

| Lens | Question | Visual treatment | Reference to look at |
|------|----------|------------------|----------------------|
| **Signal** | What exists now? | Force-directed constellation / node graph — points glow by significance, hairline links | Obsidian graph view · particles.js constellation · Flourish **Network graph** |
| **Flow** | How does it move? | Animated particle-flow field along vectors between domains | **hint.fm/wind** · **earth.nullschool.net** · Flourish **Sankey** (discrete flows) |
| **Pressure** | Where is force accumulating? | Contour / isobar heat field — bulging glowing zones where constraint builds | Weather **isobar pressure map** · Flourish **Heatmap** |
| **Convergence** | What is aligning? | Beeswarm collapsing into clusters / gravity wells as corroboration rises | Flourish **Data Explorer** (beeswarm) · D3 force-cluster |
| **Drift** | What is changing over time? | Connected-scatter with fading trails (long-exposure) — trajectory, acceleration, reversal | **Gapminder** bubble trails (Rosling) · Flourish **racing chart** |
| **Opportunity** | Where is leverage forming? | Dimmed network, illuminated frontier — bridges / bottlenecks / white-space glow, rest goes dark | D3 network with **betweenness-centrality** highlighting |

## The consolidation (why it's buildable)

It's **three visual engines**, not six:

- **Node-graph family** → Signal · Convergence · Opportunity (same renderer, different emphasis: raw / clustered / illuminated)
- **Particle-motion family** → Flow · Drift (streams vs. fading trails)
- **Field / heatmap** → Pressure (the one surface treatment)

## Reliability note (learned the hard way)

Render family, not per-lens WebGL contexts. The Signal node field is already built and reliable as **2D canvas** (`signalnodes2d.jsx`) — no WebGL context to exhaust. Same principle for the other engines: 2D-canvas or a single shared surface, upgrade to GPU only where it's worth it, never a new `<Canvas>` per lens.

## Status

- Signal renderer: BUILT (2D canvas, live nodes) — `signalnodes2d.jsx`.
- Flow / Pressure / Convergence / Drift / Opportunity: visual chosen (above), not yet built.
