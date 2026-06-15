// WO-1753 — Middle Console: Rich Payload Parser + Autonomous Left Nav + Right Stream Panel
// Three-panel surface: Left refinement | Middle narrative canvas | Right stream (placeholder)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parsePayload } from '../../engine/consoleparser.js';

const MONO  = "'IBM Plex Mono', monospace";
const LIME  = '#66FF00';
const BLUE  = '#007FFF';
const DIM   = 'rgba(255,255,255,0.22)';
const MID   = 'rgba(255,255,255,0.50)';
const BRT   = 'rgba(255,255,255,0.88)';
const PANEL = 'rgba(255,255,255,0.03)';
const BDR   = 'rgba(255,255,255,0.07)';
const LIME_DIM = 'rgba(102,255,0,0.18)';

const REGIME_COPY = {
  EXECUTION_MIX:   'EXECUTION MIX',
  RISK_SCREEN:     'RISK SCREEN',
  VELOCITY_SCAN:   'VELOCITY SCAN',
  DISCOVERY_MODE:  'DISCOVERY MODE',
  ANALYTICAL_MODE: 'ANALYTICAL MODE',
};

const PLACEHOLDER = `Describe your signal target in natural language.

Examples:
  "Actively evaluating infrastructure nodes across the Pacific rim. Focus is strictly sovereign wealth backed investments exhibiting low regulatory friction, but we need high attention momentum over the last 48 hours to justify capital call..."

  "Looking for early-stage AI infrastructure plays where TECHNOLOGY + CAPITAL are converging, specifically companies with sub-$500M valuation and no institutional coverage yet..."`;

// ── Weight Bar ────────────────────────────────────────────────────────────────

