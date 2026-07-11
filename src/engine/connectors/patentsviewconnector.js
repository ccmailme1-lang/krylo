// WO-1856 — Patent Intelligence Connector (PatentsView)
// Ingests technology velocity, assignee acceleration, and inventor migration.
// Normalized to 0–100 before dispatch. No raw patent data exposed to UI.
// Three signal types → dispatchBatch() → surfacerouter. No direct cone wiring.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { registerInventorMigrationEdge } from '../entitytopologyregistry.js';

const API_BASE = 'https://api.patentsview.org';

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

async function queryPatents(params) {
  const res = await fetch(`${API_BASE}/patents/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
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

  const inventorAssignees = {};

  for (const [cpcPrefix] of Object.entries(CLUSTER_WHITELIST)) {
    const cpcSection = cpcPrefix[0];
    try {
      const patents = await getInventorPatents(cpcSection, fromDate, toDate);
      for (const patent of patents) {
        const org = patent.assignees?.[0]?.assignee_organization;
        if (!org) continue;
        for (const inv of (patent.inventors ?? [])) {
          const id = inv.inventor_id;
          if (!id) continue;
          if (!inventorAssignees[id]) inventorAssignees[id] = {};
          inventorAssignees[id][org] = (inventorAssignees[id][org] ?? 0) + 1;
        }
      }
    } catch (e) {
      console.warn(`[PatentsView] migration fetch failed:`, e.message);
    }
  }

  const signals = [];

  for (const [, assigneeCounts] of Object.entries(inventorAssignees)) {
    const orgs = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]);
    if (orgs.length < 2) continue;

    const totalPatents = orgs.reduce((s, [, n]) => s + n, 0);
    const [destOrg, destCount] = orgs[0];
    const [sourceOrg]          = orgs[1];

    // Register migration edge into entitytopologyregistry (additive only)
    registerInventorMigrationEdge(sourceOrg, destOrg);

    const confidence = clamp((destCount / totalPatents) * 100, 0, 100);
    const srcKey     = sourceOrg.toUpperCase().replace(/[\s-]/g, '_');
    const dstKey     = destOrg.toUpperCase().replace(/[\s-]/g, '_');

    signals.push({
      id:         `pv_migration_${srcKey}_${dstKey}_${now}`,
      source:     'PATENTSVIEW',
      domain:     ['TECHNOLOGY', 'OWNERSHIP', 'CAPITAL'],
      signal:     `INVENTOR_MIGRATION:${sourceOrg}→${destOrg}`,
      confidence,
      ts:         now,
      polarity:   POLARITY.POSITIVE,
      decay:      DECAY.QUARTERLY,
      topology:   [srcKey, dstKey],
    });
  }

  return signals;
}

// Legacy PatentsView API (api.patentsview.org) was decommissioned; its replacement
// Search API is key-gated and CORS-blocked from the browser. Every fetch here fails
// ("Failed to fetch") and floods the console. Disabled until a server-side proxy exists.
// Flip to true only once runs through an API proxy (§16). — 2026-07-11
const PATENTSVIEW_ENABLED = false;

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
