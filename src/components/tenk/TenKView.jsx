// src/components/tenk/TenKView.jsx
// WO-283 — 10K View: signal score, synthesis, meaning, etymology, comments

import React from 'react';
import { usePrism }       from '../../context/PrismContext.jsx';
import { getSynthesis }   from '../../utils/getSynthesis.js';
import { CATEGORY_MAP }   from '../../data/categoryMap.js';
import comments           from '../../data/mockComments.json';
import '../../styles/tenk.css';

const PILLAR_KEYS = ['trust', 'accuracy', 'gap', 'velocity', 'expiration', 'strength', 'alignment'];

function signalScore(pillars) {
  if (!pillars) return 0;
  // 6-pillar mean — gap key is 'gap', not 'the_gap'
  const keys = PILLAR_KEYS.filter(k => k !== 'gap');
  const sum  = keys.reduce((acc, k) => acc + (pillars[k] ?? 0), 0);
  return Math.round(sum / keys.length);
}

export default function TenKView() {
  const { state, dispatch } = usePrism();
  const { activeRefraction, activeCategory } = state;

  if (!activeRefraction) {
    return (
      <div style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '0.75rem',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color:         '#999',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        minHeight:     '200px',
      }}>
        — No Signal —
      </div>
    );
  }

  const { pillars } = activeRefraction;
  const score       = signalScore(pillars);
  const anchorId    = activeCategory ?? activeRefraction.cat_id ?? 'SILENCE';
  const synthesis   = getSynthesis(pillars, anchorId, CATEGORY_MAP);
  const category    = CATEGORY_MAP[anchorId] ?? CATEGORY_MAP.SILENCE;

  const handleScoreClick = () => {
    dispatch({ type: 'SET_LAYER', payload: 2 });
  };

  return (
    <div style={{ fontFamily: 'IBM Plex Mono, monospace', padding: '24px', background: '#6a6c7a' }}>

      {/* Signal Score */}
      <div
        className="tenk-score-container"
        onClick={handleScoreClick}
        title="Click to drill"
      >
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>
          Signal Score
        </div>
        <div className="signal-score" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
          {score}
        </div>
      </div>

      {/* Synthesis */}
      <div style={{ marginTop: '24px', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '8px' }}>
          Synthesis
        </div>
        <div style={{ fontSize: '1rem', color: '#1A1A1A', lineHeight: 1.5, fontFamily: 'Georgia, serif' }}>
          {synthesis}
        </div>
      </div>

      {/* Category Meaning */}
      <div className="tenk-meaning" style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>
          Meaning
        </div>
        <div style={{ fontSize: '0.8rem', color: '#444', lineHeight: 1.5 }}>
          {category.meaning}
        </div>
      </div>

      {/* Etymology */}
      <div className="tenk-meaning" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>
          Etymology
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5, fontStyle: 'italic' }}>
          {category.etymology}
        </div>
      </div>

      {/* Comments */}
      <div>
        <div style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '12px' }}>
          Signal Evidence
        </div>
        {comments.map(c => (
          <div key={c.id} style={{
            borderLeft:   '2px solid #66FF00',
            paddingLeft:  '12px',
            marginBottom: '14px',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#1A1A1A', lineHeight: 1.5, marginBottom: '4px' }}>
              {c.text}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {c.source} · {c.timestamp.slice(0, 10)} · str {Math.round(c.strength * 100)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
