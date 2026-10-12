// edgar8kacquisition.js -- KRYL-1409. Acquisition candidates quoted from a Form 8-K: Item 1.01 (a definitive merger or purchase agreement, deal status
// PENDING) and Item 2.01 (completion of an acquisition, deal status CLOSED). Pure: it reads the Item text of a filing (edgar8kcontent.js itemBodies) and
// returns, for each acquisition the text states, the OTHER principal's name, which side the filer is on, the deal status and the passage. Nothing is admitted here:
// the other principal still has to be matched to an identified entity (counterpartymatch.js) and pass the ratified ACQUIRED admission rule.
//
// What counts as an acquisition (all conservative; a filing that does not state it plainly yields no candidate, with the reason):
//   Item 1.01 -- the opening of the Item names a merger / plan-of-reorganization / stock, share, asset or equity purchase / business combination / transaction
//     agreement AND the text says who acquires whom: a "Merger Sub" (or a similar subsidiary) that is "a subsidiary of" one principal makes that principal the
//     acquirer; or the filer is the subject of "acquire" / "acquisition of <named entity>". Credit, indemnification, warrant, securities-purchase, underwriting
//     and settlement agreements state no acquisition and yield none.
//   Item 2.01 -- the filer "completed (its|the) acquisition of <named entity>" or completed the merger the agreement describes. A completion in which the filer
//     is the SELLER (sale, divestiture, disposition) or the object is assets or a facility rather than a named entity yields none.
// Direction: the acquirer is the party whose subsidiary is the Merger Sub, or the filer when the filer is the subject of the acquisition verb. If neither can
// be established the candidate is skipped as AMBIGUOUS_DIRECTION: never guessed.
// Subsidiaries of a principal (Merger Sub, Holdco, Newco) are never principals.
import { extractCounterparties } from './edgar8kcontent.js';

const AGREEMENT = /\b(?:Agreement\s+and\s+Plan\s+of\s+(?:Merger|Reorganization)|Plan\s+of\s+Merger|Merger\s+Agreement|(?:Stock|Share|Equity|Unit|Asset|Membership\s+Interest)\s+Purchase\s+Agreement|Business\s+Combination\s+Agreement|Transaction\s+Agreement|Tender\s+Offer\s+Agreement)\b/i;
const NOT_ACQUISITION = /\b(?:Credit\s+Agreement|Indemnification\s+Agreement|Warrant|Securities\s+Purchase\s+Agreement|Underwriting\s+Agreement|Equity\s+Distribution\s+Agreement|Non-Prosecution|Deferred\s+Prosecution|Settlement\s+Agreement)\b/i;
const SUBSIDIARY_OF = /^[^.;]{0,160}?\bsubsidiary\s+of\s+([^.;]{0,90})/i;
const SUB_NAME = /\b(?:Merger\s+Sub|Merger\s+Subsidiary|Holdco|Newco|Acquisition\s+(?:Corp|Sub))\b/i;
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const passage = (text, start, end, pad = 120) => { let a = Math.max(0, start - pad), b = Math.min(text.length, end + pad); if (a > 0) { const sp = text.indexOf(' ', a); if (sp >= 0 && sp < start) a = sp + 1; } if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > end) b = sp; } return text.slice(a, b).trim(); };

