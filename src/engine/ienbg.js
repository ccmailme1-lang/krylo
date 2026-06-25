// ienbg.js — WO-1867 Numeric Binding sub-contract.
//
// A number only becomes a REAL_ESTATE "price" when it (a) sits within a char window of a
// purchase/dwelling anchor AND (b) falls inside the residential plausibility range. Stated
// assets, income, bed/bath counts, and orphan scalars never bind.
//
// Eligibility rule (checkRealEstateEligibility):
//   • price binds                       → eligible, use [price, down]
//   • no price, but a money-magnitude   → INSUFFICIENT_STRUCTURAL_DATA (a big number we
//     number (≥ MIN) is unbound           can't confirm as a price — e.g. "ASSETS: $15B")
//   • no price, only small scalars      → eligible, qualitative (no numbers passed; the
//     (bed/bath/etc., all < MIN)          synthesizer uses its defaults — never the scalars)
//
// Scope: REAL_ESTATE only (the demonstrated $15B-assets-as-home-price defect). AUTO already
// has detectVehiclePrice + a down clamp; it can adopt the same contract later.

// Purchase-intent + dwelling-type anchors. NOTE: the asset-class words "real estate" and
// "property" are deliberately NOT anchors — they appear next to portfolio figures (an IPS
// lists "real estate" as a holding), which would bind an asset total as a home price.
const RE_PRICE_ANCHORS = /\b(price|asking|listed?|list|buy|buying|bought|purchase|purchasing|afford|budget|costs?|worth|mortgage|home|house|condo|apartment|duplex|townhouse)\b/i;
const RE_DOWN_ANCHORS  = /\b(down\s*payment|\bdown\b|deposit|put\s+down)\b/i;

// Residential plausibility range. Below floor → not a dwelling price (a count, a fee, a
// stray scalar). Above ceiling → a misextracted portfolio/asset figure.
const RE_PRICE_MIN = 10_000;
const RE_PRICE_MAX = 100_000_000;

// Currency-like number scan WITH positions. Mirrors extractNumbers() parsing (commas, k/m).
function scanNumbers(text) {
  const out = [];
  const re = /\$?\d[\d,]*(?:\.\d+)?[kKmM]?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tok = m[0];
    let n = parseFloat(tok.replace(/[$,]/g, ''));
    if (/[kK]$/.test(tok)) n *= 1000;
    if (/[mM]$/.test(tok)) n *= 1000000;
    if (!Number.isNaN(n) && n > 0) out.push({ value: n, start: m.index, end: m.index + tok.length });
  }
  return out;
}

function anchoredWithin(text, num, anchorRe, window) {
  return anchorRe.test(text.slice(Math.max(0, num.start - window), Math.min(text.length, num.end + window)));
}

// { price, down } — each null when no valid anchored match.
export function bindRealEstateNumbers(query) {
  const text = query ?? '';
  const nums = scanNumbers(text);

  let price = null;
  for (const num of nums) {
    if (num.value >= RE_PRICE_MIN && num.value <= RE_PRICE_MAX
        && anchoredWithin(text, num, RE_PRICE_ANCHORS, 32)) {
      price = num.value;
      break;
    }
  }

  let down = null;
  if (price !== null) {
    for (const num of nums) {
      if (num.value < price && anchoredWithin(text, num, RE_DOWN_ANCHORS, 12)) {
        down = num.value;
        break;
      }
    }
  }

  return { price, down };
}

// Eligibility verdict for a REAL_ESTATE query that carries numbers.
//   { eligible, price, down, reason }
export function checkRealEstateEligibility(query) {
  const { price, down } = bindRealEstateNumbers(query);
  if (price !== null) return { eligible: true, price, down, reason: 'OK' };

  // No price bound. If a money-magnitude number is present, it's a figure we refuse to
  // treat as a price (out-of-range, or unanchored) → structurally insufficient.
  const hasMoneyMagnitude = scanNumbers(query ?? '').some(n => n.value >= RE_PRICE_MIN);
  if (hasMoneyMagnitude) return { eligible: false, price: null, down: null, reason: 'INSUFFICIENT_STRUCTURAL_DATA' };

  // Only small non-money scalars (bed/bath counts, etc.) → qualitative, no fabricated price.
  return { eligible: true, price: null, down: null, reason: 'QUALITATIVE' };
}
