# WO-[NUMBER TBD — assign in Jira]: Comparative Diff Command

Status: DRAFT — ready for Jira creation. Hardened against the 9-section Bottle Test (§11a).

---

## 1. Single Responsibility

Typing `diff [entity A] and [entity B]` (or `vs`/`versus`/`&`) into the search box produces a
real, evidence-grounded, per-domain structural comparison between the two entities — nothing
else. This WO does not build a general command grammar, does not touch the single-entity search
path, and does not invent a new composite "similarity score."

## 2. Boundary Declaration

IN SCOPE:
- Detecting exactly one command shape: `diff A and B` / `diff A vs B` / `diff A versus B` / `diff A & B`.
- Sourcing REAL per-entity evidence (not the existing placeholder/parity data) for each entity.
- Rendering a per-domain, uncollapsed comparative report.

OUT OF SCOPE (explicit non-goals, not deferred-and-forgotten):
- The broader "Oracle Command Interface" (`cast`, `prospectus`, `replay`, `trace` verbs). That is
  a separate, much larger decision about the search box's role as the universal entry point (§2)
  and needs its own Founder sign-off. This WO adds exactly one recognized phrase shape, not a
  general verb router.
- Any single-scalar "Similarity Index %" or composite score. Per-domain rows stay uncollapsed
  (§21). If a composite is ever wanted later, it is multiplicative-only (§18) and is its own WO.
- 3+ entity comparison. Two entities only.
- Changing `resolvePrimary()` or any existing single-entity routing logic. This is an additive
  branch that runs BEFORE existing routing and short-circuits only on a match.

## 3. Zero Drift

The existing single-entity search path (`resolvePrimary()` → `synthesizeQuery()` → Target
Packet/Intelligence Brief) is not modified. The diff command is a new branch checked first; a
non-match falls through to the current code, unchanged, byte-for-byte. Regression test required
before merge: 20 existing single-entity queries must produce identical output pre/post.

## 4. Strategic Leverage Statement

KRYLO already computes a real, evidence-grounded, groundedness/polarity/absence-tagged structural
field for entities via EDGAR canonical events (`edgar8kevidence.js`), entity topology
(`entitytopologyregistry.js`), and entity identity resolution (`entityresolution.js` /
`identitykernel.js`). No competitor tracks structural signal this way. A diff is a subtraction
over data that already exists — the leverage isn't "we built a compare feature," it's "our
per-entity structural field is differentiated enough that comparing two of them is worth showing."

## 5. Output Gravity

One Comparative Difference Report per diff command: entity header, per-domain divergence rows
(each grounded-or-withheld per §22), leverage margin / dominant axis / asymmetric capture per
domain (already computed by `compareSignals()` in `asdiff.js` — reused, not reinvented).

## 6. Formula / Contract

```
parseDiffCommand(query) → { entityA, entityB } | null
  [lives inside querysynthesis.js, checked first in synthesizeQuery() — not a new file]
  Pattern: /^diff\s+(.+?)\s+(?:and|vs\.?|versus|&)\s+(.+)$/i
  Case-insensitive on the verb/separator only. Entity strings preserve original casing.
  No match on bare "diff X Y" (no separator) — rejected as ambiguous, falls through to normal
  single-entity search (which will then classify "diff X Y" as AMBIGUOUS on its own merits,
  per DEF-1864 — no special-casing needed).

resolveEntitySignalField(entityName) → SignalUnit[] (one per domain touched)
  [lives inside crediff.js — not a new engine file]
  1. entityName → canonical identity via entityresolution.js / identitykernel.js
  2. Pull REAL evidence scoped to that identity only:
     - getCanonicalEvents() filtered to resolved entity (edgar8kevidence.js)
     - getTypedEdgesFor({cik, name}) (entitytopologyregistry.js)
     - any connector output already tagged with that entity (patentsviewconnector.js
       assignee-level, supplychainconnector.js)
  3. Aggregate into asdiff.js's existing buildSignalUnit shape, per domain touched by that
     evidence — reusing the same domain-pressure computation already used for single-entity flow,
     scoped to this entity's evidence records only (not the global domain pool).
  4. A domain with zero resolvable real evidence for that entity → STRUCTURAL_ABSENCE for that
     domain (§22), never silently zero, never fabricated parity. Reuses the existing
     STRUCTURAL_ABSENCE pattern from whytraceresolver.js — not a new absence taxonomy.

runComparativeDiff(entityA, entityB) [crediff.js, Slice 2 — replaces Slice 1]
  Removes HARDCODED_PEER_SETS and the neutral/identical placeholder input generator.
  For each domain either entity has real evidence in:
    unitA = resolveEntitySignalField(entityA)[domain] ?? STRUCTURAL_ABSENCE
    unitB = resolveEntitySignalField(entityB)[domain] ?? STRUCTURAL_ABSENCE
    row   = compareSignals(unitA, unitB)   // asdiff.js — no new comparison math
  Returns per-domain rows, UNCOLLAPSED (§21). A domain where either side is STRUCTURAL_ABSENCE
  renders that row as "insufficient evidence to compare" — not parity, not omitted.
```

