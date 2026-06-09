// mock-server.cjs
// WO-249 — Mock Truth Engine API
// KRYL-300 — POST /api/ingest: ETR payload, schema validation, 201 + id
// WO-502 — Wire /api/truth to Ollama (llama3.2:latest)
// WO-503 — Signal Cast: 5–8 signals per query, each a distinct angle on the topic
// WO-707 — SignalV1 WebSocket handshake on /signals
// Run: node mock-server/mock-server.cjs

const http   = require('http');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── WO-1092: Load .env without dotenv dependency ──────────────────────────────
(function loadEnv() {
  const envFile = path.join(__dirname, '../.env');
  if (!fs.existsSync(envFile)) return;
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq < 1) return;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  });
})();

// ── WO-1092: News ingestion constants ────────────────────────────────────────
const NEWS_API_KEY       = process.env.VITE_NEWS_API_KEY ?? '';
const NEWS_INGEST_MS     = 5 * 60 * 1000;
const CONE_DOMAINS       = ['technology', 'capital', 'knowledge', 'labor', 'media', 'ownership'];

// ── WO-707: SignalV1 WebSocket ────────────────────────────────────────────────
const WS_PATH    = '/signals';
const wsClients  = new Set();
const sseClients = new Set();

function wsHandshake(req, socket) {
  const key    = req.headers['sec-websocket-key'];
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
}

function wsFrame(payload) {
  const data = Buffer.from(payload, 'utf8');
  const len  = data.length;
  const head = len < 126
    ? Buffer.from([0x81, len])
    : Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
  return Buffer.concat([head, data]);
}

function wsBroadcast(type, payload) {
  const msg = wsFrame(JSON.stringify({ type, v: 1, ts: Date.now(), payload }));
  wsClients.forEach(s => { try { s.write(msg); } catch { wsClients.delete(s); } });
}

function makeSyncEnvelope(signals) {
  return wsFrame(JSON.stringify({ type: 'SIGNAL_SYNC', v: 1, ts: Date.now(), payload: { signals } }));
}

const MODEL      = 'gemma4:31b-cloud'; // analysis
const CONV_MODEL = 'mistral:latest';   // conversation — faster inference

// ── WO-1121/1122: CHL Normalizer (inlined — CJS cannot import ESM) ────────────

const SUPPORTED_DOMAINS = ['admissions','investment','realestate','athletics','sales','legal','procurement','general'];

const DOMAIN_KEYWORDS = {
  admissions:  ['gpa','college','university','harvard','acceptance','application','degree','enrollment','major','sat','act','admit'],
  investment:  ['stock','equity','valuation','revenue','burn','cac','ltv','arr','series','funding','ipo','portfolio','return'],
  realestate:  ['property','mortgage','listing','cap rate','noi','appraisal','escrow','deed','zoning','rent','lease'],
  athletics:   ['draft','combine','stats','roster','contract','agent','injury','scouting','performance','season','nfl','nba','mlb'],
  sales:       ['pipeline','deal','quota','close','prospect','crm','outreach','conversion','mrr','churn','upsell','account'],
  legal:       ['contract','litigation','compliance','regulation','clause','jurisdiction','statute','precedent','liability','settlement'],
  procurement: ['vendor','rfp','supply chain','bid','sourcing','logistics','inventory','sku','lead time','purchase order'],
};

const SIGNAL_KEYWORD_MAP = {
  academic_strength:  ['gpa','grade','academic','score','test','sat','act','rank'],
  org_strength:       ['leadership','president','founder','captain','director','chair'],
  network_reach:      ['connection','referral','alumni','network','recommendation','reference'],
  financial_pressure: ['scholarship','aid','loan','debt','funding','cost','afford'],
  temporal_urgency:   ['deadline','early','rolling','semester','cycle','window','soon'],
  geographic_signal:  ['state','region','country','local','national','international','city'],
  competitive_signal: ['rank','percentile','average','median','competitive','selective','yield'],
};

const FORBIDDEN_PHRASES = ['definitely will','guaranteed','the engine knows','this proves','we can confirm','it is certain'];

function normalizeQuery(text) {
  const lower = text.toLowerCase();
  const domainScores = {};
  for (const [d, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    domainScores[d] = kws.filter(k => lower.includes(k)).length;
  }
  const sorted = Object.entries(domainScores).sort((a,b) => b[1]-a[1]);
  const topScore = sorted[0][1];
  const domain = topScore === 0 ? 'general' : sorted[0][0];
  const domainConf = topScore === 0 ? 0.30 : Math.min(0.50 + topScore * 0.12, 0.95);

  const signals = Object.entries(SIGNAL_KEYWORD_MAP)
    .filter(([, kws]) => kws.some(k => lower.includes(k)))
    .map(([s]) => s);

  const signalConf = signals.length === 0 ? 0 : Math.min(0.40 + signals.length * 0.10, 0.90);
  const confidence = Math.round(((domainConf + signalConf) / 2) * 100) / 100;

  return { domain, signals, confidence };
}

const HOST_PROMPT = (query, normalized) =>
`You are a signal intelligence interpreter. You only output raw JSON. No prose, no markdown.

Query: "${query}"
Domain: ${normalized.domain}
Detected signals: ${normalized.signals.join(', ') || 'none'}
Confidence: ${normalized.confidence}

Rules:
- Only reference signals listed above. Do not invent data.
- Never use: "definitely", "guaranteed", "this proves", "certain".
- If confidence < 0.50, set mode to "CLARIFY" and explain what is missing.
- If confidence 0.50-0.89, set mode to "CAUTIOUS" and use "Historical patterns indicate" or "Current signals suggest".
- If confidence >= 0.90, set mode to "FULL" and use "Renderer state currently shows".

Output a single JSON object with keys: response (string), mode ("FULL"|"CAUTIOUS"|"CLARIFY"), confidence (number 0-1).
Start with { and end with }. Nothing else.`;

const CONVERSATION_PROMPT = (query, messages) => {
  const RULES = `
Guardrails (non-negotiable):
- Never invent statistics, data, or claims not present in the original signal.
- Never use: "definitely", "guaranteed", "certain", "proven", "will happen".
- Never give investment, legal, or medical advice.
- Stay anchored to the signal topic. Do not drift into unrelated subjects.
- One question only. No multi-part questions. No preamble.`;

  if (!messages || messages.length === 0) {
    return `You are KRYLO's signal intelligence host. A guest has just arrived looking at the signal: "${query}".

Ask them one short, sharp qualifying question to understand their angle — investor, professional navigating this signal, researcher, or personally affected.
One sentence. No greeting words. No "Hello" or "Welcome". Just the question.
${RULES}`;
  }
  const history = messages.map(m => `${m.role === 'host' ? 'Host' : 'Guest'}: ${m.text}`).join('\n');
  return `You are KRYLO's signal intelligence host. Topic: "${query}".

Conversation:
${history}

Ask one focused follow-up question based on the guest's last response. One sentence. No preamble.
${RULES}`;
};

function applyConversationGuardrails(reply, fallback) {
  const lower = reply.toLowerCase();
  const hasViolation = FORBIDDEN_PHRASES.some(p => lower.includes(p));
  if (hasViolation || reply.length < 5) return fallback;
  // Cap at 200 chars — keep it sharp
  return reply.length > 200 ? reply.slice(0, reply.lastIndexOf(' ', 200)) + '?' : reply;
}

function applyGuardrails(raw, normalized) {
  let parsed;
  try {
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { mode: 'CLARIFY', response: 'Signal confidence is insufficient for a reliable interpretation.', confidence: normalized.confidence, signal_vector: normalized.signals, domain: normalized.domain, traceable: false };
  }

  const lower = (parsed.response || '').toLowerCase();
  const hasViolation = FORBIDDEN_PHRASES.some(p => lower.includes(p));
  if (hasViolation) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', confidence: 0, signal_vector: [], domain: normalized.domain, traceable: false };
  }

  return {
    mode:         parsed.mode   || 'CAUTIOUS',
    response:     parsed.response || 'Signal confidence is insufficient for a reliable interpretation.',
    confidence:   typeof parsed.confidence === 'number' ? parsed.confidence : normalized.confidence,
    signal_vector: normalized.signals,
    domain:       normalized.domain,
    traceable:    true,
  };
}

