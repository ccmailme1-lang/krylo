// structurepanel.jsx — the Analysis Surface right panel.
// Full BRIEF / RECON / IMPACT column, restored at 50/50 geometry with the left
// Target Packet.

import React, { useState } from 'react';
import IntelligenceBrief from './intelligencebrief.jsx';
import ReconDashboard from './recondashboard.jsx';
import CausalImpactView from './causalimpactview.jsx';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const TABS = ['BRIEF', 'RECON', 'IMPACT'];

export default function StructurePanel({ query }) {
  const [tab, setTab] = useState('BRIEF');

  return (
    <div style={{
      position: 'absolute', top: 0, left: '50%', right: 0, bottom: 0, zIndex: 10,
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
          : <div style={{ height: '100%', overflowY: 'auto' }}><CausalImpactView subject={query} /></div>}
      </div>
    </div>
  );
}
