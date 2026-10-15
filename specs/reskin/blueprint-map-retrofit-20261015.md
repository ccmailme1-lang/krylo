# MAP Retrofit Blueprint — Target-State Architecture and Component Retrofit Map

Status: DRAFT for Founder review, 2026-10-15. Read-only analysis. No code, no schema, no tickets created.
Code citations are against `origin/main` at `02c5c11` unless stated otherwise.

Inputs read in full:
`SPEC-relational-substrate-stage1-baseline.md` (frozen), `SPEC-relational-substrate-stage1-formalization.md` (closed),
`stage1-founder-rulings-ontology-resolution-20261001.md`, `stage1-adapt-relational-substrate-20261001.md`,
`engineering-discovery-relational-substrate-20261001.md`, `recommendation-unified-relational-substrate-20261001.md`,
`SPEC-phase2-relationship-substrate-inventory.md`, `SPEC-relational-change-temporal-axis.md` (KRYL-1334, locked),
`jira-draft-stage1-relational-substrate-20261001.md` (Epic KRYL-1338, children 1339–1347).
Design reference: `specs/reskin/map-hub-dark.html`, `specs/reskin/map-hub-light.html`, `specs/reskin/spec-map-hub-layout.md`.

## Evidence labels used throughout

| Label | Meaning |
|---|---|
| **R** | Runtime-confirmed. Only cited from a dated prior record; **nothing was executed this session.** |
| **C** | Code-level: read directly in `origin/main` this session (file:line given). Present on disk; not traced live. |
| **K** | Conceptual match: the capability exists under another shape or name and plausibly maps. |
| **U** | Unresolved: open question, missing source, or Founder decision. |

---

## Part 0 — The decision this blueprint depends on

**D-0 (Founder, blocking).** The Stage 1 record says the MAP stays a domain co-presence surface and is *not* a canonical-relationship consumer: Adapt §A ("does not project into CFX at all"), and the KRYL-1347 addendum ("KRYL-1343 … confirmed not a canonical-relationship consumer by design — the MAP stays domain co-presence, relabeled"). The new direction (2026-10-15) is that the canonical substrate becomes the foundation of MAP.

These are compatible only if the MAP shows **two distinct layers that never impersonate each other**:
1. an **observation layer** — six-domain signal and co-presence (what is active), and
2. a **relational/structural layer** — canonical admitted relationships `ρ` and CFX Formation over them (what is evidenced and what it forms).

This blueprint is written on that reading. It does not amend the frozen baseline, and it does not silently overturn the KRYL-1343 scoping: the Founder must confirm that the MAP gains the second layer while the co-presence layer keeps its relabeled meaning. If D-0 is answered differently, Parts 1 and 4 change; Parts 2 and 3 still hold.

---

## Part 1 — Target MAP (the experience the implementation adapts to)

### 1.1 What the guest sees

One screen, hub-and-spoke, as mocked up in `map-hub-dark.html` (build theme) and `map-hub-light.html` (reskin reference). Visual scope is unchanged from the agreed mockups.

| Element | What it shows | Meaning (never more than this) |
|---|---|---|
| **Hub** | The resolved subject entity (double ring, serif name). | The entity the query bound to. Absent hub = "no subject resolved", stated plainly. |
| **Domain ring** | The six locked domains at fixed angles (`CONE_DISPLAY_ORDER`). Each: disc, observation count, convergence-state square. | Observation layer. Count = real domain signals in window. State = classifier output. A domain with no signal is hollow and dashed, still drawn (Absence-Is-Signal). |
| **Observation groups** | Small numbered nodes fanned outward from each domain. | Evidence grouped by source within a domain. Count = real items. |
| **Counterparty entities** | Entity nodes linked to the hub. | Each link is one canonical admitted `ρ` (type label on hover). Placed in the sector of the domain its type belongs to (mapping is **U**, D-3). |
| **Canonical relationship lines** | Hub → counterparty, solid. Direction arrow only when `φ_class = Semantic` (ordered `part`). | Admitted relationship. Never drawn from co-presence. |
| **Co-presence lines** | Domain ↔ domain, thin and visually distinct from relationship lines. | "Co-active in window" only. Labeled CO-PRESENT, never RELATIONSHIP (baseline §9, Adapt §A). |
| **Formation** | Highlighted connected sub-structure. | CFX output over the canonical graph (baseline §12). Not drawn from co-presence. |
| **Timeline rail** | Left edge: real capture dates with a density trace; selected date in a pill. | Persisted Formation/relationship history (KRYL-1334). Selecting a date shows that state. No history → rail visible, dimmed, labeled "no history yet". |
| **Change marks** | On relationship lines and on the rail. | Baseline §6 predicates: NEW, PERSISTENT, STRENGTHENING, WEAKENING, RECONFIGURED, DISSOLVED, UNSUPPORTED. UNSUPPORTED is shown, never collapsed into DISSOLVED. |
| **Summary panel** | Opens on click (domain, entity, or relationship). | Real values only: state, counts, relationship type, evidence citation(s), observation time, change predicate. "Why does KRYLO believe this?" is answerable from the panel. |
| **Legend** | Below the map, with real counts per node and line type, plus the five states. | Counts equal the payload. |

