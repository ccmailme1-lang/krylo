import React from 'react';

const LIME   = '#66FF00';
const ORANGE = '#fb923c';
const MONO   = "'IBM Plex Mono', monospace";

const sparkCoords = (pos) => {
  const pts = pos
    ? [10, 20, 15, 28, 22, 35, 30, 42, 38, 48]
    : [48, 42, 38, 33, 28, 22, 18, 14, 10, 6];
  const max = Math.max(...pts), min = Math.min(...pts);
  return pts.map((p, i) => ({
    x: (i / (pts.length - 1)) * 100,
    y: 100 - ((p - min) / (max - min || 1)) * 100,
  }));
};

const SparkArea = ({ pos, id }) => {
  const coords = sparkCoords(pos);
  const accent = pos ? LIME : ORANGE;
  const line   = coords.map(({x, y}) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area   = `${coords[0].x.toFixed(1)},100 ` + line + ` ${coords[coords.length-1].x.toFixed(1)},100`;
  const gradId = `sg-${id}`;
  return (
    <svg width="100%" height="28" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display:'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
    </svg>
  );
};

const CARDS = [
  { key:'TECH', value:55, delta:'+6%',  pos:true,  metrics:[['ADOPTION VEL',68],['PATENT FLUX',42],['DEPLOY RATE',51],['INNO SIGNAL',59]]  },
  { key:'CAPI', value:63, delta:'-1%',  pos:false, metrics:[['FLOW PRESSURE',72],['SIGNAL DEPTH',61],['STRUCT IDX',47],['MOMENTUM',72]]    },
  { key:'KNOW', value:47, delta:'+6%',  pos:true,  metrics:[['SIG DENSITY',53],['SOURCE DEPTH',45],['CROSS-REF',50],['DECAY RATE',38]]     },
  { key:'LABO', value:38, delta:'-1%',  pos:false, metrics:[['HIRE VECTOR',41],['WAGE FLUX',34],['ATTRITION IDX',29],['GAP SIGNAL',48]]    },
  { key:'MEDI', value:62, delta:'+12%', pos:true,  metrics:[['COVERAGE VEL',74],['SENTIMENT',55],['NARRATIVE IDX',60],['AMPLIF RATE',58]]  },
  { key:'OWNE', value:45, delta:'+13%', pos:true,  metrics:[['ASSET FLUX',50],['TRANSFER VEL',43],['DENSITY IDX',44],['SIG PRESSURE',51]] },
];

export default function ConceptBDashboard() {
  return (
    <div style={{
      width: '100%', height: 56,
      background: '#000', fontFamily: MONO,
      display: 'flex', flexDirection: 'column',
      padding: '4px 24px', boxSizing: 'border-box', overflow: 'hidden',
      borderTop: '1px solid rgba(102,255,0,0.08)',
    }}>

      {/* Card grid — 2 lines per card */}
      <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 0 }}>
        {CARDS.map((card) => {
          const accent = card.pos ? LIME : ORANGE;
          return (
            <div key={card.key} style={{
              flex: 1, minWidth: 0,
              borderLeft: `2px solid ${card.pos ? 'rgba(102,255,0,0.35)' : 'rgba(251,146,60,0.35)'}`,
              paddingLeft: 8, paddingRight: 4, paddingTop: 3, paddingBottom: 3,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
              boxSizing: 'border-box',
            }}>

              {/* Line 1 — key · value · delta */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, flexShrink: 0, marginBottom: 1 }} />
                <span style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.85)', flexShrink: 0 }}>{card.key}</span>
                <span style={{ fontSize: 13, color: '#fff', lineHeight: 1, flexShrink: 0 }}>{card.value}</span>
                <span style={{ fontSize: 7, color: accent, letterSpacing: '0.06em', flexShrink: 0 }}>{card.delta}</span>
              </div>

              {/* Line 2 — all 4 metrics inline, abbreviated to fit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                {card.metrics.map(([label, val], i) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <span style={{ fontSize: 6, color: 'rgba(102,255,0,0.4)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {label.split(' ').map(w => w.slice(0, 3)).join(' ')}
                    </span>
                    <span style={{ fontSize: 6, color: 'rgba(244,244,245,0.75)', letterSpacing: '0.06em' }}>{val}</span>
                    {i < card.metrics.length - 1 && (
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 6 }}>·</span>
                    )}
                  </span>
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer rail */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(102,255,0,0.08)', paddingTop: 3, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {CARDS.map(c => (
            <span key={c.key} style={{ fontSize: 6, color: 'rgba(102,255,0,0.45)', letterSpacing: '0.1em' }}>
              {c.key} <span style={{ color: c.pos ? LIME : ORANGE }}>{c.delta}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 6, color: 'rgba(102,255,0,0.35)', letterSpacing: '0.12em' }}>SYSTEM RESONANCE</span>
          <svg width="50" height="8" viewBox="0 0 100 30">
            <polyline points="0,15 10,10 20,18 30,8 40,20 50,12 60,16 70,9 80,14 90,11 100,15" fill="none" stroke={LIME} strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 7, color: LIME, letterSpacing: '0.1em' }}>+8%</span>
        </div>
      </div>

    </div>
  );
}
