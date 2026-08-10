# SPEC — Connector Aggregate Representation (Top-10 by Integrity)
## Thunder in a Bottle — Bottle Test v1.0

Ticket number: **PENDING** — per Jira-exclusive numbering, needs a real KRYL-### assigned before
build. Do not build against a locally-invented number.

---

## HEADER

**[KRYL-PENDING] — Connector Aggregate Representation**
Date: 2026-08-10
Author: Founder (Mr. XS), drafted by agent per explicit request, pending engineering vet.
Target file(s): `src/components/spine/conemap.jsx` (Formation Relationship Connector Layer),
`src/formationlayer/formationrelationship.js`.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Replace the current binary "line exists / doesn't" connector rendering with a ranked
top-10 representation, where each connector's physical properties (color, vertical position,
weight, blink rate) encode real, existing measurements — so the display stops implying that
convergence is exclusive to whichever pairs happen to render.

**Output:** Up to 10 rendered connectors, ranked by Integrity, each with four physically distinct
properties driven by four separate real values.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `deriveRelationships()` / `computeCandidatePairs()`, `src/formationlayer/formationrelationship.js`
  — existing, real, already produces `strength`, `state`, `id` per candidate pair.
- `coneState` — the same live array `conemap.jsx` already renders cones from (`pressure`,
  `volatility` per domain). Same source the KRYL-1171 ObserveStoryBanner fix already established
  as the correct live pool — NOT `domaingravity.js` (see Notes, prerequisite bug).

**Output contract:** Rendered connectors only. No new signal or classification is computed and
stored — every value used already exists on `coneState` or `deriveRelationships()`'s output.

**Explicit exclusions:**
- Does NOT change `deriveStrength()`, `deriveState()`, or any relationship-computation logic in
  `formationrelationship.js` — this WO is a ranking + rendering layer on top of what already
  exists, not a change to how relationships are computed.
- Does NOT hide low-Integrity or fracturing (DIVERGING/WEAKENING) relationships from the top-10
  if they genuinely rank there (§20 Direction Honesty) — ranking is by Integrity magnitude, not
  by whether the relationship is "good news."
- Does NOT vary by persona/viewer (§18 Persona Guardrail) — same top-10, same physical encoding,
  regardless of who's looking.
- Does NOT touch cone geometry (WO-2076/2077 boundary — no change to `conemap.jsx`'s existing
  cone height/radius rendering).
- **View-state contract (shared with `SPEC-perception-curve-surface.md`):** these connectors
  render in the **Cone** view only. If `SPEC-perception-curve-surface.md`'s **Base** view is
  active, connectors do not render — same bleed-through class of bug already fixed twice this
  session (ThresholdBands, FlowArc bleeding into 2D report overlays). Gate on the Cone/Base view
  state, not a new condition invented independently by this WO.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. **Not violated** —
  `pressure`/`volatility`/`strength` consumed read-only, no new detection.
- [ ] Scoring layer touched → N/A.
- [ ] Inference layer touched → N/A.
- [x] UI layer touched → display does NOT introduce new data dependencies. **Not violated** —
  Integrity (§6) is computed from fields already present on existing objects, not a new fetch.

**Drift notes:** None — no naming collision found (checked `formationintegrity.js` again; its
"Integrity" concept is the five-gate lifecycle state, unrelated computation, not read by this WO
either).

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Turns the connector layer from an implied "these two domains are exclusively
linked" claim into an honest "here are the field's 10 highest-integrity structural relationships
right now" — surfacing real cross-domain asymmetry instead of one arbitrary static pairing.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a ranked, honest picture of which
domain relationships in the field currently carry the most real signal relative to noise."**

---

## 6. FORMULA / CONTRACT

**Status: PROPOSED — ready for engineering review, not yet locked.** Every input is a real,
already-live field. Nothing invented.

**Integrity (ranking + selection):**
```
Signal(pair) = deriveStrength(a, b) = min(cohesion_a, cohesion_b)     // already real, formationrelationship.js
Noise(pair)  = max(volatility_a, volatility_b)                        // already real, coneState[i].volatility
Integrity(pair) = Noise(pair) > 0 ? Signal(pair) / Noise(pair) : Signal(pair)
```
Zero-noise case returns Signal unscaled (treated as neutral, not divided by zero / not Infinity) —
an explicit, stated choice, not a hidden edge case.

Candidate pairs, then top 10 by Integrity descending. Fewer than 10 render if fewer than 10
candidate pairs exist (never pad to reach 10).

