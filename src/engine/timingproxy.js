// WO-1768-A — Macro Timing Proxy v1
// Three-layer validation: Fs* (FRED raw) → DFC (EDGAR Form D) → YCID (T10Y2Y inversion days)
// Output: { fsStar, dfcStatus, ycidDays, action, conviction }
// CRITICAL: uses raw FRED values — NOT the 0–100 normalized scores from useFredSignals.js

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const EDGAR_BASE = 'https://efts.sec.gov/LATEST/search-index';

// Fs* stress threshold per spec
const FS_STAR_THRESHOLD = 8.5;

// Form D industry → KRYLO domain mapping (spec §4)
const INDUSTRY_DOMAIN_MAP = {
  'Technology':                  'TECHNOLOGY',
  'Finance (excluding real estate)': 'CAPITAL',
  'Real Estate':                 'OWNERSHIP',
  'Healthcare & Life Sciences':  'KNOWLEDGE',
  'Media / Entertainment':       'MEDIA',
  'Other / Services':            'LABOR',
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Fetch one FRED series — returns raw latest value (not normalized)
async function fetchFredRaw(seriesId, apiKey) {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const data = await res.json();
  const obs = (data.observations ?? []).filter(o => o.value !== '.');
  if (!obs.length) throw new Error(`FRED ${seriesId}: no observations`);
  return parseFloat(obs[0].value);
}

// Layer 1: Fs* = BAMLH0A0HYM2 / M2V (raw ratio)
export async function computeFsStar(apiKey) {
  const [baml, m2v] = await Promise.all([
    fetchFredRaw('BAMLH0A0HYM2', apiKey),
    fetchFredRaw('M2V', apiKey),
  ]);
  if (!m2v || m2v === 0) throw new Error('M2V is zero — Fs* undefined');
  return baml / m2v;
}

// Layer 2: DFC — Deal-Flow Concentration from EDGAR Form D filings
// v1: count-based proxy ($1M per filing). Day 2-3: replace with parsed totalOfferingAmount from filing XML.
export async function computeDFC() {
  const now   = new Date();
  const start = new Date(now - 365 * 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 4Q trailing
  const end   = now.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    q:        '"Form D"',
    forms:    'D',
    dateRange:'custom',
    startdt:  start,
    enddt:    end,
    hits:     '200',
  });

  let hits = [];
  try {
    const res  = await fetch(`${EDGAR_BASE}?${params}`);
    if (res.ok) {
      const data = await res.json();
      hits = data.hits?.hits ?? [];
    }
  } catch { /* fall through — NORMAL status */ }

  // Assign each filing to a domain via entity name keyword heuristic (v1 proxy)
  const sectorAmounts = { TECHNOLOGY: 0, CAPITAL: 0, OWNERSHIP: 0, KNOWLEDGE: 0, MEDIA: 0, LABOR: 0 };
  const PROXY_AMOUNT  = 1_000_000; // $1M per filing until XML parser lands (Day 2-3)

  for (const hit of hits) {
    const name = (hit._source?.entity_name ?? '').toLowerCase();
    let domain = 'LABOR'; // default
    if (/tech|software|saas|ai\b|data|cloud|cyber|fintech/.test(name))  domain = 'TECHNOLOGY';
    else if (/capital|fund|invest|venture|equity|credit|bank/.test(name)) domain = 'CAPITAL';
    else if (/real estate|reit|property|realty/.test(name))               domain = 'OWNERSHIP';
    else if (/health|medical|pharma|bio|clinic|life sci/.test(name))      domain = 'KNOWLEDGE';
    else if (/media|entertainment|film|music|broadcast/.test(name))       domain = 'MEDIA';
    sectorAmounts[domain] += PROXY_AMOUNT;
  }

  const entries = Object.entries(sectorAmounts).sort(([, a], [, b]) => b - a);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) return { status: 'NORMAL', concentration: 0 };

  const top2          = entries.slice(0, 2).reduce((s, [, v]) => s + v, 0);
  const concentration = top2 / total;
  const status        = concentration >= 0.55 ? 'HIGH CONCENTRATION'
    : concentration >= 0.40 ? 'ELEVATED'
    : 'NORMAL';

  return { status, concentration: parseFloat(concentration.toFixed(3)), sectorAmounts };
}

// Layer 3: reconcile — per spec §6
export function reconcile(fsStar, dfcStatus, ycidDays) {
  const structuralDivergence = fsStar > FS_STAR_THRESHOLD;
  const crowded              = dfcStatus === 'HIGH CONCENTRATION';
  const thetaDrag            = ycidDays >= 30;

  if (structuralDivergence && crowded && thetaDrag) return { action: 'FADE_SIGNAL', conviction: 'MAXIMUM' };
  if (structuralDivergence && crowded)              return { action: 'FADE_SIGNAL', conviction: 'MEDIUM'  };
  return { action: 'PASS', conviction: null };
}
