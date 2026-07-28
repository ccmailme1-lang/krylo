# WO-DRAFT: Decision Input Contract (DIC) — Real Estate Pilot

Status: Ready for WO creation, with two real gaps closed below that the design conversation
assumed were already built. Everything else in the design (declarative-only DIC, R/G/O/D shape,
INSUFFICIENT_INPUT vs STRUCTURAL_ABSENCE separation, PARTIAL_SATISFIED middle-state, passive
renderer, single-BenchmarkArtifact-per-field, real-estate-first) is sound and carries forward
unchanged from the design conversation. This document only corrects what doesn't match the real
codebase and removes time estimates per standing instruction (Started/Done, not ETAs).

---

## Two real gaps the design assumed were already built (verified against the actual repo)

**1. No formula registry exists.** Grepped the whole `src/` tree for `formulaRegistry`,
`FORMULA_REGISTRY`, `formulaRef`, and common deterministic-finance function names (`pmt`,
`breakeven`, `amortiz*`) — zero matches. The design's `derived` block assumes `formulaRef`
resolves through "the existing deterministic math registry." That registry doesn't exist. It has
to be built as part of this WO, not referenced as if already present.

**2. No separate "intake validator" layer exists.** Grepped for `intake`/`validator` modules —
none. Every query in KRYLO today runs through one real entry point:
`synthesizeQuery(session)` in `src/engine/querysynthesis.js`. There is no earlier normalization
layer the DIC can attach to. The DIC has to hook into `synthesizeQuery()` directly — as an early
branch, the same pattern already used this session for the diff-command parser (checked first,
non-match falls through to existing logic unchanged, per §21's routing-before-touching-signal
discipline).

Everything else the design conversation specified is confirmed real and available:
`benchmarkartifact.js` exists exactly as described (`admitBenchmark`, `combineBenchmarks`,
`resolveEvidenceTier`, Tier-2 ceiling 0.85) with zero current consumers — this WO is what finally
gives it a real caller.

---

## 1. Single Responsibility

A Decision Input Contract is declarative metadata only — R (required), G (groundable), O
(optional), D (derived) — describing what a decision type needs. It validates presence, reports
what's missing, and does nothing else. No retrieval, no math, no confidence, no rendering.

## 2. Boundary Declaration

IN SCOPE: one DIC (`homePurchaseDIC.js`), the formula registry it needs (new), the hook into
`synthesizeQuery()`, the `PARTIAL_SATISFIED` response state, the passive middle-state renderer.

OUT OF SCOPE: Career/Retirement DICs (replicate the pattern later, not now). Any new
`EvidenceTier` (BenchmarkArtifact already covers this). Any change to confidence composition,
routing, or the absence classifier's authority. Fallback-source logic for a groundable field
(stays in the connector layer, whenever that connector gets built — not designed here).

## 3. Zero Drift

`synthesizeQuery()`'s existing logic (life-domain templates, GENERAL/canonical resolution,
DEF-1864 withholding gate) is untouched. The DIC check is a new early branch; non-`homePurchase`
decision types fall through unchanged, same pattern as the diff-command parser already added this
session.

## 4. Strategic Leverage Statement

`benchmarkartifact.js` was built this session and has had zero real consumers since. This WO is
what actually uses it — the leverage isn't a new evidence model, it's finally wiring up a real one
that already exists and already carries the right guardrails (Tier-2 ceiling, weighted envelope,
observed-beats-benchmark hierarchy).

## 5. Output Gravity

One `PARTIAL_SATISFIED` response replacing the current unconditional "REFINE YOUR QUERY" for
`homePurchase`-type queries with at least one real groundable value: Observed Evidence (real
BenchmarkArtifacts), Deterministic Derivations (only where every operand is grounded), Missing
Inputs (named, not silently dropped), doctrine footer (§11a/§22).

## 6. Formula / Contract

