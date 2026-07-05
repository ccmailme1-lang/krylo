# WO HARDENING — Platform-Wide Help Layer

## HEADER

**WO-[NUMBER TBD] — Platform-Wide Help Layer**
Date: 2026-07-05 (retroactive — built live per Founder direction, documented after the fact)
Author: built directly from live direction, spec written after for the record
Target file(s): see File Map — one new shared component, help text added across 8 existing files

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Attach a visible "?" affordance with a plain-language hover explanation to every primary labeled control across the application, so a non-technical user can understand what each control means without leaving the screen.

**Output:** A rendered "?" glyph next to a control's label; hovering shows one to two sentences of plain-language explanation.

---

## 2. BOUNDARY DECLARATION

**Input contract:** a plain-language string (`text` prop on `HelpMark`, or a `title` attribute directly for plain HTML). No computation, no formula, no internal mechanism detail.

**Output contract:** a small (10px) circular "?" marker, native-tooltip-based, rendered inline next to the label it explains.

**Explicit exclusions:**
- No jargon, no formulas, no internal variable names, no "detect vs. predict" doctrine language — plain, concrete, everyday English only (Founder directive: "no virtue, inner meaning, emotions... I want help").
- No interpretation, recommendation, or judgment language.
- Does not compute or alter anything it explains — pure presentation layer, same discipline as `metricdefinitions.js`.
- Hero (Layer 0/1 static splash page, `krylo2-feed.html`) deliberately kept minimal — Founder direction: "there shouldn't be much if at all on hero." Only the 4 DNA cards, search input, and lens pills carry help there; nothing further should be added to that file without explicit re-authorization.

---

## 3. ZERO DRIFT CONFIRMATION

- [ ] Detection/scoring/inference layers touched → N/A everywhere; every change is presentation-only (a `title` attribute or a small sibling `<span>`).
- [x] UI layer touched → this WO is UI-only by definition. No new data dependencies introduced — every help string is static text authored directly, not derived from any engine.

**Drift notes:** None — no computation exists to drift.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Makes the application navigable by a non-technical user (Founder's stated bar: "such that my 83 year old mother can navigate") without requiring a separate onboarding flow, tour, or support channel.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is that no primary control in the application is unexplained."**

---

## 6. FORMULA / CONTRACT

No formula — this is static text content, not a computed value. N/A for §16 normalization (not a signal).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/components/shared/helpmark.jsx` | NEW — canonical shared `HelpMark` component | — |
| `src/engine/metricdefinitions.js` | (already built/committed prior to this WO) | 9 metric definitions, unchanged by this WO |
| `src/components/analysis/metricstrip.jsx` | (already built/committed prior to this WO) | unchanged by this WO |
| `public/krylo2-feed.html` | Help added to 4 DNA cards, search input, 7 lens pills (plain CSS `.help-mark` class, native `title` attributes — no React here) | Hero copy, video, layout — kept deliberately minimal per Founder direction |
| `src/components/spine/conemap.jsx` | Help added to InspectionPanel: SIGNAL, FORECAST +7D, DIFFUSION, ELASTICITY, WINDOW, COMPOSITION, EVENT LOG, SCAN SWEEP | Click/raycast logic, cone rendering — untouched |
| `src/components/analysis/analysisidlefield.jsx` | Help added to all 4 section headers: Intent Strength Mapping, Horizon Scrubber, Forensic Matrix Fields, Signal Scope | Query submission logic — untouched |
| `src/components/feeds/feedsbay.jsx` | Help added via one lookup map (`RAIL_HELP`) inside `RailSection`, covering Featured/The Scroll/Domain Pressure/Signal Wire everywhere that component renders | Feed data/allocation logic — untouched |
| `src/components/community/communityview.jsx` | Help added to Community Overview, Member Role | — |
| `src/components/history/historybay.jsx` | Help added to Investigation History, Transaction History, Export & Save | — |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — every primary control now states what it means in plain language. |
| Does this have a single dominant output? | YES — a hover explanation, uniformly implemented. |
| Are all boundaries explicitly defined? | YES — presentation-only, no computation, Hero deliberately excluded from further expansion. |
| Can this be built without touching an undefined dependency? | YES — pure static strings, zero engine dependencies. |
| Does this avoid increasing expressive flexibility in the core? | YES — touches no core logic anywhere; every file's actual behavior is byte-for-byte unchanged except the added help markup. |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** Zero coupling to any computation. `HelpMark` has no dependencies beyond React itself.

**2. Semantic Consistency (SC):** One shared component (`helpmark.jsx`) used across all React screens instead of each file reinventing its own — `metricstrip.jsx`'s original inline version should be migrated to import the shared one for full consistency (noted as follow-up, not yet done).

**3. Execution Containment (EC):** Fully declarative, zero side effects.

**4. Drift Exposure (DE):** Content drift is the only real risk (help text going stale if a control's behavior changes) — same category of risk already accepted for `metricdefinitions.js`. No runtime enforcement exists to catch this; it's a documentation discipline, not a code guarantee.

**Outcome tag:** CONSTRAINED — acceptable, with the metricstrip.jsx consistency follow-up and content-drift risk both noted.

---

## 10. DEFINITION OF DONE

**Verification (per section, already performed live during the build):**
- Build compiles clean after every file (`npx vite build`) — confirmed after each commit.
- `dist/krylo2-feed.html` checked directly for `help-mark` occurrences post-build (Hero).
- Visual confirmation pending Founder review in-browser for the React screens (Surface, Analysis, News Feed, Community, History) — not yet independently SSR-verified the way `metricstrip.jsx` was; recommended before calling this fully done.

---

## NOTES

Scope corrected once during the build: the Founder's "Hero" refers to the Surface/cone screen (`conemap.jsx`'s InspectionPanel), not the static splash page (`krylo2-feed.html`) — both got help coverage, but per direction the splash page's help stays minimal (already-added 4 cards + search + lenses) and should not be expanded further without explicit re-authorization.

Not yet covered: Oracle view, Ground Level (tenkvault.jsx), Signal Map (spinemap.jsx), Workstation, settings/console flyouts, and the community post/thread detail views beyond the sidebar shown here. If "don't miss anything" extends to those, they need their own pass.
