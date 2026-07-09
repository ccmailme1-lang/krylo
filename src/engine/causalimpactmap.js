// KRYL-1011 — Causal Impact Map: subject-rooted DOWNSTREAM traversal (step 1).
//
// Given a subject, follow OUTBOUND typed edges (from === subject) to enumerate
// everything it impacts downstream — the blast radius, not a pairwise link. The
// vertical companion to CRE (which compares an anchor sideways vs peers); this
// traces the anchor downstream through consequences.
//
// DIRECTION IS LOAD-BEARING: this walks TYPED_EDGES (directed from -> to), NOT
// entityTopologyRegistry — that adjacency map is SYMMETRIC (every edge writes
// both directions), so using it would return bidirectional neighbors and invert
// the impact direction. Outbound-only = "things impacted BY the subject".
//
// GROUNDING (§22 / §19): every impact carries its edge source + a `grounded`
// flag. An edge with an UNKNOWN/absent source is surfaced as TENTATIVE, never
// asserted. A subject with no outbound edges returns an explicit empty map
// (absence), not a fabricated impact.
//
// Node identity matches the registry: 'CIK:xxxx' when a CIK exists, else the
// normalized name. ERK (resolveAny) canonicalization of a raw subject -> node id
// is a thin follow-up wrapper; step 1 is the traversal engine itself.

import { TYPED_EDGES, NODE_LABELS } from './entitytopologyregistry.js';

function normId(name) {
  return String(name ?? '').toUpperCase().replace(/[\s-]/g, '_');
}

// Raw subject (name or 'CIK:xxxx') -> the node id edges are keyed by.
function toNodeId(subject) {
  const s = String(subject ?? '').trim();
  if (!s) return null;
  return s.startsWith('CIK:') ? s : normId(s);
}

const labelOf = id => NODE_LABELS[id] ?? id;

/**
 * buildImpactMap(subject, opts) — outbound (downstream) causal impact traversal.
 * @param {string} subject  — entity name or 'CIK:xxxx'
 * @param {Object} [opts]   — { maxDepth = 4 }
 * @returns {Object} {
 *   subject, subjectId, maxDepth, reached, truncated, nodes[], impacts[], note?
 * }
 *   nodes[]:   { id, label, depth }                         (depth 0 = subject)
 *   impacts[]: { from, to, fromLabel, toLabel, type, source, depth, grounded }
 *   grounded:  edge.source is real provenance (not UNKNOWN/absent).
 *   note:      present when there is nothing downstream (§22 absence).
 */
export function buildImpactMap(subject, { maxDepth = 4 } = {}) {
  const subjectId = toNodeId(subject);
  if (!subjectId) {
    return { subject, subjectId: null, maxDepth, reached: 0, truncated: false, nodes: [], impacts: [], note: 'INVALID_SUBJECT' };
  }

  const visited = new Set([subjectId]);
  const nodes   = [{ id: subjectId, label: labelOf(subjectId), depth: 0 }];
  const impacts = [];
  let frontier  = [subjectId];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = [];
    for (const node of frontier) {
      // OUTBOUND only: edges where this node is the `from`.
      for (const e of TYPED_EDGES) {
        if (e.from !== node) continue;
        // Record every outbound edge (the relationship is real regardless of
        // whether the target was already reached via another path).
        impacts.push({
          from: e.from, to: e.to,
          fromLabel: labelOf(e.from), toLabel: labelOf(e.to),
          type: e.type, source: e.source, depth,
          grounded: !!e.source && e.source !== 'UNKNOWN',
        });
        // Traverse INTO a node only once (cycle guard / first-reach depth).
        if (!visited.has(e.to)) {
          visited.add(e.to);
          nodes.push({ id: e.to, label: labelOf(e.to), depth });
          next.push(e.to);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  const out = {
    subject, subjectId, maxDepth,
    reached: nodes.length - 1,
    truncated: frontier.length > 0, // stopped at depth cap with more downstream
    nodes, impacts,
  };
  if (impacts.length === 0) {
    out.note = 'NO_OUTBOUND_EDGES — subject is a leaf or unknown node; no downstream impact recorded (§22 absence, not fabricated).';
  }
  return out;
}

/**
 * toImpactViewModel(map) — shape buildImpactMap() output for rendering (pure, no JSX).
 * Groups impacts into levels by depth, carries the grounded/tentative flag through,
 * and rolls up counts. The render layer maps over this with zero logic of its own.
 * @param {Object} map — buildImpactMap() result
 * @returns {Object} { subject, reached, grounded, tentative, truncated, empty, note, levels[] }
 *   levels[]: { depth, edges: [{ from, to, type, grounded }] }
 */
export function toImpactViewModel(map) {
  if (!map) return { subject: null, reached: 0, grounded: 0, tentative: 0, truncated: false, empty: true, levels: [] };
  const byDepth = new Map();
  for (const i of map.impacts) {
    if (!byDepth.has(i.depth)) byDepth.set(i.depth, []);
    byDepth.get(i.depth).push({ from: i.fromLabel, to: i.toLabel, type: i.type, grounded: i.grounded });
  }
  const levels = [...byDepth.keys()].sort((a, b) => a - b).map(depth => ({ depth, edges: byDepth.get(depth) }));
  const grounded = map.impacts.filter(i => i.grounded).length;
  return {
    subject:   map.nodes[0]?.label ?? map.subject,
    reached:   map.reached,
    grounded,
    tentative: map.impacts.length - grounded,
    truncated: map.truncated,
    empty:     map.impacts.length === 0,
    note:      map.note ?? null,
    levels,
  };
}
