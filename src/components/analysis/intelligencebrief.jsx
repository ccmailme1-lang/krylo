// WO-1341 — Intelligence Brief: Premium HUD Surface
// Houston Mission Control / Presidential Situation Room aesthetic
import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import ActionMatrix          from './actionmatrix.jsx';
import { LensRegistry }      from '../../engine/lensadapters.js';
import { synthesizeQuery }   from '../../engine/querysynthesis.js';
import { getDisplayEntity }  from '../../utils/formatters.js';

const MONO   = "'IBM Plex Mono', monospace";
const SERIF  = "Georgia, 'Times New Roman', serif";
const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const BORDER = 'rgba(255,255,255,0.08)';
const DIM    = 'rgba(255,255,255,0.25)';
const MID    = 'rgba(255,255,255,0.5)';
const BRT    = 'rgba(255,255,255,0.88)';
const LIME_DIM = 'rgba(102,255,0,0.25)';
const LIME_MID = 'rgba(102,255,0,0.5)';

// ── Data ──────────────────────────────────────────────────────────────────────
function buildBrief(session) {
  const entity  = getDisplayEntity(session?.query ?? 'Unknown Signal');
  const lens    = session?.lens  ?? null;
  const domain  = session?.tensor?.domain ?? session?.tensor?.domains?.[0] ?? 'FINANCIAL';
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8) + ' EST';

  // Use dynamic synthesis when available; fall back to adapter for custom lenses
  const synthesis = synthesizeQuery(session);
  const adapter   = LensRegistry.resolve(lens);
  const payload   = { entity, domain, lens };

  return {
    classification: '//KRYLO//SIGNAL-CLASSIFIED//ANALYTICAL-USE-ONLY//',
    subject:        entity.toUpperCase(),
    lens:           lens ?? 'UNANCHORED',
    date:           dateStr,
    asOf:           timeStr,
    originator:     'ORACLE KERNEL v3.7.2',
    domain:         domain.toUpperCase(),

    bluf:           synthesis?.bluf    ?? `Structural convergence detected in the ${domain.toLowerCase()} domain.`,
    purpose:        synthesis?.purpose ?? `To support ${lens ? lens.toLowerCase() + '-lens' : 'general'} decision-maker action.`,
    fiveWs:         synthesis?.fiveWs  ?? adapter.fiveWs?.(payload) ?? [],
    evidence:       synthesis?.evidence       ?? [],
    assumptions:    synthesis?.assumptions    ?? [],
    assessment:     synthesis?.assessment     ?? adapter.assessmentFrame(payload),
    threats:        synthesis?.threats        ?? adapter.threatContext(payload),
    opportunities:  synthesis?.opportunities  ?? adapter.opportunities(payload),
    coas:           adapter.coas(payload),
    alternativeView: synthesis?.alternativeView ?? `A minority position holds that current signals reflect seasonal variance rather than structural shift.`,
    outlook:        synthesis?.outlook ?? [
      { prob: 0.78, label: 'Phase transition completes — HIGH CONVERGENCE lock within 48h',  color: LIME },
      { prob: 0.15, label: 'Signal attenuates — BUILDING CONVERGENCE sustained without lock', color: BLUE },
      { prob: 0.07, label: 'Rapid dissolution — return to INSUFFICIENT SIGNAL baseline',      color: DIM  },
    ],
  };
}

// ── Chrome sub-components ─────────────────────────────────────────────────────

function ClassificationBanner({ text }) {
  return (
    <div style={{
      flexShrink: 0, padding: '7px 20px',
      background: 'rgba(102,255,0,0.04)',
      borderTop: `1px solid rgba(102,255,0,0.25)`,
      borderBottom: `1px solid rgba(102,255,0,0.25)`,
      textAlign: 'center',
      fontFamily: MONO, fontSize: 9, letterSpacing: '0.38em',
      color: LIME, textTransform: 'uppercase',
      position: 'relative', zIndex: 1,
    }}>
      {text}
    </div>
  );
}

