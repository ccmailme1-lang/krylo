// AnalysisField — ConeMap surface. Single state: always renders 6 domain bays.
// ACTIVE/TACTICAL/NodeMapCanvas modes killed (WO-1344 routing supersedes them).
import React, { useMemo } from 'react';
import ConeMap from '../spine/conemap.jsx';
import { LENS_EMBEDS, isEmbedLens } from '../../config/lensembeds.js';
import { usePrism } from '../../context/PrismContext.jsx';
import { buildLiveProspectus } from '../../engine/formationprospectusproducer.js';
import { CANONICAL_DOMAINS } from '../../engine/ontology.js';
import { getDomainSignals } from '../../engine/domaingravity.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// ── LENS EMBED SIZING CONTRACT (LOCKED) ────────────────────────────────────────
// Every Flourish lens embed renders in ONE identical panel, centered in Region C.
// Do not size lenses individually. To resize ALL lenses, change these two numbers.
// Target footprint = the cone-map content box (measured 1025 × 565 px, ~16:9).
const LENS_EMBED = Object.freeze({ maxWidth: 900, maxHeight: 565 });

// KRYL-1118 — prospectus graph artifact. Paste the Flourish graph chart URL here to wedge it into the
// Structural Relationships block (the formation's proof surface). null → shows an empty artifact slot.
const FORMATION_GRAPH_EMBED = 'https://flo.uri.sh/visualisation/29783600/embed'; // placeholder scatter — swap id to replace

// Per-lens caption — the "why" line beneath the embed. Legend + colors stay in Flourish.
const LENS_CAPTIONS = Object.freeze({
  CONVERGENCE: 'The gap between the signal and its expected trend — it widens as they diverge, closes as they converge.',
});