### 1.2 Rules the design carries (already decided)

- Position is layout, not measurement: no axis ticks, scale numbers or gauges (structure-field.html comments, Founder 2026-10-01 and 2026-10-04).
- Color = convergence state only (§6). Node and line *type* = shape, dash and size.
- No search or ask box on the map (Founder 2026-10-15).
- No prediction, recommendation or "strength/confidence" scale anywhere (baseline §7, Ruling 2, §21).
- Hover isolates a branch; click opens the summary panel.

---

## Part 2 — Component retrofit map

Classification per component: **Retain** (works, keep), **Adapt** (keep, change shape or role), **Connect** (works, not wired to where it's needed), **Duplicate** (overlaps another component's job), **Gap** (missing).

### 2.1 Observation layer

| Component | File / location | Current role | Target role | Class | Evidence |
|---|---|---|---|---|---|
| Domain signal pool | `src/engine/domaingravity.js` (`getAllDomainPressures` :175; 5-min window per discovery §7) | Per-domain pressure, volatility, signals; in-memory only | Source for domain counts and per-domain state | Retain | C |
| Domain signal counts to MAP | `structurepanel.jsx:181-190` (`domainSignalCounts`) → `structure-field.html:686-687` | Counts cross the postMessage boundary | Domain ring counts | Retain | C |
| Convergence classifier | `src/engine/convergenceclassifier.js` (88 lines); `resolveConvergenceState()` is a **non-exported local** in `conemap.jsx:116` | Drives cone colors on Surface | Per-domain state square on MAP | Connect + Adapt (extract one shared helper; §2 forbids a second table — conemap.jsx:71 already says so) | C |
| Co-presence detection | `src/engine/formationinference.js` (`inferFormation` :178; `admittedType` :114 from static `CROSS_DOMAIN_RELATIONSHIPS`, `domainintelligence.js:29`) | Produces the domain graph the MAP draws today | Co-presence lines only; not a Formation source for the relational layer | Adapt (role narrowed) | C |
| Co-presence relabel | `structure-field.html:307` reads "FORMATIONS / CO-PRESENT PAIRS / FORMATION INTEGRITY" | KRYL-1343 intent | Keep the CO-PRESENT wording | Retain (appears done on main) | C — "FORMATIONS" label still names co-presence output; see U-4 |
| Observation groups per domain | none found | — | Numbered nodes per domain | Gap | U (source of grouping undefined) |

### 2.2 Relational substrate

