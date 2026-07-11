# KRYL-1026 — SES Phase 2: Relevance Broker (Part B)
## Hardened per §11a — Bottle Test v1.0

---

## HEADER

**KRYL-1026 — SES Phase 2: Relevance Broker**
Date: 2026-07-11
Author: qualified draft (Founder to ratify)
Target file(s): `src/engine/relevancebroker.js` (NEW — engine only; UI consumption is Slice 2, out of scope here)

Scope note: this WO is the **engine** (`computeRelevance`). Rendering the Domain Console in ranked order is a separate downstream slice (Slice 2), deliberately excluded to keep one dominant output.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Given a detected condition (SES) and the field's already-pooled signals, rank each signal by its decision-value *to that condition*.

**Output:** One relevance-ranked list — `CandidateRelevance[]`.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `condition` — the SES output from `computeSES()` (`searchenvironmentstate.js`): the detected environmental state (activity, observation health, opportunity climate, volatility, constraint pressure, active domains).
- `signals` — pooled field signals already in the store, via `getObservations()` (`runtimeobservablestore.js`). The broker does NOT fetch or ingest.
- Evidence quality per signal — read from STEE surfaces: `computeSCI()` + `computeStructuralDivergence()` (`structuralconfirmation.js`), and domain field via `getQueryDomainPressure()` (`domaingravity.js`).

**Output contract:** `CandidateRelevance[]`, each:
`{ signalId, relevanceScore (0–100), servedDimension, groundedness (0–1), reason, withheld (bool) }`, ranked descending. Plus classified **ABSENCE** entries (`{ dimension, absenceClass, expectedDomain }`) for expected-but-missing evidence classes (§22).

**Explicit exclusions:** Does NOT detect condition (STSE/SES owns). Does NOT evaluate truth or mutate any signal score (STEE owns — broker is read-only). Does NOT recommend or arbitrate (LEV-02 owns). Does NOT create/fetch evidence. Does NOT personalize by lens (lens may reorder *presentation* in Slice 2, never the relevance computation — same discipline as §18 groundedness).

Per the STSE↔STEE Reconciliation Contract: the broker **sits between** the two, **consumes both**, **modifies neither**, and **exclusively owns strategic relevance weighting**.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Scoring layer touched → output is NOT a recommendation — it is a relevance ranking; LEV-02 remains arbiter.
- [x] Inference layer touched → result does NOT write back to signal scores — broker is a pure read-only function; inputs returned unmutated.
- [x] UI layer touched → N/A this WO (Slice 2). Engine has no UI dependency.

**Drift notes:** `computeRelevance` is a pure function of (condition, signals, evidenceQuality). No global mutation, no ingestion, no persistence. Relevance is derived ONLY from real signal properties + condition — no LLM/narrative importance, no fabricated relevance (§19).

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** It surfaces the evidence that matters to the *emerging* condition before that relevance is obvious — the §19 earliness inversion applied to evidence surfacing. This is the mechanism behind "KRYLO optimizes relevance to the emerging state, not retrieval" — the core differentiation from search.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a relevance-ranked evidence surface scoped to the detected condition."**

---

## 6. FORMULA / CONTRACT

**Relevance score for signal `s` given condition `C`:**

```
Relevance(s | C) = 100 · ( Σ wᵢ·termᵢ ) / Σ wᵢ        (all termᵢ ∈ [0,1], all from REAL sources)

  domainMatch(s,C)   = 1 if s.domain ∈ C.activeDomains ; 0.5 if adjacent ; 0 otherwise
  magnitude(s)       = s.confidence / 100                         (§16-normalized, real)
  recency(s)         = decayFactor(s.ts, s.decay)                 (real timestamp + decay tier)
  independence(s)    = computeSCI(s).independence                 (STEE, real; null ⇒ withhold)
  contradiction(s,C) = computeStructuralDivergence(s vs C read)   (real; contradictions are HIGH value)
  earliness(s)       = 1 − consensus(s)                           (§19 inversion via getLRPrior class)

Initial weights (calibratable via WO-2062, but DEFINED here — not TBD):
  w_domain=0.25  w_magnitude=0.20  w_independence=0.15  w_contradiction=0.15  w_earliness=0.15  w_recency=0.10
```

**servedDimension** ∈ { CRITICAL_SIGNAL, LEADING_INDICATOR, CONTRADICTION, OPPORTUNITY_RISK } — the condition→evidence-requirements classes named in the Founder brainstorm doc. Each signal is tagged with the dimension it most serves.

