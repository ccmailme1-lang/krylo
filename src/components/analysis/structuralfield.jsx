// structuralfield.jsx — KRYL-1243.
//
// SPEC-structural-field-map.md. The six existing domain field values, rendered as
// ONE geometric object: a radial polygon. Fixed angle per domain, radial extent
// affine in the value. Same data as the old six-row FORENSIC MATRIX — different
// perceptual model. The user perceives the SHAPE of the field, not six scores.
//
// Hard invariant: for a fixed six-value vector the geometry is DETERMINISTIC.
// Same v -> same polygon. Nothing outside `cones` (Intent, Horizon, query wording,
// unrelated controls) may distort it. Absence (value === null) is NOT zero: the
// domain keeps its angular position and gets a distinct absence glyph, never r = 0.

import React, { useId } from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Canonical angular assignment (SPEC §3). Global rotation −π/2 so CAPITAL sits at
// the top; relative ordering and spacing are invariant.
const ROT = -Math.PI / 2;
const DOMAINS = [
  { key: 'capital',    label: 'CAPITAL',    short: 'CAP',   theta: 0 },
  { key: 'technology', label: 'TECHNOLOGY', short: 'TECH',  theta: Math.PI / 3 },
  { key: 'knowledge',  label: 'KNOWLEDGE',  short: 'KNOW',  theta: (2 * Math.PI) / 3 },
  { key: 'ownership',  label: 'OWNERSHIP',  short: 'OWN',   theta: Math.PI },
  { key: 'media',      label: 'MEDIA',      short: 'MEDIA', theta: (4 * Math.PI) / 3 },
  { key: 'labor',      label: 'LABOR',      short: 'LAB',   theta: (5 * Math.PI) / 3 },
]; // canonical cyclic order — the ONLY permitted polygon order (SPEC §3, AC-15)

const C = 100;          // SVG centre (viewBox 0 0 200 200)
const R_MIN = 14;       // inner safety radius (> 0)
const R_MAX = 82;       // outer drawing radius
const R_ABSENT = 46;    // fixed intermediate radius for the absence glyph
const RINGS = [0.25, 0.5, 0.75, 1];

const clamp01 = v => Math.max(0, Math.min(1, v));
const radius  = v01 => R_MIN + (R_MAX - R_MIN) * clamp01(v01);   // affine, valid values only
const pt = (r, angle) => [C + r * Math.cos(angle), C + r * Math.sin(angle)];

export default function StructuralField({ cones = {} }) {
  const gid = useId().replace(/:/g, '');

  const nodes = DOMAINS.map(d => {
    const cone  = cones[d.key];
    const raw   = cone ? cone.value : null;
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null; // 0..1 or ∅
    const angle = d.theta + ROT;
    const absent = value === null;
    const r = absent ? R_ABSENT : radius(value);
    const [x, y] = pt(r, angle);
    // Label placement — presentation only, no geometry constants involved. The y
    // comes from the domain's angle so the label still reads at the right clock
    // position; x is pinned to the panel edge so the text always fits the real
    // 242px container (KRYL-1243 live-acceptance fix).
    const cos = Math.cos(angle);
    const lAnchor = Math.abs(cos) < 0.35 ? 'middle' : (cos > 0 ? 'end' : 'start');
    const lx = lAnchor === 'middle' ? C : (cos > 0 ? 197 : 3);
    const ly = lAnchor === 'middle' ? (Math.sin(angle) < 0 ? 13 : 185)
                                    : C + (R_MAX + 5) * Math.sin(angle);
    return { ...d, angle, absent, value, r, x, y, lx, ly, lAnchor, pct: absent ? null : Math.round(value * 100) };
  });

  // Fill only spans consecutive PRESENT vertices (a run). An absent vertex breaks
  // the chain — the fill is never stretched across an absence.
  const present = nodes.filter(n => !n.absent);
  const polygon = present.length >= 3
    ? present.map(n => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')
    : null;

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Six-domain observable field">
      <defs>
        <radialGradient id={`sf-fill-${gid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor={LIME} stopOpacity="0.14" />
          <stop offset="100%" stopColor={LIME} stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* scale rings — reference only */}
      {RINGS.map((f, i) => (
        <circle key={i} cx={C} cy={C} r={R_MIN + (R_MAX - R_MIN) * f}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}

      {/* spokes */}
      {nodes.map(n => {
        const [ex, ey] = pt(R_MAX, n.angle);
        return (
          <line key={n.key} x1={C} y1={C} x2={ex.toFixed(1)} y2={ey.toFixed(1)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
                strokeDasharray={n.absent ? '2 2' : undefined} />
        );
      })}

      {/* the field polygon */}
      {polygon && (
        <polygon points={polygon} fill={`url(#sf-fill-${gid})`} stroke={LIME}
                 strokeWidth="1" strokeLinejoin="round" opacity="0.9" />
      )}

      {/* vertices + absence glyphs */}
      {nodes.map(n => (
        <g key={n.key}>
          <title>{`${n.label} — ${n.absent ? 'data unavailable' : `field intensity ${n.pct}`} · field scope, context only`}</title>
          {n.absent ? (
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r="3"
                    fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="1.5 1.5" />
          ) : (
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r="2.4" fill={LIME} />
          )}
        </g>
      ))}

      {/* domain labels — short name, value stacked beneath. Edge-pinned so nothing
          clips the real container. */}
      {nodes.map(n => (
        <text key={n.key} x={n.lx.toFixed(1)} y={n.ly.toFixed(1)} textAnchor={n.lAnchor}
              fontFamily={MONO} fontSize="7" letterSpacing="0.06em" fill="rgba(255,255,255,0.44)">
          {n.short}
          <tspan x={n.lx.toFixed(1)} dy="8" fontSize="6.5"
                 fill={n.absent ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.6)'}>
            {n.absent ? '—' : n.pct}
          </tspan>
        </text>
      ))}
    </svg>
  );
}
