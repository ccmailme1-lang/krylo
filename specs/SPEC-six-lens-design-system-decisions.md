# SPEC — Six-Lens Design System Decisions

Status: LOCKED (design-system layer — does not modify SPEC I or SPEC II)
Role: Records the Founder's rulings on the #1–#7 downstream design-decision pass,
implementation-grounded before being locked
Reference: KRYL-1209, SPEC-six-lens-perceptual-experience-contract.md,
SPEC-observable-substrate-revelation-contract.md,
SPEC-six-lens-implementation-grounding-addendum.md

## #2 — Cone geometry: LOCKED

Verified against live code: upright cone, apex up, no rotation applied
(`conemap.jsx:213-214`). The proposed weighted cone-surface encoding is new
construction on top of this geometry, not a correction to it — no per-cone surface
banding exists in the live app today.

## #3 — Semantic axes: LOCKED

Convergence state and epistemic status are two distinct semantic axes and must not be
visually conflated.

- **Convergence state** — retains CLAUDE.md §6's existing chromatic encoding
  (lime/blue/purple/two greys), driven by `classifyConvergenceState()`
  (`convergenceclassifier.js`). Untouched, authoritative, whole-cone.
- **Epistemic status** — gets a secondary, neutral/achromatic surface treatment on the
  cone (not a second chromatic family). Corroborated = highest-luminance neutral /
  strongest surface presence; Observed = intermediate neutral; Formation-contributing =
  distinct lower-luminance neutral; Unresolved = explicitly achromatic/subdued.
  Distinction reinforced by opacity/band treatment, not shade count alone.
- **Halo** — stays spatial (position/radius), not a third color axis.

Grammar: cone color tells you convergence; cone surface tells you epistemic standing;
cone position/halo tells you structural depth.

## #4 — Unresolved: LOCKED

`UNRESOLVED_NO_RANKING` (`observestoryview.jsx:334-338`) is a real, distinct adjudication
outcome — different inputs and semantics from CLAUDE.md §6's `INSUFFICIENT SIGNAL` /
`LOW SIGNAL YIELD`. The achromatic epistemic treatment from #3 applies directly to this
existing state. No new state, primitive, or conceptual layer required.

## #6 — Classifier placement: LOCKED

**Naming correction (see addendum):** the relevant adjudication surface is
`observestoryview.jsx` (`adjudicate()`, `getLastAdjudication()`, default export
`ObserveStoryBanner`) — not `convergenceclassifier.js`, which is §6's unrelated
convergence-state engine.

Ruling: existing adjudication engine, exposed at r₁, RESOLVE-only. This is a
wiring/relocation decision, not new inference architecture. `ObserveStoryBanner`'s
`coneState` prop is already sourced from `aggregateSignals()`, the same data `app.jsx`
hands to ConeMap — no new pipeline required to mount it.

## #1 — Palette values: LOCKED (KRYL-1210)

Epistemic-status neutral/achromatic scale, derived from existing CLAUDE.md §6 precedent
(linear luminance interpolation between the two anchors below), distinct from the two
reserved convergence-state greys:

| Epistemic status | Hex | Role |
|---|---|---|
| Corroborated | `#e0e0dc` | highest luminance / strongest presence (existing §6 Light Gray) |
| Observed | `#969692` | intermediate |
| Formation-contributing | `#4b4b49` | lower luminance |
| Unresolved | `#000000` | achromatic / subdued (existing §6 moat-bg) |

No new hue. Existing convergence colors untouched: `#66FF00`, `#007FFF`, `#8A2BE2`,
`#3a3d4a`, `#1a1a1a`.

## #5 — Halo hierarchy: LOCKED (KRYL-1211)

