// src/components/oracleview_v2.jsx
// WO-1362 — Leverage Oracle · Oracle Ingest + OLP Output Surface
// Left: high-fidelity domain telemetry form (WO-1359).
// Right: Validated Vector OLP card (WO-1360 Fs-gated).
// Mutable hard floor. Tufte hairline aesthetic.

import React, { useState, useMemo } from 'react';
import { evaluateFidelity, DOMAIN_FIELDS } from '../engine/fidelityscoring.js';
import { useAnalysisStore } from '../store/useanalysisstore.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const DOMAINS = ['INVESTMENTS', 'EDUCATION', 'CAR', 'HOME', 'BUSINESS', 'VACATION'];

const FIELD_LABELS = {
  INVESTMENTS: {
    yield_to_maturity:  'Yield-to-Maturity',
    volatility_alpha:   'Volatility Alpha',
    tax_drag:           'Tax-Drag Coefficient',
  },
  EDUCATION: {
    apr:                   'APR',
    grace_period_expiry:   'Grace Period Expiry',
    roi_salary_projection: 'ROI-to-Salary Projection',
  },
  CAR: {
    depreciative_velocity: 'Depreciative Velocity',
    tco:                   'Total Cost of Ownership',
    equity_floor:          'Equity Floor',
  },
  HOME: {
    debt_to_service_ratio:  'Debt-to-Service Ratio',
    market_liquidity_index: 'Market Liquidity Index',
  },
  BUSINESS: {
    cac_ltv_ratio:   'CAC / LTV Ratio',
    burn_multiple:   'Burn-Multiple',
    runway_velocity: 'Runway-to-Exit Velocity',
  },
  VACATION: {
    lifestyle_overhead:   'Lifestyle Overhead',
    payload_drain_impact: 'Payload-Drain Impact',
  },
};

const OLP_DATA = {
  INVESTMENTS: {
    action:   'REBALANCE INTO DURATION-MATCHED BONDS · YTM 5.4%',
    velocity: '+11.2% payload acceleration',
    entropy:  '-6.8% volatility drag eliminated',
    note:     'Tax-drag exceeds yield spread. Duration match locks floor.',
  },
  EDUCATION: {
    action:   'SWITCH TO INCOME-DRIVEN REPAYMENT · APR DELTA -3.2%',
    velocity: '+8.4% net cash flow acceleration',
    entropy:  '-4.1% compounding drag eliminated',
    note:     'Grace period expiry creates leverage window. Act before Q3.',
  },
  CAR: {
    action:   'SELL + LEASE-BACK · TCO DELTA -$4,200/YR',
    velocity: '+5.1% capital reallocation velocity',
    entropy:  '-9.3% depreciative drag eliminated',
    note:     'Equity floor breached. Ownership negative against TCO curve.',
  },
  HOME: {
    action:   'CASH-OUT REFI AT RATE FLOOR · DSR REDUCTION -0.08',
    velocity: '+14.7% liquidity vector unlocked',
    entropy:  '-7.2% debt-service drag eliminated',
    note:     'Market liquidity index supports exit premium. Window: 6–10W.',
  },
  BUSINESS: {
    action:   'RECEIVABLES ADVANCE · RUNWAY EXTENSION +6 MONTHS',
    velocity: '+18.3% operational runway acceleration',
    entropy:  '-12.1% burn-rate drag eliminated',
    note:     'CAC/LTV above 3x. Advance bridges to next revenue cohort.',
  },
  VACATION: {
    action:   'LIQUIDATE DISCRETIONARY · PAYLOAD DRAIN -3.1%',
    velocity: '+3.1% payload reallocation velocity',
    entropy:  '-3.1% lifestyle overhead eliminated',
    note:     'Overhead exceeds payload contribution threshold. Reallocate.',
  },
};

// ── Fidelity bar ──────────────────────────────────────────────────────────────
function FidelityBar({ fs, tier }) {
  const pct  = Math.round(fs * 100);
  const fill = tier.blocked ? 'rgba(255,255,255,0.12)' : tier.dimmed ? 'rgba(102,255,0,0.45)' : LIME;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
        textTransform: 'uppercase', marginBottom: 6,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>FIDELITY</span>
        <span style={{ color: fill }}>{pct}% · {tier.id.replace('_', ' ')}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: fill, transition: 'width 0.35s ease, background 0.35s ease',
        }} />
      </div>
      {tier.blocked && (
        <div style={{
          marginTop: 7, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
        }}>
          PROVIDE DOMAIN METADATA TO UNLOCK OLP
        </div>
      )}
    </div>
  );
}

