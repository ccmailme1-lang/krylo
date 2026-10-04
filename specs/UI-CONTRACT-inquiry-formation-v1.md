# UI CONTRACT — Inquiry Formation Layer V1 (DRAFT, file only)

Status: draft for Founder review. Nothing here is implemented. No code, UI, Jira, production or existing spec was changed to produce it.
Relates to: KRYL-1325 (implementation), KRYL-1324 (semantic integrity), `specs/CODE-MAPPING-inquiry-formation-v1.md` (Parts 1-4).

**Design authority.** Every item marked `FOUNDER TBD` — visible copy, layout, visual treatment, control appearance, band boundaries — is Founder
design authority (CLAUDE.md §5). This contract describes WHAT exists in each state (content, behaviour, instantiation), never how it looks or reads.
Palette/type constraints from CLAUDE.md §6/§7 apply to whatever the Founder specifies.

## 0. Two terms that matter (the UI gate depends on them)

- **Not rendered** — the component exists (mounted, hooks and effects run, state is held) but draws nothing or is hidden (CSS, `return null`, off-screen).
- **Not instantiated** — the component element is never created: no mount, no hooks, no effects, no store objects, no side effects from it.

The gate requires **not instantiated** for every analytical surface and for the session object in S0–S5. "Hidden" does not satisfy it.
Behavioural test for a boundary (all must hold): (a) selector for the surface finds 0 nodes; (b) `useAnalysisStore.getState().sessions` has 0 entries and
`activeSessionId` is null; (c) `synthesizeQuery` / `buildAnalysisIntent` for the session were not called after the seed was entered (spy count 0);
(d) no `session_open` telemetry event was emitted.
Today's reference: `TargetPacket` and `StructurePanel` are inside `{hasSession && …}` in analysisidlefield.jsx (~1704), so they are not instantiated
before `createSession`; inside StructurePanel only the active tab mounts. That property must survive the change.

## 1. Entry points and triggers (inventory, [READ] unless noted)

| # | Entry | Where | Creates a session? | Contract requirement |
|---|---|---|---|---|
| E1 | Submit arrow (round lime button) | analysisidlefield.jsx `onClick={handleExecute}` (~1939) | Yes (900 ms later) | Must NOT authorize a session in S1-S5. Its future is Founder TBD (see D8). |
| E2 | Cmd/Ctrl+Enter in the textarea | `onKeyDown` (~1774) | Yes (same function) | Must be inert in S0-S4; may act only as the EXAMINE shortcut in S5 if the Founder allows (D8). |
| E3 | Hero iframe `krylo-submit` message | app.jsx ~1194 | No session. Sets nav to `surface`, activates the ConeMap surface, calls `fireTopicConnectors(q)` (the ambient topic set) | Not an inquiry-formation path. Disposition TBD (D6): it still writes ambient signals to the shared pool. |
| E4 | Ribbon headline click (`krylo-ribbon-select`) | app.jsx ~1085 | Yes, via `handleSessionBootstrap` | Bypasses the front door. Route through the gate or exempt explicitly (D6). |
| E5 | Geo-disambiguation resume | app.jsx ~1291 | Yes | Same as E4 (continuation). |
| E6 | Ingestion builder | ingestionbuilder.jsx:161 | Yes | Mount status for guests unverified; decide (D6). |
| E7 | History RE-RUN | historybay.jsx:577 | Yes (stores only the query) | Must store the formed inquiry (seed + pressure) or be exempted (D6/D7). |
| E8 | Project load / brief import / cone-assignment watcher | app.jsx 1093, intelligencebrief.jsx:526, app.jsx 1186 | Yes | Restore/background, not inquiry formation; explicit exemption (D6). |
| E9 | `searchprofile.jsx` | — | Dead code (imported by nothing) | n/a |

Rule: at the front door exactly ONE control authorizes session creation — EXAMINE — and it is reachable only from S5.

## 2. Seed classes (what the resolver can hand the UI)

Resolver = a new all-candidates resolver alongside `subjectScope` (mapping Part 3). Classes used below:

| Class | Meaning | Example |
|---|---|---|
| C0 | empty or insufficient text (sufficiency rule = D1) | "" |
| C1 | no entity resolved | "Which ports create the largest single point of failure" |
| C2 | exactly one resolved entity, no unresolved name | "NVIDIA" |
| C3 | two resolved entities | "NVIDIA Microsoft" |
| C4 | mixed: resolved entity(ies) plus name(s) that are not established | "NVIDIA TSMC" |
| C5 | three or more resolved entities (pairwise V1 scope exceeded) | "NVIDIA Microsoft AMD" |

