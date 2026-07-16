import React, { useState } from 'react';

// Floating Lens Ribbon — top-center, square, float. Seven perceptual viewport lenses;
// glyph per operator, name on hover (title). Active lens is LIT (lime + underline) —
// default OBSERVE, unmistakable (Founder frame 2026-07-15). Tap = change lens.
const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const LENSES = [
  { id: 'OBSERVE',     g: '◉' },
  { id: 'SIGNAL',      g: '↯' },
  { id: 'FLOW',        g: '⇢' },
  { id: 'PRESSURE',    g: '⧖' },
  { id: 'CONVERGENCE', g: '⬡' },
  { id: 'DRIFT',       g: '↝' },
  { id: 'OPPORTUNITY', g: '⟡' },
];

const bar = {
  position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%) scale(0.9)', transformOrigin: 'top center',
  zIndex: 40, display: 'flex', alignItems: 'center', gap: 4,
  padding: '5px 8px', borderRadius: 10,
  background: 'rgba(58,59,64,0.94)', border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
const btn = {
  fontFamily: MONO, fontSize: 12, width: 26, height: 26, borderRadius: 6,
  border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.55)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const div = { width: 1, height: 18, background: 'rgba(255,255,255,0.14)', margin: '0 2px' };

export default function FloatingToolbar() {
  const [active, setActive] = useState('OBSERVE'); // default posture / ground zero

  return (
    <div style={bar}>
      {LENSES.map(({ id, g }) => {
        const isActive = id === active;
        return (
          <button key={id} title={id} onClick={() => setActive(id)} aria-pressed={isActive}
            style={{ position: 'relative', width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                     background: isActive ? 'rgba(102,255,0,0.12)' : 'rgba(255,255,255,0.05)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: isActive ? LIME : 'rgba(255,255,255,0.55)' }}>{g}</span>
            {/* active lens LIT — unmistakable underline */}
            {isActive && <span style={{ position: 'absolute', left: 4, right: 4, bottom: 2, height: 2, background: LIME, borderRadius: 1 }} />}
          </button>
        );
      })}
      <div style={div} />
      <button style={btn} title="Add tool">＋</button>
      <button style={btn} title="Remove tool">✕</button>
      <button style={btn} title="Anchor to top">↑</button>
    </div>
  );
}
