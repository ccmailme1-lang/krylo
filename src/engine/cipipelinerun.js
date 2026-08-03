// CI Pipeline Runtime Bridge — additive execution path for WO-2053/2054/2055.
// Wires cifengine.expandCI() -> cirgate.validateGraph() -> rbcsengine.scoreAdmitted()
// against real RKM RealityObjects.
//
// ADDITIVE ONLY: does not touch, gate, or replace any existing live decision path
// (editorialgate.js / domainambiguitygate.js / ienbg.js / etc. in querysynthesis.js).
// Read-only consumer of rkmstore.js. Writes results to its own isolated ring buffer —
// never reuses subsignalbuffer.js, which is locked to §16 signal tuples only.
//
// Known scaling note: runs the full pipeline once per live RKM object on every EDGAR
// sync cycle (5 min). Fine for demonstrating the execution path; would need batching
// or incremental-only runs if RKM volume grows large. Not addressed here — out of
// scope for "prove it executes."

import { listAll }        from './rkmstore.js';
import { expandCI }       from './cifengine.js';
import { validateGraph }  from './cirgate.js';
import { scoreAdmitted }  from './rbcsengine.js';

const MAX_RUNS = 50;
const _runs = []; // most recent pipeline executions, newest last

// Maps a real RealityObject (rkmstore.js) to the CI input shape expandCI() expects.
// Every field below traces to a property genuinely populated by a live connector —
// see edgar8kconnector.js's createObject() call. No invented fields.
export function realityObjectToCI(obj) {
  return {
    id:          obj.id,
    confidence:  obj.truthStability,
    signalType:  obj.metadata?.eventClass ?? obj.objectType,
    sourceType:  obj.metadata?.source ?? 'UNKNOWN',
    entityHints: [obj.metadata?.canonicalName, obj.metadata?.ticker].filter(Boolean),
  };
}

// Runs the full CI-F -> CI-R -> RBCS pipeline for one seed CI object.
export function runCIPipeline(ci) {
  const graph     = expandCI(ci);
  const validated = validateGraph(graph);
  const scored    = scoreAdmitted(validated.admitted, ci.id);

  const record = {
    ts:             Date.now(),
    seedCI:         ci.id,
    branchCount:    graph.branchCount,
    admittedCount:  validated.admitted.length,
    rejectedCount:  validated.rejected.length,
    candidateCount: scored.candidateCount,
    topScore:       scored.vectors[0]?.score ?? null,
  };

  _runs.push(record);
  if (_runs.length > MAX_RUNS) _runs.shift();
  if (typeof window !== 'undefined') window.__KRYLO_CI_PIPELINE_RUNS__ = _runs;

  return { graph, validated, scored, record };
}

// Runs the pipeline once per live RKM object currently in the store.
// Called from app.jsx's EDGAR sync chain, after RKM has real data for this cycle.
export function runCIPipelineOnRKM() {
  return listAll().map(obj => runCIPipeline(realityObjectToCI(obj)));
}

// Observable output — most recent pipeline executions (for the meeting / debugging).
export function getRecentCIPipelineRuns() {
  return _runs.slice();
}
