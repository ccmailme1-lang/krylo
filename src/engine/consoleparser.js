// WO-1753 — Middle Console Parser Engine
// Extracts Signal (S), Virality (V), Confidence (C) vectors from free-text payloads.
// Auto-selects chips and computes compression weights (ws + wv + wc = 1.0).

// ── Entity patterns → Signal (S) ─────────────────────────────────────────────

const ENTITY_PATTERNS = [
  { key: 'sovereign_wealth',  label: 'Sovereign_Wealth', domain: 'CAPITAL',    pattern: /sovereign\s+wealth|swf|sovereign\s+fund/i },
  { key: 'infrastructure',    label: 'Infrastructure',   domain: 'OWNERSHIP',   pattern: /infrastructure|nodes?|facilities|hard\s+assets?/i },
  { key: 'regulatory_floor',  label: 'Regulatory_Floor', domain: 'KNOWLEDGE',   pattern: /regulat(ory|ion|or)|compliance|friction|approval|legal\s+risk/i },
  { key: 'alpha_momentum',    label: 'Alpha_Momentum',   domain: 'MARKET',      pattern: /alpha|momentum|outperform|edge|excess\s+return/i },
  { key: 'capital_call',      label: 'Capital_Call',     domain: 'CAPITAL',     pattern: /capital\s+call|deployment|commit(ment)?|allocat/i },
  { key: 'geopolitical',      label: 'Geopolitical',     domain: 'MEDIA',       pattern: /geopolit|pacific\s+rim|apac|asia|sovereign|cross.border/i },
  { key: 'supply_chain',      label: 'Supply_Chain',     domain: 'OWNERSHIP',   pattern: /supply\s+chain|logistics|sourcing|procurement/i },
  { key: 'ai_infrastructure', label: 'AI_Infrastructure',domain: 'TECHNOLOGY',  pattern: /\bai\b|artificial\s+intel|data\s+center|gpu|compute\s+infra/i },
  { key: 'labor_market',      label: 'Labor_Signal',     domain: 'LABOR',       pattern: /labor|workforce|hiring|headcount|talent|employment/i },
  { key: 'media_attention',   label: 'Attention_Signal', domain: 'MEDIA',       pattern: /attention|media|coverage|narrative|press|sentiment/i },
];

// ── Temporal patterns → Virality (V) ─────────────────────────────────────────
// SHORT temporal → attenuate wv (specific window, broader signal matters less)
// LONG temporal  → boost wv (sustained virality is meaningful)

const TEMPORAL_PATTERNS = [
  { pattern: /\b(last\s+)?(24|48|72)\s+hours?\b/i,              wv_mod: -0.22, horizon: 'IMMEDIATE', label: '48H_WINDOW' },
  { pattern: /\b(last\s+)?week\b|\b7\s+days?\b/i,               wv_mod: -0.10, horizon: 'SHORT',     label: '7D_WINDOW'  },
  { pattern: /\b(last\s+)?month\b|\b30\s+days?\b/i,             wv_mod:  0.00, horizon: 'MEDIUM',    label: '30D_WINDOW' },
  { pattern: /\bquarter\b|\b90\s+days?\b|\bq[1-4]\b/i,          wv_mod:  0.05, horizon: 'MEDIUM',    label: 'QTR_WINDOW' },
  { pattern: /\b(last\s+)?(year|annual|12\s+months?)\b/i,       wv_mod:  0.10, horizon: 'LONG',      label: '1Y_WINDOW'  },
  { pattern: /\bstructural|multi.year|decade|long.term\b/i,      wv_mod:  0.15, horizon: 'STRUCTURAL',label: 'STRUCTURAL' },
  { pattern: /\bmomentum|trend(ing)?|accelerat/i,               wv_mod:  0.08, horizon: 'SHORT',     label: 'MOMENTUM'   },
];

// ── Certainty patterns → Confidence (C) ──────────────────────────────────────

