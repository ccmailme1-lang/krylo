// src/components/spine/campaignfunnel.jsx
// WO-256 — Campaign funnel: krylo2-feed.html in iframe
// WO-256 — Marquee: sends live HN signal titles to iframe via postMessage
// WO-259 — records prop: sends krylo-records to iframe for pill ranking
// WO-294 — krylo-submit owned by PrismContext; CampaignFunnel is display-only
//
// KRYL-1253 — Rectangular-Chrome Cut-Over.
// The old fix clipped the always-mounted full-viewport iframe to an L
// (clip-path: polygon(...)) so clicks fell through to the cones. A *shaped*
// (non-rectangular) clip-path forces the browser to repaint the whole iframe every
// frame — that is what makes the Opportunity Ribbon's translateX animation jerky
// and steals main-thread budget from the R3F cone loop.
//
// New model — no shaped clip anywhere. On the engaged cone/Surface view:
//   - iframe #1 (the real one — search, marquee, records, ref) is clipped with a
//     RECTANGULAR inset() to just the top strip (nav + Opportunity Ribbon). A
//     rectangle composites cleanly; the ribbon animation is smooth again.
//   - iframe #2 is the SAME page rendered scriptless (sandbox: allow-same-origin,
//     no allow-scripts) as a rectangular left column — the left nav, statically.
//     No second copy of the heavy page JS runs, so the search / message flow is
//     untouched. A thin transparent overlay relays left-nav clicks as krylo-nav.
//   - everything outside those two rectangles: the wrapper is pointer-events:none,
//     so the cone canvas underneath receives the event directly.
// Chrome markup / CSS / animation are untouched — only the compositing + hit-test
// boundary changes.

import React, { useEffect, useRef } from 'react';

// Matches public/krylo2-feed.html: .krylo-nav { height:48px }, .left-nav { width:80px },
// .opportunity-ribbon { top:49px }, .hero-copy-wrap (rotating headline/quotes -- 3 rotating
// slides, SLIDES array in krylo2-feed.html's Hero Headline Rotation script). KRYL-1253's
// rectangular-clip fix sized this for "nav + ribbon" only and never accounted for the hero
// headline sitting just below the ribbon -- collateral clip, never an intended change to that
// ticket's scope. Measured .hero-copy-wrap's bottom edge across all 3 rotating slides directly
// (standalone page): shortest slide bottoms at 342px, the two longer slides both bottom at
// 411px. 360px (the first fix) only covered the shortest slide -- the two longer ones were
// still clipped. 440px covers all 3 with margin; nothing else occupies that band (confirmed
// empty in the standalone page).
const CHROME_TOP_PX  = 440;   // nav (48) + Opportunity Ribbon + hero headline/quotes (tallest of 3 rotating slides)
const CHROME_LEFT_PX = 80;     // .left-nav width
const LEFT_NAV_TOP_PX = 48;    // .left-nav starts below the 48px nav bar (krylo2-feed.html)
// krylo2-feed.html used to also have .bottom-surface (position:fixed; bottom:0; height:30vh) --
// a full-width overlay whose cards were flex-end (right edge), invisible in the left 80px in
// the normal full-screen iframe. In the narrow 80px chrome iframe a 300px card overflowed left
// and bled into the left-nav column, so this clipped iframe #2's bottom 30vh to hide it.
// KRYL-1282 (2026-09-08) removed .bottom-surface from krylo2-feed.html entirely -- there is
// nothing left to bleed, and this clip was silently cutting the .lnav-settings icon (bottom of
// the flex column, pushed there by .lnav-spacer) out of the visible, clipped left-nav area.
// .left-nav itself is a fully self-contained fixed-position column with its own background
// (krylo2-feed.html:360-372), so nothing else can bleed into this region now that the actual
// source is gone -- clipping the bottom at all is no longer necessary.
const LEFT_NAV_BOTTOM_VH = 0;
const TOP_CLIP  = `inset(0 0 calc(100% - ${CHROME_TOP_PX}px) 0)`;   // rectangular — top strip only
const LEFT_CLIP = `inset(${LEFT_NAV_TOP_PX}px 0 ${LEFT_NAV_BOTTOM_VH}vh 0)`; // rectangular — full left-nav column, no bottom clip (KRYL-1282 removed its only reason to exist)

