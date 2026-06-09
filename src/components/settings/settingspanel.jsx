// WO-1323 — Settings Panel: bottom nav item always.
import React, { useState } from 'react';

const MONO   = "'IBM Plex Mono', monospace";
const LIME   = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

const SECTIONS = [
  {
    id: 'account',
    label: 'ACCOUNT',
    rows: [
      { label: 'Email',       value: '—',          type: 'display' },
      { label: 'Plan',        value: 'FREE TIER',  type: 'display' },
      { label: 'Member Since',value: '2026',       type: 'display' },
    ],
  },
  {
    id: 'lens',
    label: 'DEFAULT LENS',
    rows: [
      { label: 'Active Lens', value: 'RETIREMENT', type: 'select', options: ['INVESTOR','REALTOR','ATHLETE','SALES','LEGAL','RETIREMENT'] },
    ],
  },
  {
    id: 'signal',
    label: 'SIGNAL SETTINGS',
    rows: [
      { label: 'Fidelity Threshold', value: '70',  type: 'display' },
      { label: 'Signal Window',      value: '72H', type: 'display' },
      { label: 'Auto-Advance to Oracle', value: 'ON', type: 'toggle' },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    rows: [
      { label: 'Version',     value: 'KRYLO 0.4.22', type: 'display' },
      { label: 'Build',       value: '2026-05-22',   type: 'display' },
      { label: 'Environment', value: 'DEVELOPMENT',  type: 'display' },
    ],
  },
];

function SettingsRow({ row }) {
  const [toggled, setToggled] = useState(row.value === 'ON');
  const [selected, setSelected] = useState(row.value);

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`,
    }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
        {row.label}
      </span>

      {row.type === 'display' && (
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>
          {row.value}
        </span>
      )}

      {row.type === 'toggle' && (
        <div
          onClick={() => setToggled(t => !t)}
          style={{
            width: 36, height: 18, borderRadius: 9,
            background: toggled ? LIME : 'rgba(255,255,255,0.1)',
            position: 'relative', cursor: 'pointer',
            transition: 'background 200ms',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: toggled ? 21 : 3,
            width: 12, height: 12, borderRadius: '50%',
            background: toggled ? '#000' : 'rgba(255,255,255,0.4)',
            transition: 'left 200ms, background 200ms',
          }} />
        </div>
      )}

      {row.type === 'select' && (
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
            background: 'transparent', color: LIME,
            border: `1px solid rgba(102,255,0,0.3)`,
            padding: '3px 8px', cursor: 'pointer', outline: 'none',
          }}
        >
          {row.options.map(o => (
            <option key={o} value={o} style={{ background: '#000', color: '#fff' }}>{o}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function SettingsPanel() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', fontFamily: MONO,
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
          SETTINGS
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em' }}>
          SYSTEM CONFIGURATION
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 40px' }}>
        {SECTIONS.map(section => (
          <div key={section.id} style={{ marginTop: 28 }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
              {section.label}
            </div>
            {section.rows.map(row => (
              <SettingsRow key={row.label} row={row} />
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
