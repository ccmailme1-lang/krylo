// worldclocks.jsx — trading-desk world clocks. Each clock is a draggable piece. Clocks whose edges
// sit flush form a group; dragging one moves the whole group as a unit. Pull a clock straight out
// of its row to separate it. Come within range of another clock and it snaps flush (magnetic).
// Live times via Intl (DST-safe). Lime LED, blinking colon. Positions persist to localStorage.

import React, { useState, useEffect, useRef } from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LED = '#66FF00';
const CLOCK_W = 96, CLOCK_H = 56;
const GAP = 6;    // edges within this = "attached" (same group)
const SNAP = 72;  // snap flush when a moving edge comes within this of another clock
const KEY = 'krylo_worldclock_pos_v2'; // v2 — discards any corrupt v1 positions

const CLOCKS = [
  { city: 'NEW YORK',  tz: 'America/New_York' },
  { city: 'LONDON',    tz: 'Europe/London' },
  { city: 'HONG KONG', tz: 'Asia/Hong_Kong' },
  { city: 'TOKYO',     tz: 'Asia/Tokyo' },
];

function read(now, tz) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: '2-digit', day: '2-digit' }).formatToParts(now);
  const mm = p.find(x => x.type === 'month')?.value ?? '--';
  const dd = p.find(x => x.type === 'day')?.value ?? '--';
  return { time, date: `${mm}-${dd}` };
}

const vw = () => (typeof window !== 'undefined' ? window.innerWidth : 1400);
const vh = () => (typeof window !== 'undefined' ? window.innerHeight : 900);

// default: one clean row, top-right, in listed order (NY · London · Hong Kong · Tokyo)
const defaults = () => CLOCKS.map((_, i) => ({ x: vw() - (CLOCKS.length - i) * CLOCK_W - 24, y: 80 }));

const clampPt = (p) => ({
  x: Math.max(0, Math.min(p.x, vw() - CLOCK_W)),
  y: Math.max(0, Math.min(p.y, vh() - CLOCK_H)),
});

const validPos = (arr) =>
  Array.isArray(arr) && arr.length === CLOCKS.length &&
  arr.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));

const loadPos = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (validPos(saved)) return saved.map(clampPt);
  } catch {}
  return defaults();
};
const savePos = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

// two clocks are attached if their rows align and their side edges touch (within GAP)
const attached = (a, b) => {
  if (Math.abs(a.y - b.y) > GAP) return false;
  const aLeftOfB = Math.abs((a.x + CLOCK_W) - b.x) <= GAP;
  const bLeftOfA = Math.abs((b.x + CLOCK_W) - a.x) <= GAP;
  return aLeftOfB || bLeftOfA;
};

// connected group containing clock i (BFS over attachment)
const groupOf = (i, pos) => {
  const seen = new Set([i]), stack = [i];
  while (stack.length) {
    const cur = stack.pop();
    pos.forEach((p, j) => { if (!seen.has(j) && attached(pos[cur], p)) { seen.add(j); stack.push(j); } });
  }
  return seen;
};

export default function WorldClocks() {
  const [now, setNow] = useState(() => new Date());
  const [pos, setPos] = useState(loadPos);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const blink = now.getSeconds() % 2 === 0;

  const resetAll = () => { const d = defaults(); setPos(d); savePos(d); };

  const startDrag = (i, e) => {
    e.preventDefault();
    const base = posRef.current.map(p => ({ ...p })); // positions at drag start
    const fullGroup = groupOf(i, base);               // clocks attached to the one grabbed
    const origin = { mx: e.clientX, my: e.clientY };
    let moving = null; // set of indices that move — decided on first real movement, then locked

    const move = (ev) => {
      const dx = ev.clientX - origin.mx, dy = ev.clientY - origin.my;

      // Decide once: sideways/short drag moves the whole group; a straight pull OUT of the row
      // (mostly vertical) frees just the grabbed clock.
      if (!moving && Math.hypot(dx, dy) > 4) {
        moving = (fullGroup.size > 1 && Math.abs(dy) > Math.abs(dx)) ? new Set([i]) : fullGroup;
      }
      const mv = moving || fullGroup;

      let next = base.map((p, j) => (mv.has(j) ? { x: p.x + dx, y: p.y + dy } : p));

      // magnetic: snap the moving set flush to the nearest outside clock (never on top of one)
      let best = null, bestDist = SNAP;
      for (const gi of mv) {
        const g = next[gi];
        next.forEach((o, j) => {
          if (mv.has(j)) return;
          if (Math.abs(g.y - o.y) >= SNAP) return;
          for (const s of [{ x: o.x - CLOCK_W, y: o.y }, { x: o.x + CLOCK_W, y: o.y }]) {
            const d = Math.hypot(g.x - s.x, g.y - s.y);
            if (d < bestDist) { bestDist = d; best = { dx: s.x - g.x, dy: s.y - g.y }; }
          }
        });
      }
      if (best) next = next.map((p, j) => (mv.has(j) ? { x: p.x + best.dx, y: p.y + best.dy } : p));

      // keep the moving set on-screen as a unit (single clamp delta from its bounding box)
      const box = [...mv].map(j => next[j]);
      const minX = Math.min(...box.map(p => p.x)), maxX = Math.max(...box.map(p => p.x + CLOCK_W));
      const minY = Math.min(...box.map(p => p.y)), maxY = Math.max(...box.map(p => p.y + CLOCK_H));
      let cx = 0, cy = 0;
      if (minX < 0) cx = -minX; else if (maxX > vw()) cx = vw() - maxX;
      if (minY < 0) cy = -minY; else if (maxY > vh()) cy = vh() - maxY;
      if (cx || cy) next = next.map((p, j) => (mv.has(j) ? { x: p.x + cx, y: p.y + cy } : p));

      setPos(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      savePos(posRef.current);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <>
      {CLOCKS.map((c, i) => {
        const { time, date } = read(now, c.tz);
        const [hh, mm] = time.split(':');
        return (
          <div key={c.city} onPointerDown={(e) => startDrag(i, e)} onDoubleClick={resetAll}
            style={{
              position: 'fixed', left: pos[i].x, top: pos[i].y, width: CLOCK_W, height: CLOCK_H, zIndex: 9996,
              background: '#0a0a0a', border: '1px solid rgba(102,255,0,0.15)', cursor: 'grab', userSelect: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: 'rgba(102,255,0,0.55)', marginBottom: 3 }}>{c.city}</div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: LED, textShadow: '0 0 6px rgba(102,255,0,0.55)', lineHeight: 1 }}>
              {hh}<span style={{ opacity: blink ? 1 : 0.25 }}>:</span>{mm}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: LED, textShadow: '0 0 5px rgba(102,255,0,0.5)', letterSpacing: '0.08em', marginTop: 2 }}>{date}</div>
          </div>
        );
      })}
    </>
  );
}
