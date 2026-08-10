# SPEC — Perception Curve Surface (OBSERVE Lens)
## Thunder in a Bottle — Bottle Test v1.0

Ticket number: **PENDING** — per Jira-exclusive numbering, this needs a real KRYL-### assigned
before build. Do not build against a locally-invented number.

---

## HEADER

**[KRYL-PENDING] — Perception Curve Surface**
Date: 2026-08-10
Author: Founder (Mr. XS), drafted by agent per explicit request, pending engineering vet.
Target file(s): NEW — no existing file touched. See File Map (§7).

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Render a standalone visual surface, in the OBSERVE lens, that shows how much of the
system's current perceived-state read is grounded fact versus unconfirmed assumption — and marks
the specific moments individual hypotheses crossed from unconfirmed to confirmed.

**Output:** One rendered surface (tilted, nested-band cone form) showing (a) a groundedness
gradient and (b) Cross Points on that gradient.

This is two outputs (gradient + cross points) bound to one surface, not two WOs, because neither
is legible without the other — a cross point with no gradient to sit on has no meaning, and a
gradient with no cross points is just §18's existing groundedness number redrawn. Flag this to
engineering vet: if reviewers judge these separable, split before build.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `confirmationVelocity()` / `rankBranches()`, `src/engine/confirmationvelocity.js` (KRYL-1018,
  real code, exists — see §7 for its actual wiring status, which is NOT live). Both the gradient
  band position AND Cross Points are driven from this single source (see §6) — one input, not two.

**Output contract:** A rendered surface only. No new signal, score, or classification is computed
by this WO — it is a display layer over two engines that already exist.

**Explicit exclusions:**
- CORRECTION (Founder, mid-draft): the existing cones DO participate, via two named view states —
  **Cone** (default, current rendering, unchanged) and **Base** (cones rotate/reposition to expose
  a base surface, where the Groundedness Gradient renders). This is a real touch to `conemap.jsx`,
  not zero-touch as originally drafted. The boundary that still holds: switching to the Base view
  changes cone ORIENTATION/FORMATION (where the cones sit, same category as the existing `topoMode`
  lerp behavior already in the file — coneGroupRefs animating to new positions), not cone GEOMETRY
  (height/radius/what the shape itself encodes). WO-2076/2077 was about redefining the shape; a
  new view state is the same kind of change `topoMode` already makes, not a reopening of that
  cancellation — but this distinction is exactly the kind of thing the architecture-first-audit
  rule (§4) requires engineering to confirm by reading `conemap.jsx`'s actual
  topoMode/layoutLerpRef code before building, not assume from this spec.
- Does NOT compute a forecast, probability of a future value, or any prediction. Every band and
  every cross point is a read of PRESENT or PAST state only (§11a). `confirmationVelocity()`
  already stamps `timeArrow: 'RETROSPECTIVE'` on every output — this surface must never relabel
  or reinterpret that as forward-looking.
- Does NOT vary by persona/viewer (§18 Persona Guardrail) — the gradient and cross points render
  identically regardless of who's looking.
- Does NOT filter out low-groundedness or fracture reads to keep the surface looking clean (§20
  Direction Honesty) — a domain reading mostly "assumption, unconfirmed" must render with the
  same visual authority as one reading mostly "grounded, confirmed."
- **View-state contract (shared with `SPEC-connector-aggregate-representation.md`):** Cone/Base
  is a view state WITHIN the OBSERVE lens, not the lens itself — `viewportLens === 'OBSERVE'`
  stays true in both. Gating must use a distinct state variable (e.g. `coneMapView: 'CONE' |
  'BASE'`), not `viewportLens` alone — `viewportLens === 'OBSERVE'` is tautologically true through
  the whole Cone→Base transition and cannot by itself suppress anything. Architecture-first audit
  (§4) must confirm whether a suitable view-state variable already exists in `conemap.jsx` before
  introducing one. The Groundedness Gradient renders when `coneMapView === 'BASE'`; the Formation
  Relationship Connector Layer renders when `coneMapView === 'CONE'` — one shared state, checked
  by both WOs, not two independently-invented conditions.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. **Not violated** — no
  detection code is touched or added; this consumes `confirmationVelocity()`'s output as-is.
- [ ] Scoring layer touched → N/A, no scoring logic added.
- [ ] Inference layer touched → N/A.
- [x] UI layer touched → display does NOT introduce new data dependencies. **Not violated** — the
  single input engine (§6) is the only source; if a future revision needs data it doesn't already
  produce, that's a new dependency and must be scoped as a separate, named WO, not folded in here.

