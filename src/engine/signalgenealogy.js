// WO-2007.1 — Signal Genealogy Graph
// Time-indexed causal DAG. Write-isolated — internal to Recon Layer only.
// Edges require lag_estimate_days. Negative edges are constraint markers, not causal.

export const NODE_TYPE = {
  SIGNAL:  'SIGNAL',
  PROCESS: 'PROCESS',
  DATASET: 'DATASET',
  API:     'API',
  PROXY:   'PROXY',
  EVENT:   'EVENT',
};

export const EDGE_TYPE = {
  CAUSES:          'causes',
  CORRELATES_WITH: 'correlates_with',
  PRECEDES:        'precedes',
  OBSERVED_BY:     'observed_by',
  DERIVED_FROM:    'derived_from',
};

export function createGraph() {
  return { nodes: new Map(), edges: [] };
}

export function addNode(graph, { id, type, label, domain, observabilityScore = 0.5, latencyDays = 0, noiseProfile = 'UNKNOWN', stabilityIndex = 0.5 }) {
  graph.nodes.set(id, { id, type, label, domain, observabilityScore, latencyDays, noiseProfile, stabilityIndex });
  return id;
}

// lag_estimate_days is required — edges without it are rejected
export function addEdge(graph, { from, to, type, lag_estimate_days, regime = null, confidence = 0.5, negative = false }) {
  if (lag_estimate_days == null) throw new Error(`Edge ${from}→${to}: lag_estimate_days required`);
  if (!graph.nodes.has(from))   throw new Error(`Edge from unknown node: ${from}`);
  if (!graph.nodes.has(to))     throw new Error(`Edge to unknown node: ${to}`);
  graph.edges.push({ from, to, type, lag_estimate_days, regime, confidence, negative });
}

// getUpstream — causal upstream edges only (excludes negative/constraint edges by default)
export function getUpstream(graph, nodeId, { includeNegative = false } = {}) {
  return graph.edges.filter(e =>
    e.to === nodeId &&
    (includeNegative || !e.negative) &&
    (e.type === EDGE_TYPE.CAUSES || e.type === EDGE_TYPE.PRECEDES)
  );
}

// getNegativeConstraints — edges that block causal attribution
export function getNegativeConstraints(graph, nodeId) {
  return graph.edges.filter(e => e.to === nodeId && e.negative);
}

// expand_genealogy — backward causal traversal up to maxDepth
// Returns scored upstream candidates sorted by discovery value
export function expand_genealogy(graph, targetNodeId, { maxDepth = 4, minConfidence = 0.3 } = {}) {
  const visited = new Set();
  const results = [];

  function traverse(nodeId, depth, accumulatedLag) {
    if (depth >= maxDepth) return;
    const upstreamEdges = getUpstream(graph, nodeId);
    for (const edge of upstreamEdges) {
      if (edge.confidence < minConfidence) continue;
      if (visited.has(edge.from)) continue;
      visited.add(edge.from);
      const node = graph.nodes.get(edge.from);
      if (!node) continue;
      const totalLag = accumulatedLag + edge.lag_estimate_days;
      results.push({
        node,
        edge,
        depth: depth + 1,
        totalLeadTimeDays: totalLag,
        score: node.observabilityScore * edge.confidence * (1 / (depth + 1)),
      });
      traverse(edge.from, depth + 1, totalLag);
    }
  }

  traverse(targetNodeId, 0, 0);
  return results.sort((a, b) => b.score - a.score);
}

