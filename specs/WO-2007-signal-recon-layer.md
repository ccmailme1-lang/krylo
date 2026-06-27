# WO HARDENING — Signal Recon Layer
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2007 — Signal Recon Layer (Exploratory Genealogy Engine)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/signalgenealogy.js · src/engine/scpstore.js ·
  src/engine/epistemicbudget.js · src/engine/causalvaliditygate.js ·
  src/engine/reconlayer.js · src/engine/happypathgenome.js ·
  src/components/analysis/recondashboard.jsx

Status: SPEC — BLOCKED on WO-2004 (CanonicalEvent Identity Kernel)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Maintain and expand a write-isolated graph of validated precursor
observables by traversing causal structure upstream from observed signals.

**Output:** Signal Candidate Package (SCP) — a structured, scored,
non-binding intelligence artifact. Status is always CANDIDATE_ONLY.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- Signal history from Truth Engine (read-only)
- CanonicalEvent identity graph from WO-2004 (read-only) — node anchor
- Domain pressure states from surfacerouter.js (read-only)
- Happy Path outcome records from pathstore.js (read-only)

**Output contract:**
- SCPs (scored, CANDIDATE_ONLY — never executable)
- Genealogy graph mutations (internal DAG only — not production schema)
- Simulation reports (read-only artifacts)
- Ranked candidate recommendations surfaced to recondashboard.jsx

**Explicit exclusions:**
- No writes to production ingestion registry
- No adapter deployment or activation
- No direct writes to surfacerouter.js, dispatchBatch(), or any cone
- No schema mutation on CanonicalEvent or Truth Engine
- No trust score assignment
- No external API calls — source discovery is hypothesis-only until
  explicitly promoted by Founder

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  NOTE: Recon Layer reads signal history; it does not alter signal schema.
  All outputs are SCP artifacts, not schema writes.

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: ExplorationScore ranks SCPs internally. The dashboard surfaces
  ranked candidates. No SCP auto-promotes to production. Promotion
  requires explicit Founder action.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: Genealogy expansion and hypothesis generation are write-isolated.
  No path from Recon Layer back to convergenceclassifier.js or
  metricsengine.js.

- [x] UI layer touched → display does NOT introduce new data dependencies
  NOTE: recondashboard.jsx reads from scpstore.js only. No new data
  sources created for the UI.

**Drift notes:** The Recon Layer is a read-only consumer of production
state and a write-only producer of SCP artifacts. These two channels
never cross.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The system currently detects from observed signals forward;
this WO extends detection upstream — finding precursor observables before
they resolve into consensus signals, operationalizing "before it becomes
obvious" (§19 doctrine) at the structural input layer.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a Signal
Candidate Package (SCP) — a bounded, scored, non-binding artifact
identifying a validated precursor observable with explicit causal
confidence, regime conditions, and outcome lag distribution."**

---

## 6. FORMULA / CONTRACT

### Signal Candidate Package (SCP) — locked schema

```
{
  id:                           'SCP-XXXX',
  hypothesis:                   string,
  target_signal:                string,
  observed_gap:                 string,
  candidate_upstream_sources:   string[],
  genealogy_chain:              string[],
  expected_lead_time:           string,
  outcome_lag_distribution:     { p25: number, p50: number, p75: number, n: number },
  information_gain_score:       number,   // 0–1
  causal_confidence_score:      number,   // 0–1
  observability_score:          number,   // 0–1
  integration_cost_estimate:    number,   // 0–1
  exploration_score:            number,   // 0–1 (computed)
  causal_validity:              'IDENTIFIABLE' | 'CONFOUNDED' | 'UNRESOLVED',
  negative_genealogy_constraints: string[],
  regime_conditions:            { label: string, features: string[] }[],
  recommendation:               string,
  status:                       'CANDIDATE_ONLY'
}
```

`status: 'CANDIDATE_ONLY'` is immutable. No code path may alter it.

### Exploration Score

```
ExplorationScore =
  (InformationGain × LeadTime × CausalStrength)
  ÷
  (Cost × Noise × Redundancy × MaintenanceRisk)
```

All inputs normalized 0–1. Score normalized 0–1.
Components always surfaced alongside composite (no masked scores).

### Epistemic Budget — hard caps (non-negotiable)

| Constraint              | Limit                            |
|-------------------------|----------------------------------|
| Max graph depth         | 4 hops from observed signal      |
| Max branching factor    | 3 upstream candidates per node   |
| Min ExplorationScore    | 0.35 (below = discard, no SCP)   |
| Max active SCPs         | 50 (FIFO eviction below threshold)|

### Causal Validity Gate — identifiability test

A node is marked IDENTIFIABLE if ALL THREE hold:
1. Removing upstream signal increases target prediction error ≥ 15%
2. Effect is stable across ≥ 2 distinct regimes (regime_conditions required)
3. No equally predictive non-causal substitute found (confounder substitution)

Fails any criterion → CONFOUNDED.
Cannot be tested (insufficient history, n < 10) → UNRESOLVED.
UNRESOLVED SCPs are surfaced but visually flagged — never promoted.

### Negative Genealogy Constraints (first-class primitive)

Each SCP must carry `negative_genealogy_constraints[]`.
Rule: if signal X appears without signal Y in ≥ 80% of historical
non-outcome cases, X is NOT causal for Y — add as constraint.
Constraints block the corresponding genealogy edge from being scored
as causal.

