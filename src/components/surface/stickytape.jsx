// stickytape.jsx — KRYL-1051 Sticky-Tape. The WIRING (Founder owns the dispenser + note visuals).
// Arm tape mode → click canvas drops a free note → drag / edit / delete → persists (sessionStorage)
// → rides the premium export via getStickies(). Free-drop, not node-anchored (Founder 2026-07-16).
//
// HANDOFF: the Founder-built dispenser calls useStickyStore().toggleTapeMode(). The small TAPE
// button below is a TEMPORARY test trigger only — replace it with the dispenser. All styling here
// is placeholder; skin freely.

import React, { useRef } from 'react';
import { useStickyStore } from '../../store/usestickystore.js';

const MONO = "'IBM Plex Mono', monospace";
const NOTE_COLOR = '#ECE3A0'; // sticky paper — pale Post-it yellow per Founder reference (refine in testing)

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

      {/* Dispenser — wall-mounted on the left nav rail. The black base BLENDS into the dark nav
          (obscure); only the pale note curling out of the top slot reads. Click to arm → note lifts.
          Approx of Founder's reference — refine in testing. */}
      <div onClick={toggleTapeMode} title="Sticky-Tape — pull a note"
        style={{
          position: 'fixed', left: 8, top: '58%', zIndex: 9999, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none',
        }}>
        <div style={{ position: 'relative', width: 54, height: 42 }}>
          {/* the note curling up out of the slot — the one real visual cue */}
          <div style={{
            position: 'absolute', left: '50%', bottom: 14, width: 34, height: tapeMode ? 32 : 22,
            transform: 'translateX(-50%) rotate(4deg)', transformOrigin: 'bottom center',
            background: NOTE_COLOR, borderRadius: '1px 9px 1px 1px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)', transition: 'height .15s ease', zIndex: 1,
          }} />
          {/* base — flat + dark, blends into the nav */}
          <div style={{
            position: 'absolute', left: 0, bottom: 0, width: 54, height: 26, zIndex: 2,
            background: '#0e0e0f', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ position: 'absolute', top: -2, left: 7, right: 7, height: 6, background: '#000', borderRadius: 3 }} />
          </div>
        </div>
      </div>
    </>
  );
}
