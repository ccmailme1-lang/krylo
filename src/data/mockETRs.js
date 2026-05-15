// 200 mock ETRs — distributed across LOCAL / REGIONAL / NATIONAL zones
// Each ETR has the full signal contract expected by spinemap.jsx Scene

const SOURCES = ['internal', 'spine', 'regulatory', 'hackernews', 'financial', 'social', 'wire', 'field'];
const TEXTS = [
  'Signal detected in distribution network — origin unverified.',
  'Cross-node phase alignment observed over 30s window.',
  'Executive communication lag exceeds baseline by 3.2x.',
  'Recruiting spike in previously exited markets.',
  'Board filing amended twice without public statement.',
  'Revenue guidance revised; investor tone misaligned.',
  'Supplier chain anomaly flagged — third occurrence.',
  'Internal memo traffic spiked 400% in 48 hours.',
  'Geographic dispersion of signal inconsistent with declared footprint.',
  'Latency between public statement and internal action: 11 days.',
  'Three corroborating sources — none on record.',
  'Organizational silence following restructuring announcement.',
  'Fidelity score dropped below threshold during peak cycle.',
  'Signal velocity exceeded 15% delta over 3 cycles.',
  'Friction score below 0.3 — unspoken truth indicator active.',
  'Cross-jurisdictional pattern match — confidence 0.87.',
  'Node resonance spike: 6 primaries in phase sync.',
  'Ghost signal detected — source decayed but pattern persists.',
  'Hysteresis gate triggered: 30-frame stability breach.',
  'Sovereign kernel dwell exceeded anchor threshold.',
];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const ZONE_DIST = [
  { geoTier: 'local',    geographic_affinity: 0.85, count: 67 },
  { geoTier: 'regional', geographic_affinity: 0.50, count: 67 },
  { geoTier: 'national', geographic_affinity: 0.10, count: 66 },
];

const NOW = Date.now();
const DAY = 86400000;

export const mockETRs = (() => {
  const etrs = [];
  let idx = 0;

  ZONE_DIST.forEach(({ geoTier, geographic_affinity, count }) => {
    const rand = rng(geoTier.charCodeAt(0) * 997 + 42);
    for (let n = 0; n < count; n++) {
      const r = rand;
      const id = `etr_${geoTier[0].toUpperCase()}${String(idx).padStart(3, '0')}`;
      const fsBase = geoTier === 'local' ? 0.55 : geoTier === 'regional' ? 0.45 : 0.35;
      const fs = Math.min(0.99, Math.max(0.05, fsBase + (rand() - 0.5) * 0.4));
      const speedScale = 1.0 + rand() * 3.0;
      const bornDaysAgo = rand() * 60;
      const born_at = new Date(NOW - bornDaysAgo * DAY).toISOString();

      etrs.push({
        id,
        text:                TEXTS[Math.floor(rand() * TEXTS.length)],
        source:              SOURCES[Math.floor(rand() * SOURCES.length)],
        timestamp:           born_at,
        born_at,
        strength:            fs * 5,
        fs,
        fsVal:               fs,
        speedScale,
        geoTier,
        geographic_affinity: geographic_affinity + (rand() - 0.5) * 0.15,
        is_national:         geoTier === 'national',
        fidelity: {
          e_viral: speedScale / 4.0,
          score:   fs,
        },
        primary: true,
      });

      idx++;
    }
  });

  return etrs;
})();
