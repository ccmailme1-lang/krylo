# Formation Inference Layer — Spec (Enhanced Draft for Review)

WO/KRYL: **KRYL-1117** (Epic) — https://krylo.atlassian.net/browse/KRYL-1117
Status: DRAFT — for review, discussion, finalization
Author of record: Founder (Mr. XS). This draft structures the decisions; rulings are the Founder's.
Date: 2026-07-25 (enhanced 2026-07-25 — incorporates architecture + math review passes)
Governing rule (Founder, 2026-07-25): **Nothing goes in if it breaks existing functionality. If it breaks, fix it before it goes in. Never merge broken.** This layer is ADDITIVE ONLY.

Enhancement stance: this pass raises the spec from *architecture-complete* to *implementation-deterministic* — "two competent engineers produce the same engine, or one is wrong." It adds **no new capability.** Everything below removes ambiguity or hardens an invariant. Three reviewer suggestions were **rejected** for violating doctrine (§13).

---

## 0. What this is / is not — and the structural premise

This layer produces the **subject** of the Structural Intelligence Prospectus: an inferred, bounded,
cross-domain **formation**. It does NOT render the prospectus (existing lens-rollup surface, extended
additively) and it does NOT predict events.

**Structural premise (locked framing):** signals do not *create* formations. **Signals reveal a latent
structure that already exists.** The engine reconstructs that structure from visible, grounded evidence —
per the Prospectus boundary:

> "The inference is about the existence and characteristics of the formation, not the future event."

Detect, not predict. Grounded, or withhold. **The structure is primary; evidence is how we see it.**

### FORMATION-001 — Path Independence (constitutional)
> A formation is defined **solely by its grounded structural state.** The order evidence arrives, the
> lens that discovers it, and the traversal path used to reconstruct it **shall not** alter the
> formation's identity or its derived properties.

This is the load-bearing invariant. It makes identity deterministic, replay exact, and guarantees one
**canonical** formation regardless of how many evidence paths converge on it. (Adapted from deep-inference
locality / normal-form discipline — see §13 for what was deliberately NOT borrowed.)

---

## 1. Single Responsibility

Given the live atomic signal-particle set, **decide whether a cross-domain formation exists**, and if so,
expose its grounded structural properties as a frozen object the prospectus reads.
One output: `Formation | null`. No side effects. No partial objects. No "weak" or "candidate" formations.

---

## 2. Boundary Declaration (the non-breaking contract)

- **New files only.** Formation engine + producer + assembler are net-new.
- **Existing producers reused READ-ONLY.** The five reporting-lens reads in `scoutingreport.js`
  (`signalRead / flowRead / pressureRead / convergenceRead / driftRead`) are consumed unchanged.
- **Untouched:** cone map, `domainbrief.js` (the DIS), the five lens renders, `lensembeds.js`.
- Prospectus surface reuse of the `OPPORTUNITY` branch in `analysisfield.jsx` is additive, behind the
  same lens gate. **Any change to existing OPPORTUNITY behavior is a break → fixed before merge.**
- §4 architecture-first-audit: ADDITION, not replacement. No rendering architecture changes.

---

## 3. Zero Drift

Six canonical domains (§17) untouched. **Decision #1 (LOCKED): a formation's participating domains are a
SUBSET of the six.** "Energy," "semiconductor," "infrastructure," "policy," "manufacturing" are structural
**particles** inside `technology / capital / knowledge / labor / media / ownership` — never new domains.
A formation is a **combination over** the six. The ontology does not move.

---

## 4. Strategic Leverage Statement

The mission — "advantageous positions before they become obvious" — is the hidden cross-domain coupling
(AI↔Energy) a domain-by-domain view cannot see. The formation IS that non-obvious structure. This layer
detects it; the prospectus publishes the detection.

---

## 5. Output Gravity

Single dominant output: `Formation | null`. `null` (no formation asserted) is a first-class, honest
result — §22 silence, never a weak formation.

