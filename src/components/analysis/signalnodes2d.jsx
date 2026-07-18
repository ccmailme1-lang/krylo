// signalnodes2d.jsx — Signal lens node map, PLAN B: pure 2D Canvas, NO WebGL.
// No GPU context to lose, no context exhaustion, bounded by design. Renders the floating lime node
// constellation: radius = significance (fs), opacity = confidence, soft glow, drift animation,
// nearest-neighbour edges (capped). Hover → node readout. Same aesthetic as the WebGL map, none of
// the fragility. Pattern precedent: analysisdomainfield.jsx (Canvas 2D).
import React, { useRef, useEffect, useState } from 'react';

const LIME = '#66FF00';
const MAX_NODES = 200;         // hard cap — no O(n²) blowup, no overdraw
const EDGE_DIST = 120;         // px; connect nodes within this range
const MAX_EDGES = 600;         // hard ceiling on drawn edges

// deterministic 0..1 from a string/index so a node keeps its home position across frames
function hash01(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

export default function SignalNodes2D({ signals = [] }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const hoverRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Build node models from real signals (bounded). Position is stable per node (hash of id).
  useEffect(() => {
    const src = (Array.isArray(signals) ? signals : []).slice(0, MAX_NODES);
    const list = src.map((s, i) => {
      const id  = s.id ?? s.title ?? s.source ?? `n${i}`;
      const fs  = clamp01(s.fs ?? s.signal / 100 ?? s.score ?? 0.5);
      const con = clamp01(s.confidence ?? s.fidelity?.e_viral ?? 0.6);
      return {
        id, fs, con,
        label: String(s.title ?? s.domain ?? s.source ?? id).slice(0, 40),
        hx: hash01(id), hy: hash01(id + '_y'),     // home 0..1
        vx: (hash01(id + 'vx') - 0.5) * 0.15,       // gentle drift px/frame
        vy: (hash01(id + 'vy') - 0.5) * 0.15,
        x: 0, y: 0,
        r: 2 + fs * 7,                              // radius by significance
      };
    });
    // if no real signals, a sparse dim ambient field so the lens is never a dead black rectangle
    if (list.length === 0) {
      for (let i = 0; i < 40; i++) {
        list.push({ id: `field${i}`, fs: 0.12, con: 0.15, label: '', ambient: true,
          hx: hash01('f' + i), hy: hash01('fy' + i),
          vx: (hash01('fvx' + i) - 0.5) * 0.1, vy: (hash01('fvy' + i) - 0.5) * 0.1,
          x: 0, y: 0, r: 1.5 });
      }
    }
    nodesRef.current = list;
  }, [signals]);

  // Canvas sizing (DPR-aware) + the animation loop.
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // seed positions from home coords once we know the box
      for (const n of nodesRef.current) { if (n.x === 0 && n.y === 0) { n.x = n.hx * W; n.y = n.hy * H; } }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;
      // drift + soft-wrap (seed home position on first sight so nodes never pile in the corner)
      for (const n of nodes) {
        if (n.x === 0 && n.y === 0 && W && H) { n.x = n.hx * W; n.y = n.hy * H; }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += W; else if (n.x > W) n.x -= W;
        if (n.y < 0) n.y += H; else if (n.y > H) n.y -= H;
      }
      // edges (nearest-neighbour, capped)
      ctx.lineWidth = 1;
      let edges = 0;
      for (let a = 0; a < nodes.length && edges < MAX_EDGES; a++) {
        for (let b = a + 1; b < nodes.length && edges < MAX_EDGES; b++) {
          const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < EDGE_DIST * EDGE_DIST) {
            const t = 1 - Math.sqrt(d2) / EDGE_DIST;
            ctx.strokeStyle = `rgba(102,255,0,${(0.10 * t).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
            edges++;
          }
        }
      }
      // nodes
      for (const n of nodes) {
        const hovered = hoverRef.current === n;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (hovered ? 2 : 0), 0, Math.PI * 2);
        ctx.shadowColor = LIME;
        ctx.shadowBlur = n.ambient ? 4 : 8 + n.fs * 10;
        ctx.fillStyle = n.ambient
          ? `rgba(102,255,0,${(0.10 + n.con * 0.15).toFixed(3)})`
          : `rgba(102,255,0,${(0.35 + n.con * 0.6).toFixed(3)})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const onMove = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let hit = null, best = 14 * 14;
    for (const n of nodesRef.current) {
      if (n.ambient) continue;
      const dx = n.x - mx, dy = n.y - my, d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; hit = n; }
    }
    hoverRef.current = hit;
    setHoverInfo(hit ? { x: mx, y: my, label: hit.label, fs: hit.fs, con: hit.con } : null);
  };

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => { hoverRef.current = null; setHoverInfo(null); }}
              style={{ display: 'block' }} />
      {hoverInfo && (
        <div style={{ position: 'absolute', left: hoverInfo.x + 12, top: hoverInfo.y + 12, zIndex: 5,
                      font: '10px IBM Plex Mono, monospace', color: LIME, background: 'rgba(0,0,0,0.85)',
                      border: '1px solid rgba(102,255,0,0.3)', padding: '4px 8px', pointerEvents: 'none', maxWidth: 240 }}>
          <div style={{ color: '#fff' }}>{hoverInfo.label}</div>
          <div style={{ opacity: 0.7 }}>fs {(hoverInfo.fs * 100 | 0)} · conf {(hoverInfo.con * 100 | 0)}%</div>
        </div>
      )}
    </div>
  );
}

function clamp01(x) { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5; }