Rule for unresolved names: a name-shaped span that fails resolution is shown as **ENTITY NOT ESTABLISHED** (never dropped, never substituted, never covered by another entity's evidence).
Which spans count as name-shaped is D4.

## 3. State-by-state contract

Column order in each table: Inputs -> decision -> surfaces instantiated -> visible state -> user action -> next state -> execution/session consequences.
"Visible" lists CONTENT only; copy/layout/treatment = FOUNDER TBD.

### S0_EMPTY
| | |
|---|---|
| Inputs | textarea empty (also: after reset) |
| Decision | none |
| Instantiated | idle field shell: search box, existing chrome (per §6 disposition list) |
| Not instantiated | resolver output, Available-to-Examine panel, formed-inquiry line, EXAMINE control, TargetPacket, StructurePanel (BRIEF/MAP/RECON/IMPACT), any session |
| Visible | the search box. Whether any prompt/label appears is FOUNDER TBD. No "Subject + Context + Scope" requirement (UI-01). |
| User action | type or paste |
| Next | S1 (as soon as text is non-empty; the sufficiency gate, if any, is D1) |
| Consequences | none: no connector call, no session, no telemetry beyond page telemetry already present |

### S1_SEED_RECEIVED
| | |
|---|---|
| Inputs | seed text (immutable evidence of intent) |
| Decision | seed accepted (D1: what makes a sparse seed "meaningful"); seed class not yet known |
| Instantiated | same as S0 plus the seed held verbatim as the source of truth |
| Not instantiated | as S0 |
| Visible | the seed as typed; nothing else new. Any trigger affordance to start resolving (automatic on pause vs explicit action) is D2 |
| User action | continue typing (stays S1), clear (-> S0), or start resolving (per D2) |
| Next | S2 |
| Consequences | none until resolving begins |

### S2_RESOLVING
| | |
|---|---|
| Inputs | seed text |
| Decision | run, in order: all-candidates entity resolution -> per-resolved-entity evidence gather (entity-scoped connectors only, NOT the ambient topic set) -> per-entity/per-pressure eligibility -> observability metrics -> pair availability |
| Instantiated | a resolving indication; the internal gather (see consequences) |
| Not instantiated | Available-to-Examine panel (until S3), formed-inquiry line, EXAMINE, all analytical surfaces, any session |
| Visible | that resolving is in progress (content of the message: FOUNDER TBD). Whether partial per-entity results stream in or appear together is D3 |
| User action | edit the seed (cancel and restart: results are discarded, keyed to the seed they were computed for); clear (-> S0) |
| Next | S3_A (>= 1 eligible pressure), S3_B (none), or S2_E (acquisition incomplete) |
| Consequences | Network calls to EDGAR/USAspending etc. for each resolved entity. Writes attributed signals into the SHARED signal pool (visible to other navigation modes such as the surface/ConeMap; results persist after the seed changes). No session, no `session_open`. Bounded wait: maximum duration = FOUNDER/ENGINEERING TBD (observed <= ~20 s cold, 84 ms warm). |

### S2_E_ACQUISITION_INCOMPLETE (not in the locked spec; needed)
Reason: in dev, several connectors returned errors (503/403/404). Absence and failure are different classified states (CLAUDE.md §1, Absence-Is-Signal): "no evidence exists" must never be presented when a source could not be reached.
| | |
|---|---|
| Inputs | one or more required connectors failed or timed out |
| Decision | eligibility computed from what returned; the incomplete sources are recorded per entity |
| Visible | which entity/pressure bases are incomplete and that the result may be partial (copy: FOUNDER TBD). Distinct from S3_B |
| User action | retry resolving; proceed with what is available (D5) |
| Next | S3_A / S3_B with the incompleteness disclosed, or back to S2 on retry |
| Consequences | as S2; no session |

### S3_A_AVAILABLE (Available to Examine)
| | |
|---|---|
| Inputs | resolution result (seed class), per-entity per-pressure eligibility and counts, pair availability |
| Decision | For each of the six canonical pressures and each resolved entity: eligible iff >= 1 attributed observation for that entity in that pressure with provenance (source + eventDate). A pressure is PAIR-available only if BOTH resolved seed entities establish it. Eligibility never depends on observability ordering. |
| Instantiated | Available-to-Examine panel (per-entity structural basis; ENTITY NOT ESTABLISHED rows) |
| Not instantiated | formed-inquiry line, EXAMINE control, all analytical surfaces, any session |
| Visible (content) | see 3.1-3.3 below |
| User action | select a selectable pressure (-> S4); edit the seed (-> S1, panel discarded); clear (-> S0) |
| Next | S4 |
| Consequences | none new; nothing is preselected; the evidence in the pool remains |

3.1 **Per-entity structural basis** (content contract). Rows are per pressure, then per resolved entity. For each cell: observation count, count of distinct **connector sources** (wording: connector level, not "independent sources"/documents, until a signal -> evidence-node join exists), and — if the Founder wants it — source names. "Structural-class diversity" needs a V1 definition (D9). A cell with zero observations is shown as zero, not omitted.
3.2 **ENTITY NOT ESTABLISHED** (content contract). One row per unresolved name-shaped span. States the name as entered and that no entity is established for it. It carries no dimensions, no counts, no borrowed evidence. Its presence changes what is selectable (D1/D2 in section 6 decisions).
3.3 **Observability presentation** (content contract). Ordering: distinct connector sources, then class diversity, then primitive count, descending, deterministic. The basis (the three counts) is inspectable. Any HIGH/MODERATE/LOW labelling: band boundaries are a Founder-authored parameter (D10); until set, counts only. Forbidden content everywhere in this panel: percentages, confidence, relevance, strength, importance, "best", "recommended", "most", probability (UI-06). Ordering must not determine eligibility or selection (UI-07).

### S3_B_WITHHELD
| | |
|---|---|
| Inputs | seed class C1, or no pressure eligible for any resolved entity, or C0 after resolving |
| Decision | withhold; no field-wide fallback, no generic analysis, no fabricated dimensions |
| Instantiated | withhold notice |
| Not instantiated | Available-to-Examine panel, formed-inquiry line, EXAMINE, all analytical surfaces, session |
| Visible (content) | that no governed structural basis could be established for this seed and that nothing was executed; the ENTITY NOT ESTABLISHED rows if any names were found; not a blank field (copy: FOUNDER TBD) |
| User action | edit the seed (-> S1); clear (-> S0) |
| Next | S1 / S0 |
| Consequences | no session; evidence gathered in S2 (if any) stays in the pool. Structural absence is a valid outcome, distinct from S2_E (failure). |

### S4_DIMENSION_SELECTED
| | |
|---|---|
| Inputs | user selection of exactly one selectable pressure (multi-select = D11) |
| Decision | bind {seed text verbatim, resolved entity ids, unresolved names, pressure id}; the pressure id (a canonical pressure) is the explicit analytical input |
| Instantiated | formed-inquiry line inside the search box; EXAMINE control (state per S5) |
| Not instantiated | all analytical surfaces, session |
| Visible (content) | the seed exactly as entered PLUS the selected pressure, in one line inside the search box (`[SEED + PRESSURE]`); the unresolved names still marked as not established; no generated question, no relationship wording (UI-12) |
| User action | select a different pressure (replaces the selection, seed unchanged); deselect (back to S3_A); edit the seed (-> S1, selection cleared); clear (-> S0) |
| Next | S5 |
| Consequences | none: no session; selection is state in the idle field only |

### S5_READY_TO_EXAMINE
| | |
|---|---|
| Inputs | S4 binding is complete (seed + pressure + provenance available for every bound entity) |
| Decision | EXAMINE is enabled only if every bound entity has provenance for the selected pressure (no provenance -> not executable, stays S4 with a stated reason) |
| Instantiated | formed-inquiry line; EXAMINE (a distinct control, not the existing submit arrow re-gated) |
| Not instantiated | all analytical surfaces, session |
| Visible (content) | the formed inquiry and the EXAMINE control; preview of exactly what will be bound (seed entities, pressure, unresolved names excluded) |
| User action | EXAMINE (explicit authorization); change pressure (-> S4); edit seed (-> S1); clear (-> S0) |
| Next | S6 only via EXAMINE |
| Consequences | none until EXAMINE |

### S6_ANALYTICAL_SESSION
| | |
|---|---|
| Inputs | ExecutionLedgerPayload: seed entity ids, selected pressure id, the exact bounded evidence set (JS: a frozen object placed in `session.tensor`) |
| Decision | `createSession` is called once, by EXAMINE only |
| Instantiated | TargetPacket (left) and StructurePanel (right, default tab BRIEF); MAP, RECON, IMPACT instantiate only if the guest opens that tab |
| Visible | the results panels per existing layout (existing visual language unchanged) |
| User action | tabs; New Query (`resetSession`) -> S0; RE-RUN from history (D7) |
| Next | S0 on reset |
| Consequences | `session_open` telemetry; `synthesizeQuery` and packet/brief run; every reader honours the bound (section 5); a missing bounded evidence item = withhold, never a wider read. The post-EXAMINE ledger (KRYL-1324 interim) still discloses uncarried seed text. |

## 4. Cross-cutting UI behaviours

4.1 **Formed inquiry lives in the search box.** The textarea (seed) and the formed-inquiry line are the single source of truth for the inquiry; the Available-to-Examine panel exposes choices but owns nothing. The seed text is never rewritten by selecting, reselecting or deselecting (UI-02, UI-09). The existing "+ ADDED" breadcrumb is not assumed to satisfy this: nothing existing renders `[SEED + PRESSURE]` (mapping 3.5).
4.2 **EXAMINE control.** Visibly and semantically distinct from any submit/search affordance so the guest understands: first interaction = forming an inquiry, second = authorizing examination. Absent in S0-S3; present-but-not-authorizing is not allowed (a disabled look is fine; an enabled control that does not examine is not). Appearance/copy: FOUNDER TBD.
4.3 **No automatic selection (UI-07).** Initial selection state after S3 is empty. Nothing is defaulted, preselected, auto-focused with selected semantics, or visually preferred (including by ordering, size, colour, or position-implies-best). Keyboard focus rules must not create an implicit selection (D12).
4.4 **Stale-state invalidation.** Editing the seed in S2-S5 returns to S1: pending gather results are discarded (keyed to the seed they were computed for), the panel is discarded, the selection is cleared. Clear/New Query returns to S0 with no stale selection. Already-gathered pool signals persist (a bound filters by entity id, it never assumes an empty pool).
4.5 **Withheld vs blank.** S3_B is a visible state, not an empty region. S2_E is a distinct visible state from S3_B.
4.6 **No relationship language.** Available-to-Examine and the formed inquiry never state or imply a relationship between resolved entities. "Available for pair examination" means both sides have a structural basis in that pressure, nothing more (UI-12).
4.7 **Seed-class selectability matrix** (what may be selected in S3_A):
| Class | Selectable | Open |
|---|---|---|
| C2 (one entity) | each pressure with >= 1 observation, as a single-entity inquiry | — |
| C3 (two entities) | pressures where BOTH establish (pair inquiry) | may one entity be examined alone from a pair seed? (D2) |
| C4 (resolved + not established) | not decided | may the resolved entity be examined alone, with the unresolved name displayed as not established? (D1) |
| C5 (3+ resolved) | not decided | V1 is pairwise; behaviour for 3+ is undefined (D3) |
| C1 / C0 | nothing (S3_B) | — |

## 5. Instantiation boundaries: MAP / BRIEF / RECON / IMPACT (and the packet)

| Surface | S0-S5 | S6 | What it must read in S6 (bound requirement) | Reads today [READ] |
|---|---|---|---|---|
| TargetPacket | not instantiated | instantiated | the session bound | session tensor; field branch when not ENTITY |
| StructurePanel shell | not instantiated | instantiated | n/a | n/a |
| BRIEF (`IntelligenceBrief`) | not instantiated | instantiated (default tab) | the session bound | active session |
| MAP (`FormationMapTab` + structure-field.html iframe) | not instantiated | instantiated only when its tab is opened | the bound entities' evidence only | `getAllDomainPressures()` + `buildPerceptionField({now})` with no subject: whole pool. **Must change.** |
| RECON (`ReconDashboard`) | not instantiated | only when its tab is opened | the bound | `synthesizeQuery(session)` plus global happy-path/SCP state; mixed. **Must be checked and bounded.** |
| IMPACT (`CausalImpactView`) | not instantiated | only when its tab is opened | the bound entities | `subject={query}` -> topology keyed by the RAW query string; ignores the tensor. **Must change.** |
| Session object / store entry | none | created once at EXAMINE | n/a | `createSession` |

Consequence of instantiation timing: because tab mounting is lazy, the bound must be delivered by props/session, not captured at the moment of EXAMINE, so a tab opened later still receives the same bound.
Global side effect that survives all states: S2 writes attributed signals to the shared pool. Surfaces that are not part of the inquiry (surface/ConeMap, feeds) can display those signals; whether that is acceptable is D6.

## 6. Existing front-door surfaces — disposition needed (FOUNDER TBD)

| Surface | Today | Contract constraint | Disposition |
|---|---|---|---|
| Heading / "BRING A QUESTION" / "Subject + Context + Scope" copy | KRYL-1317 (Done) | must not require Subject+Context+Scope (UI-01) | TBD |
| `+ timeline` (COMPLETE THE PICTURE) | KRYL-1222, parked | not part of this contract; if kept it must not authorize a session or add a selection | parked |
| STRUCTURAL SIGNAL CHIPS row + "+ ADDED" breadcrumb (KRYL-1304/1306) | inside the box | must not compete with Available-to-Examine as a second selection system | TBD |
| SIGNAL SCOPE (LIVE/HISTORICAL), OUTPUT filters | below the box | apply to the session; whether they apply in S2/S3 is TBD | TBD |
| EXCLUDE SIM, "+" attachment, mic | in the toolbar | must not create a session | TBD |
| Clocks | right of the box | unaffected | n/a |

## 7. Open decisions (each blocks the states named)

- **D1** Sparse-seed sufficiency and C4 handling: what makes a seed "meaningful" (min characters? any entity?), and whether a resolved entity in a mixed seed may be examined alone. Blocks S1, S3_A/S3_B, C4.
- **D2** When resolving starts (automatic on pause vs explicit action), and whether one entity of a C3 seed may be examined alone. Blocks S1->S2, C3.
- **D3** Streaming vs all-at-once results in S2; behaviour for 3+ resolved entities (C5). Blocks S2/S3_A.
- **D4** Which unresolved spans get an ENTITY NOT ESTABLISHED row (only Title-Case/quoted spans that pass the candidate shape gates vs every uncovered token). Blocks 3.2.
- **D5** S2_E: proceed with partial evidence or require retry; whether partial results may be selected. Blocks S2_E.
- **D6** Dispositions for E3-E8 (route through the gate vs explicit exemption) and whether pool-writing at S2 is acceptable for other navigation modes. Blocks Slice B and the "no session before EXAMINE" claim.
- **D7** History RE-RUN: store the formed inquiry (seed + pressure) or exempt.
- **D8** Fate of the submit arrow and of Cmd/Ctrl+Enter (removed, relabelled, or EXAMINE-only from S5).
- **D9** V1 definition of "structural-class diversity" (connector class? evidence class?) so the sort tuple is defined.
- **D10** HIGH/MODERATE/LOW: whether shown at all, boundary values, wording (Founder-authored parameter; counts-only until set).
- **D11** Single vs multiple pressures per inquiry (the locked spec reads singular).
- **D12** Keyboard/focus rules that guarantee no implicit selection.
- **D13** §21 ruling: whether gating the analytical surfaces on explicit EXAMINE is acceptable (the pressure list itself is presented unconditionally).

## 8. Traceability

Ten items -> sections: S0-S6 transitions (3), Available to Examine (S3_A), per-entity structural basis (3.1), ENTITY NOT ESTABLISHED (3.2), observability presentation (3.3), formed inquiry in the search box (4.1, S4/S5), explicit EXAMINE (4.2, S5), no auto-selection (4.3), withheld state (S3_B, 4.5), MAP/BRIEF/RECON/IMPACT boundaries (0, 5).
UI-01..UI-13 -> UI-01 (S0/S1, 6), UI-02 (S1, 4.1), UI-03 (no generated question chips: 4.1, 6), UI-04/05/06 (3.3), UI-07 (4.3), UI-08 (0, 3, 5), UI-09 (4.1, S4), UI-10 (S5), UI-11 (S3_B), UI-12 (4.6), UI-13 (5).
Not covered by this contract (not UI): the engine/data slices (KRYL-1325 Slices A, D), registry additions (TSMC), and the answer-status work (KRYL-1324).