// ── WO-1123: State Machine Telemetry (inlined — CJS cannot import ESM) ──────────
// Sources: pliengine.js (score), revenuesignal.jsx (roi/u_score), foresight_pipeline.js (coherence)

// score — mock PLI proxy (WO-1121/1102)
// Full formula: PLI = (Gap × Velocity × Window) / Coverage
// Gap + Coverage derived from normalizer confidence; Velocity from signal dimension count
function computeMockScore(normalized) {
  const sigCount  = normalized.signals.length;
  const conf      = normalized.confidence;
  const gap       = Math.min(1, 0.40 + (1 - conf) * 0.40);
  const velocity  = Math.min(1, 0.20 + (sigCount / 5) * 0.60);
  const windowVal = 0.65;
  const coverage  = Math.max(0.10, conf * 0.60);
  return parseFloat(Math.min(1, (gap * velocity * windowVal) / coverage).toFixed(3));
}

// roi + u_score — mock constants from revenuesignal.jsx (WO-1031/1105)
// Live LTV/CAC/sourceCount required for U ≥ 25 (STATE 3); mock always yields U ≈ 9.18
const MOCK_LTV     = 450;
const MOCK_CAC     = 120;
const MOCK_SOURCES = 6;

function computeMockROI() {
  return parseFloat((MOCK_LTV / MOCK_CAC).toFixed(3)); // 3.75 — above RAMS_RATIO 3.0
}

function computeMockUScore() {
  return parseFloat(((MOCK_LTV / MOCK_CAC) * Math.sqrt(MOCK_SOURCES)).toFixed(3)); // ≈ 9.18
}

// coherence — Cs = max(0.60, 1.0 − 0.40 × V) (WO-1029.B)
// V = Kendall inversion ratio; proxied here from confidence inversion
function computeMockCoherence(normalized) {
  const V = Math.max(0, (1 - normalized.confidence) * 0.5);
  return parseFloat(Math.max(0.60, 1.0 - 0.40 * V).toFixed(3));
}

// WO-1123 state resolver — exact thresholds, priority: 0 → 3 → 2 → 1
function resolveState(confidence, score, roi, uScore, coherence) {
  if (confidence < 0.50)                  return 0; // UNCERTAIN — null state
  if (uScore >= 25 && coherence >= 0.85)  return 3; // IMPACT    — event lock
  if (score  >= 0.73 && roi    >= 3.0)   return 2; // WARNING   — structural anomaly
  return 1;                                          // COLD      — noise floor
}

const STATE_BAND = ['UNCERTAIN', 'COLD', 'WARNING', 'IMPACT'];

// ── WO-895: GDELT Proxy Cache ─────────────────────────────────────────────────
const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_TTL = 60_000;
const gdeltCache = { articles: [], ts: 0, query: null };

async function fetchGdeltRemote(query) {
  const q = query.trim()
    ? encodeURIComponent(`${query} sourcelang:english`)
    : encodeURIComponent('sourcelang:english');
  const url = `${GDELT_API}?query=${q}&mode=artlist&maxrecords=250&format=json&timespan=24h`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);
  const data = await res.json();
  return data.articles ?? [];
}

// ── Signal Cast Prompt ────────────────────────────────────────────────────────

const CAST_PROMPT = (query) =>
`You are a JSON API. You only output raw JSON. No prose, no explanation, no markdown.

Analyze this query: "${query}"

Output a JSON array of exactly 3 signal objects. Start your response with [ and end with ]. Nothing else.

Each object has these keys: id (s1/s2/s3), signal_score (integer 0-100), truth_statement (string), truth_supporting (string), definition (string), origin (string — historical/linguistic origin), usage (string — how this term is used in conversation), comments (array of 2 objects each with id/text/source/date as YYYY-MM-DD), tags (string array), signals (empty array), patterns (empty array), ground (empty object).`;

// ── JSON parser ───────────────────────────────────────────────────────────────

function extractJson(text) {
  const stripped = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

  // Try clean full parse first
  try {
    const start = stripped.indexOf('[');
    const end   = stripped.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(stripped.slice(start, end + 1));
      return Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch (_) { /* fall through to recovery */ }

  // Recovery: walk chars and extract every complete {...} object
  const arrayStart = stripped.indexOf('[');
  const content    = arrayStart !== -1 ? stripped.slice(arrayStart + 1) : stripped;
  const objects    = [];
  let depth    = 0;
  let objStart = -1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          objects.push(JSON.parse(content.slice(objStart, i + 1)));
        } catch (_) { /* skip malformed object */ }
        objStart = -1;
      }
    }
  }

  if (objects.length === 0) throw new Error('No valid JSON objects found in response');
  return objects;
}

// ── Enrich each signal with fidelity_components ───────────────────────────────

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function enrichSignal(raw, index, query) {
  const score  = clamp((raw.signal_score ?? 50) / 100, 0, 1);
  const jitter = () => (Math.random() * 0.12) - 0.06;
  return {
    id:          raw.id ?? `etr-${Date.now()}-${index}`,
    title:       query,
    source_type: 'truth-engine',
    ...raw,
    signal_score: score,
    fidelity_components: {
      m_checksum:  clamp(score + jitter(), 0, 1),
      t_telemetry: clamp(score + jitter(), 0, 1),
      d_docs:      clamp(score - 0.05 + jitter(), 0, 1),
      v_voice:     clamp(score - 0.10 + jitter(), 0, 1),
      e_viral:     clamp(score * 0.5  + jitter(), 0, 1),
    },
  };
}

// ── Ollama call ───────────────────────────────────────────────────────────────

