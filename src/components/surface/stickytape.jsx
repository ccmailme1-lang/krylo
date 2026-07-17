// stickytape.jsx — KRYL-1051 Sticky-Tape. Left-nav dispenser + free-drop annotation layer.
// Industry-standard treatment: drag off the NOTES dispenser to place a note; notes open FULL;
// drag anywhere; resize from the corner handle; DOUBLE-CLICK the header (or ×) collapses to a
// title bar showing the text; RIGHT-CLICK deletes (no confirm) with Cmd/Ctrl+Z undo. Persists to
// sessionStorage; getStickies() rides the premium export.

import React, { useRef, useState, useEffect } from 'react';
import { useStickyStore } from '../../store/usestickystore.js';

const MONO = "'IBM Plex Mono', monospace";
const NOTE_COLOR = '#4FD1C5';            // blue sticky
const OPEN_MIN_W = 120, OPEN_MIN_H = 80; // default (minimal) open size; user-resizable
const TAB_W = 21, TAB_H = 36;            // ghost tab while dragging off the dispenser

function StickyNote({ note }) {
  const update = useStickyStore(s => s.updateSticky);
  const remove = useStickyStore(s => s.removeSticky);
  const st = useRef({ moved: false });
  const w = note.w ?? OPEN_MIN_W;

  // Drag via window listeners → moves anywhere. clickOpen = tap on the collapsed bar expands it.
  const startDrag = (e, opts = {}) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.dataset.role) return;
    const off = { dx: e.clientX - note.x, dy: e.clientY - note.y };
    const s = st.current; s.moved = false;
    const move = (ev) => {
      if (!s.moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 3) s.moved = true;
      if (s.moved) update(note.id, { x: ev.clientX - off.dx, y: ev.clientY - off.dy });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (opts.clickOpen && !s.moved) update(note.id, { min: false });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Resize from the bottom-right handle → persists w/h.
  const startResize = (e) => {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, w, h: note.h ?? OPEN_MIN_H };
    const move = (ev) => update(note.id, {
      w: Math.max(OPEN_MIN_W, start.w + (ev.clientX - start.x)),
      h: Math.max(OPEN_MIN_H, start.h + (ev.clientY - start.y)),
    });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const del = (e) => { e.preventDefault(); remove(note.id); }; // right-click; undo via Cmd/Ctrl+Z

  // Collapsed: title bar showing the text (double-click / tap to expand).
  if (note.min) {
    return (
      <div title={note.text || 'note'} onContextMenu={del}
        onPointerDown={(e) => startDrag(e, { clickOpen: true })}
        onDoubleClick={() => update(note.id, { min: false })}
        style={{
          position: 'fixed', left: note.x, top: note.y, width: w, height: 22, zIndex: 9998,
          background: NOTE_COLOR, color: '#1A1A1A', boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
          cursor: 'grab', pointerEvents: 'auto', display: 'flex', alignItems: 'center', overflow: 'hidden',
        }}>
        <span style={{
          flex: 1, fontFamily: MONO, fontSize: 10, padding: '0 6px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{note.text || 'note'}</span>
      </div>
    );
  }

  // Full note: drag from body; double-click header (or ×) collapses; right-click deletes; corner resize.
  return (
    <div onPointerDown={(e) => startDrag(e)} onContextMenu={del}
      style={{
        position: 'fixed', left: note.x, top: note.y, width: w, height: note.h ?? OPEN_MIN_H, zIndex: 9998,
        background: NOTE_COLOR, color: '#1A1A1A', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', cursor: 'grab', pointerEvents: 'auto', overflow: 'hidden',
      }}>
      <div onDoubleClick={() => update(note.id, { min: true })}
        style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px' }}>
        <span data-role="collapse" onClick={(e) => { e.stopPropagation(); update(note.id, { min: true }); }}
          style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 13, color: '#1A1A1A', lineHeight: 1, padding: '2px 5px' }}>×</span>
      </div>
      <textarea value={note.text} onChange={(e) => update(note.id, { text: e.target.value })} placeholder="note…"
        style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: '#1A1A1A',
          fontFamily: MONO, fontSize: 11, lineHeight: 1.4, padding: '0 8px 8px', cursor: 'text',
        }} />
      <div data-role="resize" onPointerDown={startResize}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.35) 45%)',
        }} />
    </div>
  );
}

export default function StickyTape() {
  const stickies    = useStickyStore(s => s.stickies);
  const addSticky   = useStickyStore(s => s.addSticky);
  const restoreLast = useStickyStore(s => s.restoreLast);
  const [ghost, setGhost] = useState(null);

  // Cmd/Ctrl+Z restores the last deleted note (standard undo, no confirm dialog on delete).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) restoreLast();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restoreLast]);

  // Click-drag off the dispenser → ghost follows the cursor → drop a note where you release.
  const startPlace = (e) => {
    e.preventDefault();
    const pos = (ev) => ({ x: ev.clientX - TAB_W / 2, y: ev.clientY - TAB_H / 2 });
    setGhost(pos(e));
    const move = (ev) => setGhost(pos(ev));
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGhost(null);
      addSticky(ev.clientX - OPEN_MIN_W / 2, ev.clientY - 14);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <>
      {stickies.map(n => <StickyNote key={n.id} note={n} />)}

      {/* Dispenser — 'NOTES' above a slot with a paper tab. Drag off it to place a note. */}
      <div onPointerDown={startPlace} title="Drag to place a note"
        style={{
          position: 'fixed', left: 20, top: '62%', zIndex: 9999, cursor: 'grab', userSelect: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', marginBottom: 5, color: 'rgba(255,255,255,0.55)' }}>NOTES</span>
        <div style={{ width: 46, height: 11, background: '#111', borderRadius: 2, border: '1px solid rgba(255,255,255,0.28)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)', width: 28, height: 18,
            background: NOTE_COLOR, clipPath: 'polygon(0 0, 100% 0, 100% 76%, 50% 100%, 0 76%)', boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
          }} />
        </div>
      </div>

      {/* ghost preview while dragging off the dispenser */}
      {ghost && (
        <div style={{
          position: 'fixed', left: ghost.x, top: ghost.y, width: TAB_W, height: TAB_H, zIndex: 9997,
          background: NOTE_COLOR, opacity: 0.55, pointerEvents: 'none',
        }} />
      )}
    </>
  );
}
