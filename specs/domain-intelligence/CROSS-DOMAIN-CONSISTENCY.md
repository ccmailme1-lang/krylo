# Cross-Domain Consistency Pass — the six `I_d`

**Status:** **RATIFIED — Founder decision 2026-08-29.** Establishes the ontology
and admission architecture. Does **not** establish the measurable signal layer —
`UNAUTHORED signal → integration blocked` still holds; a connector's existing
number does not become an implicitly authored structural signal.
**Version:** 1.0
**Inputs:** `CAPITAL.md` (RATIFIED), `OWNERSHIP.md`, `TECHNOLOGY.md`, `KNOWLEDGE.md`,
`LABOR.md`, `MEDIA.md` (drafts) + SPEC II §§5–11 (LOCKED).
**Governs:** `../SPEC-domain-intelligence-primitive-authoring.md` §6 (6×6 matrix),
§7 (`⋃ I_d.relationships`); frozen arch §18 (orthogonal axis integrity).

Four questions:
1. The 6×6 structural-variable boundary matrix (§1).
2. Are the six "concentration" latent variables genuinely distinct? (§2)
3. One rule for the dimension-vs-relationship-edge items. (§3)
4. `⋃_d I_d.relationships` — the closed admission set for `F`. (§4)

---

## 1. The 6×6 boundary matrix

Abbrev: CAP OWN TECH KNOW LAB MED. All 15 pairs. Format: shared observable /
collision point → owner split → **dependency** (Independent / **Partial** / Full,
§18) → **action**.

| pair | shared collision point | owner split | dep | action |
|---|---|---|---|---|
| **CAP↔OWN** | a fund/SPV/vehicle; an M&A filing; "concentration" | capital massing, financing of a deal → CAP · control locus, change in control → OWN. *Vehicle: holds-capital → CAP; controls-vehicle → OWN.* | Partial | **Separate** (ratified, CAPITAL.md §11) |
| **CAP↔TECH** | R&D spend; PatentsView (→TECH/OWN/CAP) | capital deployed to R&D → CAP · the resulting capability → TECH | Partial | **Separate** — facet split on PatentsView (total spend vs cluster velocity) |
| **CAP↔KNOW** | research-funding disclosures | the money → CAP · the research produced → KNOW | Partial | **Separate** |
| **CAP↔LAB** | labor cost; automation capex vs headcount; "capital that substitutes/complements labor" | the cost/investment figure → CAP · the capacity change → LAB | Partial | **Separate** |
| **CAP↔MED** | FEC PAC ad-spend (→CAP/MED); sentiment-driven flows | the actual flow (even if sentiment-driven) → CAP · the attention / ad-spend-as-pressure → MED | Partial | **Separate** — "attention to X" rule, X = the flow |
| **OWN↔TECH** | patent/IP; "capability changes hands" | who controls the IP/platform → OWN · the capability → TECH | Partial | **Separate** |
| **OWN↔KNOW** | IP, patents; "IP becomes controlled" (SPEC II M&A) | control of the IP → OWN · the knowledge in it → KNOW | Partial | **Separate** |
| **OWN↔LAB** | Census (→LAB/OWN); "ownership structures that control capacity"; org restructuring | control of the establishment → OWN · the workforce capacity → LAB | Partial | **Separate** — facet split on Census (establishment ownership vs workforce counts) |
| **OWN↔MED** | "platform/ownership changes that alter propagation"; "attention to control changes" | the control/platform change → OWN · effect on propagation + the attention → MED | Partial | **Separate** — "attention to X" rule |
| **TECH↔KNOW** ⚠ | a **patent** (capability disclosure AND knowledge artifact); "technical knowledge transfer" | protected/enabled capability, capability concentration → TECH · embodied research/expertise, whether expertise moves (inventor migration), knowledge concentration → KNOW | Partial | **Separate** — explicit split ratified in both drafts |
| **TECH↔LAB** ⚠ | automation; "skill-demand shifts"; "capability that substitutes/complements labor" | the substituting/complementing capability → TECH · workforce displacement, skill-demand shift, headcount → LAB | Partial | **Separate** — the classic second-order effect; capability → TECH, workforce consequence → LAB |
| **TECH↔MED** | "attention to capabilities" (hype cycles) | capability, adoption → TECH · attention/narrative about it → MED | Partial (reflexive: attention can drive adoption) | **Separate** — "attention to X"; coherence ≠ truth (hype ≠ adoption) |
| **KNOW↔LAB** ⚠ | "talent movement carrying specialized knowledge" — SPEC II lists this obs class under **both** §7 and §8; scarcity | the person / headcount / skill capacity, skill-scarcity (*workers* scarce), workforce-geo concentration → LAB · the carried specialized knowledge, whether expertise moves, expertise-scarcity (*knowledge* scarce), knowledge concentration → KNOW | Partial | **Separate** — split ratified in both drafts; skill-scarcity ≠ expertise-scarcity |
| **KNOW↔MED** | "attention to discoveries or controversies" | the discovery, knowledge creation → KNOW · attention/controversy about it → MED | Partial | **Separate** — "attention to X" rule |
| **LAB↔MED** | "attention/narrative around employment or labor conflict"; labor-action events | the labor action / employment event, capacity change → LAB · attention/narrative → MED | Partial | **Separate** — "attention to X" rule |

