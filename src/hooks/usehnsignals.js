// src/hooks/usehnsignals.js
// WO-257 — HackerNews Signal Vector

import { useState, useEffect } from 'react';
import { assignCategory } from '../data/physicsConstants';
import { computeIntegrity } from '../engine/integrityStack';

const HN_SEARCH = 'https://hn.algolia.com/api/v1/search';

function computeFs(m_checksum, t_telemetry, e_viral) {
  // Fs = (M · 0.40) + (T · 0.30) + (D · 0.20) + (V · 0.09) + (E · 0.01)
  // D_docs and V_voice unavailable from HN — default 0
  return (m_checksum * 0.40) + (t_telemetry * 0.30) + (e_viral * 0.01);
}

function mapHit(hit) {
  const m_checksum  = Math.min((hit.points       ?? 0) / 500, 1.0);
  const t_telemetry = Math.min((hit.num_comments ?? 0) / 200, 1.0);
  const e_viral     = (m_checksum + t_telemetry) / 2;
  const fs          = computeFs(m_checksum, t_telemetry, e_viral);

  const base = {
    id:                   `hn-${hit.objectID}`,
    title:                hit.title ?? '',
    truth_statement:      hit.title ?? '',
    url:                  hit.url   ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    source_type:          'hackernews',
    born_at:              hit.created_at ? hit.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    signal_score:         fs,
    fs,
    category_id:          assignCategory(hit.title),
    synthetic_risk_score: null,
    fidelity_components:  { m_checksum, t_telemetry, e_viral },
  };
  const { trust_delta, keccak_hash, badges, geographic_affinity, geoTier, geoSignals, isNational, geoSpeedMod } = computeIntegrity(base);
  return { ...base, trust_delta, keccak_hash, integrity_badges: badges, geographic_affinity, geoTier, geoSignals, is_national: isNational, isNational, geoSpeedMod };
}

// Fetch top N HN stories — no query required, sorted by recency with min signal
export async function fetchHNTop(n = 25) {
  const url = `${HN_SEARCH}?tags=story&numericFilters=points>50&hitsPerPage=${n}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API ${res.status}`);
  const data = await res.json();
  return (data.hits ?? []).map(mapHit);
}

export function usehnsignals(query) {
  const [signals, setsignals] = useState([]);
  const [loading, setloading] = useState(false);
  const [error,   seterror]   = useState(null);

  useEffect(() => {
    if (!query) {
      setsignals([]);
      return;
    }

    let cancelled = false;
    setloading(true);
    seterror(null);

    const url = `${HN_SEARCH}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HN API ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        setsignals((data.hits ?? []).map(mapHit));
      })
      .catch(err => {
        if (cancelled) return;
        seterror(err.message);
        setsignals([]);
      })
      .finally(() => {
        if (!cancelled) setloading(false);
      });

    return () => { cancelled = true; };
  }, [query]);

  return { signals, loading, error };
}
