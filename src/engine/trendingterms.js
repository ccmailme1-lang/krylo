// KRYL-1143b — Real Trending Terms
//
// Replaces the static, hand-authored DOMAIN_PRECURSORS list in analysisidlefield.jsx.
// Every returned term traces to a real signal already dispatched by a live connector via
// surfaceRouter.dispatchBatch() (§16 shared pool contract — {source, domain, signal,
// confidence, ts}), captured in app.jsx as `routedSignals`. No invented copy.
//
// Two label sources, in priority order:
//   1. A descriptive `signal` type-tag, when a connector sends one (e.g. financialmarket's
//      'MARKET_JITTER:CAPITAL', economicflow's 'MACRO_BASELINE:CAPITAL') — real, connector-
//      authored, specific.
//   2. The connector's `source` name (e.g. 'EDGAR_8K', 'MAERSK', 'BLS') when `signal` is a
//      plain 0–100 number — less specific, still 100% real (it names which live data source
//      actually produced this signal).
//
// §22 absence-is-signal — a `confidence === 0` record is an explicit "checked, found nothing"
// marker some connectors dispatch on empty API results, not real activity. Excluded here, same
// as it must never be shown as if it were a trending indicator. A domain with no qualifying
// signal returns an empty array — never padded with a fallback term to reach a fixed count.

function formatLabel(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  const base = raw.split(':')[0]; // strip a trailing ":DOMAIN" / ":entityId" / ":clusterLabel" suffix
  if (!base) return null;
  return base.replace(/_/g, ' ').trim().toUpperCase();
}

// Plain-language translation for the `source` fallback (connector name -> what it actually
// measures). Same discipline as guestlanguage.js — raw internal identifiers (a source name is
// exactly the kind of jargon KRYL-1143 exists to translate) never reach the guest untranslated.
// Every key here is a real connector that dispatches a real signal; this only renames it.
const SOURCE_LABELS = Object.freeze({
  ARXIV:              'RESEARCH ACTIVITY',
  BLS:                'LABOR DATA',
  CENSUS:             'CENSUS DATA',
  FDA:                'FDA ACTIVITY',
  FEC:                'CAMPAIGN FINANCE',
  GDELT:              'NEWS ACTIVITY',
  GITHUB:             'DEV ACTIVITY',
  NPM:                'PACKAGE ACTIVITY',
  OPENALEX:           'ACADEMIC ACTIVITY',
  PUBMED:             'MEDICAL RESEARCH',
  REDDIT:             'SOCIAL DISCUSSION',
  TREASURY:           'TREASURY DATA',
  USAJOBS:            'FEDERAL HIRING',
  WORLDBANK:          'GLOBAL ECONOMIC DATA',
  EIA:                'ENERGY DATA',
  EDGAR_8K:           'SEC FILINGS',
  SEC_13D_13G:        'OWNERSHIP FILINGS',
  MAERSK:             'SHIPPING VOLUME',
  FHFA:               'HOUSING FINANCE',
  USGS:               'RESOURCE DATA',
  USASPENDING:        'GOV SPENDING',
  USASPENDING_ENTITY: 'GOV SPENDING',
});

function formatSourceLabel(source) {
  if (typeof source !== 'string' || !source) return null;
  return SOURCE_LABELS[source] ?? formatLabel(source);
}

function matchesDomain(sigDomain, domain) {
  return Array.isArray(sigDomain) ? sigDomain.includes(domain) : sigDomain === domain;
}

/**
 * deriveTrendingTerms(rawSignals, domain, limit) — real signals only, most-recent first.
 * @param rawSignals  the raw dispatched-event array (app.jsx `routedSignals`)
 * @param domain      canonical domain key, e.g. 'OWNERSHIP' (ANALYSIS_PILL_TO_DOMAIN value)
 * @param limit       max terms to return
 * @returns string[]  display labels, most-recent first, deduplicated
 */
export function deriveTrendingTerms(rawSignals, domain, limit = 8) {
  if (!Array.isArray(rawSignals) || !domain) return [];

  const latestTsByLabel = new Map();
  rawSignals.forEach(sig => {
    if (!sig || !matchesDomain(sig.domain, domain)) return;
    if (!(sig.confidence > 0)) return; // §22 — a zero-confidence record is an absence marker, not a trend

    const label = formatLabel(typeof sig.signal === 'string' ? sig.signal : null) ?? formatSourceLabel(sig.source);
    if (!label) return;

    const ts = sig.ts ?? 0;
    const existing = latestTsByLabel.get(label);
    if (existing === undefined || ts > existing) latestTsByLabel.set(label, ts);
  });

  return Array.from(latestTsByLabel.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}
