// WO-1341 — Intelligence Brief: Premium HUD Surface
// Houston Mission Control / Presidential Situation Room aesthetic
import React, { useState, useEffect, useRef } from 'react';
import { useAnalysisStore } from '../../store/useanalysisstore.js';
import ActionMatrix          from './actionmatrix.jsx';
import { LensRegistry }      from '../../engine/lensadapters.js';
import { synthesizeQuery }   from '../../engine/querysynthesis.js';
import { getDisplayEntity }  from '../../utils/formatters.js';
import { buildExportPayload, triggerDownload, canExport, EXPORT_FS_GATE, RUNTIME_STATE } from '../../engine/consultingexport.js';
import { validateImport, reconstructSession, reconstructAcquisition, parseImportFile } from '../../engine/consultingimport.js';

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
    cac:            (() => { const conf = synthesis?.confidence ?? 0.5; const dir = conf > 0.70 ? '↓ EASING' : conf < 0.45 ? '↑ RISING' : '→ STABLE'; return `$${Math.round(180 - conf * 80)} · ${dir} — ESTIMATED`; })(),
    roas:           (() => { const conf = synthesis?.confidence ?? 0.5; const dir = conf > 0.70 ? '↑ IMPROVING' : conf < 0.45 ? '↓ DECLINING' : '→ STABLE'; return `${(1.8 + conf * 3.2).toFixed(1)}x · ${dir} — ESTIMATED`; })(),

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
  const sessions               = useAnalysisStore(s => s.sessions);
  const activeId               = useAnalysisStore(s => s.activeSessionId);
  const pendingAcquisition     = useAnalysisStore(s => s.pendingAcquisition);
  const createSession          = useAnalysisStore(s => s.createSession);
  const setPendingAcquisition  = useAnalysisStore(s => s.setPendingAcquisition);
  const session                = activeId ? sessions[activeId] : null;
  const [sysTime, setSysTime]  = useState(() => new Date().toTimeString().slice(0, 8));
  const [exported, setExported] = useState(false);
  const [importState, setImportState] = useState(null); // { status, message, meta }
  const fileInputRef = useRef(null);

  const fs = pendingAcquisition?.fidelityScore
          ?? session?.tensor?.fidelityScore
          ?? session?.tensor?.confidence
          ?? 0;
  const exportUnlocked = canExport(fs);
  const isImported     = session?.tensor?.isImported ?? false;

  // WO-1752: runtime state
  const replayState = session?.tensor?.replayState ?? RUNTIME_STATE.LIVE;
  const replayMode  = replayState === RUNTIME_STATE.REPLAYING;

  function handleExport() {
    if (!exportUnlocked || !session) return;
    const brief   = buildBrief(session);
    const payload = buildExportPayload(brief, { ...session, pendingAcquisition }, fs);
    triggerDownload(payload);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const { json, error: parseError } = await parseImportFile(file);
    if (parseError) {
      setImportState({ status: 'error', message: 'PARSE FAILURE — invalid file' });
      return;
    }

    const validation = validateImport(json);
    if (!validation.valid) {
      const msg = {
        INVALID_SCHEMA:       'SCHEMA MISMATCH — not a Krylo export',
        MISSING_FIELDS:       'CORRUPT EXPORT — required fields missing',
        FS_BELOW_GATE:        `Fs ${Math.round((validation.fs ?? 0) * 100)}% — below import gate (70%)`,
        PARSE_FAILURE:        'PARSE FAILURE',
        HASH_MISMATCH:        'INTEGRITY FAILURE — artifact hash mismatch, possible tampering',
        PROVENANCE_INTEGRITY: `PROVENANCE BREAK — ${validation.detail ?? 'signal source not found in snapshot'}`,
        DAG_INTEGRITY:        `DAG BREAK — ${validation.detail ?? 'evidence graph invalid'}`,
        FIDELITY_MISMATCH:    `Fs INCONSISTENCY — ${validation.detail ?? 'snapshot confidence diverges from provenance'}`,
      }[validation.error] ?? 'IMPORT REJECTED';
      setImportState({ status: 'error', message: msg });
      return;
    }

    const { lens, query, tensor } = reconstructSession(json);
    const acquisition             = reconstructAcquisition(json);
    const newId                   = crypto.randomUUID();

    createSession(newId, lens, query, tensor);
    setPendingAcquisition(acquisition);

    setImportState({
      status:       'success',
      versionMatch: validation.versionMatch,
      staleDays:    validation.staleDays,
      stateType:    validation.stateType,
      timeFrozen:   validation.timeFrozen,
      replayState:  validation.replayState,
      artifactHash: validation.artifactHash,
      isV1752:      validation.isV1752,
    });
  }

  useEffect(() => {
    if (replayMode) return; // frozen clock in REPLAYING state
    const t = setInterval(() => setSysTime(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(t);
  }, [replayMode]);

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

        {/* IMPORTED ARTIFACT BANNER */}
        {isImported && importState?.status === 'success' && (
          <div style={{
            marginBottom: 14, padding: '8px 12px',
            border: `1px solid rgba(0,127,255,0.3)`,
            background: 'rgba(0,127,255,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: BLUE }}>
                ◈ {importState.replayState ?? 'REHYDRATED'} · {importState.stateType?.toUpperCase() ?? 'ANALYTICAL'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!importState.versionMatch && (
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(0,127,255,0.6)', letterSpacing: '0.12em' }}>⚠ VERSION DRIFT</span>
                )}
                {importState.isV1752 && (
                  <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(0,127,255,0.5)', letterSpacing: '0.12em' }}>✓ INTEGRITY VERIFIED</span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.1em' }}>
              FROZEN {importState.timeFrozen ? new Date(importState.timeFrozen).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—'}
              {importState.staleDays != null && importState.staleDays > 7 && (
                <span style={{ color: 'rgba(0,127,255,0.5)', marginLeft: 10 }}>
                  · {importState.staleDays}d SINCE EXPORT — VERIFY AGAINST LIVE SIGNALS
                </span>
              )}
            </div>
            {importState.artifactHash && (
              <div style={{ fontFamily: MONO, fontSize: 5.5, color: 'rgba(0,127,255,0.35)', letterSpacing: '0.1em', marginTop: 3 }}>
                HASH: {importState.artifactHash}
              </div>
            )}
          </div>
        )}

        {/* IMPORT ERROR BANNER */}
        {importState?.status === 'error' && (
          <div style={{
            marginBottom: 14, padding: '7px 12px',
            border: '1px solid rgba(255,60,60,0.3)',
            background: 'rgba(255,60,60,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.18em', color: 'rgba(255,80,80,0.8)' }}>
              ✗ IMPORT REJECTED — {importState.message}
            </span>
            <button onClick={() => setImportState(null)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: MONO, fontSize: 8 }}>✕</button>
          </div>
        )}

        {/* 00 · HEADER */}
        <Panel seq="00" label="Header & Classification">
          <FieldRow label="Subject"    value={brief.subject}    valueColor={BRT} />
          <FieldRow label="Anchor"     value={brief.lens}       valueColor={LIME} />
          <FieldRow label="Domain"     value={brief.domain}     valueColor={LIME_MID} />
          <FieldRow label="Date"       value={brief.date} />
          <FieldRow label="As Of"      value={brief.asOf} />
          <FieldRow label="Originator" value={brief.originator} valueColor={LIME_MID} />
          <FieldRow label="CAC"        value={brief.cac}        valueColor={LIME_MID} />
          <FieldRow label="ROAS"       value={brief.roas}       valueColor={LIME_MID} />
        </Panel>


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
          { label: 'SIGNAL',          value: 'LOCKED',                         color: LIME },
          { label: 'CONVERGENCE',     value: 'HIGH',                           color: LIME },
          { label: 'FRACTURE WINDOW', value: 'OPEN · 48H',                     color: LIME },
          { label: 'NODES',           value: '5 / 7',                          color: BLUE },
          { label: 'KERNEL',
            value: replayMode ? replayState : RUNTIME_STATE.LIVE,
            color: replayMode ? BLUE : LIME,
          },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{ display: 'flex', gap: 7, alignItems: 'center', paddingRight: 20, borderRight: i < 4 ? `1px solid rgba(255,255,255,0.06)` : 'none', marginRight: 20, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 6, color: DIM, letterSpacing: '0.22em' }}>{label}</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color, letterSpacing: '0.18em' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── WO-1751 CONSULTING EXPORT / IMPORT ────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <div style={{
        flexShrink: 0, padding: '8px 20px',
        borderTop: `1px solid ${exportUnlocked ? 'rgba(102,255,0,0.18)' : 'rgba(255,255,255,0.05)'}`,
        background: exportUnlocked ? 'rgba(102,255,0,0.03)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.28em', color: exportUnlocked ? LIME_MID : DIM }}>
            CONSULTING I/O · WO-1752
          </span>
          <span style={{ fontFamily: MONO, fontSize: 5.5, letterSpacing: '0.14em', color: DIM }}>
            {exportUnlocked
              ? `Fs ${Math.round(fs * 100)}% — PROVENANCE-TRACED JSON READY`
              : `Fs ${Math.round(fs * 100)}% — EXPORT REQUIRES ${Math.round(EXPORT_FS_GATE * 100)}%`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em',
              textTransform: 'uppercase', cursor: 'pointer',
              background: 'transparent',
              border: '1px solid rgba(0,127,255,0.3)',
              color: BLUE,
              padding: '5px 14px',
              transition: 'all 200ms ease',
            }}
          >
            IMPORT BRIEF
          </button>
          <button
            onClick={handleExport}
            disabled={!exportUnlocked}
            style={{
              fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em',
              textTransform: 'uppercase', cursor: exportUnlocked ? 'pointer' : 'not-allowed',
              background: 'transparent',
              border: `1px solid ${exportUnlocked ? 'rgba(102,255,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: exportUnlocked ? LIME : DIM,
              padding: '5px 14px',
              opacity: exportUnlocked ? 1 : 0.4,
              transition: 'all 200ms ease',
            }}
          >
            {exported ? '✓ EXPORTED' : 'EXPORT BRIEF'}
          </button>
        </div>
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
