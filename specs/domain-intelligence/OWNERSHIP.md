# OWNERSHIP — Domain Intelligence Primitive (`I_OWNERSHIP`)

**Status:** DRAFT FOR FOUNDER RATIFICATION
**Version:** 0.1
**Domain:** OWNERSHIP
**Parent:** `../SPEC-domain-intelligence-primitive-authoring.md` · `../SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `../SPEC-domain-substrate-integration-contract.md`
**Authoritative reference:** `../SPEC-observable-substrate-revelation-contract.md`
= **"SPEC II"**, §10 OWNERSHIP — **LOCKED** (that doc, §16).
**Companion:** `CAPITAL.md` (RATIFIED) — the boundary between the two is load-bearing (§11).

> **Authoring note.** This draft was written by Claude at Founder direction
> (2026-08-29), reconciling **SPEC II §10 (LOCKED)** + repo evidence into the
> `I_d` schema, applying the discipline ratified on CAPITAL (F1–F7). It is
> **not model-invented content** — every field is traced to SPEC II §10 or marked
> `UNAUTHORED`. Structuring choices (vs. transcription) are flagged. Same status
> CAPITAL held at v0.1: **for Founder ratification, nothing renders.**
> No conclusion, valuation, or forecast is implied.

---

## 0. SPEC II §10 OWNERSHIP (LOCKED), verbatim schema map

| SPEC II §10 field | content |
|---|---|
| Domain | Control, possession, acquisition, disposition, and institutional boundaries. |
| Observable Objects | legal entities; equity and asset holdings; beneficial owners; transaction records; corporate control instruments; institutional boundaries. |
| Observation Classes | acquisitions; divestitures; mergers; changes in control; equity or asset transfers; institutional boundary shifts; new entities; spin-outs; consolidations; measurable changes in ownership concentration. |
| Question | What changed hands or control, what is changing around that shift, and what does the change make possible or constrain? |
| Conditions | control concentration or diffusion; ownership stress; institutional re-bounding; strategic repositioning of control. |
| Relationships | Acquirer ↔ target ↔ capital sources ↔ controlled assets (technology, knowledge, labor, etc.) ↔ regulatory or jurisdictional boundaries. |
| Formation Contribution | vertical consolidation; horizontal consolidation; platform control structures; cross-domain ownership clusters; defensive ownership repositioning. |
| Evidence | SEC filings; beneficial-ownership disclosures; transaction records; control-change announcements; subsequent asset/control changes; cross-domain corroboration. |
| Unresolved | ultimate beneficial control; secondary effects not yet visible; regulatory outcomes; incomplete or conflicting disclosure. |
| Cross-Domain Propagation | Capital (financing of the transaction), Technology (capability changing hands), Knowledge (IP or expertise transfer), Labor (organizational-capacity change), Media (attention and narrative). |

SPEC II §11 (M&A canonical test) adds OWNERSHIP's role in a multi-domain event:
*"Company A announces acquisition of Company B. Condition: control concentration
increasing. Formation contribution: potential horizontal consolidation across a
capability category."*

---

## 1. Domain Identity

**domain:** OWNERSHIP

**Coordinate-axis claim.** OWNERSHIP observes structural conditions concerning
**control, possession, acquisition, disposition, and institutional boundaries** —
who holds or controls what, and how that changes.

Axis boundary is **structural, not evidentiary**: sources may be shared with other
domains (a single SEC filing feeds OWNERSHIP and CAPITAL), but the same latent
structural variable is not counted as independent support across axes (§11).

**Maturity:** AUTHORED — axis identity is verbatim SPEC II §10 "Domain" (LOCKED);
Founder ratification pending (§13).

---

## 2. Observes

OWNERSHIP observes (SPEC II §10 Observable Objects + Observation Classes):

- **Changes in control** — acquisitions, mergers, changes in control, consolidations.
- **Ownership transfers** — equity or asset transfers, divestitures, spin-outs.
- **Ownership concentration** — measurable changes in ownership/control concentration.
- **Institutional boundary shifts** — new entities, institutional re-bounding, boundary changes.
- **Control-instrument activity** — corporate control instruments (voting structures, board control, control agreements) where disclosed.
- **Beneficial-owner structure** — beneficial owners and holdings where disclosed.

**Maturity:** PARTIAL — traces to SPEC II §10 (LOCKED); pending the §3 dimension/signal
split and the §11 orthogonality check.

---

## 3. Signals

> **F3 — UNAUTHORED.** Same finding as CAPITAL §3: this is a candidate inventory
> from SPEC II §10 "Observation Classes", **not** authored signals. A signal must be
> a measurable quantity with a unit and 0–100 normalization. None below has that.

Candidate measurables to author (from Observation Classes):
- rate / count of control-change events (acquisitions, mergers, divestitures) in the window;
- an ownership-concentration measure (e.g. top-holder share, or an HHI-style index) — **needs a defined, uniform formula**;
- transaction value where disclosed (raw quantity, not a classification);
- count of new-entity / spin-out / consolidation events;
- beneficial-ownership disclosure activity (13D/13G filing rate).

Each must become a signal definition (`name`, what it measures, unit, 0–100
normalization) before this field reaches `PARTIAL`.

**Maturity:** PARTIAL — the **concentration** signal is now AUTHORED (§3.1);
the rest remain UNAUTHORED (WO-1 Class E, pending Founder authorship).

### 3.1 Signal — `ownership_concentration_top_holder_share` (AUTHORED, Founder 2026-08-30)

| field | value |
|---|---|
| **name** | `ownership_concentration_top_holder_share` |
| **measure** | OWNERSHIP concentration — top-holder control share |
| **question** | How much control over the subject is held by the largest controlling holder? |
| **definition** | Share of the subject's **control rights** attributable to the single largest holder, measured from voting, beneficial-ownership, or equivalent control instruments. |
| **formula** | `ownership_concentration_top_holder_share = max(holder_control) / Σ(holder_control) × 100` |
| **population** | identified holders of control over the relevant subject / entity / asset population. |
| **unit** | % of control; normalization is identity → already `0–100`. |
| **polarity** | higher = more concentrated control · lower = more distributed control. (A "concentrated vs distributed" *band* is a separate calibration, not part of this measure.) |
| **provenance (required)** | holder identity · control instrument / type · control percentage or equivalent measure · as-of date · source filing / record · subject / entity identifier · calculation inputs sufficient to re-derive the result · `source_set_hash` / independence metadata (`signalfacet.js` contract). |
| **missing-data rule** | insufficient holder / control coverage → **no measure** (`absenceClass: structural`). Never estimate, infer, zero-fill, or substitute capital share for control share. |

**Boundary (six-way concentration invariant, ratified §11):** this measures
**control concentration** — the largest holder's share of *control rights*. It is
**not** economic capital concentration (CAPITAL). A holder may control an entity
without holding the largest economic capital share, and vice versa. Where one
filing reports both, OWNERSHIP reads the *control* share and CAPITAL reads the
*economic capital* share — distinct facets of the same source (§2 invariant),
neither relabelling the other's number.

**Field-level magnitude:** this is a subject-level magnitude — it does not require
naming a counterparty to have meaning — so it passes the dimension-vs-edge rule
from the cross-domain consistency pass.

**Precedent:** the top-N concentration ratio (CR-n; here CR-1) applied to control
rights rather than economic capital — a standard concentration construct, cited
convention.

**Data state:** the *measure* is authored. **No current OWNERSHIP connector
produces holder-level control shares** (SEC 13D/13G, EDGAR 8-K, Companies House,
FEC, Census emit events/rates, not a control-share denominator) — the data source
is WO-1 **Class D** (a compliant beneficial-ownership / voting-control source must
be wired). Until then, this signal renders `absenceClass: structural`.

---

## 4. Structural Dimensions

**Ratified basis:** SPEC II §10 "Conditions" (LOCKED) — *control concentration or
diffusion; ownership stress; institutional re-bounding; strategic repositioning of
control.* Per F3, each is the **axis**; its measurable `signal` (§3) is separate.

### 4.1 Control Concentration / Diffusion
Where control accumulates (concentration) or disperses (diffusion).
**Structuring choice (flagged):** SPEC II §10 phrases this as one condition
"concentration **or** diffusion" — recommend **one dimension with polarity**
(`concentration` | `diffusion`), per CLAUDE.md §16 (every domain pressure signal
carries magnitude AND polarity). Founder to confirm (analogous to CAPITAL Q2).
**Boundary:** concentration of **control** — distinct from CAPITAL.Concentration
(concentration of **capital**). See §11.
Maturity: PARTIAL

### 4.2 Ownership Stress
Stress in the ownership/control structure (contested control, forced disposition,
distressed transfer).
**Boundary (F2 analog):** the raw observation (a contested filing, a forced sale)
is an observation; "ownership stress" as a *classification* is derived and retains
its provenance — it never replaces the observed facts. Not synonymous with a
generic macro "pressure".
Maturity: PARTIAL

### 4.3 Institutional Re-bounding
Observable shifts in institutional boundaries — new entities, spin-outs,
consolidations, boundary redefinition.
Maturity: PARTIAL

### 4.4 Strategic Repositioning of Control
Observable repositioning of control toward a structural objective (defensive
repositioning, platform control-building, vertical/horizontal alignment).
**Note:** SPEC II §10 Formation Contribution lists the *formations* this dimension
feeds (vertical / horizontal consolidation, platform control structures) — those
are `F` outputs, not OWNERSHIP conclusions (F6).
Maturity: PARTIAL

### 4.5 Ultimate Beneficial Control — HYPOTHESIS ONLY
SPEC II §10 "Unresolved" names "ultimate beneficial control" as an *open* element,
not an established structural variable. Disclosure is frequently incomplete.
**Maturity: UNAUTHORED.**

---

## 5. Relationships

Per F6, `I_OWNERSHIP.relationships` is the **cross-domain admission set for `F`** —
not intra-domain pairs (those go to §7 `tensionPatterns`).

SPEC II §10 Relationships + Cross-Domain Propagation:

- **Acquirer ↔ target ↔ controlled assets** — the control-change relation.
- **Ownership ↔ Capital** — financing of the transaction (SPEC II §11: "transaction financing, payment structure").
- **Ownership ↔ Technology** — a capability / platform changing control.
- **Ownership ↔ Knowledge** — IP or specialized expertise coming under control.
- **Ownership ↔ Labor** — organizational-capacity change from a control shift.
- **Ownership ↔ Media** — attention / narrative around the control change.
- **Ownership ↔ regulatory / jurisdictional boundaries** — where a control change engages a regulator or crosses a jurisdiction.

Admission only; **synthesis of these is deferred to `F`** (integration contract D2).

**Maturity:** PARTIAL — traces to SPEC II §10 (LOCKED); pending §11 orthogonality check.

---

## 6. Relevance Conditions

An OWNERSHIP observation is relevant to a subject when:

- the observed control / possession / transfer is attributable to the subject or its immediate structural environment;
- there is sufficient evidence to establish the OWNERSHIP attribution;
- it materially concerns control concentration/diffusion, ownership stress, institutional boundaries, or repositioning of control (the §4 axes — not the UNAUTHORED `ultimate beneficial control`);
- temporal scope is compatible with the requested observation;
- it is not a generic macro condition mis-attributed to the subject.

**Distinction:** macro ownership environment vs. entity-specific control structure
are materially different observations (parallel to CAPITAL §6).

**Maturity:** PARTIAL

---

## 7. Tension Patterns

Intra-OWNERSHIP patterns (per F6, distinct from §5 `relationships`):

- **Concentration ↔ Diffusion** — control appears to concentrate while parts of it disperse (partial divestiture during a roll-up).
- **Disclosed control ↔ Ultimate beneficial control** — the disclosed structure is measurable while the ultimate controller is not established (SPEC II §10 Unresolved).
- **Announced ↔ Consummated** — a control change is announced but not yet completed / cleared.
- **Control change ↔ Regulatory outcome** — control shifts while the regulatory result is unresolved.

**Maturity:** PARTIAL

---

## 8. Missing Dimensions

SPEC II §10 "Unresolved" + repo state:

- **ultimate beneficial control** where disclosure is incomplete or layered;
- **secondary structural effects** of a control change not yet observable;
- **regulatory outcomes** still pending;
- reconciliation of **incomplete or conflicting disclosure** across sources;
- **subject-specific** OWNERSHIP observations when the searched subject cannot be resolved to an observable entity (subject-scoping contract).

Not estimates — these are declared open by the locked source.

**Maturity:** PARTIAL

---

## 9. Sharpening Inputs

Candidate resolution inputs (not claims they exist or suffice):
identified entity (acquirer / target / holder); named transaction; relevant time
window; disclosure documents (13D/13G, merger filing, 8-K); jurisdiction;
control-instrument detail (voting vs economic ownership).

Pattern from the entity-identity precedent (`entityresolution.js` / ERK,
`entitytopologyregistry.js`): entity-specific control observation should be tied
to a canonical entity (CIK-anchored where available), provenance, and an as-of date.

**Maturity:** UNAUTHORED — candidate list; no authored contract; depends on
subject-scoping.

---

## 10. Evidence Attribution

Source classes available to OWNERSHIP (repo-verified):

- **SEC Schedule 13D/13G** — beneficial ownership (`src/engine/connectors/secownershipconnector.js`, `domain: 'OWNERSHIP'`, → RelationCore/M7 admission, `DEPENDS_ON` relation).
- **SEC 8-K** — material events incl. control changes (`edgar8kconnector.js` / `edgar8kevidence.js` / `edgar8ksignal.js`).
- **EDGAR narrative** — `edgarnarrativeconnector.js`.
- **UK Companies House** — directors / ownership (`companieshouseconnector.js`).
- **FEC** — entity/affiliation (`fecconnector.js`).
- **Census / Maersk** — noted as OWNERSHIP-convention connectors (`secownershipconnector.js` header).
- **Entity identity** — CIK-anchored via ERK (`entityresolution.js`, `entitytopologyregistry.js`, `chokepointedges.js`).

**Attribution rule (F2 analog).** A raw disclosure is an observation. A derived
classification ("ownership stress", "control concentration level") retains its
calculation and provenance and never replaces the underlying disclosure.

SPEC II §10 Evidence: SEC filings; beneficial-ownership disclosures; transaction
records; control-change announcements; subsequent asset/control changes;
cross-domain corroboration.

**Maturity:** PARTIAL — source list repo-verified + F2 rule; the
source→structural-variable mapping is UNAUTHORED (pending §11).

---

## 11. Structural Variable Boundary

**OWNERSHIP owns:** structural variables concerning **control and possession** —
who controls / holds what, changes in control, institutional boundaries,
control concentration/diffusion.

**OWNERSHIP does not own:**
- capital massing / movement / deployment → CAPITAL
- capability adoption / displacement → TECHNOLOGY
- knowledge production / transfer → KNOWLEDGE
- workforce capacity / movement → LABOR
- information / narrative movement → MEDIA

### The CAPITAL ↔ OWNERSHIP boundary (load-bearing)

Both touch a transaction, a filing, a "concentration". The latent variables are
distinct:

| observation | latent variable | axis |
|---|---|---|
| a fund / SPV holds massed capital | **capital concentration** | CAPITAL (`CAPITAL.md §11`, ratified) |
| who controls / holds that vehicle | **control concentration** | OWNERSHIP |
| an acquisition is financed | **capital deployment / flow** | CAPITAL |
| an acquisition changes who controls the target | **change in control** | OWNERSHIP |

One M&A filing carries evidence for both axes. Each latent variable is attributed
**once**: capital facts → CAPITAL, control facts → OWNERSHIP. Neither re-counts the
other's variable as independent support (§18; mirrors the ratified CAPITAL vehicle
clause from the other side).

Shared evidence is permitted. Cross-domain **correlation** (an acquisition that is
both a capital deployment and a control change) is legitimate and necessary for
STRUCTURE / FORMATION.

**Maturity:** PARTIAL — the CAPITAL↔OWNERSHIP clause is authored against both
locked sources; the full 6×6 matrix (`../SPEC-domain-intelligence-primitive-authoring.md` §6)
is UNAUTHORED until the other four `I_d` exist.

---

## 12. Maturity Summary

| Field | Mark | Basis / blocker |
|---|---|---|
| observes | PARTIAL | SPEC II §10 Observable Objects + Observation Classes (LOCKED) |
| signals | **PARTIAL** | `ownership_concentration_top_holder_share` AUTHORED (§3.1, Founder 2026-08-30) → Class D for data; the rest UNAUTHORED (F3) |
| structuralDimensions | PARTIAL | SPEC II §10 Conditions (LOCKED): concentration/diffusion, ownership stress, institutional re-bounding, strategic repositioning. `ultimate beneficial control` **UNAUTHORED** (§4.5). |
| relationships | PARTIAL | SPEC II §10 Relationships + Cross-Domain Propagation (LOCKED); cross-domain admission set only (F6) |
| relevanceConditions | PARTIAL | partial trace to SPEC II §10; macro-vs-entity distinction authored |
| tensionPatterns | PARTIAL | intra-OWNERSHIP; inherits §4 maturity |
| missingDimensions | PARTIAL | SPEC II §10 Unresolved (LOCKED) |
| sharpeningInputs | **UNAUTHORED** | candidate list only; depends on subject-scoping |
| evidenceAttribution | PARTIAL | source list repo-verified + F2 rule; mapping UNAUTHORED |
| structuralVariableBoundary | PARTIAL | CAPITAL↔OWNERSHIP clause authored (both locked sources); full 6×6 UNAUTHORED |

**Explicitly UNAUTHORED:** remaining `signals` beyond concentration (F3),
`sharpeningInputs`, `evidenceAttribution` mapping, dimension
`ultimate beneficial control`, subject-specific application.
**Now AUTHORED:** `ownership_concentration_top_holder_share` (§3.1).

**Nothing is AUTHORED for content. Nothing renders. Integration gated.**

---

## 13. Ratification Questions (Founder)

Mirrors the CAPITAL Q1–Q8 pattern.

1. Does OWNERSHIP own **control concentration/diffusion, ownership stress,
   institutional re-bounding, and strategic repositioning of control** as its
   primary structural vocabulary (per SPEC II §10 Conditions)?
2. Is **concentration/diffusion one dimension with polarity**, or two dimensions?
   (§4.1 — analogous to CAPITAL Q2.)
3. Is **"ownership stress"** an observation, a derived classification, or both kept
   distinct (§4.2, F2 analog)?
4. Does **`ultimate beneficial control`** stay UNAUTHORED (recommendation), or is
   there a defined structural-variable boundary for it?
5. Is the **CAPITAL ↔ OWNERSHIP boundary** in §11 correct — capital concentration
   (CAPITAL) vs control concentration (OWNERSHIP), each attributed once?
6. Does the **evidence attribution** (§10) satisfy the orthogonality requirement,
   given CAPITAL and OWNERSHIP share SEC filings?
7. What is the **ownership-concentration measure** — top-holder share, HHI-style
   index, or Founder-defined? (Blocks `signals`.)
8. **Q8 — Reusability Across Analytical Scope** (same as CAPITAL): does the
   OWNERSHIP implementation use the identical `I_OWNERSHIP` primitive for both
   `A(OWNERSHIP, Field)` and `A(OWNERSHIP, Subject)`? Scope via binding/context
   only; the packet does binding / evidence resolution / rendering, never a second
   definition. (`../SPEC-domain-substrate-integration-contract.md` AC — Lens
   Primitive Reuse.)

Until ratified, the Data Substrate may surface only ratified-PARTIAL portions —
which is currently **none** (no content field is AUTHORED).
