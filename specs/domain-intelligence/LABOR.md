# LABOR — Domain Intelligence Primitive (`I_LABOR`)

**Status:** DRAFT FOR FOUNDER RATIFICATION
**Version:** 0.1
**Domain:** LABOR
**Parent:** `../SPEC-domain-intelligence-primitive-authoring.md` · `../SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `../SPEC-domain-substrate-integration-contract.md`
**Authoritative reference:** `../SPEC-observable-substrate-revelation-contract.md`
= **"SPEC II"**, §8 LABOR — **LOCKED** (that doc, §16).
**Companions:** `CAPITAL.md` (RATIFIED), `OWNERSHIP.md`, `TECHNOLOGY.md`, `KNOWLEDGE.md` (drafts) — boundaries in §11.

> **Authoring note.** Written by Claude at Founder direction, reconciling
> **SPEC II §8 (LOCKED)** + repo evidence into the `I_d` schema, with the
> CAPITAL/OWNERSHIP/TECHNOLOGY/KNOWLEDGE discipline (F1–F7). **Not model-invented**
> — every field traces to SPEC II §8 or is `UNAUTHORED`; structuring choices
> flagged. LABOR's vocabulary is its own (capacity / skill / headcount /
> geographic distribution) — not the other domains'. For Founder ratification,
> **nothing renders**. No conclusion or forecast is implied.

---

## 0. SPEC II §8 LABOR (LOCKED), verbatim schema map

| SPEC II §8 field | content |
|---|---|
| Domain | People, skills, employment, and organizational capacity. |
| Observable Objects | workers; occupational categories; employers; facilities; training institutions; wage data; job-opening data. |
| Observation Classes | hiring or layoff events at scale; facility openings or closures; occupational demand shifts; labor-action events; training-capacity changes; measurable headcount or skill-mix shifts; geographic workforce redistribution. |
| Question | Where is human capacity moving, concentrating, or being released, what is changing around it, and what does the change make possible or constrain? |
| Conditions | skill scarcity or surplus; organizational capacity expansion or contraction; labor-market pressure; geographic concentration or dispersion. |
| Relationships | Workers ↔ employers ↔ skill requirements ↔ locations ↔ capital or technology that substitutes or complements labor ↔ ownership structures that control capacity. |
| Formation Contribution | skill clusters; capacity bottlenecks; organizational restructuring patterns; cross-border labor realignments. |
| Evidence | employment filings; facility announcements; occupational and wage data; training-capacity signals; cross-domain observations. |
| Unresolved | quality versus quantity of capacity; actual skill-transfer outcomes; secondary effects; incomplete internal visibility. |
| Cross-Domain Propagation | Capital (cost or investment implications), Technology (automation or complementary capability), Knowledge (embodied expertise movement), Ownership (control of organizational capacity), Media (attention/narrative around employment or labor conflict). |

SPEC II §11 (M&A test), LABOR row: *"Organizational capacity, headcount, or skill
mix changes. Condition: capacity expansion, contraction, or reorganization
pressure."*

---

## 1. Domain Identity

**domain:** LABOR

**Coordinate-axis claim.** LABOR observes structural conditions concerning
**people, skills, employment, and organizational capacity** — where human capacity
concentrates, moves, expands, contracts, or is released.

Axis boundary is **structural, not evidentiary**: a Census business-patterns
release feeds LABOR and OWNERSHIP (repo: `censusconnector.js` dispatches to both);
a supply-chain event feeds TECHNOLOGY / CAPITAL / LABOR — but the same latent
structural variable is attributed **once** (§11).

**Maturity:** AUTHORED — axis identity is verbatim SPEC II §8 "Domain" (LOCKED);
Founder ratification pending (§13).

---

## 2. Observes

LABOR observes (SPEC II §8 Observable Objects + Observation Classes):

- **Headcount change at scale** — hiring or layoff events, facility openings or closures.
- **Occupational demand shift** — which occupational categories are gaining or losing demand.
- **Skill-mix shift** — a measurable change in the composition of skills an employer / sector requires.
- **Geographic workforce redistribution** — capacity moving between regions.
- **Labor-action events** — strikes, unionization drives, collective actions.
- **Training-capacity change** — expansion or contraction of the pipeline that produces a skill.

**Maturity:** PARTIAL — traces to SPEC II §8 (LOCKED); pending the §3 dimension/signal
split and the §11 orthogonality check.

---

## 3. Signals

> **F3 — UNAUTHORED.** Candidate inventory from SPEC II §8 Observation Classes,
> not authored signals. A signal is a measurable quantity with a unit and 0–100
> normalization.

Candidate measurables (some already computed in-repo, normalized 0–100):
- **job-opening activity** per occupation / region — `usajobsconnector.js` (`domain: 'LABOR'`).
- **employment / wage / occupational series** — `blsconnector.js` (`domain: 'LABOR'`).
- **workforce / establishment counts** per geography — `censusconnector.js` (`domain: 'LABOR'`).
- hiring/layoff event rate at scale — **no wired source** (WARN-notice class not connected).
- geographic redistribution index — **no defined formula**.
- skill-mix shift measure — **no defined formula**.
- labor-action event count — **no wired source**.

Each must become a signal definition before this field reaches `PARTIAL`.

**Maturity:** PARTIAL — **workforce-geographic concentration** (§3.1),
**geographic redistribution** (§3.2), and **skill-mix shift** (§3.3) are AUTHORED;
the remaining §3 candidates stay UNAUTHORED (F3).

### 3.1 Signal — `labor_geographic_concentration` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `labor_geographic_concentration` |
| **concept** | workforce-geographic concentration |
| **measure** | top-location workforce share (CR-1) |
| **question** | How geographically concentrated is the workforce capacity a formation depends on? |
| **definition** | Share of relevant workforce capacity located in the single largest geographic unit. |
| **formula** | `top_location_share = max(location_headcount) / Σ(location_headcount) × 100` |
| **population** | identified geographic units holding the relevant workforce capacity (defined at a stated granularity — metro / region / country). |
| **unit** | percent of workforce capacity; `0–100` (identity normalization). |
| **polarity** | higher = geographically concentrated (single-point exposure) · lower = distributed. |
| **provenance (required)** | workforce-population identity · geographic unit identity + granularity · headcount / capacity basis per unit · as-of date · source · `source_set_hash` / independence metadata (`signalfacet.js`). |
| **missing-data rule** | insufficient geographic coverage → **no measure** (`absenceClass: structural`). `DATA UNAVAILABLE · SOURCE REQUIRED`. Never proxied from job-posting or establishment **volume**. |

**Boundary (six-way concentration invariant, ratified §11):** a **static**
locational-concentration snapshot — **not** geographic **redistribution** (a
change measure, separate Class E), skill-mix shift (separate Class E), or
hiring / layoff event rate. CR-1 is used for consistency with the concentration
family; an HHI-style dispersion index is explicitly **not** introduced here.

**Field-level magnitude:** subject-level; meaningful without naming a counterparty
→ passes the dimension-vs-edge rule.

**Precedent:** top-N concentration ratio (CR-1) on a geographic-unit population —
standard concentration construct.

**Data state:** measure authored. **No current LABOR connector produces
subject-scoped per-location headcount shares** (BLS / Census / USAJobs emit
occupational series, establishment counts, and postings — not a subject workforce
distributed by location) — data source is WO-1 **Class D**. Renders
`absenceClass: structural` until wired.

### 3.2 Signal — `labor_geographic_redistribution` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `labor_geographic_redistribution` |
| **concept** | geographic redistribution |
| **measure** | magnitude of shift in workforce location distribution over the window (dissimilarity-index form) |
| **question** | How much has the workforce's geographic footprint moved? |
| **definition** | Total absolute change in location shares between window start and window end, halved — the fraction of the workforce that would need to relocate to restore the start distribution. |
| **formula** | `geographic_redistribution = Σ|share_end(loc) − share_start(loc)| / 2 × 100` over all locations |
| **population** | the same geographic-unit set and granularity used for §3.1, measured at two points. |
| **unit** | percent of the workforce; `0–100` (dissimilarity-index form — naturally bounded). |
| **polarity** | magnitude only. Whether the move is *concentrating* or *dispersing* is a secondary read from the sign of Δ(§3.1); the redistribution measure itself is unsigned. |
| **provenance (required)** | location shares at window start · location shares at window end · unit set + granularity · window bounds · source · `source_set_hash` / independence metadata. |
| **missing-data rule** | location shares unavailable at **either** endpoint → **no measure** (`absenceClass: structural`). `DATA UNAVAILABLE · SOURCE REQUIRED`. Never single-point-extrapolated, never proxied from posting volume. |

**Boundary (ratified §11):** the **change** in geographic distribution — **not**
§3.1 static concentration, **not** skill-mix shift (§3.3 — different axis), **not**
hiring / layoff event rate.

**Precedent:** index of dissimilarity / Duncan segregation index applied
temporally — standard construct.

**Data state:** measure authored. **No current LABOR connector produces a
two-point subject workforce-by-location series** — WO-1 **Class D**. Renders
`absenceClass: structural` until wired.

### 3.3 Signal — `labor_skill_mix_shift` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `labor_skill_mix_shift` |
| **concept** | skill-mix shift |
| **measure** | magnitude of change in the workforce's skill / occupational composition over the window (dissimilarity-index form) |
| **question** | How much has the composition of skills changed? |
| **definition** | Total absolute change in occupational / skill-category shares between window start and window end, halved. |
| **formula** | `skill_mix_shift = Σ|share_end(skill) − share_start(skill)| / 2 × 100` over skill categories |
| **population** | a stated skill taxonomy (e.g. SOC major groups), measured at two points on the same taxonomy. |
| **unit** | percent of the workforce; `0–100` (dissimilarity-index form). |
| **polarity** | magnitude only; no inherent direction. |
| **provenance (required)** | skill-category shares at window start · same at window end · taxonomy identity · window bounds · source · `source_set_hash` / independence metadata. |
| **missing-data rule** | skill-category shares unavailable at **either** endpoint → **no measure** (`absenceClass: structural`). `DATA UNAVAILABLE · SOURCE REQUIRED`. Never single-point-extrapolated, never proxied from posting volume. |

**Boundary (ratified §11):** change in **composition** — **not** geographic
(§3.1 / §3.2, a location axis), **not** headcount growth (share-based, so
size-invariant), **not** hiring rate.

**Precedent:** dissimilarity-index form over a skill taxonomy — same construct as
§3.2 on a different partition.

**Data state:** measure authored. **No current LABOR connector produces a
two-point subject workforce-by-skill series** — WO-1 **Class D**. Renders
`absenceClass: structural` until wired.

---

## 4. Structural Dimensions

**Ratified basis:** SPEC II §8 "Conditions" (LOCKED) — *skill scarcity or surplus;
organizational capacity expansion or contraction; labor-market pressure;
geographic concentration or dispersion.* Per F3 each is the **axis**; its `signal`
(§3) is separate.

### 4.1 Skill Scarcity / Surplus
Whether a specific skill is scarce or abundant relative to demand.
**Structuring note:** one dimension with polarity (`scarcity` | `surplus`), per
CLAUDE.md §16.
**Boundary — load-bearing (§11):** skill scarcity is a LABOR variable (the
*workers* with the skill are scarce); it is distinct from KNOWLEDGE's *expertise
scarcity* (the *knowledge itself* is scarce). Related — reconciled in §11.
Maturity: PARTIAL

### 4.2 Organizational Capacity Expansion / Contraction
Whether an employer's / sector's human capacity is growing or shrinking.
**Structuring note:** one dimension with polarity (`expansion` | `contraction`).
SPEC II §11: "capacity expansion, contraction, or reorganization pressure".
Maturity: PARTIAL

### 4.3 Labor-Market Pressure
Observable tightness or slack in a labor market — the resistance to filling roles,
retaining workers, or the pressure toward collective action.
**Boundary (F2 analog):** the raw observation (a spike in openings, a strike, a
wage jump) is an observation; "labor-market pressure" as a *classification* is
derived and retains its provenance. Not synonymous with a generic macro "pressure".
Maturity: PARTIAL

### 4.4 Geographic Concentration / Dispersion
Whether workforce capacity for an occupation / sector is concentrated in few
regions or spread across many.
**Structuring note:** one dimension with polarity (`concentration` | `dispersion`).
**Boundary (§11):** this is *geographic* concentration of **workforce** — the
fifth distinct "concentration" latent variable (capital / control / capability /
knowledge / workforce-geography).
Maturity: PARTIAL

### 4.5 Quality vs Quantity of Capacity — HYPOTHESIS ONLY
SPEC II §8 "Unresolved" names "quality versus quantity of capacity" as an *open*
element. Headcount is observable; the *quality / effectiveness* of that capacity
is not measured by any available observable.
**Maturity: UNAUTHORED.**

---

## 5. Relationships

Per F6, `I_LABOR.relationships` is the **cross-domain admission set for `F`** — not
intra-domain pairs (§7).

SPEC II §8 Relationships + Cross-Domain Propagation:

- **Workers ↔ employers** — the employment relation.
- **Workers ↔ skill requirements ↔ locations** — the demand structure for capacity.
- **Labor ↔ Capital** — cost or investment implications (SPEC II §8: "capital … that substitutes or complements labor").
- **Labor ↔ Technology** — automation displacing, or complementary capability augmenting, a workforce (SPEC II §8; mirrors `TECHNOLOGY.md` "skill-demand shifts").
- **Labor ↔ Knowledge** — embodied expertise movement (a specialist changing employers).
- **Labor ↔ Ownership** — ownership structures that control organizational capacity.
- **Labor ↔ Media** — attention / narrative around employment or labor conflict.

Admission only; **synthesis is deferred to `F`** (integration contract D2). The
Formation Contributions (skill clusters, capacity bottlenecks, restructuring
patterns, cross-border realignments) are `F` outputs, not LABOR conclusions.

**Maturity:** PARTIAL — traces to SPEC II §8 (LOCKED); pending §11 orthogonality check.

---

## 6. Relevance Conditions

A LABOR observation is relevant to a subject when:

- the observed headcount / skill / capacity / geographic change is attributable to the subject or its immediate structural environment;
- there is sufficient evidence to establish the LABOR attribution;
- it materially concerns skill scarcity/surplus, capacity expansion/contraction, labor-market pressure, or geographic concentration/dispersion (the §4 axes — not the UNAUTHORED `quality vs quantity`);
- temporal scope is compatible;
- it is not a generic macro labor-market condition mis-attributed to the subject.

**Distinction:** macro labor environment vs. entity-specific workforce position
are materially different observations (parallel to CAPITAL §6). SPEC II §8
Unresolved: "incomplete internal visibility" — an entity's internal headcount is
frequently not disclosed.

**Maturity:** PARTIAL

---

## 7. Tension Patterns

Intra-LABOR patterns (per F6, distinct from §5):

- **Demand ↔ Training capacity** — occupational demand rises while the training pipeline for that skill is flat or contracting.
- **Headcount ↔ Capacity quality** — headcount is measurably changing while whether effective capacity changed is not established (SPEC II §8 Unresolved).
- **Openings ↔ Fill rate** — job openings rise while roles remain unfilled (labor-market tightness).
- **Geographic concentration ↔ Local capacity limits** — workforce concentrates in a region faster than that region's housing / training / infrastructure can absorb.
- **Announced ↔ Actual** — announced hiring / layoffs vs. what is later observable.

**Maturity:** PARTIAL

---

## 8. Missing Dimensions

SPEC II §8 "Unresolved" + repo state:

- **quality vs quantity of capacity** — no observable measures capacity quality;
- **actual skill-transfer outcomes** — whether training / hiring produced usable capacity;
- **secondary effects** of a capacity change not yet observable;
- **incomplete internal visibility** — internal headcount / skill mix frequently undisclosed;
- **defined measures** for geographic redistribution (§4.4) and skill-mix shift (§3);
- **subject-specific** LABOR observations when the subject cannot be resolved to an observable employer / occupation / region (subject-scoping contract).

**Maturity:** PARTIAL

---

## 9. Sharpening Inputs

Candidate resolution inputs (not claims they exist / suffice):
identified employer / sector; identified occupation or skill; relevant geography;
relevant time window; occupational codes (SOC/NAICS); the specific
worker↔employer or labor↔technology edge in question.

Pattern from repo: BLS / Census / USAJobs connectors key labor activity to
**occupational categories and geographies**; a subject sharpens a LABOR read by
naming the occupation and the region.

**Maturity:** UNAUTHORED — candidate list; no authored contract; depends on subject-scoping.

---

## 10. Evidence Attribution

Source classes available to LABOR (repo-verified):

- **BLS** — employment, wage, occupational series (`src/engine/connectors/blsconnector.js`, `domain: 'LABOR'`).
- **USAJobs** — federal job openings (`usajobsconnector.js`, `domain: 'LABOR'`).
- **Census** — workforce / establishment counts by geography (`censusconnector.js`, dispatches `domain: 'LABOR'` **and** `'OWNERSHIP'` — shared evidence, see §11).
- **Supply-chain** — `supplychainconnector.js` dispatches `['TECHNOLOGY','CAPITAL','LABOR']` for capacity-relevant supply events.

**Attribution rule (F2 analog).** Raw labor activity (an opening count, a wage
figure, a headcount) is an observation. A derived classification ("labor-market
pressure", "capacity contraction") retains its calculation and provenance and
never replaces the underlying quantity.

SPEC II §8 Evidence: employment filings; facility announcements; occupational and
wage data; training-capacity signals; cross-domain observations.

**Maturity:** PARTIAL — source list repo-verified + F2 rule; the
source→structural-variable mapping is UNAUTHORED (pending §11).

---

## 11. Structural Variable Boundary

**LABOR owns:** structural variables concerning **human capacity** — headcount,
skills, employment, organizational capacity, and its geographic distribution.

**LABOR does not own:**
- capital cost / investment consequences of a labor change → CAPITAL
- the automation / complementary capability itself → TECHNOLOGY
- the specialized knowledge a worker carries → KNOWLEDGE
- who controls the organizational capacity → OWNERSHIP
- attention / narrative about employment or labor conflict → MEDIA

### The five "concentration" latent variables (load-bearing)

| observation | latent variable | axis |
|---|---|---|
| workforce for an occupation concentrated in few regions | **workforce geographic concentration** | LABOR |
| expertise / research pooled in few holders | **knowledge concentration** | KNOWLEDGE (`KNOWLEDGE.md §11`) |
| a capability held in few platforms / standards | **capability concentration** | TECHNOLOGY (`TECHNOLOGY.md §11`) |
| capital massed in few vehicles | **capital concentration** | CAPITAL (`CAPITAL.md §11`, ratified) |
| control held by few owners | **control concentration** | OWNERSHIP (`OWNERSHIP.md §11`) |

Shared evidence permitted; each latent variable attributed **once** (§18).

### LABOR ↔ KNOWLEDGE (resolving the specialist-movement line)

Per `KNOWLEDGE.md §11`, adopted here: a specialist moving between institutions —
the **person / headcount / skill capacity** is LABOR (`LABOR` observes a capacity
change); the **specialized knowledge that person carries, and whether that
expertise thereby moves** is KNOWLEDGE. One talent-movement event, two axes, two
latent variables, each attributed once.

Likewise **skill scarcity** (LABOR — the *workers* are scarce) vs **expertise
scarcity** (KNOWLEDGE — the *knowledge* is scarce): related, distinct. A skill can
be scarce because few people have trained in it (LABOR) even where the knowledge
is widely published (KNOWLEDGE not scarce), and vice versa.

### LABOR ↔ TECHNOLOGY

Automation: the **capability that substitutes for labor** is TECHNOLOGY; the
**displacement / skill-demand shift in the workforce** is LABOR. Mirrors
`TECHNOLOGY.md` Cross-Domain Propagation ("skill-demand shifts").

### LABOR ↔ OWNERSHIP

Census feeds both. The **workforce / establishment capacity** is LABOR; **who owns
/ controls the establishment** is OWNERSHIP. One release, two axes.

Shared evidence permitted; cross-domain correlation legitimate and necessary for
STRUCTURE / FORMATION.

**Maturity:** PARTIAL — the 5-way concentration clause + LABOR↔KNOWLEDGE /
LABOR↔TECHNOLOGY / LABOR↔OWNERSHIP lines authored against the locked sources; the
full 6×6 matrix is UNAUTHORED (MEDIA row pending its draft).

---

## 12. Maturity Summary

| Field | Mark | Basis / blocker |
|---|---|---|
| observes | PARTIAL | SPEC II §8 Observable Objects + Observation Classes (LOCKED) |
| signals | **PARTIAL** | AUTHORED (Founder 2026-08-30) → Class D for data: `labor_geographic_concentration` (§3.1), `labor_geographic_redistribution` (§3.2), `labor_skill_mix_shift` (§3.3). BLS/Census/USAJobs signals + remaining §3 candidates UNAUTHORED (F3). |
| structuralDimensions | PARTIAL | SPEC II §8 Conditions (LOCKED). `quality vs quantity` **UNAUTHORED** (§4.5) |
| relationships | PARTIAL | SPEC II §8 Relationships + Cross-Domain Propagation (LOCKED); cross-domain admission set only (F6) |
| relevanceConditions | PARTIAL | partial trace to SPEC II §8; macro-vs-entity + internal-visibility distinction authored |
| tensionPatterns | PARTIAL | intra-LABOR; inherits §4 maturity |
| missingDimensions | PARTIAL | SPEC II §8 Unresolved (LOCKED) |
| sharpeningInputs | **UNAUTHORED** | candidate list only; depends on subject-scoping |
| evidenceAttribution | PARTIAL | source list repo-verified + F2 rule; mapping UNAUTHORED |
| structuralVariableBoundary | PARTIAL | 5-way concentration + LABOR↔KNOWLEDGE/TECHNOLOGY/OWNERSHIP authored; MEDIA row + full 6×6 UNAUTHORED |

**Explicitly UNAUTHORED:** `signals` (F3), `sharpeningInputs`, `evidenceAttribution`
mapping, dimension `quality vs quantity of capacity`, the geographic-redistribution
and skill-mix-shift measures, subject-specific application.

**Nothing is AUTHORED for content. Nothing renders. Integration gated.**

---

## 13. Ratification Questions (Founder)

1. Does LABOR own **skill scarcity/surplus, capacity expansion/contraction,
   labor-market pressure, and geographic concentration/dispersion** as its
   primary structural vocabulary (SPEC II §8 Conditions)?
2. Are the three scarcity/surplus, expansion/contraction, concentration/dispersion
   axes each **one dimension with polarity** (recommendation)?
3. Is **"labor-market pressure"** an observation, a derived classification, or
   both kept distinct (F2 analog)?
4. Where do **labor-action events** (strikes, unionization) attach — to
   labor-market pressure, to their own dimension, or observation-class only?
5. Does **`quality vs quantity of capacity`** stay UNAUTHORED (recommendation)?
6. Is the **five-way concentration boundary** in §11 correct — workforce geography
   (LABOR) vs knowledge / capability / capital / control?
7. Is the **LABOR ↔ KNOWLEDGE** split correct (person/headcount → LABOR; carried
   specialized knowledge → KNOWLEDGE), including skill-scarcity vs
   expertise-scarcity?
8. Is the **LABOR ↔ TECHNOLOGY** split correct (substituting capability →
   TECHNOLOGY; workforce displacement/skill-demand → LABOR)?
9. What are the **geographic-redistribution** and **skill-mix-shift** measures?
   (Blocks `signals`.)
10. **Q8 — Reusability Across Analytical Scope:** identical `I_LABOR` for
    `A(LABOR, Field)` and `A(LABOR, Subject)`; scope via binding/context only.
    (`../SPEC-domain-substrate-integration-contract.md` AC.)

Until ratified, the Data Substrate may surface only ratified-PARTIAL portions —
currently **none**.