## 7. File Map

```
MODIFIED src/engine/querysynthesis.js       — adds parseDiffCommand() as a function INSIDE the
                                                existing query-processing engine (this file
                                                already owns all search-box interpretation via
                                                resolvePrimary()/synthesizeQuery() — the diff
                                                phrase is one more pattern it recognizes, checked
                                                first; non-match falls through to the existing
                                                logic unchanged)
MODIFIED src/engine/crediff.js              — Slice 2: adds resolveEntitySignalField() as a
                                                function INSIDE the existing Diff Engine file
                                                (crediff.js already orchestrates asdiff.js around
                                                an entity pair — this is that same job, done with
                                                real inputs instead of placeholders); deletes
                                                HARDCODED_PEER_SETS and the neutral-placeholder
                                                generator.
NEW      src/components/analysis/comparativefield.jsx — renders the Comparative Difference Report
                                                (UI surface, not engine — no comparative report
                                                surface exists today to extend)
MODIFIED src/app.jsx                        — krylo-submit listener: when synthesis.mode ===
                                                'COMPARATIVE', mount comparativefield.jsx instead
                                                of the standard single-entity surface
```

Zero new engine files. Two existing engine files touched (`querysynthesis.js`, `crediff.js`),
both already own this exact responsibility (query interpretation; comparative orchestration).
Every data dependency (`asdiff.js`, `entityresolution.js`, `identitykernel.js`,
`edgar8kevidence.js`, `entitytopologyregistry.js`) already exists and is COMPLETE. No TBDs.

## 8. Guardrails (doctrine mapping — non-negotiable, from CLAUDE.md)

- **§22 Absence-is-Signal** — no evidence for an entity/domain → classified STRUCTURAL_ABSENCE.
  Never fabricated parity, never a silent zero. This is the exact defect class DEFECT-0001 fixed
  elsewhere in the app; this WO must not reintroduce it in a new surface.
- **§21 Route-Don't-Aggregate** — diff-command detection is a routing decision made before any
  signal is touched. Per-domain rows stay uncollapsed; no forced composite score.
- **§18 Multiplicative-Only** — this WO introduces NO composite score. If one is added later, it
  must be multiplicative, never additive/weighted-average, and is a separate WO.
- **§23 Orthogonal Axis Integrity** — per-domain diff axes (TECHNOLOGY, CAPITAL, KNOWLEDGE,
  LABOR, MEDIA, OWNERSHIP) must not be blended or duplicated against each other.
- **§11a Detect-Not-Predict** — output describes DETECTED current structural divergence. No
  language implying which entity "wins" or what happens next.
- **§16 Signal Ingestion Architecture** — `entitysignalfield.js` consumes already-normalized
  (0–100) data via existing connectors only. No new direct-to-cone wiring, no bypass of
  `surfacerouter.js`'s normalization contract.
- **§15 Design Sovereignty** — `comparativefield.jsx` introduces zero new colors. Reuses the
  locked §6 palette and existing constructive/fracture polarity treatment only.
- **§2 Entry Point Lock** — the diff branch is additive only. The existing Layer 1→1N→2→3 journey
  for normal (non-diff) queries is untouched, byte-for-byte.
- **Non-breaking merge gate** — regression suite (20 existing single-entity queries, pre/post
  identical output) is a merge blocker, not a nice-to-have.

## 9. Bottle Test

1. Reduces ambiguity? YES — "compare X vs Y" goes from unsupported/would-be-fabricated to a
   defined, evidence-gated output.
2. Single dominant output? YES — one Comparative Difference Report per command.
3. All boundaries defined? YES — command shape locked, data sources locked, no invented
   composite metric, out-of-scope items named explicitly.
4. No undefined dependencies? YES — every engine dependency already exists and is COMPLETE.
5. Does not increase expressive flexibility in core? YES — exactly one recognized phrase shape is
   added, not a general command grammar. The broader verb-router idea is explicitly deferred as
   its own decision (§2 above).

## 10. Comparative Analysis Surface Specification (Locked)

