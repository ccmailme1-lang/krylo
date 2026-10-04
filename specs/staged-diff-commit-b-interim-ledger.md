# Staged diff — Commit B (INTERIM: interpretation ledger + chip relocation)

Generated verbatim from `git diff --cached` on 2026-09-25 (no filtering, no truncation).
Not a completion of semantic integrity. Commit A is 47a6dbf.

## Staged files

```
 src/components/analysis/analysisidlefield.jsx | 194 ++++++++++----------------
 src/components/analysis/intelligencebrief.jsx |  14 ++
 src/components/analysis/targetpacket.jsx      |  26 ++++
 src/engine/analysisintent.js                  |  92 ++++++++++++
 src/engine/interpretationledger.test.mjs      |  85 +++++++++++
 5 files changed, 292 insertions(+), 119 deletions(-)
```

## Full diff

```diff
diff --git a/src/components/analysis/analysisidlefield.jsx b/src/components/analysis/analysisidlefield.jsx
index 0982a6b..df52a27 100644
--- a/src/components/analysis/analysisidlefield.jsx
+++ b/src/components/analysis/analysisidlefield.jsx
@@ -1783,48 +1783,8 @@ export default function AnalysisIdleField({ activeCones = null, onDomainSelect =
                       caretColor: LIME, outline: 'none',
                     }}
                   />
-                  {/* Toolbar */}
-                  <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
-                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
-                      {/* + attachment */}
-                      <div style={{ position: 'relative' }}>
-                        <button
-                          onClick={() => setPlusOpen(p => !p)}
-                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, padding: 0 }}
-                        >+</button>
-                        {plusOpen && (
-                          <div style={{ position: 'absolute', bottom: 36, left: 0, background: '#111', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 200, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
-                            {[
-                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>, label: 'Upload document' },
-                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6m-3-3v6"/></svg>, label: 'Import from file' },
-                            ].map(({ icon, label }) => (
-                              <button key={label} onClick={() => setPlusOpen(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.72)', cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
-                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
-                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
-                              >
-                                <span style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{icon}</span>{label}
-                              </button>
-                            ))}
-                          </div>
-                        )}
-                      </div>
-                      {/* Exclude sim */}
-                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}>
-                        <input type="checkbox" checked={excludeSimulator} onChange={e => setExcludeSimulator(e.target.checked)} style={{ accentColor: LIME, width: 11, height: 11, cursor: 'pointer' }} />
-                        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: excludeSimulator ? 'rgba(102,255,0,0.6)' : 'rgba(255,255,255,0.22)', textTransform: 'uppercase', transition: 'color 150ms' }}>EXCLUDE SIM</span>
-                      </label>
-                    </div>
-                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
-                      <button style={{ width: 30, height: 30, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
-                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
-                      </button>
-                      <button onClick={handleExecute} style={{ width: 34, height: 34, borderRadius: '50%', background: LIME, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
-                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
-                      </button>
-                    </div>
-                  </div>
-                </div>
-
+                  {/* Chips live INSIDE the search box (Founder rule 2026-09-24: no chip renders outside the box). */}
+                  <div style={{ padding: '0 24px 8px' }}>
                 {/* ── SELECTED STRUCTURAL REFINEMENTS (KRYL-1306 §6/§24-25) ── */}
                 {/* Visual-only breadcrumb: originalQuery + [refinement] + [refinement]. Never
                     mutates seedQuery/the textarea (§4, §13, §9) — this is the additive-payload
@@ -1890,82 +1850,6 @@ export default function AnalysisIdleField({ activeCones = null, onDomainSelect =
                     </div>
                   );
                 })()}
-
-                {/* ── SIGNAL SCOPE ── */}
-                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
-                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.28em', marginRight: 4, flexShrink: 0 }}>SIGNAL SCOPE</span>
-                  {SIGNAL_SCOPE_OPTIONS.map(({ key, label }) => {
-                    const active = signalScope === key;
-                    return (
-                      <button key={key} onClick={() => setSignalScope(key)} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', padding: '4px 11px', borderRadius: 999, cursor: 'pointer', background: 'transparent', border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.1)'}`, color: active ? LIME : 'rgba(255,255,255,0.28)', transition: 'all 120ms' }}>
-                        {active ? '● ' : '○ '}{label}
-                      </button>
-                    );
-                  })}
-                </div>
-
-                {/* ── OUTPUT FILTERS ── */}
-                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
-                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.28em', flexShrink: 0 }}>OUTPUT</span>
-                  {OUTPUT_FILTERS_DEF.map(({ key, label }) => (
-                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
-                      <input type="checkbox" checked={outputFilters[key]} onChange={e => {
-                        // KRYL-1244 — apply live to the active session so the brief re-gates
-                        // immediately; no re-execute, no re-synthesis.
-                        const next = { ...outputFilters, [key]: e.target.checked };
-                        setOutputFilters(next);
-                        if (activeSessionId) storeSetOutputFilters(activeSessionId, next);
-                      }} style={{ accentColor: LIME, width: 10, height: 10, cursor: 'pointer' }} />
-                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: outputFilters[key] ? 'rgba(102,255,0,0.65)' : 'rgba(255,255,255,0.22)', transition: 'color 120ms' }}>{label}</span>
-                    </label>
-                  ))}
-                </div>
-
-                {/* ── AUTONOMOUS INQUIRY (KRYL-1290) ── */}
-                {/* Pre-question discovery layer: "what could I examine from what I just
-                    typed" — visible only while raw interest exists and no situation has
-                    been selected yet. Labels are mechanical placeholders, not final copy —
-                    see inquirygeneration.js header. Styling reuses the existing COMPLETE
-                    THE PICTURE pill precedent below, unchanged.
-                    KRYL-1306 correction (Founder-directed, supersedes the KRYL-1290 subtask 5
-                    comment this replaced): selecting an inquiry chip adds it as a chip token to
-                    the same +ADDED box structural refinements use — it never writes
-                    chip.question into seedQuery/the textarea. The earlier "append to the
-                    sentence" behavior was tried and explicitly reverted; the textarea stays
-                    untouched, no new state beyond the shared selectedRefinementIds, no submit,
-                    no activeSituation mutation.
-                    DEF (KRYL-1290 follow-up) — gated on !processing: handleExecute()
-                    sets processing true as its first line, well before the 900ms
-                    session-creation delay. Without this gate, selecting a chip could
-                    still recompute a new candidate set in the moment right after
-                    execute was clicked but before results replaced the view — a race
-                    with no usable selection window. Standard practice (follow-up-chip
-                    UX patterns, researched) never shows a new set while a request is
-                    in flight; new chips belong attached to the next completed
-                    response, not competing with an in-progress submit. */}
-                {seedQuery.trim().length > 0 && activeSituation == null && !processing && inquiryChips.length > 0 && (
-                  <div style={{ marginTop: 20 }}>
-                    <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', marginBottom: 10 }}>WHAT TO EXAMINE</div>
-                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
-                      {inquiryChips.map(chip => {
-                        const active = selectedRefinementIds.includes(chip.id);
-                        return (
-                          <button
-                            key={chip.id}
-                            onClick={() => toggleRefinement(chip)}
-                            style={{
-                              fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em',
-                              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
-                              background: 'rgba(102,255,0,0.06)', border: `1px solid ${LIME}`,
-                              color: LIME, whiteSpace: 'nowrap', transition: 'all 140ms',
-                            }}
-                          >{active ? '✓ ' : '+ '}{chip.label}</button>
-                        );
-                      })}
-                    </div>
-                  </div>
-                )}
-
                 {/* ── COMPLETE THE PICTURE (KRYL-1222) ── */}
                 {/* Prescriptive layer: what the query is missing, not what it typed (that's
                     TRENDING). Derivation is the activeCompletionChips memo above. A chip states
@@ -1994,7 +1878,6 @@ export default function AnalysisIdleField({ activeCones = null, onDomainSelect =
                     </div>
                   </div>
                 )}
-
                 {/* ── STRUCTURAL SIGNAL CHIPS (KRYL-1304 substrate + KRYL-1306 refinement
                     selection) ── */}
                 {/* Pure render of eligibleRefinementChips (computed above via chipsubstrate.js —
@@ -2017,6 +1900,79 @@ export default function AnalysisIdleField({ activeCones = null, onDomainSelect =
                     />
                   </div>
                 )}
+                  </div>
+                  {/* Toolbar */}
+                  <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
+                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
+                      {/* + attachment */}
+                      <div style={{ position: 'relative' }}>
+                        <button
+                          onClick={() => setPlusOpen(p => !p)}
+                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, padding: 0 }}
+                        >+</button>
+                        {plusOpen && (
+                          <div style={{ position: 'absolute', bottom: 36, left: 0, background: '#111', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 200, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
+                            {[
+                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>, label: 'Upload document' },
+                              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6m-3-3v6"/></svg>, label: 'Import from file' },
+                            ].map(({ icon, label }) => (
+                              <button key={label} onClick={() => setPlusOpen(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.72)', cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
+                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
+                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
+                              >
+                                <span style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{icon}</span>{label}
+                              </button>
+                            ))}
+                          </div>
+                        )}
+                      </div>
+                      {/* Exclude sim */}
+                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}>
+                        <input type="checkbox" checked={excludeSimulator} onChange={e => setExcludeSimulator(e.target.checked)} style={{ accentColor: LIME, width: 11, height: 11, cursor: 'pointer' }} />
+                        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', color: excludeSimulator ? 'rgba(102,255,0,0.6)' : 'rgba(255,255,255,0.22)', textTransform: 'uppercase', transition: 'color 150ms' }}>EXCLUDE SIM</span>
+                      </label>
+                    </div>
+                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
+                      <button style={{ width: 30, height: 30, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
+                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
+                      </button>
+                      <button onClick={handleExecute} style={{ width: 34, height: 34, borderRadius: '50%', background: LIME, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
+                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
+                      </button>
+                    </div>
+                  </div>
+                </div>
+
+                {/* ── SIGNAL SCOPE ── */}
+                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
+                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.28em', marginRight: 4, flexShrink: 0 }}>SIGNAL SCOPE</span>
+                  {SIGNAL_SCOPE_OPTIONS.map(({ key, label }) => {
+                    const active = signalScope === key;
+                    return (
+                      <button key={key} onClick={() => setSignalScope(key)} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', padding: '4px 11px', borderRadius: 999, cursor: 'pointer', background: 'transparent', border: `1px solid ${active ? LIME : 'rgba(255,255,255,0.1)'}`, color: active ? LIME : 'rgba(255,255,255,0.28)', transition: 'all 120ms' }}>
+                        {active ? '● ' : '○ '}{label}
+                      </button>
+                    );
+                  })}
+                </div>
+
+                {/* ── OUTPUT FILTERS ── */}
+                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
+                  <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.28em', flexShrink: 0 }}>OUTPUT</span>
+                  {OUTPUT_FILTERS_DEF.map(({ key, label }) => (
+                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
+                      <input type="checkbox" checked={outputFilters[key]} onChange={e => {
+                        // KRYL-1244 — apply live to the active session so the brief re-gates
+                        // immediately; no re-execute, no re-synthesis.
+                        const next = { ...outputFilters, [key]: e.target.checked };
+                        setOutputFilters(next);
+                        if (activeSessionId) storeSetOutputFilters(activeSessionId, next);
+                      }} style={{ accentColor: LIME, width: 10, height: 10, cursor: 'pointer' }} />
+                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: outputFilters[key] ? 'rgba(102,255,0,0.65)' : 'rgba(255,255,255,0.22)', transition: 'color 120ms' }}>{label}</span>
+                    </label>
+                  ))}
+                </div>
+
 
               </div>
 
diff --git a/src/components/analysis/intelligencebrief.jsx b/src/components/analysis/intelligencebrief.jsx
index 825ee70..01a50a6 100644
--- a/src/components/analysis/intelligencebrief.jsx
+++ b/src/components/analysis/intelligencebrief.jsx
@@ -35,6 +35,7 @@ import { resolveHomePurchaseEvidence } from '../../engine/homePurchaseEvidence.j
 import WhyThisMatters from './whythismatters.jsx';
 import { computeCounterEvidenceState, COUNTER_EVIDENCE_STATE } from '../../engine/counterevidence.js';
 import PerceptionRisk from './perceptionrisk.jsx';
+import { buildInterpretationLedger } from '../../engine/analysisintent.js';
 import { useMetricVisibility } from '../../hooks/useMetricVisibility.js';
 import { logEmission, logOutcome, getLRPrior, getByConvictionId } from '../../engine/pathstore.js';
 // KRYL-1293 — arbitrateHP() (hptiergate.js) retired here; see the real-pipeline note below.
@@ -1256,6 +1257,19 @@ export default function IntelligenceBrief() {
           <FieldRow label="Originator" value={brief.originator} valueColor={LIME_MID} />
         </Panel>
 
+        {(() => {
+          const L = buildInterpretationLedger(session?.tensor?.analysisIntent);
+          if (!L || !(L.unaddressed.length > 0)) return null;
+          return (
+            <Panel seq="00" label="Interpretation Ledger">
+              <FieldRow label="Question"    value={L.verbatim} valueColor={BRT} />
+              <FieldRow label="Established" value={L.established.length ? L.established.join(' · ') : 'nothing from the question was established'} />
+              <FieldRow label="Not carried" value={L.unaddressed.join(' · ')} />
+              <FieldRow label="Basis"       value={L.basis} />
+            </Panel>
+          );
+        })()}
+
         {/* KRYL-1294 -- DIC missing-inputs, rendered inside the one Happy Path template
             instead of replacing it. Same InsufficientInput component as before, same
             required fields from the DIC, same disabled-until-filled submit -- only the
diff --git a/src/components/analysis/targetpacket.jsx b/src/components/analysis/targetpacket.jsx
index 5792d63..3ea1434 100644
--- a/src/components/analysis/targetpacket.jsx
+++ b/src/components/analysis/targetpacket.jsx
@@ -14,6 +14,7 @@ import { emitTelemetry }    from '../../engine/telemetry.js';
 import { getDisplayEntity }  from '../../utils/formatters.js';
 import DomainSubstrateTabs   from './domainsubstratetabs.jsx';
 import { subjectScope }       from '../../engine/subjectscope.js';
+import { buildInterpretationLedger } from '../../engine/analysisintent.js';
 import { frameHeadline }      from '../../engine/frameclassify.js';
 import { resolveWhyTrace, WT_STATE } from '../../engine/whytraceresolver.js';
 import { getCanonicalEvents } from '../../engine/connectors/edgar8kevidence.js';
@@ -424,6 +425,7 @@ export default function TargetPacket() {
     () => assembleNarrative({ analysisIntent, fieldFormation, subjScope, reconnPayload }),
     [analysisIntent, fieldFormation, subjScope, reconnPayload]
   );
+  const ledger = useMemo(() => buildInterpretationLedger(analysisIntent), [analysisIntent]);
   const recognizedFrame = (() => {
     const d = synthesis?.queryDomain;
     if (!d || ['GENERAL', 'AMBIGUOUS', 'COMPARATIVE'].includes(d)) return null;
@@ -704,6 +706,11 @@ export default function TargetPacket() {
           <p style={{ margin: 0, maxWidth: 720, fontFamily: SERIF, fontSize: 14, lineHeight: 1.75, color: BODY_C }}>
             {narrative.paragraph}
           </p>
+          {ledger && (ledger.unaddressed.length > 0) && (
+            <p style={{ margin: '10px 0 0', maxWidth: 720, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6, color: ABSENCE }}>
+              This narrative does not address: {ledger.unaddressed.join(' · ')}. {ledger.basis}
+            </p>
+          )}
         </div>
 
         {/* ── 00 READ (KRYL-1290 subtask 7) — KRYLO's interpretation of the formed
@@ -755,6 +762,25 @@ export default function TargetPacket() {
                   </span>
                 </div>
               )}
+              {(() => {
+                const L = ledger;
+                if (!L) return null;
+                return (
+                  <div style={{ marginTop: 6, paddingTop: 10, borderTop: `1px solid ${HAIRLINE}`, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.6 }}>
+                    <div><span style={{ color: LBL_DIM, letterSpacing: '0.14em' }}>QUESTION AS ASKED </span><span style={{ color: '#eceee9' }}>{L.verbatim}</span></div>
+                    <div><span style={{ color: LBL_DIM, letterSpacing: '0.14em' }}>ESTABLISHED </span>
+                      <span style={{ color: '#eceee9' }}>{L.established.length ? L.established.join(' · ') : 'nothing from the question was established'}</span></div>
+                    {L.comparison.map(c => (
+                      <div key={c.operand}><span style={{ color: LBL_DIM, letterSpacing: '0.14em' }}>COMPARISON OPERAND </span>
+                        <span style={{ color: '#eceee9' }}>{c.operand}</span>
+                        <span style={{ color: c.observed ? '#eceee9' : ABSENCE }}>{c.observed ? ' — observed below' : ' — not observed in this packet'}</span></div>
+                    ))}
+                    <div><span style={{ color: LBL_DIM, letterSpacing: '0.14em' }}>NOT CARRIED INTO OBSERVATION </span>
+                      <span style={{ color: L.notCarried.length ? ABSENCE : '#eceee9' }}>{L.notCarried.length ? L.notCarried.join(' · ') : 'none'}</span></div>
+                    <div><span style={{ color: LBL_DIM, letterSpacing: '0.14em' }}>OBSERVATION BASIS </span><span style={{ color: '#eceee9' }}>{L.basis}</span></div>
+                  </div>
+                );
+              })()}
             </div>
           </PacketSection>
         )}
diff --git a/src/engine/analysisintent.js b/src/engine/analysisintent.js
index 4143ec6..f4b44fc 100644
--- a/src/engine/analysisintent.js
+++ b/src/engine/analysisintent.js
@@ -238,3 +238,95 @@ export function buildAnalysisIntent(question) {
     version: ANALYSIS_INTENT_VERSION,
   };
 }
+
+const LEDGER_STOPWORDS = new Set([
+  'the', 'a', 'an', 'in', 'on', 'for', 'of', 'with', 'to', 'and', 'or', 'is', 'are', 'was', 'were',
+  'be', 'been', 'do', 'does', 'did', 'at', 'by', 'from', 'as', 'that', 'this', 'these', 'those',
+  'it', 'its', 'their', 'our', 'my', 'we', 'i', 'you', 'me', 'us', 'about', 'into', 'than', 'then',
+  'what', 'which', 'who', 'whom', 'how', 'why', 'when', 'where', 'can', 'could', 'should', 'would',
+  'will', 'may', 'might', 'if', 'so', 'not', 'no', 'any', 'all', 'some', 'there', 'have', 'has',
+  'had', 'between', 'over', 'under', 'per', 'vs', 'versus', 'compared', 'compare', 'comparing',
+  'show', 'map', 'find', 'give', 'tell', 'identify', 'list', 'analyze', 'analyse', 'evaluate',
+]);
+
+function ledgerTokens(text) {
+  return ((text ?? '').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).map(t => t.replace(/['’]s$/i, ''));
+}
+
+function tokenSet(text) {
+  return new Set(ledgerTokens(text).map(t => t.toLowerCase()));
+}
+
+// buildInterpretationLedger -- pure, read-only derivation over an already-built analysisIntent.
+// Interprets nothing new: it reports (a) what the intent established, (b) which words of the
+// verbatim question are covered by nothing established (mechanical token subtraction, no
+// entity recognition, no inference), and (c) what the observations that follow are bound to.
+export function buildInterpretationLedger(intent) {
+  if (!intent || intent.question?.state !== 'resolved') return null;
+  const text = intent.question.value.text ?? '';
+  const subj = intent.subject?.state === 'resolved' ? intent.subject.value : null;
+  const entityName = subj?.kind === 'ENTITY' ? subj.entity.name : null;
+
+  const covered = new Set();
+  if (entityName) {
+    tokenSet(entityName).forEach(t => covered.add(t));
+    tokenSet(subj.matchedOn).forEach(t => covered.add(t));
+  }
+  if (intent.objective?.state === 'resolved' && intent.objective.value.cues) {
+    intent.objective.value.cues.forEach(c => tokenSet(String(c)).forEach(t => covered.add(t)));
+  }
+
+  const established = [];
+  if (entityName) established.push(`subject: ${entityName}`);
+  else if (subj) established.push(`subject frame: ${subj.kind.replace(/_/g, ' ').toLowerCase()}`);
+  if (intent.observationalScope?.state === 'resolved') {
+    established.push(`scope: ${intent.observationalScope.value.join(', ')}`);
+  }
+  if (intent.objective?.state === 'resolved') {
+    established.push(intent.objective.value.cues
+      ? `objective cues: ${intent.objective.value.cues.join(', ')}`
+      : 'objective: scenario structure');
+  }
+
+  const comparison = [];
+  if (intent.rCmp?.state === 'resolved') {
+    for (const op of [intent.rCmp.value.subject_a, intent.rCmp.value.subject_b]) {
+      const opT = [...tokenSet(String(op))];
+      const enT = [...tokenSet(entityName ?? '')];
+      const observed = !!entityName && opT.length > 0 && enT.length > 0 && (
+        opT.every(t => enT.includes(t)) || enT.every(t => opT.includes(t))
+      );
+      comparison.push({ operand: op, observed });
+    }
+  }
+
+  const notCarried = [];
+  let run = [];
+  for (const tok of ledgerTokens(text)) {
+    const lc = tok.toLowerCase();
+    if (covered.has(lc) || LEDGER_STOPWORDS.has(lc)) {
+      if (run.length) { notCarried.push(run.join(' ')); run = []; }
+    } else run.push(tok);
+  }
+  if (run.length) notCarried.push(run.join(' '));
+
+  const objectiveOpen = intent.objective?.state !== 'resolved';
+  const unobservedOperand = comparison.some(c => !c.observed);
+  const answersNothingAbout = notCarried.length > 0 || objectiveOpen || unobservedOperand;
+
+  let basis;
+  if (entityName) {
+    basis = `Observations in this packet are bound to ${entityName} alone.` +
+      (answersNothingAbout
+        ? ` They describe ${entityName}; they do not answer the relationship, comparison or objective the question asks about.`
+        : '');
+  } else {
+    basis = 'Observations in this packet are the live field. They are not scoped to a subject named in the question and do not answer it.';
+  }
+
+  const seen = new Set();
+  const unaddressed = [...comparison.filter(c => !c.observed).map(c => c.operand), ...notCarried]
+    .filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
+
+  return { verbatim: text, established, comparison, notCarried, unaddressed, basis };
+}
diff --git a/src/engine/interpretationledger.test.mjs b/src/engine/interpretationledger.test.mjs
new file mode 100644
index 0000000..24af8dc
--- /dev/null
+++ b/src/engine/interpretationledger.test.mjs
@@ -0,0 +1,85 @@
+// Run: node src/engine/interpretationledger.test.mjs
+import assert from 'node:assert/strict';
+import { buildAnalysisIntent, buildInterpretationLedger } from './analysisintent.js';
+
+let fail = 0;
+function test(name, fn) {
+  try { fn(); console.log(`  PASS  ${name}`); }
+  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
+}
+const L = q => buildInterpretationLedger(buildAnalysisIntent(q));
+const has = (arr, w) => arr.some(x => x.toLowerCase().split(/\s+/).includes(w.toLowerCase()));
+
+test('Lockheed + krill: verbatim kept, krill NOT carried, Lockheed established, basis says not answered', () => {
+  const q = 'How does Lockheed Martin relate to the Antarctic krill fishery?';
+  const l = L(q);
+  assert.equal(l.verbatim, q);
+  assert.ok(l.established.includes('subject: LOCKHEED MARTIN'));
+  for (const w of ['Antarctic', 'krill', 'fishery']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
+  assert.ok(!has(l.notCarried, 'Lockheed'), 'Lockheed must not be listed as uncarried');
+  assert.ok(l.basis.startsWith('Observations in this packet are bound to LOCKHEED MARTIN alone.'));
+  assert.ok(l.basis.includes('do not answer'));
+});
+test("Possessive: Lockheed Martin's ownership -> Martin's is NOT listed as uncarried", () => {
+  const l = L("What is the structural relationship between Lockheed Martin's ownership and the Antarctic krill fishery?");
+  assert.ok(!has(l.notCarried, 'Martin') && !has(l.notCarried, "Martin's"), 'possessive of a resolved name must be covered');
+  assert.ok(has(l.notCarried, 'krill'));
+});
+test('FedEx and UPS: both names not carried; basis is live-field and says not answered', () => {
+  const l = L('Compare FedEx and UPS supply chain exposure');
+  assert.ok(has(l.notCarried, 'FedEx'));
+  assert.ok(has(l.notCarried, 'UPS'));
+  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
+  assert.ok(l.basis.includes('do not answer it'));
+});
+test('Google vs Microsoft: Google unobserved, Microsoft observed, Google in unaddressed once', () => {
+  const l = L('Compare Google vs Microsoft acquisition strategy');
+  assert.equal(l.comparison.length, 2);
+  assert.equal(l.comparison.find(c => c.operand === 'Google').observed, false);
+  assert.equal(l.comparison.find(c => /^Microsoft/.test(c.operand)).observed, true);
+  assert.equal(l.unaddressed.filter(x => x.toLowerCase() === 'google').length, 1);
+  assert.ok(l.basis.includes('do not answer'));
+});
+test('Investment: nothing established; 55/old/male and investment not carried; live-field basis', () => {
+  const l = L('What investment options make sense for a 55 year old male?');
+  assert.deepEqual(l.established, []);
+  for (const w of ['investment', '55', 'male']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
+  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
+});
+test('Unnamed logistics: nothing established; ports/container/shipping/failure not carried', () => {
+  const l = L('Which ports create the largest single point of failure for our container shipping?');
+  assert.deepEqual(l.established, []);
+  for (const w of ['ports', 'container', 'shipping', 'failure']) assert.ok(has(l.notCarried, w), `${w} must be not-carried`);
+  assert.ok(l.basis.startsWith('Observations in this packet are the live field.'));
+});
+test('No intent / empty question returns null (no crash)', () => {
+  assert.equal(buildInterpretationLedger(null), null);
+  assert.equal(buildInterpretationLedger(undefined), null);
+  assert.equal(buildInterpretationLedger(buildAnalysisIntent('')), null);
+});
+
+// Operand matching edge cases (hand-built intents; matcher only)
+function opIntent(entityName, matchedOn, a, b) {
+  return {
+    question: { state: 'resolved', value: { text: `${a} vs ${b}` } },
+    subject: { state: 'resolved', value: { kind: 'ENTITY', entity: { name: entityName }, matchedOn } },
+    objective: { state: 'unresolved' }, observationalScope: { state: 'unresolved' },
+    rCmp: { state: 'resolved', value: { subject_a: a, subject_b: b, condition: null } },
+  };
+}
+test('operand edge: "metadata vendor" must NOT match entity META PLATFORMS', () => {
+  const l = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'metadata vendor', 'Acme'));
+  assert.equal(l.comparison.find(c => c.operand === 'metadata vendor').observed, false);
+});
+test('operand edge: "Apple" must NOT match entity PINEAPPLE HOLDINGS', () => {
+  const l = buildInterpretationLedger(opIntent('PINEAPPLE HOLDINGS', 'Pineapple', 'Apple', 'Acme'));
+  assert.equal(l.comparison.find(c => c.operand === 'Apple').observed, false);
+});
+test('operand edge: exact "Meta" and "Meta Platforms" DO match', () => {
+  const l1 = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'Meta', 'Acme'));
+  const l2 = buildInterpretationLedger(opIntent('META PLATFORMS', 'Meta', 'Meta Platforms', 'Acme'));
+  assert.equal(l1.comparison[0].observed, true);
+  assert.equal(l2.comparison[0].observed, true);
+});
+console.log(fail ? `${fail} FAILED` : 'ALL PASS');
+process.exit(fail ? 1 : 0);
```
