// Exact legal-name key (KRYL-1416, ratified narrowly 2026-10-13): case, punctuation, "&"/"and" and the spelled-out versus
// abbreviated spelling of the SAME legal form (Corp/Corporation, Inc/Incorporated, Co/Company, Ltd/Limited) are ignored.
// A different legal form is a different entity and keeps a different key: "Broadcom Inc." is not "Broadcom Corporation",
// "Boston Scientific Corporation" is not "Boston Scientific Limited". No suffix is dropped.
const FORM = { corp: 'corporation', inc: 'incorporated', co: 'company', ltd: 'limited', llc: 'llc', lp: 'lp', plc: 'plc' };
export function legalNameKey(name) {
  const words = String(name ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.map(w => FORM[w] ?? w).join(' ');
}
