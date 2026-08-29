# Track #1 — Perceptual Viewport Lens Audit (`L_V`)

**Status:** DRAFT — findings for Founder ratification
**Version:** 0.1
**Parent:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 §3.1, §19, AC-10
**Method:** read-only code archaeology, 2026-08-29. No code changed.
**Deliverable:** the `δ : L_V → {preserve, replace, retire, relocate}` disposition
matrix + the behavioural table §19 requires, so the floating menu can be replaced
without silently discarding behaviour.

---

## 1. State & writer

```
L_V value:  src/context/PrismContext.jsx  →  state.activeLens   (default 'NAV_SURFACE')
sole writer: src/components/surface/floatingtoolbar.jsx  →  dispatch({type:'SET_LENS', payload})
reducer:    PrismContext.jsx:29  case 'SET_LENS' → { ...state, activeLens: payload }
```

`SET_LENS` has a `[TEMP-DEBUG]` `console.log` (PrismContext.jsx:30) and the
floating toolbar has one too (floatingtoolbar.jsx:46) — remove both when this
track executes.

```
L_V = { NAV_SURFACE, OBSERVE, SIGNAL, FLOW, PRESSURE, CONVERGENCE, DRIFT, OPPORTUNITY }
```

The floating toolbar renders **7 buttons** (`LENSES` array): OBSERVE, SIGNAL,
FLOW, PRESSURE, CONVERGENCE, DRIFT, OPPORTUNITY. `NAV_SURFACE` is the
no-selection default — it has **no button**.

---

## 2. Real consumers — 3, not "≈9"

The frozen spec's "≈9 readers" was an over-count. Actual readers of PrismContext
`state.activeLens`:

| file | reads | role |
|---|---|---|
| `src/app.jsx` (`viewportLens`, :699) | `activeLens` | couples `activeLens` → `surfaceActivated`; threads `viewportLens` into the ConeMap chain (:1351) |
| `src/components/analysis/analysisfield.jsx` (:62) | `activeLens` | the report/embed switch — one branch per value |
| `src/components/spine/conemap.jsx` (prop, :2311) | `viewportLens` prop from app.jsx | Home-screen HUD chrome gating |

**Not `L_V` consumers** (they use PrismContext, but a different slice, or a
different `activeLens`):

- `oracleview.jsx`, `tenk/TenKView.jsx` — read `state.activeRefraction` /
  `activeCategory` (the WO-294 refraction pipeline), **not** `activeLens`.
- `analysisidlefield.jsx`, `ingestionbuilder.jsx`, `searchprofile.jsx`,
  `engine/completionchips.js` — their `activeLens` is the **role lens**
  (`activeSituation?.lens`, `LENS_PRESETS[...]`), family `L_R`, unrelated.
- `campaignfunnel.jsx` — comment only ("display-only").
- `main.jsx` — mounts `PrismProvider`.

---

## 3. The load-bearing coupling

`app.jsx` (:721-723):

```js
if (viewportLens !== 'OBSERVE' && viewportLens !== 'NAV_SURFACE') setSurfaceActivated(true);
else if (viewportLens === 'OBSERVE') setSurfaceActivated(false);
```

`surfaceActivated` mounts `AnalysisField` and swaps FloatingToolbar / visor state.
So the real behaviour is a **binary**: "a report lens is chosen" vs. "plain field."
The specific lens string only selects *which* report `AnalysisField` renders.

- `OBSERVE` doubles as the explicit **"return to Home / exit report"** action
  (Founder directive 2026-08-19) — the only thing besides a full `krylo-reset`
  that sets `surfaceActivated` back to `false`.
- `NAV_SURFACE` never activates (safe landing default).

---

## 4. Per-value behaviour (the §19 matrix)

| value | `surfaceActivated` | AnalysisField render | ConeMap / 3D effect | δ |
|---|---|---|---|---|
| **NAV_SURFACE** | stays false | — (AnalysisField not mounted) | per-cone floating text HUD (conemap:263); `ThresholdBands` (:2104, also gated `!surfaceActivated`); flow overlay (:2186) | **preserve** — as the no-selection base state, not a button |
| **OBSERVE** | set **false** | — | per-cone HUD (:263); relationship-label overlay (:2221, `OBSERVE`-only) | **relocate** — its "exit report, show plain field" function must survive as an explicit control |
| **SIGNAL** | true | SIGNAL report: per-domain band HIGH/MOD/LOW from `getDomainSignals(d)` (field pool) + Flourish heatmap embed (`LENS_EMBEDS.SIGNAL`) | none | **replace** — this is per-domain signal; becomes the domain tab `signalIntensity` (once subject-scoped `A` exists) |
| **FLOW** | true | FLOW report: `computeDomainFlow([])` — **honestly empty**, no edge source exists + Flourish chord embed | none | **retire** — inter-domain flow belongs to the Structure layer, not a domain tab; report renders nothing today |
| **PRESSURE** | true | PRESSURE report: `Pressure₀` derived from `confidence` (T is PARTIAL) + Flourish radar embed | none | **replace** — maps to a domain-tab structural dimension, pending `I_d` |
| **CONVERGENCE** | true | CONVERGENCE report: per-domain convergence state, report-layer hysteresis buffer (k=3), §6 color tokens + Flourish bands embed + caption | none | **relocate** — convergence is cross-domain (perceived MA vs observed); belongs to Structure / Formation |
| **DRIFT** | true | DRIFT report: structure-vs-narrative slope, persistence π + Flourish embed | `useDriftDivergence(coneState, true)` → `divergenceByDomain` → `drift` prop to each `Cone` (**appears vestigial — `Cone` does not render `drift`**) | **relocate** — structure-vs-narrative drift is a Formation concern; delete the vestigial cone wire |
| **OPPORTUNITY** | true | full live prospectus (`buildLiveProspectus`); **no** Flourish embed (`LENS_EMBEDS.OPPORTUNITY = null`); this is the template report (`REPORT_LENSES`, KRYL-1118A) | none | **retire as a lens + salvage logic** — "opportunity" is not a domain; the prospectus assembly may feed the Target Packet |