function Panel({ seq, label, children }) {
  const bracketColor = 'rgba(102,255,0,0.22)';
  return (
    <div style={{ position: 'relative', marginBottom: 20, padding: '14px 14px 14px 14px' }}>
      {/* Section stamp */}
      <div style={{
        position: 'absolute', top: -7, left: 14,
        fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em',
        color: LIME_MID, background: 'transparent', padding: '0 8px',
        textTransform: 'uppercase',
      }}>
        {seq} · {label}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, valueColor = MID }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.22em', textTransform: 'uppercase', flexShrink: 0, minWidth: 'calc(72px + 1ch)' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: valueColor, letterSpacing: '0.1em' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(102,255,0,0.1)' }} />
      <div style={{ width: 3, height: 3, background: 'rgba(102,255,0,0.3)', transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: 'rgba(102,255,0,0.1)' }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function IntelligenceBrief() {
  const [premiumLocked, setPremiumLocked] = useState(true);
  const sessions  = useAnalysisStore(s => s.sessions);
  const activeId  = useAnalysisStore(s => s.activeSessionId);
  const session   = activeId ? sessions[activeId] : null;
  const [sysTime, setSysTime] = useState(() => new Date().toTimeString().slice(0, 8));

  useEffect(() => {
    const t = setInterval(() => setSysTime(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.4em', textTransform: 'uppercase' }}>No Active Session</span>
      </div>
    );
  }

  const brief = buildBrief(session);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Keyframes */}
      <style>{`
        @keyframes ib-blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes ib-scan  { 0%{transform:translateY(0)} 100%{transform:translateY(4px)} }
      `}</style>

      {/* Background layers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(102,255,0,0.048) 1px, transparent 1px)',
        backgroundSize: '22px 22px' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.056) 3px, rgba(0,0,0,0.056) 4px)' }} />

      {/* Premium lock */}
      {premiumLocked && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', color: DIM, textTransform: 'uppercase' }}>Intelligence Brief</span>
          <span style={{ fontFamily: SERIF, fontSize: 18, color: BRT }}>Premium Feature</span>
          <button onClick={() => setPremiumLocked(false)} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: LIME, background: 'transparent', border: `1px solid rgba(102,255,0,0.3)`, padding: '6px 20px', textTransform: 'uppercase', cursor: 'pointer' }}>Upgrade to Unlock</button>
        </div>
      )}

      {/* ── TOP CLASSIFICATION BANNER ─────────────────────────────────────── */}
      <ClassificationBanner text={brief.classification} />

      {/* ── MISSION HEADER ────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '8px 20px',
        borderBottom: `1px solid rgba(102,255,0,0.12)`,
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: LIME, fontSize: 7, animation: 'ib-blink 1.4s ease-in-out infinite' }}>●</span>
          <span style={{ fontFamily: MONO, fontSize: 7, color: LIME_MID, letterSpacing: '0.22em' }}>ORACLE KERNEL ACTIVE</span>
          <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.18em' }}>MISSION: {brief.subject}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.2em' }}>SIGNAL LOCK</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: LIME, letterSpacing: '0.12em' }}>{sysTime} EST</span>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 24px', position: 'relative', zIndex: 1 }}>

        {/* 00 · HEADER */}
        <Panel seq="00" label="Header & Classification">
          <FieldRow label="Subject"    value={brief.subject}    valueColor={BRT} />
          <FieldRow label="Anchor"     value={brief.lens}       valueColor={LIME} />
          <FieldRow label="Domain"     value={brief.domain}     valueColor={LIME_MID} />
          <FieldRow label="Date"       value={brief.date} />
          <FieldRow label="As Of"      value={brief.asOf} />
          <FieldRow label="Originator" value={brief.originator} valueColor={LIME_MID} />
        </Panel>

        {/* 00.5 · HP · HAPPY PATH — document layer, after classification, before BLUF */}
        {(() => {
          const arb = session?.tensor?.arbitration ?? null;
          const hp  = arb?.topK?.[0] ?? null;
          const alt = arb?.topK?.slice(1) ?? [];
          const gap = hp && alt.length > 0 ? ((hp.score - alt[0].score) * 100).toFixed(0) : null;
          if (!hp) return null;

          const rows = [
            { label: 'RANK',   value: `#${hp.dominanceRank ?? 1}`,            lime: false },
            { label: 'TYPE',   value: hp.type?.toUpperCase() ?? '—',           lime: true  },
            { label: 'SCORE',  value: `${(hp.score * 100).toFixed(0)} / 100`,  lime: true  },
            { label: 'DELTA',  value: gap ? `↑ ${gap} pts above next` : '—',  lime: false },
            { label: 'ENGINE', value: 'LEV-02 ARBITRATED',                     lime: true  },
          ];

          return (
            <div style={{ width: '100%', margin: '8px 0 16px 0', padding: '8px 14px', borderTop: '1px solid rgba(102,255,0,0.22)', borderBottom: '1px solid rgba(102,255,0,0.22)', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: 'rgba(102,255,0,0.55)', textTransform: 'uppercase' }}>HP · Happy Path</span>
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(2deg)', marginLeft: '2%', position: 'relative', top: 1 }}>
                  <ellipse cx="4"  cy="15" rx="5.5" ry="3.2" transform="rotate(-8 4 15)"  fill="#66FF00" fillOpacity="1"/>
                  <ellipse cx="10" cy="10" rx="4.2" ry="2.5" transform="rotate(-8 10 10)" fill="#66FF00" fillOpacity="0.72"/>
                  <ellipse cx="16" cy="6"  rx="3.0" ry="1.8" transform="rotate(-8 16 6)"  fill="#66FF00" fillOpacity="0.48"/>
                  <ellipse cx="20" cy="3"  rx="1.9" ry="1.1" transform="rotate(-8 20 3)"  fill="#66FF00" fillOpacity="0.28"/>
                </svg>
              </div>
              {rows.map(({ label, value, lime }) => (
                <FieldRow key={label} label={label} value={value} valueColor={lime ? LIME : MID} />
              ))}
              <div style={{ fontFamily: SERIF, fontSize: 11, color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
                {hp.content}
              </div>
            </div>
          );
        })()}

        {/* 01 · BLUF */}
        <Panel seq="01" label="BLUF · Introduction">
          <div style={{ fontFamily: SERIF, fontSize: 13, color: BRT, lineHeight: 1.8, borderLeft: `2px solid ${LIME}`, paddingLeft: 14, marginBottom: 14 }}>
            {brief.bluf}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 5 }}>Purpose</div>
          <div style={{ fontFamily: SERIF, fontSize: 11, color: MID, lineHeight: 1.7 }}>{brief.purpose}</div>
        </Panel>

        {/* 02 · BODY & KEY FINDINGS */}
        <Panel seq="02" label="Body & Key Findings">
          {/* 5 Ws */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <tbody>
              {brief.fiveWs.map(({ w, answer }) => (
                <tr key={w} style={{ borderBottom: `1px solid rgba(102,255,0,0.07)` }}>
                  <td style={{ fontFamily: MONO, fontSize: 8, color: LIME, letterSpacing: '0.2em', padding: '7px 12px 7px 0', verticalAlign: 'top', whiteSpace: 'nowrap', width: 48 }}>{w}</td>
                  <td style={{ fontFamily: SERIF, fontSize: 11, color: MID, lineHeight: 1.6, padding: '7px 0' }}>{answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Divider />
          {/* Evidence */}
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Evidence / Facts</div>
          {brief.evidence.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: LIME, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.6, letterSpacing: '0.03em' }}>{e}</span>
            </div>
          ))}
          <Divider />
          {/* Assumptions */}
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Assumptions</div>
          {brief.assumptions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, flexShrink: 0 }}>◦</span>
              <span style={{ fontFamily: SERIF, fontSize: 11, color: DIM, lineHeight: 1.6, fontStyle: 'italic' }}>{a}</span>
            </div>
          ))}
        </Panel>

        {/* 03 · DISCUSSION & ANALYSIS */}
        <Panel seq="03" label="Discussion & Analysis">
          <div style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.85, marginBottom: 14 }}>{brief.assessment}</div>
          <Divider />
          {/* Threats */}
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Threats</div>
          {brief.threats.map(({ label, level, color }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 7, color, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{level}</span>
            </div>
          ))}
          <Divider />
          {/* Opportunities */}
          <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>Opportunities</div>
          {brief.opportunities.map(({ label }, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: LIME, fontSize: 9, flexShrink: 0 }}>+</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: MID, lineHeight: 1.5 }}>{label}</span>
            </div>
          ))}
          <Divider />
          {/* Alt view */}
          <div style={{ borderLeft: `1px solid rgba(102,255,0,0.2)`, paddingLeft: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Alternative Viewpoint</div>
            <div style={{ fontFamily: SERIF, fontSize: 11, color: DIM, lineHeight: 1.6, fontStyle: 'italic' }}>{brief.alternativeView}</div>
          </div>
        </Panel>

        {/* 04 · CONCLUSION & OUTLOOK */}
        <Panel seq="04" label="Conclusion & Outlook">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brief.outlook.map(({ prob, label, color }, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color, letterSpacing: '0.06em' }}>{Math.round(prob * 100)}%</span>
                <span style={{ fontFamily: SERIF, fontSize: 12, color: MID, lineHeight: 1.6 }}>{label}</span>
              </div>
            ))}
          </div>
        </Panel>

      </div>

      {/* ── TELEMETRY STATUS BAR ──────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '6px 20px',
        borderTop: `1px solid rgba(102,255,0,0.12)`,
        borderBottom: `1px solid rgba(102,255,0,0.12)`,
        background: 'transparent',
        display: 'flex', gap: 0, alignItems: 'center',
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>
        {[
          { label: 'SIGNAL',          value: 'LOCKED',    color: LIME },
          { label: 'CONVERGENCE',     value: 'HIGH',      color: LIME },
          { label: 'FRACTURE WINDOW', value: 'OPEN · 48H',color: LIME },
          { label: 'NODES',           value: '5 / 7',     color: BLUE },
          { label: 'KERNEL',          value: 'ACTIVE',    color: LIME },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{ display: 'flex', gap: 7, alignItems: 'center', paddingRight: 20, borderRight: i < 4 ? `1px solid rgba(255,255,255,0.06)` : 'none', marginRight: 20, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em' }}>{label}</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color, letterSpacing: '0.18em' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── RECOMMENDED ACTIONS MATRIX ────────────────────────────────────── */}
      <div style={{ flexShrink: 0, height: 300, position: 'relative', zIndex: 1, opacity: 0.65 }}>
        <ActionMatrix />
      </div>

      {/* ── BOTTOM CLASSIFICATION BANNER ──────────────────────────────────── */}
      <ClassificationBanner text={brief.classification} />

    </div>
  );
}
