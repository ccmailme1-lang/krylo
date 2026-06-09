// clusterStateMachine.js — WO-CL-04
// Pure state machine. Cluster states are reversible.
// Expansion uses ONLY precomputed nodeIds — no recalculation allowed.

export const CLUSTER_STATE = {
  COLLAPSED: 'collapsed',
  EXPANDED:  'expanded',
  FROZEN:    'frozen',
};

// createClusterStateMachine — factory
// Returns state map + transition functions
export function createClusterStateMachine() {
  const states = new Map(); // clusterId → CLUSTER_STATE

  function get(id) {
    return states.get(id) ?? CLUSTER_STATE.COLLAPSED;
  }

  // click → toggle collapsed ↔ expanded (frozen stays frozen until ESC)
  function toggle(id) {
    const current = get(id);
    if (current === CLUSTER_STATE.FROZEN) return;
    states.set(id, current === CLUSTER_STATE.EXPANDED
      ? CLUSTER_STATE.COLLAPSED
      : CLUSTER_STATE.EXPANDED
    );
  }

  // shift-click → freeze inspection mode
  function freeze(id) {
    states.set(id, CLUSTER_STATE.FROZEN);
  }

  // ESC → collapse active cluster
  function collapse(id) {
    states.set(id, CLUSTER_STATE.COLLAPSED);
  }

  function collapseAll() {
    states.clear();
  }

  function getAll() {
    return states;
  }

  function hasFrozen() {
    for (const s of states.values()) {
      if (s === CLUSTER_STATE.FROZEN) return true;
    }
    return false;
  }

  return { get, toggle, freeze, collapse, collapseAll, getAll, hasFrozen };
}

// hitTest — find which cluster was clicked
// Returns cluster id or null
export function hitTestCluster(clusters, px, py) {
  for (const cluster of clusters) {
    const dist = Math.hypot(px - cluster.x, py - cluster.y);
    if (dist <= cluster.radius) return cluster.id;
  }
  return null;
}
