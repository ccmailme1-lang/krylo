import React, { useState } from 'react';
import { VIEWPORT_IDS, VIEWPORTS, dispatchViewport } from '../../engine/viewport.js';

// Perceptual Lens Ribbon (KRYL-1034) — square, flat, floating. Selects a structural OPERATOR
// that transforms the same ecosystem (not navigation). Conforms to the square nature of the
// floating menu: flat rectangle, vertical dividers, square cells — no pills. Palette per Founder SVG.
const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const bar = {
  position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%) scale(0.9)', transformOrigin: 'top center',
  zIndex: 40, display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(#101010ec, #030303f5)',
  border: '1px solid #222', borderRadius: 2,               // square
  boxShadow: '0 2px 18px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  fontFamily: MONO, overflow: 'hidden',
};
const row = { display: 'flex', alignItems: 'stretch' };

const cell = (active) => ({
  position: 'relative', padding: '11px 16px 12px', border: 'none', background: active ? '#111111' : 'transparent',
  color: active ? LIME : '#AFAFAF', fontFamily: MONO, fontSize: 12, letterSpacing: '1.5px',
  textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
  borderRight: '1px solid #252525', transition: 'color .12s, background .12s',
});
const underline = { position: 'absolute', left: 6, right: 6, bottom: 4, height: 2, background: LIME, borderRadius: 0 };

const telem = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
  padding: '5px 12px', borderTop: '1px solid #1A1A1A',
  fontFamily: MONO, fontSize: 10, letterSpacing: '2px', color: '#555555',
};

export default function FloatingToolbar() {
  const [active, setActive] = useState('OBSERVE');
  const vp = VIEWPORTS[active];
  // headless dispatch (no live substrate yet → withholds, §22). Kept wired so the ribbon is real.
  const slice = dispatchViewport(active, {});

  return (
    <div style={bar}>
      <div style={row}>
        {VIEWPORT_IDS.map((id, i) => {
          const isActive = id === active;
          return (
            <button key={id} style={{ ...cell(isActive), borderRight: i === VIEWPORT_IDS.length - 1 ? 'none' : '1px solid #252525' }}
              title={VIEWPORTS[id].question} onClick={() => setActive(id)}>
              {id}
              {isActive && <span style={underline} />}
            </button>
          );
        })}
      </div>
      <div style={telem}>
        <span>{vp.question.toUpperCase()}</span>
        <span>{slice.withholding_reason ? slice.withholding_reason : 'READ ONLY'}</span>
      </div>
    </div>
  );
}
