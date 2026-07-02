// WO-1875 — Canonical AMBIGUOUS State
// Single source of truth for how the UI presents an unresolved/AMBIGUOUS query
// (resolutionEligible: false). Two variants: 'full' (panel-level, explanatory) and
// 'compact' (tile-level, minimal). Same underlying copy — no per-surface improvisation.
import React from 'react';

const MONO = "'IBM Plex Mono', monospace";

export const AMBIGUOUS_COPY = {
  bluf:    'Insufficient signal to synthesize a brief. The query did not resolve to a domain with adequate structural data. Add a specific decision, dollar amount, or timeline to anchor analysis.',
  purpose: 'No domain anchor resolved — brief withheld to avoid fabrication.',
  compact: 'AWAITING SIGNAL',
};

export default function AmbiguousState({ variant = 'compact' }) {
  if (variant === 'full') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 24, gap: 10, textAlign: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {AMBIGUOUS_COPY.compact}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 420 }}>
          {AMBIGUOUS_COPY.bluf}
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
        {AMBIGUOUS_COPY.compact}
      </span>
    </div>
  );
}
