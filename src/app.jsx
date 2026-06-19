import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { startIngestionDaemon } from './ingestion/daemon.js';
import { initBrowserGate } from './engine/causalos/browsergate.js';
import { buildActiveCones } from './engine/cones.js';
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
import OracleViewV2      from './components/oracleview_v2.jsx';
import { aggregateSignals }         from './engine/aggregation.js';
import { classifyConvergenceState } from './engine/convergenceclassifier.js';
import { surfaceRouter, EVENT_DOMAIN, HYDRATION_OP } from './engine/surfacerouter.js';
import { usesurfacerouter } from './hooks/usesurfacerouter.js';
import { usereplay }        from './hooks/usereplay.js';
import { useFredSignals }    from './hooks/usefredsignals.js';
import { useEdgarSignals }  from './hooks/useedgarsignals.js';
import { useKalshiSignals } from './hooks/usekalshisignals.js';
import AnalysisContinuum from './components/analysis/analysiscontinuum.jsx';
import IngestionBuilder   from './components/analysis/ingestionbuilder.jsx';
import TargetPacket        from './components/analysis/targetpacket.jsx';
import AnalysisIdleField   from './components/analysis/analysisidlefield.jsx';
import LensProjection    from './components/analysis/lensprojection.jsx';
import OracleEngine      from './components/analysis/oracleengine.jsx';
import ActionMatrix      from './components/analysis/actionmatrix.jsx';
import AnalysisSubstrate  from './components/analysis/analysissubstrate.jsx';
import AnalysisField      from './components/analysis/analysisfield.jsx';
import FeedsBay              from './components/feeds/feedsbay.jsx';
import CommunityChatboard    from './components/community/communitychatboard.jsx';
import CommunityView        from './components/community/communityview.jsx';
import ArtifactsBay      from './components/artifacts/artifactsbay.jsx';
import ConceptBDashboard from './components/microsignals/conceptbdashboard.jsx';
import HistoryBay        from './components/history/historybay.jsx';
import Workstation       from './components/bays/workstation.jsx';
import SettingsPanel     from './components/settings/settingspanel.jsx';
import { saveProject }   from './engine/projectregistry.js';
import ConsoleDashboard  from './components/resonance/consoledashboard.jsx';
import CoachWellConsole  from './components/analysis/coachwell.jsx';
import BayVisor          from './components/resonance/bayvisor.jsx';
import signalmap          from './components/spine/spinemap.jsx';
import AnnotationLayer    from './components/spine/annotationlayer.jsx';
import { useAnnotationStore } from './store/useannotationstore.js';
import { useAnalysisStore }   from './store/useanalysisstore.js';
import { useBayStore }        from './store/usebaystore.js';
import { useOracleMapper }    from './hooks/useOracleMapper.js';
import { emitTelemetry }      from './engine/telemetry.js';
import SurfacePanel           from './components/surface/surfacepanel.jsx';
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
        onKeyDown={e => { if (e.key === 'Enter' && onSubmit) onSubmit(); }}
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
  const isReplay = scrubPos > 0;

  const currentLabel = (() => {
    if (!isReplay) return 'LIVE';
    if (hasFrames && frameTs) return new Date(frameTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalMins = Math.round(scrubPos * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `T-${h}H${m > 0 ? ` ${m}M` : ''}` : `T-${m}M`;
  })();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      height: '100%', padding: '0 24px', fontFamily: MONO, gap: 3,
    }}>
      {/* Rail */}
      <input
        type="range" min="0" max="1" step="0.001" value={scrubPos}
        onChange={e => onChange(Number(e.target.value))}
        className="krylo-scrubber"
        style={{ width: '100%', cursor: 'pointer' }}
      />

      {/* Time counters — audio player pattern */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 9, letterSpacing: '0.18em',
          color: isReplay ? LIME : 'rgba(255,255,255,0.35)',
          minWidth: 64, fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.15s',
        }}>
          {currentLabel}
        </span>

        {isReplay && (
          <button onClick={() => onChange(0)} style={{
            background: 'transparent', border: `1px solid rgba(102,255,0,0.3)`,
            color: LIME, fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
            padding: '3px 10px', cursor: 'pointer',
          }}>
            RETURN TO LIVE
          </button>
        )}

        <span style={{
          fontSize: 9, letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.2)',
          minWidth: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        }}>
          T-24H
        </span>
      </div>
    </div>
  );
}

