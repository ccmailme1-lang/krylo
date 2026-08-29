# Domain Substrate — Integration Contract

**Status:** ACCUMULATING — ratified decisions only
**Version:** 0.1
**Parent:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 (FROZEN)
**Purpose:** hold the integration-phase decisions and acceptance criteria as they
are ratified, so the frozen architecture spec is not reopened for each one.
**Build authorization:** NONE. Integration remains gated behind
`{T1, T2, T3} ≺ integration` (frozen spec §21). This document records what
integration must satisfy *when* it is authorized.

---

## Underlying invariant

> **Same primitive. Different scope. No re-teaching. No premature synthesis.**

---

## D1 — Packet spine is per-domain tabs (RATIFIED 2026-08-29)

The Target Packet `01 ANALYSIS` spine is the **per-domain projection**, not a
cross-domain read.

```
TARGET PACKET  (Subject = searched subject)

01 ANALYSIS
  [CAPITAL] [OWNERSHIP] [TECHNOLOGY] [KNOWLEDGE] [LABOR] [MEDIA]
      │ selected tab
      └── π_d( I_d , Subject , Evidence )
            ├── OBSERVES
            ├── SIGNALS
            ├── RELATIONSHIPS
            ├── CONDITIONS
            ├── UNRESOLVED
            └── SHARPEN

02 FORMATION
      └── F( π₁ … π₆ )
```

Each tab renders its domain's `I_d` fields as the vertical scroll. The panels
**are** the `I_d` fields — no panel exists that is not an `I_d` field. The retired
report categories (`STAKE / MOVE / WINDOW / LEVERAGE FIELD`) do not return in any
form.

## D2 — Domain-observed relationships ≠ Formation (RATIFIED 2026-08-29)

A domain tab's `RELATIONSHIPS` panel may expose the cross-domain relationships
that `I_d.relationships` admits (e.g. CAPITAL → `Capital ↔ Ownership`,
`Capital ↔ Technology`). **A relationship observed by a domain lens is not
Formation.**

Cross-domain **synthesis** — "across the six projections, what structural
formation is supported?" — remains deferred to `F` (frozen spec §14, §15).

Clean boundary:

```
Lens primitive I_d
      ↓
Domain projection π_d
      ↓
Subject-scoped observation
      ↓
Six observation sets
      ↓
Formation F
```

NOT: `Lens → cross-domain interpretation → six tabs → Formation` (the leakage
this rule closes).

## D3 — Field-signal navigation hint (RATIFIED 2026-08-29)

A small orientation hint MAY sit above the tabs:

```
CURRENT FIELD SIGNAL
Ownership + Capital currently carry the strongest relevant signal.
```

It orients the user toward where salience is concentrated. It **MUST NOT** become
a synthesized analytical panel, carry an interpretation, or pre-empt Formation.
Field-scope salience only; no cross-domain claim.

---

## Acceptance Criteria (integration ticket)

### AC — Lens Primitive Reuse

Given the canonical `I_d` definition, when domain `d` is rendered at Surface scope
and Target Packet scope, then both executions MUST consume the **same immutable
`I_d` primitive**.

- The Target Packet MAY bind `Subject`, resolve subject-relevant evidence, and
  render the resulting projection.
- The Target Packet MUST NOT modify, duplicate, specialize, or independently
  define `I_d`.
- The Target Packet's `RELATIONSHIPS` panel MAY expose relationships admitted by
  `I_d`; cross-domain **synthesis** of those observations MUST remain deferred to
  Formation.

**Pass:** identical `I_d` produces both scopes with only scope/evidence/context
changing.
**Fail:** packet-specific domain logic, duplicated lens definitions, altered
observation rules, packet-specific analytical primitives.

### AC — No subject-derived lens (RATIFIED 2026-08-29)

Given a **resolvable subject** (an entity: a company, instrument, deal, person —
`SPEC-subject-scoping-contract.md` ENTITY path), the packet MUST invoke the six
existing `I_d` primitives with that subject **bound as the subject**. It MUST NOT:

- mint a lens / anchor / domain from the subject string (e.g. "IS ANDURIL LENS",
  "IS ANDURIL" anchor — the current pseudo-lens defect);
- route to `GENERAL` because the *question* is broad.

**Load-bearing distinction:** a question that is *insufficient for a decision
conclusion* is not *insufficient for observing the subject through the six
domains*. "Is Anduril a good acquisition target?" → subject = **Anduril** (ERK-
resolvable) → run `A(d, Anduril)` for all six d. The decision conclusion may
remain unscored; the six domain observations are still owed.

**Validation target (for when integration opens):**
> Query "Is Anduril a good acquisition target?" produces six domain scrolls —
> `A(CAPITAL, Anduril)` … `A(MEDIA, Anduril)` — each showing `I_d` fields scoped to
> Anduril, then Formation `F(π₁…π₆)`. **Zero** occurrences of: STAKE / MOVE /
> WINDOW / LEVERAGE FIELD, a `GENERAL` domain, an "ANDURIL"-derived lens or anchor,
> "select your situation type", "add a capital floor", generic specificity advice,
> or CAC / ROAS / LTV.

Sits beside AC — Lens Primitive Reuse (Q8): same primitive, subject bound, no
invention.

### AC — Panel/field correspondence

Every packet domain-tab panel maps 1:1 to an `I_d` field. No panel without a
backing field; no rendered value without `prov(m)` (frozen spec §16) or a
classified `absenceClass` (§17).

### AC — Formation position

`F` executes only after all six `A(d, Subject)` projections exist. No packet
surface above `02 FORMATION` performs cross-domain synthesis.

---

## Open (not yet ratified)

- Which `I_d` fields render in the packet scroll vs. inspection-only (the frozen
  spec lists nine + two; the D1 scroll shows six — OBSERVES / SIGNALS /
  RELATIONSHIPS / CONDITIONS / UNRESOLVED / SHARPEN. `tensionPatterns`,
  `missingDimensions`, `evidenceAttribution`, `structuralVariableBoundary`
  placement TBD).
- Subject-scoping: the entity vs. decision-frame split
  (`SPEC-subject-scoping-contract.md`) — decision-frame subjects route to
  classified absence until unit-of-analysis is settled.
- `I_d.relationships` scope (cross-domain admission set only, or also
  intra-domain) — CAPITAL F6, pending.