This section is locked product spec, not a UX suggestion. Engineering implements the surface as
defined below — information architecture, required content, and interaction rules are not
open to reinterpretation. Two claims below have been corrected against the actual codebase
(see note); everything else carries forward as specified.

**Correction note:** an earlier draft of this section assumed (a) a "Lens Surface Contract" with
fixed pixel dimensions (1440 viewport / 76px nav / 44px top bar / 315px right panel), and (b) a
URL route `/comparison/:entityA/:entityB`. Neither exists. `LSC-001` is real
(`specs/signal-map-rendering-investigation.md`) but governs which lens renders in which surface
region — it carries no pixel contract. And this app has no URL router (no `react-router` in
`package.json`, no `pushState`/`window.location` usage in `app.jsx`) — navigation is internal
state via `PrismContext` + the `krylo-submit` postMessage bridge. Both are corrected below to the
mechanism that actually exists, not by removing the surface — the surface itself is unaffected.

### Purpose

The Comparative Analysis Surface (CAS) is the dedicated KRYLO workspace for structural comparison
between two entities. It is not a report page, dashboard, ranking page, or side-by-side profile
comparison. The analytical object is `Relationship(Entity A ↔ Entity B)`, not
`Entity A Report + Entity B Report`. It exists to reveal structural divergence, convergence,
pressure, drift, and absence between entities using existing KRYLO evidence and `asdiff.js`
output.

### Mount Behavior (corrected — no URL route)

```
User types "diff google and microsoft"
      ↓
krylo-submit postMessage (existing bridge, app.jsx)
      ↓
synthesizeQuery() detects diff command → synthesis.mode = 'COMPARATIVE'
      ↓
app.jsx mounts comparativefield.jsx in place of the standard single-entity surface
```

No browser URL changes. No new route. The user must not land on the normal entity analysis page,
the standard search results surface, a generic report page, or a placeholder-parity comparison —
`synthesis.mode === 'COMPARATIVE'` is the sole switch, checked in exactly the one place `app.jsx`
already decides which surface to mount.

### Surface Shell

Reuses the existing Analysis-bay visual system already established across `analysisfield.jsx`,
`targetpacket.jsx`, and `intelligencebrief.jsx` — no-fill cards, hairline dividers on black, HUD
float over content (no boxed panels), locked §6 palette only. No new pixel-dimension contract is
invented for this surface; it inherits the shell those three components already use.

### Page Structure

```
┌───────────────────────────────────────────────┐
│ HEADER                                         │
│ GOOGLE ↔ MICROSOFT                             │
│ Comparative Structural Analysis                │
│ Evidence Coverage | Domains | Signal Count      │
├───────────────────────────────────────────────┤
│                                                 │
│           PRIMARY COMPARISON FIELD             │
│      Structural Difference Visualization       │
│                                                 │
├───────────────────────────────┬───────────────┤
│ DOMAIN DIFFERENCE STREAM       │ CONTEXT PANEL │
│ (one card per touched domain)  │ Evidence      │
│                                 │ Provenance    │
│                                 │ Signal count  │
│                                 │ Coverage      │
├───────────────────────────────┴───────────────┤
│ HISTORICAL COMPARISON TIMELINE                 │
└───────────────────────────────────────────────┘
```

### Header

Required: `ENTITY A ↔ ENTITY B`, "Comparative Structural Analysis", signal count, evidence
coverage, domains compared, analysis timestamp.
Forbidden: winner labels, ranking scores, "better than," "recommendation" language (§11a, §18).

### Primary Comparison Field

Not a two-column layout, not profile cards, not a feature matrix, not a leaderboard, not a bar
chart. It represents the relationship as the object — Entity A and Entity B converging into a
single difference field, not sitting side by side. Visual treatment (motion, exact glyphs, color)
is Founder territory per §15 Design Sovereignty — engineering does not originate that part. What
is locked here is the *structural requirement*: one relationship object, not two entity panels.
`DRIFT` (existing lens), `TENSION` (existing metric, `oracleengine.jsx` `globalTensionSpike`), and
`SILENCE` (existing `CATEGORY_MAP` anchor, `tenkvault.jsx`/`oracleview.jsx`) already exist in the
codebase and are available vocabulary; any other visual-language terms need Founder sign-off
before use.

### Domain Difference Stream

One card per domain either entity has real evidence in (dynamically derived from `crediff.js`
output — no fixed domain list beyond the six canonical TECHNOLOGY/CAPITAL/KNOWLEDGE/LABOR/
MEDIA/OWNERSHIP domains, §17). Each card:

1. **Domain name**
2. **Difference statement** — generated only from `compareSignals()` output (`asdiff.js`), never
   authored/inferred beyond what the engine returns
