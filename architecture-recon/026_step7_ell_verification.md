# DOD Step 7 — ℒ (Observation/Epistemic Status) Code Verification

Status: Verification against real code, citing what already exists. No new state model
invented, per explicit DOD instruction. This closes the one caveat audit 005 carried since
the original master reconciliation: "the ℒ row is the only one... not backed by a
001-004 code audit... carried forward from doctrine discussed earlier this session."

Question being answered (DOD's framing): can the doctrinal ℒ row be replaced — or at least
grounded — with actual existing code evidence?

## rc3's literal definition, restated

`ℒ : (O∪E∪R) × T → {⊤ (present), ⊥ (absent), ? (unknown)}` — a three-valued function.

## What real code actually does — three independent candidates, checked directly

**1. `rkmstore.js`'s `epistemicState`** (strongest candidate, live, exercised this
session — audits 012, 013, 014, 017). Eight values: `KNOWN`, `OBSERVED`, `VERIFIED`,
`GROUNDED`, `DISPUTED`, `SUPERSEDED`, `RETRACTED`, `UNKNOWN`. Set explicitly on every
`RealityObject` at creation (never null/undefined), carried through an append-only
`epistemicHistory[]` audit trail on every transition. This is a real, live, richer
refinement of ℒ's spirit — explicit observation-status as a first-class field, never
defaulted — but its mapping onto ⊤/⊥/? is not exact:
```
KNOWN, OBSERVED, VERIFIED, GROUNDED  →  cleanly ⊤ (present, at varying confidence)
UNKNOWN                              →  cleanly ? (rc3's literal word, no translation needed)
RETRACTED                            →  cleanly ⊥ (explicitly withdrawn — matches rc3's
                                          "explicitly observed absent" almost exactly)
DISPUTED                             →  does NOT cleanly map — contested-but-present is a
                                          fourth state rc3's 3-value function has no slot for
SUPERSEDED                           →  does NOT cleanly map — this is a temporal-validity
                                          concept (replaced by a newer version), closer to T
                                          than to ℒ
```

**2. `epistemictransparency.js`/`decisioninvariants.js`'s `populated` field** (WO-2079/2063,
live — consumed by real UI per its own header). `populated: raw !== null && raw !== undefined`
— a strict two-valued boolean. `decomposeUncertainty()`'s own comment states the same
principle rc3's ℒ encodes: "an unpopulated dimension is absent, not a zero, and averaging it
in would fabricate certainty about a gap." Real, live, code-enforced — but two-valued, no
distinction between ⊥ (explicitly absent) and ? (unknown/unchecked); `populated: false`
collapses both.

**3. `gwrealiser.js`'s own presence filters** (this session, `realiseSnapshot()`) —
`e.validFrom`/`e.validTo` window-overlap check for R, `ev.status === 'ACTIVE'` check for E.
Binary (in-window/present vs. not), not three-valued, and this is a *consumer* of presence
data (deciding G_W membership) rather than a general-purpose ℒ function itself.

## Verdict — grounded, not replaced with an exact match

**None of the three is a literal implementation of rc3's 3-value ⊤/⊥/? function.** All
three genuinely implement its *spirit* (explicit observation-state as a first-class,
never-defaulted field) in real, live, already-exercised code. Per the DOD's explicit
instruction not to invent a new state model to force an exact fit, none is synthesized
here. The honest grounding is:

- **The concept ℒ encodes (absence-is-signal, never null-default) is real, live, and
  independently arrived at in at least three places in this codebase** — not merely
  doctrine (CLAUDE.md §22) with zero code behind it, which is what audit 005's caveat left
  open.
- **The specific 3-value shape is not literally implemented anywhere.** RKM's
  `epistemicState` is the closest and richest candidate, and it is genuinely exercised by
  the two adopted Σ paths' underlying data (every `RealityObject` `sigmaengine.js` builds a
  vertex from carries a real `epistemicState`, though `gwrealiser.js`'s own filter currently
  reads `status`, not `epistemicState`, for its ACTIVE check — noted, not changed here, since
  changing it is Bin-3 work outside Step 7's verification-only scope).
- **`DISPUTED` and `SUPERSEDED` are real states with no rc3 slot.** This is not a defect in
  either the ontology or the implementation — rc3 explicitly reserves conflict-resolution
  mechanics for "downstream governance" (its own §5 wording, audit 001's citation), and
  `DISPUTED`/`SUPERSEDED` are exactly that downstream mechanism, correctly living outside
  the minimal 3-value contract rather than needing to be squeezed into it.

## Status

Gate: **Step 7 — GREEN.** The doctrinal-only caveat from audit 005 is resolved: ℒ's
concept is code-grounded (three independent real implementations cited), its exact 3-value
shape is honestly reported as ungrounded (no code implements exactly ⊤/⊥/?), and no new
state model was invented to paper over that gap. This is a complete, honest answer to the
Step 7 question, not a partial one deferred further — there is nothing more to discover
here without building something new, which is out of scope for this step.

Proceeding to Step 8 (final production-path acceptance / adoption closure) per the locked
sequence — the last step.
