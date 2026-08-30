# SPEC — WO-5B: Subject Binding · `A(d, Subject)`

**Status:** Founder-governed plan (2026-08-30). Recorded, not originated.
**Parent:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 · `domain-substrate-implementation-plan.md` §0
**Inputs:** `SPEC-subject-scoping-contract.md` v0.1 (entity-case draft contract) · `SPEC-unit-of-analysis-inquiry.md` (decision-frame blocker)
**Precedent:** `feedback_evidence_is_not_a_measure` · WO-1A resolution seam (`domainsignalresolution.js`) · WO-1B/C/D evidence facets

---

## 0. Governing acceptance criterion (Founder, top of the spec)

> **A guest entering a resolvable subject must be able to see what each domain
> observes about that subject, distinguish evidence from derived measurement and
> structural absence, and perceive admitted cross-domain relationships without
> manually assembling observations across tabs.**

WO-5B is **not** complete because `A(d, Subject)` returns six objects. **The
acceptance test is perceptual.** For Anduril:

```
Anduril
 → six-domain subject scope
 → observable evidence (subject-attributed)
 → authored measures where actually computable
 → honest absence where not (with the required source named)
 → admitted cross-domain relationships
 → formation candidate
```

If the guest still sees six technically-correct but disconnected domain panels,
**WO-5B has failed — even if every backend test is green.**

This is a build against a settled ontology. **No additional ontology design pass.**

---

## 1. Locked boundaries

1. **Subject resolution precedes domain analysis.** The canonical subject is
   established once. `"Anduril"` resolves to one subject identity across all six
   domains. `"San Francisco"` is one scoped subject, not six independently
   interpreted strings.

2. **`A(d, Subject)` binds only subject-attributable observations.**
   - No subject-level value inferred from field-level pressure. (This bars the
     `entityattribution` Phase-A path `affinity × domainPressure` — mock
     affinities over field pressure is exactly the forbidden inference.)
   - No cross-domain substitution.
   - No evidence facet becomes a Class-E measure unless it satisfies the authored
     definition (`CLASS_E_ONTOLOGY` guard already enforces this).

3. **Guest-facing SIGNAL distinguishes four states, always:**
   `observed` · `derived measure` · `structural absence` · `source required`.
   The WO-1A absence treatment (`DATA UNAVAILABLE · requires: <sourceClass> ·
   scope: subject`) is the precedent — **do not replace it with a generic empty
   state.**

4. **OBSERVES → RELATIONSHIPS → FORMATION is one visible chain**, not six silos:
   `Subject → domain observations → cross-domain relationship → structural
   formation`. The guest never carries an observation from TECHNOLOGY into
   OWNERSHIP to discover the relationship themselves.

5. **Capture once → scope repeatedly → synthesize afterward.** WO-5B consumes the
   existing substrate (`getDomainEvidenceFacets`, `resolveClassEMeasure`, the
   admitted-relationship set). It does **not** create six retrieval/interpretation
   paths.

6. **The 15-type cross-domain vocabulary stays closed.** WO-5B *instantiates*
   admitted relationships; it never creates one because the UI makes it seem
   compelling.

7. **Field pressure stays separate.** It may provide context in the panel; it can
   never become the subject's answer. Labelled `FIELD SCOPE / context`, visually
   subordinate.

---

## 2. The chain (from `SPEC-subject-scoping-contract.md` §1, now build-authorized)

```
SEARCH → queryContext (KRYL-1221)
  ↓
subjectScope(queryContext) →
   { kind:'ENTITY', canonicalId, entity }        ERK resolve() matched a name
 | { kind:'DECISION_FRAME', frame }               decisionCues, no entity → classified absence (NOT a bug)
 | { kind:'UNRESOLVED', reason }                   neither
  ↓  (ENTITY only)
A(d, Subject) for each d ∈ 𝒟 →
   { subject, domain,
     observations: SubjectObservation[],           subject-attributed evidence facets
     measures:     { [measureKey]: resolveClassEMeasure({scope:'subject', subject}) },
     fieldContext: computeDomainPressure(d),        context ONLY, never the answer
     absence:      classified when nothing binds }
  ↓
relationshipsFor(Subject) →
   admitted cross-domain edges where BOTH endpoints carry ≥1 subject observation
  ↓
formationCandidate(Subject) →
   emitted only when ≥2 domains have subject observations AND ≥1 admitted edge
   connects them; otherwise NO_FORMATION_ESTABLISHED (≠ ⊥)
```

