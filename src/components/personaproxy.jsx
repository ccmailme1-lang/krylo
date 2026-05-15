// src/components/personaproxy.jsx
// WO-813: Persona Proxy Input Surface
// WO-816: SOVEREIGN_SYNC dispatch + mesh transparency

import React, { useState, useMemo } from 'react';
import { FEATURES } from '../config/features.js';

// ── Taxonomy ───────────────────────────────────────────────────────────────────

const PROXIES = [
  { key: 'PROXY_EARLY_DEBT',    label: 'Early Career / High Debt', savingsRate: 200 },
  { key: 'PROXY_SAVING_HOME',   label: 'Saving for a Home',        savingsRate: 800 },
  { key: 'PROXY_FAMILY_GROWTH', label: 'Growing Family',           savingsRate: 600 },
  { key: 'PROXY_VARIABLE',      label: 'Variable Income',          savingsRate: 300 },
  { key: 'PROXY_CAREER_SWITCH', label: 'Career Change',            savingsRate: 400 },
];

const LOCATION_OPTS = ['Urban', 'Suburban', 'Rural'];

const GOALS = [
  { key: 'HOME',     label: 'Home Ownership', cost: 60000 },
  { key: 'DEBT',     label: 'Debt Reduction',  cost: 25000 },
  { key: 'FUND',     label: 'Emergency Fund',  cost: 10000 },
  { key: 'CAREER',   label: 'Career Shift',    cost: 8000  },
  { key: 'RELOCATE', label: 'Relocation',      cost: 15000 },
  { key: 'FAMILY',   label: 'Family Start',    cost: 20000 },
  { key: 'SKILLS',   label: 'Skill Upgrade',   cost: 5000  },
];

// ── Baseline tables ────────────────────────────────────────────────────────────

const RD_TABLE = {
  PROXY_EARLY_DEBT:    { Urban: 284, Suburban: 195, Rural: 120, default: 220 },
  PROXY_SAVING_HOME:   { Urban: 310, Suburban: 210, Rural: 140, default: 240 },
  PROXY_FAMILY_GROWTH: { Urban: 420, Suburban: 290, Rural: 180, default: 310 },
  PROXY_VARIABLE:      { Urban: 340, Suburban: 230, Rural: 155, default: 260 },
  PROXY_CAREER_SWITCH: { Urban: 295, Suburban: 200, Rural: 130, default: 215 },
};

const CR_BASE = {
  PROXY_EARLY_DEBT:    48,
  PROXY_SAVING_HOME:   61,
  PROXY_FAMILY_GROWTH: 72,
  PROXY_VARIABLE:      42,
  PROXY_CAREER_SWITCH: 55,
};

const GOAL_DIVERGENCE = {
  HOME: -12, DEBT: -6, FUND: -3, CAREER: -8,
  RELOCATE: -10, FAMILY: -9, SKILLS: -4,
};

// ── Metric calculations ────────────────────────────────────────────────────────

function calcVm(proxyKey, goalKey, sovereign) {
  const proxy = PROXIES.find(p => p.key === proxyKey);
  const goal  = GOALS.find(g => g.key === goalKey);
  if (!proxy || !goal) return null;
  const adjustedCost = goal.cost * (sovereign ? 1.032 * 1.15 : 1.032);
  return Math.ceil(adjustedCost / proxy.savingsRate);
}

function calcRD(proxyKey, location, sovereign) {
  const table = RD_TABLE[proxyKey];
  if (!table) return null;
  const base = location ? (table[location] ?? table.default) : table.default;
  return sovereign ? Math.round(base * 1.35) : base;
}

function calcCR(proxyKey, goalKey, sovereign) {
  const base  = CR_BASE[proxyKey] ?? 60;
  const delta = sovereign ? (GOAL_DIVERGENCE[goalKey] ?? -5) : 0;
  return Math.max(0, Math.min(100, base + delta));
}