---

## 6. Internal representation — Formation is a GRAPH (Decision #7a, newly adopted)

A formation is **not a bag of particles.** It is a **bounded structural graph** with derived scalar
properties:

- **Vertices** = participating canonical domains (particles attach to their domain vertex).
- **Edges** = grounded connection instances (§6.5) between two domains.
- Scalars (C, Q, E) are **derived from the graph**, not stored independently of it.

Rationale (STRONG pick): topology-as-primary makes identity (§9), resonance (§6.9), and future merge/split
natural instead of bolted-on — and it is what makes FORMATION-001 enforceable (identity = topology, not a
particle list). Additive: the external contract is still `Formation | null`. Flagged as a Founder ruling
because it commits the internal model.

### 6.1 Formation object (schema — frozen at generation)

```
Formation = Object.freeze({
  id,                      // FORMATION-ID-001 (§9). Depends on topology, NOT on E/C/Q/groundedness.
  participatingDomains,    // ⊆ { technology, capital, knowledge, labor, media, ownership }  (≥2)
  graph: {                 // the structure (§6)
    vertices: [ { domain } ],
    edges:    [ { a, b, property, evidenceRef } ]   // grounded connections only
  },
  particles: [             // UNCOLLAPSED atomic contributors (§21 route-don't-aggregate)
    { label, domain, magnitude, polarity, groundedness, state, evidenceRef }
  ],
  cohesion,                // C — §6.3 — full precision (NOT rounded; §12)
  pressureCoherence,       // Q — §6.4 — full precision
  existence,               // E — §6.7 — full precision, asserted only if ≥ floor
  boundary: { inside, excluded },   // excluded[] carries enumerated codes (§6.6)
  temporal: { maturity, direction, trajectory, velocity },  // §22 TEMPORAL absence (§6.8)
  generatedAt, generatedBy // immutable provenance
})
```

### 6.2 Existence predicate (Decision #2 — formalized, no prose)

Decision and construction are **separate concerns** (reviewer recommendation, adopted):

```
formationExists(field) :=
      countDomains(groundedParticles) >= 2
  AND groundedConnections            >= 1
  AND E                              >= FORMATION_EXISTENCE_FLOOR

inferFormation(field) := formationExists(field) ? construct(field) : null
```

A particle is **included** iff it is itself grounded (via `groundSignalMetrics`) AND attaches to a domain
vertex carrying ≥1 grounded edge. Particles route in **uncollapsed** — no pre-averaged blob feeds the
decision (§21). The existence assertion is an explicit, independently testable boolean **before** any
object is built — reinforcing detect-not-predict.

### 6.3 Cohesion C (grounded-connection density — fully specified)

```
D             = |participatingDomains|            // D ≥ 2 by predicate
possibleEdges = D * (D - 1) / 2                    // complete undirected graph on D domains
groundedEdges = |graph.edges|                     // grounded connection instances (§6.5)
C             = groundedEdges / possibleEdges      // ∈ [0,1]; possibleEdges>0 since D≥2
```
Monotonic in `groundedEdges`, independent of Q by construction, O(D²) ≤ O(36).

### 6.4 Pressure Coherence Q (explainable — NO cosine, NO voting)

