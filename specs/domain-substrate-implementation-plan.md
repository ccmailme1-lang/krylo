# Domain Substrate — Implementation-Fidelity Plan

**Status:** FROZEN — Founder plan (2026-08-29). Recorded, not originated.
The **governing posture from here**: *we are no longer designing the ontology; we
are testing whether the system can faithfully instantiate it.*
**Precondition met:** Track #3 ontology consistency **CLOSED** (`6c3498b`,
`domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` v1.0).
**Gate:** nothing here is build-authorized. Sequencing + exit criteria only.

---

## Governing invariant (both directions)

> **The ontology defines what may be observed and related; implementation cannot
> broaden it implicitly.**

- A connector cannot manufacture a second domain observation by relabeling the
  same number. (integration-contract AC — Shared-source distinct facet)
- `F` cannot manufacture a relationship type because the evidence makes a
  compelling story. (integration-contract AC — Closed relationship admission set)

The previously-floated implementation WOs (WO-B / WO-C) are **not created** —
their architectural work is done by `6c3498b`.

---

## Canonical state

```
TRACK #3 — Domain ontology consistency ......... CLOSED
  six I_d boundaries ......................... CLOSED
  concentration orthogonality ............... CLOSED
  dimension / edge rule .................... CLOSED  (general, authoring-spec §2.1)
  relationship vocabulary ................. CLOSED  (15 types)
  cross-domain attribution .............. CLOSED

IMPLEMENTATION FIDELITY
  signal authorship ..................... OPEN
  signal measurement ................... OPEN
  shared-source facets ................ OPEN
  relationship admission ............ OPEN
  integration ..................... GATED
```

---

## WO-1 — Signal Authorship & Measurement

Resolve every `UNAUTHORED` `signals` field across the six `I_d`, plus the
remaining per-field `AUTHORED` promotions.

- **Authorship half (Founder-side):** for each signal — its definition, the
  structural variable it measures, and — for the six concentration variables —
  the measure itself (top-holder share / HHI-style / defined). This is analytical
  content; engineering cannot start it cold.
- **Measurement half (engineering):** measurement method, unit/scale, 0–100
  normalization (§12 ingestion contract), provenance, attribution.

**Exit:** every signal the substrate uses has an authored definition, measurement
method, normalization, provenance, and single-axis attribution. Until then the
Data Substrate renders classified absence for that field.

## WO-2 — Shared-Source Facet Integrity

Implement + test the distinct-facet dispatch:

| connector | domains | distinct facet per domain |
|---|---|---|
| `patentsviewconnector.js` | TECH / OWN / CAP | capability-cluster velocity · assignee concentration · R&D-intensity proxy |
| `censusconnector.js` | LAB / OWN | workforce/establishment counts · establishment ownership |
| `fecconnector.js` | CAP / MEDIA | actual capital flow · ad-spend-as-attention-pressure |

**Exit:** each domain receives a genuinely distinct facet; an identical-payload
relabel **fails acceptance**.

## WO-3 — Closed Relationship Admission

Bind `F` to the ratified **15-type** cross-domain relationship vocabulary
(`CROSS-DOMAIN-CONSISTENCY.md` §4a).

**Exit:** admitted types work; an unadmitted relationship cannot enter Formation.

## WO-4 — Commercial Entry / Subject Funnel

Translate the frozen commercial model
(`PROBLEM-STATEMENT-and-commercial-funnel.md`) into the entry path:
`buyer problem → buyer question → subject → investigation`, replacing
`choose a domain → inspect visualization`.

**Integration disposition, not an architectural redesign.** Retires the
`CHOOSE A DOMAIN` control.

## WO-5 — Target Packet Micro-Lens

Verify the packet implements the ratified model — `I_d → A(d, Subject) →`
[OBSERVES · SIGNAL · RELATIONSHIP · RELEVANCE · UNRESOLVED · SHARPEN] scroll per
domain tab, then `F`.

**Exit:** no second analysis engine; no generic packet template
(STAKE/MOVE/WINDOW/LEVERAGE FIELD) replacing lens intelligence; panel↔field 1:1
(integration-contract AC); `I_d` identical at Field and Subject scope (Q8).

## WO-6 — End-to-End Closure Gate

One real investigation demonstrates the full chain with the frozen contracts
enforced throughout:

```
Buyer Question → Subject → I_d → A(d, Subject) → Evidence
→ Admitted Relationships → F → Formation → Inspection
```

The **Anduril fixture** (`SPEC-domain-substrate-integration-contract.md`) is the
concrete test.

**Exit = the meaningful definition of "done."**

---

## Sequencing

```
WO-1 (authorship half)  ─┐
WO-1 (measurement) ──────┼─→ WO-2 ─┐
WO-3 ───────────────────┘          ├─→ WO-5 ─→ WO-6
WO-4 ─────────────────────────────┘
```

- WO-1 authorship (Founder) and WO-2 / WO-3 (engineering, once WO-1 authored) can
  run in parallel.
- WO-4 (entry funnel) is independent until WO-5.
- WO-5 requires WO-1 + WO-2 + WO-3.
- WO-6 is the gate; it requires all of WO-1…WO-5.
- Integration stays gated until WO-1 authorship + WO-2 + WO-3 are done.

Jira numbering is the sole authority — these are the plan, not tickets. File in
KRYL when work is authorized.
