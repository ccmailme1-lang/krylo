// structurepanel.jsx — the Analysis Surface right panel.
//
// KRYL-1235 collateral fix (Founder 2026-08-30). `0802ed7` removed the right
// column to strip the legacy ORACLE KERNEL brief / ACTION MATRIX (correct). That
// column also hosted RECON / IMPACT and the premium Happy Path / EQ Canvas, which
// are legitimate KRYLO surfaces and went with it as collateral. This restores
// them at the panel geometry the Founder specified.
//
// Founder rule (2026-08-30): the Surface is two panels of INVARIANT geometry —
// same width, height, alignment, spacing, hierarchy. Only the right panel's
// content / function changes by tier:
//   Standard:  [ Analysis / Perception ]  [ Formation / Structure ]
//   Premium:   [ Analysis / Perception ]  [ Action Plan ]
//
// Standard right panel does NOT render premium content (no EQ Canvas / Happy
// Path). The legacy ORACLE KERNEL brief lives only in intelligencebrief.jsx,
// which is no longer mounted anywhere in the guest surface.

import React, { useState } from 'react';
import EQCanvas from './eqcanvas.jsx';
import ReconDashboard from './recondashboard.jsx';
import CausalImpactView from './causalimpactview.jsx';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const ABSENCE = '#4f5654';
const BODY = '#b6bcb7';

const TABS = ['STRUCTURE', 'RECON', 'IMPACT'];

export default function StructurePanel({ query, isPremium = false }) {
  const [tab, setTab] = useState('STRUCTURE');
  const structureLabel = isPremium ? 'ACTION PLAN' : 'STRUCTURE';

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
              {t === 'STRUCTURE' ? structureLabel : t}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
        {tab === 'STRUCTURE' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: 'rgba(102,255,0,0.55)' }}>
              {isPremium ? 'ACTION PLAN · PREMIUM' : 'FORMATION / STRUCTURE'}
            </div>

            <EQCanvas isPremium />
          </div>
        )}
        {tab === 'RECON' && <ReconDashboard />}
        {tab === 'IMPACT' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <CausalImpactView subject={query} />
          </div>
        )}
      </div>
    </div>
  );
}
