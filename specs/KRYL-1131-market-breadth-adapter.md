# KRYL-1131 — Market Breadth Adapter

**Status:** SPEC HARDENED — BLOCKED on one open question (see §8)
**Filed:** Jira KRYL-1131, created via direct API 2026-08-01
**Origin:** backlog discussion — "Capitulative Breadth Indicator" reframed away from a buy/sell
signal, mapped onto an existing KRYLO primitive instead of a new one.

---

## 1. Single Responsibility

**Job:** Transform market participation data (advance/decline ratios, % of constituents above a
moving average, breadth momentum) into the `{D, V, A, T}` vector shape already consumed by
`classifyConvergenceState()` (`src/engine/convergenceclassifier.js`).

**Output:** One `{D, V, A, T}` vector per evaluation window. Nothing else.

This is **not a new classifier**. `convergenceclassifier.js` already exists, is already wired to
the hysteresis buffer, and already defines `HIGH_CONVERGENCE` as `D≥0.75 && A≥0.75 && T≥0.6 &&
V≤0.6` — structurally the same shape as a collective-exhaustion / capitulation-style event
(many independent constituents converging into the same state, sustained, without chaotic
volatility). The gap is a data adapter, not a missing capability.

---

## 2. Boundary Declaration

**Input contract:** raw market participation data — source is the open question, see §8.

**Output contract:** `{ D: number, V: number, A: number, T: number }`, each in `[0,1]`, dispatched
through the normal signal pipeline (§16 shared pool pattern — normalize, then `dispatchBatch()`
via `surfacerouter.js`; never wired direct-to-consumer).

**Explicit exclusions:**
- Does NOT classify convergence state itself — that stays `classifyConvergenceState()`'s job
- Does NOT decide BUY/SELL/BOTTOM/RECOVERY — those are claims beyond what a formation detects
- Does NOT persist state or handle hysteresis — the existing buffer in
  `convergenceclassifier.js` already owns that
- Does NOT introduce a second D/V/A/T definition — reuses the existing one exactly, no
  reinterpretation of what D/V/A/T mean

---

## 3. Zero Drift Confirmation

- [x] Detection layer touched → inference does NOT redefine signal schema. **Confirmed**: the
      `{D,V,A,T}` shape is unchanged from what `classifyConvergenceState()` already expects.
- [x] Scoring layer touched → output is NOT a recommendation. **Confirmed**: no BUY/SELL/BOTTOM
      language anywhere in the output contract (§2), enforced explicitly at the boundary.

**Drift notes:** The single largest risk is downstream language drift — a future consumer
labeling a `HIGH_CONVERGENCE` reading from this adapter as "capitulation bottom" in UI copy. The
existing state labels (`INSUFFICIENT SIGNAL`, `LOW SIGNAL YIELD`, `BUILDING CONVERGENCE`,
`TURBULENT CONVERGENCE`, `HIGH CONVERGENCE`) must not be renamed or re-flavored per-domain — one
label set, no market-specific vocabulary substituted in.

---

## 4. Strategic Leverage Statement

Detects when a broad set of independent market participants (not a single index or ETF) enter a
synchronized, sustained negative state — a structural fact about collective behavior, not a
forecast of what happens next. Ties directly to §22 Absence-Is-Signal: the interesting part of
this pattern isn't only what's declining together, it's the disappearance of the normal
dispersion (sector rotation, differentiated buyers) that exists in ordinary down markets.

---

## 5. Output Gravity

**"The single thing this WO produces that matters most is a `{D,V,A,T}` vector that the existing
classifier can read without any change to its own code."**

If this ever requires modifying `classifyConvergenceState()` itself, that's a sign the adapter is
solving the wrong problem — the classifier's contract is frozen here, only its input source
grows.

---

## 6. Formula / Contract

```
D (Density)   — fraction of tracked entities exhibiting the same directional state, this window
V (Volatility)— dispersion/noise in the move itself (not direction, magnitude variance)
A (Alignment) — degree to which independently tracked groups show the same signal rather than
                isolated movement
T (Temporal)  — persistence: how many consecutive windows has this state held
```

"Tracked entities" is deliberately source-neutral — the adapter defines what counts as an entity
(true breadth: index constituents; proxy: sector ETF representatives). Same primitive, different
evidence strength — see §8.

> `expected` sourcing for what counts as "constituents" and "windows": **TBD — see §8. Do not
> invent a data source to unblock this.**

---

## 7. File Map

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/connectors/marketbreadthconnector.js` (NEW, name pending) | Computes `{D,V,A,T}` from breadth source, dispatches via `surfacerouter.js` | — |
| `src/engine/convergenceclassifier.js` | — | Zero changes. Contract frozen (§2). |
| `src/engine/connectors/financialmarketconnector.js` (WO-1859) | — (see §8 Option B if reused) | Existing single-ticker variance logic unchanged |

---

## 8. What KRYL-1131 does NOT resolve — THE BUILD GATE

**Where does the breadth data come from?** Two named options, neither chosen here:

**Option A — Real breadth data (new external source)**
True advance/decline and %-above-moving-average data (e.g., NYSE/NASDAQ breadth feeds). Accurate,
matches what the "Capitulative Breadth Indicator" research actually describes.
*Cost:* a new external dependency — provider, API key, cost, rate limits — needs Founder
decision, same class of open question as prior data-source gates this session.

**Option B — Cross-domain ETF dispersion proxy (reuse WO-1859)**
Derive an approximate breadth signal from the 6 sector ETFs WO-1859 already tracks (XLK, XLF,
QQQ, XLP, XLC, XLRE) — measuring whether they're moving together vs. diverging, as a rough stand-in
for true constituent-level breadth.
*Cost:* zero new dependencies, buildable now — but it is a weaker, approximate signal (6 sector
proxies, not thousands of constituents) and **must be labeled as such** wherever it surfaces, never
presented as true market breadth.

**Bottle Test:**

| Question | Answer |
|---|---|
| Does this reduce ambiguity? | YES — once §8 resolves |
| Single dominant output? | YES — one `{D,V,A,T}` vector |
| All boundaries defined? | YES except input source |
| Built without an undefined dependency? | **NO** — breadth source undefined |
| Avoids increasing expressive flexibility in the core? | YES — feeds an existing classifier, adds no new state machine |

**Build gate: BLOCKED** until Option A or B (or a Founder-proposed third option) is chosen.

---

## 9. Definition of Done

- New adapter file exports a function producing exactly `{D,V,A,T}`, each in `[0,1]`
- Zero modifications to `convergenceclassifier.js`'s exported functions or state logic
- Dispatch goes through `surfacerouter.js`, no direct import of the classifier by the adapter
- If Option B chosen: UI/consumer-facing labeling explicitly marks the signal as an approximate
  proxy, not true breadth (grep confirms no unqualified "market breadth" string in UI copy)
- No BUY/SELL/BOTTOM/RECOVERY string anywhere in the adapter or its output schema

---

## NOTES

This is a "fill the gap" spec, not a "new idea" spec — the classification math already exists
(`classifyConvergenceState`, live in production) and is a strong structural match for this pattern.
The only real work is a data adapter, and the only real open question is which data source funds
it.
