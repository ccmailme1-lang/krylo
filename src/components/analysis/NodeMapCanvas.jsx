// NodeMapCanvas.jsx — CL-11: Full Field Render Orchestration
// Strict phase separation: COMPUTE (useEffect) vs RENDER (RAF loop)
// RAF loop reads only — no layout computation during render.
// Subsystems: CL-01 nodes · CL-02 edges · CL-03A clusters · CL-04 state machine

import React, { useRef, useEffect, useCallback } from "react";
import { createClusterStateMachine, hitTestCluster, CLUSTER_STATE } from "../../engine/clusterStateMachine.js";

const MAX_EDGES_PER_NODE  = 3;
const EDGE_TTL_MS         = 1000;
const CLUSTER_RADIUS      = 110;
const CLUSTER_THRESHOLD   = 5;
const CLUSTER_DECAY       = 0.88;

// ── COMPUTE PHASE — cluster aggregation (CL-03A) ─────────────────────────────
// Called from useEffect only. Never from RAF loop.
function computeClusters(nodes, prevClusters) {
  if (nodes.length < CLUSTER_THRESHOLD) return [];

  const grid     = new Map();
  const cellSize = CLUSTER_RADIUS * 0.75;

  for (const node of nodes) {
    const gx  = Math.floor(node.x / cellSize);
    const gy  = Math.floor(node.y / cellSize);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, { key, nodes: [] });
    grid.get(key).nodes.push(node);
  }

  const prevById = {};
  for (const c of prevClusters) prevById[c.id] = c;

  const clusters = [];
  grid.forEach(cell => {
    if (cell.nodes.length < CLUSTER_THRESHOLD) return;

    let sumX = 0, sumY = 0, maxIntensity = 0, emergenceCount = 0;
    for (const n of cell.nodes) {
      sumX += n.x; sumY += n.y;
      maxIntensity = Math.max(maxIntensity, n.intensity || 0);
      if (n.mode === "EMERGENCE") emergenceCount++;
    }

    const count  = cell.nodes.length;
    const rawX   = sumX / count;
    const rawY   = sumY / count;
    const rawR   = Math.sqrt(count) * 19 + 45;
    const rawStr = Math.min(0.95, (count - CLUSTER_THRESHOLD + 2) / 18);
    const id     = `cluster-${cell.key}`;
    const prev   = prevById[id];

    clusters.push({
      id,
      x:         prev ? prev.x        * 0.65 + rawX   * 0.35 : rawX,
      y:         prev ? prev.y        * 0.65 + rawY   * 0.35 : rawY,
      radius:    prev ? prev.radius   * 0.70 + rawR   * 0.30 : rawR,
      strength:  prev ? prev.strength * CLUSTER_DECAY + rawStr * (1 - CLUSTER_DECAY) : rawStr,
      intensity: maxIntensity,
      emergence: emergenceCount / count > 0.35,
      nodeCount: count,
      nodeIds:   cell.nodes.map(n => n.id),
    });
  });

  return clusters;
}

// ── COMPUTE PHASE — edge culling (CL-02) ─────────────────────────────────────
// Culled once per data update. RAF reads the result.
function cullEdges(edges) {
  const edgeMap = new Map();
  for (const e of edges) {
    if (!edgeMap.has(e.sourceId)) edgeMap.set(e.sourceId, []);
    edgeMap.get(e.sourceId).push(e);
  }
  const culled = [];
  edgeMap.forEach(group => {
    group.sort((a, b) => b.strength - a.strength);
    culled.push(...group.slice(0, MAX_EDGES_PER_NODE));
  });
  return culled;
}

// ── RENDER PHASE — draw edges ─────────────────────────────────────────────────
function renderEdges(ctx, edges, nodeIndex, now) {
  for (const edge of edges) {
    const age    = now - (edge.createdAt ?? now);
    const source = nodeIndex[edge.sourceId];
    const target = nodeIndex[edge.targetId];
    if (!source || !target) continue;

    const alpha = Math.max(0.35, edge.strength);
    if (alpha <= 0.02) continue;

    const midX    = (source.x + target.x) / 2;
    const midY    = (source.y + target.y) / 2;
    const offsetX = -(target.y - source.y) * 0.18 * edge.strength;
    const offsetY =  (target.x - source.x) * 0.18 * edge.strength;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, target.x, target.y);
    ctx.strokeStyle = `rgba(102,255,0,${alpha * 0.6})`;
    ctx.lineWidth  = 0.6 + edge.strength * 1.2;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
}

