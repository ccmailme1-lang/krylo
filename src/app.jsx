// src/app.jsx
// WO-230 — registryview added to vault
// WO-232 — signalMapData bridge: maps ETR records to SignalMap signals shape
// WO-233 — extend bridge with fidelity components (m_checksum / t_telemetry / e_viral)
// WO-246 — stub signals: map never receives null; stubs shown while loading / on error
// WO-251 — KRYL-284/300: useingest merged records; tenkvault owns registry + workspace
// WO-256 — signalMapData passed to LookingFunnel for Moat in void
// WO-256 — Marquee seed: usehnsignals fires on mount for Campaign Funnel marquee
// WO-257 — HackerNews signal vector merged into mergedRecords
// WO-258 — 10K View Insight Architecture
// Fix   — liveSignals + signalMapData memoized; stops render cascade
// WO-294 — Bridge: PrismContext owns krylo-submit; App reacts to status

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas }          from '@react-three/fiber';
import { usetruthlens }    from './hooks/usetruthlens.js';
import { useingest }       from './hooks/useingest.js';
import { useframeingest }  from './hooks/useframeingest.js';
import { usehnsignals }    from './hooks/usehnsignals.js';
import { ecosystemcontext } from './ecosystemcontext.jsx';
import campaignfunnel  from './components/spine/campaignfunnel.jsx';
import clusterfield    from './components/spine/clusterfield.jsx';
import oracleview      from './components/oracleview.jsx';
import tenkvault       from './components/tenkvault.jsx';
import personaproxy    from './components/personaproxy.jsx';
import signalmap       from './components/spine/spinemap.jsx';
import signalfield     from './components/signalfield.jsx';
import { FEATURES }    from './config/features.js';
import HostInteraction from './components/hostinteraction.jsx';
import { useSurface }  from './context/SurfaceContext.jsx';
import { RENDER_OWNER, SURFACE_PHASE } from './engine/surfacecontract.js';

const CampaignFunnel = campaignfunnel;
const ClusterField   = clusterfield;
const OracleView     = oracleview;
const TenKVault      = tenkvault;
const PersonaProxy   = personaproxy;
const SignalMap      = signalmap;
const SignalField    = signalfield;

const STUB_SIGNALS = [
  {
    id:               '__stub_0',
    text:             'Texas pension funds face growing shortfall amid budget pressure',
    truth_statement:  'Texas pension funds face growing shortfall amid budget pressure',
    source:           'spine',
    strength:         3,
    primary:          false,
    _isStub:          true,
    fs:               0.62,
    fidelity: { m_checksum: 0.08, t_telemetry: 0.11, e_viral: 0.04 },
  },
  {
    id:               '__stub_1',
    text:             'California housing costs push residents toward distant suburbs',
    truth_statement:  'California housing costs push residents toward distant suburbs',
    source:           'spine',
    strength:         3,
    primary:          false,
    _isStub:          true,
    fs:               0.55,
    fidelity: { m_checksum: 0.06, t_telemetry: 0.09, e_viral: 0.02 },
  },
  {
    id:               '__stub_2',
    text:             'New York transit authority faces record ridership decline',
    truth_statement:  'New York transit authority faces record ridership decline',
    source:           'spine',
    strength:         4,
    primary:          false,
    _isStub:          true,
    fs:               0.71,
    fidelity: { m_checksum: 0.12, t_telemetry: 0.07, e_viral: 0.05 },
  },
  {
    id:               '__stub_3',
    text:             'Florida insurance market tightens as carriers exit coastal zones',
    truth_statement:  'Florida insurance market tightens as carriers exit coastal zones',
    source:           'spine',
    strength:         3,
    primary:          false,
    _isStub:          true,
    fs:               0.48,
    fidelity: { m_checksum: 0.05, t_telemetry: 0.13, e_viral: 0.03 },
  },
  {
    id:               '__stub_4',
    text:             'Chicago school district budget gap widens for third consecutive year',
    truth_statement:  'Chicago school district budget gap widens for third consecutive year',
    source:           'spine',
    strength:         2,
    primary:          false,
    _isStub:          true,
    fs:               0.38,
    fidelity: { m_checksum: 0.09, t_telemetry: 0.06, e_viral: 0.01 },
  },
];

