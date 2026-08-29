# Domain Substrate — Baseline Audit (WO-1 precondition)

**Status:** FINDINGS — read-only, 2026-08-29. No code changed.
**Against:** `domain-substrate-implementation-plan.md` @ `44d8c82`.
**Purpose:** the exact repository state before WO-1's first authorized change, so
the change is made against reality, not a guess.

---

## 1. Branch / baseline

- Branch **`main`**, HEAD `44d8c82` — everything since `15a1d5a` is docs (Track #3
  specs). No engine code touched since the CAPITAL/1218/1221/1222 work.
- Code baseline for WO-1: **`baseline_targetpacket_kryl1218_20260828`** (`15a1d5a`).
- Dev server + as-diff engine + mock server were running earlier this session.

## 2. Existing relevant WOs (from code + memory)

| ref | what | relevance |
|---|---|---|
| **KRYL-1052** | SignalFacet Substrate + AS-DIFF universal comparator + independence invariant | **WO-1 signal contract; WO-2 independence** |
| **KRYL-1132** | subsignal fan-out tap — raw connector tuples retained pre-amplification | **WO-1 provenance hook** |
| **KRYL-1093** | reconvergence guard — a fan-out sibling is not independent corroboration of itself | **WO-2** |
| **SRE (relationontology.js)** | closed-world `RelationType` enum + ontology-migration rule | **WO-3** |
| **KRYL-1010** | observation tap | provenance |
| **KRYL-1220 / KRYL-1202** | closed-loop analytical bridge — packet ← per-observation structure | **WO-5**; packet says it "cannot populate from live engine state today" |
| **KRYL-1848** | proxy-until markers in the packet (`PROXY_UNTIL_WO1848`) | WO-5 |

## 3. Current `I_d` implementation

**None.** The six `I_d` live only in `specs/domain-intelligence/*.md`. No
`src/engine/` module reads them; no `A(d, …)` function exists. WO-1 will be the
first `I_d`-related engine code.

## 4. Signal schema — two layers today

### 4a. Connector → router event (the wire format)
```
{ source, domain, signal (0–100 int), confidence, ts, polarity, decay?, topology?, fanout?, fanoutIndex? }
```
`confidence` is **inconsistent** across connectors (0–1 in `blsconnector`, 0–100
in `patentsviewconnector`). WO-1 must fix this.

### 4b. `_pool` entry (domaingravity.js) — LOSSY
```
{ confidence, polarity, ts }        // source, signal name, decay, topology all DROPPED
```
`getDomainSignals(domain)` returns `{domain, confidence, polarity, ts}`. **It
cannot tell you which source or which signal-type produced an entry** — so it
cannot support per-facet attribution or the shared-source distinct-facet AC as-is.

### 4c. SignalFacet (signalfacet.js, KRYL-1052) — the real contract, partially wired
```
makeSignalFacet({ facet_id, domain_id, ontology, producer_id, source_set_hash,
  lineage_id, dependency_graph, timestamp, provenance, signal_unit, confidence, repro })
```
Has everything WO-1 needs: provenance, lineage, `source_set_hash` (independence),
`repro` (re-derivation recipe), a normalized `signal_unit` (0–100 via AS-DIFF).
**Wired only for one ontology** (`DOMAIN_ACTIVITY_INTENSITY`) and **two
producers** (structural pool read + Event Registry narrative), as the DRIFT proof.
`facetproducers.js`: *"Domain-scoped for the proof; subject × domain is a
follow-on."*

## 5. Connector dispatch paths

- All connectors → `surfaceRouter.dispatchBatch(events)` → `subsignalbuffer.append`
  (raw tap) → topology amplify/suppress → `__gravity__` subscriber → `_pool`.
- **Multi-domain (shared-source) connectors — WO-2 targets:**
  | connector | domains | current structure |
  |---|---|---|
  | `patentsviewconnector.js` | TECH / OWN / CAP | dispatches one signal with `domain: [array]`; **also** goes through `relationontology` + `admissionengine` |
  | `censusconnector.js` | LAB / OWN | two separate dispatch entries, but same computed `signal` shape — **not verified distinct facets** |
  | `fecconnector.js` | CAP / MEDIA | two dispatches, MEDIA scaled `signal * 0.85` from the CAP figure — **a re-scaled relabel, not a distinct facet** (fails the AC as written) |
- Fan-out machinery exists (`fanout`, `fanoutIndex`, KRYL-1093 reconvergence
  guard) but only prevents self-amplification — it does **not** check facet
  distinctness.

## 6. Formation relationship admission path