async function callOllama(query) {
  const res = await fetch('http://localhost:11434/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    MODEL,
      messages: [{ role: 'user', content: CAST_PROMPT(query) }],
      stream:   false,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data    = await res.json();
  const text    = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Ollama returned empty content');
  const signals = extractJson(text);
  return signals.map((s, i) => enrichSignal(s, i, query));
}

// ── Static fallback ───────────────────────────────────────────────────────────

const staticFallback = (query) => [{
  id:              'etr-fallback',
  title:            query,
  truth_statement:  `${query} — signal detected`,
  truth_supporting: 'Fallback record — Ollama unavailable.',
  definition:       'Signal definition unavailable. Ollama not responding.',
  origin:           '—',
  comments:         [],
  source_type:      'fallback',
  signal_score:     0.5,
  tags:             ['fallback'],
  signals:          [],
  patterns:         [],
  ground:           {},
  fidelity_components: {
    m_checksum: 0.5, t_telemetry: 0.5, d_docs: 0.5, v_voice: 0.5, e_viral: 0.5,
  },
}];

// ── WO-624: Seed ETR Dataset — 15 static records ─────────────────────────────

const SEED_ETRS = [
  // ── Economic Pressure: The Illusion of Growth ──────────────────────────────
  {
    id: 'EP-001', source_type: 'seed', title: 'Economic Pressure',
    truth_statement: 'The Unattainable Milestone — career advancement has been replaced by survival for the 25–45 cohort.',
    truth_supporting: 'The shift from prioritizing career advancement to merely surviving. Many 25–45 year olds are stalling on major life events like buying a home or starting a family because they are managing high, stagnant costs of living.',
    definition: 'A generational stall in which economic pressure has displaced traditional adult milestones — homeownership, family formation — from attainable goals to deferred aspirations.',
    origin: 'Emerged post-2008 financial crisis; accelerated by pandemic-era inflation and housing market compression.',
    usage: 'Used to describe the widening gap between nominal economic indicators and lived financial reality for working-age adults.',
    comments: [
      { id: 'c1', text: 'This is the quiet crisis nobody talks about at work.', source: 'reddit', date: '2026-03-01' },
      { id: 'c2', text: 'Bought into the hustle and still can\'t afford a down payment.', source: 'twitter', date: '2026-03-10' },
    ],
    tags: ['economic-pressure', 'housing', 'milestones', 'cost-of-living'],
    signal_score: 0.74, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.78, t_telemetry: 0.72, d_docs: 0.69, v_voice: 0.65, e_viral: 0.38 },
  },
  {
    id: 'EP-002', source_type: 'seed', title: 'Economic Pressure',
    truth_statement: 'The Job Hugging Phenomenon — workers stay in stagnant roles out of fear, creating a low-hiring, low-firing freeze.',
    truth_supporting: 'Despite labor market volatility, workers are staying in stagnant roles due to fear, creating a "low-hiring, low-firing" environment that limits career progression and wage growth.',
    definition: 'A labor market condition in which fear-driven retention suppresses mobility, flattening career trajectories and suppressing wage competition across industries.',
    origin: 'Coined during post-pandemic labor retrenchment; reflects the psychological aftermath of mass layoff cycles.',
    usage: 'Describes the paradox of low unemployment paired with low career velocity — workers present but not progressing.',
    comments: [
      { id: 'c1', text: 'I haven\'t applied anywhere in two years. Too scared to leave.', source: 'linkedin', date: '2026-02-14' },
      { id: 'c2', text: 'The job market is frozen. Everyone is waiting for someone else to move first.', source: 'reddit', date: '2026-03-05' },
    ],
    tags: ['economic-pressure', 'labor-market', 'stagnation', 'fear'],
    signal_score: 0.71, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.74, t_telemetry: 0.69, d_docs: 0.66, v_voice: 0.71, e_viral: 0.42 },
  },
  {
    id: 'EP-003', source_type: 'seed', title: 'Economic Pressure',
    truth_statement: 'The Paycheck-to-Paycheck Professional — high earners remain financially fragile due to debt, childcare, and housing costs.',
    truth_supporting: 'High earners (in nominal terms) who are still financially fragile due to debt, childcare costs, and housing, often needing side hustles just to feel secure.',
    definition: 'The condition of nominal high-income earners whose real disposable income is consumed by structural costs — debt service, childcare, housing — leaving them as financially precarious as lower-wage workers.',
    origin: 'Documented across post-2020 economic surveys; normalized by the decoupling of nominal salary growth from real purchasing power.',
    usage: 'Exposes the gap between salary optics and financial security among professional-class workers.',
    comments: [
      { id: 'c1', text: '$120k salary and I still check my balance before groceries.', source: 'twitter', date: '2026-03-12' },
      { id: 'c2', text: 'The six-figure trap is real. Nobody talks about it.', source: 'reddit', date: '2026-02-28' },
    ],
    tags: ['economic-pressure', 'debt', 'childcare', 'side-hustle', 'financial-fragility'],
    signal_score: 0.78, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.81, t_telemetry: 0.76, d_docs: 0.72, v_voice: 0.80, e_viral: 0.55 },
  },

  // ── Trust Breakdown: Insular Tribalism ─────────────────────────────────────
  {
    id: 'TB-001', source_type: 'seed', title: 'Trust Breakdown',
    truth_statement: 'Insular Trust Mindset — 70% of people hesitate to trust anyone outside their ideological circle.',
    truth_supporting: '70% of people are now hesitant to trust anyone with different political beliefs, values, or backgrounds, leading to a retreat into smaller, likeminded "safe" circles.',
    definition: 'A measurable contraction of social trust radius in which ideological alignment has become a prerequisite for interpersonal and professional trust.',
    origin: 'Documented in post-2016 longitudinal trust studies; accelerated by social media algorithmic sorting and pandemic isolation.',
    usage: 'Used to describe the tribalization of everyday social behavior — hiring, friendship, community — along ideological lines.',
    comments: [
      { id: 'c1', text: 'I don\'t even try to have a conversation with people who don\'t share my values anymore.', source: 'reddit', date: '2026-03-08' },
      { id: 'c2', text: 'Trust has become a luxury item.', source: 'twitter', date: '2026-03-15' },
    ],
    tags: ['trust-breakdown', 'tribalism', 'polarization', 'social-trust'],
    signal_score: 0.82, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.85, t_telemetry: 0.80, d_docs: 0.78, v_voice: 0.74, e_viral: 0.60 },
  },
  {
    id: 'TB-002', source_type: 'seed', title: 'Trust Breakdown',
    truth_statement: 'Workplace Polarization — 42% of young professionals would rather change departments than report to a manager with different values.',
    truth_supporting: '42% of young professionals would rather change departments than work for a manager with different values, causing a breakdown in organizational cohesion.',
    definition: 'The infiltration of ideological sorting into organizational structures, producing a workforce that optimizes for values alignment over competence, opportunity, or growth.',
    origin: 'Identified in 2024–2025 workplace culture surveys; reflects the downstream effect of political polarization entering professional identity.',
    usage: 'Describes the organizational fragility created when values misalignment overrides professional judgment in career decisions.',
    comments: [
      { id: 'c1', text: 'Requested a transfer the week my new manager posted his politics online.', source: 'linkedin', date: '2026-02-20' },
      { id: 'c2', text: 'Culture fit now means political fit. That\'s a problem.', source: 'reddit', date: '2026-03-11' },
    ],
    tags: ['trust-breakdown', 'workplace', 'polarization', 'values'],
    signal_score: 0.69, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.72, t_telemetry: 0.67, d_docs: 0.70, v_voice: 0.65, e_viral: 0.44 },
  },
  {
    id: 'TB-003', source_type: 'seed', title: 'Trust Breakdown',
    truth_statement: 'Loss of Future Optimism — only 32% of people worldwide believe the next generation will have a better life.',
    truth_supporting: 'Only 32% of people worldwide believe the next generation will have a better life than their parents.',
    definition: 'A global collapse in intergenerational optimism — the foundational belief that progress is directional and that children will inherit a better world than their parents.',
    origin: 'Measured across 27 countries in 2025 Ipsos Global Trends Report; reflects convergence of economic, political, and ecological pessimism.',
    usage: 'Signals a fundamental breakdown in the social contract premise that underlies long-term institutional trust.',
    comments: [
      { id: 'c1', text: 'I genuinely don\'t know if I should bring children into this world.', source: 'reddit', date: '2026-03-01' },
      { id: 'c2', text: 'The 32% statistic broke something in me when I saw it.', source: 'twitter', date: '2026-03-18' },
    ],
    tags: ['trust-breakdown', 'optimism', 'intergenerational', 'future'],
    signal_score: 0.76, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.79, t_telemetry: 0.74, d_docs: 0.80, v_voice: 0.77, e_viral: 0.58 },
  },

  // ── Social Fragmentation: The Disconnected Community ───────────────────────
  {
    id: 'SF-001', source_type: 'seed', title: 'Social Fragmentation',
    truth_statement: 'Adults at Home Trend — 1 million more young adults living with parents than pre-pandemic baseline, stalling independent identity.',
    truth_supporting: '1 million more young adults are living with parents than pre-pandemic trends, delaying independent adult identity and community participation.',
    definition: 'A measurable reversal of residential independence trajectories in which economic pressure has driven young adults back into parental households, delaying the formation of autonomous adult identity.',
    origin: 'Documented in 2024 U.S. Census housing data; reflects the compounding effects of housing costs, student debt, and wage stagnation.',
    usage: 'Used to describe the structural delay of adulthood — its milestones, social roles, and community integration — caused by economic conditions.',
    comments: [
      { id: 'c1', text: 'Moved back at 29. Never thought this would be my life.', source: 'reddit', date: '2026-02-25' },
      { id: 'c2', text: 'It\'s not failure. It\'s survival. But it doesn\'t feel good.', source: 'twitter', date: '2026-03-09' },
    ],
    tags: ['social-fragmentation', 'housing', 'young-adults', 'identity'],
    signal_score: 0.65, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.68, t_telemetry: 0.63, d_docs: 0.72, v_voice: 0.60, e_viral: 0.40 },
  },
  {
    id: 'SF-002', source_type: 'seed', title: 'Social Fragmentation',
    truth_statement: 'Disappearance of Third Spaces — affordable social infrastructure is collapsing, making community a premium product.',
    truth_supporting: 'The decline of affordable social spaces and the rise of the "experience economy" means social interaction is becoming a premium product rather than a community default.',
    definition: 'The erosion of the neutral, accessible, non-commercial spaces — cafes, parks, libraries, community centers — where social cohesion historically formed without economic barrier.',
    origin: 'Concept developed by sociologist Ray Oldenburg; crisis accelerated by commercial real estate pressure, pandemic closures, and the monetization of gathering.',
    usage: 'Describes how the commodification of social experience is pricing community out of reach for working-class and middle-class people.',
    comments: [
      { id: 'c1', text: 'The coffee shop I used to hang out at for free now charges a $12 minimum. Community is now a subscription.', source: 'reddit', date: '2026-03-03' },
      { id: 'c2', text: 'Where do you go when you can\'t afford to go anywhere?', source: 'twitter', date: '2026-03-14' },
    ],
    tags: ['social-fragmentation', 'third-spaces', 'community', 'experience-economy'],
    signal_score: 0.72, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.70, t_telemetry: 0.74, d_docs: 0.68, v_voice: 0.75, e_viral: 0.50 },
  },
  {
    id: 'SF-003', source_type: 'seed', title: 'Social Fragmentation',
    truth_statement: 'Atomization of Family — declining multi-generational support systems are placing unprecedented pressure on individuals.',
    truth_supporting: 'Diverse family structures and high mobility are leading to fewer multi-generational support systems, placing intense pressure on individuals.',
    definition: 'The structural dissolution of extended family networks through geographic mobility and diversifying household structures, leaving individuals without the informal care, financial, and emotional infrastructure that multi-generational families historically provided.',
    origin: 'Tracked across 2020–2025 sociological longitudinal studies; reflects post-industrial mobility patterns compounded by pandemic dislocation.',
    usage: 'Describes the invisible tax of atomized living — the cost of navigating life without a generational safety net.',
    comments: [
      { id: 'c1', text: 'My parents are 1,200 miles away. My kids have never had a babysitter that wasn\'t paid.', source: 'reddit', date: '2026-02-18' },
      { id: 'c2', text: 'The village is gone. We\'re all just winging it alone.', source: 'twitter', date: '2026-03-07' },
    ],
    tags: ['social-fragmentation', 'family', 'mobility', 'support-systems'],
    signal_score: 0.68, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.66, t_telemetry: 0.70, d_docs: 0.64, v_voice: 0.72, e_viral: 0.45 },
  },

  // ── Tech Displacement: The AI Anxiety Loop ─────────────────────────────────
  {
    id: 'TD-001', source_type: 'seed', title: 'Tech Displacement',
    truth_statement: 'Job Hugging vs. Automation Fear — 41% of organizations expect to reduce headcount by 2030 due to AI, creating silent chronic anxiety.',
    truth_supporting: 'While employees stay put out of fear, 41% of organizations expect to reduce their workforce by 2030 due to AI, leading to a silent, constant anxiety about long-term employability.',
    definition: 'The paradox of immobile workers clinging to roles simultaneously targeted for elimination by AI-driven efficiency initiatives — a static position in a disappearing landscape.',
    origin: 'World Economic Forum Future of Jobs Report 2025; reflects the convergence of post-pandemic risk aversion with accelerating AI adoption curves.',
    usage: 'Describes the psychological condition of workers who cannot leave and cannot stay — trapped between fear of the market and fear of automation.',
    comments: [
      { id: 'c1', text: 'I stay in my job because leaving feels risky. But I know they\'re building AI to replace me.', source: 'linkedin', date: '2026-03-06' },
      { id: 'c2', text: 'The automation anxiety is constant background noise now.', source: 'reddit', date: '2026-03-16' },
    ],
    tags: ['tech-displacement', 'AI', 'automation', 'employment', 'anxiety'],
    signal_score: 0.85, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.88, t_telemetry: 0.83, d_docs: 0.85, v_voice: 0.78, e_viral: 0.65 },
  },
  {
    id: 'TD-002', source_type: 'seed', title: 'Tech Displacement',
    truth_statement: 'Quantified Self Burnout — the relentless pressure to upskill, self-brand, and manage digital identity is creating a new class of worker exhaustion.',
    truth_supporting: 'The pressure to constantly update skills, build a personal brand, and manage one\'s digital identity to stay relevant to employers.',
    definition: 'A form of occupational burnout driven not by workload but by the perpetual self-optimization demanded by algorithmic labor markets — the worker as a product requiring constant iteration.',
    origin: 'Identified in 2024–2025 workforce wellness studies; reflects the gamification of career development in platform-mediated economies.',
    usage: 'Describes the exhaustion of workers who are not overworked in hours but in the cognitive and emotional labor of continuous self-marketing.',
    comments: [
      { id: 'c1', text: 'I spent my weekend getting a certification I\'ll probably never use just to keep my resume competitive.', source: 'linkedin', date: '2026-02-22' },
      { id: 'c2', text: 'The personal brand treadmill never stops and I\'m so tired.', source: 'twitter', date: '2026-03-13' },
    ],
    tags: ['tech-displacement', 'burnout', 'personal-brand', 'upskilling', 'digital-identity'],
    signal_score: 0.73, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.71, t_telemetry: 0.75, d_docs: 0.68, v_voice: 0.79, e_viral: 0.52 },
  },
  {
    id: 'TD-003', source_type: 'seed', title: 'Tech Displacement',
    truth_statement: 'AI as Co-Pilot or Replacement — the tension between AI-augmented efficiency and worker obsolescence is the defining anxiety of the professional class.',
    truth_supporting: 'The tension between using AI to increase efficiency and the fear that this same efficiency makes the worker obsolete.',
    definition: 'The existential ambiguity facing knowledge workers who are simultaneously empowered and threatened by AI tools — where efficiency gains made by the worker become the argument for eliminating the worker.',
    origin: 'Emerged as dominant workplace discourse in 2024–2025; reflects the dual-use nature of AI productivity tools in corporate efficiency narratives.',
    usage: 'Describes the cognitive dissonance of workers who adopt AI to survive while that adoption accelerates their potential replacement.',
    comments: [
      { id: 'c1', text: 'I use AI to do 3x the work. My reward is the expectation that I keep doing 3x the work.', source: 'linkedin', date: '2026-03-04' },
      { id: 'c2', text: 'Every AI tool I adopt is another data point in the case for eliminating my role.', source: 'reddit', date: '2026-03-17' },
    ],
    tags: ['tech-displacement', 'AI', 'co-pilot', 'obsolescence', 'productivity'],
    signal_score: 0.88, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.90, t_telemetry: 0.86, d_docs: 0.82, v_voice: 0.84, e_viral: 0.70 },
  },

  // ── System Strain: The Burnout Economy ─────────────────────────────────────
  {
    id: 'SS-001', source_type: 'seed', title: 'System Strain',
    truth_statement: 'Healthcare Costs vs. Care Access — costs rising at a 15-year high while 84% of Gen Z reports high economic anxiety affecting work performance.',
    truth_supporting: 'Healthcare costs are rising at the highest rate in 15 years, with 84% of Gen Z reporting high anxiety about the economy, affecting work performance.',
    definition: 'A systemic divergence in which the cost of healthcare access accelerates beyond wage growth, converting a foundational safety net into a source of anxiety and financial exposure.',
    origin: 'KFF Health Cost Survey 2025; APA Stress in America Gen Z report 2025.',
    usage: 'Describes the downstream productivity and mental health effects of healthcare cost anxiety on the working population.',
    comments: [
      { id: 'c1', text: 'I skipped my annual checkup again because I can\'t afford the deductible.', source: 'reddit', date: '2026-03-02' },
      { id: 'c2', text: '84% — that number should be on the front page every day.', source: 'twitter', date: '2026-03-19' },
    ],
    tags: ['system-strain', 'healthcare', 'gen-z', 'anxiety', 'costs'],
    signal_score: 0.79, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.82, t_telemetry: 0.77, d_docs: 0.84, v_voice: 0.73, e_viral: 0.56 },
  },
  {
    id: 'SS-002', source_type: 'seed', title: 'System Strain',
    truth_statement: 'Retirement Anxiety — eroding institutional trust in pensions and social security is driving checked-out or high-risk financial behavior.',
    truth_supporting: 'A general lack of trust that social security or institutional pensions will exist, leading to "checked-out" financial behaviors or extreme, self-led, and high-risk investments.',
    definition: 'The behavioral and psychological response to the perceived unreliability of state and institutional retirement systems — manifesting as either financial disengagement or speculative over-correction.',
    origin: 'Pew Research Center Retirement Trust Survey 2024–2025; reflects multi-decade erosion of defined-benefit pension systems.',
    usage: 'Describes the polarized financial behavior of workers who either disengage from long-term planning or pursue extreme risk as a substitute for institutional safety.',
    comments: [
      { id: 'c1', text: 'I don\'t plan for retirement. I plan for the next five years and hope for the best.', source: 'reddit', date: '2026-02-27' },
      { id: 'c2', text: 'Why save conservatively for a system that might not exist? At least crypto is honest about being a gamble.', source: 'twitter', date: '2026-03-10' },
    ],
    tags: ['system-strain', 'retirement', 'social-security', 'financial-anxiety'],
    signal_score: 0.77, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.75, t_telemetry: 0.79, d_docs: 0.76, v_voice: 0.74, e_viral: 0.48 },
  },
  {
    id: 'SS-003', source_type: 'seed', title: 'System Strain',
    truth_statement: 'Environmental Pessimism — climate anxiety is making long-term life planning feel irrational for a generation inheriting ecological instability.',
    truth_supporting: 'The strain of planning for a future that seems fundamentally altered by climate change and ecological decline, making long-term planning feel illogical.',
    definition: 'A psychological and behavioral state in which climate and ecological uncertainty disrupts conventional long-term planning frameworks — housing, family, investment — by rendering their foundational assumptions unstable.',
    origin: 'Lancet Countdown on Health and Climate Change 2025; APA Eco-Anxiety Report 2024.',
    usage: 'Describes how environmental pessimism operates as an invisible tax on future orientation — eroding the motivational basis for long-term commitment.',
    comments: [
      { id: 'c1', text: 'Why buy a house in a flood zone? Why have kids in a world we\'re destroying?', source: 'reddit', date: '2026-03-05' },
      { id: 'c2', text: 'Climate anxiety has made me genuinely bad at planning anything past 10 years.', source: 'twitter', date: '2026-03-20' },
    ],
    tags: ['system-strain', 'climate', 'environmental-pessimism', 'long-term-planning'],
    signal_score: 0.70, signals: [], patterns: [], ground: {},
    fidelity_components: { m_checksum: 0.68, t_telemetry: 0.72, d_docs: 0.74, v_voice: 0.71, e_viral: 0.53 },
  },
];

