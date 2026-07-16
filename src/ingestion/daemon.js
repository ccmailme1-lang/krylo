// WO-1390: KRYLO Ingestion Daemon
// Polls FRED (macro) + Finnhub (market) on interval.
// Normalizes to ExternalSignalPayload, dispatches KRYLO_LIVE_INJECT.
// lastKnownState cache guarantees UI never sees null on fetch failure.

const FRED_KEY    = import.meta.env.VITE_FRED_API_KEY;
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

const POLLING_INTERVAL_MS = 30000; // 30s — respects free tier rate limits

// Sigmoid clamp for macro values (slow-moving, large range)
const sigmoid = (v) => 1 / (1 + Math.exp(-v / 10));

// Tanh proxy for market prices (fast-moving, bounded)
const tanhProxy = (p) => Math.abs(Math.tanh(p / 500));

// ── FRED adapter — macro signals ─────────────────────────────────────────────
// Series: UNRATE (unemployment), CPIAUCSL (CPI), DGS10 (10Y treasury yield)
const FRED_SERIES = [
  { id: 'UNRATE',   label: 'UNEMPLOYMENT',   domain: 'capital', source: 'capital' },
  { id: 'CPIAUCSL', label: 'CPI-INFLATION',  domain: 'capital', source: 'capital' },
  { id: 'DGS10',    label: 'TREASURY-10Y',   domain: 'technology',    source: 'technology'    },
];

async function fetchFRED() {
  const results = [];
  for (const series of FRED_SERIES) {
    const url = `/api/fred?series_id=${series.id}&api_key=${FRED_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    const obs  = data.observations?.[0];
    if (!obs || obs.value === '.') continue;
    const raw = parseFloat(obs.value);
    results.push({
      id:            `fred-${series.id}-${obs.date}`,
      truth_statement: `${series.label}: ${raw}`,
      source_type:   series.source,
      fs:            sigmoid(raw),
      fidelity_components: {
        m_checksum:  0.9,
        t_telemetry: 0.85,
        e_viral:     0.1,
      },
    });
  }
  return results;
}

// ── Finnhub adapter — market signals ─────────────────────────────────────────
// Symbols: SPY (S&P 500), QQQ (Nasdaq), IWM (Russell 2000)
const FINNHUB_SYMBOLS = [
  { symbol: 'SPY',  label: 'SP500',   domain: 'technology',    source: 'technology'    },
  { symbol: 'QQQ',  label: 'NASDAQ',  domain: 'ownership', source: 'ownership' },
  { symbol: 'IWM',  label: 'RUSSELL', domain: 'technology',    source: 'technology'    },
];

async function fetchFinnhub() {
  const results = [];
  for (const sym of FINNHUB_SYMBOLS) {
    const url  = `/api/finnhub?symbol=${sym.symbol}&token=${FINNHUB_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.c) continue; // c = current price
    const price  = data.c;
    const change = data.dp ?? 0; // dp = percent change
    results.push({
      id:            `finnhub-${sym.symbol}-${Date.now()}`,
      truth_statement: `${sym.label}: $${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`,
      source_type:   sym.source,
      fs:            tanhProxy(price),
      fidelity_components: {
        m_checksum:  0.95,
        t_telemetry: 0.9,
        e_viral:     change > 2 || change < -2 ? 0.7 : 0.2,
      },
    });
  }
  return results;
}

// ── Daemon ────────────────────────────────────────────────────────────────────
let lastKnownState = [];
let daemonHandle   = null;

function dispatchToSubstrate(signals) {
  window.dispatchEvent(new CustomEvent('KRYLO_LIVE_INJECT', { detail: signals }));
}

async function runCycle() {
  try {
    const [fredSignals, finnhubSignals] = await Promise.all([
      fetchFRED(),
      fetchFinnhub(),
    ]);
    const merged = [...fredSignals, ...finnhubSignals];
    if (merged.length > 0) {
      lastKnownState = merged;
      dispatchToSubstrate(merged);
    }
  } catch (err) {
    console.warn('[WO-1390] Ingestion drift — emitting lastKnownState:', err.message);
    if (lastKnownState.length > 0) {
      dispatchToSubstrate(lastKnownState);
    }
  }
}

export function startIngestionDaemon() {
  if (daemonHandle) return; // already running
  console.log('[WO-1390] KRYLO INGESTION DAEMON: ONLINE');
  runCycle(); // immediate first fetch
  daemonHandle = setInterval(runCycle, POLLING_INTERVAL_MS);
}

export function stopIngestionDaemon() {
  if (daemonHandle) { clearInterval(daemonHandle); daemonHandle = null; }
}
