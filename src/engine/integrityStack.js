/* src/engine/integrityStack.js                                         */
/* WO-751 — Integrity Stack                                             */
/* Formula: TrustΔ = clamp(∑(Wi × Si), -50, 50)                        */
/*                                                                      */
/* 4 Integrity ID Badges:                                               */
/*   SOURCE     ±25 — Named outlet vs. unknown. The Anchor.             */
/*   FIDELITY   ±15 — synthetic_risk_score. The Filter.                 */
/*   TRACTION   ±5  — t_telemetry (engagement). The Inertia.            */
/*   VOLATILITY ±5  — category_mass (CAT-01=+5, CAT-05=-5). The Spring. */
/*                                                                      */
/* WO-0285 — Geographic Affinity (LOCKED)                               */
/*   GeoAffinityResult: { geographic_affinity, geoTier, geoSignals,     */
/*                        isNational, geoSpeedMod }                     */
/*   Tier thresholds:  local ≥0.70 | regional ≥0.30 | national <0.30   */
/*   Rim threshold:    isNational = affinity < 0.25                     */
/*   Dual threshold:   0.25–0.29 = national speed, NOT rim-forced       */
/*   Affinity table:   city=0.85 | state=0.55 | regional=0.45 |        */
/*                     no-signal=0.20 | federal=0.10 | HN=0.10          */
/*   Speed mod:        local=1.0 | regional=1.4 | national=2.0          */
/*   Computed ONCE at ingestion — stored and reused across renders       */

import { getKeccakHash } from '../utils/crypto';
import { getMass }        from '../data/physicsConstants';

// ── WO-0285: Signal Dictionaries ─────────────────────────────────────────────

// State full names + abbreviations
const US_STATE_NAMES = [
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut',
  'delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa',
  'kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan',
  'minnesota','mississippi','missouri','montana','nebraska','nevada',
  'new hampshire','new jersey','new mexico','new york','north carolina',
  'north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island',
  'south carolina','south dakota','tennessee','texas','utah','vermont',
  'virginia','washington','west virginia','wisconsin','wyoming',
];

const US_STATE_ABBR = [
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy','dc',
];

// City → canonical state mapping for validation rule (city valid only if state present OR unique)
// Cities marked unique=true are unambiguous without state context
const US_CITIES = [
  { city: 'new york',         state: 'new york',      abbr: 'ny',  unique: true  },
  { city: 'los angeles',      state: 'california',    abbr: 'ca',  unique: true  },
  { city: 'chicago',          state: 'illinois',      abbr: 'il',  unique: true  },
  { city: 'houston',          state: 'texas',         abbr: 'tx',  unique: true  },
  { city: 'phoenix',          state: 'arizona',       abbr: 'az',  unique: true  },
  { city: 'philadelphia',     state: 'pennsylvania',  abbr: 'pa',  unique: true  },
  { city: 'san antonio',      state: 'texas',         abbr: 'tx',  unique: false },
  { city: 'dallas',           state: 'texas',         abbr: 'tx',  unique: false },
  { city: 'san jose',         state: 'california',    abbr: 'ca',  unique: false },
  { city: 'austin',           state: 'texas',         abbr: 'tx',  unique: false },
  { city: 'jacksonville',     state: 'florida',       abbr: 'fl',  unique: false },
  { city: 'fort worth',       state: 'texas',         abbr: 'tx',  unique: false },
  { city: 'columbus',         state: 'ohio',          abbr: 'oh',  unique: false },
  { city: 'charlotte',        state: 'north carolina',abbr: 'nc',  unique: false },
  { city: 'indianapolis',     state: 'indiana',       abbr: 'in',  unique: true  },
  { city: 'san francisco',    state: 'california',    abbr: 'ca',  unique: true  },
  { city: 'seattle',          state: 'washington',    abbr: 'wa',  unique: true  },
  { city: 'denver',           state: 'colorado',      abbr: 'co',  unique: true  },
  { city: 'nashville',        state: 'tennessee',     abbr: 'tn',  unique: true  },
  { city: 'oklahoma city',    state: 'oklahoma',      abbr: 'ok',  unique: true  },
  { city: 'el paso',          state: 'texas',         abbr: 'tx',  unique: false },
  { city: 'boston',           state: 'massachusetts', abbr: 'ma',  unique: true  },
  { city: 'detroit',          state: 'michigan',      abbr: 'mi',  unique: true  },
  { city: 'memphis',          state: 'tennessee',     abbr: 'tn',  unique: false },
  { city: 'portland',         state: 'oregon',        abbr: 'or',  unique: false },
  { city: 'las vegas',        state: 'nevada',        abbr: 'nv',  unique: true  },
  { city: 'louisville',       state: 'kentucky',      abbr: 'ky',  unique: false },
  { city: 'baltimore',        state: 'maryland',      abbr: 'md',  unique: true  },
  { city: 'milwaukee',        state: 'wisconsin',     abbr: 'wi',  unique: true  },
  { city: 'albuquerque',      state: 'new mexico',    abbr: 'nm',  unique: true  },
  { city: 'tucson',           state: 'arizona',       abbr: 'az',  unique: true  },
  { city: 'fresno',           state: 'california',    abbr: 'ca',  unique: false },
  { city: 'sacramento',       state: 'california',    abbr: 'ca',  unique: false },
  { city: 'kansas city',      state: 'missouri',      abbr: 'mo',  unique: false },
  { city: 'atlanta',          state: 'georgia',       abbr: 'ga',  unique: true  },
  { city: 'omaha',            state: 'nebraska',      abbr: 'ne',  unique: true  },
  { city: 'raleigh',          state: 'north carolina',abbr: 'nc',  unique: false },
  { city: 'miami',            state: 'florida',       abbr: 'fl',  unique: true  },
  { city: 'cleveland',        state: 'ohio',          abbr: 'oh',  unique: false },
  { city: 'minneapolis',      state: 'minnesota',     abbr: 'mn',  unique: true  },
  { city: 'tampa',            state: 'florida',       abbr: 'fl',  unique: false },
  { city: 'pittsburgh',       state: 'pennsylvania',  abbr: 'pa',  unique: true  },
  { city: 'new orleans',      state: 'louisiana',     abbr: 'la',  unique: true  },
  { city: 'buffalo',          state: 'new york',      abbr: 'ny',  unique: false },
  { city: 'cincinnati',       state: 'ohio',          abbr: 'oh',  unique: false },
  { city: 'st louis',         state: 'missouri',      abbr: 'mo',  unique: false },
  { city: 'orlando',          state: 'florida',       abbr: 'fl',  unique: false },
  { city: 'san diego',        state: 'california',    abbr: 'ca',  unique: false },
  { city: 'colorado springs', state: 'colorado',      abbr: 'co',  unique: false },
];

