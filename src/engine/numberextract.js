// numberextract.js — deterministic currency/quantity extraction from free text.
// Moved out of querysynthesis.js (KRYL-1221) so intake-layer consumers can use it
// without pulling the full synthesis module. Behaviour is unchanged; guarded by
// qa_extractnumbers.mjs.

export function extractNumbers(text) {
  // Strip age-context numbers before extraction — "81 year old" must not become $81
  let cleaned = (text ?? '').replace(/\b\d+\s*-?\s*years?\s*-?\s*old\b/gi, '');
  // Strip duration/rate suffixes before extraction — "18mo"/"18-month" must not become $18M
  // (bare "m" in "mo" was matching the existing k/m currency-suffix check), "200bp" must not become $200
  cleaned = cleaned.replace(/\b\d+\s*-?\s*(?:mo(?:nths?)?|wks?|weeks?|yrs?|years?|days?|bps?)\b/gi, '');
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*%/g, '');
  // Strip digits fused to a letter label — "P4" (deliverable format), "Q3" — these are not currency
  cleaned = cleaned.replace(/\b[A-Z]\d+\b/g, '');
  // Magnitude scale — attached ("2.5M") or spelled/spaced ("$2.5 million", "750 K").
  // The month/week/etc. suffixes were already stripped above so "mo"/"m" cannot leak in.
  // Single-letter b/t are NOT accepted (too collision-prone with ordinary words);
  // "bn"/"tn" and the spelled forms are.
  const raw = cleaned.match(/\$?\d[\d,]*(?:\.\d+)?(?:\s*(?:thousand|million|billion|trillion|bn|tn|[km]))?\b/gi) ?? [];
  return raw.map(seg => {
    const s = seg.toLowerCase().replace(/[$,\s]/g, '');   // "2.5million" | "2.5m" | "750k" | "500"
    const n = parseFloat(s);
    if (/(?:thousand|k)$/.test(s))    return n * 1e3;
    if (/(?:million|m)$/.test(s))     return n * 1e6;
    if (/(?:billion|bn)$/.test(s))    return n * 1e9;
    if (/(?:trillion|tn)$/.test(s))   return n * 1e12;
    return n;
  }).filter(n => !isNaN(n) && n > 0);
}
