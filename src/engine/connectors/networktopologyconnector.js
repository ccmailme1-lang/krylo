// WO-1874 — Network Topology Signal Connector (IHR / RIPE RIS)
// Ingests routing health alarms from IHR (Internet Health Report).
// Normalizes to 0–100 and dispatches TECHNOLOGY + CAPITAL dual-domain pairs.
// Every network topology event = two cone pressure readings.
// Source: https://www.ihr.live/ihr/api (no key required, CC BY-NC-SA 4.0)

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

const IHR_BASE = 'https://www.ihr.live/ihr/api';

// ASN criticality weights — exchange co-location and primary transit
// Bootstrap seed list; verify against current ARIN/PeeringDB data before production.
const CRITICAL_ASNS = {
  36041:  1.0,  // NYSE co-location, Mahwah NJ
  394811: 1.0,  // BATS/CBOE data center
  10753:  1.0,  // Nasdaq data center
  5649:   1.0,  // CME Group, Chicago
  3356:   0.7,  // Lumen/Level3 — primary NYC↔CHI backbone
  2914:   0.7,  // NTT/Verio — major transit
  174:    0.7,  // Cogent — major transit
  1299:   0.7,  // Telia — major transit
};
const DEFAULT_CRITICALITY = 0.4;

// IHR magnitude scale: pre-computed deviation score (typically 1–10+)
// Map to 0–100: ceiling at 8 sigma (empirical — adjust after live data pass)
const MAGNITUDE_CEILING = 8;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function normalizeSignal(magnitude) {
  return clamp((magnitude ?? 0) / MAGNITUDE_CEILING, 0, 1) * 100;
}

function getAsnCriticality(asn) {
  return CRITICAL_ASNS[Number(asn)] ?? DEFAULT_CRITICALITY;
}

function recencyDecay(eventTsMs) {
  const ageMs  = Date.now() - eventTsMs;
  const ageMin = ageMs / 60_000;
  if (ageMin <= 0)   return 1.0;
  if (ageMin >= 120) return 0.1;
  return 1.0 - (0.9 * (ageMin / 120));  // linear 1.0 → 0.1 over 2 hours
}

// Build dual-domain pair from a single normalized event
function buildPair({ id, signalLabel, magnitude, asn, eventTs }) {
  const signal     = normalizeSignal(magnitude);
  const criticality = getAsnCriticality(asn);
  const decay      = recencyDecay(eventTs);
  const confidence = clamp(criticality * decay * 100, 0, 100);
  const now        = Date.now();

  return [
    {
      id:         `ntc_tech_${id}`,
      source:     'NETWORK_TOPOLOGY',
      domain:     'TECHNOLOGY',
      signal:     signalLabel,
      confidence,
      ts:         now,
      polarity:   POLARITY.NEGATIVE,
      decay:      DECAY.DAILY,
      topology:   [],
      _magnitude: signal,
    },
    {
      id:         `ntc_cap_${id}`,
      source:     'NETWORK_TOPOLOGY',
      domain:     'CAPITAL',
      signal:     signalLabel,
      confidence,
      ts:         now,
      polarity:   POLARITY.NEGATIVE,
      decay:      DECAY.DAILY,
      topology:   [],
      _magnitude: signal,
    },
  ];
}

// ── IHR fetchers ──────────────────────────────────────────────────────────────

async function fetchJson(path) {
  try {
    const res = await fetch(`${IHR_BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHegemonAlarms() {
  const data = await fetchJson('/hegemony/alarms?limit=20&ordering=-magnitude');
  const results = data?.results ?? [];
  const pairs = [];
  for (const alarm of results) {
    const magnitude = alarm.magnitude ?? alarm.deviation ?? 0;
    if (magnitude < 1) continue; // below noise floor
    pairs.push(...buildPair({
      id:          `heg_${alarm.id ?? alarm.timebin ?? Date.now()}`,
      signalLabel: `HEGEMONY_ALARM:ASN${alarm.originasn ?? alarm.asn ?? 'UNKNOWN'}`,
      magnitude,
      asn:         alarm.originasn ?? alarm.asn,
      eventTs:     alarm.timebin ? new Date(alarm.timebin).getTime() : Date.now(),
    }));
  }
  return pairs;
}

async function fetchDelayAlarms() {
  const data = await fetchJson('/network_delay/alarms?limit=20&ordering=-magnitude');
  const results = data?.results ?? [];
  const pairs = [];
  for (const alarm of results) {
    const magnitude = alarm.magnitude ?? alarm.deviation ?? 0;
    if (magnitude < 1) continue;
    pairs.push(...buildPair({
      id:          `delay_${alarm.id ?? alarm.timebin ?? Date.now()}`,
      signalLabel: `DELAY_ALARM:${alarm.startpoint_name ?? 'UNKNOWN'}→${alarm.endpoint_name ?? 'UNKNOWN'}`,
      magnitude,
      asn:         null,  // delay alarms are location-based, not ASN-scoped
      eventTs:     alarm.timebin ? new Date(alarm.timebin).getTime() : Date.now(),
    }));
  }
  return pairs;
}

async function fetchDiscoEvents() {
  const data = await fetchJson('/disco/events?limit=10&ordering=-avglevel');
  const results = data?.results ?? [];
  const pairs = [];
  for (const evt of results) {
    const magnitude = (evt.avglevel ?? 0) * 10; // avglevel 0–10 → 0–100 range pre-clamp
    if (magnitude < 10) continue; // low-severity disco events ignored
    pairs.push(...buildPair({
      id:          `disco_${evt.id ?? Date.now()}`,
      signalLabel: `DISCO_EVENT:${evt.streamtype ?? 'UNKNOWN'}`,
      magnitude:   clamp(magnitude / 10, 0, MAGNITUDE_CEILING), // renormalize to magnitude scale
      asn:         null,
      eventTs:     evt.starttime ? new Date(evt.starttime).getTime() : Date.now(),
    }));
  }
  return pairs;
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function runNetworkTopologySync() {
  const [hegemony, delay, disco] = await Promise.allSettled([
    fetchHegemonAlarms(),
    fetchDelayAlarms(),
    fetchDiscoEvents(),
  ]);

  const signals = [
    ...(hegemony.status === 'fulfilled' ? hegemony.value : []),
    ...(delay.status    === 'fulfilled' ? delay.value    : []),
    ...(disco.status    === 'fulfilled' ? disco.value    : []),
  ];

  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
