// WO-1753 — Console: signal query input
import React, { useRef, useEffect, useState } from 'react';

export default function MiddleConsole({ onReturn }) {
  const ref = useRef(null);
  const [val, setVal] = useState('');

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const q = val.trim();
    if (!q) return;
    window.postMessage({ type: 'krylo-submit', query: q }, '*');
    if (onReturn) onReturn();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 680, padding: '0 32px', boxSizing: 'border-box' }}>
        <div style={{
          background: '#181818',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <textarea
            ref={ref}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape' && onReturn) onReturn();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Build your signal query..."
            rows={7}
            style={{
              display: 'block', width: '100%',
              background: 'transparent', border: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14, lineHeight: 1.8,
              color: 'rgba(255,255,255,0.88)',
              padding: '22px 22px 10px',
              resize: 'none', caretColor: '#66FF00',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.outline = 'none'}
          />
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px 14px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.18em',
            }}>⌘ ENTER · ESC TO EXIT</span>
            <button onClick={submit} style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, letterSpacing: '0.18em',
              background: val.trim() ? '#66FF00' : 'rgba(255,255,255,0.06)',
              color: val.trim() ? '#000' : 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: 6,
              padding: '6px 16px', cursor: 'pointer',
            }}>SUBMIT →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
