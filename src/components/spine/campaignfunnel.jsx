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
// .opportunity-ribbon { top:49px }. 104px keeps nav + ribbon fully visible + clickable.
const CHROME_TOP_PX  = 104;   // nav (48) + Opportunity Ribbon
const CHROME_LEFT_PX = 80;     // .left-nav width
const LEFT_NAV_TOP_PX = 48;    // .left-nav starts below the 48px nav bar (krylo2-feed.html)
// krylo2-feed.html also has .bottom-surface (position:fixed; bottom:0; height:30vh) — a
// full-width overlay whose cards are flex-end (right edge), invisible in the left 80px in
// the normal full-screen iframe. In the narrow 80px chrome iframe a 300px card overflows
// left and bleeds into the left-nav column. Clip iframe #2's bottom 30vh so it renders
// ONLY the left-nav region. Recovered from commit 68b510c (2026-09-04), orphaned off this
// branch by an earlier rollback -- reapplied 2026-09-05 in place of a wider width-based fix.
const LEFT_NAV_BOTTOM_VH = 30;
const TOP_CLIP  = `inset(0 0 calc(100% - ${CHROME_TOP_PX}px) 0)`;   // rectangular — top strip only
const LEFT_CLIP = `inset(${LEFT_NAV_TOP_PX}px 0 ${LEFT_NAV_BOTTOM_VH}vh 0)`; // rectangular — left-nav region only (no nav bar, no bottom-surface bleed)

// left-nav order in krylo2-feed.html → the mode each posts (see setMode there)
const LNAV_MODES = ['surface', 'analysis', 'structure', 'feeds', 'community', 'history'];

export default function CampaignFunnel({ signals, records, iframeRef: externalRef, src = '/krylo2-feed.html', restrictToChrome = false, navMode, onCat, onProxy }) {
  const internalRef = useRef(null);
  const iframeRef   = externalRef ?? internalRef;
  const leftNavRef  = useRef(null);
  const iframeReady = useRef(false);

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
      const idx = LNAV_MODES.indexOf(navMode);
      if (idx !== -1 && items[idx]) items[idx].classList.add('active');
    } catch { /* iframe not ready — ignore */ }
  };

  useEffect(() => {
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
      if (mode) window.postMessage({ type: 'krylo-nav', mode }, '*');
    } catch { /* iframe not ready — ignore */ }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* iframe #1 — the real feed page. Full viewport normally; on the engaged surface
          view, RECTANGULAR-clipped to the top strip (nav + ribbon). No shaped clip. */}
      <iframe
        ref={iframeRef}
        src={`${src}?v=20260615`}
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
            src={`${src}?v=20260615`}
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