// left-nav order in krylo2-feed.html → the mode each posts (see setMode there)
// Stale until now: had 6 entries (incl. 'structure') from before the FORMATION nav icon was
// removed from krylo2-feed.html's DOM, leaving only 5 .lnav-item elements (home/analysis/feeds/
// community/history). Every index past 'analysis' was off by one against the live DOM --
// clicking News Feed dispatched navMode 'structure' (a removed page), Community dispatched
// 'feeds', History dispatched 'community'. Index 0 stays the literal string 'surface', not
// 'home' -- that's the real navMode value app.jsx's krylo-nav handler and default state
// (useState('surface')) actually use for the Home icon; krylo2-feed.html's own setMode()
// already treats 'home' and 'surface' as the same case (`name === 'surface' || name === 'home'`)
// and posts mode:'surface' either way, so this array must match that, not the DOM's own onclick
// argument spelling.
const LNAV_MODES = ['surface', 'analysis', 'feeds', 'community', 'history'];

export default function CampaignFunnel({ signals, records, iframeRef: externalRef, src = '/krylo2-feed.html', restrictToChrome = false, navMode, onCat, onProxy }) {
  const internalRef = useRef(null);
  const iframeRef   = externalRef ?? internalRef;
  const leftNavRef  = useRef(null);
  const iframeReady = useRef(false);
  const hoveredItemRef = useRef(null); // last .lnav-item hovered inside the scriptless iframe
  // Founder, 2026-09-17: navMode starts as 'surface' (Home) before any real navigation has
  // happened, so the plain idx-match below was lighting Home up on the untouched landing view
  // too -- indistinguishable from an actual click since both produce navMode==='surface'. Skip
  // the very first navMode-driven highlight application (the initial-mount value); every
  // subsequent one is a real navigation event (click or otherwise) and highlights normally,
  // Home included, same as any other item.
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!iframeReady.current || !iframeRef.current || !signals?.length) return;
    const titles = signals
      .map(s => (s.truth_statement ?? s.title ?? s.text ?? '').trim())
      .filter(Boolean);
    if (!titles.length) return;
    iframeRef.current.contentWindow.postMessage({ type: 'krylo-marquee', titles }, '*');
  }, [signals]);

  useEffect(() => {
    if (!iframeReady.current || !iframeRef.current || !records?.length) return;
    iframeRef.current.contentWindow.postMessage({ type: 'krylo-records', records }, '*');
  }, [records]);

  // DEF-1275: krylo2-feed.html's own setMode() only sets .lnav-item.active when a nav icon is
  // clicked INSIDE that iframe -- nothing pushes React's actual navMode back in, so navigating
  // by any other path (e.g. via the cone/report UI) left the highlight showing whatever was
  // last clicked. Applied to BOTH iframes' DOM directly from here, same access pattern
  // relayLeftNav already uses (same-origin contentDocument) -- krylo2-feed.html untouched.
  const applyActiveNav = (doc) => {
    if (!doc) return;
    try {
      const items = doc.querySelectorAll('.lnav-item');
      items.forEach(el => el.classList.remove('active'));
      if (!hasNavigatedRef.current) return; // untouched landing view — nothing highlights yet
      const idx = LNAV_MODES.indexOf(navMode);
      if (idx !== -1 && items[idx]) items[idx].classList.add('active'); // symmetric across all 5 items, Home included
    } catch { /* iframe not ready — ignore */ }
  };

  // Compares against the actual previous navMode value, not "how many times has this effect
  // run" -- React.StrictMode (src/main.jsx) deliberately double-invokes effects in dev, which
  // an invocation-count-based flag misreads as a second real navigation even though navMode
  // never changed value between the two calls. A value-comparison is correct in both dev and
  // production regardless of how many times React chooses to invoke the effect.
  const prevNavModeRef = useRef(navMode);
  useEffect(() => {
    if (navMode !== prevNavModeRef.current) {
      hasNavigatedRef.current = true;
      prevNavModeRef.current = navMode;
    }
    applyActiveNav(iframeRef.current?.contentDocument);
    applyActiveNav(leftNavRef.current?.contentDocument);
  }, [navMode, restrictToChrome]);

  const handleLoad = () => {
    iframeReady.current = true;
    if (!iframeRef.current) return;
    if (signals?.length) {
      const titles = signals.map(s => (s.truth_statement ?? s.title ?? s.text ?? '').trim()).filter(Boolean);
      if (titles.length) iframeRef.current.contentWindow.postMessage({ type: 'krylo-marquee', titles }, '*');
    }
    if (records?.length) iframeRef.current.contentWindow.postMessage({ type: 'krylo-records', records }, '*');
    applyActiveNav(iframeRef.current.contentDocument);
  };

  const handleLeftNavLoad = () => {
    applyActiveNav(leftNavRef.current?.contentDocument);
    // The clone iframe (title="KRYLO left nav") only exists while restrictToChrome
    // (navMode==='surface') is true, so it fully unmounts and remounts every time navMode
    // toggles into/out of 'surface' -- e.g. Analysis -> Home. A fresh iframe's contentDocument
    // can still be mid-navigation for a moment even after its own 'load' event fires; one
    // short defensive re-application covers that gap without waiting on a second real event.
    setTimeout(() => applyActiveNav(leftNavRef.current?.contentDocument), 60);
  };

  // Left-column overlay → krylo-nav. The scriptless iframe #2 renders the nav but can't
  // run its own onclick; figure out which .lnav-item was hit and post the same message.
  const relayLeftNav = (e) => {
    try {
      const doc = leftNavRef.current?.contentDocument;
      if (!doc) return;
      const item = doc.elementFromPoint(e.clientX, e.clientY)?.closest('.lnav-item, .lnav-settings');
      if (!item) return;
      if (item.classList.contains('lnav-settings')) {
        window.postMessage({ type: 'toggle-signal-panel' }, '*');
        return;
      }
      const items = [...doc.querySelectorAll('.lnav-item')];
      const mode = LNAV_MODES[items.indexOf(item)];
      if (mode) {
        // Any left-nav item click (the whole clickable row, not just its icon/label) hides the
        // hero headline/quotes. Real clicks go through this relay, not krylo2-feed.html's own
        // setMode() (it posts krylo-nav straight to the parent) -- so setMode()'s
        // heroCopy.style.opacity='0' branch never actually runs for a real click. Applied
        // directly here, same-origin DOM access, same pattern applyActiveNav already uses below.
        const realDoc = iframeRef.current?.contentDocument;
        const heroCopy = realDoc?.querySelector('.hero-copy-wrap');
        if (heroCopy) {
          heroCopy.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          heroCopy.style.opacity = '0';
          heroCopy.style.transform = 'translateY(40px)';
          heroCopy.style.pointerEvents = 'none';
        }
        // An explicit click is real navigation even when the clicked item is already the
        // current navMode value (e.g. clicking Surface while already on Surface, which is
        // navMode's own initial default) -- the [navMode, restrictToChrome] effect only fires
        // on an actual value change, so it would never mark this as "navigated" on its own and
        // the click would silently do nothing visually. Mark it here, at the click itself.
        hasNavigatedRef.current = true;
        applyActiveNav(iframeRef.current?.contentDocument);
        applyActiveNav(leftNavRef.current?.contentDocument);
        window.postMessage({ type: 'krylo-nav', mode }, '*');
      }
    } catch { /* iframe not ready — ignore */ }
  };

  // Left-nav hover relay — the transparent hit-layer div above (pointerEvents:auto) is what
  // the cursor actually touches; iframe #2 underneath is pointerEvents:none, so its own
  // .lnav-item:hover CSS and native title tooltips never fire no matter what markup it has.
  // Mirrors relayLeftNav's elementFromPoint lookup, but drives the visual/tooltip from here
  // instead of relying on the iframe to receive the event it structurally can't receive.
  // Direct style/attribute writes (a ref, not React state) — no re-render per mousemove.
  // Gray on hover, lime when selected (Founder, 2026-09-17) — the clone iframe is
  // pointerEvents:none so krylo2-feed.html's own :hover CSS never fires here; hover has to be
  // driven from this relay instead, same reason relayLeftNavHover exists at all. Inline styles
  // are cleared (not left blank-but-present) on leave so the .active CSS rule in krylo2-feed.html
  // still governs the lime state cleanly.
  const applyHoverOpacity = (item) => {
    if (!item) return;
    const active = item.classList.contains('active');
    item.style.opacity = active ? '1' : '0.3';
    const svg = item.querySelector('svg');
    const label = item.querySelector('.lnav-label');
    if (svg) svg.style.stroke = '';
    if (label) label.style.color = '';
  };
  const relayLeftNavHover = (e) => {
    try {
      const doc = leftNavRef.current?.contentDocument;
      if (!doc) return;
      const item = doc.elementFromPoint(e.clientX, e.clientY)?.closest('.lnav-item') ?? null;
      if (item === hoveredItemRef.current) return;
      applyHoverOpacity(hoveredItemRef.current);
      hoveredItemRef.current = item;
      if (item && !item.classList.contains('active')) {
        item.style.opacity = '1';
        const svg = item.querySelector('svg');
        const label = item.querySelector('.lnav-label');
        if (svg) svg.style.stroke = '#888';
        if (label) label.style.color = '#888';
      }
      e.currentTarget.title = item?.getAttribute('title') ?? '';
    } catch { /* iframe not ready — ignore */ }
  };
  const relayLeftNavLeave = (e) => {
    applyHoverOpacity(hoveredItemRef.current);
    hoveredItemRef.current = null;
    e.currentTarget.title = '';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* iframe #1 — the real feed page. Full viewport normally; on the engaged surface
          view, RECTANGULAR-clipped to the top strip (nav + ribbon). No shaped clip. */}
      <iframe
        ref={iframeRef}
        src={`${src}?v=20260917`}
        title="KRYLO Campaign"
        onLoad={handleLoad}
        scrolling="no"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none',
          zIndex: 0, background: 'transparent', overflow: 'hidden',
          pointerEvents: 'auto',
          clipPath: restrictToChrome ? TOP_CLIP : 'none',
        }}
      />

      {restrictToChrome && (
        <>
          {/* iframe #2 — same page, SCRIPTLESS, as a rectangular left column (left nav only). */}
          <iframe
            ref={leftNavRef}
            src={`${src}?v=20260917`}
            title="KRYLO left nav"
            onLoad={handleLeftNavLoad}
            scrolling="no"
            sandbox="allow-same-origin"
            aria-hidden="true"
            style={{
              position: 'fixed', top: 0, left: 0, border: 'none',
              width: CHROME_LEFT_PX, height: '100%',
              zIndex: 1, background: 'transparent', overflow: 'hidden',
              pointerEvents: 'none',
              clipPath: LEFT_CLIP,   // rectangular — show only .left-nav (hide nav bar + bottom-surface)
            }}
          />
          {/* transparent hit layer over the left nav → relays nav clicks */}
          <div
            onClick={relayLeftNav}
            onMouseMove={relayLeftNavHover}
            onMouseLeave={relayLeftNavLeave}
            style={{
              position: 'fixed', top: LEFT_NAV_TOP_PX, left: 0,
              width: CHROME_LEFT_PX, height: `calc(100% - ${LEFT_NAV_TOP_PX}px)`,
              zIndex: 2, pointerEvents: 'auto', background: 'transparent',
            }}
          />
        </>
      )}
    </div>
  );
}
