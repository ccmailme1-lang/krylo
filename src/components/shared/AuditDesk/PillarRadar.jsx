// src/components/shared/AuditDesk/PillarRadar.jsx
// WO-266b — SVG radar chart for 7 pillars

import React from 'react';

const PILLARS = ['trust', 'accuracy', 'gap', 'velocity', 'expiration', 'strength', 'alignment'];
const N       = PILLARS.length;
const CX      = 80;
const CY      = 80;
const R       = 60;

function polarToXY(angle, r) {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function buildPath(values) {
  return values
    .map((v, i) => {
      const angle = (360 / N) * i;
      const r     = (v / 100) * R;
      const { x, y } = polarToXY(angle, r);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}

export default function PillarRadar({ pillars }) {
  const values = PILLARS.map(k => Math.min(100, Math.max(0, Math.round(pillars?.[k] ?? 0))));

  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="pillar-radar">
      <div className="pillar-radar__title">Signal Radar</div>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Grid rings */}
        {gridLevels.map(level => (
          <polygon
            key={level}
            points={PILLARS.map((_, i) => {
              const angle = (360 / N) * i;
              const r = (level / 100) * R;
              const { x, y } = polarToXY(angle, r);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        {PILLARS.map((_, i) => {
          const angle = (360 / N) * i;
          const { x, y } = polarToXY(angle, R);
          return (
            <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)}
              stroke="#E0E0E0" strokeWidth="1" />
          );
        })}

        {/* Data polygon */}
        <path d={buildPath(values)} fill="rgba(102,255,0,0.25)" stroke="#66FF00" strokeWidth="1.5" />

        {/* Labels */}
        {PILLARS.map((key, i) => {
          const angle = (360 / N) * i;
          const { x, y } = polarToXY(angle, R + 12);
          return (
            <text key={key} x={x.toFixed(1)} y={y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="7" fontFamily="IBM Plex Mono" fill="#999"
              style={{ textTransform: 'uppercase' }}
            >
              {key.slice(0, 3).toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
