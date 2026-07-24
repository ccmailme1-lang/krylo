# LENS STYLE STANDARD (LOCKED 2026-07-24)

The single source of truth for how every Krylo lens looks. One instrument, not six charts.
Every Flourish lens — SIGNAL · FLOW · PRESSURE · CONVERGENCE · DRIFT · OPPORTUNITY (and every
future lens) — is audited against this. Any deviation gets pulled back to these values.

## FRAME (app-side — already enforced, do not re-solve per lens)
- Every lens renders in ONE identical panel: `LENS_EMBED` = 900 × 565, centered in Region C
  (`src/components/analysis/analysisfield.jsx`). The frame is shared by contract.
- The bottom "Made with Flourish" credit is clipped by the wrapper (overflow hidden + iframe
  sized +42px). Do not re-add it per lens.
- Fill the frame: **Height mode → Auto** (never Aspect ratio — it shrinks the content and
  leaves dead space, breaking the shared viewing rectangle).

## THEME / SURFACE
- Theme: **Flourish: Midnight**
- Background: **#000000** (match the black embed; Midnight ships dark-gray — override it)
- Margins: **24 / 40 / 44 / 40** (top / right / bottom / left) on every lens

## TYPE
- Main font: **IBM Plex Mono**
- Text color: **#FFFFFF**
- Number formatting: **0 decimals**

## STROKE STANDARD (the "across the board" fix)
- Primary / signal line: **2.5**
- Context / secondary lines: **1.5**, dimmed (white low-opacity or #333)
- Highlight (the live edge): **2.5**, lime
- Points / circles: same radius on every lens (slope circle radius 0.3)
- Each template names the control differently (line width / slope width / stroke) — they all map
  to these numbers.

## COLOR LAW (§6 — non-negotiable)
- Color encodes **state, not identity.** No rainbow / per-category palettes — 6 hues reads as 6
  states, which is a lie.
- Identity comes from **labels**, not color (Tufte).
- **#66FF00 lime** is the only accent, and it ONLY marks the live / signal / drifting state —
  never decoration. Purple stays rare (§6). No unauthorized color (§15).

## CHROME
- Popups: **OFF** (the white hover box) — labels already carry name + value.
- Legend: **OFF** wherever end-labels name the series (avoids double-printing identity).

## CONFORMANCE
- Audit each existing lens against this once; normalize every control to the standard.
- OPPORTUNITY and all future lenses inherit this by default — it is not re-decided per lens.