```
// src/intake/contracts/homePurchaseDIC.js — plain object, no functions, no methods.
// Lint-enforced invariant: a DIC file may export ONLY a JSON-shaped object matching this schema.
export default {
  decisionType: "homePurchase",
  required: [
    { key: "location_geo",        label: "ZIP / county / CBSA",       units: "geo" },
    { key: "annual_rent_cash",    label: "Current annual rent",       units: "USD" },
    { key: "purchase_price_offer", label: "Target purchase price",    units: "USD" },
    { key: "holding_period_years", label: "Expected ownership horizon", units: "years" },
  ],
  groundable: [
    // Each field maps to exactly ONE canonical BenchmarkArtifact source — no fallback branching
    // here (§21); if a source needs a fallback, that's connector-layer work, not DIC work, and
    // is NOT part of this WO's scope.
    { key: "mortgage_rate_weekly", label: "30-yr FRM rate",      sourceId: "FRED",   seriesId: "MORTGAGE30US" },
    { key: "price_to_rent_ratio",  label: "Home value / rent",   sourceId: "ZILLOW", seriesId: "ZHVI_ZORI" },
    { key: "property_tax_rate",    label: "Avg county tax rate", sourceId: "CENSUS", seriesId: "PTRATIO" },
  ],
  optional: [
    { key: "percent_down_payment", label: "Down-payment %", units: "pct" },
    { key: "hoa_monthly",          label: "HOA fee",         units: "USD" },
  ],
  derived: [
    // formulaId MUST resolve through src/engine/formulaRegistry.js (new — see File Map). A DIC
    // referencing a formulaId that isn't in the registry is a build-time lint failure, not a
    // runtime surprise — resolves to WITHHELD/FORMULA_UNAVAILABLE at worst, never a crash.
    { key: "loan_principal",      label: "Loan size",    formulaId: "FIN.LOAN_PRINCIPAL@1" },
    { key: "monthly_mortgage_pmt", label: "Monthly Mortgage P&I", units: "USD/month", formulaId: "FIN.PMT_30YR@1" },
  ],
};

// src/engine/formulaRegistry.js — NEW. Deterministic only, no heuristics, no learned models.
//
// AUTHORITY BOUNDARY (hard rule, not a suggestion): no governed calculation may execute outside
// FormulaRegistry.execute(). Same discipline metricsengine.js already enforces for metrics
// ("computed ONLY in metricsengine.js") — this is that same pattern for formulas.
//
// Every result is WITHHELD-shaped, never a thrown exception reaching the perception layer —
// FORMULA_UNAVAILABLE / INVALID_INPUT / CONSTRAINT_FAILED are evaluation OUTCOMES, not crashes.
// The registry reports what happened; it does not decide what the absence means (§22 — that
// stays the caller's/classifier's job).
//
// ID format: NAMESPACE.KEY@1 — the "@1" is a fixed label, not a real versioning capability.
// There is no version negotiation, resolution, or migration in M0 (see Deferred Register below);
// it exists so the string shape never has to change on the day real versioning does get built.
// A formula's math is immutable once shipped by convention: a real change gets a new key
// (@2, a new NAMESPACE.KEY), never an edit to this one.
const FORMULA_EVALUATORS = {
  'FIN.LOAN_PRINCIPAL@1': ({ purchase_price_offer, percent_down_payment }) =>
    purchase_price_offer * (1 - (percent_down_payment ?? 0) / 100),
  'FIN.PMT_30YR@1': ({ loan_principal, mortgage_rate_weekly }) => {
    const r = mortgage_rate_weekly / 100 / 12, n = 360;
    return loan_principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  },
  // additional formulas added here only — never inline in a DIC file, never overwriting an
  // existing key.
};

function execute(formulaId, inputs) {
  const fn = FORMULA_EVALUATORS[formulaId];
  if (!fn) return { status: 'WITHHELD', reason: 'FORMULA_UNAVAILABLE', formulaId };
  try {
    const value = fn(inputs);
    if (!Number.isFinite(value)) return { status: 'WITHHELD', reason: 'INVALID_INPUT', formulaId };
    return { status: 'SUCCESS', value, formulaId };
  } catch {
    return { status: 'WITHHELD', reason: 'CONSTRAINT_FAILED', formulaId };
  }
}

export const FormulaRegistry = { execute };
```

```
// synthesizeQuery(session) — querysynthesis.js. New branch, checked first, same pattern as
// parseDiffCommand(). This is a ROUTING boundary only — resolve the DIC, attach it, done. No
// evidence retrieval, no formula execution here; those happen downstream in the Evidence Layer /
// Renderer. Non-homePurchase queries fall through unchanged.
const dic = resolveDecisionInputContract(session.query); // new, small: keyword/decisionType match
if (dic) {
  const missingRequired = dic.required.filter(f => !(f.key in session.tensor?.fields ?? {}));
  return {
    ...existing session/domain shape,
    decisionInputContract: dic,
    missingRequiredInputs: missingRequired,
    mode: missingRequired.length > 0 ? 'INSUFFICIENT_INPUT' : undefined, // else falls through
    // INSUFFICIENT_INPUT is an INTAKE state, set here at the routing boundary. It is never
    // treated as STRUCTURAL_ABSENCE — the existing absence classifier (whytraceresolver.js)
    // remains sole authority over that classification, downstream and unchanged by this WO.
  };
}
```

```
// Evidence Layer (new, downstream of synthesizeQuery — NOT inside it). Runs only when
// missingRequiredInputs is empty. Owns evidence retrieval and formula execution; synthesizeQuery
// never touches either.
function resolveHomePurchaseEvidence(dic, fields) {
  const grounded = dic.groundable.map(f => resolveEvidenceTier({
    observed: null, // no tenant-observed value for a first-pass personal query
    benchmarkEnvelope: admitBenchmark({ ...fetch real series for f.sourceId/f.seriesId... }),
    modeled: null,
  }));
  const derived = dic.derived
    .filter(f => /* every operand present in grounded + fields */)
    .map(f => ({ ...f, ...FormulaRegistry.execute(f.formulaId, allInputs) }));
  const missingOptionalOrGroundable = [...dic.optional, ...dic.groundable].filter(f => !isResolved(f));
  return {
    mode: grounded.some(g => g.chosen !== 'modeled') || derived.some(d => d.status === 'SUCCESS')
      ? 'PARTIAL_SATISFIED' : 'INSUFFICIENT_INPUT',
    grounded, derived, missingOptionalOrGroundable,
  };
}
```

