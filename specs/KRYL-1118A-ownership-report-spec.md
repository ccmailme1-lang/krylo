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
12 Formation Readiness     — REPORT-LAYER ONLY diagnostics (2026-07-27, see §4a). Answers a
                              different question than the engine's E ("is this formation
                              sufficiently evidenced to claim," not "how aligned is it")
13 Appendix                — Formation ID, generation timestamp/attribution, citation
```

## 4a. Formation Readiness (§12) — engine boundary, locked

Founder-reviewed decision (2026-07-27): an external proposal to redefine the engine's Q from
`alignment` to `Q = EvidenceCoverage × RelationshipSupport × TemporalStability` was **rejected** —
correctly identified as an ontology migration, not a math improvement, since it would change
formation existence thresholds, historical E values, ranking, and every downstream lens's read of
formation strength. **`formationinference.js` stays exactly as-is: Q means alignment, E = C×Q×Ḡ
unchanged, verified zero-diff after this section was added.**

Instead, two of the three proposed components are surfaced as **report-layer-only diagnostics**,
computed entirely in `analysisfield.jsx`, answering a genuinely different question from the engine
("is this formation sufficiently evidenced to claim" vs. "how aligned is it"):

- **Evidence Coverage** — real: `evidenceCount / N_REQ` (N_REQ=30, explicitly Founder-configurable,
  not a universal constant), clamped to [0,1].
- **Temporal Stability** — real: `1 − σ/μ` of the same `historySeries` the History sparkline (§01)
  already uses, clamped to [0,1]; `μ < 0.0001 → TS=0` (floating-point-noise guard); `<2` frames →
  honestly withheld (§22), not computed.
- **Relationship Support** — explicitly WITHHELD, always. No source exists anywhere (engine or
  report layer) for directional/structural relationship properties. Never fabricated, never used
  to gate the engine's E — this is the discipline that keeps the section additive, not corrupting.

**Naming rule (locked):** never call this "Qualification Score" — that implies replacing Q. Titled
"Formation Readiness," framed as diagnostics, not a second formation score.

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
