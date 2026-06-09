import { useRef, useEffect } from 'react';

const LIME         = 'rgba(102,255,0,';
const BLUE         = 'rgba(0,127,255,';
const GRID_ALPHA   = 0.04;
const N_PARTICLES  = 100;

export default function AnalysisSubstrate({ pressure = 0, convergenceState = 'INSUFFICIENT_SIGNAL' }) {
  const canvasRef       = useRef(null);
  const runningRef      = useRef(false);
  const pressureRef     = useRef(pressure);
  const convergenceRef  = useRef(convergenceState);

  useEffect(() => { pressureRef.current  = pressure;        }, [pressure]);
  useEffect(() => { convergenceRef.current = convergenceState; }, [convergenceState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const particles = Array.from({ length: N_PARTICLES }, () => ({
      x:  Math.random(),
      y:  Math.random(),
      vx: (Math.random() - 0.5) * 0.0015,
      vy: (Math.random() - 0.5) * 0.0015,
      op: 0.08 + Math.random() * 0.2,
    }));

    runningRef.current = true;

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function tick() {
      if (!runningRef.current) return;
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) { requestAnimationFrame(tick); return; }

      const speed  = 0.3 + pressureRef.current * 2.2;
      const isBlue = convergenceRef.current === 'TURBULENT_CONVERGENCE';
      const col    = isBlue ? BLUE : LIME;

      ctx.clearRect(0, 0, W, H);

      // coordinate lattice
      ctx.strokeStyle = `rgba(255,255,255,${GRID_ALPHA})`;
      ctx.lineWidth   = 0.5;
      for (let i = 0; i <= 24; i++) {
        const x = (i / 24) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let j = 0; j <= 14; j++) {
        const y = (j / 14) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // drifting particles — S(t,x)
      for (const p of particles) {
        p.x += p.vx * speed;
        p.y += p.vy * speed;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 1, 0, Math.PI * 2);
        ctx.fillStyle = `${col}${p.op})`;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    tick();

    return () => {
      runningRef.current = false;
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        pointerEvents: 'none',
      }}
    />
  );
}