function AnalysisField({
  signals,
  replayedSignals,
  history,
  selectedLens,
  topoMode,
  onTopoToggle,
  selection,
  clickEvent,
  onSelectCone,
  onActiveConeChange,
  onArcClick,
  maxCones,
  dollyKey,
  coneColorOverrides,
}) {
  const { state } = usePrism();
  const viewportLens = state?.activeLens ?? 'OBSERVE'; // KRYL-1034 active lens → cone suspended HUD

  // ── Lens Report Contract (KRYL-1118A) — OPPORTUNITY is the template; every reporting lens
  // (SIGNAL/FLOW/PRESSURE/CONVERGENCE/DRIFT) gets its OWN report built from the SAME real domain
  // data, not a stripped-down placeholder. domainStats/fieldAvg are lens-agnostic pool reads
  // (§13a getDomainSignals) — every report lens reuses them; only the OPPORTUNITY full prospectus
  // assembly (buildLiveProspectus) is OPPORTUNITY-specific.
  const REPORT_LENSES = new Set(['OPPORTUNITY', 'SIGNAL', 'FLOW', 'PRESSURE', 'CONVERGENCE', 'DRIFT']);
  const opportunityActive = viewportLens === 'OPPORTUNITY';
  const reportLensActive = REPORT_LENSES.has(viewportLens);
  const opp = useMemo(() => {
    if (!reportLensActive) return null;
    const domainStats = {};
    let magSum = 0, magN = 0;
    for (const d of CANONICAL_DOMAINS) {
      const sigs = getDomainSignals(d);
      const count = sigs.length;
      if (!count) { domainStats[d.toUpperCase()] = { count: 0, mag: null, direction: 'absent' }; continue; }
      const mag = sigs.reduce((s, x) => s + (x.confidence ?? 0) / 100, 0) / count;               // signal strength 0..1
      const net = sigs.reduce((s, x) => s + (x.polarity === 'fracture' ? -1 : 1) * ((x.confidence ?? 0) / 100), 0);
      domainStats[d.toUpperCase()] = { count, mag, direction: net === 0 ? 'mixed' : net > 0 ? 'constructive' : 'fracture' };
      magSum += mag; magN += 1;
    }
    const fieldAvg = magN ? magSum / magN : 0;   // grounded field mean — the honest "Avg" baseline (re-derivable)
    const prospectus = opportunityActive ? buildLiveProspectus({ now: Date.now() }) : null;
    return { prospectus, domainStats, fieldAvg };
  }, [reportLensActive, opportunityActive, signals, replayedSignals]);

  // History line — grounded from the replay frame log (§13a / usereplay: the same 24H series the surface
  // scrubs). Per frame = mean signal_score across that frame's signals → a real (ts, v) series. Self-scaled
  // at render. < 2 points → the line withholds (TEMPORAL absence, §22), never a fabricated trend.
  const historySeries = useMemo(() => {
    if (!reportLensActive) return [];
    return (history ?? [])
      .filter((f) => f && Number.isFinite(f.ts))
      .map((f) => {
        const vals = (f.signals ?? []).map((s) => s?.signal_score).filter(Number.isFinite);
        return vals.length ? { ts: f.ts, v: vals.reduce((a, b) => a + b, 0) / vals.length } : null;
      })
      .filter(Boolean);
  }, [reportLensActive, history]);

  if (opportunityActive) {
    const prospectus = opp?.prospectus ?? null;
    const domainStats = opp?.domainStats ?? {};
    const fieldAvg = opp?.fieldAvg ?? 0;
    // OPPORTUNITY report surface (KRYL-1117/KRYL-1118A — Intelligence Narrative structure, 2026-07-26).
    // Dark §6 palette. §5 dual voice: SERIF synthesis (narrative) / MONO data. Every section below is
    // grounded in prospectus/domainStats/historySeries — no hand-authored prose, no invented data.
    const SERIF = "Georgia, 'Times New Roman', serif";
    const INK = '#F5F5F7', DIM = 'rgba(245,245,247,0.60)', FAINT = 'rgba(245,245,247,0.34)';
    const TITLES = {
      STRUCTURAL_IDENTITY: 'Structural Identity', EXECUTIVE_STRUCTURAL_ASSESSMENT: 'Executive Assessment',
      FORMATION_ANATOMY: 'Formation Anatomy', STRUCTURAL_FIELD: 'Structural Field',
      FORMATION_PROPERTIES: 'Formation Properties', STRUCTURAL_RELATIONSHIPS: 'Structural Relationships',
      FORMATION_RESONANCE: 'Formation Resonance', STRUCTURAL_DRIFT: 'Structural Drift',
      PRESSURE_MAP: 'Pressure Map', FORMATION_TRAJECTORY: 'Formation Trajectory',
      EVIDENCE_FOUNDATION: 'Evidence Foundation', STRUCTURAL_INTELLIGENCE_CONCLUSION: 'Conclusion',
    };
    const BarRow = ({ v }) => (
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: INK, fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(2)}</span>
        <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
          <span style={{ position: 'absolute', inset: 0, width: `${Math.round(v * 100)}%`, background: 'rgba(245,245,247,0.55)' }} />
        </span>
      </div>
    );
    // grounded History line (replay frames, self-scaled). < 2 points → withholds (§22 TEMPORAL), never faked.
    const HistoryLine = ({ series, h = 120 }) => {
      if (!series || series.length < 2)
        return (
          <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: FAINT }}>
            HISTORY WITHHELD · §22
          </div>
        );
      const vs = series.map((p) => p.v);
      const min = Math.min(...vs), max = Math.max(...vs), span = (max - min) || 1;
      const W = 100, H = 40;
      const pts = series.map((p, i) =>
        `${((i / (series.length - 1)) * W).toFixed(2)},${(H - ((p.v - min) / span) * H).toFixed(2)}`).join(' ');
      return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
          <defs><linearGradient id="opp-hist-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(245,245,247,0.24)" /><stop offset="1" stopColor="rgba(245,245,247,0)" />
          </linearGradient></defs>
          <polygon points={`0,${H} ${pts} 100,${H}`} fill="url(#opp-hist-fill)" />
          <polyline points={pts} fill="none" stroke="rgba(245,245,247,0.75)" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    };
    const CARD = { border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' };
    const SecLabel = ({ num, title, right }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: FAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: DIM, margin: '4px 0 16px',
                      display: 'flex', justifyContent: 'space-between' }}>
          <span>{title}</span><span style={{ color: DIM }}>{right}</span>
        </div>
      </>
    );
    const byId = Object.fromEntries((prospectus?.sections ?? []).map((s) => [s.id, s]));
    // §17 canonical six, sourced from ontology (KRYL-1065) so order can't drift — ends on OWNERSHIP.
    const CANON = CANONICAL_DOMAINS.map((d, i) => [`C0${i + 1}`, d.toUpperCase()]);
    const inFormation = new Set(byId.STRUCTURAL_IDENTITY?.participatingDomains ?? []);

    // RISK FACTORS (§20 direction honesty) — DETECTED downside, equal authority, never predicted loss.
    const risks = [];
    const fractures = CANON.filter(([, n]) => domainStats[n]?.direction === 'fracture').map(([, n]) => n);
    if (fractures.length) risks.push(['FRACTURE', `${fractures.join(', ')} under fracture-polarity pressure.`]);
    const blind = ['STRUCTURAL_FIELD', 'STRUCTURAL_DRIFT'].filter((id) => byId[id] && byId[id].state !== 'GROUNDED').map((id) => TITLES[id]);
    if (blind.length) risks.push(['BLIND SPOT', `${blind.join(' & ')} ungrounded — field movement unobserved.`]);
    const outside = CANON.filter(([, n]) => !inFormation.has(n)).map(([, n]) => n);
    if (outside.length) risks.push(['COVERAGE', `${outside.join(', ')} outside the formation — concentration risk.`]);
    const silent = CANON.filter(([, n]) => (domainStats[n]?.count ?? 0) === 0).map(([, n]) => n);
    if (silent.length) risks.push(['ABSENCE', `No signal in ${silent.join(', ')} (§22) — unobserved, not safe.`]);
    risks.push(['STRUCTURAL', 'Co-presence edges only — mechanism unproven.']);

    // QUALIFICATION DOCTRINE (2026-07-26) — Signal primary, Evidence-count tiebreaker near the floor.
    // Never a blended score (§18). Ties project_domain_qualification_doctrine.
    const QUAL_FLOOR = 0.40, NEAR_FLOOR_MARGIN = 0.05;
    const qualified = CANON
      .filter(([, n]) => (domainStats[n]?.mag ?? -1) >= QUAL_FLOOR)
      .sort(([, a], [, b]) => (domainStats[b].mag - domainStats[a].mag) || (domainStats[b].count - domainStats[a].count));
    const qualRankOf = Object.fromEntries(qualified.map(([, n], i) => [n, i + 1]));
    const qualLabel = (name) => {
      const st = domainStats[name];
      if (!st || st.mag == null || st.mag < QUAL_FLOOR) return 'BELOW FLOOR';
      const near = st.mag - QUAL_FLOOR <= NEAR_FLOOR_MARGIN ? ' · NEAR FLOOR' : '';
      return `QUAL ${qualRankOf[name]}${near}`;
    };

    // §22 grounded vs withheld sections — feeds Confidence Boundary (09).
    const allSections = prospectus?.sections ?? [];
    const supportedSections = allSections.filter((s) => s.state === 'GROUNDED' && s.id !== 'STRUCTURAL_INTELLIGENCE_CONCLUSION');
    const unresolvedSections = allSections.filter((s) => s.state !== 'GROUNDED');

    // Formation Timeline substrate — the SAME real replay-frame series (historySeries) that feeds the
    // History sparkline (01/03). Samples up to 6 real points; only first/last get a structurally-true
    // label (OBSERVED/CURRENT) — no invented phase names (Expansion/Acceleration/etc are not derivable).
    const timelinePoints = (() => {
      if (historySeries.length < 2) return null;
      const n = Math.min(6, historySeries.length);
      const idxs = [...new Set(Array.from({ length: n }, (_, i) => Math.round(i * (historySeries.length - 1) / (n - 1))))];
      return idxs.map((idx, i) => ({ ...historySeries[idx], label: i === 0 ? 'OBSERVED' : i === idxs.length - 1 ? 'CURRENT' : null }));
    })();

    const fp = byId.EXECUTIVE_STRUCTURAL_ASSESSMENT?.fingerprint;
    const observedThrough = [...inFormation]
      .map((n) => [n, domainStats[n]?.count ?? 0]).filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1]).map(([n, c]) => `${c} ${n} signal${c === 1 ? '' : 's'}`).join(' · ');

    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto',
                    display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>
          {prospectus && prospectus.live ? (
            <>
              {/* 01 FORMATION OVERVIEW — hero: title + domains left, OVERALL score cluster right */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(200px, 280px)', gap: 20, alignItems: 'start', marginBottom: 28 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: FAINT, marginBottom: 14 }}>FORMATION PROSPECTUS · 01 OVERVIEW</div>
                  <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.15, color: INK, marginBottom: 12 }}>{prospectus.title}</div>
                  {byId.STRUCTURAL_IDENTITY && (
                    <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', color: DIM }}>
                      {byId.STRUCTURAL_IDENTITY.participatingDomains?.join('   ·   ')}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: FAINT }}>OVERALL</span>
                    <span style={{ fontFamily: MONO, fontSize: 30, color: INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {prospectus.header.existence?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: MONO, fontSize: 9, letterSpacing: '0.05em', color: INK }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: LIME }} />{prospectus.header.state}
                    <span style={{ color: FAINT, marginLeft: 'auto' }}>{Math.round(prospectus.header.coverage * 100)}% · {prospectus.header.evidenceCount} sig</span>
                  </div>
                  <HistoryLine series={historySeries} h={44} />
                </div>
              </div>

              {/* 02 FORMATION THESIS — assembler-derived, not hand-authored */}
              {byId.EXECUTIVE_STRUCTURAL_ASSESSMENT && (
                <div style={{ marginBottom: 34 }}>
                  <SecLabel num="02" title="FORMATION THESIS" />
                  <div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.65, color: INK }}>
                    {byId.EXECUTIVE_STRUCTURAL_ASSESSMENT.statement}
                    {observedThrough && (
                      <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', color: DIM, marginTop: 16, lineHeight: 1.7 }}>
                        Observed through: {observedThrough}.
                      </div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', color: FAINT, marginTop: 10 }}>
                      Boundary: trajectory and future outcome are not yet observable — see §11 Structural Outlook.
                    </div>
                  </div>
                </div>
              )}

              {/* 03 STRUCTURAL STATE — 6 tiles */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="03" title="STRUCTURAL STATE" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
                  {[
                    ['FORMATION', prospectus.header.state],
                    ['SIGNAL DENSITY', String(prospectus.header.evidenceCount)],
                    ['EVIDENCE DEPTH', `${CANON.filter(([, n]) => (domainStats[n]?.count ?? 0) > 0).length} domains`],
                    ['DOMAIN COVERAGE', `${inFormation.size} / 6 fields`],
                    ['RELATIONSHIP COHERENCE', byId.FORMATION_ANATOMY?.read?.value != null ? byId.FORMATION_ANATOMY.read.value.toFixed(2) : '—'],
                    ['OBSERVED WINDOW', `${historySeries.length} frames`],
                  ].map(([label, val], i, arr) => (
                    <div key={label} style={{ padding: '16px 14px', borderRight: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>{label}</div>
                      <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 04 DOMAIN FORMATION MATRIX — dot field map, replaces the old bay-strip */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="04" title="DOMAIN FORMATION MATRIX" />
                <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
                  {CANON.map(([, name], i, arr) => {
                    const st = domainStats[name] ?? { count: 0, mag: null, direction: 'absent' };
                    const filled = Math.round((st.mag ?? 0) * 5);
                    return (
                      <div key={name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 90px', alignItems: 'center', gap: 14,
                                                padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: inFormation.has(name) ? INK : DIM }}>{name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em' }}>
                          <span style={{ color: INK }}>{'●'.repeat(filled)}</span>
                          <span style={{ color: 'rgba(245,245,247,0.15)' }}>{'○'.repeat(5 - filled)}</span>
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', color: DIM }}>
                          {st.count ? `${st.mag >= 0.75 ? 'HIGH' : st.mag >= 0.40 ? 'MODERATE' : 'LOW'} · ${st.direction.toUpperCase()}` : 'NO SIGNAL · §22'}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: FAINT, textAlign: 'right' }}>{qualLabel(name)}</span>
                      </div>
                    );
                  })}
                </div>
                {byId.STRUCTURAL_RELATIONSHIPS?.edges?.length > 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.05em', color: DIM, marginTop: 12 }}>
                    Primary relationship: <span style={{ color: INK }}>{byId.STRUCTURAL_RELATIONSHIPS.edges.map(e => `${e.a} ↔ ${e.b}`).join('  ·  ')}</span> (co-presence, §22 — 9 of 10 connection properties ungrounded)
                  </div>
                )}
              </div>

              {/* 05 TOP FORMATIONS — top 3 by qualification doctrine (Signal primary, Evidence tiebreak) */}
              {qualified.length > 0 && (
                <div style={{ marginBottom: 34 }}>
                  <SecLabel num="05" title="TOP FORMATIONS" />
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, qualified.length)}, 1fr)`, gap: 12 }}>
                    {qualified.slice(0, 3).map(([cid, name]) => {
                      const st = domainStats[name];
                      const delta = st.mag - fieldAvg;
                      return (
                        <div key={cid} style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', color: INK }}>{name}</span>
                          <span style={{ fontFamily: MONO, fontSize: 22, color: INK, fontVariantNumeric: 'tabular-nums' }}>{st.mag.toFixed(2)}</span>
                          <span style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.55, color: DIM }}>
                            {st.count} signals, {delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs field baseline of {fieldAvg.toFixed(2)}.
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: FAINT }}>field {fieldAvg.toFixed(2)}</span>
                          <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.12em', color: LIME, marginTop: 'auto' }}>
                            {inFormation.has(name) ? 'IN FORMATION' : qualLabel(name)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 06 EVIDENCE CHAIN — 3-col, no charts */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="06" title="EVIDENCE CHAIN" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={CARD}>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.05em', color: INK, marginBottom: 8 }}>Evidence Foundation</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: DIM, lineHeight: 1.7 }}>
                      {prospectus.header.evidenceCount} signals total<br />
                      {inFormation.size} of 6 domains represented<br />
                      {byId.STRUCTURAL_RELATIONSHIPS?.edges?.length ?? 0} edges (co-presence only)
                    </div>
                  </div>
                  <div style={CARD}>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.05em', color: INK, marginBottom: 8 }}>Groundedness</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: DIM, lineHeight: 1.7 }}>
                      {Math.round((byId.FORMATION_PROPERTIES?.avgGroundedness ?? 0) * 100)}% grounded (Ḡ={(byId.FORMATION_PROPERTIES?.avgGroundedness ?? 0).toFixed(2)})<br />
                      No projected/assumed inputs<br />
                      Pass-through pool reads only
                    </div>
                  </div>
                  <div style={CARD}>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.05em', color: INK, marginBottom: 8 }}>Latest Observation</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: DIM, lineHeight: 1.7 }}>
                      {historySeries.length} replay frames captured<br />
                      Most recent frame: current<br />
                      Window: rolling, live pool
                    </div>
                  </div>
                </div>
              </div>

              {/* 07 STRUCTURAL RELATIONSHIP FIELD — full-width hero graph (KRYL-1118). Flourish slot. */}
              {byId.STRUCTURAL_RELATIONSHIPS && (
                <div style={{ marginBottom: 34 }}>
                  <SecLabel num="07" title="STRUCTURAL RELATIONSHIP FIELD" />
                  <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: DIM, marginBottom: 14 }}>
                    Co-presence edges only; 9 of 10 connection properties ungrounded (§22). Evidence-backed relationships only.
                  </div>
                  <div style={{ height: 640, background: 'rgba(245,245,247,0.03)', position: 'relative', overflow: 'hidden' }}>
                    {FORMATION_GRAPH_EMBED ? (
                      <iframe title="formation-graph" src={FORMATION_GRAPH_EMBED}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)', border: 'none' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: FAINT }}>
                        GRAPH ARTIFACT · SET FORMATION_GRAPH_EMBED
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 08 FORMATION TIMELINE — grounded in the same replay-frame substrate as the History sparkline
                  (01/03). Real (ts,v) points, sampled; only first/last carry a structurally-true label. */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="08" title="FORMATION TIMELINE" right={timelinePoints ? `${historySeries.length} FRAMES` : 'WITHHELD'} />
                {timelinePoints ? (
                  <div style={{ display: 'flex', borderTop: '1px solid rgba(245,245,247,0.16)', paddingTop: 18 }}>
                    {timelinePoints.map((p, i) => (
                      <div key={p.ts} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: -23, left: '50%', width: 5, height: 5, borderRadius: '50%',
                                       background: p.label === 'CURRENT' ? LIME : FAINT, transform: 'translateX(-50%)' }} />
                        <div style={{ fontFamily: MONO, fontSize: 12, color: INK, fontVariantNumeric: 'tabular-nums' }}>{p.v.toFixed(2)}</div>
                        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: p.label ? INK : DIM, marginTop: 4 }}>
                          {p.label ?? new Date(p.ts).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.03em', color: FAINT, borderTop: '1px solid rgba(245,245,247,0.16)', paddingTop: 16 }}>
                    Withheld — {byId.FORMATION_TRAJECTORY?.reason ?? 'NO_TIME_SERIES'} · {byId.FORMATION_TRAJECTORY?.absence ?? 'TEMPORAL'}
                  </div>
                )}
              </div>

              {/* 09 CONFIDENCE BOUNDARY — §22 grounded-or-withhold, editorial framing */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="09" title="CONFIDENCE BOUNDARY" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={CARD}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: LIME, marginBottom: 12 }}>SUPPORTED</div>
                    {supportedSections.map((s) => (
                      <div key={s.id} style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.9, color: DIM }}>
                        <span style={{ color: INK, marginRight: 6 }}>✓</span>{TITLES[s.id] ?? s.id}
                      </div>
                    ))}
                  </div>
                  <div style={CARD}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: FAINT, marginBottom: 12 }}>UNRESOLVED</div>
                    {unresolvedSections.map((s) => (
                      <div key={s.id} style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.9, color: DIM }}>
                        <span style={{ color: INK, marginRight: 6 }}>?</span>{TITLES[s.id] ?? s.id}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 10 RISKS / LIMITATIONS — own section (§20), no longer folded into the thesis */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="10" title="RISKS / LIMITATIONS" right={`${risks.length} DETECTED`} />
                <div style={CARD}>
                  {risks.map(([tag, text], i) => (
                    <div key={tag} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16,
                                            padding: '9px 0', borderBottom: i < risks.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: DIM }}>{tag}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.5, color: INK }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 11 STRUCTURAL OUTLOOK — 3-layer, derived from fingerprint + qualified rank, not authored */}
              <div style={{ marginBottom: 34 }}>
                <SecLabel num="11" title="STRUCTURAL OUTLOOK" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ borderLeft: `2px solid ${LIME}`, paddingLeft: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 8 }}>OBSERVED</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: DIM }}>
                      A {fp?.domains?.length ?? inFormation.size}-domain {fp?.direction ?? 'constructive'} alignment exists today at E={(fp?.existence ?? prospectus.header.existence).toFixed(2)}, grounded in {fp?.evidenceCount ?? prospectus.header.evidenceCount} live signals.
                    </div>
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(245,245,247,0.16)', paddingLeft: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 8 }}>FORMING</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: DIM }}>
                      {qualified.length ? `${qualified.slice(0, 2).map(([, n]) => n).join(' and ')} carry the deepest evidence and highest signal strength — the structure's strongest legs.` : 'No domain currently clears the qualification floor.'}
                    </div>
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(245,245,247,0.16)', paddingLeft: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 8 }}>UNRESOLVED</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: DIM }}>
                      {unresolvedSections.length ? `${unresolvedSections.map((s) => TITLES[s.id] ?? s.id).join(', ')} cannot be concluded — no time-series substrate yet.` : 'All sections currently grounded.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 12 APPENDIX */}
              <div>
                <SecLabel num="12" title="APPENDIX" />
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: FAINT, lineHeight: 1.7 }}>
                  Formation ID: {byId.STRUCTURAL_IDENTITY?.formationId ?? '—'}<br />
                  Generated: {prospectus.generatedAt ? new Date(prospectus.generatedAt).toISOString() : '—'} by {prospectus.generatedBy}<br />
                  Citation: {byId.EXECUTIVE_STRUCTURAL_ASSESSMENT?.citation ?? 'formation-inference-engine'}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: FAINT,
                          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {prospectus ? 'INSUFFICIENT SIGNAL — NO FORMATION DETECTED' : 'AWAITING SIGNALS'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // LSC-001 Region C — a lens with a Flourish embed renders it as an iframe (no WebGL); until a URL
  // is wired it shows an "awaiting embed" slot. Lenses not in the embed map fall through to the cone map.
  // DRIFT lens — own report shell (LRC — each lens owns its report). computeDivergence('DRIFT', …)
  // needs STRUCTURAL + NARRATIVE SignalFacets per domain (signalfacet.js); the live pool only carries
  // one undifferentiated confidence/polarity reading — no facet split exists yet. Every domain WITHHOLDS
  // honestly (§22 STRUCTURAL absence) rather than fabricate a divergence number. Flourish DRIFT chart
  // (the real structure-vs-narrative visualization) is the centerpiece proof surface.
  if (viewportLens === 'DRIFT') {
    const driftUrl = LENS_EMBEDS.DRIFT;
    const dDomainStats = opp?.domainStats ?? {};
    const dFieldAvg = opp?.fieldAvg ?? 0;
    const DINK = '#F5F5F7', DDIM = 'rgba(245,245,247,0.60)', DFAINT = 'rgba(245,245,247,0.34)';
    // Drift Summary — field-wide aggregate (as built for Structural State), the genuinely DRIFT-relevant
    // read we can compute honestly: momentum across the whole field, not a per-domain divergence figure.
    const dNames = CANONICAL_DOMAINS.map((d) => d.toUpperCase());
    const dReporting = dNames.filter((n) => (dDomainStats[n]?.count ?? 0) > 0);
    const dConstructive = dReporting.filter((n) => dDomainStats[n].direction === 'constructive').length;
    const dFracture = dReporting.filter((n) => dDomainStats[n].direction === 'fracture').length;
    const dFieldDirection = dFracture > dConstructive ? 'FRACTURE-LEANING' : dConstructive > dFracture ? 'CONSTRUCTIVE-LEANING' : 'MIXED';
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: DFAINT, marginBottom: 14 }}>DRIFT REPORT · 01 OVERVIEW</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: DINK, marginBottom: 16 }}>
            Structural Drift Report
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: DDIM, marginBottom: 28, maxWidth: 760 }}>
            The gap between structure and narrative — where the field is moving before the story catches up.
            Signal strength below is the same grounded read used across every lens (§13a pool). The
            structure-vs-narrative divergence figure itself needs STRUCTURAL+NARRATIVE facets not yet
            split in the pool — flagged per domain, not blanked.
          </div>
          {/* drift summary — field-wide, as built for Structural State on the OWNERSHIP report */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DFAINT, marginBottom: 12 }}>DRIFT SUMMARY — FIELD AS A WHOLE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', border: '1px solid rgba(245,245,247,0.16)', marginBottom: 28 }}>
            {[
              ['FIELD DIRECTION', dFieldDirection],
              ['CONSTRUCTIVE DOMAINS', String(dConstructive)],
              ['FRACTURE DOMAINS', String(dFracture)],
              ['REPORTING DOMAINS', `${dReporting.length} / 6`],
              ['FIELD SIGNAL AVG', dFieldAvg.toFixed(2)],
              ['DIVERGENCE FIGURE', 'PENDING §22'],
            ].map(([label, val], i, arr) => (
              <div key={label} style={{ padding: '16px 14px', borderRight: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: DFAINT, marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 14, color: DINK }}>{val}</div>
              </div>
            ))}
          </div>

          {/* domain formation matrix — same dot field map as the OWNERSHIP report, real per-domain data */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DFAINT, marginBottom: 12 }}>PER-DOMAIN SIGNAL</div>
          <div style={{ border: '1px solid rgba(245,245,247,0.16)', marginBottom: 28 }}>
            {CANONICAL_DOMAINS.map((d, i, arr) => {
              const name = d.toUpperCase();
              const st = dDomainStats[name] ?? { count: 0, mag: null, direction: 'absent' };
              const filled = Math.round((st.mag ?? 0) * 5);
              return (
                <div key={d} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 200px 170px', alignItems: 'center', gap: 14,
                                      padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: DDIM }}>{name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em' }}>
                    <span style={{ color: DINK }}>{'●'.repeat(filled)}</span>
                    <span style={{ color: 'rgba(245,245,247,0.15)' }}>{'○'.repeat(5 - filled)}</span>
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', color: DDIM }}>
                    {st.count ? `${st.mag >= 0.75 ? 'HIGH' : st.mag >= 0.40 ? 'MODERATE' : 'LOW'} · ${st.count} sig · field ${dFieldAvg.toFixed(2)}` : 'NO SIGNAL · §22'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.04em', color: DFAINT, textAlign: 'right' }}>
                    DIVERGENCE PENDING §22
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: DFAINT, marginBottom: 12 }}>
            STRUCTURE VS NARRATIVE — FIELD VIEW
          </div>
          <div style={{ height: 560, background: 'rgba(245,245,247,0.03)', position: 'relative', overflow: 'hidden' }}>
            {driftUrl ? (
              <iframe title="drift-field" src={driftUrl}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)', border: 'none' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: DFAINT }}>
                AWAITING FLOURISH EMBED
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isEmbedLens(viewportLens)) {
    const url = LENS_EMBEDS[viewportLens];
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? (
          // top color key (states) + embed + bottom caption (the why). Flourish legend off.
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        width: '100%', height: '100%',
                        maxWidth: `${LENS_EMBED.maxWidth}px`, maxHeight: `${LENS_EMBED.maxHeight}px` }}>
            {/* wrapper clips the bottom "Made with Flourish" credit strip off the iframe (overflow hidden
                + iframe sized taller than the wrapper), leaving the full chart visible. */}
            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <iframe title={viewportLens} src={url}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)',
                               border: 'none', display: 'block' }} />
            </div>
            {LENS_CAPTIONS[viewportLens] && (
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.55)',
                            textAlign: 'left', alignSelf: 'flex-start', maxWidth: 760, lineHeight: 1.55, flexShrink: 0 }}>
                {LENS_CAPTIONS[viewportLens]}
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.26em', color: LIME }}>{viewportLens} LENS</div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>AWAITING FLOURISH EMBED</div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>
              paste the embed URL into src/config/lensembeds.js
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      <button
        onClick={onTopoToggle}
        style={{
          position: 'absolute', top: 16, right: 8, zIndex: 5,
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          background: 'transparent',
          border: `1px solid ${topoMode ? LIME : 'rgba(255,255,255,0.15)'}`,
          color: topoMode ? LIME : 'rgba(255,255,255,0.4)',
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em',
          padding: '10px 4px', cursor: 'pointer',
          transition: 'border-color 150ms, color 150ms',
        }}
      >
        {topoMode ? 'TOPOLOGY' : 'ABSTRACT'}
      </button>
      <ConeMap
        signals={replayedSignals ?? []}
        lens={selectedLens ?? 'INVESTOR'}
        selectedDomain={selection}
        clickEvent={clickEvent}
        onSelectCone={onSelectCone}
        onActiveConeChange={onActiveConeChange}
        topoMode={topoMode}
        onArcClick={onArcClick}
        maxCones={maxCones}
        dollyKey={dollyKey}
        coneColorOverrides={coneColorOverrides}
        viewportLens={viewportLens}
      />
    </div>
  );
}

// PERF (cone-rotation freeze): memoized so frequent SSE-driven App re-renders (useframestream) don't
// re-render the cone Canvas when AnalysisField's props are unchanged. Plain-component boundary — safe
// (worst case it re-renders as before); NOT an R3F-element memo (that caused the stale-scene glitch).
export default React.memo(AnalysisField);
