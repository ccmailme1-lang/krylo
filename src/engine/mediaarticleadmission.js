// mediaarticleadmission.js -- KRYL-1418 (Founder ratified 2026-10-13: a MEDIA relationship only when a dated article explicitly names the company; cited; labelled "named in article").
// The articles are those GDELT returns for the exact phrase of the company's SEC registered name (connectors/gdeltmediaobservation.js). Only an article whose TITLE contains that phrase is admitted
// as a relationship; an article that matched only in its text stays an observation. The relationship says the article names the company and nothing else: no endorsement, causation, event
// participation, sentiment or other connection is inferred. The company is the entity already resolved by its SEC CIK; the article node is the article id.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId, NODE_LABELS } from './entitytopologyregistry.js';
import { articleHash, seenDay, MAX_ARTICLES } from './connectors/gdeltmediaobservation.js';
import './ratifiedrelationshiptypes.js';

const key = (t) => ` ${String(t ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
export const titleNames = (title, phrase) => !!phrase && key(title).includes(key(phrase));
export const articleNodeId = (url) => `ARTICLE:${articleHash(url)}`;

export function buildArticleAssertion({ entity, article, phrase, retrievedAt, timespan }) {
  const id = articleHash(article.url), node = `ARTICLE:${id}`, day = seenDay(article.seenDate);
  return {
    node, label: `${String(article.title).length > 90 ? String(article.title).slice(0, 87) + '…' : article.title} (${article.domain ?? 'domain not stated'}, ${day})`,
    assertion: {
      part: [nodeId(entity.cik, entity.name), node], type: 'NAMED_IN_ARTICLE', nuId: {}, nuState: {},
      evidence: {
        ts: Date.parse(day) || Date.now(),
        provenance: { source: 'GDELT', phraseSource: 'SEC_REGISTERED_NAME', phrase, url: article.url, title: article.title, domain: article.domain ?? null, seenDate: day, articleId: id,
          retrievedAt: retrievedAt ?? null, timespan: timespan ?? null, accession: article.url, filingDate: day, form: 'GDELT article' },
      },
    },
  };
}

/** @returns {{ admitted: object[], rejected: object[] }} the newest MAX_ARTICLES articles whose title names the company */
export function admitMediaArticles({ entity, result }) {
  const admitted = [], rejected = [];
  const named = (result?.articles ?? []).filter(a => a.url && a.title && seenDay(a.seenDate) && titleNames(a.title, result.phrase)).slice(0, MAX_ARTICLES);
  for (const article of named) {
    const b = buildArticleAssertion({ entity, article, phrase: result.phrase, retrievedAt: result.retrievedAt, timespan: result.timespan });
    NODE_LABELS[b.node] = b.label;
    const res = admitAndProject(b.assertion, { companyName: entity.name, companyCik: entity.cik, articleLabel: b.label, source: 'GDELT' });
    if (res.admitted) admitted.push({ url: article.url, predicate: res.predicate, relationship: res.relationship }); else rejected.push({ url: article.url, reason: res.reason });
  }
  return { admitted, rejected, namedInTitle: named.length, returned: (result?.articles ?? []).length };
}
