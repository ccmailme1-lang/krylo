import React, { useEffect, useRef, useState } from 'react';
import GlassPanel from './GlassPanel';
import LensToggle from './LensToggle';
import GroundLevel from './GroundLevel';

function StrengthDots({ count }) {
  return (
    <div className="signal-strength">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`s-dot${i < count ? ' on' : ''}`} />
      ))}
    </div>
  );
}

function sentimentClass(strength) {
  if (strength >= 4) return 'rising';
  if (strength <= 2) return 'falling';
  return 'neutral';
}

function sentimentLabel(strength) {
  if (strength >= 4) return 'Confirmed';
  if (strength <= 2) return 'Contested';
  return 'Mixed';
}

export default function OracleView({ data, query, activeLens, onLensSwitch }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    const timer = setTimeout(() => {
      containerRef.current?.classList.add('visible');
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) {
    return (
      <div className="oracle-container" ref={containerRef}>
        <div className="loading-text">Surfacing truth...</div>
      </div>
    );
  }

  const isGround = activeLens === 'ground';
  const isMap = activeLens === 'map';

  return (
    <div
      className={`oracle-container${isGround ? ' ground-active' : ''}${isMap ? ' map-active' : ''}`}
      ref={containerRef}
      style={isGround ? undefined : undefined}
    >
      {/* Lens Header */}
      <div className="lens-header">
        <div className="lens-topic">{query}</div>
        <LensToggle activeLens={activeLens} onSwitch={onLensSwitch} />
      </div>

      {/* Signal Map container (populated externally by SpineMap) */}
      <div className="signal-map-wrap" id="signalMapWrap" />

      {/* Signal Score */}
      <div className="signal-score-wrap">
        <div className="emergence-text">
          <div className="signal-number">{data.signal_score}</div>
          <div style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 2 }}>
            Signal Score
          </div>
        </div>
      </div>

      {/* Truth Statement Panel */}
      <GlassPanel style={isGround ? { background: 'var(--glass-ground)' } : undefined}>
        <div className="emergence-text" style={{ transitionDelay: '0.5s' }}>
          <p className="truth-statement">"{data.truth_statement}"</p>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            {data.truth_supporting}
          </p>
        </div>
        {isGround && (
          <GroundLevel ground={data.ground} tags={data.tags} />
        )}
      </GlassPanel>

      {/* Signal Cards */}
      {data.signals.map((sig, i) => (
        <GlassPanel key={i} style={isGround ? { background: 'var(--glass-ground)' } : undefined}>
          <div className="emergence-text" style={{ transitionDelay: `${0.8 + i * 0.3}s` }}>
            <div className="signal-text">{sig.text}</div>
            <div className="signal-meta">
              <span className="signal-source">{sig.source}</span>
              <StrengthDots count={sig.strength} />
            </div>
          </div>
          {isGround && (
            <div className="data-nervous-system" style={{ display: 'block' }}>
              <div className="ground-row">
                <span className="ground-label">Weight</span>
                <span className="ground-value">
                  {(sig.strength / 5).toFixed(2)}{' '}
                  <span className="ground-bar">
                    <span className="ground-bar-fill" style={{ width: `${sig.strength * 20}%` }} />
                  </span>
                </span>
              </div>
              <div className="ground-row">
                <span className="ground-label">Sentiment</span>
                <span className={`ground-value ${sentimentClass(sig.strength)}`}>
                  {sentimentLabel(sig.strength)}
                </span>
              </div>
            </div>
          )}
        </GlassPanel>
      ))}

      {/* Patterns Panel */}
      <GlassPanel style={isGround ? { background: 'var(--glass-ground)' } : undefined}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, opacity: 0.6 }}>
          Key Patterns
        </p>
        {data.patterns.map((pat, i) => (
          <div
            key={i}
            className="emergence-text"
            style={{ transitionDelay: `${1.7 + i * 0.3}s` }}
          >
            <p style={{ fontFamily: "'Instrument Serif'", fontSize: 20, fontStyle: 'italic' }}>
              {pat.headline}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 300 }}>
              {pat.detail}
            </p>
            {i < data.patterns.length - 1 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '16px 0' }} />
            )}
          </div>
        ))}
        {isGround && (
          <div className="data-nervous-system" style={{ display: 'block' }}>
            <div className="ground-row">
              <span className="ground-label">Sentiment</span>
              <span className="ground-value">
                {data.ground?.sentiment_pct}% aligned{' '}
                <span className="ground-bar">
                  <span className="ground-bar-fill" style={{ width: `${data.ground?.sentiment_pct}%` }} />
                </span>
              </span>
            </div>
            <div className="ground-row">
              <span className="ground-label">Momentum</span>
              <span className={`ground-value ${data.ground?.momentum_pct > 0 ? 'rising' : 'falling'}`}>
                {data.ground?.momentum_pct > 0 ? '+' : ''}{data.ground?.momentum_pct}% MoM
              </span>
            </div>
            <div className="ground-tags">
              {(data.tags || []).map((t) => (
                <span className="ground-tag" key={t}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Contribute CTA */}
      <GlassPanel className="contribute-panel">
        <div className="emergence-text" style={{ transitionDelay: '2.3s' }}>
          <div className="contribute-line">You're not the only one carrying this.</div>
          <button className="contribute-btn">Add your truth</button>
        </div>
      </GlassPanel>
    </div>
  );
}
