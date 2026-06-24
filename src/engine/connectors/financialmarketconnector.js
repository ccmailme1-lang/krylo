// WO-1859 — Financial/Market Connector (Alpha Vantage / Finnhub)
// Computes σN² (14-day rolling return variance) per KRYLO domain from sector ETF data.
// Dispatches MARKET_JITTER signals carrying jitterFactor (0–1) via dispatchBatch.
// surfacerouter applies jitterFactor as confidence downscaler to domain-matched signals.
// No price data, predictions, or trading signals exposed anywhere.

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

const AV_BASE = 'https://www.alphavantage.co/query';
const FH_BASE = 'https://finnhub.io/api/v1';

const AV_KEY = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_ALPHA_VANTAGE_KEY
  : undefined;

const FH_KEY = typeof import.meta !== 'undefined'
  ? import.meta.env?.VITE_FINNHUB_KEY
  : undefined;

// Representative sector ETF per domain — one ticker drives the domain jitter signal
const DOMAIN_TICKERS = {
  TECHNOLOGY: 'XLK',   // Technology Select Sector SPDR
  CAPITAL:    'XLF',   // Financial Select Sector SPDR
  KNOWLEDGE:  'QQQ',   // Nasdaq-100 — knowledge-intensive proxy
  LABOR:      'XLP',   // Consumer Staples — labor-intensive proxy
  MEDIA:      'XLC',   // Communication Services Select Sector SPDR
  OWNERSHIP:  'XLRE',  // Real Estate Select Sector SPDR
};

// σN²_max: 95th-percentile 14-day rolling variance (2020–2025 calibration)
// Represents "maximum irrational variance" floor — update after 90-day live data pass.
const SIGMA_MAX = {
  TECHNOLOGY: 0.00045,
  CAPITAL:    0.00060,
  KNOWLEDGE:  0.00040,
  LABOR:      0.00025,
  MEDIA:      0.00035,
  OWNERSHIP:  0.00050,
};

// Number of trading days for the return window
const RETURN_WINDOW = 14;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function computeVariance(returns) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length;
  return variance;
}

function computeLogReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] <= 0 || prices[i] <= 0) continue;
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
}

// Alpha Vantage: fetch last RETURN_WINDOW+1 daily closes for a ticker
async function fetchAVPrices(ticker) {
  if (!AV_KEY) return null;
  try {
    const res = await fetch(
      `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const series = data['Time Series (Daily)'];
    if (!series) return null;

    // Sort descending (newest first), take RETURN_WINDOW+1 entries, reverse to ascending
    const closes = Object.entries(series)
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .slice(0, RETURN_WINDOW + 1)
      .reverse()
      .map(([, v]) => parseFloat(v['4. close']));

    return closes.length >= 2 ? closes : null;
  } catch {
    return null;
  }
}

// Finnhub: fetch current quote — used to supplement AV data with today's close
async function fetchFHQuote(ticker) {
  if (!FH_KEY) return null;
  try {
    const res = await fetch(
      `${FH_BASE}/quote?symbol=${ticker}&token=${FH_KEY}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Finnhub quote: c = current price, pc = previous close
    if (typeof data.c === 'number' && data.c > 0) return data.c;
    return null;
  } catch {
    return null;
  }
}

async function computeDomainJitter(domain) {
  const ticker = DOMAIN_TICKERS[domain];

  // Primary: Alpha Vantage historical prices
  let prices = await fetchAVPrices(ticker);

  // Supplement with Finnhub same-day price if AV data doesn't include today
  if (prices && FH_KEY) {
    const currentPrice = await fetchFHQuote(ticker);
    if (currentPrice !== null) {
      // Replace most-recent entry with live Finnhub price for intraday accuracy
      prices = [...prices.slice(0, -1), currentPrice];
    }
  }

  if (!prices || prices.length < 2) return null;

  const returns    = computeLogReturns(prices);
  if (returns.length < 2) return null;

  const sigmaN2    = computeVariance(returns);
  const sigmaMax   = SIGMA_MAX[domain] ?? 0.0005;
  const jitterFactor = clamp(sigmaN2 / sigmaMax, 0, 1);

  return jitterFactor;
}

async function buildJitterSignals() {
  const now     = Date.now();
  const domains = Object.keys(DOMAIN_TICKERS);
  const signals = [];

  const results = await Promise.allSettled(
    domains.map(domain => computeDomainJitter(domain))
  );

  results.forEach((result, i) => {
    const domain       = domains[i];
    const jitterFactor = result.status === 'fulfilled' ? result.value : null;

    if (jitterFactor === null) return; // skip domain — no data, no signal emitted

    signals.push({
      id:           `fm_jitter_${domain}_${now}`,
      source:       'FINANCIAL_MARKET',
      domain,
      signal:       `MARKET_JITTER:${domain}`,
      confidence:   clamp(jitterFactor * 100, 0, 100),
      ts:           now,
      polarity:     POLARITY.NEGATIVE,  // jitter is always negative pressure
      decay:        DECAY.DAILY,
      topology:     [],
      jitterFactor,
    });
  });

  return signals;
}

// Main entry point — call once per daily sync cycle
// Skips gracefully if both VITE_ALPHA_VANTAGE_KEY and VITE_FINNHUB_KEY are absent
export async function runFinancialMarketSync() {
  if (!AV_KEY && !FH_KEY) return [];
  const signals = await buildJitterSignals();
  if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
  return signals;
}
