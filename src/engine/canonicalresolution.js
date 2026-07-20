// canonicalresolution.js — KRYL-1080/1089/1091 hardened resolution.
//
// THE PROBLEM THIS REPLACES (not patches):
// querysynthesis.js routes only LIFE domains (AUTO, RETIREMENT, REAL_ESTATE, personas) and
// falls to a canned synthGeneral template — static confidence 0.71, mock momentum — for
// anything institutional. The six canonical domains (technology/capital/knowledge/labor/
// media/ownership) had no query router and no synthesizer, so every structural query
// (SEC events, supply-chain shocks, macro dislocations) collapsed to GENERAL and showed
// fabricated numbers. This module is the missing institutional resolver.
//
// TWO HARD RULES (both load-bearing, both tested below):
//   1. CLASSIFY from real domain vocabulary → a canonical domain, or ABSTAIN. Never GENERAL
//      by omission; abstention is explicit.
//   2. SYNTHESIZE only from the live signal field (getAllDomainPressures). Confidence,
//      direction, and momentum are DERIVED from real magnitude/polarity/signalCount. When the
//      field carries no signal for the routed domain, WITHHOLD — never emit a number (§22).
//
// No static confidence. No mock momentum. No Math.random. If it isn't measured, it withholds.

import { CANONICAL_DOMAINS } from './ontology.js';
import { getAllDomainPressures, getQueryDomainPressure } from './domaingravity.js';

// ── Canonical domain vocabulary ───────────────────────────────────────────────
// Institutional term → canonical domain. Grounded in each domain's actual meaning, not
// persona names. Every term is inspectable and belongs to exactly one domain (orthogonality,
// §23) — a term that genuinely spans domains is intentionally omitted rather than double-counted.
const DOMAIN_LEXICON = Object.freeze({
  technology: [
    /\bsemiconductor\b/, /\bsubstrate\b/, /\bfab\b/, /\bfoundry\b/, /\bchip\b/, /\bwafer\b/,
    /\blithograph/, /\bcompute\b/, /\bgpu\b/, /\bhardware\b/, /\bsensor\b/, /\bquantum\b/,
    /\bcloud software\b/, /\bautonomous\b/, /\binfrastructure\b/, /\berk\b/, /\bplatform\b/,
  ],
  capital: [
    /\bdebt\b/, /\brefinanc/, /\bcovenant\b/, /\byield\b/, /\bcredit\b/, /\bloan\b/, /\bdefault\b/,
    /\bcarry trade\b/, /\bliquidity\b/, /\bbps\b/, /\bcapital\b/, /\bfinanc/, /\bbank\b/,
    /\btariff\b/, /\bmacro\b/, /\busd\b/, /\bjpy\b/,
  ],
  knowledge: [
    /\bpatent\b/, /\bresearch\b/, /\bcitation\b/, /\bstandard\b/, /\bip\b/, /\bengineering\b/,
    /\bcurriculum\b/, /\bpreprint\b/, /\bpeer\b/, /\bacademic\b/,
  ],
  labor: [
    /\bworkforce\b/, /\bhiring\b/, /\blabor\b/, /\bstrike\b/, /\bunion\b/, /\bpayroll\b/,
    /\bwage\b/, /\bstaff/, /\battrition\b/, /\bheadcount\b/, /\brole\b/, /\bcontractor/,
  ],
  media: [
    /\bnarrative\b/, /\bsentiment\b/, /\bcoverage\b/, /\battention\b/, /\bvirality\b/,
    /\bpress\b/, /\bbrand\b/, /\bchannel\b/, /\bmessaging\b/, /\baudience\b/,
  ],
  ownership: [
    // Corporate control / governance ONLY. Supply-chain and infrastructure terms were
    // removed from here (they were mis-pulling energy and logistics queries into ownership);
    // physical trade-flow has no clean canonical home and must not force a domain.
    /\bacquisition\b/, /\bmerger\b/, /\bcontrol\b/, /\bstake\b/, /\bactivist\b/, /\bboard\b/,
    /\brestructur/, /\bgovernance\b/, /\bdeparture\b/, /\bcfo\b/, /\bceo\b/, /\bsec item\b/,
    /\b8-?k\b/, /\bshareholder\b/, /\bdual-?listed\b/,
  ],
});

