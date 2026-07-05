# WO HARDENING — Metric Definition Layer ("Instrument Manual")

## HEADER

**WO-[NUMBER TBD] — Metric Definition Layer**
Date: 2026-07-05
Author: spec pass per Founder request, grounded against real files
Target file(s): `src/engine/metricdefinitions.js` (new — only file touched)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Provide a static, structured definition (what it measures / what it doesn't / units-scale / sensitivity) for each metric `computeMetrics()` already produces — extracted and formalized from the engineering comments already written in `metricsengine.js`, not authored fresh.

**Output:** One `MetricDefinition` object per metric key, retrievable by key.

---

## 2. BOUNDARY DECLARATION

**Input contract:** a metric key string — one of `signal | validity | convergence | cac | roas | ltv | leverageRealization | sci | sps` (the exact keys `computeMetrics()` returns, verified against `src/engine/metricsengine.js:99-113`).

**Output contract:**
```
MetricDefinition {
  key,
  definition:  string,   // "what does this measure" — plain, neutral, no judgment language
  scope:       string,   // what it explicitly does NOT represent
  units:       string,   // scale/range, e.g. "0-1 fraction" or "$ modeled range"
  sensitivity: string,   // what kinds of underlying changes move this value
  groundednessNote: string, // what "observed" vs "assumed" means for THIS metric specifically
}
```

**Explicit exclusions:**
- Does NOT compute or alter any metric value — `metricsengine.js` remains the sole computational authority, unchanged, per its own header ("Single computational authority for all six hero metrics. Components are render-only sinks — never recompute metrics inline.") This module is a peer render-only sink for definitions, same discipline as `metricstrip.jsx` is for values.
- Does NOT provide interpretation, recommendation, or judgment ("good/bad", "buy/sell"). That's out of scope for this WO entirely — a separate, later "interpretation lens" concept (name TBD, see NOTES) is explicitly not part of this ticket.
- Does NOT duplicate KRYL-980's `whytrace.js` — that module answers "why does THIS SPECIFIC detected event have this value" (a live, per-event causal trace). This module answers "what does this metric mean in general" (a static reference, same text regardless of which event you're looking at). Different questions, different modules, no overlap.
- Does NOT expose `metricsengine.js`'s internal formulas verbatim (per the Founder's proprietary-exposure concern) — see section 6 for the safe-disclosure boundary applied per metric.

---

## 3. ZERO DRIFT CONFIRMATION

- [ ] Detection layer touched → N/A, this never touches ingestion/routing.
- [ ] Scoring layer touched → N/A, this returns static text, no score.
- [ ] Inference layer touched → N/A, no computation, no recompute of anything.
- [x] UI layer touched → intended consumer is `metricstrip.jsx`, but wiring the actual UI affordance (e.g. a hover/tap disclosure) is explicitly OUT of scope for this ticket. This spec covers the definition data module only.

**Drift notes:** None — this is the most contained of the Perception Synergy-adjacent tickets so far: pure static data, zero computation, zero state.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** KRYLO already tells the user a number; this makes it also tell the user what the number is an instrument for — without ever telling them what to conclude from it, keeping interpretation on the user's side of the line per section 20.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a static, queryable definition for every metric already in production, so no metric is ever displayed without KRYLO also being able to say what it is."**

---

## 6. FORMULA / CONTRACT

No formula — this is a static lookup table, not a computation. The **content** contract (per metric, safe-disclosure boundary applied) is:

