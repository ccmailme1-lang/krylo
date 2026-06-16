# BUG-006 — synthGeneral() presents hardcoded metrics as measured

STATUS: BACKLOG
FILED: 2026-06-16
WO: WO-1762
SPLIT FROM: BUG-001 (BUG-001B)

## Evidence

Same 20-query batch run: `Confidence: 0.71` and `D/E: 0.5× LOW` appeared
identically on every single run. Both are hardcoded literals in
`synthGeneral()` (`src/engine/querysynthesis.js`), not computed from the
query — yet the UI renders them with no visual distinction from a measured
value. A user has no way to tell "measured" from "fallback placeholder."

## Why this is worse than a cosmetic issue

`tierLabel`/`deRatio`/confidence are presentational outputs that feed
downstream surfaces (leverage panel, action matrix, intelligence brief).
Presenting a constant as a measurement is a provenance problem, not a math
problem — the fix is not "compute the real number for GENERAL" (there may be
nothing to compute from in a low-signal fallback query), it's distinguishing
"no measurement available" from "measured 0.71."

## Proposed shape (not built — needs Go)

Introduce a tri-state instead of a bare number for the GENERAL fallback path:
`measured` / `estimated` / `unavailable`, with `unavailable` rendering as a
dash or explicit "insufficient signal" label rather than a fabricated number.
Scope: `synthGeneral()` output contract + whatever UI reads
`leverage.tierLabel` / confidence off it — needs a call-site audit before
starting (same caution as WO-1707/1755 tensor-ontology work — don't touch a
shared field without checking every consumer first).

## Not started

No code written. Flagged as the next-priority item after BUG-001C per SAB
review, but distinct from the release-blocking unit-collision fix.
