# WO-1868 — Metrics Truth Engine (Performance Metric Surface)
## STATUS: DRAFT v0.1 — conversation-started 2026-06-25. NOT build-ready (see §HARDENING).

The daily-dashboard performance metrics = the platform's vital signs. Six hero metrics,
bold/primary treatment, surfaced across Target Packet · Action Plan · HP panel.

---

## LOCKED DIRECTION (firm — does not change with formula tweaks)

**The six hero metrics:** Signal · Validity · Convergence · CAC · ROAS · LTV.
- **Detection trio** (Signal/Validity/Convergence) = quality of the *thinking*. Measured. On-mission ("we detect"). Universal across all domains.
- **Economics trio** (CAC/ROAS/LTV) = quality of the *economics*. Generalized (universal, not strict-business) per Founder directive 2026-06-25. Modeled — must be labeled as such.

**The core reframe (Truth Engine work):** every metric decomposes into
**REALIZED (observed truth)** + **PROJECTED (assumed forecast)**.
- Realized → bold, primary, dominant visual weight.
- Projected → smaller, clearly labeled, sensitivity-controlled.
- **Groundedness %** = Realized weight / Total weight × 100. This is **Validity extended to the economics** — a number that tells you how much of itself is real. No competitor does this.
- Color bands: green > 70%, amber 40–70%, red < 40%.
- Display rule: dashboard shows **Realized Value (Groundedness %)**; drill-down reveals the realized/projected split + assumptions.

**Hierarchy of Truth (input ranking — higher = truer):**
1. User actuals  2. Live feeds (FRED/EDGAR/Kalshi…)  3. Sector benchmarks  4. Heuristic defaults  5. Pure projection.
Push every input up this stack to raise groundedness.

**Persona tuning (GUARDRAIL):** persona (Aggressive 35yo MD ↔ 81yo conservative retiree) tunes
**ASSUMPTIONS** (discount rate, horizon, hourly rate) and **DECISION THRESHOLDS** (go/no-go,
min-groundedness). Persona **does NOT** change the groundedness computation — "78% grounded"
must mean the same observed-fraction for every persona, or the truth measure is corrupted.

