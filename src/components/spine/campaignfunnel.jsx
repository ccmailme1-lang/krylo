// src/components/spine/campaignfunnel.jsx
// WO-256 — Campaign funnel: krylo2-feed.html in iframe
// WO-256 — Marquee: sends live HN signal titles to iframe via postMessage
// WO-259 — records prop: sends krylo-records to iframe for pill ranking
// WO-294 — krylo-submit owned by PrismContext; CampaignFunnel is display-only

import React, { useEffect, useRef } from 'react';


export default function CampaignFunnel({ signals, records, iframeRef: externalRef, src = '/krylo2-feed.html', onCat, onProxy }) {
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
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src={src}
        title="KRYLO Campaign"
        onLoad={handleLoad}
        scrolling="no"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 0, background: 'transparent', overflow: 'hidden' }}
      />

    </div>
  );
}
