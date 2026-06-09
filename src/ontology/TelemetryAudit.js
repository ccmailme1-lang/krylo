/**
 * src/ontology/TelemetryAudit.js
 *
 * WO-806: Telemetry Parity
 * Audits GPU InstancedMesh attribute buffers against stateRef ground truth.
 * Reports per-attribute deviation percentage and flags any attribute exceeding
 * the 2% tolerance threshold.
 *
 * Attributes audited:
 *   aRadiusNorm  vs  node.r           (polar radius, 0–1)
 *   aFidelity    vs  node.fsVal        (fidelity score, 0–1)
 *   aSovereign   vs  node.nodeState === NS.L1_ANCHORED
 *   aShattered   vs  node.isShattered
 *
 * aIdentityColor, aSearchMatch, aScale are excluded — they are derived values
 * that may legitimately differ from raw physics state by design (zone override,
 * TTL decay, search spring).
 *
 * Usage:
 *   const report = auditMeshParity(geometry, stateRef, NS);
 *   if (!report.passed) console.warn('[TELEMETRY]', report);
 */

const TOLERANCE = 0.02; // 2% deviation threshold

/**
 * Computes relative deviation between a GPU buffer value and ground truth.
 * Avoids division by zero by flooring the denominator at 0.001.
 */
function relDev(gpuVal, truthVal) {
  return Math.abs(gpuVal - truthVal) / Math.max(Math.abs(truthVal), 0.001);
}

/**
 * auditMeshParity(geometry, stateRef, NS)
 *
 * @param {THREE.BufferGeometry} geometry  — InstancedMesh geometry with named attributes
 * @param {{ current: Array }}   stateRef  — physics state array ref
 * @param {Object}               NS        — node state enum { NORMAL, L1_APPROACH, L1_ANCHORED, SHATTERED }
 *
 * @returns {{
 *   passed:    boolean,
 *   timestamp: string,
 *   nodeCount: number,
 *   attributes: Array<{
 *     name:         string,
 *     samples:      number,
 *     outliers:     number,
 *     deviationPct: number,
 *     maxDeviation: number,
 *     passed:       boolean,
 *   }>
 * }}
 */
export function auditMeshParity(geometry, stateRef, NS) {
  const nodes = stateRef.current;

  const checks = [
    {
      name:  'aRadiusNorm',
      truth: (node) => node.r ?? 0,
      gpu:   (idx)  => geometry.attributes.aRadiusNorm?.array[idx] ?? 0,
    },
    {
      name:  'aFidelity',
      truth: (node) => node.fsVal ?? 0,
      gpu:   (idx)  => geometry.attributes.aFidelity?.array[idx] ?? 0,
    },
    {
      name:  'aSovereign',
      truth: (node) => (node.nodeState === NS.L1_ANCHORED ? 1.0 : 0.0),
      gpu:   (idx)  => geometry.attributes.aSovereign?.array[idx] ?? 0,
    },
    {
      name:  'aShattered',
      truth: (node) => (node.isShattered ? 1.0 : 0.0),
      gpu:   (idx)  => geometry.attributes.aShattered?.array[idx] ?? 0,
    },
  ];

  const attrResults = checks.map(({ name, truth, gpu }) => {
    let samples    = 0;
    let outliers   = 0;
    let maxDev     = 0;
    let totalDev   = 0;

    nodes.forEach((node) => {
      if (!node.primary) return;
      const idx = node.index;
      const t   = truth(node);
      const g   = gpu(idx);
      const dev = relDev(g, t);

      samples++;
      totalDev += dev;
      if (dev > maxDev) maxDev = dev;
      if (dev > TOLERANCE) outliers++;
    });

    const deviationPct = samples > 0 ? (outliers / samples) * 100 : 0;

    return {
      name,
      samples,
      outliers,
      deviationPct: Math.round(deviationPct * 100) / 100,
      maxDeviation: Math.round(maxDev * 10000) / 10000,
      passed: deviationPct <= 2.0,
    };
  });

  const passed = attrResults.every(r => r.passed);

  return {
    passed,
    timestamp:  new Date().toISOString(),
    nodeCount:  nodes.filter(n => n.primary).length,
    attributes: attrResults,
  };
}

/**
 * formatAuditReport(report)
 * Returns a compact console-printable string for the audit result.
 */
export function formatAuditReport(report) {
  const status = report.passed ? '✅ PASS' : '⚠️  FAIL';
  const lines  = [
    `[WO-806 TELEMETRY] ${status} | ${report.timestamp} | nodes: ${report.nodeCount}`,
  ];
  report.attributes.forEach(a => {
    const flag = a.passed ? '  OK' : ' !!';
    lines.push(
      `${flag}  ${a.name.padEnd(14)} dev: ${a.deviationPct.toFixed(2)}% outliers: ${a.outliers}/${a.samples}  maxDev: ${a.maxDeviation}`
    );
  });
  return lines.join('\n');
}