const ALL_ETRS = [...SEED_ETRS]; // stable base — live pool merges on top in client

// ── WO-1091: Frame Log + Compliance ──────────────────────────────────────────

const REPO_ROOT  = path.resolve(__dirname, '..');
const FRAMES_LOG = path.join(REPO_ROOT, 'runtime', 'frames.ndjson');
const LOG_MAX    = 1000; // rotate above this

const { evaluateCompliance, ComplianceTrigger, ComplianceState } =
  require(path.join(REPO_ROOT, 'runtime', 'frameCompliance.cjs'));
const { FlowController, FlowState } =
  require(path.join(REPO_ROOT, 'runtime', 'flowcontroller.cjs'));

const flowCtrl = new FlowController({ baseEmissionIntervalMs: 400 });

let frameSeq  = 0;
let lastSize  = 0;
let compState = ComplianceState.VALID;

function appendFrameLog(frameBase64, domainId, eventCount) {
  const prevSeq  = frameSeq - 1;
  const frameSize = Buffer.byteLength(frameBase64, 'base64');

  // Compliance: detect delta breach (>50% size change) or discontinuity
  const driftRatio = lastSize > 0 ? Math.abs(frameSize - lastSize) / lastSize : 0;
  const trigger = driftRatio > 0.5
    ? ComplianceTrigger.FRAME_DELTA_BREACH
    : (frameSeq > 0 && prevSeq !== frameSeq - 1 ? ComplianceTrigger.SEQUENCE_DISCONTINUITY : null);

  if (trigger) {
    compState = evaluateCompliance({ trigger }, { driftRatio, currentState: compState });
  } else {
    compState = ComplianceState.VALID;
  }

  lastSize = frameSize;

  const entry = JSON.stringify({ seq: frameSeq++, ts: new Date().toISOString(), domainId, eventCount, frameSize, compliance: compState, frame: frameBase64 });

  // Rotate log at max
  try {
    const lines = fs.existsSync(FRAMES_LOG)
      ? fs.readFileSync(FRAMES_LOG, 'utf8').trim().split('\n').filter(Boolean)
      : [];
    if (lines.length >= LOG_MAX) lines.splice(0, lines.length - LOG_MAX + 1);
    lines.push(entry);
    fs.writeFileSync(FRAMES_LOG, lines.join('\n') + '\n');
  } catch (err) {
    console.warn('[WO-1091] log write failed:', err.message);
  }
}

