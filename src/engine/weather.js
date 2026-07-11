// KRYL-1023 — Weather feed. Open-Meteo (keyless, browser-side). Real reads or honest null
// (§22 — never a fabricated temp). Geolocation default; city/state override via geocoding.
// Weather is a legitimate signal: normalized here; a follow-up dispatches it through
// surfacerouter (§16) for physical-terrain queries. This module is display + resolution only.

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FC  = 'https://api.open-meteo.com/v1/forecast';

// WMO weather_code → coarse condition category
export function condition(code) {
  if (code == null) return 'unknown';
  if (code === 0) return 'clear';
  if (code <= 2)  return 'partly';
  if (code === 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'storm';
}

// geolocate() → { lat, lon } | null. Opt-in (only called when no saved location).
export function geolocate() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 }
    );
  });
}

// geocodeCity('Frankfurt') → { lat, lon, place } | null (unresolvable → null, §19 withhold).
export async function geocodeCity(query) {
  try {
    const r = await fetch(`${GEO}?name=${encodeURIComponent(query)}&count=1&language=en`);
    const j = await r.json();
    const g = j.results?.[0];
    if (!g) return null;
    return {
      lat: g.latitude, lon: g.longitude,
      place: [g.name, g.admin1, g.country_code].filter(Boolean).join(', '),
    };
  } catch { return null; }
}

// fetchWeather({ lat, lon, place }) → normalized weather | null.
export async function fetchWeather({ lat, lon, place } = {}) {
  if (lat == null || lon == null) return null;
  try {
    const u = `${FC}?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,apparent_temperature,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
      + `&temperature_unit=fahrenheit&timezone=auto&forecast_days=6`;
    const r = await fetch(u);
    const j = await r.json();
    if (!j.current) return null;
    const round = (n) => (n == null ? null : Math.round(n));
    const d = j.daily || {};
    const forecast = (d.time || []).slice(1, 6).map((t, i) => ({
      day:  new Date(t + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      cond: condition(d.weather_code?.[i + 1]),
      hi:   round(d.temperature_2m_max?.[i + 1]),
      lo:   round(d.temperature_2m_min?.[i + 1]),
    }));
    return {
      place:    place || null,
      temp:     round(j.current.temperature_2m),
      realFeel: round(j.current.apparent_temperature),
      cond:     condition(j.current.weather_code),
      hi:       round(d.temperature_2m_max?.[0]),
      lo:       round(d.temperature_2m_min?.[0]),
      unit:     '°F',
      forecast,
      ts:       Date.now(),
    };
  } catch { return null; }
}
