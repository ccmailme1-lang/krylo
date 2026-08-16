# Session Handoff — 2026-08-16 — Marquee Screen / Sandbox Correction

## What went wrong this session
Founder explicitly asked to use the Artifact sandbox to design the new "Marquee screen"
(gate/login redesign). Agent started that (loaded `artifact-design` skill, pulled real
`SLIDES` content + fonts from `krylo2-feed.html`), got interrupted by an unrelated request
("move domain insights to the left column"), executed that directly against localhost, and
then continued a long rapid-fire tuning loop (position/width/font-size nudges) directly in
live code with a full build+restart cycle on every single tweak instead of moving to the
sandbox. Founder called this out hard, twice. **Do not repeat this**: any further visual/
layout/position/scale iteration on this or related screens happens in an Artifact (HTML
sandbox), never as direct edits to files under `src/` with rebuild-per-tweak.

## Current real (uncommitted, localhost-only, NOT deployed) state
`src/components/surface/observestoryview.jsx` has uncommitted changes — confirmed via
`git status`/`git diff --stat`: 42 insertions, 12 deletions, only this file touched.
`index.html` has NO uncommitted changes (an earlier Bebas Neue `<link>` edit was rejected
by the Founder and never applied — correctly, since it introduced an unrequested new font
dependency instead of executing the literal ask).

Changes made to `observestoryview.jsx` this session (all still live only on `localhost:5173`,
never deployed):
1. Content rotation added to `buildNarrative()` — day-keyed rotation among 3 real, grounded
   framings (aggregate / lead-mover / relationship-pair) for the `stable.length >= 2` case.
   Fixes the original complaint ("banner text hasn't changed in 8 days").
2. Eyebrow label "What changed" renamed to "Quick read", font-size matched to the "Full
   read — tap a domain above" label (9px).
3. Position/scale of the "Quick Read" block tuned live, in this order, per Founder direction,
   ending at: `top: 100, left: 0, width: 680`; headline `fontSize: 43` (Georgia serif, per
   §30 — NOT swapped to Bebas Neue, that was correctly rejected), `maxWidth: 680`.
   **This tuning was happening in the wrong place (live code) and should be redone/verified
   in the sandbox before being considered final.**

## KRYL-1190 — Marquee Screen spec ticket (Jira)
Filed, with a follow-up comment (id 11838) added via new `scripts/jira-add-comment.mjs`.
Status: SPEC / DISCUSSION CAPTURE, not built.
- **Decision A — RESOLVED**: the Hero Headline Rotation (`SLIDES` array, `public/
  krylo2-feed.html`, "Hero Headline Rotation" section, ~line 3250-3327) moves fully off
  Layer 1 — becomes exclusive content of the new Marquee/gate screen, ahead of Layer 1.
- **Navigation flow (Founder-directed)**: `localhost:5173` → Home Screen = Marquee page
  (relocated Hero Headline Rotation + repositioned login) → on login → Surface view.
  Recommendation given (not yet built): no page/iframe reset on login — `GuestGate` already
  works by conditionally rendering `{children}` once `authed` (guestgate.jsx:42), and the
  underlying `App` already defaults to `navMode: 'surface'` (app.jsx:702). Avoid a reset-style
  transition — this codebase has an existing, still-open incident (**DEF-2087**) where
  reloading the `krylo2-feed.html` iframe caused a visible flash / could get stuck at opacity 0.
- **Ticker/ribbon (domain/cone data bar, `src/data/ribbonSchema.js`) is explicitly OUT of
  scope** — Founder confirmed directly it stays on its current surface, does not move.
- **Decision B — STILL OPEN**: wire `GuestGate` into `main.jsx` live on localhost now
  (testable end to end, still not deployed to krylo.org without separate explicit ask), or
  build/style it standalone first without mounting into the root tree. Not resolved.
- `GuestGate.jsx` is real but currently **orphaned** — zero imports anywhere in `src/`,
  confirmed via repo-wide grep and reading `main.jsx`'s actual tree (`PrismProvider >
  SurfaceProvider > App`, no GuestGate). Git history: `bf0df61` removed the guest account
  after a temporary testing-access gate expired 2026-06-29. Krylo.org currently has no
  in-app sign-in gate at all.

## Assets already gathered for the sandbox build (reusable, no need to re-derive)
- Real Hero Headline Rotation content + exact mechanics, `public/krylo2-feed.html`:
  - 3 real `SLIDES`: "IDENTIFYING OPTIMAL POSITIONS WITHIN EVOLVING SYSTEMS" (hold 5000ms),
    the Archimedes lever quote (hold 7000ms), the "Leverage is..." definition (hold 6000ms).
  - `wrapAt()` word-wrap logic (27-char line limit, preserves color spans).
  - Rotation transition: fade out 0.2s ease-in + translateY(-8px), swap content, fade in
    0.7s cubic-bezier(0.4,0,0.2,1) + translateY(0 from 12px).
  - Real CSS: `.hero-copy-headline { font-family:'Bebas Neue', sans-serif; font-size:2.4vw;
    line-height:0.9; text-transform:uppercase; }`, `.lime{#66FF00}`, `.white{#FFFFFF}`,
    `.attribution{font-size:70%}`. Bebas Neue is loaded via Google Fonts CDN link in
    `krylo2-feed.html` only — **not** available to the main React app (`index.html` only
    loads IBM Plex Mono). A real Bebas Neue import would be a deliberate addition, not
    assumed — confirm with Founder before adding it anywhere outside the sandbox.
  - There is a `.elephant-video` element (`#hero-vid`, `Elephant_Animation_Scale_Correction_
    5.mp4`) but its CSS is currently `display:none` — not active, relevant to the "eventually
    there will be a video there" comment.
- `GuestGate.jsx` current styling (black bg, `#66FF00` lime borders/text, IBM Plex Mono,
  centered credential box: USERNAME / ACCESS CODE / ENTER) — to be repositioned top-right
  per Founder direction, main surface freed for the relocated marquee content.
- IBM Plex Mono 400 + 700 woff2 files were base64-encoded to scratchpad (session-scoped,
  gone next session) for embedding in the sandbox artifact — re-encode from
  `node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{400,700}-normal.woff2`
  if needed again.
- New reusable script: `scripts/jira-add-comment.mjs` (mirrors `jira-create-issue.mjs`'s
  secret-safe credential pattern — never prints `specs/jira.md` contents or parsed values).

## Explicit instruction going forward
All Marquee-screen visual design (login position, headline scale, layout, AV placeholder)
happens in an Artifact/HTML sandbox from here — not live edits to `src/` files. Only move a
design into real code once the Founder has approved it in the sandbox.

## Not done
- Sandbox artifact itself was never actually published this session — got derailed before
  the first version was built. Assets above are ready; the artifact still needs to be written.
- Decision B (wire GuestGate live or not) unresolved.
- The `observestoryview.jsx` position/scale tuning above should be treated as unverified
  live-code experimentation, not a finished result — re-derive/confirm in the sandbox.
