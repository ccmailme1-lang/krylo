// structuralbrief.jsx — KRYL-1332, client-facing summary layer (2026-09-28).
//
// Founder-approved shape (SAB consensus + Founder correction): Question -> Structural Brief ->
// What The Structure Shows -> Relationships -> Evidence -> Unresolved. This is NOT a rewrite of
// the analytical engine and NOT a prose-generation model. Every sentence here is a deterministic
// template filled with values already computed elsewhere in this packet (domainPressures,
// fieldFormation, adsubject.js's A()) -- no new inference, no fabricated narrative. Where GPT's
// own reference mockup left a section as "[actual evidence-backed relationships]" because no real
// data existed for that example (CIO Select Fund, not a registered entity), this component shows
// the same honest absence instead of prose -- it never fills a gap with summarized guest input
// dressed up as KRYLO's own finding.
//
// This is ADDITIVE: it renders above the existing packet, which is unchanged. Nothing below it
// was removed, gated, or gets less true — see §21 (FORMATION IS NOT A VERDICT): real field-level
// structure is never hidden here for lack of a resolved subject.

import { A } from '../../engine/adsubject.js';

const MONO   = "'IBM Plex Mono', monospace";
const HELV   = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const LIME   = '#66FF00';
const RULE   = '#191d1e';
const LBL    = '#5d6462';
const BODY_C = '#b6bcb7';
const BRIGHT = '#f4f6f2';
const ABSENCE = '#4f5654';

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n).trim()}…` : s;
}

function Row({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.24em', color: LIME, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: BODY_C }}>{children}</div>
    </div>
  );
}

export default function StructuralBrief({ subjScope, question, domainPressures, activeDomainPressures, fieldFormation }) {
  const isEntity = subjScope?.kind === 'ENTITY';
  const subjectLabel = isEntity ? subjScope.entity.name : 'FIELD SCAN — NO SUBJECT RESOLVED';

  // WHAT THE STRUCTURE SHOWS -- real, per-domain, already-computed pressure data (magnitude,
  // polarity, signalCount) -- the same values FractureSignalSurface/domainsubstratetabs.jsx read,
  // not a second computation.
  const domainLines = (activeDomainPressures ?? []).slice().sort((a, b) => b.signalCount - a.signalCount);

  // EVIDENCE -- real dated observations, from the SAME domaingravity.js pool fieldFormation
  // itself reads (adsubject.js's A(domain, scope).formationObservations). Only meaningful when
  // a subject is resolved (identifier-bound); field-scoped queries have no subject to bind
  // evidence to, and that's a stated absence below, not an empty table pretending otherwise.
  const evidence = isEntity
    ? domainLines
        .flatMap(p => A(p.domain, subjScope).formationObservations.map(o => ({ ...o, domain: p.domain })))
        .filter(o => o.eventDate)
        .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''))
        .slice(0, 8)
    : [];

  const edges = fieldFormation?.graph?.edges ?? [];
  const relationshipCount = edges.length;
  const observationTotal = domainLines.reduce((s, p) => s + p.signalCount, 0);

  // KRYL-1332 (Founder, 2026-09-28): "What is the structural relationship around one or more
  // components?" is the anchor every brief opens with -- the sentence leads with the
  // relationship (or its honest absence), not a generic observation-count summary.
  const domainList = domainLines.length ? ` (${domainLines.map(p => p.domain).join(', ')})` : '';
  const briefSentence = isEntity
    ? (relationshipCount > 0
        ? `The structural relationship around ${subjectLabel} spans ${domainLines.length} of 6 domains${domainList}: ` +
          `${relationshipCount} admitted cross-domain relationship${relationshipCount !== 1 ? 's' : ''} across ${observationTotal} live signal${observationTotal !== 1 ? 's' : ''}.`
        : `No admitted structural relationship around ${subjectLabel} yet — observable structure spans ${domainLines.length} of 6 domains${domainList}, ` +
          `${observationTotal} live signal${observationTotal !== 1 ? 's' : ''}, but fewer than two domains are connected.`)
    : `No subject resolved, so no structural relationship can be attributed to one entity — the live field alone shows structure ` +
      `across ${domainLines.length} of 6 domains${domainList}.`;

  return (
    <section style={{ padding: '20px 0 26px', borderBottom: `1px solid ${RULE}` }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: LBL }}>STRUCTURAL BRIEF</div>
      <h2 style={{ margin: '8px 0 0', fontFamily: HELV, fontSize: 22, fontWeight: 300, color: BRIGHT }}>
        {subjectLabel}
      </h2>
      {question && (
        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, color: LBL }}>
          QUESTION: {truncate(question, 160)}
        </div>
      )}

      <Row label="STRUCTURAL BRIEF">{briefSentence}</Row>

      {/* KRYL-1332 (Founder, 2026-09-28): RELATIONSHIPS leads, immediately after the brief
          sentence that names it -- "what is the structural relationship around one or more
          components" is the anchor question, so the answer sits right under it, not three
          sections down. */}
      <Row label="RELATIONSHIPS">
        {edges.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {edges.map((e, i) => (
              <div key={i}>{e.a} ↔ {e.b} — {e.admittedType}</div>
            ))}
          </div>
        ) : <span style={{ color: ABSENCE }}>No formation established — fewer than two connected domains in the live field.</span>}
      </Row>

      <Row label="WHAT THE STRUCTURE SHOWS">
        {domainLines.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {domainLines.map(p => (
              <div key={p.domain}>
                <span style={{ color: LIME }}>{p.domain}</span> — {p.signalCount} observation{p.signalCount !== 1 ? 's' : ''},{' '}
                {p.polarity} polarity, magnitude {p.magnitude.toFixed(0)}/100.
              </div>
            ))}
          </div>
        ) : <span style={{ color: ABSENCE }}>No domain shows active signal for this field yet.</span>}
      </Row>

      <Row label="EVIDENCE">
        {evidence.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {evidence.map((o, i) => (
              <div key={i}><span style={{ color: LIME }}>{o.domain}</span> — {o.source} · {o.eventDate}</div>
            ))}
          </div>
        ) : (
          <span style={{ color: ABSENCE }}>
            {isEntity ? 'No dated subject-bound evidence resolved yet for this subject.' : 'No subject resolved — evidence is not identifier-bound to a field-level scan.'}
          </span>
        )}
      </Row>

      <Row label="UNRESOLVED">
        <span style={{ color: ABSENCE }}>
          Temporal deltas (current vs. prior period) and per-relationship evidence citations are not yet computed —
          a stated absence, not filled with an estimate. This briefing describes observable structure; it does not
          determine suitability for a particular investor or decision.
        </span>
      </Row>
    </section>
  );
}
