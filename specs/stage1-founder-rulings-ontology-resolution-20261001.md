# Stage 1 — Founder Rulings: Ontology Resolution (2026-10-01)

Resolves the three open Founder decisions named in `specs/stage1-adapt-relational-substrate-20261001.md`'s
consolidated list. Does not amend `specs/SPEC-relational-substrate-stage1-baseline.md` itself — that
document stays frozen verbatim, per the explicit instruction when it was ratified. This is the
decision record the baseline's own open points required, kept as a separate artifact.

---

## Ruling 1 — `φ_class` is declared by the ratified relationship type

- No runtime inference from evidence content.
- No evidence-dependent class switching once a type is declared.
- Admission enforces the type's declared class; a candidate relationship whose evidence doesn't
  match its type's declared class is not admitted under that type.

Resolves baseline §2's open point (no `φ_class` field existed on RelationCore; class was only
implicit per producer) and Adapt §B's first open question.

## Ruling 2 — `eta`, `phi0`, and `structuralSupport` are retired from canonical `ρ`

- They are legacy RelationCore fields, not part of `ρ = (id, part, type, φ_class, ν)`.
- Existing values may be preserved as migration material (per Adapt's "preservable without semantic
  transformation" / "requires canonical transformation" categories — specifically, these three
  fields' *values* remain in the "cannot enter the canonical substrate as currently represented"
  category, confirmed placeholder in 2 of 3 producers) — preserved as historical record, not
  promoted as real quantities.
- They have no canonical meaning, now or by default.
- Any future quantitative relationship property must be explicitly type-bound through `ν` — defined
  by a specific ratified relationship type's own admission rule, never a generic cross-type scale.

Resolves Adapt §B's second open question. Confirms there are no generic relationship-strength
fields left anywhere in the substrate.

## Ruling 3 — KRYL-1334's `relationship_type` maps to canonical `ρ.type`

- It participates in same-ness (baseline §3): two observations with a different `relationship_type`
  are different relationships, not the same relationship in a different state.
- Mutable characteristics of an otherwise-same relationship belong in `ν_state`, never in `type`.
- `formation_id`'s current composite key (subject + fieldScope + formationScope + entityA + entityB
  + relationshipType) is confirmed consistent with this ruling — `relationshipType`'s presence in
  the identity key was already structurally correct; the ruling formalizes why.

Resolves Adapt §D's Founder decision, and the corresponding open item carried from Map/Validate.

---

## Consequence

`ρ`'s interpretation is now closed:

```text
ρ = (id, part, type, φ_class, ν)
```

`type` determines both identity semantics (via same-ness) and declared class (`φ_class`). `ν`
contains only properties explicitly authorized by that type — no generic strength, confidence, or
intensity field survives as a cross-type concept anywhere in the substrate.

## Status change

Stage 1 moves from **ontology resolution → formalization**. The Inventory/Map/Validate/Adapt chain
(`specs/stage1-inventory-...`, `specs/stage1-map-...`, `specs/stage1-validate-...`,
`specs/stage1-adapt-...`) remains the factual record those phases produced; nothing in them is
retroactively edited by these rulings. Two non-ontology items from Adapt remain open and
unaffected by this resolution: the KRYL-1334 legacy-rows retention policy, and the `event.topology`
factual validation (`resolveTopology()` inspection) — neither is an ontology question and neither
is resolved here.

No implementation taken. No code or schema produced. Formalization is the next authorized phase,
pending its own explicit go.
