# MEDIA — Domain Intelligence Primitive (`I_MEDIA`)

**Status:** DRAFT FOR FOUNDER RATIFICATION
**Version:** 0.1
**Domain:** MEDIA
**Parent:** `../SPEC-domain-intelligence-primitive-authoring.md` · `../SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `../SPEC-domain-substrate-integration-contract.md`
**Authoritative reference:** `../SPEC-observable-substrate-revelation-contract.md`
= **"SPEC II"**, §9 MEDIA — **LOCKED** (that doc, §16).
**Companions:** `CAPITAL.md` (RATIFIED), `OWNERSHIP.md`, `TECHNOLOGY.md`, `KNOWLEDGE.md`, `LABOR.md` (drafts) — boundaries in §11.
**Also:** `../SPEC-track2-structural-views.md` §8.2 — the DRIFT view depends on MEDIA (§11).

> **Authoring note.** Written by Claude at Founder direction, reconciling
> **SPEC II §9 (LOCKED)** + repo evidence into the `I_d` schema, with the
> CAPITAL/OWNERSHIP/TECHNOLOGY/KNOWLEDGE/LABOR discipline (F1–F7). **Not
> model-invented** — every field traces to SPEC II §9 or is `UNAUTHORED`;
> structuring choices flagged. This is the **sixth and final** `I_d` draft.
> For Founder ratification, **nothing renders**. No conclusion or forecast is implied.
>
> **Doctrinal note (load-bearing for MEDIA specifically):** MEDIA observes that a
> narrative *exists*, what it *claims*, and how it *propagates*. It **never treats
> narrative coherence as structural truth** ("don't confuse coherence with truth",
> CLAUDE.md §16). Whether a narrative is *right* is settled by the other five
> domains' structural evidence + `F`, not by MEDIA.

---

## 0. SPEC II §9 MEDIA (LOCKED), verbatim schema map

| SPEC II §9 field | content |
|---|---|
| Domain | Public attention, narrative, communication, and information propagation. |
| Observable Objects | stories; events; entities; attention metrics; narrative clusters; platforms; communication campaigns. |
| Observation Classes | measurable attention shifts; narrative launches or collapses; propagation events; platform or ownership changes that alter propagation; coordinated or emergent narrative formations. |
| Question | What is receiving attention, how is the narrative forming or fracturing, what is changing around it, and what does the change make more or less possible? |
| Conditions | attention concentration or diffusion; narrative coherence or contestation; propagation velocity; information asymmetry. |
| Relationships | Attention sources ↔ amplifiers ↔ audiences ↔ contested narratives ↔ underlying events in other domains that the narrative interprets or obscures. |
| Formation Contribution | attention monopolies; narrative polarization structures; propagation pathways that systematically favor or suppress certain observations. |
| Evidence | attention metrics; narrative content and timing; platform changes; relationships between media signals and observable events in other domains. |
| Unresolved | intentional versus emergent narrative; actual influence on other domains; durability of attention; conflicting signals across channels. |
| Cross-Domain Propagation | amplify or obscure observations originating in any of the other five domains; itself an input to Capital (sentiment-sensitive flows), Ownership (attention to control changes), Technology (attention to capabilities), Knowledge (attention to discoveries), Labor (attention to workforce events). |

SPEC II §11 (M&A test), MEDIA row: *"Attention and narrative form around the
transaction. Condition: narrative coherence or contestation regarding the meaning
of the control change."*

---

## 1. Domain Identity

**domain:** MEDIA

**Coordinate-axis claim.** MEDIA observes structural conditions concerning
**public attention, narrative, communication, and information propagation** —
what is attended to, how a narrative forms or fractures, and how information
spreads.

Axis boundary is **structural, not evidentiary**: a GDELT tone signal, a Reddit
propagation signal, an FEC PAC-ad-spend signal all feed MEDIA — and FEC also feeds
CAPITAL — but the same latent structural variable is attributed **once** (§11).

**Special position.** MEDIA is the domain whose observations are *about* the other
five. It observes the narrative layer; it does not adjudicate it (see the
doctrinal note above).

**Maturity:** AUTHORED — axis identity is verbatim SPEC II §9 "Domain" (LOCKED);
Founder ratification pending (§13).

---

## 2. Observes

MEDIA observes (SPEC II §9 Observable Objects + Observation Classes):

- **Attention shifts** — measurable change in how much attention an entity / event / topic receives.
- **Narrative launch / collapse** — a narrative cluster emerging or dissolving.
- **Propagation events** — how a story spreads across sources / platforms / audiences.
- **Propagation-structure change** — platform or ownership changes that alter *how* information propagates.
- **Narrative formation** — coordinated or emergent clustering of narratives around a subject.

**Maturity:** PARTIAL — traces to SPEC II §9 (LOCKED); pending the §3 dimension/signal
split and the §11 orthogonality check.

---

## 3. Signals

> **F3 — UNAUTHORED.** Candidate inventory from SPEC II §9 Observation Classes,
> not authored signals. A signal is a measurable quantity with a unit and 0–100
> normalization.

Candidate measurables (some already computed in-repo, normalized 0–100):
- **news tone / attention** per subject — `gdeltconnector.js` (`domain: 'MEDIA'`; weights by tone, negative tone → fracture polarity).
- **social propagation velocity** — `redditconnector.js` (`domain: 'MEDIA'`; post velocity × upvote quality, 24h).
- **PAC / campaign ad-spend velocity** as attention pressure — `fecconnector.js` (`domain: 'MEDIA'`, `signal * 0.85`; also feeds CAPITAL).
- attention-concentration index (share of attention held by top sources) — **no defined formula**.
- narrative-coherence measure (agreement vs contestation across sources) — **no defined formula**.
- information-asymmetry measure — **no wired source**.

Each must become a signal definition before this field reaches `PARTIAL`.

**Maturity:** UNAUTHORED (blocked by F3)

---

## 4. Structural Dimensions

**Ratified basis:** SPEC II §9 "Conditions" (LOCKED) — *attention concentration or
diffusion; narrative coherence or contestation; propagation velocity; information
asymmetry.* Per F3 each is the **axis**; its `signal` (§3) is separate.

### 4.1 Attention Concentration / Diffusion
Whether attention is concentrated on few subjects / held by few sources, or spread.
**Structuring note:** one dimension with polarity (`concentration` | `diffusion`),
per CLAUDE.md §16.
**Boundary (§11):** attention concentration is the **sixth and final** distinct
"concentration" latent variable (capital / control / capability / knowledge /
workforce-geography / attention).
Maturity: PARTIAL

### 4.2 Narrative Coherence / Contestation
Whether the narrative around a subject is coherent (sources converge on one
account) or contested (competing accounts).
**Doctrinal boundary (load-bearing):** MEDIA observes coherence as a **structural
property of the narrative**. It is **not** evidence that the narrative is *true*.
A highly coherent narrative can be structurally wrong; a contested one can contain
the correct account. Truth is settled by the other five domains + `F`, never by
this dimension. (CLAUDE.md §16.)
**Structuring note:** one dimension with polarity (`coherence` | `contestation`).
Maturity: PARTIAL

### 4.3 Propagation Velocity
The rate at which a narrative / story spreads across sources, platforms, audiences.
Repo precedent: `redditconnector.js` (post velocity), `gdeltconnector.js` (article
timing).
Maturity: PARTIAL

### 4.4 Information Asymmetry — MOVED TO §5 (edge-property)
**Ratified (CROSS-DOMAIN-CONSISTENCY §3, 2026-08-29):** "asymmetry" has no
field-level magnitude without naming the two parties → it is a **relationship
edge-property**, not a structural dimension. See §5 (`Attention sources ↔
audiences`). An aggregate "mean information asymmetry across observed edges" MAY be
a `signal`.

### 4.5 Intentional vs Emergent Narrative — HYPOTHESIS ONLY
SPEC II §9 "Unresolved" names "intentional versus emergent narrative" as an *open*
element. No available observable reliably distinguishes a coordinated campaign
from organic emergence.
**Maturity: UNAUTHORED.**

---

## 5. Relationships

Per F6, `I_MEDIA.relationships` is the **cross-domain admission set for `F`** — not
intra-domain pairs (§7).

SPEC II §9 Relationships + Cross-Domain Propagation:

- **Attention sources ↔ amplifiers ↔ audiences** — the propagation structure.
  **Edge attribute:** `informationAsymmetry` — how unevenly the relevant
  information is held between the two ends of an edge (moved here from §4.4).
- **Narrative ↔ contested narrative** — competing accounts of the same subject.
- **MEDIA ↔ underlying events in other domains** — the narrative *interprets or
  obscures* an event that is itself observed by CAPITAL / OWNERSHIP / TECHNOLOGY /
  KNOWLEDGE / LABOR. MEDIA admits the *relationship* (narrative-about-event); it
  does not admit a truth claim about the event.
- **MEDIA → Capital** (sentiment-sensitive flows), **→ Ownership** (attention to
  control changes), **→ Technology** (attention to capabilities), **→ Knowledge**
  (attention to discoveries), **→ Labor** (attention to workforce events).

Admission only; **synthesis is deferred to `F`** (integration contract D2). The
Formation Contributions (attention monopolies, polarization structures,
favoring/suppressing propagation pathways) are `F` outputs, not MEDIA conclusions.

**Maturity:** PARTIAL — traces to SPEC II §9 (LOCKED); pending §11 orthogonality check.

---

## 6. Relevance Conditions

A MEDIA observation is relevant to a subject when:

- the observed attention / narrative / propagation concerns the subject or its immediate structural environment;
- there is sufficient evidence to establish the MEDIA attribution;
- it materially concerns attention concentration/diffusion, narrative coherence/contestation, or propagation velocity (the §4 dimensions — `informationAsymmetry` is now an edge-property, §5; not the UNAUTHORED `intentional vs emergent`);
- temporal scope is compatible;
- it is not generic macro attention-cycle noise mis-attributed to the subject.

**Distinction:** macro attention environment vs. subject-specific narrative
position are materially different observations (parallel to CAPITAL §6).

**Maturity:** PARTIAL

---

## 7. Tension Patterns

Intra-MEDIA patterns (per F6, distinct from §5):

- **Coherence ↔ Contestation** — a dominant narrative is coherent while a contesting cluster grows.
- **Attention ↔ Durability** — attention spikes while it is unresolved whether the attention will persist (SPEC II §9 Unresolved: "durability of attention").
- **Coordinated ↔ Emergent** — a narrative shows coordination markers while whether it is intentional is not established.
- **Channel divergence** — different channels carry conflicting signals about the same subject (SPEC II §9 Unresolved: "conflicting signals across channels").

**Maturity:** PARTIAL

---

## 8. Missing Dimensions

SPEC II §9 "Unresolved" + repo state:

- **intentional vs emergent narrative** — no observable reliably distinguishes them;
- **actual influence on other domains** — whether a narrative actually moved capital / ownership / etc. is `F` / attribution territory, not a MEDIA observable;
- **durability of attention** — whether an attention spike persists;
- reconciliation of **conflicting signals across channels**;
- **defined measures** for attention concentration (§4.1), narrative coherence (§4.2), and aggregate information asymmetry across observed edges (§5);
- **subject-specific** MEDIA observations when the subject cannot be resolved to an observable entity / event / topic (subject-scoping contract).

**Maturity:** PARTIAL

---

## 9. Sharpening Inputs

Candidate resolution inputs (not claims they exist / suffice):
identified subject / entity / event / topic; relevant time window; named sources /
platforms / channels; the specific narrative cluster in question; the parties
between whom asymmetry is being assessed.

Pattern from repo: GDELT / Reddit / FEC connectors key attention to **topics /
entities**; a subject sharpens a MEDIA read by naming the topic and the channels.

**Maturity:** UNAUTHORED — candidate list; no authored contract; depends on subject-scoping.

---

## 10. Evidence Attribution

Source classes available to MEDIA (repo-verified):

- **GDELT** — global news tone / attention (`src/engine/connectors/gdeltconnector.js`, `domain: 'MEDIA'`; negative tone → fracture polarity).
- **Reddit** — social propagation velocity × upvote quality (`redditconnector.js`, `domain: 'MEDIA'`).
- **FEC** — PAC / campaign ad-spend velocity as attention pressure (`fecconnector.js`, `domain: 'MEDIA'` at `signal * 0.85`; also feeds CAPITAL — shared evidence, see §11).
- **Signal genealogy** — `src/engine/signalgenealogy.js` (narrative / signal provenance tracing).

**Attribution rule (F2 analog).** Raw media activity (an article count, a tone
score, an upvote velocity) is an observation. A derived classification ("narrative
contestation level", "attention monopoly") retains its calculation and provenance
and never replaces the underlying quantity. **And** a derived narrative-coherence
score is never promoted to a truth claim (§4.2).

SPEC II §9 Evidence: attention metrics; narrative content and timing; platform
changes; relationships between media signals and observable events in other domains.

**Maturity:** PARTIAL — source list repo-verified + F2 rule; the
source→structural-variable mapping is UNAUTHORED (pending §11).

---

## 11. Structural Variable Boundary

**MEDIA owns:** structural variables concerning **attention and narrative** — how
much attention a subject receives, how coherent or contested the narrative is, how
fast it propagates, and how unevenly the relevant information is held.

**MEDIA does not own:**
- the capital movement a narrative is about → CAPITAL (incl. sentiment-driven flows *as a CAPITAL observation*; MEDIA owns the attention, CAPITAL owns the flow)
- the control change a narrative is about → OWNERSHIP
- the capability a narrative is about → TECHNOLOGY
- the discovery a narrative is about → KNOWLEDGE
- the workforce event a narrative is about → LABOR
- **the truth of the narrative** → the other five domains' structural evidence + `F`

### The six "concentration" latent variables — complete set (load-bearing)

| observation | latent variable | axis |
|---|---|---|
| attention held by few subjects / sources | **attention concentration** | MEDIA |
| workforce for an occupation concentrated in few regions | **workforce geographic concentration** | LABOR (`LABOR.md §11`) |
| expertise / research pooled in few holders | **knowledge concentration** | KNOWLEDGE (`KNOWLEDGE.md §11`) |
| a capability held in few platforms / standards | **capability concentration** | TECHNOLOGY (`TECHNOLOGY.md §11`) |
| capital massed in few vehicles | **capital concentration** | CAPITAL (`CAPITAL.md §11`, ratified) |
| control held by few owners | **control concentration** | OWNERSHIP (`OWNERSHIP.md §11`) |

Six domains, six distinct concentration latent variables. Shared evidence
permitted; each attributed **once** (§18). **This table is now complete and should
anchor the cross-domain consistency pass.**

### MEDIA ↔ every other domain — the "attention to X" rule

For any observation of the form *"attention to / narrative about X"*: **X belongs
to its own domain; the attention / narrative belongs to MEDIA.** One event, two
axes. MEDIA never re-counts X's structural variable; the other domain never counts
the attention.

### MEDIA ↔ the DRIFT structural view (Track #2)

`SPEC-track2-structural-views.md` §8.2 locked: *MEDIA observes the narrative
substrate; DRIFT compares that substrate against observed structural evidence.*
MEDIA provides **one side** of the DRIFT comparison (the narrative). MEDIA does
**not** perform the comparison, and DRIFT is **not** a second MEDIA primitive.

### MEDIA ↔ OWNERSHIP (propagation control)

SPEC II §9 Observation Class "platform or ownership changes that alter
propagation": the **ownership / platform change** is OWNERSHIP; its **effect on
how information propagates** is MEDIA.

Shared evidence permitted; cross-domain correlation legitimate and necessary for
STRUCTURE / FORMATION.

**Maturity:** PARTIAL — the complete 6-way concentration table + the "attention to
X" rule + the DRIFT boundary are authored against the locked sources; the full
6×6 pairwise matrix (`../SPEC-domain-intelligence-primitive-authoring.md` §6) is
the **cross-domain consistency pass**, now unblocked (all six `I_d` exist).

---

## 12. Maturity Summary

| Field | Mark | Basis / blocker |
|---|---|---|
| observes | PARTIAL | SPEC II §9 Observable Objects + Observation Classes (LOCKED) |
| signals | **UNAUTHORED** | F3 — not split; GDELT/Reddit/FEC signals exist but not authored as `I_d` signal defs; concentration + coherence + asymmetry measures undefined |
| structuralDimensions | PARTIAL | SPEC II §9 Conditions (LOCKED): attention concentration/diffusion, narrative coherence/contestation, propagation velocity. `intentional vs emergent` **UNAUTHORED** (§4.5). `information asymmetry` moved to `relationships` as an edge-property (§4.4, ratified). |
| relationships | PARTIAL | SPEC II §9 Relationships + Cross-Domain Propagation (LOCKED); cross-domain admission set only (F6); no truth claims about the events narrated |
| relevanceConditions | PARTIAL | partial trace to SPEC II §9; macro-vs-subject distinction authored |
| tensionPatterns | PARTIAL | intra-MEDIA; inherits §4 maturity |
| missingDimensions | PARTIAL | SPEC II §9 Unresolved (LOCKED) |
| sharpeningInputs | **UNAUTHORED** | candidate list only; depends on subject-scoping |
| evidenceAttribution | PARTIAL | source list repo-verified + F2 rule (incl. coherence ≠ truth); mapping UNAUTHORED |
| structuralVariableBoundary | PARTIAL | 6-way concentration table complete + "attention to X" rule + DRIFT boundary authored; full 6×6 pairwise matrix = the consistency pass |

**Explicitly UNAUTHORED:** `signals` (F3), `sharpeningInputs`, `evidenceAttribution`
mapping, dimension `intentional vs emergent narrative`, the attention-concentration
/ narrative-coherence / asymmetry measures, subject-specific application.

**Nothing is AUTHORED for content. Nothing renders. Integration gated.**

---

## 13. Ratification Questions (Founder)

1. Does MEDIA own **attention concentration/diffusion, narrative
   coherence/contestation, and propagation velocity** as its primary structural
   vocabulary (SPEC II §9 Conditions)? (`information asymmetry` is now an
   edge-property, §5 — ratified.)
2. Are the polarised axes (concentration/diffusion, coherence/contestation) each
   **one dimension with polarity** (recommendation)?
3. Is **narrative coherence** locked as a structural property only, **never** a
   truth signal (§4.2 doctrinal boundary)?
4. *(resolved — `information asymmetry` → edge-property, CROSS-DOMAIN-CONSISTENCY §3.)*
5. Does **`intentional vs emergent narrative`** stay UNAUTHORED (recommendation)?
6. Is the **"attention to X" rule** in §11 correct — X to its own domain, the
   attention/narrative to MEDIA, each attributed once?
7. Is the **MEDIA ↔ DRIFT** boundary correct — MEDIA provides the narrative side;
   DRIFT (a Track #2 view) does the comparison; DRIFT ≠ a second MEDIA primitive?
8. Is the **complete six-way concentration table** in §11 ratified as the anchor
   for the cross-domain consistency pass?
9. What are the **attention-concentration, narrative-coherence, and
   information-asymmetry measures**? (Blocks `signals`.)
10. **Q8 — Reusability Across Analytical Scope:** identical `I_MEDIA` for
    `A(MEDIA, Field)` and `A(MEDIA, Subject)`; scope via binding/context only.
    (`../SPEC-domain-substrate-integration-contract.md` AC.)

Until ratified, the Data Substrate may surface only ratified-PARTIAL portions —
currently **none**.

---

## 14. Cross-domain consistency pass — DONE & RATIFIED

`CROSS-DOMAIN-CONSISTENCY.md` v1.0 (RATIFIED 2026-08-29). Outcome: 15-pair matrix
all Separate; six concentration variables demonstrated distinct; the
dimension-vs-edge rule ratified as a general ontology rule (and applied here —
`information asymmetry` moved to §5); `⋃_d I_d.relationships` closed at 15
cross-domain types.

**State:** ontology consistency CLOSED · Formation admission vocabulary CLOSED ·
signal authorship/measurement OPEN · shared-source facet verification OPEN
(integration AC) · integration GATED.
