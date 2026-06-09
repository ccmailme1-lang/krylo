// src/components/spine/annotationlayer.jsx
// WO-1333 — Dynamic Annotation Layer (Scrubber-Relative)
// DOM overlay. Annotations lock to scrubber t position.
// Virtualized: only renders annotations within [0,1] viewport (all by default).
// Hover: z-index elevation + detail expansion.

import React, { useState } from 'react';
import { useAnnotationStore } from '../../store/useannotationstore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Tag → accent color
const TAG_COLOR = {
  CAPITAL:    '#007FFF',
  LABOR:      '#66FF00',
  MEDIA:      '#8A2BE2',
  TECHNOLOGY: '#66FF00',
  KNOWLEDGE:  '#007FFF',
  OWNERSHIP:  '#8A2BE2',
};

// Scrubber rail inset from container edges (matches TemporalScrubber padding + label widths)
// left: 24px padding + 50px LIVE label + 8px gap = 82px
// right: 24px padding + 110px time label + 8px gap = 142px
const RAIL_LEFT_PCT  = '7%';
const RAIL_RIGHT_PCT = '12%';

function AnnotationPin({ annotation, scrubPos }) {
  const [hovered, setHovered] = useState(false);
  const accent = TAG_COLOR[annotation.tag] ?? LIME;

  // Coordinate: x = timestamp * 100% within rail
  const left = `calc(${RAIL_LEFT_PCT} + ${annotation.timestamp} * (100% - ${RAIL_LEFT_PCT} - ${RAIL_RIGHT_PCT}))`;

  // Pulse intensity → tick height (magnitude drives visual weight per spec)
  const tickH = 8 + Math.round(annotation.magnitude * 16);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'absolute',
        left,
        bottom:       0,
        transform:    'translateX(-50%)',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        zIndex:       hovered ? 30 : 12,
        pointerEvents:'auto',
        cursor:       'default',
      }}
    >
      {/* Detail container — expands on hover */}
      {hovered && (
        <div style={{
          position:      'absolute',
          bottom:        tickH + 6,
          left:          '50%',
          transform:     'translateX(-50%)',
          background:    'rgba(0,0,0,0.92)',
          border:        `1px solid ${accent}33`,
          padding:       '7px 10px',
          minWidth:      140,
          maxWidth:      200,
          fontFamily:    MONO,
          pointerEvents: 'none',
          whiteSpace:    'nowrap',
        }}>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', color: accent, marginBottom: 4 }}>
            {annotation.tag}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em', marginBottom: 5 }}>
            {annotation.label}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
            t={annotation.timestamp.toFixed(3)} · mag={annotation.magnitude.toFixed(2)}
          </div>
        </div>
      )}

      {/* Vertical tick */}
      <div style={{
        width:      1,
        height:     tickH,
        background: hovered ? accent : `${accent}55`,
        transition: 'background 0.12s, height 0.1s',
      }} />

      {/* Base dot */}
      <div style={{
        width:        hovered ? 5 : 3,
        height:       hovered ? 5 : 3,
        borderRadius: '50%',
        background:   hovered ? accent : `${accent}66`,
        marginTop:    1,
        transition:   'all 0.12s',
      }} />
    </div>
  );
}

export default function AnnotationLayer() {
  const { annotations, scrubPos } = useAnnotationStore();

  // Virtualize: only render if timestamp within visible range [0,1]
  const visible = annotations.filter(a => a.timestamp >= 0 && a.timestamp <= 1);
  if (!visible.length) return null;

  return (
    <div style={{
      position:      'fixed',
      bottom:        112,
      left:          72,
      right:         0,
      height:        32,
      zIndex:        12,
      pointerEvents: 'none',
    }}>
      {/* Scrubhead marker — current scrub position */}
      <div style={{
        position:   'absolute',
        bottom:     0,
        left:       `calc(${RAIL_LEFT_PCT} + ${scrubPos} * (100% - ${RAIL_LEFT_PCT} - ${RAIL_RIGHT_PCT}))`,
        transform:  'translateX(-50%)',
        width:      1,
        height:     32,
        background: `${LIME}22`,
        pointerEvents: 'none',
      }} />

      {visible.map(a => (
        <AnnotationPin key={a.id} annotation={a} scrubPos={scrubPos} />
      ))}
    </div>
  );
}