3. **Supporting evidence** — real signal/event references, not placeholders
4. **State** — `Grounded` or `Insufficient Evidence` (STRUCTURAL_ABSENCE), never a numeric score
5. **Provenance chain** — statement → signal → artifact → source → timestamp, expandable

**"Structural Similarity" is not a numeric score.** If a per-domain converge/diverge state is
shown, it reuses the existing hysteresis-debounced CONVERGENCE classifier states
(`convergenceclassifier.js`) — e.g. `BUILDING CONVERGENCE`/`TURBULENT`/`HIGH CONVERGENCE` — not a
new "82 vs 79" style number. This resolves the one internal inconsistency in the original request
(a "Structural Similarity" section alongside a "no composite ranking" rule) using an engine that
already exists rather than inventing a score.

### Right Context Panel

Fixed: evidence artifacts, signal count, provenance, domain coverage. No filters, no scoring
controls, no manual weighting — see Interaction Rules below.

### Absence Panel (mandatory, §22)

```
ABSENCE SIGNALS
No comparable evidence found for: [domain/facet]
Status: Unknown — Insufficient grounded evidence.
```

Missing evidence is displayed, never filled, never inferred, never defaulted to zero or parity.

### Historical Comparison Timeline

Bottom strip, reuses existing timeline primitives (the same pattern `tenkvault.jsx` already uses
for its NOW-marker rail) — not a new timeline component.

### Interaction Rules

Allowed: click a domain card → evidence detail; click a signal → provenance; click a timeline
point → updates comparison state.
Forbidden: filters panel, scoring controls, recommendation buttons, analyst weighting controls,
manual ranking, custom comparison criteria.

### Lens Compatibility

No new lens types. Existing lenses reinterpret the same comparative data:

| Lens | Comparative View |
|---|---|
| Signal | Signal differences |
| Flow | Capital/resource movement differences |
| Pressure | External force differences |
| Convergence | Areas becoming structurally alike |
| Drift | Areas separating |
| Ownership | Structural asymmetries |

### Engineering Constraints

Reuse only: `querysynthesis.js`, `crediff.js`, `asdiff.js`, `entityresolution.js`,
`identitykernel.js`, `edgar8kevidence.js`, `entitytopologyregistry.js`, `convergenceclassifier.js`,
existing Analysis-bay visual system, existing timeline primitive.
Do not create: a new comparison engine, a new evidence model, a new scoring model, a new ranking
system, a new pixel-dimension shell, a new routing library.

## Acceptance Criteria

**Command / Engine**
- AC-1: `diff google and microsoft` resolves Entity A = Google, Entity B = Microsoft, sets
  `synthesis.mode = 'COMPARATIVE'`.
- AC-2: `compareSignals()` (`asdiff.js`) is invoked; no duplicate comparison logic exists anywhere.
- AC-3: Every difference statement carries evidence provenance.
- AC-4: No composite ranking or winner determination appears anywhere in output.
- AC-5: Existing search behavior is unchanged — `google`, `google microsoft` (no separator, falls
  through to normal AMBIGUOUS/single-entity handling) behave exactly as before this WO.

**Surface**
- AC-6: The diff command mounts `comparativefield.jsx`, not the standard single-entity surface —
  no separate page/route, since none exists in this app.
- AC-7: Surface reuses the existing Analysis-bay shell (no invented pixel-dimension contract).
- AC-8: All required regions render: header, primary comparison field, domain difference stream,
  context panel, absence panel, historical timeline.
- AC-9: A domain with no real evidence for one side renders as `STRUCTURAL_ABSENCE`, never
  blank/zero/parity.

## Definition of Done (grep-confirmable)

- `parseDiffCommand()` exists inside `querysynthesis.js`; correctly parses
  `"diff google and microsoft"`, `"diff Tesla vs Ford"`; rejects `"diff google microsoft"` (no
  separator) and all non-diff queries.
- `crediff.js` no longer contains `HARDCODED_PEER_SETS` or identical-placeholder generation as
  the live path.
- Typing `diff google and microsoft` in the live search box mounts `comparativefield.jsx` and
  renders real per-domain rows (not parity-by-construction).
- A domain with no real evidence for one side renders as STRUCTURAL_ABSENCE, not blank/zero.
- No composite score, ranking, or "winner" string appears anywhere in rendered output (grep the
  component for forbidden tokens: `score`, `rank`, `winner`, `%` attached to an entity name).
- Regression suite: 20 pre-existing single-entity queries produce identical output before and
  after merge.
- Founder UAT approval on the live surface before marking Complete.
