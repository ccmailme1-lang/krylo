import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usetruthlens }    from './hooks/usetruthlens.js';
import { useingest }       from './hooks/useingest.js';
import { useframeingest }  from './hooks/useframeingest.js';
import { usehnsignals }    from './hooks/usehnsignals.js';
import { useframestream }  from './hooks/useframestream.js';
import { ecosystemcontext } from './ecosystemcontext.jsx';
import { useSurface }     from './context/SurfaceContext.jsx';
import campaignfunnel     from './components/spine/campaignfunnel.jsx';
import conemap            from './components/spine/conemap.jsx';
import oracleview         from './components/oracleview.jsx';
import { aggregateSignals }         from './engine/aggregation.js';
import { classifyConvergenceState } from './engine/convergenceclassifier.js';
import { surfaceRouter, EVENT_DOMAIN, HYDRATION_OP } from './engine/surfacerouter.js';
import { usesurfacerouter } from './hooks/usesurfacerouter.js';
import { usereplay }        from './hooks/usereplay.js';
import AnalysisContinuum from './components/analysis/analysiscontinuum.jsx';
import IngestionBuilder   from './components/analysis/ingestionbuilder.jsx';
import TargetPacket       from './components/analysis/targetpacket.jsx';
import LensProjection    from './components/analysis/lensprojection.jsx';
import OracleEngine      from './components/analysis/oracleengine.jsx';
import ActionMatrix      from './components/analysis/actionmatrix.jsx';
import FeedsBay          from './components/feeds/feedsbay.jsx';
import HistoryBay        from './components/history/historybay.jsx';
import SettingsPanel     from './components/settings/settingspanel.jsx';
import signalmap          from './components/spine/spinemap.jsx';
const SignalMap = signalmap;

const CampaignFunnel = campaignfunnel;
const ConeMap        = conemap;
const OracleView     = oracleview;

const STUB_SIGNALS = [
  { id: '__stub_0', text: 'AI infrastructure spending accelerates across enterprise stack',        truth_statement: 'AI infrastructure spending accelerates across enterprise stack',        source: 'technology', strength: 1, primary: false, _isStub: true, fs: 0.15, fidelity: { m_checksum: 0.08, t_telemetry: 0.11, e_viral: 0.05 } },
  { id: '__stub_1', text: 'Federal reserve signals higher-for-longer rate posture into Q4',       truth_statement: 'Federal reserve signals higher-for-longer rate posture into Q4',       source: 'capital',    strength: 2, primary: false, _isStub: true, fs: 0.38, fidelity: { m_checksum: 0.06, t_telemetry: 0.09, e_viral: 0.25 } },
  { id: '__stub_2', text: 'Union organizing accelerates in logistics and warehouse sectors',      truth_statement: 'Union organizing accelerates in logistics and warehouse sectors',      source: 'labor',      strength: 3, primary: false, _isStub: true, fs: 0.62, fidelity: { m_checksum: 0.12, t_telemetry: 0.07, e_viral: 0.50 } },
  { id: '__stub_3', text: 'Legacy media consolidation reshapes advertising market dynamics',      truth_statement: 'Legacy media consolidation reshapes advertising market dynamics',      source: 'media',      strength: 4, primary: false, _isStub: true, fs: 0.80, fidelity: { m_checksum: 0.05, t_telemetry: 0.13, e_viral: 0.70 } },
  { id: '__stub_4', text: 'Credential inflation drives mismatch between degrees and hiring',      truth_statement: 'Credential inflation drives mismatch between degrees and hiring',      source: 'knowledge',  strength: 5, primary: false, _isStub: true, fs: 0.55, fidelity: { m_checksum: 0.09, t_telemetry: 0.06, e_viral: 0.45 } },
  { id: '__stub_5', text: 'Commercial real estate ownership shifts as office vacancies persist',  truth_statement: 'Commercial real estate ownership shifts as office vacancies persist',  source: 'ownership',  strength: 6, primary: false, _isStub: true, fs: 0.95, fidelity: { m_checksum: 0.07, t_telemetry: 0.14, e_viral: 0.90 } },
];