// ── OLP output card ───────────────────────────────────────────────────────────
function OlpCard({ domain, fs, tier, envelope = null }) {
  const [active, setActive] = useState(false);
  const olp        = envelope?.olp ?? OLP_DATA[domain] ?? OLP_DATA.BUSINESS;
  const confidence = envelope?.confidence ?? Math.round(fs * 100);
  const accentColor = tier.dimmed ? 'rgba(102,255,0,0.65)' : LIME;

  return (
    <div>
      {/* Confidence metric — top right */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 20,
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>OLP IDENTIFIED</span>
        <span style={{
          color: accentColor,
          animation: tier.dimmed ? 'none' : 'krylo-pulse 2.4s ease-in-out infinite',
        }}>
          CONFIDENCE {confidence}%
        </span>
      </div>

      {/* Primary action — velocity vector */}
      <div style={{
        fontFamily: MONO, fontSize: 14, letterSpacing: '0.06em',
        color: accentColor, marginBottom: 28,
        lineHeight: 1.5, textTransform: 'uppercase',
      }}>
        {olp.action}
      </div>

      {/* Velocity vector row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0',
        marginBottom: 2,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 18, color: accentColor, lineHeight: 1,
        }}>↑</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 2 }}>
            PROJECTED VELOCITY
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>
            {olp.velocity}
          </div>
        </div>
      </div>

      {/* Entropy shield row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0',
        marginBottom: 20,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 16, color: 'rgba(255,60,60,0.7)', lineHeight: 1,
        }}>⊘</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 2 }}>
            ENTROPY MITIGATION
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>
            {olp.entropy}
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
        color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 20,
      }}>
        {olp.note}
      </div>

      {/* Arbitration scores — premium */}
      {envelope?.arbitration && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 0', marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 10,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
              ARBITRATION
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: `${LIME}55`, textTransform: 'uppercase' }}>
              PREMIUM
            </span>
          </div>
          {[
            { label: 'SIGNAL WEIGHT',   value: envelope.arbitration.signal_weight },
            { label: 'FIDELITY WEIGHT', value: envelope.arbitration.fidelity_weight },
            { label: 'CONSENSUS SCORE', value: envelope.arbitration.consensus_score },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '5px 0',
              fontFamily: MONO,
            }}>
              <span style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontSize: 11, color: accentColor }}>{(value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Activate */}
      <button
        onClick={() => setActive(a => !a)}
        style={{
          background: active ? `${LIME}14` : 'none',
          border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.18)'}`,
          color: active ? LIME : 'rgba(255,255,255,0.45)',
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em',
          textTransform: 'uppercase', padding: '9px 22px',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {active ? 'POSITION ACTIVE' : 'ACTIVATE POSITION'}
      </button>

      {active && (
        <div style={{
          marginTop: 10, fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em',
          color: 'rgba(102,255,0,0.5)', textTransform: 'uppercase',
        }}>
          VECTOR LOCKED · TRACKING AGAINST FLOOR
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function OracleViewV2({ query = '', onReturn }) {
  const envelope = useAnalysisStore(s => s.sessions[s.activeSessionId]?.tensor?.envelope ?? null);

  const [domain,     setDomain]     = useState(envelope?.domain ?? 'BUSINESS');
  const [hardFloor,  setHardFloor]  = useState(envelope?.capitalFloor ?? 100000);
  const [fields,     setFields]     = useState(envelope?.criteria ?? {});
  const [baseline,   setBaseline]   = useState({ inflow: '', outflow: '', net: '' });
  const [executed,   setExecuted]   = useState(!!envelope);

  function handleDomain(d) {
    setDomain(d);
    setFields({});
    setExecuted(false);
  }

  function handleField(key, val) {
    setFields(p => ({ ...p, [key]: val }));
    setExecuted(false);
  }

  function handleBaseline(key, val) {
    setBaseline(p => ({ ...p, [key]: val }));
    setExecuted(false);
  }

  function handleClear() {
    setFields({});
    setBaseline({ inflow: '', outflow: '', net: '' });
    setExecuted(false);
  }

  const { fs, tier } = useMemo(() => evaluateFidelity({
    domain,
    fields,
    inflow:  baseline.inflow  !== '' ? Number(baseline.inflow)  : undefined,
    outflow: baseline.outflow !== '' ? Number(baseline.outflow) : undefined,
    net:     baseline.net     !== '' ? Number(baseline.net)     : undefined,
  }), [domain, fields, baseline]);

  const canExecute   = !tier.blocked;
  const domainFields = DOMAIN_FIELDS[domain]    ?? [];
  const fieldLabels  = FIELD_LABELS[domain]     ?? {};

  const inputBase = {
    width: '100%', background: 'none', border: 'none',
    fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em',
    padding: '5px 0', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, color 0.2s',
  };

  function fieldStyle(filled) {
    return {
      ...inputBase,
      borderBottom: `1px solid ${filled ? 'rgba(102,255,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
      color: filled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
    };
  }

  function rowLabel(filled) {
    return {
      fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
      textTransform: 'uppercase', marginBottom: 4,
      color: filled ? 'rgba(102,255,0,0.65)' : 'rgba(255,255,255,0.25)',
      transition: 'color 0.2s',
    };
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000000', display: 'flex', flexDirection: 'column',
      fontFamily: MONO, overflow: 'hidden',
    }}>
      {/* pulse keyframe */}
      <style>{`@keyframes krylo-pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }`}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>
            LEVERAGE ORACLE
          </span>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(102,255,0,0.45)', textTransform: 'uppercase' }}>
            RESONANCE CORE: ENGAGED
          </span>
          <span style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
            FLOOR: ${hardFloor.toLocaleString()} MUTABLE
          </span>
        </div>
        {onReturn && (
          <button onClick={onReturn} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.18)'}
          >
            ← RETURN
          </button>
        )}
      </div>

      {/* ── Body split ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — Oracle Ingest */}
        <div style={{
          width: 340, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          overflowY: 'auto', padding: '22px 20px 36px',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 18,
          }}>
            <span style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              ORACLE INGEST
            </span>
            <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
              v1.0
            </span>
          </div>

          {/* Live fidelity */}
          <FidelityBar fs={fs} tier={tier} />

          {/* Domain selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>
              DOMAIN
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {DOMAINS.map(d => {
                const on = d === domain;
                return (
                  <button key={d} onClick={() => handleDomain(d)} style={{
                    background: 'none',
                    border: `1px solid ${on ? LIME : 'rgba(255,255,255,0.1)'}`,
                    color: on ? LIME : 'rgba(255,255,255,0.3)',
                    fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em',
                    textTransform: 'uppercase', padding: '4px 8px',
                    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                  }}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }} />

          {/* Baseline snapshot */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 12 }}>
              BASELINE SNAPSHOT
            </div>
            {[{ label: 'Inflow', key: 'inflow' }, { label: 'Outflow', key: 'outflow' }, { label: 'Net', key: 'net' }].map(({ label, key }) => {
              const filled = baseline[key] !== '';
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={rowLabel(filled)}>{label}</div>
                  <input type="number" value={baseline[key]} placeholder="—"
                    onChange={e => handleBaseline(key, e.target.value)}
                    style={fieldStyle(filled)}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '6px 0 16px' }} />

          {/* Telemetry fields */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 12 }}>
              TELEMETRY FIELDS
            </div>
            {domainFields.map(key => {
              const filled = fields[key] != null && fields[key] !== '';
              return (
                <div key={key} style={{ marginBottom: 13 }}>
                  <div style={rowLabel(filled)}>{fieldLabels[key] ?? key}</div>
                  <input value={fields[key] ?? ''} placeholder="—"
                    onChange={e => handleField(key, e.target.value)}
                    style={fieldStyle(filled)}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '6px 0 16px' }} />

          {/* Target floor */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>
              TARGET FLOOR
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>$</span>
              <input type="number" value={hardFloor}
                onChange={e => setHardFloor(Number(e.target.value))}
                style={{ ...fieldStyle(true), width: 130 }}
              />
              <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
                MUTABLE
              </span>
            </div>
          </div>

          {/* Execute */}
          <button
            onClick={() => canExecute && setExecuted(true)}
            style={{
              width: '100%', padding: '10px 0',
              background: canExecute ? `${LIME}0f` : 'none',
              border: `1px solid ${canExecute ? LIME : 'rgba(255,255,255,0.12)'}`,
              color: canExecute ? LIME : 'rgba(255,255,255,0.18)',
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em',
              textTransform: 'uppercase', marginBottom: 8,
              cursor: canExecute ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { if (canExecute) e.currentTarget.style.background = `${LIME}1e`; }}
            onMouseLeave={e => { if (canExecute) e.currentTarget.style.background = `${LIME}0f`; }}
          >
            EXECUTE OLP SEARCH
          </button>

          <button
            onClick={handleClear}
            style={{
              width: '100%', padding: '8px 0',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.22)',
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em',
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.22)'; }}
          >
            CLEAR VECTOR
          </button>
        </div>

        {/* RIGHT — Validated Vector */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '22px 32px 48px',
        }}>
          <div style={{
            fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)',
            textTransform: 'uppercase', marginBottom: 28,
            borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12,
          }}>
            THE VALIDATED VECTOR
          </div>

          {executed && !tier.blocked ? (
            <OlpCard domain={domain} fs={fs} tier={tier} envelope={envelope} />
          ) : executed && tier.blocked ? (
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', lineHeight: 1.9 }}>
              INSUFFICIENT TELEMETRY<br />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)' }}>
                PROVIDE DOMAIN METADATA TO UNLOCK OLP
              </span>
            </div>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase' }}>
              AWAITING INGEST · EXECUTE TO RESOLVE
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