**Result: all 15 pairs → Separate + attribute-once. Zero pairs are Fully
Dependent** (no axis is a function of another). All are Partially Dependent —
expected: SPEC II §3 says the six are *observational cuts through one world*, so
they co-move by design. Co-movement is a necessary input to `F`, not a defect
(frozen arch §9).

**Three ⚠ HIGH-risk pairs** — TECH↔KNOW (patents), TECH↔LAB (automation
displacement), KNOW↔LAB (talent movement). Each has a single observation
class/artifact that genuinely spans both. All three carry an explicit split in the
drafts; the consistency requirement is that the split language is **identical on
both sides** (verified — it is, cross-referenced).

**Shared-connector audit (follow-on, not this pass):** three connectors dispatch
one signal to multiple domains — `patentsviewconnector.js` → `['TECHNOLOGY',
'OWNERSHIP','CAPITAL']`, `censusconnector.js` → LABOR + OWNERSHIP,
`fecconnector.js` → CAPITAL + MEDIA. Each must be shown to dispatch a **distinct
facet** to each domain (total vs cluster vs assignee; establishment vs workforce;
flow vs ad-spend), not the same number re-labelled. Flagged for the integration
phase.

---

## 2. The six "concentration" latent variables — distinct?

| # | latent variable (axis) | "concentrated" = | measured over |
|---|---|---|---|
| 1 | capital concentration (CAP) | capital massed in few vehicles/holders | $ amounts, vehicle count |
| 2 | control concentration (OWN) | control/voting/beneficial ownership held by few | control instruments, ownership % |
| 3 | capability concentration (TECH) | a capability held in few platforms/standards/holders | platforms, standards, assignees |
| 4 | knowledge concentration (KNOW) | expertise/research pooled in few institutions/people | institutions, authors, citations |
| 5 | workforce geographic concentration (LAB) | an occupation's workforce in few regions | geographies, headcount by region |
| 6 | attention concentration (MED) | attention held by few subjects/sources | attention share, source count |

**§18 test — is any expressible as a function of another?** No.
- A widely-held public company: concentrated capital (large cap), diffuse control.
- EUV lithography: concentrated capability (≈1 firm), diffuse knowledge (physics published).
- Silicon Valley: concentrated tech workforce geography, globally diffuse tech capital/knowledge.
- A media-dominant subject can have diffuse capital/control/capability.

They **co-vary** (a dominant entity scores high on several) but each is measured
over a **different population** and none reduces to another. **Distinct
attributions — passes §18.**

**Invariant to ratify:** *a concentration reading derived from evidence source S
is attributed to exactly one axis. Any other axis that reads "concentration" from
S must derive it from a different facet of S or a different source — never the
same figure re-labelled.* (This is the §1 shared-connector audit made a rule.)

---

## 3. Dimension vs relationship edge-property — one rule

Flagged in the drafts: `technological dependency` (TECH §4.5),
`transfer friction` (KNOW §4.3), `information asymmetry` (MED §4.4). Each is only
meaningful **relative to a named pair of parties**.

**Proposed rule (RATIFY):**

> A candidate is a **domain dimension** only if it has a field/subject-level
> **magnitude** (and, where applicable, polarity) that is meaningful **without
> naming a counterparty**. Otherwise it is a **relationship edge-property** —
> it lives in `I_d.relationships` as a typed-edge attribute, not in
> `structuralDimensions`. The domain MAY still carry an *aggregate* of the edge
> property as a **signal** (e.g. "mean transfer friction across observed edges"),
> but the primitive is the edge attribute.

**Applying it:**

| candidate | field-level magnitude without a counterparty? | disposition |
|---|---|---|
| `technological dependency` (TECH) | no — "X depends on Y" needs both | → **edge-property** on `Technology ↔ adopters` / `↔ enabling infrastructure`. Remove from TECH `structuralDimensions`. Aggregate "dependency density" allowed as a signal. |
| `transfer friction` (KNOW) | no — resistance "X → Y" needs both | → **edge-property** on `Producers ↔ carriers ↔ holders`. Remove from KNOW `structuralDimensions`. |
| `information asymmetry` (MED) | no — unevenness "between A and B" needs both | → **edge-property** on `Attention sources ↔ audiences`. Remove from MED `structuralDimensions`. |