const MARQUEE_SEED      = 'workplace layoffs culture conflict';
const LENS_LIST         = ['INVESTOR', 'REALTOR', 'ATHLETE', 'SALES', 'LEGAL'];
const CANONICAL_FEEDERS = ['technology', 'capital', 'knowledge', 'labor', 'media', 'ownership'];
const MONO              = "'IBM Plex Mono', monospace";
const LIME              = '#66FF00';
const MICRO_SIGNALS = {
  technology: ['ADOPTION VEL', 'PATENT FLUX', 'DEPLOY RATE', 'INNO SIGNAL'],
  capital:    ['FLOW PRESSURE', 'SIGNAL DEPTH', 'STRUCT IDX', 'MOMENTUM'],
  knowledge:  ['SIG DENSITY', 'SOURCE DEPTH', 'CROSS-REF', 'DECAY RATE'],
  labor:      ['HIRE VECTOR', 'WAGE FLUX', 'ATTRITION IDX', 'GAP SIGNAL'],
  media:      ['COVERAGE VEL', 'SENTIMENT', 'NARRATIVE IDX', 'AMPLIF RATE'],
  ownership:  ['ASSET FLUX', 'TRANSFER VEL', 'DENSITY IDX', 'SIG PRESSURE'],
};

const LB_THEME = {
  void_gray: '#4A4A4A', muted_slate: '#4A4A4A',
  signal_lime: LIME, signal_blue: '#007FFF', unicorn_purple: '#8A2BE2',
};

// Maps a decoded EtrSignal (from usereplay) to the display format surfaces expect
function replaySignalToDisplay(s) {
  return {
    id:       s.id,
    text:     s.truth_statement || s.id,
    source:   s.source_type ?? 'spine',
    strength: Math.round((s.signal_score ?? 0) * 5),
    fs:       s.signal_score ?? 0,
    primary:  true,
    fidelity: {
      m_checksum:  s.fidelity_components?.m_checksum  ?? 0,
      t_telemetry: s.fidelity_components?.t_telemetry ?? 0,
      e_viral:     s.fidelity_components?.e_viral     ?? 0,
    },
  };
}

// ── Shared UI ────────────────────────────────────────────────

function PageDots({ page, total, onChange }) {
  return (
    <div style={{
      position:  'absolute',
      bottom:    20,
      left:      '50%',
      transform: 'translateX(-50%)',
      display:   'flex',
      gap:       8,
      alignItems: 'center',
      zIndex:    2,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          onClick={() => onChange(i)}
          style={{
            width:        i === page ? 20 : 6,
            height:       6,
            borderRadius: 3,
            background:   i === page ? LIME : 'rgba(255,255,255,0.25)',
            cursor:       'pointer',
            transition:   'all 200ms',
          }}
        />
      ))}
    </div>
  );
}

function ConeSearch({ value, onChange, onSubmit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', marginRight: 4 }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
        placeholder="search domain..."
        onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.background = 'rgba(102,255,0,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        style={{
          width: 180, fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 0, color: 'rgba(232,244,255,0.85)', padding: '5px 8px',
          outline: 'none', transition: 'border-color 150ms, background 150ms',
        }}
      />
      {value && (
        <div onClick={() => onChange('')} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', padding: '0 4px', lineHeight: 1, userSelect: 'none' }}>✕</div>
      )}
    </div>
  );
}


function TemporalScrubber({ scrubPos, onChange, frameTs, hasFrames }) {
  const isReplay  = scrubPos > 0;
  const timeLabel = (() => {
    if (!isReplay) return 'LIVE';
    if (hasFrames && frameTs) return new Date(frameTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalMins = Math.round(scrubPos * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `T-${h}H ${m > 0 ? m + 'M' : ''}`.trim() : `T-${m}M`;
  })();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%', padding: '0 24px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>
      <span style={{ opacity: 0.5, minWidth: 50 }}>LIVE</span>
      <input type="range" min="0" max="1" step="0.001" value={scrubPos}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, height: 4, accentColor: isReplay ? LIME : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} />
      <span style={{ minWidth: 110, textAlign: 'right', color: isReplay ? LIME : 'rgba(255,255,255,0.6)' }}>
        {isReplay ? `REPLAY · ${timeLabel}` : timeLabel}
      </span>
      {isReplay && (
        <button onClick={() => onChange(0)} style={{
          background: 'transparent', border: `1px solid rgba(102,255,0,0.4)`,
          color: LIME, fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', padding: '6px 12px', cursor: 'pointer',
        }}>
          RETURN TO LIVE
        </button>
      )}
    </div>
  );
}