Grounding found the halo attaches to one node (an individual truth record/ETR,
`signalmap.jsx:351`), and that the proposed tiers cross three different granularities:
r₁ is genuinely node-level data (`fs`, `fidelity_components`); r₂/r₃ are real but
domain/formation-level (`formationrelationship.js`'s `RELATIONSHIP_STATE`,
`formationschema.js`'s domain-as-formation), not node-level; UNRESOLVED is real
(`observestoryview.jsx`) but not joined to node IDs. None require new inference — r₂/r₃/
unresolved need a derived-presentation bridge from their real source, not fabrication.

**Ruling:**

- **r₀ — Surface.** The node itself. No halo.
- **r₁ — Observation/Evidence.** Directly node-grounded (strongest, most literal tier).
  Closest ring, tightest radius, highest opacity. Primary halo tier.
- **r₂ — Relationship.** Derived presentation of the node's relationship to the broader
  domain structure (not a claim the node itself owns a relationship record). Larger
  radius than r₁, lower opacity, visually separated — not a copy of the same ring.
- **r₃ — Formation.** Derived presentation of the node's participation in an identified
  formation context (domain-level, not node-level). Largest bounded radius, lowest
  visible opacity among the resolved tiers, more diffuse/spacious than r₂.
- **UNRESOLVED is not r∞ geometry.** Not an infinitely expanding halo — it's an
  epistemic condition, not a spatial distance. Uses the #1/#3-locked achromatic
  epistemic treatment; the halo hierarchy itself stays bounded (r₀–r₃ only).

**Spatial hierarchy:** node → tight/strong (r₁) → wider/weaker (r₂) → widest/subtlest
(r₃). Concentric/nested, not three thick glowing outlines. Clear but restrained falloff
— the user should perceive "this influence extends outward" without counting rings.

**HARDENED gate unchanged.** `fs >= 0.70` remains the base visibility gate for whether a
halo renders at all (`signalmap.jsx:420`) — untouched. r₁/r₂/r₃ determine what the halo
communicates once it appears; HARDENED determines whether it appears.

**Rule:** The halo is a bounded, concentric spatial hierarchy attached to hardened ETR
nodes. r₁ = node-grounded observation/evidence; r₂ = derived relationship context;
r₃ = derived formation context. Visual strength decreases outward. UNRESOLVED uses the
locked achromatic epistemic treatment, not r∞ geometry. The existing `fs >= 0.70`
HARDENED gate remains the prerequisite for halo visibility.

## #7 — SEE state: LOCKED (buildable now) / Epistemic aggregate: DEFERRED

Grounding split #7 into two decisions with different implementation reality.

**SEE state — LOCKED, buildable now.** Shallow per grounding: `selectedCone = manualPick
?? autoHighest` (`conemap.jsx:2386`) has only two downstream consumers, one already
null-safe, one needs a null-cone guard. New geometry/rendering-mode only, not entangled
elsewhere.

> SEE = Marquee + all six domains visible + no automatically selected/focal cone + no
> domain forced into prominence + environment readable as a whole. Automatic focal
> selection (`autoHighest`) is removed in the SEE state specifically.

**Four-level epistemic aggregate — DEFERRED, not fabricated.** The v2 mockup's
corroborated/observed/formation-contributing/unresolved per-domain percentages cannot
currently be truthfully generated:
1. Domain labels aren't uniformly trustworthy — some native (`cone_domain`), some
   hardcoded per-connector, some heuristically inferred (`usehnsignals.js`'s
   `domainFromText()`).
2. `fs` gives three signal-strength tiers (HARDENED/WATCH/CALM), not four epistemic
   states — mapping one onto the other would corrupt the #3-locked distinction between
   convergence/signal-strength and epistemic status.
3. `adjudicate()` operates across the full six-domain snapshot, not per-domain — cannot
   currently produce a clean per-domain epistemic distribution without restructuring
   `buildCandidates`.

Design concept retained, implementation deferred pending: (a) a uniform domain-identity
model across connectors, (b) an adjudication design capable of producing per-domain
epistemic evidence. Not to be substituted with the 3-tier `fs` system or fabricated
percentages in the meantime.

## Guardrail (from #7's grounding)

No prototype percentage, band proportion, or epistemic aggregate may be presented as
live/data-derived unless an implementation-grounded source exists.