| Metric | Definition (safe, non-formula) | Scope exclusion | Units | Sensitivity (safe, non-formula) |
|---|---|---|---|---|
| `signal` | Ambient convergence-engine output for the current query's domain field | Not query-specific unless `queryRelevant` — ambient field signal otherwise | 0–1 fraction | Moves with live Happy Path engine activity in the relevant domain(s) |
| `validity` | Internal soundness of how the query was resolved | Not a truth claim about the underlying subject matter | 0–1 fraction (maps to `synthesis.confidence`) | Moves with how many live feeds vs. heuristic defaults contributed to resolution |
| `convergence` | Current signal-field state classification | Deliberately NOT realized/projected-blended (kept as pure field state per H4) | Categorical label (INSUFFICIENT SIGNAL → HIGH CONVERGENCE) + derived 0–1 score | Moves with domain overlap between the Happy Path engine's active domains and the query's own domain |
| `cac` | Generalized acquisition cost estimate | "Generalized" = not strict-business-only; always labeled MODELED | $ (realized + modeled components) | Realized component only appears when the query carries a stated dollar figure |
| `roas` | Return-on-acquisition-spend projection | Zero realized component at emission — pure projection until an outcome lands | Ratio, labeled MODELED | Moves with query confidence |
| `ltv` | Lifetime-value projection | Zero realized/zero groundedness at emission by design — "honest, rises as outcome data accrues" (verbatim from the engine's own comment) | $ (projected), labeled MODELED | Moves with persona horizon/discount-rate inputs and CAC |
| `leverageRealization` | Historical track record of structurally similar past routes | WITHHELD (null) below N=5 recorded instances — not a missing value, an explicit withhold | Ratio (observed ÷ projected), plus N | Only appears once enough historical instances exist |
| `sci` | Structural Confirmation Index — how much of a detected event's evidence is hard-to-fabricate | Populated only once a real EvidenceGraph exists (WO-2004/2005B pipeline) | 0–10 score + 0–1 groundedness | Moves with the mix of evidence tiers (structural vs. narrative) backing the event |
| `sps` | Structural Precursor Score | WITHHELD below N=5, same discipline as `leverageRealization` | Historical frequency, N-gated | Only appears once enough historical instances exist |

Every cell above is phrased as **behavior/scope**, not formula — no coefficients, no weight values, no internal variable names, per the Founder's proprietary-exposure concern (section 2's exclusions).

Normalization (§16): N/A — this is text data, not a signal value; §16's 0–100 scale doesn't apply here.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/metricdefinitions.js` | NEW — `getMetricDefinition(key)`, exported | — |
| `src/engine/metricsengine.js` | none | read as the source-of-truth for what the 9 keys and their observed/assumed weight comments actually say — this file's own comments are where the content above was extracted from |
| `src/components/analysis/metricstrip.jsx` | none | remains render-only for values; not wired to definitions in this ticket |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — no metric can be displayed without an available definition of what it is. |
| Does this have a single dominant output? | YES — one `MetricDefinition` per key. |
| Are all boundaries explicitly defined? | YES — see section 2, including the explicit non-overlap with `whytrace.js`. |
| Can this be built without touching an undefined dependency? | YES — pure static data, zero dependencies. |
| Does this avoid increasing expressive flexibility in the core? | YES — adds no new metric, no new computation; purely descriptive text for metrics that already exist. |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** Zero runtime coupling to any existing engine — pure static lookup. No hidden dependencies.

**2. Semantic Consistency (SC):** Every definition's wording is drawn directly from `metricsengine.js`'s own existing comments, not reworded independently — keeps the "instrument manual" in sync with the actual engine's stated intent rather than becoming a second, driftable description of the same thing.

**3. Execution Containment (EC):** Fully declarative, zero side effects, contained to one new file.

**4. Drift Exposure (DE):** The real risk here isn't code drift, it's **content drift** — if `metricsengine.js`'s formula or weighting changes later, this file's prose could go stale silently, since nothing enforces the two staying in sync. Mitigation: this file's header should cross-reference the exact `metricsengine.js` line/comment each definition was drawn from, so a future formula change makes it easy to find the matching prose that also needs updating. (Not a runtime check — a documentation discipline, similar in spirit to the RBCS-invariant-version pattern, but for content rather than code.)

**Outcome tag:** CONSTRAINED — acceptable, with the content-drift mitigation above as a required downstream note.

---

## 10. DEFINITION OF DONE

**Verification:**
```bash
node --input-type=module -e "
import { getMetricDefinition } from './src/engine/metricdefinitions.js';
const keys = ['signal','validity','convergence','cac','roas','ltv','leverageRealization','sci','sps'];
for (const k of keys) {
  const d = getMetricDefinition(k);
  console.assert(d && d.definition && d.scope && d.units && d.sensitivity, 'FAIL: incomplete definition for ' + k);
}
console.log('all 9 metric definitions present and complete');
"
```

---

## NOTES

- The "interpretation lens" concept (Gains/Short/Stability/Volatility-style framing) from the earlier discussion is explicitly NOT part of this ticket — it needs its own name (not "lens," which already means persona routing in this codebase — `lensrouter.js`) and its own spec, after the §23 orthogonality question on those four candidate framings is resolved.
- This has no Jira ticket yet — it emerged from a design discussion, not the KRYL-975 epic. File one if you want it tracked alongside the rest.
- Not built — needs an explicit Go per CLAUDE.md §11 before any code is written.
