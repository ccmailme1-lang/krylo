# AGENT TRANSFER — 2026-07-28

BASELINE SHA: 7639af8
DEPLOYED: krylo.org — yes, health check passed 19:24:50 GMT, this is the live state.
UNCOMMITTED: none from this session. Pre-existing untracked files in git status
(CLAUDE.md.bak2.md, baseline_v63/, docs/*.pdf, specs/* misc, src/engine/domainbrief*.js,
triage/, etc.) were not touched this session — leave them alone unless told otherwise.

## What shipped this session (commits, in order)

1. `7025d4e` — GAP-24 fix #1: `analysisidlefield.jsx` was setting `tensor.domainLock` from
   the raw 8-pill UI key (e.g. `"FINANCIAL"`) instead of the already-mapped canonical domain
   (`selectedLockedDomain`, via `ANALYSIS_PILL_TO_DOMAIN`). Any query submitted with a domain
   pill selected bypassed real classification and fell through to GENERAL.

2. `5c29fb4` — GAP-24 fix #2 (the real remaining bug): `resolvePrimary()` in
   `querysynthesis.js` treated bare `\blease\b` as sufficient on its own to classify AUTO —
   no vehicle-context word required. "My lease expires in September..." (a housing lease)
   matched AUTO before REAL_ESTATE was ever checked, producing car-loan/dealer-financing
   output for a housing query. Fixed: `lease` now only counts toward AUTO when it co-occurs
   with an explicit vehicle word. Confirmed via live diagnostic output before the fix
   (`Domain: AUTO` + car-dealer financing brief for the housing-lease test query).
   Same commit: sticky-note right-click context menu's "Delete" text was still red — missed
   when the confirm-dialog button was fixed to lime earlier. Now matches.

3. `4e98307` — Removed the header "Export Brief" button (krylo2-feed.html) added earlier this
   session. Founder decision: the button stays ONLY in its original location (BRIEF panel,
   next to HAPPY PATH, `intelligencebrief.jsx`) — the header copy was a duplicate and was
   never wanted as a permanent fixture. Removed the button markup + script from
   krylo2-feed.html and the two relay hooks in app.jsx (`krylo-export-trigger` passthrough,
   `krylo-export-state-update` listener) and intelligencebrief.jsx that only existed to wire
   the header copy. **If a header Export Brief button reappears in a future request, check
   git blame before rebuilding — this was explicitly rejected once already.**

4. `7639af8` — Two fixes on the original (kept) button in `intelligencebrief.jsx`:
   - Visual: the HAPPY PATH/Export Brief row had no background, so an element behind it (not
     yet identified — suspected the event-stream timeline strip) showed through and visually
     collided with the button ("NOW" text overlapping "EXPORT BRIEF" in screenshots). Fixed
     by giving that row `background: '#000', position: 'relative', zIndex: 5` — containment
     fix, doesn't touch whatever the other element actually is.
   - Functional, explicit Founder directive: the button must be **always clickable**, gated
     ONLY on the premium paywall (`premiumLocked`) — NOT on the Fs/completeness score or
     `structuralAbsence` (`canExport()`/`exportUnlocked`). `handleExport()` now only checks
     `session` exists. **This is a deliberate, explicit divergence from `canExport()`'s
     §22 grounded-or-withhold gate for this one button only** — `canExport()` itself is
     unchanged and still enforced everywhere else it's called. Do not "fix" this back to
     using `exportUnlocked` without a new explicit instruction — it was requested directly,
     multiple times, in this exact session.

## What `triggerDownload()` actually does (confirmed real, not a stub)

`src/engine/consultingexport.js` — `handleExport()` → `buildBrief()` → `buildExportPayload()`
→ `triggerDownload(payload)`: builds a real JSON Blob, creates an anchor with `download=`,
`.click()`s it. This is a real browser file-download trigger, not a placeholder.

## Open / unverified

- The visual overlap fix (containment via z-index/background) was not confirmed against the
  actual other element — I contained it rather than identifying and fixing the source
  component. If it recurs elsewhere on the same row, the real culprit still needs to be found.
- Whether `selectedDomains` (pill selection state, `analysisidlefield.jsx`) persists across
  unrelated queries within a session ("sticky" pills) was flagged earlier this session as a
  separate, unconfirmed question — not investigated, not in scope of tonight's fixes.
- GAP-24 diagnostic `console.log('[GAP-24 DIAGNOSTIC]', ...)` is still live in
  `querysynthesis.js` (added in `cc1bb1e`). Remove once the Founder confirms GAP-24 is fully
  closed on live retest — it has its own removal note in the code.
- Decision Input Contract (DIC) pilot (`32107a8`, REAL_ESTATE/homePurchase only) is deployed
  and was confirmed reachable live this session (INSUFFICIENT_INPUT card rendering correctly
  for a real Cary/NC relocation query) — but has not been stress-tested beyond that one query.

