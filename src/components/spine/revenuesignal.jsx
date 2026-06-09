// WO-1031 — Revenue Signal Bridge (Rams Logic)
// WO-1105 — Unicorn: U = (LTV/CAC) × sqrt(sourceCount) >= 25 → #8A2BE2
// Accepts live props from LeverageEngine stream. Falls back to mocks when null.

import { Html } from '@react-three/drei';

const RAMS_RATIO   = 3.0;
const UNICORN_U    = 25.0;
const MOCK_LTV     = 450;
const MOCK_CAC     = 120;
const MOCK_SOURCES = 6;

export default function RevenueSignal({ position = [0, 0, 0], ltv = null, cac = null, sourceCount = null }) {
  const resolvedLtv     = ltv         ?? MOCK_LTV;
  const resolvedCac     = cac         ?? MOCK_CAC;
  const resolvedSources = sourceCount ?? MOCK_SOURCES;

  const ratio      = resolvedLtv / resolvedCac;
  const U          = ratio * Math.sqrt(resolvedSources);
  const isUnicorn  = U >= UNICORN_U;
  const isAdvantage = ratio >= RAMS_RATIO;

  const color = isUnicorn
    ? '#8A2BE2'
    : isAdvantage
      ? '#66FF00'
      : 'rgba(255,255,255,0.2)';

  const shadow = isUnicorn
    ? '0 0 10px rgba(138,43,226,0.4)'
    : isAdvantage
      ? '0 0 10px rgba(102,255,0,0.3)'
      : 'none';

  const label = isUnicorn
    ? `UNICORN · ${ratio.toFixed(2)}x LTV/CAC`
    : isAdvantage
      ? `ADV · ${ratio.toFixed(2)}x LTV/CAC`
      : `${ratio.toFixed(2)}x — BELOW THRESHOLD`;

  return (
    <Html position={[position[0], position[1] + 2.2, position[2]]} center style={{ pointerEvents: 'none' }}>
      <div style={{
        fontFamily:    "'IBM Plex Mono', monospace",
        fontSize:      '8px',
        letterSpacing: '0.14em',
        color,
        background:    'rgba(0,0,0,0.65)',
        border:        `1px solid ${color}`,
        borderRadius:  '3px',
        padding:       '3px 8px',
        whiteSpace:    'nowrap',
        textTransform: 'uppercase',
        boxShadow:     shadow,
      }}>
        <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', marginBottom: '2px' }}>
          REVENUE SIGNAL
        </div>
        {label}
      </div>
    </Html>
  );
}
