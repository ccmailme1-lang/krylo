// Platform-wide Help Layer — shared "?" affordance.
// One consistent implementation reused across every screen, instead of each
// component defining its own copy (metricstrip.jsx originally did this
// inline; this is the canonical version other components should import).
// Plain language only — no jargon, no formulas, no internal mechanism detail.
import React from 'react';

const MONO = "'IBM Plex Mono', monospace";

export default function HelpMark({ text, color = 'rgba(255,255,255,0.35)', hoverColor = '#66FF00', style }) {
  if (!text) return null;
  return (
    <span
      title={text}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 10, height: 10, borderRadius: '50%',
        border: `1px solid ${color}`, color,
        fontFamily: MONO, fontSize: 7, lineHeight: 1,
        cursor: 'help', flexShrink: 0, marginLeft: 3, userSelect: 'none',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = hoverColor; e.currentTarget.style.color = hoverColor; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
    >?</span>
  );
}
