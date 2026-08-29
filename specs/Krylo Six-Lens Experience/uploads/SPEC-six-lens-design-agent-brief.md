# Design Brief — KRYLO Six-Lens Experience

Status: Solicitation prompt for design agent specialist
Role: Packages SPEC I / SPEC II into a completable brief — not itself a design decision
Reference: KRYL-1209 (Engineering Review Package), SPEC-six-lens-perceptual-experience-contract.md

You are completing the Six-Lens Design Worksheet defined in SPEC I
(`specs/SPEC-six-lens-perceptual-experience-contract.md`), §19, for all six domains:
TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP.

## Governing contracts (locked, do not violate)

- **SPEC I** — perceptual/experiential model: Environment → selected cone → Lens →
  surface encoding → halo → deeper investigation, choreographed as
  SEE → INVESTIGATE → RESOLVE.
- **SPEC II** — revelation model: DOMAIN → OBSERVATION → QUESTION → CONDITION →
  RELATIONSHIP → FORMATION → EVIDENCE → UNRESOLVED, with each Lens's per-domain
  substrate already defined in SPEC II §5–10.

## For each of the six Lenses, produce

Purpose · Question · Input · Transformation · Output · Transition ·
Structural/Perceptual Relationship · Surface Encoding · Halo Composition ·
Live vs. Designed.

## Hard constraints from SPEC I (non-negotiable, §20)

- The cone is the focal object; a Lens is a perceptual state, not a page.
- Cone surface bands are not equal-height by default — surface area must express
  relative significance (weight/magnitude/salience/persistence).
- Color carries governed semantic meaning, not decoration — coordinate with the locked
  palette in CLAUDE.md §6 (lime/purple/blue system; no new hues without Founder
  approval).
- Halo placement is relational to the selected cone, not arbitrary; halo hierarchy is
  evidentiary, not decorative.
- Progressive disclosure only — complexity appears because the user moved closer, not
  because more got put on screen.
- Existing capability (below) informs but does not dictate the design.

## What already exists, for reference only

- ConeMap (six-domain environment) — live.
- AnalysisDomainField / AnalysisIdleField (investigation surfaces) — live.
- `convergenceclassifier.js` (KRYL-1207) — built: resolves conflicting/unresolved
  narratives, exposes a full evidence/Data Tap trail. Not yet mounted to any surface —
  final placement is part of this design.
- `HaloRing`/`HaloMesh` primitives exist in code but are currently unreachable from the
  live app.

## Out of scope

Implementation architecture, exact data-provider contracts, mathematical scoring
formulas — those stay downstream per SPEC I §22 / SPEC II §14–15.

## Return Format

Return structured text, one block per Lens, in the exact §19 worksheet field order:
Purpose · Question · Input · Transformation · Output · Transition ·
Structural/Perceptual Relationship · Surface Encoding · Halo Composition ·
Live vs. Designed. Submit as a single document covering all six Lenses, not six
separate files — this lets it go through the same review → lock → grounding-audit
cycle SPEC I and SPEC II already went through.
