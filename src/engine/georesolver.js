// WO-1844 — Geographic Disambiguation Resolver
// Detects ambiguous location tokens before synthesis runs.
// Blocking constraint only — never infers, never assumes a default.
// Phase A: static lookup table. Returns candidates for human resolution.

const STATE_ABBREVS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

// Full state names for prose detection ("Pennsylvania" not just "PA")
const STATE_NAME_TO_ABBREV = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR',
  'california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE',
  'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID',
  'illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS',
  'kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
  'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS',
  'missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK',
  'oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
  'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT',
  'vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV',
  'wisconsin':'WI','wyoming':'WY','district of columbia':'DC',
};

// Same name, multiple states, materially different markets.
// Each entry: lowercase token → array of resolved candidate strings.
const AMBIGUITY_TABLE = {
  'long island':    ['Long Island, NY', 'Long Island, MS'],
  'philadelphia':   ['Philadelphia, PA', 'Philadelphia, MS', 'Philadelphia, TN'],
  'portland':       ['Portland, OR', 'Portland, ME'],
  'springfield':    ['Springfield, IL', 'Springfield, MO', 'Springfield, MA', 'Springfield, OH', 'Springfield, OR'],
  'franklin':       ['Franklin, TN', 'Franklin, MA', 'Franklin, VA', 'Franklin, OH', 'Franklin, KY'],
  'madison':        ['Madison, WI', 'Madison, AL', 'Madison, MS', 'Madison, TN'],
  'columbus':       ['Columbus, OH', 'Columbus, GA', 'Columbus, MS', 'Columbus, IN'],
  'columbia':       ['Columbia, SC', 'Columbia, MO', 'Columbia, MD', 'Columbia, TN'],
  'charleston':     ['Charleston, SC', 'Charleston, WV'],
  'richmond':       ['Richmond, VA', 'Richmond, CA', 'Richmond, KY', 'Richmond, IN'],
  'greenville':     ['Greenville, SC', 'Greenville, MS', 'Greenville, NC', 'Greenville, TX'],
  'jackson':        ['Jackson, MS', 'Jackson, TN', 'Jackson, MI', 'Jackson, WY'],
  'florence':       ['Florence, AL', 'Florence, SC', 'Florence, KY', 'Florence, OR'],
  'lexington':      ['Lexington, KY', 'Lexington, VA', 'Lexington, SC', 'Lexington, MA'],
  'manchester':     ['Manchester, NH', 'Manchester, TN', 'Manchester, CT'],
  'newport':        ['Newport, RI', 'Newport, KY', 'Newport, OR', 'Newport, TN'],
  'burlington':     ['Burlington, VT', 'Burlington, NC', 'Burlington, IA', 'Burlington, NJ'],
  'concord':        ['Concord, NH', 'Concord, NC', 'Concord, CA', 'Concord, MA'],
  'fairfield':      ['Fairfield, CT', 'Fairfield, CA', 'Fairfield, OH', 'Fairfield, IA'],
  'dayton':         ['Dayton, OH', 'Dayton, TN', 'Dayton, NV'],
  'oxford':         ['Oxford, MS', 'Oxford, OH', 'Oxford, AL', 'Oxford, MA'],
  'auburn':         ['Auburn, AL', 'Auburn, NY', 'Auburn, WA', 'Auburn, CA'],
  'henderson':      ['Henderson, NV', 'Henderson, KY', 'Henderson, NC', 'Henderson, TX'],
  'clinton':        ['Clinton, MS', 'Clinton, IA', 'Clinton, MA', 'Clinton, TN'],
  'marion':         ['Marion, OH', 'Marion, IN', 'Marion, IL', 'Marion, IA', 'Marion, SC'],
  'bristol':        ['Bristol, TN', 'Bristol, VA', 'Bristol, CT', 'Bristol, PA'],
  'georgetown':     ['Georgetown, SC', 'Georgetown, KY', 'Georgetown, TX', 'Georgetown, DC'],
  'washington':     ['Washington, DC', 'Washington, PA', 'Washington, NC', 'Washington, MO'],
  'albany':         ['Albany, NY', 'Albany, GA', 'Albany, OR'],
  'athens':         ['Athens, GA', 'Athens, OH', 'Athens, TX', 'Athens, TN', 'Athens, AL'],
  'cambridge':      ['Cambridge, MA', 'Cambridge, OH', 'Cambridge, MD'],
  'canton':         ['Canton, OH', 'Canton, MS', 'Canton, GA'],
  'hamilton':       ['Hamilton, OH', 'Hamilton, NJ', 'Hamilton, MT'],
  'independence':   ['Independence, MO', 'Independence, OH', 'Independence, KS'],
  'lakewood':       ['Lakewood, CO', 'Lakewood, CA', 'Lakewood, OH', 'Lakewood, NJ'],
  'lancaster':      ['Lancaster, PA', 'Lancaster, CA', 'Lancaster, OH', 'Lancaster, TX'],
  'lincoln':        ['Lincoln, NE', 'Lincoln, CA', 'Lincoln, IL', 'Lincoln, AL'],
  'montgomery':     ['Montgomery, AL', 'Montgomery, OH', 'Montgomery, NY'],
  'ontario':        ['Ontario, CA', 'Ontario, OH', 'Ontario, OR'],
  'wilmington':     ['Wilmington, DE', 'Wilmington, NC', 'Wilmington, OH'],
  'marion':         ['Marion, OH', 'Marion, IN', 'Marion, IL', 'Marion, IA'],
};

