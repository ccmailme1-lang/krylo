// stickytape.jsx — KRYL-1051 Sticky-Tape. Left-nav dispenser + free-drop annotation layer.
// Industry-standard treatment: drag off the NOTES dispenser to place a note; notes open FULL;
// drag anywhere; resize from the corner handle; DOUBLE-CLICK the header (or ×) collapses to a
// small blue NotebookPen ICON; LONG-PRESS a note (or its icon) opens color options; RIGHT-CLICK
// opens a menu → Delete → confirm. Cmd/Ctrl+Z undoes the last delete. Persists to sessionStorage;
// getStickies() rides the premium export.

import React, { useRef, useState, useEffect } from 'react';
import { NotebookPen } from 'lucide-react';
import { useStickyStore } from '../../store/usestickystore.js';

const MONO = "'IBM Plex Mono', monospace";
const NOTE_COLOR = '#4FD1C5';            // default sticky blue
const COLORS = ['#4FD1C5', '#66FF00', '#FF69B4']; // long-press palette: blue · lime · hot pink (Founder-approved)
const OPEN_MIN_W = 120, OPEN_MIN_H = 80; // default (minimal) open size; user-resizable
const TAB_W = 21, TAB_H = 36;            // ghost tab while dragging off the dispenser
const LONG_PRESS_MS = 500;

