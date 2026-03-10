// src/app.jsx
// WO-230 — registryview added to vault
// WO-232 — signalMapData bridge: maps ETR records to SignalMap signals shape
// WO-233 — extend bridge with fidelity components (m_checksum / t_telemetry / e_viral)
// WO-246 — stub signals: map never receives null; stubs shown while loading / on error
// WO-251 — KRYL-284/300: useingest merged records; tenkvault owns registry + workspace

import React, { useState, useRef, useMemo } from 'react';
import { usetruthlens } from './hooks/usetruthlens.js';
import { useingest }    from './hooks/useingest.js';
import { ecosystemcontext } from './ecosystemcontext.jsx';
import lookingfunnel  from './components/lookingfunnel.jsx';
import oracleview     from './components/oracleview.jsx';
import tenkvault      from './components/tenkvault.jsx';

const LookingFunnel = lookingfunnel;
const OracleView    = oracleview;
const TenKVault     = tenkvault;

const STUB_SIGNALS = [
  {
    id:      '__stub_0',
    text:    '—',
    source:  'spine',
    strength: 1,
    primary:  false,
    _isStub:  true,
    fidelity: { m_checksum: 0.08, t_telemetry: 0.11, e_viral: 0.04 },
  },
  {
    id:      '__stub_1',
    text:    '—',
    source:  'spine',
    strength: 1,
    primary:  false,
    _isStub:  true,
    fidelity: { m_checksum: 0.06, t_telemetry: 0.09, e_viral: 0.02 },
  },
  {
    id:      '__stub_2',
    text:    '—',
    source:  'spine',
    strength: 1,
    primary:  false,
    _isStub:  true,
    fidelity: { m_checksum: 0.12, t_telemetry: 0.07, e_viral: 0.05 },
  },
  {
    id:      '__stub_3',
    text:    '—',
    source:  'spine',
    strength: 1,
    primary:  false,
    _isStub:  true,
    fidelity: { m_checksum: 0.05, t_telemetry: 0.13, e_viral: 0.03 },
  },
  {
    id:      '__stub_4',
    text:    '—',
    source:  'spine',
    strength: 1,
    primary:  false,
    _isStub:  true,
    fidelity: { m_checksum: 0.09, t_telemetry: 0.06, e_viral: 0.01 },
  },
];

export default function App() {
  const [view, setview]             = useState('funnel');
  const [query, setquery]           = useState('');
  const [activeLens, setActiveLens] = useState('10K View');
  const inputref                    = useRef(null);

  // Fire both hooks once a query exists — active in oracle and vault
  const activeQuery = view === 'oracle' || view === 'vault' ? query : null;

  const { records, loading, error } = usetruthlens(activeQuery);
  const { signals: ingestSignals }  = useingest(activeQuery);

  // KRYL-300: merge + deduplicate by id — usetruthlens records take precedence
  const mergedRecords = useMemo(() => {
    const map = new Map();
    // ingest first so truth records overwrite on collision
    [...ingestSignals, ...records].forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }, [records, ingestSignals]);

  const primaryRecord = mergedRecords[0] ?? null;

  const liveSignals = mergedRecords.length
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
    : STUB_SIGNALS;

  const signalMapData = {
    signals: liveSignals,
    loading,
  };

  const handleinitialsubmit = (q) => {
    setquery(q);
    document.body.classList.add('krylo-active');
    setview('oracle');
  };

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
        {view === 'funnel' && (
          <LookingFunnel onSubmit={handleinitialsubmit} />
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
              inputref={inputref}
            />
          </div>
        )}
        {view === 'vault' && (
          <div className="krylo-layer surfaced">
            <TenKVault
              score={primaryRecord?.signal_score ?? null}
              data={primaryRecord}
              records={mergedRecords}
            />
          </div>
        )}
      </div>
    </ecosystemcontext.Provider>
  );
}
