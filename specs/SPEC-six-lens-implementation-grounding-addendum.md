# Implementation-Grounding Addendum — Six-Lens Downstream Design Pass

Status: Grounding record — does not modify SPEC I or SPEC II
Role: Records implementation-grounded findings and rulings from the #1–#7 downstream
design-decision pass, including a factual correction to a file reference used in the
locked SPEC I and in KRYL-1209
Reference: KRYL-1209, SPEC-six-lens-perceptual-experience-contract.md,
SPEC-observable-substrate-revelation-contract.md

## Naming correction (does not reopen SPEC I)

SPEC I §14/§15 and KRYL-1209's description cite `convergenceclassifier.js` as the
KRYL-1207 narrative-adjudication capability. Implementation grounding (2026-08-25)
found this reference is incorrect:

- `convergenceclassifier.js` is CLAUDE.md §6's pre-existing convergence-state engine.
  `conemap.jsx:116-119`'s `resolveConvergenceState()` calls its `classifyConvergenceState()`
  directly; it is live in 14+ call sites (`app.jsx`, `analysisfield.jsx`,
  `analysisidlefield.jsx`, `spinemap.jsx`, `oraclesignal.js`, `acquisitionbroker.js`,
  and more). It computes whole-cone `stateColor` from a telemetry-confidence/pressure
  vector. It has no relationship to narrative adjudication.
- The actual KRYL-1207 adjudication engine is `observestoryview.jsx`: its `adjudicate()`
  function, `getLastAdjudication()` accessor, and default-export `ObserveStoryBanner`
  component. `app.jsx` still imports it; only its JSX render was removed (2026-08-19),
  with a comment reading "removed from surface render... left intact... for later
  relocation."

SPEC I is not edited in place. This addendum is the traceable record of the correction;
any future reference to "the classifier" in downstream design work means
`observestoryview.jsx`, not `convergenceclassifier.js`.

## Decision matrix — final status after grounding

| Item | Status | Grounding |
|---|---|---|
| #1 Palette values | OPEN | CLAUDE.md §6 exact hex values still to resolve |
| #2 Cone geometry | LOCKED | Apex-up verified, `conemap.jsx:213-214`, no rotation applied |
| #3 Semantic axes | LOCKED | Convergence state (§6, chromatic) ≠ epistemic status (neutral/achromatic secondary surface channel); halo remains spatial |
| #4 Unresolved | LOCKED | `UNRESOLVED_NO_RANKING` (`observestoryview.jsx:334-338`) is a real, distinct adjudication outcome, different inputs/semantics from §6's `INSUFFICIENT SIGNAL`/`LOW SIGNAL YIELD` — achromatic epistemic treatment applies directly, no new state required |
| #5 Halo hierarchy | OPEN | `HaloRing`/`HaloMesh` (`signalmap.jsx:242-271`) have no radius/tier parameter today — one fixed-size ring per hardened node (`fs >= 0.70`). The proposed r₀→r∞ hierarchy is new visual construction, not a reinterpretation of an existing mechanism |
| #6 Classifier placement | LOCKED | Existing adjudication surface (`observestoryview.jsx` / `ObserveStoryBanner`), not a new inference layer. `coneState` prop already sourced from `aggregateSignals()`, same data `app.jsx` hands to ConeMap. r₁/RESOLVE-only exposure is a wiring/relocation decision |
| #7 SEE treatment | OPEN | No "nothing selected" overview state exists in `conemap.jsx` today (`selectedCone = manualPick ?? autoHighest` always focuses a cone, `conemap.jsx:2383-2387`). No per-domain three-way epistemic aggregate exists anywhere in `src/engine/*.js`. v2's specific percentages are a plausible visual composition, not computed from live data |

## Guardrail established by #7

No prototype percentage, band proportion, or epistemic aggregate may be presented as
live/data-derived unless an implementation-grounded source exists. The v2 SEE-state
visual idea remains a candidate; its data contract is not grounded and must not become
an implementation requirement on the strength of looking plausible.

## Remaining substantive design decisions

#1 (palette values), #5 (halo hierarchy — new construction), #7 (SEE-state treatment —
data contract ungrounded). #4 and #6 are implementation-grounded and locked without
reopening SPEC I or SPEC II.
