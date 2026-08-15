// src/renderers/partialAnswerTemplates.jsx — passive renderer for DIC PARTIAL_SATISFIED /
// INSUFFICIENT_INPUT states. Renders only: displays BenchmarkArtifacts, deterministic
// derivations, and missing inputs that already exist. Never retrieves, never calculates, never
// infers. That work happened upstream in homePurchaseEvidence.js.

import React, { useState } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const LIME  = '#66FF00';
const DIM   = 'rgba(255,255,255,0.35)';
const FAINT = 'rgba(255,255,255,0.2)';
const BRT   = 'rgba(255,255,255,0.85)';

function Row({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, color: BRT }}>{value}</span>
      {sub && <span style={{ fontFamily: MONO, fontSize: 8, color: FAINT }}>{sub}</span>}
    </div>
  );
}

/**
 * PartialAnswer — renders the result of resolveHomePurchaseEvidence(). Passive: this component
 * performs no retrieval, no math, no inference. Everything shown is already in `evidence`.
 */
export function PartialAnswer({ evidence, dic }) {
  if (!evidence) return null;
  const { mode, grounded, derived, missingOptionalOrGroundable } = evidence;

  const realGrounded = grounded.filter(g => g.chosen !== 'withheld');
  const realDerived = derived.filter(d => d.status === 'SUCCESS');

  return (
    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: mode === 'PARTIAL_SATISFIED' ? LIME : DIM, textTransform: 'uppercase' }}>
        {mode === 'PARTIAL_SATISFIED' ? 'Partial Evidence Returned' : 'Insufficient Input'}
      </div>

      {realGrounded.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, marginBottom: 4, textTransform: 'uppercase' }}>Observed Evidence</div>
          {realGrounded.map(g => {
            const field = dic.groundable.find(f => f.key === g.key);
            return (
              <Row key={g.key} label={field?.label ?? g.key}
                   value={g.value}
                   sub={g.artifact ? `${g.artifact.source} · ${g.artifact.source_date} · g_e ${g.artifact.g_e.toFixed(2)}` : null} />
            );
          })}
        </div>
      )}

      {realDerived.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, marginBottom: 4, textTransform: 'uppercase' }}>Deterministic Derivations</div>
          {realDerived.map(d => (
            <Row key={d.key} label={d.label} value={typeof d.value === 'number' ? d.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : d.value}
                 sub={d.formulaId} />
          ))}
        </div>
      )}

      {missingOptionalOrGroundable.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: DIM, marginBottom: 4, textTransform: 'uppercase' }}>Missing Inputs</div>
          {missingOptionalOrGroundable.map(f => (
            <div key={f.key} style={{ fontFamily: MONO, fontSize: 10, color: FAINT, padding: '3px 0' }}>{f.label}</div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: MONO, fontSize: 7.5, color: FAINT, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        These are historical observations, not forecasts (§11a). Absent variables are listed rather than imputed (§22).
      </div>
    </div>
  );
}

/**
 * InsufficientInput — required fields still missing, before any evidence retrieval was even
 * attempted. Distinct component from PartialAnswer's INSUFFICIENT_INPUT-after-evidence case, so
 * the "we haven't even tried yet" state and the "we tried, still not enough" state read
 * differently to the user.
 *
 * KRYL-1175: was read-only (labels only, no way to actually supply the missing values — the DIC
 * loop dead-ended here). Now collects them. Local state only, exactly the fields the DIC already
 * declares as required (no invented field names, no duplicated contract) — nothing is written to
 * the canonical session until submit.
 */
export function InsufficientInput({ missingRequiredInputs, dic, onSubmit }) {
  const [values, setValues] = useState({});
  const allFilled = missingRequiredInputs.every(f => (values[f.key] ?? '').toString().trim().length > 0);

  function handleChange(key, raw) {
    setValues(v => ({ ...v, [key]: raw }));
  }

  function handleSubmit() {
    if (!allFilled || !onSubmit) return;
    // Numeric units get parsed to numbers (formulaRegistry/resolveHomePurchaseEvidence expect
    // numbers for USD/years fields); non-numeric units (e.g. 'geo') pass through as entered.
    const parsed = {};
    for (const f of missingRequiredInputs) {
      const raw = values[f.key];
      parsed[f.key] = (f.units === 'USD' || f.units === 'years' || f.units === 'pct')
        ? parseFloat(raw)
        : raw;
    }
    onSubmit(parsed);
  }

  return (
    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: DIM, textTransform: 'uppercase' }}>
        {dic.decisionType} · Insufficient Input
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: FAINT }}>
        Add the following to get a real, evidence-based partial answer:
      </div>
      {missingRequiredInputs.map(f => (
        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '3px 0' }}>
          <label style={{ fontFamily: MONO, fontSize: 10, color: BRT }}>
            {f.label} {f.units ? <span style={{ color: FAINT }}>({f.units})</span> : null}
          </label>
          <input
            type="text"
            value={values[f.key] ?? ''}
            onChange={e => handleChange(f.key, e.target.value)}
            style={{
              fontFamily: MONO, fontSize: 11, color: BRT, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)', padding: '6px 8px', outline: 'none',
            }}
          />
        </div>
      ))}
      <button
        type="button"
        disabled={!allFilled}
        onClick={handleSubmit}
        style={{
          marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: allFilled ? '#000' : FAINT, background: allFilled ? LIME : 'rgba(255,255,255,0.04)',
          border: '1px solid ' + (allFilled ? LIME : 'rgba(255,255,255,0.12)'),
          padding: '8px 14px', cursor: allFilled ? 'pointer' : 'not-allowed', alignSelf: 'flex-start',
        }}
      >
        Submit
      </button>
    </div>
  );
}