**HP scoping rule (load-bearing):** Signal/Velocity/Convergence are produced by the HP engine
(`happypathdisplacementengine.js`) + `convergenceclassifier.js`. HP is **ambient** (whole signal
field — that's why it qualifies on TECHNOLOGY·CAPITAL regardless of query). The metric strip is
**per-query**. **Validity gates whether HP convergence is query-relevant:** HP qualifying domains ∩
query domain → high groundedness, query-relevant; no overlap → ambient, low groundedness, flagged
"field signal, not your query." Never render ambient HP convergence as query-specific.

---

## WIRING CONTRACT (NON-NEGOTIABLE — this is what prevents the f(confidence) drift)

> Metrics are computed ONLY in `src/engine/metricsengine.js` via
> `computeMetrics(synthesis, hpState, persona)`, attached ONLY at `synthesizeQuery`'s return
> as `synthesis.metrics`, and rendered via ONE shared `<MetricStrip>` component
> (`src/components/analysis/metricstrip.jsx`) mounted on Target Packet, Action Plan, and the
> HP panel. **Components NEVER recompute a metric.** React is a render-only sink; the engine decides.

Consumers already call `synthesizeQuery` — so one attach point feeds all surfaces for free:
`targetpacket.jsx`, `actionmatrix.jsx`, `intelligencebrief.jsx`.
The AMBIGUOUS / INSUFFICIENT early-returns carry a `metrics` object with validity low /
groundedness ~0 → the strip auto-renders "ungrounded" instead of confident numbers. Fail-safe
and metric system become the same thing.

**BANNED:** the single-scalar "confidence" costume for CAC/ROAS (`f(confidence)` in `buildBrief`).
Replaced by component-based truth. Delete on wiring.

Canonical shape:
```
metrics: {
  signal:      { value, groundedness },
  validity:    { value, groundedness },
  convergence: { value, groundedness, queryRelevant: bool },
  cac:  { value, realized, projected, groundedness, label:'MODELED' },
  roas: { value, realized, projected, groundedness, label:'MODELED' },
  ltv:  { value, realized, projected, groundedness, label:'MODELED' },
  ltvCacRatio: number,
  economicsGroundedness: number,   // weighted avg, uses the UNIFIED formula (H1)
  decisionEmissionScore: number,   // MULTIPLICATIVE only (H5)
}
```

---

## DRAFT COMPONENT MODEL (Founder draft 2026-06-25 — subject to HARDENING below)

### 1. Generalized CAC
`CAC = (Realized Monetary + Realized Ancillary + Modeled Time/Opportunity) / # Acquisitions (or 1)`
- Realized/Truth (bold): direct $ (fees, spend, down payment, price), ancillary $ (tools, transport), count.
- Assumed/Forecast: hourly rate × hours, opportunity cost.
- Display: **CAC: $1,240 (78% Grounded)** · *Realized $920 | Modeled (time) $320*
- Target > 70% grounded on meaningful decisions; < 50% → "Highly Modeled — review assumptions."

### 2. Generalized ROAS
`ROAS = (Realized Value + Projected Future Value) / (Realized + Modeled Acquisition Spend)`
- Realized/Truth (bold): actual spend to date (denom), already-captured savings/revenue (numer).
- Assumed/Forecast: discounted future attributable value.
- Display: **ROAS: 4.2x (65% Grounded)** · *Realized 2.8x | Projected +1.4x*

### 3. Generalized LTV (hardest — mostly forward)
`LTV = Realized Net Benefits to Date + Σ_t [ ExpectedBenefit_t × (1−churn)^t / (1+r)^t ]`
- Realized/Truth (bold, small weight): net benefits captured so far.
- Assumed/Forecast (dominant, separated): horizon, discount rate r (persona), churn, benefit trajectory.
- Display: **LTV: $48,200 (42% Grounded)** · *Realized $20,300 | Projected (18 yrs) $27,900*

### Derived
- **LTV:CAC ratio** (target ≥ 3:1; persona-adjustable).
- **Overall Economics Groundedness** (weighted avg — requires unified formula H1).
- **Decision Emission Score** = Signal × Validity × Convergence × AvgGroundedness (multiplicative, H5).

### Truth-layer integration / UX
- Groundedness auto-updates as realized data arrives (real-time compiler).
- Validity flags large realized↔modeled gaps.
- Bold/large: realized values + groundedness %. Subtle/gray: pure projections.
- Hover/drill: full decomposition table.

---

## HARDENING — OPEN ITEMS (must close before build; Bottle Test currently FAILS on H1–H4)

- **H1 — Unify the Groundedness formula.** One definition across all three:
  `Groundedness = Σ(observed-input value) / Σ(all-input value) × 100`, every input tagged
  observed|assumed. The three ad-hoc formulas in the draft aren't comparable and can't be
  averaged into "Overall Economics Groundedness." BLOCKER.
- **H2 — Define realized-input data sources, or declare BLOCKED.** Realized CAC/ROAS/LTV needs
  actuals. Available today: user-entered query numbers, live feeds (FRED/EDGAR/Kalshi).
  NOT available: bank/transaction history, time logs. Per §16 Signal Ingestion, realized inputs
  flow through the normalized ingestion path — never invented. Until each input's source is named,
  that input's realized side is TBD = BLOCKED. (Honest near-term: groundedness starts low and
  rises as integrations land — a feature, not a flaw.)
- **H3 — Groundedness is persona-INVARIANT.** Persona tunes assumptions + thresholds only, never
  the groundedness computation. (The draft's "MD gets more weight on projections" corrupts the
  measure — strike it.)
- **H4 — Do NOT overload Convergence.** The draft's "Convergence also measures realized-vs-projected
  agreement" gives one metric two meanings = semantic collapse (DEF-1863 failure mode, fails Bottle
  Test #5). Keep Convergence = signal-field state; realized-vs-projected agreement → Validity.