### Shared machinery

`analysisfield.jsx` `opp` memo (`REPORT_LENSES` gate): builds `domainStats` +
`fieldAvg` by looping `CANONICAL_DOMAINS` and reading `getDomainSignals(d)` from
the pool. **This is the closest existing thing to `A(d, Field, ·)`** — a
field-scoped per-domain aggregate every report lens reuses. It is **not**
subject-scoped and must not be presented as such (frozen spec §12).

---

## 5. Defects found (fix during execution, do not inherit)

1. **`OPPORTUNITY → OWNERSHIP` label swap** — `floatingtoolbar.jsx:21`
   `LABELS = { OPPORTUNITY: 'OWNERSHIP' }`. Display says OWNERSHIP; every
   `viewportLens === 'OPPORTUNITY'` check and `LENS_EMBEDS.OPPORTUNITY` still say
   OPPORTUNITY. This is **not** a legal `L_V → 𝒟` conversion (frozen spec §3.1) —
   it is a half-rename. Kill it; do not treat the OWNERSHIP label as evidence the
   redesign is underway.
2. **Two `[TEMP-DEBUG]` `console.log`s** on the lens path (PrismContext.jsx:30,
   floatingtoolbar.jsx:46).
3. **DRIFT cone wire is vestigial** — `divergenceByDomain` computed and passed as
   `drift` to `Cone`, which never reads it. Either wire it or cut it.
4. **"6 buttons inert on Structure"** — `floatingtoolbar.jsx:37-39`: on the
   Structure page the non-OBSERVE buttons are visible but do nothing. Already a
   known partial state.

---

## 6. δ disposition summary

```
NAV_SURFACE   preserve   base "no domain selected" state (keep, not a button)
OBSERVE       relocate   → an explicit "clear selection / plain field" control
SIGNAL        replace    → domain-tab signalIntensity  (needs subject-scoped A)
PRESSURE      replace    → domain-tab structural dimension  (needs I_d + A)
FLOW          retire     → Structure layer (inter-domain), not a domain tab
CONVERGENCE   relocate   → Structure / Formation (cross-domain)
DRIFT         relocate   → Formation (structure-vs-narrative); cut vestigial cone wire
OPPORTUNITY   retire+salvage   not a domain; label defect dies; prospectus logic may feed the Packet
```

**Net:** the seven buttons collapse to **zero perceptual-lens buttons**. What the
floating control exposes next (six domains, or nothing until the substrate exists)
is an integration decision gated behind Tracks #2/#3 per frozen spec §21 — this
audit does not authorize the swap, it removes the blocker on it.

---

## 7. What each δ needs before execution

| δ action | precondition |
|---|---|
| replace SIGNAL / PRESSURE | subject-scoped `A(d, Subject, ·)` (the subject-scoping design note) + at least one ratified `I_d` |
| relocate CONVERGENCE / DRIFT | the Structure / Formation layer target exists to relocate into |
| relocate OBSERVE | the "clear selection" control has a home in the new substrate UI |
| retire FLOW | confirm no consumer depends on the (empty) FLOW report surface |
| retire+salvage OPPORTUNITY | decide whether `buildLiveProspectus` feeds the Target Packet or is dropped |
| preserve NAV_SURFACE | none — it stays as the default |
| kill label defect + debug logs + vestigial wire | none — safe now, but bundle into the execution ticket, not a drive-by |

---

## 8. Relationship to the frozen architecture

- Satisfies §19 (behavioural matrix) and produces `δ` (§3.1, AC-10).
- Does **not** touch `floatingtoolbar.jsx` or any consumer — audit only.
- The `L_V` removal ticket is still gated behind `{T1, T2, T3} ≺ integration`
  (§21). This audit is T1's output; it unblocks, it does not execute.