// ── WO-1090: Inline ABI v1.0 Frame Encoder (CJS — cannot import ESM codec) ───

const ABI_VERSION_BYTE  = 0x01;
const DOMAIN_SEPARATOR_BYTE = 0xAB;
const FRAME_HEADER_SIZE = 41;
const EVENT_HEADER_SIZE = 20;

const SRC_TO_DOMAIN = {
  'seed': 1, 'truth-engine': 2, 'hn': 3, 'fallback': 4, 'spine': 5, 'nooma': 6,
};

function packSpatialKeyBigInt(sig) {
  const fc = sig.fidelity_components ?? {};
  const p = (v) => BigInt(Math.round(Math.min(1, Math.max(0, v ?? 0)) * 255));
  return p(fc.m_checksum)      |
    (p(fc.t_telemetry) <<  8n) |
    (p(fc.d_docs)      << 16n) |
    (p(fc.v_voice)     << 24n) |
    (p(fc.e_viral)     << 32n) |
    (p(sig.signal_score ?? 0)  << 40n);
}

function encodeAbiFrame(domainId, events) {
  let payloadTotal = 0;
  for (const ev of events) payloadTotal += ev.payload.length;
  const frameLength = FRAME_HEADER_SIZE + events.length * EVENT_HEADER_SIZE + payloadTotal;

  const buf = Buffer.alloc(frameLength, 0);
  buf.writeUInt32LE(frameLength, 0);
  buf[4] = ABI_VERSION_BYTE;
  buf[5] = DOMAIN_SEPARATOR_BYTE;
  buf[6] = domainId & 0xFF;
  buf.writeUInt32LE(events.length, 7);
  // bytes 11-40: reserved (already 0)

  let offset = FRAME_HEADER_SIZE;
  for (const ev of events) {
    buf[offset++] = ev.domainId & 0xFF;
    buf[offset++] = ev.typeId & 0xFF;
    buf.writeUInt32LE(ev.commitIndex, offset); offset += 4;
    buf.writeUInt32LE(ev.sequenceId, offset);  offset += 4;
    buf.writeBigUInt64LE(BigInt(ev.spatialKey), offset); offset += 8;
    buf.writeUInt16LE(ev.payload.length, offset); offset += 2;
    ev.payload.copy(buf, offset); offset += ev.payload.length;
  }
  return buf;
}