// Seed query for Campaign Funnel marquee — fires on mount, no user input required
const MARQUEE_SEED = 'workplace layoffs culture conflict';

export default function App() {
  const [view, setview]                 = useState('funnel');
  const [mapExiting, setMapExiting]     = useState(false);
  const [query, setquery]               = useState('');
  const [activeLens, setActiveLens]     = useState('10K View');
  const [categoryContext, setCategoryContext] = useState(null);
  const [funnelSrc, setFunnelSrc]       = useState('/krylo-feed.html');
  const [proxyPreset, setProxyPreset]   = useState(null);
  const [hostPayload, setHostPayload]   = useState(null);
  const [clusterState, setClusterState] = useState({ isActive: false, vector: { D: 0.15, V: 0.20 } });
  const [submitted, setSubmitted]       = useState(false);
  const [fieldSearchOpen, setFieldSearchOpen] = useState(false);
  const iframeRef = useRef(null);

  // WO-1040: surface contract
  const { transitionTo, hydrateFromSignals, perturb } = useSurface();

  const returnToSearch = useCallback(() => {
    setFunnelSrc('/krylo-feed.html?search=1');
    setview('funnel');
    setSubmitted(false);
    setTimeout(() => setClusterState({ isActive: false, vector: { D: 0.15, V: 0.20 } }), 50);
    transitionTo(RENDER_OWNER.CLUSTER, SURFACE_PHASE.AMBIENT);
  }, [transitionTo]);

  const goToOracle = useCallback(() => {
    setMapExiting(true);
    setTimeout(() => {
      setMapExiting(false);
      transitionTo(RENDER_OWNER.ORACLE, SURFACE_PHASE.RESOLVED);
      setview('oracle');
    }, 380);
  }, [transitionTo]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'krylo-scenario') {
        setProxyPreset(e.data.proxy ?? null);
        setview('proxy');
        return;
      }
      if (e.data?.type === 'krylo-navigate') {
        if (e.data.target === 'oracle') {
          transitionTo(RENDER_OWNER.ORACLE, SURFACE_PHASE.RESOLVED);
          setview('oracle');
        }
        return;
      }
      if (e.data?.type !== 'krylo-submit') return;
      const q = e.data.query ?? '';
      setHostPayload(null);
      setquery(q);
      setCategoryContext(e.data.categoryContext ?? null);
      document.body.classList.add('krylo-active');
      setClusterState({ isActive: true, vector: { D: 0.50, V: 0.80 } });
      perturb('search');
      transitionTo(RENDER_OWNER.MAP, SURFACE_PHASE.SCANNING);
      // WO-1201: view switch deferred — ClusterField fires onTransitionComplete after collapse
      if (q.trim()) {
        fetch('/api/host', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ query: q }),
        })
          .then(r => r.json())
          .then(payload => setHostPayload(payload))
          .catch(() => {});
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Marquee seed — always-on HN feed for Campaign Funnel ghost text
  const { signals: marqueeSignals } = usehnsignals(MARQUEE_SEED);

  // WO-1040: hydrate surface topology from marquee signals on mount / update
  useEffect(() => {
    hydrateFromSignals(marqueeSignals);
  }, [marqueeSignals, hydrateFromSignals]);

  const activeQuery = query || null;

  const { records, loading, error }    = usetruthlens(activeQuery);
  const { signals: ingestSignals }     = useingest(activeQuery);
  const { signals: hnSignals }         = usehnsignals(activeQuery);
  const { signals: frameSignals }      = useframeingest(activeQuery);

  // WO-257: merge + deduplicate by id — usetruthlens takes precedence (last write wins)
  // Priority order: HN (lowest) → ABI frames → ingest → usetruthlens (highest)
  const mergedRecords = useMemo(() => {
    const map = new Map();
    [...hnSignals, ...frameSignals, ...ingestSignals, ...records].forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }, [records, ingestSignals, hnSignals, frameSignals]);

  // Prefer truth-engine records (have definition/comments) over HN/ingest records
  const primaryRecord = records[0] ?? mergedRecords[0] ?? null;

  // Memoized — stable reference prevents downstream effects from firing on every re-render
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

  // Memoized — stable reference prevents signalMapData-dependent useEffects
  // (e.g. GroundLevelOracle) from firing on every behavior state update
  const signalMapData = useMemo(
    () => ({ signals: liveSignals, loading }),
    [liveSignals, loading],
  );

  // Health check route
  const isHealth = window.location.search.includes('health') ||
                   window.location.pathname === '/health';

  if (isHealth) {
    const HealthCheck = React.lazy(() => import('./components/audit/healthcheck.jsx'));
    return (
      <React.Suspense fallback={null}>
        <HealthCheck />
      </React.Suspense>
    );
  }

  return (
    <ecosystemcontext.Provider value={{ query, setquery }}>
      <div className="void-root">
        {view !== 'funnel' && view !== 'map' && activeLens !== 'Signal Map' && <HostInteraction contextQuery={query} view={view} />}
        <div style={{ display: view === 'funnel' ? 'block' : 'none', width: '100%', height: '100%', position: 'relative' }}>
          {/* WO-1215: ambient cluster field — renders behind the transparent iframe */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <Canvas camera={{ position: [0, 6, 12], fov: 55 }} style={{ background: '#000000' }}>
              <ambientLight intensity={0.08} />
              <ClusterField
                searchState={clusterState}
                signals={submitted ? liveSignals : null}
                countSignals={marqueeSignals}
                onTransitionComplete={() => {
                  setSubmitted(true);
                  setTimeout(() => setClusterState({ isActive: false, vector: { D: 0.15, V: 0.20 } }), 100);
                }}
              />
            </Canvas>
          </div>
          <div style={{ display: submitted ? 'none' : 'block', width: '100%', height: '100%' }}>
            <CampaignFunnel
              signals={marqueeSignals}
              records={marqueeSignals}
              iframeRef={iframeRef}
              src={funnelSrc}
              onCat={(key) => { setquery(key); document.body.classList.add('krylo-active'); goToOracle(); }}
              onProxy={(key) => { setProxyPreset(key); setview('proxy'); }}
            />
          </div>

          {/* Layer 1N overlay — nav + oracle button over ClusterField */}
          {submitted && (
            <>
              <nav style={{
                position: 'absolute', top: 0, left: 0, width: 72, height: '100%', zIndex: 50,
                background: 'rgba(0,0,0,0.8)', borderRight: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: 48, boxSizing: 'border-box', pointerEvents: 'auto',
              }}>
                {[
                  { label: 'Surface', action: returnToSearch, icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><line x1="9" y1="2" x2="9" y2="0"/><line x1="9" y1="18" x2="9" y2="16"/><line x1="2" y1="9" x2="0" y2="9"/><line x1="18" y1="9" x2="16" y2="9"/></svg> },
                  { label: 'Oracle',  action: goToOracle,    icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="9" cy="9" rx="8" ry="5"/><circle cx="9" cy="9" r="2"/></svg> },
                  { label: 'Search',  action: () => setFieldSearchOpen(true), icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5"/><line x1="12" y1="12" x2="16" y2="16"/></svg> },
                ].map(item => (
                  <div key={item.label} onClick={item.action} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '12px 0', width: '100%', cursor: 'pointer',
                    opacity: 0.4, color: '#ffffff', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#66FF00'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = '#ffffff'; }}>
                    {item.icon}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{item.label}</span>
                  </div>
                ))}
              </nav>

              <div onClick={() => { setActiveLens('10K View'); goToOracle(); }} style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, padding: '12px 40px', background: 'transparent',
                border: '1px solid rgba(102,255,0,0.5)', color: '#66FF00',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                ANALYSE SIGNAL →
              </div>

              {fieldSearchOpen && (
                <div onClick={() => setFieldSearchOpen(false)} style={{
                  position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <form onClick={e => e.stopPropagation()} onSubmit={e => {
                    e.preventDefault();
                    const q = new FormData(e.target).get('q')?.trim();
                    if (!q) return;
                    setquery(q);
                    setFieldSearchOpen(false);
                    setSubmitted(false);
                    setClusterState({ isActive: true, vector: { D: 0.50, V: 0.80 } });
                    transitionTo(RENDER_OWNER.MAP, SURFACE_PHASE.SCANNING);
                  }} style={{ width: '520px', padding: '0 24px' }}>
                    <input name="q" autoFocus placeholder="enter signal..." defaultValue={query}
                      style={{
                        width: '100%', background: 'transparent', border: 'none',
                        borderBottom: '1px solid rgba(102,255,0,0.6)', outline: 'none',
                        color: '#ffffff', caretColor: '#66FF00',
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: '22px',
                        letterSpacing: '0.04em', padding: '12px 0',
                      }} />
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* WO-816: Background mesh — live during proxy mode. Disable via FEATURES.SOVEREIGN_DRIFT = false */}
        {view === 'proxy' && FEATURES.SOVEREIGN_DRIFT && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            <SignalMap signalMapData={{ signals: STUB_SIGNALS, loading: false }} isActive={false} />
          </div>
        )}
        {view === 'proxy' && (
          <PersonaProxy
            proxyPreset={proxyPreset}
            onReturn={() => { setview('funnel'); setProxyPreset(null); }}
          />
        )}
        {view === 'map' && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 10, background: '#000000',
            animation: mapExiting
              ? 'krylo-slide-out-left 0.38s cubic-bezier(0.4,0,0.2,1) forwards'
              : 'krylo-slide-in-right 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <SignalMap
              signalMapData={signalMapData}
              data={primaryRecord}
              isActive={true}
              onSelect={(signal) => {
                const q = signal?.text || signal?.id || query;
                setquery(q);
                setActiveLens('10K View');
                goToOracle();
              }}
            />

            {/* Layer 1N left nav — inside the map frame */}
            <nav style={{
              position: 'absolute', top: 0, left: 0, width: 72, height: '100%',
              background: 'rgba(0,0,0,0.8)', borderRight: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 48, zIndex: 50, boxSizing: 'border-box', pointerEvents: 'auto',
            }}>
              {[
                { label: 'Surface', active: true,  action: null,        icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><line x1="9" y1="2" x2="9" y2="0"/><line x1="9" y1="18" x2="9" y2="16"/><line x1="2" y1="9" x2="0" y2="9"/><line x1="18" y1="9" x2="16" y2="9"/></svg> },
                { label: 'Oracle',  active: false, action: goToOracle,  icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="9" cy="9" rx="8" ry="5"/><circle cx="9" cy="9" r="2"/></svg> },
                { label: 'Search',  active: false, action: returnToSearch, icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5"/><line x1="12" y1="12" x2="16" y2="16"/></svg> },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action ?? undefined}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '12px 0', width: '100%', cursor: item.action ? 'pointer' : 'default',
                    opacity: item.active ? 1 : 0.3,
                    color: item.active ? '#66FF00' : '#ffffff',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => { if (!item.active && item.action) e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { if (!item.active && item.action) e.currentTarget.style.opacity = '0.3'; }}
                >
                  {item.icon}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </nav>

            <div
              onClick={() => { setActiveLens('10K View'); goToOracle(); }}
              style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, padding: '12px 40px', background: 'transparent',
                border: '1px solid rgba(102,255,0,0.5)', color: '#66FF00',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              ANALYSE SIGNAL →
            </div>
          </div>
        )}

        {view === 'field' && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 10, background: '#000000',
            animation: mapExiting
              ? 'krylo-slide-out-left 0.38s cubic-bezier(0.4,0,0.2,1) forwards'
              : 'krylo-slide-in-right 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <Canvas
              camera={{ position: [0, 18, 6], fov: 55 }}
              style={{ width: '100%', height: '100%', background: '#000000' }}
            >
              <SignalField />
            </Canvas>

            {/* Layer 1N left nav */}
            <nav style={{
              position: 'absolute', top: 0, left: 0, width: 72, height: '100%',
              background: 'rgba(0,0,0,0.8)', borderRight: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 48, zIndex: 50, boxSizing: 'border-box', pointerEvents: 'auto',
            }}>
              {[
                { label: 'Surface', active: false, action: returnToSearch,             icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><line x1="9" y1="2" x2="9" y2="0"/><line x1="9" y1="18" x2="9" y2="16"/><line x1="2" y1="9" x2="0" y2="9"/><line x1="18" y1="9" x2="16" y2="9"/></svg> },
                { label: 'Oracle',  active: false, action: goToOracle,                 icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="9" cy="9" rx="8" ry="5"/><circle cx="9" cy="9" r="2"/></svg> },
                { label: 'Search',  active: false, action: () => setFieldSearchOpen(true), icon: <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5"/><line x1="12" y1="12" x2="16" y2="16"/></svg> },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action ?? undefined}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '12px 0', width: '100%', cursor: 'pointer',
                    opacity: 0.4, color: '#ffffff', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#66FF00'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = '#ffffff'; }}
                >
                  {item.icon}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </nav>

            <div
              onClick={() => { setActiveLens('10K View'); goToOracle(); }}
              style={{
                position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, padding: '12px 40px', background: 'transparent',
                border: '1px solid rgba(102,255,0,0.5)', color: '#66FF00',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              ANALYSE SIGNAL →
            </div>

            {/* Field search overlay — bare input floating on dimmed canvas */}
            {fieldSearchOpen && (
              <div
                onClick={() => setFieldSearchOpen(false)}
                style={{
                  position: 'absolute', inset: 0, zIndex: 200,
                  background: 'rgba(0,0,0,0.72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <form
                  onClick={e => e.stopPropagation()}
                  onSubmit={e => {
                    e.preventDefault();
                    const q = new FormData(e.target).get('q')?.trim();
                    if (!q) return;
                    setquery(q);
                    setFieldSearchOpen(false);
                    setClusterState({ isActive: true, vector: { D: 0.50, V: 0.80 } });
                    transitionTo(RENDER_OWNER.MAP, SURFACE_PHASE.SCANNING);
                  }}
                  style={{ width: '520px', padding: '0 24px' }}
                >
                  <input
                    name="q"
                    autoFocus
                    placeholder="enter signal..."
                    defaultValue={query}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(102,255,0,0.6)', outline: 'none',
                      color: '#ffffff', caretColor: '#66FF00',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: '22px',
                      letterSpacing: '0.04em', padding: '12px 0',
                    }}
                  />
                </form>
              </div>
            )}
          </div>
        )}

        {view === 'oracle' && (
          <div className="krylo-layer surfaced">
            <OracleView
              query={query}
              data={primaryRecord}
              signalMapData={signalMapData}
              lens={activeLens}
              onLensSwitch={(newLens) => setActiveLens(newLens)}
              onnavigate={() => setview('vault')}
              categoryContext={categoryContext}
              onReturn={returnToSearch}
              hostPayload={hostPayload}
            />
          </div>
        )}
        {view === 'vault' && (
          <div className="krylo-layer surfaced">
            <TenKVault
              score={primaryRecord?.signal_score ?? null}
              data={primaryRecord}
              records={mergedRecords}
              onReturn={() => setview('oracle')}
            />
          </div>
        )}
      </div>
    </ecosystemcontext.Provider>
  );
}
