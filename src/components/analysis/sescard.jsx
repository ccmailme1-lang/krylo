// KRYL-1010 — Search Environment State (SES) card
// Clean, data-bound reproduction of the Founder's chosen design
// (public/assets/ses_env.svg — an 887KB traced export; this rebuilds the same
// composition as lightweight, prop-driven SVG). Reproduces the look; originates
// nothing. Colours are locked-palette only (§6): near-black surface, signal-lime.
// CRISP treatment — no blur/bloom anywhere; hard-edged bold letterforms.
//
// Layout: narrow portrait — text block stacked, wireframe signal-field mesh at the
// BOTTOM. All readings are props; a WITHHELD reading renders "—"
// (§19 withhold-beats-fabricate / §22 absence-is-signal), never a fake number.

import React, { useMemo } from 'react';

const LIME      = '#66FF00';
const TEXT      = '#e0e0dc';
const TEXT_DIM  = 'rgba(224,224,220,0.55)';
const HAIR      = 'rgba(255,255,255,0.1)';
const DISPLAY   = "'Space Grotesk','IBM Plex Sans',system-ui,sans-serif";
const MONO      = "'IBM Plex Mono',ui-monospace,monospace";

// Procedural wireframe signal-field mesh — a sheared perspective grid over a
// sculpted diagonal ridge, depth-faded front→back. `amp` driven by SIGNAL FIELD,
// `turb` by NARRATIVE volatility → the surface reflects the observation environment.
function useMeshPaths(ox, oy, amp = 34, turb = 5, cols = 10, rows = 7) {
  return useMemo(() => {
    const cellW = 18, cellH = 12, shearX = 11;
    const h = (i, j) =>
      amp        * Math.exp(-(((i - 4.2 - j * 0.4) ** 2)) / 12) +
      amp * 0.55 * Math.exp(-(((i - 7.8 + j * 0.25) ** 2)) / 8) +
      turb       * Math.sin(i * 1.3 + j * 0.9);
    const pt = (i, j) => [ox + i * cellW + j * shearX, oy + j * cellH - h(i, j)];
    const out = [];
    for (let j = 0; j <= rows; j++) {
      let d = ''; let hi = 0;
      for (let i = 0; i <= cols; i++) { const [x, y] = pt(i, j); hi = Math.max(hi, h(i, j)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; }
      out.push({ d, op: 0.7 - (j / rows) * 0.44, crest: hi > amp * 0.75 });
    }
    for (let i = 0; i <= cols; i++) {
      let d = '';
      for (let j = 0; j <= rows; j++) { const [x, y] = pt(i, j); d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; }
      out.push({ d, op: 0.34, crest: false });
    }
    return out;
  }, [ox, oy, amp, turb, cols, rows]);
}

const fmt = (v, suffix = '') =>
  (v == null || v === 'WITHHELD') ? '—' : `${v}${suffix}`;

export default function SESCard({
  status         = 'ACTIVE',
  condition      = 'FAVORABLE',
  signalStrength = 98.6,   // %
  signalField    = 9.3,    // σ
  field          = 70,     // 0–100 → mesh amplitude (signal field)
  volatility     = 50,     // 0–100 → mesh turbulence (narrative volatility)
  width          = 250,
}) {
  const vbW = 280, vbH = 560;
  const clamp01 = (n) => Math.max(0, Math.min(100, n ?? 0));
  const amp  = 14 + (clamp01(field) / 100) * 30;
  const turb = (clamp01(volatility) / 100) * 10;
  const mesh = useMeshPaths(16, 420, amp, turb);

  return (
    <svg
      role="img"
      aria-label="Search Environment State"
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={width}
      style={{ display: 'block' }}
    >
      {/* surface (bg/border/radius/shadow) comes from the pod container — SVG stays
          transparent. No blur/bloom anywhere — crisp hard-edged treatment. */}

      {/* ── header (plain title — not a chip) ── */}
      <text x="18" y="34" fill={LIME} fontFamily={DISPLAY} fontSize="12.5"
            fontWeight="700" letterSpacing="0.3">SEARCH ENVIRONMENT STATE (SES)</text>

      {/* ── STATUS ── */}
      <text x="18" y="84" fill={TEXT_DIM} fontFamily={MONO} fontSize="11" letterSpacing="2">STATUS</text>
      <text x="18" y="116" fill={LIME} fontFamily={DISPLAY} fontSize="26" fontWeight="700"
            letterSpacing="1">{status}</text>

      {/* ── CONDITION (label only — no gating, guardrail 1) ── */}
      <text x="18" y="160" fill={TEXT_DIM} fontFamily={MONO} fontSize="11" letterSpacing="2">CONDITION</text>
      <text x="18" y="204" fill={LIME} fontFamily={DISPLAY} fontSize="38" fontWeight="800"
            letterSpacing="0.3">{condition}</text>

      {/* ── readings (crisp — no bloom on the gauges) ── */}
      <g>
        <text x="18" y="252" fill={TEXT_DIM} fontFamily={MONO} fontSize="10.5" letterSpacing="1.2">SIGNAL STRENGTH</text>
        <text x="18" y="282" fill={LIME} fontFamily={DISPLAY} fontSize="23" fontWeight="700">{fmt(signalStrength, '%')}</text>

        <text x="152" y="252" fill={TEXT_DIM} fontFamily={MONO} fontSize="10.5" letterSpacing="1.2">SIGNAL FIELD</text>
        <text x="152" y="282" fill={LIME} fontFamily={DISPLAY} fontSize="23" fontWeight="700">{fmt(signalField, 'σ')}</text>
      </g>
      <line x1="16" y1="332" x2={vbW - 16} y2="332" stroke={HAIR} strokeWidth="1" />

      {/* ── wireframe signal-field mesh — BOTTOM ── */}
      <g fill="none" strokeLinejoin="round">
        {mesh.map((m, i) => (
          <path
            key={i}
            d={m.d}
            stroke={LIME}
            strokeOpacity={m.crest ? 0.95 : m.op}
            strokeWidth={m.crest ? 1.3 : 0.8}
          />
        ))}
      </g>
    </svg>
  );
}