---

## 3. Stages

### 5B-1 — Subject-scope spine + panel reframe  *(this ticket builds it)*

- `src/engine/subjectscope.js` — `subjectScope(queryContext | query)`:
  - extract a name candidate from `queryContext.intent.entities` (selection rule:
    longest proper-noun span; ignore the leading verb/question stem — kills the
    `"IS ANDURIL"` pseudo-anchor);
  - `entityresolution.resolve(candidate)` → `{ kind:'ENTITY', canonicalId, entity }`;
  - `decisionCues && !entity` → `{ kind:'DECISION_FRAME' }`;
  - else `{ kind:'UNRESOLVED' }`.
- `src/engine/adsubject.js` — `A(domain, subjectScope)`:
  - `kind !== 'ENTITY'` → `{ absence: structural, reason }` for every domain;
  - `ENTITY` → `{ subject, domain, observations: [], measures: <resolveClassEMeasure per authored key, scope:'subject'>, fieldContext: computeDomainPressure(domain) }`.
    `observations` is empty until 5B-2 (no attribution method that isn't
    fabrication yet) — **that is honest, not a stub to hide.**
- `domainsubstratetabs.jsx`: header becomes **"01 ANALYSIS · {Subject}"**; each
  tab reads `A(d, subjectScope)`; SIGNAL panel shows, in order:
  `observed` (5B-2) → `derived measure` (resolveClassEMeasure) → `structural
  absence` (with `requires:` + `scope: subject`) ; field pressure demoted to a
  `context` line. DECISION_FRAME / UNRESOLVED → one honest packet-level notice +
  the six domains render classified absence (the observation is still owed).
- **5B-1 acceptance (perceptual):** entering "Is Anduril a good acquisition
  target?" → packet titled *Anduril*, six domain tabs each stating *what is and
  isn't observable about Anduril*, field pressure visibly subordinate, no
  STAKE/MOVE/WINDOW, no pseudo-lens, decision verdict absent but not blocking.

### 5B-2 — Evidence binding  *(DONE — `subjectbinding.js`, KRYL-1234)*

Chain: **subject identity → identifier resolution → evidence facet.** Never
subject name → semantic similarity → probably-related evidence.

- `facetBelongsToSubject(facet, scope)` — a facet is a subject observation ONLY
  when `facet.provenance.subject` is `{ canonicalId }` (exact) or
  `{ identifier: { source, id } }` that `resolveByIdentifier` maps to this
  subject's canonicalId. Deterministic, provenance-preserving. No fuzzy/mock
  affinity. No field-level evidence promoted. No cross-domain substitution. No
  Class-E measure fabricated from a facet (`CLASS_E_ONTOLOGY` guard). Failed
  containment → STRUCTURAL ABSENCE with the required source still visible. Every
  bound facet keeps its own `source_set_hash` / `lineage_id`.
- `getDomainEvidenceFacets(domain, { subject: entityScope })` applies the filter;
  a non-ENTITY scope returns `[]`. `A(d, Subject).observations` is the bound set.
- **Proven by the negative cases** (`qa_subjectbinding.mjs`): Palantir evidence
  does not bind to Anduril; a field-level PatentsView facet with "ANDURIL" in its
  assignee list does not bind (no subject attribution block); an identifier
  resolving to a different entity does not bind; an unresolvable identifier does
  not bind; a name-string attribution does not bind.

### 5B-3 — Relationship layer (UI)  *(perceptual crux)*

- **Not** a generic "relationships" panel. The relationship is rendered **at the
  point where the guest perceives the two observations as one structure** —
  conceptually:

  ```
  TECHNOLOGY  ── Anduril capability observation
      ↕  CONTROL OF IP / PLATFORM
  OWNERSHIP   ── Anduril control observation
  ```

  Locked principle: **the relationship is an observable object in the guest
  experience, not an instruction to compare two tabs.**
- An edge renders **only** between two domains that each carry ≥1 subject
  observation from 5B-2, and **only** for a type in the ratified 15-set
  (`admitCrossDomainRelationship`). Each edge shows both underlying observations.
