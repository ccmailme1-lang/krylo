# KRYL-1118A — DRIFT Report Design Spec

STATUS: Built (analysisfield.jsx). v3 (2026-07-27) — full facet-availability classifier 𝓓 and
temporal persistence π replace the v2 field-summary tiles. This is the as-built spec.

## 0. v3 — Facet-Availability Classifier (superseding v2's tile grid)

DRIFT is not measuring a thing — it measures a **relationship between two representations of the
same domain** (structure vs. narrative). The model: four boolean facet-availability flags per
domain per window — `S` (structure present), `N` (narrative present), `D` (direction data
present), `M` (magnitude data present) — feed a deterministic mapping 𝓓: `{0,1}⁴ → DriftState`:

```
(0,0,*,*) → INSUFFICIENT OBSERVATION
(1,0,*,*) → STRUCTURE ONLY
(0,1,*,*) → NARRATIVE ONLY
(1,1,0,0) → COMPARABLE — BASE
(1,1,1,0) → COMPARABLE — DIRECTION   (reserved — D always 0 today)
(1,1,0,1) → COMPARABLE — MAGNITUDE   (reserved — M always 0 today)
(1,1,1,1) → COMPARABLE — FULL        (reserved)
```

**Today's real values:** `S = domainStats.count > 0` (real). `N = 0` always (no narrative source
exists anywhere — same honest gap v1/v2 already stated). `D = M = 0` (forward-compat, reserved).
Since N is always 0, no domain can reach a COMPARABLE state today — only STRUCTURE ONLY or
INSUFFICIENT OBSERVATION are possible in practice. The classifier is forward-compatible: when a
real D or M feed exists, the COMPARABLE-* states activate with **no schema change**.

**No divergence score is invented.** The math stops at classification — this is the correct
boundary (facet availability → comparison capability → future divergence measurement, in that
order, never skipped).

### Macro status (categorical, no averaging/percentage)
```
∀ domains INSUFFICIENT OBSERVATION → "INSUFFICIENT OBSERVATION"
∃ any domain COMPARABLE-*          → "COMPARISON READY"
else (mix of STRUCTURE/NARRATIVE ONLY) → "PARTIAL OBSERVATION"
```

### Temporal persistence (π) — locked rule
```
First observed state:              π = 1
Same state as previous window:     π = previous π + 1
State changed:                     π = 1
Applies to ALL states, including INSUFFICIENT OBSERVATION.
```
A domain stuck at INSUFFICIENT OBSERVATION for 100 windows is meaningful — it tells you the
observation gap itself is stable, which is Absence-Is-Signal (§22) applied correctly. π measures
state *continuity*, not confidence, magnitude, or quality — never conflate the two.
Held in a per-domain `useRef` (`driftPersistenceRef`), report-layer only.

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

## 3. DRIFT section order (as built, v3)

1. **01 Drift Overview** — title communicates limitation immediately: macro status banner
   (INSUFFICIENT OBSERVATION / PARTIAL OBSERVATION / COMPARISON READY, categorical, see §0) sits
   right under the title, not buried.
2. **02 Drift Thesis** — analyst-voice paragraph (serif, 18px). Correct register: availability
   language only ("exhibits available structural evidence... incomplete narrative comparison"),
   never accusation/intent language ("Capital is misunderstood" is explicitly wrong). Derived from
   real per-domain S values, never hand-authored.
3. **03 Drift State Matrix** — the hero, a true 2×2 instrument panel (Structure ✓/✕ × Narrative
   ✓/✕), each quadrant showing its real count across the six domains. Reserved-state note explains
   COMPARABLE-DIRECTION/MAGNITUDE/FULL activate later without a schema change.
4. **04 Domain Drift Landscape** — all six domains (macro, no ranking), each row: Structural
   AVAILABLE/MISSING, Narrative AVAILABLE/MISSING (always MISSING today, honest), the classified
   state.
5. **05 Temporal Drift** — π per domain, the persistence table. Explicitly NOT prediction — states
   what it measures (continuity) and what it doesn't (confidence/magnitude/quality).
6. **Structure vs Narrative Field** (unnumbered, sits between 05/06) — the real Flourish DRIFT
   chart (`visualisation/29782797`, a slope chart), `480px`, the proof surface.
7. **06 Observation Boundary** — SUPPORTED (facet availability, state + persistence) / WITHHELD
   (intent, future correction, magnitude, direction). Mandatory, arguably the most important section.

**Structural device (locked):** two layers — analyst interpretation (02) and instrument matrix
(03/04/05). The matrix must never replace the interpretation paragraph, and the paragraph must
never assert what the matrix can't back up.

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