**Withhold gate (§19 — load-bearing):** if `magnitude(s)==0` OR `independence(s)` is null (no SCI), `relevanceScore` is **withheld** (`withheld:true`, not ranked as relevant). A signal with no grounded magnitude or no independent confirmation is never surfaced as "relevant." Relevance is never fabricated.

**Absence encoding (§22):** for each `servedDimension` the condition expects, if no pooled signal serves it, emit a classified ABSENCE entry — `STRUCTURAL` (can't exist here), `TEMPORAL` (expected, not yet observed), or `ANOMALOUS` (expected + historically present, now missing). Absence is a first-class output, never silence.

Units: `relevanceScore` 0–100. `groundedness` 0–1 (realized-input fraction, per §18).
Normalization: output conforms to 0–100 signal scale (§16).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/relevancebroker.js` (NEW) | `computeRelevance(condition, signals, opts)` → `CandidateRelevance[]`: the formula, withhold gate, absence encoding | — |
| `src/engine/searchenvironmentstate.js` | REUSE `computeSES` as condition input (read-only) | its computation |
| `src/engine/structuralconfirmation.js` | REUSE `computeSCI` / `computeStructuralDivergence` (read-only) | its computation |
| `src/engine/domaingravity.js` | REUSE `getQueryDomainPressure` / `getAllDomainPressures` (read-only) | its computation |
| `src/engine/runtimeobservablestore.js` | REUSE `getObservations` for pooled signals (read-only) | its computation |
| `src/engine/pathstore.js` | REUSE `getLRPrior` for the earliness/non-consensus prior (read-only) | its computation |

No new ingestion. No new HN fetcher (existing `usehnsignals`/`fetchHNTop` already ingest HN; the broker reads the pool, it does not fetch).

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — from "all signals" to "what matters for this condition" |
| Does this have a single dominant output? | YES — `CandidateRelevance[]` |
| Are all boundaries explicitly defined? | YES — consumes SES + STEE, modifies neither, owns relevance only |
| Can this be built without touching an undefined dependency? | YES — all 6 dependencies verified to exist |
| Does this avoid increasing expressive flexibility in the core? | YES — pure, read-only, transparent formula; no new core degrees of freedom |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity:** Read-only; preserves all invariants; introduces no hidden dependency; runtime contract is new but purely additive (a new pure function).
**2. Semantic Consistency:** Terminology (condition, evidence, relevance, dimension) aligns with existing ontology; `servedDimension` classes are the Founder doc's own; **no duplication** — reuses existing SES/SCI/domaingravity/pathstore rather than re-deriving.
**3. Execution Containment:** Declarative pure function; side-effect-free; no cross-module mutation.
**4. Drift Exposure:** Formula is static; weights are calibratable (WO-2062) but the formula is fixed — no "living definition."

**Outcome tag:** CONSTRAINED — PASS with a downstream note: the six weights are calibration parameters; they must be tuned via WO-2062's calibration loop against real outcomes, never hand-edited ad hoc.

---

## 10. DEFINITION OF DONE

**Verification:**
1. `grep -n "export function computeRelevance" src/engine/relevancebroker.js` returns the export.
2. Unit check: given a `condition` + mock `signals`, `computeRelevance` returns a deterministic `CandidateRelevance[]` with 0–100 scores, ranked descending.
3. A signal with `confidence:0` or null SCI comes back `withheld:true` (never ranked relevant).
4. A `servedDimension` the condition expects but no signal serves returns an ABSENCE entry with a classified `absenceClass`.
5. Input `signals` array is returned unmutated (assert deep-equal pre/post) — proves read-only.

Memory + Jira (KRYL-1026) updated only after 1–5 pass.

---

## NOTES

- Part A (routing signals into the pool) was reverted — HN already ingests via `usehnsignals`/`fetchHNTop`; the broker reads the pool, it does not fetch. If a future gap shows the pool is missing a needed source, that's a one-line `dispatchBatch` on the *existing* fetch, filed separately — not part of this WO.
- Slice 2 (Domain Console renders in broker-ranked order) is the UI consumer; separate WO once the engine lands.
- Lens/persona guardrail: may reorder presentation (Slice 2), never the relevance computation — "relevance to the condition" means the same fraction for every observer, or the broker is corrupted (mirrors §18's groundedness invariant).
