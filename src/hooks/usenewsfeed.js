// src/hooks/usenewsfeed.js — KRYL-1251.
//
// One shared news-feed source for every surface that shows the live ticker
// (the surface/Home view and the Feeds bay). Fetches /api/news once, normalizes,
// and returns a DETERMINISTIC, evidence-grounded ordering.
//
// LOAD-BEARING INVARIANT (SPEC-live-ticker-surface.md):
//   The ticker may display observations/events, but it MUST NOT imply importance
//   through an ordering mechanism that is not grounded in an authored,
//   reproducible signal.
//
// So ordering is: published_at DESC, then a stable deterministic tie-break
// (source ASC, title ASC, id ASC) — no randomness anywhere. No fabricated
// fidelity score for real articles (fs: null — FidelityBar already renders
// nothing for null). No inferred urgency / sentiment / relevance. Chronological
// recency is NOT claimed to be analytical significance — it is honest about
// what it is.

import { useState, useEffect } from 'react';

// Cone domain (server) → feeds domain (page)
const CONE_TO_FEED = {
  capital: 'FINANCIAL', ownership: 'MARKET', media: 'MARKET',
  labor: 'CAREER', technology: 'TECHNOLOGY', knowledge: 'TECHNOLOGY',
};

// Authored offline fallback. Fixed relative timestamps computed once at module
// load so a given page load is fully deterministic. Keeps authored `fs` for the
// Feeds-bay fidelity bars in offline dev only.
const _base = Date.now();
export const MOCK_NEWS = [
  { id: 1, type: 'FINANCIAL',  title: 'Rate compression signals detected across regional banking sector as Federal Reserve holds rates steady', description: 'Central bank officials cited persistent inflationary pressure as justification for maintaining current policy stance through Q3.', source: 'Signal Intelligence', imageUrl: null, fs: 0.89 },
  { id: 2, type: 'MARKET',     title: 'Equity overhang detected prior to Series B close — insider activity flagged across three portfolio firms', description: 'Pattern analysis confirms pre-announcement positioning inconsistent with disclosed trading windows.', source: 'Market Desk', imageUrl: null, fs: 0.81 },
  { id: 3, type: 'LEGAL',      title: 'Court filing contradicts public narrative on revenue recognition — restructuring mechanism confirmed', description: null, source: 'Legal Wire', imageUrl: null, fs: 0.76 },
  { id: 4, type: 'CAREER',     title: 'Labor market tightening in high-skill verticals accelerates — talent exodus pattern matches P2 telemetry', description: null, source: 'Career Signal', imageUrl: null, fs: 0.71 },
  { id: 5, type: 'TECHNOLOGY', title: 'Supply chain pressure building in semiconductor vertical — lead times extend to 28 weeks', description: null, source: 'Tech Monitor', imageUrl: null, fs: 0.68 },
  { id: 6, type: 'LEGAL',      title: 'Debt instrument obscured via SPV — mechanism confirmed across four jurisdictions', description: null, source: 'Legal Wire', imageUrl: null, fs: 0.65 },
  { id: 7, type: 'FINANCIAL',  title: 'Board-level friction signal detected — COO departure imminent based on behavioral pattern analysis', description: null, source: 'Signal Intelligence', imageUrl: null, fs: 0.62 },
  { id: 8, type: 'MARKET',     title: 'Commodity index divergence signals demand compression in three key industrial sectors', description: null, source: 'Market Desk', imageUrl: null, fs: 0.59 },
].map((s, i) => ({ ...s, sub: null, url: null, publishedAt: new Date(_base - i * 6 * 60000).toISOString() }));

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * orderStories — the deterministic ordering contract. published_at DESC, then
 * source ASC, title ASC, id ASC. Items with no published_at sort last, ordered
 * by the tie-break only — never promoted, never randomised. Pure, stable.
 */
export function orderStories(stories = []) {
  return [...stories].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity;
    if (tb !== ta) return tb - ta;
    return (
      cmpStr((a.source ?? '').toLowerCase(), (b.source ?? '').toLowerCase()) ||
      cmpStr((a.title ?? '').toLowerCase(), (b.title ?? '').toLowerCase()) ||
      cmpStr(String(a.id ?? ''), String(b.id ?? ''))
    );
  });
}

/**
 * useNewsFeed — { stories, loading }. `stories` is always deterministically
 * ordered (see orderStories). Falls back to MOCK_NEWS when the endpoint is
 * empty or unreachable.
 */
export function useNewsFeed(domain = 'ALL') {
  const [stories, setStories] = useState(() => orderStories(MOCK_NEWS));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = domain && domain !== 'ALL' ? `?domain=${encodeURIComponent(domain)}` : '';
    fetch(`/api/news${q}`)
      .then(r => r.json())
      .then(data => {
        if (!alive || !(data.articles?.length > 0)) return;
        const mapped = data.articles.map((a, i) => ({
          id: a.id ?? a.url ?? `art-${i}`,
          type: domain !== 'ALL' ? domain : (CONE_TO_FEED[a.domain] ?? 'SIGNAL'),
          sub: null,
          title: a.title ?? '',
          description: a.description ?? null,
          source: a.source ?? 'unknown',
          publishedAt: a.publishedAt ?? null,
          time: a.publishedAt
            ? new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
            : '',
          imageUrl: a.imageUrl ?? null,
          url: a.url ?? null,
          fs: null, // no fabricated fidelity for real articles (KRYL-1251)
        }));
        setStories(orderStories(mapped));
      })
      .catch(() => { /* keep the last good ordering */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [domain]);

  return { stories, loading };
}
