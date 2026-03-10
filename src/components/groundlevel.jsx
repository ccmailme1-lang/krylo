import React from 'react';

function velocityClass(v) {
  if (v === 'rising') return 'rising';
  if (v === 'cooling') return 'falling';
  return 'neutral';
}

function momentumClass(m) {
  return m > 0 ? 'rising' : 'falling';
}

export default function GroundLevel({ ground, tags, signalStrength, signalCount }) {
  if (!ground) return null;

  return (
    <div className="data-nervous-system" style={{ display: 'block' }}>
      <div className="ground-row">
        <span className="ground-label">Velocity</span>
        <span className={`ground-value ${velocityClass(ground.velocity)}`}>
          ▲ {ground.velocity}
        </span>
      </div>
      <div className="ground-row">
        <span className="ground-label">Signal Count</span>
        <span className="ground-value">
          {(ground.signal_count || 0).toLocaleString()}
        </span>
      </div>
      <div className="ground-row">
        <span className="ground-label">Last Signal</span>
        <span className="ground-value">{ground.recency_hours}h ago</span>
      </div>
      <div className="ground-row">
        <span className="ground-label">Convergence</span>
        <span className="ground-value">
          {ground.convergence}{' '}
          <span className="ground-bar">
            <span
              className="ground-bar-fill"
              style={{ width: `${ground.convergence * 100}%` }}
            />
          </span>
        </span>
      </div>
      <div className="ground-row">
        <span className="ground-label">Sentiment</span>
        <span className="ground-value">
          {ground.sentiment_pct}% aligned{' '}
          <span className="ground-bar">
            <span
              className="ground-bar-fill"
              style={{ width: `${ground.sentiment_pct}%` }}
            />
          </span>
        </span>
      </div>
      <div className="ground-row">
        <span className="ground-label">Momentum</span>
        <span className={`ground-value ${momentumClass(ground.momentum_pct)}`}>
          {ground.momentum_pct > 0 ? '+' : ''}{ground.momentum_pct}% MoM
        </span>
      </div>
      {tags && tags.length > 0 && (
        <div className="ground-tags">
          {tags.map((t) => (
            <span className="ground-tag" key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
