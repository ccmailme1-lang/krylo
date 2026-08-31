// qa_kryl1244_outputfilters.mjs — DEF-1244.
// The OUTPUT filters (PRECURSORS / RISKS / OPPORTUNITIES / CONTRADICTIONS) must
// live-toggle the brief for the ACTIVE session — no re-execute, no re-synthesis —
// and each label must match the section it gates, with no orphan divider.
//
// Run: node qa_kryl1244_outputfilters.mjs

import { useAnalysisStore } from './src/store/useanalysisstore.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// ── 1. setOutputFilters: live, in place, PRESERVES synthesis ────────────────
const st = useAnalysisStore.getState();
const SID = 'qa-1244';
const SYNTH = { queryDomain: 'CAPITAL', bluf: 'cached', __marker: 42 };
st.createSession(SID, 'GENERAL', 'test query', { synthesis: SYNTH, floor: 1000 });

const before = useAnalysisStore.getState().sessions[SID];
ok('session has cached tensor.synthesis', before.tensor.synthesis?.__marker === 42);

st.setOutputFilters(SID, { precursors: false, risks: true, opportunities: true, contradictions: false });
const after = useAnalysisStore.getState().sessions[SID];

ok('tensor.outputFilters updated in place', JSON.stringify(after.tensor.outputFilters) ===
   JSON.stringify({ precursors: false, risks: true, opportunities: true, contradictions: false }));
ok('tensor.synthesis PRESERVED (no re-synthesis / no cache clear)', after.tensor.synthesis?.__marker === 42);
ok('other tensor fields preserved (floor)', after.tensor.floor === 1000);
ok('session identity/query unchanged', after.query === 'test query' && after.id === SID);

st.setOutputFilters(SID, { precursors: true, risks: true, opportunities: true, contradictions: true });
ok('toggling back returns the full set, still no synthesis change',
   useAnalysisStore.getState().sessions[SID].tensor.synthesis?.__marker === 42 &&
   useAnalysisStore.getState().sessions[SID].tensor.outputFilters.precursors === true);

ok('setOutputFilters on an unknown session is a safe no-op',
   (() => { const s0 = useAnalysisStore.getState().sessions; st.setOutputFilters('nope', {}); return useAnalysisStore.getState().sessions === s0 || Object.keys(useAnalysisStore.getState().sessions).length === Object.keys(s0).length; })());

// setTensorFields (the WRONG seam) still clears synthesis — proves setOutputFilters is distinct
st.setTensorFields(SID, { anything: 1 });
ok('setTensorFields still clears synthesis (setOutputFilters is a distinct, safer action)',
   useAnalysisStore.getState().sessions[SID].tensor.synthesis === undefined);

// ── 2. checkbox wiring — live to the active session ─────────────────────────
const field = readFileSync(new URL('./src/components/analysis/analysisidlefield.jsx', import.meta.url), 'utf8');
ok('analysisidlefield imports the store setOutputFilters', /storeSetOutputFilters\s*=\s*useAnalysisStore\(s => s\.setOutputFilters\)/.test(field));
ok('checkbox onChange applies live to the active session', /if \(activeSessionId\) storeSetOutputFilters\(activeSessionId, next\)/.test(field));

// ── 3. brief — labels match checkboxes, dividers own their section ──────────
const brief = readFileSync(new URL('./src/components/analysis/intelligencebrief.jsx', import.meta.url), 'utf8');
ok('reads live session.tensor.outputFilters', /session\?\.tensor\?\.outputFilters/.test(brief));
ok('section renamed: Precursors (was "Evidence / Facts")', />Precursors</.test(brief) && !/>Evidence \/ Facts</.test(brief));
ok('section renamed: Risks (was "Threats")', />Risks</.test(brief) && !/>Threats</.test(brief));
ok('section: Opportunities', />Opportunities</.test(brief));
ok('section renamed: Contradictions (was "Alternative Viewpoint")', />Contradictions</.test(brief) && !/>Alternative Viewpoint</.test(brief));

// each Panel-03 gated block: leading <Divider/>, no trailing
for (const f of ['risks', 'opportunities', 'contradictions']) {
  const m = brief.match(new RegExp(`outputFilters\\.${f} && \\(\\s*<>\\s*([\\s\\S]{0,80})`));
  ok(`${f} block opens with a leading <Divider />`, !!m && /^<Divider \/>/.test(m[1].trim()));
}
ok('no standalone always-on <Divider /> immediately before the risks block (orphan removed)',
   !/\{brief\.assessment\}<\/div>\s*<Divider \/>\s*\{outputFilters\.risks/.test(brief.replace(/\s+/g, ' ')) &&
   !/assessment[^]*?<Divider \/>\s*\{outputFilters\.risks/.test(brief));

// ── 4. render-gate only — no synthesis touched by the filter path ──────────
ok('no synthesis/synthesize call in the OUTPUT filter onChange path', !/synthesize|synthesizeQuery|setTensorFields/.test(
   field.slice(field.indexOf('OUTPUT FILTERS'), field.indexOf('OUTPUT FILTERS') + 700)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
