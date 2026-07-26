# KRYL-1118A — OWNERSHIP Report Design Spec

STATUS: Built (analysisfield.jsx, OPPORTUNITY branch — display-renamed OWNERSHIP, KRYL-1117/1118A).
Retroactive spec — this lens was built before the spec-first process was adopted (PRESSURE/FLOW).
Written now to bring it into the same documentation standard as the other five.

## 1. What OWNERSHIP measures

OWNERSHIP is the **formation** lens — the only one of the six with a "does a structure exist"
question at its core. It answers: **"Where are control structures forming across the domain
field?"** Everything downstream (existence, cohesion, qualification) is about whether a bounded,
cross-domain graph has actually formed, not raw activity (SIGNAL), constraint (PRESSURE), state
(CONVERGENCE), divergence (DRIFT), or movement (FLOW).

Doctrine anchor: KRYL-1117 formation-inference-layer-spec.md. `inferFormation()` computes
**E = C × Q × Ḡ** (existence = cohesion × pressure-coherence × avg-groundedness, multiplicative
per §18 — a weak leg craters the score, never masked by averaging). `FORMATION_EXISTENCE_FLOOR = 0.30`.

## 2. Real data sources — no simplification needed here

Unlike DRIFT/PRESSURE/FLOW, OWNERSHIP has **no facet gap**. The full chain is real and grounded:
Signal Pool (§13a `getDomainSignals`) → Perception Producer (`perceptionread.js`) → Formation
Inference Core (`formationinference.js`) → Prospectus Assembly (`formationprospectus.js`) →
`buildLiveProspectus()`. `C ≡ 1.0` today (single grounded connection property = complete graph
among strong domains), so `E ≈ Q` in practice — stated honestly in the Executive Assessment's
`unresolved` field, not hidden.

## 3. Report shape (12 sections, "Intelligence Narrative" structure)

Founder-directed restructure (2026-07-26), superseding an earlier flat dashboard-shell draft:

```
01 Formation Overview      — hero: title + domains left, OVERALL score cluster (E, state, coverage,
                              signals) + shaded History sparkline (real replay-frame series) — right
02 Formation Thesis        — assembler-derived (executiveAssessment() text, never hand-authored) +
                              "Observed through" line (real per-domain signal counts) + boundary caveat
03 Structural State        — 6 tiles: Formation state, Signal Density, Evidence Depth, Domain
                              Coverage, Relationship Coherence (real Convergence read), Observed Window
04 Domain Formation Matrix — dot field map (●●●●○ = round(mag×5)), all 6 domains (ontology order,
                              ends OWNERSHIP per §17), QUAL rank label (Signal-primary/Evidence-tiebreak
                              doctrine), formation-membership distinguished from qualification rank
05 Top Formations          — top 3 domains by qualification doctrine, real delta vs. field baseline
06 Evidence Chain          — 3-col: Evidence Foundation, Groundedness (real Ḡ), Latest Observation
07 Structural Relationship Field — full-width (640px) hero graph, Flourish embed, the proof surface
08 Formation Timeline      — grounded in the SAME replay-frame series as the History sparkline (not
                              invented phase names); <2 frames → honest §22 TEMPORAL withhold
09 Confidence Boundary     — SUPPORTED (grounded sections) / UNRESOLVED (withheld sections), derived
                              from the prospectus's own section states — this IS §22, editorial framing
10 Risks / Limitations     — §20 detected downside: FRACTURE, BLIND SPOT, COVERAGE, ABSENCE,
                              STRUCTURAL — own section, not folded into the thesis
11 Structural Outlook      — 3-layer (OBSERVED / FORMING / UNRESOLVED), derived from the
                              executiveAssessment fingerprint + qualified rank, not authored
12 Appendix                — Formation ID, generation timestamp/attribution, citation
```

## 4. Locked invariants (do not silently reset on a future shell change)

From `project_prospectus_layout_invariants.md` (memory), reaffirmed here:
1. Executive/Thesis content leads off — never buried at the bottom of a new shell.
2. Score (OVERALL/E) sits with the title block, not a separate rail.
3. History line carries a shaded-area fill (white/INK gradient — retention over Tufte-minimal,
   Founder override), never lime (lime = live-state mark only, VIC-001).
4. A new layout shell is a CONTAINER for these 12 sections — it must never re-derive section
   order or drop content to match a borrowed grid shape (the incident this rule exists to prevent).

## 5. Visual system

Shared across all six lenses: Georgia serif (narrative) + IBM Plex Mono (data), §6 dark palette,
hairline `1px solid rgba(245,245,247,0.16)` borders, no radius, no shadow, `zoom: 0.9` page scale
(matches the HTML mock). Lime (`#66FF00`) reserved for live-state dots only.

## 6. Display-name note

The lens tab hover-title reads **OWNERSHIP** (Founder correction, `floatingtoolbar.jsx` LABELS
override); the internal routing id (`viewportLens === 'OPPORTUNITY'`) and all downstream file/prop
names stay `OPPORTUNITY` to avoid a cascading rename across `lensembeds.js`, `PrismContext.jsx`,
and this file. Display name and internal id are intentionally decoupled.

## 7. Open follow-up

None blocking — this is the most complete of the six lenses (no facet/edge gaps). Future work is
scope, not correctness: KRYL-1118 `lensreportassembler.js` (shared assembler so each lens's report
is generated from one contract) remains unbuilt: each lens currently renders its own inline block
in `analysisfield.jsx` rather than a shared producer function. Worth doing once all six are stable.
