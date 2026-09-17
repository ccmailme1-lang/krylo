# origin/ — Frozen Source Documents

**Status:** Frozen. Do not edit.
**Period:** January 2026
**Last updated:** 2026-08-12

---

## What this directory is

The original KRYLO planning and positioning documents, preserved exactly as
written. These describe an earlier conception of the product and are **not**
current. Their value is precisely that they are wrong in places — they show
what was believed at the time, which is what makes the evolution legible.

Nothing here is edited, corrected, annotated, or retro-fitted. Errors,
abandoned framing, and superseded architecture stay in. A corrected origin
document is not an origin document.

For current state, see `../current/`. For the narrative that connects the
two, see `../000-charter.md` and `../030-phase-chronicle.md`.

---

## Contents

| File | What it is | Current counterpart |
|---|---|---|
| `poc-architecture.md` | POC architecture & deployment, as-built Jan 2026 | `../current/architecture.md` |
| `poc-charter.md` | POC charter — "System Breathing Test", 4-day timebox | `../000-charter.md` |
| `pilot-execution.md` | Formal pilot definition — technology risk / adoption friction | `../current/pilot-plan.md` |
| `architecture-review.md` | Alignment assessment | *(none — see below)* |
| `product-manifesto.md` | Founding thesis and five principles | `../current/manifesto.md` |
| `investor-objections.md` | Objection pressure test | `../current/investor-objections.md` |
| `vc-pitch-deck.md` | 10-slide investor deck | `../current/pitch-outline.md` |
| `hlsd-deck.md` | 17-slide high-level solution design | `../current/hlsd.md` |
| `prompt-scratchpad.md` | Working prompt notes | `../060-governance-sop.md`, `../010-doctrine-registry.md` |

---

## Two documents require a caveat before reading

**`poc-charter.md`** contains a section of simulated advisory feedback
attributed to named real public figures. Those quotes are invented. No named
individual reviewed, advised on, or endorsed KRYLO. The section was a
persona-based red-team exercise. It is not evidence and must never be
presented as such.

The same document names a PM sponsor and an advisory board. Those roles were
simulated decision-framing devices, not real people. KRYLO has no external
board and no employed team.

**`architecture-review.md`** is an AI-authored assessment of KRYLO's
architecture, produced in response to a prompt from the owner. It is a record
of design intent, not third-party validation, and it has no current
counterpart — writing a fresh self-assessment would reproduce the same
problem with a newer date. The honest current equivalent is the Invariant
Verification Matrix in `../010-doctrine-registry.md`: the engine graded
against its own contracts by execution rather than by opinion.

---

## Why keep documents that are wrong

Three reasons.

First, the founding principles held. *Silence is data* was written in January
before any code existed. In August the engine's first complete payload
returned a refusal — confidence ungrounded, provenance absent, export
blocked. A principle that survives seven months of build pressure and then
executes in production is worth being able to point at.

Second, the pivot is documented rather than reconstructed. KRYLO moved from
measuring collective recognition to measuring the absence of grounded
information. That shift is visible by diffing these files against
`../current/`. A pivot you can trace is a different thing from a pivot you
assert.

Third, the constraints were named up front. The POC listed its own
limitations — in-memory only, no auth, no persistence, debug endpoints
exposed — as intentional and time-boxed rather than burying them. That habit
is the origin of the current doctrine.