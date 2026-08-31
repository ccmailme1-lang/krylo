# SPEC — Frame Classification & Anchoring

**Status:** Founder-governed, GO 2026-08-30. Recorded, not originated.
**Parent:** `SPEC-WO5B-subject-binding.md` · `SPEC-subject-scoping-contract.md`
**Precedent:** KRYL-1235 (legacy-narrative isolation) · `subjectScope` (ENTITY/GEO/DECISION_FRAME/UNRESOLVED)

---

## PROBLEM

The engine already classifies an unresolved input and extracts real intent
(decision verb, sector, stage, asset class, geo, numbers). The guest-facing
remediation does not inherit that — it falls back to a generic *"REFINE YOUR
QUERY — add a specific decision, dollar amount, or timeline."*

Two validated cases, same failure:

| engine knows | guest gets |
|---|---|
| portfolio frame · 20–30 co · $5K min · AI thesis | "refine your query" |
| decision frame · invest · AI infrastructure · Series B | "refine your query" |

**The epistemic engine is ahead of the UX layer.** The Surface must turn each
honest boundary into an entry path *native to the analytical object the user
supplied* — without weakening the honest-absence behaviour.

---

## CONTRACT (invariant)

> **Anchors establish the object and scope of observation. They are never
> conclusion inputs and must never directly generate a verdict, score,
> recommendation, or formation.**

Pipeline stays: **frame classification → frame anchoring → subject resolution →
observation → formation.** Never `frame → verdict`.

This is a **surface / remediation layer** consuming what the engine already
computes. It does **not** redesign the classification or formation machinery.

---

## V1 taxonomy — closed set of 4

1. **DECISION_FRAME** — a decision/action intent, subject unresolved.
2. **PORTFOLIO_FRAME** — a fund / portfolio-level mandate, no single subject.
3. **MARKET_THEME** — a market / sector / theme, no decision and no portfolio.
4. **NO_FRAME** — genuinely ambiguous / unclassifiable. The epistemic escape
   hatch: **no fabricated anchors, no generic "refine your query" dressed up as
   intelligence.** State what is unresolved and what cannot yet be grounded.

Classification runs only when `subjectScope(input).kind !== 'ENTITY'`. Priority:
PORTFOLIO_FRAME → DECISION_FRAME → MARKET_THEME → NO_FRAME.

---

## Anchor sets (drafted from the two validated examples + `queryContext` — ratify before expanding)

Each anchor is `{ key, label, value | null, hint? }`. `value` is filled from
`queryContext` extraction (entities / domains / numbers / geo / assetClass /
decisionCues + local regex for stage & horizon); the rest are open.

**DECISION_FRAME:** decision/action type · target domain/sector · stage/maturity ·
ticket size · geography · decision horizon · candidate/target (if known — a named
candidate promotes this to a Target Packet).

**PORTFOLIO_FRAME:** portfolio/fund identity · investment thesis/sector · vintage ·
stage · geography · portfolio size / target count · minimum ticket (if applicable) ·
candidate universe (if known).

**MARKET_THEME:** theme/sector · geography · time horizon · market segment /
sub-sector · stage/maturity (if applicable) · named companies/entities (if any).

**NO_FRAME:** anchors = `[]`. Renders the unresolved list only.

---

## STAGES

### Stage 1 — classify + anchoring surface  *(this ticket)*

- `src/engine/frameclassify.js` — `classifyFrame(input)` → `{ class, evidence,
  anchors, unresolved }`. Pure, deterministic. No synthesis import (quarantine).
- `src/components/analysis/frameanchoring.jsx` — renders the frame class + the
  filled evidence + the anchor checklist (`value` shown, open anchors shown as
  `—` with the hint). A READ surface: it tells the guest exactly which anchors,
  class-specific, would make the frame resolvable. **No input fields, no verdict,
  no score.**
- Wired into the LEFT Target Packet, directly under PRIMARY SIGNAL, when
  `subjectScope.kind !== 'ENTITY'` and `classifyFrame` returns a class ∈
  {DECISION_FRAME, PORTFOLIO_FRAME, MARKET_THEME}. NO_FRAME → nothing new; the
  existing honest-absence text stands.
- Acceptance: the AI-infra Series B query and the portfolio query each render a
  class-native anchor checklist instead of only "refine your query"; a genuinely
  ambiguous query renders NO_FRAME (no fabricated anchors).

### Stage 2 — retire generic remediation

- Left Target Packet: already clean (KRYL-1235).
- Right panel `IntelligenceBrief` → `ActionMatrix`: the "REFINE YOUR QUERY / add a
  specific decision, dollar amount, or timeline" lead action, for a framed input,
  points at / defers to the anchoring surface instead of the generic prompt.
  Targeted change to `actionmatrix.jsx` only.

### Stage 3 — anchors scope observation  *(downstream, needs WO-5B evidence)*

- A supplied anchor narrows `A(d, Subject)` evidence scope. Not built until a
  connector produces subject-scoped evidence to scope.

---

## VALIDATION

- `qa_frameclassify.mjs` — the 4 classes over the two validated queries + an
  ambiguous one + an entity query (→ not classified as a frame); anchor fills
  from `queryContext`; priority order; deterministic; no synthesis import.
- Live: both frame fixtures render the anchoring surface; NO_FRAME query does not.
- `qa_guest_acceptance` harness: the frame fixtures' remediation is no longer
  purely "refine your query".
- `vite build --mode development` clean.

## ROLLBACK

Additive module + one component + one render site in `targetpacket.jsx`. Revert =
drop the `<FrameAnchoring>` render and the two new files. No classification or
formation change to undo.

## GUIDELINES

Do not weaken `NO_SUBJECT_RESOLVED` / `DECISION_FRAME`. Do not make an anchor feed
synthesis or formation. Do not author anchor sets beyond the drafted set without
Founder ratification.
