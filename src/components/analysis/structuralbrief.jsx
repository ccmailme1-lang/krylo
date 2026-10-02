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
// KRYL-1332 (Founder, 2026-09-28) — information-loss fix, not new computation: getDomainSignals()
// already exists precisely for this (domaingravity.js's own comment: "Read-only, windowed,
// shallow-copied particles. Does NOT collapse magnitude or vote on polarity"). Surfacing the
// individual signals that produced an average was always possible, just never rendered.
import { getDomainSignals } from '../../engine/domaingravity.js';
// KRYL-1341 fix (2026-10-01, live validation finding) — the isEntity branch checked domain
// co-presence (fieldFormation.graph.edges) but never checked canonical ρ (real, admitted
// entity-to-entity relationships, e.g. Sysco ACQUIRED Restaurant Depot) for the resolved
// subject at all. Strictly additive: domain co-presence answers "which of the 6 domains are
// co-active around this entity" (unchanged below); canonical ρ answers a different question,
// "is there a real, evidenced relationship between this entity and another named entity" — the
// two are never merged into one list or one count (see render block below).
import { NODE_LABELS } from '../../engine/entitytopologyregistry.js';
import { toTopologyNodeId } from '../../engine/entityresolution.js';
import { findAdmittedRelationshipsFor } from '../../engine/canonicalrelationshipprojection.js';

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

