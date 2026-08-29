# SPEC — Structure Map / Formation Engine: Factual Reference (no proposed mapping)

Date: 2026-08-19
Status: FACTUAL REFERENCE ONLY. No code changes. No proposed mapping, no new metrics, no
architecture decision. Everything below was verified against live code and live test runs this
session — not carried forward from any prior document as settled fact, per this repo's own §27.8.
Purpose: give the Founder the substrate needed to decide the Formation → Structure Map mapping.
That decision is explicitly out of scope for this document.

---

## 1. Formation output contract

Source: `src/engine/formationinference.js`, `inferFormation()` return value (read directly,
verified live this session — see §2 for the runtime chain that produces it).

| Field | Type | Meaning (from code) | Source | Populated at runtime? | Evidence/provenance attached? | Cardinality | Derived or observed? |
|---|---|---|---|---|---|---|---|
| `id` | string (`FRM-xxxxxxxx`) | FNV-1a hash of sorted participating domains + sorted edge list. Depends on topology ONLY — never on E/C/Q/groundedness (FORMATION-ID-001). | `formationId()` | Yes, always (when a Formation is returned) | No — it's a hash, not evidence | 1 per unique topology | Derived |
| `participatingDomains` | frozen string[] | Domains (⊆ the 6 canonical) that carry ≥1 grounded co-presence edge. | `buildGraph()` | Yes | Indirectly — each domain's presence traces to included particles | 2–6 (MIN_DOMAINS=2, six canonical domains max) | Derived from included particles |
| `graph.vertices` | frozen `{domain, meanMagnitude}[]` | One entry per participating domain; `meanMagnitude` = mean of that domain's included particle magnitudes. | `buildGraph()` / `byDomain()` | Yes | No per-vertex evidenceRef — magnitude is an aggregate of particles that DO carry evidenceRef | = `participatingDomains.length` | Derived (mean) |
| `graph.edges` | frozen `{a, b, property}[]` | One edge per pair of domains both ≥ `CO_PRESENCE_FLOOR` (0.40, **PROPOSED, not Founder-locked**). `property` is always the literal string `'co_presence'` today — no other edge type is implemented. | `buildGraph()` | Yes, when ≥2 domains qualify | No `evidenceRef` on the edge itself | 0 to `D*(D-1)/2`, D≤6 → max 15 | Derived (threshold predicate on aggregate magnitude) |
| `particles` | frozen array of included particle objects | The uncollapsed atomic signals that fed the formation (§21 route-don't-aggregate — nothing pre-averaged before this point). Each carries `domain, mag, sign, groundedness, ts, evidenceRef`. | `normalize()` | Yes | **Yes** — each particle carries `evidenceRef` (nullable — see below) | 0..N, N = live pool size in window | Directly observed (pass-through from signal pool) |
| `cohesion` (C) | number ∈[0,1] | `edges.length / possibleEdges`. Edge density among participating domains. | `cohesion()` | Yes | No (pure graph statistic) | scalar | Derived |
| `pressureCoherence` (Q) | number ∈[0,1] | `|net| / gross` across domain-level signed magnitude sums. Net-vs-gross directional alignment. | `pressureCoherence()` | Yes | No (pure statistic over particle signs/magnitudes) | scalar | Derived |
| `avgGroundedness` (Ḡ) | number ∈[0,1] | Mean of `groundedness` across included particles in participating domains. | `avgGroundedness()` | Yes | Indirect — averages a per-particle field | scalar | Derived |
| `existence` (E) | number ∈[0,1] | `C * Q * Ḡ`. Multiplicative (§18 doctrine). Gate: Formation only returned if `E >= FORMATION_EXISTENCE_FLOOR` (0.30, **Founder-locked 2026-07-25**). | `inferFormation()` | Yes | No (composite of the three above) | scalar | Derived |
| `boundary.inside` | frozen particle[] | Same shape as `particles` — the included set again, explicitly under `boundary`. | `inferFormation()` | Yes | Yes, per-particle `evidenceRef` | same as `particles` | Directly observed |
| `boundary.excluded` | frozen `{code}[]` | Enumerated exclusion codes only (`E_UNGROUNDED`, `E_UNKNOWN_DOMAIN`, `E_NO_EDGE`, `E_MISSING_POLARITY`, `E_DUPLICATE`) — no free text, no re-included particle data. | `inferFormation()` | Yes (can be empty array) | N/A | 0..N | Derived (classification) |
| `temporal.maturity` | `null` | Always null. | hardcoded | Always null | N/A | — | Not populated — §22 TEMPORAL absence, explicit in code comment: "no time-series substrate exists" |
| `temporal.direction` | `null` | Always null. | hardcoded | Always null | N/A | — | Same as above |
| `temporal.trajectory` | `null` | Always null. | hardcoded | Always null | N/A | — | Same as above |
| `temporal.velocity` | `null` | Always null. | hardcoded | Always null | N/A | — | Same as above |
| `generatedAt` | number (ms epoch) | Timestamp passed in via `opts.now`, defaults to `Date.now()` at call site. | caller | Yes | N/A | scalar | Observed (wall clock) |
| `generatedBy` | string | Fixed literal `'formation-inference-engine'`. | hardcoded | Always | N/A | — | Constant |

**`evidenceRef` on individual particles**: traced to `perceptionread.js`'s `toParticle()` — it
copies `{ domain, confidence, polarity, ts }` from the pool signal. **It does NOT copy an
`evidenceRef` field** — the live pool signal shape (from `domaingravity.js`'s `_pool.push()`)
only stores `{ confidence, polarity, ts }`, no `evidenceRef` field at all. So on the live path
specifically, `particle.evidenceRef` is `undefined` for every particle today, even though the
schema supports it (`{ ...p, evidenceRef: p.evidenceRef ?? null }` in `normalize()`). This is a
live-path finding, not a schema limitation — the QA test suite injects fixtures that DO carry
`evidenceRef`, which is why the tests pass while the live path's particles carry `evidenceRef:
null` for every particle sourced from the real pool.

**Wrapper output** (`buildFormationProspectus()`, `formationprospectus.js`) does not add new raw
data fields to the Formation — it re-presents the same scalars into a 12-section report structure
(`STRUCTURAL_IDENTITY`, `FORMATION_ANATOMY`, `PRESSURE_MAP`, etc.), each section either
`GROUNDED` (wraps a Formation field) or `WITHHELD` (explicit absence code). The wrapper's own §2
Executive Assessment text states, verbatim, in the live code: `"9 of 10 connection properties
ungrounded (structural co-presence only)"` — a live, self-reported confirmation of §4 below.

---

## 2. Formation input substrate — the full traced pipeline

```
surfaceRouter.subscribe('__gravity__', ['oracle','feed','analysis'], handler)
        ↓  (src/engine/domaingravity.js:83)
domaingravity.js's _pool: Map<DOMAIN, Array<{confidence, polarity, ts}>>
        ↓  (getAllSignals() — src/engine/domaingravity.js:163, per-domain equivalent getDomainSignals())
perceptionread.js's buildPerceptionField(opts)
        ↓  (toParticle(): {domain, confidence, polarity, ts} — evidenceRef NOT copied, see §1)
        ↓  frozen { particles, count, observedAt, windowMs, source:'signal-pool' }
formationinference.js's inferFormation(particles, opts)
        ↓  normalize() → included/excluded → buildGraph() → C/Q/Ḡ/E
Formation | null
```

**What survives the pipeline, field by field:**
- `domain` — survives unchanged (uppercased, validated against the 6 canonical domains at the
  `normalize()` stage in `formationinference.js`; anything outside the six is excluded with code
  `E_UNKNOWN_DOMAIN`).
- `confidence` — survives, converted to `mag` (0–1) via `confidence/100` inside
  `formationinference.js` (not at the perception-producer stage).
- `polarity` — survives unchanged (`'constructive'` or `'fracture'` — anything else excluded with
  `E_MISSING_POLARITY`).
- `ts` — survives unchanged.
- `evidenceRef` — does NOT survive from the live pool (see §1) — the field exists in the schema
  but is `null` on every live-path particle today, because `domaingravity.js`'s pool entries never
  carried it in the first place.
- `groundedness` — never present on live pool entries either. `groundednessOf()` in
  `formationinference.js` falls back to the module constant `GROUNDEDNESS_OBSERVED = 1.0`
  (documented in the file's own header as "PASS-THROUGH — the pool carries no per-particle
  groundedness... every live pool particle is an OBSERVED signal, so groundedness = 1.0 is honest
  at this layer, not fabricated"). So `Ḡ` is currently always 1.0 on the live path, and `E`
  reduces to `C * Q` in practice (also stated explicitly in the engine file's own header comment).

**Pool population source**: `surfaceRouter.subscribe('__gravity__', ...)` listens on channels
`['oracle', 'feed', 'analysis']`. This repo has no fabricated/stub fallback remaining (a prior
session removed `STUB_SIGNALS`). Whether the pool held meaningfully rich data at any specific past
moment (e.g., the OPPORTUNITY-lens screenshot earlier this session) was **not fully traced** — that
would require either tracing all ~30 connectors' individual dispatch conditions or a fresh live
test with the mock server running now. Not resolved here; flagged as open, not assumed either way.

---

## 3. Existing Structure Map contract (`public/structure-field.html` — as currently shipped)

No defense of the fixture — factual inventory only.

**Node schema** (`NODES` array, hand-authored, 10 entries):
```
{ id, label, provenance, contribution, resolved?, path: [{x,y}, ...] }
```
- `id` — string identifier (e.g. `'wage'`, `'formation'`).
- `label` — display string (e.g. `'WAGE PRESSURE'`, `'PRODUCTION COST PRESSURE'`).
- `provenance` — one of the 6 canonical domains, lowercase (e.g. `'labor'`, `'capital'`,
  `'ownership'`) — **or `null`** for exactly one node (`id:'formation'`, the resolved/central node,
  which carries no domain tag and instead `resolved: true`).
- `contribution` — hardcoded number, 0–1 (e.g. `0.55`, `0.80`, `1.0` for the resolved node). No
  code computes this; it's a literal in the fixture array.
- `path` — array of 4 hardcoded `{x, y}` keyframe coordinates in [-1, 1] space (φ, φ̇ domain),
  scrubbed across via the time slider. Entirely hand-authored, not derived from any signal.

**Edge schema** (`EDGES` array, hand-authored, 8 entries):
```
{ from, to, label, stagger, strength }
```
- `from`/`to` — node `id` references.
- `label` — free-text relationship word (e.g. `'increases'`, `'limits'`, `'constrains'`,
  `'offsets'`).
- `stagger` — hardcoded 0–1 value controlling when (in scrub-time) the edge visually resolves.
- `strength` — hardcoded 0–1 value controlling line weight.

**Node labels present** (10): WAGE PRESSURE, INPUT COST, PRICING PRESSURE, PROCESS EFFICIENCY,
AUTOMATION, LABOR CAPACITY, MARKET DEMAND, CAPITAL CONSTRAINT, MARGIN CONTROL, PRODUCTION COST
PRESSURE (the resolved/central node).

**Node granularity**: sub-domain, concept-level (e.g. "WAGE PRESSURE" is a labor-domain concept,
not the LABOR domain itself). Each non-central node maps to exactly one of the 6 canonical domains
via `provenance`, but represents a narrower idea within that domain.

**Edge properties**: a single free-text relationship label per edge (`increases`/`limits`/
`constrains`/`offsets`/etc.) — no typed enum, no evidence reference, no numeric confidence beyond
the display-only `strength`.

**Spatial/visual fields**: `path` (4-point φ/φ̇ trajectory per node, scrubbed over time),
`contribution` (drives node radius/halo size), `resolved` (drives the central node's purple
color + integrity ring), `stagger`/`strength` (drive edge reveal timing/line weight). All of these
are hand-authored per-node/per-edge constants.

**Which values are synthetic**: all of them. Every node's `path`, every node's `contribution`,
every edge's `stagger`/`strength`, and the entire node/edge set itself are hardcoded arrays in the
HTML file — confirmed via direct read, and the file's own on-screen disclosure states this
explicitly: `"SYNTHETIC — Conceptual fixture data, scrubber-driven. Not a live KRYLO detection."`

**Concepts with no corresponding Formation field**: `path` (spatial trajectory over time — Formation
has no per-domain or per-particle position, only `meanMagnitude` per vertex), `stagger` (temporal
reveal order — Formation's `temporal.*` fields are all `null`), edge `label` text
(increases/limits/constrains/offsets — Formation's only edge `property` is the constant string
`'co_presence'`), the concept of a distinct "resolved/central" node (Formation has no designated
central vertex — all `graph.vertices` are structurally equivalent), and `contribution` per node
(Formation has `meanMagnitude` per domain vertex, which is related but not identical — it's a mean
of raw magnitudes, not a hand-tuned display weight).

---

## 4. The granularity gap (fact only, no resolution proposed)

```
Formation (live engine)                Structure Map (current fixture)
────────────────────────               ──────────────────────────────
participatingDomains: ⊆ 6              10 hardcoded nodes, sub-domain
  TECHNOLOGY                             concept-level (e.g. "WAGE
  CAPITAL                                PRESSURE" within LABOR,
  KNOWLEDGE                              "INPUT COST" within CAPITAL)
  LABOR
  MEDIA
  OWNERSHIP

graph.edges: 1 type only                8 edges, each with a distinct
  property: 'co_presence'                free-text label (increases/
  (max 15 possible, D≤6)                 limits/constrains/offsets/...)

max 6 vertices                          10 nodes (9 + 1 central/
                                          "resolved" node with no
                                          Formation equivalent)
```

Formation operates at the domain level (max 6 vertices, 1 edge type). Structure Map's fixture
operates at a finer, named-concept level within domains, with 4 distinct edge-relationship
semantics and a designated central/resolved node concept that Formation has no equivalent for.
These are not the same representation and a direct field-for-field substitution is not possible
without a mapping decision. No mapping is proposed here.

---

## 5. The 10 connection properties — original definitions and current data-source status

Source: `specs/formation-inference-layer-spec.md` §6.5 ("Grounded connection (edge) definition —
the fabrication firewall"), cross-checked against the live `src/engine/connectors/` directory
(34 files) this session.

| # | Property (spec's exact name) | Spec's status (as of 2026-07-25) | Data-source finding (this session) |
|---|---|---|---|
| 1 | Shared dependencies | WITHHELD (§22 STRUCTURAL) | No connector by this name. `chokepointedges.js` (confirmed live, §16 shared pool) encodes company→capability dependency facts, but it's entity-level (Visa→card rails), not domain-level, and is not wired into Formation's connection-property set. Not verified as usable for this property without further work. |
| 2 | Resource complementarity | WITHHELD | No connector or existing computation found under this or an adjacent name in this session's search. |
| 3 | Constraint alignment | WITHHELD | No connector or existing computation found under this or an adjacent name in this session's search. |
| 4 | Temporal alignment | WITHHELD (§22 TEMPORAL) | Confirmed no time-series substrate exists for Formation specifically (`temporal.*` all `null`, by design, per code comment). `analysisfield.jsx` has a `historySeries` derived from replay frames elsewhere in the file, but it is not wired into `formationinference.js` and was not traced further this session. |
| 5 | Geographic overlap | WITHHELD | `usgsconnector.js`, `censusconnector.js`, `worldbankconnector.js`, `maerskconnector.js` all carry geographic data by name/domain, but none were traced this session for whether they produce a "geographic overlap between two domains" computation. Existence of raw geographic data ≠ existence of this specific property. |
| 6 | Capital-flow alignment | PARTIAL — CAPITAL co-presence only (per spec) | `economicflowconnector.js`, `financialmarketconnector.js`, `capitalrealizationconnector.js`, `treasuryconnector.js` exist and are domain-relevant by name, but none were traced this session for direct applicability to this specific property, and none are wired into Formation. |
| 7 | Capability transfer | WITHHELD (per spec) | `patentsviewconnector.js` is confirmed live, real, and deterministic (inventor migration between assignee organizations — a genuine capability-transfer-adjacent signal), and is confirmed wired end-to-end into `entitytopologyregistry.js` → `causalimpactmap.js` → rendered on the Analysis page's IMPACT tab (per `specs/SPEC-structural-formation-lifecycle-pre-post-state-recognition.md`, verified in a prior session). It is entity-level, not domain-level, and is **not** wired into `formationinference.js`. |
| 8 | Regulatory interaction | WITHHELD | `edgar8kconnector.js`, `edgar8kevidence.js`, `edgarnarrativeconnector.js`, `fdaconnector.js`, `fecconnector.js` all carry regulatory-filing data by name/domain, but none were traced this session for applicability to this specific property, and none are wired into Formation. |
| 9 | Information flow | WITHHELD | `gdeltconnector.js` (global news/media event data), `redditconnector.js`, `arxivconnector.js` exist and are information-flow-adjacent by name, but none were traced this session for applicability, and none are wired into Formation. |
| 10 | Structural similarity (co-presence) | **GROUNDED** | This is the one property Formation actually implements today — confirmed via direct code read (§1 above): `property: 'co_presence'`, both domains' mean magnitude ≥ `CO_PRESENCE_FLOOR` (0.40, unlocked/proposed value) in the same window. |

**Summary of this section's honesty boundary**: for properties 1, 5, 6, 8, 9 — connectors that are
plausibly name-adjacent exist elsewhere in the codebase, but this session did not trace each one
deeply enough to state definitively whether they could supply that specific connection property.
That deeper trace was out of scope for this reference document. Properties 2, 3, and 4 have no
identified producer anywhere found this session. Property 7 has a confirmed-live, confirmed-real,
but domain-mismatched (entity-level, not domain-level) candidate producer, not wired to Formation.
Property 10 is the only one actually implemented and live in Formation today.

---

## 6. Authorization boundary — exact text, no interpretation

Source: `specs/formation-inference-layer-spec.md` §2 ("Boundary Declaration (the non-breaking
contract)"), quoted verbatim:

> - **New files only.** Formation engine + producer + assembler are net-new.
> - **Existing producers reused READ-ONLY.** The five reporting-lens reads in `scoutingreport.js`
>   (`signalRead / flowRead / pressureRead / convergenceRead / driftRead`) are consumed unchanged.
> - **Untouched:** cone map, `domainbrief.js` (the DIS), the five lens renders, `lensembeds.js`.
> - Prospectus surface reuse of the `OPPORTUNITY` branch in `analysisfield.jsx` is additive,
>   behind the same lens gate. **Any change to existing OPPORTUNITY behavior is a break → fixed
>   before merge.**
> - §4 architecture-first-audit: ADDITION, not replacement. No rendering architecture changes.

`structure-field.html` / Structure Map is not named anywhere in this document, in either the
in-scope file map (§14 of the same spec) or the boundary declaration above. The only named live
consumer is `analysisfield.jsx`'s `OPPORTUNITY` lens branch, via `formationprospectusproducer.js`.

No other document found this session (across the full `specs/` directory search performed
earlier) names Structure Map as an authorized or intended consumer of `formationinference.js`'s
output.

---

## Not included in this document, by design

- No proposed field mapping (Formation field → Structure Map node/edge).
- No proposed resolution to the granularity gap (§4).
- No new metrics or computed properties.
- No code changes of any kind.
