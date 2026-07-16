// Analysis Bay background — domain-positioned signal nodes.
// Replaces analysissubstrate.jsx's random particle field (2026-07-06).
//
// Pattern adapted from spinemap.jsx (Layer 4 Signal Map): real signals,
// weighted spatial positioning, cluster cohesion — but with the US-geo
// constraint removed entirely. Positioning is by DOMAIN, not geography.
// Kept in Canvas 2D (not Three.js/WebGL like spinemap.jsx) since this is a
// passive ambient background sitting behind an active search UI, not the
// primary interactive view — matching analysissubstrate.jsx's original
// lightweight approach rather than adding WebGL overhead for a backdrop.
//
// Data: consumes real `liveSignals` (app.jsx) — each signal already carries
// a real `domain` field (mapped from cone_domain) and a real strength score
// (`fs`, 0-1). No mock/random signal data. If liveSignals is empty, the
// field renders empty rather than fabricating placeholder nodes (§22 —
// absence is a state, not something to paper over with fake activity).
//
// Six locked domains only (TECHNOLOGY/CAPITAL/KNOWLEDGE/LABOR/MEDIA/
// OWNERSHIP, per domainpackage.js) — Analysis Bay's 8 UI pills map onto
// these six (see specs/analysis-domain-taxonomy-unification.md).
//
// activeDomain: null shows all six regions; passing one of the six locked
// domain names filters the field down to just that domain's nodes.
import { useRef, useEffect, useMemo } from 'react';

const LIME = 'rgba(102,255,0,';
const BLUE = 'rgba(0,127,255,';
const GRID_ALPHA = 0.04;

// Six locked domains, evenly spaced around the field — same order used
// everywhere else in the codebase (domainpackage.js's DOMAINS).
import { CANONICAL_DOMAINS } from '../../engine/ontology.js';
const DOMAIN_ORDER = CANONICAL_DOMAINS.map(d => d.toUpperCase()); // KRYL-1065 — sourced from ontology

function domainAngle(domain) {
  const idx = DOMAIN_ORDER.indexOf(domain);
  return idx === -1 ? null : (idx / DOMAIN_ORDER.length) * Math.PI * 2;
}

export default function AnalysisDomainField({
  signals = [],           // real liveSignals from app.jsx — { id, domain, fs, strength, text }
  pressure = 0,
  convergenceState = 'INSUFFICIENT_SIGNAL',
  activeDomain = null,    // null = all domains, or one of DOMAIN_ORDER to filter
}) {
  const canvasRef      = useRef(null);
  const runningRef     = useRef(false);
  const pressureRef    = useRef(pressure);
  const convergenceRef = useRef(convergenceState);
  const nodesRef        = useRef([]); // mutable node state, rebuilt when signal identity set changes

  useEffect(() => { pressureRef.current    = pressure;         }, [pressure]);
  useEffect(() => { convergenceRef.current = convergenceState; }, [convergenceState]);

  // Only real signals with a recognized domain get a node. Unrecognized/null
  // domain is dropped rather than dumped into a fallback bucket — an
  // unclassified signal isn't evidence of anything about domain distribution.
  const domainSignals = useMemo(
    () => signals.filter(s => domainAngle(s.domain) !== null && (!activeDomain || s.domain === activeDomain)),
    [signals, activeDomain],
  );

  // Rebuild node positions when the actual set of signal ids changes (not on
  // every strength tick) — nodes drift continuously rather than resetting.
  const signalKey = domainSignals.map(s => s.id).join(',');
  useEffect(() => {
    nodesRef.current = domainSignals.map(s => {
      const angle    = domainAngle(s.domain);
      const jitter   = (Math.random() - 0.5) * 0.35; // spread within the domain's sector
      const radius   = 0.25 + Math.random() * 0.4;   // distance from center, within the sector ring
      return {
        id: s.id,
        domain: s.domain,
        fs: s.fs ?? 0,
        angle: angle + jitter,
        radius,
        driftAngle: (Math.random() - 0.5) * 0.0006,
        driftRadius: (Math.random() - 0.5) * 0.0004,
        op: 0.25 + (s.fs ?? 0) * 0.55,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      const cx = W / 2, cy = H / 2;
      const fieldR = Math.min(W, H) * 0.42;

      ctx.clearRect(0, 0, W, H);

      // coordinate lattice — unchanged from the particle version
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

      // real signal nodes, circling within their domain's sector
      for (const n of nodesRef.current) {
        n.angle  += n.driftAngle * speed;
        n.radius += n.driftRadius * speed;
        if (n.radius < 0.15) n.radius = 0.15;
        if (n.radius > 0.65) n.radius = 0.65;

        const x = cx + Math.cos(n.angle) * n.radius * fieldR;
        const y = cy + Math.sin(n.angle) * n.radius * fieldR;
        const size = 1.2 + n.fs * 2.5; // real strength drives node size

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `${col}${n.op})`;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    tick();
    return () => { runningRef.current = false; ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
