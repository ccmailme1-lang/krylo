// issuerpage.js (connector) -- KRYL-1419. Asks the engine to read the company's OWN curated pages (as-diff/issuerpage.js) and returns what they state.
export async function fetchIssuerPage({ entity, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null) }) {
  if (!fetchImpl || !entity?.canonicalId) return { failed: 'no lookup available' };
  try {
    const r = await fetchImpl('/api/issuer-page?' + new URLSearchParams({ id: entity.canonicalId }));
    if (!r.ok) return { failed: `HTTP ${r.status}` };
    const j = await r.json();
    return j.error ? { failed: j.error } : j;
  } catch (e) { return { failed: String(e?.message ?? e).slice(0, 80) }; }
}