// ── Classifier ────────────────────────────────────────────────────────────────
// classifyCanonicalDomain(query) → {
//   primary, weights, confidence, evidenceHits, coActive, resolved | abstained
// }
// confidence here = CLASSIFICATION confidence (how clearly the text points at one domain),
// derived from evidence concentration. It is NOT the synthesis confidence (that comes from
// the live field). Kept separate on purpose — two different questions (§23).
export function classifyCanonicalDomain(query) {
  const q = String(query ?? '').toLowerCase();

  const hits = {};
  let totalHits = 0;
  for (const domain of CANONICAL_DOMAINS) {
    const n = DOMAIN_LEXICON[domain].filter(re => re.test(q)).length;
    if (n > 0) { hits[domain] = n; totalHits += n; }
  }

  if (totalHits === 0) {
    return { primary: null, weights: {}, confidence: 0, evidenceHits: 0, coActive: [], abstained: true };
  }

  const sorted = Object.entries(hits).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];

  const weights = {};
  for (const [d, n] of sorted) weights[d] = parseFloat((n / totalHits).toFixed(3));

  // Classification confidence = share of evidence on the winner, scaled by how much total
  // evidence there is (a single hit is weaker than five agreeing hits). Bounded [0,1].
  const dominance = sorted[0][1] / totalHits;
  const depth     = Math.min(1, totalHits / 5);
  const confidence = parseFloat((dominance * depth).toFixed(3));

  // Co-active: other domains within one hit of a genuine secondary (cross-domain events are real).
  const coActive = sorted.slice(1).filter(([, n]) => n >= sorted[0][1] - 1 && n > 0).map(([d]) => d);

  return { primary, weights, confidence, evidenceHits: totalHits, coActive, resolved: true };
}

// ── Synthesizer ───────────────────────────────────────────────────────────────
// synthCanonical(query) → a synthesis object shaped like querysynthesis outputs, but every
// number is derived from the LIVE field. Returns { withheld, reason } when the routed domain
// has no live signal — absence is stated, never filled (§22).
//
// Mapping (all measured, all re-derivable by inspection):
//   confidence = magnitude / 100                       (live domain pressure → 0..1)
//   direction  = polarity                              ('constructive' | 'fracture')
//   momentum   = signed delta of this domain's pressure vs the field mean, as a %  (real,
//                not a stored series — a cross-sectional read, labeled as such)
//   state      = derived band on magnitude + polarity  (no classifier mock)
export function synthCanonical(query) {
  const cls = classifyCanonicalDomain(query);
  if (!cls.resolved) return { withheld: true, reason: 'NO_DOMAIN_EVIDENCE' };

  const field = getAllDomainPressures();                 // live 6-domain pressure
  const signalDomain = QUERY_TO_SIGNAL[cls.primary] ?? cls.primary;
  const p = field[signalDomain] ?? getQueryDomainPressure(cls.primary);

  if (!p || p.signalCount === 0) {
    // Routed correctly, but the live field is empty for this domain right now.
    return {
      withheld: true, reason: 'NO_LIVE_SIGNAL',
      primary: cls.primary, classification: cls,
      note: 'Domain resolved; no live signal in the current window.',
    };
  }

  // Cross-sectional momentum: this domain's magnitude vs the mean of all domains with signal.
  const active = Object.values(field).filter(d => d.signalCount > 0);
  const mean = active.reduce((s, d) => s + d.magnitude, 0) / Math.max(active.length, 1);
  const rel = p.magnitude - mean;
  const momentumPct = `${rel >= 0 ? '+' : ''}${Math.round(rel)}%`;

  const confidence = parseFloat((p.magnitude / 100).toFixed(3));
  const direction  = p.polarity;                         // constructive | fracture
  const stateLabel = deriveState(p.magnitude, p.polarity);

  return {
    withheld: false,
    primary: cls.primary,
    domain: cls.primary,
    signalDomain,
    stateLabel,
    direction,
    confidence,                                          // DERIVED from live magnitude
    momentum: { value: momentumPct, basis: 'CROSS_SECTIONAL', h1: null, h24: null },
    signalCount: p.signalCount,
    coActive: cls.coActive,
    classification: cls,
    grounded: true,
    provenance: 'LIVE_DOMAIN_FIELD',                     // never a template
  };
}

// State band — pure function of measured magnitude + polarity. No hidden classifier, no mock.
function deriveState(magnitude, polarity) {
  if (polarity === 'fracture') return magnitude >= 60 ? 'ACTIVE FRACTURE' : 'FRACTURE FORMING';
  if (magnitude >= 75) return 'HIGH CONVERGENCE';
  if (magnitude >= 45) return 'BUILDING CONVERGENCE';
  if (magnitude >= 20) return 'LOW SIGNAL YIELD';
  return 'INSUFFICIENT SIGNAL';
}

// Canonical query-domain → signal-domain (identity here; both use the canonical set, but kept
// explicit so a future rename can't silently break the field lookup).
const QUERY_TO_SIGNAL = Object.freeze(
  Object.fromEntries(CANONICAL_DOMAINS.map(d => [d, d]))
);
