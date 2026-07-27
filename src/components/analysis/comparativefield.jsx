// comparativefield.jsx — Comparative Analysis Surface (WO-DRAFT-comparative-diff-command)
//
// Renders the output of crediff.runPairwiseDiff(). Mounted by intelligencebrief.jsx when
// synthesis.mode === 'COMPARATIVE'. No composite score, no ranking, no "winner" language
// (§18, §11a) — per-domain rows only, each GROUNDED or STRUCTURAL_ABSENCE (§22).

import React from 'react';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.25)';
const TEXT = 'rgba(255,255,255,0.85)';
const HAIRLINE = '1px solid rgba(255,255,255,0.08)';

function DomainRow({ row }) {
  if (row.state === 'STRUCTURAL_ABSENCE') {
    const label = row.absentSide === 'BOTH' ? 'neither entity'
                : row.absentSide === 'A' ? 'the first entity'
                : 'the second entity';
    return (
      <div style={{ padding: '14px 0', borderBottom: HAIRLINE }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color: TEXT, textTransform: 'uppercase' }}>
          {row.domain}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, marginTop: 4 }}>
          Insufficient evidence — no comparable grounded signal found for {label}.
        </div>
      </div>
    );
  }

  const edgeLabel = row.edge === 'A' ? 'Entity A holds the structural edge'
                  : row.edge === 'B' ? 'Entity B holds the structural edge'
                  : 'No structural edge detected — parity';

  return (
    <div style={{ padding: '14px 0', borderBottom: HAIRLINE }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color: TEXT, textTransform: 'uppercase' }}>
          {row.domain}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: row.edge === 'PARITY' ? DIM : LIME }}>
          {row.dominant_axis ? `axis: ${row.dominant_axis}` : ''}
        </span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: TEXT, marginTop: 4 }}>
        {edgeLabel}
        {row.incomparable ? ' — structural gap flagged as its own signal' : ''}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, marginTop: 3 }}>
        leverage margin {row.leverage_margin} · shared space {row.shared_space}
      </div>
    </div>
  );
}

export default function ComparativeField({ diff }) {
  if (!diff) {
    return (
      <div style={{ padding: 24, fontFamily: MONO, fontSize: 10, color: DIM }}>
        No comparison available.
      </div>
    );
  }

  if (!diff.resolved) {
    const reasonCopy = {
      BOTH_UNRESOLVED:   'Neither entity could be resolved against the identity registry.',
      ENTITY_A_UNRESOLVED: 'The first entity could not be resolved against the identity registry.',
      ENTITY_B_UNRESOLVED: 'The second entity could not be resolved against the identity registry.',
    };
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: TEXT, textTransform: 'uppercase' }}>
          {diff.entityA} ↔ {diff.entityB}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, marginTop: 8 }}>
          {reasonCopy[diff.reason] ?? 'Comparison could not be resolved.'}
        </div>
      </div>
    );
  }

  const groundedCount = diff.rows.filter(r => r.state === 'GROUNDED').length;
  const absentCount   = diff.rows.length - groundedCount;

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: '1px solid rgba(102,255,0,0.18)' }}>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em', color: TEXT, textTransform: 'uppercase' }}>
          {diff.entityA} <span style={{ color: LIME }}>↔</span> {diff.entityB}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: DIM, marginTop: 4, textTransform: 'uppercase' }}>
          Comparative Structural Analysis
        </div>
        <div style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, marginTop: 6 }}>
          {diff.rows.length} domains touched · {groundedCount} grounded · {absentCount} insufficient evidence
        </div>
      </div>

      {/* Domain difference stream — uncollapsed, no composite score (§18, §21) */}
      <div style={{ marginTop: 4 }}>
        {diff.rows.length === 0 ? (
          <div style={{ padding: '14px 0', fontFamily: MONO, fontSize: 9, color: DIM }}>
            No domain overlap found between these entities' known evidence.
          </div>
        ) : (
          diff.rows.map(row => <DomainRow key={row.domain} row={row} />)
        )}
      </div>
    </div>
  );
}
