# KNOWLEDGE — Domain Intelligence Primitive (`I_KNOWLEDGE`)

**Status:** DRAFT FOR FOUNDER RATIFICATION
**Version:** 0.1
**Domain:** KNOWLEDGE
**Parent:** `../SPEC-domain-intelligence-primitive-authoring.md` · `../SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `../SPEC-domain-substrate-integration-contract.md`
**Authoritative reference:** `../SPEC-observable-substrate-revelation-contract.md`
= **"SPEC II"**, §7 KNOWLEDGE — **LOCKED** (that doc, §16).
**Companions:** `CAPITAL.md` (RATIFIED), `OWNERSHIP.md`, `TECHNOLOGY.md` (drafts) — boundaries in §11.

> **Authoring note.** Written by Claude at Founder direction, reconciling
> **SPEC II §7 (LOCKED)** + repo evidence into the `I_d` schema, with the
> CAPITAL/OWNERSHIP/TECHNOLOGY discipline (F1–F7). **Not model-invented** — every
> field traces to SPEC II §7 or is `UNAUTHORED`; structuring choices flagged.
> KNOWLEDGE's vocabulary is its own (creation / transfer / concentration /
> diffusion / expertise) — not the other domains'. For Founder ratification,
> **nothing renders**. No conclusion or forecast is implied.

---

## 0. SPEC II §7 KNOWLEDGE (LOCKED), verbatim schema map

| SPEC II §7 field | content |
|---|---|
| Domain | Creation, transfer, concentration, and dissemination of knowledge. |
| Observable Objects | publications; patents; research institutions; funders; awards; collaboration networks; open repositories; specialized talent. |
| Observation Classes | publication or patent events; collaboration or dissolution events; knowledge-transfer agreements; talent movement carrying specialized knowledge; open releases or withdrawals; measurable concentration or diffusion of expertise. |
| Question | Where is knowledge being created, concentrated, or moved, what is changing around it, and what does the change make possible or constrain? |
| Conditions | knowledge concentration; diffusion rate; transfer friction; expertise scarcity or surplus; institutional capture. |
| Relationships | Producers ↔ carriers (people, documents, code) ↔ institutional holders ↔ capital or technology that amplifies the knowledge ↔ labor markets that depend on it. |
| Formation Contribution | expertise clusters; knowledge bottlenecks; rapid diffusion pathways; institutional monopolization of critical knowledge. |
| Evidence | publications; citations; patents; collaboration records; funding disclosures; talent-flow data; cross-domain signals. |
| Unresolved | tacit versus explicit knowledge; actual transfer success; durability of concentration; conflicting dissemination signals. |
| Cross-Domain Propagation | Technology (capability enabled), Labor (skill embodiment), Capital (research financing), Ownership (control of IP), Media (attention to discoveries or controversies). |

SPEC II §11 (M&A test), KNOWLEDGE row: *"Specialized knowledge, IP, or research
capacity transfers or becomes controlled. Condition: knowledge concentration or
transfer friction."*

---

## 1. Domain Identity

**domain:** KNOWLEDGE

**Coordinate-axis claim.** KNOWLEDGE observes structural conditions concerning the
**creation, transfer, concentration, and dissemination of knowledge** — where
expertise, research, and know-how are produced, how they move or fail to move, and
where they pool.

Axis boundary is **structural, not evidentiary**: a patent feeds KNOWLEDGE,
TECHNOLOGY, and OWNERSHIP; a research-funding disclosure feeds KNOWLEDGE and
CAPITAL — but the same latent structural variable is attributed **once** (§11).

**Maturity:** AUTHORED — axis identity is verbatim SPEC II §7 "Domain" (LOCKED);
Founder ratification pending (§13).

---

## 2. Observes

KNOWLEDGE observes (SPEC II §7 Observable Objects + Observation Classes):

- **Knowledge creation events** — publications, patents (as knowledge artifacts), open releases.
- **Collaboration structure** — collaboration formation and dissolution, co-authorship / co-invention networks.
- **Knowledge transfer** — knowledge-transfer agreements, open releases or withdrawals.
- **Expertise movement** — talent movement carrying specialized knowledge (the *knowledge the person carries*, not the person — see §11 vs LABOR).
- **Expertise concentration / diffusion** — measurable concentration or diffusion of expertise across institutions / geographies / fields.

**Maturity:** PARTIAL — traces to SPEC II §7 (LOCKED); pending the §3 dimension/signal
split and the §11 orthogonality check.

---

## 3. Signals

> **F3 — UNAUTHORED.** Candidate inventory from SPEC II §7 Observation Classes, not
> authored signals. A signal is a measurable quantity with a unit and 0–100
> normalization.

Candidate measurables (some already computed in-repo, normalized 0–100):
- **publication / preprint activity** per field — `openalexconnector.js`, `arxivconnector.js`, `pubmedconnector.js` (`domain: 'KNOWLEDGE'`).
- **citation flow / accumulation** — OpenAlex citation data (not yet a wired `I_d` signal).
- **inventor / expertise migration** — `patentsviewconnector.js` `INVENTOR_MIGRATION:<src>→<tgt>` (the *knowledge carried* interpretation).
- collaboration-network density / churn — **no wired source**.
- expertise-concentration index — **no defined formula**.
- diffusion rate (time from creation to broad adoption/citation) — **no wired measure**.

Each must become a signal definition before this field reaches `PARTIAL`.

**Maturity:** PARTIAL — the **expertise concentration** signal is now AUTHORED
(§3.1); the rest remain UNAUTHORED (WO-1 Class E, pending Founder authorship).

### 3.1 Signal — `knowledge_expertise_concentration` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `knowledge_expertise_concentration` |
| **concept** | expertise concentration |
| **measure** | top-holder expertise share (CR-1) |
| **question** | How much of the specialized expertise a knowledge formation depends on is held by its single largest holder? |
| **definition** | Share of an identified body of specialized expertise attributable to the single largest holder (institution, team, or named individual set). |
| **formula** | `top_expertise_share = max(holder_expertise) / Σ(holder_expertise) × 100` |
| **population** | identified holders of the *same* specialized expertise the observed knowledge formation depends on. |
| **unit** | percent of expertise stock; `0–100` (identity normalization). |
| **polarity** | higher = expertise concentrated in few holders (fragility / capture exposure) · lower = diffuse. |
| **provenance (required)** | expertise-domain identity · holder identity · expertise-share basis (e.g. citation-weighted authorship, named inventorship, credential registry) · as-of date · source · `source_set_hash` / independence metadata (`signalfacet.js`). |
| **missing-data rule** | insufficient holder coverage → **no measure** (`absenceClass: structural`). `DATA UNAVAILABLE · SOURCE REQUIRED`. Never proxied from publication or citation **volume**. |

**Boundary (six-way concentration invariant, ratified §11):** measures expertise
**stock** concentration — **not** publication / preprint activity, citation flow,
collaboration-network density, or diffusion **rate** (a separate Class-E measure).
It is the largest holder's share of a specialized-expertise population, a
dependency-structure magnitude, not a knowledge-**flow** signal.

**Field-level magnitude:** subject-level; meaningful without naming a counterparty
→ passes the dimension-vs-edge rule from the consistency pass.

**Precedent:** top-N concentration ratio (CR-1) on an expertise-holder population —
standard concentration construct.

**Data state:** measure authored. **No current KNOWLEDGE connector produces
holder-level expertise shares** (OpenAlex / arXiv / PubMed / PatentsView emit
activity / migration / citation series, not an expertise-stock denominator) —
data source is WO-1 **Class D**. Renders `absenceClass: structural` until wired.

---

## 4. Structural Dimensions

**Ratified basis:** SPEC II §7 "Conditions" (LOCKED) — *knowledge concentration;
diffusion rate; transfer friction; expertise scarcity or surplus; institutional
capture.* Per F3 each is the **axis**; its `signal` (§3) is separate.

### 4.1 Knowledge Concentration
Where expertise / research output pools — in few institutions, few people, few
geographies.
**Structuring note:** recommend **one dimension with polarity**
(`concentration` | `diffusion` as the standing state), with §4.2 Diffusion Rate as
a *distinct* dimension (the speed of spread, not the state). Founder to confirm.
**Boundary — load-bearing (§11):** concentration of **knowledge / expertise** —
NOT capital (CAPITAL), control (OWNERSHIP), or capability (TECHNOLOGY). Four
distinct latent variables.
Maturity: PARTIAL

### 4.2 Diffusion Rate
The speed at which created knowledge spreads (creation → citation → adoption).
Distinct from §4.1: a highly concentrated field can still diffuse fast within its
cluster; a diffuse field can diffuse slowly.
Maturity: PARTIAL

### 4.3 Transfer Friction — MOVED TO §5 (edge-property)
**Ratified (CROSS-DOMAIN-CONSISTENCY §3, 2026-08-29):** "friction" has no
field-level magnitude without naming the two parties of a transfer → it is a
**relationship edge-property**, not a structural dimension. See §5
(`Producers ↔ carriers ↔ institutional holders`). An aggregate "mean transfer
friction across observed edges" MAY be a `signal`.

### 4.4 Expertise Scarcity / Surplus
Whether a specific expertise is scarce or abundant relative to demand for it.
**Structuring note:** one dimension with polarity (`scarcity` | `surplus`), per
CLAUDE.md §16.
**Boundary:** expertise scarcity is a KNOWLEDGE variable; the *labor-market*
consequence (wage pressure, hiring difficulty) is LABOR (§11).
Maturity: PARTIAL

### 4.5 Institutional Capture
The degree to which critical knowledge is held / gated by a single institution.
SPEC II §7 Formation Contribution's "institutional monopolization of critical
knowledge" is the `F` output this dimension feeds — not a KNOWLEDGE conclusion (F6).
Maturity: PARTIAL

### 4.6 Tacit vs Explicit Knowledge — HYPOTHESIS ONLY
SPEC II §7 "Unresolved" names "tacit versus explicit knowledge" as an *open*
element. There is no observable that measures tacit knowledge directly.
**Maturity: UNAUTHORED.**

---

## 5. Relationships

Per F6, `I_KNOWLEDGE.relationships` is the **cross-domain admission set for `F`** —
not intra-domain pairs (§7).

SPEC II §7 Relationships + Cross-Domain Propagation:

- **Producers ↔ carriers** — people, documents, code that carry the knowledge.
  **Edge attribute:** `transferFriction` — resistance to the knowledge moving from
  producer to carrier (moved here from §4.3).
- **Carriers ↔ institutional holders** — where the knowledge is housed.
  **Edge attribute:** `transferFriction` — resistance to the knowledge moving into
  or between institutions.
- **Knowledge ↔ Technology** — capability enabled by the knowledge (SPEC II §7: "technology that amplifies").
- **Knowledge ↔ Capital** — research financing.
- **Knowledge ↔ Labor** — labor markets that depend on the expertise; skill embodiment.
- **Knowledge ↔ Ownership** — control of the IP.
- **Knowledge ↔ Media** — attention to discoveries or controversies.

Admission only; **synthesis is deferred to `F`** (integration contract D2). The
Formation Contributions (expertise clusters, knowledge bottlenecks, diffusion
pathways, institutional monopolization) are `F` outputs, not KNOWLEDGE conclusions.

**Maturity:** PARTIAL — traces to SPEC II §7 (LOCKED); pending §11 orthogonality check.

---

## 6. Relevance Conditions

A KNOWLEDGE observation is relevant to a subject when:

- the observed creation / transfer / concentration / expertise movement is attributable to the subject or its immediate structural environment;
- there is sufficient evidence to establish the KNOWLEDGE attribution;
- it materially concerns concentration, diffusion rate, expertise scarcity/surplus, or institutional capture (the §4 dimensions — `transferFriction` is now an edge-property, §5; not the UNAUTHORED `tacit vs explicit`);
- temporal scope is compatible;
- it is not a generic macro research-sector condition mis-attributed to the subject.

**Distinction:** macro knowledge environment vs. entity-specific knowledge position
are materially different observations (parallel to CAPITAL §6).

**Maturity:** PARTIAL

---

## 7. Tension Patterns

Intra-KNOWLEDGE patterns (per F6, distinct from §5):

- **Concentration ↔ Diffusion rate** — expertise is concentrated in few holders while diffusing rapidly within that cluster (or vice versa).
- **Creation ↔ Transfer success** — knowledge is measurably created while actual transfer to carriers/institutions is not established (SPEC II §7 Unresolved: "actual transfer success").
- **Explicit activity ↔ Tacit residue** — publication/patent activity is observable while the tacit expertise that makes it usable is not.
- **Open release ↔ Institutional capture** — knowledge is released openly while critical adjacent knowledge remains gated.

**Maturity:** PARTIAL

---

## 8. Missing Dimensions

SPEC II §7 "Unresolved" + repo state:

- **tacit vs explicit knowledge** — no observable measures tacit knowledge;
- **actual transfer success** — whether an observed transfer produced usable capacity;
- **durability of concentration** — whether an expertise pool persists;
- reconciliation of **conflicting dissemination signals**;
- **defined measures** for expertise concentration (§4.1) and diffusion rate (§4.2);
- **subject-specific** KNOWLEDGE observations when the subject cannot be resolved to an observable entity / field (subject-scoping contract).

**Maturity:** PARTIAL

---

## 9. Sharpening Inputs

Candidate resolution inputs (not claims they exist / suffice):
identified field / discipline / research area; identified institution or research
group; named individuals (expertise carriers); relevant time window; publication
or patent-cluster identifiers; the specific transfer edge in question.

Pattern from repo: OpenAlex / arXiv / PubMed connectors key knowledge activity to
**fields / topics**; a subject sharpens a KNOWLEDGE read by naming the field and
the institution.

**Maturity:** UNAUTHORED — candidate list; no authored contract; depends on subject-scoping.

---

## 10. Evidence Attribution

Source classes available to KNOWLEDGE (repo-verified):

- **OpenAlex** — scholarly works / citations (`src/engine/connectors/openalexconnector.js`, `domain: 'KNOWLEDGE'`).
- **arXiv** — preprints (`arxivconnector.js`, `domain: 'KNOWLEDGE'`).
- **PubMed** — biomedical publications (`pubmedconnector.js`, `domain: 'KNOWLEDGE'`).
- **FDA** — drug-knowledge portion (`fdaconnector.js`, partial `domain: 'KNOWLEDGE'`; device portion is TECHNOLOGY).
- **PatentsView** — inventor migration as knowledge-carrier movement (`patentsviewconnector.js` `INVENTOR_MIGRATION`).

**Attribution rule (F2 analog).** Raw scholarly activity (a publication count, a
citation count) is an observation. A derived classification ("institutional
capture level", "expertise scarcity") retains its calculation and provenance and
never replaces the underlying quantity.

SPEC II §7 Evidence: publications; citations; patents; collaboration records;
funding disclosures; talent-flow data; cross-domain signals.

**Maturity:** PARTIAL — source list repo-verified + F2 rule; the
source→structural-variable mapping is UNAUTHORED (pending §11).

---

## 11. Structural Variable Boundary

**KNOWLEDGE owns:** structural variables concerning **knowledge / expertise** — its
creation, movement, concentration, diffusion, and the friction on its transfer.

**KNOWLEDGE does not own:**
- capital massing / research financing → CAPITAL
- who controls the IP → OWNERSHIP
- the technical capability a discovery enables → TECHNOLOGY
- the workforce / person carrying the expertise → LABOR
- attention / narrative about a discovery → MEDIA

### The four "concentration" latent variables (load-bearing)

| observation | latent variable | axis |
|---|---|---|
| expertise / research pooled in few holders | **knowledge concentration** | KNOWLEDGE |
| a capability held in few platforms / standards | **capability concentration** | TECHNOLOGY (`TECHNOLOGY.md §11`) |
| capital massed in few vehicles | **capital concentration** | CAPITAL (`CAPITAL.md §11`, ratified) |
| control held by few owners | **control concentration** | OWNERSHIP (`OWNERSHIP.md §11`) |

Shared evidence (a patent, a funding disclosure) is permitted; each latent
variable is attributed **once** (§18).

### KNOWLEDGE ↔ TECHNOLOGY (resolving the patent line)

Per `TECHNOLOGY.md §11`, proposed and adopted here: a **patent's protected
capability** → TECHNOLOGY; the **research / expertise it embodies, and whether
that expertise moves (inventor migration)** → KNOWLEDGE. One patent record,
two axes, two latent variables, each attributed once.

### KNOWLEDGE ↔ LABOR

A specialist moving between institutions: the **person / headcount / skill
capacity** is LABOR; the **specialized knowledge they carry** is KNOWLEDGE. SPEC
II §7 "talent movement carrying specialized knowledge" is a KNOWLEDGE observation
about the *knowledge*, not a LABOR headcount. To be reconciled when LABOR is authored.

Shared evidence permitted; cross-domain correlation legitimate and necessary for
STRUCTURE / FORMATION.

**Maturity:** PARTIAL — the 4-way concentration clause + KNOWLEDGE↔TECHNOLOGY line
are authored against the locked sources; the KNOWLEDGE↔LABOR line and the full 6×6
matrix are UNAUTHORED.

---

## 12. Maturity Summary

| Field | Mark | Basis / blocker |
|---|---|---|
| observes | PARTIAL | SPEC II §7 Observable Objects + Observation Classes (LOCKED) |
| signals | **PARTIAL** | `knowledge_expertise_concentration` AUTHORED (§3.1, Founder 2026-08-30) → Class D for data; publication signals + diffusion-rate measure still UNAUTHORED (F3) |
| structuralDimensions | PARTIAL | SPEC II §7 Conditions (LOCKED): concentration, diffusion rate, expertise scarcity/surplus, institutional capture. `tacit vs explicit` **UNAUTHORED** (§4.6). `transfer friction` moved to `relationships` as an edge-property (§4.3, ratified). |
| relationships | PARTIAL | SPEC II §7 Relationships + Cross-Domain Propagation (LOCKED); cross-domain admission set only (F6) |
| relevanceConditions | PARTIAL | partial trace to SPEC II §7; macro-vs-entity distinction authored |
| tensionPatterns | PARTIAL | intra-KNOWLEDGE; inherits §4 maturity |
| missingDimensions | PARTIAL | SPEC II §7 Unresolved (LOCKED) |
| sharpeningInputs | **UNAUTHORED** | candidate list only; depends on subject-scoping |
| evidenceAttribution | PARTIAL | source list repo-verified + F2 rule; mapping UNAUTHORED |
| structuralVariableBoundary | PARTIAL | 4-way concentration + KNOWLEDGE↔TECHNOLOGY authored; KNOWLEDGE↔LABOR + full 6×6 UNAUTHORED |

**Explicitly UNAUTHORED:** `signals` (F3), `sharpeningInputs`, `evidenceAttribution`
mapping, dimension `tacit vs explicit knowledge`, the expertise-concentration and
diffusion-rate measures, subject-specific application.

**Nothing is AUTHORED for content. Nothing renders. Integration gated.**

---

## 13. Ratification Questions (Founder)

1. Does KNOWLEDGE own **knowledge concentration, diffusion rate, expertise
   scarcity/surplus, and institutional capture** as its primary structural
   vocabulary (SPEC II §7 Conditions)? (`transfer friction` is now an
   edge-property, §5 — ratified.)
2. Is **concentration/diffusion** one dimension with polarity, with **diffusion
   rate** a separate dimension (recommendation), or a different split?
3. *(resolved — `transfer friction` → edge-property, CROSS-DOMAIN-CONSISTENCY §3.)*
4. Is **expertise scarcity/surplus** one dimension with polarity?
5. Does **`tacit vs explicit knowledge`** stay UNAUTHORED (recommendation)?
6. Is **"institutional capture"** an observation, a derived classification, or
   both kept distinct (F2 analog)?
7. Is the **four-way concentration boundary** in §11 correct — knowledge
   (KNOWLEDGE) vs capability (TECHNOLOGY) vs capital (CAPITAL) vs control
   (OWNERSHIP), each attributed once?
8. Is the **KNOWLEDGE ↔ TECHNOLOGY patent split** correct (protected capability →
   TECHNOLOGY; embodied expertise + inventor migration → KNOWLEDGE)?
9. Is the **KNOWLEDGE ↔ LABOR split** correct (person/headcount → LABOR; carried
   specialized knowledge → KNOWLEDGE)?
10. What are the **expertise-concentration** and **diffusion-rate** measures?
    (Blocks `signals`.)
11. **Q8 — Reusability Across Analytical Scope:** identical `I_KNOWLEDGE` for
    `A(KNOWLEDGE, Field)` and `A(KNOWLEDGE, Subject)`; scope via binding/context
    only. (`../SPEC-domain-substrate-integration-contract.md` AC.)

Until ratified, the Data Substrate may surface only ratified-PARTIAL portions —
currently **none**.
