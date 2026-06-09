// clusterAggregation.js — WO-CL-03
// Spatial hashing grid clustering. Pure function.
// No randomness. Cluster IDs are grid-key deterministic.
// No recomputation allowed after initial build.

const GRID_COLS = 7;
const GRID_ROWS = 5;

function gridKey(col, row) {
  return `${col}:${row}`;
}

function nodeToCell(node) {
  const col = Math.min(GRID_COLS - 1, Math.floor(node.x * GRID_COLS));
  const row = Math.min(GRID_ROWS - 1, Math.floor(node.y * GRID_ROWS));
  return { col, row, key: gridKey(col, row) };
}

// buildClusters — PURE FUNCTION
// Takes nodeViewModel array. Returns cluster array.
// Called once per signal update — never during render.
export function buildClusters(nodes) {
  if (!nodes?.length) return [];

  // Group nodes into grid cells
  const cells = {};
  for (const node of nodes) {
    const { col, row, key } = nodeToCell(node);
    if (!cells[key]) cells[key] = { col, row, key, nodes: [] };
    cells[key].nodes.push(node);
  }

  // Build cluster objects from populated cells
  const clusters = [];
  for (const cell of Object.values(cells)) {
    if (!cell.nodes.length) continue;

    const nodeIds = cell.nodes.map(n => n.id);

    // Centroid: mean of member node positions
    const cx = cell.nodes.reduce((s, n) => s + n.x, 0) / cell.nodes.length;
    const cy = cell.nodes.reduce((s, n) => s + n.y, 0) / cell.nodes.length;

    // Radius: max distance from centroid + base padding
    const maxDist = cell.nodes.reduce((m, n) => {
      return Math.max(m, Math.hypot(n.x - cx, n.y - cy));
    }, 0);
    const radius = Math.max(0.04, maxDist + 0.03);

    // Density: node count relative to grid cell capacity
    const densityScore = Math.min(1, cell.nodes.length / 6);

    // Signal: avg intensity of member nodes
    const signalScore = cell.nodes.reduce((s, n) => s + n.intensity, 0) / cell.nodes.length;

    // Dominant mode: mode that appears most in this cluster
    const modeCounts = {};
    for (const n of cell.nodes) modeCounts[n.mode] = (modeCounts[n.mode] ?? 0) + 1;
    const dominantMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0][0];

    clusters.push({
      id:           `cluster-${cell.key}`,
      nodeIds,
      centroid:     { x: cx, y: cy },
      radius,
      densityScore,
      signalScore,
      dominantMode,
      state:        'collapsed',   // WO-CL-04: initial state
    });
  }

  return clusters;
}
