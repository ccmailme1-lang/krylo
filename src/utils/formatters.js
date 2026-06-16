// WO-1701 — Display Entity Extraction
// Engine retains the full raw query for inference.
// DOM receives only the truncated display label.

export function getDisplayEntity(rawQuery, limit = 60) {
  if (!rawQuery) return 'NO SIGNAL DETECTED';
  const trimmed = rawQuery.trim();
  if (trimmed.length <= limit) return trimmed;
  const cut       = trimmed.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const safeCut   = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut.trimEnd()}...`;
}
