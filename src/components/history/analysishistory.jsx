// analysishistory.jsx -- Step 8 of the decision record (2026-10-11): the analyses a person has run, rebuilt from the durable Canonical Relationship Store
// and the persisted analytical snapshots (decision record section 4). Selecting one rebuilds it as of its own time with the SAME builders the live analysis
// uses (src/engine/historyview.js), so what History shows cannot differ from what Analysis showed. Read only; nothing here computes a new interpretation.
import React, { useEffect, useState } from 'react';
import { fetchRecentSnapshots, fetchHistory } from '../../engine/canonicalstoreclient.js';
import { reconstructSnapshot } from '../../engine/historyview.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM = 'rgba(255,255,255,0.25)';
const MID = 'rgba(255,255,255,0.55)';
const BORDER = 'rgba(26,26,26,1)';
const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; };

export default function AnalysisHistory({ inRangeFn = () => true, loader = { recent: fetchRecentSnapshots, history: fetchHistory } }) {
  const [rows, setRows] = useState(null);           // null = loading
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);           // snapshot id
  const [detail, setDetail] = useState(null);       // { snapshotId, past } | { snapshotId, error }
  // The list is read when the view mounts and again after every snapshot change in this page session (the bay stays mounted while analyses are run).
  useEffect(() => {
    let live = true; let timer = null;
    const load = () => loader.recent(60).then(r => { if (!live) return; setRows(r.snapshots); setError(r.error); });
    load();
    const onChange = () => { clearTimeout(timer); timer = setTimeout(load, 1500); };   // the snapshot record is written a moment after the freeze
    window.addEventListener('krylo-snapshot-changed', onChange);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('krylo-snapshot-changed', onChange); };
  }, []);
  const choose = async (s) => {
    if (open === s.id) { setOpen(null); setDetail(null); return; }
    setOpen(s.id); setDetail(null);
    const h = await loader.history(s.canonical_id, s.subject_node);
    if (h.error) { setDetail({ snapshotId: s.id, error: h.error }); return; }
    const snap = h.snapshots.find(x => x.id === s.id) ?? s;
    setDetail({ snapshotId: s.id, past: reconstructSnapshot(snap, h.relationships) });
  };
  const shown = (rows ?? []).filter(s => inRangeFn(Date.parse(s.generated_at)));
  return (
    <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${BORDER}` }} data-analysis-history>
      <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.2em', marginBottom: 6 }}>ANALYSIS HISTORY</div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 14 }}>
        EACH ROW IS A SAVED ANALYTICAL SNAPSHOT · REBUILT FROM THE DURABLE STORE AS OF ITS OWN TIME
      </div>
      {rows === null && <div style={{ fontSize: 8, color: DIM, letterSpacing: '0.18em' }}>LOADING…</div>}
      {error && <div style={{ fontSize: 9, color: MID }}>The durable store could not be read ({error}); analyses already saved are not lost, only not shown here.</div>}
      {rows !== null && !error && shown.length === 0 && <div style={{ fontSize: 8, color: DIM, letterSpacing: '0.18em' }}>NO SAVED ANALYSES IN THIS RANGE</div>}
      {shown.map(s => (
        <div key={s.id} style={{ borderBottom: `1px solid ${BORDER}`, padding: '8px 0' }}>
          <div onClick={() => choose(s)} style={{ cursor: 'pointer', display: 'flex', gap: 18, fontSize: 10, color: MID, alignItems: 'baseline' }}>
            <span style={{ color: LIME, width: 150, flexShrink: 0 }}>{when(s.generated_at)}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</span>
            <span style={{ width: 120, flexShrink: 0, color: DIM }}>{(s.relationship_refs ?? []).length} relationship{(s.relationship_refs ?? []).length !== 1 ? 's' : ''}</span>
            <span style={{ color: DIM }}>{open === s.id ? '▾' : '▸'}</span>
          </div>
          {open === s.id && (
            <div style={{ marginTop: 10, marginLeft: 168, fontSize: 10, color: MID, lineHeight: 1.6 }}>
              {!detail && <div style={{ color: DIM }}>Rebuilding from the store…</div>}
              {detail?.error && <div>The stored relationships could not be read ({detail.error}).</div>}
              {detail?.past && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ color: DIM, fontSize: 9 }}>Rebuilt from the durable store as of {when(detail.past.generatedAt)} · lookups: {(detail.past.lookups ?? []).map(l => `${l.kind} ${l.state}`).join(' · ') || 'none'}{detail.past.refreshOf ? ` · a refresh of ${detail.past.refreshOf}` : ''}</div>
                  {(detail.past.findings ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: DIM }}>KEY FINDINGS (rebuilt from the stored snapshot)</div>
                      {detail.past.findings.map(f => <div key={f.id}><span style={{ fontSize: 9, letterSpacing: '0.2em', color: DIM, marginRight: 8 }}>{f.strength}</span>{f.headline}</div>)}
                    </div>
                  )}
                  <div>FORMATION (admitted relationships only): {detail.past.formationSentence}</div>
                  {detail.past.relationships.map(r => (
                    <div key={r.id}>
                      <div>{r.sentence} — {r.type}</div>
                      <div style={{ marginLeft: 14, fontSize: 9, color: DIM }}>{r.provenance}</div>
                      {r.detail.map((l, i) => <div key={i} style={{ marginLeft: 14, fontSize: 9, color: DIM }}>{l}</div>)}
                    </div>
                  ))}
                  <div style={{ fontSize: 9, color: DIM }}>{detail.past.change ? `Temporal result pinned to this snapshot: ${detail.past.change.units} unit${detail.past.change.units !== 1 ? 's' : ''} (${Object.entries(detail.past.change.byExistence).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}), retrieved ${detail.past.change.retrievedAt ? when(detail.past.change.retrievedAt) : 'time not recorded'}.` : 'No temporal result was pinned to this snapshot.'}</div>
                  {detail.past.missing.length > 0 && <div style={{ fontSize: 9, color: DIM }}>{detail.past.missing.length} relationship{detail.past.missing.length !== 1 ? 's' : ''} this snapshot referred to could not be found in the store and {detail.past.missing.length !== 1 ? 'are' : 'is'} not shown.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
