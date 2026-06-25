// WO-1877 — EIA Inventory Delta Signal Connector
// Ingests EIA Weekly Petroleum Status Report (WPSR): crude, gasoline, distillate inventory deltas.
// Raw precursor signal only — no forecasting, no enrichment, no smoothing.
// Dispatches 4 signals (3 series + net composite) via surfaceRouter.dispatchBatch → CAPITAL domain.

import { surfaceRouter } from '../surfacerouter.js';
import { DECAY } from '../signalconstants.js';

const EIA_BASE = '/api/eia';

// Historical range bounds for normalization (bbl, weekly delta)
const BOUNDS = {
  crude:      { min: -15_000_000, max: 15_000_000 },
  gasoline:   { min:  -8_000_000, max:  8_000_000 },
  distillate: { min:  -6_000_000, max:  6_000_000 },
  net:        { min: -25_000_000, max: 25_000_000 },
};

// EIA series IDs (WPSR weekly stocks, thousand barrels)
const SERIES = {
  crude:      'PET.WCRSTUS1.W',
  gasoline:   'PET.WGTSTUS1.W',
  distillate: 'PET.WDISTUS1.W',
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Drawdown (negative Δ) → high signal (demand > supply = pressure).
// Build (positive Δ) → low signal (supply > demand = relief).
function normalizeToSignal(delta, bounds) {
  const clamped = clamp(delta, bounds.min, bounds.max);
  // Map [min, max] → [100, 0]: most negative = 100, most positive = 0
  return Math.round(((bounds.max - clamped) / (bounds.max - bounds.min)) * 100);
}

async function fetchSeries(seriesId) {
  const url = `${EIA_BASE}?series_id=${encodeURIComponent(seriesId)}&length=2`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`EIA ${seriesId} → ${res.status}`);
  const json = await res.json();
  // EIA v2 response shape: { response: { data: [ { period, value }, ... ] } }
  const data = json?.response?.data ?? [];
  if (data.length < 2) throw new Error(`EIA ${seriesId} insufficient data`);
  // data[0] = most recent week, data[1] = prior week (sorted desc by period)
  return { current: Number(data[0].value) * 1000, prior: Number(data[1].value) * 1000, period: data[0].period };
}

export async function runEiaSync() {
  const [crudeRes, gasolineRes, distillateRes] = await Promise.allSettled([
    fetchSeries(SERIES.crude),
    fetchSeries(SERIES.gasoline),
    fetchSeries(SERIES.distillate),
  ]);

  const ts = Date.now();
  const signals = [];

  let netDelta = 0;
  let netAvailable = 0;

  function buildSignal(id, label, result, bounds) {
    if (result.status !== 'fulfilled') return null;
    const { current, prior, period } = result.value;
    const delta     = current - prior;
    const signal    = normalizeToSignal(delta, bounds);
    const direction = delta < 0 ? 'DRAWDOWN' : 'BUILD';
    return {
      id,
      source:     'EIA',
      domain:     'CAPITAL',
      signal,
      confidence: 85,
      decay:      DECAY.WEEKLY,
      ts,
      direction,
      rawDelta:   delta,
      period,
      signalLabel: label,
    };
  }

  const crude      = buildSignal('eia_crude_delta',      'EIA_CRUDE_DELTA',      crudeRes,      BOUNDS.crude);
  const gasoline   = buildSignal('eia_gasoline_delta',   'EIA_GASOLINE_DELTA',   gasolineRes,   BOUNDS.gasoline);
  const distillate = buildSignal('eia_distillate_delta', 'EIA_DISTILLATE_DELTA', distillateRes, BOUNDS.distillate);

  if (crude)      { signals.push(crude);      netDelta += crude.rawDelta;      netAvailable++; }
  if (gasoline)   { signals.push(gasoline);   netDelta += gasoline.rawDelta;   netAvailable++; }
  if (distillate) { signals.push(distillate); netDelta += distillate.rawDelta; netAvailable++; }

  if (netAvailable > 0) {
    const netSignal    = normalizeToSignal(netDelta, BOUNDS.net);
    const netDirection = netDelta < 0 ? 'DRAWDOWN' : 'BUILD';
    signals.push({
      id:          'eia_net_pressure',
      source:      'EIA',
      domain:      'CAPITAL',
      signal:      netSignal,
      confidence:  netAvailable === 3 ? 85 : 50,
      decay:       DECAY.WEEKLY,
      ts,
      direction:   netDirection,
      rawDelta:    netDelta,
      signalLabel: 'EIA_NET_PRESSURE',
    });
  }

  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
