// relationshipchangeblock.jsx -- KRYL-1386. Renders the source-dated relationship change for the resolved subject, or the stated
// absence when it is running, failed or unavailable. Reads relationshipchangeservice.js (in memory) and re-renders on its event.
import { useEffect, useState } from 'react';
import { getRelationshipChange } from '../../engine/relationshipchangeservice.js';
import { describeChange, describeRetrievalBasis, orderRelationships } from '../../engine/relationshipchangetext.js';

const MONO = "'IBM Plex Mono', monospace";

export function useRelationshipChange(canonicalId) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!canonicalId) return;
    const on = (e) => { if (e.detail?.canonicalId === canonicalId) tick(n => n + 1); };
    window.addEventListener('krylo-change-updated', on);
    return () => window.removeEventListener('krylo-change-updated', on);
  }, [canonicalId]);
  return canonicalId ? getRelationshipChange(canonicalId) : null;
}

// The line that replaces the old "not yet computed" statement for a resolved subject.
export function temporalStatement(entry) {
  if (!entry) return null;
  if (entry.state === 'running') return 'Temporal change: comparing two 12-month periods of SEC ownership filings — checking.';
  if (entry.state === 'failed') return `Temporal change could not be computed (${entry.error}). That is not evidence that nothing changed.`;
  const cov = entry.result?.coverage;
  if (entry.state === 'done' && cov && !cov.complete) return `Temporal change computed from incomplete retrieval (${(cov.reasons ?? []).join('; ') || 'some SEC requests were not obtained'}); affected classifications are INDETERMINATE.`;
  return null;
}

export default function RelationshipChangeBlock({ entry, ABSENCE, LBL, BRT }) {
  if (!entry || entry.state !== 'done' || !entry.result) return null;
  const { relationships, periods } = entry.result;
  if (!relationships.length) return (
    <span style={{ color: ABSENCE }}>No ownership filing for this subject is held as of {periods.E0} or dated in {periods.P1.from} to {periods.P1.to}, so there is nothing to compare.</span>
  );
  const shown = orderRelationships(relationships).slice(0, 10);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: LBL, fontFamily: MONO }}>
        SOURCE-DATED, TWO 12-MONTH PERIODS · PRIOR {periods.P0.from} TO {periods.P0.to} · CURRENT {periods.P1.from} TO {periods.P1.to} (event dates, not retrieval dates)
      </div>
      {shown.map((r, i) => {
        const d = describeChange(r);
        return (
          <div key={`${r.unit}-${i}`}>
            <div style={{ color: BRT }}>{d.headline}</div>
            {d.lines.map((l, k) => <div key={k} style={{ marginLeft: 14, fontSize: 11 }}>{l}</div>)}
            {d.evidence.map((l, k) => <div key={`e${k}`} style={{ marginLeft: 14, fontSize: 10, color: ABSENCE }}>{l}</div>)}
            {describeRetrievalBasis(entry.retrieval, r).map((l, k) => <div key={`rb${k}`} style={{ marginLeft: 14, fontSize: 10, color: ABSENCE }}>{l}</div>)}
            <div style={{ marginLeft: 14, fontSize: 10, color: ABSENCE }}>rule: {d.rules.join(', ')}</div>
          </div>
        );
      })}
      {relationships.length > shown.length && <div style={{ color: ABSENCE, fontSize: 11 }}>{relationships.length - shown.length} further relationship(s) not shown.</div>}
      <div style={{ color: ABSENCE, fontSize: 10 }}>These are evidenced changes in reported filings. They do not establish why a position changed.</div>
    </div>
  );
}
