// worldclocks.jsx — trading-desk world clocks. Each clock is its own draggable piece; drag two
// within proximity and they snap flush together (magnetic). Live times via Intl (DST-safe).
// Lime LED, blinking colon. Positions persist to localStorage.

import React, { useState, useEffect, useRef } from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LED = '#66FF00';
const CLOCK_W = 96, CLOCK_H = 56;
const SNAP = 180;        // proximity (px) at which clocks snap together — strong pull from a few inches
const KEY = 'krylo_worldclock_pos_v1';

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

const defaults = () => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1400;
  return CLOCKS.map((_, i) => ({ x: w - (CLOCKS.length - i) * CLOCK_W - 24, y: 80 })); // top-right row
};
const loadPos = () => { try { return JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch { return defaults(); } };
const savePos = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

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

  const startDrag = (i, e) => {
    e.preventDefault();
    const off = { dx: e.clientX - pos[i].x, dy: e.clientY - pos[i].y };
    const others = posRef.current.map((p, j) => (j === i ? null : p)); // fixed during this drag
    const move = (ev) => {
      let nx = ev.clientX - off.dx, ny = ev.clientY - off.dy;
      // magnetic: if a rough edge lines up with another clock, snap flush + align rows
      for (const p of others) {
        if (!p) continue;
        if (Math.abs(ny - p.y) < SNAP) {
          if (Math.abs((nx + CLOCK_W) - p.x) < SNAP) { nx = p.x - CLOCK_W; ny = p.y; break; } // snap to its left
          if (Math.abs(nx - (p.x + CLOCK_W)) < SNAP) { nx = p.x + CLOCK_W; ny = p.y; break; } // snap to its right
          if (Math.abs(nx - p.x) < SNAP)            { nx = p.x;            ny = p.y; break; } // stack aligned
        }
      }
      setPos(prev => prev.map((p, k) => (k === i ? { x: nx, y: ny } : p)));
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
          <div key={c.city} onPointerDown={(e) => startDrag(i, e)}
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
