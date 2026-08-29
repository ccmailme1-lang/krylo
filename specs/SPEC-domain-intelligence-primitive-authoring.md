# KRYLO Domain Intelligence Primitive — Authoring & Ratification Specification

**Status:** DRAFT — authoring not started
**Version:** 0.1
**Depends on:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 (FROZEN)
**Scope:** the six `I_d` definitions. **This document is UI-free.**
**Build authorization:** NONE. This is analytical authoring, not implementation.

---

## 0. Governing rule

> **The UI does not decide what a domain means. The domain intelligence
> definition does.**

Once the six `I_d` are ratified, the Data Substrate becomes a **rendering
problem**, not another round of analytical invention. Until then, the generic
placeholders (`queryContext.unresolved`, KRYL-1222 chips) stand in, explicitly
marked as provisional.

Nothing in this document is model-generated. Every field is either:

- **authored by the Founder / a designated analyst**, or
- **`UNAUTHORED`** — rendered as classified absence, never faked.

A single captured hypothesis (CAPITAL, §5.1) is carried forward from
`specs/redesign raw spec` and is explicitly marked `UNRATIFIED HYPOTHESIS` so it
is not lost and not laundered into fact.

---

## 1. Purpose

For each `d ∈ 𝒟 = { CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA }`,
answer eleven questions:

| # | question | `I_d` field |
|---|---|---|
| 1 | What does the domain observe? | `observes` |
| 2 | What signals does it measure? | `signals` |
| 3 | What structural dimensions does it contain? | `structuralDimensions` |
| 4 | What relationships does it admit? | `relationships` |
| 5 | What conditions make an observation relevant? | `relevanceConditions` |
| 6 | What constitutes tension / divergence? | `tensionPatterns` |
| 7 | What dimensions are genuinely missing? | `missingDimensions` |
| 8 | What inputs would sharpen the observation? | `sharpeningInputs` |
| 9 | What evidence supports each observation class? | `evidenceAttribution` |
| 10 | Which elements are AUTHORED / PARTIAL / UNAUTHORED? | `maturity` |
| 11 | Which structural variables belong **uniquely** to this domain vs. **legitimately overlap** another? | `structuralVariableBoundary` |

Answering 1–11 for all six domains is the exit condition of this spec.

---

## 2. `I_d` schema

```
I_d = {
  domain:                     one of 𝒟

  observes:                   [ observationClass ]        // Q1
  signals:                    [ signalDefinition ]        // Q2
  structuralDimensions:       [ dimension ]               // Q3  (ordered if the domain has a natural progression)
  relationships:              [ relationshipType ]        // Q4  (what F may admit from this domain)
  relevanceConditions:        [ condition ]               // Q5  (when an observation counts vs. is out of scope)
  tensionPatterns:            [ tensionPattern ]          // Q6  (constructive vs. fracture, per §16 polarity)
  missingDimensions:          [ dimension ]               // Q7  (genuine gaps — not "not yet built")
  sharpeningInputs:           [ input ]                   // Q8  (what the user could add to reduce ambiguity)

  evidenceAttribution:        { observationClass -> [ source ] }   // Q9
  structuralVariableBoundary: {                                    // Q11
    unique:   [ structuralVariable ],
    overlaps: { otherDomain -> [ sharedStructuralVariable ] }
  }

  maturity: { <field>: AUTHORED | PARTIAL | UNAUTHORED }           // Q10
}
```

### 2.1 Definitions

- **observationClass** — a category of thing the domain can observe about a subject
  (not a value; the *kind* of observation).
- **signalDefinition** — how a measurable quantity for an observationClass is
  derived. Must state its unit/scale and that it normalizes to 0–100 before
  dispatch (§12 Signal Ingestion contract).
- **dimension** — a structural property along which the domain resolves (e.g. a
  concentration axis, a commitment axis). Ordered only if the domain genuinely has
  a progression.
  **Dimension-vs-edge rule (RATIFIED 2026-08-29, `domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` §3):**
  a candidate is a `structuralDimension` **only if it has a field/subject-level
  magnitude — and, where applicable, polarity — that is meaningful without naming
  a counterparty.** Otherwise it is a **relationship edge-property**: it lives in
  `relationships` as a typed-edge attribute, not in `structuralDimensions`. The
  domain MAY carry an *aggregate* of that edge-property as a `signal`. Net
  directional readings (flow, reallocation, diffusion rate, net migration) with
  polarity pass as dimensions; comparative-only quantities (dependency, transfer
  friction, information asymmetry) do not.
