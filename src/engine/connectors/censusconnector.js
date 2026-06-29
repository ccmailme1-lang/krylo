// WO-2039C — Census ACS Signal Connector
// Source: Census Bureau American Community Survey 1-Year Estimates (national)
// Domains: LABOR    (unemployment rate → labor market pressure)
//          OWNERSHIP (median household income vs. $60K baseline → wealth signal)
// Variables: B19013_001E = median household income
//            B23025_003E = civilian labor force
//            B23025_005E = unemployed
// Formula:
//   LABOR:    (1 − unemployed/labor_force) × 100  [higher employment = higher signal]
//   OWNERSHIP: clamp((income − 60000) / (110000 − 60000) × 100, 0, 100)
// Decay: QUARTERLY — ACS updates annually; refresh quarterly for currency check

import { surfaceRouter } from '../surfacerouter.js';
import { POLARITY, DECAY } from '../signalconstants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const INCOME_FLOOR    = 60_000;
const INCOME_CEILING  = 110_000;

export async function runCensusSync() {
  const ts = Date.now();
  try {
    const res = await fetch('/api/census-acs');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Census ACS response: [ [header,...], [value,...] ]
    if (!Array.isArray(json) || json.length < 2) throw new Error('unexpected shape');
    const [headers, values] = [json[0], json[1]];

    const get = (key) => {
      const i = headers.indexOf(key);
      return i >= 0 ? Number(values[i]) : null;
    };

    const income      = get('B19013_001E');
    const laborForce  = get('B23025_003E');
    const unemployed  = get('B23025_005E');

    const signals = [];

    if (laborForce != null && unemployed != null && laborForce > 0) {
      const employmentRate = 1 - (unemployed / laborForce);
      const signal = clamp(Math.round(employmentRate * 100), 0, 100);
      signals.push({
        source: 'CENSUS', domain: 'LABOR', signal,
        confidence: 0.80, ts, decay: DECAY.QUARTERLY,
        polarity: signal >= 90 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      });
    }

    if (income != null && income > 0) {
      const signal = clamp(
        Math.round(((income - INCOME_FLOOR) / (INCOME_CEILING - INCOME_FLOOR)) * 100),
        0, 100
      );
      signals.push({
        source: 'CENSUS', domain: 'OWNERSHIP', signal,
        confidence: 0.75, ts, decay: DECAY.QUARTERLY,
        polarity: signal >= 40 ? POLARITY.POSITIVE : POLARITY.NEGATIVE,
      });
    }

    if (signals.length > 0) surfaceRouter.dispatchBatch(signals);
    return { income, laborForce, unemployed };
  } catch {
    surfaceRouter.dispatchBatch([
      { source: 'CENSUS', domain: 'LABOR',     signal: 0, confidence: 0, ts },
      { source: 'CENSUS', domain: 'OWNERSHIP', signal: 0, confidence: 0, ts },
    ]);
    return null;
  }
}
