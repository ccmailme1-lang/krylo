# SPEC — CF Core Capability Taxonomy (IS-5)

**Status:** AUTHORED — the nine capability classes and the per-class schema are ratified
(Founder, 2026-09-02). Subordinate to `KRYL-CF-001`. Pending final KRYL-CF numbering.
**Rulings:** X6 (nine = a capability *taxonomy*), Founder 2026-09-02 (homogeneous node;
`DOMAIN_INTERPRETATION` is one class, not 6+3; eligibility mechanism stays open).
**Consumers:** CF-004 §5 (capability resolution), CF-010 §2 (slot list), the IS-5 ν_t↔RelationCore
interface, KRYL-CF-004 Node Capability Registry.

## 0. Constitutional constraints (LOCKED — carried into every downstream artifact)

1. **Node = the sole architectural unit.** One node type; one contract surface; one heartbeat
   spec; one security profile; one deployment artifact.
2. **Capability = the functional unit.**
3. **The nine capabilities are registry entries, not processor types.**
4. **Reach and cognition remain orthogonal** (KRYL-CF-004): the Remote/observational-reach
   population scales independently of the capability set.
5. **No capability has inherent routing priority.**
6. **No capability is inherently "core" or "remote."**
7. **Policy, provenance, admission, cost, and lifecycle governance are symmetric across all nine.**
8. **Physical deployment MAY be heterogeneous** (affinity scheduling, hardware, data-source
   proximity); **the logical contract remains homogeneous.**
9. **Capability assignment is dynamic and registry-governed.**
10. **Adding, splitting, or retiring a capability does not change Node identity semantics.**

Not normative here: *how* eligibility is evaluated (hashing, set membership, indices — an
implementation choice). The invariant is **capability-based eligibility** (§2 `selection_constraints`).

## 1. Per-class schema (ratified)

Every capability class declares:

| field | meaning |
|---|---|
| `capability_id` | stable SCREAMING_SNAKE identifier |
| `purpose` | one sentence — the cognitive operation it performs |
| `admissible_inputs` | CF-003 object types it consumes |
| `produced_outputs` | CF-003 object types it emits — always *candidates* / observations / events, never admitted state |
| `state_access` | `READ` or `READ + APPEND_EVENT` — never `MUTATE` |
| `mutates_fabric_state` | **NO** for all nine (CF-002 §7) |
| `participates_in_admission` | may its output *be* a relationship-admission decision? |
| `participates_in_formation_inference` | may its output *be* a FormationCandidate / revision? |
| `selection_constraints` | the eligibility conditions the registry applies (CF-004 §5) — evaluated by any mechanism |
| `async_class` | `NON_BLOCKING` for all nine — CF-004-INV-006, never a guest-path prerequisite |
| `observability` | events it MUST emit into the Event Store for the processing genealogy (CF-009 §6) |

Invariant across all nine: `mutates_fabric_state = NO`, `async_class = NON_BLOCKING`,
`state_access ≤ READ + APPEND_EVENT`. Governance (relationship admission gate; `inferFormation`
θ_D≥2 + ≥1 admitted relationship; Formation-B rules) is the only path to admitted state.

## 2. The nine capability classes

### C1 — `OBSERVATION_CHARACTERIZATION`
- **purpose:** turn a raw Signal into a characterized Observation (type, subject, temporal
  properties, domain context, required-capability hints).
- **inputs → outputs:** Signal → Observation, ProcessingEvent.
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** no
- **selection_constraints:** Signal has passed envelope validation (CF-004 §3); not already
  characterized.
- **observability:** `PROCESSING_STARTED`, `OBSERVATION_CREATED`, `PROCESSING_COMPLETED`.
- **grounded:** CF-004 §4; `querycontext.js`, `intentparser.js`.

### C2 — `DOMAIN_INTERPRETATION`
- **purpose:** interpret a subject's state through **one** domain's structural dimensions (the
  `I_d` primitive). Domain is *context*, not identity (X3) — this is **one** class, invoked with
  a domain parameter, not six classes.
