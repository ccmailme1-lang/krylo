// WO-2007.3 — Recon Layer Orchestrator
// Full loop: detect_blind_spots → generate_hypotheses → discover_sources →
//            simulate → score → emit SCP
// Write-isolated from production. All outputs are CANDIDATE_ONLY SCP artifacts.
// WO-2013 — BAC coupling applied to exploration scoring.

import { buildSeedGraph, expand_genealogy } from './signalgenealogy.js';
import { computeCFromHistory } from './baccoupling.js';
import { createSCP, getRankedSCPs, getReconStats } from './scpstore.js';
import { computeExplorationScore, leadTimeFactor, canExpand } from './epistemicbudget.js';
import { assess as assessCausal } from './causalvaliditygate.js';
import { EVIDENCE_DESCRIPTORS, EPISTEMIC_CLASS } from './evidencetiers.js';

const SEED_GRAPH       = buildSeedGraph();
const STRUCTURAL_DOMAINS = new Set(['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP']);

// ── 1. detect_blind_spots ─────────────────────────────────────────────────────
// Identifies missing structural precursors from domain states + evidence array.
// domainStates: { DOMAIN: { score, state, qualified } }
// evidence:     [{ source, finding, evidenceType? }]
export function detect_blind_spots(domainStates = {}, evidence = []) {
  const blindSpots = [];

  for (const domain of STRUCTURAL_DOMAINS) {
    const state = domainStates[domain];
    if (!state) continue;

    const hasStructural = evidence.some(e =>
      e.source === domain &&
      EVIDENCE_DESCRIPTORS[e.evidenceType]?.epistemicClass === EPISTEMIC_CLASS.STRUCTURAL
    );

    if (state.score > 40 && !hasStructural) {
      blindSpots.push({
        domain,
        score:        state.score,
        gap:          `${domain} convergence at ${Math.round(state.score)} without structural evidence anchor`,
        priority:     state.score / 100,
        missingClass: EPISTEMIC_CLASS.STRUCTURAL,
      });
    }
  }

  // Structural divergence: one domain high, partner low — missing coupling signal
  const keys = Object.keys(domainStates);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const dA = keys[i], dB = keys[j];
      const sA = domainStates[dA]?.score ?? 0;
      const sB = domainStates[dB]?.score ?? 0;
      if (Math.abs(sA - sB) > 40 && Math.max(sA, sB) > 60) {
        const high = sA > sB ? dA : dB;
        blindSpots.push({
          domain:        high,
          counterDomain: sA > sB ? dB : dA,
          score:         Math.max(sA, sB),
          gap:           `${dA}/${dB} divergence — structural coupling missing`,
          priority:      Math.abs(sA - sB) / 100,
          missingClass:  'COUPLING',
        });
      }
    }
  }

  return blindSpots.sort((a, b) => b.priority - a.priority);
}

// ── 2. generate_hypotheses ────────────────────────────────────────────────────
export function generate_hypotheses(blindSpots) {
  return blindSpots.map(spot => ({
    id:            `H-${spot.domain}${spot.counterDomain ? '-' + spot.counterDomain : ''}-${spot.missingClass}`,
    blindSpot:     spot,
    question:      spot.missingClass === 'COUPLING'
      ? `What upstream process explains the ${spot.domain}/${spot.counterDomain} divergence?`
      : `What structural activity precedes the ${spot.domain} convergence signal?`,
    targetSignal:  spot.domain,
    mechanism:     spot.missingClass === EPISTEMIC_CLASS.STRUCTURAL ? 'STRUCTURAL_PRECURSOR' : 'COUPLING_GAP',
    searchTargets: _searchTargets(spot.domain, spot.counterDomain),
  }));
}

const DOMAIN_EVIDENCE_MAP = {
  TECHNOLOGY: ['POWER_CONSUMPTION', 'COMPUTE_CAPACITY', 'NETWORK_TRAFFIC', 'POWER_LOAD'],
  CAPITAL:    ['SEC_FILING', 'EARNINGS_CALL', 'FREIGHT_LOGISTICS'],
  OWNERSHIP:  ['CONSTRUCTION_PERMITS', 'POWER_INFRA'],
  LABOR:      ['FREIGHT_LOGISTICS', 'NETWORK_TRAFFIC'],
  MEDIA:      ['NEWS_ARTICLE'],
  KNOWLEDGE:  ['SEC_FILING', 'EARNINGS_CALL'],
};

function _searchTargets(domainA, domainB) {
  const a = DOMAIN_EVIDENCE_MAP[domainA] ?? [];
  const b = domainB ? (DOMAIN_EVIDENCE_MAP[domainB] ?? []) : [];
  return [...new Set([...a, ...b])];
}