### Happy Path Genome — three-object structure (locked)

```
genome = {
  structural_path:         string[],        // e.g. ['A','C','D','H']
  regime_conditions:       { label, features }[],
  outcome_lag_distribution: { p25, p50, p75, n }
}
```

Structural path alone is insufficient. Regime and lag distribution are
mandatory fields. A genome without n ≥ 5 outcomes is not emitted.

### Genealogy Graph — edge schema (time-indexed)

```
edge = {
  from:              nodeId,
  to:                nodeId,
  type:              'causes' | 'correlates_with' | 'precedes' | 'observed_by' | 'derived_from',
  lag_estimate_days: number,
  regime:            string | null,   // null = regime-invariant
  confidence:        number,          // 0–1
  negative:          boolean          // true = constraint edge (not causal)
}
```

Edges without `lag_estimate_days` are invalid and rejected on insert.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/signalgenealogy.js` | NEW — DAG with time-indexed edges, node types (Signal/Process/Dataset/API/Proxy/Event), expand_genealogy(), edge validation | — |
| `src/engine/scpstore.js` | NEW — SCP CRUD, FIFO eviction at 50, status: 'CANDIDATE_ONLY' enforced on write, no mutation path | — |
| `src/engine/epistemicbudget.js` | NEW — budget function, depth ≤4, branching ≤3, ExplorationScore floor 0.35, eviction policy | — |
| `src/engine/causalvaliditygate.js` | NEW — identifiability test (3 criteria), regime stability check, confounder substitution, returns IDENTIFIABLE/CONFOUNDED/UNRESOLVED | — |
| `src/engine/reconlayer.js` | NEW — orchestrator: detect_blind_spots → generate_hypotheses → expand_genealogy → discover_sources → simulate → score → emit SCP | — |
| `src/engine/happypathgenome.js` | NEW — genome extraction from pathstore.js outcomes: structural_path + regime_conditions + outcome_lag_distribution; requires n ≥ 5 | — |
| `src/components/analysis/recondashboard.jsx` | NEW — read-only dashboard: ranked SCPs, active hypotheses, blind spots, causal_validity indicator; no write path | — |
| `src/engine/pathstore.js` | READ-ONLY consumer — happypathgenome.js reads outcome records | No structural change |
| `src/engine/surfacerouter.js` | READ-ONLY consumer — reconlayer.js reads domain pressure | No structural change |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — SCP is a deterministic output schema; CANDIDATE_ONLY status is unambiguous; epistemic budget is numeric |
| Does this have a single dominant output? | YES — SCP is the only output unit; every function terminates in SCP production or internal graph mutation |
| Are all boundaries explicitly defined? | YES — write isolation is absolute; budget caps are numeric; causal validity gate has explicit pass/fail criteria |
| Can this be built without touching an undefined dependency? | NO — WO-2004 (CanonicalEvent) is not yet built; genealogy nodes need stable canonical identity anchors |
| Does this avoid increasing expressive flexibility in core? | YES — Recon Layer is a fully isolated read-consumer; Truth Engine, surfacerouter, and dispatchBatch are untouched |

**Verdict: FAIL — BLOCKED on WO-2004.**

Retest after WO-2004 ships. All other sections pass.

---

## 9. DEFINITION OF DONE

1. `grep -n "CANDIDATE_ONLY"` in scpstore.js confirms status is set on
   every write and no mutation path exists.
2. `grep -n "dispatchBatch\|surfacerouter\|ingestion"` in reconlayer.js
   returns zero production-write references.
3. Epistemic budget test: manually trigger expand_genealogy() past depth 4
   → confirm expansion halts and no new SCPs are added.
4. Causal validity test: inject a confounded signal (X predicts Y but so
   does Z with higher stability) → gate returns CONFOUNDED.
5. Negative genealogy test: inject X without Y in 80%+ of non-outcome
   cases → constraint edge blocks causal scoring for that pair.
6. Happy path genome test: extract genome with n < 5 outcomes → no genome
   emitted (silence, not fabrication).
7. QA: INSUFFICIENT query submitted → confirm zero SCPs emitted.
8. QA: structural query (TECHNOLOGY + CAPITAL evidence) → SCP carries
   causal_validity field and outcome_lag_distribution.
9. recondashboard.jsx: confirm no write calls to any engine function
   (read-only grep pass).

---

## NOTES

**Output guarantee (non-negotiable):** This WO produces "validated
precursor observability structure" — NOT "causal discovery." The
system detects predictively useful upstream observables. It does not
claim to establish causation. The causal validity gate names the
distinction explicitly in every SCP.

**Positioning check (§11a):** "We don't predict. We detect." Recon Layer
detects earlier. It does not forecast outcomes or recommend production
actions. Every SCP carries explicit uncertainty bounds.

**Relationship to §19:** Recon Layer is the perceptual boundary expansion
arm of the Closed-Loop Leverage Principle. Path Memory (WO-1869) records
which routes produced leverage. Recon Layer searches for earlier entry
points into those routes. They are complementary, not redundant.

**Build sequence after WO-2004 ships:**
  WO-2007.1 — signalgenealogy.js + scpstore.js (graph + artifact store)
  WO-2007.2 — epistemicbudget.js + causalvaliditygate.js (constraint layer)
  WO-2007.3 — reconlayer.js orchestrator (full loop)
  WO-2007.4 — happypathgenome.js + recondashboard.jsx (output surfaces)