**Counter-check — do any *ratified* dimensions fail this test?** `CAPITAL.Flow`,
`CAPITAL.Reallocation`, `KNOWLEDGE.Diffusion rate` are directional but have a
sensible **net field-level reading** ("capital is flowing out of the sector", "the
field is diffusing fast") and carry polarity. They pass — they stay dimensions.
The failing three have **no polarity and no aggregate meaning** without endpoints.

If the Founder ratifies the rule, the three drafts get the identical edit;
CAPITAL is unaffected.

---

## 4. `⋃_d I_d.relationships` — closed admission set for `F`

`F` may admit **only** the relationship types below. Compiled from the six §5
sections; every pair is named by both sides (symmetric, no orphans).

### 4a. Cross-domain pair types (15) — the F admission set

| # | pair | relationship type |
|---|---|---|
| 1 | CAP↔OWN | financing of control / control financed |
| 2 | CAP↔TECH | capability funded / R&D capital intensity |
| 3 | CAP↔KNOW | research financed |
| 4 | CAP↔LAB | investment in / cost of capacity |
| 5 | CAP↔MED | sentiment-sensitive flow / attention to a capital event |
| 6 | OWN↔TECH | control of IP or platform |
| 7 | OWN↔KNOW | control of IP / expertise |
| 8 | OWN↔LAB | control of organizational capacity |
| 9 | OWN↔MED | propagation control / attention to a control change |
| 10 | TECH↔KNOW | knowledge amplifies capability / capability embodies expertise |
| 11 | TECH↔LAB | substitution or complementarity (automation) |
| 12 | TECH↔MED | attention to a capability |
| 13 | KNOW↔LAB | embodied-expertise movement / labor market depends on expertise |
| 14 | KNOW↔MED | attention to a discovery or controversy |
| 15 | LAB↔MED | attention to a workforce event / labor conflict |

`F` admits no cross-domain relationship type outside these 15. Direction is
tracked per instance; the *type* set is closed.

### 4b. Intra-domain relationship structures (consumed as the internal shape of each `A(d, Subject)`, not cross-domain admissions)

- CAP: sources ↔ intermediaries ↔ recipients ↔ asset classes
- OWN: acquirer ↔ target ↔ controlled assets
- TECH: technology ↔ adopters ↔ displaced alternatives ↔ enabling infrastructure
- KNOW: producers ↔ carriers ↔ institutional holders
- LAB: workers ↔ employers ↔ skill requirements ↔ locations
- MED: attention sources ↔ amplifiers ↔ audiences; narrative ↔ contested narrative

### 4c. One external boundary reference

`OWNERSHIP ↔ regulatory / jurisdictional boundaries` (SPEC II §10). **Recommendation:**
`F` references a regulatory/jurisdictional boundary as a *condition on* a
relationship, **not** as a seventh node type. It is not a domain and does not get
an `I_d`.

---

## 5. Founder decisions — RATIFIED 2026-08-29

1. **15-pair matrix (§1) — RATIFIED.** All Separate + attribute-once; the three
   ⚠ splits stand. Not to be reopened because names sound close — every pair has
   an owner, the split is explicit, the union has no orphans. The next question
   is empirical (can integration produce the distinct observations), a different
   gate.
2. **Concentration invariant (§2) — RATIFIED.** Orthogonality demonstrated via
   different measurement populations, not asserted. One facet/source per axis; no
   re-labelled figure.
3. **Dimension-vs-edge rule (§3) — RATIFIED as a GENERAL ONTOLOGY RULE**
   (`../SPEC-domain-intelligence-primitive-authoring.md`, added to §2.1). Applied:
   `technological dependency`, `transfer friction`, `information asymmetry` move
   out of `structuralDimensions` into `relationships` as typed-edge attributes
   (edits committed to TECHNOLOGY.md / KNOWLEDGE.md / MEDIA.md). CAPITAL
   `Flow`/`Reallocation` unaffected.
4. **`⋃_d I_d.relationships` — RATIFIED CLOSED** at the 15 cross-domain
   relationship types (§4a). Intra-domain structure stays inside `A(d, Subject)`
   (§4b); regulatory/jurisdictional context is a relationship *condition*, not a
   seventh node (§4c). Constraint on `F`: **may infer from admitted relationships,
   may not invent an unadmitted relationship type because the evidence looks
   narratively compelling.**

### Scope architecture untouched

```
Six I_d → pairwise boundaries → orthogonal concentration vars → consistent
dimension/edge rule → closed relationship vocabulary → F
```
runs alongside, unchanged:
```
I_d → A(d, Field) → A(d, Subject)
```

### State after ratification

| item | state |
|---|---|
| Track #3 — ontology consistency | **CLOSED** |
| six `I_d` — structural consistency | **CLOSED** (drafts consistent; per-field `AUTHORED` promotions still Founder-side) |
| Formation admission vocabulary | **CLOSED** — 15 types |
| signal authorship / measurement | **OPEN** — every `signals` field `UNAUTHORED`; concentration *measures* undefined |
| shared-source facet verification | **OPEN** — PatentsView / Census / FEC, now an integration AC (`../SPEC-domain-substrate-integration-contract.md`) |
| integration | **GATED** |

Transition: from *"what are the six domains and how do they relate?"* → *"can the
implementation faithfully instantiate what is now formally defined?"*
