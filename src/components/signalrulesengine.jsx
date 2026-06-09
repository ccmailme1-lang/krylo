// WO-1030 — Signal Rules Engine
// Visual rule builder: right-rail panel for configuring precursor sequence weights.
// Tier, historicalWeight, and expectedOrder are live-editable.

import { useState } from 'react';

const DEFAULT_RULES = [
  { id: 'r-1', name: 'Catering Activity Spike',   tier: -1, historicalWeight: 0.55, expectedOrder: 1 },
  { id: 'r-2', name: 'ERP Upgrade (NetSuite)',     tier:  1, historicalWeight: 0.82, expectedOrder: 2 },
  { id: 'r-3', name: 'S-1 IPO Counsel Retained',  tier:  3, historicalWeight: 0.95, expectedOrder: 3 },
];

const TIERS = [
  { value: -1, label: '-1  Ambient Exhaust' },
  { value:  0, label: ' 0  Behavioral'      },
  { value:  1, label: ' 1  Organizational'  },
  { value:  2, label: ' 2  Financial'       },
  { value:  3, label: ' 3  Legal/Regulatory'},
];

const mono = 'IBM Plex Mono, monospace';

export default function SignalRulesEngine() {
  const [rules,   setRules]   = useState(DEFAULT_RULES);
  const [newRule, setNewRule] = useState({ name: '', tier: -1, weight: 0.5, order: 1 });

  const addRule = () => {
    if (!newRule.name.trim()) return;
    const rule = {
      id:              `r-${Date.now()}`,
      name:            newRule.name.trim(),
      tier:            newRule.tier,
      historicalWeight: Math.min(1, Math.max(0, newRule.weight)),
      expectedOrder:   newRule.order,
    };
    setRules(prev => [...prev, rule].sort((a, b) => a.expectedOrder - b.expectedOrder));
    setNewRule({ name: '', tier: -1, weight: 0.5, order: rules.length + 2 });
  };

  const strikeRule = (id) => setRules(prev => prev.filter(r => r.id !== id));

  return (
    <div style={{
      width:        '360px',
      height:       '100vh',
      background:   '#000000',
      borderLeft:   '1px solid #1A1A1A',
      padding:      '24px',
      display:      'flex',
      flexDirection:'column',
      justifyContent: 'space-between',
      fontFamily:   mono,
      color:        'rgba(232,244,255,0.85)',
      overflowY:    'auto',
    }}>

      {/* Header */}
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', color: '#66FF00', textTransform: 'uppercase' }}>
            SYSTEM // RULES ENGINE
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(232,244,255,0.25)', marginTop: '4px', letterSpacing: '0.1em' }}>
            Configure sequence weights &amp; chronological bounds
          </div>
        </div>

        {/* Rules list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
          {rules.map(rule => (
            <div key={rule.id} style={{
              background:   '#111111',
              border:       '1px solid #222222',
              borderRadius: '2px',
              padding:      '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  fontSize:    '9px',
                  fontWeight:  700,
                  background:  '#66FF00',
                  color:       '#000000',
                  padding:     '1px 6px',
                  borderRadius:'2px',
                  letterSpacing: '0.08em',
                }}>
                  T{rule.tier}
                </span>
                <span style={{ fontSize: '9px', color: 'rgba(232,244,255,0.3)', letterSpacing: '0.1em' }}>
                  STEP {rule.expectedOrder}
                </span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, margin: '4px 0', color: 'rgba(232,244,255,0.85)' }}>
                {rule.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '9px', color: 'rgba(232,244,255,0.35)', letterSpacing: '0.08em' }}>
                  WEIGHT: {rule.historicalWeight.toFixed(2)}
                </span>
                <button
                  onClick={() => strikeRule(rule.id)}
                  style={{ fontFamily: mono, fontSize: '9px', background: 'none', border: 'none', color: 'rgba(232,244,255,0.25)', cursor: 'pointer', letterSpacing: '0.1em' }}
                >
                  [STRIKE]
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inject Rule */}
      <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '24px' }}>
        <div style={{ fontSize: '9px', color: '#66FF00', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px' }}>
          // INJECT RULE DIRECTIVE
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Precursor name"
            value={newRule.name}
            onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
            style={{
              fontFamily: mono, fontSize: '11px',
              background: '#111', border: '1px solid #222',
              color: 'rgba(232,244,255,0.85)', padding: '8px',
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              {
                label: 'TIER',
                el: (
                  <select
                    value={newRule.tier}
                    onChange={e => setNewRule(r => ({ ...r, tier: Number(e.target.value) }))}
                    style={{ fontFamily: mono, fontSize: '10px', background: '#111', border: '1px solid #222', color: 'rgba(232,244,255,0.85)', padding: '6px', width: '100%' }}
                  >
                    {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                ),
              },
              {
                label: 'WEIGHT',
                el: (
                  <input
                    type="number" step="0.05" min="0" max="1"
                    value={newRule.weight}
                    onChange={e => setNewRule(r => ({ ...r, weight: Number(e.target.value) }))}
                    style={{ fontFamily: mono, fontSize: '10px', background: '#111', border: '1px solid #222', color: 'rgba(232,244,255,0.85)', padding: '6px', width: '100%', boxSizing: 'border-box' }}
                  />
                ),
              },
              {
                label: 'STEP',
                el: (
                  <input
                    type="number" min="1"
                    value={newRule.order}
                    onChange={e => setNewRule(r => ({ ...r, order: Number(e.target.value) }))}
                    style={{ fontFamily: mono, fontSize: '10px', background: '#111', border: '1px solid #222', color: 'rgba(232,244,255,0.85)', padding: '6px', width: '100%', boxSizing: 'border-box' }}
                  />
                ),
              },
            ].map(({ label, el }) => (
              <div key={label}>
                <div style={{ fontSize: '8px', color: 'rgba(232,244,255,0.25)', letterSpacing: '0.14em', marginBottom: '4px' }}>{label}</div>
                {el}
              </div>
            ))}
          </div>

          <button
            onClick={addRule}
            style={{
              fontFamily: mono, fontSize: '10px', fontWeight: 700,
              background: '#66FF00', color: '#000000',
              border: 'none', padding: '10px',
              cursor: 'pointer', letterSpacing: '0.14em',
              textTransform: 'uppercase', width: '100%',
            }}
          >
            EXECUTE DIRECTIVE
          </button>
        </div>
      </div>

    </div>
  );
}
