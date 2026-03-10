// src/components/oracleview.jsx
// WO-226 — ETR Score-Weighted Entry Mechanics
// WO-227 — KineticGravity behind UI
// WO-228 — Particle layer isolation; position:fixed → absolute; dedicated stacking context
// WO-232 — Signal Map condition + signalMapData prop
// WO-246 — isMap derived from lens; KineticGravity unmounted when map active
// WO-254 — Canvas wrapper added for SignalMap; nodes prop replaces signalMapData
import "../styles/oracle.css";
import "../styles/groundlevel.css";
import React, { useState, useEffect, useCallback } from 'react';
import KineticGravity from "./spine/kineticgravity.jsx";
import SignalMap from "./spine/signalmap.jsx";

const GroundLevelOracle = () => {
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [metrics, setMetrics] = useState({
    roomTemp:    '--',
    mirageIndex: '--',
    elephantAge: '--',
    shadowPulse: '--',
    braveScore:  '--',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics({
        roomTemp:    '21.4°C',
        mirageIndex: '0.73',
        elephantAge: '47d',
        shadowPulse: '12.1 bpm',
        braveScore:  '84%',
      });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleInterrupt = useCallback(() => setIsIntroActive(false), []);

  useEffect(() => {
    if (!isIntroActive) return;
    const onAny = () => handleInterrupt();
    document.addEventListener('mousemove', onAny, { once: true, passive: true });
    document.addEventListener('keydown',   onAny, { once: true, passive: true });
    return () => {
      document.removeEventListener('mousemove', onAny);
      document.removeEventListener('keydown',   onAny);
    };
  }, [isIntroActive, handleInterrupt]);

  if (isIntroActive) {
    return (
      <div className="oracle-intro ground-level-init">
        <div className="oracle-pulse"></div>
        <div className="oracle-label">Ground Level Initializing</div>
      </div>
    );
  }

  const metricRows = [
    { label: 'The Room Temp',    value: metrics.roomTemp    },
    { label: 'The Mirage Index', value: metrics.mirageIndex },
    { label: 'The Elephant Age', value: metrics.elephantAge },
    { label: 'The Shadow Pulse', value: metrics.shadowPulse },
    { label: 'The Brave Score',  value: metrics.braveScore  },
  ];

  return (
    <div className="oracle-container ground-level-view">
      <div className="oracle-frame">
        {metricRows.map((metric, index) => (
          <React.Fragment key={metric.label}>
            <div className="oracle-row">
              <div className="oracle-row-label">{metric.label}</div>
              <div className="oracle-data">
                <span className="oracle-mono">{metric.value}</span>
              </div>
            </div>
            {index < metricRows.length - 1 && <div className="oracle-divider"></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

function Oracleview({ data, signalMapData, lens, onLensSwitch, query }) {
  const score = data?.signal_score ?? null;
  const title = data?.title ?? "Dog is skinny";
  const isMap = lens === "Signal Map";

  return (
    <div className="oracle-viewport">

      {/* Layer 1 — Particle void — unmounted when map active */}
      <div className="oracle-particle-layer">
        {!isMap && <KineticGravity isPaused={false} />}
      </div>

      {/* Layer 10 — Interactive UI */}
      <div className="oracle-ui-layer">

        <div className="oracle-hero">
          <h1 className="oracle-title">{title}</h1>
        </div>

        <div className="oracle-nav-wrapper">
          <div className="oracle-nav-track">
            {["10K View", "Ground Level", "Signal Map"].map((tab) => (
              <button
                key={tab}
                className={`oracle-nav-btn ${lens === tab ? "active" : ""}`}
                onClick={() => onLensSwitch(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {!isMap && (
          <div className="oracle-score-container">
            <div className="oracle-score">
              {score !== null ? Math.round(score * 100) : '--'}
            </div>
            <div className="oracle-label">SIGNAL SCORE</div>
          </div>
        )}

        {!isMap && (
          lens === "Ground Level" ? (
            <GroundLevelOracle />
          ) : (
            <div className="oracle-stack">
              <div className="oracle-card">
                <div className="oracle-quote">
                  "The avoidance is the agreement."
                </div>
                <div className="oracle-subtext">
                  Collective silence detected across 78% of signals on this topic.
                </div>
              </div>
              <div className="oracle-card">
                <div className="oracle-body">
                  I finally brought it up at Thanksgiving. The silence was deafening —
                  but then my sister said she felt the same way for years.
                </div>
                <div className="oracle-footer">
                  <span>Anonymous</span>
                  <span>3 days ago</span>
                </div>
              </div>
            </div>
          )
        )}

        {isMap && (
          <SignalMap signalMapData={signalMapData} />
        )}

      </div>

      {/* WO-245 — Return button, map only */}
      {isMap && (
        <button
          onClick={() => onLensSwitch("10K View")}
          style={{
            position:       'absolute',
            top:            '20px',
            right:          '20px',
            zIndex:         20,
            background:     'rgba(0,0,0,0.6)',
            border:         '1px solid rgba(232,244,255,0.25)',
            borderRadius:   '8px',
            color:          'rgba(232,244,255,0.85)',
            fontFamily:     'IBM Plex Mono, monospace',
            fontSize:       '11px',
            letterSpacing:  '0.15em',
            padding:        '8px 16px',
            cursor:         'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          ← RETURN
        </button>
      )}

    </div>
  );
}

export default Oracleview;