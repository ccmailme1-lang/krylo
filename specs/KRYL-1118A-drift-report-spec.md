# KRYL-1118A — DRIFT Report Design Spec

STATUS: Built (analysisfield.jsx, commit eef3c07). This is the as-built spec, written after
implementation per Founder request, to lock the shape before further iteration.

## 1. Doctrine — why DRIFT gets its own form

The OWNERSHIP report (formerly "Opportunity," KRYL-1117/1118A Intelligence Narrative) is built
around **formation semantics**: existence, cohesion, qualification against a floor, formation
membership. DRIFT has none of that. DRIFT measures one relationship — **structure vs. narrative
divergence** — field-wide, not a formation. Reusing the 12-section formation template would force
language onto DRIFT that doesn't apply to it (no "Top Formations," no "Confidence Boundary," no
existence score).

**Rule:** each reporting lens (SIGNAL/FLOW/PRESSURE/CONVERGENCE/DRIFT) shares the OWNERSHIP report's
**visual system** — typography, card treatment, dot field map, tile-summary pattern, dark §6 palette
— but each gets **its own section shape**, derived from what that lens actually measures. Do not
clone the 12-section list onto a lens whose underlying concept doesn't support it.

## 2. Shared visual system (reused verbatim from the OWNERSHIP report)

- Typography: Georgia serif (title/narrative) + IBM Plex Mono (data/labels) — §5 dual voice
- Palette: `#000` background, `#F5F5F7` ink, `rgba(245,245,247,0.60)` dim, `rgba(245,245,247,0.34)` faint,
  `rgba(245,245,247,0.16)` hairline border — §6, no new color
- Card: `1px solid rgba(245,245,247,0.16)`, `18-20px` padding, no radius, no shadow
- Dot field map: `●●●●○` filled = `round(mag × 5)`, faint `○` for the rest
- Tile-summary grid: `repeat(6, 1fr)`, hairline-divided cells, 8.5px label / 14-15px value
- Page frame: `maxWidth: 1180`, `zoom: 0.9` (10% scale-down, matches the HTML mock)

## 3. DRIFT section order (as built)

1. **Header** — eyebrow "DRIFT REPORT · 01 OVERVIEW", title "Structural Drift Report" (serif, 28px),
   one-paragraph description of what DRIFT measures + the honest facet-gap caveat.
2. **Drift Summary** — field-wide aggregate tile row (6 tiles, same grid as OWNERSHIP's Structural
   State): FIELD DIRECTION (constructive-leaning / fracture-leaning / mixed, derived from domain
   direction counts), CONSTRUCTIVE DOMAINS (count), FRACTURE DOMAINS (count), REPORTING DOMAINS
   (N/6), FIELD SIGNAL AVG (fieldAvg), DIVERGENCE FIGURE ("PENDING §22" — honest, not fabricated).
3. **Per-Domain Signal** — the six §17 domains (ontology order), each row: name, dot rating (real
   signal magnitude), band/count/field-baseline text, and a small per-row "DIVERGENCE PENDING §22"
   tag. Real data throughout — only the divergence figure itself is flagged, never the whole row.
4. **Structure vs Narrative — Field View** — the real Flourish DRIFT chart (`visualisation/29782797`,
   a slope chart), full-width, `560px`, centerpiece proof surface.

## 4. Data sources (grounded vs. pending)

| Element | Source | State |
|---|---|---|
| Per-domain signal magnitude, count, direction | `getDomainSignals()` pool (§13a) | GROUNDED |
| Field signal average | Same pool, mean across domains | GROUNDED |
| Drift Summary aggregate (direction lean, counts) | Derived from the same domainStats | GROUNDED |
| Flourish slope chart | `lensembeds.js` DRIFT entry | GROUNDED (real embed) |
| Per-domain structure-vs-narrative divergence figure | `computeDivergence('DRIFT', facets)` (signalfacet.js) | **PENDING** — needs STRUCTURAL + NARRATIVE `SignalFacet` per domain; the live pool only carries one undifferentiated confidence/polarity reading. No facet split exists yet. |

## 5. Open follow-up (not built)

Wire real STRUCTURAL and NARRATIVE facet sources per domain so `computeDivergence('DRIFT', …)` can
run for real and the "DIVERGENCE PENDING §22" tags go grounded. This is engine-adjacent work — needs
a defined STRUCTURAL facet source and a defined NARRATIVE facet source per domain before it can be
scoped as a WO.

## 6. Precedent this sets for the remaining reporting lenses

SIGNAL, FLOW, PRESSURE, CONVERGENCE each need the same treatment: reuse the visual system, but derive
their own section shape from what they actually measure (not a copy of OWNERSHIP's 12 sections, not
a copy of DRIFT's 4). Evaluate each on its own semantics before building.