// ── 3. discover_sources ───────────────────────────────────────────────────────
const SOURCE_CATALOG = {
  POWER_CONSUMPTION:    { label: 'EIA Electric Power Monthly',    type: 'API',     observability: 0.90, freshness: 0.80, reliability: 0.90, latency: 'MONTHLY'   },
  COMPUTE_CAPACITY:     { label: 'Cloud Provider Capacity Feeds', type: 'API',     observability: 0.65, freshness: 0.70, reliability: 0.75, latency: 'QUARTERLY' },
  NETWORK_TRAFFIC:      { label: 'Cloudflare Radar / ARIN',       type: 'API',     observability: 0.70, freshness: 0.90, reliability: 0.80, latency: 'DAILY'     },
  POWER_LOAD:           { label: 'ISO/RTO Grid Load Data',        type: 'API',     observability: 0.85, freshness: 0.95, reliability: 0.90, latency: 'HOURLY'    },
  SEC_FILING:           { label: 'SEC EDGAR Full-Text Search',    type: 'API',     observability: 0.95, freshness: 0.85, reliability: 0.98, latency: 'QUARTERLY' },
  EARNINGS_CALL:        { label: 'Earnings Call Transcripts',     type: 'DATASET', observability: 0.90, freshness: 0.80, reliability: 0.90, latency: 'QUARTERLY' },
  FREIGHT_LOGISTICS:    { label: 'Port Authority / PIERS Data',   type: 'DATASET', observability: 0.70, freshness: 0.70, reliability: 0.80, latency: 'WEEKLY'    },
  CONSTRUCTION_PERMITS: { label: 'Municipal Permit APIs',         type: 'API',     observability: 0.75, freshness: 0.75, reliability: 0.85, latency: 'WEEKLY'    },
  POWER_INFRA:          { label: 'FERC Filings / ISO Planning',   type: 'DATASET', observability: 0.80, freshness: 0.60, reliability: 0.90, latency: 'ANNUAL'    },
  NEWS_ARTICLE:         { label: 'GDELT / NewsAPI',               type: 'API',     observability: 0.80, freshness: 0.99, reliability: 0.55, latency: 'REALTIME'  },
};

export function discover_sources(hypothesis) {
  return hypothesis.searchTargets
    .map(t => ({ evidenceType: t, ...(SOURCE_CATALOG[t] ?? null) }))
    .filter(s => s.label)
    .sort((a, b) => b.observability - a.observability);
}

// ── 4. simulate ───────────────────────────────────────────────────────────────
// Without historical data → UNRESOLVED. Honest by default.
export function simulate(source, { signalHistory = [] } = {}) {
  if (signalHistory.length < 10) {
    return { evidenceType: source.evidenceType, status: 'UNRESOLVED', correlationEst: null };
  }
  return { evidenceType: source.evidenceType, status: 'ESTIMATED', correlationEst: 0.5 };
}

// ── 5. score ──────────────────────────────────────────────────────────────────
const LATENCY_DAYS = { REALTIME: 0, HOURLY: 0, DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };

export function score(source, hypothesis, simResult) {
  const lag = LATENCY_DAYS[source.latency] ?? 7;
  return computeExplorationScore({
    informationGain:  source.observability * (simResult?.correlationEst ?? 0.4),
    leadTimeFactor:   leadTimeFactor(lag),
    causalStrength:   hypothesis.mechanism === 'STRUCTURAL_PRECURSOR' ? 0.70 : 0.45,
    integrationCost:  Math.max(0.1, 1 - source.reliability),
    noiseFactor:      Math.max(0.1, 1 - source.freshness),
    redundancyFactor: 0.40,
    maintenanceRisk:  source.type === 'API' ? 0.30 : 0.50,
  });
}

// ── 6. emitSCP ────────────────────────────────────────────────────────────────
export function emitSCP(hypothesis, source, simResult, explorationScore, causalValidity, genealogyChain = []) {
  const lag = LATENCY_DAYS[source.latency] ?? 7;
  return createSCP({
    hypothesis:                   hypothesis.question,
    target_signal:                hypothesis.targetSignal,
    observed_gap:                 hypothesis.blindSpot.gap,
    candidate_upstream_sources:   [source.label],
    genealogy_chain:              genealogyChain,
    expected_lead_time:           `${lag}d`,
    outcome_lag_distribution:     null,
    information_gain_score:       source.observability * (simResult?.correlationEst ?? 0.4),
    causal_confidence_score:      hypothesis.mechanism === 'STRUCTURAL_PRECURSOR' ? 0.70 : 0.45,
    observability_score:          source.observability,
    integration_cost_estimate:    Math.max(0.1, 1 - source.reliability),
    exploration_score:            explorationScore,
    causal_validity:              causalValidity?.validity ?? 'UNRESOLVED',
    negative_genealogy_constraints: [],
    regime_conditions:            [],
    recommendation:               `Investigate ${source.label} adapter for ${hypothesis.targetSignal} precursor signal`,
  });
}

// Ring buffers for BAC coupling (WO-2013) — per-run session state
const _nvHistory        = [];
const _attentionHistory = [];
const NV_BUFFER_SIZE    = 5;

