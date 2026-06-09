// WO-1350 + A&B — Runtime Bays with Mode Selector, Live Cones, Instrument Feel

import React, { useState, useMemo } from 'react';
import { BAY_MAP, CONES, buildActiveCones } from '../../engine/cones.js';
import { useBayStore } from '../../store/usebaystore.js';

// ── Mode options ──────────────────────────────────────────────────────────────

const MODES = ["default", "graph", "alerts", "color"];

// ── Workstation ───────────────────────────────────────────────────────────────

export default function Workstation({ liveSignals = [] }) {
  const [mode, setMode] = useState({
    B01: "default",
    B02: "default",
    B03: "default",
    B04: "default",
    B05: "default",
    B06: "default"
  });

  const [focus, setFocus] = useState("B01");

  const activeCones = useMemo(() => buildActiveCones(liveSignals), [liveSignals]);
  const bays        = useBayStore(s => s.bays);

  const renderBay = (bay) => {
    const cone = activeCones[BAY_MAP[bay]];
    const m = mode[bay];

    switch (m) {
      case "default":
        return cone.value;

      case "graph":
        return JSON.stringify(cone.trend);

      case "alerts":
        return cone.alerts.length ? cone.alerts : "none";

      case "color":
        return cone.color;

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 48, left: 72, right: 0, bottom: 0,
      background: '#000', color: '#fff', overflow: 'auto',
    }}>
      {Object.keys(BAY_MAP).map((bay) => {
        const isFocused  = focus === bay;
        const bayNum     = Number(bay.slice(1));
        const assignment = bays[bayNum]?.assignment;
        return (
          <div
            key={bay}
            onClick={() => setFocus(bay)}
            style={{
              padding: 10,
              border: isFocused ? '1px solid rgba(102,255,0,0.7)' : '1px solid rgba(255,255,255,0.15)',
              opacity: isFocused ? 1 : 0.35,
              transform: isFocused ? 'scale(1.01)' : 'scale(1)',
              transition: 'opacity 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
              cursor: 'pointer',
            }}
          >
            <div>{bay}{assignment?.title ? ` · ${assignment.title}` : ''}</div>

            <select
              value={mode[bay]}
              onChange={(e) =>
                setMode((m) => ({
                  ...m,
                  [bay]: e.target.value
                }))
              }
              onClick={(e) => e.stopPropagation()}
            >
              <option value="default">default</option>
              <option value="graph">graph</option>
              <option value="alerts">alerts</option>
              <option value="color">color</option>
            </select>

            {/* A — fade on mode change via key */}
            <div
              key={`${bay}-${mode[bay]}`}
              style={{ animation: 'bayFadeIn 0.18s ease' }}
            >
              {renderBay(bay)}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes bayFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
