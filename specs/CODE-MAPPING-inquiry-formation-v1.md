# CODE MAPPING — Inquiry Formation Layer v1 (locked behavioral spec) → existing KRYLO code

DRAFT reconciliation. Not a ticket set, not a ratification. Read-only trace, 2026-09-25.
Correction carried in: an earlier statement ("about half of what it depends on doesn't exist") was a
LEXICAL result (new names/schemas absent). This document maps at the behavior / data-flow level.
Stack note: the spec's Python dataclasses are architectural notation; everything below is JS/Node.

Verification tags: [LIVE] observed in the running dev app; [READ] read from source only; [UNVERIFIED].
Gap types: ADDITIVE (new small piece, nothing replaced) · MODIFICATION (existing behavior changes) ·
REPLACEMENT (architecture swapped).

## Traced path: seed "NVIDIA TSMC"

| Step | What KRYLO does today | Where |
|---|---|---|
| Raw input | Textarea → `handleExecute()`; text preserved verbatim (flushedQuery) | analysisidlefield.jsx |
| Classification | `buildAnalysisIntent` / `parseIntent` / `subjectScope` | analysisintent.js, subjectscope.js |
| Entity resolution | `subjectScope` loops over `nameCandidates(text)` → `resolve()` but KEEPS ONLY THE BEST match. NVIDIA → ENTITY `nvidia`. "TSMC" alone → UNRESOLVED [LIVE]. TSMC is not in `entityregistry.json` (57 entities; fields canonicalId, aliases, identifiers{edgar,fec,uei}, domainTags = six-domain ontology). | subjectscope.js, entityresolution.js |
| Structural container | `TOPOLOGY_CLUSTERS.AI_COMPUTE = [NVIDIA, TSMC, ASML, MICROSOFT, BROADCOM, AMD]`; `resolveTopology('NVIDIA')` includes TSMC and vice versa [LIVE] | entitytopologyregistry.js (WO-1855) |
| Subject/domain binding | `A(domain, scope)` per domain; evidence bound by identifier containment; `formationObservations` = pool signals with `canonicalId === subject && domain === D` | adsubject.js |
| Evidence/provenance | 8-K evidence events carry `accessionNumber`, `filingDate`; SEC ownership connector uses accession as `provenanceHash`; signals carry `source` | edgar8kevidence.js, secownershipconnector.js, domaingravity.js |
| Dimension eligibility (today) | `queryChipSubstrate({scope, domains})` over `A()`. NVIDIA → no observationCandidates; all six domains ABSENCE, eligible:false [LIVE]. TSMC → UNRESOLVED/FIELD scope [LIVE]. | chipsubstrate.js |
| Selection binding (today) | KRYL-1306: chip → `selectedRefinementIds` → `tensor.structuralRefinements` → `canonicalDomainOverride` in synthesis; original query immutable | analysisidlefield.jsx, querysynthesis.js:4367 |
| Session creation | Only in `handleExecute()` at the front door (plus the other call sites listed under Conflicts) | useanalysisstore.js |
| Execution | `synthesizeQuery` + packet/brief read pool/field; subject-filtered when scope is ENTITY, "live field" branch otherwise | querysynthesis.js, targetpacket.jsx |

## Spec primitive → closest existing code

