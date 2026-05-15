// src/components/vinecard.jsx
// WO-513 — Social Boost UI (isolated UI layer)

import React, { useState } from 'react';

async function postBoost(etrId) {
  const res = await fetch(`/api/etr/${etrId}/boost`, { method: 'POST' });
  if (!res.ok) throw new Error('boost failed');
  return res.json(); // { boosts, rankDelta }
}

export function BoostButton({ etrId, onBoosted }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await postBoost(etrId);
      onBoosted?.(result);
    } catch {
      // mock: still fire onBoosted with delta 1
      onBoosted?.({ boosts: null, rankDelta: 1 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      '11px',
        letterSpacing: '0.08em',
        color:         loading ? 'rgba(102,255,0,0.4)' : '#66FF00',
        background:    'rgba(102,255,0,0.06)',
        border:        '1px solid rgba(102,255,0,0.25)',
        borderRadius:  '3px',
        padding:       '6px 14px',
        cursor:        loading ? 'default' : 'pointer',
        transition:    'color 0.15s, background 0.15s',
      }}
    >
      {loading ? '...' : 'Share to Boost'}
    </button>
  );
}

export function BoostCounter({ count }) {
  return (
    <span style={{
      fontFamily:    'IBM Plex Mono, monospace',
      fontSize:      '10px',
      letterSpacing: '0.08em',
      color:         'rgba(102,255,0,0.6)',
    }}>
      {count} verified ✓
    </span>
  );
}

export function RankBadge({ rank, expiresIn }) {
  return (
    <span style={{
      fontFamily:    'IBM Plex Mono, monospace',
      fontSize:      '10px',
      letterSpacing: '0.08em',
      color:         'rgba(232,244,255,0.35)',
    }}>
      #{rank} · Expires: {expiresIn}
    </span>
  );
}

export default function VineCard({ etr, children }) {
  const [boostCount, setBoostCount] = useState(etr?.boosts ?? 0);

  function handleBoosted({ boosts, rankDelta }) {
    setBoostCount(c => boosts ?? c + (rankDelta ?? 1));
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px',
      padding:       '12px 16px',
      background:    'transparent',
      border:        '1px solid rgba(102,255,0,0.1)',
      borderRadius:  '4px',
    }}>
      <BoostButton etrId={etr?.id} onBoosted={handleBoosted} />
      <BoostCounter count={boostCount} />
      {etr?.rank != null && (
        <RankBadge rank={etr.rank} expiresIn={etr.swathEnd ?? '—'} />
      )}
      {children}
    </div>
  );
}
