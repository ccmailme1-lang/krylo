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

### AC — Subject anchors analysis, not the question (RATIFIED 2026-08-29)

**Question routing ≠ subject resolution.** The current packet uses the *question*
to determine the analytical object; the architecture resolves the *subject* first,
then analyzes the subject. The question is retained as context — it never
redefines the primitives.

Given a **resolvable subject** (an entity — company, instrument, deal, person;
`SPEC-subject-scoping-contract.md` ENTITY path), the packet MUST invoke the six
existing `I_d` primitives with that subject **bound**. It MUST NOT:

- mint a lens / anchor / domain from the subject string (e.g. `Lens: IS ANDURIL`,
  `Anchor: IS ANDURIL`, `IS ANDURIL LENS` — the current pseudo-lens defect);
- route to `GENERAL` because the *question* is broad;
- discard existing subject-relevant signals into a generic analysis.

**Load-bearing distinction:** *having enough information to **observe** the
subject* is not the same as *having enough to **answer** the question*. "Is
Anduril a good acquisition target?" → the substrate holds 178–186 observations,
all six domains populated (OWNERSHIP 29 sig, CAPITAL ~103, …) → it **can** observe
Anduril. The acquisition verdict may stay unscored; the six domain observations
are still owed. `"No domain anchor detected"` is architecturally misleading — the
question isn't domain-specific, the subject is.

### End-to-end acceptance fixture — "Is Anduril a good acquisition target?"

Run at the integration gate. Current vs. required:

| current behaviour (live, 2026-08-29) | required behaviour |
|---|---|
| `Domain: GENERAL` | Subject = **Anduril** (ERK-resolved) |
| `Lens: IS ANDURIL` | no subject-derived lens |
| Stake / Move / Window / Leverage Field | six domain micro-analyses — `A(CAPITAL, Anduril)` … `A(MEDIA, Anduril)`, each an `I_d`-field scroll |
| generic specificity warnings | domain observations + each domain's unresolved dimensions |
| existing signals discarded into generic analysis | signals bound to Anduril |
| `FORMATION SIGNAL ACTIVE` while `NODES 0` / `CONVERGENCE INSUFFICIENT` | Formation only after the six `A(d, Anduril)` sets exist, then `F(π₁…π₆)` |
| question determines the analytical system | question = context; subject anchors analysis |

**Zero** occurrences of: STAKE / MOVE / WINDOW / LEVERAGE FIELD, `GENERAL` domain,
subject-derived lens/anchor, "select your situation type", "add a capital floor",
generic specificity advice, CAC / ROAS / LTV.

Sits beside AC — Lens Primitive Reuse (Q8): same primitive, subject bound, no invention.

### AC — Panel/field correspondence

Every packet domain-tab panel maps 1:1 to an `I_d` field. No panel without a
backing field; no rendered value without `prov(m)` (frozen spec §16) or a
classified `absenceClass` (§17).

### AC — Formation position

`F` executes only after all six `A(d, Subject)` projections exist. No packet
surface above `02 FORMATION` performs cross-domain synthesis.

**Having signals across six domains is not itself a Formation.** The current
packet renders `FORMATION SIGNAL ACTIVE` while simultaneously reporting `NODES 0`
and `CONVERGENCE INSUFFICIENT` — a premature Formation claim. Required: no
Formation state (active / signal / integrity) is asserted until `F(π₁…π₆)` has
run over six existing observation sets; before that the packet says
`FORMATION — not yet established`.

### AC — Shared-source distinct facet (RATIFIED 2026-08-29)

Source: `domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` §1, §2.

Three connectors dispatch one signal to multiple domains:

| connector | domains | required distinct facet per domain |
|---|---|---|
| `patentsviewconnector.js` | TECHNOLOGY, OWNERSHIP, CAPITAL | capability-cluster velocity → TECH · assignee concentration → OWN · R&D-intensity proxy → CAP |
| `censusconnector.js` | LABOR, OWNERSHIP | workforce / establishment counts → LAB · establishment ownership → OWN |
| `fecconnector.js` | CAPITAL, MEDIA | actual capital flow → CAP · ad-spend-as-attention-pressure → MED |

**Each domain must receive a demonstrably distinct facet** — not the same number
re-labelled. A connector that dispatches an identical `signal` value to two
domains fails this AC. Extends frozen spec §18 (a concentration reading from
source S is attributed to exactly one axis).

### AC — Closed relationship admission set

`F` admits only the **15 cross-domain relationship types** in
`domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` §4a. `F` may infer from admitted
relationships; it may not create an unadmitted relationship type because the
evidence looks narratively compelling.

---

## Open (not yet ratified)

- Which `I_d` fields render in the packet scroll vs. inspection-only (the D1
  scroll shows six — OBSERVES / SIGNALS / RELATIONSHIPS / CONDITIONS / UNRESOLVED
  / SHARPEN; `tensionPatterns`, `missingDimensions`, `evidenceAttribution`,
  `structuralVariableBoundary`, the new `relationships` edge-attributes —
  placement TBD).
- Subject-scoping: the entity vs. decision-frame split
  (`SPEC-subject-scoping-contract.md`) — decision-frame subjects route to
  classified absence until unit-of-analysis is settled.
- Per-field `AUTHORED` promotions on the five drafted `I_d` (Founder-side).
- Every `signals` field is `UNAUTHORED` (concentration + edge-aggregate measures
  undefined) — nothing renders until authored.