function signalsToFrame(signals) {
  const batchDomainId = 1;
  const events = signals.map((sig, i) => ({
    domainId:    (SRC_TO_DOMAIN[sig.source_type] ?? 7) & 0xFF,
    typeId:      1,
    commitIndex: 0,
    sequenceId:  i,
    spatialKey:  packSpatialKeyBigInt(sig),
    payload:     Buffer.from(JSON.stringify({ id: sig.id, ts: (sig.truth_statement ?? '').slice(0, 512) }), 'utf8'),
  }));
  return encodeAbiFrame(batchDomainId, events);
}

// ── Ingest store ──────────────────────────────────────────────────────────────

const ingestedSignals = [];

// ── Live Stats Engine — powers /api/stats/stream SSE ─────────────────────────

function deriveStatCounts() {
  const pool = [...ALL_ETRS, ...ingestedSignals];
  return {
    inAnalysis:  pool.filter(e => (e.signal_score ?? 0) < 0.50).length,
    processing:  pool.filter(e => (e.signal_score ?? 0) >= 0.50 && (e.signal_score ?? 0) < 0.70).length,
    post:        pool.filter(e => (e.signal_score ?? 0) >= 0.70).length,
    total:       pool.length,
  };
}

// Rolling state — seeds from real ETR distribution, drifts independently
const statState = (() => {
  const base = deriveStatCounts();
  // Scale to realistic display values; Active Positions represents broader monitored universe
  return {
    activePositions: 800 + base.total * 3,
    inAnalysis:      Math.max(12, base.inAnalysis * 4 + 8),
    processing:      Math.max(10, base.processing * 4 + 6),
    post:            Math.max(10, base.post * 3 + 4),
    // 8-point sparkline history per metric
    history: {
      activePositions: Array.from({ length: 8 }, (_, i) => 800 + base.total * 3 - (7 - i) * 3),
      inAnalysis:      Array.from({ length: 8 }, () => Math.max(12, base.inAnalysis * 4 + 8)),
      processing:      Array.from({ length: 8 }, () => Math.max(10, base.processing * 4 + 6)),
      post:            Array.from({ length: 8 }, () => Math.max(10, base.post * 3 + 4)),
    },
    // Previous snapshot for delta calculation (1 tick ago)
    prev: null,
  };
})();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function tickStats() {
  statState.prev = {
    activePositions: statState.activePositions,
    inAnalysis:      statState.inAnalysis,
    processing:      statState.processing,
    post:            statState.post,
  };

  // Active Positions: biased upward, occasionally drops a little
  const apDrift = Math.random() < 0.75 ? randInt(1, 8) : randInt(-3, 0);
  statState.activePositions = Math.max(780, statState.activePositions + apDrift);

  // In Analysis: fluctuates ±3
  statState.inAnalysis = Math.max(5, statState.inAnalysis + randInt(-3, 3));

  // Processing: fluctuates ±2
  statState.processing = Math.max(4, statState.processing + randInt(-2, 2));

  // Post: slow upward drift, occasionally flat
  const postDrift = Math.random() < 0.6 ? randInt(0, 2) : randInt(-1, 0);
  statState.post = Math.max(4, statState.post + postDrift);

  // Roll sparkline histories
  for (const key of ['activePositions', 'inAnalysis', 'processing', 'post']) {
    statState.history[key].shift();
    statState.history[key].push(statState[key]);
  }
}

function toSparkPoints(history) {
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  return history.map((v, i) => {
    const x = Math.round((i / (history.length - 1)) * 80);
    const y = Math.round(16 - ((v - min) / range) * 12) + 2;
    return `${x},${y}`;
  }).join(' ');
}