**Drift notes:** `formationintegrity.js` (see §7) already owns the word "Integrity" for a
different, unrelated computation (five-gate formation-legitimacy lifecycle). Resolved by naming:
this surface is the **Groundedness Gradient**, not "Integrity" — reusing §18's own existing term
for exactly this concept instead of a second word for the same idea. No collision, no rename of
`formationintegrity.js` needed, no dependency on its gates.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Makes the system's own epistemic honesty visible and legible as a first-class
surface — showing a viewer not just what KRYLO detected, but how much of that detection is
grounded fact versus assumption, and exactly when each piece was confirmed — which is the
detect-not-predict mission (§11a) made literally visible instead of asserted in doctrine only.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a visible, honest answer to 'how much
of what you're looking at is real, and when did it become real.'"**

---

## 6. FORMULA / CONTRACT

**Status: PROPOSED — ready for engineering review, not yet locked.** Every number below is an
existing, real, already-approved constant — nothing here is invented. What's new is only the
assembly: connecting three real values that already exist separately into one rendering rule.

**Band position (the gradient):**
Driven by `confirmationVelocity()`'s own `confidence` field (`src/engine/confirmationvelocity.js`,
already real — `confidence: clamp01(n / N_SATURATE)`, 0–1). This is used instead of
`computeMetrics()`'s groundedness field because groundedness is QUERY-scoped (§18's own HP
Scoping Rule: "the strip is PER-QUERY"), while this surface renders the AMBIENT field (all 6
domains, OBSERVE lens, no query) — `confirmationVelocity`'s confidence is the one groundedness-
shaped value that is already ambient-compatible.

Cut points reuse §18's already-locked groundedness color thresholds verbatim, applied to this
confidence value:
- **confidence > 0.70 → GROUNDED band** (green, matches §18)
- **0.40 ≤ confidence ≤ 0.70 → PARTIAL band** (amber, matches §18)
- **confidence < 0.40 → ASSUMED band** (red, matches §18)

Three bands, not the five in the reference diagrams — three is what's real and locked (§18); a
fourth or fifth band has no backing constant and is not added.

**Cross Points:**
Plotted at the moment a hypothesis's `confirmationVelocity()` result flips `withheld: true` →
`withheld: false` — i.e., the instant `n` first reaches `MIN_CONFIRM_N` (= 3, already a named
constant, `confirmationvelocity.js:21`) and a real velocity becomes computable. Position on the
gradient = that hypothesis's `confidence` value at that instant — same single axis as the bands,
no second undefined axis.

**Withheld hypotheses (n < 3):** rendered off the gradient entirely, in a distinct "awaiting
confirmation" state — never plotted at confidence 0, per §22 (absence ≠ null).

Units: confidence is dimensionless, 0–1, already the native output range of `confirmationVelocity()`
— no rescaling needed, no conflict with §16's 0–100 signal scale (this is a derived confidence
ratio, not a raw dispatched signal).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| New component (name TBD, e.g. `src/components/surface/perceptioncurve.jsx`) | New file — renders the surface | N/A |
| `src/engine/confirmationvelocity.js` | Read only — `confirmationVelocity()`/`rankBranches()` consumed as-is | Not modified. **Status: real code (Maturity A per §26), single existing caller is `formationintegrity.js`, which itself has zero callers anywhere in the app — Verification: L only, not runtime-confirmed live.** |
| `src/components/spine/conemap.jsx` | New formation state — cones rotate/reposition to expose the base surface (same category of change as existing `topoMode` lerp behavior) | Cone GEOMETRY (height/radius/shape) untouched — WO-2076/2077 boundary holds |
| `app.jsx` | New mount point for the surface under OBSERVE lens (additive prop/route only) | Everything else unchanged |

`src/engine/formationintegrity.js` and `src/engine/metricsengine.js`: **not touched, not read.**
Dropped from the input contract now that §6 resolves on `confirmationVelocity()`'s own `confidence`
field — removes both the naming collision (§3) and the query-vs-ambient scoping mismatch in one
move. `computeMetrics()`'s groundedness stays exactly what it already is: the per-query metric on
Target Packet / Action Plan / HP panel, untouched by this WO.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — makes groundedness/confirmation legible as a surface instead of only a backend number |
| Does this have a single dominant output? | YES — the rendered surface (gradient + cross points, bound together per §1) |
| Are all boundaries explicitly defined? | YES — see §2 |
| Can this be built without touching an undefined dependency? | YES — single input (`confirmationVelocity()`), already real code, formula fully specified in §6 |
| Does this avoid increasing expressive flexibility in the core? | YES — no core detection/scoring logic added, display-only |