// ── WO-1311: Ingestion Horizon ───────────────────────────────
const SPARKLINE_LEN = 24;

function DomainCell({ domain, data }) {
  const W = 112, H = 36;
  const pts = Array.from(data).map((v, i) => {
    const x = (i / (SPARKLINE_LEN - 1)) * W;
    const y = H - (v / 100) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const latest  = data[SPARKLINE_LEN - 1];
  const prev6   = data[SPARKLINE_LEN - 7] ?? latest;
  const delta   = Math.round(latest - prev6);
  const deltaTxt = (delta >= 0 ? '+' : '') + delta + '%';
  const deltaClr = delta >= 0 ? LIME : '#FF4D00';
  return (
    <div style={{
      flex: 1, minWidth: 0, height: '100%', padding: '0 10px',
      borderRight: '1px solid rgba(102,255,0,0.06)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
      overflow: 'visible',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 7, letterSpacing: '0.15em', color: 'rgba(102,255,0,0.55)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {domain.slice(0, 4).toUpperCase()} · {Math.round(latest)}
        </div>
        <div style={{ fontSize: 7, color: deltaClr, letterSpacing: '0.08em', marginLeft: 4 }}>{deltaTxt}</div>
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={LIME} strokeWidth={1} opacity={0.65} />
      </svg>
    </div>
  );
}

function IngestionHorizon({ lagMs, domainScores }) {
  const bufs = useRef(
    Object.fromEntries(CANONICAL_FEEDERS.map(d => {
      const arr = new Float32Array(SPARKLINE_LEN);
      for (let i = 0; i < SPARKLINE_LEN; i++) arr[i] = 40 + Math.random() * 20;
      return [d, arr];
    }))
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      CANONICAL_FEEDERS.forEach(domain => {
        const arr = bufs.current[domain];
        arr.copyWithin(0, 1);
        const prev = arr[SPARKLINE_LEN - 2];
        const noise = (Math.random() - 0.48) * 9;
        const rev   = (50 - prev) * 0.06;
        arr[SPARKLINE_LEN - 1] = Math.max(4, Math.min(96, prev + noise + rev));
      });
      setTick(n => n + 1);
    }, 800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!domainScores?.scores) return;
    CANONICAL_FEEDERS.forEach(domain => {
      const score = domainScores.scores[domain];
      if (typeof score !== 'number') return;
      const arr = bufs.current[domain];
      arr.copyWithin(0, 1);
      arr[SPARKLINE_LEN - 1] = Math.max(4, Math.min(96, score * 96));
    });
    setTick(n => n + 1);
  }, [domainScores]);

  return (
    <div style={{
      position: 'fixed', bottom: 56, left: 72, right: 0, height: 52, /* signal velocity bar */
      background: '#000000',
      borderTop: '1px solid rgba(102,255,0,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO,
      zIndex: 11,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', width: 1080 + 90, flexShrink: 0 }}>
        <div style={{ fontSize: 7, letterSpacing: '0.22em', color: 'rgba(102,255,0,0.3)', padding: '0 10px', minWidth: 90, whiteSpace: 'nowrap' }}>
          SIGNAL VELOCITY<br />
          <span style={{ color: lagMs > 0 ? LIME : 'rgba(102,255,0,0.3)' }}>
            {lagMs > 0 ? `${lagMs}ms` : 'LIVE'}
          </span>
        </div>
        {CANONICAL_FEEDERS.map(d => (
          <DomainCell key={d} domain={d} data={bufs.current[d]} />
        ))}
      </div>
    </div>
  );
}

// ── GridOverlay ───────────────────────────────────────────────
function GridOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
      backgroundImage: `linear-gradient(to right,rgba(102,255,0,0.035) 1px,transparent 1px),linear-gradient(to bottom,rgba(102,255,0,0.035) 1px,transparent 1px)`,
      backgroundSize: '76px 76px',
    }} />
  );
}

// ── FieldGuide ────────────────────────────────────────────────
function FieldGuide() {
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 10, pointerEvents: 'none',
      fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      {[
        { color: LIME,                    label: 'VECTOR' },
        { color: 'rgba(200,200,200,0.4)', label: 'LINK'   },
        { color: 'rgba(255,77,0,0.8)',    label: 'RISK'   },
        { color: LIME,                    label: 'CONF'   },
      ].map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, borderTop: `1px solid ${item.color}`, flexShrink: 0 }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}


