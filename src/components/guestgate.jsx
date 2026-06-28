import { useState } from 'react';

// Guest access window: expires 2026-06-29 08:00 EDT (12:00 UTC)
const EXPIRY    = new Date('2026-06-29T12:00:00Z');
const SESSION_K = 'krylo_guest_v1';
const GUEST_PWD = 'krylo2906';

const S = {
  wrap: {
    position: 'fixed', inset: 0, background: '#000',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: '"IBM Plex Mono", monospace', color: '#66FF00',
    zIndex: 99999,
  },
  logo: { fontSize: 11, letterSpacing: '0.3em', color: '#444', marginBottom: 48 },
  label: { fontSize: 11, letterSpacing: '0.2em', color: '#555', marginBottom: 12 },
  input: {
    background: 'transparent', border: '1px solid #66FF00',
    color: '#66FF00', fontFamily: 'inherit',
    fontSize: 14, letterSpacing: '0.15em',
    padding: '10px 16px', width: 240, outline: 'none',
    caretColor: '#66FF00',
  },
  btn: {
    marginTop: 16, background: 'transparent',
    border: '1px solid #333', color: '#555',
    fontFamily: 'inherit', fontSize: 11,
    letterSpacing: '0.2em', padding: '8px 24px',
    cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
  },
  btnHover: { borderColor: '#66FF00', color: '#66FF00' },
  error: { marginTop: 12, fontSize: 11, color: '#ff4444', letterSpacing: '0.1em' },
  expired: { fontSize: 11, color: '#444', letterSpacing: '0.2em', textAlign: 'center' },
};

export default function GuestGate({ children }) {
  const [authed, setAuthed]   = useState(() => sessionStorage.getItem(SESSION_K) === '1');
  const [input,  setInput]    = useState('');
  const [error,  setError]    = useState(false);
  const [hover,  setHover]    = useState(false);

  if (Date.now() > EXPIRY.getTime()) {
    return (
      <div style={S.wrap}>
        <div style={S.expired}>ACCESS WINDOW CLOSED</div>
      </div>
    );
  }

  if (authed) return children;

  function attempt() {
    if (input.trim() === GUEST_PWD) {
      sessionStorage.setItem(SESSION_K, '1');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.logo}>KRYLO — SIGNAL INTELLIGENCE</div>
      <div style={S.label}>ACCESS CODE</div>
      <input
        style={S.input}
        type="password"
        value={input}
        autoFocus
        onChange={e => { setInput(e.target.value); setError(false); }}
        onKeyDown={e => { if (e.key === 'Enter') attempt(); }}
        placeholder="············"
      />
      <button
        style={{ ...S.btn, ...(hover ? S.btnHover : {}) }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={attempt}
      >
        ENTER
      </button>
      {error && <div style={S.error}>INVALID CODE</div>}
    </div>
  );
}