- **inputs → outputs:** Observation + subject + domain → domain-scoped Observations / structural
  readings, ProcessingEvent.
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** no
- **selection_constraints:** an `I_d` is authored+ratified for the requested domain
  (`SPEC-domain-intelligence-primitive-authoring.md`); subject resolvable.
- **observability:** `CORE_PROCESSING`, `OBSERVATION_CREATED`.
- **grounded:** `domainintelligence.js`; the 6 ratified `I_d` specs.

### C3 — `RELATIONSHIP_CANDIDACY`
- **purpose:** propose candidate structural relationships between observations. Hypothesis
  generation — MAY use subject overlap / similarity (this is *not* pathway identity, IS-1 §3.5).
- **inputs → outputs:** Observation pair (or set) → candidate Relationship(s).
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** no
- **selection_constraints:** ≥2 observations in scope; candidate type ∈ the closed 15
  cross-domain vocabulary or an intra-domain structure.
- **observability:** `PROCESSING_COMPLETED` naming the candidate ids.
- **grounded:** CF-002 §19 `RELATIONSHIP_ANALYSIS`; `chokepointedges.js`.

### C4 — `RELATIONSHIP_ADMISSION_ADJUDICATION`
- **purpose:** decide whether a candidate relationship is admitted — the RelationCore / evidence-
  admission gate (the 15 ratified cross-domain types; EAC1–EAC5).
- **inputs → outputs:** candidate Relationship + evidence → `RELATIONSHIP_ADMITTED` **or**
  rejection, with reason.
- **state_access:** READ + APPEND_EVENT · **admission:** **YES** · **formation:** no
- **selection_constraints:** candidate is well-formed; contributing observations are from
  support-eligible pathways (FC-REQ-05); evidence meets the admission contract.
- **observability:** `RELATIONSHIP_ADMITTED` / a typed rejection event; provenance_delta.
- **grounded:** `admitCrossDomainRelationship`, `evidenceadmissiongate.js`, `admissionengine.js`;
  KRYL-CF-002 EAP.

### C5 — `PATHWAY_TRAVERSAL`
- **purpose:** significance-conditioned expansion / evaluation of a pathway — the
  CONTINUE / TERMINATE / ESCALATE decision, using significance *trajectory* not fixed depth
  (CF-005 §4).
- **inputs → outputs:** Pathway + candidate relationship + context → pathway events
  (`PROCESSING_*`, `EXPLORATION_TERMINATED` / `EXPLORATION_ESCALATED`).
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** contributes
- **selection_constraints:** an ACTIVE pathway exists; a candidate expansion is present;
  exploration budget remains.
- **observability:** `PROCESSING_STARTED/COMPLETED`, the terminate/escalate event with reason.
- **grounded:** CF-005 §3–7; `formationinference.buildGraph`.

### C6 — `CONVERGENCE_RECOGNITION`
- **purpose:** recognize when multiple pathways meet the same structure. Convergence is *evidence
  toward* Formation — never a Formation, never an identity merge (CF-005 §8, IS-1 §3.4).
- **inputs → outputs:** Pathway set → `CONVERGENCE` events linking them (identity preserved).
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** contributes
- **selection_constraints:** ≥2 pathways reference a common object/structure; both support-
  eligible at evaluation time.
- **observability:** `CONVERGENCE` event naming all linked pathway ids.
- **grounded:** CF-005 §8; `convergenceclassifier.js`.

### C7 — `FORMATION_SYNTHESIS`
- **purpose:** assemble admitted relationships + contributing pathways into a **FormationCandidate**
  with an explicit boundary ("why these relationships / why not those", CF-003 §17).
- **inputs → outputs:** admitted Relationships + Pathways → `FORMATION_CANDIDATE_CREATED`.
  **Produces a candidate only — never admits a Formation.**
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** **YES (candidate)**
- **selection_constraints:** ≥2 domains and ≥1 admitted cross-domain relationship in scope
  (the governance threshold); FC-REQ-05 on every contributing pathway.
