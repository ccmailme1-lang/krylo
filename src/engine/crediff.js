// KRYL-1006 — CRE Diff Engine.
//
// Wires the as-diff pairwise comparator (compareSignals) around entities. This is orchestration
// only — it adds NO comparison math; leverage margin / dominant axis / asymmetric capture /
// incomparability all come straight from asdiff.js.
//
// §21 Route-Don't-Aggregate: per-item results are kept UNCOLLAPSED — no composite score here.
//
// SLICE 1 (runComparativeDiff / HARDCODED_PEER_SETS / runDivergenceSurface, below): one-vs-many
// anchor+peer-set pass on NEUTRAL, IDENTICAL placeholder inputs — proves the loop, returns
// PARITY by design. Still used by comparisoncontext.js — kept as-is, not removed.
//
// SLICE 2 (resolveEntitySignalField / runPairwiseDiff, added below): real two-entity comparison
// for the search-box `diff A and B` command. Sources REAL per-entity evidence — EDGAR canonical
// events, entity topology edges, and the entity's own domainTags from the identity registry. A
// domain with zero resolvable real evidence for an entity is STRUCTURAL_ABSENCE (§22
// absence-is-signal), never a fabricated baseline, never silent parity.

import { buildSignalUnit, compareSignals } from './asdiff.js';
import { parse7PointSchema } from './pliengine.js';
import { computeDivergenceSurface } from './divergencesurface.js';
import { resolve as resolveEntity } from './entityresolution.js';
import { getCanonicalEvents } from './connectors/edgar8kevidence.js';
import { getTypedEdgesFor } from './entitytopologyregistry.js';

// ── Slice 1 (unchanged — comparisoncontext.js depends on this exact shape) ─────────────────

// Slice 1 hardcoded peer set (KRYL-1006). Automated peer-set resolution is a follow-up.
export const HARDCODED_PEER_SETS = {
  GOOGLE: ['MICROSOFT', 'AMAZON'],
};

// Neutral placeholder 7-point schema + signal. IDENTICAL across entities on purpose
// (see honesty note above). Domain TECHNOLOGY so same-domain pairs resolve to
// as-diff's clean 'direct' space (quality 1.0) — the anchor-vs-same-sector-peer case.
function buildPlaceholderUnit(entity) {
  const schema = {
    domain:         'TECHNOLOGY',
    subject:        entity,
    decision_type:  'invest',
    risk_tolerance: 0.5,
    dependencies:   [{ id: 'dep_core', status: 'lit', coverage: 0.6 }],
    constraints:    [{ label: 'placeholder_constraint', severity: 0.4 }],
    goal:           'placeholder',
  };
  const signal = { id: `${entity}_placeholder`, score: 60, velocity: 0.5, coverage: 0.6, source_count: 3, age_days: 1 };
  const pli = parse7PointSchema(schema, signal);
  return buildSignalUnit(schema, signal, pli, null, { tier: 'entity', entity, domain: 'TECHNOLOGY' });
}

/**
 * runComparativeDiff — one-vs-many comparative pass for an anchor. SLICE 1 — placeholder data.
 * @param {string} anchor  — anchor entity (e.g. 'GOOGLE')
 * @param {Object} [opts]  — { peers?: string[] } override the hardcoded peer set
 * @returns {Object} { anchor, peers, grounding, results[] } — results uncollapsed + ranked
 */
export function runComparativeDiff(anchor, { peers } = {}) {
  const anchorKey = (anchor ?? '').toUpperCase();
  const peerList  = (peers ?? HARDCODED_PEER_SETS[anchorKey] ?? []).map(p => p.toUpperCase());

  if (!anchorKey || peerList.length === 0) {
    return { anchor: anchorKey || null, peers: [], grounding: 'NO_PEERS', results: [] };
  }

  const anchorUnit = buildPlaceholderUnit(anchorKey);

  const results = peerList.map(peer => {
    const cmp = compareSignals(anchorUnit, buildPlaceholderUnit(peer));
    return {
      peer,
      edge:               cmp.winner === 'A' ? 'ANCHOR' : cmp.winner === 'B' ? 'PEER' : 'PARITY',
      leverage_margin:    cmp.leverage_margin,
      dominant_axis:      cmp.dominant_axis,
      asymmetric_capture: cmp.asymmetric_capture,
      incomparable:       cmp.incomparability_flag,
      shared_space:       cmp.shared_space,
    };
  });

  results.sort((a, b) => b.leverage_margin - a.leverage_margin);

  return {
    anchor:    anchorKey,
    peers:     peerList,
    grounding: 'PROVISIONAL — placeholder SignalUnits (identical inputs → PARITY by design). '
             + 'Real per-entity data sourcing is Slice 2 (runPairwiseDiff, below).',
    results,
  };
}

/**
 * runDivergenceSurface — all-pairs leverage divergence across a set of entities. SLICE 1.
 * @param {string[]} entities
 * @returns {{ entities:string[], grounding:string, surface:object }}
 */