Q measures **how much cross-domain pressure reinforces vs. cancels** — a directly explainable net/gross
ratio, not a geometric similarity. (Reviewer's cosine + `mode(sign)` construction was **rejected**, §13.)

```
per particle:  s_i   = sign_i * mag_i             // sign ∈ {-1,+1}, mag ∈ [0,1]  →  s_i ∈ [-1,1]
per domain j:  net_j = Σ_{i∈j} s_i                // within-domain signed sum (cancellation counts)
               gross = Σ_j |net_j|                 // total cross-domain pressure magnitude
               net   = | Σ_j net_j |               // net cross-domain pressure magnitude
Q = gross > 0 ? net / gross : 0                    // ∈ [0,1]
```
Reads in one sentence: **Q = net cross-domain pressure ÷ total cross-domain pressure.** All domains
pushing the same way → Q=1; balanced opposition → Q→0. Inspector-recomputable with a calculator.

**Orthogonality fix (resolves the §23 concern the review raised):** a grounded edge (§6.5) is defined as
**co-presence, polarity-agnostic** — two domains both live above floor in the same window. **All polarity
information lives ONLY in Q.** So C answers "are they co-active?" and Q answers "do they push together?" —
genuinely independent axes. Defining edges by *same-polarity* would have leaked Q into C (§23 violation);
fixed here.

### 6.5 Grounded connection (edge) definition — the fabrication firewall (Decision #3)

The Prospectus lists 10 connection properties. **Only grounded properties become edges.** The rest are
§22 classified absence — rendered *unknown*, never estimated.

| # | Property | Live source today? | Status |
|---|----------|--------------------|--------|
| 1 | Shared dependencies | none | WITHHELD (§22 STRUCTURAL) |
| 2 | Resource complementarity | none | WITHHELD |
| 3 | Constraint alignment | none | WITHHELD |
| 4 | Temporal alignment | no time-series yet | WITHHELD (§22 TEMPORAL) |
| 5 | Geographic overlap | none | WITHHELD |
| 6 | Capital-flow alignment | domain-pressure only | PARTIAL — CAPITAL co-presence only |
| 7 | Capability transfer | none | WITHHELD |
| 8 | Regulatory interaction | none | WITHHELD |
| 9 | Information flow | none | WITHHELD |
| 10 | Structural similarity (co-presence) | live | **GROUNDED** |

Shippable edge today = **co-presence** (both domains live, above floor, same window — polarity-agnostic per
§6.4). The 10-list is the ambition; the grounded subset ships. New sources migrate a property
WITHHELD→GROUNDED as a **new edge type with zero schema change** — the graph already holds arbitrary edge
`property` types. (The "full lattice, absence-first" strength move: the skeleton holds all ten now.)

### 6.6 Boundary — deterministic exclusion (Decision #2, formalized)

```
boundary.inside   = particles satisfying the inclusion predicate (§6.2)
boundary.excluded = [ { particle, code } ]     // enumerated, no free text
```
Exclusion codes (enum, ordered — first matching code wins):
```
E_UNGROUNDED       // particle failed groundSignalMetrics
E_UNKNOWN_DOMAIN   // domain ∉ the six
E_NO_EDGE          // domain carries zero grounded edges
E_MISSING_POLARITY // polarity absent → cannot enter Q
E_DUPLICATE        // identical (label,domain,evidenceRef) already included
```

### 6.7 Existence confidence E (Decision #4 — the "86%")

```
Ḡ = mean(groundedness_i over included particles)   // arithmetic mean, clamp [0,1]
E = C * Q * Ḡ                                       // multiplicative only (§18)
assert iff E >= FORMATION_EXISTENCE_FLOOR
```
Any thin leg craters E → withhold. **FORMATION_EXISTENCE_FLOOR = 0.30 — LOCKED (Founder, 2026-07-25)**
(mirrors IB-survival / commit floors).

**Decision #7b — Q semantics: ALIGNMENT — RULED (Founder, 2026-07-25).** Q stands **as-is**: net÷gross
reinforcement. A formation defined by *opposing* domain pressures (tech↑ vs capital↓) scores low Q and
**withholds by design** — internal tension is not a formation under KRYLO's meaning; coherent directional
pressure is. E remains **scale-invariant** (existence is structural, not intensity-gated) — accepted as a
consequence of the alignment ruling. No tension-tolerant variant is built.

### 6.8 Temporal attributes (Decision #6)

`maturity / direction / trajectory / velocity` = §22 **TEMPORAL absence** until a time-series substrate
exists (build-order #3). Named on the object, never fabricated. **Impossible** to populate by inference (§8).

### 6.9 Resonance (Prospectus §7 — Opportunity → Resonance Surface)

Affinity between two **asserted** formations = overlap of their **grounded** edges only (same firewall as
§6.5). Reuse the Comparative Reasoning Engine / `asdiff.js` (KRYL-1001) — graph-to-graph comparison, now
natural because both sides are graphs (§6). WITHHOLD without N + attribution rigor (§19: withhold beats
fabricate). No route-leverage claim on coincidence.

### 6.10 Lens → Prospectus section contract (the assembler, additive)

| Lens | Section | Producer |
|------|---------|----------|
| Signal | §11 Evidence Foundation | `signalRead` (reused) |
| Flow | §4 Structural Field / movement | `flowRead` (reused) |
| Pressure | §9 Pressure Map | `pressureRead` (reused) |
| Convergence | §3 Formation Anatomy | `convergenceRead` (reused) |
| Drift | §8 Structural Drift | `driftRead` (reused) |
| Opportunity | §7 Formation Resonance | Resonance (§6.9) |

Frame sections (§1 Identity, **§2 Executive Assessment**, §5 Properties, §6 Relationships, §10 Trajectory,
§12 Conclusion) are the container + cross-lens composites the assembler derives from the frozen formation.

**Perception is UPSTREAM, not a section producer (reconciled — Founder chain, 2026-07-25).** The dependency
chain is `Signal Pool → Perception Producer (perceptionread.js) → Formation Inference Core → Prospectus
Assembly → Surface`. Perception *produces the perceived field that inference consumes* — it does not read
the formation to write §2. **§2 Executive Assessment is therefore assembler-derived** from the frozen
formation (a frame section), not a `perceptionRead`. Producer/consumer boundary locked by the
perception↔inference contract test (`qa_perceptionread.mjs`, 23/23): routing through perception === feeding
raw particles direct — the producer changes routing, not results (§21).

---

## 7. Invariants (constitution-level — each becomes a property-based test)

```
INV-1  Formation never mutates after freeze.
INV-2  Formation never predicts (no future-tense field).
INV-3  Formation never creates a domain outside the six.
INV-4  Formation never invents evidence (every edge carries evidenceRef).
INV-5  Formation never survives below FORMATION_EXISTENCE_FLOOR.
INV-6  Prospectus never changes Formation (read-only consumer).
INV-7  0 ≤ C,Q,Ḡ,E ≤ 1.
INV-8  E = 0 if any factor = 0.
INV-9  Increasing any single factor cannot decrease E (monotone).
INV-10 Identity is path-independent (FORMATION-001): same grounded structure ⇒ same id + same derived props.
```

## 8. Negative proofs (architectural impossibility — stronger than requirements)

```
IMPOSSIBLE  a formation with < 2 domains
IMPOSSIBLE  a formation without ≥1 grounded edge
IMPOSSIBLE  a formation whose decision consumed averaged/pre-collapsed particles
IMPOSSIBLE  a formation with inferred temporal values
IMPOSSIBLE  a formation with a fabricated (ungrounded) affinity/edge
IMPOSSIBLE  two different ids for the same grounded topology
```

## 9. FORMATION-ID-001 — Identity contract

- **Basis:** participating domains + edge topology + included-particle membership. **NOT** E, C, Q, or
  groundedness. (Confidence changing must never re-ID a stable structure.)
- **Determinism:** same topology ⇒ same id, every run, every path (FORMATION-001).
- **Merge / split / collision / replay:** reuse the WO-2004 CanonicalEvent kernel (equivalence class +
  stabilityScore). Prefer **direct reuse**; a thin `formationidentity.js` wrapper only if the kernel's
  signature can't take a graph directly. **Do not introduce a second identity scheme** (INV, DoD).

## 10. Failure modes (unhappy path — defined, not implied)

| Input condition | Behavior |
|---|---|
| No particles | `null` |
| < 2 grounded domains | `null` |
| Duplicate particles | dedupe by (label,domain,evidenceRef); code `E_DUPLICATE` |
| Missing polarity | particle excluded `E_MISSING_POLARITY`; cannot enter Q |
| Missing groundedness | treated as ungrounded → excluded `E_UNGROUNDED` |
| Unknown domain | excluded `E_UNKNOWN_DOMAIN` (never widens the six) |
| Corrupt / absent evidenceRef | edge not formed (no grounded connection) |
| Partial graph (some edges withheld) | proceed on grounded edges only; withheld → §22 absence |

## 11. Computational complexity

`N` = particle count, `D` ≤ 6. Expected **O(N)** (one pass for grounding + per-domain sums), edge build
**O(D²) ≤ O(36)**. Maximum **O(N + D²) = O(N)**. Any implementation exceeding O(N·D) is wrong.

## 12. Numeric stability

- Clamp all inputs to [0,1] **before** math (rogue-sensor guard).
- 64-bit floats; D≤6 → no overflow.
- Pure functions for C, Q, Ḡ; compose into E. No shared mutable state.
- **Store E/C/Q at full precision.** (Reviewer's "round to 4 dp before freeze" was **rejected**, §13 —
  it corrupts the canonical artifact and makes replay sensitive to a display choice.) If cache stability
  is needed, derive a **separate normalized cache key**; never reduce the stored value's fidelity.

## 13. Reviewer suggestions REJECTED / MODIFIED (guardrail defense)

| Suggestion | Verdict | Why |
|---|---|---|
| Q via cosine similarity | **Rejected** | ML/geometric primitive; not directly explainable. Replaced with net/gross (§6.4). |
| Q reference via `mode(sign)` "majority orientation" | **Rejected** | Voting; ill-defined on ties (++−−); structural systems don't vote. |
| Round E to 4 dp before freeze | **Rejected** | Corrupts canonical artifact; breaks replay. Full precision + separate cache key. |
| Same-polarity edge definition | **Modified** | Would leak Q into C (§23). Edges are polarity-agnostic co-presence; Q carries polarity. |
| Deep-inference **as a rewrite-system rebuild** of the pipeline | **Deferred** | Not additive; violates the non-breaking rule. Borrowed only *locality* + *path-independence* as principles. |
| CoS proof theory / cut-elimination / sequent calculus / formal logic syntax | **Out of scope** | KRYLO detects grounded structure; it does not prove theorems. |

Adopted from the review (strength picks): formal existence predicate, decision/construction split, formal C,
explainable Q, deterministic boundary + exclusion enum, invariants, negative proofs, FORMATION-ID-001,
failure modes, complexity bounds, golden QA set, BUILD-BLOCKED over TBD, graph model, FORMATION-001
path-independence, "signals reveal latent structure" framing.

---

## 13a. KRYL-XXXX — Expose Raw Domain Signal Access for Formation Engine (Founder-ratified 2026-07-25)

**Intent:** enable formation detection to evaluate uncollapsed signal particles while preserving §21
Route-Don't-Aggregate. Information must not be destroyed before the decision boundary. `computeDomainPressure`
already performs two irreversible collapses (magnitude → mean(confidence); polarity → majority vote at
`fractureCount/total ≥ 0.40`) — feeding that into `formationExists()` routes on an *upstream opinion about
structure*, not the structure. The Formation Engine becomes the authority over particle polarity, magnitude,
and cancellation.

**Change (additive, non-breaking):** two read-only pool accessors in `domaingravity.js`. `_pool` is a
`Map<DOMAIN, Array<{ confidence, polarity, ts }>>` (line 79) — signals carry no `domain`/`magnitude` field;
domain is the Map key, strength is `confidence` (0–100). Accessors attach domain, apply the standard window
cutoff, and shallow-copy each particle:

```javascript
export function getDomainSignals(domain, windowMs = DEFAULT_WINDOW_MS) {
  const d = (domain ?? '').toUpperCase();
  const cutoff = Date.now() - windowMs;
  return (_pool.get(d) ?? []).filter(s => s.ts >= cutoff).map(s => ({ domain: d, ...s }));
}
export function getAllSignals(windowMs = DEFAULT_WINDOW_MS) {
  const cutoff = Date.now() - windowMs;
  const out = [];
  for (const [d, arr] of _pool) for (const s of arr) if (s.ts >= cutoff) out.push({ domain: d, ...s });
  return out;
}
```

**Acceptance criteria:**
- Existing domain-pressure calculations unchanged (`computeDomainPressure` untouched).
- Formation engine consumes raw particle `polarity` + `confidence`; magnitude normalized `confidence/100`
  **in the engine**, not the accessor.
- **No dependency on `domainPolarity`** — do NOT reuse the majority vote even as convenience (hidden
  re-entry of voting into Q).
- Opposing signals can cancel before classification (Q sees per-particle sign).
- No mutation path exposed (`{ ...s }` copies; `_pool` objects never escape by reference).
- Windowed to match the pressure calc's active set.

**Classification:** substrate fix, not a refactor. Restores the ontology — formations emerge from signal
relationships, not precomputed domain judgments. Builds independently of #4 (floor) and #7b (Q semantics).

## 13b. PLC-001 — Prospectus Layout Contract (Information Architecture)

**Canonical genre — dossier, not dashboard:**
> KRYLO prospectus surfaces follow a **dossier architecture**: a structured analytical profile centered on
> an observed formation, supported by evidence, relationships, trajectory, and unresolved questions.

The object shifts from "tell me about this thing" to **"reveal the structure forming here."** Reading order
is **conclusion-first** — the assessment leads, detail nests, receipts anchor the bottom.

**Reading order (top → bottom):**
1. **Identity header** — formation name, participating domains, status, observed window. (§1)
2. **Analyst Brief hero** — a compressed *structural fingerprint*, not a summary: state · E · evidence count
   · top unresolved. (§2) — this is the CB-Insights "Outlook/Highlights" slot, re-purposed.
3. **Dossier body** — the 12 sections as analyst cards (below).
4. **Structural Context rail** — related domains (the graph) + adjacent formations (the scouting network /
   resonance). (§6, §6.9)
5. **Evidence & receipts** — every claim drills to its source. (§11)

**Dossier section map** (his FORMATION PROFILE reconciled to our 12 sections + the lens→section contract):

| Dossier card | Our section | Lens |
|---|---|---|
| Identity — *what emerged* | §1 | frame |
| Signal Signature — *what patterns exist* | §3 Anatomy / §4 Field | Convergence / Flow |
| Structural Assessment — *why it matters* | §2 | Perception |
| Domain Pressure | §9 Pressure Map | Pressure |
| Evidence Card — *what supports it* | §11 | Signal |
| Trajectory — *how it is changing* | §8 / §10 | Drift — **withheld today** (see note) |
| Open Questions — *what remains unknown* | §5 Unknowns-equivalent + withheld set | frame |
| Structural Context (rail) | §6 Relationships / §6.9 Resonance | Opportunity |

**Card behavior (uniform):** each card is an *analytical instrument*, not a KPI tile.
- **Grounded card** → the number/structure **+ a drill-to-receipt hinge** ("view receipts →").
- **Withheld card** → §22 classified absence + reason, same visual weight (silence is shown, not hidden).
- **E is never a lone number** — it renders with its legs C · Q · Ḡ exposed (the CB-Insights Mosaic
  sub-score pattern: headline + components + Avg-vs-subject bar).
- Progressive disclosure everywhere (the "View More" behavior).

**Two guardian annotations (keep the genre without breaking locked rules):**
- **Domains stay ⊆ the six.** Illustrative labels like "Energy," "Grid Load," "Compute Infrastructure"
  are **particle labels**; the domain chips render canonical domains only (technology / capital / …). A
  header reads *FORMATION: Grid-Load + AI-Infrastructure Pressure · Domains: TECHNOLOGY · CAPITAL* — never
  "Domain: Energy" (Decision #1).
- **Trajectory / historical path / directional deltas (↑34%) are §22 TEMPORAL absence today.** No
  time-series substrate exists (§6.8), so those cards render classified absence, not an invented trend or
  arrow. The dossier *slot* is reserved; the data is honest.

## 13c. VIC-001 — Prospectus / Scouting Report Visual Intent Contract

**Purpose:** define the intended artifact *character* of KRYLO prospectus surfaces — not a design system.
The interface should feel like an **analyst instrument**, not a consumer dashboard.

**Prospectus qualities** — communicate authority, permanence, structured reasoning, investment-grade
analysis, traceable claims. Reader feels: *"This is a documented assessment of an emerging structure,"* not
*"This is a live analytics dashboard."*

**Scouting-report qualities** — communicate discovery, comparative evaluation, signal recognition,
strengths/weaknesses, trajectory. Reader feels: *"An expert analyst has identified something worth
examining."*

**Information presentation model — the Formation Dossier / Analyst Brief:**
```
FORMATION PROFILE
  Identity            ├── what emerged
  Signal Signature    ├── what patterns exist
  Structural Assessment ├── why it matters
  Evidence Card       ├── what supports it
  Trajectory          ├── how it is changing   (§22 absence until substrate)
  Open Questions      ├── what remains unknown
```

**Genre reference set (Founder-supplied):** institutional Private Placement Memorandum · investor factsheet
(Barclays "About …") · CB Insights Scouting Report. These set the *character* — full-document editorial
hierarchy, filled tables, structure diagrams, footnoted provenance. Palette and type remain the designer's.

**Visual behavior — intent only.**
Encourage: editorial hierarchy · structured sections · evidence cards · analyst annotations · comparative
panels · historical context · receipt trails.
Avoid: generic BI dashboards · KPI tiles as the primary experience · marketing/landing-page aesthetics ·
decorative visualization without analytical purpose · **predictive language** (CB Insights *sells*
intelligence; KRYLO *exposes perception*).

**Anti-pattern — LOCKED (Founder, 2026-07-25):** the **lens-embed treatment must NOT be the prospectus
skin** — i.e. black ground + gray hairline dividers + lime accents scattered "here and there." That
combination reads as a Flourish chart embed, not an investment-grade document, and it is the reason
yesterday's surface failed. The prospectus is a **native document surface**, distinct from the Flourish
lens embeds that the locked *lens-style-standard* governs; VIC-001 governs the prospectus.

**Palette discipline (consistent with §6, not a new rule):** lime appears **only as a live-state mark**
(§6 semantics — live/constructive, high emissive dominance, rare by rule). It is never a border, never
decoration, never "spread." Removing decorative lime is not a departure from doctrine — it *enforces* it.
The document's authority comes from editorial hierarchy and structure, not from accent color. The actual
palette (grounds, ink, structural fills) is the designer's call, per the reference genre above.

**Emotional target:** between **Morningstar research reports** and a **professional scouting dossier**. Not
a pitch deck. Not a spreadsheet. Not a news article. **A research artifact.**

**The boundary (why this is a contract, not a design):** the spec says *"the prospectus has this analytical
character."* The **designer** decides how that becomes typography, spacing, color, motion, and composition.
This gives the vibe without another invent-a-layout situation — engineering implements a contract, it does
not originate a look.

## 14. File Map

| File | New/Change | Responsibility |
|------|-----------|----------------|
| `src/engine/formationinference.js` | DONE (427ff2b) | `formationExists`→bool; `inferFormation`→`Formation\|null` |
| `src/engine/perceptionread.js` | DONE | UPSTREAM producer: `buildPerceptionField` (pool → uncollapsed particles → inference input) |
| `src/engine/formationidentity.js` | NEW *(or direct WO-2004 reuse)* | FORMATION-ID-001 (topology id currently in engine core) |
| `src/engine/formationprospectus.js` | NEW | assembler: formation + reused producers → 12-section frozen prospectus (§2 derived here) |
| `src/components/analysis/scoutingreport.jsx` | reuse (render only) | renders the prospectus |
| `scoutingreport.js` producers | reuse READ-ONLY | no change |
| `qa_formationinference.mjs` | DONE (55/55) | golden set (§16) + invariant/negative-proof tests |
| `qa_perceptionread.mjs` | DONE (23/23) | perception↔inference producer/consumer contract |

## 15. Bottle Test (§11a)

1. Reduces ambiguity? **YES** — one bounded formation or `null`, formal predicate.
2. Single dominant output? **YES** — `Formation | null`.
3. All boundaries defined? **YES** — `FORMATION_EXISTENCE_FLOOR = 0.30` (LOCKED).
4. No undefined dependencies? **YES** — floor locked; polarity accessor shipped (§13a, committed 2481467).
5. Does not increase expressive flexibility in core? **YES** — additive; core sensing untouched.

## 16. Golden QA set (objective regression — recompute to 1e-6)

```
1. Below all floors                         → null
2. Edge-complete, opposed polarity (Q≈0)    → null
3. 2-domain, 1 edge, aligned pressure       → E = 1 · 1 · Ḡ ; assert iff Ḡ ≥ floor
4. 3-domain, moderate everything (E≈0.40)   → asserted formation
5. 6-domain, full lattice, mixed evidence   → verify multiplicative scaling
```
Plus property tests for INV-7…INV-10 and every §8 impossibility. Build fails if output diverges > 1e-6.

## 17. Definition of Done

- `formationExists` boolean independently testable; `inferFormation` returns `null` below floor, a frozen
  `Formation` above it.
- Every edge is grounded; every ungrounded property renders §22 absence (grep-verified: no estimated
  affinity number reaches output).
- E, C, Q, Ḡ re-derivable by an outside inspector from the particle set (math checks out, golden set green).
- All INV-1…INV-10 and every §8 impossibility have a passing test.
- Identity uses/wraps WO-2004; no second scheme (grep-verified).
- Perception producer + assembler render all 12 sections; withheld sections carry absence + code.
- **Non-breaking proof:** DIS, cone map, five lens renders behave identically pre/post (regression green).

## 18. Open decisions (rule / red-line here)

```
#1  Domain model         LOCKED — subset of the six.
#2  Inclusion boundary   LOCKED — formal predicate + exclusion enum (§6.2/§6.6).
#3  Grounded edge subset LOCKED — co-presence only ships; rest §22.
#4  Existence confidence LOCKED — E = C·Q·Ḡ, FLOOR = 0.30 (Founder, 2026-07-25).
#5  Identity             LOCKED — direct WO-2004 reuse (FORMATION-ID-001).
#6  Temporal attrs       LOCKED — §22 TEMPORAL absence until substrate.
#7a Graph model          LOCKED — formation IS a graph (§6).
#7b Q semantics          LOCKED — ALIGNMENT (net÷gross as-is); tension withholds; E scale-invariant
                         (Founder, 2026-07-25).
    Polarity exposure    RESOLVED — accessor shipped (§13a, committed 2481467). Engine reads raw
                         particles via getDomainSignals/getAllSignals; normalizes confidence/100.
```

**BUILD-READY.** All decisions locked; substrate shipped. No open blockers.
Remaining work is construction only: `formationinference.js` (predicate + C/Q/Ḡ/E + boundary),
`perceptionread.js`, `formationprospectus.js` assembler, and `qa_formationinference.mjs` (golden set
+ INV/impossibility tests).
