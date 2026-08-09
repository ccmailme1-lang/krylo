// AnalysisField — ConeMap surface. Single state: always renders 6 domain bays.
// ACTIVE/TACTICAL/NodeMapCanvas modes killed (WO-1344 routing supersedes them).
import React, { useMemo, useRef } from 'react';
import ConeMap from '../spine/conemap.jsx';
import { LENS_EMBEDS, isEmbedLens } from '../../config/lensembeds.js';
import { usePrism } from '../../context/PrismContext.jsx';
import { buildLiveProspectus } from '../../engine/formationprospectusproducer.js';
import { CANONICAL_DOMAINS } from '../../engine/ontology.js';
import { getDomainSignals } from '../../engine/domaingravity.js';
import { classifyConvergenceState } from '../../engine/convergenceclassifier.js';
import { computeVesselPressure } from '../../engine/pressurevessel.js';
import { computeDomainFlow } from '../../engine/domainflow.js';
import { buildPerceptionField } from '../../engine/perceptionread.js';
import { inferFormation } from '../../engine/formationinference.js';
import { computeSCI, sciBand, computeISI, computeRCC } from '../../engine/structuralintegrity.js';
import { computeEQ, computeOC, computeRR, computeMA, computeUE } from '../../engine/uncertaintyenvelope.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Viridis interpolation (Founder-directed, 2026-07-27) — vibrant multi-stop heat-map color for
// SIGNAL/PRESSURE intensity fields, matching the referenced faceted-heatmap standard. t ∈ [0,1].
const VIRIDIS_STOPS = [
  [0.00, 68, 1, 84], [0.25, 59, 82, 139], [0.50, 33, 145, 140], [0.75, 94, 201, 98], [1.00, 186, 218, 85],
];
function viridis(t) {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  for (let i = 0; i < VIRIDIS_STOPS.length - 1; i++) {
    const [t0, r0, g0, b0] = VIRIDIS_STOPS[i], [t1, r1, g1, b1] = VIRIDIS_STOPS[i + 1];
    if (c >= t0 && c <= t1) {
      const f = (c - t0) / (t1 - t0);
      return `rgb(${Math.round(r0 + (r1 - r0) * f)}, ${Math.round(g0 + (g1 - g0) * f)}, ${Math.round(b0 + (b1 - b0) * f)})`;
    }
  }
  return 'rgb(253, 231, 37)';
}

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
}) {
  const { state } = usePrism();
  const viewportLens = state?.activeLens ?? 'OBSERVE'; // KRYL-1034 active lens → cone suspended HUD

  // CONVERGENCE hysteresis buffer (report-layer only — classifyConvergenceState stays a black box,
  // untouched). Per-domain sliding window, k=3, S_w = mode(H_w); ties resolved by earliest-appearance
  // in the window. Does NOT reuse convergenceclassifier.js's module-level applyTransitionPolicy buffer
  // (that's a single global singleton — unsafe for 6 concurrent per-domain histories).
  const convergenceHistoryRef = useRef({});

  // DRIFT temporal persistence (π) — per-domain, report-layer only. Increments while the classifier
  // output for that domain is UNCHANGED (including INSUFFICIENT OBSERVATION — an observation gap that
  // persists is itself a structural signal, §22). Resets to 1 on any state change.
  const driftPersistenceRef = useRef({});

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

              {/* 12 FORMATION READINESS — report-layer qualification diagnostics ONLY. formationinference.js
                  is UNCHANGED: Q still means alignment, E is still C x Q x Gbar, computed exactly as before.
                  This section answers a DIFFERENT question ("is this formation sufficiently evidenced to
                  claim?") from the engine's question ("how structurally aligned is it?"). EC and TS are
                  real, computed here from real data; RS is honestly withheld — no source exists anywhere. */}
              {(() => {
                const N_REQ = 30; // Founder-configurable evidence floor, not a universal constant
                const ec = Math.min(1, (prospectus.header.evidenceCount ?? 0) / N_REQ);
                let ts = null;
                if (historySeries.length >= 2) {
                  const vs = historySeries.map((p) => p.v);
                  const mu = vs.reduce((a, b) => a + b, 0) / vs.length;
                  if (mu < 0.0001) { ts = 0; }
                  else {
                    const sigma = Math.sqrt(vs.reduce((s2, v) => s2 + (v - mu) ** 2, 0) / vs.length);
                    ts = Math.max(0, Math.min(1, 1 - sigma / mu));
                  }
                }
                return (
                  <div style={{ marginBottom: 40 }}>
                    <SecLabel num="12" title="FORMATION READINESS" right="REPORT DIAGNOSTICS" />
                    <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: DIM, marginBottom: 18, maxWidth: 700 }}>
                      Answers a different question than E: not "how aligned is this formation" (the engine's
                      Q), but "is it sufficiently evidenced to claim." Engine output is unchanged by this section.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
                      <div style={{ padding: '16px 14px', borderRight: '1px solid rgba(245,245,247,0.10)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>EVIDENCE COVERAGE</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{ec.toFixed(2)}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{prospectus.header.evidenceCount} / {N_REQ} req. signals</div>
                      </div>
                      <div style={{ padding: '16px 14px', borderRight: '1px solid rgba(245,245,247,0.10)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>TEMPORAL STABILITY</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{ts != null ? ts.toFixed(2) : '—'}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{ts != null ? `1 − σ/μ across ${historySeries.length} frames` : 'WITHHELD · §22 · <2 frames'}</div>
                      </div>
                      <div style={{ padding: '16px 14px' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>RELATIONSHIP SUPPORT</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: FAINT }}>WITHHELD</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>§22 · required directional/structural relationship properties unavailable</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 13 STRUCTURAL INTEGRITY — KRYL-RSCH-2026-07 v0.2 implementation. Real SCI/ISI/RCC;
                  CSAT honestly withheld (no SAT/SMT solver integrated). Read-only instrument
                  calibration — never writes back to formationinference.js, never raises Gbar. */}
              {(() => {
                const domainReads = CANON.map(([, name]) => domainStats[name]).filter((d) => d?.count > 0);
                const sci = computeSCI(domainReads);
                const isi = computeISI(historySeries);
                let rcc = null;
                try {
                  const field = buildPerceptionField({ now: Date.now() });
                  if (field.particles.length) {
                    const { rcc: r } = computeRCC(() => inferFormation(field.particles, { now: 1 }), 5);
                    rcc = r;
                  }
                } catch { /* leave withheld on any failure — never fake a replay result */ }
                return (
                  <div style={{ marginBottom: 40 }}>
                    <SecLabel num="13" title="STRUCTURAL INTEGRITY" right="INSTRUMENT CALIBRATION" />
                    <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: DIM, marginBottom: 18, maxWidth: 700 }}>
                      Audits coherence of the reasoning process, not the formation itself. Can only
                      preserve, reduce, or quarantine evidential authority — never increase it.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
                      <div style={{ padding: '16px 14px', borderRight: '1px solid rgba(245,245,247,0.10)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>SCI</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{sci != null ? sci.toFixed(2) : '—'}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{sci != null ? `${sciBand(sci)} contradiction` : 'No polarized domains'}</div>
                      </div>
                      <div style={{ padding: '16px 14px', borderRight: '1px solid rgba(245,245,247,0.10)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>CSAT</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: FAINT }}>WITHHELD</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>No SAT/SMT solver integrated</div>
                      </div>
                      <div style={{ padding: '16px 14px', borderRight: '1px solid rgba(245,245,247,0.10)' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>ISI</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{isi != null ? isi.toFixed(2) : '—'}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{isi != null ? `${historySeries.length} frames` : 'WITHHELD · §22 · <2 frames'}</div>
                      </div>
                      <div style={{ padding: '16px 14px' }}>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>RCC</div>
                        <div style={{ fontFamily: MONO, fontSize: 15, color: INK }}>{rcc != null ? rcc.toFixed(2) : '—'}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{rcc != null ? '5x replay, canonical hash' : 'No particles to replay'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 14 UNCERTAINTY ENVELOPE — KRYL-RSCH-2026-07 implementation, wired (not left dead in
                  src/engine/). EQ/OC real from data already on this page; RR real (derived from the
                  doctrine's own stated "1 of 10 connection properties grounded" fact when edges
                  exist); MA always null — no validation/hold-out dataset exists anywhere in KRYLO.
                  computeUE requires all four legs — MA=null means UE honestly shows WITHHELD, not
                  a silently-defaulted score. That withheld state is the correct, visible output. */}
              {(() => {
                const eq = computeEQ([byId.FORMATION_PROPERTIES?.avgGroundedness].filter(Number.isFinite));
                const oc = computeOC(supportedSections.length, allSections.length);
                const edgeCount = byId.STRUCTURAL_RELATIONSHIPS?.edges?.length ?? 0;
                const rr = computeRR(edgeCount > 0 ? [0.10] : []); // 1 of 10 connection properties grounded (co-presence only)
                const ma = computeMA(null); // no holdout dataset — always withheld
                const ue = computeUE({ EQ: eq, OC: oc, RR: rr, MA: ma });
                return (
                  <div style={{ marginBottom: 40 }}>
                    <SecLabel num="14" title="UNCERTAINTY ENVELOPE" right={ue.ue != null ? ue.band : 'WITHHELD'} />
                    <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: DIM, marginBottom: 18, maxWidth: 700 }}>
                      "If missing or weak evidence arrived, how far could this interpretation move?"
                      Epistemic stability, not probability of truth — UE = EQ × OC × RR × MA.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
                      {[
                        ['EQ', eq, 'Evidence quality (Ḡ)'],
                        ['OC', oc, 'Observation completeness'],
                        ['RR', rr, 'Relationship reliability'],
                        ['MA', ma, 'No holdout dataset'],
                      ].map(([label, val, sub], i) => (
                        <div key={label} style={{ padding: '16px 14px', borderRight: i < 3 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FAINT, marginBottom: 8 }}>{label}</div>
                          <div style={{ fontFamily: MONO, fontSize: 15, color: val != null ? INK : FAINT }}>{val != null ? val.toFixed(2) : 'WITHHELD'}</div>
                          <div style={{ fontFamily: MONO, fontSize: 8.5, color: FAINT, marginTop: 4 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: FAINT, marginTop: 12 }}>
                      {ue.ue != null ? `UE = ${ue.ue.toFixed(3)} — ${ue.band}` : `UE: WITHHELD — no Model Adequacy source (${ue.withheld.join(', ')})`}
                    </div>
                  </div>
                );
              })()}

              {/* 15 APPENDIX */}
              <div>
                <SecLabel num="15" title="APPENDIX" />
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
  // DRIFT — facet-availability classifier 𝓓: {0,1}^4 → categorical state. Report-layer only, additive.
  // S (structure facet present) is real — domainStats.count > 0. N (narrative facet) is honestly 0
  // always — no narrative source exists anywhere. D/M (direction/magnitude) are forward-compat
  // inputs, reserved at 0 — the state space accepts them without a schema change when a real feed
  // arrives. NO divergence score is computed — DRIFT stops at classification (§22), never guesses.
  if (viewportLens === 'DRIFT') {
    const driftUrl = LENS_EMBEDS.DRIFT;
    const dDomainStats = opp?.domainStats ?? {};
    const DINK = '#F5F5F7', DDIM = 'rgba(245,245,247,0.60)', DFAINT = 'rgba(245,245,247,0.34)';
    const classifyDrift = (S, N, D, M) => {
      if (S === 0 && N === 0) return 'INSUFFICIENT OBSERVATION';
      if (S === 1 && N === 0) return 'STRUCTURE ONLY';
      if (S === 0 && N === 1) return 'NARRATIVE ONLY';
      if (D === 0 && M === 0) return 'COMPARABLE — BASE';
      if (D === 1 && M === 0) return 'COMPARABLE — DIRECTION';
      if (D === 0 && M === 1) return 'COMPARABLE — MAGNITUDE';
      return 'COMPARABLE — FULL';
    };
    const dRows = CANONICAL_DOMAINS.map((d) => {
      const name = d.toUpperCase();
      const st = dDomainStats[name] ?? { count: 0 };
      const S = st.count > 0 ? 1 : 0, N = 0, D = 0, M = 0; // N/D/M honestly unavailable today
      const dState = classifyDrift(S, N, D, M);
      // π — temporal persistence, increments on unchanged state (including INSUFFICIENT OBSERVATION)
      const prev = driftPersistenceRef.current[name];
      const pi = prev && prev.state === dState ? prev.pi + 1 : 1;
      driftPersistenceRef.current[name] = { state: dState, pi };
      return { name, S, N, D, M, state: dState, pi, count: st.count };
    });
    const dAllInsufficient = dRows.every((r) => r.state === 'INSUFFICIENT OBSERVATION');
    const dAnyComparable = dRows.some((r) => r.state.startsWith('COMPARABLE'));
    const dMacroStatus = dAllInsufficient ? 'INSUFFICIENT OBSERVATION' : dAnyComparable ? 'COMPARISON READY' : 'PARTIAL OBSERVATION';
    const dStructureOnly = dRows.filter((r) => r.state === 'STRUCTURE ONLY');
    const DSecLabel = ({ num, title, right }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: DFAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: DDIM, margin: '4px 0 16px',
                      display: 'flex', justifyContent: 'space-between' }}>
          <span>{title}</span><span style={{ color: DDIM }}>{right}</span>
        </div>
      </>
    );
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>

          {/* 01 DRIFT OVERVIEW — title communicates limitation immediately, macro status is categorical */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: DFAINT, marginBottom: 14 }}>DRIFT REPORT · 01 OVERVIEW</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: DINK, marginBottom: 10 }}>
            Structural Drift Report
          </div>
          <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.04em', color: DINK, marginBottom: 16 }}>{dMacroStatus}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: DDIM, marginBottom: 34, maxWidth: 760 }}>
            Relationship comparison between observed structural evidence and available narrative
            representation across macro domains. Answers where the two appear misaligned — never which
            is correct, whether a narrative is false, or whether an outcome will occur.
          </div>

          {/* 02 DRIFT THESIS — correct register: availability language, never accusation/intent language */}
          <div style={{ marginBottom: 34 }}>
            <DSecLabel num="02" title="DRIFT THESIS" />
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.6, color: DINK }}>
              {dStructureOnly.length > 0
                ? `The macro field exhibits available structural evidence across ${dStructureOnly.length} domain${dStructureOnly.length === 1 ? '' : 's'} (${dStructureOnly.map((r) => r.name).join(', ')}) with incomplete narrative comparison.`
                : 'No domain currently reports structural evidence sufficient to establish an observation base.'}
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.05em', color: DFAINT, marginTop: 14 }}>
                Observed divergence cannot be classified where both facets are unavailable.
              </div>
            </div>
          </div>

          {/* 03 DRIFT STATE MATRIX — the instrument: Structure x Narrative, the hero, not a chart */}
          <div style={{ marginBottom: 34 }}>
            <DSecLabel num="03" title="DRIFT STATE MATRIX" />
            <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(2, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
              <div style={{ padding: '14px' }} />
              <div style={{ padding: '14px', textAlign: 'center', borderLeft: '1px solid rgba(245,245,247,0.10)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: DFAINT }}>NARRATIVE ✓</div>
              <div style={{ padding: '14px', textAlign: 'center', borderLeft: '1px solid rgba(245,245,247,0.10)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: DFAINT }}>NARRATIVE ✕</div>

              <div style={{ padding: '14px', borderTop: '1px solid rgba(245,245,247,0.10)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: DFAINT }}>STRUCTURE ✓</div>
              <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(245,245,247,0.10)', borderLeft: '1px solid rgba(245,245,247,0.10)', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: DINK }}>COMPARABLE — BASE</div>
                <div style={{ fontFamily: MONO, fontSize: 18, color: DINK, marginTop: 6 }}>{dRows.filter((r) => r.state === 'COMPARABLE — BASE').length}</div>
              </div>
              <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(245,245,247,0.10)', borderLeft: '1px solid rgba(245,245,247,0.10)', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: DINK }}>STRUCTURE ONLY</div>
                <div style={{ fontFamily: MONO, fontSize: 18, color: DINK, marginTop: 6 }}>{dRows.filter((r) => r.state === 'STRUCTURE ONLY').length}</div>
              </div>

              <div style={{ padding: '14px', borderTop: '1px solid rgba(245,245,247,0.10)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: DFAINT }}>STRUCTURE ✕</div>
              <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(245,245,247,0.10)', borderLeft: '1px solid rgba(245,245,247,0.10)', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: DINK }}>NARRATIVE ONLY</div>
                <div style={{ fontFamily: MONO, fontSize: 18, color: DINK, marginTop: 6 }}>{dRows.filter((r) => r.state === 'NARRATIVE ONLY').length}</div>
              </div>
              <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(245,245,247,0.10)', borderLeft: '1px solid rgba(245,245,247,0.10)', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: DINK }}>INSUFFICIENT OBSERVATION</div>
                <div style={{ fontFamily: MONO, fontSize: 18, color: DINK, marginTop: 6 }}>{dRows.filter((r) => r.state === 'INSUFFICIENT OBSERVATION').length}</div>
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: DFAINT, marginTop: 10 }}>
              Direction/Magnitude facets reserved (D/M=0 today) — COMPARABLE-DIRECTION/MAGNITUDE/FULL activate without a schema change once those feeds exist.
            </div>
          </div>

          {/* 04 DOMAIN DRIFT LANDSCAPE — macro, all six domains, real per-domain classifier output */}
          <div style={{ marginBottom: 34 }}>
            <DSecLabel num="04" title="DOMAIN DRIFT LANDSCAPE" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
              {dRows.map((r, i, arr) => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '150px 110px 110px 1fr', alignItems: 'center', gap: 14,
                                          padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: DDIM }}>{r.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: DFAINT }}>Structural: {r.S ? 'AVAILABLE' : 'MISSING'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: DFAINT }}>Narrative: {r.N ? 'AVAILABLE' : 'MISSING'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: DINK, textAlign: 'right' }}>{r.state}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 05 TEMPORAL DRIFT — persistence (pi), NOT prediction. Includes INSUFFICIENT OBSERVATION. */}
          <div style={{ marginBottom: 34 }}>
            <DSecLabel num="05" title="TEMPORAL DRIFT" />
            <div style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: DFAINT, marginBottom: 14, maxWidth: 700 }}>
              π measures how long the current observational condition has persisted — not confidence,
              magnitude, or quality. A persistent observation gap is itself a signal (§22).
            </div>
            <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
              {dRows.map((r, i, arr) => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', alignItems: 'center', gap: 14,
                                          padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: DDIM }}>{r.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: DFAINT }}>{r.state}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: DINK, textAlign: 'right' }}>π = {r.pi} window{r.pi === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Structure vs Narrative Field — the graph, kept as the proof surface */}
          <div style={{ marginBottom: 34 }}>
            <DSecLabel num="" title="STRUCTURE VS NARRATIVE FIELD" />
            <div style={{ height: 480, background: 'rgba(245,245,247,0.03)', position: 'relative', overflow: 'hidden' }}>
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

          {/* 06 OBSERVATION BOUNDARY — mandatory, probably the most important section */}
          <div>
            <DSecLabel num="06" title="OBSERVATION BOUNDARY" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: DDIM }}>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Facet availability per domain.</div>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Observed relationship state and its temporal persistence.</div>
                <div><span style={{ color: DFAINT, marginRight: 8 }}>WITHHELD</span>Intent — no claim about why a facet is missing.</div>
                <div><span style={{ color: DFAINT, marginRight: 8 }}>WITHHELD</span>Future correction, divergence magnitude, or direction.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // CONVERGENCE lens — macro field-level report (LRC). CONVERGENCE already has a real, working
  // classifier (classifyConvergenceState, WO-1126A.v2) — the SAME one that colors the cones. Vector
  // built the same way scoutingreportproducer.js's coneConvergenceVector does (D=A=pressure/100,
  // T=0.5 pin, telemetryConfidence=0.7) so a domain's state here can never disagree with its cone.
  // Volatility is the REAL stddev of that domain's confidence readings — not invented. Macro framing:
  // the field is the subject ("the macro TECHNOLOGY domain contributes to..."), never a per-entity score.
  if (viewportLens === 'CONVERGENCE') {
    const cDomainStats = opp?.domainStats ?? {};
    const CINK = '#F5F5F7', CDIM = 'rgba(245,245,247,0.60)', CFAINT = 'rgba(245,245,247,0.34)';
    const CONE_T = 0.5, CONE_CONF = 0.7; // matches conemap.jsx pin (scoutingreportproducer.js CONE_VECTOR_T / CONE_TELEMETRY_CONFIDENCE)
    const STATE_COLOR = { // §6 CONVERGENCE STATE COLOR + MOTION SEMANTICS — locked tokens, not new paint
      'INSUFFICIENT SIGNAL': '#3a3d4a', 'LOW SIGNAL YIELD': '#1a1a1a',
      'BUILDING CONVERGENCE': '#66FF00', 'TURBULENT CONVERGENCE': '#007FFF', 'HIGH CONVERGENCE': '#8A2BE2',
    };
    // Hysteresis: S_w = mode(H_w) over a k=3 sliding window per domain, ties broken by earliest
    // appearance in the window. Startup frames (<k observed) are backfilled with INSUFFICIENT SIGNAL
    // so flicker is naturally suppressed rather than shown raw. Classifier itself is untouched.
    const K = 3;
    const debounce = (domain, rawLabel) => {
      const hist = convergenceHistoryRef.current;
      const h = (hist[domain] ??= []);
      h.push(rawLabel);
      if (h.length > K) h.shift();
      const filled = h.length < K ? [...Array(K - h.length).fill('INSUFFICIENT SIGNAL'), ...h] : h;
      const counts = {}, firstSeen = {};
      filled.forEach((s, i) => { counts[s] = (counts[s] ?? 0) + 1; if (!(s in firstSeen)) firstSeen[s] = i; });
      let best = filled[0], bestCount = -1, bestFirst = Infinity;
      for (const s of Object.keys(counts)) {
        if (counts[s] > bestCount || (counts[s] === bestCount && firstSeen[s] < bestFirst)) { best = s; bestCount = counts[s]; bestFirst = firstSeen[s]; }
      }
      return best;
    };
    const cRows = CANONICAL_DOMAINS.map((d) => {
      const name = d.toUpperCase();
      const st = cDomainStats[name] ?? { count: 0, mag: null };
      if (!st.count) return { name, count: 0, state: null, label: debounce(name, 'INSUFFICIENT SIGNAL') };
      const sigs = getDomainSignals(d);
      const vals = sigs.map((s) => (s.confidence ?? 0) / 100);
      const meanV = vals.reduce((a, b) => a + b, 0) / vals.length;
      const volatility = vals.length > 1
        ? Math.sqrt(vals.reduce((s2, v) => s2 + (v - meanV) ** 2, 0) / vals.length)
        : 0; // single reading → zero observed volatility, not invented
      const D = st.mag, A = st.mag; // matches coneConvergenceVector's own D=A=leverageN simplification
      const cls = classifyConvergenceState({ D, V: volatility, A, T: CONE_T }, CONE_CONF);
      const debouncedLabel = debounce(name, cls.label); // S_w — what the report displays
      return { name, count: st.count, mag: st.mag, volatility, ...cls, rawLabel: cls.label, label: debouncedLabel };
    });
    const cReporting = cRows.filter((r) => r.count > 0);
    const cStateCounts = {};
    for (const r of cReporting) cStateCounts[r.label] = (cStateCounts[r.label] ?? 0) + 1;
    const cDominant = Object.entries(cStateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'INSUFFICIENT SIGNAL';
    const cContributors = cReporting.filter((r) => r.label === cDominant).map((r) => r.name);
    const cFieldD = cReporting.length ? cReporting.reduce((s, r) => s + r.mag, 0) / cReporting.length : 0;
    const cFieldV = cReporting.length ? cReporting.reduce((s, r) => s + r.volatility, 0) / cReporting.length : 0;
    const CSecLabel = ({ num, title }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: CFAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: CDIM, margin: '4px 0 16px' }}>{title}</div>
      </>
    );
    const CBar = ({ v }) => (
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: CINK, fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(2)}</span>
        <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
          <span style={{ position: 'absolute', inset: 0, width: `${Math.round(v * 100)}%`, background: 'rgba(245,245,247,0.55)' }} />
        </span>
      </div>
    );
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>

          {/* 01 MACRO STATE OVERVIEW */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: CFAINT, marginBottom: 14 }}>CONVERGENCE REPORT · 01 MACRO STATE</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: CINK, marginBottom: 10 }}>
            Structural Convergence Report
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATE_COLOR[cDominant] }} />
            <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.04em', color: CINK }}>{cDominant}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: CDIM, marginBottom: 34, maxWidth: 760 }}>
            Measures whether independent macro forces are accumulating, conflicting, or failing to align
            across the structural environment. Classification: PROJECTION — a telemetry-derived state, not
            an observed or asserted outcome (DEF-1863). Scope: macro structural field, not any single domain.
          </div>

          {/* 02 CONVERGENCE THESIS — derived, not authored */}
          <div style={{ marginBottom: 34 }}>
            <CSecLabel num="02" title="CONVERGENCE THESIS" />
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.6, color: CINK }}>
              {cContributors.length > 0
                ? `The macro field reads ${cDominant.toLowerCase()} — ${cContributors.join(', ')} contribute to the current classification, out of ${cReporting.length} reporting domains.`
                : 'No domain currently reports sufficient signal to classify the macro field.'}
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.05em', color: CFAINT, marginTop: 14 }}>
                The classification reflects current telemetry patterns, not future certainty.
              </div>
            </div>
          </div>

          {/* 03 DOMAIN STATE LANDSCAPE — the field is the subject; domains contribute, they are not scored */}
          <div style={{ marginBottom: 34 }}>
            <CSecLabel num="03" title="DOMAIN STATE LANDSCAPE" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
              {cRows.map((r, i, arr) => {
                const filled = r.count ? Math.round((r.mag ?? 0) * 5) : 0;
                return (
                  <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 190px 60px', alignItems: 'center', gap: 14,
                                            padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: CDIM }}>macro {r.name.toLowerCase()}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em' }}>
                      <span style={{ color: CINK }}>{'●'.repeat(filled)}</span>
                      <span style={{ color: 'rgba(245,245,247,0.15)' }}>{'○'.repeat(5 - filled)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.03em', color: CDIM }}>
                      {r.count ? <><span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_COLOR[r.label] }} />{r.label}</> : 'NO SIGNAL · §22'}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: CFAINT, textAlign: 'right' }}>{r.count} sig</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 04 STATE DISTRIBUTION FIELD — the five states become visible as a field-wide tally */}
          <div style={{ marginBottom: 34 }}>
            <CSecLabel num="04" title="CONVERGENCE STATE DISTRIBUTION" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['HIGH CONVERGENCE', 'BUILDING CONVERGENCE', 'TURBULENT CONVERGENCE', 'LOW SIGNAL YIELD', 'INSUFFICIENT SIGNAL'].map((label) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: CDIM }}>{label}</span>
                  <span>{Array.from({ length: cStateCounts[label] ?? 0 }).map((_, i) => (
                    <span key={i} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: STATE_COLOR[label], marginRight: 8 }} />
                  ))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 05 CONVERGENCE DRIVERS — the D/V/A/T model, field-average, components not the formula as hero */}
          <div style={{ marginBottom: 34 }}>
            <CSecLabel num="05" title="CONVERGENCE DRIVERS" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 640 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: CFAINT, marginBottom: 8 }}>DENSITY (field avg)</div>
                <CBar v={cFieldD} />
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: CFAINT, marginBottom: 8 }}>VOLATILITY (field avg)</div>
                <CBar v={cFieldV} />
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: CFAINT, marginBottom: 8 }}>ALIGNMENT (field avg)</div>
                <CBar v={cFieldD} />
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: CFAINT, marginBottom: 8 }}>TEMPORAL (pinned)</div>
                <CBar v={CONE_T} />
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: CFAINT, marginTop: 12 }}>stateType: PROJECTION (DEF-1863)</div>
          </div>

          {/* 06 TEMPORAL PERSISTENCE — real hysteresis constant, framed macro */}
          <div style={{ marginBottom: 34 }}>
            <CSecLabel num="06" title="TEMPORAL PERSISTENCE" />
            <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: CDIM }}>
              Displayed state is debounced over a k=3 sliding window per domain (S_w = mode of the last
              3 classifications; ties resolved by earliest appearance). Applied to every state shown on
              this report, not merely described. Purpose: prevent transient macro fluctuations from
              appearing as structural transitions. Stable display does not indicate certainty.
            </div>
          </div>

          {/* 07 PROJECTION BOUNDARY — DEF-1863, mandatory and prominent */}
          <div>
            <CSecLabel num="07" title="PROJECTION BOUNDARY" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: CDIM }}>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Current macro telemetry vectors — density, volatility, alignment, temporal.</div>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Current convergence classification per domain and field-wide.</div>
                <div><span style={{ color: CFAINT, marginRight: 8 }}>WITHHELD</span>Future macro outcome.</div>
                <div><span style={{ color: CFAINT, marginRight: 8 }}>WITHHELD</span>Specific winners or losers.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // SIGNAL lens — macro field-level report (LRC). SIGNAL is the ground layer — pure observable
  // activity intensity, no classification, no state colors, no ranking language. All six domains
  // shown equally. domainStats.mag IS the signal read (scoutingreport.js signalRead: value=pressure/100);
  // count is observation depth. Nothing new computed — this is the leanest lens by design.
  if (viewportLens === 'SIGNAL') {
    const sDomainStats = opp?.domainStats ?? {};
    const SINK = '#F5F5F7', SDIM = 'rgba(245,245,247,0.60)', SFAINT = 'rgba(245,245,247,0.34)';
    const sRows = CANONICAL_DOMAINS.map((d) => {
      const name = d.toUpperCase();
      const st = sDomainStats[name] ?? { count: 0, mag: null };
      const band = !st.count ? null : st.mag >= 0.75 ? 'HIGH' : st.mag >= 0.40 ? 'MODERATE' : 'LOW';
      return { name, count: st.count, mag: st.mag ?? 0, band };
    });
    const sReporting = sRows.filter((r) => r.count > 0);
    const sHigh = sReporting.filter((r) => r.band === 'HIGH').map((r) => r.name);
    const sMod = sReporting.filter((r) => r.band === 'MODERATE').map((r) => r.name);
    const sLow = sReporting.filter((r) => r.band === 'LOW').map((r) => r.name);
    const SSecLabel = ({ num, title }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: SFAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: SDIM, margin: '4px 0 16px' }}>{title}</div>
      </>
    );
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>

          {/* 01 MACRO SIGNAL OVERVIEW */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: SFAINT, marginBottom: 14 }}>SIGNAL REPORT · 01 MACRO OVERVIEW</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: SINK, marginBottom: 16 }}>
            Structural Signal Report
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: SDIM, marginBottom: 34, maxWidth: 760 }}>
            Measures the observable intensity of structural activity across all six macro domains.
            SIGNAL represents observation, not interpretation — it does not answer why activity is
            occurring, where it is moving, or whether it converges into a formation.
          </div>

          {/* 02 COMPLETE STRUCTURAL ACTIVITY FIELD — all six domains, equal treatment, no ranking */}
          <div style={{ marginBottom: 34 }}>
            <SSecLabel num="02" title="COMPLETE STRUCTURAL ACTIVITY FIELD" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                          background: 'rgba(245,245,247,0.16)', border: '1px solid rgba(245,245,247,0.16)' }}>
              {sRows.map((r) => {
                const filled = Math.round(r.mag * 5);
                // heat wash — monochrome white-opacity intensity scaled to real magnitude (0..~0.30).
                // Same technique as the History line's shaded fill — no new hue, no semantic color.
                return (
                  <div key={r.name} style={{ background: viridis(r.mag), padding: '22px 18px', textAlign: 'center' }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: SDIM, marginBottom: 10 }}>{r.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 22, color: SINK, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>{r.mag.toFixed(2)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em' }}>
                      <span style={{ color: SINK }}>{'●'.repeat(filled)}</span>
                      <span style={{ color: 'rgba(245,245,247,0.15)' }}>{'○'.repeat(5 - filled)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 03 DOMAIN SIGNAL MATRIX — all domains, equal rows */}
          <div style={{ marginBottom: 34 }}>
            <SSecLabel num="03" title="DOMAIN SIGNAL MATRIX" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
              {sRows.map((r, i, arr) => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px 130px', alignItems: 'center', gap: 14,
                                          padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: SDIM }}>{r.name}</span>
                  <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
                    <span style={{ position: 'absolute', inset: 0, width: `${Math.round(r.mag * 100)}%`, background: 'rgba(245,245,247,0.55)' }} />
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: SINK, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.mag.toFixed(2)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: SFAINT, textAlign: 'right' }}>{r.count} observation{r.count === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 04 ACTIVITY DISTRIBUTION — field state description, not "top domains" */}
          <div style={{ marginBottom: 34 }}>
            <SSecLabel num="04" title="ACTIVITY DISTRIBUTION" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {[['HIGH ACTIVITY', sHigh], ['MODERATE ACTIVITY', sMod], ['LOW ACTIVITY', sLow]].map(([label, list]) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: SFAINT, marginBottom: 10 }}>{label}</div>
                  {list.length ? list.map((n) => (
                    <div key={n} style={{ fontFamily: MONO, fontSize: 11, color: SDIM, lineHeight: 1.8 }}>{n}</div>
                  )) : <div style={{ fontFamily: MONO, fontSize: 11, color: SFAINT }}>—</div>}
                </div>
              ))}
            </div>
          </div>

          {/* 05 OBSERVATION BOUNDARY */}
          <div>
            <SSecLabel num="05" title="OBSERVATION BOUNDARY" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: SDIM }}>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Observable activity intensity across all six macro domains.</div>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Relative signal magnitude and observation depth.</div>
                <div><span style={{ color: SFAINT, marginRight: 8 }}>WITHHELD</span>Meaning, direction, future structural change, or outcome.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // PRESSURE lens — macro field-level report (LRC). Reuses the REAL computeVesselPressure engine
  // (pressurevessel.js, P=nRT/V) rather than reimplementing the math. Pressure₀ — Structural Pressure
  // Indicator: n (signal mass) is AVAILABLE (real, from confidence); T (heat/velocity) is PARTIAL
  // (confidence reused as a stand-in — no independent velocity reading exists in the pool); V
  // (structural slack) is derived from the real magnitude spread. pressureScore, dataCompleteness,
  // and modelConfidence are kept as SEPARATE fields (§23 orthogonality) — never blended into one number.
  if (viewportLens === 'PRESSURE') {
    const PINK = '#F5F5F7', PDIM = 'rgba(245,245,247,0.60)', PFAINT = 'rgba(245,245,247,0.34)';
    const pRows = CANONICAL_DOMAINS.map((d) => {
      const name = d.toUpperCase();
      const sigs = getDomainSignals(d);
      if (!sigs.length) return { name, count: 0 };
      // Pressure₀ mapping: confidence stands in for BOTH magnitude and velocity (T is PARTIAL, not
      // independently observed). computeVesselPressure expects magnitude 0..100, velocity any scale.
      // computeVesselPressure's own contract: magnitude 0–100, velocity 0–1 (pressurevessel.js docstring).
      // Confidence is 0–100 in the pool — correct for magnitude as-is, must be /100 for velocity.
      const vp = computeVesselPressure(sigs.map((s) => ({ magnitude: s.confidence ?? 0, velocity: (s.confidence ?? 0) / 100 })));
      const dataCompleteness = sigs.length >= 2 ? 0.67 : 0.34; // n=AVAILABLE, V=AVAILABLE(if≥2 sigs) or WITHHELD, T=always PARTIAL
      const modelConfidence = dataCompleteness >= 0.6 ? 'MEDIUM' : 'LOW'; // Pressure₀ never reaches HIGH — T is never independently observed
      const band = vp.gauge >= 66 ? 'CONSTRAINED' : vp.gauge >= 33 ? 'ELEVATED' : vp.gauge > 0 ? 'ACCUMULATING' : 'LOW PRESSURE';
      return { name, count: sigs.length, ...vp, dataCompleteness, modelConfidence, band };
    });
    const pReporting = pRows.filter((r) => r.count > 0);
    const pFieldGauge = pReporting.length ? pReporting.reduce((s, r) => s + r.gauge, 0) / pReporting.length : 0;
    const pConstrained = pReporting.filter((r) => r.band === 'CONSTRAINED').map((r) => r.name);
    const pElevated = pReporting.filter((r) => r.band === 'ELEVATED').map((r) => r.name);
    const pAccumulating = pReporting.filter((r) => r.band === 'ACCUMULATING').map((r) => r.name);
    const pLow = pReporting.filter((r) => r.band === 'LOW PRESSURE').map((r) => r.name);
    const PSecLabel = ({ num, title }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: PFAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: PDIM, margin: '4px 0 16px' }}>{title}</div>
      </>
    );
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>

          {/* 01 STRUCTURAL PRESSURE OVERVIEW */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: PFAINT, marginBottom: 14 }}>PRESSURE REPORT · 01 OVERVIEW</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: PINK, marginBottom: 16 }}>
            Structural Pressure Report
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: PDIM, marginBottom: 12, maxWidth: 760 }}>
            Measures constraint — the relationship between accumulated signal mass and available structural
            capacity, not activity alone. Pressure asymptotically increases as available capacity approaches
            its floor; it is a structural indicator, not a physical singularity.
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', color: PFAINT, marginBottom: 34 }}>
            Current output: Pressure₀ — Structural Pressure Indicator (not the full Pressure₁ gauge — see §06).
          </div>

          {/* 02 PRESSURE FIELD MAP — heat wash, all six domains */}
          <div style={{ marginBottom: 34 }}>
            <PSecLabel num="02" title="PRESSURE FIELD MAP" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                          background: 'rgba(245,245,247,0.16)', border: '1px solid rgba(245,245,247,0.16)' }}>
              {pRows.map((r) => (
                <div key={r.name} style={{ background: viridis((r.gauge ?? 0) / 100), padding: '22px 18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: PDIM, marginBottom: 10 }}>{r.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 22, color: PINK, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
                    {r.count ? `${Math.round(r.gauge)}%` : '—'}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: PFAINT }}>{r.count ? r.band : 'NO SIGNAL · §22'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 03 DOMAIN CONSTRAINT SURFACE — pressureScore, dataCompleteness, modelConfidence kept separate */}
          <div style={{ marginBottom: 34 }}>
            <PSecLabel num="03" title="DOMAIN CONSTRAINT SURFACE" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)' }}>
              {pRows.map((r, i, arr) => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px 110px 90px', alignItems: 'center', gap: 14,
                                          padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: PDIM }}>{r.name}</span>
                  {r.count ? (
                    <>
                      <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
                        <span style={{ position: 'absolute', inset: 0, width: `${Math.round(r.gauge)}%`, background: 'rgba(245,245,247,0.55)' }} />
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: PINK, textAlign: 'right' }}>{Math.round(r.gauge)}%</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: PFAINT, textAlign: 'right' }}>{Math.round(r.dataCompleteness * 100)}% complete</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: PFAINT, textAlign: 'right' }}>{r.modelConfidence}</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: PFAINT, gridColumn: '2 / -1' }}>NO SIGNAL · §22</span>
                  )}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 90px 110px 90px', gap: 14, padding: '8px 16px' }}>
                <span />
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: PFAINT }}>GAUGE</span>
                <span />
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: PFAINT, textAlign: 'right' }}>DATA</span>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: PFAINT, textAlign: 'right' }}>MODEL</span>
              </div>
            </div>
          </div>

          {/* 04 PRESSURE COMPOSITION — field-wide band grouping, descriptive not alarmist (no "Critical") */}
          <div style={{ marginBottom: 34 }}>
            <PSecLabel num="04" title="PRESSURE COMPOSITION" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {[['CONSTRAINED', pConstrained], ['ELEVATED', pElevated], ['ACCUMULATING', pAccumulating], ['LOW PRESSURE', pLow]].map(([label, list]) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: PFAINT, marginBottom: 10 }}>{label}</div>
                  {list.length ? list.map((n) => (
                    <div key={n} style={{ fontFamily: MONO, fontSize: 11, color: PDIM, lineHeight: 1.8 }}>{n}</div>
                  )) : <div style={{ fontFamily: MONO, fontSize: 11, color: PFAINT }}>—</div>}
                </div>
              ))}
            </div>
          </div>

          {/* 05 CAPACITY SLACK — field-wide gauge average, the denominator made visible */}
          <div style={{ marginBottom: 34 }}>
            <PSecLabel num="05" title="CAPACITY SLACK" />
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: 10, maxWidth: 400 }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: PINK, fontVariantNumeric: 'tabular-nums' }}>{Math.round(pFieldGauge)}%</span>
              <span style={{ height: 3, background: 'rgba(245,245,247,0.10)', position: 'relative' }}>
                <span style={{ position: 'absolute', inset: 0, width: `${Math.round(pFieldGauge)}%`, background: 'rgba(245,245,247,0.55)' }} />
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: PFAINT, marginTop: 8 }}>Field-wide gauge average — % of rated ceiling in use.</div>
          </div>

          {/* 06 MODEL COMPLETENESS — unique to PRESSURE, states which inputs are real vs. stand-in */}
          <div style={{ marginBottom: 34 }}>
            <PSecLabel num="06" title="MODEL COMPLETENESS" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: PDIM }}>
                <div><span style={{ color: LIME, marginRight: 10 }}>AVAILABLE</span>Structural Mass (n) — real, from observed signal confidence.</div>
                <div><span style={{ color: PFAINT, marginRight: 10 }}>PARTIAL</span>Heat / Velocity (T) — confidence reused as a stand-in; no independent velocity reading exists.</div>
                <div><span style={{ color: PFAINT, marginRight: 10 }}>PARTIAL</span>Capacity Slack (V) — derived from magnitude spread; strongest with more observations.</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', color: PFAINT, marginTop: 14 }}>
                Current output is a Pressure Indicator, not the full Pressure gauge.
              </div>
            </div>
          </div>

          {/* 07 OBSERVATION BOUNDARY */}
          <div>
            <PSecLabel num="07" title="OBSERVATION BOUNDARY" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: PDIM }}>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Signal mass and constraint gauge per domain and field-wide.</div>
                <div><span style={{ color: PFAINT, marginRight: 8 }}>WITHHELD</span>Independently observed heat/velocity — no such reading exists in the pool.</div>
                <div><span style={{ color: PFAINT, marginRight: 8 }}>WITHHELD</span>Future constraint change, outcome, or alert-level judgment.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // FLOW lens — macro field-level report (LRC). No directed-edge source exists anywhere in the system
  // yet (getDomainSignals is flat per-domain; formation edges are undirected co-presence only). Rather
  // than fake a direction, FLOW ships as a READINESS INSTRUMENT: R = DirectedEdgeCoverage × avgGroundedness.
  // Honestly zero today (no edge source → real edges=[]), but the formula/schema is live and will light
  // up the moment a real source→target connector exists. "The engine should earn the arrow before
  // drawing the arrow."
  if (viewportLens === 'FLOW') {
    const FINK = '#F5F5F7', FDIM = 'rgba(245,245,247,0.60)', FFAINT = 'rgba(245,245,247,0.34)';
    const fD = CANONICAL_DOMAINS.length;                       // 6
    const fMaxDirected = fD * (fD - 1);                         // 30 — every possible A→B, A≠B
    const fRealEdges = [];                                      // real call — no edge source exists → honestly empty
    const fRows = computeDomainFlow(fRealEdges);                // real function, real (empty) result
    const fCoverage = fRealEdges.length / fMaxDirected;         // 0 today — not fabricated, literal
    const fAvgGroundedness = fRealEdges.length ? 1 : 0;         // no edges → nothing to average
    const fReadiness = fCoverage * fAvgGroundedness;            // R = DC × ḡ
    const FSecLabel = ({ num, title, right }) => (
      <>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: FFAINT }}>{num}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: FDIM, margin: '4px 0 16px',
                      display: 'flex', justifyContent: 'space-between' }}>
          <span>{title}</span><span style={{ color: FDIM }}>{right}</span>
        </div>
      </>
    );
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, minHeight: '100%', padding: '40px 48px 80px', boxSizing: 'border-box', zoom: 0.9 }}>

          {/* 01 MACRO FLOW OVERVIEW */}
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: FFAINT, marginBottom: 14 }}>FLOW REPORT · 01 OVERVIEW</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, color: FINK, marginBottom: 16 }}>
            Structural Flow Report
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: FDIM, marginBottom: 34, maxWidth: 760 }}>
            Measures directional structural movement between domains — a weighted directed graph
            (source → target, weight, groundedness, timestamp). No directed-edge source exists in the
            system yet; this report is a readiness instrument, not a fabricated graph.
          </div>

          {/* 02 FLOW READINESS — the hero, R = Directed Edge Coverage x avgGroundedness. Real, honestly zero. */}
          <div style={{ marginBottom: 34 }}>
            <FSecLabel num="02" title="FLOW READINESS" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FFAINT, marginBottom: 8 }}>DIRECTED EDGE COVERAGE</div>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: FINK, fontVariantNumeric: 'tabular-nums' }}>{Math.round(fCoverage * 100)}%</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: FFAINT, marginTop: 4 }}>{fRealEdges.length} / {fMaxDirected} possible edges observed</div>
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FFAINT, marginBottom: 8 }}>GROUNDED DIRECTIONAL RELATIONSHIPS</div>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: FINK, fontVariantNumeric: 'tabular-nums' }}>{fRealEdges.length}</div>
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: FFAINT, marginBottom: 8 }}>READINESS SCORE</div>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: FINK, fontVariantNumeric: 'tabular-nums' }}>{fReadiness.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', color: FFAINT, borderTop: '1px solid rgba(245,245,247,0.10)', paddingTop: 14 }}>
                STATUS: WITHHELD §22
              </div>
            </div>
          </div>

          {/* 03 DIRECTIONAL RELATIONSHIP FIELD — KRYLO's own directed-edge computation is honestly
              empty (no real edge data sourced yet, same gap as elsewhere). Rather than show a
              permanent withheld box, this reuses the FLOW lens's own published Flourish chart
              (LENS_EMBEDS.FLOW — "Capital-lime directional chord — domain flows"), the same real,
              live, already-wired visualization the main viewport shows for this lens (LSC-001). */}
          <div style={{ marginBottom: 34 }}>
            <FSecLabel num="03" title="DIRECTIONAL RELATIONSHIP FIELD" />
            <div style={{ height: LENS_EMBED.maxHeight, maxWidth: LENS_EMBED.maxWidth, margin: '0 auto',
                          border: '1px solid rgba(245,245,247,0.16)', position: 'relative', overflow: 'hidden' }}>
              {LENS_EMBEDS.FLOW ? (
                <iframe title="flow-directional-chord" src={LENS_EMBEDS.FLOW}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% + 42px)', border: 'none', display: 'block' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: FFAINT, textAlign: 'center' }}>
                    NO DIRECTED EDGES OBSERVED<br />
                    <span style={{ fontSize: 8.5 }}>The arrow is earned, not drawn — this field activates at readiness &gt; 0.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 04 DOMAIN FLOW BALANCE — NetFlow (Outflow - Inflow) per domain. Reserved: needs real edges. */}
          <div style={{ marginBottom: 34 }}>
            <FSecLabel num="04" title="DOMAIN FLOW BALANCE" right="WITHHELD" />
            <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: FFAINT }}>
              NetFlow (Nₛ = Outflowₛ − Inflowₛ) per domain requires observed directed edges. States a
              relative structural pull ("Technology exhibits greater outbound connectivity"), never a
              claim of outcome ("Technology wins") — reserved until Directed Edge Coverage &gt; 0.
            </div>
          </div>

          {/* 05 FLOW DRIVERS — the target schema (not computed data): what a real edge will carry */}
          <div style={{ marginBottom: 34 }}>
            <FSecLabel num="05" title="FLOW DRIVERS — TARGET SCHEMA" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1px solid rgba(245,245,247,0.16)' }}>
              {[['SOURCE', 'Origin of movement'], ['TARGET', 'Destination of movement'], ['WEIGHT', 'Movement magnitude'],
                ['GROUNDEDNESS', 'Evidence quality'], ['TIMESTAMP', 'Persistence / change']].map(([label, sub], i, arr) => (
                <div key={label} style={{ padding: '14px 12px', borderRight: i < arr.length - 1 ? '1px solid rgba(245,245,247,0.10)' : 'none' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: FDIM, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: FFAINT }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 06 TEMPORAL PERSISTENCE — Flow Persistence formula, reserved for v2, field held not computed */}
          <div style={{ marginBottom: 34 }}>
            <FSecLabel num="06" title="TEMPORAL PERSISTENCE" right="RESERVED — v2" />
            <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: FFAINT }}>
              Flow Persistence (P𝒻 = persistent edges / observed edges) will distinguish a single-cycle
              directional read from a sustained one (e.g. Capital → Infrastructure observed once vs. 18
              cycles). Field reserved; not computed in v1 — no observed edges exist to persist.
            </div>
          </div>

          {/* 07 OBSERVATION BOUNDARY */}
          <div>
            <FSecLabel num="07" title="OBSERVATION BOUNDARY" />
            <div style={{ border: '1px solid rgba(245,245,247,0.16)', padding: '18px 20px' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 2, color: FDIM }}>
                <div><span style={{ color: LIME, marginRight: 8 }}>SUPPORTED</span>Flow Readiness measurement itself (coverage, edge count, score) — real, computed now.</div>
                <div><span style={{ color: FFAINT, marginRight: 8 }}>WITHHELD</span>Direction, magnitude, or movement between any domains.</div>
                <div><span style={{ color: FFAINT, marginRight: 8 }}>WITHHELD</span>Domain Flow Balance (NetFlow) and Temporal Persistence.</div>
              </div>
            </div>
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
    <div style={{ position: 'absolute', inset: 0, background: 'transparent', overflow: 'hidden', pointerEvents: 'none' }}>
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
          pointerEvents: 'auto',
        }}
      >
        {topoMode ? 'TOPOLOGY' : 'ABSTRACT'}
      </button>
    </div>
  );
}

// PERF (cone-rotation freeze): memoized so frequent SSE-driven App re-renders (useframestream) don't
// re-render the cone Canvas when AnalysisField's props are unchanged. Plain-component boundary — safe
// (worst case it re-renders as before); NOT an R3F-element memo (that caused the stale-scene glitch).
export default React.memo(AnalysisField);