/** The ways the filer is referred to in the Item text: its first name word, defined terms ("Verizon", "Company") and the generic references. */
export function filerAliases(body, registrant) {
  const reg = norm(registrant).split(' ').filter(w => !/^(inc|corp|corporation|co|company|ltd|plc|the)$/.test(w));
  const aliases = new Set(['company', 'registrant']);
  if (reg[0]) aliases.add(reg[0]);
  const full = norm(registrant);
  const rx = /\(\s*(?:the\s+)?[“"”']\s*([A-Z][A-Za-z0-9&.\- ]{1,30}?)\s*[“"”']\s*\)/g; let m;
  while ((m = rx.exec(body))) {
    // a defined term that directly follows the filer's own name
    const before = norm(body.slice(Math.max(0, m.index - 70), m.index));
    if (reg[0] && before.includes(reg[0])) aliases.add(norm(m[1]));
  }
  if (full) aliases.add(full);
  return aliases;
}

const isFiler = (name, aliases) => { const n = norm(name); return !!n && (aliases.has(n) || [...aliases].some(a => a.length > 3 && n.startsWith(a + ' '))); };

// Principals are the named entities the filing introduces with its own legal description ("Frontier Communications Parent, Inc., a Delaware
// corporation"): the name is read backwards from that description over name-like words, so "Warner Bros. Discovery, Inc." stays whole.
const ENTITY_KIND = /^,?\s*(?:a|an)\s+(?:newly\s+formed\s+)?(?:(?:[A-Z][A-Za-z]+|[a-z]+)\s+){0,3}?(?:corporation|limited\s+liability\s+company|limited\s+partnership|public\s+limited\s+company|company|partnership)\b/;
const NAME_SUFFIX = /^(?:Inc\.?|Corp\.?|Corporation|LLC|L\.L\.C\.|Ltd\.?|Limited|plc|PLC|L\.P\.|LP|Company|Co\.?|N\.V\.|S\.A\.|AG|SE)$/;
const NAME_WORD = /^(?:[A-Z][A-Za-z0-9&.'’\-]*|&|of)$/;
function principals(body, registrant, aliases) {
  const out = [];
  const words = []; const rx = /\S+/g; let w;
  while ((w = rx.exec(body))) words.push({ raw: w[0], start: w.index, end: w.index + w[0].length });
  for (let i = 0; i < words.length; i++) {
    const tail = body.slice(words[i].end);
    const raw = words[i].raw.replace(/[,;]+$/, '');
    if (!NAME_SUFFIX.test(raw)) continue;
    const described = ENTITY_KIND.test(tail.slice(0, 140)) || ENTITY_KIND.test(' ' + tail.slice(0, 140)) || /^\s*\(\s*(?:the\s+)?[“"”]/.test(tail);   // "Name, a Delaware corporation" or "Name (\"Short\")"
    if (!described) continue;
    // walk back over name-like words (a comma is allowed only directly before the suffix)
    let j = i;
    while (j - 1 >= 0) {
      const prev = words[j - 1].raw; const pc = prev.replace(/[,;]+$/, '');
      const commaBefore = /,$/.test(prev);
      if (!NAME_WORD.test(pc.replace(/^[("“]+/, ''))) break;
      if (commaBefore && j !== i) break;                                   // a comma inside the run ends it (unless it sits right before the suffix)
      if (/^(?:On|In|By|And|Among|Between|With|The|Agreement|Plan|Item|Section|Company|Registrant)$/.test(pc) && !(j - 1 === 0)) { if (pc !== 'The') break; }
      j--;
      if (/[;:]$/.test(prev) || (/\.$/.test(prev) && !NAME_SUFFIX.test(pc) && !/^(?:Bros|Inc|Corp|Co|Ltd|St|Mr|Dr|Jr|Sr|U\.S|N\.A|L\.P)\.$/.test(prev))) { j++; break; }
    }
    let startIdx = j; while (startIdx < i && /^(?:On|In|By|And|Among|Between|With|The|Agreement|Plan|Item|Section|and|by|with)$/.test(words[startIdx].raw.replace(/[,;]+$/, ''))) startIdx++;
    const name = body.slice(words[startIdx].start, words[i].end).replace(/[\s,;]+$/, '').replace(/\s+/g, ' ');
    if (name.split(' ').length < 2 && !/^[A-Z][A-Za-z]+,?\s/.test(name)) continue;
    const after = body.slice(words[i].end, words[i].end + 300).split(/\(\s*(?:the\s+)?[“"”]/)[0];   // the clause describing THIS entity ends at its defined term
    const sub = after.match(SUBSIDIARY_OF);
    out.push({ name, start: words[startIdx].start, end: words[i].end, isSub: !!sub || SUB_NAME.test(name), parent: sub ? sub[1].trim() : null, filer: isFiler(name, aliases) });
  }
  const seen = new Set(); return out.filter(p => { const k = norm(p.name); if (seen.has(k)) return false; seen.add(k); return true; });
}

function direction(body, registrant, aliases, list) {
  // a subsidiary of the filer means the filer is the acquirer; a subsidiary of another principal means that principal is
  let filerIsAcquirer = null, other = null;
  for (const p of list.filter(x => x.isSub)) {
    const parent = p.parent ? norm(p.parent) : '';
    const ofFiler = [...aliases].some(a => parent === a || parent.startsWith(a + ' ') || parent.startsWith('the ' + a));
    if (ofFiler && /merger\s+sub|acquisition\s+(corp|sub)|merger\s+subsidiary/i.test(p.name + ' ' + body.slice(p.start, p.end + 80))) { filerIsAcquirer = true; }
  }
  const principalsOther = list.filter(x => !x.isSub && !x.filer);
  if (filerIsAcquirer === true) { other = principalsOther.length === 1 ? principalsOther[0] : null; return { filerIsAcquirer: true, other, reason: other ? null : 'AMBIGUOUS_COUNTERPARTY' }; }
  // a Merger Sub whose parent is another principal: the filer is the target
  for (const p of list.filter(x => x.isSub)) {
    const parent = p.parent ? norm(p.parent) : '';
    const parentPrincipal = principalsOther.find(o => parent.startsWith(norm(o.name).split(' ')[0]) && norm(o.name).split(' ')[0].length > 2);
    if (parentPrincipal && /merger\s+sub|acquisition\s+(corp|sub)/i.test(p.name)) return { filerIsAcquirer: false, other: parentPrincipal, reason: null };
  }
  // the filer as the subject of an acquisition verb with a named object
  const verb = /\b(?:to\s+acquire|will\s+acquire|has\s+agreed\s+to\s+acquire|agreed\s+to\s+acquire|acquisition\s+of|acquire[sd]?|completed\s+(?:its|the)\s+acquisition\s+of)\s+(?:all\s+of\s+the\s+(?:issued\s+and\s+outstanding\s+)?(?:shares|equity|capital\s+stock)\s+of\s+)?([A-Z][^,.;()]{2,80})/;
  const vm = body.match(verb);
  if (vm) {
    const obj = principalsOther.find(o => vm[1].startsWith(o.name.split(' ')[0]));
    if (obj) return { filerIsAcquirer: true, other: obj, reason: null };
  }
  return { filerIsAcquirer: null, other: null, reason: 'AMBIGUOUS_DIRECTION' };
}

/**
 * @param {{ bodies:Record<string,string>, registrant:string, accession:string }} p  bodies: Item text by item number (edgar8kcontent.js itemBodies)
 * @returns {{ candidates:object[], skipped:object[] }}
 */
export function extractAcquisitions({ bodies, registrant, accession }) {
  const candidates = [], skipped = [];
  for (const item of ['1.01', '2.01']) {
    const body = bodies?.[item]; if (!body) continue;
    const head = body.slice(0, 900);
    const aliases = filerAliases(body, registrant);
    if (item === '1.01') {
      if (!AGREEMENT.test(head) || (NOT_ACQUISITION.test(head.slice(0, 300)) && !/merger|acquir/i.test(head))) { skipped.push({ item, reason: 'NO_ACQUISITION_AGREEMENT' }); continue; }
    } else {
      const completes = /\bcompleted\s+(?:its|the|their)\s+(?:previously\s+announced\s+)?(?:acquisition|merger)\b|\bconsummated\s+(?:its|the)\s+(?:acquisition|merger)\b|\bthe\s+Merger\s+was\s+(?:completed|consummated)\b|\bcompleted\s+(?:its|the)\s+(?:acquisition\s+of|merger\s+with)\b/i.test(body);
      const filerSells = /\b(?:Sellers?|completed\s+the\s+sale|sale\s+of|sold|divest\w+|dispos\w+)\b/i.test(head) && !/\bcompleted\s+(?:its|the)\s+acquisition\s+of\s+[A-Z]/.test(body);
      if (!completes || filerSells) { skipped.push({ item, reason: filerSells ? 'DISPOSITION' : 'NO_COMPLETED_ACQUISITION' }); continue; }
    }
    const list = principals(body, registrant, aliases);
    const dir = direction(body, registrant, aliases, list);
    if (!dir.other || dir.filerIsAcquirer == null) { skipped.push({ item, reason: dir.reason ?? 'AMBIGUOUS_DIRECTION' }); continue; }
    // the passage that states the acquisition: the agreement sentence (1.01) or the completion sentence (2.01)
    const key = item === '1.01' ? (body.search(AGREEMENT)) : body.search(/completed\s+(?:its|the)|consummated|Merger\s+was/i);
    const pStart = Math.max(0, key), pEnd = Math.min(body.length, Math.max(dir.other.end, pStart + 40));
    const agreement = (head.match(AGREEMENT) ?? [])[0] ?? null;
    candidates.push({
      item, accession, dealStatus: item === '1.01' ? 'PENDING' : 'CLOSED', filerRole: dir.filerIsAcquirer ? 'ACQUIRER' : 'TARGET',
      otherParty: { name: dir.other.name, passage: passage(body, Math.min(pStart, dir.other.start), Math.max(pEnd, dir.other.end)) },
      agreement: agreement ? agreement.replace(/\s+/g, ' ') : null,
    });
  }
  return { candidates, skipped };
}
