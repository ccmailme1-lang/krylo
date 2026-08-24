# SPEC — Normalization Discovery

**Status:** DISCOVERY COMPLETE (2026-08-23). Answers the question §5.1 of
`SPEC-adjudication-contract.md` posed: does legitimate comparison exist across
`VOLATILITY_STANDOUT`/`OPPOSITE_DIRECTION`/`EMERGING_CLOSING_GAP`'s incommensurable units? Tests a
real hypothesis against real code, not a proposed formula. No implementation authorized.
**Depends on:** the salience adjudication inquiry, `SPEC-adjudication-contract.md` (Option C
ratified).

## 1. The hypothesis actually worth testing

Not "invent a formula that produces sortable numbers" (that's arbitrary by construction — dividing
by anything gives comparable-looking numbers, that doesn't make them meaningful). The real
question: **is there a conversion between these units that's grounded in something the codebase
already establishes, rather than a new authored constant?**

## 2. Tracing the real derivation of each margin

- `VOLATILITY_STANDOUT`'s `measuredValue` derives from `d.volatility` — a raw signal field, read
  directly from `coneState`, independent of magnitude.
- `OPPOSITE_DIRECTION`'s `measuredValue` (`bestSpread`) derives from `rawVelocity(magnitude) =
  (magnitude-50)×0.3` — a **documented, existing transform of magnitude**, not volatility.
- `EMERGING_CLOSING_GAP`'s `measuredValue` (`closestGap`) is a direct magnitude difference,
  `|e.magnitude - s.magnitude|` — no scaling applied.

**Finding: `OPPOSITE_DIRECTION` and `EMERGING_CLOSING_GAP` are both, ultimately, functions of
magnitude, connected by the existing `×0.3` velocity-scaling constant already in the code.**
`EMERGING_CLOSING_GAP`'s raw gap, multiplied by 0.3, is directly commensurable with
`OPPOSITE_DIRECTION`'s spread — not an invented conversion, the same formula the codebase already
uses to turn a magnitude into a velocity everywhere else. This is a grounded finding.

**But it doesn't matter for the actual problem**, per `SPEC-candidate-vocabulary-compatibility-
inquiry.md` §2: these two types are structurally unreachable together (algebraically proven —
`|m₁-m₂|>20` and `|m₁-m₂|<8` cannot both hold). They never co-occur, so they never need comparing.

**`VOLATILITY_STANDOUT` has no such relationship to either.** `volatility` and `magnitude` are
independent fields in `coneState` with zero documented or derivable conversion between them
anywhere in the codebase. Any exchange rate between "how much variance" and "how much magnitude
difference" would have to be invented from scratch — not derived, authored arbitrarily.

## 3. Why this is the case that actually matters

Confirmed earlier this session (salience adjudication inquiry, controlled computation):
`VOLATILITY_STANDOUT` + `OPPOSITE_DIRECTION` co-occur without conflict (real, tested case).
`VOLATILITY_STANDOUT` + `EMERGING_CLOSING_GAP` co-occur without conflict (real, tested case). These
are exactly the pairs a selector needs to rank between when no conflict exists — and they're
exactly the pair with no grounded conversion.

## 4. Finding

**Normalization is legitimately derivable for one pair that never matters (`OPPOSITE_DIRECTION`
↔ `EMERGING_CLOSING_GAP`, magnitude-grounded, but structurally unreachable together) and is NOT
legitimately derivable for the pair that actually needs it (`VOLATILITY_STANDOUT` against either
magnitude-based type, real co-occurring cases, no grounded conversion exists).**

This is not "normalization hasn't been figured out yet." It's a negative result: the units are
incommensurable for a real, structural reason (they measure fundamentally different underlying
phenomena — variance vs. magnitude), not a temporary gap in effort.

## 5. What this means for the Adjudication Contract

Per `SPEC-adjudication-contract.md` §3 step 4 (written to handle exactly this outcome, not assumed
away): **ranking is not legitimately derivable → Comparable-but-unranked candidates must resolve
to an explicit unresolved state, permanently, not a placeholder pending a future fix.** This is not
a downgrade from the original goal — it's the honest empirical answer the whole normalization
discovery existed to find, and it closes §5.1 of that contract.

## Non-goals

Does not invent an arbitrary normalization anyway (rejected explicitly — an arbitrary conversion
would fail the same "no invented weighting" standard already locked into the adjudication
contract). Does not authorize implementation of the unresolved-state behavior — that's still part
of the single, complete implementation ticket per the adjudication contract, not built here.