- **observability:** `FORMATION_CANDIDATE_CREATED` with `relationship_ids` / `pathway_ids` /
  boundary.
- **grounded:** CF-006 §2–7; `inferFormation`.

### C8 — `CONTRADICTION_RESOLUTION`
- **purpose:** process contradicting evidence into a formation-revision candidate
  (CF-006 §8 event vocab: CREATED / EXTENDED / CONTRADICTED / REVISED / DISSOLVED).
- **inputs → outputs:** contradicting Observation + existing Formation/Candidate → a revision
  candidate + `FORMATION_CONTRADICTED` / `FORMATION_REVISED` (candidate-level) events.
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** yes (revision candidate)
- **selection_constraints:** an existing Formation/Candidate touches the contradicted leg; the
  contradicting observation is from a support-eligible pathway.
- **observability:** the contradiction/revision events; original states remain reconstructable.
- **grounded:** CF-006 §8; `resolveadjudication.js`, `rkmstore.js` `flagContradiction`.

### C9 — `BOUNDARY_FRONTIER_DETECTION`
- **purpose:** identify an unresolved, evidence-resolvable structural question at a formation's
  edge, with a typed reason code. Produces a **Frontier candidate** — NOT a frontier task
  (IS-7/IS-8 machinery is deferred; C9's output terminates at a recorded candidate).
- **inputs → outputs:** FormationCandidate → Frontier candidate + a recorded affordance event.
- **state_access:** READ + APPEND_EVENT · **admission:** no · **formation:** no
- **selection_constraints:** a FormationCandidate with an adjacent unobserved leg that is
  admissible-adjacent to a participating domain.
- **observability:** the frontier-candidate event with its typed reason code.
- **grounded:** `observationaffordanceengine.js`; `SPEC — Cognitive Fabric & Formation Frontier.md`.

## 3. Authored dispositions on the earlier open questions

| Q | Disposition |
|---|---|
| C2 one class vs 6+3 | **One class** (Founder 2026-09-02). Domain is a parameter, per X3. No hidden 6+3. |
| Merge C5 (traversal) + C6 (convergence)? | **Kept separate.** CF-005 §7 (traversal decision) and §8 (convergence recognition) are distinct operations on distinct inputs; merging would blur the unit of analysis (CF-003 §26). |
| C9 in the nine given IS-7/8 deferred? | **Yes.** The *capability* is a real cognitive operation; only the frontier *task/remote-capability* machinery is deferred. C9 stops at a recorded candidate. |
| `capability_id` naming | **SCREAMING_SNAKE**, accepted. |

## 4. Kill-experiment coverage

The canonical experiment (`qa_cf_canonical.mjs`) exercised **C5 → C6 → C7** (pathway persistence
→ convergence → formation synthesis) and **C8** (formation-revision). **C1–C4 and C9 are
unexercised** — they enter scope with real connector provenance and the IS-5 ν_t↔RelationCore
interface.

## 4a. CF-010 reference-interface correction (Founder, 2026-09-02)

The September CF-010 §4 interface list literally contains `admitFormation()` and implies
`CF → admitFormation()`. That contradicts C4/C7 here and CF-006/CF-009 (KRYLO governance owns
authoritative admission). The reference interface SHALL instead expose:

```
createFormationCandidate()      discoverRelationshipCandidate()
submitFormationCandidate()      submitRelationshipCandidate()
receiveFormationAdmission()     receiveRelationshipAdmission()
```

The Fabric creates and submits the *candidate*; KRYLO governance decides admission and the Fabric
*receives* the result. The constitutional boundary is preserved down to the interface signature.

## 5. Once this and the FG parameters are ratified

- CF-010 §2 slot list = C1…C9; CF-010 §4 interface per §4a above.
- The ν_t↔RelationCore interface (IS-5 per `SPEC — Cognitive Fabric & Formation Frontier.md` §36)
  types its capability field as `capability_id ∈ {C1…C9}`.
- KRYL-CF-004 Node Capability Registry declarations reference C1…C9.
- No `Capability n → Node n` binding anywhere.
