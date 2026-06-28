import { useState } from 'react';

const GUEST_EXPIRY = new Date('2026-06-29T12:00:00Z'); // 8AM EDT
const SESSION_K    = 'krylo_auth_v1';

const ACCOUNTS = [
  { user: 'krylo', pass: 'krylo321',  expiry: null },
  { user: 'guest', pass: 'krylo2906', expiry: GUEST_EXPIRY },
];

const S = {
  wrap: {
    position: 'fixed', inset: 0, background: '#000',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: '"IBM Plex Mono", monospace', color: '#66FF00',
    zIndex: 99999,
  },
  logo:  { fontSize: 11, letterSpacing: '0.3em', color: '#444', marginBottom: 48 },
  label: { fontSize: 11, letterSpacing: '0.2em', color: '#555', marginBottom: 12 },
  input: {
    background: 'transparent', border: '1px solid #66FF00',
    color: '#66FF00', fontFamily: 'inherit',
    fontSize: 14, letterSpacing: '0.15em',
    padding: '10px 16px', width: 240, outline: 'none',
    caretColor: '#66FF00', marginBottom: 12,
  },
  btn: {
    marginTop: 4, background: 'transparent',
    border: '1px solid #333', color: '#555',
    fontFamily: 'inherit', fontSize: 11,
    letterSpacing: '0.2em', padding: '8px 24px',
    cursor: 'pointer',
  },
  error: { marginTop: 12, fontSize: 11, color: '#ff4444', letterSpacing: '0.1em' },
};

export default function GuestGate({ children }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_K) === '1');
  const [user,   setUser]   = useState('');
  const [pass,   setPass]   = useState('');
  const [error,  setError]  = useState(false);

  if (authed) return children;

  function attempt() {
    const account = ACCOUNTS.find(a => a.user === user.trim() && a.pass === pass);
    if (!account) { setError(true); setPass(''); return; }
    if (account.expiry && Date.now() > account.expiry.getTime()) {
      setError(true); setPass(''); return;
    }
    sessionStorage.setItem(SESSION_K, '1');
    setAuthed(true);
  }

  return (
    <div style={S.wrap}>
      <div style={S.logo}>KRYLO — SIGNAL INTELLIGENCE</div>
      <div style={S.label}>USERNAME</div>
      <input
        style={S.input}
        type="text"
        value={user}
        autoFocus
        autoComplete="off"
        onChange={e => { setUser(e.target.value); setError(false); }}
        onKeyDown={e => { if (e.key === 'Enter') attempt(); }}
      />
      <div style={S.label}>ACCESS CODE</div>
      <input
        style={S.input}
        type="password"
        value={pass}
        autoComplete="off"
        onChange={e => { setPass(e.target.value); setError(false); }}
        onKeyDown={e => { if (e.key === 'Enter') attempt(); }}
        placeholder="············"
      />
      <button style={S.btn} onClick={attempt}>ENTER</button>
      {error && <div style={S.error}>INVALID CREDENTIALS</div>}
    </div>
  );
}