| Component | File / location | Current role | Target role | Class | Evidence |
|---|---|---|---|---|---|
| Canonical `ρ` + admission | `src/engine/canonicalrelationship.js` (`PhiClass` :15, `registerRelationshipType` :30, `sameRelationship` :63, `admitRelationship` :74) | KRYL-1339 implementation | The one admission path | Retain | C; tests 23/23 per Jira addendum (test-level, not runtime) |
| Ratified types | `src/engine/ratifiedrelationshiptypes.js` (:26 `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE`, :71 `SHARED_PATENT_ASSIGNMENT`, :123 `ACQUIRED`) | Three ratified types | Same; type→domain sector mapping needed for the MAP | Retain + Gap (D-3) | C |
| Typed-edge projection | `src/engine/canonicalrelationshipprojection.js` (KRYL-1340; `findAdmittedRelationshipsFor` :169, `latestEvidenceFor` :145) | Projection of `ρ` into the typed-edge registry | Read API for the MAP relational layer | Retain | C |
| Canonical `ρ` persistence (SEC, patent producers) | same file, header :11-16: "in-memory store … resets on process restart … re-observes prior real filings as NEW, not PERSISTENT" | In-memory | Durable store, so change predicates are true across restarts | Gap | C (stated in code) |
| Producers | `connectors/secownershipconnector.js`, `connectors/patentsviewconnector.js`, `producers/rsievidencemigration.js` (all import canonical path) | Feed `ρ` | Same | Retain | C — whether SEC/patent producers run live is **U** (inventory 2026-08-19 found `runSecOwnershipSync()` had zero callers; not re-verified) |
| Legacy RelationCore | `src/engine/relationontology.js` (253) | Pre-canonical shape | Migration material only (Ruling 2 retires `eta/phi0/structuralSupport`) | Adapt / deprecate after migration | C |
| RelationDynamics | `src/engine/relationdynamics.js` (120); zero importers per discovery §2 | Dormant | Candidate change-rule logic, only after real-data validation (Adapt §G, KRYL-1345) | Hold | C (importer count not re-verified) |
| Entity identity | `src/engine/entityresolution.js` (`toTopologyNodeId` :329) | Bridges canonicalId ↔ topology node id | Single identity for hub and counterparties | Retain + Connect (KRYL-1342 scope) | C |
| Target Packet coverage | `src/engine/reconnpayload.js:77-108` (`relationshipCoverage`) | Returns PRESENT/NO_EVIDENCE/WITHHELD from canonical `ρ` | Same source the MAP must use | Retain (KRYL-1347 appears implemented) | C |

### 2.3 Formation and CFX

| Component | File / location | Current role | Target role | Class | Evidence |
|---|---|---|---|---|---|
| MAP Formation today | `inferFormation` → `structure-field.html:601-660` (`applyFieldFormation`, spring layout `computeGraphLayout` :508) | Formation drawn from co-presence | Co-presence layer only | Adapt | C |
| CFX over canonical graph | none found | — | Connectivity → Formation → Emergent Structure from `ρ` graph (baseline §12) | Gap | U |
| Structural entity synthesis | `src/engine/structuralentitysynthesis.js` (:29 imports canonical projection; text-substring admission replaced per header :4-15) | Entity-pair SUPPORTED answers from `ρ` | Same | Retain (KRYL-1341 appears implemented) | C |
| Entity relationships to MAP | `structurepanel.jsx:111` (`entityRelationships`) → `structure-field.html:699` / `applyEntityRelationships` :1047; subject node `entity: true` :974 | Hub node + "N ADMITTED RELATIONSHIPS" panel | Counterparty nodes and relationship lines | Adapt (render) | C |

### 2.4 Temporal

| Component | File / location | Current role | Target role | Class | Evidence |
|---|---|---|---|---|---|
| Formation-state table | `as-diff/db.js:94-112`; writer `as-diff/formationstatestore.js:60` | Persisted history | History source for rail and change marks | Retain | C; live end-to-end per Adapt §D (R, 2026-10-01) |
| Snapshot builder | `src/engine/formationsnapshot.js` (`formationIdFor` :25, `buildCanonicalCandidateRows` :76, `decideWrite` :112) | Builds rows from canonical `ρ` | Same | Retain | C |
| History fetch | `structurepanel.jsx:229` (`/v1/formation-state`), :235 (`fetchSubjectFormationHistory`) → `applyFormationHistory` `structure-field.html:787` | Rail data | Timeline rail | Retain | C |
| State vocabulary | `db.js` CHECK: NEW, STRENGTHENING, WEAKENING, RECONFIGURATION, DISSOLUTION | 5 states | Baseline §6: 7 predicates incl. PERSISTENT and UNSUPPORTED | Adapt (vocabulary + UNSUPPORTED recording; Adapt §D.4b) | C |
| NO_EVIDENCE pairs | `structurepanel.jsx:193-195`: "NO_EVIDENCE pairs have never been persisted" | Silent | Recorded UNSUPPORTED where same-ness previously held | Gap | C |
| Rail change-mark colors | `structure-field.html:179-182`: STRENGTHENING lime, WEAKENING blue, RECONFIGURATION purple | Reuses convergence-state colors for change predicates | Shape/marker encoding; color reserved for state | Adapt (§6 conflict, D-4) | C |

### 2.5 MAP renderer and parent

