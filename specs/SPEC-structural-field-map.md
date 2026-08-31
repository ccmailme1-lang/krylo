# SPEC — Structural Field Map

**Status:** DRAFT — Build Candidate (Founder-authored + advisor-tightened, 2026-08-31).
Recorded, not originated. Two contract-level edits applied per Founder ruling
(pipeline order; single canonical cyclic order).
**Surface:** North-South Simulation Panel (`analysisidlefield.jsx`)
**Replacement:** Section "3. FORENSIC MATRIX FIELDS (SLAB INTERSECT)"
**Principle:** Same data, different perceptual model. Pure downstream visualization.

---

## 1. PROBLEM

The six independent numeric values encourage scalar comparison and sever the field
from the Intent × Horizon frame. The replacement is a pure visual change.

## 2. CONTRACT

- Name: **3. STRUCTURAL FIELD** · optional supporting: `SIX-DOMAIN OBSERVABLE FIELD`
- The existing six-domain field values (from `activeCones` — parent domain-pressure
  state) remain the sole authoritative input.
- No new metrics, recommendations, formation, evidence alteration, confidence
  changes, or manufactured data.
- Visualization is strictly downstream of existing field state.

## 3. VISUAL MODEL (mathematical definition)

Ordered domain set `D = {CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA}`.

Fixed polar angle per domain `θ_i ∈ [0, 2π)`:

| domain | θ |
|---|---|
| CAPITAL | 0 |
| TECHNOLOGY | π/3 |
| KNOWLEDGE | 2π/3 |
| OWNERSHIP | π |
| MEDIA | 4π/3 |
| LABOR | 5π/3 |

A global rotation constant may be applied for visual balance; **relative ordering
and angular spacing are invariant across all targets and sessions.**

Field intensity `v_i ∈ [0,100] ∪ {∅}`.

Radial extent (valid values only), affine — no non-linear scaling, no cross-domain
normalization, no ranking:

```
r_i = R_min + α · (v_i / 100),   α = R_max − R_min,   R_min > 0
```

Field polygon = the closed polygonal chain with vertices
`p_i = (r_i·cos θ_i, r_i·sin θ_i)`.

**Canonical polygon order (LOCKED):** the fixed domain order defined by the
authoritative angular assignment above — CAPITAL → TECHNOLOGY → KNOWLEDGE →
OWNERSHIP → MEDIA → LABOR → (close). **No alternate ordering is permitted.**

The filled region / stroked outline of this polygon is the primary visual object
"STRUCTURAL FIELD". Numeric values are secondary annotations / tooltips only.

## 4. DOMAIN POSITIONS

Fixed angular assignment is authoritative. No magnitude-based reordering, no dynamic
sorting, no force-directed layout. "Angle θ = TECHNOLOGY" is learned once and
permanent.

## 5. MAGNITUDE

`r_i` is controlled solely by `v_i`. The geometry inherits every relative
distinction in the input vector (LABOR = 88 → a visibly larger spike than any
60-valued domain). The field is context only; never the subject's answer.

## 6. SEMANTIC LANGUAGE

Allowed: FIELD, FIELD INTENSITY, STRUCTURAL FIELD, DOMAIN SIGNAL, FIELD PRESSURE.
Forbidden: risk, opportunity, probability, confidence, recommendation, strength,
attractiveness, predicted outcome, "higher = better", etc.

## 7. MISSING / ABSENT DATA (strict)

`v_i = ∅` (unavailable / classified absence):

- Retain the domain's angular position `θ_i`.
- Render a distinct absence glyph at a fixed intermediate radius `R_absent` (or a
  dashed radial spoke + open marker) — visually distinguishable from both `r = 0`
  and any valid `r_i`.
- Do **not** set `r_i = 0`; do **not** collapse the vertex toward the origin.
- The polygon edge that would have used `p_i` is omitted / dashed / replaced by an
  absence arc per the existing absence representation contract.

All six `∅` → the six angular positions + the central field marker stay visible: an
unresolved six-spoke scaffold, not an empty or broken chart.

**Invariant:** `v_i = ∅  ≢  v_i = 0`.

## 8–11. INTENT × HORIZON × SCOPE

- Intent Strength `θ` and Horizon `t + Δ` are pure observation-frame parameters.
  They never scale, inflate, or interpolate the six `v_i`.
- Horizon may replace the entire vector `v` **only when the existing simulation
  state already supplies horizon-specific values**; otherwise the field is static
  and optionally annotated "not horizon-resolved".
- Scope (LIVE / HISTORICAL / FORECAST WINDOW) selects among already-existing field
  states; no synthesis occurs.

## 12. INTERACTION

Read-first. Hover / focus on domain `i` surfaces the existing payload:

```
DOMAIN NAME
FIELD INTENSITY   v_i   (or "DATA UNAVAILABLE")
SCOPE             current scope
FIELD SCOPE       Context only
```

Selection may emphasize the corresponding radial spoke / vertex. No vertex
dragging, no editing of reality.

## 13. VISUAL HIERARCHY

STRUCTURAL FIELD receives substantially more panel real-estate than the former
six-row matrix. Order and relative area allocation otherwise unchanged.

## 14–16. DESIGN OBJECTIVE / EPISTEMIC INVARIANT / IMPLEMENTATION BOUNDARY

The component answers only: **"What is the current observable field representation
under this frame and scope?"** — never investment, recommendation, or formation
questions.

Pipeline (LOCKED, corrected order):

```
USER FRAME
→ FRAME CLASSIFICATION
→ FRAME ANCHORING
→ SUBJECT RESOLUTION
→ OBSERVATION
→ EVIDENCE
→ RELATIONSHIP ADMISSION
→ FORMATION
```

The Structural Field is downstream of the already-produced observation/field state.
It is never an alternate path to evidence or formation.

## 17. ACCEPTANCE CRITERIA

All original ACs plus:

- **AC-13** — Angular positions are constant functions of domain identity only.
- **AC-14** — Radial map is strictly affine in `v_i` for valid values; never applied
  to `∅`.
- **AC-15** — Polygon vertices are exactly `{p_i}` (or the absence glyphs), in the
  single canonical cyclic order.
- **AC-16** — Changing Intent or Horizon never alters any `v_i` unless the upstream
  simulation already supplies a different vector.

## 18. LABEL

**3. STRUCTURAL FIELD** — supporting: `SIX-DOMAIN OBSERVABLE FIELD`

## 19. SUCCESS CONDITION

The user perceives the *shape* of the field around the current projection, not six
independent scores.

---

## Visual transform

```
v = (v_1,…,v_6)  ↦  { p_i = r(v_i) · (cos θ_i, sin θ_i) }_{i=1..6}
```

`θ_i` fixed · `r(·)` affine for valid intensities · distinct non-zero treatment for
`∅` · one canonical cyclic order.

Same data. Same epistemic boundary. Strictly geometric representation.
