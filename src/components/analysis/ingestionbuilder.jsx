// WO-1316-J (revised) — IngestionBuilder: Situation-Led Intake
// WO-1384 — AI Calibration Signal
import React, { useState, useEffect, useRef } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import { useUIStore }       from '../../store/useuistore.js';
import { emitTelemetry, getTelemetryLog } from '../../engine/telemetry.js';
import { resolveHorizon, HORIZON_ORDER, HORIZON_META, DEFAULT_HORIZON } from '../../engine/temporalhorizon.js';
import { parseIntent } from '../../engine/intentparser.js';
import { LENS_PRESETS } from '../../registry/lenspresets.js';
import { SITUATIONS, LENS_DOMAIN_MAP, LENS_BROKER_DOMAIN_MAP, FLOOR_RANGES, CALIBRATION_SIGNALS, CONFIDENCE_THRESHOLD, KEY_OPS, OP_OPS } from '../../engine/ingress.js';

const MONO     = "'IBM Plex Mono', monospace";
const LIME     = '#66FF00';
const DANGER   = '#FF3300';
const INPUT_BG = '#050505';


function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

// WO-1384 — Calibration signal component
function CalibrationSignal({ lens }) {
  const signal = CALIBRATION_SIGNALS[lens];
  if (!signal || signal.confidence < CONFIDENCE_THRESHOLD) return null;

  return (
    <div style={{
      borderLeft: `2px solid ${LIME}`,
      paddingLeft: 12,
      marginBottom: 40,
      opacity: 0,
      animation: 'signal-fade-in 300ms ease forwards',
    }}>
      <style>{`
        @keyframes signal-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ fontFamily: MONO, fontSize: 6, color: LIME, letterSpacing: '0.28em', marginBottom: 6 }}>
        OBSERVATION
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, letterSpacing: '0.04em' }}>
        {signal.observation}
      </div>
    </div>
  );
}

export default function IngestionBuilder() {
  const [activeSituation, setActiveSituation] = useState(null);
  const [seedQuery,       setSeedQuery]       = useState('');
  const [selectedFloor,   setSelectedFloor]   = useState(null);
  const [horizon,         setHorizon]         = useState(DEFAULT_HORIZON);
  const [focused,         setFocused]         = useState(false);
  const [missingField,    setMissingField]    = useState(null);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);
  const [rules,           setRules]           = useState([]);
  const [signalVisible,   setSignalVisible]   = useState(false);

  const signalShownRef = useRef(false); // WO-1384 silent instrumentation

  const createSession   = useAnalysisStore(s => s.createSession);
  const pendingQuery    = useAnalysisStore(s => s.pendingQuery);
  const setPendingQuery = useAnalysisStore(s => s.setPendingQuery);
  const setSwipeIndex   = useUIStore(s => s.setSwipeIndex);

  useEffect(() => {
    if (pendingQuery) {
      setSeedQuery(pendingQuery);
      setPendingQuery(null);
    }
  }, [pendingQuery]);

  function selectSituation(sit) {
    const next = activeSituation?.lens === sit.lens ? null : sit;
    setActiveSituation(next);
    setSignalVisible(false);
    signalShownRef.current = false;
    if (next && LENS_PRESETS[next.lens]) {
      const { scaffold } = LENS_PRESETS[next.lens];
      setRules(scaffold.rules.map((r, i) => ({ ...r, id: Date.now() + i })));
    }
  }

  function handleQueryBlur() {
    setFocused(false);
    const lens = activeSituation?.lens;
    if (!seedQuery.trim() || !lens) return;
    const signal = CALIBRATION_SIGNALS[lens];
    if (!signal || signal.confidence < CONFIDENCE_THRESHOLD) return;

    setSignalVisible(true);
    if (!signalShownRef.current) {
      signalShownRef.current = true;
      emitTelemetry({ type: 'calibration_signal_surfaced', lens, confidence: signal.confidence, timestamp: Date.now() });
    }
  }

  function addRule() {
    setRules(p => [...p, { id: Date.now(), key: 'Source Entity', operator: 'contains', value: '' }]);
  }
  function removeRule(id) { setRules(p => p.filter(r => r.id !== id)); }
  function updateRule(id, field, val) {
    setRules(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  const activeLens   = activeSituation?.lens ?? null;
  const hasAnchor    = !!activeLens;
  const hasObjective = seedQuery.trim().length > 0;
  const canExecute   = hasAnchor && hasObjective;

  function hashKernelState(lens, ts) {
    const src = `${lens}:${ts}:${getTelemetryLog().length}`;
    let h = 5381;
    for (let i = 0; i < src.length; i++) h = ((h << 5) + h) ^ src.charCodeAt(i);
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function handleExecute() {
    if (!hasAnchor)    { setMissingField('BASE');   return; }
    if (!hasObjective) { setMissingField('TARGET'); return; }
    setMissingField(null);

    // WO-1384 silent instrumentation
    if (signalShownRef.current) {
      emitTelemetry({ type: 'calibration_signal_executed_after', lens: activeLens, timestamp: Date.now() });
    }

    setSignalVisible(false);
    signalShownRef.current = false;

    const ts  = Date.now();
    const id  = `session-${ts}`;

    const preset          = LENS_PRESETS[activeLens] ?? LENS_PRESETS.OPEN;
    const geometry        = preset.scaffold.geometry;
    const domains         = LENS_DOMAIN_MAP[activeLens] ?? [];
    const parsedIntent    = parseIntent(seedQuery.trim());
    const horizonResolved = resolveHorizon(horizon, 'OPERATOR');

    const tensor = {
      lens:               activeLens,
      kernel_state_hash:  hashKernelState(activeLens, ts),
      domains,
      domain:             LENS_BROKER_DOMAIN_MAP[activeLens] ?? 'GENERAL',
      intent:             parsedIntent.normalized_verb,
      parsed_intent:      parsedIntent,
      temporal_horizon:   horizonResolved,
      rules:              rules.filter(r => r.value.trim().length > 0),
      constraintStrength: geometry.constraintStrength,
      intentEntropy:      geometry.intentEntropy,
      seedQuery:          seedQuery.trim(),
      floor:              selectedFloor,
    };

    emitTelemetry({ type: 'session_open',       sessionId: id, source: 'ingestion-builder', query: seedQuery.trim(), anchor: activeLens, kernel_state_hash: tensor.kernel_state_hash, timestamp: ts });
    emitTelemetry({ type: 'ingestion_start',    sessionId: id, seedQuery: seedQuery.trim(), timestamp: ts });
    createSession(id, activeLens, seedQuery.trim(), tensor);
    emitTelemetry({ type: 'ingestion_complete', sessionId: id, tensorKeys: Object.keys(tensor), timestamp: ts });
    setSwipeIndex(1);
  }

  const attractorActive = focused || seedQuery.trim().length > 0;

  const chipSelect = {
    fontFamily: MONO, fontSize: 9, background: INPUT_BG,
    border: `1px solid rgba(255,255,255,0.07)`, padding: '4px 6px',
    color: '#ffffff', outline: 'none', cursor: 'pointer', letterSpacing: '0.08em',
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '25%', minWidth: 240, maxWidth: 360, background: '#000000', borderRight: '1px solid rgba(255,255,255,0.06)', fontFamily: MONO, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <style>{`
        @keyframes attractor-pulse {
          0%,100% { box-shadow: 0 0 8px 2px rgba(102,255,0,0.35); }
          50%      { box-shadow: 0 0 8px 2px rgba(102,255,0,0.08); }
        }
        @keyframes vector-incomplete {
          0%,100% { box-shadow: 0 0 0 1px rgba(102,255,0,0.7); }
          50%      { box-shadow: 0 0 0 1px rgba(102,255,0,0.1); }
        }
        .attractor-active  { animation: attractor-pulse   2.4s linear infinite; }
        .vector-incomplete { animation: vector-incomplete 0.9s ease-in-out infinite; }
      `}</style>

      {/* ── Scrollable body ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 24px' }}>

        {/* ── SITUATION ─────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }} className={missingField === 'BASE' ? 'vector-incomplete' : ''}>
          {missingField === 'BASE' && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.28em', marginBottom: 10, opacity: 0.8 }}>
              SELECT YOUR SITUATION TO CONTINUE
            </div>
          )}
          <SectionLabel>WHAT DESCRIBES YOUR SITUATION?</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SITUATIONS.map(sit => {
              const active = activeSituation?.lens === sit.lens;
              return (
                <button
                  key={sit.lens}
                  onClick={() => selectSituation(sit)}
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                    padding: '9px 10px',
                    background: active ? LIME : 'transparent',
                    color: active ? '#000000' : 'rgba(255,255,255,0.4)',
                    border: 'none', cursor: 'pointer',
                    transition: 'color 120ms, background 120ms',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                >
                  {active ? '✓ ' : ''}{sit.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── QUERY ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          {missingField === 'TARGET' && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: LIME, letterSpacing: '0.28em', marginBottom: 8, opacity: 0.8 }}>
              DESCRIBE YOUR SITUATION TO CONTINUE
            </div>
          )}
          <SectionLabel>WHAT ARE YOU TRYING TO FIGURE OUT?</SectionLabel>
          <textarea
            value={seedQuery}
            onChange={e => { setSeedQuery(e.target.value); if (missingField === 'TARGET') setMissingField(null); }}
            onFocus={() => setFocused(true)}
            onBlur={handleQueryBlur}
            placeholder="Describe the decision you're facing or what you want to understand..."
            className={missingField === 'TARGET' ? 'vector-incomplete' : attractorActive ? 'attractor-active' : ''}
            style={{
              width: '100%', height: 110, background: INPUT_BG,
              border: `1px solid ${attractorActive ? LIME : 'rgba(255,255,255,0.07)'}`,
              padding: '16px 18px', fontFamily: MONO, fontSize: 11,
              color: '#ffffff', outline: 'none', resize: 'none',
              boxSizing: 'border-box', lineHeight: 1.7,
              transition: 'border-color 300ms',
            }}
          />
          <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 8, color: attractorActive ? 'rgba(102,255,0,0.45)' : 'rgba(255,255,255,0.12)', letterSpacing: '0.2em', fontStyle: 'italic', transition: 'color 300ms' }}>
            {attractorActive ? '// ANALYZING...' : '// WAITING FOR INPUT...'}
          </div>
        </div>

        {/* ── WO-1384 CALIBRATION SIGNAL ────────────────────── */}
        {signalVisible && activeLens && (
          <CalibrationSignal lens={activeLens} />
        )}

        {/* ── FLOOR ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>HOW MUCH CAN YOU PUT TOWARD THIS?</SectionLabel>
          <div style={{ display: 'flex', gap: 4 }}>
            {FLOOR_RANGES.map(range => {
              const active = selectedFloor === range.value;
              return (
                <button
                  key={range.value}
                  onClick={() => setSelectedFloor(active ? null : range.value)}
                  style={{
                    flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em',
                    padding: '8px 0', border: 'none',
                    background: active ? LIME : 'transparent',
                    color: active ? '#000' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', transition: 'background 120ms, color 120ms',
                    borderBottom: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = LIME; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TEMPORAL HORIZON ──────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em' }}>
              HOW FAR OUT ARE YOU THINKING?
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}>
              {HORIZON_META[horizon].span}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {HORIZON_ORDER.map(h => (
              <button key={h} onClick={() => setHorizon(h)} style={{
                flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
                padding: '7px 0', border: 'none',
                background: horizon === h ? LIME : 'transparent',
                color: horizon === h ? '#000' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'background 120ms, color 120ms',
                borderBottom: horizon === h ? 'none' : '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => { if (horizon !== h) e.currentTarget.style.color = LIME; }}
              onMouseLeave={e => { if (horizon !== h) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                {h.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* ── ADVANCED CONSTRAINTS (collapsed) ──────────────── */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setAdvancedOpen(p => !p)}
            style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ color: LIME, fontSize: 13 }}>{advancedOpen ? '▾' : '▸'}</span>
            ADVANCED CONSTRAINTS
          </button>

          {advancedOpen && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rules.length === 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.14em', padding: '8px 0' }}>
                    NULL LATTICE — PERMEABLE
                  </div>
                )}
                {rules.map(rule => (
                  <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 8, paddingTop: 4 }}>
                    <button onClick={() => removeRule(rule.id)} style={{ fontFamily: MONO, fontSize: 9, color: DANGER, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
                      [X]
                    </button>
                    <select value={rule.key} onChange={e => updateRule(rule.id, 'key', e.target.value)} style={chipSelect}>
                      {KEY_OPS.map(o => <option key={o} style={{ background: '#000' }}>{o}</option>)}
                    </select>
                    <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} style={chipSelect}>
                      {OP_OPS.map(o => <option key={o} style={{ background: '#000' }}>{o}</option>)}
                    </select>
                    <input
                      value={rule.value}
                      onChange={e => updateRule(rule.id, 'value', e.target.value)}
                      placeholder="VALUE"
                      style={{ fontFamily: MONO, fontSize: 9, flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '4px 6px', color: '#ffffff', outline: 'none', letterSpacing: '0.1em', minWidth: 0 }}
                    />
                  </div>
                ))}
                <button onClick={addRule} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: LIME, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', padding: '8px 0', marginTop: 4 }}>
                  + ADD CONSTRAINT
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Sticky Execute ──────────────────────────────────── */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid rgba(255,255,255,0.05)`, flexShrink: 0 }}>
        {missingField && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.22em', marginBottom: 10, textAlign: 'center' }}>
            {missingField === 'BASE' ? 'SELECT YOUR SITUATION TO CONTINUE' : 'DESCRIBE YOUR SITUATION TO CONTINUE'}
          </div>
        )}
        <button
          onClick={handleExecute}
          style={{
            width: '100%', padding: '15px 0',
            border: canExecute ? 'none' : '1px solid #66FF00',
            background: canExecute ? LIME : '#000000',
            color: canExecute ? '#000000' : '#66FF00',
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background 200ms, color 200ms',
          }}
          onMouseEnter={e => { if (canExecute) e.currentTarget.style.background = '#ffffff'; }}
          onMouseLeave={e => { if (canExecute) e.currentTarget.style.background = canExecute ? LIME : 'rgba(102,255,0,0.08)'; }}
        >
          {canExecute ? 'FIND MY PLAN' : 'COMPLETE YOUR PROFILE'}
        </button>
      </div>

    </div>
  );
}