| Component | File / location | Current role | Target role | Class | Evidence |
|---|---|---|---|---|---|
| MAP iframe | `public/structure-field.html` (1977 lines), canvas | Spring layout, brief, scrubber, legend (static, :313) | Hub-and-spoke renderer for both layers | Adapt — **declared REPLACEMENT of layout** (§4) | C |
| Parent | `src/components/analysis/structurepanel.jsx` (posts `krylo-field-formation` with formation, domainSignalCounts, formationHistory, entityRelationships, brief) | One message carries all MAP inputs | Same message, extended (state, observation groups, CFX formation) | Adapt | C |
| Static legend | `structure-field.html:313-330` | Hardcoded five states | Legend with live counts | Adapt | C |

### 2.6 Duplicates to resolve

| Overlap | Where | Resolution |
|---|---|---|
| Convergence-state mapping | `conemap.jsx:116` (local) vs any MAP copy | One exported helper; both import it. |
| "Formation" meaning | `formationinference.js` (co-presence) vs future CFX (canonical) | Rename/scope the co-presence output in UI; Formation on MAP = CFX only (D-0). |
| Change states | `formation_state` 5-state vocabulary vs baseline 7 predicates | One vocabulary (baseline), migration of existing rows per retention policy (KRYL-1346). |

---

## Part 3 — Relationships and data flow (one system)

```text
Source evidence (SEC 13D/G, PatentsView, RSI citations, …)
   └─ source adapter (connectors/*)                         C
        └─ canonical admission  admitRelationship()         C
             └─ canonical ρ  (id, part, type, φ_class, ν)   C
                  ├─ evidence history H(ρ) + provenance     C (in-memory for SEC/patent: Gap)
                  ├─ durable store                          Gap (KRYL-1334 path only today)
                  ├─ change predicate vs H(ρ)               Adapt (7 predicates)
                  └─ relational graph / typed-edge projection  C
                       └─ CFX: connectivity → formation     Gap
                            └─ MAP relational layer         Adapt

Domain signals (surfaceRouter → domaingravity)              C
   ├─ per-domain counts, pressure, volatility               C
   │    └─ shared convergence-state helper                  Connect
   │         └─ MAP observation layer (ring + state)        Adapt
   └─ co-presence (formationinference)                      C
        └─ MAP co-presence lines (labeled CO-PRESENT)       Adapt

Formation-state history (Postgres formation_state)          C / R
   └─ /v1/formation-state → structurepanel → iframe         C
        └─ timeline rail + change marks                     Adapt
```

Boundary rules on every arrow (baseline §9, §11, §12):
- Nothing flows from CFX or the MAP back into admission.
- Co-presence never becomes a `ρ` and never feeds CFX.
- The graph and projections contain nothing not present in an admitted `ρ`.
- Every MAP value traces to one of the C components above; a missing source renders as absence, not zero.

New connections needed (all **Connect** or **Gap** above):
1. Shared convergence-state helper → parent → iframe (per-domain state).
2. Observation-group producer → parent → iframe (U: grouping definition).
3. Canonical `ρ` durable persistence for SEC/patent producers.
4. Change-predicate evaluation in baseline vocabulary, including UNSUPPORTED.
5. CFX formation over the canonical graph → parent → iframe.
6. Type → domain sector mapping for counterparty placement (D-3).

---

## Part 4 — Incremental migration sequence

The current MAP stays the default until the new one meets acceptance (Part 5). Each step is one ticket, one go.

| Step | Delivers | Depends on | Current MAP affected? |
|---|---|---|---|
| **S0** | Founder decisions D-0…D-4; locate or write the frozen MAP acceptance rubric (U-1). | — | No |
| **S1** | Extract the shared convergence-state helper from `conemap.jsx`; Surface uses it with identical output (regression check). | — | No |
| **S2** | Extend the `krylo-field-formation` payload with per-domain state. Old renderer ignores the new field. | S1 | No |
| **S3** | Durable persistence for canonical `ρ` (SEC, patent, RSI producers), reusing the `formation_state` infrastructure pattern (`as-diff/db.js`, `formationstatestore.js`). | D-1 | No |
| **S4** | Change predicates in baseline vocabulary; record UNSUPPORTED; migrate `formation_state` rows per KRYL-1346 retention ruling. | S3, KRYL-1346 | Scrubber labels change — gated behind S7 flag if wording differs |
| **S5** | CFX formation over the canonical graph, run in **shadow**: computed and logged next to `inferFormation`, not rendered. Compare outputs per query. | S3 | No |
| **S6** | Observation-group producer (after its definition is ruled, U-2). | D-2 | No |
| **S7** | New hub-and-spoke renderer behind a flag (`map=hub`), reading the same payload plus S2/S5/S6 fields. Both renderers available side by side. | S2, S5 (S6 optional) | No (flag off by default) |
| **S8** | Acceptance run: compare both renderers on the same real queries against Part 5. Fix gaps. | S7 | No |
| **S9** | Founder go → new renderer becomes default; old renderer kept behind the flag for one release. | S8 | Yes (switch) |
| **S10** | Retire the old layout after a clean release (Behavioral Retirement Audit per CLAUDE.md §10). | S9 | Yes |
| **S11** | Reskin to light (separate project; token step first). | S10 | Yes |