// Regional identifiers (spec §3.3)
const REGIONAL_IDENTIFIERS = [
  'midwest','southeast','northeast','southwest','west coast','east coast',
  'new england','southern california','bay area','tri-state','gulf coast',
  'great lakes','appalachia','silicon valley','rust belt','sun belt',
  'pacific northwest','mid-atlantic','great plains','rocky mountain',
];

// Federal keywords (spec §3.4)
const FEDERAL_KEYWORDS = [
  'congress','senate','white house','federal','supreme court',
  'house of representatives','pentagon','irs','fbi','cia','nsa',
  'nationwide','across the country','across america',
];

// ── WO-0285: Text Processing ──────────────────────────────────────────────────
// Normalize: lowercase, strip punctuation, tokenize by whitespace
// Exact token match only — no fuzzy, no stemming, word boundaries enforced

function normalize(text) {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter(Boolean);
}

// Match a phrase (possibly multi-word) against a token array using word boundaries
function hasPhrase(tokens, phrase) {
  const phraseTokens = tokenize(phrase);
  if (phraseTokens.length === 0) return false;
  if (phraseTokens.length === 1) return tokens.includes(phraseTokens[0]);
  // Multi-word: check as contiguous subsequence
  const joined = tokens.join(' ');
  return joined.includes(phraseTokens.join(' '));
}

// ── WO-0285: Geographic Affinity Derivation ───────────────────────────────────
// Returns full GeoAffinityResult — computed once at ingestion

