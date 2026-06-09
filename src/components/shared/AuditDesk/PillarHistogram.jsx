// src/components/shared/AuditDesk/PillarHistogram.jsx
// WO-266b — Horizontal bar chart for all 7 pillars

import React from 'react';

const PILLARS = ['trust', 'accuracy', 'gap', 'velocity', 'expiration', 'strength', 'alignment'];

export default function PillarHistogram({ pillars, onPillarClick }) {
  return (
    <div className="pillar-histogram">
      <div className="pillar-histogram__title">Pillar Breakdown</div>
      {PILLARS.map(key => {
        const val = Math.min(100, Math.max(0, Math.round(pillars?.[key] ?? 0)));
        return (
          <div
            key={key}
            className="pillar-histogram__row"
            onClick={() => onPillarClick?.(key)}
            title={`${key}: ${val}`}
          >
            <span className="pillar-histogram__label">{key}</span>
            <div className="pillar-histogram__track">
              <div
                className="pillar-histogram__bar-fill"
                style={{ width: `${val}%` }}
              />
            </div>
            <span className="pillar-histogram__val">{val}</span>
          </div>
        );
      })}
    </div>
  );
}