S1, S3 and S6 can run in parallel. Nothing is retired before S10.

---

## Part 5 — Acceptance criteria

### 5.1 Frozen and established (quoted, not altered)

From `SPEC-relational-substrate-stage1-baseline.md` §15 (frozen verbatim per the Founder rulings record):
A Traceability · B Identity Stability · C No Fabrication · D Temporal Integrity · E Provenance Preservation · F Formation Independence · G Unsupported State · H Reproducibility.

From KRYL-1334 VALIDATION (`SPEC-relational-change-temporal-axis.md`): change classified only between two comparable persisted states; no change reported when admitted edges are identical; same subject + field + formation scope only; `observation_count` delta never produces a change; no comparable states → unresolved/absent.

From Epic KRYL-1338 (Jira draft, amended): no generic strength/confidence/force field in `ρ`; MAP no longer presents co-presence as "RELATIONSHIPS"; KRYL-1334 admits only via canonical `ρ`; typed-edge registry is a projection; *"every canonical relationship produced by Stage 1 has an identified downstream consumer, and every intended existing consumer has been traced through to its user-visible behavior."*

### 5.2 Not found — explicit open item

**U-1: No frozen acceptance rubric for the MAP replacement itself was found in the repository.** The criteria above govern the substrate and the temporal layer, not the MAP experience. The following are **proposed only**, for Founder ratification; they are not frozen and do not replace anything above:

1. Every node, line, count and state on the MAP traces to a component labeled C in Part 2, or renders as labeled absence.
2. Relationship lines exist only for admitted `ρ`; co-presence lines are visually distinct and labeled CO-PRESENT.
3. Formation on the MAP equals CFX output over the canonical graph (after D-0).
4. The summary panel answers "why does KRYLO believe this?" with citation and observation time.
5. UNSUPPORTED and DISSOLVED are both representable and never conflated.
6. No numeric scale, gauge or generic strength appears.
7. Old and new renderers produce consistent counts for the same payload during S8.

---

## Part 6 — Open items

| ID | Item | Type |
|---|---|---|
| D-0 | MAP gains the canonical relational layer while co-presence keeps its relabeled meaning (reconciles with KRYL-1343 scoping). | Founder decision |
| D-1 | Durable persistence scope for canonical `ρ` beyond the KRYL-1334 path. | Founder decision / ticket |
| D-2 | Definition of "observation group" per domain. | Founder decision |
| D-3 | Mapping of each ratified relationship type to a domain sector for counterparty placement (no inferred mapping). | Founder decision |
| D-4 | Change-predicate encoding on the rail without reusing convergence-state colors (§6). | Founder decision |
| U-1 | Frozen MAP acceptance rubric not located. | Missing artifact |
| U-2 | Producer for observation groups. | Gap |
| U-3 | Whether SEC/patent producers run live today (`runSecOwnershipSync()` had zero callers on 2026-08-19; not re-verified). | Factual check |
| U-4 | "FORMATIONS" header label currently counts co-presence output; meaning changes after D-0. | Labeling |
| U-5 | KRYL-1346 legacy-row retention policy (preserve as noncanonical history vs discard). | Founder decision (existing) |
| U-6 | `event.topology` validation (KRYL-1344). Not required by this blueprint. | Factual check (existing) |
| U-7 | RelationDynamics real-data validation (KRYL-1345). Not required by this blueprint. | Validation (existing) |

---

## Part 7 — Reuse summary

Reused as-is: canonical admission and types, typed-edge projection, entity identity bridge, formation-state persistence and fetch, domain signal pool, co-presence detection (relabeled), parent → iframe message, Target Packet coverage.
Adapted: MAP renderer layout (declared replacement), state vocabulary, rail encoding, legend, co-presence role.
Built new: shared state helper (extraction, not new logic), canonical `ρ` persistence for remaining producers, CFX over the canonical graph, observation-group producer.
Deprecated only after acceptance: spring layout, RelationCore as a construction path, 5-state vocabulary.
