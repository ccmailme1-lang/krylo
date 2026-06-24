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
