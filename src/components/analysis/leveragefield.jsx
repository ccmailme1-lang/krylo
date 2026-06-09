import React from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const TYPES = [
  { id: 'CODE',    y: 1 },
  { id: 'MEDIA',   y: 2 },
  { id: 'CAPITAL', y: 3 },
  { id: 'LABOR',   y: 4 },
];

const TIERS = [
  { label: 'LOW',  ratio: '<1.0×', x: 0.25 },
  { label: 'MOD',  ratio: '≈1.0×', x: 1.0  },
  { label: 'HIGH', ratio: '>1.0×', x: 2.0  },
];

const W    = 320;
const H    = 180;
const PL   = 72;
const PR   = 20;
const PT   = 16;
const PB   = 38;
const FW   = W - PL - PR;
const FH   = H - PT - PB;
const XMAX = 3.0;

function xPos(ratio) { return PL + (Math.min(ratio, XMAX) / XMAX) * FW; }
function yPos(typeY) { return PT + ((typeY - 1) / 3) * FH; }

export default function LeverageField({ leverage }) {
  if (!leverage) return null;

  const {
    deRatio      = 1.0,
    typeY        = 3,
    typeLabel    = 'CAPITAL',
    tierLabel    = 'MOD',
    permissionless = false,
    industryNorm = null,
  } = leverage;

  const px = xPos(deRatio);
  const py = yPos(typeY);

  // flip label to left side when marker is in right 40% of field
  const labelRight = px > PL + FW * 0.6;
  const labelX     = labelRight ? px - 12 : px + 12;
  const labelAnchor = labelRight ? 'end' : 'start';

  return (
    <div style={{ fontFamily: MONO, margin: '20px 0' }}>

      <div style={{ overflowX: 'auto' }}>
      <svg
        width={W} height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >

        {/* Horizontal grid */}
        {TYPES.map(t => (
          <line key={t.id}
            x1={PL} y1={yPos(t.y)}
            x2={PL + FW} y2={yPos(t.y)}
            stroke="rgba(255,255,255,0.18)" strokeWidth={1}
          />
        ))}

        {/* Vertical grid */}
        {TIERS.map(ti => (
          <line key={ti.label}
            x1={xPos(ti.x)} y1={PT}
            x2={xPos(ti.x)} y2={PT + FH}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* Industry norm */}
        {industryNorm && (
          <g>
            <line
              x1={xPos(industryNorm)} y1={PT}
              x2={xPos(industryNorm)} y2={PT + FH}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1}
              strokeDasharray="1 3"
            />
            <text x={xPos(industryNorm)} y={PT - 4}
              textAnchor="middle" fontFamily={MONO} fontSize={7}
              letterSpacing="0.1em" fill="rgba(255,255,255,0.2)"
            >IND</text>
          </g>
        )}

        {/* Y axis labels */}
        {TYPES.map(t => (
          <text key={t.id}
            x={PL - 8} y={yPos(t.y) + 4}
            textAnchor="end" fontFamily={MONO}
            fontSize={8} letterSpacing="0.14em"
            fill="rgba(255,255,255,0.35)"
          >{t.id}</text>
        ))}

        {/* X axis labels */}
        {TIERS.map(ti => (
          <g key={ti.label}>
            <line x1={xPos(ti.x)} y1={PT + FH} x2={xPos(ti.x)} y2={PT + FH + 4}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <text x={xPos(ti.x)} y={PT + FH + 14}
              textAnchor="middle" fontFamily={MONO}
              fontSize={8} letterSpacing="0.14em"
              fill="rgba(255,255,255,0.35)"
            >{ti.label}</text>
            <text x={xPos(ti.x)} y={PT + FH + 26}
              textAnchor="middle" fontFamily={MONO}
              fontSize={7} letterSpacing="0.1em"
              fill="rgba(255,255,255,0.15)"
            >{ti.ratio}</text>
          </g>
        ))}

        {/* Crosshair arms */}
        <line x1={PL} y1={py} x2={px - 10} y2={py}
          stroke={LIME} strokeWidth={0.5} opacity={0.35} strokeDasharray="2 3" />
        <line x1={px + 10} y1={py} x2={PL + FW} y2={py}
          stroke={LIME} strokeWidth={0.5} opacity={0.35} strokeDasharray="2 3" />
        <line x1={px} y1={PT} x2={px} y2={py - 10}
          stroke={LIME} strokeWidth={0.5} opacity={0.35} strokeDasharray="2 3" />
        <line x1={px} y1={py + 10} x2={px} y2={PT + FH}
          stroke={LIME} strokeWidth={0.5} opacity={0.35} strokeDasharray="2 3" />

        {/* Edge ticks */}
        <line x1={PL - 5} y1={py} x2={PL} y2={py} stroke={LIME} strokeWidth={1} opacity={0.6} />
        <line x1={px} y1={PT + FH} x2={px} y2={PT + FH + 5} stroke={LIME} strokeWidth={1} opacity={0.6} />

        {/* Marker */}
        <circle cx={px} cy={py} r={8}
          fill="none" stroke={LIME} strokeWidth={0.5} opacity={0.3} />
        <circle cx={px} cy={py} r={2.5}
          fill={LIME} opacity={0.9} />

        {/* Coordinate readout — flips side when near right edge */}
        <text x={labelX} y={py - 8}
          textAnchor={labelAnchor} fontFamily={MONO}
          fontSize={8} letterSpacing="0.14em" fill={LIME}
        >{typeLabel} · {deRatio.toFixed(1)}×</text>
        <text x={labelX} y={py + 4}
          textAnchor={labelAnchor} fontFamily={MONO}
          fontSize={7} letterSpacing="0.1em"
          fill="rgba(102,255,0,0.45)"
        >{tierLabel}</text>

      </svg>
      </div>

      {/* Metric strip */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: 10, marginTop: 4,
      }}>
        {[
          { k: 'TYPE',     v: typeLabel                                },
          { k: 'TIER',     v: tierLabel                                },
          { k: 'D/E',      v: `${deRatio.toFixed(1)}×`                },
          { k: 'PERM',     v: permissionless ? 'YES' : 'NO'           },
          { k: 'IND NORM', v: industryNorm ? `${industryNorm}×` : '—' },
        ].map((m, i, arr) => (
          <div key={m.k} style={{
            flex: 1,
            paddingLeft:  i > 0 ? 10 : 0,
            paddingRight: i < arr.length - 1 ? 10 : 0,
            borderRight:  i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{ fontSize: 6, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.18)', marginBottom: 4 }}>{m.k}</div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' }}>{m.v}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
