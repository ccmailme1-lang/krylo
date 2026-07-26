# KRYL-1118A — FLOW Report Design Spec

STATUS: Built (analysisfield.jsx). v2 — refined per Founder review into a READINESS INSTRUMENT:
R = Directed Edge Coverage × avgGroundedness (DC = |E| / D(D-1) = 0/30 today, honestly zero, not
fabricated). "The engine should earn the arrow before drawing the arrow." 7 sections, not 5.

## 1. What FLOW measures

`computeDomainFlow(edges, { minCount })` (domainflow.js) aggregates REAL directed cross-domain
relationship edges (`{sourceDomain, targetDomain, weight}` — causal edges or co-occurrence pairs)
into directional rows (A→B distinct from B→A), feeding the Flourish chord chart. FLOW answers:
**"Where is structural movement occurring, and in which direction, between domains?"**

## 2. The gap — a complete absence, not a partial one

Unlike DRIFT (per-domain readings existed, only the divergence figure was missing) or PRESSURE
(a real formula existed, one input degraded to a labeled stand-in), **FLOW has no edge data at
all** in the current system:

- `getDomainSignals()` (§13a pool) returns flat per-domain readings — no source/target pairs.
- The formation engine's own `STRUCTURAL_RELATIONSHIPS.edges` (used in OWNERSHIP §07) are
  **co-presence only, explicitly undirected** — `formationinference.js` grounds presence, not
  direction or magnitude (9 of 10 connection properties stay ungrounded by design).

There is no reasonable Tier-0 degraded computation to offer, unlike PRESSURE's T-as-stand-in.
**The entire lens withholds honestly** — this is the correct §22 outcome, not a failure to find
a workaround. Building a "Pressure₀-style" partial version here would mean inventing direction
where none is observed, which is fabrication, not simplification.

## 3. What CAN be shown honestly

- Which domains are co-present together (reuse the same undirected edges OWNERSHIP already shows)
  — explicitly labeled as **undirected**, never implied to be flow.
- Per-domain signal presence (same real data every other lens shows) — activity exists, direction
  does not.
- An explicit, prominent statement of what's missing and why, matching DRIFT's Facet Availability
  device: a **Flow Availability** section stating EDGES: UNAVAILABLE plainly.

## 4. Report shape (macro framing, consistent with the other five)

```
01 Macro Flow Overview       — what FLOW measures + the edge-absence stated immediately, not buried
02 Flow Availability         — EDGES: UNAVAILABLE (the FACET AVAILABILITY-style device from DRIFT)
03 Domain Co-Presence Map    — same undirected pairs as OWNERSHIP §07, explicitly labeled undirected
04 Domain Signal Field       — same heat-map pattern as SIGNAL §02 (activity exists, direction doesn't)
05 Observation Boundary      — SUPPORTED (presence, co-presence) / WITHHELD (direction, magnitude, movement)
```

This is deliberately the shortest of the six reports — FLOW has the least to show honestly, and the
shape should say so rather than pad itself out to match the others' length.

## 5. Open follow-up (not built)

A real FLOW report needs a genuine source of directed edges — e.g. a causal-map connector that tags
`sourceDomain`/`targetDomain` explicitly (not co-presence). No such connector exists yet. This is
engine-adjacent work, same category as DRIFT's facet-split follow-up — not scoped as a WO here.