function getSummaryLine(goalKey, vm, sovereign) {
  const goal = GOALS.find(g => g.key === goalKey);
  if (!goal || vm === null) return null;
  if (sovereign) {
    const extra = Math.round(vm * 0.15);
    return `Macro drift is adding ${extra} months to your ${goal.label.toLowerCase()} timeline.`;
  }
  return `At current trajectory, ${goal.label.toLowerCase()} closes in ${vm} months.`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const LIME  = '#66FF00';
const AMBER = '#007FFF';

const chip = (selected, sovereign) => ({
  padding: '8px 14px',
  border: `1px solid ${selected ? (sovereign ? AMBER : LIME) : 'rgba(255,255,255,0.12)'}`,
  background: selected
    ? (sovereign ? 'rgba(255,184,0,0.06)' : 'rgba(102,255,0,0.05)')
    : 'transparent',
  color: selected
    ? (sovereign ? AMBER : LIME)
    : 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  letterSpacing: '0.06em',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'border-color 0.12s, color 0.12s',
});

const metricValue = (sovereign) => ({
  fontSize: '17px',
  letterSpacing: '0.02em',
  color: sovereign ? AMBER : '#e0e0dc',
  fontWeight: 400,
});

// ── Component ──────────────────────────────────────────────────────────────────

export default function PersonaProxy({ onReturn, proxyPreset = null }) {
  const [proxy,     setProxy]     = useState(proxyPreset);
  const [location,  setLocation]  = useState(null);
  const [goal,      setGoal]      = useState(null);
  const [sovereign, setSovereign] = useState(false);

  const vm      = useMemo(() => calcVm(proxy, goal, sovereign),      [proxy, goal, sovereign]);
  const rd      = useMemo(() => calcRD(proxy, location, sovereign),  [proxy, location, sovereign]);
  const cr      = useMemo(() => calcCR(proxy, goal, sovereign),      [proxy, goal, sovereign]);
  const summary = useMemo(() => getSummaryLine(goal, vm, sovereign), [goal, vm, sovereign]);

  const showGoals = proxy !== null;
  const showCard  = proxy !== null && goal !== null;

  const accent = sovereign ? AMBER : LIME;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: showCard && FEATURES.SOVEREIGN_DRIFT ? 'rgba(0,0,0,0.78)' : '#000000',
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#e0e0dc',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 24px 80px',
      zIndex: 10,
    }}>
      <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '40px' }}>

        {/* Return */}
        <button
          onClick={onReturn}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)', fontFamily: 'inherit', alignSelf: 'flex-start',
          }}
        >
          ← Back to Search
        </button>

        {/* Proxy selection */}
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Who are you modeling?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PROXIES.map(p => (
              <div
                key={p.key}
                style={chip(proxy === p.key, sovereign)}
                onClick={() => { setProxy(p.key); setGoal(null); }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Location Context */}
        {showGoals && (
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Location Context <span style={{ color: 'rgba(255,255,255,0.15)' }}>— optional</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {LOCATION_OPTS.map(loc => (
                <div
                  key={loc}
                  style={chip(location === loc, sovereign)}
                  onClick={() => setLocation(location === loc ? null : loc)}
                >
                  {loc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal selection */}
        {showGoals && (
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '12px' }}>
              What are you moving toward?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {GOALS.map(g => (
                <div
                  key={g.key}
                  style={chip(goal === g.key, sovereign)}
                  onClick={() => setGoal(g.key)}
                >
                  {g.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ghost Node zone */}
        {showCard && (
          <div style={{
            border: `1px dashed ${sovereign ? 'rgba(255,184,0,0.2)' : 'rgba(102,255,0,0.15)'}`,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'transparent',
              border: `1px solid ${accent}`,
              boxShadow: `0 0 6px ${sovereign ? 'rgba(255,184,0,0.35)' : 'rgba(102,255,0,0.25)'}`,
              flexShrink: 0,
            }} />
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: `${accent}99`, textTransform: 'uppercase' }}>
              {GOALS.find(g => g.key === goal)?.label} / Ghost Node
            </div>
          </div>
        )}

        {/* Output card */}
        {showCard && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${sovereign ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.07)'}`,
            padding: '28px',
          }}>

            {/* Headline / Hidden Drag toggle */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '24px', justifyContent: 'flex-end' }}
              onClick={() => {
                const next = !sovereign;
                setSovereign(next);
                // WO-816: Bypass React render cycle — signal directly to mesh
                if (FEATURES.SOVEREIGN_DRIFT) {
                  const headlineRd = proxy ? calcRD(proxy, location, false) : 0;
                  const driftMagnitude = next ? (headlineRd * 0.35) / 100 : 0;
                  window.dispatchEvent(new CustomEvent('SOVEREIGN_SYNC', {
                    detail: { active: next, driftMagnitude },
                  }));
                }
              }}
            >
              <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: !sovereign ? LIME : 'rgba(255,255,255,0.25)', transition: 'color 0.12s' }}>
                Headline
              </span>
              <div style={{
                width: '34px', height: '16px',
                background: sovereign ? 'rgba(255,184,0,0.15)' : 'rgba(102,255,0,0.08)',
                border: `1px solid ${sovereign ? 'rgba(255,184,0,0.4)' : 'rgba(102,255,0,0.25)'}`,
                borderRadius: '8px',
                position: 'relative',
                transition: 'background 0.12s, border-color 0.12s',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: sovereign ? '16px' : '2px',
                  width: '10px', height: '10px',
                  borderRadius: '50%',
                  background: sovereign ? AMBER : 'rgba(102,255,0,0.7)',
                  transition: 'left 0.12s, background 0.12s',
                }} />
              </div>
              <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: sovereign ? AMBER : 'rgba(255,255,255,0.25)', transition: 'color 0.12s' }}>
                Hidden Drag
              </span>
            </div>

            {/* Metrics */}
            {[
              { label: 'Milestone Velocity', value: vm !== null ? `${vm} months` : '—' },
              { label: 'Resource Drain',     value: rd !== null ? `$${rd} / mo`  : '—' },
              { label: 'Coherence Rating',   value: cr !== null ? `${cr} / 100`  : '—' },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <span style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                  {label}
                </span>
                <span style={metricValue(sovereign)}>{value}</span>
              </div>
            ))}

            {/* Summary line */}
            {summary && (
              <div style={{
                marginTop: '18px',
                fontSize: '11px',
                lineHeight: '1.65',
                color: sovereign ? 'rgba(255,184,0,0.6)' : 'rgba(255,255,255,0.38)',
                fontStyle: 'italic',
              }}>
                {summary}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