export default function StructuralBrief({ subjScope, question, domainPressures, activeDomainPressures, fieldFormation, structuralQuery }) {
  const isEntity = subjScope?.kind === 'ENTITY';
  // KRYL-1336 fix (2026-09-30): KRYL-1335/1336's real entity/relationship recognition +
  // evidence check (querysynthesis.js's structuralQuery, computed for every query) was wired
  // into intelligencebrief.jsx's buildBrief() -- a DIFFERENT component from this one, which is
  // what the guest actually sees (targetpacket.jsx renders StructuralBrief, not
  // IntelligenceBrief -- BRIEF was removed from structurepanel.jsx's tabs, KRYL-1332). So none
  // of that work ever reached the guest. Additive fix here only -- no new computation, no
  // change to isEntity's existing behavior, reuses the exact structuralQuery shape already
  // built and passed down from targetpacket.jsx's existing `synthesis` object.
  const structurallyInterpretable = !isEntity && structuralQuery?.state === 'INTERPRETABLE';
  const subjectLabel = isEntity
    ? subjScope.entity.name
    : structurallyInterpretable
      ? `STRUCTURAL PARTICIPANTS: ${structuralQuery.entities.join(', ')}`
      : 'FIELD SCAN — NO SUBJECT RESOLVED';

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

  // Canonical ρ lookup for the resolved entity subject. KRYL-1342 (2026-10-02): was an inline
  // reimplementation of this exact bridge (nodeId(identifiers.edgar, name)) -- the same
  // operation reconnpayload.js's relationshipCoverage() already does via the real shared
  // toTopologyNodeId(canonicalId). Consolidated onto the one shared function so the two
  // surfaces can't silently drift if the bridge logic ever changes. ρ's own identity
  // contract (part = nodeId()-derived strings, confirmed against all 3 real producers) is
  // untouched -- this only removes a duplicate consumer-side path to the same real id.
  // Independent of `edges` above — never combined into relationshipCount or domainList.
  const entityCanonicalRelationships = isEntity
    ? findAdmittedRelationshipsFor(toTopologyNodeId(subjScope.canonicalId))
    : [];

  // Fix 1/2 (KRYL-1332, Founder-locked 2026-09-28): magnitude averages multiple observations
  // into one scalar, and a relationship's admittedType is a fixed category label -- both real,
  // neither fabricated, but each collapses information a guest can't recover from the summary
  // alone. Surface what's underneath each, from data already computed above -- no new inference.
  const signalsByDomain = Object.fromEntries(domainLines.map(p => [p.domain, getDomainSignals(p.domain)]));
  const evidenceByDomain = evidence.reduce((acc, o) => { (acc[o.domain] ??= []).push(o); return acc; }, {});

  // KRYL-1332 (Founder, 2026-09-28): "What is the structural relationship around one or more
  // components?" is the anchor every brief opens with -- the sentence leads with the
  // relationship (or its honest absence), not a generic observation-count summary.
  const domainList = domainLines.length ? ` (${domainLines.map(p => p.domain).join(', ')})` : '';
  const entityRelPairs = structuralQuery?.evidence?.relationships ?? [];
  const entitySupported = entityRelPairs.filter(r => r.state === 'SUPPORTED');
  // Distinguish genuinely-checked-and-empty from never-resolvable -- collapsing both into
  // "candidate relationship" let a generic role noun (SUPPLIER, DISTRIBUTOR) read as if it had
  // been checked against real evidence and come up empty, when nothing was ever resolvable
  // enough to check. Real defect found live 2026-10-02.
  const entityUnresolved = entityRelPairs.filter(r => r.state === 'UNRESOLVED');
  const entityChecked = entityRelPairs.filter(r => r.state !== 'UNRESOLVED');
  // Canonical-ρ clause appended only when at least one real relationship exists — when
  // entityCanonicalRelationships is empty, the sentence is byte-identical to before this fix.
  const canonicalClause = entityCanonicalRelationships.length
    ? ` Separately, ${entityCanonicalRelationships.length} canonical relationship${entityCanonicalRelationships.length !== 1 ? 's' : ''} ` +
      `admitted for this entity: ${entityCanonicalRelationships.map(r => r.type).join(', ')}.`
    : '';
  const briefSentence = isEntity
    ? (relationshipCount > 0
        ? `The structural relationship around ${subjectLabel} spans ${domainLines.length} of 6 domains${domainList}: ` +
          `${relationshipCount} admitted cross-domain relationship${relationshipCount !== 1 ? 's' : ''} across ${observationTotal} live signal${observationTotal !== 1 ? 's' : ''}.${canonicalClause}`
        : `No domain formation established around ${subjectLabel} yet — observable structure spans ${domainLines.length} of 6 domains${domainList}, ` +
          `${observationTotal} live signal${observationTotal !== 1 ? 's' : ''}, but fewer than two domains are connected.${canonicalClause}`)
    : structurallyInterpretable
      ? (entityRelPairs.length
          ? `No canonical domain matched. ${structuralQuery.entities.length} structural participant${structuralQuery.entities.length !== 1 ? 's were' : ' was'} named in the query` +
            (entityUnresolved.length
              ? `, but ${entityUnresolved.length} of ${entityRelPairs.length} pair${entityRelPairs.length !== 1 ? 's' : ''} involve a term that isn't a resolvable named entity — nothing real to check there.`
              : '.') +
            (entityChecked.length
              ? ` Of the ${entityChecked.length} pair${entityChecked.length !== 1 ? 's' : ''} actually checked: ${entitySupported.length} supported by real evidence — the rest are a stated absence, not a low score.`
              : '')
          : `Structural participant recognized (${structuralQuery.entities.join(', ')}), but only one — nothing to relate it to yet.`)
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
        {structurallyInterpretable && entityRelPairs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: edges.length ? 14 : 0 }}>
            {entityRelPairs.map((r, i) => (
              <div key={`entity-${i}`}>
                <div>{r.a} ↔ {r.b} — {
                  r.state === 'SUPPORTED' ? 'supported by real evidence'
                  : r.state === 'UNRESOLVED' ? 'not a resolvable named entity'
                  : 'no evidence found'
                }</div>
                {r.state === 'SUPPORTED' && r.facet && (
                  <div style={{ marginLeft: 14, marginTop: 2, fontSize: 10, color: ABSENCE }}>
                    {r.facet.semantics} — {r.facet.source}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {edges.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* KRYL-1343 (2026-10-02): explicit header, matching the canonical block's own
                precedent below. These are domainintelligence.js's CROSS_DOMAIN_RELATIONSHIPS --
                which two of the six domains have live signal at once -- not an admitted,
                entity-to-entity canonical ρ relationship. Sat unlabeled directly under the
                generic RELATIONSHIPS heading, next to real entity relationships with no visual
                distinction -- a guest could misread domain co-presence as an admitted fact
                about named entities. Same question split already enforced in KRYL-1341's fix;
                this closes the remaining asymmetry (one block had a header, the other didn't). */}
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: LBL }}>CROSS-DOMAIN CO-PRESENCE (not admitted ρ)</div>
            {edges.map((e, i) => {
              // Fix 2: admittedType is a fixed category per domain-pair (real, but the same
              // label every time those two domains co-occur) -- attach the actual dated
              // evidence from each side of the pair instead of leaving it a bare category.
              const support = [...(evidenceByDomain[e.a] ?? []), ...(evidenceByDomain[e.b] ?? [])]
                .sort((x, y) => (y.eventDate ?? '').localeCompare(x.eventDate ?? '')).slice(0, 3);
              return (
                <div key={i}>
                  <div>{e.a} ↔ {e.b} — {e.admittedType}</div>
                  {support.length > 0 && (
                    <div style={{ marginLeft: 14, marginTop: 2, fontSize: 10, color: ABSENCE }}>
                      supported by: {support.map(s => `${s.domain} ${s.source} ${s.eventDate}`).join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (structurallyInterpretable && entityRelPairs.length ? null :
          <span style={{ color: ABSENCE }}>No formation established — fewer than two connected domains in the live field.</span>)}
        {/* KRYL-1341 fix — rendered as its own, visibly separate block, never merged into the
            domain co-presence list above or counted into relationshipCount/domainList. A
            different real question (named-entity relationship) gets its own answer, not a
            blended one. */}
        {isEntity && entityCanonicalRelationships.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: edges.length ? 14 : 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: LBL }}>CANONICAL RELATIONSHIPS (named-entity)</div>
            {entityCanonicalRelationships.map((r, i) => (
              <div key={`canonical-${i}`}>
                <div>
                  {r.part.map(id => NODE_LABELS[id] ?? id).join(r.phiClass === 'Semantic' ? ' → ' : ' ↔ ')} — {r.type}
                </div>
                {Object.keys(r.nuState ?? {}).length > 0 && (
                  <div style={{ marginLeft: 14, marginTop: 2, fontSize: 10, color: ABSENCE }}>
                    {Object.entries(r.nuState).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Row>

      <Row label="WHAT THE STRUCTURE SHOWS">
        {domainLines.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {domainLines.map(p => {
              // Fix 1: magnitude is an average -- show the individual signal confidences it
              // came from, so "0/100" from 3 observations isn't indistinguishable from "0/100"
              // meaning nothing was observed (the KNOWLEDGE/OWNERSHIP case found live tonight).
              const sigs = (signalsByDomain[p.domain] ?? []).slice(0, 6);
              return (
                <div key={p.domain}>
                  <div>
                    <span style={{ color: LIME }}>{p.domain}</span> — {p.signalCount} observation{p.signalCount !== 1 ? 's' : ''},{' '}
                    {p.polarity} polarity, magnitude {p.magnitude.toFixed(0)}/100.
                  </div>
                  {sigs.length > 0 && (
                    <div style={{ marginLeft: 14, marginTop: 2, fontSize: 10, color: ABSENCE }}>
                      magnitude is the average of: {sigs.map(s => Math.round(s.confidence)).join(', ')}
                      {p.signalCount > sigs.length ? `, +${p.signalCount - sigs.length} more` : ''}
                    </div>
                  )}
                </div>
              );
            })}
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
          Temporal deltas (current vs. prior period) are not yet computed — a stated absence, not filled with an
          estimate. This briefing describes observable structure; it does not determine suitability for a
          particular investor or decision.
        </span>
      </Row>
    </section>
  );
}
