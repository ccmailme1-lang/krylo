# KRYL-1118A — DRIFT Report Design Spec

STATUS: Built (analysisfield.jsx). v2 — superseded the 6-tile/4-section draft (commit eef3c07)
after Founder refinement: 8-cell Drift State Matrix + analyst-voice Structural Interpretation +
Analysis Boundary section. This is the as-built spec, written to lock the shape before further
iteration.

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

## 3. DRIFT section order (as built, v2)

1. **01 Overview** — eyebrow, title "Structural Drift Report" (serif, 28px), one-paragraph
   description of what DRIFT measures + the honest facet-gap caveat.
2. **02 Structural Interpretation** — analyst-voice paragraph (serif, 18px), the human-interpretation
   layer. Fully DERIVED, never hand-authored: field direction lean, constructive/fracture counts,
   top-3 domains by real signal magnitude, and an explicit "Divergence measurement: WITHHELD §22" line.
3. **03 Drift State Matrix** — 8-cell 4×2 grid. NOT arbitrary KPIs — the 8 dimensions of the drift
   *relationship* itself: STRUCTURAL STATE, REPRESENTED STATE (honestly "UNAVAILABLE" — no narrative
   facet source exists), RELATIONSHIP STATE ("PENDING §22"), MOVEMENT STATE, FIELD COVERAGE, SIGNAL
   PRESENCE, FACET AVAILABILITY ("STRUCTURAL ✓ · NARRATIVE ✕" — makes the limitation visible), EVIDENCE
   DEPTH. Each cell: label / value / one-line sub-caption.
4. **04 Domain Drift Surface** — the six §17 domains, each row: dot rating (real signal magnitude),
   "Observed: [band] structural signal (N sig)" (real), "Narrative: Unavailable" (honest), "Drift:
   Pending" (honest). Instrument-panel register, not prose.
5. **05 Structure vs Narrative Field** — the real Flourish DRIFT chart (`visualisation/29782797`, a
   slope chart), full-width, `560px`. The reveal / proof surface.
6. **06 Analysis Boundary** — SUPPORTED / WITHHELD / REQUIRED list (§22 grounded-or-withhold, lime for
   supported, faint for withheld/required). Derived from real domain counts + the honest facet gap —
   this doubles as the "Limitations" content, not a separate 7th section.

**Structural device (locked):** the report has two layers — the analyst-voice interpretation (02) and
the instrument-panel measurement (03/04). The 8-square matrix must never replace the interpretation
paragraph, and the paragraph must never assert what the matrix can't back up.

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
