// frameanchoring.jsx — KRYL-1236, stage 1.
//
// A READ surface. When the query does not resolve to a subject ENTITY, it shows the
// analytical-object class the engine recognised (DECISION_FRAME / PORTFOLIO_FRAME /
// MARKET_THEME), the evidence the engine already extracted, and the class-native
// anchor checklist — the specific inputs that would make the frame resolvable.
//
// It replaces the generic "REFINE YOUR QUERY" remediation with something native to
// the object the user actually supplied. It has NO input fields, NO verdict, NO
// score. Anchors establish the object and scope of observation — never a conclusion
// input (SPEC-frame-anchoring.md CONTRACT).

import React, { useMemo } from 'react';
import { classifyFrame, frameHeadline } from '../../engine/frameclassify.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const RULE = '#191d1e';
const LBL  = '#5d6462';
const DIM  = '#4f5654';
const VAL  = '#eceee9';
const BODY = '#b6bcb7';

const CLASS_COPY = {
  DECISION_FRAME:
    'A decision was recognised, but no subject. The anchors below are what would bind it to one — supplying them scopes observation, it does not produce a verdict.',
  PORTFOLIO_FRAME:
    'A fund / portfolio-level mandate — no single subject by design. The anchors below scope the observation to the mandate.',
  MARKET_THEME:
    'A market / sector / theme — no decision and no single subject. The anchors below scope the observation to the theme.',
};

function AnchorRow({ a }) {
  const filled = a.value != null && a.value !== '';
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${RULE}` }}>
      <span style={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', color: filled ? LIME : LBL,
        flexShrink: 0, minWidth: 168, textTransform: 'uppercase',
      }}>{a.label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.5, color: filled ? VAL : DIM }}>
        {filled ? String(a.value) : `— ${a.hint ? `(${a.hint})` : ''}`}
      </span>
    </div>
  );
}

export default function FrameAnchoring({ queryContext, query, subjectKind }) {
  // classifyFrame is not cheap (regex scans + resolve() per name clue) — memoize per
  // query so it doesn't run on every packet re-render. Hook must be unconditional.
  const result = useMemo(
    () => (subjectKind === 'ENTITY' ? null : classifyFrame(queryContext ?? query ?? '')),
    [subjectKind, queryContext, query],
  );

  // Only for a non-ENTITY subject — an ENTITY has its own resolved packet.
  if (subjectKind === 'ENTITY') return null;
  if (!result || result.class === 'NO_FRAME') return null;

  const sr = result.subjectResolution;
  const headline = frameHeadline(result);
  const clues = result.evidence?.candidateClues ?? {};

  return (
    <section style={{ padding: '26px 0 0' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: LBL }}>FRAME ANCHORING</div>

      {headline && (
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 13, letterSpacing: '0.06em', color: VAL, textTransform: 'uppercase' }}>
          {headline}
        </div>
      )}

      <p style={{ margin: '8px 0 0', maxWidth: 780, fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: BODY }}>
        {CLASS_COPY[result.class]}
      </p>

      {/* candidate resolution — clues propose a subject, never establish one */}
      {sr && sr.state !== 'NONE' && (
        <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: BODY }}>
          <span style={{ color: LIME }}>{sr.state === 'RESOLVED_CANDIDATE' ? 'POSSIBLE SUBJECT' : 'POSSIBLE SUBJECTS'}</span>{'  '}
          {(sr.candidates ?? []).map(c => c.name).join('  ·  ')}
          <div style={{ color: DIM, marginTop: 3 }}>{sr.prompt}</div>
        </div>
      )}
      {sr && sr.state === 'NONE' && (sr.candidates?.length > 0 || sr.associations?.length > 0) && (
        <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: DIM }}>
          {sr.candidates?.length > 0 && <div>candidate signal: {sr.candidates.map(c => c.name).join('  ·  ')} — unresolved</div>}
          {sr.associations?.length > 0 && <div>association context: {sr.associations.join('  ·  ')}</div>}
        </div>
      )}

      {/* the class-native anchor checklist — populated anchors only. An unfilled anchor is a
          real, already-computed absence (the "X of Y anchors open" line below still counts
          it), but a page of "—" rows is noise, not signal — Founder design call: don't show
          blanks, show what's real, and let the panel take only the space it needs. */}
      <div style={{ marginTop: 16 }}>
        {result.anchors.filter(a => a.value != null && a.value !== '').map(a => <AnchorRow key={a.key} a={a} />)}
      </div>

      <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>
        {result.unresolved.length} of {result.anchors.length} anchors open ·
        {clues.sector ? ` sector ${clues.sector} ·` : ''}{clues.stage ? ` stage ${clues.stage} ·` : ''} anchors scope observation, not conclusions
      </div>
    </section>
  );
}
