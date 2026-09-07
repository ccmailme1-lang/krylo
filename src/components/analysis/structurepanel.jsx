// structurepanel.jsx — the Analysis Surface right panel.
// Full BRIEF / RECON / IMPACT column, restored at 50/50 geometry with the left
// Target Packet.

import React, { useState, useEffect, useRef } from 'react';
import IntelligenceBrief from './intelligencebrief.jsx';
import ReconDashboard from './recondashboard.jsx';
import CausalImpactView from './causalimpactview.jsx';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const TABS = ['BRIEF', 'MAP', 'RECON', 'IMPACT'];

// MAP tab — scaled down 10% so structure-field.html's own margin math (which was landing labels
// too close to the panel edges at 1:1) gets more native room to lay itself out, while the visible
// result is 10% smaller. Dynamic (ResizeObserver-measured), not a hardcoded pixel size -- the
// iframe's native rect is always container size / 0.9, so it stays correct if the panel resizes.
const MAP_SCALE = 0.8;
function FormationMapTab() {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nativeW = size.w / MAP_SCALE;
  const nativeH = size.h / MAP_SCALE;

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {size.w > 0 && (
        <iframe
          src="/structure-field.html"
          title="Formation Map"
          style={{
            width: nativeW, height: nativeH, border: 'none', display: 'block',
            transform: `scale(${MAP_SCALE})`, transformOrigin: 'top left',
          }}
        />
      )}
    </div>
  );
}

export default function StructurePanel({ query }) {
  const [tab, setTab] = useState('BRIEF');

  return (
    <div style={{
      position: 'absolute', top: 64, left: '50%', right: 0, bottom: 0, zIndex: 10,
      background: '#000', borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0, background: '#000' }}>
        {TABS.map(t => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${on ? LIME : 'transparent'}`,
                color: on ? LIME : 'rgba(255,255,255,0.55)',
                fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
                cursor: 'pointer', textTransform: 'uppercase', marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {tab === 'BRIEF' ? <IntelligenceBrief />
          : tab === 'RECON' ? <ReconDashboard />
          : tab === 'IMPACT' ? <div style={{ height: '100%', overflowY: 'auto' }}><CausalImpactView subject={query} /></div>
          : <FormationMapTab />}
      </div>
    </div>
  );
}
