// src/components/shared/liveticker.jsx — KRYL-1251.
//
// A surface projection of the observable field: "these are current observable
// signals entering the field." Not an analytical engine. It does not rank, score,
// relate, or conclude — ordering is the deterministic published_at DESC contract
// in usenewsfeed.orderStories(). Markup unchanged from the original Feeds-bay
// LiveTicker.

import React from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const LIME  = '#66FF00';
const TEXT  = 'rgba(255,255,255,0.92)';
const RULE  = 'rgba(255,255,255,0.10)';
const RULE2 = 'rgba(255,255,255,0.20)';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function LiveTicker({ stories = [], limit = 6 }) {
  const items = stories.slice(0, limit);
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
