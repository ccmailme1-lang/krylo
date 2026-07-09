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

// Wealth-context dominance override (TAYLOR class). A query dominated by
// asset-management context — AUM, family office, portfolio, "over a billion" —
// is NOT a home-buying query, even if a residential-scale number sits near a
// weak local anchor ("worth", "budget"). The local 32-char binder can't see the
// dominant frame; this does. When wealth context is present AND no explicit
// home-PURCHASE intent verb accompanies it, we refuse to bind any number as a
// dwelling price (§19 withhold-beats-fabricate) rather than emit a starter-home
// brief for a billion-dollar subject. Purchase intent co-present → the query is
// a genuine (if wealthy) buyer, and binding proceeds normally.
const WEALTH_CONTEXT = /\b(aum|assets?\s+under\s+management|family\s+office|net\s+worth|hedge\s+fund|private\s+equity|endowment|sovereign\s+wealth|billionaire|\d+\s*billion|\d+\s*trillion|over\s+a\s+billion)\b/i;
// Real-estate TRANSACTION intent — buy-side OR sell-side. A wealth subject who is
// actually transacting a property (buying OR selling/listing/offloading) is a real
// RE query and must not be suppressed by the wealth override; only a bare wealth
// mention with no transaction is.
const RE_PURCHASE_INTENT = /\b(buy|buying|bought|purchase|purchasing|mortgage|afford|pre-?approv\w*|closing\s+costs?|down\s*payment|escrow|listing|realtor|home\s+loan|refinanc\w*|house\s+hunt\w*|sell|selling|sold|\blist\b|offload|downsize|dispose|disposition|cash\s*out)\b/i;

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
  const text = query ?? '';
  // Wealth-context override — runs BEFORE binding so it also suppresses the
  // no-number default-brief case ($350k fabricated for a family-office query).
  if (WEALTH_CONTEXT.test(text) && !RE_PURCHASE_INTENT.test(text)) {
    return { eligible: false, price: null, down: null, reason: 'WEALTH_CONTEXT_NO_PURCHASE_INTENT' };
  }
  const { price, down } = bindRealEstateNumbers(query);
  if (price !== null) return { eligible: true, price, down, reason: 'OK' };

  // No price bound. If a money-magnitude number is present, it's a figure we refuse to
  // treat as a price (out-of-range, or unanchored) → structurally insufficient.
  const hasMoneyMagnitude = scanNumbers(query ?? '').some(n => n.value >= RE_PRICE_MIN);
  if (hasMoneyMagnitude) return { eligible: false, price: null, down: null, reason: 'INSUFFICIENT_STRUCTURAL_DATA' };

  // Only small non-money scalars (bed/bath counts, etc.) → qualitative, no fabricated price.
  return { eligible: true, price: null, down: null, reason: 'QUALITATIVE' };
}

// ── WO-1873 — AUTO Numeric Binding ────────────────────────────────────────────
// Mirrors REAL_ESTATE contract. MSRP lookup (detectVehiclePrice) is the preferred
// source; this gate handles explicit price figures and prevents asset bleed.

const AUTO_PRICE_ANCHORS = /\b(price|msrp|sticker|\bcar\b|vehicle|cost|buy|buying|bought|purchase|purchasing|afford|budget|paying|financ|lease)\b/i;
const AUTO_DOWN_ANCHORS  = /\b(down\s*payment|\bdown\b|deposit|trade.?in|put\s+down)\b/i;
// Wealth-context override (mirrors REAL_ESTATE): a family-office/AUM query with no
// explicit vehicle-purchase intent is not a car-buying query — don't bind an asset
// figure as a car price or emit a default MSRP brief.
const AUTO_PURCHASE_INTENT = /\b(buy|buying|bought|purchase|purchasing|lease|leasing|financ\w*|trade.?in|dealer|test\s*drive|msrp|down\s*payment|car\s+loan|shopping\s+for\s+a?\s*(car|truck|suv|vehicle))\b/i;

// Vehicle plausibility band — anything outside these bounds is not a car price.
const AUTO_PRICE_MIN = 1_000;
const AUTO_PRICE_MAX = 500_000;

export function bindAutoNumbers(query) {
  const text = query ?? '';
  const nums = scanNumbers(text);

  let price = null;
  for (const num of nums) {
    if (num.value >= AUTO_PRICE_MIN && num.value <= AUTO_PRICE_MAX
        && anchoredWithin(text, num, AUTO_PRICE_ANCHORS, 32)) {
      price = num.value;
      break;
    }
  }

  let down = null;
  if (price !== null) {
    for (const num of nums) {
      if (num.value < price && anchoredWithin(text, num, AUTO_DOWN_ANCHORS, 12)) {
        down = num.value;
        break;
      }
    }
  }

  return { price, down };
}

// Eligibility verdict for an AUTO query that carries numbers.
//   { eligible, price, down, reason }
export function checkAutoEligibility(query) {
  const text = query ?? '';
  if (WEALTH_CONTEXT.test(text) && !AUTO_PURCHASE_INTENT.test(text)) {
    return { eligible: false, price: null, down: null, reason: 'WEALTH_CONTEXT_NO_PURCHASE_INTENT' };
  }
  const { price, down } = bindAutoNumbers(query);
  if (price !== null) return { eligible: true, price, down, reason: 'OK' };

  // No price bound. A money-magnitude number outside the vehicle band that cannot bind
  // to a purchase anchor (e.g. "ASSETS: $15B, drives a Tesla") → structurally insufficient.
  const hasMoneyMagnitude = scanNumbers(query ?? '').some(n => n.value >= AUTO_PRICE_MIN);
  if (hasMoneyMagnitude) return { eligible: false, price: null, down: null, reason: 'INSUFFICIENT_STRUCTURAL_DATA' };

  // Only small scalars or no numbers → qualitative, MSRP lookup will supply a default.
  return { eligible: true, price: null, down: null, reason: 'QUALITATIVE' };
}