// ── MicroSignalClusters ───────────────────────────────────────
const MICRO_SIG_LEN = 16;

function MicroSignalClusters({ leaderboardState, domainScores }) {
  const bufs = useRef(
    Object.fromEntries(
      CANONICAL_FEEDERS.map(domain => [
        domain,
        Object.fromEntries(
          (MICRO_SIGNALS[domain] ?? []).map(sig => {
            const arr = new Float32Array(MICRO_SIG_LEN);
            arr.fill(48);
            return [sig, arr];
          })
        ),
      ])
    )
  );
  const [tick, setTick] = useState(0);

  // Wire to real data: pressure + volatility from leaderboard, score from SSE domain event
  useEffect(() => {
    if (!leaderboardState?.length) return;
    CANONICAL_FEEDERS.forEach(domain => {
      const cone    = leaderboardState.find(s => s.domain === domain);
      const press   = Math.max(4, Math.min(96, (cone?.pressure  ?? 48)));
      const vol     = Math.max(4, Math.min(96, (cone?.volatility ?? 0.5) * 96));
      const score   = Math.max(4, Math.min(96, (domainScores?.scores?.[domain] ?? (press / 96)) * 96));
      const comp    = Math.max(4, Math.min(96, press * 0.55 + vol * 0.45));
      const derived = [press, vol, score, comp];

      const domBufs = bufs.current[domain];
      Object.values(domBufs).forEach((arr, idx) => {
        arr.copyWithin(0, 1);
        arr[MICRO_SIG_LEN - 1] = derived[idx % derived.length];
      });
    });
    setTick(n => n + 1);
  }, [leaderboardState, domainScores]);

  return (
    <div style={{
      position: 'fixed', bottom: 108, left: 72, right: 0, height: 104,
      background: '#000000',
      borderTop: '1px solid rgba(102,255,0,0.08)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      fontFamily: MONO, zIndex: 11,
    }}>
      {CANONICAL_FEEDERS.map(domain => {
        const items   = MICRO_SIGNALS[domain] ?? [];
        const domBufs = bufs.current[domain]  ?? {};
        const pressure = leaderboardState.find(s => s.domain === domain)?.pressure ?? 0;
        return (
          <div key={domain} style={{
            borderRight: '1px solid rgba(102,255,0,0.06)',
            padding: '8px 10px',
            display: 'flex', flexDirection: 'column',
            width: 180, flexShrink: 0,
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.18em', color: LIME, marginBottom: 7, textTransform: 'uppercase' }}>
              ● {domain.slice(0,4).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              {items.map(sig => {
                const arr = domBufs[sig];
                if (!arr) return null;
                const SW = 58, SH = 12;
                const pts = Array.from(arr).map((v, i) => {
                  const x = (i / (MICRO_SIG_LEN - 1)) * SW;
                  const y = SH - (v / 100) * SH;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');
                return (
                  <div key={sig} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: LIME, opacity: 0.5, flexShrink: 0 }} />
                    <div style={{ fontSize: 6, letterSpacing: '0.08em', color: 'rgba(102,255,0,0.45)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {sig}
                    </div>
                    <svg width={SW} height={SH} style={{ flexShrink: 0 }}>
                      <polyline points={pts} fill="none" stroke={LIME} strokeWidth={0.7} opacity={0.5} />
                    </svg>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 2, background: 'rgba(102,255,0,0.07)', marginTop: 6 }}>
              <div style={{ height: '100%', width: `${Math.min(100, pressure)}%`, background: LIME, opacity: 0.35, transition: 'width 600ms' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bay: Analysis ────────────────────────────────────────────

function AnalysisProfilePage({ lens, onLensChange, query, onQueryChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 36, padding: '0 48px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>SELECT LENS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LENS_LIST.map(l => (
            <button key={l} onClick={() => onLensChange(l)} style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
              padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
              border: `1px solid ${l === lens ? LIME : 'rgba(255,255,255,0.15)'}`,
              background: l === lens ? 'rgba(102,255,0,0.08)' : 'transparent',
              color: l === lens ? LIME : 'rgba(255,255,255,0.45)',
              transition: 'all 150ms',
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="enter query..."
          style={{
            width: '100%', fontFamily: MONO, fontSize: 14, letterSpacing: '0.06em',
            background: 'transparent', border: 'none', borderBottom: `1px solid rgba(102,255,0,0.4)`,
            color: 'rgba(255,255,255,0.9)', padding: '12px 0', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

function AnalysisLensPage({ lens, leaderboardState }) {
  const [domainCounts, setDomainCounts] = useState({});
  const [lastSignal, setLastSignal]     = useState(null);

  usesurfacerouter('analysis', [EVENT_DOMAIN.ANALYSIS, EVENT_DOMAIN.ORACLE], (event, op) => {
    if (!event || op === HYDRATION_OP.RECONCILE) return;
    if (op === HYDRATION_OP.APPEND || op === HYDRATION_OP.PATCH) {
      const domain = (event.category ?? event.source_type ?? 'signal').toUpperCase();
      setDomainCounts(prev => ({ ...prev, [domain]: (prev[domain] ?? 0) + 1 }));
      setLastSignal({ label: event.truth_statement ?? event.title ?? event.id, ts: Date.now() });
    }
  });

  const sorted = [...leaderboardState].sort((a, b) => b.pressure - a.pressure);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 64px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: LIME }}>{lens}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)' }}>DOMAIN PRESSURE</span>
      </div>

      {/* Pressure bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 40 }}>
        {sorted.map(s => {
          const pct   = Math.round(s.pressure ?? 0);
          const count = domainCounts[s.domain?.toUpperCase()] ?? 0;
          return (
            <div key={s.domain} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', minWidth: 110 }}>
                {s.domain.toUpperCase()}
              </span>
              <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: LIME, transition: 'width 400ms' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, color: LIME, minWidth: 36, textAlign: 'right' }}>{pct}</span>
              {count > 0 && (
                <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(102,255,0,0.5)', minWidth: 40, textAlign: 'right', letterSpacing: '0.1em' }}>
                  +{count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Last routed signal */}
      {lastSignal && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>LAST SIGNAL ROUTED</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            {lastSignal.label}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History Bay ──────────────────────────────────────────────

// ── App ──────────────────────────────────────────────────────

export default function App() {
  const [query, setquery]               = useState('');
  const [scrubPos, setScrubPos]         = useState(0);
  const [selectedLens, setSelectedLens] = useState('INVESTOR');
  const [navMode, setNavMode]           = useState('surface');
  const [surfacePage, setSurfacePage]   = useState(0);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [selection, setSelection]       = useState(null);
  const [clickEvent, setClickEvent]     = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [topoMode, setTopoMode]         = useState(false);
  const iframeRef = useRef(null);

  const { hydrateFromSignals } = useSurface();
  const { signals: marqueeSignals } = usehnsignals(MARQUEE_SEED);

  useEffect(() => { hydrateFromSignals(marqueeSignals); }, [marqueeSignals, hydrateFromSignals]);

  const activeQuery = query || null;

  const { records }            = usetruthlens(activeQuery);
  const { signals: ingestSignals } = useingest(activeQuery);
  const { signals: hnSignals }     = usehnsignals(activeQuery);
  const { signals: frameSignals }  = useframeingest(activeQuery);
  const { lagMs: streamLagMs, domainScores } = useframestream({ enabled: navMode === 'surface' && surfacePage === 0 });
  const { history, currentIndex, current, seek } = usereplay(true);

  const mergedRecords = useMemo(() => {
    const map = new Map();
    [...hnSignals, ...frameSignals, ...ingestSignals, ...records].forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }, [records, ingestSignals, hnSignals, frameSignals]);

  // WO-1092 Phase A — route merged records into surface subscriptions
  useEffect(() => {
    if (mergedRecords.length) surfaceRouter.dispatchBatch(mergedRecords);
  }, [mergedRecords]);

  const liveSignals = useMemo(
    () => mergedRecords.length
      ? mergedRecords.map(r => ({
          text:     r.truth_statement ?? r.title ?? r.id,
          source:   r.source_type ?? 'spine',
          strength: Math.round((r.fs ?? 0) * 5),
          id:       r.id,
          fs:       r.fs ?? 0,
          primary:  true,
          fidelity: {
            m_checksum:  r.fidelity_components?.m_checksum  ?? 0,
            t_telemetry: r.fidelity_components?.t_telemetry ?? 0,
            e_viral:     r.fidelity_components?.e_viral     ?? 0,
          },
        }))
      : STUB_SIGNALS,
    [mergedRecords],
  );

  const isLive = scrubPos === 0;

  // Sync scrub position to actual frame index when persisted frames are available
  useEffect(() => {
    if (history.length < 2) return;
    const frameIdx = Math.round((1 - scrubPos) * (history.length - 1));
    seek(frameIdx);
  }, [scrubPos, history.length]);

  const replayedSignals = useMemo(() => {
    if (isLive) return liveSignals;
    if (current.signals?.length) return current.signals.map(replaySignalToDisplay);
    // No server frames — synthetic time-decay: signals attenuate into the past
    const decay = 1 - scrubPos * 0.55;
    return liveSignals.map((sig, i) => {
      const noise = Math.sin((i + 1) * 13.7 + scrubPos * 9.1) * 0.12;
      return { ...sig, fs: Math.max(0, Math.min(1, (sig.fs ?? 0) * decay + noise)) };
    });
  }, [isLive, current.signals, liveSignals, scrubPos]);

  const leaderboardState = useMemo(() => {
    const normalized = replayedSignals.map(sig => ({
      domain:    sig.source   ?? 'signal',
      leverage:  (sig.fs ?? 0) * 100,
      volatility: sig.fidelity?.e_viral ?? 0,
    }));
    const aggregated = aggregateSignals(normalized);
    const byDomain   = new Map(aggregated.map(s => [s.domain, s]));
    return CANONICAL_FEEDERS.map(d => byDomain.get(d) ?? { domain: d, pressure: 0, volatility: 0 });
  }, [replayedSignals]);

  // krylo-nav: left nav mode switch from iframe
  useEffect(() => {
    function onNavMessage(ev) {
      if (ev.data?.type !== 'krylo-nav') return;
      if (ev.data.mode) setNavMode(ev.data.mode);
    }
    window.addEventListener('message', onNavMessage);
    return () => window.removeEventListener('message', onNavMessage);
  }, []);

  // krylo-reset: logo tap — global state reset + iframe reload
  useEffect(() => {
    function onReset(ev) {
      if (ev.data?.type !== 'krylo-reset') return;
      setNavMode('surface');
      setquery('');
      setScrubPos(0);
      setSelection(null);
      setSurfacePage(0);
      setAnalysisPage(0);
      setAnalysisQuery('');
      setSearchQuery('');
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    }
    window.addEventListener('message', onReset);
    return () => window.removeEventListener('message', onReset);
  }, []);

  // krylo-click: cone pin via iframe relay
  useEffect(() => {
    function onMessage(ev) {
      if (ev.data?.type !== 'krylo-click') return;
      const { x, y } = ev.data;
      const bayTop    = 88;
      const bayLeft   = 72;
      const bayRight  = window.innerWidth;
      const bayBottom = window.innerHeight - 56;
      if (x < bayLeft || x > bayRight || y < bayTop || y > bayBottom) return;
      setClickEvent({ x: x - bayLeft, y: y - bayTop, ts: Date.now() });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Save query to history when analysis query is committed
  function commitAnalysisQuery() {
    if (!analysisQuery.trim()) return;
    setSearchHistory(h => [{ query: analysisQuery, lens: selectedLens, ts: Date.now() }, ...h].slice(0, 50));
    setquery(analysisQuery);
  }

  const isSurface = navMode === 'surface';

  return (
    <ecosystemcontext.Provider value={{ query, setquery }}>

      {/* ── Surface Bay ───────────────────────────────────────── */}

      {/* ConeMap — page 1 of Surface */}
      {isSurface && surfacePage === 0 && (
        <>
          <GridOverlay />

          {/* Lens + search bar */}
          <div style={{
            position: 'fixed', top: 48, left: 72, right: 0, height: 40, zIndex: 11,
            background: 'rgba(0,0,0,0.78)', borderBottom: '1px solid rgba(102,255,0,0.15)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <ConeSearch value={searchQuery} onChange={setSearchQuery} onSubmit={() => {}} />
            </div>
          </div>

          {/* ConeMap canvas */}
          <div style={{ position: 'fixed', top: 56, left: 72, right: 0, bottom: 96, zIndex: 0 }}>
            {/* ABSTRACT / TOPOLOGY — top-right corner, 90° vertical */}
            <button
              onClick={() => setTopoMode(m => !m)}
              style={{
                position:      'absolute',
                top:           16,
                right:         8,
                zIndex:        5,
                writingMode:   'vertical-rl',
                transform:     'rotate(180deg)',
                background:    'transparent',
                border:        `1px solid ${topoMode ? LIME : 'rgba(255,255,255,0.15)'}`,
                color:         topoMode ? LIME : 'rgba(255,255,255,0.4)',
                fontFamily:    MONO,
                fontSize:      8,
                letterSpacing: '0.18em',
                padding:       '10px 4px',
                cursor:        'pointer',
                transition:    'border-color 150ms, color 150ms',
              }}
            >
              {topoMode ? 'TOPOLOGY' : 'ABSTRACT'}
            </button>
            <ConeMap
              signals={replayedSignals}
              lens={selectedLens}
              selectedDomain={selection}
              clickEvent={clickEvent}
              onSelectCone={setSelection}
              topoMode={topoMode}
              onArcClick={(a, b) => { setquery(`${a} ${b}`); setNavMode('oracle'); }}
            />
            <FieldGuide />

            {/* Surface page dots — P1 active, P2 reserved for WO-1315 */}
            <div style={{
              position: 'absolute', bottom: 16, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 8, zIndex: 20, pointerEvents: 'auto',
            }}>
              {[0, 1].map(i => (
                <div
                  key={i}
                  onClick={() => setSurfacePage(i)}
                  style={{
                    height: 6, borderRadius: 3, cursor: 'pointer',
                    width:      i === surfacePage ? 20 : 6,
                    background: i === surfacePage ? '#66FF00' : 'rgba(255,255,255,0.3)',
                    opacity:    i === surfacePage ? 1 : 0.3,
                    transition: 'width 200ms ease, opacity 200ms ease, background 200ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Micro Signal Clusters */}
          <MicroSignalClusters leaderboardState={leaderboardState} domainScores={domainScores} />

          {/* Signal Velocity */}
          <IngestionHorizon lagMs={streamLagMs} domainScores={domainScores} />

          {/* Scrubber */}
          <div style={{
            position: 'fixed', bottom: 0, left: 72, right: 0, height: 56, zIndex: 11,
            background: 'rgba(0,0,0,0.78)', borderTop: '1px solid rgba(102,255,0,0.15)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <TemporalScrubber
              scrubPos={scrubPos}
              onChange={setScrubPos}
              frameTs={current.ts}
              hasFrames={history.length > 1}
            />
          </div>
        </>
      )}


      {/* Signal Map — Surface P2, WO-1315 */}
      {isSurface && surfacePage === 1 && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 1 }}>
          <SignalMap data={replayedSignals} isActive={true} />

          {/* Surface page dots — mirrored on P2 */}
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 8, zIndex: 20, pointerEvents: 'auto',
          }}>
            {[0, 1].map(i => (
              <div
                key={i}
                onClick={() => setSurfacePage(i)}
                style={{
                  height: 6, borderRadius: 3, cursor: 'pointer',
                  width:      i === surfacePage ? 20 : 6,
                  background: i === surfacePage ? '#66FF00' : 'rgba(255,255,255,0.3)',
                  opacity:    i === surfacePage ? 1 : 0.3,
                  transition: 'width 200ms ease, opacity 200ms ease, background 200ms ease',
                }}
              />
            ))}
          </div>
        </div>
      )}


      {/* ── Oracle Bay — arc tap or node click routes here ───── */}

      {navMode === 'oracle' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#F5F5F7', overflow: 'hidden' }}>
          <OracleView query={query} />
        </div>
      )}

      {/* ── Analysis Bay ──────────────────────────────────────── */}

      {navMode === 'analysis' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <IngestionBuilder />
          <TargetPacket />
        </div>
      )}

      {/* ── Feeds Bay ─────────────────────────────────────────── */}

      {navMode === 'feeds' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <FeedsBay signals={liveSignals} />
        </div>
      )}

      {/* ── History Bay ───────────────────────────────────────── */}

      {navMode === 'history' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <HistoryBay />
        </div>
      )}

      {/* ── Settings Panel ────────────────────────────────────── */}

      {navMode === 'settings' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <SettingsPanel />
        </div>
      )}

      {/* ── CampaignFunnel — always mounted ───────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}>
        <CampaignFunnel
          signals={marqueeSignals}
          records={marqueeSignals}
          iframeRef={iframeRef}
          src="/krylo2-feed.html"
        />
      </div>

    </ecosystemcontext.Provider>
  );
}
