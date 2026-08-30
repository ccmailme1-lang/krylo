# TECHNOLOGY — Domain Intelligence Primitive (`I_TECHNOLOGY`)

**Status:** DRAFT FOR FOUNDER RATIFICATION
**Version:** 0.1
**Domain:** TECHNOLOGY
**Parent:** `../SPEC-domain-intelligence-primitive-authoring.md` · `../SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `../SPEC-domain-substrate-integration-contract.md`
**Authoritative reference:** `../SPEC-observable-substrate-revelation-contract.md`
= **"SPEC II"**, §6 TECHNOLOGY — **LOCKED** (that doc, §16).
**Companions:** `CAPITAL.md` (RATIFIED), `OWNERSHIP.md` (draft) — boundaries in §11.

> **Authoring note.** Written by Claude at Founder direction (2026-08-29),
> reconciling **SPEC II §6 (LOCKED)** + repo evidence into the `I_d` schema, with
> the CAPITAL/OWNERSHIP discipline (F1–F7). **Not model-invented** — every field
> traces to SPEC II §6 or is `UNAUTHORED`; structuring choices flagged.
> **TECHNOLOGY's vocabulary is its own** (adoption / displacement / capability /
> infrastructure / dependency) — not CAPITAL's or OWNERSHIP's. Same status those
> held at v0.1: for Founder ratification, **nothing renders**.
> No conclusion, valuation, or forecast is implied.

---

## 0. SPEC II §6 TECHNOLOGY (LOCKED), verbatim schema map

| SPEC II §6 field | content |
|---|---|
| Domain | Technological capability, adoption, displacement, and infrastructure. |
| Observable Objects | software platforms; technical standards; patents; infrastructure assets; corporate technical activity; deployment footprints. |
| Observation Classes | platform launches or retirements; adoption or displacement signals; infrastructure build-outs or decommissionings; patent activity; technical disclosures; measurable shifts in technological intensity. |
| Question | What capability is being introduced, adopted, or displaced, what is changing around it, and what does the change make possible or obsolete? |
| Conditions | adoption momentum; displacement pressure; capability concentration; infrastructure readiness or lag; technological dependency. |
| Relationships | Technology ↔ adopters ↔ displaced alternatives ↔ enabling infrastructure ↔ capital required ↔ skills required ↔ ownership of key assets or IP. |
| Formation Contribution | platform consolidation; infrastructure bottlenecks; capability clusters; displacement cascades. |
| Evidence | deployment data; patent records; technical disclosures; adoption metrics; infrastructure announcements; cross-domain corroboration. |
| Unresolved | claimed versus actual capability; adoption durability; secondary displacement effects; proprietary infrastructure opacity. |
| Cross-Domain Propagation | Capital (funding of capability), Ownership (control of IP or platforms), Knowledge (technical knowledge transfer), Labor (skill-demand shifts), Media (attention to new or displaced capability). |

SPEC II §11 (M&A test), TECHNOLOGY row: *"Capability, platform, or infrastructure
changes hands. Condition: technological dependency or concentration shifts."*

---

## 1. Domain Identity

**domain:** TECHNOLOGY

**Coordinate-axis claim.** TECHNOLOGY observes structural conditions concerning
**technological capability, its adoption, its displacement, and the infrastructure
that enables it** — what capability exists, how it spreads or is displaced, and
what depends on it.

Axis boundary is **structural, not evidentiary**: a patent filing feeds TECHNOLOGY,
OWNERSHIP, and CAPITAL (repo: `patentsviewconnector.js` dispatches
`TECHNOLOGY_VELOCITY` to `['TECHNOLOGY','OWNERSHIP','CAPITAL']`), but the same
latent structural variable is attributed **once** (§11).

**Maturity:** AUTHORED — axis identity is verbatim SPEC II §6 "Domain" (LOCKED);
Founder ratification pending (§13).

---

## 2. Observes

TECHNOLOGY observes (SPEC II §6 Observable Objects + Observation Classes):

- **Capability introduction / retirement** — platform launches, platform retirements, standards emerging or deprecating.
- **Adoption / displacement** — a capability spreading, or an incumbent capability being displaced.
- **Infrastructure change** — build-outs, decommissionings, deployment-footprint change.
- **Patent / disclosure activity** — patent filings and grants, technical disclosures, standards contributions.
- **Technological intensity shift** — measurable change in how technology-intensive an entity, sector, or activity is.

**Maturity:** PARTIAL — traces to SPEC II §6 (LOCKED); pending the §3 dimension/signal
split and the §11 orthogonality check.

---

## 3. Signals

> **F3 — UNAUTHORED.** As with CAPITAL / OWNERSHIP: candidate inventory from SPEC II §6
> Observation Classes, not authored signals. A signal is a measurable quantity with
> a unit and 0–100 normalization.

Candidate measurables (some already computed in-repo, normalized 0–100):
- **patent velocity** per capability cluster — `patentsviewconnector.js` `TECHNOLOGY_VELOCITY:<cluster>` (60-day vs 30-day baseline, `normalizeVelocity`); has polarity.
- **assignee acceleration** — `patentsviewconnector.js` `ASSIGNEE_ACCELERATION:<cluster>:<org>`.
- **repository / package activity** — `githubconnector.js`, `npmconnector.js` (`domain: 'TECHNOLOGY'`, normalized).
- adoption-metric rate (deployment footprint growth) — **no wired source**.
- infrastructure build/decommission event count — **no wired source**.
- displacement margin — `happypathdisplacementengine.js` computes a challenger-vs-incumbent composite gap (`DISPLACEMENT_MARGIN = 8`, marked CALIBRATE).

Each must become a signal definition before this field reaches `PARTIAL`. The
dependency measure (§4.5) still has **no defined formula**; the concentration
measure (§4.3) is now authored (§3.1).

**Maturity:** PARTIAL — the **capability concentration** signal is now AUTHORED
(§3.1); the rest remain UNAUTHORED (WO-1 Class E, pending Founder authorship).

### 3.1 Signal — `technology_capability_concentration` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `technology_capability_concentration` |
| **concept** | capability concentration |
| **measure** | top-capability-provider share |
| **question** | Where is the capability required for this technology concentrated? |
| **definition** | Concentration of a material technological capability among identifiable providers, platforms, standards, or enabling components. |
| **formula** | `top_capability_share = max(provider_capability_share)` |
| **population** | identifiable entities providing the *same material capability* required by the observed technology formation. |
| **unit** | percent of capability supply / control; `0–100` (identity normalization). |
| **polarity** | higher concentration = greater structural dependency · lower = more distributed capability substrate. |
| **provenance (required)** | capability identity · provider / entity identity · capability-share basis · observation timestamp · source · `source_set_hash` / independence metadata (`signalfacet.js` contract). |
| **missing-data rule** | insufficient provider / capability-share coverage → **no measure** (`absenceClass: structural`). `DATA UNAVAILABLE · SOURCE REQUIRED`. Never estimated, inferred, or proxied from activity. |

**Interpretation:** high concentration indicates a material capability is
dependent on a small number of providers or enabling components; low
concentration indicates a more distributed capability substrate.

**Boundary (six-way concentration invariant, ratified §11):** capability
concentration is **not**:
- technology **adoption momentum** (§4.1);
- **displacement pressure** (§4.2);
- **generic technology activity** (patent / repo / package volume — §3 candidates);
- **usage volume**;
- **market share** — unless market share directly represents the capability being
  measured.

It is the largest single provider's share of the *capability supply* an observed
technology formation depends on — a dependency-structure magnitude, not a
diffusion or contest signal.

**Field-level magnitude:** a subject-level magnitude — meaningful without naming a
counterparty — so it passes the dimension-vs-edge rule from the cross-domain
consistency pass. (The Technology ↔ adopters / ↔ enabling-infrastructure
*dependency edge* in §4 remains a separate edge-property, not this measure.)

**Precedent:** the top-N concentration ratio (CR-n; here CR-1) applied to a
capability-supply population — standard concentration construct, cited convention.

**Data state:** the *measure* is authored. **No current TECHNOLOGY connector
produces provider capability-share data** (PatentsView / GitHub / npm / Kalshi
emit velocity / activity / event series, not a capability-supply denominator) —
the data source is WO-1 **Class D**. Until a capability-concentration source is
wired, this signal renders `absenceClass: structural`.

---

## 4. Structural Dimensions

**Ratified basis:** SPEC II §6 "Conditions" (LOCKED) — *adoption momentum;
displacement pressure; capability concentration; infrastructure readiness or lag;
technological dependency.* Per F3 each is the **axis**; its `signal` (§3) is separate.

### 4.1 Adoption Momentum
The rate and direction of a capability's spread among adopters.
**Structuring note:** SPEC II §6 lists "adoption momentum" and "displacement
pressure" as *separate* conditions — recommend **two dimensions**, not poles of
one: a capability can gain adoption without displacing a named incumbent, and an
incumbent can be displaced without a single clear successor.
Maturity: PARTIAL

### 4.2 Displacement Pressure
Observable pressure on an incumbent capability from a challenger.
**Boundary (F2 analog):** the raw observation (a challenger's adoption curve
crossing an incumbent's) is an observation; "displacement pressure" as a
*classification* is derived and retains its provenance. Repo precedent:
`happypathdisplacementengine.js` (challenger superiority + hysteresis).
Maturity: PARTIAL

### 4.3 Capability Concentration
The degree to which a capability is concentrated in few holders / platforms /
standards, vs. distributed.
**Boundary — load-bearing (§11):** concentration of **capability** — NOT capital
concentration (CAPITAL) and NOT control concentration (OWNERSHIP). Three distinct
latent variables. A patent-velocity signal that touches all three axes must
attribute *capability* concentration to TECHNOLOGY only.
**No defined measure yet.**
Maturity: PARTIAL (concept) / UNAUTHORED (measure)

### 4.4 Infrastructure Readiness / Lag
Whether the enabling infrastructure for a capability is ahead of, matched to, or
behind its adoption.
**Structuring note:** SPEC II §6 phrases as "readiness or lag" — recommend **one
dimension with polarity** (`readiness` | `lag`), per CLAUDE.md §16 (analogous to
OWNERSHIP concentration/diffusion). Founder to confirm.
Maturity: PARTIAL

### 4.5 Technological Dependency — MOVED TO §5 (edge-property)
**Ratified (CROSS-DOMAIN-CONSISTENCY §3, 2026-08-29):** "dependency" has no
field-level magnitude without naming a counterparty → it is a **relationship
edge-property**, not a structural dimension. See §5 (`Technology ↔ adopters`,
`Technology ↔ enabling infrastructure`). An aggregate "dependency density" across
observed edges MAY be a `signal`.

### 4.6 Claimed vs Actual Capability — HYPOTHESIS ONLY
SPEC II §6 "Unresolved" names "claimed versus actual capability" as an *open*
element. There is no observable that establishes actual capability against a claim.
**Maturity: UNAUTHORED.**

---

## 5. Relationships

Per F6, `I_TECHNOLOGY.relationships` is the **cross-domain admission set for `F`** —
not intra-domain pairs (§7).

SPEC II §6 Relationships + Cross-Domain Propagation:

- **Technology ↔ adopters** — who is adopting the capability. **Edge attribute:**
  `dependency` — the degree the adopter depends on this specific capability /
  platform / standard (moved here from §4.5).
- **Technology ↔ displaced alternatives** — the incumbent(s) under pressure.
- **Technology ↔ enabling infrastructure** — what the capability runs on.
  **Edge attribute:** `dependency` — how tightly the capability is bound to that
  infrastructure.
- **Technology ↔ Capital** — funding of the capability (SPEC II §6: "capital required").
- **Technology ↔ Labor** — skills required / skill-demand shifts.
- **Technology ↔ Ownership** — control of the key assets or IP (SPEC II §6: "ownership of key assets or IP"; §11: "capability … changes hands").
- **Technology ↔ Knowledge** — technical knowledge transfer.
- **Technology ↔ Media** — attention to new or displaced capability.

Admission only; **synthesis is deferred to `F`** (integration contract D2). The
Formation Contributions (platform consolidation, infrastructure bottlenecks,
capability clusters, displacement cascades) are `F` outputs, not TECHNOLOGY
conclusions.

**Maturity:** PARTIAL — traces to SPEC II §6 (LOCKED); pending §11 orthogonality check.

---

## 6. Relevance Conditions

A TECHNOLOGY observation is relevant to a subject when:

- the observed capability / adoption / displacement / infrastructure is attributable to the subject or its immediate structural environment;
- there is sufficient evidence to establish the TECHNOLOGY attribution;
- it materially concerns adoption momentum, displacement pressure, capability concentration, or infrastructure readiness/lag (the §4 dimensions — `dependency` is now an edge-property, §5; not the UNAUTHORED `claimed vs actual capability`);
- temporal scope is compatible;
- it is not a generic macro tech-sector condition mis-attributed to the subject.

**Distinction:** macro technological environment vs. entity-specific capability
position are materially different observations (parallel to CAPITAL §6).

**Maturity:** PARTIAL

---

## 7. Tension Patterns

Intra-TECHNOLOGY patterns (per F6, distinct from §5):

- **Adoption ↔ Infrastructure lag** — a capability is being adopted faster than its enabling infrastructure is ready.
- **Claimed ↔ Actual capability** — capability claims are measurable (announcements, disclosures) while actual capability is not established (SPEC II §6 Unresolved).
- **Adoption momentum ↔ Displacement durability** — a challenger gains adoption while it is unresolved whether displacement of the incumbent will hold ("adoption durability", SPEC II §6 Unresolved).
- **Visible activity ↔ Proprietary opacity** — public technical activity is observable while proprietary infrastructure remains opaque.

**Maturity:** PARTIAL

---

## 8. Missing Dimensions

SPEC II §6 "Unresolved" + repo state:

- **claimed vs actual capability** — no observable resolves this;
- **adoption durability** — whether an observed adoption/displacement persists;
- **secondary displacement effects** — cascade effects not yet observable;
- **proprietary infrastructure opacity** — capability behind closed infrastructure;
- **defined measures** for capability concentration (§4.3) and for aggregate dependency density across observed edges (§5);
- **subject-specific** TECHNOLOGY observations when the subject cannot be resolved to an observable entity/capability (subject-scoping contract).

**Maturity:** PARTIAL

---

## 9. Sharpening Inputs

Candidate resolution inputs (not claims they exist / suffice):
identified capability, platform, or standard; identified adopter or incumbent;
relevant time window; patent-cluster or repository identifiers; infrastructure
context; the specific dependency edge in question.

Pattern from repo: `patentsviewconnector.js` ties technology velocity to a named
**capability cluster** (`CLUSTERS` list) and to assignee organizations — a
subject sharpens a TECHNOLOGY read by naming the cluster / assignee.

**Maturity:** UNAUTHORED — candidate list; no authored contract; depends on subject-scoping.

---

## 10. Evidence Attribution

Source classes available to TECHNOLOGY (repo-verified):

- **PatentsView** — patent velocity / assignee acceleration / inventor migration (`src/engine/connectors/patentsviewconnector.js`, WO-1856; proxied, key server-side; normalized 0–100; `domain: ['TECHNOLOGY','OWNERSHIP','CAPITAL']` on the velocity signal — **shared evidence, see §11**).
- **GitHub** — repository activity (`githubconnector.js`, `domain: 'TECHNOLOGY'`).
- **npm** — package activity (`npmconnector.js`, `domain: 'TECHNOLOGY'`).
- **Kalshi** — technology-infrastructure signal contribution (`aiinfrastructure.js`).
- **FDA** — device-technology portion (`fdaconnector.js`, partial `domain: 'TECHNOLOGY'`; drug-knowledge portion is KNOWLEDGE).
- **Displacement engine** — `happypathdisplacementengine.js` (challenger/incumbent composite, marked CALIBRATE).

**Attribution rule (F2 analog).** Raw technical activity (a patent count, a repo
star count) is an observation. A derived classification ("displacement pressure",
"capability concentration level") retains its calculation and provenance and never
replaces the underlying quantity.

SPEC II §6 Evidence: deployment data; patent records; technical disclosures;
adoption metrics; infrastructure announcements; cross-domain corroboration.

**Maturity:** PARTIAL — source list repo-verified + F2 rule; the
source→structural-variable mapping is UNAUTHORED (pending §11).

---

## 11. Structural Variable Boundary

**TECHNOLOGY owns:** structural variables concerning **capability** — its
existence, adoption, displacement, the infrastructure enabling it, and dependency
on it.

**TECHNOLOGY does not own:**
- capital massing / movement / deployment (funding of the capability) → CAPITAL
- who controls the IP / platform → OWNERSHIP
- knowledge production / research / expertise → KNOWLEDGE
- workforce skill capacity / movement → LABOR
- attention / narrative about the capability → MEDIA

### The three "concentration" latent variables (load-bearing)

| observation | latent variable | axis |
|---|---|---|
| a capability held in few platforms / standards / holders | **capability concentration** | TECHNOLOGY |
| capital massed in few vehicles | **capital concentration** | CAPITAL (`CAPITAL.md §11`, ratified) |
| control held by few owners | **control concentration** | OWNERSHIP (`OWNERSHIP.md §11`) |

The `patentsviewconnector.js` `TECHNOLOGY_VELOCITY` signal dispatches to all three
axes — this is **shared evidence**, permitted. It is **not** permission to count
the same latent variable three times: patent activity is evidence of *capability*
concentration for TECHNOLOGY; it is evidence of *who assigns/holds IP* for
OWNERSHIP; it is evidence of *R&D capital intensity* for CAPITAL. Three distinct
variables, one evidence source, each attributed once (§18).

### TECHNOLOGY ↔ KNOWLEDGE (the fuzzy line — flag for the KNOWLEDGE draft)

A **patent** is both a technical-capability disclosure (TECHNOLOGY) and a
knowledge artifact (KNOWLEDGE). Proposed split: the **capability** a patent
protects → TECHNOLOGY; the **research / expertise / know-how** it embodies and
whether that expertise moves → KNOWLEDGE. To be reconciled when KNOWLEDGE is authored.

Shared evidence permitted; cross-domain correlation legitimate and necessary for
STRUCTURE / FORMATION.

**Maturity:** PARTIAL — the CAPITAL/OWNERSHIP/TECHNOLOGY concentration clause is
authored against the locked sources; the TECHNOLOGY↔KNOWLEDGE line and the full
6×6 matrix are UNAUTHORED.

---

## 12. Maturity Summary

| Field | Mark | Basis / blocker |
|---|---|---|
| observes | PARTIAL | SPEC II §6 Observable Objects + Observation Classes (LOCKED) |
| signals | **PARTIAL** | `technology_capability_concentration` AUTHORED (§3.1, Founder 2026-08-30) → Class D for data; patent/repo signals + dependency measure still UNAUTHORED (F3) |
| structuralDimensions | PARTIAL | SPEC II §6 Conditions (LOCKED): adoption momentum, displacement pressure, capability concentration, infra readiness/lag. `claimed vs actual capability` **UNAUTHORED** (§4.6). `dependency` moved to `relationships` as an edge-property (§4.5, ratified). |
| relationships | PARTIAL | SPEC II §6 Relationships + Cross-Domain Propagation (LOCKED); cross-domain admission set only (F6) |
| relevanceConditions | PARTIAL | partial trace to SPEC II §6; macro-vs-entity distinction authored |
| tensionPatterns | PARTIAL | intra-TECHNOLOGY; inherits §4 maturity |
| missingDimensions | PARTIAL | SPEC II §6 Unresolved (LOCKED) |
| sharpeningInputs | **UNAUTHORED** | candidate list only; depends on subject-scoping |
| evidenceAttribution | PARTIAL | source list repo-verified + F2 rule; mapping UNAUTHORED |
| structuralVariableBoundary | PARTIAL | 3-way concentration clause authored; TECHNOLOGY↔KNOWLEDGE + full 6×6 UNAUTHORED |

**Explicitly UNAUTHORED:** `signals` (F3), `sharpeningInputs`, `evidenceAttribution`
mapping, dimension `claimed vs actual capability`, the capability-concentration
measure, subject-specific application.

**Nothing is AUTHORED for content. Nothing renders. Integration gated.**

---

## 13. Ratification Questions (Founder)

Mirrors CAPITAL / OWNERSHIP Q-pattern.

1. Does TECHNOLOGY own **adoption momentum, displacement pressure, capability
   concentration, and infrastructure readiness/lag** as its primary structural
   vocabulary (SPEC II §6 Conditions)? (`dependency` is now an edge-property, §5 —
   ratified.)
2. Are **adoption momentum** and **displacement pressure** two dimensions
   (recommendation) or two poles of one?
3. Is **infrastructure readiness/lag** one dimension with polarity, or two?
4. *(resolved — `dependency` → edge-property, CROSS-DOMAIN-CONSISTENCY §3.)*
5. Does **`claimed vs actual capability`** stay UNAUTHORED (recommendation)?
6. Is **"displacement pressure"** an observation, a derived classification, or
   both kept distinct (F2 analog)?
7. Is the **three-way concentration boundary** in §11 correct — capability
   (TECHNOLOGY) vs capital (CAPITAL) vs control (OWNERSHIP), each attributed once
   even when one evidence source (PatentsView) feeds all three?
8. Is the proposed **TECHNOLOGY ↔ KNOWLEDGE split** for patents correct
   (capability → TECHNOLOGY, embodied expertise/movement → KNOWLEDGE)?
9. What is the **capability-concentration measure**? (Blocks `signals`.)
10. **Q8 — Reusability Across Analytical Scope:** identical `I_TECHNOLOGY` for
    `A(TECHNOLOGY, Field)` and `A(TECHNOLOGY, Subject)`; scope via binding/context
    only. (`../SPEC-domain-substrate-integration-contract.md` AC.)

Until ratified, the Data Substrate may surface only ratified-PARTIAL portions —
currently **none**.