- **relationshipType** — a relation this domain can contribute to Formation.
  `F` admits **only** relationship types some `I_d` declares — the ratified closed
  set is the **15 cross-domain types** in `domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md`
  §4a. `F` may infer from admitted relationships; it may not invent an unadmitted
  type because the evidence looks narratively compelling.
- **condition** — a predicate on the subject/queryContext that makes an
  observationClass in-scope. Failing it → the observation is `absenceClass:
  structural` (out of scope), not `filtered` or `null`.
- **tensionPattern** — a named structural configuration that carries polarity
  (`constructive` | `fracture`, CLAUDE.md §16). Every pattern states which.
- **source** — a connector/feed identifier (FRED, EDGAR, PatentsView, SEC
  ownership, …) or an internal derived store.
- **structuralVariable** — the latent thing a signal is evidence *of*. Two
  domains may draw on the same `source` but must not attribute the same
  `structuralVariable` as independent support (architecture spec §18).

---

## 3. Maturity marks (Q10)

| mark | meaning | Data Substrate behaviour |
|---|---|---|
| `AUTHORED` | ratified content exists (§4) | may surface it |
| `PARTIAL` | some ratified content; remainder open | surface the ratified portion; mark the rest classified-absent |
| `UNAUTHORED` | no ratified content | render as classified absence; never fake |

A field's mark is set per **field**, not per domain. A domain can be `AUTHORED`
for `observes` and `UNAUTHORED` for `tensionPatterns`.

---

## 4. Ratification protocol

A field moves `UNAUTHORED → PARTIAL → AUTHORED` only when:

1. **Authored** — content written by the Founder or a designated analyst (not a
   model).
2. **Grounded** (CLAUDE.md §1) — each entry cites a precedent: a comparable already
   in the codebase, a named industry convention, or a specific external reference.
   "No precedent" → the entry is dropped or explicitly marked a hypothesis, never
   kept as a plausible guess.
3. **Bounded** — the field's entries do not silently expand what the domain can
   express beyond what its `evidenceAttribution` supports.
4. **Orthogonality-checked** (§6) — `structuralVariableBoundary` for this domain is
   filled and reconciled against the other five.
5. **Recorded** — the change is a commit with the ratifier named.

Until all four content fields that the Data Substrate reads
(`observes`, `signals`, `structuralDimensions`, `sharpeningInputs` at minimum)
are at least `PARTIAL` and ratified, that domain's tab shows only the §6-of-the-
architecture-spec triple `(signalIntensity, observationCount, polarity)`.

---

## 5. Per-domain templates

> All fields below are `UNAUTHORED` pending the authoring pass. The eleven
> questions are reproduced as prompts. Do not pre-fill.

### 5.1 CAPITAL

| field | content | maturity |
|---|---|---|
| observes | *Q1 — what structural activity does CAPITAL observe about a subject?* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* — **UNRATIFIED HYPOTHESIS** (source: `specs/redesign raw spec`): `dependency → concentration → commitment → flow → constraint`. Carried for reference only; not ratified; not renderable. | UNAUTHORED |
| relationships | *Q4 — what relationships may CAPITAL contribute to Formation?* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6 — with polarity* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9 — likely candidates: FRED, SEC ownership, EDGAR filings — to be confirmed* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique to CAPITAL vs. overlap with OWNERSHIP / LABOR* | UNAUTHORED |

### 5.2 OWNERSHIP

| field | content | maturity |
|---|---|---|
| observes | *Q1* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* | UNAUTHORED |
| relationships | *Q4* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique vs. overlap with CAPITAL* | UNAUTHORED |

### 5.3 TECHNOLOGY

| field | content | maturity |
|---|---|---|
| observes | *Q1* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* | UNAUTHORED |
| relationships | *Q4* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9 — likely candidate: PatentsView — to be confirmed* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique vs. overlap with KNOWLEDGE* | UNAUTHORED |

