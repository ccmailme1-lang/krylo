# SPEC (DRAFT): KRYLO Reskin — Build Instructions

Status: DRAFT, 2026-10-17. Not filed in Jira. Written for the build agent working on the core branch.
Author scope: read-only analysis of `origin/main` at `8afe082`. **The build agent must re-run the inventory (Appendix A) on its own branch before starting** — counts below may differ there.

Related: `specs/reskin/*.html` (visual references), `specs/reskin/blueprint-map-retrofit-20261015.md` (MAP architecture), `specs/reskin/spec-map-hub-layout.md`, `spec-analysis-recent-questions.md`, `spec-analysis-ask-or-browse.md`.

---

## 0. Ground rules (apply to every phase)

1. CLAUDE.md governs: §5/§6 (color authority, amber banned), §7 (type contract), §10 (ticket + explicit go per ticket, Definition of Done), §11, §22/§23 (deploy gate — nothing ships to production without Founder go).
2. One ticket per phase below. Do not start a phase without its ticket and explicit "go".
3. **Phase R1 must produce no visible change.** Screenshots before/after must match.
4. Production default stays **dark** until Phase R5 is explicitly approved.
5. Do not delete files in this project, including files that look unused (Appendix A.4). Record them; deletion is a separate decision.
6. No new colors. Every value is either a current literal (dark) or a value in §7 below (light). Anything else stops the build and goes to the Founder.

---

## 1. Six-field definition (Epic)

