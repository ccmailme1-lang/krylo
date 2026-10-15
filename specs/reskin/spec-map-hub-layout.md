# SPEC (DRAFT): MAP tab — hub-and-spoke layout

Status: DRAFT, 2026-10-15. Not filed in Jira. No code written. Build theme: current black (§6 dark). Light variant is reference only.
Mockups: `specs/reskin/map-hub-dark.html` (build target), `specs/reskin/map-hub-light.html` (reskin reference).

## Six-field definition (Ticket Definition Requirement)

1. **Original intent:** make the structural formation readable at a glance: subject at the center, the six locked domains around it, observations branching from each domain, admitted cross-domain relationships drawn between domains. (§20.8: expose the relationship, don't make the guest assemble it.)
2. **Acceptance criteria:** see "Acceptance" below.
3. **Current implementation state:** `public/structure-field.html` draws on a canvas. Domain positions come from `computeGraphLayout()` (spring embedder, line 468). Nodes come from `applyFieldFormation()` (line 520): `formation.graph.vertices` → domain nodes with `contribution = v.meanMagnitude`; `formation.graph.edges` → admitted relationships (`strength: 1`). A subject node exists (`entity: true`, line 794). Line color is lime when `edgeResolution > 0.85` (line 1143). No convergence-state input. The version in the Founder's screenshot (FORMATION INTEGRITY, five-state legend) is not in git — see `specs/def-structure-field-live-code-not-in-repo-20261007.md`.
4. **Dependencies:**
   - D1 (blocking): Founder's local structure-field work committed and pushed; this spec is rebased onto it.
   - D2 (blocking for state squares): per-domain convergence state delivered to the iframe. `convergenceclassifier.js` exists but is not wired here. Source and message shape: **TBD**.
   - D3 (blocking for observation nodes): per-domain observation groups (label + count) delivered to the iframe. Not present in `formation.graph` on `main`. **UNCONFIRMED** whether any producer has it.
   - D4: formation-history scrubber (KRYL-1334) reused for the timeline rail.
5. **Superseded by a newer ticket:** none found locally. Jira not searched.
6. **Maps to current product model:** yes (navMode 'structure', MAP tab).

## Change classification

**REPLACEMENT (§4 Architecture-first):** the layout changes from force-directed (`computeGraphLayout`) to a fixed radial hub-and-spoke. Declared here as a replacement, not an addition. Rendering stays canvas.

## File map

| File | Change |
|---|---|
| `public/structure-field.html` | Replace `computeGraphLayout()` placement with radial placement (subject center; six domains at fixed angles in `CONE_DISPLAY_ORDER`; observation groups fanned outward). Domain node = filled disc + state square. Legend row with real counts. Remove nothing else until D1 is merged. |
| Parent that posts formation data to the iframe (**TBD** — identify in D1 code) | Add per-domain state (D2) and observation groups (D3) to the posted payload. |

## Rules carried from existing decisions

- Position is a layout, not a measurement: no axis ticks, scale numbers, or gauges (Founder 2026-10-01, 2026-10-04; structure-field.html:1053, 1066).
- Color = convergence state only (§6). Node type = shape and size.
- Lime lines = admitted relationships (unchanged meaning).
- A domain with no observations is shown hollow and dashed (Absence-Is-Signal), never hidden.
- No search/ask box on the map (Founder 2026-10-15).

## Acceptance

1. With a real formation, every vertex in `formation.graph.vertices` appears as a domain node; every edge in `formation.graph.edges` appears as a lime line; counts in the legend equal the payload's counts.
2. State square per domain equals the classifier's output for that domain (D2), or the square is absent with a visible "state unavailable" label — never a default color.
3. Hover isolates a branch; click opens that domain's summary (state, count, relationships) using real values only.
4. No numeric scale appears anywhere on the map.
5. BAU: existing scrubber, hover callouts, and formation-history glyphs still work.

## Bottle Test

| Question | Answer |
|---|---|
| Reduces ambiguity | YES |
| Single dominant output | YES |
| All boundaries defined | NO — parent payload file TBD |
| No undefined dependencies | NO — D2 source TBD, D3 unconfirmed |
| Does not increase expressive flexibility in core | YES |

**Verdict: BLOCKED** until D1–D3 are resolved.

## Non-goals

Light theme; changes to formation inference or edge admission; changes to the classifier.
