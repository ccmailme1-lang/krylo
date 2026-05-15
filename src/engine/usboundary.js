// WO-755 — US Boundary Normalizer
// Fetches TopoJSON once, extracts all state polygon rings in scene XZ coords,
// exposes isInsideUS(x, z) for spawn PIP.
// Physics falls back to ellipse until boundaryReady resolves.

import * as topojson from 'topojson-client';
import { geoAlbersUsa } from 'd3-geo';

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// ── Shared projection (mirrors usmesh.jsx) ────────────────────────────────────
const _albersProj = geoAlbersUsa().scale(1280).translate([480, 300]);

export function latLonToScene(lat, lon) {
  const p = _albersProj([lon, lat]);
  if (!p) return null;
  const x = (p[0] / 960 - 0.5) * 20;  // → scene X: -10 to 10
  const z = (p[1] / 600 - 0.5) * 12;  // → scene Z: -6 to 6
  return [x, z];
}

// ── Internal state ────────────────────────────────────────────────────────────
let _polygons = null;   // Vec2[][] — all state outer rings in scene XZ
let _bbox     = null;   // { minX, maxX, minZ, maxZ }
let _ready    = false;

// ── PIP: Ray casting (horizontal ray +X) ─────────────────────────────────────
function pointInPolygon(px, pz, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    if (((zi > pz) !== (zj > pz)) &&
        (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * isInsideUS(x, z) — point-in-polygon test against all state rings.
 * Returns true when boundary not yet loaded (allow-all fallback).
 * Returns true if the point is inside any US state polygon.
 */
export function isInsideUS(x, z) {
  if (!_ready || !_polygons) return true; // boundary not loaded → allow (ellipse still guards)
  if (x < _bbox.minX || x > _bbox.maxX || z < _bbox.minZ || z > _bbox.maxZ) return false;
  return _polygons.some(poly => pointInPolygon(x, z, poly));
}

/**
 * boundaryReady — Promise that resolves when polygon data is loaded and validated.
 * Rejects silently on load failure (ellipse fallback remains active).
 */
export const boundaryReady = fetch(TOPO_URL)
  .then(r => {
    if (!r.ok) throw new Error(`TopoJSON fetch ${r.status}`);
    return r.json();
  })
  .then(data => {
    const fc = topojson.feature(data, data.objects.states);
    const polys = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    fc.features.forEach(feature => {
      if (!feature.geometry) return;

      // Normalize Polygon / MultiPolygon to same shape
      const rings = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

      rings.forEach(polygon => {
        const outer = polygon[0];
        if (!outer || outer.length < 3) return;

        const verts = [];
        outer.forEach(([lon, lat]) => {
          const p = latLonToScene(lat, lon);
          if (!p) return;
          const [x, z] = p;
          verts.push({ x, z });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        });

        // Validation: at least 3 finite vertices, non-degenerate
        const valid = verts.length >= 3 &&
          verts.every(v => Number.isFinite(v.x) && Number.isFinite(v.z));
        if (valid) polys.push(verts);
      });
    });

    if (polys.length === 0) throw new Error('No valid polygons extracted');
    if (!Number.isFinite(minX)) throw new Error('Degenerate bbox');

    _polygons = polys;
    _bbox     = { minX, maxX, minZ, maxZ };
    _ready    = true;

    console.log(`✅ [WO-755] US boundary ready — ${polys.length} polygons | bbox X:[${minX.toFixed(2)},${maxX.toFixed(2)}] Z:[${minZ.toFixed(2)},${maxZ.toFixed(2)}]`);
  })
  .catch(e => {
    console.error('❌ [WO-755] Boundary load failed — ellipse fallback active:', e.message);
  });