// ── WO-1311: Ingestion Horizon ───────────────────────────────
const SPARKLINE_LEN = 100;

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
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 7, letterSpacing: '0.15em', color: 'rgba(102,255,0,0.55)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {domain.slice(0, 4).toUpperCase()} · {Math.round(latest)}
        </div>
        <div style={{ fontSize: 7, color: deltaClr, letterSpacing: '0.08em', marginLeft: 4 }}>{deltaTxt}</div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#007FFF" strokeWidth={1} opacity={0.65} />
      </svg>
    </div>
  );
}

function IngestionHorizon({ lagMs, domainScores, stats }) {
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
      width: '100%', height: 52,
      background: '#000000',
      borderTop: '1px solid rgba(102,255,0,0.18)',
      display: 'flex', alignItems: 'center',
      fontFamily: MONO, zIndex: 11,
      paddingLeft: 24, paddingRight: 24, boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Label — flex item with fixed width, does not overlap cells */}
      <div style={{ flexShrink: 0, width: 72, fontSize: 6, letterSpacing: '0.18em', color: 'rgba(102,255,0,0.25)', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
        SIGNAL VELOCITY<br />
        <span style={{ color: lagMs > 0 ? LIME : 'rgba(102,255,0,0.25)' }}>
          {lagMs > 0 ? `${lagMs}ms` : 'LIVE'}
        </span>
        {stats?.errors > 0 && (
          <><br /><span style={{ color: 'rgba(255,77,0,0.85)' }}>DROP {stats.errors}</span></>
        )}
      </div>

      {/* Domain cells — remaining width after label */}
      <div style={{ display: 'flex', flex: 1, height: '100%' }}>
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

// ── WO-1344D: Bay SignalMap Projection ───────────────────────
// Renders SignalMap overlay for viewMode='signalmap' OR xrayOpen on assigned bays.
// X-RAY mode: targeted — triggers setquery for that subject, shows focused signal map.
// SIGMAP mode: ambient — full live signal map for the assignment.
function BaySignalMapProjection({ signals, xraySignals = [] }) {
  const bays = useBayStore(s => s.bays);
  const bayList = Object.values(bays);
  // X-RAY takes priority; fall back to signalmap mode
  const xrayBay   = bayList.find(b => b.xrayOpen    && b.assignment !== null);
  const sigmapBay = bayList.find(b => b.viewMode === 'signalmap' && b.assignment !== null);
  const activeBay = xrayBay ?? sigmapBay;
  if (!activeBay) return null;

  const isXray      = activeBay.xrayOpen;
  const accentColor = isXray ? '#8A2BE2' : '#66FF00';
  const modeLabel   = isXray ? 'X-RAY' : 'SIGNAL MAP';

  return (
    <div style={{
      position: 'fixed', top: 56, left: 72, right: 260, bottom: 56,
      zIndex: 15, background: '#000',
      borderRight: `1px solid ${accentColor}22`,
    }}>
      {/* Bay identity header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 32, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        background: 'rgba(0,0,0,0.9)',
        borderBottom: `1px solid ${accentColor}30`,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <span style={{ fontSize: 7, color: `${accentColor}88`, letterSpacing: '0.3em' }}>
          BAY 0{activeBay.id} · {modeLabel}
        </span>
        <span style={{ fontSize: 9, color: accentColor, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {activeBay.assignment.title}
        </span>
        {isXray && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: 'rgba(138,43,226,0.5)', letterSpacing: '0.2em', marginLeft: 'auto' }}>
            TARGETED · {activeBay.assignment.title.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, top: 32 }}>
        <SignalMap data={isXray ? xraySignals : signals} isActive={true} />
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────

export default function App() {
  const [query, setquery]               = useState('');
  const [scrubPos, setScrubPos]         = useState(0);
  const handleScrubPos = useCallback((pos) => {
    setScrubPos(pos);
    useAnnotationStore.getState().setScrubPos(pos);
  }, []);
  const [conceptBOpen, setConceptBOpen]   = useState(true);
  const [conceptBPinned, setConceptBPinned] = useState(false);
  const [selectedLens, setSelectedLens] = useState('INVESTOR');
  // WO-1383 — browser enforcement gates (L2/L3/L4)
  useEffect(() => initBrowserGate(), []);


  const [navMode, setNavMode]           = useState('surface');
  const [surfaceExpanded, setSurfaceExpanded] = useState(false);
  const [surfaceActivated, setSurfaceActivated] = useState(false);
  const [selectedSurfaceDomain, setSelectedSurfaceDomain] = useState(null);
  const [visorReady, setVisorReady] = useState(false);
  useEffect(() => {
    if (!surfaceActivated) { setVisorReady(false); return; }
    const t = setTimeout(() => setVisorReady(true), 540);
    return () => clearTimeout(t);
  }, [surfaceActivated]);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [selection, setSelection]       = useState(null);
  const [searchPreview, setSearchPreview] = useState(null);
  const [clickEvent, setClickEvent]     = useState(null);
  const activeSessionId       = useAnalysisStore(s => s.activeSessionId);
  const sessions              = useAnalysisStore(s => s.sessions);
  const createSession         = useAnalysisStore(s => s.createSession);
  const pendingAcquisition    = useAnalysisStore(s => s.pendingAcquisition);
  const clearPendingAcquisition = useAnalysisStore(s => s.clearPendingAcquisition);
  const [oracleLens, setOracleLens] = useState('10K View');
  const [searchQuery, setSearchQuery]   = useState('');
  const [topoMode, setTopoMode]         = useState(false);
  const [xrayQuery, setXrayQuery]       = useState('');
  const iframeRef = useRef(null);

  const { hydrateFromSignals } = useSurface();
  const { signals: marqueeSignals } = usehnsignals(MARQUEE_SEED);

  useEffect(() => { hydrateFromSignals(marqueeSignals); }, [marqueeSignals, hydrateFromSignals]);

  const activeQuery = query || null;

  const { records }            = usetruthlens(activeQuery);
  const { signals: ingestSignals } = useingest(activeQuery);
  const { signals: hnSignals }     = usehnsignals(activeQuery);
  const { signals: frameSignals }  = useframeingest(activeQuery);

  // WO-1719/1720/1721 — Shared pool feeds: dispatch to surfaceRouter + feed mergedRecords
  const { signals: fredSignals }   = useFredSignals();
  const { signals: edgarSignals }  = useEdgarSignals();
  const { signals: kalshiSignals } = useKalshiSignals();

  // X-RAY dedicated signal hooks — isolated from activeQuery
  const { signals: xrayIngest } = useingest(xrayQuery);
  const { signals: xrayHn }     = usehnsignals(xrayQuery);
  const xraySignals = useMemo(() => {
    const map = new Map();
    [...xrayHn, ...xrayIngest].forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [xrayIngest, xrayHn]);
  const { lagMs: streamLagMs, domainScores, stats: streamStats } = useframestream({ enabled: navMode === 'surface' });
  const { history, currentIndex, current, seek, seekToTime } = usereplay(true);

  // WO-1390: Live ingestion daemon — FRED + Finnhub
  const [liveInjectSignals, setLiveInjectSignals] = useState([]);
  useEffect(() => {
    startIngestionDaemon();
    const handler = (e) => setLiveInjectSignals(e.detail ?? []);
    window.addEventListener('KRYLO_LIVE_INJECT', handler);
    return () => window.removeEventListener('KRYLO_LIVE_INJECT', handler);
  }, []);

  // Live signal pool — every other ingest hook is query-gated, so with no
  // active search the GDELT rotation records (cone_domain + signal_score)
  // never reached the client and the cones starved. Poll the pool directly.
  const [poolSignals, setPoolSignals] = useState([]);
  useEffect(() => {
    let dead = false;
    const pull = () => fetch('/api/signals')
      .then(r => r.json())
      .then(arr => { if (!dead && Array.isArray(arr)) setPoolSignals(arr); })
      .catch(() => {});
    pull();
    const id = setInterval(pull, 60000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  const mergedRecords = useMemo(() => {
    const map = new Map();
    [...poolSignals, ...hnSignals, ...frameSignals, ...ingestSignals, ...records, ...liveInjectSignals,
     ...fredSignals, ...edgarSignals, ...kalshiSignals].forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }, [poolSignals, records, ingestSignals, hnSignals, frameSignals, liveInjectSignals,
      fredSignals, edgarSignals, kalshiSignals]);

  const activeSession = activeSessionId ? (sessions[activeSessionId] ?? null) : null;
  const canonical     = useOracleMapper(activeSession);

  const handleSessionBootstrap = useCallback(({ query, source = 'unknown', timestamp = Date.now() }) => {
    const q = (query ?? '').trim();
    if (!q) return;
    const sessionId = `session_${timestamp}`;
    createSession(sessionId, '10K View', q, { source });
    emitTelemetry({ type: 'session_open', sessionId, source, query: q, timestamp });
    setNavMode('oracle');
  }, [createSession]);

  // WO-1092 Phase A — route merged records into surface subscriptions
  useEffect(() => {
    if (mergedRecords.length) surfaceRouter.dispatchBatch(mergedRecords);
  }, [mergedRecords]);

  const liveSignals = useMemo(
    () => mergedRecords.length
      ? mergedRecords.map(r => {
          // signal_score scale differs by source: rotation 0–1, seed ETRs 0–100
          // FRED/EDGAR/Kalshi use r.signal (0–100); pool records use r.signal_score
          const score = typeof r.signal === 'number'
            ? r.signal / 100
            : r.fs ?? (typeof r.signal_score === 'number'
              ? (r.signal_score > 1 ? r.signal_score / 100 : r.signal_score)
              : 0);
          return {
          text:     r.truth_statement ?? r.title ?? r.id,
          source:   r.source_type ?? 'spine',
          domain:   r.cone_domain ?? r.domain ?? null,
          strength: Math.round(score * 5),
          id:       r.id,
          fs:       score,
          primary:  true,
          fidelity: {
            m_checksum:  r.fidelity_components?.m_checksum  ?? 0,
            t_telemetry: r.fidelity_components?.t_telemetry ?? 0,
            e_viral:     r.fidelity_components?.e_viral     ?? 0,
          },
        };})
      : STUB_SIGNALS,
    [mergedRecords],
  );

  const coneColorOverrides = useBayStore(s => s.coneColorOverrides ?? {});
  const activeCones = useMemo(() => buildActiveCones(liveSignals, coneColorOverrides), [liveSignals, coneColorOverrides]);

  const isLive = scrubPos === 0;

  // Sync scrub position via timestamp authority — prevents frame-count drift
  useEffect(() => {
    if (history.length < 2) return;
    const earliest = history[0].ts;
    const latest   = history[history.length - 1].ts;
    const targetTs = latest - scrubPos * (latest - earliest);
    seekToTime(targetTs);
  }, [scrubPos, history]);

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
      // cone_domain (live records) routes to canonical feeders; stubs keep source
      domain:    sig.domain ?? sig.source ?? 'signal',
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
      if (ev.data?.type === 'krylo-load-project') {
        const proj = ev.data.project;
        if (proj) {
          const id = createSession(proj.lens || 'GENERAL');
          setNavMode('analysis');
        }
        return;
      }
      if (ev.data?.type === 'krylo-save-as') {
        const name = ev.data.name?.trim();
        const bay  = ev.data.bay ?? 1;
        if (name) {
          saveProject(name, {
            lens:      activeSession?.lens ?? '',
            domain:    activeSession?.tensor?.domain ?? null,
            situation: activeSession?.tensor?.situation ?? null,
            floor:     activeSession?.tensor?.floor ?? null,
            horizon:   activeSession?.tensor?.horizon ?? null,
            query:     activeSession?.query ?? '',
          }, bay);
        }
        return;
      }
      if (ev.data?.type !== 'krylo-nav') return;
      if (ev.data.mode) {
        setNavMode(ev.data.mode);
        setConceptBOpen(true);
        if (ev.data.mode === 'surface') {
          setSurfaceActivated(true);
          setSurfaceExpanded(true);
        } else {
          setSurfaceExpanded(false);
        }
      }
    }
    window.addEventListener('message', onNavMessage);
    return () => window.removeEventListener('message', onNavMessage);
  }, [activeSession]);

  // krylo-reset: logo tap — global state reset + iframe reload
  useEffect(() => {
    function onReset(ev) {
      if (ev.data?.type !== 'krylo-reset') return;
      setNavMode('surface');
      setSurfaceActivated(false);
      setquery('');
      setScrubPos(0);
      setSelection(null);
      setAnalysisPage(0);
      setAnalysisQuery('');
      setSearchQuery('');
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    }
    window.addEventListener('message', onReset);
    return () => window.removeEventListener('message', onReset);
  }, []);

  // X-RAY activation: isolated from activeQuery — uses dedicated xrayQuery state.
  const bays = useBayStore(s => s.bays);
  useEffect(() => {
    const xrayBay = Object.values(bays).find(b => b.xrayOpen && b.assignment !== null);
    setXrayQuery(xrayBay ? xrayBay.assignment.title : '');
  }, [bays]);

  // krylo-submit: preview entity in stat card, no modal — SAVE triggers bay selector.
  useEffect(() => {
    function onSubmit(ev) {
      if (ev.data?.type !== 'krylo-submit') return;
      const q = (ev.data.query ?? ev.data.payload ?? '').trim();
      if (!q) return;
      setNavMode('surface');
      setSurfaceActivated(true);
      setSearchPreview({ id: q, title: q, source: 'search' });
      setSelection('technology');
    }
    window.addEventListener('message', onSubmit);
    return () => window.removeEventListener('message', onSubmit);
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

  useEffect(() => {
    function onTogglePanel(ev) {
      if (ev.data?.type !== 'toggle-signal-panel') return;
      setConceptBOpen(o => !o);
    }
    window.addEventListener('message', onTogglePanel);
    return () => window.removeEventListener('message', onTogglePanel);
  }, []);

  // WO-1365/1366: Broker result — route to leverage view on non-BLOCKED envelope.
  useEffect(() => {
    if (!pendingAcquisition || pendingAcquisition.status === 'BLOCKED') return;
    setNavMode('leverage');
    clearPendingAcquisition();
  }, [pendingAcquisition]);

  // Save query to history when analysis query is committed
  function commitAnalysisQuery() {
    if (!analysisQuery.trim()) return;
    setSearchHistory(h => [{ query: analysisQuery, lens: selectedLens, ts: Date.now() }, ...h].slice(0, 50));
    setquery(analysisQuery);
  }

  const isSurface = navMode === 'surface';

  const globalPressure = useMemo(() => {
    const r = streamStats?.received ?? 0;
    return Math.min(1, r / 40);
  }, [streamStats?.received]);

  const globalCS = useMemo(() => {
    if (globalPressure < 0.25) return 'INSUFFICIENT_SIGNAL';
    if (globalPressure < 0.5)  return 'BUILDING_CONVERGENCE';
    if (globalPressure < 0.75) return 'TURBULENT_CONVERGENCE';
    return 'HIGH_CONVERGENCE';
  }, [globalPressure]);

  return (
    <ecosystemcontext.Provider value={{ query, setquery }}>

      {/* ── Surface Bay ───────────────────────────────────────── */}

      {/* Surface Field — single canonical renderer (CL-11) */}
      {isSurface && (
        <>
          <GridOverlay />


          {/* AnalysisField — ConeMap only. No ACTIVE mode. */}
          <div style={{ position: 'fixed', top: 56, left: 72, right: 0, bottom: surfaceExpanded ? 56 : 96, zIndex: 0, transition: 'bottom 900ms linear' }}>
            <AnalysisField
              signals={liveSignals}
              replayedSignals={replayedSignals}
              selectedLens={selectedLens}
              topoMode={topoMode}
              onTopoToggle={() => setTopoMode(m => !m)}
              selection={selection}
              clickEvent={clickEvent}
              onSelectCone={setSelection}
              maxCones={surfaceActivated ? undefined : 3}
              searchPreview={searchPreview}
              onSearchPreviewSave={() => setSearchPreview(null)}
              onArcClick={(a, b) => {
                setSearchPreview({ id: `${a} ${b}`, title: `${a} ${b}`, source: 'arc' });
                setSelection('technology');
              }}
              coneColorOverrides={coneColorOverrides}
            />
          </div>

          {/* Bottom panel — Console Dashboard, slides above scrubber */}
          <div style={{ position: 'fixed', bottom: 56, left: 72, right: 0, zIndex: 100 }}>
            <div style={{
              opacity:    (visorReady && (conceptBOpen || conceptBPinned)) ? 1 : 0,
              transform:  (visorReady && (conceptBOpen || conceptBPinned)) ? 'translateY(0)' : 'translateY(100%)',
              transition: 'opacity 360ms ease, transform 360ms cubic-bezier(0.4,0,0.2,1)',
              pointerEvents: (visorReady && (conceptBOpen || conceptBPinned)) ? 'auto' : 'none',
            }}>
              <BayVisor cones={activeCones} />
            </div>
          </div>

          {/* WO-1333: Scrubber-relative annotation layer */}
          {/* AnnotationLayer removed per Founder — 2026-06-03 */}

          {/* WO-1718A: Surface Panel — removed from hero per Founder */}

          {/* WO-1344D: Bay projection overlay (xray/signalmap modes) */}
          <BaySignalMapProjection signals={liveSignals} xraySignals={xraySignals} />


          {/* WO-1344B: Assignment Intent Modal */}

          {/* Scrubber */}
          <div style={{
            position: 'fixed', bottom: 0, left: 72, right: 0, height: 56, zIndex: 11,
            background: 'rgba(0,0,0,0.78)', borderTop: '1px solid rgba(102,255,0,0.15)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <TemporalScrubber
              scrubPos={scrubPos}
              onChange={handleScrubPos}
              frameTs={current.ts}
              hasFrames={history.length > 1}
            />
          </div>
        </>
      )}



      {/* ── Oracle Bay — arc tap or node click routes here ───── */}

      {navMode === 'oracle' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#F5F5F7', overflow: 'hidden' }}>
          <OracleView
            query={activeSession?.query ?? query}
            canonical={canonical}
            signalMapData={{ signals: replayedSignals }}
            lens={oracleLens}
            onLensSwitch={setOracleLens}
            categoryContext={activeSession?.tensor?.domains}
            onReturn={() => setNavMode('surface')}
          />
        </div>
      )}

      {/* ── Analysis Bay ──────────────────────────────────────── */}

      {navMode === 'analysis' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <AnalysisSubstrate pressure={globalPressure} convergenceState={globalCS} />
          <AnalysisIdleField activeCones={activeCones} />
        </div>
      )}

      {/* ── Feeds Bay ─────────────────────────────────────────── */}

      {/* ── Workstation — WO-1348 ────────────────────────────── */}
      {navMode === 'workstation' && (
        <Workstation liveSignals={liveSignals} />
      )}

      {navMode === 'feeds' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <FeedsBay signals={liveSignals} />
        </div>
      )}

      {/* ── History Bay ───────────────────────────────────────── */}

      <div style={{ display: navMode === 'history' ? 'block' : 'none', position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
        <HistoryBay onRerunNavigate={() => setNavMode('analysis')} />
      </div>

      {/* ── Community View ────────────────────────────────────── */}
      {navMode === 'community' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#0d0d14', overflow: 'hidden' }}>
          <CommunityView />
        </div>
      )}

      {/* ── News / Evidence Archive ───────────────────────────── */}
      {navMode === 'news' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <ArtifactsBay />
        </div>
      )}

      {/* ── Settings Panel ────────────────────────────────────── */}

      {navMode === 'settings' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000000', overflow: 'hidden' }}>
          <SettingsPanel />
        </div>
      )}


      {/* ── Leverage Oracle Bay — WO-1362 ─────────────────────── */}
      {navMode === 'leverage' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, overflow: 'hidden' }}>
          <OracleViewV2
            query={activeSession?.query ?? query}
            fidelityInputs={{}}
            onReturn={() => setNavMode('surface')}
          />
        </div>
      )}

      {/* WO-1753: Middle Console */}
      {navMode === 'console' && (
        <div style={{ position: 'fixed', top: 48, left: 72, right: 0, bottom: 0, zIndex: 15, background: '#000', overflow: 'hidden' }}>
          <CoachWellConsole />
        </div>
      )}


      {/* ROOT LAYER 20: HUD portal target — BayHUD + InspectionPanel portal here from ConeMap */}
      <div id="krylo-hud-root" style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none' }} />

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