### 5.4 KNOWLEDGE

| field | content | maturity |
|---|---|---|
| observes | *Q1* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* | UNAUTHORED |
| relationships | *Q4* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique vs. overlap with TECHNOLOGY / LABOR* | UNAUTHORED |

### 5.5 LABOR

| field | content | maturity |
|---|---|---|
| observes | *Q1* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* | UNAUTHORED |
| relationships | *Q4* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique vs. overlap with CAPITAL / KNOWLEDGE* | UNAUTHORED |

### 5.6 MEDIA

| field | content | maturity |
|---|---|---|
| observes | *Q1* | UNAUTHORED |
| signals | *Q2* | UNAUTHORED |
| structuralDimensions | *Q3* | UNAUTHORED |
| relationships | *Q4* | UNAUTHORED |
| relevanceConditions | *Q5* | UNAUTHORED |
| tensionPatterns | *Q6* | UNAUTHORED |
| missingDimensions | *Q7* | UNAUTHORED |
| sharpeningInputs | *Q8* | UNAUTHORED |
| evidenceAttribution | *Q9* | UNAUTHORED |
| structuralVariableBoundary | *Q11 — unique vs. overlap with OWNERSHIP* | UNAUTHORED |

---

## 6. Cross-domain structural-variable boundary matrix (Q11, all six)

**FILLED & RATIFIED** — `domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` v1.0
(2026-08-29). All 15 pairs → **Separate + attribute-once**; zero Fully Dependent;
all Partially Dependent (SPEC II §3: observational cuts through one world). Six
concentration latent variables demonstrated distinct (measured over different
populations, none a function of another). Rule: shared **evidence sources**
allowed; shared **structural-variable attribution as independent support** not
(architecture spec §18) — enforced at integration by the shared-source distinct-
facet AC.

---

## 7. Relationship to `F`

`F` admits a relationship only if some `I_d.relationships` declares it. The union
`⋃_d I_d.relationships` is **CLOSED at the 15 cross-domain relationship types**
in `domain-intelligence/CROSS-DOMAIN-CONSISTENCY.md` §4a (RATIFIED 2026-08-29).
Intra-domain relationship structures stay inside `A(d, Subject)` (§4b);
regulatory/jurisdictional context is a relationship *condition*, not a node (§4c).
`F` may infer from admitted relationships; it may not invent an unadmitted type
because the evidence looks narratively compelling.

---

## 8. Exit criteria

| # | criterion | state |
|---|---|---|
| 1 | All 11 questions answered for all 6 domains, ≥ `PARTIAL` for the Data-Substrate-read fields | **MET** — CAPITAL ratified; 5 drafted |
| 2 | §6 boundary matrix filled; every dependent pair has a recorded action | **MET** — CROSS-DOMAIN-CONSISTENCY v1.0, RATIFIED |
| 3 | `⋃_d I_d.relationships` enumerated + closed | **MET** — 15 types, RATIFIED |
| 4 | The dimension-vs-edge rule applied consistently | **MET** — general rule (§2.1); TECH/KNOW/MEDIA edited |
| 5 | Each `AUTHORED`/`PARTIAL` entry carries a cited precedent (§4.2) | **MET** — all trace to SPEC II §§5–10 (LOCKED) |
| 6 | Per-field `AUTHORED` promotions on the 5 drafted `I_d` | **OPEN** — Founder-side |
| 7 | Every `signals` field has a defined measure | **OPEN** — all `UNAUTHORED`; concentration + edge-aggregate measures undefined |
| 8 | A ratification commit per domain, ratifier named | CAPITAL done; 5 pending |

**Ontology & admission architecture: CLOSED.** **Signal measurement: OPEN.**
Nothing renders until §7 (signals) is closed. Integration remains gated.

On completion, the Data Substrate is a rendering problem: it reads `I_d` +
`A(d, s, subject)` and displays; it invents nothing.

---

## 9. Non-goals

- No UI, no component design, no layout — that is downstream of ratification.
- No `A(·)` implementation — that is the integration phase (architecture spec §21).
- No new domain — `𝒟` is locked at six.
- No model-authored analytical content.
