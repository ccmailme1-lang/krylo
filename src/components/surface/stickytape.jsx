// stickytape.jsx — KRYL-1051 Sticky-Tape. Left-nav dispenser + free-drop annotation layer.
// Arm tape mode → click canvas drops a free note → drag / edit / delete → persists (sessionStorage)
// → rides the premium export via getStickies(). Free-drop, not node-anchored (Founder 2026-07-16).

import React, { useRef } from 'react';
import { useStickyStore } from '../../store/usestickystore.js';

const MONO = "'IBM Plex Mono', monospace";
const NOTE_COLOR = '#4FD1C5'; // blue sticky

const LONG_PRESS_MS = 550;

function StickyNote({ note }) {
  const update = useStickyStore(s => s.updateSticky);
  const remove = useStickyStore(s => s.removeSticky);
  const st = useRef({ moved: false, deleted: false, timer: null });

  // Shared pointer drag via window listeners → drags anywhere on screen. opts.longPress =
  // hold to delete (minimized); opts.clickOpen = tap (no drag/no delete) opens to full size.
  const startDrag = (e, opts = {}) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.dataset.role) return;
    const off = { dx: e.clientX - note.x, dy: e.clientY - note.y };
    const s = st.current; s.moved = false; s.deleted = false;
    if (opts.longPress) s.timer = setTimeout(() => { s.deleted = true; remove(note.id); }, LONG_PRESS_MS);
    const move = (ev) => {
      if (!s.moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 3) {
        s.moved = true;
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      }
      if (s.moved) update(note.id, { x: ev.clientX - off.dx, y: ev.clientY - off.dy });
    };
    const upFn = () => {
      if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', upFn);
      if (opts.clickOpen && !s.moved && !s.deleted) update(note.id, { min: false });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', upFn);
  };

  // Minimized: 21×36 tab. Tap opens; drag moves anywhere; long-press deletes; hover shows title.
  if (note.min) {
    return (
      <div
        title={note.text || 'note'}
        onPointerDown={(e) => startDrag(e, { longPress: true, clickOpen: true })}
        style={{
          position: 'fixed', left: note.x, top: note.y, width: 21, height: 36, zIndex: 9998,
          background: NOTE_COLOR, boxShadow: '0 3px 10px rgba(0,0,0,0.5)', cursor: 'grab', pointerEvents: 'auto',
        }} />
    );
  }

  // Open: default-size card. Drag anywhere (grab body, not the textarea); × (top-right) closes to minimized.
  return (
    <div onPointerDown={(e) => startDrag(e)}
      style={{
        position: 'fixed', left: note.x, top: note.y, width: 170, minHeight: 112, zIndex: 9998,
        background: NOTE_COLOR, color: '#1A1A1A', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', cursor: 'grab', pointerEvents: 'auto',
      }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px' }}>
        <span data-role="close" onClick={(e) => { e.stopPropagation(); update(note.id, { min: true }); }}
          style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 13, color: '#1A1A1A', lineHeight: 1, padding: '2px 5px' }}>×</span>
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
    addSticky(e.clientX - 10, e.clientY - 18); // center the 21×36 minimized tab on the drop point
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