function buildStatsPayload() {
  tickStats();
  const p = statState.prev;
  const sign = n => (n >= 0 ? '+' : '') + String(n).padStart(2, '0');
  return {
    activePositions: { value: statState.activePositions, delta: p ? sign(statState.activePositions - p.activePositions) : '+00', spark: toSparkPoints(statState.history.activePositions) },
    inAnalysis:      { value: statState.inAnalysis,      delta: p ? sign(statState.inAnalysis      - p.inAnalysis)      : '+00', spark: toSparkPoints(statState.history.inAnalysis)      },
    processing:      { value: statState.processing,      delta: p ? sign(statState.processing      - p.processing)      : '+00', spark: toSparkPoints(statState.history.processing)      },
    post:            { value: statState.post,            delta: p ? sign(statState.post            - p.post)            : '+00', spark: toSparkPoints(statState.history.post)            },
  };
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── POST /api/ingest ──────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/ingest') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.id || typeof payload.id !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id required (string)' })); return;
        }
        const tel = payload.telemetry;
        if (!tel || typeof tel !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'telemetry object required' })); return;
        }
        const telKeys = ['m_checksum', 't_telemetry', 'd_docs', 'v_voice', 'e_viral'];
        for (const k of telKeys) {
          if (typeof tel[k] !== 'number' || tel[k] < 0 || tel[k] > 1) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `telemetry.${k} must be number in [0, 1]` })); return;
          }
        }
        const meta = payload.metadata;
        if (!meta || typeof meta !== 'object' || !meta.source) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'metadata.source required' })); return;
        }
        const fs = tel.m_checksum * 0.40 + tel.t_telemetry * 0.30 + tel.d_docs * 0.20
                 + tel.v_voice * 0.09 + tel.e_viral * 0.01;
        const record = {
          id: payload.id, source_type: meta.source,
          truth_statement: meta.truth_statement ?? payload.id,
          signal_score: fs, fidelity_components: tel,
          ingested_at: meta.timestamp ?? new Date().toISOString(),
        };
        ingestedSignals.push(record);
        console.log(`[KRYL-300] Ingested: ${payload.id} Fs=${fs.toFixed(3)}`);
        wsBroadcast('SIGNAL_PUSH', { signal: record }); // WO-707: push to all WS clients
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: payload.id }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  // ── POST /api/truth ───────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/truth') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        const q = query || 'unknown';
        console.log(`[WO-503] Signal cast for: "${q}" — calling Ollama (${MODEL})...`);
        try {
          const signals = await callOllama(q);
          console.log(`[WO-503] Cast OK — ${signals.length} signals returned`);
          signals.forEach((s, i) =>
            console.log(`  [${i+1}] ${s.truth_statement?.slice(0, 70)}`)
          );
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(signals));
        } catch (err) {
          console.warn(`[WO-503] Ollama failed: ${err.message} — using seed ETR dataset`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(SEED_ETRS));
        }
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  // ── GET /api/teaser — live ETR truth statements for Layer 1 rotator ─────────
  if (req.method === 'GET' && req.url === '/api/teaser') {
    const items = SEED_ETRS.map(e => ({
      text:     e.truth_statement,
      score:    e.signal_score,
      category: e.title,
    })).sort(() => Math.random() - 0.5);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
    return;
  }

  // ── POST /api/signals/news — WO-1092: on-demand news ingestion ──────────────
  if (req.method === 'POST' && req.url === '/api/signals/news') {
    (async () => {
      try {
        const count = await fetchAndIngestNews();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ingested: count }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
    return;
  }

  // ── GET /api/signals — WO-738: returns 15 seed + 50 generated ETRs ──────────
  if (req.method === 'GET' && req.url === '/api/signals') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ALL_ETRS));
    return;
  }

  // ── POST /api/signals/frames — WO-1090: ABI frame transport ─────────────
  if (req.method === 'POST' && req.url === '/api/signals/frames') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const t0 = Date.now();
        const frame = signalsToFrame(ALL_ETRS);
        const frameBase64 = frame.toString('base64');
        const latencyMs = Date.now() - t0;
        const flowResult = flowCtrl.enqueue(frameBase64);
        appendFrameLog(frameBase64, 1, ALL_ETRS.length);
        console.log(`[WO-1090] Frame encoded: ${ALL_ETRS.length} events, ${frame.length}B, ${latencyMs}ms | flow=${flowResult.action} state=${flowResult.state}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ frame: frameBase64, frameSize: frame.length, eventCount: ALL_ETRS.length, latencyMs, flow: flowResult }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── GET /api/signals/stream — WO-1093: adaptive SSE frame stream ─────────
  if (req.method === 'GET' && req.url === '/api/signals/stream') {
    res.writeHead(200, {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write(`event: pressure\ndata: ${JSON.stringify(flowCtrl.pressure())}\n\n`);

    let timer = null;
    function scheduleNext() {
      timer = setTimeout(() => {
        // Drain 1 queued frame; if queue empty, auto-generate
        let entries = flowCtrl.drain(1);
        if (entries.length === 0) {
          const frame = signalsToFrame(ALL_ETRS);
          const b64   = frame.toString('base64');
          const result = flowCtrl.enqueue(b64);
          if (result.action !== 'drop') {
            appendFrameLog(b64, 1, ALL_ETRS.length);
            entries = flowCtrl.drain(1);
          }
        }

        if (entries.length > 0) {
          const { frame: b64, enqueuedAt } = entries[0];
          const p = flowCtrl.pressure();
          res.write(`data: ${JSON.stringify({ frame: b64, lagMs: Date.now() - enqueuedAt, pressure: p })}\n\n`);
        } else {
          res.write(`: heartbeat\n\n`);
        }

        if (!res.destroyed) scheduleNext();
      }, flowCtrl.intervalMs);
    }
    sseClients.add(res);
    scheduleNext();
    req.on('close', () => { clearTimeout(timer); sseClients.delete(res); });
    return;
  }

  // ── POST /api/signals/pressure — WO-1093: client backpressure signal ─────
  if (req.method === 'POST' && req.url === '/api/signals/pressure') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { level } = JSON.parse(body);
        flowCtrl.setClientPressure(level);
        const p = flowCtrl.pressure();
        console.log(`[WO-1093] pressure signal: ${level} → state=${p.state} interval=${p.intervalMs}ms`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, pressure: p }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── GET /api/signals/replay — WO-1091: replay stored frames ─────────────
  if (req.method === 'GET' && req.url?.startsWith('/api/signals/replay')) {
    try {
      const urlObj  = new URL(req.url, 'http://localhost:3001');
      const limit   = Math.min(parseInt(urlObj.searchParams.get('limit') ?? '50', 10), 500);
      const skip    = Math.max(0, parseInt(urlObj.searchParams.get('skip') ?? '0', 10));
      const lines   = fs.existsSync(FRAMES_LOG)
        ? fs.readFileSync(FRAMES_LOG, 'utf8').trim().split('\n').filter(Boolean)
        : [];
      const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const slice   = entries.slice(skip, skip + limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ frames: slice, total: entries.length, skip, limit }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── GET /api/gdelt — WO-895: GDELT proxy cache ───────────────────────────
  if (req.method === 'GET' && req.url?.startsWith('/api/gdelt')) {
    const urlObj = new URL(req.url, 'http://localhost:3001');
    const q      = urlObj.searchParams.get('q') ?? '';
    const now    = Date.now();
    const fresh  = gdeltCache.articles.length && gdeltCache.query === q && (now - gdeltCache.ts) < GDELT_TTL;
    if (fresh) {
      res.setHeader('X-Cache', 'HIT');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ articles: gdeltCache.articles }));
      return;
    }
    (async () => {
      try {
        const articles = await fetchGdeltRemote(q);
        gdeltCache.articles = articles;
        gdeltCache.ts    = now;
        gdeltCache.query = q;
        console.log(`[WO-895] GDELT cache refreshed — ${articles.length} articles for "${q || '(global)'}"`);
        res.setHeader('X-Cache', 'MISS');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ articles }));
      } catch (err) {
        console.warn(`[WO-895] GDELT fetch failed: ${err.message}`);
        if (gdeltCache.articles.length) {
          res.setHeader('X-Cache', 'STALE');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ articles: gdeltCache.articles }));
        } else {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, articles: [] }));
        }
      }
    })();
    return;
  }

  // ── POST /api/host — WO-1121/1122/1123: CHL + Omni-Payload + Conversation ────
  if (req.method === 'POST' && req.url === '/api/host') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { query, messages } = JSON.parse(body);
        if (!query || typeof query !== 'string' || !query.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'query required' })); return;
        }

        const normalized = normalizeQuery(query);
        const score      = computeMockScore(normalized);
        const roi        = computeMockROI();
        const uScore     = computeMockUScore();
        const coherence  = computeMockCoherence(normalized);
        const state      = resolveState(normalized.confidence, score, roi, uScore, coherence);
        const band       = STATE_BAND[state];

        // ── Conversation mode (messages array present) ──────────────────────────
        if (Array.isArray(messages)) {
          console.log(`[WO-1122] Conversation turn — query: "${query}", messages: ${messages.length}`);
          const prompt = CONVERSATION_PROMPT(query, messages);
          const fallback = messages.length === 0
            ? `What's your angle on this signal — investor, professional, or personal?`
            : `Can you tell me more about how this affects your situation?`;
          try {
            const ollamaRes = await fetch('http://localhost:11434/v1/chat/completions', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ model: CONV_MODEL, messages: [{ role: 'user', content: prompt }], stream: false }),
              signal:  AbortSignal.timeout(12000),
            });
            if (!ollamaRes.ok) throw new Error(`Ollama HTTP ${ollamaRes.status}`);
            const data  = await ollamaRes.json();
            const raw   = (data.choices?.[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
            const reply = applyConversationGuardrails(raw, fallback);
            console.log(`[WO-1122] Conversation reply: "${reply.slice(0, 80)}"`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ query, status: 'success', data: { host: { output: reply, band }, telemetry: { score, roi, u_score: uScore, coherence }, state } }));
          } catch (err) {
            console.warn(`[WO-1122] Ollama failed (conv): ${err.message}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ query, status: 'success', data: { host: { output: fallback, band }, telemetry: { score, roi, u_score: uScore, coherence }, state } }));
          }
          return;
        }

        // ── Analysis mode (no messages — legacy Omni-Payload) ──────────────────
        console.log(`[WO-1122] Analysis — "${query}" domain:${normalized.domain} conf:${normalized.confidence} → STATE ${state} (${band})`);
        if (state === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ query, status: 'success', data: { host: { output: 'INSUFFICIENT TELEMETRY', confidence: normalized.confidence, band }, telemetry: { score, roi, u_score: uScore, coherence }, state } }));
          return;
        }
        try {
          const ollamaRes = await fetch('http://localhost:11434/v1/chat/completions', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: HOST_PROMPT(query, normalized) }], stream: false }),
            signal:  AbortSignal.timeout(30000),
          });
          if (!ollamaRes.ok) throw new Error(`Ollama HTTP ${ollamaRes.status}`);
          const data   = await ollamaRes.json();
          const raw    = data.choices?.[0]?.message?.content ?? '';
          const result = applyGuardrails(raw, normalized);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ query, status: 'success', data: { host: { output: result.response, confidence: result.confidence, band }, telemetry: { score, roi, u_score: uScore, coherence }, state } }));
        } catch (err) {
          console.warn(`[WO-1122] Ollama failed (analysis): ${err.message}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ query, status: 'success', data: { host: { output: 'Signal confidence is insufficient for a reliable interpretation.', confidence: normalized.confidence, band }, telemetry: { score, roi, u_score: uScore, coherence }, state } }));
        }
      } catch {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // ── GET /api/stats/stream — Live stat card SSE ───────────────────────────
  if (req.method === 'GET' && req.url === '/api/stats/stream') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    const push = () => {
      try { res.write(`data: ${JSON.stringify(buildStatsPayload())}\n\n`); } catch { clearInterval(iv); }
    };
    push();
    const iv = setInterval(push, 5000);
    req.on('close', () => clearInterval(iv));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── WO-1092: Broadcast domain scores to all SSE clients ──────────────────────
function broadcastDomain(scores, headline) {
  const payload = JSON.stringify({ scores, headline, ts: Date.now() });
  const msg = `event: domain\ndata: ${payload}\n\n`;
  sseClients.forEach(client => { try { client.write(msg); } catch { sseClients.delete(client); } });
}

// ── WO-1092: Ollama domain scorer ────────────────────────────────────────────
async function scoreHeadline(headline) {
  const prompt = `Score this headline's impact on each business structural domain. Return only valid JSON, no explanation.

Domains:
- technology: AI, software, hardware, patents, R&D, innovation
- capital: funding, interest rates, equity, debt, investment, M&A
- knowledge: research, education, data, expertise, intellectual property
- labor: employment, wages, workforce, unions, hiring, layoffs
- media: press coverage, public sentiment, brand, narrative
- ownership: property, assets, land, commodities, physical infrastructure

Headline: "${headline.replace(/"/g, "'")}"

Return JSON only (float 0.0–1.0 per domain):
{"technology":0.0,"capital":0.0,"knowledge":0.0,"labor":0.0,"media":0.0,"ownership":0.0}`;

  try {
    const res = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONV_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data    = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const match   = content.match(/\{[^}]+\}/);
    const scores  = match ? JSON.parse(match[0]) : {};
    const out = {};
    CONE_DOMAINS.forEach(d => { out[d] = Math.min(1, Math.max(0, parseFloat(scores[d]) || 0)); });
    return out;
  } catch {
    // Ollama unavailable — return uniform low scores so FlowController still receives a signal
    const out = {};
    CONE_DOMAINS.forEach(d => { out[d] = 0.1; });
    return out;
  }
}

