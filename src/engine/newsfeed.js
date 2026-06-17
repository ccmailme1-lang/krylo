// src/engine/newsfeed.js
import { assignCategory }   from '../data/physicsConstants';
import { computeIntegrity } from './integrityStack';
// WO-255 — News API integration: fetch, sentiment, Fs mapping
// Steps 2, 3, 4: headline fetch + parse → ETR format

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY ?? '';
const KSI_QUERY   = 'business OR market OR technology OR career OR financial OR economy OR labor OR trade OR investment OR startup';
const NEWS_URL     = `https://newsapi.org/v2/top-headlines?country=us&pageSize=40&q=${encodeURIComponent(KSI_QUERY)}&apiKey=${NEWS_API_KEY}`;

const NOISE_CATS = new Set(['CAT-04', 'CAT-05']);
const MIN_FS     = 0.40;

export function filterHeadlines(etrs) {
  return etrs.filter(e => !NOISE_CATS.has(e.category_id) && (e.fs ?? 0) >= MIN_FS);
}

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

  const base = {
    id,
    title,
    imageUrl:             article.urlToImage ?? null,
    truth_statement:      title,
    source_type:          'news',
    source:               article.source?.name ?? 'unknown',
    timestamp:            article.publishedAt ?? new Date().toISOString(),
    born_at:              article.publishedAt ? article.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    ingested_at:          new Date().toISOString(),
    sentiment,
    fs,
    signal_score:         fs,
    category_id:          assignCategory(title),
    synthetic_risk_score: null,
    fidelity_components: {
      m_checksum:  fs,
      t_telemetry: Math.min(1, fs + 0.05),
      d_docs:      0,
      v_voice:     0,
      e_viral:     Math.random() * 0.1,
    },
  };
  const { trust_delta, keccak_hash, badges, geographic_affinity, geoTier, geoSignals, isNational, geoSpeedMod } = computeIntegrity(base);
  return { ...base, trust_delta, keccak_hash, integrity_badges: badges, geographic_affinity, geoTier, geoSignals, is_national: isNational, isNational, geoSpeedMod };
}

// ── Fetch Headlines ───────────────────────────────────────────────────────────
export async function fetchHeadlines() {
  if (!NEWS_API_KEY) throw new Error('VITE_NEWS_API_KEY not set');
  const res = await fetch(NEWS_URL);
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`NewsAPI error: ${json.message ?? json.status}`);
  const articles = json.articles ?? [];
  return filterHeadlines(articles.map((a, i) => parseHeadline(a, i)));
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