function deriveGeoAffinity(etr) {
  const signals = [];

  // HN source — explicitly national (spec §3.5)
  if ((etr.source_type ?? '').toLowerCase() === 'hackernews') {
    return { affinity: 0.10, signals: ['hn-source'] };
  }

  const titleText  = normalize(etr.title  ?? '');
  const sourceText = normalize(etr.source ?? '');
  const tokens     = tokenize(titleText + ' ' + sourceText);

  // Federal keywords — explicitly national, highest precedence for national
  for (const kw of FEDERAL_KEYWORDS) {
    if (hasPhrase(tokens, kw)) {
      signals.push(`federal:${kw}`);
      return { affinity: 0.10, signals };
    }
  }

  // City detection with state validation rule (spec §5.2)
  for (const entry of US_CITIES) {
    if (hasPhrase(tokens, entry.city)) {
      const statePresent = hasPhrase(tokens, entry.state) || hasPhrase(tokens, entry.abbr);
      if (entry.unique || statePresent) {
        signals.push(`city:${entry.city}`);
        if (statePresent) signals.push(`state:${entry.state}`);
        return { affinity: 0.85, signals };
      }
      // City found but not validated — downgrade to regional (spec §5.2)
      signals.push(`city-unvalidated:${entry.city}`);
      return { affinity: 0.55, signals };
    }
  }

  // State full name
  for (const state of US_STATE_NAMES) {
    if (hasPhrase(tokens, state)) {
      signals.push(`state:${state}`);
      return { affinity: 0.55, signals };
    }
  }

  // State abbreviation (standalone token only — avoids false positives)
  for (const abbr of US_STATE_ABBR) {
    if (tokens.includes(abbr)) {
      signals.push(`state-abbr:${abbr}`);
      return { affinity: 0.55, signals };
    }
  }

  // Regional identifier
  for (const region of REGIONAL_IDENTIFIERS) {
    if (hasPhrase(tokens, region)) {
      signals.push(`regional:${region}`);
      return { affinity: 0.45, signals };
    }
  }

  // No geographic signal — unknown scope, not explicitly national (spec §5.3 clarification)
  return { affinity: 0.20, signals: [] };
}

// ── WO-0285: Full Geo Result ──────────────────────────────────────────────────

function computeGeoAffinity(etr) {
  const { affinity, signals } = deriveGeoAffinity(etr);

  // Tier classification (spec §6)
  const geoTier = affinity >= 0.70 ? 'local' : affinity >= 0.30 ? 'regional' : 'national';

  // Dual threshold (spec §7):
  // isNational (rim) = < 0.25 — stricter than geoTier national (<0.30)
  // 0.25–0.29: national speed, NOT rim-forced
  const isNational = affinity < 0.25;

  // Speed mod (spec §8.2) — computed at ingestion, stored
  const geoSpeedMod = geoTier === 'local' ? 1.0 : geoTier === 'regional' ? 1.4 : 2.0;

  return {
    geographic_affinity: affinity,
    geoTier,
    geoSignals:          signals,
    isNational,
    geoSpeedMod,
  };
}

// ── Badge Scorers ─────────────────────────────────────────────────────────────

// SOURCE (±25): Named outlets anchor the node; unknown sources drag it.
function scoreSource(source_type, source) {
  if (source_type === 'news' && source && source !== 'unknown') return 25;
  if (source_type === 'hackernews')                              return 5;
  return -25;
}

// FIDELITY (±15): synthetic_risk_score 0–100. Low risk = high trust.
// null = no AI score yet → neutral (0).
function scoreFidelity(synthetic_risk_score) {
  if (synthetic_risk_score === null || synthetic_risk_score === undefined) return 0;
  // risk 0 → +15, risk 50 → 0, risk 100 → -15
  return ((50 - synthetic_risk_score) / 50) * 15;
}

// TRACTION (±5): t_telemetry 0–1. High engagement with high trust = inertia.
function scoreTraction(t_telemetry) {
  return (t_telemetry - 0.5) * 10;
}

// VOLATILITY (±5): category mass 0.1–1.0. Heavy categories resist drift.
// CAT-01 (mass=1.0) → +5, CAT-05 (mass=0.1) → -5
function scoreVolatility(category_id) {
  const mass = getMass(category_id);
  return ((mass - 0.1) / 0.9) * 10 - 5;
}

// ── Main Export ───────────────────────────────────────────────────────────────

// Computes the full Integrity Stack result for a single ETR node.
// Returns: { trust_delta, keccak_hash, badges,
//            geographic_affinity, geoTier, geoSignals, isNational, geoSpeedMod }
export function computeIntegrity(etr) {
  const badges = {
    SOURCE:     scoreSource(etr.source_type, etr.source),
    FIDELITY:   scoreFidelity(etr.synthetic_risk_score),
    TRACTION:   scoreTraction(etr.fidelity_components?.t_telemetry ?? 0),
    VOLATILITY: scoreVolatility(etr.category_id),
  };

  const raw         = Object.values(badges).reduce((sum, v) => sum + v, 0);
  const trust_delta = Math.max(-50, Math.min(50, Math.round(raw * 100) / 100));

  const keccak_hash = getKeccakHash({
    title:   etr.title   ?? '',
    source:  etr.source  ?? etr.source_type ?? '',
    born_at: etr.born_at ?? '',
    url:     etr.url     ?? '',
  });

  const geo = computeGeoAffinity(etr);

  return { trust_delta, keccak_hash, badges, ...geo };
}
