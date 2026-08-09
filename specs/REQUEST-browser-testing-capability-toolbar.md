# Request for Assistance — Browser Testing Capability Gap

**Context:** KRYLO project, current baseline `d52b770` / `baseline_toolbar_working_20260808` on `main`.
**Date:** 2026-08-08

## The issue

No browser automation tool is available in this session — no Playwright, Puppeteer, or any way to
load a page, click an element, and observe the result directly. Every UI fix tonight (a
`FloatingToolbar` visibility/wiring bug) had to be verified two different ways that don't fully
substitute for each other:

1. **Static code verification** — reading the actual source, confirming click handlers dispatch
   correctly, state flows through the right reducer, the right component is mounted under the
   right condition, tracing every consumer of the relevant state. Done thoroughly, every time.
2. **Live behavioral confirmation** — actually seeing a button light up, a report render, a screen
   change. Not possible from this session. Only the user, looking at their own browser, can do this.

## Why this caused real friction tonight

- A fix shipped based on correct-looking code, the user tested it, it didn't work, and the actual
  bug turned out to be one level deeper than static reading alone revealed (two different flags —
  `surfaceExpanded` vs `surfaceActivated` — each individually correct in isolation, but their
  *combination* produced a dead button).
- Multiple rounds of "fixed it" → "still not working" → re-diagnose, because there was no way to
  close the loop before handing back to the user.
- Repeated static-only claims of "this should work" reasonably read as evasive or unreliable once
  "should work" kept turning out to be wrong on actual click.

## What would help

Access to a browser automation tool (Playwright MCP, Puppeteer, or equivalent) so that for
UI-facing fixes it's possible to:
- Load the actual running app
- Perform the click/interaction directly
- Read back the real DOM/visual result
- Confirm the fix before handing it to the user, not just reason about it

This collapses the current two-step "claim it's fixed → user confirms" loop into one step for
anything that doesn't require the user's own judgment, and would have caught the
`surfaceActivated`-vs-`surfaceExpanded` gap earlier tonight without the user having to discover it
live, repeatedly.

## FloatingToolbar — button names and source paths

All 7 buttons are defined in `src/components/surface/floatingtoolbar.jsx` (the `LENSES` array).
Clicking one sets `activeLens` in `src/context/PrismContext.jsx`. What each lens actually renders
lives downstream, mainly in `src/components/analysis/analysisfield.jsx`:

| # | Glyph | Name (on-screen label) | Report/analysis page name | Source path — what it renders |
|---|---|---|---|---|
| 1 | ◉ | OBSERVE | *(no report page — base cone map)* | `src/components/analysis/analysisfield.jsx` (default fallback, ~line 1472). Glyph/HUD read also flows into `src/components/spine/conemap.jsx`. |
| 2 | ↯ | SIGNAL | **SIGNAL REPORT** | `src/components/analysis/analysisfield.jsx` ~line 1029. Embed URL: `src/config/lensembeds.js` → `LENS_EMBEDS.SIGNAL` |
| 3 | ⇢ | FLOW | **FLOW REPORT** | `src/components/analysis/analysisfield.jsx` ~line 1302. Embed: `LENS_EMBEDS.FLOW` |
| 4 | ⧖ | PRESSURE | **PRESSURE REPORT** | `src/components/analysis/analysisfield.jsx` ~line 1142. Embed: `LENS_EMBEDS.PRESSURE` |
| 5 | ⬡ | CONVERGENCE | **CONVERGENCE REPORT** | `src/components/analysis/analysisfield.jsx` ~line 839. Embed: `LENS_EMBEDS.CONVERGENCE` |
| 6 | ↝ | DRIFT | **DRIFT REPORT** | `src/components/analysis/analysisfield.jsx` ~line 665. Embed: `LENS_EMBEDS.DRIFT` |
| 7 | ⟡ | OPPORTUNITY (labeled **OWNERSHIP** on-screen — internal id stays `OPPORTUNITY` everywhere in code) | **FORMATION PROSPECTUS** | `src/components/analysis/analysisfield.jsx` ~line 123. No Flourish embed (`LENS_EMBEDS.OPPORTUNITY: null`). |

Page names above are verbatim, pulled from each report's own on-screen header text (e.g.
`"SIGNAL REPORT · 01 MACRO OVERVIEW"`), not invented labels.

Also reaches `src/components/surface/orientationsurface.jsx` → `ConeMap` (pre-activation view) as
of `d52b770`/KRYL-1166, so the glyph/HUD read updates even before a query is submitted. Full
per-lens reports (rows 2–7 above) still require `surfaceActivated` (a query submitted).