// ── WO-1092: NewsAPI → Ollama → FlowController pipeline ──────────────────────
async function fetchAndIngestNews() {
  if (!NEWS_API_KEY) { console.warn('[WO-1092] VITE_NEWS_API_KEY not set — skipping news ingest'); return 0; }
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${NEWS_API_KEY}`
    );
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const { articles } = await res.json();
    const fresh = (articles ?? []).filter(a => a.title && a.title !== '[Removed]');
    let ingested = 0;
    for (const article of fresh.slice(0, 10)) {
      const scores    = await scoreHeadline(article.title);
      const topDomain = CONE_DOMAINS.reduce((a, b) => scores[a] >= scores[b] ? a : b);
      const topScore  = scores[topDomain];
      if (topScore < 0.15) continue;
      broadcastDomain(scores, article.title);
      const signal = {
        id:               `NEWS-${Date.now()}-${ingested}`,
        source_type:      'live',
        title:            topDomain,
        truth_statement:  article.title,
        truth_supporting: article.description ?? article.title,
        definition:       article.title,
        origin:           article.source?.name ?? 'NewsAPI',
        usage:            'Live news signal scored via Ollama domain classifier',
        comments:         [],
        tags:             [topDomain, 'live', 'news'],
        signal_score:     topScore,
        signals: [], patterns: [], ground: {},
        fidelity_components: { m_checksum: topScore, t_telemetry: topScore, d_docs: 0.5, v_voice: 0.3, e_viral: 0.3 },
        domain_scores:    scores,
        cone_domain:      topDomain,
        publishedAt:      article.publishedAt,
      };
      ALL_ETRS.push(signal);
      const frame  = signalsToFrame([signal]);
      const b64    = frame.toString('base64');
      const result = flowCtrl.enqueue(b64);
      appendFrameLog(b64, 1, 1);
      console.log(`[WO-1092] ingested: "${article.title.slice(0, 60)}" → ${topDomain} (${topScore.toFixed(2)}) flow=${result.action}`);
      ingested++;
    }
    return ingested;
  } catch (err) {
    console.warn(`[WO-1092] news ingest failed: ${err.message}`);
    return 0;
  }
}

// WO-707: WebSocket upgrade on /signals
server.on('upgrade', (req, socket) => {
  if (req.url !== WS_PATH) { socket.destroy(); return; }
  wsHandshake(req, socket);
  wsClients.add(socket);
  // Send SIGNAL_SYNC immediately on connect
  try { socket.write(makeSyncEnvelope(signals)); } catch { wsClients.delete(socket); }
  socket.on('close', () => wsClients.delete(socket));
  socket.on('error', () => wsClients.delete(socket));
  console.log(`[WO-707] WS client connected — total: ${wsClients.size}`);
});

server.listen(3001, () => {
  console.log(`[WO-503] Mock Truth Engine — http://localhost:3001`);
  console.log(`[WO-503] Signal Cast active — model: ${MODEL}`);
  console.log(`[WO-707] SignalV1 WebSocket — ws://localhost:3001${WS_PATH}`);
  // WO-1092: start news ingestion loop
  if (NEWS_API_KEY) {
    fetchAndIngestNews();
    setInterval(fetchAndIngestNews, NEWS_INGEST_MS);
    console.log(`[WO-1092] News ingestion active — interval: ${NEWS_INGEST_MS / 1000}s`);
  } else {
    console.warn('[WO-1092] News ingestion disabled — VITE_NEWS_API_KEY not set');
  }
});
