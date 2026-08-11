# DOD Step 6 — Predicate-Level Lineage Decision

Status: Evaluation against real evidence only. No promotion performed. This document was
revised mid-pass: the first draft concluded "no lineage predicate is ever observed in
production" from RKM's `genealogy` field alone — that conclusion was premature. A second,
genuinely separate system (`signalgenealogy.js`, WO-2007.1) was found, traced, and confirmed
live before finalizing anything, per the required sequence.

Exit criterion (locked): **every encountered lineage predicate has an explicit
disposition: canonical R, RKM-internal, or deferred pending real evidence. No seventh
primitive, no promotion by shape alone, no M3/M4 collision.**

## Part A — RKM's five genealogy predicates: NOT OBSERVED (unchanged from draft)

`rkmstore.js`'s `genealogy` object: `causedBy`, `causes`, `dependsOn`, `enables`,
`derivedFrom`. Re-verified this pass:
```
grep "genealogy:" across src/  →  only write sites are edgar8kconnector.js:219
                                    (genealogy: {} — the ONLY live call site) and
                                    rkmstore.js's own createObject/supersedeObject/
                                    mergeObjects internals.
grep for callers of mergeObjects/supersedeObject outside rkmstore.js  →  ZERO.
```
All five remain unpopulated in every live production path. **Disposition: DEFERRED —
PENDING REAL EVIDENCE**, for all five, unchanged.

## Part B — `signalgenealogy.js` (WO-2007.1): a SEPARATE, genuinely live system

Traced per the required sequence:

**1. What it represents.** "Signal Genealogy Graph... Time-indexed causal DAG." A
hand-authored, hardcoded prior-knowledge graph over SIGNAL-CLASS nodes (types: `SIGNAL`,
`PROCESS`, `DATASET`, `API`, `PROXY`, `EVENT` — e.g. `POWER_INFRA`, `MARKET_PRICE`,
`SEC_FILING`), with edges typed `causes`/`correlates_with`/`precedes`/`observed_by`/
`derived_from`, each requiring `lag_estimate_days` and a `confidence`. `buildSeedGraph()`
(the only graph ever built) is 100% hardcoded domain-expert data — e.g. "Construction
Permits → causes → Power Infrastructure, lag 365 days, confidence 0.80." Not derived from
any live observation store.

**2. Does it read/write RKM's `genealogy`?** **No.** Confirmed by import trace: it never
imports `rkmstore.js`. Its own `EDGE_TYPE.CAUSES = 'causes'` and `DERIVED_FROM =
'derived_from'` share English words with RKM's `causes`/`derivedFrom` fields but are a
different literal string format (snake_case vs. camelCase) in a structurally unrelated
object shape (`{nodes: Map, edges: []}` vs. RKM's `genealogy: {causedBy: [], ...}`). Same
predicate name, confirmed NOT the same semantic relationship, exactly per the stated
distinction.

**3. Is `reconlayer.js` (its consumer) active?** **Yes, confirmed live**, traced fully:
`app.jsx:1418` renders `<AnalysisIdleField>` → renders `recondashboard.jsx` →
`recondashboard.jsx:36`, inside a real `useEffect` gated on `engineState?.domainStates`:
`runRecon(engineState.domainStates, synthesis)` → `reconlayer.js`'s `run()` (line 222)
calls `expand_genealogy(SEED_GRAPH, src.evidenceType)` against the seed graph, which is
built at module-load time (`const SEED_GRAPH = buildSeedGraph()`, line 14, executes the
moment the module is imported). **This executes whenever a user has the Analysis tab open
with real domain state — a materially different situation than RKM's genealogy.**

**4. Classify the actual predicates encountered.** `causes`, `precedes`,
`correlates_with`, `observed_by`, `derived_from` are genuinely traversed at runtime via
`expand_genealogy`'s backward causal walk. But their endpoints are **signal-class
abstractions** (a domain-theory prior: "this kind of signal tends to precede that kind of
signal"), not instance-level Objects or Events. rc3's R connects real-world instances with
observed provenance; this graph is a static, authored prior model that never claims "this
specific observation caused that specific observation" — it claims "this signal category
generally precedes that one, per domain expertise, with a stated confidence and lag."

**5. Does promotion create an M3/M4 collision?** This is the deciding question, and the
answer is the same shape as audit 016's CI-F finding: `expand_genealogy`'s output feeds
`emitSCP()`'s `explorationScore`/`causalValidity` — a **hypothesis-generation** input (the
Recon Layer explicitly generates and ranks *candidate* explanations for blind spots, per
`detect_blind_spots`/`generate_hypotheses`). This is domain-theory-fed M4 interpretation
input, structurally the same role as CI-F's own hardcoded `EDGE_TYPE_DECAY`/
`DEFAULT_ONTOLOGY` config (audit 016) — not an M3 assertion of observed structural fact.
Promoting it to canonical R would collapse "our prior belief about signal-class causality"
into "an observed relationship between two real things," which is exactly the category
error §20/M4 discipline (and this session's earlier M3/M4 reasoning) exists to prevent.

## Disposition table (final, both systems)

| Predicate | System | Observed live? | Disposition |
|---|---|---|---|
| `causes`, `causedBy`, `dependsOn`, `enables`, `derivedFrom` | RKM (`rkmstore.js`) | No | **DEFERRED — pending real evidence** |
| `causes`, `correlates_with`, `precedes`, `observed_by`, `derived_from` | Signal Genealogy (`signalgenealogy.js`) | **Yes — live, module-load-seeded, traversed on every Analysis-tab render with real domain state** | **NOT R — hardcoded prior-knowledge/domain-theory config feeding M4 hypothesis generation, same role as CI-F's own config (audit 016). Not RKM-internal either (different system entirely) — correctly a fourth category the DOD's three options didn't anticipate, named precisely rather than force-fit** |

No predicate from either system is promoted to canonical R. RKM's five remain unresolved
for lack of data. Signal Genealogy's five are resolved — NOT R, by semantic classification,
not by absence of data (this is the one case in this step where real data existed and was
evaluated on its merits, per the required sequence, rather than deferred).

## No seventh primitive, no M3/M4 collision, nothing promoted

Holds for both systems, for different reasons: RKM's predicates because there's nothing to
promote (no data), Signal Genealogy's predicates because they were evaluated and found to be
prior-knowledge configuration, not observed-fact R.

## Status

Gate: **Step 6 — GREEN.** All ten predicates (five per system, two systems, correctly
distinguished despite name overlap) evaluated against real evidence and given an explicit
disposition. Nothing promoted. No architecture expansion. The premature "nothing anywhere is
observed" conclusion was caught and corrected before this step closed, per direction.

Proceeding to Step 7 (ℒ code verification) per the locked sequence.
