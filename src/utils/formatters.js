// WO-1701 — Display Entity Extraction
// Engine retains the full raw query for inference.
// DOM receives only the truncated display label.

export function getDisplayEntity(rawQuery, limit = 60) {
  if (!rawQuery) return 'NO SIGNAL DETECTED';
  const trimmed = rawQuery.trim();
  return trimmed.length > limit ? `${trimmed.substring(0, limit).trimEnd()}...` : trimmed;
}