**Verdict: PASS**

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** Preserves existing invariants — `confirmationVelocity()` is
consumed read-only, unmodified. One new dependency: `conemap.jsx` gains a new formation state
(cone rotation to expose the base surface), versioned as additive per §2/§7, not a change to the
existing `topoMode` contract.

**2. Semantic Consistency (SC):** "Groundedness Gradient" reuses §18's existing term rather than
coining a new one (resolves the `formationintegrity.js` "Integrity" collision by naming, §3).
GROUNDED/PARTIAL/ASSUMED band labels are new names for confidence tiers that did not previously
have display-facing labels — the underlying cut points (0.70/0.40) are not new, only their names
as bands are.

**3. Execution Containment (EC):** Declarative rendering only. `conemap.jsx`'s formation-state
addition is the one runtime side effect, bounded to that file, same pattern as existing `topoMode`
lerp — no cross-module mutation.

**4. Drift Exposure (DE):** Static — band cut points are fixed constants inherited from §18, not
a living/tunable definition. No ambiguity introduced over time.

**Outcome tag: PASS**

---

## 10. DEFINITION OF DONE

**Verification:**
1. `grep -n "confidence: clamp01" src/engine/confirmationvelocity.js` still resolves — confirms
   the band-driving field hasn't been renamed out from under this spec.
2. New surface component renders three visually distinct bands (GROUNDEDNESS colors matching §18:
   green >0.70, amber 0.40–0.70, red <0.40) with at least one Cross Point plotted when a real
   `confirmationVelocity()` result has `withheld: false`.
3. Visual check: `conemap.jsx`'s 6 domain cones are confirmed unchanged in height/radius/geometry
   when the surface is NOT active (diff against pre-WO baseline) — the WO-2076/2077 boundary held.
4. `grep -rn "formationintegrity" src/components/` returns nothing — confirms no accidental
   dependency was pulled in from the file this WO deliberately excluded.

---

## NOTES

**Standing terminology rule (Founder directive, applies to this spec and any future one built from
borrowed/external material):** "Perception" is used in place of "Prediction," always. Source
diagrams and external primitives will arrive with predictive framing built in — that framing is
swapped out for Perception before it enters KRYLO, never carried through as-is. "We are
Perception," not Prediction — this is the standing rule §6/§2's `timeArrow: 'RETROSPECTIVE'`
requirement is already enforcing in this spec.

Full lineage of how this was derived (2026-08-10 discussion), for whoever picks this up:

1. Started as a fix to the Formation Relationship Connector Layer showing only one line despite
   15/15 domain-pair taglines existing — root cause was `adaptDomainToFormation()` reading a dead
   signal pool (`domaingravity.js`), same bug class already fixed once for ObserveStoryBanner.
   **That bug is diagnosed but NOT yet fixed — still open, separate from this spec.**
2. Conversation moved to "why does one line imply exclusive convergence" → connectors should be
   an aggregate representation, physical characteristics (color/position/weight/blink) driven by
   activity volume, not a binary link.
3. Landed on Integrity = Signal ÷ Noise as the thing worth ranking a top-10 connector list by —
   not exhaustive, not exclusive; the PROCESS is ranking, the PRODUCT is an integrity read.
4. Noise mapped to real existing mechanics: TURBULENT CONVERGENCE (§6), non-orthogonal duplicate
   signals (§23), absence miscoded as zero (§22). Attenuation mapped to real existing mechanics:
   `attenuateSecondary()`, `STALENESS_BOUND_MS`, the system's floor constants (§18/§19 engines).
5. Two external diagrams (futures-cone, options P&L probability curve) contributed SHAPE only —
   nested/narrowing bands, and "Cross Points" as a boundary-crossing marker — explicitly stripped
   of their predictive framing (§11a) before being reused. Futures-cone source:
   https://www.whitespace.ch/insights/futures-cone-workshop-template/ — a foresight/scenario-
   planning workshop tool whose stated purpose is prescriptive ("take action to create the futures
   we prefer and avoid the undesired ones"). That purpose is explicitly NOT what KRYLO is taking
   from it — only the nested/narrowing band geometry, remapped from a time axis to a groundedness
   axis (§18), is reused.
6. Landed on: this is not a modification to the existing domain cones, it's its own surface, for
   the OBSERVE lens, showing a groundedness gradient (§18) with Cross Points re-derived as
   confirmation events (§11a-legal, retrospective) rather than price/date targets — which pointed
   directly at the already-real, already-scoped KRYL-1018 (`confirmationvelocity.js`).
7. Repeated principle throughout: KRYLO reports structural conditions as they are (Google Earth
   analogy — maps bad neighborhoods too, §20); what a consumer derives from that (their own
   modeling, "repeaters/boosters") is downstream and not KRYLO's concern, same as
   engine-detects/interface-sells.