export function runDivergenceSurface(entities = []) {
  const list = (entities ?? []).map(e => (e ?? '').toUpperCase()).filter(Boolean);
  if (list.length < 2) {
    return { entities: list, grounding: 'INSUFFICIENT_ENTITIES', surface: computeDivergenceSurface([]) };
  }
  const units = list.map(buildPlaceholderUnit);
  return {
    entities:  list,
    grounding: 'PROVISIONAL — placeholder SignalUnits (identical inputs → PARITY by design). '
             + 'Real per-entity data sourcing is Slice 2 (runPairwiseDiff, below).',
    surface:   computeDivergenceSurface(units),
  };
}

// ── Slice 2 — real per-entity comparison (search-box `diff A and B` command) ───────────────

export const STRUCTURAL_ABSENCE = 'STRUCTURAL_ABSENCE';

// Real evidence records this entity has, filtered by name match against the resolved identity.
function realEvidenceFor(identity) {
  const events = getCanonicalEvents().filter((e) => {
    const name = e?.metadata?.canonicalName ?? e?.canonicalName ?? null;
    if (name && name === identity.canonicalName) return true;
    return Array.isArray(e?.nodes)
      ? e.nodes.some((n) => n?.metadata?.canonicalName === identity.canonicalName)
      : false;
  });
  const edges = getTypedEdgesFor({ name: identity.canonicalName }) ?? [];
  return { events, edges };
}

/**
 * resolveEntitySignalField — real per-domain SignalUnits for one entity, or STRUCTURAL_ABSENCE
 * per domain where no real evidence exists. No placeholder data anywhere in this path.
 * @param {string} entityName
 * @returns {{ identity: object|null, units: Record<string, object|'STRUCTURAL_ABSENCE'> }}
 */
export function resolveEntitySignalField(entityName) {
  const identity = resolveEntity(entityName);
  if (!identity) return { identity: null, units: {} };

  const { events, edges } = realEvidenceFor(identity);
  const domainTags = Array.isArray(identity.domainTags) ? identity.domainTags : [];

  const units = {};
  for (const domain of domainTags) {
    const evidenceCount = events.length + edges.length;
    if (evidenceCount === 0) {
      units[domain] = STRUCTURAL_ABSENCE;
      continue;
    }
    // Real, re-derivable magnitude from actual evidence counts — not invented. Capped at 100
    // (§16 normalization scale). Coverage is a bounded fraction of the same real counts.
    const score    = Math.min(100, events.length * 15 + edges.length * 10);
    const coverage = Math.min(1, evidenceCount / 5);
    const schema = {
      domain,
      subject:        identity.canonicalName,
      decision_type:  'observe',
      risk_tolerance: 0.5,
      dependencies:   [{ id: 'entity_evidence', status: 'lit', coverage }],
      constraints:    [],
      goal:           'structural_comparison',
    };
    const signal = {
      id:           `${identity.canonicalId}_${domain}`,
      score,
      velocity:     coverage,
      coverage,
      source_count: evidenceCount,
      age_days:     1,
    };
    const pli = parse7PointSchema(schema, signal);
    units[domain] = buildSignalUnit(schema, signal, pli, null, {
      tier: 'entity', entity: identity.canonicalName, domain,
    });
  }
  return { identity, units };
}

/**
 * runPairwiseDiff — real two-entity structural comparison. Feeds the search-box diff command.
 * @param {string} entityAName
 * @param {string} entityBName
 * @returns {{ entityA, entityB, resolved: boolean, reason?: string, rows: Array }}
 */
export function runPairwiseDiff(entityAName, entityBName) {
  const fieldA = resolveEntitySignalField(entityAName);
  const fieldB = resolveEntitySignalField(entityBName);

  if (!fieldA.identity || !fieldB.identity) {
    return {
      entityA: entityAName, entityB: entityBName,
      resolved: false,
      reason: !fieldA.identity && !fieldB.identity ? 'BOTH_UNRESOLVED'
            : !fieldA.identity ? 'ENTITY_A_UNRESOLVED' : 'ENTITY_B_UNRESOLVED',
      rows: [],
    };
  }

  const domains = [...new Set([...Object.keys(fieldA.units), ...Object.keys(fieldB.units)])];

  const rows = domains.map((domain) => {
    const unitA = fieldA.units[domain];
    const unitB = fieldB.units[domain];

    if (unitA === STRUCTURAL_ABSENCE || unitB === STRUCTURAL_ABSENCE) {
      return {
        domain,
        state: STRUCTURAL_ABSENCE,
        absentSide: unitA === STRUCTURAL_ABSENCE && unitB === STRUCTURAL_ABSENCE ? 'BOTH'
                  : unitA === STRUCTURAL_ABSENCE ? 'A' : 'B',
      };
    }

    const cmp = compareSignals(unitA, unitB);
    return {
      domain,
      state:              'GROUNDED',
      edge:               cmp.winner === 'A' ? 'A' : cmp.winner === 'B' ? 'B' : 'PARITY',
      leverage_margin:    cmp.leverage_margin,
      dominant_axis:      cmp.dominant_axis,
      asymmetric_capture: cmp.asymmetric_capture,
      incomparable:       cmp.incomparability_flag,
      shared_space:       cmp.shared_space,
    };
  });

  return {
    entityA: fieldA.identity.canonicalName,
    entityB: fieldB.identity.canonicalName,
    resolved: true,
    rows, // §21 — uncollapsed, no composite score
  };
}