## 7. File Map

```
NEW      src/intake/contracts/homePurchaseDIC.js   — declarative object, lint-enforced shape only
NEW      src/engine/formulaRegistry.js             — deterministic formulas (was assumed to
                                                        exist; confirmed it does not)
NEW      src/engine/matchDecisionInputContract.js  — small: query text/decisionType → DIC or null
MODIFIED src/engine/querysynthesis.js              — new branch in synthesizeQuery(), checked
                                                        first, same additive pattern as
                                                        parseDiffCommand()
NEW      src/renderers/partialAnswerTemplates.js   — passive renderer: Observed Evidence /
                                                        Deterministic Derivations / Missing
                                                        Inputs / doctrine footer. Renders only,
                                                        never retrieves or calculates.
UNCHANGED src/engine/benchmarkartifact.js          — reused exactly as built, zero changes
UNCHANGED src/engine/whytraceresolver.js           — remains sole authority on STRUCTURAL_ABSENCE
```

No TBDs. Both dependencies the design assumed pre-existing (formula registry, intake validator)
are now explicitly listed as NEW, not referenced as if already there.

## Deferred Register (explicitly excluded from this WO, not forgotten)

| Capability | Trigger to revisit |
|---|---|
| Real formula versioning (negotiation, resolution, migration) | First actual second version of a real formula |
| Replay/reproducibility tooling | A concrete historical-replay requirement shows up |
| JSON-authored formula definitions (non-engineer authoring) | External/non-engineer formula authorship becomes a real need |
| Separate evaluator modules per formula | Formula count grows enough to justify the split |
| Fallback-source logic per groundable field | A specific source proves unreliable enough in practice |
| Career/Retirement DICs | This Real Estate pilot proves the pattern first |

## 8. Guardrails (carried forward from the design conversation, all confirmed doctrine-compliant)

- **§22 Absence-is-Signal** — `INSUFFICIENT_INPUT` (intake) and `STRUCTURAL_ABSENCE` (evidence)
  stay two distinct states. The DIC reports missing fields; only the existing classifier assigns
  absence status.
- **§18 Multiplicative-only** — no new confidence pathway. If a DIC-sourced value ever feeds a
  composite score, it goes through the existing multiplicative composition, nothing new.
- **§11a Detect-not-Predict** — the middle-state template states observed benchmarks and
  deterministic algebra only. No projection language, no "you should."
- **§21 Route-don't-Aggregate** — each groundable field is its own BenchmarkArtifact, rendered
  independently. No pre-blending FRED + Zillow into one number.
- **Declarative-only invariant** — a DIC file may export a plain object matching the schema only.
  No functions, no retrieval calls, no embedded formulas, no rendering instructions. CI lint
  check enforces this, not code review alone.
- **Single-source-per-field invariant** — one groundable field maps to exactly one canonical
  BenchmarkArtifact. Fallback-source logic, if ever needed, lives in the connector layer — not
  designed or built in this WO.

## 9. Bottle Test

1. Reduces ambiguity? YES — "refine your query" becomes a real partial answer wherever any real
   evidence exists.
2. Single dominant output? YES — one `PARTIAL_SATISFIED` response shape.
3. All boundaries defined? YES — both previously-assumed dependencies are now real, listed
   File Map items, not references to nonexistent modules.
4. No undefined dependencies? YES, now — `formulaRegistry.js` and the `synthesizeQuery()` hook
   point are both explicit, buildable items, not assumptions.
5. Does not increase expressive flexibility in core? YES — the declarative-only + lint-enforced
   invariant is the guard against this DIC becoming a second reasoning layer over time.

## Open items needing your call, not more research

- **Data licensing, unverified from code alone**: confirm ZHVI/ZORI are the free, published
  Zillow *research* datasets (not the paid, rate-limited Zillow *listing* API) before this goes
  live — that distinction determines whether this pilot has a real, free data source or a cost
  center. I can't verify licensing terms from the repo; this needs a human check.
- **Scope confirmation**: Real Estate only, Career/Retirement DICs deferred until this pilot
  proves out — matches your own instinct from the research doc.

## Definition of Done (grep-confirmable)

- `formulaRegistry.js` exists with `loanPrincipal`/`pmt30yr`, both pure functions, no side effects.
- `homePurchaseDIC.js` exports a plain object only — no `function`/`=>` anywhere in the file
  except inside the object's own field values (there are none).
- A real estate query with ZIP + rent + price but no down-payment returns `PARTIAL_SATISFIED`
  with real FRED/Census values and an explicit `missingOptionalOrGroundable` list — not
  "REFINE YOUR QUERY."
- Existing corporate/institutional query paths (any non-`homePurchase` query) produce byte-for-byte
  identical output before and after — regression-tested, same discipline as every other WO this
  session.
