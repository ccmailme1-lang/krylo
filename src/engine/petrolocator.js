// Petro Locator (HIDDEN / NON-BROADCAST utility) — cheapest US fuel near you.
// SOURCE: Zyla per-station fuel prices (PAID — activates once a subscription is live).
// NOTE: Gas Price Locator #4808 is delisted; on subscribe, repoint FUEL_PATH/parse to the
// chosen per-station API (Fuel Finder by ZIP #4811 / US Gas Cost Data). Tracked: KRYL-1027.
// Flow: geolocate → ZIP → /api/fuel proxy → cheapest station. Withholds, never fabricates.
// Spec: specs/petro_locator_spec.md.
import { geolocate } from './weather.js';

// lat/lon → US ZIP via OpenStreetMap Nominatim (free, CORS-ok, no key).
async function coordsToZip(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    const j   = await r.json();
    const zip = j?.address?.postcode;
    return zip ? String(zip).slice(0, 5) : null;
  } catch { return null; }
}

// Zyla response → cheapest station + aggregate. gas_prices[0] = {average,lowest};
// gas_prices[1..] = {station,address,price}. Returns null when no station present.
function parseCheapest(data) {
  const arr = Array.isArray(data?.gas_prices) ? data.gas_prices : [];
  const agg = arr.find(x => x && x.average != null) ?? {};
  const stations = arr.filter(x => x && x.station != null && x.price != null);
  if (!stations.length) return null;
  const num = p => { const n = parseFloat(String(p).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : Infinity; };
  const cheapest = stations.reduce((a, b) => (num(b.price) < num(a.price) ? b : a));
  return {
    station:  cheapest.station,
    address:  cheapest.address,
    price:    cheapest.price,
    average:  agg.average ?? null,
    lowest:   agg.lowest ?? null,
    currency: data?.currency ?? 'USD',
  };
}

// findCheapestFuel({ type }) → { station, address, price, average, lowest, zip, type }
// or { withheld: true, reason }. Never fabricates.
export async function findCheapestFuel({ type = 'regular' } = {}) {
  const loc = await geolocate();
  if (!loc) return { withheld: true, reason: 'LOCATION_UNAVAILABLE' };
  const zip = await coordsToZip(loc.lat, loc.lon);
  if (!zip) return { withheld: true, reason: 'ZIP_UNRESOLVED' };
  let data = null;
  try {
    const r = await fetch(`/api/fuel?zip=${encodeURIComponent(zip)}&type=${encodeURIComponent(type)}`);
    if (r.ok) data = await r.json();
  } catch { /* withhold below */ }
  const cheapest = parseCheapest(data);
  if (!cheapest) return { withheld: true, reason: 'NO_STATION_DATA' };
  return { ...cheapest, zip, type };
}

// Trigger: the hidden code word "Gas Go" (deliberate, no false positives on real
// analysis queries). Optional fuel type after it, e.g. "Gas Go diesel".
export function isPetroQuery(q = '') {
  return /\bgas\s*go\b/i.test(q);
}

// Fuel type from the query (default regular).
export function petroType(q = '') {
  const s = q.toLowerCase();
  if (/\bdiesel\b/.test(s))     return 'diesel';
  if (/\bpremium\b/.test(s))    return 'premium';
  if (/\bmid.?grade\b/.test(s)) return 'mid-grade';
  return 'regular';
}
