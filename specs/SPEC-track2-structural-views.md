# Track #2 — Residual Structural Views: Disposition Analysis

**Status:** 3 of 5 dispositioned (Founder, 2026-08-29). SIGNAL / FLOW / CONVERGENCE
ruled; **PRESSURE and DRIFT open — need a Founder definition** (§8). No implementation
authorized (`{T1, T2, T3} ≺ integration`).
**Version:** 0.2
**Parent:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 §14 (`02 STRUCTURE`) · `SPEC-track1-viewport-lens-audit.md`
**Method:** read-only code analysis, 2026-08-29. No code changed.

> **Track #2 reframed (Founder, 2026-08-29):** the live question is *"which residual
> structural views (SIGNAL / FLOW / PRESSURE / CONVERGENCE / DRIFT) are legitimate
> cross-domain projections, and what are their boundaries?"* Role (`L_R`) stays a
> constrained follow-on: `role ∉ A`, `role ∉ I_d`. It is not the Track #2 core.

---

## 0. The six questions (from the Founder reframe)

1. Legitimate **cross-domain projection** over the six domain observation sets?
2. Exact input consumed? (Must be the six observation sets, not a private vocabulary.)
3. Output contract?
4. Boundary vs the domain axes — distinct structural attribution, no competition with CAPITAL…MEDIA?
5. Subject-invariant? (Subject can change; the view definition cannot.)
6. Disposition: **retain as `02 STRUCTURE` operator** / demote to internal operator / retire.

**Legitimacy test (Founder):** pure projection over domain observations · invents no
new substrate · not a competing coordinate-axis set · same subject/field as the domains.

---

## 1. Shared context

- OBSERVE is isolated as the single load-bearing residual (`activeLens === 'OBSERVE'
  ↔ surfaceActivated`, T1). NAV_SURFACE and OPPORTUNITY are retired (T1).
- **All five candidates today read field-scoped data** — `getDomainSignals(d)` over
  the passive `_pool` (`domaingravity.js:160`), per `CANONICAL_DOMAINS`. None is
  subject-scoped. A subject-scoped version needs `A(d, Subject)`, which does not
  exist (`SPEC-subject-scoping-contract.md`).
- Frozen spec §14 already names the layer these would live in: **`02 STRUCTURE` —
  "what relationships exist among those observations"** — between the six
  observation sets and Formation `F`. Nothing new is added by retaining any of
  them there.

---

## 2. SIGNAL

| Q | finding |
|---|---|
| 1 cross-domain projection? | **No — per-domain readout.** `analysisfield.jsx:1021` maps `CANONICAL_DOMAINS` → mean confidence from `getDomainSignals(d)` → band HIGH/MOD/LOW. It displays the six domains side by side; it does not project a pattern *across* them. |
| 2 input | `getDomainSignals(d)` per domain (`_pool`, field-scoped). |
| 3 output | per-domain magnitude band + field average. A readout, not a relationship. |
| 4 boundary | **Fails the competition test.** Each `I_d` already produces `signalIntensity` (frozen §5, §6). "SIGNAL" is those six values shown together — it *is* the domain substrate's own output, gridded. |
| 5 subject-invariant? | yes (definition survives a subject change) |

**Recommendation: RETIRE as a distinct view.** "Show all six `signalIntensity` at
once" is a rendering choice of the substrate — the `CURRENT FIELD SIGNAL` hint
(integration contract D3), not a structural view. Consistent with T1 δ
(`replace → domain-tab signalIntensity`).

---

## 3. FLOW

| Q | finding |
|---|---|
| 1 cross-domain projection? | **Yes, by construction.** Directional movement between domain *pairs*. |
| 2 input | `computeDomainFlow(edges)` (`domainflow.js:23`) — `edges = [{sourceDomain, targetDomain, weight}]`, **real** cross-domain relationship edges (causal / co-occurrence). §22-honest: no edges → empty. **`analysisfield.jsx:1294` passes `[]` — no edge source is wired.** |
| 3 output | directional `{source, target, count}` domain→domain rows. |
| 4 boundary | distinct from any single domain. Distinct from **CAPITAL.Flow** (§4.2, ratified): CAPITAL.Flow = capital moving between economic *actors* within the capital axis; FLOW-the-view = relationship/movement between the six *domain axes*. Different objects — state this in both specs. |
| 5 subject-invariant? | yes |

**Recommendation: RETAIN as an `02 STRUCTURE` operator, INERT.** The projection is
legitimate and has a defined input contract; it has **zero input today**. Mark
`UNAUTHORED / no edge source` — do not retire the concept. (Softens T1 δ `retire`.)
Its input is the STRUCTURE-layer relationship substrate, which does not exist yet.

---

