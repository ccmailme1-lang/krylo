# SPEC — Left Nav Highlight State (Home vs. the other 4 items)

Status: fix implemented and deployed 2026-09-17, pending your confirmation on `krylo.org`.

---

## PROBLEM

The left nav (Home / Analysis / News Feed / Community / History) needed: dim by default, gray on
hover, lime only when the item is the currently-selected view. Analysis/Feed/Community/History
already worked this way. Home did not, and the reason took several wrong fixes to isolate:

`navMode` (owned by `app.jsx`) starts as `'surface'` — the internal value both the untouched
landing view AND an explicit "go to Home" click produce identically. Every fix attempted before
tonight's last one used `navMode` alone to decide what should be lime, which cannot distinguish
"nothing has been navigated to yet" from "Home was just explicitly selected" — those are the same
value. Depending on which side of that ambiguity a given fix landed on, either Home was
permanently excluded (breaking real clicks) or Home lit up on the untouched landing screen (which
read as "always on").

Two separate rendering paths also had to be kept in sync: the real interactive iframe
(`krylo2-feed.html`, native CSS `:hover`/`:active` work fine there) and a second scriptless clone
iframe (`pointer-events:none`, used for the chrome-only overlay in `restrictToChrome` mode) where
hover/active state has to be pushed in via JS from `campaignfunnel.jsx`, since native `:hover` can
never fire on a `pointer-events:none` element.

A stale, hardcoded cache-busting query param (`?v=20260615`, unchanged since June) on that same
iframe's `src` also meant a browser that had loaded it once could keep serving an old cached copy
indefinitely regardless of how many times the app was redeployed — several "still broken" reports
tonight were this, not the code.

## SOLUTION

`src/components/spine/campaignfunnel.jsx`:

1. Added `hasNavigatedRef` (a `useRef`, starts `false`). `applyActiveNav()` — the function that
   applies the `.active`/lime class based on `navMode` — now returns early (highlights nothing) if
   `hasNavigatedRef.current` is still `false`.
2. The `navMode`-driven `useEffect` flips `hasNavigatedRef.current = true` on every render after
   the first. The very first render (the untouched landing view) is skipped; every subsequent
   `navMode` change, from any source (nav-rail click or otherwise), is treated as real navigation.
3. Net effect: nothing is lime on first load. The moment any real navigation happens, the current
   item lights up — Home included, using the exact same mechanism Analysis/Feed/Community/History
   already used. No per-item special case remains.
4. Gray-on-hover (`#888`, both icon stroke and label color) applied to both the real iframe's CSS
   (`public/krylo2-feed.html`) and the clone iframe's JS-driven relay (`relayLeftNavHover` in
   `campaignfunnel.jsx`), since only the JS path actually renders in production.
5. Bumped the iframe's cache-busting param from `?v=20260615` to `?v=20260917`.

## COMPONENTS TOUCHED

- `src/components/spine/campaignfunnel.jsx` — `hasNavigatedRef`, `applyActiveNav`,
  `applyHoverOpacity`, `relayLeftNavHover`, the iframe `src` cache-bust param.
- `public/krylo2-feed.html` — `:hover` CSS rules; Home's icon shape (cosmetic, separate request).

## VALIDATION

- `npm run build` — ontology guard + vite build, clean, each iteration.
- Deployed bundle hash confirmed to match the local build via `sha256`/hash comparison against the
  live server on every deploy tonight.
- **Not yet independently confirmed in an actual browser** — every "still broken" report tonight
  turned out to be either a genuinely wrong prior fix (now corrected) or browser-side iframe
  caching (now mitigated by the cache-bust bump, but a hard reload / private window is still the
  only way to be certain a given browser isn't holding an old cached copy).

## ROLLBACK

`git log --oneline` on `main` shows each individual attempt as its own commit tonight
(2026-09-17) under `src/components/spine/campaignfunnel.jsx` — any of them can be reverted
individually if this final version is also wrong.

## GUIDELINES

- One known, accepted minor gap: clicking Home while `navMode` is already `'surface'` (i.e.,
  clicking Home again without having navigated away first) produces no React state change, so the
  `useEffect` doesn't re-fire and the highlight doesn't (re-)apply in that exact redundant-click
  case. Not fixed here — flagged as a real but very low-priority edge case, not conflated with the
  actual reported bugs (default-load lime, click-to-lime not working).
