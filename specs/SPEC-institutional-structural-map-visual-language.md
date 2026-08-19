# SPEC — Institutional Structural Map: Visual Language
Date: 2026-08-18
Status: DESIGN CONCEPT. Governs the visual language of a standalone institutional analytical
surface — not a Krylo funnel screen, not a ConeMap replacement. No Hero, no Signal Map, no
Oracle, no Ground Level. Built on the same underlying machinery (RelationCore, the Relationship
Validator, CanonicalEvent) but its own product surface entirely.

Design work here proceeds against synthetic/fixture data, explicitly marked as conceptual —
this document does not claim KRYLO has detected any real structure. The eventual real
`ValidationProfile` output becomes the source of the geometry later; the visual language is
being defined now so the product shape exists ahead of that.

---

## 1. Core thesis

Not organic structural visualization. **Computational structural cartography.**

The final map should look institutional and exact, not like an ambient visualization of a
process in motion. Not *"something is floating into existence"* — instead:

> **"The system has resolved a structure, and I can inspect exactly how it was resolved."**

## 2. The duality: scatter vs. structural geometry

- **Scatter = measurement space.** Raw observations, positioned by whatever dimensions are
  statistically meaningful. This is real, unresolved data.
- **Structural geometry = resolved interpretation.** Validated relationships, formations,
  boundaries — the output of the machinery having actually decided something.

The institutional map is the layer where the two meet — not a choice between a conventional
scatterplot and an organic relationship map, but both, in sequence, in the same visual field.

## 3. Visual primitive for structural resolution

Not a fixed semantic rule (e.g. "lower-right cluster always means X") — a vocabulary of what
each visual property is allowed to represent:

| Visual property | Represents |
|---|---|
| Individual points | Observations |
| Concentration | Statistical significance |
| Centroid | Locus |
| Dispersion | Coherence / uncertainty |
| Trajectory | Temporal behavior |
| Boundary | Resolved structural extent |
| Connecting geometry | Validated relationship |
| Combined clusters | Higher-order formation |

Progression (conceptual — the interface does not need to literally display each stage as a
separate screen; the geometry embodies the progression):

```
       observations
    ·     ·   ·
       · · ·
          ↓
      · · · ·
    · · · · · ·
     · · · · ·
        · ·
          ↓
     [resolved region]
          ↓
     INPUT COST
       │
       ├───────────────┐
       │               │
   relationship     relationship
       │               │
       ▼               ▼
 WAGE PRESSURE    PRICING PRESSURE
          ↓
   PRODUCTION COST
       PRESSURE
```

## 4. The institutional test — applies to every visual element

Every visual object must answer: **what computation or structural fact does this represent?**

- If the answer is "it makes the interface feel alive" → remove it.
- If the answer is one of: density, contribution, confidence, temporal change, validated
  relationship, recurrence, structural boundary, provenance, uncertainty → it has a reason to
  exist.

No decorative motion, no ambient effects, no organic/floating affordances that don't map to a
real computed property. This is the same discipline as the Relationship Validator's own
prohibition on fabricated confidence — applied to pixels instead of data fields.

## 5. Explicit scope of this design pass

- This is a visual-language exercise against synthetic/fixture distributions, clearly marked as
  conceptual data — not a claim that KRYLO has detected "Production Cost Pressure" or any other
  real formation.
- The question being answered is: **"When the machinery eventually detects a formation, what
  should an institutional-grade representation of that validated structure look like?"** — not
  "does the machinery detect this today."
- Wiring this visual language to real `ValidationProfile` output is a separate, later step,
  gated on the Relationship Validator's operators actually producing real results (Phase 2/3 of
  `SPEC-relationship-validator-implementation-wo.md`).
- No claim is made here about which specific formations, domains, or relationships this surface
  will visualize first — that is a product decision, not a visual-language decision.

## 6. Explicitly out of scope

- Not a ConeMap replacement, not a Krylo funnel screen — see header.
- No wiring to live data in this pass.
- No component/file implementation — this is the visual-language contract a future build would
  target, same status tier as the Relationship Validator's contract documents before Phase 1.
