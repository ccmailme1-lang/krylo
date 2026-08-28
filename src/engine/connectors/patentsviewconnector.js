// WO-1856 — Patent Intelligence Connector (PatentsView)
// Ingests technology velocity, assignee acceleration, and inventor migration.
// Normalized to 0–100 before dispatch. No raw patent data exposed to UI.
// Three signal types → dispatchBatch() → surfacerouter. No direct cone wiring.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { registerInventorMigrationEdge } from '../entitytopologyregistry.js';
import { extractMigrationCandidates } from '../producers/patentsviewmigrationproducer.js';
import { admitCandidate } from '../admissionengine.js';
import { Vocabulary } from '../truthevent.js';
import { RelationType } from '../relationontology.js';

// Legacy api.patentsview.org (no auth, GET-shaped) was decommissioned — see the disabled-flag
// comment below. Routed through the local server-side proxy (as-diff/engine.js
// handlePatentsViewProxy) so the real key stays server-side only, never in client code.
// Query field names (patent_id, inventor_id, assignee_organization) are preserved AS-IS from the
// pre-existing implementation — NOT verified against the current Search API's live schema (no key
// has been available to test against). If the real API's field/endpoint shape differs once a key
// exists, this is the place to correct it — flagged here rather than guessed at with false
// confidence.
const PROXY_BASE = '/api/patentsview';

// Technology cluster whitelist — CPC section prefix → cluster label
// PatentsView is not queried for any cluster outside this list.
export const CLUSTER_WHITELIST = {
  'G06N':  'AI',
  'H01L':  'SEMICONDUCTOR',
  'B25J':  'ROBOTICS',
  'H01M':  'ENERGY_STORAGE',
  'G06N10':'QUANTUM',
  'F41':   'DEFENSE',
  'C12N':  'BIOTECH',
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function isoDate(ts) { return new Date(ts).toISOString().split('T')[0]; }

function normalizeVelocity(current, baseline) {
  if (baseline === 0) return { score: 50, delta: 0 };
  const delta = (current - baseline) / baseline;
  return { score: clamp(50 + delta * 50, 0, 100), delta };
}

function polarityFromDelta(delta, count) {
  if (count === 0) return POLARITY.ABSENT;
  if (delta > 0.15)  return POLARITY.POSITIVE;
  if (delta < -0.15) return POLARITY.NEGATIVE;
  return POLARITY.POSITIVE;
}

async function queryPatents(params, endpoint = 'patent') {
  const res = await fetch(PROXY_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, query: params }),
  });
  if (!res.ok) throw new Error(`PatentsView ${res.status}`);
  return res.json();
}

async function getFilingCount(cpcSection, fromDate, toDate) {
  const data = await queryPatents({
    q: { "_and": [
      { "_gte": { "patent_date": fromDate } },
      { "_lte": { "patent_date": toDate } },
      { "_eq":  { "cpc_section_id": cpcSection } },
    ]},
    f: ["patent_id"],
    o: { "per_page": 1 },
  });
  return data.total_patent_count ?? 0;
}

async function getAssigneeFilings(cpcSection, fromDate, toDate) {
  const data = await queryPatents({
    q: { "_and": [
      { "_gte": { "patent_date": fromDate } },
      { "_lte": { "patent_date": toDate } },
      { "_eq":  { "cpc_section_id": cpcSection } },
    ]},
    f: ["patent_id", "assignee_organization"],
    o: { "per_page": 100 },
  });

  const counts = {};
  for (const p of (data.patents ?? [])) {
    const org = p.assignees?.[0]?.assignee_organization;
    if (org) counts[org] = (counts[org] ?? 0) + 1;
  }
  return counts;
}

async function getInventorPatents(cpcSection, fromDate, toDate) {
  const data = await queryPatents({
    q: { "_and": [
      { "_gte": { "patent_date": fromDate } },
      { "_lte": { "patent_date": toDate } },
      { "_eq":  { "cpc_section_id": cpcSection } },
    ]},
    f: ["patent_id", "inventor_id", "assignee_organization"],
    o: { "per_page": 100 },
  });
  return data.patents ?? [];
}

async function buildVelocitySignals(now) {
  const currentFrom  = isoDate(now - THIRTY_DAYS_MS);
  const currentTo    = isoDate(now);
  const baselineFrom = isoDate(now - NINETY_DAYS_MS);
  const baselineTo   = isoDate(now - THIRTY_DAYS_MS);

  const signals = [];

  for (const [cpcPrefix, clusterLabel] of Object.entries(CLUSTER_WHITELIST)) {
    const cpcSection = cpcPrefix[0]; // PatentsView uses single-letter section
    try {
      const [currentCount, baselineCount] = await Promise.all([
        getFilingCount(cpcSection, currentFrom, currentTo),
        getFilingCount(cpcSection, baselineFrom, baselineTo),
      ]);
      const baselineNorm = baselineCount / 2; // 60-day window → 30-day equivalent
      const { score, delta } = normalizeVelocity(currentCount, baselineNorm);

      signals.push({
        id:         `pv_velocity_${clusterLabel}_${now}`,
        source:     'PATENTSVIEW',
        domain:     ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL'],
        signal:     `TECHNOLOGY_VELOCITY:${clusterLabel}`,
        confidence: score,
        ts:         now,
        polarity:   polarityFromDelta(delta, currentCount),
        decay:      DECAY.QUARTERLY,
        topology:   [],
      });
    } catch (e) {
      console.warn(`[PatentsView] velocity failed ${clusterLabel}:`, e.message);
    }
  }

  return signals;
}