1. **Original intent:** move KRYLO from a black UI to a light, corporate UI (#F5F5F7 ground) without changing behavior, and make future color changes a one-file edit.
2. **Acceptance criteria:** §9 below.
3. **Current implementation state:** ~3,468 hardcoded color literals in ~130 files on `main`; no shared theme. A partial palette exists in `src/components/spine/constants.js` (`PALETTE`), and a few files declare local CSS variables (`--signal-lime`, `--signal-blue`, `--unicorn-purple`, `--text-dark`, etc.).
4. **Dependencies:** Founder decisions D-R1…D-R5 (§8). Light palette approved as a §6 amendment before R5.
5. **Superseded by a newer ticket:** none found locally. Jira not searched from this session.
6. **Maps to current product model:** yes — presentation only; no data, semantics or reachability change (Lightweight gate for R1–R4 per §10; R5 is a production change under §23).

---

## 2. Phases

| Phase | Output | Visible change | Gate |
|---|---|---|---|
| **R0** | Inventory confirmed on core branch; unused-file list verified (3-question protocol) | None | Read-only |
| **R1** | Token layer: every literal replaced by a token whose **dark** value equals the old literal | **None** (pixel-identical) | Screenshot diff per surface |
| **R2** | Light token values + theme switch (`data-theme="light"`), off by default | None unless switched | Switch works on every surface |
| **R3** | Per-surface light fixes (lime-as-text, canvases, iframes, glow) | Only when switched | Each surface signed off on Dev |
| **R4** | State-color hygiene: blue/purple used only for convergence state | Small, both themes | Founder review |
| **R5** | Light becomes default | Yes | §6 amendment + §23 deploy go |

R1 is the bulk of the work and can be split into one ticket per file group (§6).

---

## 3. Phase R1 — Token layer (no visible change)

### 3.1 Files to create (lowercase names, §9)

| File | Purpose |
|---|---|
| `src/styles/tokens.css` | All tokens as CSS custom properties on `:root` (dark values) and `:root[data-theme="light"]` (light values, added in R2). Imported once in `src/main.jsx`. |
| `public/tokens.css` | Same file, copied for the iframes (`structure-field.html`, `krylo2-feed.html`), linked with `<link rel="stylesheet" href="/tokens.css">`. One source of truth: generate `public/tokens.css` from `src/styles/tokens.css` (copy step) — never hand-edit both. |
| `src/styles/theme.js` | `token(name)` → resolved value via `getComputedStyle(document.documentElement).getPropertyValue(name).trim()`, for canvas/WebGL code that cannot use `var()`. `onThemeChange(cb)` → fires when `data-theme` changes (MutationObserver on `<html>`). |

### 3.2 Replacement rules

| Where the color is | Replace with |
|---|---|
| CSS / `<style>` blocks | `var(--token)` |
| React inline `style={{ color: '#66FF00' }}` | `style={{ color: 'var(--token)' }}` (strings work in inline styles) |
| JS constants (`const LIME = '#66FF00'`) | `const LIME = 'var(--accent)'` **only if** every use is a style string; otherwise use `token('--accent')` at draw time |
| Canvas 2D (`ctx.fillStyle`, `strokeStyle`) | `token('--x')`, read per frame or cached and refreshed in `onThemeChange` |
| Three.js / R3F materials (`conemap.jsx`, etc.) | `token('--x')` → `new THREE.Color(...)`; re-apply on `onThemeChange` |
| SVG attributes built in JS | `var(--x)` works in Chromium/WebKit/Firefox presentation attributes; if a target browser fails, use `token()` |
| Colors used as data (e.g. `STATE_COLOR` tables) | Tokens `--state-*` (§4); table values become `var(--state-*)` |

### 3.3 The white-alpha ladder

Most literals are `rgba(255,255,255,a)` (≈1,000 uses). Do **not** collapse them in R1 (that changes pixels). Create one token per alpha step actually used:

`--fg-a03 … --fg-a90` → dark value `rgba(255,255,255,0.03)` … `rgba(255,255,255,0.90)`, named by the exact alpha (e.g. `--fg-a35` = 0.35). Same for any `rgba(0,0,0,a)` → `--shade-aNN`, and `rgba(102,255,0,a)` → `--accent-aNN`, `rgba(0,127,255,a)` → `--blue-aNN`.

Consolidating the ladder into fewer steps is a **separate, later decision** (D-R5), not part of R1.

### 3.4 R1 verification

- For every surface in §6: screenshot before and after at 1440×900 and 1920×1080; pixel diff ≤ antialiasing noise.
- `grep` count of hex/rgba literals outside `tokens.css` drops to zero for each completed file group (exceptions listed explicitly in the ticket, e.g. a literal inside a comment).
- Existing QA scripts (`qa_*.mjs`) still pass.

---

## 4. Token table

Dark values are the current literals. Light values come from the approved mockups (`specs/reskin/*-light.html`). All light values are in §6 **except where marked NEW**.

| Token | Dark (current) | Light | Used for |
|---|---|---|---|
| `--bg` | `#000000` | `#F5F5F7` | App and page ground |
| `--surface` | per-file panel literals (e.g. `#0a0c0f`, `#111111`, `rgba(5,7,10,0.95)`) — one token each in R1 | `#F5F5F7` | Panels, bars, cards |
| `--fg` | `#FFFFFF` / `#e0e0dc` (keep separate tokens in R1) | `#1A1A1A` | Primary text |
| `--fg-aNN` | `rgba(255,255,255,0.NN)` | `rgba(26,26,26,0.NN)` — verify contrast (§9.4) | Dim text, hairlines |
| `--line` | `#1a1a1a` and white-alpha hairlines | `#e0e0dc` | Borders, gridlines |
| `--dim` | various grays | `#3a3d4a` | Secondary text |
| `--accent` | `#66FF00` | `#66FF00` | Lime **fills**: buttons, active tabs, highlights |
| `--accent-text` | `#66FF00` | `#1A1A1A` | Places where lime is used as **text** (light: ink, optionally with a lime underline `box-shadow: inset 0 -0.35em 0 var(--accent)` as in the mockups) |
| `--on-accent` | `#000000` (current text/icon on lime) | `#1A1A1A` | Text or icons sitting on a lime fill |
| `--casing` | none | `#1A1A1A` | Outline around lime/gray lines on light ground (mockups use a 4.5px ink line under a 2.5px lime line) |
| `--state-insufficient` | `#3a3d4a` | `#3a3d4a` | Convergence state |
| `--state-low` | `#1a1a1a` | `#1a1a1a` (needs `--casing` outline on dark; already readable on light) | Convergence state |
| `--state-building` | `#66FF00` | `#66FF00` | Convergence state |
| `--state-turbulent` | `#007FFF` | `#007FFF` | Convergence state only |
| `--state-high` | `#8A2BE2` | `#8A2BE2` | Convergence state only |

Rules:
- Amber/orange: none, ever.
- Lime is never body text on light. `--accent-text` exists for that reason.
- Blue and purple are state colors only (§6). Non-state uses are listed for R4.

---

## 5. Phase R2 — Light values and the switch

1. Add `:root[data-theme="light"] { … }` to `tokens.css` with every light value from §4.
2. Switch: `document.documentElement.dataset.theme = 'light' | 'dark'`.
   - Source of truth: a setting in `src/components/settings/settingspanel.jsx` (navMode 'settings'), persisted the same way other guest settings are persisted (reuse the existing guest-state mechanism, do not add a new store — CLAUDE.md §2).
   - Testing override: `?theme=light` query parameter.
   - Default: `dark`.
3. Iframes (`structure-field.html`, `krylo2-feed.html`): parent posts `{ type: 'krylo-theme', theme }` on load and on change; iframe sets its own `data-theme`. Iframe also reads `?theme=` on load so it never flashes the wrong theme.
4. `onThemeChange` subscribers redraw canvases and re-apply Three.js materials.

---

## 6. Surfaces and order

Order follows the CLAUDE.md §3 layer list, largest literal counts first within each group. Counts are from `main` (Appendix A).

| Group | Files (literal count) | Notes |
|---|---|---|
| G1 Shell | `src/app.jsx` (67), `public/krylo2-feed.html` (268), `src/components/spine/campaignfunnel.jsx` | Sidebar iframe needs the theme message (§5.3) |
| G2 Analysis | `analysisidlefield.jsx` (135), `intelligencebrief.jsx` (148), `analysisfield.jsx` (91), `targetpacket.jsx` (53), `actionmatrix.jsx` (38), `ingestionbuilder.jsx` (39), `metricstrip.jsx`, `statedistribution.jsx`, `recondashboard.jsx`, other `src/components/analysis/*` | Reference: `analysis-history-light.html`, `analysis-explore-light.html` |
| G3 MAP | `public/structure-field.html` (61), `structurepanel.jsx` | Canvas: use `token()`. Reference: `map-hub-light.html`. Rail change-mark colors are a §6 conflict (D-R4) |
| G4 Surface | `src/components/spine/conemap.jsx` (113), `analysisfield.jsx` overlays | Three.js; bloom (D-R3). Reference: `surface-cones-light.html` |
| G5 Oracle / Signal | `oracleview.jsx` (74), `spinemap.jsx` (114), `oracleview_v2.jsx` (58) | Canvas/SVG |
| G6 Bays | `historybay.jsx` (49), `workstation.jsx`, `feedsbay.jsx`, `artifactsbay.jsx`, `communityview.jsx`, `settingspanel.jsx`, `coachwell.jsx`, `auditworkspace.jsx` (49), `attentionstack.jsx` (54), `bayvisor.jsx` (37) | |
| G7 Engine-emitted colors | `src/engine/querysynthesis.js` (53 lime-as-color uses), any engine file returning colors | Engine output must return **token names or state keys**, not hex, so the UI resolves them per theme |

Canvas/WebGL files that need `token()` rather than `var()` (on `main`): `structure-field.html`, `conemap.jsx`, `clusterfield.jsx`, `leveragelattice.jsx`, `oraclelens.jsx`, `signalmaplayer.jsx`, `eqcanvas.jsx`, `projectioncanvas.jsx`, `analysissubstrate.jsx`, `searchprofile.jsx`, `signalfield.jsx`, `signalfield_xs.jsx`, `public/signalmap.html`.

---

## 7. Phase R3 — Light-specific fixes

| Issue | Rule | Reference |
|---|---|---|
| Lime used as text (≈150+ uses; top: `querysynthesis.js`, `intelligencebrief.jsx`, `bayvisor.jsx`, `analysisidlefield.jsx`) | Switch to `--accent-text`; keep emphasis with a lime underline or lime marker square | All `*-light.html` mockups |
| Lime/gray lines on light | Draw `--casing` under the colored line | `map-hub-light.html`, `surface-cones-light.html` |
| Glow / bloom (`BUILDING` soft bloom, `HIGH` restrained bloom) | Not visible on light. D-R3 decides: drop on light, or replace with a halo ring | `surface-cones-light.html` (no bloom) |
| `LOW SIGNAL YIELD` (#1a1a1a) | Readable on light; on dark keep its outline | — |
| Shadows | Light only: `0 6px 18px rgba(26,26,26,.08)` on floating panels (dropdowns, popovers) | `analysis-explore-light.html` |
| Report typography (§7) | Unchanged: Georgia 28 / Plex Mono 15 / Plex Mono 11.5 | — |

---

## 8. Founder decisions required

| ID | Decision | Blocks |
|---|---|---|
| D-R1 | Approve light palette as a §6 amendment: `#F5F5F7` ground, `#1A1A1A` text, `#e0e0dc` lines, `#3a3d4a` secondary; lime as fill only. | R5 |
| D-R2 | Where the theme switch lives for guests (Settings only, or not exposed until R5). | R2 |
| D-R3 | Surface cones on light: redesign per `surface-cones-light.html` (ink casing, no bloom), or keep the 3D scene on black inside the light app. | G4 in R3 |
| D-R4 | MAP rail change marks currently use lime/blue/purple for STRENGTHENING/WEAKENING/RECONFIGURATION (`structure-field.html:179-182`); replace with shape-only encoding. | G3 in R3/R4 |
| D-R5 | Later consolidation of the white-alpha ladder into fewer steps. | After R5 |

---

## 9. Acceptance (Definition of Done)

1. **R1:** before/after screenshots match on every surface in §6; zero color literals outside `tokens.css` in completed groups; QA scripts pass.
2. **R2:** `?theme=light` and the setting both switch every surface, including both iframes and all canvases, without reload; default remains dark.
3. **R3:** every surface reviewed on Dev in light; no lime body text; no amber; blue/purple appear only as state.
4. **Contrast:** body text ≥ 4.5:1 and large text/UI ≥ 3:1 against its ground in light (WCAG 2.1 AA). Any `--fg-aNN` text token that fails is raised to the nearest passing alpha **in light only**, recorded in the ticket.
5. **§7 type contract** unchanged.
6. **BAU:** no behavior, data, or reachability change in R1–R4 (presentation only).
7. **R5:** Founder go recorded; deploy follows §22/§23.

---

## Appendix A — Inventory (from `origin/main` 8afe082; re-run on core branch)

### A.1 Commands

```bash
# files with color literals
git grep -IlE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" -- 'src/*' 'public/*.html'
# per-file counts
git grep -IcE "#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b|rgba?\(" -- 'src/*' 'public/*.html' | sort -t: -k2 -rn
# most common values
git grep -IohE "#[0-9A-Fa-f]{6}\b|rgba?\([^)]*\)" -- 'src/*' 'public/*.html' | tr 'a-f' 'A-F' | sed 's/ //g' | sort | uniq -c | sort -rn | head -40
# lime used as text
git grep -IcE "color: *(LIME|'#66FF00'|\"#66FF00\"|var\(--signal-lime\))" -- src public | sort -t: -k2 -rn
```

### A.2 Totals on `main`

3,468 literals in 130 files.

### A.3 Most common values

`#66FF00` 360 · `rgba(255,255,255,0.2)` 100 · `0.3` 95 · `0.25` 88 · `0.06` 74 · `0.35` 69 · `#007FFF` 67 · `0.08` 66 · `0.18` 65 · `#FFFFFF` 63 · `#000000` 59 · `0.15` 54 · `0.07` 54 · `0.4` 53 · `0.12` 52 · `0.5` 47 · `0.1` 47 · `0.05` 42 · `#8A2BE2` 41 · `#1A1A1A` 40.

### A.4 Possibly unused (lexical check only — verify before excluding)

`public/krylo-feed2.html` (251 literals), `src/app copy.jsx` (54), `src/components/tenkvault.jsx` (54). No reference by file name was found on `main`. Run the concept and behavioral checks (CLAUDE.md §1) before excluding them from scope. Do not delete them in this project.

### A.5 Blue used outside state (candidates for R4)

Files containing `#007FFF` / `0,127,255` on `main` include `historybay.jsx` (stat tiles alternate lime/blue; DRIFT tag blue), `metricstrip.jsx`, `communitychatboard.jsx`, `targetpacket.jsx`, `whythismatters.jsx`, `perceptionrisk.jsx` and others. Each use must be classified: convergence state (keep) or decoration (replace).

---

## Appendix B — R3 checklist from the light preview review (2026-10-20)

Source: Founder-relayed review of the light preview recording, cross-checked by the build agent in its own preview. Input only, not a go. Ticket assignment (KRYL-1459 to 1463, 1466) is the Founder's call.

| # | Item | Status in build agent's preview | Group / ticket type |
|---|------|------|------|
| 1 | Top bar, left menu (`krylo2-feed.html`) and bottom status bar stay dark around light panels. The ANALYSIS strip is already light. | Confirmed | G1 Shell |
| 2 | Lime used as text on light is unreadable: EDGE?, BEFORE THEY BECOME OBVIOUS, KRYLO, green section labels, Refresh analysis, LIVE pill, checkbox labels, world clocks. Switch text uses to `--accent-text`; keep lime for fills and underlines. | Confirmed | All groups, **including G7**: engine code (e.g. `src/engine/querysynthesis.js`, 53 lime-as-color uses on `main`) must return a token name or state key, not a hex value, or the UI cannot theme it |
| 3 | Faint text (subtitle "Map structural relationships across entities", Signal scope and Output labels). Raise the text token in light only until it passes §9.4 contrast. | Confirmed | G2 Analysis |
| 4 | MAP relationship lines (lime) have no dark outline on light. Draw `--casing` under them. | Not yet checked | G3 MAP |
| 5 | In dark mode the question box is light gray. **Check against the commit before R1 first**: if it was already light gray, it is the original look and not a defect. | Not yet checked | G2 Analysis (only if a regression) |
| 6 | Loading screen: empty light panels with faint lime LOADING text. | Not yet checked | G2 Analysis |
| 7 | Bottom status bar covers page content (both themes). **Layout defect, not color** — file as its own small ticket, outside the reskin. | Dark: pre-existing. Light: dark gray strip | Separate DEF ticket |

Already fixed in R2 (build agent, 2026-10-20): 14 near-black hex-named tokens (e.g. `--c-05070a`) were left dark by the light rule and covered the landing; now mapped to the light surface. Dark values unchanged.

Rule for every remaining hex-named token (`--c-xxxxxx`): acceptable in R1 (no visual change), but before R3 sign-off each must be assigned a **role** (surface, text, line, state, accent) so its light value comes from §4, not from the old hex.
