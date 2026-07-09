// WO-1855 — Entity Topology Linker: static v1 entity dependency registry.
// Maps entity IDs to structural peers (shared supply chain, tech stack, capital dependency).
// v2 will replace with dynamic graph — v1 is manually curated.

export const TOPOLOGY_CLUSTERS = {
  AI_COMPUTE:      ['NVIDIA', 'TSMC', 'ASML', 'MICROSOFT', 'BROADCOM', 'AMD'],
  HOUSING_FINANCE: ['FANNIE_MAE', 'FREDDIE_MAC', 'JPMORGAN', 'WELLS_FARGO', 'LENNAR', 'DR_HORTON'],
  ENERGY_GRID:     ['NEXTERA', 'DUKE_ENERGY', 'EXXON', 'CHEVRON', 'SCHLUMBERGER', 'CONSTELLATION'],
};

// Build reverse map: entityId → peer entity IDs (self excluded)
const _registry = {};
for (const members of Object.values(TOPOLOGY_CLUSTERS)) {
  for (const id of members) {
    if (!_registry[id]) _registry[id] = new Set();
    members.filter(m => m !== id).forEach(p => _registry[id].add(p));
  }
}

export const entityTopologyRegistry = Object.fromEntries(
  Object.entries(_registry).map(([k, v]) => [k, Array.from(v)])
);

// Resolve topology peers for a given source string (case/space insensitive).
export function resolveTopology(source) {
  if (!source) return [];
  const key = source.toUpperCase().replace(/[\s-]/g, '_');
  return entityTopologyRegistry[key] ?? [];
}

// WO-1856 — Register an inventor migration edge (additive only, no removals).
// Called by patentsviewconnector when an inventor is found at 2+ assignees.
export function registerInventorMigrationEdge(sourceOrg, destOrg) {
  const src = sourceOrg.toUpperCase().replace(/[\s-]/g, '_');
  const dst = destOrg.toUpperCase().replace(/[\s-]/g, '_');

  if (!entityTopologyRegistry[src]) entityTopologyRegistry[src] = [];
  if (!entityTopologyRegistry[src].includes(dst)) entityTopologyRegistry[src].push(dst);

  if (!entityTopologyRegistry[dst]) entityTopologyRegistry[dst] = [];
  if (!entityTopologyRegistry[dst].includes(src)) entityTopologyRegistry[dst].push(src);
}

// ── v2 — typed, directed edges (additive extension, v1 untouched above) ────────
// v1's registry is flat/symmetric (peer clusters only). Real relationships have a
// type and a direction (A owns B is not the same as B owns A) — this is the actual
// "dynamic graph" the file's own header flagged as not-yet-built. Each typed edge
// ALSO writes into the v1 flat registry so existing resolveTopology() callers keep
// working unchanged — purely additive, nothing about v1's behavior changes.
export const TYPED_EDGES = []; // { from, to, type, source, ts }

// Node labels — CIK -> last-seen clean display name, for readability only.
// Node IDENTITY is the CIK, never the raw display string (see bug note below).
export const NODE_LABELS = {};

function normId(name) {
  return String(name ?? '').toUpperCase().replace(/[\s-]/g, '_');
}

// Node identity: prefer a real stable identifier (CIK) when one is available —
// raw display_name strings are NOT stable node IDs. Confirmed via live test
// 2026-07-07: the same company's full display_name embeds ticker + CIK
// annotations that vary by filing ("LUXURBAN HOTELS INC.  (LUXH, LUXHP)  (CIK
// 0001893311)"), so name-based normId() silently produced a different ID per
// lookup than per registration — getTypedEdgesFor() returned empty for an edge
// that was actually present. CIK-based IDs don't have this problem.
export function nodeId(cik, fallbackName) {
  return cik ? `CIK:${cik}` : normId(fallbackName);
}

export function registerTypedEdge({ from, to, fromCik, toCik, type, source, fromLabel, toLabel }) {
  if (!from || !to || !type) return;
  const f = nodeId(fromCik, from);
  const t = nodeId(toCik, to);
  if (fromLabel) NODE_LABELS[f] = fromLabel;
  if (toLabel)   NODE_LABELS[t] = toLabel;

  TYPED_EDGES.push({ from: f, to: t, type, source: source ?? 'UNKNOWN', ts: Date.now() });

  // backward-compat: keep v1's flat peer registry in sync
  if (!entityTopologyRegistry[f]) entityTopologyRegistry[f] = [];
  if (!entityTopologyRegistry[f].includes(t)) entityTopologyRegistry[f].push(t);
  if (!entityTopologyRegistry[t]) entityTopologyRegistry[t] = [];
  if (!entityTopologyRegistry[t].includes(f)) entityTopologyRegistry[t].push(f);
}

