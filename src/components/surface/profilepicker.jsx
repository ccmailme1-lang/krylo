// profilepicker.jsx — KRYL-1029 (light) sign-in for the test cohort. NO visible roster — you hand
// out accounts as needed. A tester signs in with a CODE you give them (their account id, e.g. t07)
// or a LINK you send (…?t=t07, which signs them in and cleans the URL). After sign-in, a small
// "signed in as … · switch" badge shows. Session data is tagged to the account (see app.jsx).

import React, { useState, useEffect } from 'react';
import { useProfileStore, TEST_PROFILES } from '../../store/useprofilestore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const valid = (c) => TEST_PROFILES.some(p => p.id === c && p.active); // only ACTIVATED accounts sign in

export default function ProfilePicker() {
  const activeId  = useProfileStore(s => s.activeId);
  const setActive = useProfileStore(s => s.setActive);
  const clear     = useProfileStore(s => s.clear);
  const [code, setCode] = useState('');
  const [err, setErr]   = useState(false);

  // Link sign-in: ?t=<code> hands a tester their account, then the URL is cleaned.
  useEffect(() => {
    if (activeId) return;
    const p = (new URLSearchParams(window.location.search).get('t') || '').trim().toLowerCase();
    if (p && valid(p)) {
      setActive(p);
      const url = new URL(window.location.href);
      url.searchParams.delete('t');
      window.history.replaceState({}, '', url);
    }
  }, [activeId, setActive]);

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

  const submit = () => {
    const c = code.trim().toLowerCase();
    const p = TEST_PROFILES.find(x => x.id === c);
    if (p && p.active) setActive(c);
    else setErr(p ? 'inactive' : 'invalid'); // exists-but-off vs unknown
  };

  // Not signed in → blocking code-entry screen (no roster shown).
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.93)', fontFamily: MONO,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        Enter your access code
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} autoFocus
          onChange={(e) => { setCode(e.target.value); setErr(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="code"
          style={{
            fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em', padding: '10px 12px', width: 160, textAlign: 'center',
            background: 'rgba(255,255,255,0.06)', color: '#fff', border: `1px solid ${err ? 'rgba(255,80,80,0.7)' : 'rgba(255,255,255,0.2)'}`,
            outline: 'none',
          }} />
        <button onClick={submit}
          style={{
            fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', padding: '10px 16px', cursor: 'pointer',
            background: 'rgba(102,255,0,0.12)', color: LIME, border: '1px solid rgba(102,255,0,0.4)',
          }}>ENTER</button>
      </div>
      {err && <div style={{ color: 'rgba(255,80,80,0.8)', fontSize: 9, letterSpacing: '0.14em' }}>
        {err === 'inactive' ? 'ACCOUNT NOT ACTIVE YET' : 'INVALID CODE'}
      </div>}
    </div>
  );
}
