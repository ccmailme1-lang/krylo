import React from 'react';

// Floating segmented toolbar — top-center, gray HUD. PLACEHOLDER slots for now
// (what fills them is TBD). Structure mirrors the reference: left actions ·
// addable tool slots w/ color bands · add / remove / anchor. Non-functional stub.
const MONO = "'IBM Plex Mono', monospace";
// Perceptual viewport lenses — glyph per operator; name shows on hover (title).
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
  return (
    <div style={bar}>
      <button style={btn} title="Selection">⊙</button>
      <button style={btn} title="Erase selection">⌫</button>
      <div style={div} />
      {LENSES.map(({ id, g }) => (
        <div key={id} title={id}
          style={{ position: 'relative', width: 26, height: 26, borderRadius: 6,
                   background: 'rgba(255,255,255,0.05)', display: 'flex',
                   alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{g}</span>
        </div>
      ))}
      <div style={div} />
      <button style={btn} title="Add tool">＋</button>
      <button style={btn} title="Remove tool">✕</button>
      <button style={btn} title="Anchor to top">↑</button>
    </div>
  );
}
