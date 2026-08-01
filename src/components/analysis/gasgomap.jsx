import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// GasGoMap — KRYL-1076. Real Leaflet + OpenStreetMap basemap under REAL fuel-station locations
// (OSM Overpass, via petrolocator.findNearbyStations). Same data source for the basemap tiles
// as for the station pins — one provider, no second API dependency, no billing account, no key.
//
// Honesty contract (§20/§22): every dot is a real station location. Overpass itself carries no
// price. The optional `petro` prop (real per-station Apify result, fetched separately) is only
// ever attached to a pin when its station name matches an OSM pin's name exactly — no fuzzy
// guess, no "nearest pin wins by default." If no confident match exists, no pin gets a price;
// this component never fabricates or forces a price onto the wrong station.

const LIME = '#66FF00';
const MONO = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const DIM  = 'rgba(255,255,255,0.25)';
const MID  = 'rgba(255,255,255,0.55)';
const BRT  = 'rgba(255,255,255,0.9)';

// KRYLO dark HUD tile filter — OSM's default tiles are light; invert+hue-rotate gets a
// dark basemap without a second (paid) dark-tile provider.
const TILE_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.7)';

// Leaflet's default tooltip chrome (white box, black text, CSS arrow) doesn't match the
// KRYLO dark HUD — scoped override so every hover, priced or not, stays on-brand.
const TOOLTIP_STYLE = `
.gasgo-tooltip.leaflet-tooltip {
  background: #000; border: 1px solid rgba(102,255,0,0.4); border-radius: 4px;
  color: rgba(255,255,255,0.75); font-family: ${MONO}; font-size: 10px; letter-spacing: 0.06em;
  padding: 6px 9px; box-shadow: 0 0 16px rgba(102,255,0,0.12);
}
.gasgo-tooltip.leaflet-tooltip-top:before { border-top-color: rgba(102,255,0,0.4); }
`;

const youIcon = L.divIcon({
  className: 'gasgo-you-icon',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#007FFF;box-shadow:0 0 0 6px rgba(0,127,255,0.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function pinIcon(isNearest) {
  const size = isNearest ? 16 : 11;
  const color = isNearest ? LIME : 'rgba(102,255,0,0.55)';
  return L.divIcon({
    className: 'gasgo-pin-icon',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};${isNearest ? `box-shadow:0 0 0 5px rgba(102,255,0,0.25)` : ''}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Numbered pin for the same nearest-5 stations the price cards render — 1:1, so card #n on
// the right always points at pin #n on the map, same proximity ranking, no separate logic.
function rankIcon(n) {
  const size = 18;
  return L.divIcon({
    className: 'gasgo-rank-icon',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${LIME};box-shadow:0 0 0 4px rgba(102,255,0,0.28);display:flex;align-items:center;justify-content:center;font-family:${MONO};font-size:9px;font-weight:700;color:#000;">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Exact-name match only (case/whitespace-insensitive) — a substring/fuzzy match risks pinning
// a real price to the wrong station, which is the one thing this component must never do.
function findPricedStation(stations, petro) {
  if (!petro?.station || petro.withheld) return null;
  const target = String(petro.station).trim().toLowerCase();
  return stations.find(s => String(s.name ?? '').trim().toLowerCase() === target) ?? null;
}

function priceHudHtml(station, petro) {
  return `
    <div style="font-family:${SERIF};font-size:7px;color:${BRT};margin-bottom:2px">${station.name}</div>
    <div style="font-family:${MONO};font-size:5px;color:${MID};margin-bottom:3px">${petro.address ?? ''}</div>
    <div style="font-family:${MONO};font-size:8px;color:${LIME};text-shadow:0 0 5px rgba(102,255,0,0.5)">$${petro.price}<span style="font-size:5px;color:${DIM};margin-left:2px">/gal</span></div>
  `;
}

export default function GasGoMap({ data, petro, rankedStations }) {
  const mapElRef = useRef(null);
  const mapRef   = useRef(null);

  useEffect(() => {
    if (!mapElRef.current || !data?.stations?.length || !data.origin) return;

    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    });
    tiles.addTo(map);
    const tilePane = map.getPane('tilePane');
    if (tilePane) tilePane.style.filter = TILE_FILTER;

    L.marker([data.origin.lat, data.origin.lon], { icon: youIcon }).addTo(map);

    const nearest = data.stations.reduce((a, b) => (b.miles < a.miles ? b : a));
    const priced  = findPricedStation(data.stations, petro);
    // Same station ids the price cards render, in the same order — pin #n on the map is
    // exactly card #n in the stack, one shared ranking computed once in petrotemplate.jsx.
    const rankOf = new Map((rankedStations ?? []).map((s, i) => [s.id, i + 1]));

    const boundsPoints = [[data.origin.lat, data.origin.lon]];
    for (const s of data.stations) {
      const rank = rankOf.get(s.id);
      const icon = rank ? rankIcon(rank) : pinIcon(s.id === nearest.id);
      const marker = L.marker([s.lat, s.lon], { icon }).addTo(map);
      const rankPrefix = rank ? `#${rank} · ` : '';
      if (priced && s.id === priced.id) {
        marker.bindTooltip(priceHudHtml(s, petro), { direction: 'top', className: 'gasgo-tooltip', opacity: 1 });
      } else {
        marker.bindTooltip(`${rankPrefix}${s.name} · ${s.miles.toFixed(1)} mi`, { direction: 'top', className: 'gasgo-tooltip' });
      }
      boundsPoints.push([s.lat, s.lon]);
    }

    // Default view = fit every station in frame, not a fixed zoom centered on origin.
    map.fitBounds(L.latLngBounds(boundsPoints), { padding: [24, 24] });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, [data, petro]);

  if (!data?.stations?.length || !data.origin) return null;
  const nearest = data.stations.reduce((a, b) => (b.miles < a.miles ? b : a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'gasgo-rise 340ms ease' }}>
      <style>{TOOLTIP_STYLE}</style>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.34em', color: LIME }}>
        ◆ STATION FIELD · {data.stations.length} NEARBY
      </div>

      <div
        ref={mapElRef}
        style={{
          width: 576, height: 576, borderRadius: 6,
          background: '#000',
        }}
      />

      {/* Legend — identity is never color-alone: each caption carries its own swatch matching
          the actual marker color/size on the map, rather than relying on memory of the pins. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 8.8, color: MID, letterSpacing: '0.14em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LIME, boxShadow: `0 0 0 3px rgba(102,255,0,0.25)`, flexShrink: 0 }} />
          NEAREST · {nearest.name.toUpperCase()} · {nearest.miles.toFixed(1)} MI
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 8.8, color: DIM, letterSpacing: '0.14em', flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#007FFF', boxShadow: '0 0 0 3px rgba(0,127,255,0.25)', flexShrink: 0 }} />
          YOU
        </span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.16em' }}>
        SOURCE: OPENSTREETMAP (locations) + APIFY/GASBUDDY (price, hover a pin) · {petro?.station ? 'PRICED PIN MATCHED' : 'NO PRICE MATCH ON THIS MAP'}
      </div>
    </div>
  );
}
