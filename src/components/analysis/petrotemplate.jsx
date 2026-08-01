import React from 'react';
import GasGoMap from './gasgomap.jsx';

// PetroTemplate — the "Gas Go" hidden perk. A dedicated fuel surface that takes over
// the analysis pane: closest + cheapest fuel near you, styled as an unlocked easter-egg.
// On-brand KRYLO HUD (lime/black), isolated from the signal engine.
const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";
const LIME  = '#66FF00';
const DIM   = 'rgba(255,255,255,0.25)';
const MID   = 'rgba(255,255,255,0.5)';
const BRT   = 'rgba(255,255,255,0.9)';

const KEYFRAMES = `
@keyframes gasgo-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.7)} }
@keyframes gasgo-scan  { 0%{opacity:0.15} 50%{opacity:0.5} 100%{opacity:0.15} }
@keyframes gasgo-rise  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;

export default function PetroTemplate({ petro, stations }) {
  const pending = !petro || petro.loading;
  // Real gap found 2026-07-31: `pending` only tracked the price fetch. If the price path
  // (fast EIA average) resolved before the station-locations path (Overpass, sometimes slow),
  // pending went false while stations was still null — neither the map nor any loading text
  // rendered, showing a blank screen for however long Overpass took. Tracked separately so
  // there is always a visible state.
  const stationsPending = stations === null;
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(circle at 50% -10%, rgba(102,255,0,0.07), transparent 55%), #000',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{KEYFRAMES}</style>

      {/* faint scanline grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(102,255,0,0.035) 0 1px, transparent 1px 4px)',
        animation: 'gasgo-scan 3.2s ease-in-out infinite',
      }} />

      {/* header */}
      <div style={{ position: 'relative', padding: '20px 26px 16px', borderBottom: '1px solid rgba(102,255,0,0.18)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: LIME, boxShadow: `0 0 8px ${LIME}`, animation: 'gasgo-pulse 1.4s ease-in-out infinite' }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.5em', color: LIME, textTransform: 'uppercase' }}>⛽ Gas Go</span>
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 7, letterSpacing: '0.28em', color: 'rgba(102,255,0,0.7)', border: '1px solid rgba(102,255,0,0.35)', borderRadius: 999, padding: '3px 9px', textTransform: 'uppercase' }}>Hidden Perk · Unlocked</span>
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 21, color: BRT, letterSpacing: '0.01em' }}>Closest, cheapest fuel near you</div>
      </div>

      {/* body */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {(() => {
            // Same nearest-5 list feeds both the map pins and the cards, in the same order,
            // so card #1..#5 always match pin #1..#5 — one real proximity ranking, not two.
            // Deduped by name (e.g. Overpass sometimes returns the same station as both a
            // node and a way) so all 5 cards are 5 distinct real stations, not a repeat.
            const top5Stations = (() => {
              if (!(stations?.stations?.length > 0)) return [];
              const sorted = [...stations.stations].sort((a, b) => a.miles - b.miles);
              const seen = new Set();
              const uniq = [];
              for (const st of sorted) {
                const key = String(st.name ?? '').trim().toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                uniq.push(st);
                if (uniq.length === 5) break;
              }
              return uniq;
            })();
            const norm = s => String(s ?? '').trim().toLowerCase();
            const hasTop5Price = Array.isArray(petro?.top5) && petro.top5.length > 0;
            const areaAvg = petro?.average ?? petro?.price;

            const cards = top5Stations.length
              ? top5Stations.map(st => {
                  const matched = hasTop5Price ? petro.top5.find(s => norm(s.station) === norm(st.name)) : null;
                  if (matched) {
                    return { kicker: '◆ STATION AVERAGE', label: st.name, price: matched.price, meta: matched.address || `${st.miles.toFixed(1)} mi` };
                  }
                  if (areaAvg == null) return null;
                  return { kicker: '◆ AREA AVERAGE', label: st.name, price: areaAvg, meta: `${st.miles.toFixed(1)} mi · no confirmed station price` };
                }).filter(Boolean)
              : (petro && !petro.withheld && areaAvg != null)
                ? [{ kicker: `◆ ONE ${petro.scope ?? 'STATION'} AVERAGE`, label: petro.area ?? petro.station ?? '', price: areaAvg, meta: petro.type ? `${petro.type.toUpperCase()} · week of ${petro.period}` : (petro.address ?? '') }]
                : [];

            return (
              <>
                {/* KRYL-1076 — real station field (OSM). Renders whenever locations resolve, independent
                    of the price path, so a withheld price no longer leaves a blank card (TEST-010). */}
                {stations?.stations?.length > 0 && <GasGoMap data={stations} petro={petro} rankedStations={top5Stations} />}

                {/* Price cards — real station NAMES + proximity ranking come from the same
                    Overpass list the map pins use. Each card's number is either that exact
                    station's real Apify/GasBuddy price (name match) or, when no confident
                    match exists, the real area average — labeled AREA AVERAGE, never presented
                    as that station's own metered price. No name or price is invented. */}
                {cards.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 176, flexShrink: 0, marginTop: 22, animation: 'gasgo-rise 340ms ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cards.map((c, i) => (
                        <div key={i} style={{
                          position: 'relative', border: '1px solid rgba(102,255,0,0.4)', borderRadius: 4.86,
                          padding: '10.53px 12.15px', display: 'flex', flexDirection: 'column', gap: 5.265,
                          background: 'linear-gradient(rgba(102,255,0,0.05), transparent)',
                          boxShadow: '0 0 26px rgba(102,255,0,0.14), inset 0 0 20px rgba(102,255,0,0.04)',
                        }}>
                          {top5Stations.length > 0 && (
                            <span style={{
                              position: 'absolute', top: -7.2, left: -7.2, width: 14.4, height: 14.4, borderRadius: '50%',
                              background: LIME, color: '#000', fontFamily: MONO, fontSize: 8.1, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 0 0 3px #000, 0 0 8px rgba(102,255,0,0.5)',
                            }}>{i + 1}</span>
                          )}
                          <div style={{ fontFamily: MONO, fontSize: 5.265, letterSpacing: '0.3em', color: LIME }}>{c.kicker}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 9.72 }}>
                            <span style={{ fontFamily: SERIF, fontSize: 11.34, color: BRT }}>{c.label}</span>
                            <span style={{ fontFamily: MONO, fontSize: 15.39, color: LIME, whiteSpace: 'nowrap', textShadow: `0 0 14px rgba(102,255,0,0.5)` }}>${Number(c.price).toFixed(2)}<span style={{ fontSize: 6.075, color: DIM, marginLeft: 3, textShadow: 'none' }}>/gal</span></span>
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 6.075, color: MID }}>{c.meta}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.14em' }}>
                      {hasTop5Price
                        ? 'SOURCE: OSM (proximity + names) · APIFY/GASBUDDY (matched price) OR AREA AVERAGE'
                        : 'SOURCE: EIA · WEEKLY REGIONAL AVERAGE — NOT A PER-STATION PRICE'}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {stationsPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'gasgo-rise 300ms ease' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', border: `1px solid ${LIME}`, animation: 'gasgo-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.24em', color: MID, textTransform: 'uppercase' }}>Locating stations…</span>
          </div>
        )}

        {pending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'gasgo-rise 300ms ease' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', border: `1px solid ${LIME}`, animation: 'gasgo-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.24em', color: MID, textTransform: 'uppercase' }}>Scanning vicinity…</span>
          </div>
        )}

        {petro?.withheld && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'gasgo-rise 320ms ease' }}>
            <div style={{ fontFamily: SERIF, fontSize: 15, color: BRT }}>
              {petro.reason === 'LOCATION_UNAVAILABLE' ? 'Allow location access to find fuel prices near you.'
                : petro.reason === 'ZIP_UNRESOLVED'     ? "Couldn't pin your location."
                : petro.reason === 'NO_REGIONAL_DATA'   ? 'No regional price data available right now.'
                : petro.reason === 'NO_STATION_DATA'    ? 'Station prices aren’t live yet.'
                : 'Lookup unavailable.'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(102,255,0,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              ◈ Live fuel feed activates with subscription
            </div>
          </div>
        )}

        {/* Cheapest-station details moved to a hover HUD directly on its map pin (GasGoMap) —
            no longer duplicated as a static card here. */}
      </div>

      {/* footer */}
      <div style={{ position: 'relative', padding: '11px 26px', borderTop: '1px solid rgba(102,255,0,0.12)', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(102,255,0,0.4)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>Gas Go · live location · closest + cheapest</span>
      </div>
    </div>
  );
}