const CERTAINTY_PATTERNS = [
  { pattern: /justify|threshold|gate|minimum|floor/i,           wc_mod:  0.08, label: 'THRESHOLD'   },
  { pattern: /friction|risk|uncertain|volatile|hesit/i,          wc_mod:  0.06, label: 'FRICTION'    },
  { pattern: /confident|certain|clear|definitive|locked/i,       wc_mod:  0.10, label: 'CONFIRMED'   },
  { pattern: /evaluat|consider|assess|explore|assess/i,          wc_mod:  0.04, label: 'ANALYTICAL'  },
  { pattern: /strict(ly)?|only|exclusively|narrow/i,             wc_mod:  0.07, label: 'CONSTRAINT'  },
  { pattern: /high\s+(conviction|confidence|certainty)/i,        wc_mod:  0.12, label: 'HIGH_CONV'   },
  { pattern: /low\s+(conviction|confidence|certainty)/i,         wc_mod: -0.05, label: 'LOW_CONV'    },
];

// ── Regime classification ─────────────────────────────────────────────────────

function classifyRegime(ws, wv, wc, entityCount) {
  if (wc > 0.38) return 'RISK_SCREEN';
  if (ws > 0.55 && entityCount >= 2) return 'EXECUTION_MIX';
  if (wv > 0.40) return 'VELOCITY_SCAN';
  if (ws < 0.30) return 'DISCOVERY_MODE';
  return 'ANALYTICAL_MODE';
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parsePayload(text) {
  if (!text || text.trim().length < 10) {
    return {
      chips: [], suggested: [], weights: { ws: 0.33, wv: 0.33, wc: 0.34 },
      vectors: { signal: null, virality: null, certainty: null },
      regime: null, wordCount: 0,
    };
  }

  // ── Signal extraction ──────────────────────────────────────────────────────
  const matchedEntities = ENTITY_PATTERNS.filter(e => e.pattern.test(text));
  const chips     = matchedEntities.filter((_, i) => i < 4);   // top 4 auto-selected
  const suggested = matchedEntities.filter((_, i) => i >= 4 && i < 6); // next 2 suggested

  // ── Temporal extraction ────────────────────────────────────────────────────
  const matchedTemporal = TEMPORAL_PATTERNS.filter(t => t.pattern.test(text));
  const primaryTemporal = matchedTemporal[0] ?? null;

  // ── Certainty extraction ───────────────────────────────────────────────────
  const matchedCertainty = CERTAINTY_PATTERNS.filter(c => c.pattern.test(text));

  // ── Weight computation ─────────────────────────────────────────────────────
  // Base weights
  let ws = 0.34;
  let wv = 0.33;
  let wc = 0.33;

  // Signal boost: +0.04 per extracted entity (cap ws at 0.70)
  ws = Math.min(0.70, ws + matchedEntities.length * 0.04);

  // Virality mod: temporal patterns shift wv
  matchedTemporal.forEach(t => { wv += t.wv_mod; });
  wv = Math.max(0.05, Math.min(0.60, wv));

  // Confidence mod: certainty patterns shift wc
  matchedCertainty.forEach(c => { wc += c.wc_mod; });
  wc = Math.max(0.05, Math.min(0.55, wc));

  // Normalize to 1.0
  const total = ws + wv + wc;
  ws = parseFloat((ws / total).toFixed(4));
  wv = parseFloat((wv / total).toFixed(4));
  wc = parseFloat((1 - ws - wv).toFixed(4)); // remainder avoids float drift

  const wordCount = text.trim().split(/\s+/).length;
  const regime    = classifyRegime(ws, wv, wc, matchedEntities.length);

  return {
    chips: chips.map(e => ({ label: e.label, domain: e.domain, active: true, key: e.key })),
    suggested: suggested.map(e => ({ label: e.label, domain: e.domain, active: false, key: e.key })),
    weights: { ws, wv, wc },
    vectors: {
      signal: {
        entities: matchedEntities.map(e => e.label),
        domains:  [...new Set(matchedEntities.map(e => e.domain))],
        count:    matchedEntities.length,
      },
      virality: primaryTemporal
        ? { horizon: primaryTemporal.horizon, label: primaryTemporal.label, wv }
        : null,
      certainty: matchedCertainty.length > 0
        ? { qualifiers: matchedCertainty.map(c => c.label), wc }
        : null,
    },
    regime,
    wordCount,
  };
}