// ── FULL LOOP ─────────────────────────────────────────────────────────────────
// run — executes full Recon Layer pass
// domainStates: from useHappyPathEngine().engineState.domainStates
// synthesis:    from synthesizeQuery(session) — optional
export function run(domainStates = {}, synthesis = null) {
  const evidence   = synthesis?.evidence ?? [];
  const blindSpots = detect_blind_spots(domainStates, evidence);
  const hypotheses = generate_hypotheses(blindSpots);
  const emitted    = [];

  // WO-2013: compute BAC coupling scalar C for this exploration pass
  const domainPressures   = Object.fromEntries(
    Object.entries(domainStates).map(([k, v]) => [k, v?.score ?? 0])
  );
  const volatilityScore   = 1 - Math.min(1, Math.max(0,
    Object.values(domainStates).reduce((acc, s) => acc + (s?.score ?? 0), 0) /
    (Object.keys(domainStates).length * 100 || 1)
  ));
  // Snapshot current NV (domain weight vector) for ring buffer
  const nvSnapshot = Object.values(domainPressures).map(v => v / 100);
  _nvHistory.push(nvSnapshot);
  if (_nvHistory.length > NV_BUFFER_SIZE) _nvHistory.shift();

  const C = computeCFromHistory(_nvHistory, _attentionHistory, volatilityScore, domainPressures);

  // Deduplicate by (evidenceType, targetSignal) — same source for same target = one SCP
  const seen = new Set();
  const attentionWeights = [];

  for (const hyp of hypotheses) {
    const sources     = discover_sources(hyp);
    let branchCount   = 0;

    for (const src of sources) {
      if (!canExpand({ depth: 0, branchCount, explorationScore: 0.5 }).allowed) break;

      const dedupeKey = `${src.evidenceType}::${hyp.targetSignal}`;
      if (seen.has(dedupeKey)) continue;

      const simResult = simulate(src);
      const baseScore = score(src, hyp, simResult);

      // WO-2013: apply BAC coupling — narrative pressure modulates exploration weight
      const narrativePressure = (domainPressures['MEDIA'] ?? 0) / 100;
      const explScore         = Math.min(1, baseScore + C * narrativePressure * 0.2);

      const validity = assessCausal({ upstreamHistory: [], targetHistory: [], regimes: [] });

      if (!canExpand({ depth: 0, branchCount, explorationScore: explScore }).allowed) continue;

      const ancestors = SEED_GRAPH.nodes.has(src.evidenceType)
        ? expand_genealogy(SEED_GRAPH, src.evidenceType).map(r => r.node.label)
        : [];

      const id = emitSCP(hyp, src, simResult, explScore, validity, ancestors);
      if (id) {
        emitted.push(id);
        branchCount++;
        seen.add(dedupeKey);
        attentionWeights.push(explScore);
      }
    }
  }

  // Update attention ring buffer for next pass
  if (attentionWeights.length > 0) {
    _attentionHistory.push(attentionWeights);
    if (_attentionHistory.length > NV_BUFFER_SIZE) _attentionHistory.shift();
  }

  return { scpIds: emitted, blindSpots, hypotheses, stats: getReconStats(), couplingC: C };
}

/**
 * toReconViewModel(scps, opts) — group SCP candidates for DIGESTIBLE display.
 * Collapses N candidates that share a hypothesis into one cluster, differentiated by
 * their real upstream SOURCE, with validity + score rolled up. Turns a "flurry that
 * reads as an error/attack" into ranked, legible signal. §21-safe: this is
 * visualization-only aggregation (grouping for display), not aggregation before a
 * routing/decision. Pure — no mutation, no side effects.
 * @param {Array} scps — getRankedSCPs() output
 * @param {Object} [opts] — { topPerGroup = 3 }
 * @returns {Object} { total, groups[] }
 *   groups[]: { question, target, gap, count, byValidity, allValidity, top[], moreCount }
 *   top[]: { source, observability, score, validity }
 */
export function toReconViewModel(scps = [], { topPerGroup = 3 } = {}) {
  const byQ = new Map();
  for (const s of scps) {
    if (!byQ.has(s.hypothesis)) byQ.set(s.hypothesis, []);
    byQ.get(s.hypothesis).push(s);
  }
  const groups = [...byQ.entries()].map(([question, items]) => {
    const sorted = [...items].sort((a, b) => (b.exploration_score ?? 0) - (a.exploration_score ?? 0));
    const byValidity = {};
    for (const s of items) byValidity[s.causal_validity] = (byValidity[s.causal_validity] ?? 0) + 1;
    const validities = Object.keys(byValidity);
    return {
      question,
      target:      sorted[0]?.target_signal ?? null,
      gap:         sorted[0]?.observed_gap ?? null,
      count:       items.length,
      byValidity,
      allValidity: validities.length === 1 ? validities[0] : null, // single shared status, or null if mixed
      top: sorted.slice(0, topPerGroup).map(s => ({
        source:        s.candidate_upstream_sources?.[0] ?? '—',
        observability: s.observability_score,
        score:         Math.round((s.exploration_score ?? 0) * 100),
        validity:      s.causal_validity,
      })),
      moreCount: Math.max(0, items.length - topPerGroup),
    };
  }).sort((a, b) => b.count - a.count);
  return { total: scps.length, groups };
}