function StickyNote({ note, activeConeDomain }) {
  const update = useStickyStore(s => s.updateSticky);
  const remove = useStickyStore(s => s.removeSticky);
  const st = useRef({ moved: false, longFired: false });
  const [menu, setMenu] = useState(false);      // long-press color palette
  const [ctx, setCtx]   = useState(null);       // right-click menu position {x,y}
  const [confirm, setConfirm] = useState(false); // delete confirmation
  const w = note.w ?? OPEN_MIN_W;
  const color = note.color ?? NOTE_COLOR;

  // Drag via window listeners → moves anywhere. clickOpen = tap on the collapsed icon expands it.
  // A hold with no movement (LONG_PRESS_MS) opens the color menu instead of dragging/expanding.
  const startDrag = (e, opts = {}) => {
    if (e.button === 2) return; // right-click handled by onContextMenu
    if (e.target.tagName === 'TEXTAREA' || e.target.dataset.role) return;
    const off = { dx: e.clientX - note.x, dy: e.clientY - note.y };
    const s = st.current; s.moved = false; s.longFired = false;
    const timer = setTimeout(() => { if (!s.moved) { s.longFired = true; setMenu(true); } }, LONG_PRESS_MS);
    const move = (ev) => {
      if (!s.moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 3) { s.moved = true; clearTimeout(timer); }
      if (s.moved) update(note.id, { x: ev.clientX - off.dx, y: ev.clientY - off.dy });
    };
    const up = () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (opts.clickOpen && !s.moved && !s.longFired) update(note.id, { min: false });
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

  // Right-click → menu (Delete) → confirm. The normal-file path.
  const onCtx = (e) => { e.preventDefault(); setMenu(false); setCtx({ x: e.clientX, y: e.clientY }); };

  // Long-press menu: color swatches + attach/detach to the selected cone.
  const attach = () => { if (activeConeDomain) { update(note.id, { coneDomain: activeConeDomain }); setMenu(false); } };
  const detach = () => { update(note.id, { coneDomain: null }); setMenu(false); };
  const colorMenu = menu && (
    <>
      <div onPointerDown={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
      <div style={{
        position: 'fixed', left: note.x, top: note.y + 34, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, padding: 8,
        background: '#111', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)', minWidth: 150,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {COLORS.map(col => (
            <div key={col} title={col}
              onPointerDown={(e) => { e.stopPropagation(); update(note.id, { color: col }); setMenu(false); }}
              style={{
                width: 18, height: 18, background: col, cursor: 'pointer',
                border: col === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.35)',
              }} />
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 6 }}>
          {note.coneDomain ? (
            <div onPointerDown={(e) => { e.stopPropagation(); detach(); }}
              style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.72)', cursor: 'pointer' }}>
              ⊘ Detach from {note.coneDomain.toUpperCase()}
            </div>
          ) : activeConeDomain ? (
            <div onPointerDown={(e) => { e.stopPropagation(); attach(); }}
              style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: '#66FF00', cursor: 'pointer' }}>
              ⛓ Attach to {activeConeDomain.toUpperCase()}
            </div>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>
              Select a cone to attach
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Right-click context menu → Delete.
  const ctxMenu = ctx && (
    <>
      <div onPointerDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }}
        style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
      <div style={{
        position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 10001, minWidth: 120,
        background: '#141414', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
      }}>
        <div onPointerDown={(e) => { e.stopPropagation(); setCtx(null); setConfirm(true); }}
          style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(255,120,120,0.95)',
            padding: '8px 12px', cursor: 'pointer',
          }}>Delete</div>
      </div>
    </>
  );

  // Delete confirmation dialog.
  const confirmBox = confirm && (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 10002,
        background: '#141414', border: '1px solid rgba(255,255,255,0.18)', padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14, minWidth: 220,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)' }}>Delete this note?</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onPointerDown={() => setConfirm(false)}
            style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>Cancel</button>
          <button onPointerDown={() => { setConfirm(false); remove(note.id); }}
            style={{ fontFamily: MONO, fontSize: 11, padding: '6px 12px', cursor: 'pointer',
              background: 'rgba(255,80,80,0.14)', color: 'rgba(255,120,120,0.95)', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
        </div>
      </div>
    </>
  );

  // Collapsed: small blue NotebookPen icon (tap to expand, long-press for colors, right-click to delete).
  if (note.min) {
    return (
      <>
        <div title={note.text || 'note'} onContextMenu={onCtx}
          onPointerDown={(e) => startDrag(e, { clickOpen: true })}
          onDoubleClick={() => update(note.id, { min: false })}
          style={{
            position: 'fixed', left: note.x, top: note.y, width: 30, height: 30, zIndex: 9998,
            cursor: 'grab', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))',
          }}>
          <NotebookPen size={22} color={color} strokeWidth={2} />
          {note.coneDomain && (
            <span style={{ position: 'absolute', bottom: -3, fontFamily: MONO, fontSize: 6, letterSpacing: '0.04em', color, whiteSpace: 'nowrap' }}>
              {note.coneDomain.slice(0, 4).toUpperCase()}
            </span>
          )}
        </div>
        {colorMenu}{ctxMenu}{confirmBox}
      </>
    );
  }

  // Full note: drag from body; double-click header (or ×) collapses; right-click → delete; corner resize.
  return (
    <>
      <div onPointerDown={(e) => startDrag(e)} onContextMenu={onCtx}
        style={{
          position: 'fixed', left: note.x, top: note.y, width: w, height: note.h ?? OPEN_MIN_H, zIndex: 9998,
          background: color, color: '#1A1A1A', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', cursor: 'grab', pointerEvents: 'auto', overflow: 'hidden',
        }}>
        <div onDoubleClick={() => update(note.id, { min: true })}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', color: 'rgba(26,26,26,0.6)', paddingLeft: 3 }}>
            {note.coneDomain ? `▸ ${note.coneDomain.toUpperCase()}` : ''}
          </span>
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
      {colorMenu}{ctxMenu}{confirmBox}
    </>
  );
}

export default function StickyTape({ activeConeDomain = null }) {
  const stickies    = useStickyStore(s => s.stickies);
  const addSticky   = useStickyStore(s => s.addSticky);
  const restoreLast = useStickyStore(s => s.restoreLast);
  const [ghost, setGhost] = useState(null);

  // Cmd/Ctrl+Z restores the last deleted note.
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
      {/* A note shows if it's free (no cone) or its cone is the one currently selected. */}
      {stickies.filter(n => !n.coneDomain || n.coneDomain === activeConeDomain)
        .map(n => <StickyNote key={n.id} note={n} activeConeDomain={activeConeDomain} />)}

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