- **SRE `RelationType`** (`relationontology.js`) — closed-world enum of **14
  semantic relation types** (CAUSES, CONSTRAINS, DEPENDS_ON, ENABLES, INHIBITS,
  MEDIATES, COMPETES_WITH, SUBSTITUTES_FOR, COUPLED_WITH, RESONATES_WITH,
  DIVERGES_FROM, PRECEDES, COMPOSITION, REVEALS). "Future relation types require
  ontology migration."
- **This is NOT the 15 cross-domain pair types** from `CROSS-DOMAIN-CONSISTENCY §4a`.
  They are orthogonal axes: SRE = *what kind of relation* (causal semantics); the
  consistency doc = *which domain pair*. WO-3 must define how they compose (likely
  `{domainPair} constrains {allowed RelationTypes}`).
- Wiring: `relationontology` + `admissionengine` reached by **only 2 connectors**
  (`secownershipconnector`, `patentsviewconnector`) + the migration producer.
  `evidenceadmissiongate` — **1 connector** (`secownershipconnector`).
  `relationcore.js`, `relationtopology.js` — **0 callers** (built, not wired).
- `inferFormation` (`formationinference.js`) — 2 callers: `analysisfield.jsx:546`
  (report-layer) and `formationprospectusproducer.js`. Both prospectus/report,
  not a live decision path. `structuralrecognition.js` — still 0 callers.

## 7. Target Packet / entry

- `targetpacket.jsx` — synthesis via `synthesizeQuery(session)`; domain data via
  `getAllDomainPressures()` + `getQueryDomainPressure(synthesis.queryDomain)` —
  **all field-scoped.** No `A(d, Subject)`, no `I_d`, no substrate. Self-comments:
  *"packet cannot populate from live engine state today (KRYL-1220 / KRYL-1202)."*
  The `NOT MEASURED` metric strip is that gap, made honest.
- `analysisidlefield.jsx` — the `CHOOSE A DOMAIN` control (`DOMAIN_CHIPS`) is live;
  KRYL-1222 completion chips shipped (`timeline` only). This is the WO-4 target.

## 8. Anduril fixture

**Does not exist.** "Anduril" appears only as an example string in
`querysynthesis.js` and one unrelated qa file. The fixture is a spec'd test
target (`SPEC-domain-substrate-integration-contract.md`), not built. It is WO-6.

## 9. Evidence-ladder classification

| substrate piece | PRESENT | WIRED | REACHABLE (live path) | CONTRACT-CONFORMANT |
|---|---|---|---|---|
| `makeSignalFacet` contract (KRYL-1052) | ✅ | ⚠ DRIFT proof only | ⚠ one ontology | — for `I_d` signals |
| `subsignalbuffer` (raw tap) | ✅ | ✅ | ✅ | provenance yes, per-facet no |
| `_pool` / `getDomainSignals` | ✅ | ✅ | ✅ | **lossy** — no source/type |
| SRE `RelationType` closed enum | ✅ | ⚠ 2 connectors | ⚠ | 14 semantic types, not the 15 pairs |
| `admissionengine` | ✅ | ⚠ 2 connectors | ⚠ | — |
| `relationcore` / `relationtopology` | ✅ | ❌ 0 callers | ❌ | — |
| `A(d, Subject)` | ❌ | — | — | — |
| six concentration measures | ❌ (no HHI/top-holder/Gini anywhere) | — | — | — |
| Anduril fixture | ❌ | — | — | — |

## 10. What this means for WO-1

**WO-1 is not greenfield, and it is not a straight build.** Before the first
authorized change, a Class decision (per CLAUDE.md §2 A–F) on the existing
substrate:

1. **The SignalFacet contract (KRYL-1052)** already has the WO-1 exit fields
   (definition, normalization, provenance, `source_set_hash`, `repro`). The
   question is Class B (primitive exists, composed capability doesn't) vs Class E
   (extend it to per-`I_d`-signal + subject scope) — **not** "write a new signal
   type." Decide: extend `signalfacet.js` / `facetproducers.js`, or a parallel
   producer layer.
2. **`_pool` is the wrong read surface** for authored signals — it drops source
   and type. WO-1 signals should read from `subsignalbuffer` (raw) or a new
   facet-producer layer, not `getDomainSignals`.
3. **The six concentration measures do not exist** — WO-1 authorship half
   (Founder) is a hard blocker; no code path can produce a concentration signal
   until the measure is defined.
4. **`confidence` unit inconsistency** across connectors is a real bug WO-1 must
   resolve as part of normalization.

**First authorized WO-1 step:** an audit of `signalfacet.js` / `facetproducers.js`
/ `subsignalbuffer.js` against the six `I_d` `signals` inventories → a Class A–F
verdict per signal → the extend-vs-build decision. No new signal code before that
verdict and the Founder's authored measures.
