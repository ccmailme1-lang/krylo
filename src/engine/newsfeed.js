// src/engine/newsfeed.js
// WO-255 — News API integration: fetch, sentiment, Fs mapping
// Steps 2, 3, 4: headline fetch + parse → ETR format

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY ?? '';
const NEWS_URL     = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${NEWS_API_KEY}`;

// ── Sentiment Keywords ────────────────────────────────────────────────────────
const POSITIVE_KW = [
  'success', 'win', 'wins', 'won', 'growth', 'breakthrough', 'recovery',
  'record', 'rise', 'rises', 'rally', 'boost', 'gain', 'gains', 'surge',
  'advance', 'improve', 'improved', 'improvement', 'profit', 'profits',
  'approve', 'approved', 'launch', 'milestone', 'agreement', 'deal',
  'peace', 'rescue', 'survive', 'survived', 'cure', 'discovery',
];

const NEGATIVE_KW = [
  'crash', 'crashes', 'fail', 'fails', 'failed', 'failure', 'crisis',
  'death', 'deaths', 'dead', 'die', 'dies', 'died', 'killed', 'murder',
  'attack', 'attacks', 'shooting', 'explosion', 'collapse', 'collapses',
  'fraud', 'scandal', 'loss', 'loses', 'lost', 'drop', 'drops', 'slump',
  'warn', 'warning', 'threat', 'threats', 'arrest', 'arrested',
  'lawsuit', 'fine', 'fined', 'ban', 'banned', 'recall', 'recalled',
  'disaster', 'catastrophe', 'emergency', 'outage', 'breach', 'leak',
];

// ── Sentiment Scorer ──────────────────────────────────────────────────────────
export function scoreSentiment(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  const words = lower.match(/\b\w+\b/g) ?? [];
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (POSITIVE_KW.includes(w)) pos++;
    if (NEGATIVE_KW.includes(w)) neg++;
  }
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

// ── Fs Mapping ────────────────────────────────────────────────────────────────
export function fsFromSentiment(sentiment) {
  switch (sentiment) {
    case 'positive': return parseFloat((0.70 + Math.random() * 0.25).toFixed(4)); // 0.70–0.95
    case 'negative': return parseFloat((0.15 + Math.random() * 0.25).toFixed(4)); // 0.15–0.40
    default:         return parseFloat((0.40 + Math.random() * 0.20).toFixed(4)); // 0.40–0.60
  }
}

// ── Headline → ETR ────────────────────────────────────────────────────────────
export function parseHeadline(article, index) {
  const title     = article.title ?? article.description ?? `HEADLINE-${index}`;
  const sentiment = scoreSentiment(title);
  const fs        = fsFromSentiment(sentiment);
  const id        = `NEWS-${Date.now()}-${index}`;

  return {
    id,
    title,
    truth_statement: title,
    source_type:     'news',
    source:          article.source?.name ?? 'unknown',
    timestamp:       article.publishedAt ?? new Date().toISOString(),
    ingested_at:     new Date().toISOString(),
    sentiment,
    fs,
    signal_score:    fs,
    fidelity_components: {
      m_checksum:  fs,
      t_telemetry: Math.min(1, fs + 0.05),
      d_docs:      0,
      v_voice:     0,
      e_viral:     Math.random() * 0.1,
    },
  };
}

// ── Fetch Headlines ───────────────────────────────────────────────────────────
export async function fetchHeadlines() {
  if (!NEWS_API_KEY) throw new Error('VITE_NEWS_API_KEY not set');
  const res = await fetch(NEWS_URL);
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`NewsAPI error: ${json.message ?? json.status}`);
  const articles = json.articles ?? [];
  return articles.map((a, i) => parseHeadline(a, i));
}

// ── Ingest Bridge — WO-255 Step 5 ────────────────────────────────────────────
// POST each ETR record to /api/ingest (KRYL-300). Fire-and-forget — silent on error.
async function ingestRecord(etr) {
  try {
    await fetch('/api/ingest', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify(etr),
    });
  } catch { /* silent */ }
}

export async function ingestHeadlines(etrs) {
  await Promise.allSettled(etrs.map(ingestRecord));
}
