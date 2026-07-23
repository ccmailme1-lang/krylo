// WO-1323 — Settings Panel
// WO-1812 — Profile read/write wired
import React, { useState, useCallback } from 'react';
import { loadProfile, saveProfile, resetProfile } from '../../engine/userprofile.js';

const MONO   = "'IBM Plex Mono', monospace";
const LIME   = '#66FF00';
const BORDER = 'rgba(26,26,26,1)';

const LENS_OPTIONS = ['INVESTOR','REALTOR','ATHLETE','SALES','LEGAL','RETIREMENT','GENERAL'];
const VIEW_OPTIONS = ['DOMAIN','CONE'];

function SettingsRow({ label, value, type, options, onChange }) {
  const [toggled, setToggled]   = useState(value === true || value === 'ON');
  const [selected, setSelected] = useState(value);

  const handleToggle = () => {
    const next = !toggled;
    setToggled(next);
    onChange?.(next);
  };

  const handleSelect = (e) => {
    setSelected(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`,
    }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
        {label}
      </span>

      {type === 'display' && (
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em' }}>
          {value}
        </span>
      )}

      {type === 'toggle' && (
        <div
          onClick={handleToggle}
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

      {type === 'select' && (
        <select
          value={selected}
          onChange={handleSelect}
          style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
            background: 'transparent', color: LIME,
            border: `1px solid rgba(102,255,0,0.3)`,
            padding: '3px 8px', cursor: 'pointer', outline: 'none',
          }}
        >
          {options.map(o => (
            <option key={o} value={o} style={{ background: '#000', color: '#fff' }}>{o}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function SettingsPanel() {
  const [profile, setProfile] = useState(() => loadProfile());

  const update = useCallback((key, value) => {
    const next = saveProfile({ [key]: value });
    setProfile(next);
  }, []);

  const handleReset = () => {
    const fresh = resetProfile();
    setProfile(fresh);
  };

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
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', marginBottom: 2 }}>
          SETTINGS
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em' }}>
          SYSTEM CONFIGURATION
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 40px' }}>

        {/* ACCOUNT */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            ACCOUNT
          </div>
          <SettingsRow label="Email"        value="—"         type="display" />
          <SettingsRow label="Plan"         value="FREE TIER" type="display" />
          <SettingsRow label="Member Since" value="2026"      type="display" />
        </div>

        {/* DEFAULT LENS */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            DEFAULT LENS
          </div>
          <SettingsRow
            label="Active Lens"
            value={profile.defaultLens}
            type="select"
            options={LENS_OPTIONS}
            onChange={v => update('defaultLens', v)}
          />
        </div>

        {/* DEFAULT VIEW */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            DEFAULT VIEW
          </div>
          <SettingsRow
            label="Inspection Panel"
            value={profile.defaultView}
            type="select"
            options={VIEW_OPTIONS}
            onChange={v => update('defaultView', v)}
          />
        </div>

        {/* SIGNAL SETTINGS */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            SIGNAL SETTINGS
          </div>
          <SettingsRow label="Fidelity Threshold"    value={String(profile.signalSensitivityThreshold)} type="display" />
          <SettingsRow label="Signal Window"         value={profile.signalWindow}                       type="display" />
          <SettingsRow
            label="Auto-Advance to Oracle"
            value={profile.autoAdvance}
            type="toggle"
            onChange={v => update('autoAdvance', v)}
          />
        </div>

        {/* SYSTEM */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            SYSTEM
          </div>
          <SettingsRow label="Version"     value="KRYLO 0.4.22" type="display" />
          <SettingsRow label="Build"       value="2026-06-18"   type="display" />
          <SettingsRow label="Environment" value="DEVELOPMENT"  type="display" />
        </div>

        {/* PROFILE */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.24em', marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            PROFILE
          </div>
          <SettingsRow
            label="Last Updated"
            value={profile.metadata?.updatedAt ? new Date(profile.metadata.updatedAt).toLocaleDateString() : '—'}
            type="display"
          />
          <div style={{ paddingTop: 16 }}>
            <button
              onClick={handleReset}
              style={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
                color: 'rgba(255,80,80,0.7)', background: 'transparent',
                border: '1px solid rgba(255,80,80,0.3)', padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              RESET PROFILE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
