// WO-1106-D — Analysis Continuum: continuous mount P1–P4
import React, { useEffect } from 'react';
import { useUIStore }       from '../../store/useuistore.js';
import { useRenderStore }   from '../../store/userenderstore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Page dot pagination
function PaginationController({ total, activeIndex, onChange }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', gap: 8, zIndex: 10,
      pointerEvents: 'auto',
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          onClick={() => onChange(i)}
          style={{
            height: 6, borderRadius: 3, cursor: 'pointer',
            width:      i === activeIndex ? 20 : 6,
            background: i === activeIndex ? LIME : 'rgba(255,255,255,0.3)',
            opacity:    i === activeIndex ? 1 : 0.3,
            transition: 'width 200ms ease, opacity 200ms ease, background 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

// Placeholder for unbuilt pages
function PlaceholderPage({ label }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderLeft: '1px solid rgba(102,255,0,0.08)',
    }}>
      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </span>
    </div>
  );
}

export default function AnalysisContinuum({ pages }) {
  const swipeIndex          = useUIStore((s) => s.swipeIndex);
  const setSwipeIndex       = useUIStore((s) => s.setSwipeIndex);
  const commitSpatialFrame  = useRenderStore((s) => s.commitSpatialFrame);

  // Sync Barrier: fire commitSpatialFrame after each swipe transition settles (700ms).
  // DOM Mount → Layout Stabilization → commitSpatialFrame → WebGL Sampling
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(commitSpatialFrame, 720);
    });
    return () => cancelAnimationFrame(raf);
  }, [swipeIndex]);

  const resolvedPages = pages ?? [
    <PlaceholderPage key="p1" label="P1 — PROFILE / SEARCH" />,
    <PlaceholderPage key="p2" label="P2 — ORACLE" />,
    <PlaceholderPage key="p3" label="P3 — LENS" />,
    <PlaceholderPage key="p4" label="P4 — ACTION PLAN" />,
  ];

  return (
    <div style={{ width: '100%', height: '100%', overflowX: 'hidden', position: 'relative' }}>
      {/* GPU-accelerated translation track */}
      <div style={{
        display: 'flex', height: '100%',
        transform: `translateX(-${swipeIndex * 100}vw)`,
        transition: 'transform 700ms cubic-bezier(0.16,1,0.3,1)',
        willChange: 'transform',
      }}>
        {resolvedPages.map((page, i) => (
          <div key={i} style={{ width: '100vw', height: '100%', flexShrink: 0 }}>
            {page}
          </div>
        ))}
      </div>

      <PaginationController
        total={resolvedPages.length}
        activeIndex={swipeIndex}
        onChange={setSwipeIndex}
      />
    </div>
  );
}
