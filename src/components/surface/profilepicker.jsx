// profilepicker.jsx — KRYL-1029 (light) sign-in for the test cohort. Shows a pick-your-account
// screen until a tester chooses; after that, a small "signed in as … · switch" badge. Session
// data is tagged to the chosen account (see app.jsx handleSessionBootstrap).

import React from 'react';
import { useProfileStore, TEST_PROFILES } from '../../store/useprofilestore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

export default function ProfilePicker() {
  const activeId  = useProfileStore(s => s.activeId);
  const setActive = useProfileStore(s => s.setActive);
  const clear     = useProfileStore(s => s.clear);

  // Signed in → small badge (bottom-left), with a switch link.
  if (activeId) {
    const name = TEST_PROFILES.find(p => p.id === activeId)?.name ?? activeId;
    return (
      <div style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 9999, fontFamily: MONO, fontSize: 9,
        letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center',
        gap: 6, userSelect: 'none',
      }}>
        <span>▪ {name.toUpperCase()}</span>
        <span onClick={clear} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>switch</span>
      </div>
    );
  }

  // Not signed in → blocking pick-your-account screen.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.93)', fontFamily: MONO,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.22em', marginBottom: 22, textTransform: 'uppercase' }}>
        Select your test account
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 160px)', gap: 10 }}>
        {TEST_PROFILES.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)}
            style={{
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', padding: '13px 10px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)',
              transition: 'background .12s, color .12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102,255,0,0.12)'; e.currentTarget.style.color = LIME; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