## 4. PRESSURE

| Q | finding |
|---|---|
| 1 cross-domain projection? | **Partly — per-domain readout.** `analysisfield.jsx:1134` maps `CANONICAL_DOMAINS` → `computeVesselPressure` from `getDomainSignals(d)` confidence → band CONSTRAINED/ELEVATED/ACCUMULATING. Per-domain, like SIGNAL, plus a field gauge (average). |
| 2 input | `getDomainSignals(d)` confidence, per domain. `Pressure₀`: confidence stands in for **both** magnitude and velocity — "T is PARTIAL, not independently observed"; model confidence never reaches HIGH. |
| 3 output | per-domain pressure band + field-average gauge. |
| 4 boundary | **Risk.** CAPITAL has `Financing Pressure` as a ratified dimension (§4.5). If PRESSURE-the-view reads "pressure" per domain and each `I_d` carries its own pressure-like dimension, PRESSURE double-counts (§18) or aggregates before routing (§17 violation). Legitimacy hinges on whether "constraint vs available capacity" is a **distinct latent variable**, uniformly computed, or just the six domains' pressure dimensions re-displayed. |
| 5 subject-invariant? | yes |

**Recommendation: DISPOSITION REQUIRES A FOUNDER DEFINITION.**
- **(a)** Define PRESSURE as a distinct uniform projection — an observed-activity /
  capacity-ceiling ratio computed the same way for all six, with its own latent
  variable → **retain as `02 STRUCTURE`**.
- **(b)** It is per-domain pressure re-displayed → belongs *in* the domain tabs
  (like SIGNAL) → **retire as a separate view**.
The current impl (`Pressure₀` from a single confidence number, T PARTIAL) is not a
real distinct projection. T1 δ said `replace → domain-tab structural dimension`.

---

## 5. CONVERGENCE

| Q | finding |
|---|---|
| 1 cross-domain projection? | **Yes — genuinely.** "Alignment / conflict among independent forces." `classifyConvergenceState({D,V,A,T}, conf)` (`convergenceclassifier.js:14`) — D=divergence, A=alignment: inherently about signals/domains relating. |
| 2 input | a `{D,V,A,T}` vector built from domain stats + a report-layer hysteresis buffer (k=3). Heuristic. |
| 3 output | classified state — INSUFFICIENT SIGNAL / LOW SIGNAL YIELD / BUILDING / TURBULENT / HIGH — + §6 colour/motion tokens. "Heuristic only. No predictive claims. stateType always PROJECTION." |
| 4 boundary | **Clean.** No single domain owns convergence; it is relationship/alignment *among* domains. This is `02 STRUCTURE`'s defining job. |
| 5 subject-invariant? | yes ("do the subject's domain signals align or conflict") |

**Recommendation: RETAIN as the flagship `02 STRUCTURE` operator.**
Caveat: the classifier thresholds (`D≥0.75 ∧ A≥0.75 ∧ T≥0.6 ∧ V≤0.6 → HIGH`) are
**UNCALIBRATED** — arbitrary-looking, no cited basis. Per *defined → measurable →
calibrated → eligible for guest semantics*, the view renders but its state labels
are not guest-eligible until the thresholds carry a documented basis. T1 δ
`relocate → Structure/Formation` — consistent: it **is** Structure.

---

## 6. DRIFT

| Q | finding |
|---|---|
| 1 cross-domain projection? | **Yes — relational.** Structure vs narrative (evidence vs representation) — the comparison is inherently a relationship. |
| 2 input | per-domain structure-vs-narrative slope + temporal persistence π (report-layer refs). Also a **vestigial** `drift` prop passed to `Cone` that `Cone` never reads (T1). |
| 3 output | per-domain drift classification (INSUFFICIENT OBSERVATION / STRUCTURE ONLY / …) + Flourish embed. |
| 4 boundary | **Overlap risk with MEDIA.** DRIFT compares structural signal to *narrative*; the MEDIA domain observes "information / narrative movement." Legitimacy depends on the framing: (a) "MEDIA narrative vs the other five domains' structure" = a clean cross-domain projection; (b) "per-domain structure vs that domain's own narrative" needs a narrative signal per domain that may not exist. Connects to Predictive Narrative Deformation / `gravityCoefficient`. |
| 5 subject-invariant? | yes |

**Recommendation: RETAIN as an `02 STRUCTURE` operator, PENDING a Founder definition
of its input** (per-domain narrative source; MEDIA-vs-rest framing). Observation-
limited today. Cut the vestigial `Cone` wire when actioned. T1 δ
`relocate → Formation` — refined here to `02 STRUCTURE`.

---

## 7. Summary

