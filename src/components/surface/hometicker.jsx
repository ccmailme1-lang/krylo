// hometicker.jsx — KRYL-1251.
// A copy of the NEWS FEED live ticker (feedsbay.jsx LiveTicker), mounted on the
// Home / surface view. Self-contained: its own /api/news fetch and MOCK fallback,
// same subjects as the NEWS FEED page. feedsbay.jsx is not touched.
//
// One deliberate difference from the source, per Founder: ordering is
// deterministic — published_at DESC — not the NEWS FEED ticker's random fs sort.

import React, { useState, useEffect } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const LIME  = '#66FF00';
const TEXT  = 'rgba(255,255,255,0.92)';
const RULE  = 'rgba(255,255,255,0.10)';
const RULE2 = 'rgba(255,255,255,0.20)';

const CONE_TO_FEED = {
  capital: 'FINANCIAL', ownership: 'MARKET', media: 'MARKET',
  labor: 'CAREER', technology: 'TECHNOLOGY', knowledge: 'TECHNOLOGY',
};

const MOCK = [
  { id: 1, type: 'FINANCIAL',  title: 'Rate compression signals detected across regional banking sector as Federal Reserve holds rates steady', source: 'Signal Intelligence', time: '09:41Z' },
  { id: 2, type: 'MARKET',     title: 'Equity overhang detected prior to Series B close — insider activity flagged across three portfolio firms', source: 'Market Desk', time: '09:35Z' },
  { id: 3, type: 'LEGAL',      title: 'Court filing contradicts public narrative on revenue recognition — restructuring mechanism confirmed', source: 'Legal Wire', time: '09:28Z' },
  { id: 4, type: 'CAREER',     title: 'Labor market tightening in high-skill verticals accelerates — talent exodus pattern matches P2 telemetry', source: 'Career Signal', time: '09:20Z' },
  { id: 5, type: 'TECHNOLOGY', title: 'Supply chain pressure building in semiconductor vertical — lead times extend to 28 weeks', source: 'Tech Monitor', time: '09:14Z' },
  { id: 6, type: 'LEGAL',      title: 'Debt instrument obscured via SPV — mechanism confirmed across four jurisdictions', source: 'Legal Wire', time: '09:08Z' },
  { id: 7, type: 'FINANCIAL',  title: 'Board-level friction signal detected — COO departure imminent based on behavioral pattern analysis', source: 'Signal Intelligence', time: '08:57Z' },
  { id: 8, type: 'MARKET',     title: 'Commodity index divergence signals demand compression in three key industrial sectors', source: 'Market Desk', time: '08:44Z' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// published_at DESC; items with no timestamp keep their source order after the rest.
function byNewest(a, b) {
  const ta = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity;
  const tb = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity;
  return tb - ta;
}

export default function HomeTicker() {
  const [stories, setStories] = useState(MOCK);

  useEffect(() => {
    let alive = true;
    fetch('/api/news')
      .then(r => r.json())
      .then(data => {
        if (!alive || !(data.articles?.length > 0)) return;
        const mapped = data.articles.map((a, i) => ({
          id: a.id ?? a.url ?? i,
          type: CONE_TO_FEED[a.domain] ?? 'SIGNAL',
          title: a.title ?? '',
          source: a.source ?? 'unknown',
          publishedAt: a.publishedAt ?? null,
          time: a.publishedAt
            ? new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
            : '',
        }));
        setStories(mapped.slice().sort(byNewest));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const items = stories.slice(0, 6);
  if (!items.length) return null;

  return (
    <div style={{
      borderBottom: `1px solid ${RULE}`, padding: '8px 32px',
      display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none',
      background: '#000',
    }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.2em', marginRight: 16, flexShrink: 0 }}>● LIVE</span>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
        {items.map((s, i) => (
          <React.Fragment key={s.id ?? i}>
            {i > 0 && <span style={{ color: RULE2, margin: '0 12px', fontSize: 10 }}>|</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: SERIF, fontSize: 12, color: TEXT }}>{s.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.12em' }}>
                {s.publishedAt ? timeAgo(s.publishedAt) : s.time}
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
