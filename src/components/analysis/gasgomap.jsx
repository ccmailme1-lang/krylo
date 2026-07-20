import React, { useMemo } from 'react';

// GasGoMap — KRYL-1076. Flat 2D pin-plot of REAL fuel-station locations (OSM Overpass,
// via petrolocator.findNearbyStations). No external tile server, no dependency, no basemap —
// pins are plotted from real lat/lon on the KRYLO lime/black HUD. This is a density read
// ("the fuel field around you"), not a street-navigation map.
//
// Honesty contract (§20/§22): every dot is a real station location. There is NO per-station
// price here — Overpass carries none. Price is the EIA regional average, shown by the card
// around this map and labeled as such. This component never renders a price on a pin.

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const DIM  = 'rgba(255,255,255,0.25)';
const MID  = 'rgba(255,255,255,0.55)';

// Equirectangular projection is fine at neighbourhood scale. Longitude degrees shrink by
// cos(latitude); correcting for it keeps the relative geometry honest rather than stretched.
function project(stations, origin, size, pad) {
  const latC = origin.lat, lonC = origin.lon;
  const cosLat = Math.cos((latC * Math.PI) / 180) || 1;

  const pts = stations.map(s => ({
    ...s,
    x: (s.lon - lonC) * cosLat,
    y: (s.lat - latC),           // north-positive; flipped to screen space below
  }));

  // Symmetric extent around the origin so YOU stays centered.
  let maxAbs = 0;
  for (const p of pts) maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y));
  if (maxAbs === 0) maxAbs = 1; // single/coincident point — avoid divide-by-zero

  const usable = size / 2 - pad;
  const scale  = usable / maxAbs;
  const c      = size / 2;

  return pts.map(p => ({
    ...p,
    px: c + p.x * scale,
    py: c - p.y * scale,          // screen y grows downward
  }));
}

export default function GasGoMap({ data }) {
  const SIZE = 320, PAD = 26;

  const projected = useMemo(() => {
    if (!data?.stations?.length || !data.origin) return [];
    return project(data.stations, data.origin, SIZE, PAD);
  }, [data]);

  if (!projected.length) return null;

  const nearest = projected.reduce((a, b) => (b.miles < a.miles ? b : a));
  const c = SIZE / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'gasgo-rise 340ms ease' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.34em', color: LIME }}>
        ◆ STATION FIELD · {projected.length} NEARBY
      </div>

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
           style={{ border: '1px solid rgba(102,255,0,0.22)', borderRadius: 6, background:
             'radial-gradient(circle at 50% 50%, rgba(102,255,0,0.05), transparent 70%), #000' }}>
        {/* faint grid — reference only, no geographic claim */}
        {[0.25, 0.5, 0.75].map(f => (
          <g key={f} stroke="rgba(102,255,0,0.08)" strokeWidth="1">
            <line x1={SIZE * f} y1={PAD} x2={SIZE * f} y2={SIZE - PAD} />
            <line x1={PAD} y1={SIZE * f} x2={SIZE - PAD} y2={SIZE * f} />
          </g>
        ))}

        {/* range rings around YOU */}
        {[0.28, 0.5].map(f => (
          <circle key={f} cx={c} cy={c} r={(SIZE / 2 - PAD) * f}
                  fill="none" stroke="rgba(102,255,0,0.12)" strokeWidth="1" strokeDasharray="2 4" />
        ))}

        {/* station pins */}
        {projected.map(p => {
          const isNearest = p.id === nearest.id;
          return (
            <g key={p.id}>
              <circle cx={p.px} cy={p.py} r={isNearest ? 5 : 3.5}
                      fill={isNearest ? LIME : 'rgba(102,255,0,0.45)'}
                      stroke={isNearest ? LIME : 'none'} strokeWidth="1">
                <title>{`${p.name} · ${p.miles.toFixed(1)} mi`}</title>
              </circle>
              {isNearest && (
                <circle cx={p.px} cy={p.py} r="9" fill="none" stroke={LIME} strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* YOU — origin marker */}
        <circle cx={c} cy={c} r="4" fill="#fff" />
        <circle cx={c} cy={c} r="4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6">
          <animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.14em' }}>
          NEAREST · {nearest.name.toUpperCase()} · {nearest.miles.toFixed(1)} MI
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.14em' }}>◉ YOU</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.16em' }}>
        SOURCE: OPENSTREETMAP · REAL STATION LOCATIONS · NOT PER-STATION PRICE
      </div>
    </div>
  );
}
