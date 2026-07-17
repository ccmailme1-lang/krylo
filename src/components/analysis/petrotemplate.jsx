import React from 'react';

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

export default function PetroTemplate({ petro }) {
  const pending = !petro || petro.loading;
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

        {/* EIA regional average — the free floor (no station claim) */}
        {petro && petro.kind === 'AVG' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'gasgo-rise 340ms ease' }}>
            <div style={{
              position: 'relative', border: '1px solid rgba(102,255,0,0.4)', borderRadius: 6,
              padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460,
              background: 'linear-gradient(rgba(102,255,0,0.05), transparent)',
              boxShadow: '0 0 26px rgba(102,255,0,0.14), inset 0 0 20px rgba(102,255,0,0.04)',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.34em', color: LIME }}>◆ {petro.scope} AVERAGE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, color: BRT }}>{petro.area}</span>
                <span style={{ fontFamily: MONO, fontSize: 30, color: LIME, whiteSpace: 'nowrap', textShadow: `0 0 14px rgba(102,255,0,0.5)` }}>${Number(petro.average).toFixed(2)}<span style={{ fontSize: 12, color: DIM, marginLeft: 4, textShadow: 'none' }}>/gal</span></span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: MID }}>{(petro.type ?? '').toUpperCase()} · week of {petro.period}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.16em' }}>
              SOURCE: EIA · WEEKLY REGIONAL AVERAGE — NOT A PER-STATION PRICE
            </div>
          </div>
        )}

        {petro && !petro.loading && !petro.withheld && petro.kind !== 'AVG' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'gasgo-rise 340ms ease' }}>
            <div style={{
              position: 'relative', border: '1px solid rgba(102,255,0,0.4)', borderRadius: 6,
              padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460,
              background: 'linear-gradient(rgba(102,255,0,0.05), transparent)',
              boxShadow: '0 0 26px rgba(102,255,0,0.14), inset 0 0 20px rgba(102,255,0,0.04)',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.34em', color: LIME }}>◆ CHEAPEST NEARBY</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, color: BRT }}>{petro.station}</span>
                <span style={{ fontFamily: MONO, fontSize: 30, color: LIME, whiteSpace: 'nowrap', textShadow: `0 0 14px rgba(102,255,0,0.5)` }}>{petro.price}<span style={{ fontSize: 12, color: DIM, marginLeft: 4, textShadow: 'none' }}>/gal</span></span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: MID }}>{petro.address}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.16em' }}>
              {(petro.type ?? '').toUpperCase()} · ZIP {petro.zip} · AREA AVG {petro.average ?? '—'} · LOW {petro.lowest ?? '—'}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ position: 'relative', padding: '11px 26px', borderTop: '1px solid rgba(102,255,0,0.12)', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(102,255,0,0.4)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>Gas Go · live location · closest + cheapest</span>
      </div>
    </div>
  );
}
