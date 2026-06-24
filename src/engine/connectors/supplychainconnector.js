// WO-1857 — Supply Chain Connector (Open Supply Hub / Versed AI)
// Detects facility-level disruptions and dispatches STRUCTURAL_CONTEXT signals
// carrying suppressionFactor. surfacerouter applies suppressionFactor as a
// confidence multiplier to topology-matched co-occurring signals.
// No raw facility data exposed to any UI component.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';
import { entityTopologyRegistry } from '../entitytopologyregistry.js';

const OSH_API = 'https://opensupplyhub.org/api';

// Optional Versed AI — skips gracefully if key absent
const VERSED_KEY = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_VERSED_AI_KEY
  : undefined;

// Facility status severity map — Open Supply Hub closure/risk codes → suppressionFactor
const SEVERITY_MAP = {
  'CLOSED':       1.0,
  'AT_RISK':      0.6,
  'DISRUPTED':    0.75,
  'PARTIAL':      0.4,
  'MONITORING':   0.2,
  'OPERATIONAL':  0.0,
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Resolve which known entities to check — only those with topology registrations
function getTrackedEntities() {
  return Object.keys(entityTopologyRegistry);
}

async function fetchFacilityStatus(entityName) {
  try {
    const res = await fetch(
      `${OSH_API}/facilities/?contributor_name=${encodeURIComponent(entityName)}&page_size=10`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.features ?? [];
  } catch {
    return null;
  }
}

// Optional Versed AI path — returns suppression data if key present
async function fetchVersedSupplyRisk(entityName) {
  if (!VERSED_KEY) return null;
  try {
    const res = await fetch('https://api.versed.ai/v1/supply-chain/risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VERSED_KEY}`,
      },
      body: JSON.stringify({ entity: entityName, window_days: 30 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Versed returns risk_score 0–1; map to suppressionFactor directly
    return typeof data.risk_score === 'number' ? data.risk_score : null;
  } catch {
    return null;
  }
}

// Compute suppressionFactor for a given entity from OSH facility statuses
function computeSuppression(facilities) {
  if (!facilities || facilities.length === 0) return 0;

  let maxSeverity = 0;
  for (const facility of facilities) {
    const status = facility.properties?.processing_type_facility_list?.[0]
      ?? facility.properties?.status
      ?? 'OPERATIONAL';
    const normalized = status.toUpperCase().replace(/\s+/g, '_');
    const severity = SEVERITY_MAP[normalized] ?? 0;
    if (severity > maxSeverity) maxSeverity = severity;
  }
  return maxSeverity;
}

async function buildSuppressionSignals() {
  const now      = Date.now();
  const entities = getTrackedEntities();
  const signals  = [];

  for (const entityId of entities) {
    const entityName = entityId.replace(/_/g, ' ');

    // Try Versed AI first (richer signal), fall back to Open Supply Hub
    let suppressionFactor = await fetchVersedSupplyRisk(entityName);

    if (suppressionFactor === null) {
      const facilities = await fetchFacilityStatus(entityName);
      suppressionFactor = computeSuppression(facilities);
    }

    // Only dispatch if there's meaningful suppression (skip fully operational entities)
    if (suppressionFactor <= 0) continue;

    const polarity = suppressionFactor >= 0.15 ? POLARITY.NEGATIVE : POLARITY.ABSENT;

    signals.push({
      id:               `sc_suppression_${entityId}_${now}`,
      source:           'SUPPLY_CHAIN',
      domain:           ['TECHNOLOGY', 'CAPITAL', 'LABOR'],
      signal:           `FACILITY_DISRUPTION:${entityId}`,
      confidence:       clamp(suppressionFactor * 100, 0, 100),
      ts:               now,
      polarity,
      decay:            DECAY.WEEKLY,
      topology:         entityTopologyRegistry[entityId] ?? [],
      suppressionFactor,
    });
  }

  return signals;
}

// Main entry point — call on sync cycle (not real-time; OSH updates are periodic)
export async function runSupplyChainSync() {
  const signals = await buildSuppressionSignals();
  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