// Edge type #2 — beneficial ownership, sourced from SEC Schedule 13D/13G filings
// (secownershipconnector.js). Structurally guaranteed by the filing itself — the
// [subject, filer] CIK pair is a required field, not extracted from prose.
export function registerOwnershipEdge({ subjectCik, subjectName, filerCik, filerName }) {
  registerTypedEdge({
    from: filerName, to: subjectName, fromCik: filerCik, toCik: subjectCik,
    fromLabel: filerName, toLabel: subjectName,
    type: 'BENEFICIAL_OWNER_OF', source: 'SEC_13D_13G',
  });
}

// Read-only query — all typed edges touching a given entity, in either direction.
// Accepts a CIK (preferred, stable) or falls back to name-based lookup (fragile —
// only works if the exact display string matches what was registered).
export function getTypedEdgesFor({ cik, name } = {}) {
  const id = cik ? `CIK:${cik}` : normId(name);
  return TYPED_EDGES.filter(e => e.from === id || e.to === id);
}

// Look up the real edge type/source connecting two adjacent node IDs, if the
// hop came from a typed edge. Returns null for a v1-only cluster peer (those
// have no type — "same cluster" is not a typed relationship).
function typeForHop(a, b) {
  const edge = TYPED_EDGES.find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  return edge ? { type: edge.type, source: edge.source, directed: edge.from === a ? 'FORWARD' : 'REVERSE' } : null;
}

// findPath — shortest path between two nodes via breadth-first search over
// entityTopologyRegistry (the unified adjacency map both v1 clusters and v2
// typed edges write into). This is "Six Degrees" as an actual query, not just
// edge storage: given two entities, is there a path, how many hops, through
// what relationships.
//
// KNOWN LIMITATION (honest, not silently papered over): v1 clusters (e.g.
// 'NVIDIA') and v2 typed edges (e.g. 'CIK:0001893311') live in the same
// registry object but use DIFFERENT identity schemes (plain name vs CIK-
// prefixed). A path that would need to cross from a v1-only node to a
// v2-only node won't be found unless some edge happens to bridge them with
// a matching key — that bridge doesn't exist yet. Fine for now: this session
// only added CIK-keyed v2 nodes, so v2-to-v2 paths work correctly; v1
// clusters remain their own separate island until a future edge type
// resolves v1's plain names to real CIKs too.
//
// fromId/toId: exact registry keys (e.g. 'CIK:0001893311' or 'NVIDIA') — this
// function does not do name resolution, it operates on whatever's already a
// key in entityTopologyRegistry.
export function findPath(fromId, toId, maxDegrees = 6) {
  if (fromId === toId) return { found: true, degrees: 0, path: [fromId], hops: [] };
  if (!entityTopologyRegistry[fromId] || !entityTopologyRegistry[toId]) {
    return { found: false, degrees: null, path: [], hops: [], reason: 'UNKNOWN_NODE' };
  }

  const visited = new Set([fromId]);
  let frontier = [[fromId]]; // array of paths, BFS by degree

  for (let degree = 1; degree <= maxDegrees; degree++) {
    const nextFrontier = [];
    for (const path of frontier) {
      const node = path[path.length - 1];
      const neighbors = entityTopologyRegistry[node] ?? [];
      for (const next of neighbors) {
        if (visited.has(next)) continue;
        const newPath = [...path, next];
        if (next === toId) {
          const hops = [];
          for (let i = 1; i < newPath.length; i++) {
            hops.push({ from: newPath[i - 1], to: newPath[i], relation: typeForHop(newPath[i - 1], newPath[i]) });
          }
          return { found: true, degrees: newPath.length - 1, path: newPath, hops };
        }
        visited.add(next);
        nextFrontier.push(newPath);
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return { found: false, degrees: null, path: [], hops: [], reason: `NO_PATH_WITHIN_${maxDegrees}_DEGREES` };
}
