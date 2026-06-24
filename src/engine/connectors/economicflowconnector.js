// WO-1858 — Economic Flow Connector (World Bank / UN Comtrade)
// Computes macro regime baseline per KRYLO domain from sector-level trade and
// economic indicator data. Dispatches MACRO_BASELINE signals via dispatchBatch.
// No raw indicator data exposed to any UI component.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

const WB_API  = 'https://api.worldbank.org/v2';
const UNC_API = 'https://comtradeapi.un.org/data/v1/get/C/A/HS';

// World Bank indicators per KRYLO domain — primary data source (public, no key)
const DOMAIN_INDICATORS = {
  TECHNOLOGY: ['IT.NET.USER.ZS', 'GB.XPD.RSDV.GD.ZS'],
  CAPITAL:    ['BX.KLT.DINV.WD.GD.ZS', 'CM.MKT.TRAD.GD.ZS'],
  KNOWLEDGE:  ['SE.XPD.TOTL.GD.ZS', 'IP.PAT.RESD'],
  LABOR:      ['SL.UEM.TOTL.ZS', 'SL.TLF.TOTL.IN'],
  MEDIA:      ['IT.NET.BBND.P2', 'BG.GSR.NFSV.GD.ZS'],
  OWNERSHIP:  ['NE.CON.PRVT.PC.KD.ZG', 'FB.CBK.DPTR.P3'],
};

// UN Comtrade HS chapter codes per domain — supplemental context
// Used to augment baseline when WB data is sparse
const DOMAIN_HS_CHAPTERS = {
  TECHNOLOGY: ['84', '85'],   // machinery, electrical equipment
  CAPITAL:    ['71', '72'],   // precious metals, iron/steel
  KNOWLEDGE:  ['49', '90'],   // printed matter, optical instruments
  LABOR:      ['61', '62'],   // apparel — labor-intensive proxy
  MEDIA:      ['37', '85'],   // photographic/film, broadcasting equipment
  OWNERSHIP:  ['68', '69'],   // construction materials
};

// Rolling window for baseline: 5 years of annual data
const BASELINE_YEARS = 5;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(arr, med) {
  if (arr.length < 2) return 1; // prevent division by zero
  const variance = arr.reduce((s, v) => s + Math.pow(v - med, 2), 0) / arr.length;
  return Math.sqrt(variance) || 1;
}

function normalizeZScore(values) {
  if (!values.length) return null;
  const current = values[values.length - 1];
  const history = values.slice(0, -1);
  if (!history.length) return { score: 50, z: 0 };
  const med = median(history);
  const sd  = stddev(history, med);
  const z   = (current - med) / sd;
  return { score: clamp(50 + z * 10, 0, 100), z };
}

function polarityFromScore(score, hasData) {
  if (!hasData) return POLARITY.ABSENT;
  if (score > 60) return POLARITY.POSITIVE;
  if (score < 40) return POLARITY.NEGATIVE;
  return POLARITY.POSITIVE;
}

// Fetch World Bank indicator series — returns array of values newest-last
async function fetchWBIndicator(indicatorCode) {
  const currentYear = new Date().getFullYear();
  const startYear   = currentYear - BASELINE_YEARS - 1;
  try {
    const res = await fetch(
      `${WB_API}/country/WLD/indicator/${indicatorCode}?format=json&per_page=10&mrv=${BASELINE_YEARS + 1}&date=${startYear}:${currentYear}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const records = data[1] ?? [];
    return records
      .filter(r => r.value !== null)
      .sort((a, b) => a.date - b.date)
      .map(r => r.value);
  } catch {
    return [];
  }
}

// Fetch UN Comtrade annual trade volume for HS chapter — returns value or null
async function fetchComtradeVolume(hsChapter) {
  try {
    const year = new Date().getFullYear() - 1; // Comtrade lags one year
    const res  = await fetch(
      `${UNC_API}?reporterCode=0&period=${year}&partnerCode=0&cmdCode=${hsChapter}&flowCode=X&maxRecords=1&format=JSON&breakdownMode=classic`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.primaryValue ?? null;
  } catch {
    return null;
  }
}

async function buildDomainBaseline(domain) {
  const indicators = DOMAIN_INDICATORS[domain] ?? [];

  // Fetch all WB indicators for this domain in parallel
  const seriesList = await Promise.all(indicators.map(fetchWBIndicator));

  // Average z-scores across indicators for this domain
  const results = seriesList
    .map(series => normalizeZScore(series))
    .filter(Boolean);

  if (!results.length) {
    // Fall back to UN Comtrade supplemental
    const hsChapters = DOMAIN_HS_CHAPTERS[domain] ?? [];
    const volumes    = await Promise.all(hsChapters.map(fetchComtradeVolume));
    const valid      = volumes.filter(v => v !== null);
    if (!valid.length) return null;
    // Comtrade: use raw value relative to $1T baseline as proxy score
    const avg  = valid.reduce((s, v) => s + v, 0) / valid.length;
    const score = clamp((avg / 1e12) * 50, 0, 100);
    return { score, hasData: true };
  }

  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  return { score: avgScore, hasData: true };
}

async function buildBaselineSignals() {
  const now     = Date.now();
  const domains = Object.keys(DOMAIN_INDICATORS);
  const signals = [];

  const results = await Promise.allSettled(
    domains.map(domain => buildDomainBaseline(domain))
  );

  results.forEach((result, i) => {
    const domain = domains[i];
    const data   = result.status === 'fulfilled' ? result.value : null;

    if (!data) {
      // Dispatch ABSENT signal — no data available for this domain
      signals.push({
        id:            `ef_baseline_${domain}_${now}`,
        source:        'ECONOMIC_FLOW',
        domain,
        signal:        `MACRO_BASELINE:${domain}`,
        confidence:    0,
        ts:            now,
        polarity:      POLARITY.ABSENT,
        decay:         DECAY.QUARTERLY,
        topology:      [],
        baselineIndex: 0,
      });
      return;
    }

    const { score, hasData } = data;
    signals.push({
      id:            `ef_baseline_${domain}_${now}`,
      source:        'ECONOMIC_FLOW',
      domain,
      signal:        `MACRO_BASELINE:${domain}`,
      confidence:    score,
      ts:            now,
      polarity:      polarityFromScore(score, hasData),
      decay:         DECAY.QUARTERLY,
      topology:      [],
      baselineIndex: score,
    });
  });

  return signals;
}

// Main entry point — call once per quarterly sync cycle
export async function runEconomicFlowSync() {
  const signals = await buildBaselineSignals();
  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
