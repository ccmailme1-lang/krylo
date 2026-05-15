// src/components/shared/AuditDesk/index.jsx
// WO-266b + WO-287 — Audit Desk: pillar visualisation + drill trigger

import React from 'react';
import PillarHistogram from './PillarHistogram.jsx';
import PillarRadar     from './PillarRadar.jsx';
import './AuditDesk.css';

export default function AuditDesk({ pillars, isRefracted, onPillarClick, onDrill }) {
  if (!isRefracted) {
    return (
      <div className="audit-desk">
        <div className="audit-desk__insufficient">
          — Insufficient Data —
        </div>
      </div>
    );
  }

  return (
    <div className="audit-desk">
      <div className="audit-desk__header">Forensic Refraction — Audit Desk</div>

      <div className="audit-desk__charts">
        <PillarHistogram pillars={pillars} onPillarClick={onPillarClick} />
        <PillarRadar     pillars={pillars} />
      </div>

      <button className="audit-desk__drill-btn" onClick={onDrill}>
        Drill to Ground Level
      </button>
    </div>
  );
}
