// Platform-wide Help Layer — shared "?" affordance.
// One consistent implementation reused across every screen, instead of each
// component defining its own copy (metricstrip.jsx originally did this
// inline; this is the canonical version other components should import).
// Plain language only — no jargon, no formulas, no internal mechanism detail.
//
// Custom click-to-toggle popover, NOT the native `title` attribute — native
// tooltips proved unreliable in practice (didn't appear on click, and
// hover-dwell timing is inconsistent across browsers/screens). Click is also
// the more natural first interaction users reach for, so this responds to
// click primarily; hover still highlights the mark itself for a visual cue.
import React, { useState, useRef, useEffect } from 'react';

const MONO = "'IBM Plex Mono', monospace";
let injected = false;

function ensureStyleInjected() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    .krylo-help-mark { transition: none; }
    .krylo-help-mark:hover { border-color: #66FF00 !important; color: #66FF00 !important; }
  `;
  document.head.appendChild(style);
}

export default function HelpMark({ text, color = 'rgba(255,255,255,0.35)', style }) {
  ensureStyleInjected();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  if (!text) return null;

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        className="krylo-help-mark"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 10, height: 10, borderRadius: '50%',
          border: `1px solid ${color}`, color,
          fontFamily: MONO, fontSize: 7, lineHeight: 1,
          cursor: 'help', flexShrink: 0, marginLeft: 3, userSelect: 'none',
          ...style,
        }}
      >?</span>
      {open && (
        <span
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: '140%', left: 0, zIndex: 999,
            minWidth: 180, maxWidth: 260,
            background: 'rgba(0,0,0,0.95)', border: '1px solid #66FF00',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: MONO, fontSize: 10, lineHeight: 1.5,
            letterSpacing: 'normal', textTransform: 'none', fontWeight: 400,
            padding: '8px 10px', whiteSpace: 'normal',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          }}
        >{text}</span>
      )}
    </span>
  );
}
