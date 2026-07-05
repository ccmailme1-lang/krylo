// Platform-wide Help Layer — shared "?" affordance.
// One consistent implementation reused across every screen, instead of each
// component defining its own copy (metricstrip.jsx originally did this
// inline; this is the canonical version other components should import).
// Plain language only — no jargon, no formulas, no internal mechanism detail.
//
// Hover uses a pure CSS class (:hover), not JS onMouseEnter/onMouseLeave —
// on screens with a continuous render loop (e.g. the Surface cone view's
// Three.js scene competing for the main thread), JS-dispatched mouse events
// can visibly lag; CSS :hover is handled by the browser's style engine
// directly and doesn't wait on JS at all.
import React from 'react';

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
  if (!text) return null;
  return (
    <span
      title={text}
      className="krylo-help-mark"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 10, height: 10, borderRadius: '50%',
        border: `1px solid ${color}`, color,
        fontFamily: MONO, fontSize: 7, lineHeight: 1,
        cursor: 'help', flexShrink: 0, marginLeft: 3, userSelect: 'none',
        ...style,
      }}
    >?</span>
  );
}