function WeightBar({ label, value, color = LIME }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.2em' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 7, color, letterSpacing: '0.1em' }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
        <div style={{
          height: '100%', borderRadius: 1,
          background: color,
          width: `${Math.round(value * 100)}%`,
          transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
    </div>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, suggested, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', marginRight: 5, marginBottom: 5,
        border: `1px solid ${active ? 'rgba(102,255,0,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 999,
        background: active ? 'rgba(102,255,0,0.06)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 250ms ease',
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 6, color: active ? LIME : DIM, letterSpacing: '0.12em' }}>
        {suggested ? '+ ' : active ? '[x] ' : ''}{label}
      </span>
    </div>
  );
}

// ── Vector Row (Right Panel) ──────────────────────────────────────────────────

function VectorRow({ label, value, active }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: `1px solid ${BDR}`,
      opacity: active ? 1 : 0.3,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: active ? BRT : DIM, letterSpacing: '0.06em' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MiddleConsole({ onReturn }) {
  const [text, setText]           = useState('');
  const [parsed, setParsed]       = useState(null);
  const [chipState, setChipState] = useState({}); // overrides for auto-chips
  const debounceRef               = useRef(null);
  const textareaRef               = useRef(null);

  // Auto-focus on mount
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const result = parsePayload(val);
      setParsed(result);
      // Reset chip overrides when payload changes significantly
      setChipState({});
    }, 280);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const weights = parsed?.weights ?? { ws: 0.33, wv: 0.33, wc: 0.34 };
  const chips   = parsed?.chips   ?? [];
  const suggested = parsed?.suggested ?? [];
  const regime  = parsed?.regime  ?? null;
  const vectors = parsed?.vectors ?? {};
  const wordCount = parsed?.wordCount ?? 0;

  const toggleChip = (key) => {
    setChipState(s => ({ ...s, [key]: !(s[key] ?? true) }));
  };

  const allChips = [
    ...chips.map(c => ({ ...c, active: chipState[c.key] ?? true, suggested: false })),
    ...suggested.map(c => ({ ...c, active: chipState[c.key] ?? false, suggested: true })),
  ];

  const hasContent = text.trim().length > 10;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes mc-blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        .mc-textarea::placeholder { color: rgba(255,255,255,0.12); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
        .mc-textarea:focus { outline: none; }
        .mc-textarea { caret-color: #66FF00; }
      `}</style>

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, height: 38,
        borderBottom: `1px solid ${BDR}`,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        gap: 16,
      }}>
        <span style={{ color: LIME, fontSize: 7, animation: 'mc-blink 1.4s ease-in-out infinite' }}>●</span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.28em' }}>MIDDLE CONSOLE</span>
        {regime && (
          <span style={{ fontFamily: MONO, fontSize: 7, color: LIME, letterSpacing: '0.18em' }}>
            · {REGIME_COPY[regime] ?? regime}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {wordCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.14em' }}>
            {wordCount} WORDS
          </span>
        )}
        {onReturn && (
          <button
            onClick={onReturn}
            style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.2em', color: DIM, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            ← RETURN
          </button>
        )}
      </div>

      {/* ── Three-panel body ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT: Autonomous Refinement ───────────────────────────────────── */}
        <div style={{
          width: 228, flexShrink: 0,
          borderRight: `1px solid ${BDR}`,
          background: PANEL,
          display: 'flex', flexDirection: 'column',
          padding: '14px 14px',
          overflowY: 'auto',
        }}>
          {/* Regime autopilot */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.24em', marginBottom: 6 }}>
              REGIME AUTOPILOT
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 8,
              color: hasContent ? LIME : DIM,
              letterSpacing: '0.14em',
              padding: '4px 8px',
              border: `1px solid ${hasContent ? LIME_DIM : BDR}`,
              background: hasContent ? 'rgba(102,255,0,0.04)' : 'transparent',
              transition: 'all 350ms ease',
            }}>
              {hasContent ? (REGIME_COPY[regime] ?? 'ANALYZING…') : 'AWAITING PAYLOAD'}
            </div>
          </div>

          {/* Auto-selected chips */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.24em', marginBottom: 8 }}>
              AUTONOMOUS CHIPS
            </div>
            {allChips.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.1em', opacity: 0.4 }}>
                Type to activate…
              </div>
            ) : (
              <div>
                {allChips.map(c => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    active={c.active}
                    suggested={c.suggested}
                    onToggle={() => toggleChip(c.key)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Compression weights */}
          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${BDR}` }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.24em', marginBottom: 10 }}>
              COMPRESSION WEIGHTS
            </div>
            <WeightBar label="ws  SIGNAL"    value={weights.ws} color={LIME} />
            <WeightBar label="wv  VIRALITY"  value={weights.wv} color={weights.wv < 0.15 ? 'rgba(255,255,255,0.3)' : BLUE} />
            <WeightBar label="wc  CONFIDENCE" value={weights.wc} color={LIME} />
          </div>
        </div>

        {/* CENTER: Narrative Canvas ────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 0' }}>
          <div style={{
            flexShrink: 0, padding: '10px 20px 8px',
            borderBottom: `1px solid ${BDR}`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.28em' }}>
              NARRATIVE PAYLOAD  ·  SIGNAL / VIRALITY / CONFIDENCE
            </span>
          </div>
          <textarea
            ref={textareaRef}
            className="mc-textarea"
            value={text}
            onChange={handleChange}
            placeholder={PLACEHOLDER}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              resize: 'none',
              fontFamily: MONO,
              fontSize: 11,
              lineHeight: 1.85,
              color: BRT,
              letterSpacing: '0.02em',
              padding: '20px 24px',
              boxSizing: 'border-box',
            }}
          />
          {/* Character / parse status */}
          <div style={{
            flexShrink: 0, padding: '6px 20px',
            borderTop: `1px solid ${BDR}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.16em' }}>
              {text.length} CHARS
            </span>
            {hasContent && vectors.signal?.count > 0 && (
              <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(102,255,0,0.5)', letterSpacing: '0.14em' }}>
                {vectors.signal.count} ENTITIES EXTRACTED
              </span>
            )}
            {hasContent && vectors.virality && (
              <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(0,127,255,0.6)', letterSpacing: '0.14em' }}>
                · {vectors.virality.label}
              </span>
            )}
            {hasContent && vectors.certainty && (
              <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.14em' }}>
                · {vectors.certainty.qualifiers[0]}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Stream Panel (Panel 3 — content as-is for now) ────────────── */}
        <div style={{
          width: 240, flexShrink: 0,
          borderLeft: `1px solid ${BDR}`,
          background: PANEL,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            flexShrink: 0, padding: '10px 14px 8px',
            borderBottom: `1px solid ${BDR}`,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.28em' }}>STREAM PANEL</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            <VectorRow
              label="EVIDENCE TARGET"
              value={vectors.signal?.entities.join(' · ') || null}
              active={!!vectors.signal}
            />
            <VectorRow
              label="VELOCITY PULSE"
              value={vectors.virality ? `${vectors.virality.label}  ·  wv ${Math.round(weights.wv * 100)}%` : null}
              active={!!vectors.virality}
            />
            <VectorRow
              label="CERTAINTY THRESHOLD"
              value={vectors.certainty ? `${vectors.certainty.qualifiers.join(' · ')}  ·  wc ${Math.round(weights.wc * 100)}%` : null}
              active={!!vectors.certainty}
            />
            <VectorRow
              label="PRIMARY DOMAINS"
              value={vectors.signal?.domains.join(' · ') || null}
              active={!!vectors.signal?.domains?.length}
            />

            {/* Stream placeholder — Signal Map integration deferred */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em', marginBottom: 8 }}>
                COLLAPSED INDEX
              </div>
              <div style={{
                padding: '24px 12px',
                border: `1px solid ${BDR}`,
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.18em', lineHeight: 2 }}>
                  {hasContent ? 'STREAM READY' : 'AWAITING PAYLOAD'}
                </div>
                {hasContent && (
                  <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.1em', marginTop: 4 }}>
                    Signal Map integration deferred
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