// buildSeedGraph — initial structural knowledge (prior causal map; can be extended)
export function buildSeedGraph() {
  const g = createGraph();

  addNode(g, { id: 'CONSTRUCTION_PERMITS', type: NODE_TYPE.DATASET, label: 'Construction Permits',       domain: 'OWNERSHIP',  observabilityScore: 0.80, latencyDays: 730, stabilityIndex: 0.90 });
  addNode(g, { id: 'POWER_INFRA',          type: NODE_TYPE.SIGNAL,  label: 'Power Infrastructure',       domain: 'TECHNOLOGY', observabilityScore: 0.85, latencyDays: 365, stabilityIndex: 0.95 });
  addNode(g, { id: 'COMPUTE_CAPACITY',     type: NODE_TYPE.SIGNAL,  label: 'Compute Capacity',           domain: 'TECHNOLOGY', observabilityScore: 0.75, latencyDays: 90,  stabilityIndex: 0.80 });
  addNode(g, { id: 'POWER_LOAD',           type: NODE_TYPE.SIGNAL,  label: 'Power Load Spike',           domain: 'TECHNOLOGY', observabilityScore: 0.90, latencyDays: 7,   stabilityIndex: 0.85 });
  addNode(g, { id: 'POWER_CONSUMPTION',    type: NODE_TYPE.SIGNAL,  label: 'Power Consumption Trend',    domain: 'TECHNOLOGY', observabilityScore: 0.88, latencyDays: 30,  stabilityIndex: 0.90 });
  addNode(g, { id: 'NETWORK_TRAFFIC',      type: NODE_TYPE.SIGNAL,  label: 'Network Traffic Volume',     domain: 'TECHNOLOGY', observabilityScore: 0.72, latencyDays: 3,   stabilityIndex: 0.80 });
  addNode(g, { id: 'WATER_USAGE',          type: NODE_TYPE.SIGNAL,  label: 'Industrial Water Usage',     domain: 'TECHNOLOGY', observabilityScore: 0.65, latencyDays: 30,  stabilityIndex: 0.88 });
  addNode(g, { id: 'FREIGHT_LOGISTICS',    type: NODE_TYPE.SIGNAL,  label: 'Freight / Shipping Volume',  domain: 'CAPITAL',    observabilityScore: 0.70, latencyDays: 60,  stabilityIndex: 0.75 });
  addNode(g, { id: 'SEC_FILING',           type: NODE_TYPE.DATASET, label: 'SEC Filing',                 domain: 'CAPITAL',    observabilityScore: 0.95, latencyDays: 90,  stabilityIndex: 0.95 });
  addNode(g, { id: 'EARNINGS_CALL',        type: NODE_TYPE.EVENT,   label: 'Earnings Call',              domain: 'CAPITAL',    observabilityScore: 0.90, latencyDays: 90,  stabilityIndex: 0.85 });
  addNode(g, { id: 'MARKET_PRICE',         type: NODE_TYPE.SIGNAL,  label: 'Market Price',               domain: 'CAPITAL',    observabilityScore: 0.99, latencyDays: 0,   stabilityIndex: 0.60 });
  addNode(g, { id: 'NEWS_ARTICLE',         type: NODE_TYPE.SIGNAL,  label: 'News Coverage',              domain: 'MEDIA',      observabilityScore: 0.60, latencyDays: 1,   stabilityIndex: 0.40 });
  addNode(g, { id: 'SOCIAL_MEDIA',         type: NODE_TYPE.SIGNAL,  label: 'Social Media Signal',        domain: 'MEDIA',      observabilityScore: 0.30, latencyDays: 0,   stabilityIndex: 0.20 });

  addEdge(g, { from: 'CONSTRUCTION_PERMITS', to: 'POWER_INFRA',       type: EDGE_TYPE.CAUSES,          lag_estimate_days: 365, confidence: 0.80 });
  addEdge(g, { from: 'POWER_INFRA',          to: 'COMPUTE_CAPACITY',  type: EDGE_TYPE.CAUSES,          lag_estimate_days: 180, confidence: 0.75 });
  addEdge(g, { from: 'COMPUTE_CAPACITY',     to: 'POWER_LOAD',        type: EDGE_TYPE.CAUSES,          lag_estimate_days: 30,  confidence: 0.85 });
  addEdge(g, { from: 'POWER_LOAD',           to: 'POWER_CONSUMPTION', type: EDGE_TYPE.CAUSES,          lag_estimate_days: 7,   confidence: 0.90 });
  addEdge(g, { from: 'POWER_CONSUMPTION',    to: 'MARKET_PRICE',      type: EDGE_TYPE.PRECEDES,        lag_estimate_days: 14,  confidence: 0.55 });
  addEdge(g, { from: 'FREIGHT_LOGISTICS',    to: 'MARKET_PRICE',      type: EDGE_TYPE.PRECEDES,        lag_estimate_days: 21,  confidence: 0.60 });
  addEdge(g, { from: 'SEC_FILING',           to: 'MARKET_PRICE',      type: EDGE_TYPE.PRECEDES,        lag_estimate_days: 90,  confidence: 0.70 });
  addEdge(g, { from: 'EARNINGS_CALL',        to: 'MARKET_PRICE',      type: EDGE_TYPE.PRECEDES,        lag_estimate_days: 1,   confidence: 0.75 });
  addEdge(g, { from: 'NETWORK_TRAFFIC',      to: 'COMPUTE_CAPACITY',  type: EDGE_TYPE.CORRELATES_WITH, lag_estimate_days: 14,  confidence: 0.65 });
  addEdge(g, { from: 'WATER_USAGE',          to: 'COMPUTE_CAPACITY',  type: EDGE_TYPE.CORRELATES_WITH, lag_estimate_days: 30,  confidence: 0.60 });
  addEdge(g, { from: 'NEWS_ARTICLE',         to: 'MARKET_PRICE',      type: EDGE_TYPE.PRECEDES,        lag_estimate_days: 0,   confidence: 0.40 });

  // Negative constraint — SOCIAL_MEDIA alone does not structurally cause MARKET_PRICE
  addEdge(g, { from: 'SOCIAL_MEDIA', to: 'MARKET_PRICE', type: EDGE_TYPE.CORRELATES_WITH, lag_estimate_days: 0, confidence: 0.25, negative: true });

  return g;
}