async function buildAssigneeSignals(now) {
  const currentFrom  = isoDate(now - THIRTY_DAYS_MS);
  const currentTo    = isoDate(now);
  const baselineFrom = isoDate(now - NINETY_DAYS_MS);
  const baselineTo   = isoDate(now - THIRTY_DAYS_MS);

  const signals = [];

  for (const [cpcPrefix, clusterLabel] of Object.entries(CLUSTER_WHITELIST)) {
    const cpcSection = cpcPrefix[0];
    try {
      const [currentFilings, baselineFilings] = await Promise.all([
        getAssigneeFilings(cpcSection, currentFrom, currentTo),
        getAssigneeFilings(cpcSection, baselineFrom, baselineTo),
      ]);

      const topOrgs = Object.entries(currentFilings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [org, count] of topOrgs) {
        const baselineNorm = (baselineFilings[org] ?? 0) / 2;
        const { score, delta } = normalizeVelocity(count, baselineNorm);

        signals.push({
          id:         `pv_assignee_${clusterLabel}_${org.replace(/\s+/g, '_')}_${now}`,
          source:     'PATENTSVIEW',
          domain:     ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL'],
          signal:     `ASSIGNEE_ACCELERATION:${clusterLabel}:${org}`,
          confidence: score,
          ts:         now,
          polarity:   polarityFromDelta(delta, count),
          decay:      DECAY.QUARTERLY,
          topology:   [],
        });
      }
    } catch (e) {
      console.warn(`[PatentsView] assignee failed ${clusterLabel}:`, e.message);
    }
  }

  return signals;
}

async function buildMigrationSignals(now) {
  const fromDate = isoDate(now - NINETY_DAYS_MS);
  const toDate   = isoDate(now);

  // Collect raw patent records across the whitelist — real evidence, unmodified.
  const allPatents = [];
  for (const [cpcPrefix] of Object.entries(CLUSTER_WHITELIST)) {
    const cpcSection = cpcPrefix[0];
    try {
      const patents = await getInventorPatents(cpcSection, fromDate, toDate);
      allPatents.push(...patents);
    } catch (e) {
      console.warn(`[PatentsView] migration fetch failed:`, e.message);
    }
  }

  // Single source of truth for detection — M7's fixture-validated producer (18/18 QA), same
  // function used here as against golden fixtures. No duplicated detection logic.
  const candidates = extractMigrationCandidates(allPatents, now);

  const signals = [];

  for (const rc of candidates) {
    // Register into entitytopologyregistry (v1, additive only) — unchanged prior behavior.
    registerInventorMigrationEdge(rc.sourceId, rc.targetId);

    // Run the real candidate through admission (M6). Gate-0 currently Defers all 14 SRE types
    // (SPEC-gate0-sre-dispositions.md), so this is expected to REJECT today — that's the correct,
    // honest outcome, not a bug. The event is still produced, proving the full pipeline is wired:
    // real evidence -> RelationCore -> admission decision -> TruthEvent.
    try {
      const { decision, event } = admitCandidate(
        { ...rc, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: RelationType.COUPLED_WITH, origin: 'OBSERVED' },
        { decidedBy: 'patentsview_migration_producer', rulesetVersion: '1.0.0', now,
          sreRelationTypes: new Set(Object.values(RelationType)) }
      );
      if (decision !== 'VALIDATED') {
        console.info(`[PatentsView->M7] candidate ${rc.id} evaluated: ${decision} (${event.rationale.map(r => r.ruleId + ':' + r.outcome).join(', ')})`);
      }
    } catch (e) {
      console.warn('[PatentsView->M7] admission evaluation failed:', e.message);
    }

    const confidence = clamp(rc.phi0 * 100, 0, 100);

    signals.push({
      id:         rc.id,
      source:     'PATENTSVIEW',
      domain:     ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL'],
      signal:     `INVENTOR_MIGRATION:${rc.sourceId}→${rc.targetId}`,
      confidence,
      ts:         now,
      polarity:   POLARITY.POSITIVE,
      decay:      DECAY.QUARTERLY,
      topology:   [rc.sourceId, rc.targetId],
    });
  }

  return signals;
}

// Re-enabled 2026-08-20: routed through the local server-side proxy (handlePatentsViewProxy,
// as-diff/engine.js), satisfying this file's own original condition ("flip to true only once
// runs through an API proxy," §16 — the proxy now exists). Remaining blocker: no PATENTSVIEW_API_KEY
// value has been provisioned yet — the proxy returns 503 until one is set server-side, and
// getInventorPatents()'s existing try/catch (below) already handles that as a clean no-op with a
// console.warn, same as any other transient fetch failure. Re-enabling does not risk a crash.
const PATENTSVIEW_ENABLED = true;

// Main entry point — call once per sync cycle (PatentsView is weekly/monthly, not live)
export async function runPatentsViewSync() {
  if (!PATENTSVIEW_ENABLED) return [];
  const now = Date.now();

  const [velocityResult, assigneeResult, migrationResult] = await Promise.allSettled([
    buildVelocitySignals(now),
    buildAssigneeSignals(now),
    buildMigrationSignals(now),
  ]);

  const all = [
    ...(velocityResult.status  === 'fulfilled' ? velocityResult.value  : []),
    ...(assigneeResult.status  === 'fulfilled' ? assigneeResult.value  : []),
    ...(migrationResult.status === 'fulfilled' ? migrationResult.value : []),
  ];

  if (all.length > 0) surfaceRouter.dispatchBatch(all);
  return all;
}
