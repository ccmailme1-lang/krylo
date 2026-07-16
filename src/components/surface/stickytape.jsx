// stickytape.jsx — KRYL-1051 Sticky-Tape. Left-nav dispenser + free-drop annotation layer.
// Arm tape mode → click canvas drops a free note → drag / edit / delete → persists (sessionStorage)
// → rides the premium export via getStickies(). Free-drop, not node-anchored (Founder 2026-07-16).

import React, { useRef } from 'react';
import { useStickyStore } from '../../store/usestickystore.js';

const MONO = "'IBM Plex Mono', monospace";
const NOTE_COLOR = '#4FD1C5'; // blue sticky

function StickyNote({ note }) {
  const update = useStickyStore(s => s.updateSticky);
  const remove = useStickyStore(s => s.removeSticky);
  const drag = useRef(null);

  const onPointerDown = (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.dataset.role === 'del') return;
    drag.current = { dx: e.clientX - note.x, dy: e.clientY - note.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    update(note.id, { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = (e) => {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      style={{
        position: 'fixed', left: note.x, top: note.y, width: 152, minHeight: 92, zIndex: 9998,
        background: NOTE_COLOR, color: '#1A1A1A', boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', cursor: 'grab', pointerEvents: 'auto',
      }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px' }}>
        <span data-role="del" onClick={() => remove(note.id)}
          style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 12, lineHeight: 1, padding: '2px 5px' }}>×</span>
      </div>
      <textarea
        value={note.text}
        onChange={(e) => update(note.id, { text: e.target.value })}
        placeholder="note…"
        style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
          color: '#1A1A1A', fontFamily: MONO, fontSize: 11, lineHeight: 1.4, padding: '0 8px 8px', cursor: 'text',
        }} />
    </div>
  );
}

export default function StickyTape() {
  const tapeMode       = useStickyStore(s => s.tapeMode);
  const stickies       = useStickyStore(s => s.stickies);
  const addSticky      = useStickyStore(s => s.addSticky);
  const toggleTapeMode = useStickyStore(s => s.toggleTapeMode);

  const onCanvasClick = (e) => {
    if (!tapeMode) return;
    addSticky(e.clientX - 12, e.clientY - 12); // drop near the cursor; stay armed for multiples
  };

  return (
    <>
      {/* drop-catcher — only intercepts clicks while the dispenser is armed */}
      <div onClick={onCanvasClick}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          pointerEvents: tapeMode ? 'auto' : 'none',
          cursor: tapeMode ? 'crosshair' : 'default',
        }} />

      {stickies.map(n => <StickyNote key={n.id} note={n} />)}

      {/* Dispenser — 'NOTES' label above a slot with a paper tab dangling out. Click to arm;
          the tab pulls longer while armed. */}
      <div onClick={toggleTapeMode} title="Sticky-Tape — pull a note"
        style={{
          position: 'fixed', left: 20, top: '62%', zIndex: 9999, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none',
        }}>
        <span style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', marginBottom: 5,
          color: tapeMode ? NOTE_COLOR : 'rgba(255,255,255,0.55)',
        }}>NOTES</span>
        {/* dispenser slot */}
        <div style={{
          width: 46, height: 11, background: '#111', borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.28)', position: 'relative',
        }}>
          {/* paper tab dangling out of the slot — torn point at the bottom; pulls longer when armed */}
          <div style={{
            position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
            width: 28, height: tapeMode ? 28 : 18, background: NOTE_COLOR, transition: 'height .15s ease',
            clipPath: 'polygon(0 0, 100% 0, 100% 76%, 50% 100%, 0 76%)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
          }} />
        </div>
      </div>
    </>
  );
}
