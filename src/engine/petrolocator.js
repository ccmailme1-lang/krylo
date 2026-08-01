// Petro Locator (HIDDEN / NON-BROADCAST utility) — cheapest US fuel near you.
// SOURCE (active, 2026-07-31): Apify johnvc/fuelprices Actor — real per-station,
// GasBuddy-sourced retail prices, extracted via Apify's commercial service (not our own
// scraper). Chosen after Zyla (no license, sporadic trial) and direct GasBuddy scraping
// (403, anti-bot, confirmed via manual test) were both ruled out.
// SOURCE (dormant): Zyla per-station fuel prices (PAID) — parseCheapest()/FUEL_PATH below
// kept in place, not deleted, in case a Zyla subscription activates later. Not called by
// findCheapestFuel() while Apify is active.
// Flow: geolocate → ZIP → /api/fuel-apify proxy → cheapest station. Withholds, never fabricates.
// Spec: specs/petro_locator_spec.md.
import { geolocate } from './weather.js';

// Client-side day-cache — Gas Go data doesn't need to be re-fetched (and the "Locating
// stations…"/"Scanning vicinity…" wait re-shown) more than once per calendar day. Keyed by
// today's date so it self-expires at midnight without a TTL timer. Server already caches for
// 24h too (mock-server.cjs / as-diff/engine.js) — this avoids even the round-trip on repeat
// mounts the same day.
const DAY_CACHE_PREFIX = 'krylo_gasgo_cache_';
function todayKey(name) { return `${DAY_CACHE_PREFIX}${name}_${new Date().toISOString().slice(0, 10)}`; }
function readDayCache(name) {
  try {
    const raw = localStorage.getItem(todayKey(name));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeDayCache(name, value) {
  try { localStorage.setItem(todayKey(name), JSON.stringify(value)); } catch { /* storage full/unavailable — skip */ }
}

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

// Apify (johnvc/fuelprices) dataset items → cheapest station + a real aggregate computed
// from the actual returned set (average/lowest are derived from what came back, never
// invented — Apify doesn't supply a regional aggregate the way Zyla did).
// Real response shape is flat (address_line1/address_locality/address_region), not nested —
// confirmed via a live test call (2026-07-31), not assumed from the docs.
const addrOf = s => [s.address_line1, s.address_locality, s.address_region].filter(Boolean).join(', ');

function parseCheapestApify(items) {
  const arr = Array.isArray(items) ? items : [];
  const num = p => { const n = parseFloat(String(p).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };
  const stations = arr
    .map(s => ({ ...s, _price: num(s?.price_cash ?? s?.price_credit) }))
    .filter(s => s.name && s._price != null);
  if (!stations.length) return null;
  const sorted = [...stations].sort((a, b) => a._price - b._price);
  const cheapest = sorted[0];
  const prices  = stations.map(s => s._price);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const lowest  = Math.min(...prices);
  // Cards render from this — real stations only, never padded. If the feed returns fewer
  // than 5 priced stations, top5 is shorter than 5 and the card stack renders that many.
  const top5 = sorted.slice(0, 5).map(s => ({
    station: s.name,
    address: addrOf(s),
    price:   s._price.toFixed(2),
  }));
  return {
    station:  cheapest.name,
    address:  addrOf(cheapest),
    price:    cheapest._price.toFixed(2),
    average:  average.toFixed(2),
    lowest:   lowest.toFixed(2),
    currency: 'USD',
    top5,
  };
}

// petroType() string → Apify numeric fuel code (confirmed via Actor input schema, 2026-07-31).
const APIFY_FUEL_CODE = { regular: 1, 'mid-grade': 2, premium: 3, diesel: 4 };

// KRYL-1076 — real nearby fuel-station LOCATIONS from OpenStreetMap Overpass (amenity=fuel,
// keyless, CORS-ok). Locations only — Overpass does NOT carry prices. Price stays the EIA
// regional average, labeled as such. When a per-station price feed goes live, it attaches to
// these existing pins by proximity, no rework.
// MAP LOAD TIME FIX (2026-07-31): the map didn't mount until this call finished, and the
// query had a 25s server-side timeout with no client-side cap — on a loaded public Overpass
// instance this stalled the whole map for up to ~30s. Two independent public mirrors are now
// raced (Promise.any) under a 9s client-side AbortController each, so the real-world wait is
// bounded by whichever mirror answers first instead of the slowest one.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 9000;

// Haversine distance in miles — for sorting pins by nearness, no external dep.
function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// findNearbyStations({ radiusMeters, limit }) → { kind:'STATIONS', origin, stations:[...] }
// or { withheld:true, reason }. Real OSM locations, sorted nearest-first. Never fabricates.
// Day-cached client-side — a real fetch happens at most once per calendar day.
export async function findNearbyStations(opts = {}) {
  const { radiusMeters = 8000, limit = 12 } = opts;
  const cacheName = `stations_${radiusMeters}_${limit}`;
  const cached = readDayCache(cacheName);
  if (cached) return cached;
  const result = await _fetchNearbyStations({ radiusMeters, limit });
  if (!result?.withheld) writeDayCache(cacheName, result);
  return result;
}

// One Overpass mirror, bounded by an AbortController so a slow/overloaded instance can never
// hang the caller past OVERPASS_TIMEOUT_MS. Rejects (never resolves late) on timeout/network
// error so Promise.any in _fetchNearbyStations can move on to whichever mirror wins.
async function fetchOverpassMirror(endpoint, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'Accept': 'application/json' },
      body: query,
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Overpass ${endpoint} HTTP ${r.status}`);
    const j = await r.json();
    return Array.isArray(j?.elements) ? j.elements : [];
  } finally {
    clearTimeout(timer);
  }
}

async function _fetchNearbyStations({ radiusMeters, limit }) {
  const loc = await geolocate();
  if (!loc) return { withheld: true, reason: 'LOCATION_UNAVAILABLE' };

  // Overpass QL — fuel amenities (nodes + ways) within radius of the user. Server-side timeout
  // matches the client-side cap so a mirror never keeps computing past the point we've stopped
  // waiting on it.
  const q = `[out:json][timeout:${Math.floor(OVERPASS_TIMEOUT_MS / 1000)}];
    (node["amenity"="fuel"](around:${radiusMeters},${loc.lat},${loc.lon});
     way["amenity"="fuel"](around:${radiusMeters},${loc.lat},${loc.lon}););
    out center ${limit * 3};`;

  let elements = [];
  try {
    elements = await Promise.any(OVERPASS_ENDPOINTS.map(ep => fetchOverpassMirror(ep, q)));
  } catch {
    // AggregateError — every mirror timed out or failed.
    return { withheld: true, reason: 'NO_STATION_DATA' };
  }

  const stations = elements
    .map(el => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) return null;
      const t = el.tags ?? {};
      return {
        id:    `${el.type}/${el.id}`,
        name:  t.name || t.brand || t.operator || 'Fuel station',
        brand: t.brand || null,
        lat, lon,
        miles: milesBetween(loc.lat, loc.lon, lat, lon),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);

  if (!stations.length) return { withheld: true, reason: 'NO_STATION_DATA' };
  return { kind: 'STATIONS', origin: { lat: loc.lat, lon: loc.lon }, stations };
}

// findCheapestFuel({ type }) → { station, address, price, average, lowest, zip, type }
// or { withheld: true, reason }. Never fabricates. Day-cached client-side, same as above.
export async function findCheapestFuel(opts = {}) {
  const { type = 'regular' } = opts;
  const cacheName = `cheapest_${type}`;
  const cached = readDayCache(cacheName);
  if (cached) return cached;
  const result = await _fetchCheapestFuel({ type });
  if (!result?.withheld) writeDayCache(cacheName, result);
  return result;
}

async function _fetchCheapestFuel({ type }) {
  const loc = await geolocate();
  if (!loc) return { withheld: true, reason: 'LOCATION_UNAVAILABLE' };
  const zip = await coordsToZip(loc.lat, loc.lon);
  if (!zip) return { withheld: true, reason: 'ZIP_UNRESOLVED' };
  const fuelCode = APIFY_FUEL_CODE[type] ?? APIFY_FUEL_CODE.regular;
  let data = null;
  try {
    const r = await fetch(`/api/fuel-apify?search=${encodeURIComponent(zip)}&fuel=${fuelCode}`);
    if (r.ok) data = await r.json();
  } catch { /* withhold below */ }
  const cheapest = parseCheapestApify(data);
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

// ── EIA Average Fallback (KRYL-1027 free tier) ───────────────────────────────
// Free weekly regional retail average (EIA prices dataset). The FLOOR under the
// paid Zyla station layer: shown when a station price is unavailable/withheld.
// Regional-average ONLY — never a per-station claim. Withholds, never fabricates.
// Spec: specs/KRYL-1027-eia-average-slice-spec.md.

// EIA product codes (validated 2026-07-12).
const EIA_PRODUCT = { regular: 'EPMR', premium: 'EPMP', 'mid-grade': 'EPMM', diesel: 'EPD2D' };

// Full state name → EIA duoarea. Covered states use their state code (scope STATE);
// all others fall to their PADD region (scope PADD). Unknown → NUS (NATIONAL).
const STATE_DUOAREA = {
  california: 'SCA', colorado: 'SCO', florida: 'SFL', massachusetts: 'SMA',
  minnesota: 'SMN', 'new york': 'SNY', ohio: 'SOH', texas: 'STX', washington: 'SWA',
  // PADD 1A — New England
  connecticut: 'R1X', maine: 'R1X', 'new hampshire': 'R1X', 'rhode island': 'R1X', vermont: 'R1X',
  // PADD 1B — Central Atlantic
  delaware: 'R1Y', 'district of columbia': 'R1Y', maryland: 'R1Y', 'new jersey': 'R1Y', pennsylvania: 'R1Y',
  // PADD 1C — Lower Atlantic
  georgia: 'R1Z', 'north carolina': 'R1Z', 'south carolina': 'R1Z', virginia: 'R1Z', 'west virginia': 'R1Z',
  // PADD 2 — Midwest
  illinois: 'R20', indiana: 'R20', iowa: 'R20', kansas: 'R20', kentucky: 'R20', michigan: 'R20',
  missouri: 'R20', nebraska: 'R20', 'north dakota': 'R20', oklahoma: 'R20', 'south dakota': 'R20',
  tennessee: 'R20', wisconsin: 'R20',
  // PADD 3 — Gulf Coast
  alabama: 'R30', arkansas: 'R30', louisiana: 'R30', mississippi: 'R30', 'new mexico': 'R30',
  // PADD 4 — Rocky Mountain
  idaho: 'R40', montana: 'R40', utah: 'R40', wyoming: 'R40',
  // PADD 5 — West Coast
  alaska: 'R50', arizona: 'R50', hawaii: 'R50', nevada: 'R50', oregon: 'R50',
};

function scopeOf(duoarea) {
  if (duoarea === 'NUS') return 'NATIONAL';
  return duoarea[0] === 'S' ? 'STATE' : 'REGIONAL'; // never surface "PADD" to the user
}

// EIA duoarea → friendly display name (no PADD jargon). States title-case their own name.
const AREA_FRIENDLY = {
  R1X: 'New England', R1Y: 'Central Atlantic', R1Z: 'Lower Atlantic',
  R20: 'Midwest', R30: 'Gulf Coast', R40: 'Rocky Mountain', R50: 'West Coast', NUS: 'United States',
};
const titleCase = (s) => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// lat/lon → US state name via Nominatim (free, no key). Null on failure.
async function coordsToState(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=8&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    const j = await r.json();
    const s = j?.address?.state;
    return s ? String(s).toLowerCase() : null;
  } catch { return null; }
}

// findAverageFuel({ type }) → { kind:'AVG', scope, area, average, period, type, currency, source }
// or { withheld:true, reason }. Regional average only — never a station price.
export async function findAverageFuel({ type = 'regular' } = {}) {
  const loc = await geolocate();
  if (!loc) return { withheld: true, reason: 'LOCATION_UNAVAILABLE' };
  const state   = await coordsToState(loc.lat, loc.lon);
  const duoarea = (state && STATE_DUOAREA[state]) || 'NUS';   // fail up to national
  const product = EIA_PRODUCT[type] || EIA_PRODUCT.regular;
  const qs =
    'frequency=weekly&data%5B0%5D=value' +
    `&facets%5Bproduct%5D%5B%5D=${product}&facets%5Bduoarea%5D%5B%5D=${duoarea}` +
    '&sort%5B0%5D%5Bcolumn%5D=period&sort%5B0%5D%5Bdirection%5D=desc&length=1';
  let row = null;
  try {
    const r = await fetch(`/api/eia-fuel?${qs}`);
    if (r.ok) { const j = await r.json(); row = j?.response?.data?.[0] ?? null; }
  } catch { /* withhold below */ }
  if (!row || row.value == null) return { withheld: true, reason: 'NO_REGIONAL_DATA' };
  return {
    kind:     'AVG',
    scope:    scopeOf(duoarea),
    area:     AREA_FRIENDLY[duoarea] || titleCase(row['area-name']) || 'United States',
    average:  Number(row.value),
    period:   row.period,
    type,
    currency: 'USD',
    source:   'EIA',
  };
}