- Acceptance: the guest sees the connected pair without opening both tabs.

### 5B-3 / 5B-4 QUARANTINE (hard, from KRYL-1235)

The 5B-3 and 5B-4 modules **MUST NOT** import or read `querysynthesis.js` /
`synthGeneral` / `recommendedAction` / any `SYNTH_MAP` output. The chain is
`observation → relationship → formation`, never `legacy narrative → confirmed by
observations`. A build guard / test asserts no such import path exists from
`adsubject.js` or the 5B-3/5B-4 modules. The legacy PRIMARY SIGNAL narrative
(Thiel Protocol etc.) is KRYL-1235's problem and is quarantined from this path.

### 5B-4 — Formation candidate

- `formationCandidate(Subject)` surfaces a candidate only when 5B-3 has ≥1 edge
  across ≥2 observed domains. Consumes `formationinference` (already bound to the
  15-type admission set, `441cfa6`); never invents structure.
- Acceptance: formation appears as *emerging from* the observed edges, with each
  contributing observation traceable; absent otherwise (NO_FORMATION_ESTABLISHED).

---

## 4. Explicitly out of scope / deferred

- **Decision-frame subjecthood.** `SPEC-unit-of-analysis-inquiry.md` is the
  blocker. WO-5B handles the ENTITY case; DECISION_FRAME → classified absence,
  by design, not a defect.
- `entityattribution` Phase B (real per-domain affinities) — a separate engine
  ticket. 5B-2 uses structural containment, which does not depend on it.
- Wiring new subject-scoped data sources (13F holders, IE endpoint, …) — WO-1
  B/C/D follow-ons; 5B renders their absence honestly until they land.
- Any change to field pressure / `_pool` / `computeDomainPressure` (KRYL-1228).

---

## 5. Validation — three layers, every stage (Founder, 2026-08-30)

**A stage is CLOSED only when all three are green.** Not "implemented" — closed.

1. **CONTRACT** — `qa_guest_acceptance.mjs` (the Guest Acceptance
   Harness, contract layer) + the stage's own `qa_*.mjs`. Stage-gated: a stage
   reads BLOCKED until its module exists. The harness's `5B-3`/`5B-4`/`LEGACY
   PRIMARY SIGNAL` rows track forward and independent work.
   - 5B-1: subject → canonical identity → `A(d,Subject)` for all six.
   - 5B-2: only subject-contained evidence binds; unrelated evidence rejected
     (`qa_subjectbinding.mjs` — the negative cases are the point).
   - 5B-3: only observed endpoints create a relationship; only the 15 admitted
     types appear.
   - 5B-4: formation emerges only from admitted relationships; no narrative
     invention.
2. **GUEST (perceptual)** — `qa_guest_acceptance_live.mjs` drives the
   deployed packet and records what the guest sees against the fixed Anduril
   fixture (A subject · B six-domain observation · C evidence · D relationships ·
   E formation · F truth boundary). Positive AND negative cases.
3. **PRODUCTION (live)** — the same live run against the deployed build, 0
   unexpected failures, baseline diff recorded (`qa/baselines/guest_<fixture>_<stage>.json`).

**The assembly test** (human, run at 5B-3): give someone who did not build it the
subject and ask *"what is KRYLO observing about this subject, and what
relationships do you see forming?"* — no pointers. If they must carry an
observation from one tab to another to find the relationship, 5B-3 has failed §20
regardless of contract correctness.

Progression: 5B-1 *can KRYLO identify the subject?* → 5B-2 *can it correctly bind
evidence?* → 5B-3 *can the guest perceive relationships without assembling them?*
→ 5B-4 *can the guest perceive a formation emerging?* → WO-6 *can the whole
experience survive the Anduril acceptance test?*

Baseline: frozen at 5B-2 (`QA/baselines/guest_<fixture>_5b2.json`); the 5B-1→5B-2 guest
delta was OBSERVES wording only (identifier containment replaces the text-match
stub) — no measure / absence change. Every later stage diffs against this.

## 6. Rollback

Each stage is an additive module + a panel read swap. Revert = restore the
`domainsubstratetabs.jsx` field-scoped read and drop the new engine module. No
migration, no shared-state change.