**Physical property mapping — four independent axes (§23 orthogonality: each driven by a
different real value, none collapsed into another):**

| Property | Driven by | Source |
|---|---|---|
| Color | `RELATIONSHIP_STATE` (EMERGING/CONVERGING/STABLE/WEAKENING/DIVERGING) | `RELATIONSHIP_STATE_COLOR`, already real, `conemap.jsx:16-23` — unchanged |
| Vertical position | `pressure` (mean of the pair's two domains) | `coneState[i].pressure`, already live, same field driving cone height |
| Weight (line thickness) | Integrity (this WO's formula, above) | new derived value, computed only, not stored |
| Blink rate | `deriveStrength()`'s pair strength (existing `strength` field) — higher strength = faster/more coherent pulse, mirrors existing `pulsePeriod` pattern already used elsewhere in `conemap.jsx` (`PulseFloor`) | `formationrelationship.js` output, unchanged |

**Legend:** required per this contract — four independently-driven properties are not
self-explanatory without one. Legend content is a rendering detail for engineering to design
against this table, not specified further here (§15 Design Sovereignty).

Units: Signal/cohesion 0–1, volatility 0–1 (existing ranges), Integrity is a dimensionless ratio
(unbounded above when noise is low — engineering should decide a display cap, e.g. weight caps at
a max px value; this is a rendering clamp, not a formula change).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/components/spine/conemap.jsx` (Formation Relationship Connector Layer, ~line 2143) | Rewrite the render block: compute Integrity, rank, take top 10, map 4 physical properties per §6 | Cone geometry, all other layers untouched |
| `src/formationlayer/formationrelationship.js` | None | `deriveStrength()`/`deriveState()`/`deriveRelationships()` unchanged — consumed as-is |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — replaces an implied-exclusive single line with an honest ranked set |
| Does this have a single dominant output? | YES — up to 10 ranked, physically-encoded connectors |
| Are all boundaries explicitly defined? | YES — §2 |
| Can this be built without touching an undefined dependency? | YES — see prerequisite note below, not a formula gap |
| Does this avoid increasing expressive flexibility in the core? | YES — no new detection/scoring, display + ranking only |

**Verdict: PASS**, conditional on the prerequisite in Notes (below) being fixed first — that's a
sequencing dependency, not a formula gap, so it doesn't fail the Bottle Test itself.

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. SI:** Preserves `formationrelationship.js` invariants entirely — read-only consumer.
**2. SC:** "Integrity" here is a new, explicitly-scoped term (Signal÷Noise) distinct from
`formationintegrity.js`'s unrelated five-gate concept — same naming risk as the OBSERVE spec,
resolved the same way: by not reading or depending on that file.
**3. EC:** Declarative rendering + a pure ranking function. No cross-module mutation.
**4. DE:** Static formula, fixed inputs. Not living/tunable at runtime.

**Outcome tag: PASS**

---

## 10. DEFINITION OF DONE

**Verification:**
1. With ≥2 candidate pairs live, connector render count matches `min(10, candidatePairCount)`.
2. Each rendered connector's weight is monotonically related to its computed Integrity value
   (higher Integrity → thicker line) — spot-check 3 pairs.
3. A DIVERGING-state pair with high Integrity renders in the top 10 with the same visual weight
   rules as a CONVERGING pair of equal Integrity — confirms §20 compliance (no suppression).
4. `grep -n "adaptDomainToFormation" src/components/spine/conemap.jsx` returns nothing — confirms
   the prerequisite fix (Notes) landed before this WO's code was written on top of it.

---

## NOTES

**Prerequisite, not part of this WO:** the Formation Relationship Connector Layer currently calls
`adaptDomainToFormation(s.domain, ...)`, which reads `getDomainPressure()`
(`domaingravity.js`) — a pool fed only by the external-API connector fleet, empty without live
network access. That's the same dead-pool bug already fixed once for `ObserveStoryBanner`
(KRYL-1171). This WO's formula (§6) assumes `coneState`'s live `pressure`/`volatility` is already
the input — which requires that dead-pool bug fixed first, or this WO silently inherits it. Not
blocking this spec (the formula doesn't change either way), but build order matters: fix the pool
bug, then build this on top of the corrected read.

Derivation lineage: same 2026-08-10 discussion as `SPEC-perception-curve-surface.md` — "why is
this only one line," "connectors as aggregate not exclusive," "Integrity = Signal ÷ Noise, ranked
not exhaustive," "colorized with legend," "vertical position / weight / blink driven by real
values, not invented ones."
