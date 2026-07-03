// src/components/spine/campaignfunnel.jsx
// WO-256 — Campaign funnel: krylo2-feed.html in iframe
// WO-256 — Marquee: sends live HN signal titles to iframe via postMessage
// WO-259 — records prop: sends krylo-records to iframe for pill ranking
// WO-294 — krylo-submit owned by PrismContext; CampaignFunnel is display-only
// DEF — restrictToChrome: this iframe is full-viewport and always mounted, which
// meant it sat on top of AnalysisField's cones (z:0 vs iframe's z:10) and captured
// every click across the whole screen — cones never received a pointer event.
// Fix: once the user is engaged with the cone/Surface view (restrictToChrome),
// clip the iframe's hit-testable region down to just the header (48px) + left-nav
// (80px) strip via clip-path (excluded regions are not hit-tested in modern
// browsers) so clicks pass through to the cones everywhere else. The wrapper divs
// (here and in app.jsx) are pointerEvents:none — they have no content of their
// own; only the iframe itself should ever capture a click.

import React, { useEffect, useRef } from 'react';

// Matches public/krylo2-feed.html: .krylo-nav { height:48px }, .left-nav { width:80px }
const CHROME_CLIP = 'polygon(0 0, 100% 0, 100% 48px, 80px 48px, 80px 100%, 0 100%)';

export default function CampaignFunnel({ signals, records, iframeRef: externalRef, src = '/krylo2-feed.html', restrictToChrome = false, onCat, onProxy }) {
  const internalRef = useRef(null);
  const iframeRef   = externalRef ?? internalRef;
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

  const handleLoad = () => {
    iframeReady.current = true;
    if (!iframeRef.current) return;
    if (signals?.length) {
      const titles = signals.map(s => (s.truth_statement ?? s.title ?? s.text ?? '').trim()).filter(Boolean);
      if (titles.length) iframeRef.current.contentWindow.postMessage({ type: 'krylo-marquee', titles }, '*');
    }
    if (records?.length) iframeRef.current.contentWindow.postMessage({ type: 'krylo-records', records }, '*');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
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
          clipPath: restrictToChrome ? CHROME_CLIP : 'none',
        }}
      />
    </div>
  );
}
