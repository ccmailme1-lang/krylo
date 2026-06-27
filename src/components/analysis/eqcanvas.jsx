// WO-1762 — Parametric Intel Spline Canvas (EQ Metaphor)
// HTML5 Canvas 2D. Read-only. Advanced (premium) mode only.
// X-axis: 6 canonical domains (TECHNOLOGY → OWNERSHIP).
// Y-axis: signal strength 0–100.
// Default state: convergence color curve + purple peak if Happy Path qualifies.
// Hover (transient mode): purple surface, labels surface on qualifying peaks.
// Click peak → Commit Thesis (WO-1823 stub). Right-click → Set Trigger (WO-1820 stub).

import React, { useRef, useEffect, useState } from 'react';
import { useHappyPathEngine, EQ_DOMAINS } from '../../engine/happypathdisplacementengine.js';
import { HIGH_CONVERGENCE_FLOOR as HIGH_FLOOR } from '../../engine/signalconstants.js';

const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const PURPLE = '#8A2BE2';
const SLATE  = '#3a3d4a';
const MONO   = "'IBM Plex Mono', monospace";
const CW = 800; // canvas internal width (CSS scales to container)
const CH = 200; // canvas internal height

const STATE_COLOR = {
  HIGH:         PURPLE,
  BUILDING:     LIME,
  TURBULENT:    BLUE,
  LOW:          SLATE,
  INSUFFICIENT: SLATE,
};

// Cardinal spline → Bezier control points for smooth composite curve
function buildSegments(pts) {
  return pts.slice(0, -1).map((p1, i) => {
    const p0 = pts[Math.max(i - 1, 0)];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const t = 0.45;
    return {
      p1, p2,
      cp1: { x: p1.x + (p2.x - p0.x) * t / 3, y: p1.y + (p2.y - p0.y) * t / 3 },
      cp2: { x: p2.x - (p3.x - p1.x) * t / 3, y: p2.y - (p3.y - p1.y) * t / 3 },
    };
  });
}

function domainX(i) {
  const pad  = CW / (EQ_DOMAINS.length * 2);
  const step = (CW - pad * 2) / (EQ_DOMAINS.length - 1);
  return pad + i * step;
}

function scoreY(score) {
  return CH - (score / 100) * (CH * 0.82) - CH * 0.06;
}

