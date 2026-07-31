import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// GasGoMap — KRYL-1076. Real Leaflet + OpenStreetMap basemap under REAL fuel-station locations
// (OSM Overpass, via petrolocator.findNearbyStations). Same data source for the basemap tiles
// as for the station pins — one provider, no second API dependency, no billing account, no key.
//
// Honesty contract (§20/§22): every dot is a real station location. There is NO per-station
// price here — Overpass carries none. Price is the EIA regional average, shown by the card
// around this map and labeled as such. This component never renders a price on a pin.

const LIME = '#66FF00';
const MONO = "'IBM Plex Mono', monospace";
const DIM  = 'rgba(255,255,255,0.25)';
const MID  = 'rgba(255,255,255,0.55)';

// KRYLO dark HUD tile filter — OSM's default tiles are light; invert+hue-rotate gets a
// dark basemap without a second (paid) dark-tile provider.
const TILE_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.7)';

const youIcon = L.divIcon({
  className: 'gasgo-you-icon',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,0.18)"></div>`,
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

export default function GasGoMap({ data }) {
  const mapElRef = useRef(null);
  const mapRef   = useRef(null);

  useEffect(() => {
    if (!mapElRef.current || !data?.stations?.length || !data.origin) return;

    const map = L.map(mapElRef.current, {
      center: [data.origin.lat, data.origin.lon],
      zoom: 14,
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
    for (const s of data.stations) {
      L.marker([s.lat, s.lon], { icon: pinIcon(s.id === nearest.id) })
        .addTo(map)
        .bindTooltip(`${s.name} · ${s.miles.toFixed(1)} mi`, { direction: 'top' });
    }

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, [data]);

  if (!data?.stations?.length || !data.origin) return null;
  const nearest = data.stations.reduce((a, b) => (b.miles < a.miles ? b : a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'gasgo-rise 340ms ease' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.34em', color: LIME }}>
        ◆ STATION FIELD · {data.stations.length} NEARBY
      </div>

      <div
        ref={mapElRef}
        style={{
          width: 320, height: 320, borderRadius: 6,
          border: '1px solid rgba(102,255,0,0.22)',
          background: '#000',
        }}
      />

      {/* Legend — identity is never color-alone: each caption carries its own swatch matching
          the actual marker color/size on the map, rather than relying on memory of the pins. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9, color: MID, letterSpacing: '0.14em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: LIME, boxShadow: `0 0 0 3px rgba(102,255,0,0.25)`, flexShrink: 0 }} />
          NEAREST · {nearest.name.toUpperCase()} · {nearest.miles.toFixed(1)} MI
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.14em', flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 3px rgba(255,255,255,0.18)', flexShrink: 0 }} />
          YOU
        </span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.16em' }}>
        SOURCE: OPENSTREETMAP · REAL STATION LOCATIONS · NOT PER-STATION PRICE
      </div>
    </div>
  );
}