- **H5 — Decision Emission Score stays MULTIPLICATIVE.** Product form is correct (a weak leg craters
  the score, can't be masked). Ban any weighted-average/additive variant. Components always visible.
- **H6 — ROAS groundedness must count the denominator** (modeled acquisition spend), via H1's
  all-inputs formula. The draft grounds only the numerator → overstates.
- **H7 — Define "Realized Count Adjustments"** in the CAC formula (currently undefined).

## FILE MAP (planned — not yet built)
| File | Change |
|------|--------|
| `src/engine/metricsengine.js` (NEW) | `computeMetrics(synthesis, hpState, persona)` |
| `src/engine/querysynthesis.js` | attach `metrics` to `synthesizeQuery` return (incl. AMBIGUOUS/INSUFFICIENT) |
| `src/components/analysis/metricstrip.jsx` (NEW) | shared hero strip |
| `src/components/analysis/targetpacket.jsx` | mount `<MetricStrip>` |
| `src/components/analysis/actionmatrix.jsx` | mount `<MetricStrip>` + consume ltvCacRatio |
| `src/components/analysis/intelligencebrief.jsx` | replace `f(confidence)` CAC/ROAS with `synthesis.metrics` |

## DEFINITION OF DONE
grep `computeMetrics` in querysynthesis.js; one `<MetricStrip>` mounted on all three surfaces;
no metric recomputed in any component; `f(confidence)` removed from buildBrief; H1–H8 closed.

---

## v2 ENHANCEMENT REVIEW (external draft 2026-06-25)

ACCEPTED (fold in):
- **Realization Alignment** — sub-metric UNDER Validity for the realized-vs-projected gap. Honors
  H4 (Convergence stays pure). Refinement: distinguish "little realized yet" (→ low groundedness,
  NOT low validity) from "projection diverging from realized track record" (→ low validity).
- **Groundedness trend** ("78% ↑12%") — on-brand; needs historical groundedness storage.
- **Edge cases** — one-off (high groundedness but low total value → auto-deprioritize),
  zero/negative (flag explicitly), zero-division guards.
- **Export audit trail** — full observed/assumed decomposition + assumption snapshot at emission.
- Two-persona example table format.

REJECTED:
- "Normalize non-monetary inputs to $ using **persona hourly rate**." This re-breaks H3: persona-tuned
  rate inside the groundedness WEIGHTS makes groundedness persona-dependent. The v2 example proves it —
  identical underlying data yields CAC **82% (MD) vs 91% (Grandmother)**. Same data MUST yield same
  groundedness.

## H8 — Groundedness weighting is persona-NEUTRAL (closes the v2 break)
The displayed metric VALUE uses persona-tuned assumptions (hourly rate, discount rate, horizon).
The groundedness WEIGHTING uses fixed persona-NEUTRAL reference constants for the assumed components.
→ Same decision + same observed actuals = same groundedness for every persona (H3 preserved), while
the metric value still responds to persona. Two distinct uses of the inputs; never conflate them.

## CANONICAL SOURCE
This file (specs/WO-1868) is the source of truth — NOT any external artifact path
(/home/workdir/…) or "Owner: Grok/Gemini" metadata. External drafts are inputs; the repo spec governs.

---

## SEVENTH METRIC — LEVERAGE REALIZATION (Founder directive 2026-06-25 → own subsystem, WO-1869)

Groundedness answers "how REAL are the inputs?" **Leverage Realization** answers "did the path
actually CREATE leverage?" — orthogonal questions. A 95%-grounded decision can be low-leverage; a
25%-grounded decision can be the early signal that becomes a massive advantage. LR is the scoreboard
for the actual mission ("find advantage before it's obvious").

**Definition:** `Leverage Realization = Observed Outcome ÷ Projected Outcome`.

**Epistemic note:** LR is the one PURE-truth metric — once the outcome lands it is 100% observed
(retrospective). It is also the most on-mission. But it has TWO faces, which must not be conflated:
- **LR(decision)** — retrospective; fills in months later; feeds the memory layer. Pure observation.
- **LR-prior(path-class)** — the historical track record of similar emitted paths, shown AT emission
  as evidence ("paths like this realized 0.7× leverage, N=12"). This is the "Google Maps for leverage"
  lookup. Memory, not prediction. At emission time the live decision's own LR is null/"outcome pending."

**Memory layer:** every Happy Path emission becomes `Path → Outcome → Realized Result`. New paths
compare against historical **Path DNA** → "this structure previously produced leverage." Not AI, not
self-learning, not autonomous — evidence accumulation.

**Builds on existing infra (search before build):** `convictionstore.js` already has the bones —
WO-1823 Conviction Record (CommitEvent), WO-1824 Thesis Monitoring, WO-1825 Decision Lineage +
`computeCalibration`. LR is the metric layer ON TOP of that lineage/calibration store, NOT greenfield.

**Challenges (must spec in WO-1869):**
- **Outcome capture (the blocker)** — needs longitudinal outcome reporting (user or feeds). Worse than
  H2's input gating because of the long time lag. Until captured, LR(decision) = "outcome pending."
- **Attribution / sample size** — a single LR value is noisy (luck vs. path). "This pattern = high-
  leverage DNA" requires N samples. LR-prior MUST carry its own confidence/N — never claim DNA off n=1.
- **Survivorship bias** — only followed + reported decisions produce LR; learned DNA is biased toward them.

**Scope:** reserve the seventh hero slot in this WO; LR is its OWN subsystem → file **WO-1869**
separately (do not bloat 1868 with a longitudinal learning loop — single responsibility holds).
Sequence per Founder: finish classifier/extraction hardening → wire the six metrics (1868) → build the
LR loop (1869). "First place to invest after current hardening."

**Vital Seven:** Signal · Validity · Convergence · CAC · ROAS · LTV · **Leverage Realization**.