export default function EQCanvas({ onCommitThesis, onSetTrigger, isPremium = true, hpOverride }) {
  const canvasRef = useRef(null);
  const { engineState, domainSignals } = useHappyPathEngine();
  const [hovered, setHovered] = useState(false);

  // ── DRAW ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !domainSignals) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CW, CH);

    // Background — purple tint on hover (FabFilter Pro-Q activation pattern)
    ctx.fillStyle = hovered ? 'rgba(40,0,80,0.22)' : '#000000';
    ctx.fillRect(0, 0, CW, CH);

    // Horizontal grid lines — Tufte minimal data-ink
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (const level of [25, 50, 75]) {
      const y = scoreY(level);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }

    // Qualification floor — dashed purple, not labelled on canvas
    const floorY = scoreY(HIGH_FLOOR);
    ctx.strokeStyle = 'rgba(138,43,226,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(CW, floorY); ctx.stroke();
    ctx.setLineDash([]);

    // Build domain points
    const hp  = hpOverride ?? engineState.happyPath;
    const pts = EQ_DOMAINS.map((d, i) => {
      const sig = domainSignals[d] ?? { score: 0, state: 'INSUFFICIENT', qualified: false };
      return { x: domainX(i), y: scoreY(sig.score), score: sig.score, state: sig.state, qual: sig.qualified, d, i };
    });

    // Composite curve — per-segment color from domain convergence state
    const segs = buildSegments(pts);
    for (let i = 0; i < segs.length; i++) {
      const { p1, p2, cp1, cp2 } = segs[i];
      const isHappy = hp?.qualified && (i === hp.peakPosition || i === hp.peakPosition - 1);
      ctx.strokeStyle = isHappy ? PURPLE : (STATE_COLOR[pts[i].state] ?? SLATE);
      ctx.lineWidth   = isHappy ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
      ctx.stroke();
    }

    // Happy Path peak — purple glow + dot
    if (hp?.qualified) {
      const pk = pts[hp.peakPosition];
      if (pk) {
        const grd = ctx.createRadialGradient(pk.x, pk.y, 0, pk.x, pk.y, 22);
        grd.addColorStop(0, 'rgba(138,43,226,0.45)');
        grd.addColorStop(1, 'rgba(138,43,226,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(pk.x, pk.y, 22, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = PURPLE;
        ctx.beginPath(); ctx.arc(pk.x, pk.y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Hover — transient mode: illuminate qualifying peaks, surface labels
    if (hovered) {
      ctx.textAlign = 'center';
      for (const pt of pts) {
        if (pt.score >= HIGH_FLOOR) {
          // Vertical dashed line
          ctx.strokeStyle = pt.qual ? 'rgba(138,43,226,0.5)' : 'rgba(102,255,0,0.22)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(pt.x, CH - 2); ctx.lineTo(pt.x, pt.y - 12); ctx.stroke();
          ctx.setLineDash([]);

          // Score
          ctx.fillStyle = pt.qual ? PURPLE : LIME;
          ctx.font = `bold 9px ${MONO}`;
          ctx.fillText(`${Math.round(pt.score)}`, pt.x, pt.y - 16);

          // Domain label for qualifying peaks
          if (pt.qual) {
            ctx.fillStyle = 'rgba(138,43,226,0.65)';
            ctx.font = `7px ${MONO}`;
            ctx.fillText(pt.d.slice(0, 4).toUpperCase(), pt.x, pt.y - 27);
          }
        } else {
          // Below floor: dim score only
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.font = `7px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(pt.score)}`, pt.x, pt.y - 10);
        }
      }
    }

    // Domain dots — always visible
    for (const pt of pts) {
      const isHappyPeak = hp?.qualified && pt.i === hp.peakPosition;
      ctx.fillStyle = isHappyPeak ? PURPLE : (STATE_COLOR[pt.state] ?? SLATE);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, isHappyPeak ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }

  }, [domainSignals, engineState, hovered]);

  // ── HIT DETECTION ────────────────────────────────────────────────────────────
  function peakAt(clientX) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect  = canvas.getBoundingClientRect();
    const x     = (clientX - rect.left) * (CW / rect.width);
    for (let i = 0; i < EQ_DOMAINS.length; i++) {
      if (Math.abs(x - domainX(i)) < 26) return i;
    }
    return null;
  }

  function handleClick(e) {
    const idx = peakAt(e.clientX);
    if (idx !== null) onCommitThesis?.({ domain: EQ_DOMAINS[idx], engineState });
  }

  function handleContextMenu(e) {
    e.preventDefault();
    const idx = peakAt(e.clientX);
    if (idx !== null) onSetTrigger?.({ domain: EQ_DOMAINS[idx], peakPosition: idx });
  }

  // ── PREMIUM GATE ─────────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.35em', textTransform: 'uppercase' }}>Advanced Mode · Premium</span>
      </div>
    );
  }

  const hp = hpOverride ?? engineState.happyPath;

  return (
    <div style={{ background: '#000', fontFamily: MONO, borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Convergence Field</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>EQ</span>
        </div>
        {hp?.qualified ? (
          <span style={{ fontSize: 9, letterSpacing: '0.22em', color: PURPLE, border: `1px solid rgba(138,43,226,0.35)`, padding: '2px 8px', textTransform: 'uppercase' }}>
            Happy Path
          </span>
        ) : (
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>—</span>
        )}
      </div>

      {/* ── CANVAS ──────────────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ width: '100%', height: CH, display: 'block' }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* ── DOMAIN LABELS — DOM, not canvas (WO-1762 spec) ─────────────────── */}
      <div style={{ display: 'flex', padding: '4px 0 6px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        {EQ_DOMAINS.map(d => {
          const sig   = engineState.domainStates?.[d];
          const color = sig?.qualified ? PURPLE : (STATE_COLOR[sig?.state] ?? SLATE);
          return (
            <div key={d} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 9, letterSpacing: '0.1em', color, textTransform: 'uppercase', opacity: (sig?.score ?? 0) < 20 ? 0.3 : 0.85 }}>
                {d.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── HAPPY PATH METADATA — only when qualified ────────────────────────── */}
      {hp?.qualified && (
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24, rowGap: 6, padding: '8px 16px', borderTop: '1px solid rgba(138,43,226,0.15)' }}>
          {[
            { label: 'Domains',  value: hp.domains.join(' · ') },
            { label: 'Score',    value: hp.peakScore.toFixed(0) },
            { label: 'Velocity', value: hp.velocity },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: 'rgba(138,43,226,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontSize: 9, color: PURPLE, letterSpacing: '0.08em' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