// ── RENDER PHASE — draw nodes ─────────────────────────────────────────────────
function renderNodes(ctx, nodes, t) {
  for (const node of nodes) {
    const r = 2.5 + (node.intensity || 1) * 3.2;

    if (node.mode === "EMERGENCE") {
      const pulse = 0.55 + Math.sin(t * 0.0025 + node.x * 0.01) * 0.45;
      ctx.save();
      ctx.globalAlpha = 0.22 * pulse;
      ctx.shadowColor = "rgba(255,255,255,0.85)";
      ctx.shadowBlur  = 18 * pulse;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = node.mode === "EMERGENCE" ? "rgba(102,255,0,1)"
                  : node.mode === "CAUSAL"    ? "rgba(102,255,0,0.6)"
                  : node.mode === "LIVE"      ? "rgba(102,255,0,0.4)"
                  : "rgba(102,255,0,0.3)";
    ctx.shadowBlur  = node.mode === "EMERGENCE" ? 16 : 0;
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.fill();
    ctx.restore();
  }
}

// ── RENDER PHASE — draw clusters ──────────────────────────────────────────────
function renderClusters(cCtx, clusters, sm) {
  for (const cluster of clusters) {
    const clState    = sm.get(cluster.id);
    const isFrozen   = clState === CLUSTER_STATE.FROZEN;
    const isExpanded = clState === CLUSTER_STATE.EXPANDED;
    const alpha      = cluster.strength * (cluster.emergence ? 0.9 : 0.6);

    // Outer soft field
    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(cluster.x, cluster.y, cluster.radius * 1.75, 0, Math.PI * 2);
    cCtx.fillStyle = cluster.emergence
      ? `rgba(255,245,190,${alpha * 0.22})`
      : `rgba(90,210,255,${alpha * 0.18})`;
    cCtx.fill();
    cCtx.restore();

    // Core blob
    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(cluster.x, cluster.y, cluster.radius, 0, Math.PI * 2);
    const grad = cCtx.createRadialGradient(
      cluster.x - 22, cluster.y - 22, cluster.radius * 0.25,
      cluster.x,       cluster.y,       cluster.radius * 1.15,
    );
    if (cluster.emergence) {
      grad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
      grad.addColorStop(0.6, `rgba(255,235,140,${alpha * 0.65})`);
      grad.addColorStop(1,   `rgba(255,180,60,0.15)`);
    } else {
      grad.addColorStop(0, `rgba(100,240,255,${alpha})`);
      grad.addColorStop(1, `rgba(40,140,220,0.08)`);
    }
    cCtx.fillStyle  = grad;
    cCtx.shadowBlur = cluster.emergence ? 48 : 32;
    cCtx.shadowColor = cluster.emergence ? "rgba(255,240,160,0.95)" : "rgba(100,220,255,0.7)";
    cCtx.fill();
    cCtx.restore();

    // State ring
    if (isFrozen || isExpanded) {
      cCtx.save();
      cCtx.beginPath();
      cCtx.arc(cluster.x, cluster.y, cluster.radius + 6, 0, Math.PI * 2);
      cCtx.strokeStyle = '#66FF00';
      cCtx.lineWidth   = isFrozen ? 1.5 : 0.8;
      cCtx.globalAlpha = isFrozen ? 0.9 : 0.5;
      if (!isFrozen) cCtx.setLineDash([6, 4]);
      cCtx.stroke();
      cCtx.setLineDash([]);
      cCtx.restore();
    }
  }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function NodeMapCanvas({ nodes = [], edges = [] }) {
  const canvasRef        = useRef(null);
  const clusterCanvasRef = useRef(null);
  const nodeIndexRef     = useRef({});      // id → node (for edge lookup)
  const culledEdgesRef   = useRef([]);      // pre-culled, read by RAF
  const clustersRef      = useRef([]);      // pre-computed, read by RAF
  const stateMachine     = useRef(createClusterStateMachine());

  // ── COMPUTE: rebuild node index + cull edges on data change ─────────────────
  useEffect(() => {
    const idx = {};
    const now = Date.now();
    for (const n of nodes) idx[n.id] = n;
    nodeIndexRef.current = idx;

    // Stamp createdAt on new edges; preserve existing
    const stamped = edges.map(e => e.createdAt ? e : { ...e, createdAt: now });
    culledEdgesRef.current = cullEdges(stamped);
  }, [nodes, edges]);

  // ── COMPUTE: rebuild clusters on node change ─────────────────────────────────
  useEffect(() => {
    clustersRef.current = computeClusters(nodes, clustersRef.current);
  }, [nodes]);

  // ── INTERACTION: pointer events + ESC (CL-04) ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sm = stateMachine.current;

    function onClick(e) {
      const id = hitTestCluster(clustersRef.current, e.clientX, e.clientY);
      if (!id) return;
      if (e.shiftKey) sm.freeze(id);
      else            sm.toggle(id);
    }
    function onKey(e) {
      if (e.key === 'Escape') sm.collapseAll();
    }

    canvas.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // ── RENDER: RAF loop — reads refs, draws only, no layout computation ──────────
  useEffect(() => {
    const canvas  = canvasRef.current;
    const cCanvas = clusterCanvasRef.current;
    if (!canvas || !cCanvas) return;

    const ctx  = canvas.getContext("2d", { alpha: true });
    const cCtx = cCanvas.getContext("2d", { alpha: true });

    function resize() {
      canvas.width = cCanvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = cCanvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    let frame;
    function loop(t) {
      const w   = canvas.width;
      const h   = canvas.height;
      const now = Date.now();
      const sm  = stateMachine.current;

      ctx.clearRect(0, 0, w, h);
      cCtx.clearRect(0, 0, w, h);

      // CL-02: edges (behind nodes)
      ctx.save();
      renderEdges(ctx, culledEdgesRef.current, nodeIndexRef.current, now);
      ctx.restore();

      // CL-01: nodes
      ctx.save();
      renderNodes(ctx, nodes, t);
      ctx.restore();

      // CL-04: frozen field dim
      if (sm.hasFrozen()) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // CL-03: clusters + state rings
      cCtx.save();
      renderClusters(cCtx, clustersRef.current, sm);
      cCtx.restore();

      frame = requestAnimationFrame(loop);
    }

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [nodes]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#050505", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
      <canvas
        ref={clusterCanvasRef}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.95 }}
      />
    </div>
  );
}
