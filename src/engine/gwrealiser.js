// gwrealiser.js — KRYL-Lean-Ontology M1: Windowed Snapshot Realiser (G_W)
//
// Virtual/on-demand query, per architecture-recon/007's decision note — NOT a
// materialized graph. Every call recomputes C subset-of G_W fresh from the live O/E/R
// stores; nothing here is cached or persisted across calls. This choice is not arbitrary:
// see 007 for the full evaluation (§21 Route-Don't-Aggregate, WO-2004's own immutable/
// pure-function discipline, and entitytopologyregistry.js's documented v1/v2 staleness
// bug as a live counter-example of what a naive materialized graph already costs KRYLO).
//
// Reads directly from:
//   O — entity ids referenced by R edges (entityresolution.js is the O store itself;
//       this module does not re-import or duplicate its data, it only reads the edge
//       endpoints already produced by entitytopologyregistry.js)
//   E — CanonicalEvent[] supplied by the caller. No global event store exists yet
//       (audit 001/002 confirmed this) — this module does not invent one; it queries
//       whatever the caller is already holding.
//   R — entitytopologyregistry.js's live TYPED_EDGES, now temporally-scoped via
//       validFrom/validTo (added in the same pass as this file).
//
// ℒ(x,t)=⊤ filter, stated precisely (not inferred): an R edge is "present" within window
// W if its validity interval [validFrom, validTo ?? now] intersects W. A CanonicalEvent
// is "present" within W if status === 'ACTIVE' (FRAGMENTED events are excluded — they are
// an explicit KRYLO state, not a Lean ℒ=⊥, but treating them as absent from a live
// snapshot is the correct read: a fragmented event's evidence didn't disappear, but the
// event's own identity claim did not hold together) AND its timeWindow intersects W.
//
// O participation: O entities are not time-scoped anywhere in current KRYLO (audit 003 —
// no created_at/lifecycle on static entities). An O vertex enters G_W only via being
// referenced by a present E or R within the window; this module does not invent an O
// presence concept beyond that.

import { TYPED_EDGES, RELATION_TYPES } from './entitytopologyregistry.js';

// Exported so ontologycontracts.js (the T formalization) has one canonical window
// implementation to document/build on instead of a second parallel one.
export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function toMillis(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/**
 * realiseSnapshot({ window, events, edges, excludeBridges }) → snapshot
 *
 * window: { start, end } — Date | epoch-ms | ISO string. end: null means "through now."
 * events: CanonicalEvent[] the caller already holds (identitykernel.js shape). Optional
 *   — omit if you only care about the R/O portion of the snapshot.
 * edges: override the live TYPED_EDGES (mainly for tests) — defaults to the real,
 *   currently-registered edges.
 * excludeBridges: drop RELATION_TYPES.BRIDGES_TO synthetic identity-bridge edges by
 *   default (see entitytopologyregistry.js's bridgeV1ToV2) — those exist to make
 *   findPath() traverse v1/v2 identity schemes, not to represent a real-world
 *   relationship, and should not leak into a Σ engine's E_Σ unless explicitly requested.
 *
 * Returns { window: {start, end} (resolved to ms), vertices: Map<id, {id, kind, ref}>,
 * edges: Array<edge> } — a plain-data snapshot, not a class instance, not stored anywhere
 * by this function. Call it again and it recomputes fresh from current TYPED_EDGES/events.
 */
export function realiseSnapshot({ window, events = [], edges = null, excludeBridges = true } = {}) {
  const wStart = toMillis(window?.start) ?? -Infinity;
  const wEnd   = toMillis(window?.end)   ?? Date.now();

  const sourceEdges = edges ?? TYPED_EDGES;

  const presentEdges = sourceEdges.filter(e => {
    if (excludeBridges && e.type === RELATION_TYPES.BRIDGES_TO) return false;
    const validFrom = toMillis(e.validFrom) ?? toMillis(e.ts) ?? 0;
    const validTo   = e.validTo != null ? toMillis(e.validTo) : Date.now();
    return intervalsOverlap(validFrom, validTo, wStart, wEnd);
  });

  const presentEvents = events.filter(ev => {
    if (ev?.status !== 'ACTIVE') return false;
    const start = toMillis(ev?.timeWindow?.start) ?? -Infinity;
    const end   = ev?.timeWindow?.end != null ? toMillis(ev.timeWindow.end) : Date.now();
    return intervalsOverlap(start, end, wStart, wEnd);
  });

  const vertices = new Map();
  for (const e of presentEdges) {
    if (!vertices.has(e.from)) vertices.set(e.from, { id: e.from, kind: 'O', ref: null });
    if (!vertices.has(e.to))   vertices.set(e.to,   { id: e.to,   kind: 'O', ref: null });
  }
  for (const ev of presentEvents) {
    if (ev?.identityId) vertices.set(ev.identityId, { id: ev.identityId, kind: 'E', ref: ev });
  }

  return { window: { start: wStart, end: wEnd }, vertices, edges: presentEdges };
}

/**
 * connectedSubgraph(snapshot, seedId, maxDegrees=6) → C ⊆ G_W
 *
 * rc3 §7 (audit 002/005): signals consume "some connected sub-graph C ⊆ G_W," never the
 * whole graph. This is that function — BFS outward from one vertex, scoped entirely to
 * an already-realised snapshot's own edge set (does not re-query TYPED_EDGES or go back
 * to the live stores — a signal calling this gets a stable, self-consistent C for the
 * snapshot it was handed, not a moving target).
 *
 * Returns { vertices: Map, edges: Array } — same shape as realiseSnapshot's output,
 * restricted to the connected component containing seedId. Empty result (empty Map/[])
 * if seedId isn't in the snapshot — never throws, never fabricates a fallback.
 */
export function connectedSubgraph(snapshot, seedId, maxDegrees = 6) {
  const empty = { vertices: new Map(), edges: [] };
  if (!snapshot?.vertices?.has(seedId)) return empty;

  const adjacency = new Map();
  for (const e of snapshot.edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to))   adjacency.set(e.to, []);
    adjacency.get(e.from).push({ neighbor: e.to, edge: e });
    adjacency.get(e.to).push({ neighbor: e.from, edge: e });
  }

  const visitedVertices = new Map([[seedId, snapshot.vertices.get(seedId)]]);
  const visitedEdges = new Set();
  let frontier = [seedId];

  for (let degree = 0; degree < maxDegrees && frontier.length; degree++) {
    const next = [];
    for (const node of frontier) {
      for (const { neighbor, edge } of adjacency.get(node) ?? []) {
        visitedEdges.add(edge);
        if (!visitedVertices.has(neighbor)) {
          visitedVertices.set(neighbor, snapshot.vertices.get(neighbor) ?? { id: neighbor, kind: 'O', ref: null });
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  return { vertices: visitedVertices, edges: [...visitedEdges] };
}
