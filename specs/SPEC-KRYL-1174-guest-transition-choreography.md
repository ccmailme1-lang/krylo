# SPEC — KRYL-1174: Hero → Surface Guest Transition Choreography

## PROBLEM

KRYL-1180's RCA confirmed the Hero → Surface cone-count mechanism (3 cones → 6, via `maxCones`
prop + suppression-scale animation in `conemap.jsx`) is deterministic and intentional — no
competing writer, no autonomous oscillation. That closes the implementation-defect question.
It does not close the product question: **Founder acceptance of the resulting visual transition
is NOT MET.**

A screen-recording pass produced four confirmed guest-visible symptoms:

1. **Telemetry/canvas mismatch** — a "SELECTIVITY INDEX" panel reports all 6 domains immediately,
   while the 3D canvas still shows only 3 cones.
2. **Premature banner** — a "N domains are moving together" banner appears before the 6th cone
   has visually resolved.
3. **Abrupt pop** — the second batch of 3 cones (TECHNOLOGY, CAPITAL, KNOWLEDGE) appears to snap
   in rather than ease in, despite a 0.5s suppression lerp already existing in code.
4. **Z-fighting** — visible overlap artifacts where cone geometry intersects after settling.

## SOLUTION (proposed — no code written yet, pending Founder "Go")

1. **Symptom 2 (confirmed root cause)** — `buildNarrative()` in
   `src/components/surface/observestoryview.jsx` (~line 57-92) computes the "N domains are moving
   together" headline from `domains.filter(d => d.formationState === 'STABLE'/'EMERGING')` only.
   It has no dependency on ConeMap's suppression/scale state. Fix: gate the banner's fire
   condition on suppression-transition-complete (all 6 cones at scale ≈ 1), not on the nav event.

2. **Symptom 1 (location unconfirmed)** — grepped all of `src/` case-insensitively for
   "selectivity"; zero hits. The panel's source file is not yet located. Before any fix: find it
   (may be a different label internally, or computed/rendered text) via live-app inspection, then
   confirm it isn't already reading the same `coneState[].suppressed` array the cones use.

3. **Symptom 3 (diagnosis before fix)** — `conemap.jsx` already has a 0.5s
   `SUPPRESSION_TRANSITION_DURATION` lerp on the suppression scale. If it still reads as a pop,
   two possibilities, not yet distinguished: (a) something bypasses the lerp on this specific
   transition, or (b) it's visually drowned out by two other concurrently-firing transitions on
   the same nav event — the bottom-panel slide (900ms) and the layout reposition (0.6s). Needs a
   read-only diagnostic pass (confirm the lerp actually executes on a real Hero→Surface trigger)
   before choosing between "fix the bypass" and "unify the three durations."

4. **Symptom 4** — out of scope for this ticket. Separate rendering/depth issue, not a
   choreography/timing issue.

## KEY PLAYERS / COMPONENTS TOUCHED

- `src/components/surface/observestoryview.jsx` — `buildNarrative()`, banner trigger gating.
- `src/components/spine/conemap.jsx` — `ConeScene`, suppression lerp (`SUPPRESSION_TRANSITION_DURATION`).
- `src/app.jsx` — nav-event wiring (`surfaceExpanded`, `maxCones`) — read-only reference point.
- SELECTIVITY INDEX panel — file not yet located, must confirm before touching.

## VALIDATION STEPS

- Re-run Tests A–D from the KRYL-1174 plan (fresh load / repeat / slow data / production-like
  data) after each fix, confirming: panel and canvas domain counts never disagree; banner never
  fires before the 6th cone visually settles; the two-batch reveal reads as one continuous motion
  rather than racing animations; repeatable across multiple passes, not a single pathological
  trace.
- No browser automation tool is available in this session — validation requires either the
  Founder running the passes, or explicit sign-off to build a minimal timestamped capture harness.

## ROLLBACK PLAN

All changes scoped to `observestoryview.jsx` (banner gating) and `conemap.jsx` (suppression
timing) — no schema, no data changes, nothing destructive. Revert via `git diff` / `git checkout`
on the specific hunks; nothing here touches committed history.

## GUIDELINES

- No code changes until the Founder gives explicit "Go" on this spec, per section-by-section.
- Symptom 4 (z-fighting) is explicitly out of scope — do not fold it into this ticket.
- The five Step-1 design questions from the original plan (should reveal be simultaneous vs.
  progressive, should hydration be visible during transition, etc.) are Founder-only per Design
  Sovereignty (§15) — this spec does NOT answer them. It only fixes two confirmed data/state
  coupling bugs (#1, #2) and diagnoses #3; none of that requires a new design decision.
- KRYL-1174 does not close until the Founder closes it.
- SELECTIVITY INDEX panel location is unconfirmed — do not guess a file for it; locate it first.