### 1. Bounded hyperedge intersection (E1 → [CONTEXT] ← E2, N ≤ 1)
- Closest: `TOPOLOGY_CLUSTERS` + `resolveTopology()` — literally entities anchored to a shared named container. [LIVE]
- What it does today: returns peer lists; no intersection function, no provenance, no class.
- Limits: v1 is manually curated ("v1 is manually curated" in its own header). Its ids are upper-case strings (`NVIDIA`), different from registry `canonicalId` (`nvidia`); reconciled only by upper-casing.
- Gap: **ADDITIVE** — `intersect(idA, idB)` returning the clusters that contain both; **MODIFICATION** — attach a provenance record to each membership (source = registry file + version; class = curated-membership).
- Second candidate container: CF-ECO ecosystems (`SEMICONDUCTOR`, `AI_COMPUTING`, …), deterministic membership by NAICS prefix or grounded entity tag. It CANNOT serve yet: no live entity carries a `naicsCode`/`entityTags` (the adapter's own header says every real observation is honestly skipped today). It becomes usable if registry entities gain NAICS/tags from a verified source.
- Third candidate: `TYPED_EDGES` (`{from,to,type,source,ts}`) — carries a predicate (`type`), so it is NOT a "pure" primitive; population path [UNVERIFIED].

### 2. Pure structural primitive / provenance commitment
- Closest: a topology membership pair (pure); `RelationCore.provenanceHash` (relationontology.js) is an ARTIFACT identifier (e.g. an SEC accession), not a hash over evidence coordinates.
- Absent by design today: byte ranges, source-document URIs, extraction timestamp/retrieval version as one hashed object.
- What survives ingestion: 8-K events keep `accessionNumber` + `filingDate` (record/document-level identity). Document text is fetchable via the EDGAR proxy, so byte offsets are computable at fetch time but are not stored.
- Gap: **ADDITIVE** (frozen primitive + commitment object built at fetch); evidence granularity today = record/document, not paragraph/byte.

### 3. Governed dimension registry + deterministic eligibility
- Closest: the AUTHORED `signalDefs` in `domainintelligence.js` (maturity AUTHORED) per canonical domain, consumed by `chipsubstrate.js` and `adsubject.js`. Eligibility is already deterministic, LLM-free, and absence is classified (structural/temporal/…) rather than defaulted.
- Today's dimension set = six canonical domains × authored signals; withhold already exists as classified absence.
- Spec labels ("MANUFACTURING & PHYSICAL INFRASTRUCTURE", "TECHNOLOGY & IP ARTIFACTS", …) are finer than the six domains. Two readings: (a) dimension_id = canonical domain (no new taxonomy, matches the spec's own non-goal); (b) a new registry keyed by structural class (a taxonomy → Founder-authored, as KRYL-1297 did for ecosystems). Which reading is intended is not decided by the code.
- Gap: **ADDITIVE** (a frozen registry view over existing authored defs) if (a); label copy is Founder design authority (§5).

### 4. Observability metrics + ordering + bands
- Closest input data: `A().formationObservations` → each has `source`, `signal`, `eventDate`, `ts`; independent source = distinct `source` (connector level) or distinct accession (document level).
- Attribution timing (important): pool signals carry a `canonicalId` field, but in the live dev run 0 of 73 signals were attributed to any entity [LIVE]. Subject attribution appears only after subject-triggered connectors run, and those run at EXECUTE (`fireTopicConnectors`, `runCapitalRealizationSync`), not at seed entry. Earlier session runs did show subject-bound counts once executed (e.g. Amazon: 16 subject-bound, 15 dated 8-K lines).
- Consequence for the NVIDIA/TSMC example today: intersection provenance = 1 curated source → every dimension would band LOW; real HIGH/MODERATE requires evidence to exist before EXAMINE.
- Gap: sort tuple + band function **ADDITIVE** (pure); running the evidence connectors at S2_RESOLVING (before EXAMINE) is a **MODIFICATION** of when connectors fire. Thresholds 5 / 2–4 are new defaults with no cited precedent (§1).

### 5. Inquiry Formation UI (S0–S6, firewall)
- Already true by construction: no analytical session exists until `handleExecute()` (S6 gating at the front door).
- Closest existing panel: STRUCTURAL SIGNAL CHIPS row (`eligibleRefinementChips` ← `queryChipSubstrate`) — already "eligible dimensions per subject, from grounded evidence, with absence" — but no observability basis line, no pair, no preview, and it is empty for most queries because attribution is post-execute.
- SEED + DIMENSION binding: KRYL-1306 refinements (original query immutable, chip token in the breadcrumb, `structuralRefinements` → domain override) already implement "selected dimension becomes explicit analytical input" without rewriting the seed.
- To retire: KRYL-1290 `deriveInquiryPossibilities` chips (generated-question chips are banned by UI-03). They are already unrendered; the memo and pool entry remain. **REPLACEMENT** of that generator by the dimension panel; KRYL-1290 §5/§6 needs a recorded supersession.
- Gap: explicit EXAMINE gate and formed-inquiry preview = **MODIFICATION** of the front door (submit arrow currently executes at any time, with or without a dimension); "Subject + Context + Scope" copy removal (UI-01) = small **MODIFICATION** (source: analysisidlefield.jsx line ~1749, from KRYL-1317).
- Pairwise seed: `subjectScope` is single-subject by design; keeping all resolved candidates is **ADDITIVE** (new `resolveSeedEntities` alongside, `subjectScope` unchanged). TSMC needs a registry entity with verified identifiers (**ADDITIVE data**, KRYL-1237/1238 territory).

### 6. Bounded execution / firewall
- Closest: `A(domain, scope)` — evidence bound by identifier containment; `fieldContext` labelled CONTEXT ONLY; ENTITY scope path in the packet filters the pool by `canonicalId`.
- Global reads: `getAllSignals/getObservations/computeDomainPressure` are read in 12 files (querysynthesis.js 2 sites, domaingravity.js 6, chipsubstrate/adsubject and others) — most guard-able at the boundary rather than rewritten, per-file not verified [UNVERIFIED].
- The leak points are the "live field" fallback branches (e.g. targetpacket `FIELD SCOPE — LIVE OBSERVABLE FIELD, NOT SUBJECT-BOUND`).
- Gap: thread a `bound` object through `session.tensor` and make readers honor it = **MODIFICATION**, not a new engine. Not a replacement.

### 7. Relationship → Answer status
- Owned by KRYL-1324 (needs-spec). Existing: RECONN payload (`assembleReconnPayload`), `deriveRCmp`, relationship authority with no persisted admissions yet. Dependency chain unchanged: materiality rule → relationship admission → answer status.

## Genuinely does not exist yet
1. Pairwise seed resolution (subjectScope keeps one).
2. A provenance-bearing intersection over containers (topology has membership, no provenance).
3. Evidence-coordinate provenance (byte range / URI) and a hashed commitment object.
4. Observability metrics/ordering/bands and their basis line.
5. Pre-EXAMINE evidence gathering (connectors run only at execute).
6. The EXAMINE gate and formed-inquiry preview.
7. A `bound` payload honored by synthesis and packet readers.
8. TSMC (and FedEx/UPS-type entities) as verified registry entities.

## Actual conflicts with ratified Jira/spec behavior
- **KRYL-1290 (ratified):** generated question chips retired (UI-03); §6 chip→question transition already reversed by KRYL-1306. Needs a recorded supersession, not an accident.
- **KRYL-1317 (Done):** its "Subject + Context + Scope" copy contradicts UI-01.
- **KRYL-1308 (Ready):** it asks that real structure survive subject-binding failure (labelled field context). The spec's S3_B says no field-wide fallback. The conflict is real but narrow: S3_B governs the pre-session gate; KRYL-1308 governs sessions that already exist. It does not conflict with "no session before examine" as such — but see next.
- **"No session before EXAMINE" cannot be enforced at the front door alone:** `createSession` is also called from app.jsx `handleSessionBootstrap` (ribbon select, cone assignment), ingestionbuilder.jsx, intelligencebrief.jsx (refine), searchprofile.jsx, historybay.jsx. UI-08/UI-13 need a decision on those paths.
- **CLAUDE.md §21:** the dimension list (eligibility + observability) is itself presented unconditionally, which satisfies the acceptance test at the inquiry level. The remaining question is whether gating MAP/BRIEF on an explicit selection is acceptable under §21; that is a ruling, not a certain violation. (Earlier I overstated this as a conflict.)
- **§1 precedent:** the 5 / 2–4 band thresholds and the lexicographic order are new defaults without a cited precedent.
- **Design authority (§5):** dimension label copy and the registry contents are Founder-authored.

## Reuse summary
Reuse as-is: `subjectScope` (single-subject path), `A()`, `queryChipSubstrate`, KRYL-1306 selection/breadcrumb/override, `TOPOLOGY_CLUSTERS`, accession-based evidence identity, `createSession` at handleExecute.
Reuse with modification: front-door submit gate, topic-connector timing, packet/brief field-fallback branches.
Retire: `deriveInquiryPossibilities` chips (already unrendered).
New: the eight items above.

## Not verified in this trace
Per-file behavior of all 12 global-pool readers; `TYPED_EDGES` population; whether real connector runs for a pair produce non-LOW bands; how MAP/RECON/IMPACT consume a bounded payload (only BRIEF/packet paths were read).

---

# PART 2 — Implementation seams (UI + state + data flow + execution), traced 2026-09-25

Tags: [LIVE] observed in the running dev app · [READ] source only · [UNVERIFIED].
Locked for this part (from the review): keep `subjectScope` intact and add pairwise alongside; `TOPOLOGY_CLUSTERS` is the V1
container substrate (membership is NOT evidence); evidence gathering at RESOLVING only as needed to populate Available to
Examine, never an analytical session; formed inquiry lives in the search box; observability is descriptive only; V1 dimension =
the six canonical pressures (no second ontology; finer labels only as governed dimensions beneath them).

## Seam 1 — every `createSession` call site (classified)

| # | Site | Trigger | Class |
|---|---|---|---|
| 1 | analysisidlefield.jsx:1285 (`handleExecute`) | submit arrow, 900ms delayed | **Analytical execution — the front door; the EXAMINE gate goes here** |
| 2 | app.jsx:927 via `handleSessionBootstrap` ← `krylo-ribbon-select` (app.jsx:1085) | click on a feed ribbon headline (iframe message) | **Analytical execution that BYPASSES the front door** (query only, navigates) |
| 3 | app.jsx:927 via `handleSessionBootstrap` ← geo-disambiguation resume (app.jsx:1291) | guest picks a location candidate | Analytical execution (continuation of #1 or #2) |
| 4 | app.jsx:1093 `krylo-load-project` | project load message | Restore/navigation. Note: called as `createSession(proj.lens || 'GENERAL')` — one argument where the store signature is `(id, lens, query, tensor)` [READ, looks like an argument-order defect, not investigated] |
| 5 | app.jsx:1186 CRE watcher | bay assignment title, no navigation | Background session (`source: 'cone-assignment'`) |
| 6 | ingestionbuilder.jsx:161 | ingestion builder (imported by app.jsx, ingress.js) | Analytical execution via document ingest; mount status [UNVERIFIED] |
| 7 | intelligencebrief.jsx:526 | import of an exported brief JSON | Restore |
| 8 | historybay.jsx:577 | RE-RUN of a history entry (stores only `entry.query`) | Analytical re-execution — **would lose seed+dimension** unless the formed inquiry is stored |
| 9 | searchprofile.jsx:105 | — | Dead: imported by nothing |

Hygiene: a stray `src/app copy.jsx` duplicates app.jsx and imports the same components.
Hero `krylo-submit` path (app.jsx ~1194, "preview entity in stat card"): whether it creates a session was not traced [UNVERIFIED].
Implication: the "no session before EXAMINE" invariant needs an explicit decision for #2, #3, #6, #8 (each is an analytical
execution that never passes through the front door); #4, #5, #7 are restore/background and #9 is dead code.

## Seam 2 — global signal-pool readers (which can escape a bound)

Two pools: the domaingravity signal pool (`getAllSignals`) and `runtimeobservablestore` (`getObservations`).

| Reader | Reads | Scoping today | Verdict |
|---|---|---|---|
| adsubject.js `A()` | getAllSignals | filter `canonicalId === subject && domain === D` | Bound-safe (single subject) |
| perceptionread.js `buildPerceptionField({subject})` | getAllSignals | fail-closed identifier match when `subject` is passed; ambient when not | Bound-safe only if `subject` is always passed |
| reconnpayload.js `temporalState(domain, canonicalId)` | getAllSignals | filters by canonicalId when given, else all | Bound-safe only if called with the id |
| targetpacket.jsx `fieldFormation` | via perceptionread | passes `subject` only for `subjScope.kind === 'ENTITY'`; otherwise ambient ("LIVE OBSERVABLE FIELD, NOT SUBJECT-BOUND") | **Leak on the non-ENTITY branch** |
| structurepanel.jsx **MAP tab** | `getAllDomainPressures()` + `buildPerceptionField({now})` | no `subject` at all | **Definite leak** — explicitly ambient (KRYL-1287 / DEF-1300 non-goal) |
| domaingravity `computeDomainPressure` → `A().fieldContext`, structural-field polygon, DomainSubstrateTabs | whole pool | field-level by design, labelled CONTEXT ONLY | Leak unless the bound suppresses field context |
| querysynthesis / analysisidlefield / bayvisor `computeSES(getObservations())` | runtimeobservablestore | ambient environment-state annotation ("never mutates a grounded score") | Informational; not evidence for an answer, still outside any bound |
| formationinference.js | receives particles | pure | n/a |

Mechanism to reuse: the fail-closed `subject` match already exists (KRYL-1220). Gaps: it takes ONE canonicalId (pair needs a set),
it has no dimension filter (needs `domain` restriction), and one reader (MAP) never passes it.

## Seam 3 — MAP / RECON / IMPACT (and BRIEF): do they share one path?

- Mount: `TargetPacket` + `StructurePanel` render only inside `{hasSession && …}` in analysisidlefield.jsx (~1704–1716).
  So before `createSession` nothing analytical is instantiated — the state transition prevents it, it is not just hidden. [READ]
- Inside StructurePanel, ONLY the active tab mounts (conditional render): BRIEF by default; MAP/RECON/IMPACT mount on tab click.
- Data sources are NOT one path:
  - BRIEF: active session (`session.tensor`, synthesis) — session-scoped.
  - RECON: active session via `synthesizeQuery(session)` plus `useHappyPathEngine`, `scpstore` (global) — mixed.
  - IMPACT: `CausalImpactView subject={query}` → `toTopologyNodeId(query)` → `buildImpactMap` — reads the topology graph keyed by the RAW query string, not the tensor, not the bound.
  - MAP: global ambient pool (leak, above).
- Consequence: a bounded payload in `session.tensor` reaches BRIEF, the packet and (partly) RECON. MAP and IMPACT read around it and each needs the bound passed explicitly.

## Seam 4 — pre-EXAMINE evidence for a pair (behavioral probe) [LIVE]

Call: `fireTopicConnectors('NVIDIA TSMC')` in the running app with no session creation.
- Sessions before/after: 0 → 0 (no session created; `activeSessionId` stayed null).
- Pool: 73 → 100 signals within 20 s. NVIDIA-attributed: 0 → 19, by domain/source:
  CAPITAL/EDGAR_8K 12, LABOR/EDGAR_8K 5, OWNERSHIP/EDGAR_8K 1, CAPITAL/USASPENDING_ENTITY 1.
  ⇒ distinct sources per dimension: CAPITAL 2, LABOR 1, OWNERSHIP 1, TECHNOLOGY/KNOWLEDGE/MEDIA 0.
- TSMC: not attributed at all. `fireTopicConnectors` resolves ONE entity via `subjectScope(q)` and only entities with a registry
  EDGAR CIK get entity-scoped connectors; TSMC has no registry entry. A pair needs the entity-scoped connectors invoked once per
  resolved entity (additive loop) and TSMC in the registry with verified identifiers.
- Latency ~20 s (matches the packet's own ten-tick, 20 s refresh) — RESOLVING needs a bounded, visible wait.
- Dev environment: `/api/patentsview` returned 503 (and fred/kalshi/eia/treasury errors). The spec's example dimension
  "TECHNOLOGY & IP ARTIFACTS" depends on patents; its availability could not be observed here [UNVERIFIED in prod].
- Key finding: `queryChipSubstrate` still returned **0 observationCandidates** with those 19 attributed signals present.
  Its candidates come only from `A().measures[key].status === 'FACET'` (an AUTHORED measure with bound source data); the
  domain-level attributed evidence in `A().formationObservations` is not projected into candidates. So today's chip substrate
  cannot produce the "Available to Examine" list even after evidence lands. The V1 eligibility rule for a canonical-pressure
  dimension has to be defined over `formationObservations` (domain has ≥1 subject-attributed observation with a source
  identity) — a NEW additive rule, not the existing FACET rule.

## UI mapping (search box is the centre of gravity)

| Spec element | Closest existing UI/state | Gap type |
|---|---|---|
| Sparse seed accepted, seed intact | Textarea; `flushedQuery` keeps text verbatim; "Subject + Context + Scope" copy (analysisidlefield.jsx ~1749, from KRYL-1317) | MODIFICATION (remove copy) |
| Formed inquiry in the search box | KRYL-1306 "+ ADDED" breadcrumb (`selectedRefinementIds`), already inside the box; original query immutable | MODIFICATION (render `seed + dimension`, single selection) |
| Available to Examine panel | STRUCTURAL SIGNAL CHIPS slot inside the box (`eligibleRefinementChips`) | MODIFICATION (new item renderer with band + basis; new eligibility source per Seam 4) |
| S0–S6 state machine | No explicit machine; only `processing` and `selectedRefinementIds` | ADDITIVE (`inquiryPhase` state in the idle field) |
| EXAMINE authorization | Submit arrow → `handleExecute` (runs any time, with or without a dimension) | MODIFICATION (arrow becomes EXAMINE, enabled only when phase allows) |
| No generated-question chips | `inquiryChips` memo + pool entry (unrendered) | Retire (delete memo/pool entry) |
| Structural withhold state | none for this flow (empty row renders nothing) | ADDITIVE (visible S3_B copy) |
| Reselect / clear without stale selection | existing prune-not-wipe of `selectedRefinementIds`; `resetSession()` / "New Query" | Reuse; verify against UI acceptance list |
| No analytical surface before EXAMINE | `hasSession &&` gate (Seam 3) | Already true at the front door; see Seam 1 for bypass paths |

## Not verified in Part 2
Hero `krylo-submit` session behavior; whether ingestionbuilder is mounted for guests; `krylo-load-project` argument-order defect;
RECON's global happy-path/SCP reads per line; production availability of patentsview/TECHNOLOGY evidence; any of the UI behavior
(nothing in Part 2 was built or run as a UI flow).

---

# PART 3 — Pair resolution, pair connector execution, pair-bounded eligibility (2026-09-25)

Decision recorded from the Founder relay: V1 dimension = the six canonical pressures (no second taxonomy); eligibility is a NEW
deterministic view over `A().formationObservations`, not `queryChipSubstrate()` (which answers a different question: whether an
authored measure has bound source data). No observation → not eligible. No provenance → not executable. A pair result must never
be fabricated from one entity's evidence.

## 3.1 Pair resolution
- Existing: `subjectScope` builds candidates with `nameCandidates(text)` (Title-Case spans, quoted spans, every 1–4-word window,
  plus the bare query when ≤ 8 words for all-lowercase seeds) and `resolve()` gates each. It then KEEPS ONLY THE BEST.
- `nameCandidates` is module-private. Pair resolution = the same candidate generator + `resolve()` over all candidates, keeping
  every DISTINCT resolved entity. Smallest change: a new export `resolveSeedEntities(text)` in subjectscope.js next to it;
  `subjectScope` itself untouched (**ADDITIVE**).
- [LIVE] `resolve('NVIDIA')` → `nvidia`, `resolve('Microsoft')` → `microsoft`, `resolve('TSMC')` → null. So `NVIDIA TSMC` yields ONE
  resolved entity and one NOT ESTABLISHED name. The unresolved name must be shown as such (never dropped, never substituted).
- TSMC becomes resolvable only by adding a registry entity with verified identifiers (**ADDITIVE data**; KRYL-1237/1238 own
  unverified-name handling).

## 3.2 Pair connector execution (no session)
Probe: entity-scoped connectors only, once per resolved entity, no `fireTopicConnectors`. [LIVE]
- `runCapitalRealizationSync(name)`, `runTargetedOwnershipObservation({entityCik, canonicalId, from})`,
  `runTargetedEdgar8KSignalSync({entityCik, canonicalId, entityName, from})` for NVIDIA and Microsoft.
- Result: sessions 0 → 0; pool +34 signals, ALL attributed (0 unattributed).
- Contrast with `fireTopicConnectors('NVIDIA TSMC')` (previous probe): +27 signals of which 19 attributed, i.e. 8 unattributed
  signals from the eight ambient topic connectors (github/arxiv/npm/pubmed/openalex/usajobs/gdelt/reddit) entered the same global
  pool. Those are exactly what a bounded execution must not see, so pre-EXAMINE gathering should call the three entity-scoped
  connectors directly, not `fireTopicConnectors`.
- Latency: this run returned in 84 ms warm (identical requests were likely cached); the earlier run needed ≤ 20 s cold. RESOLVING
  needs a bounded, visible wait, not an assumed instant result.
- Connectors are fire-and-forget into `dispatchBatch`; the store is global, so results from a previous seed remain in the pool.
  A bound must therefore FILTER by resolved entity ids (fail-closed), never assume an empty pool.
- Dev caveat: patentsview/fred/kalshi/eia/treasury returned errors in dev; TECHNOLOGY evidence beyond 8-K is unobserved here.

## 3.3 Pair-bounded eligibility — observed for NVIDIA + Microsoft [LIVE]

| Pressure | NVIDIA | Microsoft | Both have attributed evidence? |
|---|---|---|---|
| CAPITAL | 13 obs · 2 sources (USASPENDING_ENTITY + EDGAR_8K) | 10 obs · 2 sources (same) | yes |
| LABOR | 5 obs · 1 source (EDGAR_8K) | 4 obs · 1 source (EDGAR_8K) | yes |
| OWNERSHIP | 1 obs · 1 source (EDGAR_8K) | 0 | no (NVIDIA only) |
| TECHNOLOGY | 0 | 1 obs · 1 source (EDGAR_8K) | no (Microsoft only) |
| KNOWLEDGE | 0 | 0 | no |
| MEDIA | 0 | 0 | no |

Meaning for the rule (to be decided, shown here as the two candidate readings — the relay locks "within the resolved inquiry basis"):
- (i) Pair-eligible = every resolved seed entity has ≥ 1 attributable observation in that pressure → CAPITAL, LABOR only.
- (ii) Per-entity listing = each pressure shown under the entity that has it, pair inquiry offered only where (i) holds.
Either way the presentation must be per-entity: evidence about NVIDIA plus evidence about Microsoft in CAPITAL is two bodies of
evidence, not evidence of any relationship between them (co-location ≠ dependency; provenance ≠ truth).

Independent-source count: per pressure per entity today is CONNECTOR-level (`source` on pool signals). For the pair the distinct
sources across both entities in CAPITAL = 2, LABOR = 1, so bands would be MODERATE and LOW under the spec's thresholds (thresholds
themselves have no cited precedent).

## 3.4 What "required provenance exists" can mean in the current data
- Pool signal fields: `domain, confidence, polarity, ts, source, signal, canonicalId, eventDate` — NO accession/document id.
- Document-level identity lives in the 8-K evidence store (98 nodes in the run): `cik, accessionNumber, ticker, canonicalName,
  eventClass, items, sourceURL, filingDate, entityVerified`. There is NO join key from a pool signal to its evidence node
  (`canonicalId + eventDate + eventClass` is not stored on the signal).
- So V1 provenance-at-signal-level = `source + eventDate + canonicalId` (connector-level independence); document-level
  independence (distinct accessions) needs the join (**MODIFICATION** of the 8-K signal path to carry the evidence node id).

## 3.5 Existing controls vs the two UI corrections from the relay
- EXAMINE must be a distinct, visibly named control, not the existing submit arrow re-gated. Current arrow: `handleExecute`
  (analysisidlefield.jsx, round lime button, SVG arrow). A separate control is ADDITIVE UI; its appearance/copy is Founder design
  authority (CLAUDE.md §5).
- The "+ ADDED" breadcrumb is only implementation territory. The acceptance state is the user-visible line
  `[NVIDIA TSMC + CAPITAL]  [EXAMINE]`; nothing existing renders that (breadcrumb shows chip tokens beneath the text, separate
  from the seed). A new formed-inquiry line inside the box is required.
- `inquiryPhase` (S0…S6) does not exist; today the idle field has `processing` + `selectedRefinementIds` only.

## 3.6 Sequence the code supports (for review; nothing built, no ticket, no go)
1. `resolveSeedEntities(text)` (additive, subjectScope unchanged).
2. Entity-scoped evidence gather per resolved entity (three connectors), no session, with a bounded wait and a per-entity result.
3. Bound object `{seedText, entityIds[], unresolvedNames[], evidence filter}` built from 1–2.
4. Eligibility view over `A(domain, scope).formationObservations` per entity, per pressure (rule (i)/(ii) to be decided).
5. Observability sort tuple + bands (thresholds still unratified) and the inspectable basis line.
6. `inquiryPhase` state, Available-to-Examine panel, formed-inquiry line, separate EXAMINE control.
7. On EXAMINE: create the session with the bound in `tensor`; readers honor it (perceptionread/temporalState accept an id SET;
   MAP and IMPACT must be passed it; non-ENTITY "live field" fallback branches guarded).
8. Route the other execution paths (ribbon, geo-resume, ingest, history re-run) through the same gate or explicitly exempt them.
Blocking dependencies: TSMC (and any pair member) needs verified registry entities; rule (i)/(ii); band thresholds; the join key
if document-level independence is required.

---

# PART 4 — Decisions recorded (Founder relay, 2026-09-25)

1. Dimension = the six canonical pressures. No second taxonomy. Finer labels, if ever wanted, are governed dimensions BENEATH a pressure.
2. Eligibility = deterministic, domain-level, no LLM, over attributed `formationObservations` (NOT `queryChipSubstrate()`).
3. Pair rule = per-entity listing; a pressure is offered as a PAIR inquiry only when BOTH resolved seed entities establish it.
   "Available for pair examination" means both sides have a structural basis in that pressure. It does NOT mean a relationship exists.
4. Observability: deterministic ordering (independent sources → structural-class diversity → primitive count) stays. The named
   HIGH/MODERATE/LOW boundaries are presentation policy = a Founder-authored UI parameter, NOT hard-coded as a semantic rule.
   Invariant: ordering never determines eligibility and never determines or defaults selection.
5. Provenance wording: independence is CONNECTOR-level in V1. The UI says "connector sources" (not "independent sources"/"documents")
   until a signal → evidence-node join exists.
6. UI: a new, distinct EXAMINE control; the formed inquiry `[NVIDIA Microsoft + CAPITAL]  [EXAMINE]` lives inside the search box;
   no generated question, no relationship assertion, no automatic selection.
Still open: appearance/copy of EXAMINE and the panel (Founder design authority), band thresholds, the other execution paths that
create sessions without the front door, TSMC-class registry data.