| view | cross-domain by nature? | has real input today? | boundary vs domains | recommendation |
|---|---|---|---|---|
| SIGNAL | no (per-domain readout) | yes (field) | competes — it *is* the substrate output | **RETIRE** as a view; it's the D3 hint |
| FLOW | yes | **no** (edge source unwired) | distinct (domain↔domain) | **RETAIN, inert** — `02 STRUCTURE`, no input |
| PRESSURE | partly (per-domain) | yes (field, weak: `Pressure₀`) | **risk** — may double-count CAPITAL etc. | **FOUNDER DEFINITION** — distinct projection or retire |
| CONVERGENCE | yes | yes (field, heuristic) | clean | **RETAIN** — flagship `02 STRUCTURE`; thresholds UNCALIBRATED |
| DRIFT | yes | partial | **risk** — overlaps MEDIA | **RETAIN, pending input definition** — `02 STRUCTURE` |

### Cross-cutting

- **Subject scope:** all five are field-scoped today. Subject-scoped versions need
  `A(d, Subject)` — the subject-scoping contract, still undefined. Until then any
  retained view operates on the field only, and decision-frame subjects get
  classified absence.
- **`02 STRUCTURE` is the home** for whatever is retained (frozen §14) — populating
  a named layer, not adding one. The freeze holds.
- **Calibration:** CONVERGENCE thresholds uncalibrated; FLOW no input; DRIFT input
  undefined; PRESSURE not yet a real projection. None is guest-eligible today.
- **Route-Don't-Aggregate (§17):** any retained view must project over atomic
  domain observations, never aggregate the six domains' own dimensions into a
  composite. PRESSURE is the one at risk.
- **Role (`L_R`)** — still needs its own thin ruling (retain / demote / remove the
  four CFO/CEO/INVESTOR/REALTOR briefs + Role-Play Protocol §13). Not blocking;
  `role ∉ A`, `role ∉ I_d` already locked.

---

## 8. Founder dispositions (2026-08-29)

| view | disposition | note |
|---|---|---|
| **SIGNAL** | **RETIRE** — RULED | the domain substrate already carries `signalIntensity`; no second SIGNAL layer. Becomes the `CURRENT FIELD SIGNAL` hint (integration contract D3). |
| **FLOW** | **RETAIN INERT** — RULED | concept valid (`02 STRUCTURE` operator); KRYLO has no directed-edge evidence today and does not fabricate it. Renders nothing until a relationship-edge substrate exists. |
| **CONVERGENCE** | **RETAIN** — RULED | survives as a cross-domain `02 STRUCTURE` projection. Thresholds UNCALIBRATED → a later evidence/calibration issue, **not permission to invent certainty**. |
| **PRESSURE** | **OPEN — needs Founder definition** | see §8.1 |
| **DRIFT** | **OPEN — near-locked framing, input contract pending** | see §8.2 |
| Role (`L_R`) | thin follow-on ruling, when convenient | `role ∉ A`, `role ∉ I_d` locked; §13 amendment if the CFO/CEO briefs are removed/altered |

### 8.1 PRESSURE — the open question

> Is PRESSURE a **genuine cross-domain structural measure** — calculated from the
> relationship between **accumulated activity and available capacity** — or is it
> just another way of displaying pressure already observed by individual domains?

- If a distinct latent variable (activity ÷ capacity ceiling, computed uniformly
  across all six) → **RETAIN** as `02 STRUCTURE`. Founder to define the capacity
  term and the uniform computation.
- If per-domain pressure re-displayed → **RETIRE**; it duplicates e.g.
  `CAPITAL.financingPressure` (§17 Route-Don't-Aggregate, §18).

The Founder will protect the former **if it can be properly defined**. The current
impl (`Pressure₀` from a single confidence number, T PARTIAL) does not qualify.

### 8.2 DRIFT — near-locked framing

Locked architectural distinction (Founder):

> **MEDIA** observes the information / narrative substrate.
> **DRIFT** compares that substrate against the **observed structural evidence**.
> DRIFT is *not* a second MEDIA primitive.

```
observed structural evidence   ↔   available narrative representation
        (from the other domains)         (from MEDIA)
                        └──── DRIFT ────┘
```

Still needed: the **precise input contract** — exactly which structural-evidence
signals DRIFT reads, how it aligns them in time with the MEDIA narrative signal,
and its output classes. Until that contract exists DRIFT is RETAINED but inert.

---

## 9. Posture

- SIGNAL / FLOW / CONVERGENCE dispositioned; PRESSURE / DRIFT pending Founder
  definition — **not blocking** the remaining `I_d` authoring.
- No code moves on any of these until `{T1, T2, T3} ≺ integration` clears.
- Retained views (FLOW, CONVERGENCE, DRIFT) live in frozen §14 `02 STRUCTURE`.