// Extract a state qualifier already present in the query.
// Returns 2-letter state abbreviation if found, null otherwise.
function extractStateQualifier(query) {
  const q = query.toLowerCase();

  // Check full state names first (longest match wins)
  const sortedNames = Object.keys(STATE_NAME_TO_ABBREV).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    if (q.includes(name)) return STATE_NAME_TO_ABBREV[name];
  }

  // Check ", XX" abbreviation pattern (comma + space + 2-letter code)
  const abbrevMatch = query.match(/,\s*([A-Z]{2})\b/);
  if (abbrevMatch && STATE_ABBREVS.has(abbrevMatch[1])) return abbrevMatch[1];

  // Check isolated 2-letter uppercase code (word boundary, not inside a word)
  const isolatedMatch = query.match(/\b([A-Z]{2})\b/);
  if (isolatedMatch && STATE_ABBREVS.has(isolatedMatch[1])) return isolatedMatch[1];

  return null;
}

// resolveGeo — main export.
// Returns:
//   { geoAmbiguous: false, candidates: [], resolvedLocation: null, locationToken: null }
//   { geoAmbiguous: false, candidates, resolvedLocation: 'City, ST', locationToken }
//   { geoAmbiguous: true,  candidates, resolvedLocation: null, locationToken }
export function resolveGeo(query) {
  const q = (query ?? '').toLowerCase().trim();

  // Sort keys by length descending so multi-word names match before substrings
  const keys = Object.keys(AMBIGUITY_TABLE).sort((a, b) => b.length - a.length);

  let locationToken = null;
  let candidates    = null;

  for (const key of keys) {
    if (q.includes(key)) {
      locationToken = key;
      candidates    = AMBIGUITY_TABLE[key];
      break;
    }
  }

  // No ambiguous token — pass through
  if (!locationToken) {
    return { geoAmbiguous: false, candidates: [], resolvedLocation: null, locationToken: null };
  }

  // State qualifier already present in query?
  const stateAbbrev = extractStateQualifier(query);
  if (stateAbbrev) {
    const resolved = candidates.find(c => c.endsWith(`, ${stateAbbrev}`));
    if (resolved) {
      return { geoAmbiguous: false, candidates, resolvedLocation: resolved, locationToken };
    }
  }

  // Ambiguous — block and surface candidates
  return { geoAmbiguous: true, candidates, resolvedLocation: null, locationToken };
}
