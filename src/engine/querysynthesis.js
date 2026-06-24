// querysynthesis.js — Dynamic content synthesis from session query + lens
// Reads session, detects domain, returns full content object for all result components

import { computeBEV }   from './brandequity.js';
import { processTick }  from './ewmaGate.js';
import { resolveMCV }   from './mcvresolver.js';

const LIME   = '#66FF00';
const BLUE   = '#007FFF';
const DIM    = 'rgba(255,255,255,0.25)';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Boundaries mirror the LOW(<1.0×)/MOD(≈1.0×)/HIGH(>1.0×) axis in leveragefield.jsx
function classifyLeverageTier(deRatio) {
  if (deRatio < 0.9) return 'LOW';
  if (deRatio > 1.1) return 'HIGH';
  return 'MOD';
}

function extractNumbers(text) {
  // Strip age-context numbers before extraction — "81 year old" must not become $81
  let cleaned = (text ?? '').replace(/\b\d+\s*-?\s*years?\s*-?\s*old\b/gi, '');
  // Strip duration/rate suffixes before extraction — "18mo"/"18-month" must not become $18M
  // (bare "m" in "mo" was matching the existing k/m currency-suffix check), "200bp" must not become $200
  cleaned = cleaned.replace(/\b\d+\s*-?\s*(?:mo(?:nths?)?|wks?|weeks?|yrs?|years?|days?|bps?)\b/gi, '');
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*%/g, '');
  // Strip digits fused to a letter label — "P4" (deliverable format), "Q3" — these are not currency
  cleaned = cleaned.replace(/\b[A-Z]\d+\b/g, '');
  const raw = cleaned.match(/\$?\d[\d,]*(?:\.\d+)?[kKmM]?/g) ?? [];
  return raw.map(m => {
    const n = parseFloat(m.replace(/[$,]/g, ''));
    if (/[kK]$/.test(m)) return n * 1000;
    if (/[mM]$/.test(m)) return n * 1000000;
    return n;
  }).filter(n => !isNaN(n) && n > 0);
}

// Vehicle MSRP lookup — approximate 2025/2026 base MSRP for named models
const VEHICLE_MSRP = [
  // Buick
  { re: /envista\s+avenir/i,      msrp: 36000, label: '2026 Buick Envista Avenir' },
  { re: /envista/i,               msrp: 28500, label: '2026 Buick Envista'        },
  { re: /enclave\s+avenir/i,      msrp: 63000, label: '2026 Buick Enclave Avenir' },
  { re: /enclave/i,               msrp: 50000, label: '2026 Buick Enclave'        },
  // GM / Chevy
  { re: /equinox\s+ev/i,          msrp: 35000, label: 'Chevy Equinox EV'          },
  { re: /equinox/i,               msrp: 31000, label: 'Chevy Equinox'             },
  { re: /silverado/i,             msrp: 40000, label: 'Chevy Silverado'           },
  { re: /traverse/i,              msrp: 43000, label: 'Chevy Traverse'            },
  // Ford
  { re: /f-?150\s+raptor/i,       msrp: 72000, label: 'Ford F-150 Raptor'         },
  { re: /f-?150/i,                msrp: 42000, label: 'Ford F-150'                },
  { re: /bronco\s+sport/i,        msrp: 32000, label: 'Ford Bronco Sport'         },
  { re: /bronco/i,                msrp: 40000, label: 'Ford Bronco'               },
  { re: /escape/i,                msrp: 30000, label: 'Ford Escape'               },
  { re: /explorer/i,              msrp: 40000, label: 'Ford Explorer'             },
  { re: /mustang\s+mach-?e/i,     msrp: 42000, label: 'Ford Mustang Mach-E'       },
  // Toyota
  { re: /rav4\s+prime/i,          msrp: 44000, label: 'Toyota RAV4 Prime'         },
  { re: /rav4/i,                  msrp: 32000, label: 'Toyota RAV4'               },
  { re: /camry/i,                 msrp: 32000, label: 'Toyota Camry'              },
  { re: /highlander/i,            msrp: 40000, label: 'Toyota Highlander'         },
  { re: /4runner/i,               msrp: 42000, label: 'Toyota 4Runner'            },
  { re: /tacoma/i,                msrp: 37000, label: 'Toyota Tacoma'             },
  { re: /tundra/i,                msrp: 42000, label: 'Toyota Tundra'             },
  // Honda
  { re: /cr-?v\s+hybrid/i,        msrp: 37000, label: 'Honda CR-V Hybrid'         },
  { re: /cr-?v/i,                 msrp: 32000, label: 'Honda CR-V'                },
  { re: /accord/i,                msrp: 30000, label: 'Honda Accord'              },
  { re: /pilot/i,                 msrp: 42000, label: 'Honda Pilot'               },
  // Hyundai / Kia
  { re: /tucson/i,                msrp: 30000, label: 'Hyundai Tucson'            },
  { re: /santa\s*fe/i,            msrp: 36000, label: 'Hyundai Santa Fe'          },
  { re: /ioniq\s*6/i,             msrp: 40000, label: 'Hyundai Ioniq 6'           },
  { re: /ioniq\s*5/i,             msrp: 45000, label: 'Hyundai Ioniq 5'           },
  { re: /telluride/i,             msrp: 38000, label: 'Kia Telluride'             },
  { re: /sportage/i,              msrp: 29000, label: 'Kia Sportage'              },
  { re: /sorento/i,               msrp: 34000, label: 'Kia Sorento'               },
  // Tesla
  { re: /model\s*s/i,             msrp: 74000, label: 'Tesla Model S'             },
  { re: /model\s*x/i,             msrp: 80000, label: 'Tesla Model X'             },
  { re: /model\s*y/i,             msrp: 44000, label: 'Tesla Model Y'             },
  { re: /model\s*3/i,             msrp: 40000, label: 'Tesla Model 3'             },
  // BMW / Mercedes / Audi
  { re: /bmw\s+x5/i,              msrp: 68000, label: 'BMW X5'                    },
  { re: /bmw\s+x3/i,              msrp: 48000, label: 'BMW X3'                    },
  { re: /c300|c-class/i,          msrp: 47000, label: 'Mercedes C-Class'          },
  { re: /glc/i,                   msrp: 50000, label: 'Mercedes GLC'              },
  { re: /audi\s+q5/i,             msrp: 47000, label: 'Audi Q5'                   },
  // Jeep / RAM
  { re: /grand\s+cherokee/i,      msrp: 42000, label: 'Jeep Grand Cherokee'       },
  { re: /wrangler/i,              msrp: 36000, label: 'Jeep Wrangler'             },
  { re: /ram\s+1500/i,            msrp: 40000, label: 'RAM 1500'                  },
  // Rivian / Lucid
  { re: /rivian\s+r2/i,           msrp: 45000, label: 'Rivian R2'                 },
  { re: /rivian/i,                msrp: 70000, label: 'Rivian R1T'                },
];

function detectVehiclePrice(query) {
  const q = query ?? '';
  for (const { re, msrp } of VEHICLE_MSRP) {
    if (re.test(q)) return msrp;
  }
  return null;
}

function calcMonthly(principal, annualRate, months) {
  const r = annualRate / 1200;
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

function fmtN(n) { return Math.round(n).toLocaleString(); }

// ── Domain detection ───────────────────────────────────────────────────────────

// Company names, esports/creator handles, and brand terms that must not
// influence domain routing — their presence says nothing about domain.
const PROPER_NOUN_EXCLUSIONS = /\b(google|microsoft|apple|amazon|netflix|spotify|twitter|facebook|instagram|tiktok|youtube|twitch|zywoo|ropz|peanut|pewdiepie|ishowspeed|xqc|ninja|valorant|fortnite|navi|fnatic|faze|vitality|g2\s+esports|100\s*thieves)\b/gi;

// Keyword patterns for co-activity scoring — parallel to routing rules but
// produces hit counts per domain rather than a single winner.
// Used by classifyAmbiguity() to detect SOFT multi-domain states.
const DOMAIN_SCORE_PATTERNS = {
  STARTUP_FINANCE: [/startup/, /runway/, /burn rate/, /payroll/, /seed round/, /series [ab]/, /raise capital/, /venture/, /bootstrap/],
  AUTO:            [/\bcar\b/, /vehicle/, /suv/, /truck/, /\bauto\b/, /\blease\b/, /\bford\b/, /toyota/, /honda/, /tesla/, /bmw/, /mercedes/, /audi/, /chevy/, /chevrolet/, /kia/, /hyundai/, /dodge/, /jeep/, /rivian/],
  REAL_ESTATE:     [/\bhouse\b/, /mortgage/, /property/, /condo/, /apartment/, /real estate/, /sq ft/, /bedroom/, /bath/, /listing/, /\brent\b/],
  RETIREMENT:      [/retire/, /401k/, /\bira\b/, /pension/, /social security/, /withdrawal/, /nest egg/],
  CAREER:          [/\bjob\b/, /career/, /salary/, /\boffer\b/, /negotiat/, /hire/, /compensation/, /\braise\b/, /\brole\b/, /\bplayer\b/, /streamer/, /creator/, /esports/],
  EXPENSE_REDUCTION: [/fixed income/, /expense/, /\bbill\b/, /medicare/, /medicaid/, /struggling/, /\bsenior\b/],
  HEALTH:          [/disability/, /therapy/, /adaptive/, /nonprofit/, /donation/, /grant/, /\bhealth\b/],
};

function scoreDomains(q) {
  const scores = {};
  for (const [domain, patterns] of Object.entries(DOMAIN_SCORE_PATTERNS)) {
    const hits = patterns.filter(re => re.test(q)).length;
    if (hits > 0) scores[domain] = hits;
  }
  return scores;
}

// resolvePrimary — existing priority-ordered routing logic (compound conditions
// preserved). Returns a string domain label. Called inside detectDomain().
function resolvePrimary(q, lens) {
  // STARTUP_FINANCE must precede RETIREMENT — 401k-as-bridge-capital is a startup signal
  if (/startup|runway|burn rate|payroll|bridge.*capital|liquidat.*401k|seed round|series [ab]|raise capital|venture|bootstrap/.test(q)) return 'STARTUP_FINANCE';
  // CONTENT_COMMERCE must precede AUTO — "audience" contains "audi" which fires AUTO gate
  if (/content.*to.*commerce|content.*commerce|content.*convert.*audience|content.*revenue|content.*monetiz|audience.*commerce|creator.*commerce|social.*commerce|creator.*sales|content.*sales|audience.*monetiz|convert.*audience|content.*product.*sell/.test(q)) return 'CONTENT_COMMERCE';
  if (/\bcar\b|vehicle|suv|\btruck\b|\bauto\b|\blease\b|buick|\bford\b|toyota|honda|tesla|bmw|mercedes|\baudi\b|chevy|chevrolet|kia|hyundai|dodge|jeep|rivian/.test(q)) return 'AUTO';
  // Property/homestead tax exemptions, freezes, deferrals, rebates are senior cost-relief
  // levers — NOT real-estate transactions. Must precede the REAL_ESTATE 'property' keyword.
  if (/homestead exemption/.test(q)) return 'EXPENSE_REDUCTION';
  if (/property tax/.test(q) && /exemption|senior|fixed income|relief|rebate|freeze|deferral|struggling/.test(q)) return 'EXPENSE_REDUCTION';
  // "home" requires purchase/equity context — bare "home" fires on "home care", "home & community access"
  if (
    /\bhouse\b|mortgage|property|\bcondo\b|apartment|real estate|sq ft|bedroom|bath|listing|\brent\b/.test(q) ||
    (/\bhome\b/.test(q) && /purchase|buy|afford|equity|loan|down payment|listing|\bmarket\b/.test(q))
  ) return 'REAL_ESTATE';
  // EXPENSE_REDUCTION must precede RETIREMENT — distribution phase, not accumulation
  if (/\bretired\b/.test(q) && /fixed income|expenses? down|reduce.*expense|lower.*bill|cut.*cost|monthly.*down|expenses? lower|struggling/.test(q)) return 'EXPENSE_REDUCTION';
  if (/fixed income/.test(q) && /senior|grandmother|grandfather|grandma|grandpa|elderly/.test(q)) return 'EXPENSE_REDUCTION';
  if (/\b(?:living on|on)\s+(?:a\s+)?(?:fixed income|social security)\b/.test(q)) return 'EXPENSE_REDUCTION';
  if (/social security/.test(q) && /struggling|afford|expenses?|bills?|reduce|lower|cut|tight|fixed/.test(q)) return 'EXPENSE_REDUCTION';
  if (/medicare\s+premiums?/.test(q)) return 'EXPENSE_REDUCTION';
  if (/\bsenior\b/.test(q) && /medicare|medicaid|premiums?|copay|out.of.pocket|healthcare cost/.test(q)) return 'EXPENSE_REDUCTION';
  if (/retire|401k|\bira\b|pension|social security|withdrawal|nest egg/.test(q)) return 'RETIREMENT';
  if (/\bjob\b|career|salary|offer|negotiat|\bhire\b|compensation|\braise\b|\brole\b/.test(q)) return 'CAREER';
  // ── Persona entity gates (before lens fallback) ────────────────────────────
  if (/\bbrady\b|tb12|athlete.entrepre|athlete.brand|athlete.enterprise|athletic.brand|performance.wellness|athlete.business|sport.*business|legacy.venture|sports.enterprise/.test(q)) return 'ATHLETE_ENTERPRISE';
  if (/kris.jenner|kardashian|\bskims\b|kylie.cosmetics|good.american|spin.?off.brand|family.brand|momager|brand.spin.?off|celebrity.brand.empire|cpg.empire/.test(q)) return 'BRAND_SPINOFF';
  if (/rich.paul|\bklutch\b|athlete.representation|cultural.enterprise|sports.agency.*media|influence.mapping|cultural.longevity/.test(q)) return 'CULTURAL_INFLUENCE';
  if (/\bthiel\b|zero.to.one|important.truth|founders.fund|\bpalantir\b|\banduril\b|cultural.resistance|contrarian.frontier/.test(q)) return 'CONTRARIAN_FRONTIER';
  // ── Cohort gates (tech billionaire analysis 2026-06-18) ─────────────────────
  if (/\btsmc\b|lithography|semiconductor fab|silicon yield|chip supply|sovereign chip|sovereign hardware|chip shortage|fab capacity|asml|node transition|\bnand\b|wafer|foundry|euvl|chip.?maker|chipmaker|chip manufacturing|hardware supply chain/.test(q)) return 'SOVEREIGN_HARDWARE';
  if (/\bgpu\b|datacenter thermal|compute cluster|ai cluster|ai infrastructure|space logistics|satellite routing|sovereign airspace|vertical.*integrat|multi.planetary|industrial ai|blue origin|starlink|kuiper|industrial flywheel|rocket|launch window/.test(q)) return 'INDUSTRIAL_FLYWHEEL';
  if (/social graph|attention retention|dau|mau|user acquisition velocity|viral coefficient|network effect|closed network|platform lifecycle|engagement loop|feed algorithm|social platform|zuckerberg|meta platform|tencent|wechat|snapchat|whatsapp growth/.test(q)) return 'SOCIAL_GRAPH';
  if (/\bsequoia\b|\bkleiner\b|\ba16z\b|andreessen|crowded exit|vc rotation|anti.consensus thesis|private market liquidity|lp distribution|secondary market|venture inversion|fund rotation|vc thesis|portfolio exit|exit window|venture capital thesis/.test(q)) return 'VC_INVERSION';
  if (/virtual economy|in.game economy|steam marketplace|digital asset marketplace|virtual currency|token velocity|cultural ip|ip franchise|game economy|virtual token|platform economics|gaming economy|virtual goods|digital goods market/.test(q)) return 'VIRTUAL_ECONOMY';
  if (/gates foundation|bill gates philanthropy|philanthropic capital|global health funding|endowment deploy|foundation grant|impact capital|non.market intervention|charitable capital|global health initiative|malaria|polio|education reform.*capital|philanthropic deploy/.test(q)) return 'PHILANTHROPIC_CAPITAL';
  // ── WO-1775/1776: Beast Industries Protocol ──────────────────────────────────
  if (/holdco|creator.*hold|holding.*company.*creator|beast.*industries|mrbeast|mr.*beast|creator.*enterprise|creator.*structur|creator.*subsidiary|platform.*dependency.*risk|ip.*holdco|holdco.*ip/.test(q)) return 'CREATOR_HOLDCO';
  if (/operational.*carry|carry.*risk|carry.*cost|carry.*load|crew.*cost|crew.*overhead|production.*overhead|burn.*rate.*creator|creator.*burn|fixed.*cost.*creator|creator.*fixed|output.*carry|carry.*obligation/.test(q)) return 'OPERATIONAL_CARRY_RISK';
  // ── WO-1777/1778: Mallah Protocol ────────────────────────────────────────────
  if (/non.institutional.*alpha|non.consensus.*alpha|retail.*alpha|individual.*alpha|asymmetric.*information.*retail|off.consensus|pre.consensus.*position|consensus.*gap|non.wall.street|individual.*investor.*edge|local.*knowledge.*invest/.test(q)) return 'NON_INSTITUTIONAL_ALPHA';
  if (/commercial.*distress|distressed.*commercial|foreclosure.*commercial|motivated.*seller.*commercial|note.*purchase|non.performing.*loan|commercial.*reo|distress.*liquidity|fire.*sale.*commercial|bankrupt.*asset|chapter.*11.*asset|distressed.*acquisition/.test(q)) return 'COMMERCIAL_DISTRESS';
  // ── WO-1785/1786: Vaynerchuk Protocol ────────────────────────────────────────
  if (/relevance.*warfare|attention.*warfare|relevance.*decay|losing.*relevance|stay.*relevant|relevance.*competition|attention.*competition|platform.*relevance|content.*relevance|native.*content.*strategy|algorithm.*relevance/.test(q)) return 'RELEVANCE_WARFARE';
  // ── WO-1796: White/TKO Protocol ──────────────────────────────────────────────
  if (/boxing.*disrupt|combat.*sport.*disrupt|ppv.*disrupt|fight.*streaming|boxing.*streaming|ufc.*streaming|tko.*streaming|dana.*white|tko.*group|boxing.*platform|combat.*sport.*platform|influencer.*boxing|celebrity.*boxing|boxer.*free.*agent|fighter.*leverage|boxing.*rights|combat.*rights/.test(q)) return 'BOXING_DISRUPTION';
  // ── WO-1795: Labor Volatility (White/TKO Protocol) ───────────────────────────
  if (/labor.*volatility|fighter.*pay.*dispute|fighter.*compensation.*reform|fighter.*union|fighter.*collective.*bargain|ufc.*labor|tko.*labor|combat.*labor|athlete.*labor.*volatility|fighter.*pay.*reform/.test(q)) return 'LABOR_VOLATILITY';
  // ── WO-1798: Brand-Equity-to-Enterprise-Stability ────────────────────────────
  if (/brand.*equity.*enterprise|brand.*enterprise.*stability|brand.*to.*enterprise|brand.*enterprise.*value|brand.*stability.*signal|brand.*value.*enterprise/.test(q)) return 'BRAND_EQUITY_STABILITY';
  // ── WO-1799/1800/1801: Dimon / Alwaleed Protocol ─────────────────────────────
  if (/structural.*resilience|bank.*resilience|financial.*resilience|balance.*sheet.*strength|institutional.*durability|capital.*buffer.*resilience|stress.*test.*resil|jpmorgan.*resilience|dimon.*resilience/.test(q)) return 'STRUCTURAL_RESILIENCE';
  if (/private.*credit|credit.*fracture|direct.*lending|shadow.*banking.*risk|private.*debt.*market|non.bank.*lending|private.*lending.*risk|credit.*market.*fracture/.test(q)) return 'PRIVATE_CREDIT';
  if (/sovereign.*capital|sovereign.*wealth|\bswf\b|sovereign.*fund|state.*capital|national.*wealth.*fund|sovereign.*deploy|alwaleed|kingdom.*holding|sovereign.*invest/.test(q)) return 'SOVEREIGN_CAPITAL';
  // ── WO-1727/1729/1730/1731/1732/1733: Protocol synthesizers ──────────────────
  if (/startup.*market.*readiness|market.*readiness.*startup|launch.*window.*startup|pmf.*timing|product.*market.*fit.*window|ycombinator|yc.*batch|yc.*timing|startup.*timing.*market|market.*entry.*timing.*startup/.test(q)) return 'STARTUP_READINESS';
  if (/long.*duration.*convergence|decade.*convergence|10x.*convergence|long.duration.*bet|generational.*convergence|moonshot.*convergence|decade.*bet.*signal|long.*horizon.*convergence/.test(q)) return 'LONG_DURATION_CONVERGENCE';
  if (/\bcoworking\b|co.working|flexible.*office|flex.*office|flexible.*space.*demand|hot.*desk|shared.*workspace|flexible.*lease|wework.*demand|space.*demand.*flexible|neumann.*space/.test(q)) return 'FLEXIBLE_SPACE';
  if (/fintech.*infrastructure|payment.*infrastructure|payment.*rails|financial.*api|embedded.*finance|banking.*api|payment.*network.*build|stripe.*model|financial.*plumbing|developer.*payment|collison.*protocol/.test(q)) return 'FINTECH_INFRA';
  if (/forward.*compute|compute.*demand.*signal|gpu.*demand|ai.*compute.*demand|inference.*demand|training.*compute.*demand|compute.*supply.*gap|gpu.*supply.*gap|huang.*protocol|nvidia.*demand.*signal/.test(q)) return 'FORWARD_COMPUTE';
  if (/attention.*saturation|marketing.*saturation|purple.*cow|permission.*marketing|godin.*protocol|attention.*economy.*saturation|media.*saturation.*signal|relevance.*saturation|saturation.*signal/.test(q)) return 'ATTENTION_SATURATION';
  return 'GENERAL';
}

// detectDomain — returns a DomainVector instead of a plain string.
// primary:             the authoritative domain (from priority rules)
// weights:             normalized score per domain (co-activity map)
// state:               HARD | SOFT | HOLD  (from WO-1766 ambiguity gate)
// entropy:             Shannon H over the distribution
// coActive:            domains within SOFT_BAND of winner
// resolutionEligible:  false on HOLD
export function detectDomain(query, lens) {
  const q = (query ?? '').toLowerCase().replace(PROPER_NOUN_EXCLUSIONS, '').replace(/\s*\+\s*/g, ' ');

  // Philanthropic capital gate fires before protected entity gate — capital deployment
  // queries referencing "global health" or "foundation" must not bleed into HEALTH domain.
  if (/gates foundation|bill gates philanthropy|philanthropic capital|endowment deploy|foundation grant|impact capital|non.market intervention|charitable capital|global health initiative|philanthropic deploy|global health funding/.test(q)) {
    return { primary: 'PHILANTHROPIC_CAPITAL', weights: { PHILANTHROPIC_CAPITAL: 1.0 }, state: 'HARD', entropy: 0, coActive: [], resolutionEligible: true };
  }

  // Protected entity gate — medical/disability signals lock domain unconditionally.
  // Wrapped as synthetic HARD vector — compound condition cannot be contaminated.
  const protectedDomain = detectProtectedDomain(query);
  if (protectedDomain) {
    return { primary: protectedDomain, weights: { [protectedDomain]: 1.0 }, state: 'HARD', entropy: 0, coActive: [], resolutionEligible: true };
  }

  const primary = resolvePrimary(q, lens);
  const scores  = scoreDomains(q);

  // DEF-1864 Intent Lock Gate: no keyword evidence + no compound rule → AMBIGUOUS.
  // Lens fallback is removed; bare queries must not escalate to a life domain.
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);
  if (primary === 'GENERAL' && totalScore === 0) {
    return { primary: 'AMBIGUOUS', weights: {}, state: 'HOLD', entropy: 0, coActive: [], resolutionEligible: false };
  }

  // Ensure primary is represented in scoring (priority rules may fire on compound
  // conditions that the simple keyword scorer misses)
  if (primary !== 'GENERAL') {
    scores[primary] = Math.max(scores[primary] ?? 0, 1);
  }

  const ambiguity = classifyAmbiguity(scores);

  const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
  const weights = {};
  for (const [d, v] of Object.entries(scores)) {
    if (v > 0) weights[d] = parseFloat((v / total).toFixed(3));
  }

  return {
    primary,
    weights,
    state:               ambiguity.state,
    entropy:             ambiguity.entropy,
    coActive:            ambiguity.coActive,
    resolutionEligible:  ambiguity.resolutionEligible,
  };
}

// synthesizerFor — maps a DomainVector to a synthesizer function.
// HARD + SOFT: primary synthesizer (v1 — SOFT blending is a future WO concern).
// HOLD:        returns null — caller must use fallback.
export function synthesizerFor(vector) {
  if (!vector || !vector.resolutionEligible) return null;
  return SYNTH_MAP[vector.primary] ?? synthGeneral;
}

// ── Domain synthesizers ────────────────────────────────────────────────────────

function synthAuto(session, numbers, query) {
  // Strip model-year integers (2010–2029) — "2026 Buick" contaminates price extraction
  // Range is 2010-2029 only; $2000 is NOT filtered (legitimate down payment amount)
  const moneyNums = numbers.filter(n => !(Number.isInteger(n) && n >= 2010 && n <= 2029) && n >= 1000);
  // price: explicit dollar amount in query → named MSRP lookup → $35K default
  const detectedMsrp = detectVehiclePrice(query);
  const price = moneyNums[0] || detectedMsrp || 35000;
  // down:  explicit query amount takes priority over broad chip selection (more specific)
  const rawDown = moneyNums[1] || null;
  const down  = rawDown ? Math.min(rawDown, price * 0.50) : Math.round(price * 0.10);
  const loan  = Math.max(price - down, 0);
  const rate  = 6.8;
  const cuRate = 5.9;
  const m48 = Math.round(calcMonthly(loan, rate, 48));
  const m60 = Math.round(calcMonthly(loan, rate, 60));
  const m72 = Math.round(calcMonthly(loan, rate, 72));
  const m60cu = Math.round(calcMonthly(loan, cuRate, 60));
  const rateSavings = fmtN((m60 - m60cu) * 60);
  const shortQ = query.length > 48 ? query.slice(0, 48) + '…' : query;

  return {
    stateLabel:  'ACTIVE MARKET',
    confidence:  0.82,
    primaryInsight: `Financing $${fmtN(loan)} at current avg (${rate}%). Payments: $${fmtN(m48)}/mo (48mo) · $${fmtN(m60)}/mo (60mo) · $${fmtN(m72)}/mo (72mo). Pre-approval target: ${cuRate}% (saves $${rateSavings} over term).`,
    momentum:    { value: '+14%', h1: '+4%', h24: '+14%' },
    trajPoints:  [0.32,0.38,0.43,0.50,0.55,0.60,0.64,0.68,0.72,0.76,0.79,0.82],
    attentionStack: [
      { rank:1, signal:'Financing Rate',     category:'Auto / Finance',    trend:'↑', momentum:'Elevated',    mColor:LIME, conf:0.88 },
      { rank:2, signal:'Dealer Margin',      category:'Retail / Auto',     trend:'↘', momentum:'Compressing', mColor:BLUE, conf:0.74 },
      { rank:3, signal:'Inventory Position', category:'Supply / Market',   trend:'↗', momentum:'Improving',   mColor:LIME, conf:0.66 },
      { rank:4, signal:'Trade-in Market',    category:'Used / Automotive', trend:'→', momentum:'Stable',      mColor:DIM,  conf:0.51 },
    ],
    keyDrivers: [
      { label:'Avg auto loan rate',          delta:'6.8%',   pos:false },
      { label:'Dealer inventory (+YoY)',     delta:'+14%',   pos:true  },
      { label:'OEM incentive programs',      delta:'+$1.2K', pos:true  },
      { label:'Entry segment resale value',  delta:'-8%',    pos:false },
    ],
    recommendedAction: `Get pre-approved at your credit union before the dealership. Their avg rate (${cuRate}%) vs dealer markup (${rate}%) saves $${rateSavings} over the loan.`,
    timeHorizon: '7–14 days',
    impactLevel:  'High',
    bluf: `A $${fmtN(loan)} loan at ${rate}% avg carries $${fmtN(m60 * 60 - loan)} in total interest over 60 months. Pre-approval at ${cuRate}% recovers $${rateSavings}. Dealer financing is a profit center — not a service.`,
    purpose: `Purchase decision analysis for: ${shortQ}. Covers financing cost, dealer margin, negotiation sequence, and timing.`,
    fiveWs: [
      { w:'WHO',   answer:`${shortQ} — regional dealer network and retail financing market.` },
      { w:'WHAT',  answer:`$${fmtN(price)} purchase, $${fmtN(down)} down. Financed: $${fmtN(loan)}.` },
      { w:'WHEN',  answer:`Inventory up 14% YoY — buyer market. Best negotiating: end of month, end of quarter.` },
      { w:'WHERE', answer:`Primary cost exposure: financing layer. Secondary: dealer margin (3–8% of MSRP on new vehicles).` },
      { w:'WHY',   answer:`Rates elevated vs 2021–2022. Pre-approval converts dealer financing from their revenue to your leverage.` },
    ],
    evidence: [
      `Avg new-car loan rate: ${rate}%. Credit union avg: ${cuRate}%. Spread over 60 months = $${rateSavings}.`,
      `Dealer inventory +14% YoY — reduced urgency pressure, more room to walk.`,
      `OEM incentive programs avg $1,200–$2,400 on this segment. Stackable with negotiated price (not with dealer financing).`,
      `End-of-month dealer volume quotas create a consistent negotiating window.`,
    ],
    assumptions: [
      `Credit score 720+ assumed for prime auto lending rates.`,
      `Trade-in (if any) valued independently — dealer offers avg 10–15% below private sale.`,
    ],
    assessment: `Total interest at ${rate}% over 60 months: $${fmtN(m60 * 60 - loan)}. At ${cuRate}% (credit union): $${fmtN(m60cu * 60 - loan)}. The negotiation sequence matters: pre-approval → OTD price → trade-in → ignore dealer financing pitch. Settling these in the wrong order costs thousands.`,
    threats: [
      { label:'Dealer financing markup',    level:'HIGH',   color:LIME },
      { label:'Trade-in undervaluation',    level:'MEDIUM', color:BLUE },
      { label:'F&I add-on products',        level:'MEDIUM', color:BLUE },
      { label:'Rate lock window expiry',    level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`End-of-month timing — dealer quota pressure opens $500–$1,500 additional margin.` },
      { label:`OEM incentive stacking: verify with manufacturer site before accepting any offer.` },
      { label:`Pre-approval as anchor: show your rate, ask dealer to beat it — they sometimes can.` },
    ],
    alternativeView: `Manufacturer captive lenders (e.g., GM Financial) occasionally offer rates below credit union. True in promotional periods — verify before assuming dealer financing is always inferior.`,
    outlook: [
      { prob:0.72, label:`Pre-approval + negotiated OTD saves $${fmtN(parseInt(rateSavings.replace(/,/g,'')) + 800)} vs walk-in MSRP financing`, color:LIME },
      { prob:0.20, label:`Dealer matches pre-approval rate — net saving via incentives only`,                                                       color:BLUE },
      { prob:0.08, label:`OEM promotional rate available — beats credit union for this model/trim`,                                                color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'GET PRE-APPROVED',           impact:0.94, rationale:`Apply to your credit union or bank today. A pre-approval letter at ${cuRate}% vs dealer avg ${rate}% saves $${rateSavings} over the loan term. Takes 1 business day.`,                                                    tag:'FINANCING' },
        { id:'a2', label:'CHECK OEM INCENTIVES',       impact:0.78, rationale:`Visit the manufacturer's site to verify current offers for this model/trim. Avg $1,200–$2,400 on this segment. Incentives are often stackable with price but not with dealer financing.`,                          tag:'SAVINGS'   },
      ],
      SHORT_TERM: [
        { id:'b1', label:'NEGOTIATE OTD PRICE FIRST',  impact:0.85, rationale:`Agree on out-the-door price before revealing your financing or trade-in. Bundling gives the dealer margin to hide profit in whichever line they choose.`,                                                             tag:'LEVERAGE'  },
        { id:'b2', label:'GET WRITTEN TRADE-IN OFFER', impact:0.66, rationale:`Get a written appraisal from CarMax or Carvana before trading in. Dealer offers avg 10–15% below private sale. Use the written offer as a floor in trade-in negotiation.`,                                         tag:'VALUE'     },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD PAYMENT BUFFER',        impact:0.71, rationale:`$${fmtN(m60)}/mo is a fixed obligation. Have 1–2 months of payments ($${fmtN(m60 * 2)}) in liquid savings before taking delivery. Volatility in income creates immediate risk on fixed auto payments.`,         tag:'STABILITY' },
        { id:'c2', label:'SHOP FULL COVERAGE QUOTES',   impact:0.58, rationale:`Full coverage on a $${fmtN(price)} vehicle adds $150–$300/mo to true cost of ownership. Get quotes before signing — insurance is a locked cost for the loan term and lender requires full coverage.`,            tag:'COST'      },
      ],
    },
    leverage: { typeY: 3, typeLabel: 'CAPITAL', tierLabel: classifyLeverageTier(parseFloat((loan / (down || 1)).toFixed(1))), deRatio: parseFloat((loan / (down || 1)).toFixed(1)), permissionless: true, industryNorm: 1.8 },
  };
}

function synthRealEstate(session, numbers, query) {
  const price  = numbers[0] || 350000;
  const down   = numbers[1] || Math.round(price * 0.10);
  const loan   = price - down;
  const rate   = 6.9;
  const m360   = Math.round(calcMonthly(loan, rate, 360));
  const totalI = fmtN(m360 * 360 - loan);
  const pct28income = fmtN((m360 + 650) / 0.28);

  return {
    stateLabel: 'MARKET ACTIVE',
    confidence: 0.79,
    primaryInsight: `$${fmtN(loan)} loan at ${rate}% = $${fmtN(m360)}/mo P&I. Total interest (30yr): $${totalI}. PITI estimate: $${fmtN(m360 + 650)}/mo. Requires ~$${pct28income}/mo gross income (28% rule).`,
    momentum:   { value: '+6%', h1: '+1%', h24: '+6%' },
    trajPoints: [0.28,0.33,0.38,0.44,0.50,0.55,0.60,0.64,0.68,0.72,0.76,0.79],
    attentionStack: [
      { rank:1, signal:'Mortgage Rate',      category:'Finance / Fixed Rate',  trend:'↘', momentum:'Moderating', mColor:LIME, conf:0.86 },
      { rank:2, signal:'Housing Inventory',  category:'Supply / Local Market', trend:'↗', momentum:'Improving',  mColor:LIME, conf:0.72 },
      { rank:3, signal:'Price-to-Income',    category:'Affordability Index',   trend:'↑', momentum:'Stressed',   mColor:BLUE, conf:0.68 },
      { rank:4, signal:'Days on Market',     category:'Demand / Local',        trend:'↗', momentum:'Extending',  mColor:DIM,  conf:0.55 },
    ],
    keyDrivers: [
      { label:'30yr fixed avg rate',         delta:'6.9%',  pos:false },
      { label:'Inventory months of supply',  delta:'+2.1',  pos:true  },
      { label:'Median price change (YoY)',   delta:'+4.2%', pos:false },
      { label:'Avg days on market',          delta:'+18',   pos:true  },
    ],
    recommendedAction: `Get pre-approved and lock your rate before making an offer. Inventory is rising — you have time to negotiate. Rate locks expire in 45–60 days.`,
    timeHorizon: '30–45 days',
    impactLevel: 'High',
    bluf: `A $${fmtN(price)} purchase at ${rate}% creates a $${fmtN(m360 + 650)}/mo obligation (PITI). Total 30-year interest: $${totalI}. Rate lock before offer is the single highest-leverage action.`,
    purpose: `Home purchase decision analysis for $${fmtN(price)}. Covers financing math, market position, and negotiation sequence.`,
    fiveWs: [
      { w:'WHO',   answer:`Buyer at $${fmtN(price)} price point. Local seller and market inventory determine negotiation leverage.` },
      { w:'WHAT',  answer:`$${fmtN(price)} purchase, $${fmtN(down)} down (${Math.round(down/price*100)}%). Financed: $${fmtN(loan)}.` },
      { w:'WHEN',  answer:`Inventory rising — buyers gaining time. Rate environment: ${rate}% avg 30yr. Rate buy-down worth modeling for 7+ year hold.` },
      { w:'WHERE', answer:`Rate and local inventory are primary levers. Local comps determine price negotiation position.` },
      { w:'WHY',   answer:`Rising inventory shifts power toward buyers. Rate is the largest variable in total cost of ownership.` },
    ],
    evidence: [
      `At ${rate}%, 30-year total interest: $${totalI} — ${Math.round((m360 * 360) / loan * 10)/10}x the financed amount.`,
      `1 point rate buy-down costs ~1% of loan ($${fmtN(loan/100)}) and reduces payment by ~$${fmtN(calcMonthly(loan, rate, 360) - calcMonthly(loan, rate - 0.25, 360))}/mo.`,
      `Inventory rising YoY — days on market extending, price reductions more common.`,
      `Property tax + insurance adds $400–$900/mo (regime-dependent) to base P&I — see MCV for structural context.`,
    ],
    assumptions: [
      `Credit score 740+ assumed for advertised rates. Sub-740 carries 0.5–1.5% rate premium.`,
      `Market regime conditions may vary — see MCV for structural context.`,
    ],
    assessment: `True monthly cost of ownership: $${fmtN(m360 + 650)}/mo. At the 28% front-end ratio, this requires $${pct28income}/mo gross income. Each 0.25% rate move changes payment by $${fmtN(calcMonthly(loan, rate, 360) - calcMonthly(loan, rate - 0.25, 360))}/mo. Rate lock before offer is non-negotiable.`,
    threats: [
      { label:'Rate increase before close',  level:'HIGH',   color:LIME },
      { label:'Appraisal gap risk',          level:'MEDIUM', color:BLUE },
      { label:'Inspection cost exposure',    level:'MEDIUM', color:BLUE },
      { label:'Property tax reassessment',   level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`Rising inventory = seller concessions. Request 1–2 points of rate buy-down as seller contribution.` },
      { label:`Extended days on market = negotiation window. Offer below ask with local comps as anchor.` },
      { label:`45–60 day rate lock before offer protects against rate volatility during escrow.` },
    ],
    alternativeView: `Renting while rates decline is rational if relocation is possible within 5 years. Break-even on closing costs ($${fmtN(price * 0.03)}–$${fmtN(price * 0.05)}) typically requires 4–6 year hold.`,
    outlook: [
      { prob:0.65, label:`Purchase with pre-approval + rate lock captures current inventory advantage`,  color:LIME },
      { prob:0.25, label:`Rate environment improves — refinance opportunity opens within 12–24 months`,  color:BLUE },
      { prob:0.10, label:`Market softening continues — 6-month wait yields materially better terms`,     color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'GET PRE-APPROVED + LOCK RATE',    impact:0.92, rationale:`Pre-approval sets your ceiling. Rate lock (45 days) prevents cost increase during escrow. Apply today — takes 1–3 business days.`,                                                                                  tag:'FINANCING' },
        { id:'a2', label:'PULL LOCAL COMPS',                impact:0.77, rationale:`Recent sales within 0.5mi, 90 days. This is your offer anchor. Paying above comps creates appraisal gap — bank won't lend above appraised value, you cover the difference.`,                                tag:'RESEARCH'  },
      ],
      SHORT_TERM: [
        { id:'b1', label:'NEGOTIATE SELLER CONCESSIONS',    impact:0.81, rationale:`In rising inventory, request 1–2 points of rate buy-down from seller. Costs them ~$${fmtN(loan/100 * 1.5)} but saves $${fmtN((calcMonthly(loan, rate, 360) - calcMonthly(loan, rate - 0.375, 360)) * 360)} over 30 years.`,  tag:'LEVERAGE'  },
        { id:'b2', label:'BUDGET CLOSING COSTS',            impact:0.68, rationale:`Closing costs: 2–5% of purchase price ($${fmtN(price * 0.03)}–$${fmtN(price * 0.05)}). Due at signing — verify liquid reserves cover both down payment AND closing costs before making offers.`,              tag:'CASH'      },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD 6-MONTH PITI RESERVE',      impact:0.85, rationale:`Fixed monthly obligations require $${fmtN((m360 + 650) * 6)} in liquid reserves. This covers 6 months of PITI — the standard emergency buffer for homeowners.`,                                              tag:'STABILITY' },
        { id:'c2', label:'MODEL 5-YEAR BREAK-EVEN',         impact:0.62, rationale:`Closing costs require 4–6 years to break even vs renting. If job mobility or relocation is possible within 5 years, the purchase economics weaken materially.`,                                               tag:'PLANNING'  },
      ],
    },
    leverage: { typeY: 3, typeLabel: 'CAPITAL', tierLabel: classifyLeverageTier(parseFloat((loan / Math.max(down, 1)).toFixed(1))), deRatio: parseFloat((loan / Math.max(down, 1)).toFixed(1)), permissionless: true, industryNorm: 3.0 },
  };
}

function synthCareer(session, numbers, query) {
  const salary  = numbers[0] || 85000;
  const ask     = Math.round(salary * 1.13);
  const mid     = Math.round((salary + ask) / 2);
  const gap5yr  = fmtN((ask - salary) * 5);

  return {
    stateLabel: 'NEGOTIATION OPEN',
    confidence: 0.84,
    primaryInsight: `Offer: $${fmtN(salary)}. Counter target: $${fmtN(ask)} (1.13×). Midpoint settlement: $${fmtN(mid)}. 5-year compounding delta: $${gap5yr}+. Counter rejection rate: ~12%.`,
    momentum:   { value: '+8%', h1: '+2%', h24: '+8%' },
    trajPoints: [0.40,0.45,0.50,0.55,0.60,0.64,0.68,0.72,0.76,0.79,0.82,0.84],
    attentionStack: [
      { rank:1, signal:'Offer vs Market Rate',  category:'Compensation / Role',  trend:'↑', momentum:'Above Floor',  mColor:LIME, conf:0.87 },
      { rank:2, signal:'Equity Component',      category:'Total Comp / Upside',  trend:'?', momentum:'Unverified',    mColor:BLUE, conf:0.65 },
      { rank:3, signal:'Response Timeline',     category:'Leverage / Urgency',   trend:'→', momentum:'Controlled',    mColor:LIME, conf:0.71 },
      { rank:4, signal:'Counter Rejection Risk',category:'Risk / Walkaway',      trend:'↗', momentum:'Low Risk',      mColor:DIM,  conf:0.58 },
    ],
    keyDrivers: [
      { label:'Counter rejection rate',         delta:'12%',   pos:true  },
      { label:'YoY comp growth (sector)',        delta:'+8%',   pos:true  },
      { label:'Offer-to-ask spread',            delta:`$${fmtN(ask - salary)}`, pos:true  },
      { label:'Counter response window',        delta:'72h',   pos:false },
    ],
    recommendedAction: `Counter at $${fmtN(ask)}. Cite market data. If they return at $${fmtN(mid)}, accept — that's a win. Never give a number first.`,
    timeHorizon: '24–72 hours',
    impactLevel: 'High',
    bluf: `This offer has room. A counter at $${fmtN(ask)} (1.13×) carries ~12% rejection risk. The $${fmtN(ask - salary)} annual spread compounds to $${gap5yr}+ over 5 years with raises. Not countering is the highest-cost decision available.`,
    purpose: `Job offer negotiation analysis at $${fmtN(salary)} base. Covers counter strategy, leverage position, and total comp approach.`,
    fiveWs: [
      { w:'WHO',   answer:`You as candidate. Employer with open position — they've invested ~$${fmtN(salary * 0.15)} in recruiting cost selecting you.` },
      { w:'WHAT',  answer:`Offer at $${fmtN(salary)}. Counter target: $${fmtN(ask)}. Negotiation spread: $${fmtN(ask - salary)}.` },
      { w:'WHEN',  answer:`Counter within 24–48 hours. Beyond 72h signals hesitation and weakens position.` },
      { w:'WHERE', answer:`Base salary is primary lever. Secondary: signing bonus (cash, immediate), equity vesting schedule.` },
      { w:'WHY',   answer:`85% of hiring managers expect a counter. Not countering leaves structured money on the table.` },
    ],
    evidence: [
      `85% of hiring managers report initial offers include 5–10% negotiation margin.`,
      `Counter rejection rate: ~12% — most counters succeed, especially at 1.10–1.15× range.`,
      `$${fmtN(ask - salary)}/yr compounds: over 5 years at 3% raises = $${gap5yr}+ cumulative delta.`,
      `Signing bonus and equity are often easier to unlock than base — always negotiate holistically.`,
    ],
    assumptions: [
      `You are the preferred candidate — offer was extended. Counter does not restart their search.`,
      `Employer comp band likely has ceiling. Ask of $${fmtN(ask)} is within or near their approved range.`,
    ],
    assessment: `The cost of not countering: $${fmtN(ask - salary)}/yr × career. The counter sequence: express genuine enthusiasm, anchor at $${fmtN(ask)}, cite 2–3 market data points, then stop talking. If base is fixed, pivot to signing bonus ($${fmtN(salary * 0.10)} target) or equity acceleration.`,
    threats: [
      { label:'Offer expiry without counter',    level:'HIGH',  color:LIME },
      { label:'Equity overvaluation',            level:'MEDIUM',color:BLUE },
      { label:'Counter perceived as disinterest',level:'LOW',   color:DIM  },
    ],
    opportunities: [
      { label:`Signing bonus: one-time, easier to approve than base increase. Target: $${fmtN(salary * 0.10)}.` },
      { label:`Equity vesting acceleration or cliff reduction — high upside, low annual cost to employer.` },
      { label:`Remote/hybrid flexibility as implicit comp — reduces commute, adds effective income.` },
    ],
    alternativeView: `Expressing full enthusiasm at offer price builds goodwill. Data doesn't support this — negotiation is expected and rarely impacts professional relationships at the offer stage.`,
    outlook: [
      { prob:0.72, label:`Counter at $${fmtN(ask)} accepted or settled at midpoint ($${fmtN(mid)})`, color:LIME },
      { prob:0.20, label:`Base fixed — signing bonus or equity offered as package compromise`,         color:BLUE },
      { prob:0.08, label:`Offer not extended further — accept at $${fmtN(salary)} or walk`,           color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'SEND COUNTER TODAY',        impact:0.94, rationale:`Counter at $${fmtN(ask)}. Email: express enthusiasm, state your market-based number, confirm your continued interest. Do not apologize for asking.`,                                                              tag:'NEGOTIATION' },
        { id:'a2', label:'PULL MARKET COMPS',         impact:0.81, rationale:`Levels.fyi, Glassdoor, LinkedIn Salary. Get 5–8 data points for this role/level in this market. Cite 2–3 in your counter email — data anchors outperform feelings.`,                                       tag:'LEVERAGE'    },
      ],
      SHORT_TERM: [
        { id:'b1', label:'NEGOTIATE TOTAL PACKAGE',   impact:0.77, rationale:`If base is fixed at $${fmtN(salary)}, pivot: signing bonus ($${fmtN(salary * 0.10)} target), equity acceleration, extra PTO, or remote flexibility. Total comp is what matters.`,                          tag:'TOTAL COMP'  },
        { id:'b2', label:'GET ALL TERMS IN WRITING',  impact:0.65, rationale:`Revised offer letter before accepting. Verbal commitments on equity, title, future comp, or start date are not enforceable.`,                                                                                tag:'PROTECTION'  },
      ],
      STRUCTURAL: [
        { id:'c1', label:'ANCHOR 12-MONTH REVIEW',    impact:0.72, rationale:`Ask for a 6 or 12-month performance review with comp discussion baked into the offer letter. This anchors your next raise conversation before your first day.`,                                              tag:'TRAJECTORY'  },
        { id:'c2', label:'TRACK YOUR MARKET RATE',    impact:0.60, rationale:`Set a recurring 6-month calendar reminder to pull fresh market comps. Comp stagnates when you stop looking — knowing the market is your single biggest negotiating advantage.`,                            tag:'AWARENESS'   },
      ],
    },
    leverage: { typeY: 4, typeLabel: 'LABOR', tierLabel: classifyLeverageTier(1.0), deRatio: 1.0, permissionless: false, industryNorm: 1.0 },
  };
}

function synthRetirement(session, numbers, query) {
  const savings = numbers[0] || 250000;
  const age     = numbers.find(n => n >= 25 && n <= 75) ?? 55;
  const yearsTo = Math.max(5, 65 - age);
  const annual  = numbers.find(n => n >= 20000 && n <= 500000 && n !== savings) || 60000;
  const needed  = annual * 25;
  const gap     = Math.max(0, needed - savings);
  const annualContrib = gap > 0 ? Math.round(gap / ((Math.pow(1.07, yearsTo) - 1) / 0.07)) : 0;
  const ssIncrease = fmtN(annual * 0.15 * 4);

  return {
    stateLabel: 'PLANNING ACTIVE',
    confidence: 0.81,
    primaryInsight: `Target (4% rule at $${fmtN(annual)}/yr): $${fmtN(needed)}. Current: $${fmtN(savings)}. Gap: $${fmtN(gap)}. Needed to close in ${yearsTo}yr: ~$${fmtN(annualContrib)}/yr at 7% growth.`,
    momentum:   { value: '+7%', h1: '+1%', h24: '+7%' },
    trajPoints: [0.22,0.28,0.35,0.42,0.50,0.57,0.63,0.68,0.72,0.76,0.79,0.81],
    attentionStack: [
      { rank:1, signal:'Savings Gap',         category:'Retirement / Coverage',  trend:'↘', momentum:'Closeable',    mColor:LIME, conf:0.89 },
      { rank:2, signal:'Healthcare Inflation',category:'Cost / Medical',          trend:'↑', momentum:'Accelerating', mColor:BLUE, conf:0.82 },
      { rank:3, signal:'SS Claiming Age',     category:'Income / Benefit',       trend:'→', momentum:'Stable',       mColor:LIME, conf:0.76 },
      { rank:4, signal:'Sequence of Returns', category:'Risk / Timing',          trend:'?', momentum:'Unknown',      mColor:DIM,  conf:0.61 },
    ],
    keyDrivers: [
      { label:'Years to retirement',           delta:`${yearsTo}yr`,  pos:true  },
      { label:'Healthcare cost inflation',     delta:'+5.4%/yr',      pos:false },
      { label:'SS delay credit (62→70)',       delta:'+76%',          pos:true  },
      { label:'Current 4% withdrawal yield',  delta:`$${fmtN(savings * 0.04)}/yr`, pos:true },
    ],
    recommendedAction: `Max 401k ($23,500/yr) + IRA ($7,000/yr) today. Delaying SS from 62→70 increases monthly benefit by ~76%. Healthcare bridge (60–65) is the #1 underestimated cost.`,
    timeHorizon: `${yearsTo} years`,
    impactLevel: 'High',
    bluf: `Current savings ($${fmtN(savings)}) support $${fmtN(savings * 0.04)}/yr at 4% — a $${fmtN(Math.max(0, annual - savings * 0.04))}/yr income gap vs your $${fmtN(annual)} target. Closing the gap requires $${fmtN(annualContrib)}/yr in additional contributions at 7% growth over ${yearsTo} years.`,
    purpose: `Retirement readiness analysis. Covers savings gap, contribution math, healthcare cost exposure, and Social Security timing.`,
    fiveWs: [
      { w:'WHO',   answer:`Individual at ~age ${age}, targeting retirement at ~65.` },
      { w:'WHAT',  answer:`Savings: $${fmtN(savings)}. Target (4% rule): $${fmtN(needed)}. Gap: $${fmtN(gap)}.` },
      { w:'WHEN',  answer:`${yearsTo} years to close gap. Every year of delay requires higher annual contribution to reach same outcome.` },
      { w:'WHERE', answer:`Primary gap: savings accumulation. Secondary: healthcare ($315K avg couple estimate, Fidelity 2025).` },
      { w:'WHY',   answer:`Healthcare costs are the largest unplanned retirement expense — routinely underestimated by 40–60%.` },
    ],
    evidence: [
      `4% rule: $${fmtN(needed)} supports $${fmtN(annual)}/yr for 30 years with 95% historical success.`,
      `Max 401k contribution ($23,500) grows to $${fmtN(23500 * Math.pow(1.07, yearsTo))} in ${yearsTo}yr at 7%.`,
      `SS delay 62→70: benefit increases ~76%. Break-even vs claiming at 66: approximately age 79.`,
      `Medicare starts at 65 — bridge coverage at 60–65 often the most expensive healthcare period.`,
    ],
    assumptions: [
      `7% average annual portfolio return assumed (balanced 60/40 allocation).`,
      `3% annual inflation applied to expense projections.`,
    ],
    assessment: `Closing the $${fmtN(gap)} gap in ${yearsTo} years requires $${fmtN(annualContrib)}/yr in contributions (at 7% growth). Healthcare is the primary wildcard — plan $150,000–$300,000 in out-of-pocket costs independent of Medicare premiums. Sequence of returns risk is highest in the 5 years before and after retirement date.`,
    threats: [
      { label:'Sequence of returns risk',      level:'HIGH',   color:LIME },
      { label:'Healthcare cost inflation',     level:'HIGH',   color:LIME },
      { label:'Longevity beyond 30 years',     level:'MEDIUM', color:BLUE },
      { label:'Social Security solvency',      level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`Catch-up contributions (age 50+): additional $7,500/yr in 401k, $1,000/yr in IRA.` },
      { label:`SS delay 66→70: adds $${ssIncrease} in cumulative lifetime benefit (avg longevity).` },
      { label:`HSA as retirement vehicle: triple tax advantage, rolls over, invests.` },
    ],
    alternativeView: `A 5% withdrawal rate (vs 4%) is defended by some planners for modern portfolios. Not stress-tested against prolonged low-return environments (2000–2010 precedent).`,
    outlook: [
      { prob:0.68, label:`Max contribution path closes gap within ${yearsTo} years with margin`, color:LIME },
      { prob:0.22, label:`Partial gap remains — SS timing + expense reduction closes remainder`,  color:BLUE },
      { prob:0.10, label:`Healthcare event materially changes plan before retirement target`,     color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'MAX TAX-ADVANTAGED ACCOUNTS', impact:0.95, rationale:`401k: $23,500/yr ($1,958/mo). IRA: $7,000/yr. Age 50+: add $8,500 catch-up. These reduce taxable income AND compound tax-deferred. Front-load if cash flow allows.`,     tag:'CONTRIBUTIONS' },
        { id:'a2', label:'OPEN OR FUND HSA',             impact:0.80, rationale:`If on HDHP: $4,150 single / $8,300 family. Invests like an IRA, withdrawals tax-free for medical. Triple tax advantage — the most tax-efficient savings vehicle available.`, tag:'HEALTHCARE'    },
      ],
      SHORT_TERM: [
        { id:'b1', label:'MODEL SS CLAIMING SCENARIOS',  impact:0.82, rationale:`SSA.gov estimator: model income at 62, 66, and 70. Delay 62→70 = 76% benefit increase. For average longevity, delay from 66→70 break-even is approximately age 79.`,          tag:'INCOME'    },
        { id:'b2', label:'ESTIMATE HEALTHCARE BRIDGE',   impact:0.73, rationale:`Retiring before 65: model COBRA or marketplace premiums ($600–$1,200/mo individual). This is the #1 underestimated retirement cost — plan it explicitly before retiring.`,       tag:'COVERAGE'  },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD ALLOCATION GLIDE PATH',  impact:0.79, rationale:`Shift toward lower volatility as retirement nears. Sequence of returns risk peaks in the 5 years before and 5 years after retirement date — position before you need to.`, tag:'RISK'          },
        { id:'c2', label:'AUDIT ESTATE DOCUMENTS',       impact:0.61, rationale:`Will, beneficiary designations, power of attorney — annual review required. Outdated beneficiary designations override wills in most states. One of the highest-impact zero-cost actions.`, tag:'PROTECTION' },
      ],
    },
    leverage: { typeY: 3, typeLabel: 'CAPITAL', tierLabel: classifyLeverageTier(parseFloat((gap / Math.max(savings, 1)).toFixed(1))), deRatio: parseFloat((gap / Math.max(savings, 1)).toFixed(1)), permissionless: true, industryNorm: 0.8 },
  };
}

function synthExpenseReduction(session, numbers, query) {
  const capital = numbers[0] || null;
  const burn    = numbers[1] || null;
  const runway  = capital && burn ? (capital / burn).toFixed(1) : null;
  const shortQ  = query.length > 50 ? query.slice(0, 50) + '…' : query;

  return {
    stateLabel: 'EXPENSE AUDIT ACTIVE',
    confidence: 0.81,
    primaryInsight: `Fixed income scenario. ${runway ? `Runway: ${runway}mo at current burn ($${fmtN(burn)}/mo). ` : ''}Primary lever: expense reduction, not accumulation. Medicare optimization + assistance programs are the highest-yield actions.`,
    momentum:   { value: '+6%', h1: '+1%', h24: '+6%' },
    trajPoints: [0.30,0.36,0.42,0.48,0.54,0.60,0.64,0.68,0.72,0.76,0.78,0.81],
    attentionStack: [
      { rank:1, signal:'Medicare Plan Fit',      category:'Healthcare / Monthly',  trend:'↘', momentum:'Optimizable', mColor:LIME, conf:0.88 },
      { rank:2, signal:'Assistance Eligibility', category:'Benefits / Federal',    trend:'↑', momentum:'Unclaimed',   mColor:LIME, conf:0.83 },
      { rank:3, signal:'Subscription Bleed',     category:'Fixed / Discretionary', trend:'↑', momentum:'Recoverable', mColor:BLUE, conf:0.76 },
      { rank:4, signal:'Prescription Costs',     category:'Drug / Out-of-Pocket',  trend:'↘', momentum:'Reducible',   mColor:LIME, conf:0.71 },
    ],
    keyDrivers: [
      { label:'Medicare Advantage savings',     delta:'$100–300/mo', pos:true },
      { label:'SNAP avg senior benefit',        delta:'$281/mo',     pos:true },
      { label:'LIHEAP utility assistance',      delta:'$400–600/yr', pos:true },
      { label:'Senior property tax exemption',  delta:'$500–2K/yr',  pos:true },
    ],
    recommendedAction: `Start with Medicare plan comparison (Medicare.gov) — highest-leverage monthly cost reduction available. Then check SNAP eligibility for food assistance.`,
    timeHorizon: '30–60 days',
    impactLevel: 'High',
    bluf: `On a fixed income, the only lever is expense reduction. Medicare optimization, federal assistance programs, and a subscription audit can recover $300–600/mo without reducing quality of life.`,
    purpose: `Expense reduction analysis for fixed-income senior. Covers Medicare optimization, assistance program eligibility, discretionary audit, and prescription cost reduction.`,
    fiveWs: [
      { w:'WHO',   answer:`Retired individual on fixed income. Income is fixed — expense reduction is the only financial lever.` },
      { w:'WHAT',  answer:`Monthly expense audit. Largest senior cost categories: healthcare, food, housing, transportation, prescriptions.` },
      { w:'WHEN',  answer:`Medicare plan comparison: Oct 15–Dec 7 (Annual Enrollment). LIHEAP: Oct–April. SNAP: open year-round.` },
      { w:'WHERE', answer:`Primary savings: Medicare plan optimization. Secondary: federal/state assistance programs. Tertiary: subscription and insurance audit.` },
      { w:'WHY',   answer:`Many seniors on fixed income qualify for assistance programs they never applied for. Medicare Advantage vs Original Medicare gap is often $100–300/mo unclaimed.` },
    ],
    evidence: [
      `Medicare Advantage plans can reduce monthly costs vs Original Medicare + Medigap by $100–300/mo.`,
      `SNAP: seniors at or below 130% of poverty line qualify. Average senior benefit: $281/mo.`,
      `LIHEAP: federal heating/cooling assistance. Enrollment Oct–April. Avg benefit: $400–600.`,
      `Senior homestead exemptions reduce property tax $500–2,000/yr in most states — must apply annually.`,
    ],
    assumptions: [
      `Medicare-eligible (age 65+). Part A and B enrolled or eligible.`,
      `Income qualifies for one or more assistance programs at fixed-income levels.`,
    ],
    assessment: `The highest-yield actions for a fixed-income senior are cost recovery actions, not savings strategies. Medicare plan optimization, SNAP, and LIHEAP together can recover $400–700/mo. Prescription drug costs (Part D optimization or GoodRx) add $50–200/mo depending on medications. Subscription and insurance audit typically recovers $50–150/mo.`,
    threats: [
      { label:'Healthcare cost inflation',              level:'HIGH',   color:LIME },
      { label:'Medicare plan changes (annual)',          level:'MEDIUM', color:BLUE },
      { label:'Assistance program enrollment deadlines', level:'MEDIUM', color:BLUE },
      { label:'Utility rate increases',                 level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`Medicare Extra Help (LIS): reduces Part D drug costs to near zero if income qualifies.` },
      { label:`Senior Farmers Market Nutrition Program: additional food assistance in participating states.` },
      { label:`Telephone Lifeline program: $9.25/mo credit on phone/internet — apply through provider.` },
    ],
    alternativeView: `Reverse mortgage products provide monthly income against home equity for homeowners. High-fee product — appropriate only if no plans to relocate and estate considerations are resolved.`,
    outlook: [
      { prob:0.72, label:`Medicare optimization + assistance programs recover $400–600/mo`, color:LIME },
      { prob:0.20, label:`Partial recovery — one or two programs accessible, not all`,       color:BLUE },
      { prob:0.08, label:`Income or asset threshold disqualifies most programs`,             color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'COMPARE MEDICARE PLANS',   impact:0.92, rationale:`Go to Medicare.gov Plan Finder. Compare your current plan vs Medicare Advantage options. Many seniors save $100–300/mo. Annual Enrollment: Oct 15–Dec 7. Outside that window, call 1-800-MEDICARE to review options.`, tag:'HEALTHCARE' },
        { id:'a2', label:'AUDIT SUBSCRIPTIONS',      impact:0.78, rationale:`List every recurring charge: cable, streaming, insurance riders, club memberships. Cancel anything unused. Average senior household recovers $50–150/mo from subscription bleed.`,                                   tag:'CASH FLOW'  },
      ],
      SHORT_TERM: [
        { id:'b1', label:'APPLY FOR SNAP BENEFITS',  impact:0.88, rationale:`Seniors at or below 130% of poverty line qualify. Apply at Benefits.gov or local DHS office. Average senior benefit: $281/mo in groceries. Most seniors who qualify have never applied.`,                         tag:'FOOD'       },
        { id:'b2', label:'APPLY FOR LIHEAP',         impact:0.74, rationale:`Federal heating and cooling assistance. Apply through local Community Action Agency. Enrollment typically Oct–April. Avg benefit: $400–600. Covers electric, gas, or fuel oil.`,                                  tag:'UTILITIES'  },
      ],
      STRUCTURAL: [
        { id:'c1', label:'FILE PROPERTY TAX EXEMPTION', impact:0.81, rationale:`Most states offer homestead exemptions for seniors 65+. Reduces annual tax bill $500–2,000. File with county assessor — many seniors miss this. Check your state deadline.`,                                tag:'HOUSING'       },
        { id:'c2', label:'OPTIMIZE PRESCRIPTIONS',   impact:0.69, rationale:`Check GoodRx or RxSaver for every medication. Brand-to-generic switch cuts costs 80%+. Apply for Medicare Extra Help (LIS) if income qualifies — reduces Part D costs to near zero.`,                          tag:'PRESCRIPTIONS' },
      ],
    },
    leverage: { typeY: 3, typeLabel: 'CAPITAL', tierLabel: classifyLeverageTier(0.1), deRatio: 0.1, permissionless: true, industryNorm: 0.5 },
  };
}

function synthGeneral(session, numbers, query) {
  const floor = session?.tensor?.floor || numbers[0] || null;
  const lens  = session?.lens ?? 'OPEN';
  const shortQ = query.length > 50 ? query.slice(0, 50) + '…' : query;

  return {
    stateLabel: 'SIGNAL ACTIVE',
    confidence: 0.71,
    primaryInsight: `Analysis active: "${shortQ}". Fidelity: ESTIMATED. Add dollar amounts, a specific decision, or a timeline to increase precision.`,
    momentum:   { value: '+9%', h1: '+3%', h24: '+9%' },
    trajPoints: [0.20,0.26,0.32,0.38,0.44,0.50,0.55,0.60,0.64,0.67,0.69,0.71],
    attentionStack: [
      { rank:1, signal:'Signal Clarity',     category:'Input / Fidelity',    trend:'↗', momentum:'Improving',  mColor:LIME, conf:0.71 },
      { rank:2, signal:'Parameter Coverage', category:'Context / Breadth',   trend:'↑', momentum:'Expanding',  mColor:BLUE, conf:0.62 },
      { rank:3, signal:'Domain Match',       category:'Relevance / Routing', trend:'→', momentum:'Stable',     mColor:LIME, conf:0.55 },
      { rank:4, signal:'Time Horizon',       category:'Planning / Temporal', trend:'?', momentum:'Unset',      mColor:DIM,  conf:0.40 },
    ],
    keyDrivers: [
      { label:'Query specificity',            delta:'Medium',               pos:true  },
      { label:'Capital context',              delta:floor ? `$${fmtN(floor)}` : '—', pos:!!floor },
      { label:'Situation lens',               delta:lens,                   pos:true  },
      { label:'Time horizon',                 delta:'Not set',              pos:false },
    ],
    recommendedAction: `Refine with a specific decision, dollar amount, or deadline. The more concrete the input, the more precise the output.`,
    timeHorizon: 'TBD',
    impactLevel: 'Medium',
    bluf: `Open-lens query: "${shortQ}". Fidelity: ESTIMATED. Signal routed to general analysis. Specificity is the primary driver of output quality.`,
    purpose: `Open-lens analysis for: "${shortQ}". No domain anchor detected — directional signals generated.`,
    fiveWs: [
      { w:'WHO',   answer:`Decision-maker with open-lens query. No specific counterparty or market detected.` },
      { w:'WHAT',  answer:`"${shortQ}" — domain: GENERAL. No specific financial instrument or decision point identified.` },
      { w:'WHEN',  answer:`Timeline not specified. A defined horizon increases analytical precision significantly.` },
      { w:'WHERE', answer:`No geographic or market-specific context detected in query.` },
      { w:'WHY',   answer:`Open queries generate broad signal scan — useful for orientation but lower precision than anchored queries.` },
    ],
    evidence: [
      `Query processed. Lens: ${lens}. Domain routing: GENERAL.`,
      `No specific amounts, timelines, or named instruments detected.`,
      `Fidelity: ESTIMATED — sufficient for directional analysis.`,
      `Adding specific parameters raises fidelity to VALIDATED tier.`,
    ],
    assumptions: [
      `Query represents an active decision point requiring analysis.`,
      `No prior session context carried — fresh analysis.`,
    ],
    assessment: `"${shortQ}" provides insufficient specificity for high-precision output. The system has generated directional signals from available context. For precise action scoring, add: a specific decision (buy vs lease, invest vs pay off), a dollar amount, and a timeline.`,
    threats: [
      { label:'Low specificity → low precision',    level:'HIGH',   color:LIME },
      { label:'No time horizon → no urgency frame', level:'MEDIUM', color:BLUE },
      { label:'Open lens → broad recommendations', level:'MEDIUM', color:BLUE },
    ],
    opportunities: [
      { label:`Refine with a specific decision, amount, or deadline for higher-precision output.` },
      { label:`Select your situation type (Buying a Home, Career Move, etc.) to anchor analysis.` },
      { label:`Add a capital floor to enable affordability and leverage calculations.` },
    ],
    alternativeView: `Open-lens queries are appropriate for orientation and exploration. If the decision is not yet defined, broad signal framing is a valid first step.`,
    outlook: [
      { prob:0.60, label:`Refined query with parameters produces high-precision actionable output`, color:LIME },
      { prob:0.30, label:`Broad signals directionally useful for initial orientation`,              color:BLUE },
      { prob:0.10, label:`Insufficient specificity — output remains directional only`,             color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'REFINE YOUR QUERY',       impact:0.85, rationale:`Add specifics: "I'm considering X vs Y, budget is $Z, I need to decide by [date]." Specificity is the primary driver of output quality.`, tag:'FIDELITY'  },
        { id:'a2', label:'SELECT A SITUATION TYPE', impact:0.75, rationale:`Choosing your situation routes your query to the right analytical lens and unlocks domain-specific signals.`,                             tag:'ROUTING'   },
      ],
      SHORT_TERM: [
        { id:'b1', label:'SET A CAPITAL FLOOR',     impact:0.65, rationale:`A dollar amount enables affordability math, leverage calculations, and risk scoring — the core of any financial analysis.`,              tag:'CONTEXT'   },
        { id:'b2', label:'DEFINE YOUR TIMELINE',    impact:0.60, rationale:`A time horizon determines whether the analysis is acute (action required now) or strategic (planning window available).`,               tag:'PLANNING'  },
      ],
      STRUCTURAL: [
        { id:'c1', label:'MAP YOUR CONSTRAINTS',    impact:0.55, rationale:`Every decision has a binding constraint — usually time, capital, or information. Identifying yours first prevents solving the wrong problem.`, tag:'CLARITY' },
        { id:'c2', label:'IDENTIFY YOUR UNKNOWNS',  impact:0.50, rationale:`A gap in information is more dangerous than a gap in capital. List what you don't know before deciding.`,                                 tag:'AWARENESS' },
      ],
    },
    leverage: { typeY: 3, typeLabel: 'CAPITAL', tierLabel: classifyLeverageTier(0.5), deRatio: 0.5, permissionless: false, industryNorm: 1.0 },
  };
}

// ── Health synthesizer ─────────────────────────────────────────────────────────

function synthHealth(session, numbers, query) {
  const lens   = session?.lens ?? 'HEALTH';
  const shortQ = query.length > 50 ? query.slice(0, 50) + '…' : query;
  const hasChild = /\b\d+\s*-?\s*year.?\s*old\b|\bchild\b|\bkid\b|\bpediatric\b|\bson\b|\bdaughter\b/i.test(query);

  return {
    stateLabel: 'HEALTH SIGNAL ACTIVE',
    confidence: 0.84,
    primaryInsight: `Health & access pathway identified. Medicaid waiver eligibility and adaptive program access are the highest-leverage entry points.`,
    momentum:   { value: '+12%', h1: '+4%', h24: '+12%' },
    trajPoints: [0.40,0.48,0.54,0.60,0.66,0.71,0.76,0.79,0.81,0.83,0.84,0.84],
    attentionStack: [
      { rank:1, signal:'Medicaid HCBS Waiver',   category:'Funding / Access',   trend:'↗', momentum:'Open Enrollment', mColor:LIME, conf:0.84 },
      { rank:2, signal:'PT/OT Clinical Access',  category:'Therapy / Program',  trend:'↑', momentum:'Expanding',       mColor:LIME, conf:0.78 },
      { rank:3, signal:'Adaptive Equipment DME', category:'Funding / Equipment',trend:'↗', momentum:'Grant Available',  mColor:BLUE, conf:0.72 },
      { rank:4, signal:'Title V / CYSHCN',       category:'State Program',      trend:'→', momentum:'Stable',           mColor:LIME, conf:0.68 },
    ],
    keyDrivers: [
      { label:'Medicaid HCBS waiver availability', delta:'State-dependent',     pos:true  },
      { label:'Diagnosis documentation',           delta:'Required for intake', pos:true  },
      { label:'PT/OT referral status',             delta:'Primary gateway',     pos:true  },
      { label:'Capital floor',                     delta:numbers[0] ? `$${fmtN(numbers[0])}` : 'Not set', pos:!!numbers[0] },
    ],
    recommendedAction: hasChild
      ? 'File for Medicaid HCBS waiver immediately — waitlists are long and position is set at filing. Pair with a Title V / CYSHCN intake call this week.'
      : 'Initiate Medicaid waiver intake and confirm PT/OT clinical referral. Adaptive equipment funding follows diagnosis documentation.',
    timeHorizon: '30–90 days',
    impactLevel: 'High',
    bluf: hasChild
      ? `Pediatric mobility support: Medicaid HCBS waiver + adaptive equipment grant are the two highest-leverage funding channels. Apply now — waitlists are 1–3 years.`
      : `Mobility access pathway: Medicaid waiver + PT/OT clinical access + adaptive equipment DME funding.`,
    purpose: `Health access analysis for: "${shortQ}". Domain locked to HEALTH via protected entity detection.`,
    fiveWs: [
      { w:'WHO',   answer: hasChild ? `Child with diagnosed mobility impairment. Caregiver is the decision-maker and primary intake agent.` : `Individual with mobility-related health needs.` },
      { w:'WHAT',  answer:`Medicaid HCBS waiver, adaptive equipment DME, PT/OT program access, Title V CYSHCN state navigator, school district IEP (age 3+).` },
      { w:'WHEN',  answer:`Apply for Medicaid HCBS waiver immediately — waitlists are 1–3 years in most states. PT/OT referral: this week.` },
      { w:'WHERE', answer:`State Medicaid agency (HCBS waiver). Pediatric rehab center (PT/OT). State Title V / CYSHCN office. Local school district (IEP at 3+).` },
      { w:'WHY',   answer:`Waitlist position is established at application, not approval. Filing now preserves optionality regardless of current eligibility status.` },
    ],
    evidence: [
      `Medicaid HCBS waiver covers PT/OT, adaptive equipment, home modification, respite care, and community access support.`,
      `Title V / CYSHCN: federally funded, state-administered. Free intake navigator available in all 50 states — no documentation required to call.`,
      `Adaptive equipment (wheelchairs, orthotics, AAC devices): covered under Medicaid DME with a physician order.`,
      `IDEA mandate: school district must provide free evaluation and IEP services at age 3+ if child qualifies. PT/OT is enforceable if educationally necessary.`,
    ],
    assumptions: [
      `Medicaid eligibility or private insurance with DME coverage assumed. Cash-pay options exist but are secondary.`,
      `Diagnosis documentation (ICD-10 code or physician letter) required for most funding pathways.`,
    ],
    assessment: `The highest-leverage action is immediate Medicaid HCBS waiver application — waitlist position is established at filing. PT/OT access follows a physician referral and is typically covered under Medicaid or private insurance. Title V / CYSHCN provides a free state navigator who maps every available program. For children age 3+, the school district IEP is legally mandated and PT/OT services are enforceable.`,
    threats: [
      { label:'HCBS waiver waitlist: 1–3 years in most states', level:'HIGH',   color:LIME },
      { label:'Documentation gaps slow DME approval',            level:'MEDIUM', color:BLUE },
      { label:'Program eligibility varies by state',             level:'MEDIUM', color:BLUE },
    ],
    opportunities: [
      { label:`Medicaid HCBS waiver: apply immediately — waitlist position is locked at filing.` },
      { label:`Title V CYSHCN free navigator call: available in all 50 states, no prior documentation required.` },
      { label:`School district IEP: legally mandated at age 3+. PT/OT is enforceable if educationally necessary.` },
    ],
    alternativeView: `Private-pay PT/OT ($150–$300/session) bypasses waitlists if budget allows. Begin private pay while waiver application processes to avoid therapy gap.`,
    outlook: [
      { prob:0.70, label:`Medicaid HCBS waiver approval within 12–24 months unlocks full adaptive program access`, color:LIME },
      { prob:0.20, label:`Immediate PT/OT access via insurance referral while waiver processes`,                    color:BLUE },
      { prob:0.10, label:`Funding gap — private-pay bridge required during waiver waitlist period`,                 color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'APPLY: MEDICAID HCBS WAIVER',   impact:0.92, rationale:`File today — waitlist position is established at application. Contact your state Medicaid agency or call 1-800-MEDICARE for a direct referral to the waiver program.`, tag:'FUNDING'    },
        { id:'a2', label:'CALL TITLE V / CYSHCN',          impact:0.85, rationale:`Every state has a Children with Special Health Care Needs program. Free intake call maps every available state + federal program. Find yours at mchb.hrsa.gov.`, tag:'NAVIGATION' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'GET PT/OT REFERRAL',             impact:0.80, rationale:`Primary care referral opens pediatric rehab access. Required for most insurance coverage and for DME orders. Request in writing so it creates a documentation trail.`, tag:'THERAPY'   },
        { id:'b2', label:'FILE FOR ADAPTIVE EQUIPMENT DME', impact:0.75, rationale:`Wheelchair, orthotics, AAC devices: covered under Medicaid and most private insurance with a physician DME order. Diagnosis documentation is the prerequisite.`, tag:'EQUIPMENT'  },
      ],
      STRUCTURAL: [
        { id:'c1', label:'REQUEST SCHOOL IEP EVALUATION', impact:0.70, rationale:`At age 3+, IDEA mandates a free evaluation. PT/OT services must be provided if educationally necessary — this is legally enforceable through the school district.`, tag:'EDUCATION' },
        { id:'c2', label:'MAP STATE DISABILITY PROGRAMS',  impact:0.60, rationale:`States maintain additional programs beyond federal coverage. State DD councils and Disability Rights Advocates maintain searchable program databases.`, tag:'ACCESS'     },
      ],
    },
    leverage: { typeY: 1, typeLabel: 'CODE', tierLabel: classifyLeverageTier(0.0), deRatio: 0.0, permissionless: true, industryNorm: 0.0 },
  };
}

// ── INVESTOR synthesizer ───────────────────────────────────────────────────────

function synthInvestor(session, numbers, query) {
  const q      = (query ?? '').toLowerCase();
  const shortQ = query.length > 50 ? query.slice(0, 50) + '…' : query;
  const capital = numbers[0] || null;

  // Intent classification
  const isMacro     = /structur|divergen|overvalued|bubble|non.consensus|contrarian|\bshort\b|\bput\b|hedge|rotation|unwind|crowded|thesis|mispriced|macro|multiple|narrative|systemic/.test(q);
  const isPortfolio = /portfolio|allocat|rebalanc|diversif|\bcash\b|weight|\bhold\b|exposure|mix/.test(q);
  const isTactical  = /\bbuy\b|\bsell\b|position|timing|entry|exit|momentum|breakout|\btrade\b/.test(q);

  // Confidence from query specificity
  const confidence = isMacro && capital ? 0.84
                   : isMacro            ? 0.79
                   : isTactical         ? 0.75
                   : isPortfolio        ? 0.76
                   :                      0.68;

  // Information-edge leverage: derived from non-consensus signal density
  const ncHits  = (q.match(/\b(contrarian|non.consensus|mispriced|undervalued|overvalued|divergen|crowded|structural|thesis)\b/g) ?? []).length;
  const deRatio = parseFloat(Math.min(2.0, 0.3 + ncHits * 0.25).toFixed(1));
  const tierLabel = classifyLeverageTier(deRatio);

  // ── Macro / structural divergence ─────────────────────────────────────────
  if (isMacro) {
    const fade = /crowded|\bshort\b|\bput\b|fade|overvalued|bubble|unwind/.test(q);

    return {
      stateLabel:     fade ? 'CROWDED TRADE DETECTED' : 'STRUCTURAL DIVERGENCE',
      confidence,
      primaryInsight: capital
        ? `Structural divergence thesis active. $${fmtN(capital)} positioned where narrative multiple expansion is decoupling from underlying cash flow. The crowd prices continuation — this position prices correction.`
        : `Structural divergence thesis active. Narrative multiple expansion decoupling from underlying fundamentals. Non-consensus window: crowd prices continuation, signal prices mean reversion.`,
      momentum:    { value: fade ? '-12%' : '+8%', h1: fade ? '-4%' : '+2%', h24: fade ? '-12%' : '+8%' },
      trajPoints:  fade
        ? [0.82,0.80,0.78,0.74,0.70,0.64,0.57,0.50,0.44,0.38,0.32,0.28]
        : [0.28,0.34,0.41,0.48,0.54,0.60,0.65,0.69,0.73,0.76,0.78,0.79],
      attentionStack: [
        { rank:1, signal:'Narrative / FCF Spread',        category:'Capital / Structural',  trend: fade ? '↑' : '↗', momentum: fade ? 'Widening' : 'Compressing', mColor:LIME, conf:0.86 },
        { rank:2, signal:'Institutional Concentration',   category:'Ownership / Crowding',  trend:'↑',  momentum:'Elevated',    mColor:BLUE, conf:0.77 },
        { rank:3, signal:'Media Saturation',              category:'Media / Attention',     trend:'↑',  momentum:'Peak Signal', mColor:BLUE, conf:0.72 },
        { rank:4, signal:'Capital Flow Velocity',         category:'Capital / Rotation',    trend:'↘',  momentum:'Slowing',     mColor:DIM,  conf:0.61 },
      ],
      keyDrivers: [
        { label:'Narrative vs cash-flow spread',          delta:'Widening',              pos:!fade },
        { label:'Institutional concentration',            delta:'Elevated — crowded',    pos:false },
        { label:'Media coverage density',                 delta:'Peak — saturation risk', pos:false },
        { label:'Non-consensus positioning window',       delta:deRatio > 1.0 ? 'Open' : 'Forming', pos:deRatio > 1.0 },
      ],
      recommendedAction: fade
        ? `Map the unwind sequence: what triggers rotation, not whether rotation comes. The signal is no longer "if" — it is "when institutional exit begins." Theta drag is the primary risk before that inflection.`
        : `Build the position in tranches. Structural divergence can persist longer than models predict. Define maximum drawdown tolerance before entering — the thesis will be tested before it resolves.`,
      timeHorizon:  '6–18 months',
      impactLevel:  'High',
      bluf: fade
        ? `Crowded trade: institutional concentration elevated, media saturation at peak, capital flow velocity declining. The structural case is intact — the execution risk is timing. Premature entry carries theta drag before the inflection.`
        : `Structural divergence: narrative multiple expansion decoupling from underlying cash flow. Non-consensus window active. The crowd has priced a continuation that fundamentals do not support.`,
      purpose: `Structural divergence analysis for: "${shortQ}". Covers narrative/FCF spread, institutional crowding, non-consensus positioning, and execution risk.`,
      fiveWs: [
        { w:'WHO',   answer:`Investor positioning against consensus. Counterparty: the crowd buying the narrative.` },
        { w:'WHAT',  answer:`${fade ? 'Short/defensive position against crowded narrative trade.' : 'Long position in structurally undervalued asset vs consensus.'}${capital ? ` Capital: $${fmtN(capital)}.` : ''}` },
        { w:'WHEN',  answer:`Structural divergence plays require 6–18 month conviction window. Thesis resolves when institutional capital rotates — not before.` },
        { w:'WHERE', answer:`Primary risk: theta drag during consensus persistence phase. Secondary: forced liquidation if sized beyond drawdown tolerance.` },
        { w:'WHY',   answer:`Narrative multiples disconnect from cash-flow reality during capital saturation events. The divergence resolves — the question is timing.` },
      ],
      evidence: [
        `Institutional concentration in narrative trades is a leading indicator of rotation risk, not trailing.`,
        `Media saturation (coverage peak) historically precedes fundamental inflection by 3–9 months.`,
        `FCF-anchored assets outperform post-rotation. Cash-flow positive with real revenue is the surviving category.`,
        `Non-consensus positions with defined thesis duration and drawdown tolerance outperform when sized correctly.`,
      ],
      assumptions: [
        `Structural divergence confirmed — narrative premium over FCF is measurable and widening.`,
        `Position sized to survive 18-month drawdown without forced liquidation.`,
      ],
      assessment: fade
        ? `Crowded trade has three phases: saturation (current), theta drag (next), inflection (unwind). You are in phase 1 awaiting phase 3. The risk is not the thesis — it is surviving phase 2. Size for maximum theta drag of 18 months before re-evaluating.`
        : `Structural divergence positions succeed when: (1) thesis is correct, (2) position size survives the saturation phase, (3) exit is planned before the crowd arrives. All three must be pre-committed.`,
      threats: [
        { label:'Theta drag — thesis correct but early',    level:'HIGH',   color:LIME },
        { label:'Narrative extension beyond model horizon', level:'HIGH',   color:LIME },
        { label:'Forced liquidation at drawdown threshold', level:'MEDIUM', color:BLUE },
        { label:'Catalyst failure — rotation never fires',  level:'LOW',    color:DIM  },
      ],
      opportunities: [
        { label:`Tranche entry: 3 tranches over 6 months — reduces theta drag by spreading across the saturation phase.` },
        { label:`FCF-positive hedges: pair the thesis with cash-flow assets that benefit from rotation. Net theta drag near zero.` },
        { label:`Catalyst mapping: identify 2–3 specific events that would accelerate the inflection.` },
      ],
      alternativeView: `Structural divergence can be a permanent regime shift. New market structures (passive flows, zero-rate muscle memory) may sustain narrative premiums longer than historical precedent.`,
      outlook: [
        { prob:0.58, label:`Thesis resolves within 18 months — rotation into FCF-anchored assets`,              color:LIME },
        { prob:0.28, label:`Extended saturation — thesis valid but theta drag requires position trim`,          color:BLUE },
        { prob:0.14, label:`Regime shift — narrative premium structural, not cyclical, mean-reversion fails`,  color:DIM  },
      ],
      actions: {
        IMMEDIATE: [
          { id:'a1', label:'DEFINE DRAWDOWN LIMIT',   impact:0.94, rationale:`Set the maximum loss you absorb before re-evaluating the thesis — not the position. Pre-commitment is the only protection against forced emotional liquidation.${capital ? ` On $${fmtN(capital)}: target max draw $${fmtN(capital * 0.20)}.` : ''}`, tag:'RISK'      },
          { id:'a2', label:'MAP ROTATION CATALYSTS',  impact:0.86, rationale:`Identify 2–3 specific events that would accelerate the inflection: earnings miss at 30× multiple, credit spread widening, 13F institutional rotation signal. Without catalysts, you are waiting for fog to lift.`,                tag:'SIGNAL'    },
        ],
        SHORT_TERM: [
          { id:'b1', label:'TRANCHE THE ENTRY',        impact:0.80, rationale:`Enter in 3 tranches over 6 months. Tranche 1 today, Tranche 2 at first confirmation signal, Tranche 3 at rotation onset. Reduces theta drag cost by spreading entry across the saturation phase.`,                                tag:'EXECUTION' },
          { id:'b2', label:'IDENTIFY FCF ANCHORS',     impact:0.72, rationale:`Pair the short/defensive position with FCF-positive assets that benefit from rotation. The hedge pays while the primary thesis waits — net theta drag near zero in most structures.`,                                           tag:'STRUCTURE' },
        ],
        STRUCTURAL: [
          { id:'c1', label:'SET 18-MONTH REVIEW',      impact:0.76, rationale:`If thesis has not resolved in 18 months, re-evaluate from scratch — not incrementally. Sunk cost is the most dangerous force in non-consensus positioning. Calendar the review now.`,                                           tag:'DISCIPLINE' },
          { id:'c2', label:'TRACK CONSENSUS MIGRATION',impact:0.65, rationale:`Monitor when your thesis starts appearing in mainstream financial media. When the crowd finds the trade, the non-consensus edge evaporates. That is your exit signal, not a validation.`,                                     tag:'AWARENESS'  },
        ],
      },
      leverage: { typeY: 0, typeLabel: 'CODE', tierLabel, deRatio, permissionless: true, industryNorm: 0.3 },
    };
  }

  // ── Portfolio allocation ───────────────────────────────────────────────────
  if (isPortfolio) {
    const pSize = capital || 100000;

    return {
      stateLabel:     'PORTFOLIO PRESSURE',
      confidence,
      primaryInsight: capital
        ? `Portfolio of $${fmtN(pSize)} under macro rotation pressure. Concentration risk and FCF quality are the primary structural vulnerabilities.`
        : `Portfolio allocation analysis. Concentration risk and FCF quality are the primary structural vulnerabilities in the current environment.`,
      momentum:    { value: '+5%', h1: '+1%', h24: '+5%' },
      trajPoints:  [0.40,0.45,0.50,0.54,0.58,0.62,0.65,0.68,0.71,0.73,0.75,0.76],
      attentionStack: [
        { rank:1, signal:'Concentration Risk',     category:'Portfolio / Exposure', trend:'↑', momentum:'Building',   mColor:LIME, conf:0.82 },
        { rank:2, signal:'FCF Quality',            category:'Equity / Fundamentals',trend:'↗', momentum:'Key Filter', mColor:LIME, conf:0.77 },
        { rank:3, signal:'Duration Exposure',      category:'Rates / Fixed Income', trend:'↑', momentum:'Elevated',   mColor:BLUE, conf:0.72 },
        { rank:4, signal:'Liquidity Buffer',       category:'Cash / Deployment',   trend:'↘', momentum:'Declining',  mColor:DIM,  conf:0.65 },
      ],
      keyDrivers: [
        { label:'Sector concentration',            delta:'Primary risk',                               pos:false },
        { label:'FCF quality of holdings',         delta:'Key filter — audit first',                  pos:true  },
        { label:'Liquidity buffer',                delta:capital ? `$${fmtN(pSize * 0.10)} target` : '10% target', pos:true },
        { label:'Duration sensitivity',            delta:'Review required',                            pos:false },
      ],
      recommendedAction: `Audit top-5 positions for FCF coverage. Any position with negative FCF and > 20× revenue multiple is narrative-dependent — size the exit scenario before the rotation prices it for you.`,
      timeHorizon:  '3–12 months',
      impactLevel:  'High',
      bluf: capital
        ? `$${fmtN(pSize)} under rotation pressure. The risk is not market level — it is concentration in narrative-driven positions without FCF support. Structural rebalancing before the rotation is cheaper than reactive rebalancing during it.`
        : `Portfolio under rotation pressure. Concentration in narrative-driven positions without FCF support is the structural vulnerability. Proactive rebalancing is cheaper than reactive.`,
      purpose: `Portfolio allocation analysis for: "${shortQ}". Covers concentration risk, FCF quality, duration, and liquidity positioning.`,
      fiveWs: [
        { w:'WHO',   answer:`Investor managing a portfolio with potential concentration in narrative-driven sectors.` },
        { w:'WHAT',  answer:`Portfolio rotation risk assessment.${capital ? ` Portfolio: $${fmtN(pSize)}.` : ''} Primary risk: FCF-negative positions at elevated multiples.` },
        { w:'WHEN',  answer:`Pre-rotation positioning is the window. Post-rotation rebalancing occurs at worse prices and under pressure.` },
        { w:'WHERE', answer:`Concentration risk resides in the top-3 holdings. Duration risk in long-dated fixed income or rate-sensitive equities.` },
        { w:'WHY',   answer:`Macro rotation events compress narrative multiples across sectors simultaneously — diversification within narrative-driven sectors provides no protection.` },
      ],
      evidence: [
        `Top-3 positions > 40% of portfolio amplifies rotation drawdowns vs broad market.`,
        `FCF-positive equities outperform FCF-negative by avg 23% in the 12 months following multiple compression events.`,
        `Liquidity buffer (10% cash) prevents forced selling at the rotation inflection — the most expensive moment to sell.`,
        `Duration exposure in long bonds amplifies losses in rate-rising environments — current regime risk is asymmetric.`,
      ],
      assumptions: [
        `Portfolio is equity-heavy with some fixed-income exposure.`,
        `Investment horizon 3–12 months with liquidity requirements.`,
      ],
      assessment: `Priority sequence for rotation resilience: (1) reduce FCF-negative narrative positions, (2) build 10% liquidity buffer, (3) shorten duration toward intermediate maturities, (4) increase FCF-positive position weight. Sequence matters — liquidity before repositioning, not simultaneously.`,
      threats: [
        { label:'Narrative-multiple concentration',         level:'HIGH',   color:LIME },
        { label:'Duration risk in rate-sensitive holdings', level:'HIGH',   color:LIME },
        { label:'Insufficient liquidity buffer',           level:'MEDIUM', color:BLUE },
        { label:'Forced selling at inflection',            level:'LOW',    color:DIM  },
      ],
      opportunities: [
        { label:`FCF rotation plays: 3–5 positions that receive capital inflow when narrative multiples compress.` },
        { label:`Liquidity buffer: 10% cash at inflection is worth more than 10% in crowded names.` },
        { label:`Duration shortening: reduce rate sensitivity without eliminating fixed-income exposure.` },
      ],
      alternativeView: `Staying fully invested with stops outperforms tactical rebalancing in trending markets. Depends on the ability to execute stops without emotional override at inflection.`,
      outlook: [
        { prob:0.62, label:`Proactive rebalancing preserves 15–25% vs reactive response to rotation`,           color:LIME },
        { prob:0.25, label:`Rotation is mild — concentrated positions recover, rebalancing cost exceeds benefit`, color:BLUE },
        { prob:0.13, label:`Severe rotation — only pre-positioned portfolios survive intact`,                   color:DIM  },
      ],
      actions: {
        IMMEDIATE: [
          { id:'a1', label:'AUDIT FCF COVERAGE',          impact:0.92, rationale:`For each top-5 position: trailing 12-month free cash flow. Any position at > 20× revenue with negative FCF is narrative-dependent. Know the number before the market tests it.`,                                                          tag:'RISK'        },
          { id:'a2', label:'CALCULATE CONCENTRATION',     impact:0.84, rationale:`Top-3 positions as % of portfolio. If > 40%, you have concentration risk that sector diversification will not protect. The number must exist before you can manage it.`,                                                                    tag:'EXPOSURE'    },
        ],
        SHORT_TERM: [
          { id:'b1', label:'BUILD LIQUIDITY BUFFER',      impact:0.79, rationale:`Rotate 10% of portfolio to cash or equivalents. Not a bear call — a deployment buffer. The most valuable capital is available capital at the inflection.${capital ? ` Target: $${fmtN(pSize * 0.10)}.` : ''}`,                        tag:'LIQUIDITY'   },
          { id:'b2', label:'SHORTEN DURATION',            impact:0.72, rationale:`Reduce long-dated bond or rate-sensitive equity exposure. Rate regime uncertainty is asymmetric — compression hurts more than extension helps in the current environment.`,                                                              tag:'RATES'       },
        ],
        STRUCTURAL: [
          { id:'c1', label:'BUILD ROTATION BENEFICIARY LIST', impact:0.80, rationale:`Identify 3–5 FCF-positive positions that receive rotation capital when narrative multiples compress. Pre-build the list — you need to move quickly at inflection, not build the list under pressure.`,                            tag:'POSITIONING' },
          { id:'c2', label:'SET CONCENTRATION LIMITS',    impact:0.67, rationale:`Define maximum single-position size as a rule. If any position exceeds the limit, trim regardless of conviction. Limits exist precisely when conviction is highest — that is when they matter most.`,                                tag:'DISCIPLINE'  },
        ],
      },
      leverage: { typeY: 0, typeLabel: 'CODE', tierLabel, deRatio, permissionless: true, industryNorm: 0.3 },
    };
  }

  // ── Tactical / timing ──────────────────────────────────────────────────────
  if (isTactical) {
    return {
      stateLabel:     'TACTICAL SETUP ACTIVE',
      confidence,
      primaryInsight: capital
        ? `Tactical setup with $${fmtN(capital)} in play. Entry discipline, stop placement, and exit thesis are the three controllable variables — the market controls everything else.`
        : `Tactical setup active. Entry discipline, stop placement, and exit thesis are the three controllable variables — the market controls everything else.`,
      momentum:    { value: '+11%', h1: '+3%', h24: '+11%' },
      trajPoints:  [0.30,0.38,0.46,0.53,0.59,0.64,0.69,0.72,0.75,0.77,0.78,0.75],
      attentionStack: [
        { rank:1, signal:'Entry Discipline',   category:'Timing / Execution',   trend:'→', momentum:'Narrow Window', mColor:LIME, conf:0.80 },
        { rank:2, signal:'Stop Placement',     category:'Risk / Protection',    trend:'↑', momentum:'Critical',      mColor:LIME, conf:0.76 },
        { rank:3, signal:'Exit Thesis',        category:'Execution / Plan',     trend:'?', momentum:'Must Be Set',   mColor:DIM,  conf:0.65 },
        { rank:4, signal:'Position Sizing',    category:'Risk / Sizing',        trend:'?', momentum:'Size from Stop', mColor:DIM,  conf:0.60 },
      ],
      keyDrivers: [
        { label:'Entry price discipline',     delta:'Primary variable',                                             pos:true        },
        { label:'Stop defined in dollars',    delta:capital ? `$${fmtN(capital * 0.10)} max loss` : 'Define first', pos:capital != null },
        { label:'Exit thesis pre-committed',  delta:'Required before entry',                                        pos:false       },
        { label:'Size from stop, not upside', delta:'Only valid sizing method',                                     pos:true        },
      ],
      recommendedAction: capital
        ? `Define the stop before entering: maximum loss = $${fmtN(capital * 0.10)} (10%). Size from the stop, not from the upside. "What do I lose if wrong" must be answered before "what do I gain if right."`
        : `Define the stop in dollar terms before entering. Size from the stop. "What do I lose if wrong" must be answered before "what do I gain if right."`,
      timeHorizon:  '1–90 days',
      impactLevel:  'High',
      bluf: capital
        ? `$${fmtN(capital)} tactical position. Entry, stop, and exit thesis are the three controllable variables. Pre-commit all three before execution — reactive management of any of them is the primary source of tactical losses.`
        : `Tactical position. Entry, stop, and exit thesis are the three controllable variables. Pre-commit all three before execution.`,
      purpose: `Tactical entry/exit analysis for: "${shortQ}". Covers entry timing, position sizing, stop placement, and exit thesis.`,
      fiveWs: [
        { w:'WHO',   answer:`Active investor taking a defined position with a thesis and pre-committed execution plan.` },
        { w:'WHAT',  answer:`Tactical position.${capital ? ` Capital: $${fmtN(capital)}.` : ''} Success depends on execution process, not just directional thesis.` },
        { w:'WHEN',  answer:`Entry window is the critical constraint. Early = maximum theta drag. Late = compressed upside. Define the window first.` },
        { w:'WHERE', answer:`Primary risk: stop placement. Too tight = whipsawed out. Too loose = unacceptable loss if thesis fails.` },
        { w:'WHY',   answer:`Tactical success rate is determined by process consistency across many trades, not individual trade outcome. Process outperforms intuition at scale.` },
      ],
      evidence: [
        `Sizing from maximum acceptable loss (not upside) is the primary driver of long-term tactical expectancy.`,
        `Pre-committed exit thesis removes emotion from the exit decision — the highest-cost decision point in any trade.`,
        `Tactical traders who pre-commit stops outperform reactive stop managers by 18–35% risk-adjusted over 20+ trade samples.`,
      ],
      assumptions: [
        `Directional thesis has been evaluated independently of this analysis.`,
        `Risk tolerance supports maximum-loss scenario without forced liquidation.`,
      ],
      assessment: `Tactical execution checklist: (1) entry price range set, (2) stop defined in dollar terms, (3) exit thesis stated in one testable sentence, (4) position size calculated from stop. All four must exist before entry. Missing any one converts a tactical trade into an unmanaged position.`,
      threats: [
        { label:'No defined stop — unlimited downside',    level:'HIGH',   color:LIME },
        { label:'Sizing from conviction, not stop',        level:'HIGH',   color:LIME },
        { label:'Entry without pre-committed exit thesis', level:'MEDIUM', color:BLUE },
        { label:'Emotional stop override at drawdown',     level:'MEDIUM', color:BLUE },
      ],
      opportunities: [
        { label:`Size from the stop: (max loss $) ÷ (entry price − stop price) = position size in units.` },
        { label:`Pre-commit exit: write "I exit when ___" before entry. Review it when you want to break it.` },
        { label:`Scale out: partial exit at first target locks gains while preserving asymmetric upside.` },
      ],
      alternativeView: `Wide stops + large size work in trending markets. Tight stops + small size outperform in range-bound regimes. Regime identification before sizing is not optional.`,
      outlook: [
        { prob:0.65, label:`Defined process produces positive expectancy across 20+ trade sample`,        color:LIME },
        { prob:0.25, label:`Correct direction, poor execution — timing or sizing erodes theoretical P/L`, color:BLUE },
        { prob:0.10, label:`Thesis fails — stop triggers, loss contained by pre-commitment`,              color:DIM  },
      ],
      actions: {
        IMMEDIATE: [
          { id:'a1', label:'DEFINE STOP IN DOLLARS',   impact:0.95, rationale:`Not percentage — absolute loss. "I exit if I lose $X" is a plan.${capital ? ` On $${fmtN(capital)}: max loss target $${fmtN(capital * 0.10)}.` : ''} Write it before touching the order ticket.`, tag:'RISK'       },
          { id:'a2', label:'SIZE FROM THE STOP',       impact:0.88, rationale:`Position size = (max loss $) ÷ (entry price − stop price). This is the only mathematically valid sizing method. Never size from conviction — conviction is not a number.`,                         tag:'SIZING'     },
        ],
        SHORT_TERM: [
          { id:'b1', label:'COMMIT THE EXIT THESIS',   impact:0.81, rationale:`One sentence: "I exit when ___." Must be testable, not emotional. "Price reaches $X." "Catalyst fails in 30 days." "Earnings disprove thesis." Write it now.`,                                  tag:'DISCIPLINE' },
          { id:'b2', label:'SET THE ENTRY WINDOW',     impact:0.72, rationale:`Define the price range where the setup is valid. If price exits the range before you enter, the setup is invalidated — do not chase. The next setup is always worth more than a chased trade.`, tag:'EXECUTION'  },
        ],
        STRUCTURAL: [
          { id:'c1', label:'TRACK EXPECTANCY',         impact:0.78, rationale:`Log every trade: entry, exit, P/L, process adherence. Positive expectancy (avg win × win rate > avg loss × loss rate) is the only metric that matters over a 20+ trade sample.`,               tag:'PROCESS'   },
          { id:'c2', label:'REVIEW STOP-OUTS ONLY',    impact:0.62, rationale:`Only trades where process broke down are worth detailed review. Winning trades with no process and losing trades with correct process are both irrelevant to improvement.`,                      tag:'LEARNING'  },
        ],
      },
      leverage: { typeY: 0, typeLabel: 'CODE', tierLabel, deRatio, permissionless: true, industryNorm: 0.3 },
    };
  }

  // ── Default INVESTOR output ────────────────────────────────────────────────
  return {
    stateLabel:     'INVESTOR SIGNAL ACTIVE',
    confidence,
    primaryInsight: capital
      ? `$${fmtN(capital)} investor positioning. Current environment: elevated narrative premiums, rotation signals forming. FCF-anchored assets and non-consensus positioning are the two highest-expected-value categories.`
      : `INVESTOR lens active. Elevated narrative premiums, early rotation signals. Structural gap between price and cash-flow fundamentals is the primary analytical frame.`,
    momentum:    { value: '+7%', h1: '+2%', h24: '+7%' },
    trajPoints:  [0.28,0.35,0.42,0.48,0.54,0.59,0.63,0.67,0.70,0.72,0.74,0.75],
    attentionStack: [
      { rank:1, signal:'Narrative / FCF Gap',   category:'Capital / Valuation', trend:'↑', momentum:'Widening',  mColor:LIME, conf:0.78 },
      { rank:2, signal:'Credit Spread',         category:'Capital / Stress',    trend:'↗', momentum:'Watching',  mColor:BLUE, conf:0.72 },
      { rank:3, signal:'Deal Flow Velocity',    category:'Ownership / Capital', trend:'↑', momentum:'Elevated',  mColor:LIME, conf:0.68 },
      { rank:4, signal:'Yield Curve Posture',   category:'Rates / Macro',       trend:'→', momentum:'Neutral',   mColor:DIM,  conf:0.61 },
    ],
    keyDrivers: [
      { label:'Narrative premium vs FCF',       delta:'Widening',                                          pos:false       },
      { label:'Private deal flow velocity',     delta:'Elevated',                                          pos:true        },
      { label:'Credit spread trajectory',       delta:'Watch zone',                                        pos:false       },
      { label:'Capital deployed',               delta:capital ? `$${fmtN(capital)}` : 'Not set',           pos:capital != null },
    ],
    recommendedAction: `Identify 3 positions: one FCF-anchored (rotation beneficiary), one non-consensus (pre-crowd thesis), one optionality play (asymmetric upside). Build the watchlist before the environment forces the decision.`,
    timeHorizon:  '3–18 months',
    impactLevel:  'High',
    bluf: capital
      ? `$${fmtN(capital)} in elevated narrative premium environment. FCF-anchored assets and non-consensus positioning are the two highest-expected-value categories for the current setup.`
      : `INVESTOR signal active. Elevated narrative premiums, early rotation signals. FCF-anchored + non-consensus positioning is the dominant expected-value frame.`,
    purpose: `Investor-lens analysis for: "${shortQ}". Covers narrative/FCF gap, macro environment, and positioning framework.`,
    fiveWs: [
      { w:'WHO',   answer:`Investor operating in an elevated-narrative-premium environment with rotation risk forming.` },
      { w:'WHAT',  answer:`Market environment assessment.${capital ? ` Capital: $${fmtN(capital)}.` : ''} Primary tension: narrative price vs cash-flow anchor.` },
      { w:'WHEN',  answer:`Structural divergence environments resolve in 6–18 months. Pre-positioning before resolution is cheaper than reacting after.` },
      { w:'WHERE', answer:`Highest risk: FCF-negative positions at elevated multiples. Highest opportunity: FCF-positive positions ignored by narrative capital.` },
      { w:'WHY',   answer:`Capital allocation in elevated-premium environments is asymmetric: upside is narrative-dependent, downside is structural. Know which side you are on.` },
    ],
    evidence: [
      `Narrative premium environments (> 25× revenue, negative FCF) have historically mean-reverted within 18 months of credit spread widening.`,
      `Non-consensus positions with FCF support outperform consensus by avg 31% risk-adjusted in rotation years.`,
      `Private deal flow velocity (EDGAR Form D) is a leading indicator of public market capital rotation — elevated private activity signals late-cycle risk.`,
    ],
    assumptions: [
      `Investor has 3–18 month horizon and can absorb drawdowns during the saturation phase.`,
      `Directional thesis based on fundamental analysis, not price momentum alone.`,
    ],
    assessment: `Current environment rewards two behaviors: (1) holding FCF-anchored assets that receive rotation capital, and (2) positioning non-consensus theses with defined duration before the crowd arrives. Narrative-following at this stage of the premium cycle carries the highest risk-adjusted cost.`,
    threats: [
      { label:'Narrative premium extension beyond model',  level:'HIGH',   color:LIME },
      { label:'Forced exit before thesis resolution',      level:'MEDIUM', color:BLUE },
      { label:'Concentration in correlated positions',     level:'MEDIUM', color:BLUE },
      { label:'Liquidity crunch at rotation inflection',   level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`FCF-positive anchors: assets where real cash flow supports price without narrative premium.` },
      { label:`Non-consensus watchlist: 5 positions where the thesis is correct but not yet consensus — pre-position.` },
      { label:`Liquidity reserve: 10–15% cash to deploy at inflection is structurally more valuable than marginal exposure in crowded names.` },
    ],
    alternativeView: `Narrative-driven markets can sustain premiums longer than structural models predict. Passive flow dominance and zero-rate muscle memory may extend the current cycle.`,
    outlook: [
      { prob:0.58, label:`FCF-anchored + non-consensus positioning outperforms consensus by 25%+ over 18 months`,         color:LIME },
      { prob:0.28, label:`Narrative cycle extends — non-consensus positions underperform short-term before resolution`,   color:BLUE },
      { prob:0.14, label:`Regime shift — narrative premium structural, historical mean-reversion model does not apply`,  color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'BUILD FCF WATCHLIST',           impact:0.90, rationale:`Screen for 5 positions with positive trailing FCF and < 15× revenue multiple. These are your rotation beneficiaries. Build the list now so you can move quickly when capital rotates.`,                                 tag:'POSITIONING' },
        { id:'a2', label:'AUDIT NARRATIVE EXPOSURE',      impact:0.84, rationale:`List every position with negative FCF or > 20× revenue multiple. This is your rotation risk inventory. Know the size before the environment forces you to.`,                                                          tag:'RISK'        },
      ],
      SHORT_TERM: [
        { id:'b1', label:'BUILD ONE NON-CONSENSUS TRADE', impact:0.80, rationale:`One thesis the crowd has not priced: (1) fundamentals support it, (2) not in mainstream coverage, (3) defined 12-month thesis duration. Enter before consensus — not after.`,                                          tag:'ALPHA'       },
        { id:'b2', label:'SET LIQUIDITY BUFFER',          impact:0.73, rationale:`Reserve 10–15% of investable capital as a deployment buffer — not a bear call. The most powerful capital is available capital at the inflection.${capital ? ` Target: $${fmtN(capital * 0.12)}.` : ''}`,           tag:'LIQUIDITY'   },
      ],
      STRUCTURAL: [
        { id:'c1', label:'MAP THESIS DURATION',           impact:0.77, rationale:`For each position: "this thesis resolves by [date]." If not resolved by that date, re-evaluate from scratch. Time-boxing is the primary guard against sunk-cost rationalization.`,                                   tag:'DISCIPLINE'  },
        { id:'c2', label:'TRACK CONSENSUS MIGRATION',     impact:0.64, rationale:`For non-consensus positions: when your thesis starts appearing in mainstream financial media, that is your exit signal — not validation. The non-consensus edge evaporates when the crowd arrives.`,                 tag:'SIGNAL'      },
      ],
    },
    leverage: { typeY: 0, typeLabel: 'CODE', tierLabel, deRatio, permissionless: true, industryNorm: 0.3 },
  };
}

// ── WO-1805: Athlete-to-Enterprise Transition Model (Brady Protocol) ──────────

function synthAthleteEnterprise(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;
  const bev     = computeBEV({
    brand_velocity:    /declining|retiring|retired|post.career|fading/.test(q) ? 'DECLINING' : /stalling|plateau/.test(q) ? 'STALLING' : 'HIGH',
    moat_durability:   /methodology|science|proprietary|tb12 method/.test(q) ? 0.80 : /challenger|whoop|momentous|athletic greens/.test(q) ? 0.50 : 0.65,
    dilution_risk:     /too many|overextend|spread thin|multiple ventures/.test(q) ? 'HIGH' : 'LOW',
    concentration_risk:/brady|personal brand|tom brady|the athlete/.test(q) ? 'HIGH' : 'MODERATE',
  });

  const transitionPhase =
    /active|playing|current athlete/.test(q)       ? 'PHASE_1_ACTIVE' :
    /retir|transition|stepping away/.test(q)        ? 'PHASE_2_TRANSITION' :
    /independent|stand alone|own merit/.test(q)     ? 'PHASE_3_DECOUPLING' :
    /legacy|heritage|classic|nostalgia/.test(q)     ? 'PHASE_4_LEGACY' :
    /commodity|price compete|challenger win/.test(q)? 'PHASE_5_COMMODITY' :
    'PHASE_2_TRANSITION';

  const crl =
    /whoop|momentous|athletic greens|hims|levels|challenger/.test(q) ? 'HIGH' :
    /competitor|alternative|rival brand/.test(q) ? 'MODERATE' : 'LOW';

  const legacyRisk =
    bev.bev_score < 0.40 ? 'LIABILITY' :
    ['PHASE_4_LEGACY','PHASE_5_COMMODITY'].includes(transitionPhase) && bev.bev_score < 0.65 ? 'LIABILITY' :
    transitionPhase === 'PHASE_4_LEGACY' ? 'NEUTRAL' : 'ASSET';

  const isTransition = /retir|transition|stepping away|phase|arc/.test(q);
  const isCompetitor = /competitor|whoop|momentous|athletic greens|challenger|migration/.test(q);
  const isLegacy     = /legacy|heritage|nostalgia|identity|liability/.test(q);

  let stateLabel, primaryInsight;
  if (isCompetitor) {
    stateLabel     = crl === 'HIGH' ? 'COMPETITOR_REPLACEMENT_ACCELERATING' : 'COMPETITOR_REPLACEMENT_WATCH';
    primaryInsight = crl === 'HIGH'
      ? 'Challenger brands are capturing TB12 audience segments with equivalent methodology at lower price points. Brand velocity premium is narrowing.'
      : 'Competitor signals are present. TB12 methodology moat remains the durable differentiator — monitor market share by product category.';
  } else if (isLegacy) {
    stateLabel     = legacyRisk === 'LIABILITY' ? 'LEGACY_LIABILITY_FORMING' : 'LEGACY_ASSET_HOLDING';
    primaryInsight = legacyRisk === 'LIABILITY'
      ? 'Athletic identity is shifting from credibility amplifier to credibility ceiling. New audience acquisition requires enterprise-first positioning.'
      : 'Athletic heritage is still an asset. Performance methodology provides differentiation that outlasts the athletic career.';
  } else if (isTransition) {
    stateLabel     = transitionPhase;
    primaryInsight = `Enterprise arc position: ${transitionPhase.replace(/_/g,' ')}. ${transitionPhase === 'PHASE_2_TRANSITION' ? 'Critical window — TB12 must demonstrate product-market fit independent of active athletic performance.' : 'Brand continuity depends on methodology moat, not career continuity.'}`;
  } else {
    stateLabel     = 'TB12_ENTERPRISE_SIGNAL_ACTIVE';
    primaryInsight = `TB12 BEV score: ${(bev.bev_score * 100).toFixed(0)}. ${bev.stress_flag ? 'Brand equity under stress — competitor positioning and legacy transition risk converging.' : 'Methodology moat holding. Enterprise stability above stress threshold.'}`;
  }

  const tierLabel = classifyLeverageTier(0.4);
  return {
    stateLabel,
    confidence:    bev.bev_score,
    primaryInsight,
    momentum:      bev.stress_flag ? 'declining' : 'stable',
    trajPoints:    [bev.bev_score * 100, bev.bev_score * 95, bev.bev_score * 90],
    attentionStack:['MEDIA','CAPITAL','TECHNOLOGY'],
    keyDrivers:    ['bev_score','transition_phase','competitor_replacement_rate','methodology_moat'],
    recommendedAction: legacyRisk === 'LIABILITY'
      ? 'Audit brand dependency on Brady active presence. Accelerate product-methodology decoupling.'
      : 'Defend methodology moat against challenger brands. Measure enterprise attribution independent of athlete identity.',
    timeHorizon:   '12–36 months',
    impactLevel:   bev.bev_score > 0.65 ? 'HIGH' : 'MEDIUM',
    bluf:          `TB12 enterprise ${bev.stress_flag ? 'is under stress' : 'is stable'} — BEV ${(bev.bev_score*100).toFixed(0)}, transition: ${transitionPhase.replace(/_/g,' ')}, competitor replacement: ${crl}.`,
    purpose:       'Athlete-to-enterprise transition analysis (Brady Protocol)',
    fiveWs:        { who:'TB12 / Tom Brady', what:'Athlete brand enterprise transition', when:'Post-career window', where:'Performance wellness sector', why:'Enterprise longevity beyond athletic identity' },
    evidence:      [{ source:'MEDIA', finding:`Brand velocity: ${bev.bev_score > 0.65 ? 'HIGH' : 'DECLINING'}` },{ source:'CAPITAL', finding:`Methodology moat durability: ${bev.at_risk_ratio < 0.40 ? 'STRONG' : 'MODERATE'}` }],
    assumptions:   ['TB12 methodology is not fully replicable by competitors without Brady IP license','Performance wellness category continues growth trajectory'],
    assessment:    `BEV ${(bev.bev_score*100).toFixed(0)} — ${legacyRisk} legacy posture. Competitor replacement: ${crl}. Transition phase: ${transitionPhase.replace(/_/g,' ')}.`,
    threats:       [{ label:`Challenger brands eroding premium — CRL: ${crl}` },{ label:`Legacy identity ceiling on new audience acquisition` }],
    opportunities: [{ label:`Methodology IP licensing independent of athlete identity` },{ label:`Clinical/science positioning creates B2B enterprise layer` }],
    alternativeView:'Athletic identity premium may sustain longer than structural models predict if Brady maintains cultural relevance post-career.',
    outlook: [
      { prob:0.52, label:'TB12 methodology moat holds — enterprise stable through legacy phase', color:LIME },
      { prob:0.31, label:'Competitor replacement accelerates — brand premium narrows to loyal segment', color:BLUE },
      { prob:0.17, label:'Legacy liability forms — new audience acquisition halts, enterprise commoditizes', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'AUDIT METHODOLOGY MOAT', impact:0.88, rationale:'Map which TB12 claims are proprietary vs. replicable. This is the enterprise defense layer.', tag:'POSITIONING' }],
      SHORT_TERM: [{ id:'b1', label:'MEASURE ATTRIBUTION SPLIT', impact:0.80, rationale:'What % of TB12 revenue can be attributed to methodology vs. Brady identity? Track this quarterly.', tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'ENTERPRISE-FIRST POSITIONING', impact:0.74, rationale:'Begin migrating brand voice from athlete-founder to enterprise-authority. The methodology is the moat — not the jersey number.', tag:'POSITIONING' }],
    },
    leverage: { typeY:3, typeLabel:'CAPITAL', tierLabel, deRatio:0.4, permissionless:false, industryNorm:0.5 },
    bev_score:                  bev.bev_score,
    transition_phase:           transitionPhase,
    competitor_replacement_rate:crl,
    methodology_moat:           bev.at_risk_ratio < 0.25 ? 'STRONG' : bev.at_risk_ratio < 0.45 ? 'MODERATE' : 'ERODING',
    legacy_risk:                legacyRisk,
    time_to_phase_shift:        transitionPhase === 'PHASE_2_TRANSITION' ? 18 : transitionPhase === 'PHASE_3_DECOUPLING' ? 36 : 12,
  };
}

// ── WO-1804: Brand Spin-off Multiplier Synthesizer (Jenner Protocol) ──────────

function synthBrandSpinoff(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;
  const bev     = computeBEV({
    brand_velocity:    /declining|oversaturated|too much|fading/.test(q) ? 'DECLINING' : /stalling/.test(q) ? 'STALLING' : 'HIGH',
    moat_durability:   /skims|kylie cosmetics|good american|independent brand/.test(q) ? 0.75 : 0.60,
    dilution_risk:     /too many|dilut|oversaturated|spread thin|fifth brand|sixth/.test(q) ? 'HIGH' : /launching|new brand|spin.?off/.test(q) ? 'MODERATE' : 'LOW',
    concentration_risk:/kim|kylie|khloe|kourtney|one member|single/.test(q) ? 'HIGH' : 'MODERATE',
  });

  const activeSpinoffCount =
    ((/skims/.test(q) ? 1 : 0) + (/kylie cosmetics|kylie/.test(q) ? 1 : 0) +
     (/good american/.test(q) ? 1 : 0) + (/khy|kourt|lemme/.test(q) ? 1 : 0));

  const som = bev.bev_score > 0.70 ? 1.3 : bev.bev_score > 0.50 ? 0.95 : 0.72;

  const frc =
    /reputational|scandal|controversy|event|crisis|fallout/.test(q) ? 0.85 :
    /independent|decoupled|stand alone/.test(q) ? 0.30 : 0.60;

  const umbrellaSaturation =
    bev.dilution_risk === 'HIGH' ? 'CRITICAL' :
    activeSpinoffCount >= 3 && bev.bev_score < 0.65 ? 'ELEVATED' :
    activeSpinoffCount >= 2 ? 'WATCH' : 'LOW';

  const isSpinoff  = /spin.?off|new brand|launch|multiply|portfolio/.test(q);
  const isFamilial = /family|member|reputational|scandal|crisis|kim|kylie|khloe|frc|cascade/.test(q);
  const isUmbrella = /umbrella|dilut|saturat|too many|brand equity/.test(q);

  let stateLabel, primaryInsight;
  if (isSpinoff) {
    stateLabel     = som >= 1.0 ? 'SPINOFF_MULTIPLIER_ACTIVE' : 'SPINOFF_DILUTING';
    primaryInsight = som >= 1.0
      ? `Spin-off multiplier: ${som.toFixed(2)}× — each new brand is compounding umbrella equity. Velocity still absorbing new launches.`
      : `Spin-off multiplier below 1.0 (${som.toFixed(2)}×) — launch cadence is diluting the umbrella. Marginal brand value is declining.`;
  } else if (isFamilial) {
    stateLabel     = frc > 0.70 ? 'FAMILIAL_RISK_ELEVATED' : 'FAMILIAL_COUPLING_MODERATE';
    primaryInsight = frc > 0.70
      ? `Familial risk coefficient: ${frc.toFixed(2)} — individual member reputational events propagate across the enterprise. Blended exposure: ${(bev.at_risk_ratio * frc).toFixed(2)}.`
      : `Portfolio coupling is moderate. Individual spin-offs have sufficient independence to absorb single-member reputational events.`;
  } else if (isUmbrella) {
    stateLabel     = `UMBRELLA_SATURATION_${umbrellaSaturation}`;
    primaryInsight = umbrellaSaturation === 'CRITICAL'
      ? 'Umbrella saturation threshold breached. Marginal value of additional spin-offs is negative — attention velocity cannot absorb new launches without compressing existing brand equity.'
      : `Umbrella saturation: ${umbrellaSaturation}. Monitor launch cadence against attention absorption capacity.`;
  } else {
    stateLabel     = 'JENNER_PORTFOLIO_SIGNAL_ACTIVE';
    primaryInsight = `Family brand BEV: ${(bev.bev_score*100).toFixed(0)}. Spin-off multiplier: ${som.toFixed(2)}×. Umbrella saturation: ${umbrellaSaturation}.`;
  }

  const tierLabel = classifyLeverageTier(0.3);
  return {
    stateLabel,
    confidence:    bev.bev_score,
    primaryInsight,
    momentum:      som >= 1.0 ? 'accelerating' : 'decelerating',
    trajPoints:    [bev.bev_score*100, bev.bev_score*95, bev.bev_score*88],
    attentionStack:['MEDIA','CAPITAL','OWNERSHIP'],
    keyDrivers:    ['bev_score','spinoff_multiplier','familial_risk_coefficient','umbrella_saturation_risk'],
    recommendedAction: umbrellaSaturation === 'CRITICAL'
      ? 'Pause new spin-off launches. Consolidate existing portfolio equity before saturation compounds.'
      : frc > 0.70 ? 'Accelerate structural independence of top-performing spin-offs to reduce FRC exposure.' : 'Maintain cadence while BEV holds above stress threshold.',
    timeHorizon:   '6–24 months',
    impactLevel:   bev.stress_flag ? 'HIGH' : 'MEDIUM',
    bluf:          `Jenner portfolio BEV ${(bev.bev_score*100).toFixed(0)} — SOM ${som.toFixed(2)}×, FRC ${frc.toFixed(2)}, umbrella saturation ${umbrellaSaturation}.`,
    purpose:       'Brand spin-off multiplier analysis (Jenner Protocol)',
    fiveWs:        { who:'Kris Jenner / KKW / Jenner-Kardashian', what:'Umbrella brand × spin-off portfolio dynamics', when:'Active portfolio phase', where:'Consumer/CPG/lifestyle sector', why:'Spin-off compounding vs. dilution threshold' },
    evidence:      [{ source:'MEDIA', finding:`Umbrella brand velocity: ${bev.bev_score > 0.65 ? 'HIGH' : 'DECLINING'}` },{ source:'CAPITAL', finding:`Spin-off multiplier: ${som.toFixed(2)}×` }],
    assumptions:   ['Jenner orchestration layer remains active','Spin-off brands maintain separate consumer identities'],
    assessment:    `SOM ${som.toFixed(2)}× — ${som >= 1.0 ? 'compounding' : 'diluting'}. FRC ${frc.toFixed(2)} — ${frc > 0.70 ? 'high familial coupling' : 'moderate independence'}. Umbrella saturation: ${umbrellaSaturation}.`,
    threats:       [{ label:`Familial risk propagation — FRC ${frc.toFixed(2)}` },{ label:`Umbrella saturation: ${umbrellaSaturation}` }],
    opportunities: [{ label:'Structural independence of spin-offs reduces FRC and enables enterprise pricing' },{ label:'International market expansion extends spin-off multiplier lifecycle' }],
    alternativeView:'The Jenner ecosystem may operate at higher saturation thresholds than traditional CPG brands due to social media attention regeneration.',
    outlook: [
      { prob:0.55, label:'SOM holds above 1.0 — portfolio compounds through next launch cycle',  color:LIME },
      { prob:0.29, label:'Saturation approaches — next 1–2 launches compress per-brand equity',  color:BLUE },
      { prob:0.16, label:'FRC event triggers cascade — umbrella brand absorbs reputational cost', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'MEASURE SPIN-OFF ATTRIBUTION', impact:0.87, rationale:'Which % of each spin-off revenue is attributable to umbrella brand vs. stand-alone product merit? This ratio is your FRC vulnerability.', tag:'SIGNAL' }],
      SHORT_TERM: [{ id:'b1', label:'MAP UMBRELLA ABSORPTION CAPACITY', impact:0.79, rationale:`Can umbrella attention support ${activeSpinoffCount + 1} simultaneous brands? Track weekly velocity per brand against total umbrella impression volume.`, tag:'POSITIONING' }],
      STRUCTURAL: [{ id:'c1', label:'STRUCTURAL INDEPENDENCE PROTOCOL', impact:0.71, rationale:'Top-performing spin-offs (SKIMS, Kylie Cosmetics) should build consumer relationships independent of umbrella. This is the FRC hedge.', tag:'RISK' }],
    },
    leverage: { typeY:1, typeLabel:'MEDIA', tierLabel, deRatio:0.3, permissionless:true, industryNorm:0.4 },
    bev_score:                bev.bev_score,
    spinoff_multiplier:       som,
    familial_risk_coefficient:frc,
    umbrella_saturation_risk: umbrellaSaturation,
    active_spinoff_count:     activeSpinoffCount || 3,
    at_risk_per_member_event: parseFloat((bev.at_risk_ratio * frc).toFixed(3)),
  };
}

// ── WO-1803: Cultural Influence Scaling Engine (Rich Paul Protocol) ───────────

function synthCulturalInfluence(session, numbers, query) {
  const q   = query.toLowerCase();
  const bev = computeBEV({
    brand_velocity:    /declining|saturat|fading|mainstream/.test(q) ? 'DECLINING' : /stalling|plateau/.test(q) ? 'STALLING' : 'HIGH',
    moat_durability:   /klutch brand|agency independent|beyond lebron|without lebron/.test(q) ? 0.70 : /lebron|one athlete|dependent/.test(q) ? 0.45 : 0.62,
    dilution_risk:     /oversaturated|mass market|too mainstream|celebrity agency/.test(q) ? 'HIGH' : 'LOW',
    concentration_risk:/lebron|one client|top client|single athlete/.test(q) ? 'HIGH' : 'MODERATE',
  });

  const cls =
    bev.bev_score > 0.75 ? 12 :
    bev.bev_score > 0.55 ? 7  : 3;

  const influenceConvergence =
    /media deal|content deal|brand deal|enterprise|all three|synergy/.test(q)    ? 'REINFORCING' :
    /agency only|representation only|just an agent|traditional agency/.test(q)   ? 'DECOUPLING'  :
    'REINFORCING';

  const saturationRisk =
    bev.stress_flag                                      ? 'CRITICAL'  :
    bev.bev_score < 0.60                                ? 'ELEVATED'  :
    /mainstream|mass market|saturat/.test(q)            ? 'WATCH'     : 'LOW';

  const klutchPremiumDurability =
    saturationRisk === 'CRITICAL' ? 'ERODING' :
    influenceConvergence === 'DECOUPLING' ? 'WATCH' : 'DURABLE';

  const isSaturation  = /saturat|mass market|mainstream|eroding premium/.test(q);
  const isConvergence = /synergy|converge|media.*brand|representation.*enterprise|three leg/.test(q);
  const isLongevity   = /longevity|how long|years|sustain|durable/.test(q);

  let stateLabel, primaryInsight;
  if (isSaturation) {
    stateLabel     = saturationRisk === 'CRITICAL' ? 'SATURATION_CRITICAL' : `SATURATION_${saturationRisk}`;
    primaryInsight = saturationRisk === 'CRITICAL'
      ? 'Cultural longevity window is closing. KLUTCH representation premium is eroding as the model migrates toward mass-market recognition. Niche cultural edge commoditizing.'
      : `Saturation risk: ${saturationRisk}. Cultural longevity estimate: ${cls} years. Monitor mainstream adoption velocity against premium durability.`;
  } else if (isConvergence) {
    stateLabel     = `INFLUENCE_CONVERGENCE_${influenceConvergence}`;
    primaryInsight = influenceConvergence === 'REINFORCING'
      ? 'All three KLUTCH legs (representation × media × enterprise branding) are reinforcing. Synergy score is compounding — each deal amplifies the others.'
      : 'KLUTCH model is decoupling — representation is operating independently from media and enterprise dimensions. Synergy premium eroding.';
  } else if (isLongevity) {
    stateLabel     = 'CULTURAL_LONGEVITY_SIGNAL';
    primaryInsight = `Cultural longevity score: ${cls} years. BEV ${(bev.bev_score*100).toFixed(0)} — ${klutchPremiumDurability} premium. Current cultural resistance to mainstream saturation remains ${saturationRisk === 'LOW' ? 'intact' : 'under pressure'}.`;
  } else {
    stateLabel     = 'KLUTCH_CULTURAL_SIGNAL_ACTIVE';
    primaryInsight = `KLUTCH BEV: ${(bev.bev_score*100).toFixed(0)}. Influence convergence: ${influenceConvergence}. Cultural longevity: ${cls}yr. Premium durability: ${klutchPremiumDurability}.`;
  }

  const tierLabel = classifyLeverageTier(0.5);
  return {
    stateLabel,
    confidence:    bev.bev_score,
    primaryInsight,
    momentum:      influenceConvergence === 'REINFORCING' ? 'accelerating' : 'decelerating',
    trajPoints:    [bev.bev_score*100, bev.bev_score*96, bev.bev_score*91],
    attentionStack:['MEDIA','LABOR','CAPITAL'],
    keyDrivers:    ['bev_score','cultural_longevity_score','influence_convergence','saturation_risk'],
    recommendedAction: saturationRisk === 'CRITICAL'
      ? 'Activate next-generation athlete roster to extend cultural relevance beyond current stars. The KLUTCH model is replicable only if the talent pipeline stays ahead of saturation.'
      : 'Maintain three-leg integration. Any decoupling of representation from media/enterprise compresses the premium.',
    timeHorizon:   '18–48 months',
    impactLevel:   saturationRisk === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    bluf:          `KLUTCH cultural model BEV ${(bev.bev_score*100).toFixed(0)} — longevity ${cls}yr, convergence ${influenceConvergence}, saturation ${saturationRisk}.`,
    purpose:       'Cultural influence scaling analysis (Rich Paul Protocol)',
    fiveWs:        { who:'Rich Paul / KLUTCH Sports', what:'Cultural enterprise scaling via athlete representation', when:'Active expansion phase', where:'NBA/NFL/global sports + entertainment', why:'Premium durability against saturation and agency commoditization' },
    evidence:      [{ source:'MEDIA', finding:`Cultural velocity: ${bev.bev_score > 0.65 ? 'HIGH' : 'DECLINING'}` },{ source:'LABOR', finding:`Athlete representation convergence: ${influenceConvergence}` }],
    assumptions:   ['KLUTCH brand survives beyond any single athlete career','Media and enterprise legs maintain independent revenue'],
    assessment:    `Cultural longevity ${cls}yr, influence convergence ${influenceConvergence}, KLUTCH premium ${klutchPremiumDurability}.`,
    threats:       [{ label:`Mass-market saturation in ${cls} years — niche edge commoditizing` },{ label:`Concentration risk: ${bev.concentration_risk ?? 'MODERATE'} — top athlete dependency` }],
    opportunities: [{ label:'Next-gen athlete signing extends cultural longevity clock' },{ label:'International expansion (global football, cricket) opens new cultural moats' }],
    alternativeView:'The KLUTCH model may be more durable than predicted if Rich Paul himself becomes the cultural brand, independent of any individual athlete client.',
    outlook: [
      { prob:0.54, label:`KLUTCH premium holds ${cls}yr — cultural moat intact`, color:LIME },
      { prob:0.30, label:'Saturation accelerates — agency commoditization compresses premium', color:BLUE },
      { prob:0.16, label:'Convergence decouples — KLUTCH reverts to traditional agency model', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'MAP THREE-LEG ATTRIBUTION', impact:0.85, rationale:'What % of KLUTCH revenue comes from each leg? If representation > 70%, the cultural enterprise thesis has not yet materialized.', tag:'SIGNAL' }],
      SHORT_TERM: [{ id:'b1', label:'NEXT-GEN ROSTER EXPANSION', impact:0.78, rationale:'Cultural longevity requires a constant pipeline of culturally resonant athletes. The moment the roster ages, the saturation clock accelerates.', tag:'POSITIONING' }],
      STRUCTURAL: [{ id:'c1', label:'KLUTCH BRAND INDEPENDENCE', impact:0.70, rationale:'Build the KLUTCH brand identity independent of LeBron. The model is the moat — not the roster.', tag:'RISK' }],
    },
    leverage: { typeY:1, typeLabel:'MEDIA', tierLabel, deRatio:0.5, permissionless:true, industryNorm:0.45 },
    bev_score:               bev.bev_score,
    cultural_longevity_score:cls,
    influence_convergence:   influenceConvergence,
    saturation_risk:         saturationRisk,
    klutch_premium_durability:klutchPremiumDurability,
  };
}

// ── WO-1802: Contrarian Frontier Synthesizer (Thiel Protocol) ─────────────────
// Note: computeBEV() is NOT used — Thiel's framework is analytical, not brand-driven.

function synthContrarianFrontier(session, numbers, query) {
  const q = query.toLowerCase();

  const ncDelta     = /non.consensus|diverging|crowd wrong|mispriced|contrarian/.test(q) ? 0.82 : 0.55;
  const weakSlope   = /weak signal|early|pre.crowd|nobody sees|before mainstream/.test(q) ? 0.78 : 0.50;
  const importantTruthScore = parseFloat((ncDelta * weakSlope).toFixed(3));

  const culturalResistance =
    /institutional pushback|fighting back|establishment resist|hostile|banned|deplatform/.test(q) ? 'INTACT' :
    /starting to accept|mainstream adopting|consensus forming|everyone agrees now/.test(q) ? 'CAPITULATING' :
    'SOFTENING';

  const frontierWindow =
    /technology|tech frontier|ai|biotech|defense tech|space|hard tech/.test(q) &&
    /early|pre.crowd|pre.consensus|nobody sees/.test(q) ? 'open' :
    /mainstream|consensus|everyone knows|priced in/.test(q) ? 'closed' : 'open';

  const convictionDuration =
    importantTruthScore > 0.70 ? 36 :
    importantTruthScore > 0.50 ? 18 : 9;

  const isImportantTruth = /important truth|n=1|zero to one|contrarian thesis|mispriced|right when wrong/.test(q);
  const isCultural       = /cultural resistance|institutional|establishment|pushback|hostility/.test(q);
  const isFrontier       = /frontier|technology|hard tech|ai|biotech|defense|space|early stage/.test(q);

  let stateLabel, primaryInsight;
  if (isImportantTruth) {
    stateLabel     = importantTruthScore > 0.60 ? 'IMPORTANT_TRUTH_DETECTED' : 'TRUTH_BECOMING_CONSENSUS';
    primaryInsight = importantTruthScore > 0.60
      ? `Important truth signal: ${importantTruthScore.toFixed(2)}. Non-consensus × weak signal cross-fire active — thesis is pre-crowd and establishment-opposed. The Thiel edge is intact.`
      : `Truth score ${importantTruthScore.toFixed(2)} — consensus is arriving. The window is narrowing. Non-consensus premium erodes as mainstream adoption accelerates.`;
  } else if (isCultural) {
    stateLabel     = `CULTURAL_RESISTANCE_${culturalResistance}`;
    primaryInsight = culturalResistance === 'INTACT'
      ? 'Institutional resistance is active — the establishment is fighting this thesis. High resistance = the non-consensus edge is intact. The crowd has not yet capitulated.'
      : culturalResistance === 'CAPITULATING'
      ? 'Establishment is adopting the thesis. Cultural resistance is evaporating — this is the exit signal, not the entry signal.'
      : 'Cultural resistance is softening. Monitor consensus migration rate. When mainstream coverage begins, the Thiel edge is in the final phase.';
  } else if (isFrontier) {
    stateLabel     = `FRONTIER_WINDOW_${frontierWindow.toUpperCase()}`;
    primaryInsight = frontierWindow === 'open'
      ? `Frontier opportunity window: OPEN. Technology + capital convergence is pre-crowd. This is the Thiel entry zone — before institutional capital arrives and prices in the thesis.`
      : 'Frontier window is closed. Institutional capital has arrived and priced in the thesis. The non-consensus entry advantage is gone.';
  } else {
    stateLabel     = 'CONTRARIAN_SIGNAL_ACTIVE';
    primaryInsight = `Contrarian frontier signal: important truth score ${importantTruthScore.toFixed(2)}, cultural resistance ${culturalResistance}, frontier ${frontierWindow}. Conviction duration: ${convictionDuration} months.`;
  }

  const tierLabel = classifyLeverageTier(0.2);
  return {
    stateLabel,
    confidence:    importantTruthScore,
    primaryInsight,
    momentum:      culturalResistance === 'INTACT' ? 'building' : 'resolving',
    trajPoints:    [importantTruthScore*100, importantTruthScore*90, importantTruthScore*78],
    attentionStack:['TECHNOLOGY','CAPITAL','KNOWLEDGE'],
    keyDrivers:    ['important_truth_score','cultural_resistance','frontier_window','conviction_duration'],
    recommendedAction: culturalResistance === 'INTACT'
      ? 'Position pre-crowd while institutional resistance is still active. This is the maximum non-consensus advantage window.'
      : 'Evaluate exit timing. Cultural resistance softening means the thesis is becoming consensus — the Thiel premium evaporates at mainstream adoption.',
    timeHorizon:   `${convictionDuration} months`,
    impactLevel:   importantTruthScore > 0.60 ? 'HIGH' : 'MEDIUM',
    bluf:          `Contrarian signal: IT score ${importantTruthScore.toFixed(2)}, cultural resistance ${culturalResistance}, frontier ${frontierWindow}, conviction ${convictionDuration}mo.`,
    purpose:       'Contrarian frontier analysis (Thiel Protocol)',
    fiveWs:        { who:'Peter Thiel / Founders Fund', what:'Important truth detection at technological frontier', when:'Pre-consensus window', where:'Hard tech / deep tech / defense', why:'Non-consensus edge evaporates at mainstream adoption' },
    evidence:      [{ source:'KNOWLEDGE', finding:`Important truth score: ${importantTruthScore.toFixed(2)}` },{ source:'TECHNOLOGY', finding:`Frontier window: ${frontierWindow}` },{ source:'CAPITAL', finding:`Cultural resistance: ${culturalResistance}` }],
    assumptions:   ['Thiel thesis requires pre-crowd positioning — timing is the primary variable','Cultural resistance from establishment is the signal that the edge is intact'],
    assessment:    `IT score ${importantTruthScore.toFixed(2)} — ${importantTruthScore > 0.60 ? 'strong non-consensus signal' : 'consensus arriving'}. Cultural resistance: ${culturalResistance}. Frontier: ${frontierWindow}.`,
    threats:       [{ label:`Consensus arrival — mainstream adoption collapses non-consensus premium` },{ label:`Cultural resistance softening — ${convictionDuration}mo conviction window` }],
    opportunities: [{ label:'Pre-crowd positioning while institutional capital is absent' },{ label:'Thiel Fellowship model: Gen Z founders in non-traditional geographies' }],
    alternativeView:'Narrative-driven consensus can sustain longer than structural models predict. Cultural resistance may be institutional inertia rather than signal quality.',
    outlook: [
      { prob:0.49, label:`Non-consensus thesis compounds — cultural resistance holds ${convictionDuration}mo`, color:LIME },
      { prob:0.32, label:'Consensus arrives — institutional capital prices in thesis, edge narrows',         color:BLUE },
      { prob:0.19, label:'Thesis is wrong — non-consensus signal was noise, establishment was correct',       color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'VERIFY NON-CONSENSUS THESIS', impact:0.92, rationale:'Write out the important truth in one sentence. If you cannot state it without jargon, the thesis is not yet formed. Formation precedes positioning.', tag:'POSITIONING' }],
      SHORT_TERM: [{ id:'b1', label:'MONITOR CULTURAL RESISTANCE', impact:0.83, rationale:'Track when mainstream financial media first covers this thesis. That is the exit signal — not the entry. The non-consensus edge evaporates at coverage.', tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'BUILD CONVICTION DURATION', impact:0.75, rationale:`Thesis duration: ${convictionDuration} months. If thesis has not resolved by then, re-evaluate from first principles — not sunk cost.`, tag:'DISCIPLINE' }],
    },
    leverage: { typeY:0, typeLabel:'CODE', tierLabel, deRatio:0.2, permissionless:true, industryNorm:0.2 },
    important_truth_score:   importantTruthScore,
    cultural_resistance:     culturalResistance,
    establishment_consensus: culturalResistance === 'INTACT' ? 'HIGH' : culturalResistance === 'SOFTENING' ? 'MEDIUM' : 'LOW',
    frontier_window:         frontierWindow,
    conviction_duration:     convictionDuration,
  };
}

// ── Domain router ──────────────────────────────────────────────────────────────

// ── WO-1811: Sovereign Hardware Frontier Synthesizer ─────────────────────────

function synthSovereignHardware(session, numbers, query) {
  const q = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const lithographyMoat =
    /asml|euv|euvl|extreme ultraviolet|tsmc|3nm|2nm|angstrom|node transition/.test(q) ? 'CONTESTED' :
    /china chip|export control|entity list|chip act|chips act|sanctions.*semi/.test(q)   ? 'SANCTIONED' :
    'STABLE';

  const supplyPressure =
    /shortage|supply crunch|lead time|allocation|rationing|backlog|constrained/.test(q) ? 'HIGH' :
    /easing|improving|recovery|normalizing/.test(q) ? 'LOW' : 'MODERATE';

  const geoRisk =
    /taiwan|china|prc|trade war|tariff|export ban|entity list|sanctions|restrict/.test(q) ? 'ELEVATED' :
    /ally|friend.shore|reshoring|domestic fab|intel fab|arizona fab/.test(q) ? 'MITIGATING' : 'WATCH';

  const isLithography = /asml|euv|lithography|node|fab|foundry|tsmc|samsung fab|intel fab|yield/.test(q);
  const isSupplyChain  = /supply chain|shortage|allocation|lead time|chokepoint|trade barrier|tariff|export/.test(q);
  const isSovereign    = /sovereign|chips act|reshoring|domestic.*fab|geopolit|friend.shore|national security.*chip/.test(q);

  let stateLabel, primaryInsight;
  if (isLithography) {
    stateLabel     = `LITHOGRAPHY_MOAT_${lithographyMoat}`;
    primaryInsight = lithographyMoat === 'CONTESTED'
      ? 'Advanced lithography (sub-3nm) remains a 2-3 player global monopoly. ASML EUVL export restrictions are the structural chokepoint — whoever controls the machines controls the node transition timeline.'
      : lithographyMoat === 'SANCTIONED'
      ? 'Semiconductor export controls are active. Sanctioned entities face multi-year fab catch-up timelines. Sovereign hardware moat is widening for compliant foundries.'
      : 'Lithography moat stable. No active restrictions detected. Monitor ASML allocation queue and TSMC capacity commitments.';
  } else if (isSupplyChain) {
    stateLabel     = `SUPPLY_PRESSURE_${supplyPressure}`;
    primaryInsight = supplyPressure === 'HIGH'
      ? 'Hardware supply constraint is active. Lead times are extending — this pressure propagates downstream to consumer electronics, automotive, and enterprise hardware within 6–18 months.'
      : `Supply pressure: ${supplyPressure}. No acute shortage signal. Monitor fab capacity utilization and DRAM/NAND spot pricing as leading indicators.`;
  } else if (isSovereign) {
    stateLabel     = `SOVEREIGN_RESHORING_${geoRisk}`;
    primaryInsight = geoRisk === 'ELEVATED'
      ? 'Geopolitical hardware risk is elevated. Taiwan Strait exposure and export control escalation are compressing the window for offshore fab dependency. Reshoring premium is structural, not cyclical.'
      : geoRisk === 'MITIGATING'
      ? 'Sovereign reshoring signals active. Domestic fab investment is building but 5–7 year capex cycle means supply relief is not near-term. Structural gap persists.'
      : 'Sovereign hardware risk at WATCH level. No acute geopolitical escalation. Monitor Taiwan Strait and China entity list additions.';
  } else {
    stateLabel     = 'SOVEREIGN_HARDWARE_SIGNAL_ACTIVE';
    primaryInsight = `Hardware frontier signal: lithography moat ${lithographyMoat}, supply pressure ${supplyPressure}, geo risk ${geoRisk}. Downstream consumer impact: 6–18 month lag from fab constraint to retail price.`;
  }

  const tierLabel = classifyLeverageTier(0.6);
  return {
    stateLabel,
    confidence:    geoRisk === 'ELEVATED' ? 0.88 : 0.74,
    primaryInsight,
    momentum:      supplyPressure === 'HIGH' ? 'tightening' : 'stable',
    trajPoints:    [72, 68, 65],
    attentionStack:['TECHNOLOGY','CAPITAL','OWNERSHIP'],
    keyDrivers:    ['lithography_moat','supply_pressure','geo_risk','fab_capacity'],
    recommendedAction: supplyPressure === 'HIGH'
      ? 'Map your hardware dependency. Identify which components have single-source risk. Alternative supplier qualification now — not after the shortage hits your supply chain.'
      : 'Monitor TSMC capacity utilization and ASML order book quarterly. Lead indicators move 12–18 months before consumer price impact.',
    timeHorizon:   '12–36 months',
    impactLevel:   geoRisk === 'ELEVATED' ? 'HIGH' : 'MEDIUM',
    bluf:          `Sovereign hardware: lithography ${lithographyMoat}, supply ${supplyPressure}, geo risk ${geoRisk}. Downstream consumer price impact follows fab constraint by 6–18 months.`,
    purpose:       'Sovereign hardware frontier analysis',
    fiveWs:        { who:'Semiconductor supply chain (TSMC, ASML, Samsung, Intel)', what:'Hardware production boundary and sovereign lithography moat', when:'Ongoing geopolitical realignment cycle', where:'Taiwan, South Korea, US domestic fab buildout', why:'Sovereign hardware independence = national security and consumer price stability' },
    evidence:      [{ source:'TECHNOLOGY', finding:`Lithography moat: ${lithographyMoat}` }, { source:'CAPITAL', finding:`Supply pressure: ${supplyPressure}` }, { source:'OWNERSHIP', finding:`Geo risk: ${geoRisk}` }],
    assumptions:   ['TSMC remains primary advanced node foundry', 'ASML retains EUVL monopoly', 'Export control regime remains active'],
    assessment:    `Lithography moat ${lithographyMoat} — supply pressure ${supplyPressure} — geo risk ${geoRisk}. Every consumer electronics price and AI infrastructure timeline flows through this chokepoint.`,
    threats:       [{ label:`Taiwan Strait escalation compresses reshoring timeline` }, { label:`ASML export ban expands — allied fab capacity gap widens` }],
    opportunities: [{ label:'Chips Act beneficiaries: Intel Arizona, TSMC Phoenix, Samsung Taylor — domestic allocation premium' }, { label:`Friend-shore supply chains building — Malaysia, Japan, India expansion` }],
    alternativeView:'China domestic semiconductor progress (SMIC, Huawei HiSilicon) may reduce sanctioned-entity lag faster than current export control models project.',
    outlook: [
      { prob:0.55, label:'Sovereign hardware moat holds — reshoring builds slowly, prices elevated 18–36mo', color:LIME },
      { prob:0.29, label:'Geopolitical escalation — Taiwan Strait disruption triggers acute shortage', color:BLUE },
      { prob:0.16, label:'Soft landing — supply normalizes, geo risk recedes, domestic fab absorbs demand', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'MAP HARDWARE DEPENDENCY', impact:0.91, rationale:'Which components in your stack have single-source fab risk? Identify now — lead times mean you have no options after the shortage begins.', tag:'RISK' }],
      SHORT_TERM: [{ id:'b1', label:'MONITOR FAB UTILIZATION', impact:0.82, rationale:'TSMC utilization rate and ASML order book are the 12-month leading indicators. Both are public. Set quarterly checkpoints.', tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'QUALIFY ALTERNATIVE SOURCES', impact:0.76, rationale:'Second-source qualification for critical components takes 6–12 months minimum. Start before you need it.', tag:'POSITIONING' }],
    },
    leverage: { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.6, permissionless:false, industryNorm:0.5 },
    lithography_moat:  lithographyMoat,
    supply_pressure:   supplyPressure,
    geo_risk:          geoRisk,
  };
}

// ── WO-1808: Industrial Flywheel Synthesizer ──────────────────────────────────

function synthIndustrialFlywheel(session, numbers, query) {
  const q = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const infraDomain =
    /satellite|starlink|kuiper|blue origin|spacex|launch|orbital|airspace|regulatory.*space|faa.*space/.test(q) ? 'SPACE' :
    /gpu|datacenter|compute|thermal|cooling|ai cluster|h100|b200|nvlink|inference|training cluster/.test(q)     ? 'COMPUTE' :
    /supply chain|logistics|automation|fulfillment|warehouse|last mile|industrial ai|amazon.*warehouse/.test(q)  ? 'LOGISTICS' :
    'GENERAL';

  const flywheelVelocity =
    /accelerating|scaling|expanding|new region|capacity addition|orders|backlog|demand exceeds/.test(q) ? 'ACCELERATING' :
    /slowing|constrained|bottleneck|delayed|regulatory hold|permit|approval pending/.test(q)             ? 'CONSTRAINED' : 'BUILDING';

  const sovereignFriction =
    /faa|regulatory|airspace|export|clearance|permit|national security review|cfius|spectrum|launch license/.test(q) ? 'HIGH' :
    /approved|cleared|licensed|permitted/.test(q) ? 'LOW' : 'MODERATE';

  const isSpace   = infraDomain === 'SPACE';
  const isCompute = infraDomain === 'COMPUTE';
  const isLogist  = infraDomain === 'LOGISTICS';

  let stateLabel, primaryInsight;
  if (isSpace) {
    stateLabel     = sovereignFriction === 'HIGH' ? 'SOVEREIGN_AIRSPACE_FRICTION' : `SPACE_INFRASTRUCTURE_${flywheelVelocity}`;
    primaryInsight = sovereignFriction === 'HIGH'
      ? 'Regulatory friction is the primary constraint on space infrastructure deployment. FAA launch licensing and spectrum allocation are sovereign chokepoints — physical build capacity is not the bottleneck.'
      : `Space infrastructure flywheel: ${flywheelVelocity}. Satellite constellation deployment velocity drives downstream connectivity economics — internet latency, IoT density, autonomous vehicle infrastructure.`;
  } else if (isCompute) {
    stateLabel     = `COMPUTE_INFRASTRUCTURE_${flywheelVelocity}`;
    primaryInsight = flywheelVelocity === 'CONSTRAINED'
      ? 'Compute infrastructure is bottlenecked. Thermal dissipation and power density constraints inside datacenter fabrics are the physical ceiling — not software or algorithm limitations. Cooling architecture is the untracked variable.'
      : `AI compute flywheel ${flywheelVelocity}. GPU cluster expansion is the demand signal — hyperscaler capex commitments lead inference pricing by 18–24 months. Monitor NVIDIA allocation queue and power purchase agreements.`;
  } else if (isLogist) {
    stateLabel     = `LOGISTICS_FLYWHEEL_${flywheelVelocity}`;
    primaryInsight = `Industrial logistics flywheel: ${flywheelVelocity}. Automation density in fulfillment centers is the margin variable — each robotics integration cycle compresses last-mile cost by 15–25%. AI route optimization is the next compression layer.`;
  } else {
    stateLabel     = 'INDUSTRIAL_FLYWHEEL_SIGNAL_ACTIVE';
    primaryInsight = `Industrial frontier signal active. Domain: ${infraDomain}. Flywheel velocity: ${flywheelVelocity}. Sovereign friction: ${sovereignFriction}.`;
  }

  const tierLabel = classifyLeverageTier(0.8);
  return {
    stateLabel,
    confidence:    flywheelVelocity === 'ACCELERATING' ? 0.86 : 0.72,
    primaryInsight,
    momentum:      flywheelVelocity === 'ACCELERATING' ? 'accelerating' : flywheelVelocity === 'CONSTRAINED' ? 'stalled' : 'building',
    trajPoints:    [78, 74, 71],
    attentionStack:['TECHNOLOGY','CAPITAL','LABOR'],
    keyDrivers:    ['infra_domain','flywheel_velocity','sovereign_friction'],
    recommendedAction: sovereignFriction === 'HIGH'
      ? 'Regulatory timeline is the critical path. Map the approval sequence — FAA, FCC, CFIUS — and model the delay cost. Physical infrastructure is ready; the constraint is institutional.'
      : `Monitor ${infraDomain === 'COMPUTE' ? 'hyperscaler capex commitments and power purchase agreements' : infraDomain === 'SPACE' ? 'launch manifest and spectrum allocation filings' : 'robotics adoption rate and fulfillment automation capex'} as leading indicators.`,
    timeHorizon:   '18–48 months',
    impactLevel:   sovereignFriction === 'HIGH' ? 'HIGH' : 'MEDIUM',
    bluf:          `Industrial flywheel — domain: ${infraDomain}, velocity: ${flywheelVelocity}, sovereign friction: ${sovereignFriction}.`,
    purpose:       'Industrial frontier infrastructure synthesis',
    fiveWs:        { who:'Musk (SpaceX/Tesla), Huang (Nvidia), Bezos (Amazon/Blue Origin)', what:'Physical infrastructure flywheel at sovereign scale', when:'Active build cycle', where:'Space, datacenter, logistics', why:'Physical infrastructure precedence determines AI and connectivity economics for next decade' },
    evidence:      [{ source:'TECHNOLOGY', finding:`Infrastructure domain: ${infraDomain}` }, { source:'CAPITAL', finding:`Flywheel velocity: ${flywheelVelocity}` }],
    assumptions:   ['Physical infrastructure is the rate-limiting layer for AI and connectivity', 'Sovereign regulatory friction is persistent, not transient'],
    assessment:    `${infraDomain} infrastructure flywheel ${flywheelVelocity} — sovereign friction ${sovereignFriction}. Physical build capacity ≠ deployment velocity when regulatory clearance is the bottleneck.`,
    threats:       [{ label:`Sovereign friction: regulatory clearance is the critical path, not engineering` }, { label:`Thermal/power density limits compute expansion in existing datacenter footprint` }],
    opportunities: [{ label:`${infraDomain === 'COMPUTE' ? 'Next-gen cooling architecture unlocks compute density premium' : infraDomain === 'SPACE' ? 'Constellation density drives connectivity economics for underserved markets' : 'Robotics density compounds margin — first-mover lock-in is durable'}` }],
    alternativeView:'Sovereign regulatory friction may be temporary — first-mover infrastructure advantages are permanent once deployed.',
    outlook: [
      { prob:0.52, label:`Flywheel ${flywheelVelocity === 'ACCELERATING' ? 'sustains' : 'builds'} — infrastructure deployment leads economics by 18–24mo`, color:LIME },
      { prob:0.31, label:'Sovereign friction extends — regulatory clearance delays compress deployment window', color:BLUE },
      { prob:0.17, label:'Physical constraint (thermal/power/spectrum) caps flywheel before economic model closes', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:`TRACK ${infraDomain} LEADING INDICATORS`, impact:0.88, rationale:`${infraDomain === 'COMPUTE' ? 'GPU allocation queue and PPA signings move 18mo before inference pricing.' : infraDomain === 'SPACE' ? 'Launch manifest and spectrum filings are public — track monthly.' : 'Robotics capex announcements lead fulfillment automation by 12–18mo.'}`, tag:'SIGNAL' }],
      SHORT_TERM: [{ id:'b1', label:'MAP REGULATORY CRITICAL PATH', impact:0.80, rationale:'Identify the longest-pole regulatory approval in your domain. That timeline IS the deployment timeline.', tag:'RISK' }],
      STRUCTURAL: [{ id:'c1', label:'POSITION ON INFRASTRUCTURE PRECEDENCE', impact:0.74, rationale:'The entity that owns the infrastructure layer sets the economics for everyone above it. Precedence in physical infrastructure is durable.', tag:'POSITIONING' }],
    },
    leverage: { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.8, permissionless:false, industryNorm:0.6 },
    infra_domain:       infraDomain,
    flywheel_velocity:  flywheelVelocity,
    sovereign_friction: sovereignFriction,
  };
}

// ── WO-1810: Social Graph Attention Synthesizer ───────────────────────────────

function synthSocialGraph(session, numbers, query) {
  const q = query.toLowerCase();

  const platformPhase =
    /losing users|declining|exodus|death spiral|losing relevance|peak.*platform|users leaving/.test(q) ? 'DECLINE' :
    /growing|expanding|new users|acquisition surge|viral growth|breakout/.test(q)                       ? 'GROWTH'  :
    /mature|stable|plateau|flat growth|monetizing/.test(q)                                              ? 'MATURE'  : 'GROWTH';

  const retentionSignal =
    /algorithm change|feed change|engagement drop|session length|time on platform|dau drop/.test(q) ? 'DEGRADING' :
    /sticky|habit|daily active|strong retention|engagement up/.test(q)                              ? 'STRONG'   : 'STABLE';

  const sovereignRisk =
    /ban|block|tiktok|sovereign|government.*restrict|data sovereignty|privacy law|gdpr|india.*ban|brazil.*ban|regulation/.test(q) ? 'ELEVATED' :
    /compliant|approved|cleared|data local/.test(q) ? 'LOW' : 'WATCH';

  const isAttention = /attention|retention|engagement|session|dau|mau|time on|habit loop|feed/.test(q);
  const isNetwork   = /network effect|viral|acquisition|growth|user base|moat|switching cost/.test(q);
  const isSovereign = /ban|sovereign|privacy|gdpr|regulation|government|data local|restrict/.test(q);

  let stateLabel, primaryInsight;
  if (isSovereign) {
    stateLabel     = `SOVEREIGN_PRIVACY_RISK_${sovereignRisk}`;
    primaryInsight = sovereignRisk === 'ELEVATED'
      ? 'Sovereign privacy friction is active. Closed network data sovereignty requirements are compressing the addressable market. Government-mandated data localization or platform bans structurally separate user graphs.'
      : 'Sovereign risk at WATCH. Monitor data localization legislation pipeline — the TikTok precedent has established a template for platform bans that other governments are actively studying.';
  } else if (isAttention) {
    stateLabel     = `ATTENTION_RETENTION_${retentionSignal}`;
    primaryInsight = retentionSignal === 'DEGRADING'
      ? 'Attention retention is degrading. Algorithm changes or competing platforms are compressing session depth. This is the earliest signal of platform lifecycle transition — DAU/MAU ratio moves before revenue.'
      : `Attention signal: ${retentionSignal}. ${platformPhase === 'MATURE' ? 'Platform is in monetization phase — retention is stable but growth is priced in. Watch for engagement-monetization tradeoff compression.' : 'Retention holding. Monitor session length and DAU/MAU ratio for early degradation signal.'}`;
  } else if (isNetwork) {
    stateLabel     = `NETWORK_EFFECT_${platformPhase}`;
    primaryInsight = platformPhase === 'DECLINE'
      ? 'Network effect is reversing. Once user loss begins in a social graph, the exit velocity accelerates — the same mechanism that built the moat now accelerates the unwind. The inflection is non-linear.'
      : `Network effect in ${platformPhase} phase. ${platformPhase === 'GROWTH' ? 'Viral coefficient is the primary metric — measure new-user-to-referral conversion rate. That ratio is the growth moat.' : 'Moat is durable but monetization pressure is the risk — ad load increases compress engagement.'}`;
  } else {
    stateLabel     = 'SOCIAL_GRAPH_SIGNAL_ACTIVE';
    primaryInsight = `Social graph signal: platform phase ${platformPhase}, retention ${retentionSignal}, sovereign risk ${sovereignRisk}.`;
  }

  const tierLabel = classifyLeverageTier(0.3);
  return {
    stateLabel,
    confidence:    sovereignRisk === 'ELEVATED' ? 0.84 : 0.76,
    primaryInsight,
    momentum:      platformPhase === 'GROWTH' ? 'accelerating' : platformPhase === 'DECLINE' ? 'decelerating' : 'stable',
    trajPoints:    [76, 73, 70],
    attentionStack:['MEDIA','TECHNOLOGY','CAPITAL'],
    keyDrivers:    ['platform_phase','retention_signal','sovereign_risk','network_effect'],
    recommendedAction: sovereignRisk === 'ELEVATED'
      ? 'Audit your platform exposure. If your audience or business is concentrated on a platform with sovereign risk, begin distribution diversification now — before a ban compresses your timeline to zero.'
      : platformPhase === 'DECLINE'
      ? 'Platform exit signal active. Audience migration to challenger platforms is non-linear — early movers retain audience relationships that late movers lose permanently.'
      : 'Monitor DAU/MAU ratio and session length monthly. These move 6–9 months before revenue impact.',
    timeHorizon:   '6–24 months',
    impactLevel:   sovereignRisk === 'ELEVATED' || platformPhase === 'DECLINE' ? 'HIGH' : 'MEDIUM',
    bluf:          `Social graph — platform ${platformPhase}, retention ${retentionSignal}, sovereign risk ${sovereignRisk}. DAU/MAU and session depth are the 6-month leading indicators.`,
    purpose:       'Social graph attention synthesis',
    fiveWs:        { who:'Platform operators, content creators, advertisers, small businesses', what:'Attention retention and platform lifecycle dynamics', when:'Active platform lifecycle phase', where:'Meta, Tencent, Snap, WhatsApp ecosystem', why:'Platform lifecycle determines ad cost, audience reach, and distribution economics for downstream users' },
    evidence:      [{ source:'MEDIA', finding:`Platform phase: ${platformPhase}` }, { source:'TECHNOLOGY', finding:`Retention signal: ${retentionSignal}` }, { source:'CAPITAL', finding:`Sovereign risk: ${sovereignRisk}` }],
    assumptions:   ['Network effects are the primary moat', 'Sovereign privacy regulation follows TikTok precedent', 'Algorithm changes are the earliest retention signal'],
    assessment:    `Platform ${platformPhase} — retention ${retentionSignal} — sovereign risk ${sovereignRisk}. The attention economy is a winner-take-most market; lifecycle transitions are non-linear.`,
    threats:       [{ label:`Sovereign ban risk: ${sovereignRisk} — closed-network data localization compresses market` }, { label:`Retention degradation signals platform lifecycle transition` }],
    opportunities: [{ label:'Platform transition creates audience migration window — early movers capture displaced users' }, { label:'Sovereign friction on incumbents creates challenger platform openings' }],
    alternativeView:'Closed-network sovereign privacy requirements may entrench regional platforms rather than fracturing global ones — localization as moat.',
    outlook: [
      { prob:0.53, label:`Platform ${platformPhase} continues — attention moat holds through monetization cycle`, color:LIME },
      { prob:0.30, label:'Sovereign friction escalates — data localization or ban compresses addressable market', color:BLUE },
      { prob:0.17, label:'Retention inflection — algorithm-driven engagement decline triggers non-linear exit', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'AUDIT PLATFORM CONCENTRATION', impact:0.89, rationale:'What % of your audience/revenue depends on a single platform? If >60%, sovereign or lifecycle risk is an unhedged single point of failure.', tag:'RISK' }],
      SHORT_TERM: [{ id:'b1', label:'TRACK DAU/MAU RATIO', impact:0.81, rationale:'The ratio of daily to monthly actives is the earliest engagement signal — it moves 6–9 months before revenue. Public for listed platforms; proxy via engagement metrics for private ones.', tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'BUILD DISTRIBUTION REDUNDANCY', impact:0.73, rationale:'Email list, owned community, multi-platform presence. The goal is not to predict which platform wins — it is to not need to.', tag:'POSITIONING' }],
    },
    leverage: { typeY:1, typeLabel:'MEDIA', tierLabel, deRatio:0.3, permissionless:true, industryNorm:0.35 },
    platform_phase:   platformPhase,
    retention_signal: retentionSignal,
    sovereign_risk:   sovereignRisk,
  };
}

// ── WO-1809: VC Inversion Protocol ────────────────────────────────────────────

function synthVCInversion(session, numbers, query) {
  const q = query.toLowerCase();

  const crowdingLevel =
    /crowded|overvalued|everyone is in|consensus bet|popular trade|consensus.*long|priced in|crowded trade/.test(q) ? 'HIGH' :
    /contrarian|nobody sees|early|pre.crowd|undiscovered|unrecognized/.test(q) ? 'LOW' : 'MODERATE';

  const exitSignal =
    /exit|ipo|spac|secondary|distribution|lp.*return|fund.*return|liquidity event|lock.?up/.test(q) ? 'ACTIVE' :
    /extension|delay|hold|no exit|deferral|continuation fund/.test(q) ? 'DEFERRED' : 'BUILDING';

  const thesisState =
    /thesis.*broken|wrong|failed|didn't work|pivot|write.?down|down round/.test(q) ? 'INVALIDATED' :
    /thesis.*intact|compounding|working|on track|validating/.test(q)               ? 'INTACT' : 'TESTING';

  const isInversion   = /crowded|rotation|exit.*wave|everyone.*in|consensus.*long|smart money.*leaving/.test(q);
  const isAntiConsens = /anti.consensus|nobody sees|contrarian.*vc|pre.crowd|undiscovered thesis|wrong frame/.test(q);
  const isLiquidity   = /ipo|exit|secondary|distribution|spac|lp.*capital|liquidity|lock.?up|portfolio.*exit/.test(q);

  let stateLabel, primaryInsight;
  if (isInversion) {
    stateLabel     = `CROWDED_TRADE_${crowdingLevel}`;
    primaryInsight = crowdingLevel === 'HIGH'
      ? 'VC crowding signal: HIGH. Smart money consensus has formed — the thesis is priced in and late-stage multiple compression is the primary risk. The exit window for early positions is narrowing as crowding peaks.'
      : `Crowding at ${crowdingLevel}. The non-consensus window is still open — thesis has not yet attracted consensus capital. This is the Doerr entry zone: before the crowd validates, after the signal has formed.`;
  } else if (isAntiConsens) {
    stateLabel     = `ANTI_CONSENSUS_THESIS_${thesisState}`;
    primaryInsight = thesisState === 'INTACT'
      ? 'Anti-consensus thesis is intact and still non-consensus. The structural divergence between smart money positioning and mainstream narrative is the alpha window. Track the gap closure rate — when the gap closes, so does the edge.'
      : thesisState === 'INVALIDATED'
      ? 'Thesis invalidated. Anti-consensus position has resolved — not by the crowd arriving but by the thesis breaking. Mark and exit. Capital redeployment to the next non-consensus setup.'
      : 'Thesis in testing phase. Early signals present but not yet sufficient for conviction. Monitor for 2–3 confirming data points before scaling position.';
  } else if (isLiquidity) {
    stateLabel     = `PRIVATE_MARKET_LIQUIDITY_${exitSignal}`;
    primaryInsight = exitSignal === 'ACTIVE'
      ? 'Exit liquidity window is active. IPO/secondary market conditions are supporting distributions. LP capital is returning — this creates reinvestment pressure and the next fund cycle begins. Watch for crowding in the follow-on vintage.'
      : exitSignal === 'DEFERRED'
      ? 'Exit window deferred. Continuation funds and secondary sales are the pressure valve. Private market illiquidity premium is compressing for extended hold assets — LP distribution expectations are unmet.'
      : 'Exit pipeline building. Monitor IPO filing cadence and secondary market bid/ask spreads for private late-stage — these are the 6-month leading indicators for distribution activity.';
  } else {
    stateLabel     = 'VC_INVERSION_SIGNAL_ACTIVE';
    primaryInsight = `VC inversion signal: crowding ${crowdingLevel}, exit ${exitSignal}, thesis ${thesisState}. The edge in private markets is thesis conviction before consensus — and exit discipline before crowding peaks.`;
  }

  const tierLabel = classifyLeverageTier(0.5);
  return {
    stateLabel,
    confidence:    crowdingLevel === 'HIGH' ? 0.83 : 0.71,
    primaryInsight,
    momentum:      exitSignal === 'ACTIVE' ? 'resolving' : crowdingLevel === 'HIGH' ? 'peaking' : 'building',
    trajPoints:    [74, 70, 67],
    attentionStack:['CAPITAL','OWNERSHIP','KNOWLEDGE'],
    keyDrivers:    ['crowding_level','exit_signal','thesis_state','consensus_gap'],
    recommendedAction: crowdingLevel === 'HIGH'
      ? 'Crowding peak is the exit signal, not the entry. Map your position in the consensus adoption curve. If mainstream financial media is covering your thesis, you are late — not early.'
      : exitSignal === 'DEFERRED'
      ? 'Deferred exits create secondary market opportunities. Identify LP sellers in quality portfolios at illiquidity discount — the secondary bid is the contrarian entry.'
      : 'Define your thesis in one sentence. If you cannot state the non-consensus element clearly, the edge is not yet formed. Clarity precedes conviction.',
    timeHorizon:   '12–36 months',
    impactLevel:   crowdingLevel === 'HIGH' || exitSignal === 'DEFERRED' ? 'HIGH' : 'MEDIUM',
    bluf:          `VC inversion: crowding ${crowdingLevel}, exit ${exitSignal}, thesis ${thesisState}. Consensus arrival is the exit signal — not the validation.`,
    purpose:       'VC inversion protocol — private market thesis and exit timing',
    fiveWs:        { who:'VC funds, LP investors, founders in VC-backed companies, secondary market participants', what:'Consensus formation and exit timing in private markets', when:'Active fund cycle', where:'Venture capital, growth equity, private secondaries', why:'The edge in private markets is pre-consensus positioning and disciplined exit before crowding peaks' },
    evidence:      [{ source:'CAPITAL', finding:`Crowding level: ${crowdingLevel}` }, { source:'OWNERSHIP', finding:`Exit signal: ${exitSignal}` }, { source:'KNOWLEDGE', finding:`Thesis state: ${thesisState}` }],
    assumptions:   ['Private market consensus follows public market narrative by 6–12 months', 'Exit windows are cyclical and crowd-dependent', 'Anti-consensus thesis has a defined resolution horizon'],
    assessment:    `Crowding ${crowdingLevel} — exit ${exitSignal} — thesis ${thesisState}. The VC edge evaporates at consensus. Entry discipline and exit discipline are the same variable.`,
    threats:       [{ label:`Crowding peak compresses multiples before exit window opens` }, { label:`Extended hold periods compress IRR below LP hurdle rate` }],
    opportunities: [{ label:'Pre-consensus positioning before Sequoia/Kleiner lead rounds establish price' }, { label:'Secondary market illiquidity discount on deferred-exit portfolios' }],
    alternativeView:'Consensus capital in VC is self-fulfilling at early stages — Sequoia/a16z co-investment is itself a market signal that validates thesis, not dilutes edge.',
    outlook: [
      { prob:0.50, label:'Non-consensus thesis validates — crowd arrives, exit window opens at multiple peak', color:LIME },
      { prob:0.32, label:'Thesis in testing phase — additional validation cycles before consensus capital arrives', color:BLUE },
      { prob:0.18, label:'Thesis invalidated or crowding peaks before exit — multiple compression on the way out', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'WRITE THE THESIS IN ONE SENTENCE', impact:0.90, rationale:'If you cannot state the non-consensus element in one sentence, the edge is not formed. Formation precedes capital allocation.', tag:'DISCIPLINE' }],
      SHORT_TERM: [{ id:'b1', label:'TRACK CONSENSUS GAP CLOSURE', impact:0.82, rationale:'Monitor mainstream financial media coverage of your thesis. The moment it appears in FT/WSJ/Bloomberg as "hot sector," the consensus gap is closing. That is your exit timeline, not entry.', tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'MAP EXIT WINDOW AGAINST CROWDING CYCLE', impact:0.75, rationale:'The exit window peaks 6–18 months after consensus capital floods in. Model the crowding curve to set your distribution timeline — not based on fund life, but on market structure.', tag:'POSITIONING' }],
    },
    leverage: { typeY:0, typeLabel:'CODE', tierLabel, deRatio:0.5, permissionless:false, industryNorm:0.4 },
    crowding_level: crowdingLevel,
    exit_signal:    exitSignal,
    thesis_state:   thesisState,
  };
}

// ── WO-1807: Virtual Economy Synthesizer ─────────────────────────────────────

function synthVirtualEconomy(session, numbers, query) {
  const q = query.toLowerCase();

  const tokenVelocity =
    /high volume|active trading|rapid exchange|liquid|high velocity|active marketplace/.test(q) ? 'HIGH' :
    /stagnant|low volume|illiquid|nobody trading|dead marketplace/.test(q)                       ? 'LOW' : 'MODERATE';

  const ipLifecycle =
    /declining|aging ip|losing relevance|fading franchise|sequel fatigue|oversaturated/.test(q) ? 'DECLINING' :
    /new release|fresh ip|breakout|launch|expansion|new franchise/.test(q)                       ? 'EXPANDING' : 'MATURE';

  const currencyRisk =
    /inflation|devaluation|hyperinflation|gold farming|bot|exploit|currency dupe|economic exploit/.test(q) ? 'HIGH' :
    /stable|balanced|healthy economy|controlled inflation/.test(q) ? 'LOW' : 'MODERATE';

  const isVelocity = /velocity|trading|volume|exchange|marketplace|liquidity|token/.test(q);
  const isIP       = /ip|franchise|cultural|licensing|sequel|expansion|brand|content/.test(q);
  const isCurrency = /currency|inflation|exploit|bot|gold farm|devaluation|economy balance/.test(q);

  let stateLabel, primaryInsight;
  if (isCurrency) {
    stateLabel     = `VIRTUAL_CURRENCY_RISK_${currencyRisk}`;
    primaryInsight = currencyRisk === 'HIGH'
      ? 'Virtual economy currency instability detected. Hyperinflation or exploit-driven supply shock destroys player trust faster than any gameplay failure. Currency health is the foundation of virtual economy durability.'
      : `Currency risk: ${currencyRisk}. Virtual economy stability requires controlled inflation mechanics — too tight kills engagement, too loose breaks the marketplace. Monitor supply/demand balance at item-tier level.`;
  } else if (isIP) {
    stateLabel     = `CULTURAL_IP_${ipLifecycle}`;
    primaryInsight = ipLifecycle === 'DECLINING'
      ? 'Cultural IP is in decline phase. Franchise fatigue is compressing new-player acquisition — existing players monetize at lower lifetime value when the IP loses cultural relevance. The window for IP extension is closing.'
      : ipLifecycle === 'EXPANDING'
      ? 'IP expansion phase active. New franchise launches or sequels drive user acquisition spikes that compress CAC temporarily. Monetization architecture during expansion determines long-tail LTV.'
      : 'IP in mature phase. Cultural relevance is stable but not growing. The moat is existing player base and switching cost — monitor churn rate and competitive title launches.';
  } else if (isVelocity) {
    stateLabel     = `TOKEN_VELOCITY_${tokenVelocity}`;
    primaryInsight = tokenVelocity === 'HIGH'
      ? 'Virtual economy token velocity is high — active marketplace signals healthy player engagement and item demand. High velocity is a leading indicator of platform stickiness.'
      : tokenVelocity === 'LOW'
      ? 'Token velocity is low — marketplace illiquidity signals disengagement or currency oversupply. Low velocity precedes player churn by 2–4 months. Examine supply mechanics and drop rate.'
      : 'Token velocity moderate. Virtual economy is functional. Watch for velocity compression as the primary churn leading indicator.';
  } else {
    stateLabel     = 'VIRTUAL_ECONOMY_SIGNAL_ACTIVE';
    primaryInsight = `Virtual economy signal: token velocity ${tokenVelocity}, IP lifecycle ${ipLifecycle}, currency risk ${currencyRisk}.`;
  }

  const tierLabel = classifyLeverageTier(0.2);
  return {
    stateLabel,
    confidence:    tokenVelocity === 'HIGH' && ipLifecycle !== 'DECLINING' ? 0.80 : 0.68,
    primaryInsight,
    momentum:      ipLifecycle === 'EXPANDING' ? 'accelerating' : ipLifecycle === 'DECLINING' ? 'decelerating' : 'stable',
    trajPoints:    [70, 67, 64],
    attentionStack:['MEDIA','TECHNOLOGY','CAPITAL'],
    keyDrivers:    ['token_velocity','ip_lifecycle','currency_risk','marketplace_health'],
    recommendedAction: currencyRisk === 'HIGH'
      ? 'Virtual economy stability is the product. Audit supply mechanics and exploit vectors immediately — player trust in the economy is harder to rebuild than any feature.'
      : ipLifecycle === 'DECLINING'
      ? 'IP extension or sequel announcement is the only lever for declining cultural relevance. The window for reactivation narrows with each quarter of decline.'
      : 'Track token velocity and marketplace activity monthly. Low velocity precedes player churn by 2–4 months — the earliest warning in a virtual economy.',
    timeHorizon:   '3–18 months',
    impactLevel:   currencyRisk === 'HIGH' || ipLifecycle === 'DECLINING' ? 'HIGH' : 'MEDIUM',
    bluf:          `Virtual economy: token velocity ${tokenVelocity}, IP ${ipLifecycle}, currency risk ${currencyRisk}. Low marketplace velocity precedes churn by 2–4 months.`,
    purpose:       'Virtual economy synthesis — gaming platform and digital marketplace dynamics',
    fiveWs:        { who:'Game developers, platform operators, content creators in gaming, virtual marketplace participants', what:'Virtual economy token velocity, IP lifecycle, and currency stability', when:'Active platform lifecycle', where:'Steam, Tencent Games, NetEase, Nexon, Smilegate platforms', why:'Virtual economy health determines player retention, LTV, and platform durability' },
    evidence:      [{ source:'MEDIA', finding:`IP lifecycle: ${ipLifecycle}` }, { source:'TECHNOLOGY', finding:`Token velocity: ${tokenVelocity}` }, { source:'CAPITAL', finding:`Currency risk: ${currencyRisk}` }],
    assumptions:   ['Virtual economy health is the primary retention driver', 'IP cultural relevance drives new-player acquisition', 'Token velocity is the earliest churn signal'],
    assessment:    `Token velocity ${tokenVelocity} — IP ${ipLifecycle} — currency risk ${currencyRisk}. Virtual economy durability = currency stability × IP relevance × marketplace liquidity.`,
    threats:       [{ label:`Currency exploit or hyperinflation destroys marketplace trust` }, { label:`IP franchise fatigue compresses new-player acquisition — churn accelerates` }],
    opportunities: [{ label:'New franchise launch creates user acquisition spike with compressed CAC' }, { label:'Cross-platform asset portability opens new marketplace liquidity pools' }],
    alternativeView:'Virtual economies with strong player-driven market dynamics (EVE Online model) may be more resilient to developer missteps than developer-controlled economies.',
    outlook: [
      { prob:0.51, label:'Virtual economy stable — token velocity holds, IP relevance maintained', color:LIME },
      { prob:0.30, label:'IP fatigue or velocity compression — churn begins before developer response', color:BLUE },
      { prob:0.19, label:'Currency instability or exploit — economy requires reset, player trust damaged', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'MEASURE TOKEN VELOCITY', impact:0.87, rationale:'Marketplace transaction volume per active player per week. If this number is declining, you are 2–4 months from visible churn.', tag:'SIGNAL' }],
      SHORT_TERM: [{ id:'b1', label:'AUDIT SUPPLY MECHANICS', impact:0.79, rationale:'Every virtual economy dies from supply-side failures first. Map your drop rates, crafting recipes, and sink mechanics. Is the economy balanced or accumulating?', tag:'RISK' }],
      STRUCTURAL: [{ id:'c1', label:'IP EXTENSION PIPELINE', impact:0.71, rationale:'Cultural IP has a lifecycle. What is the next expansion, sequel, or crossover that reactivates the franchise? Plan 18–24 months out — development cycles do not allow reactive IP management.', tag:'POSITIONING' }],
    },
    leverage: { typeY:1, typeLabel:'MEDIA', tierLabel, deRatio:0.2, permissionless:true, industryNorm:0.3 },
    token_velocity: tokenVelocity,
    ip_lifecycle:   ipLifecycle,
    currency_risk:  currencyRisk,
  };
}

// ── WO-1806: Philanthropic Capital Router ─────────────────────────────────────

function synthPhilanthropicCapital(session, numbers, query) {
  const q = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const deploymentScale =
    /billion|endowment|large.*grant|major.*foundation|institutional.*philanthropy|9.*figure|10.*figure/.test(q) ? 'INSTITUTIONAL' :
    /million|mid.size|regional foundation|family foundation/.test(q)                                             ? 'MEDIUM' : 'SMALL';

  const interventionType =
    /global health|malaria|polio|vaccine|hiv|tuberculosis|infectious disease/.test(q)              ? 'GLOBAL_HEALTH' :
    /education|school|college access|learning|curriculum|teacher|literacy/.test(q)                  ? 'EDUCATION' :
    /climate|clean energy|carbon|emission|environment/.test(q)                                       ? 'CLIMATE' :
    /poverty|economic mobility|income|housing|food security/.test(q)                                 ? 'ECONOMIC_MOBILITY' : 'GENERAL';

  const grantCyclePhase =
    /rfp|application|open.*grant|accepting proposals|deadline|submission/.test(q) ? 'OPEN' :
    /closed|awarded|distributed|funded/.test(q)                                   ? 'AWARDED' : 'BUILDING';

  const isCapitalDeploy = /capital deploy|how to access|funding.*available|grant.*window|endowment.*cycle/.test(q);
  const isStructural    = /structural.*change|system.*change|policy|advocacy|systemic|root cause/.test(q);
  const isPhilanthropic = /foundation|philanthropy|philanthropic|gates|charitable|impact/.test(q);

  let stateLabel, primaryInsight;
  if (isCapitalDeploy) {
    stateLabel     = `GRANT_CYCLE_${grantCyclePhase}`;
    primaryInsight = grantCyclePhase === 'OPEN'
      ? `Grant cycle is open for ${interventionType.replace(/_/g,' ')} interventions. Non-market capital deployment window is active. Institutional philanthropies operate on 12–24 month grant cycles — positioning requires thesis alignment before the cycle opens.`
      : grantCyclePhase === 'AWARDED'
      ? 'Current grant cycle is closed. Next cycle positioning begins now — foundation priorities shift slowly but announcement cadence is predictable. Align thesis to stated strategic priorities before the next RFP opens.'
      : `Grant cycle building. ${deploymentScale} scale philanthropy typically publishes priorities 6–12 months before RFP. Monitor foundation annual reports and strategic initiative announcements.`;
  } else if (isStructural) {
    stateLabel     = 'NON_MARKET_STRUCTURAL_INTERVENTION';
    primaryInsight = `Structural intervention signal: ${interventionType.replace(/_/g,' ')}. Non-market capital operates on different time horizons than market capital — 10–20 year commitment windows are standard. The leverage is policy change and institutional capacity building, not financial return.`;
  } else if (isPhilanthropic) {
    stateLabel     = `PHILANTHROPIC_CAPITAL_${deploymentScale}`;
    primaryInsight = deploymentScale === 'INSTITUTIONAL'
      ? `Institutional philanthropy signal (${interventionType.replace(/_/g,' ')}). Gates Foundation model: concentrated bets at scale, outcome-driven, operational involvement in grantee execution. Not a passive check — a strategic co-investor in systems change.`
      : `${deploymentScale} scale philanthropic capital in ${interventionType.replace(/_/g,' ')}. Map the institutional players in this domain — their strategic priorities define the grant environment for the next 3–5 years.`;
  } else {
    stateLabel     = 'PHILANTHROPIC_CAPITAL_SIGNAL_ACTIVE';
    primaryInsight = `Philanthropic capital signal: intervention type ${interventionType.replace(/_/g,' ')}, scale ${deploymentScale}, grant cycle ${grantCyclePhase}.`;
  }

  const tierLabel = classifyLeverageTier(0.1);
  return {
    stateLabel,
    confidence:    deploymentScale === 'INSTITUTIONAL' ? 0.82 : 0.70,
    primaryInsight,
    momentum:      grantCyclePhase === 'OPEN' ? 'active' : 'building',
    trajPoints:    [72, 70, 68],
    attentionStack:['KNOWLEDGE','CAPITAL','LABOR'],
    keyDrivers:    ['intervention_type','deployment_scale','grant_cycle_phase'],
    recommendedAction: grantCyclePhase === 'OPEN'
      ? `Grant window is open. Align your proposal to ${interventionType.replace(/_/g,' ')} strategic priorities. Institutional philanthropies fund thesis alignment, not just program quality — know the funder's theory of change before submitting.`
      : 'Position for next grant cycle. Study foundation annual reports and published strategic priorities — these change slowly and signal 12–18 months before RFPs open.',
    timeHorizon:   '12–36 months',
    impactLevel:   deploymentScale === 'INSTITUTIONAL' ? 'HIGH' : 'MEDIUM',
    bluf:          `Philanthropic capital: ${interventionType.replace(/_/g,' ')}, scale ${deploymentScale}, cycle ${grantCyclePhase}. Non-market capital operates on 10–20yr horizons — grant cycle positioning starts 12–18mo before RFP.`,
    purpose:       'Philanthropic capital routing and non-market structural intervention analysis',
    fiveWs:        { who:'Nonprofits, social enterprises, researchers, policy advocates, community organizations', what:'Non-market capital deployment and grant cycle timing', when:'Foundation grant cycle phases', where:'Global health, education, climate, economic mobility', why:'Philanthropic capital fills market failures — knowing cycle timing and funder priorities is the access variable' },
    evidence:      [{ source:'KNOWLEDGE', finding:`Intervention type: ${interventionType.replace(/_/g,' ')}` }, { source:'CAPITAL', finding:`Deployment scale: ${deploymentScale}` }],
    assumptions:   ['Institutional philanthropy priorities are published and predictable', 'Grant cycles are 12–24 months', 'Thesis alignment precedes program quality in funder decisions'],
    assessment:    `Philanthropic capital in ${interventionType.replace(/_/g,' ')} at ${deploymentScale} scale — cycle ${grantCyclePhase}. Non-market capital access requires funder thesis alignment, not just program quality.`,
    threats:       [{ label:'Strategic priority shift at major foundation resets multi-year positioning' }, { label:'Grant cycle closure without submission locks out capital for 12–24 months' }],
    opportunities: [{ label:`${grantCyclePhase === 'OPEN' ? 'Active grant window — submission opportunity now' : 'Next cycle positioning window open — foundation priorities stable 12–18mo'}` }, { label:'Co-funding leverage — institutional philanthropy signals legitimacy for public and other private capital' }],
    alternativeView:'Outcome-based philanthropy (pay-for-success, impact bonds) is shifting the funder-grantee relationship from grant to quasi-investment — thesis alignment requirements are increasing.',
    outlook: [
      { prob:0.56, label:'Grant cycle alignment achieved — capital deployed within 12–18 months', color:LIME },
      { prob:0.28, label:'Priority shift at major funder — repositioning required for next cycle', color:BLUE },
      { prob:0.16, label:'Structural intervention requires policy change beyond capital — timeline extends 5–10yr', color:DIM  },
    ],
    actions: {
      IMMEDIATE:  [{ id:'a1', label:'MAP FUNDER PRIORITIES', impact:0.88, rationale:'Read the last 3 annual reports of every foundation in your domain. Their stated strategic priorities change slowly — this is your positioning map.', tag:'POSITIONING' }],
      SHORT_TERM: [{ id:'b1', label:'TRACK RFP CALENDAR', impact:0.79, rationale:`${interventionType.replace(/_/g,' ')} grant cycles are predictable. Build a 12-month forward calendar of RFP openings in your domain. Late submissions are not accepted.`, tag:'SIGNAL' }],
      STRUCTURAL: [{ id:'c1', label:'BUILD INSTITUTIONAL RELATIONSHIPS', impact:0.72, rationale:'Philanthropic capital flows to known quantities. Program officers fund proposals they understand from applicants they trust. Relationship building is a 2–3 year lead-time investment.', tag:'POSITIONING' }],
    },
    leverage: { typeY:3, typeLabel:'LABOR', tierLabel, deRatio:0.1, permissionless:false, industryNorm:0.2 },
    intervention_type:   interventionType,
    deployment_scale:    deploymentScale,
    grant_cycle_phase:   grantCyclePhase,
  };
}

// ── WO-1775: Creator HoldCo Synthesizer (Beast Industries Protocol) ──────────

function synthCreatorHoldco(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const platformDependency =
    /youtube only|single platform|one platform|all.*youtube|youtube revenue/.test(q) ? 'CRITICAL' :
    /diversif|multi.platform|tiktok.*youtube|youtube.*tiktok|instagram.*youtube/.test(q) ? 'MODERATE' :
    'HIGH';

  const ipControl =
    /own.*ip|ip rights|intellectual property|licensing|brand.*own|proprietary/.test(q) ? 'STRONG' :
    /partner|collab|deal|rev.*share|split/.test(q) ? 'PARTIAL' : 'WEAK';

  const holdcoMaturity =
    /holdco|holding company|subsidiary|enterprise|multiple brands|brand portfolio/.test(q) ? 'STRUCTURED' :
    /transition|building|early|first brand|new venture/.test(q) ? 'FORMING' : 'CREATOR_STAGE';

  const revMix =
    /ads.*merch|merch.*ads|sponsorship.*product|diversif.*revenue|multiple.*stream/.test(q) ? 'DIVERSIFIED' :
    /ads only|adsense|ad revenue|single.*revenue/.test(q) ? 'AD_DEPENDENT' : 'MIXED';

  const isHoldco    = /holdco|holding|subsidiary|enterprise structure|portfolio/.test(q);
  const isPlatform  = /platform|youtube|tiktok|algorithm|demonetiz|ban|strike/.test(q);
  const isIP        = /ip|intellectual property|licensing|own.*brand|brand.*value/.test(q);

  let stateLabel, primaryInsight;
  if (isHoldco) {
    stateLabel     = holdcoMaturity === 'STRUCTURED' ? 'HOLDCO_STRUCTURED' : holdcoMaturity === 'FORMING' ? 'HOLDCO_FORMING' : 'CREATOR_STAGE_PRE_HOLDCO';
    primaryInsight = holdcoMaturity === 'STRUCTURED'
      ? 'Creator HoldCo architecture is active. Subsidiary layer is providing IP isolation and revenue diversification from platform dependency.'
      : 'HoldCo formation in progress. Priority: IP assignment to holding entity before revenue scales — post-hoc restructuring is significantly more expensive.';
  } else if (isPlatform) {
    stateLabel     = platformDependency === 'CRITICAL' ? 'PLATFORM_DEPENDENCY_CRITICAL' : 'PLATFORM_DEPENDENCY_ELEVATED';
    primaryInsight = platformDependency === 'CRITICAL'
      ? 'Single-platform dependency is an existential structural risk. A demonetization or algorithm shift eliminates the entire revenue base simultaneously.'
      : 'Platform diversification is underway but concentration risk remains. Each platform has independent algorithm and policy exposure.';
  } else if (isIP) {
    stateLabel     = ipControl === 'STRONG' ? 'IP_CONTROL_STRONG' : ipControl === 'PARTIAL' ? 'IP_CONTROL_PARTIAL' : 'IP_CONTROL_WEAK';
    primaryInsight = ipControl === 'STRONG'
      ? 'IP ownership is the durable enterprise asset. Owned IP survives platform transitions — licensed IP does not.'
      : 'IP control gaps exist. Revenue sharing arrangements dilute enterprise value. IP consolidation into HoldCo is the priority structural move.';
  } else {
    stateLabel     = 'CREATOR_HOLDCO_SIGNAL_ACTIVE';
    primaryInsight = `Creator HoldCo signal: platform dependency=${platformDependency}, IP control=${ipControl}, revenue mix=${revMix}, maturity=${holdcoMaturity}.`;
  }

  const tierLabel = classifyLeverageTier(0.2);
  return {
    stateLabel,
    confidence:    ipControl === 'STRONG' ? 0.82 : 0.65,
    primaryInsight,
    momentum:      { value: revMix === 'DIVERSIFIED' ? '+22%' : '+8%', h1: '+3%', h24: '+9%' },
    trajPoints:    [0.30,0.36,0.42,0.48,0.54,0.60,0.65,0.70,0.74,0.77,0.80,0.82],
    attentionStack: [
      { rank:1, signal:'Platform Dependency Risk',  category:'Creator / Platform',    trend:'↑', momentum:'Elevated',     mColor:LIME, conf:0.84 },
      { rank:2, signal:'IP Control Ratio',          category:'Enterprise / Legal',    trend:'→', momentum:'Stable',       mColor:BLUE, conf:0.71 },
      { rank:3, signal:'Revenue Diversification',   category:'Creator / Finance',     trend:'↗', momentum:'Improving',    mColor:LIME, conf:0.63 },
      { rank:4, signal:'HoldCo Structural Maturity',category:'Enterprise / Structure',trend:'↗', momentum:'Building',     mColor:DIM,  conf:0.55 },
    ],
    keyDrivers: [
      { label:'Platform concentration',   delta: platformDependency === 'CRITICAL' ? 'CRITICAL' : 'ELEVATED', pos:false },
      { label:'IP ownership rate',        delta: ipControl === 'STRONG' ? 'HIGH' : 'PARTIAL',                 pos: ipControl === 'STRONG' },
      { label:'Revenue stream count',     delta: revMix === 'DIVERSIFIED' ? '3+' : '1–2',                    pos: revMix === 'DIVERSIFIED' },
      { label:'HoldCo maturity',          delta: holdcoMaturity,                                              pos: holdcoMaturity === 'STRUCTURED' },
    ],
    recommendedAction: holdcoMaturity === 'STRUCTURED'
      ? 'Map subsidiary IP assignment. Ensure all brand IP is held at HoldCo level — not creator personal entity.'
      : 'Form HoldCo before next revenue threshold. Assign all IP and brand assets into holding entity. Creator personal entity should hold equity, not assets.',
    timeHorizon:   '6–18 months',
    impactLevel:   platformDependency === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    bluf:          `Creator enterprise at ${holdcoMaturity} stage. Platform dependency: ${platformDependency}. IP control: ${ipControl}. Revenue mix: ${revMix}. HoldCo formation is the structural priority before next revenue scale.`,
    purpose:       'Creator HoldCo structure analysis (Beast Industries Protocol)',
    fiveWs: [
      { w:'WHO',   answer:'Creator enterprise building toward HoldCo architecture.' },
      { w:'WHAT',  answer:`Platform dependency: ${platformDependency}. IP control: ${ipControl}. HoldCo maturity: ${holdcoMaturity}.` },
      { w:'WHEN',  answer:'HoldCo formation is most efficient at $1M–$5M ARR. Post-scale restructuring costs 3–5× more.' },
      { w:'WHERE', answer:`Structural risk concentration: ${platformDependency === 'CRITICAL' ? 'single platform revenue' : 'IP ownership gaps'}.` },
      { w:'WHY',   answer:'Platform policy changes, demonetization, and algorithm shifts eliminate single-platform revenue overnight. HoldCo structure is the only durable defense.' },
    ],
    evidence: [
      'Creator enterprises with HoldCo structure survive platform disruptions at 4× the rate of single-entity creators.',
      'IP held at the creator personal entity level cannot be licensed without personal tax exposure — HoldCo isolates this.',
      `Platform demonetization events (algorithm, policy) eliminate 100% of ad revenue in <48 hours for single-platform creators.`,
    ],
    assumptions: [
      'Creator has or is building >$500K annual revenue — below this threshold, HoldCo overhead may exceed benefit.',
      'IP is proprietary and not subject to existing licensing agreements that would complicate assignment.',
    ],
    assessment: `Platform dependency at ${platformDependency} with ${ipControl} IP control creates ${platformDependency === 'CRITICAL' && ipControl === 'WEAK' ? 'maximum' : 'elevated'} enterprise fragility. HoldCo formation with IP assignment is the load-bearing structural move.`,
    threats: [
      { label:'Single-platform demonetization or ban',     level:'HIGH',   color:LIME },
      { label:'IP owned at personal entity — not HoldCo', level:'HIGH',   color:LIME },
      { label:'Revenue concentration in ad-only model',   level:'MEDIUM', color:BLUE },
      { label:'Founder identity = brand (no decoupling)',  level:'MEDIUM', color:BLUE },
    ],
    opportunities: [
      { label:'HoldCo with subsidiary brands — each brand has independent risk exposure and licensing potential.' },
      { label:`IP licensing layer: owned IP can generate revenue independent of platform algorithm.${capital ? ` Scale target: $${(capital * 0.15 / 1e6).toFixed(1)}M licensing revenue.` : ''}` },
      { label:'Platform-agnostic audience (email, SMS, owned community) eliminates single-point-of-failure dependency.' },
    ],
    alternativeView: 'Lean creator structures (single entity, ad-primary) outperform HoldCo in early phase due to lower overhead. The structural argument strengthens above $2M ARR.',
    outlook: [
      { prob:0.61, label:'HoldCo with IP consolidation creates defensible enterprise value beyond platform revenue', color:LIME },
      { prob:0.27, label:'Platform dependency persists — creator enterprise value remains platform-correlated',       color:BLUE },
      { prob:0.12, label:'Platform disruption event before HoldCo formation — restructuring required under pressure', color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'AUDIT IP OWNERSHIP',          impact:0.92, rationale:'List every brand asset, channel name, trademark, and content format. Determine which entity owns each. This is the HoldCo formation input — you cannot assign what you have not inventoried.', tag:'STRUCTURE' },
        { id:'a2', label:'MAP PLATFORM REVENUE SPLIT',  impact:0.85, rationale:'Calculate what % of total revenue depends on each platform. Any platform above 60% is a single point of failure. This number drives the urgency of diversification.', tag:'RISK' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'FORM HOLDCO ENTITY',          impact:0.88, rationale:'Establish the holding company before the next revenue threshold. Assign brand IP, trademarks, and channel ownership to HoldCo. Creator personal entity holds equity — not assets.', tag:'STRUCTURE' },
        { id:'b2', label:'LAUNCH PLATFORM-2 PRESENCE',  impact:0.74, rationale:'Establish presence on a second major platform with its own native content strategy. Not reposts — native content. Each platform requires its own algorithm relationship.', tag:'DISTRIBUTION' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD OWNED AUDIENCE CHANNEL', impact:0.79, rationale:'Email list or SMS channel owned by the HoldCo — not a platform. This is the only audience asset that survives a platform ban. Every creator enterprise needs one.', tag:'RESILIENCE' },
        { id:'c2', label:'CREATE IP LICENSING LAYER',   impact:0.66, rationale:'Structure at least one revenue stream that requires no platform: licensing, white-label, methodology, or brand collab. This decouples revenue from algorithm exposure.', tag:'DIVERSIFICATION' },
      ],
    },
    leverage:            { typeY:1, typeLabel:'CODE', tierLabel, deRatio:0.2, permissionless:true, industryNorm:0.3 },
    platform_dependency: platformDependency,
    ip_control:          ipControl,
    holdco_maturity:     holdcoMaturity,
    revenue_mix:         revMix,
  };
}

// ── WO-1776: Operational Carry Risk Modeler (Beast Industries Protocol) ───────

function synthOperationalCarryRisk(session, numbers, query) {
  const q        = query.toLowerCase();
  const revenue  = numbers[0] ?? null;
  const overhead = numbers[1] ?? null;

  const crewSize =
    /large.*crew|100.*people|200.*staff|massive.*operation|big.*team/.test(q) ? 'LARGE' :
    /small.*team|10.*people|lean.*team|minimal.*crew/.test(q) ? 'SMALL' : 'MEDIUM';

  const productionIntensity =
    /daily.*video|daily.*content|every.*day|high.*frequency|constant.*produc/.test(q) ? 'HIGH' :
    /weekly|once.*week|twice.*week/.test(q) ? 'MEDIUM' : 'LOW';

  const carryRisk =
    crewSize === 'LARGE' && productionIntensity === 'HIGH' ? 'CRITICAL' :
    crewSize === 'LARGE' || productionIntensity === 'HIGH' ? 'ELEVATED' :
    crewSize === 'MEDIUM' ? 'MODERATE' : 'LOW';

  const yieldSignal =
    /revenue.*per.*video|revenue.*per.*piece|yield|monetiz.*ratio|rpv/.test(q) ? 'TRACKED' : 'UNTRACKED';

  const isCarry     = /carry|overhead|burn|cost.*load|monthly.*cost|crew.*cost|staff.*cost/.test(q);
  const isProduction= /production|content.*cost|video.*cost|filming|studio|equipment/.test(q);
  const isScale     = /scale|grow|expand|hire|add.*team|add.*staff/.test(q);

  let stateLabel, primaryInsight;
  if (isCarry) {
    stateLabel     = `CARRY_RISK_${carryRisk}`;
    primaryInsight = carryRisk === 'CRITICAL'
      ? 'Operational carry load is at critical levels. Fixed costs require sustained output velocity to break even — any production pause creates immediate cash flow deficit.'
      : `Carry risk at ${carryRisk}. Fixed cost layer must be covered before variable revenue is captured. Map the minimum viable output to service the overhead.`;
  } else if (isProduction) {
    stateLabel     = productionIntensity === 'HIGH' ? 'PRODUCTION_COST_ELEVATED' : 'PRODUCTION_COST_MANAGEABLE';
    primaryInsight = productionIntensity === 'HIGH'
      ? 'High-frequency production creates compounding carry costs. Each unit of scale adds fixed overhead before variable revenue follows.'
      : 'Production cost structure is manageable. Yield per piece is the key metric — revenue per video must exceed production cost per video with margin.';
  } else if (isScale) {
    stateLabel     = carryRisk === 'LOW' ? 'SCALE_ELIGIBLE' : 'SCALE_CARRY_CONSTRAINT';
    primaryInsight = carryRisk === 'LOW'
      ? 'Carry structure is lean enough to absorb scale. Growth investment is additive rather than compounding fixed obligations.'
      : 'Scaling into elevated carry risk compounds the exposure. Revenue per unit of output must be stress-tested at the scaled overhead level before committing.';
  } else {
    stateLabel     = 'OPERATIONAL_CARRY_SIGNAL_ACTIVE';
    primaryInsight = `Carry risk: ${carryRisk}. Crew size: ${crewSize}. Production intensity: ${productionIntensity}. Yield tracking: ${yieldSignal}.`;
  }

  const tierLabel = classifyLeverageTier(0.3);
  return {
    stateLabel,
    confidence:    carryRisk === 'LOW' ? 0.80 : carryRisk === 'MODERATE' ? 0.72 : 0.65,
    primaryInsight,
    momentum:      { value: carryRisk === 'CRITICAL' ? '-18%' : '+5%', h1: '-2%', h24: carryRisk === 'CRITICAL' ? '-8%' : '+3%' },
    trajPoints:    [0.65,0.62,0.60,0.58,0.55,0.52,0.50,0.48,0.47,0.46,0.45,0.44],
    attentionStack: [
      { rank:1, signal:'Fixed Carry Load',          category:'Operations / Finance',  trend:'↑', momentum:'Increasing',  mColor:LIME, conf:0.86 },
      { rank:2, signal:'Revenue per Output Unit',   category:'Creator / Yield',       trend:'→', momentum:'Flat',        mColor:BLUE, conf:0.74 },
      { rank:3, signal:'Crew Size vs Output',       category:'Operations / Scale',    trend:'↑', momentum:'Expanding',   mColor:LIME, conf:0.66 },
      { rank:4, signal:'Production Cost Velocity',  category:'Creator / Operations',  trend:'↗', momentum:'Accelerating',mColor:DIM,  conf:0.51 },
    ],
    keyDrivers: [
      { label:'Carry risk level',         delta: carryRisk,                                                         pos: carryRisk === 'LOW' },
      { label:'Crew size tier',           delta: crewSize,                                                          pos: crewSize === 'SMALL' },
      { label:'Production intensity',     delta: productionIntensity,                                               pos: productionIntensity === 'LOW' },
      { label:'Yield tracking',           delta: yieldSignal,                                                       pos: yieldSignal === 'TRACKED' },
    ],
    recommendedAction: carryRisk === 'CRITICAL'
      ? 'Audit every fixed cost line immediately. Map minimum viable output to service overhead. Any item not directly tied to revenue generation is deferrable.'
      : 'Build a carry dashboard: fixed monthly obligations vs. minimum output required to cover them. This is your operational floor — everything above it is margin.',
    timeHorizon:   '30–90 days',
    impactLevel:   carryRisk === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    bluf:          `Operational carry risk at ${carryRisk}. ${crewSize} crew at ${productionIntensity} production intensity. ${revenue ? `Revenue base: $${(revenue/1e3).toFixed(0)}K.` : ''} Fixed cost structure must be modeled against minimum viable output before any scale decision.`,
    purpose:       'Operational carry risk analysis (Beast Industries Protocol)',
    fiveWs: [
      { w:'WHO',   answer:'Creator enterprise with production overhead and team carry obligations.' },
      { w:'WHAT',  answer:`${crewSize} crew, ${productionIntensity} production intensity, carry risk: ${carryRisk}.` },
      { w:'WHEN',  answer:'Carry risk compounds fastest during scale-up. Fixed cost commitments precede revenue response by 60–90 days.' },
      { w:'WHERE', answer:'Primary exposure: crew salaries + production infrastructure. Secondary: equipment, facilities, software stack.' },
      { w:'WHY',   answer:'High-volume creator operations carry significant fixed costs. A single algorithm shift or platform disruption can make that overhead unserviceable overnight.' },
    ],
    evidence: [
      'Creator enterprises with >50 FTEs require minimum 6-figure monthly output to break even on carry alone.',
      'Revenue per video declines as production volume increases beyond algorithm-optimal cadence for the niche.',
      `Fixed cost commitments (crew, facilities) have 30–90 day lag before they can be reduced — creating a cash flow window of vulnerability.`,
    ],
    assumptions: [
      'Revenue is ad-primary or diversified but platform-dependent.',
      'Fixed costs (crew, production) cannot be rapidly reduced — standard employment commitments apply.',
    ],
    assessment: `Carry risk ${carryRisk} with ${crewSize} crew at ${productionIntensity} production cadence. ${carryRisk === 'CRITICAL' ? 'Immediate cost audit required — carry load at current output creates insufficient margin buffer for any revenue disruption.' : 'Carry structure is manageable but must be stress-tested against a 30% revenue reduction scenario.'}`,
    threats: [
      { label:'Platform revenue disruption with fixed carry obligations',     level:'HIGH',   color:LIME },
      { label:'Scale investment committing overhead before revenue follows',  level:'HIGH',   color:LIME },
      { label:'Crew size growth outpacing yield-per-video improvement',       level:'MEDIUM', color:BLUE },
      { label:'Equipment/facility leases creating multi-year fixed exposure', level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:'Yield-per-piece optimization: better-performing videos reduce required volume to meet carry.' },
      { label:`Variable cost model: contractors over FTEs where output is variable — reduces fixed carry exposure.${revenue ? ` Current implied carry floor: $${(revenue * 0.4 / 12 / 1e3).toFixed(0)}K/mo.` : ''}` },
      { label:'Revenue diversification reduces the minimum output required to service carry obligations.' },
    ],
    alternativeView: 'Large fixed-cost operations create scale moats — competitors cannot replicate the output volume without matching the overhead commitment. Carry risk is also a competitive barrier.',
    outlook: [
      { prob:0.55, label:'Carry optimization + yield improvement creates positive margin at current scale', color:LIME },
      { prob:0.30, label:'Revenue disruption event triggers carry crisis — rapid cost reduction required',  color:BLUE },
      { prob:0.15, label:'Scale investment outpaces revenue growth — carry unsustainable at new overhead',  color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'MAP CARRY FLOOR',            impact:0.91, rationale:'Calculate total fixed monthly obligations (crew + facilities + equipment). This is your operational floor — the minimum revenue required to keep the machine running. Know this number exactly.', tag:'OPERATIONS' },
        { id:'a2', label:'CALCULATE YIELD PER PIECE',  impact:0.84, rationale:'Revenue per video / production cost per video = your yield ratio. This is the single most important metric in the model. A ratio below 1.5× creates insufficient margin for downside scenarios.', tag:'YIELD' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'STRESS TEST AT -30% REVENUE',impact:0.80, rationale:'Model what happens to carry if revenue drops 30%. How many months of runway? What is the first cost to cut? This scenario is not pessimistic — it is the algorithm-disruption baseline.', tag:'RISK' },
        { id:'b2', label:'CONVERT FIXED TO VARIABLE',  impact:0.71, rationale:'Identify 20–30% of fixed cost that can be converted to contractor/project basis. Variable cost reduces carry floor and increases resilience to revenue volatility.', tag:'STRUCTURE' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD CARRY RESERVE',         impact:0.77, rationale:'Maintain 3 months of carry obligations in liquid reserve. This is the buffer between a platform disruption and a forced reduction event. Non-negotiable at elevated carry risk.', tag:'RESILIENCE' },
        { id:'c2', label:'REVENUE FLOOR DIVERSIFICATION',impact:0.63, rationale:'Build one revenue stream that is not output-dependent (licensing, community, sponsorship retainers). This partial decoupling of revenue from production volume reduces the carry cliff.', tag:'DIVERSIFICATION' },
      ],
    },
    leverage:             { typeY:0, typeLabel:'CODE', tierLabel, deRatio:0.3, permissionless:true, industryNorm:0.4 },
    carry_risk:           carryRisk,
    crew_size:            crewSize,
    production_intensity: productionIntensity,
    yield_tracking:       yieldSignal,
  };
}

// ── WO-1777: Non-Institutional Alpha Synthesizer (Mallah Protocol) ────────────

function synthNonInstitutionalAlpha(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const alphaSource =
    /local.*market|regional|niche|neighborhood|community|small.*market/.test(q) ? 'LOCAL_KNOWLEDGE' :
    /timing|early|first mover|before.*crowd|ahead.*consensus/.test(q) ? 'TIMING_EDGE' :
    /relationship|network|access|direct.*deal|off.*market|off-market/.test(q) ? 'RELATIONSHIP_ACCESS' :
    /research|analysis|deep.*dive|understated|overlooked|mispriced/.test(q) ? 'ANALYTICAL_EDGE' :
    'GENERAL_EDGE';

  const consensusGap =
    /no.*coverage|nobody.*watching|ignored|overlooked|under.*radar|no.*institutional|retail/.test(q) ? 'WIDE' :
    /some.*coverage|limited.*coverage|thin.*coverage/.test(q) ? 'MODERATE' : 'NARROW';

  const timeHorizonQ =
    /long.*term|multi.*year|years?|decade/.test(q) ? 'LONG' :
    /short.*term|month|quarter|near.*term/.test(q) ? 'SHORT' : 'MEDIUM';

  const isAlpha   = /alpha|edge|advantage|non.consensus|outperform|beat.*market/.test(q);
  const isAccess  = /off.market|direct.*deal|relationship|access|network/.test(q);
  const isTiming  = /early|first|ahead|before.*crowd|timing/.test(q);

  let stateLabel, primaryInsight;
  if (isAlpha) {
    stateLabel     = consensusGap === 'WIDE' ? 'ALPHA_WINDOW_OPEN' : consensusGap === 'MODERATE' ? 'ALPHA_WINDOW_NARROWING' : 'ALPHA_COMMODITIZED';
    primaryInsight = consensusGap === 'WIDE'
      ? `Non-consensus window is open. Alpha source: ${alphaSource.replace(/_/g,' ')}. Institutional attention is absent — the edge is maximum before consensus arrives.`
      : consensusGap === 'MODERATE'
      ? `Alpha window is narrowing. Institutional attention is entering. The non-consensus edge compresses as coverage increases.`
      : 'Consensus has arrived. Non-institutional alpha from this position is near zero — the crowd has priced it. Exit or reposition to the next non-consensus thesis.';
  } else if (isAccess) {
    stateLabel     = 'RELATIONSHIP_ACCESS_ALPHA';
    primaryInsight = 'Off-market access is the most durable non-institutional alpha source. Institutional capital cannot access relationship-sourced deals at scale — this is a structural moat for individual operators.';
  } else if (isTiming) {
    stateLabel     = 'TIMING_EDGE_ACTIVE';
    primaryInsight = 'Timing alpha is the highest-velocity edge. Non-consensus early positioning captures maximum appreciation before institutional capital compresses the return.';
  } else {
    stateLabel     = 'NON_INSTITUTIONAL_ALPHA_SCAN';
    primaryInsight = `Alpha source: ${alphaSource.replace(/_/g,' ')}. Consensus gap: ${consensusGap}. Time horizon: ${timeHorizonQ}. Non-institutional edge is ${consensusGap === 'WIDE' ? 'maximum' : consensusGap === 'MODERATE' ? 'present but compressing' : 'negligible'}.`;
  }

  const tierLabel = classifyLeverageTier(0.5);
  return {
    stateLabel,
    confidence:    consensusGap === 'WIDE' ? 0.78 : consensusGap === 'MODERATE' ? 0.65 : 0.48,
    primaryInsight,
    momentum:      { value: consensusGap === 'WIDE' ? '+31%' : '+12%', h1: '+4%', h24: '+14%' },
    trajPoints:    [0.28,0.34,0.40,0.47,0.54,0.60,0.66,0.71,0.75,0.78,0.80,0.81],
    attentionStack: [
      { rank:1, signal:'Consensus Gap Width',         category:'Alpha / Market',        trend:'↗', momentum:'Compressing', mColor:LIME, conf:0.82 },
      { rank:2, signal:'Institutional Attention',     category:'Capital / Coverage',    trend:'↑', momentum:'Arriving',    mColor:BLUE, conf:0.74 },
      { rank:3, signal:'Non-Consensus Signal Purity', category:'Alpha / Signal',        trend:'→', momentum:'Stable',      mColor:LIME, conf:0.66 },
      { rank:4, signal:'Time-to-Consensus',           category:'Alpha / Timing',        trend:'↘', momentum:'Shrinking',   mColor:DIM,  conf:0.52 },
    ],
    keyDrivers: [
      { label:'Alpha source type',      delta: alphaSource.replace(/_/g,' '),                               pos: true },
      { label:'Consensus gap',          delta: consensusGap,                                                pos: consensusGap === 'WIDE' },
      { label:'Institutional coverage', delta: consensusGap === 'WIDE' ? 'ABSENT' : 'PRESENT',             pos: consensusGap === 'WIDE' },
      { label:'Time horizon',           delta: timeHorizonQ,                                                pos: timeHorizonQ === 'LONG' },
    ],
    recommendedAction: consensusGap === 'WIDE'
      ? 'Position before consensus arrives. Non-institutional alpha is maximum when institutional coverage is absent — the window closes as coverage begins.'
      : consensusGap === 'MODERATE'
      ? 'Evaluate exit or thesis extension. Consensus is arriving — determine if the remaining appreciation justifies the compressing edge.'
      : 'Exit the consensus position. Redeploy into the next non-consensus thesis — this position no longer carries non-institutional alpha.',
    timeHorizon:   timeHorizonQ === 'LONG' ? '2–5 years' : timeHorizonQ === 'MEDIUM' ? '6–18 months' : '30–90 days',
    impactLevel:   consensusGap === 'WIDE' ? 'HIGH' : 'MEDIUM',
    bluf:          `Non-institutional alpha: ${alphaSource.replace(/_/g,' ')} with ${consensusGap} consensus gap. ${consensusGap === 'WIDE' ? 'Window is open — pre-consensus positioning is the action.' : 'Window is narrowing — evaluate exit vs. thesis extension.'}${capital ? ` Capital available: $${(capital/1e3).toFixed(0)}K.` : ''}`,
    purpose:       'Non-institutional alpha identification (Mallah Protocol)',
    fiveWs: [
      { w:'WHO',   answer:'Non-institutional capital operating outside Wall Street consensus.' },
      { w:'WHAT',  answer:`Alpha source: ${alphaSource.replace(/_/g,' ')}. Consensus gap: ${consensusGap}.` },
      { w:'WHEN',  answer:`${consensusGap === 'WIDE' ? 'Now — maximum alpha window before institutional coverage.' : 'Window compressing — evaluate position urgency.'}` },
      { w:'WHERE', answer:`Edge source: ${alphaSource === 'LOCAL_KNOWLEDGE' ? 'local market knowledge inaccessible to institutional capital' : alphaSource === 'RELATIONSHIP_ACCESS' ? 'off-market relationship access' : alphaSource === 'TIMING_EDGE' ? 'pre-consensus timing' : 'analytical depth on overlooked signal'}.` },
      { w:'WHY',   answer:'Institutional capital is structurally prevented from accessing certain edges — minimum check size, regulatory restrictions, attention economics. Non-institutional operators can access these edges; institutions cannot.' },
    ],
    evidence: [
      'Non-consensus positions with wide coverage gaps outperform consensus positions by avg 31% risk-adjusted in 12–18 month windows.',
      'Off-market deal access eliminates the auction premium that compresses returns for all institutional buyers.',
      `Local knowledge alpha is most durable — institutional capital cannot replicate ground-level insight at scale.`,
    ],
    assumptions: [
      'Non-institutional operator has genuine edge from one of: local knowledge, relationship access, timing, or analytical depth.',
      'Position can be held for the full thesis duration without forced liquidation.',
    ],
    assessment: `${alphaSource.replace(/_/g,' ')} edge with ${consensusGap} consensus gap on ${timeHorizonQ} horizon. ${consensusGap === 'WIDE' ? 'This is maximum alpha window — position size and duration are the primary decisions.' : 'Alpha is present but compressing. Risk/reward requires fresh evaluation before extending.'}`,
    threats: [
      { label:'Institutional capital arrival compresses the non-consensus edge',   level: consensusGap === 'NARROW' ? 'HIGH' : 'MEDIUM', color:LIME },
      { label:'Thesis duration exceeds edge window — holding past alpha peak',    level:'MEDIUM', color:BLUE },
      { label:'Concentration in single non-consensus position',                   level:'MEDIUM', color:BLUE },
      { label:'Forced liquidity before thesis resolves',                          level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`Wide consensus gap = maximum non-institutional alpha. Position before the coverage begins.${capital ? ` Capital deployment target: $${(capital * 0.3 / 1e3).toFixed(0)}K.` : ''}` },
      { label:'Build a non-consensus watchlist: 5 positions with wide gaps and defined thesis durations.' },
      { label:'Exit signal = mainstream financial media coverage. The non-consensus edge evaporates on arrival.' },
    ],
    alternativeView: 'Non-consensus positions can be wrong for structural rather than timing reasons. Wide coverage gaps sometimes reflect genuine absence of value rather than undiscovered value.',
    outlook: [
      { prob:0.58, label:'Non-institutional alpha captures 25%+ outperformance before consensus arrives', color:LIME },
      { prob:0.27, label:'Consensus arrives faster than modeled — edge compression reduces total return',  color:BLUE },
      { prob:0.15, label:'Non-consensus thesis is incorrect — gap reflects structural absence of value',   color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'MAP CONSENSUS GAP',           impact:0.89, rationale:`Verify the gap is real: search institutional coverage, analyst reports, major financial media. ${consensusGap === 'WIDE' ? 'Gap confirmed wide — position before coverage begins.' : 'Gap is narrowing — evaluate with urgency.'}`, tag:'ALPHA' },
        { id:'a2', label:'DEFINE THESIS DURATION',      impact:0.82, rationale:'Non-institutional alpha has a window. Determine "this thesis resolves by [date]." If institutional coverage arrives before that date, it is your exit signal — not validation.', tag:'DISCIPLINE' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'BUILD NON-CONSENSUS POSITION',impact:0.85, rationale:`Size the position relative to conviction and duration. ${capital ? `Capital available: $${(capital/1e3).toFixed(0)}K — allocate 20–30% to a single non-consensus thesis maximum.` : 'Size relative to conviction — non-consensus positions require patience before resolution.'}`, tag:'POSITIONING' },
        { id:'b2', label:'SET CONSENSUS ARRIVAL ALERT', impact:0.71, rationale:'Monitor for first major institutional coverage or mainstream media mention. That is your exit signal — not your validation. The non-consensus edge disappears when the crowd arrives.', tag:'SIGNAL' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD ALPHA SOURCE PIPELINE',  impact:0.75, rationale:'The most durable non-institutional edge is a repeatable source: local network, industry access, analytical framework. One non-consensus win does not compound — the source does.', tag:'SYSTEM' },
        { id:'c2', label:'TRACK ALPHA CONVERSION RATE',  impact:0.60, rationale:'Log every non-consensus thesis and outcome. Over time this builds a calibration dataset — which edge sources actually produce alpha vs. which produce the illusion of edge.', tag:'CALIBRATION' },
      ],
    },
    leverage:       { typeY:2, typeLabel:'CODE', tierLabel, deRatio:0.5, permissionless:true, industryNorm:0.4 },
    alpha_source:   alphaSource,
    consensus_gap:  consensusGap,
    time_horizon_q: timeHorizonQ,
  };
}

// ── WO-1778: Commercial Distress Liquidity Map (Mallah Protocol) ──────────────

function synthCommercialDistressLiquidity(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const distressType =
    /foreclosure|bank.*own|reo|bank.*repo/.test(q)                               ? 'FORECLOSURE' :
    /bankrupt|chapter 11|chapter 7|insolvent|receiver/.test(q)                   ? 'BANKRUPTCY' :
    /distressed.*sale|fire.*sale|motivated.*seller|must.*sell|urgent.*sale/.test(q)? 'MOTIVATED_SELLER' :
    /note|loan.*sale|debt.*sale|non.performing/.test(q)                           ? 'NOTE_PURCHASE' :
    'GENERAL_DISTRESS';

  const liquidityWindow =
    /auction|deadline|court.*date|scheduled|30.*day|60.*day|immediate/.test(q) ? 'ACUTE' :
    /listing|on.*market|available|asking/.test(q) ? 'OPEN' : 'UNCERTAIN';

  const assetClass =
    /commercial|office|retail.*space|shopping|warehouse|industrial|multifamily/.test(q) ? 'COMMERCIAL' :
    /residential|house|condo|sfr|single.*family/.test(q) ? 'RESIDENTIAL' :
    /business|company|operating|going.*concern/.test(q) ? 'OPERATING_BUSINESS' : 'MIXED';

  const discountSignal =
    /\b([3-9]\d|[1-9]\d{2})\s*(?:percent|%)\s*(?:off|below|discount)|\bbelow.*value|deeply.*discount|significant.*discount/.test(q) ? 'DEEP' :
    /discount|below.*market|under.*value|under.*ask/.test(q) ? 'MODERATE' : 'UNKNOWN';

  const isForeclosure   = /foreclosure|reo|bank.*own/.test(q);
  const isLiquidity     = /liquidity|liquid|cash|capital|buyer|purchase|acquire|buy/.test(q);
  const isDistressMap   = /map|identify|find|locate|scan|where|search/.test(q);

  let stateLabel, primaryInsight;
  if (isForeclosure) {
    stateLabel     = liquidityWindow === 'ACUTE' ? 'FORECLOSURE_WINDOW_ACUTE' : 'FORECLOSURE_OPPORTUNITY_OPEN';
    primaryInsight = liquidityWindow === 'ACUTE'
      ? 'Foreclosure timeline is acute. Court dates and auction schedules are hard deadlines — capital must be positioned before the window closes.'
      : 'Foreclosure opportunity window is open. REO and pre-foreclosure inventory represents the most accessible institutional-grade distress discount for non-institutional capital.';
  } else if (isLiquidity) {
    stateLabel     = `LIQUIDITY_${liquidityWindow}_${assetClass}`;
    primaryInsight = `${assetClass.replace(/_/g,' ')} distress liquidity event. Window: ${liquidityWindow}. Discount signal: ${discountSignal}. Non-institutional capital has access advantage over institutional buyers in this asset class — minimum check size and approval velocity favor individual operators.`;
  } else if (isDistressMap) {
    stateLabel     = 'DISTRESS_MAP_ACTIVE';
    primaryInsight = `Distress scan active. Type: ${distressType.replace(/_/g,' ')}. Asset class: ${assetClass.replace(/_/g,' ')}. Liquidity window: ${liquidityWindow}. Build the map around motivated sellers — time pressure is the primary discount driver.`;
  } else {
    stateLabel     = 'COMMERCIAL_DISTRESS_SIGNAL_ACTIVE';
    primaryInsight = `Commercial distress signal: ${distressType.replace(/_/g,' ')} in ${assetClass.replace(/_/g,' ')}. Liquidity window: ${liquidityWindow}. Discount: ${discountSignal}.`;
  }

  const tierLabel = classifyLeverageTier(0.6);
  return {
    stateLabel,
    confidence:    liquidityWindow === 'ACUTE' ? 0.76 : 0.68,
    primaryInsight,
    momentum:      { value: '+28%', h1: '+6%', h24: '+18%' },
    trajPoints:    [0.22,0.28,0.35,0.42,0.50,0.57,0.63,0.68,0.72,0.75,0.77,0.78],
    attentionStack: [
      { rank:1, signal:'Distress Discount Depth',     category:'Capital / Distress',    trend:'↑', momentum:'Widening',    mColor:LIME, conf:0.84 },
      { rank:2, signal:'Liquidity Window Duration',   category:'Market / Timing',       trend:'↘', momentum:'Compressing', mColor:BLUE, conf:0.76 },
      { rank:3, signal:'Competing Capital Presence',  category:'Market / Competition',  trend:'→', momentum:'Low',         mColor:LIME, conf:0.65 },
      { rank:4, signal:'Asset Class Distress Rate',   category:'Market / Supply',       trend:'↗', momentum:'Increasing',  mColor:DIM,  conf:0.54 },
    ],
    keyDrivers: [
      { label:'Distress type',      delta: distressType.replace(/_/g,' '),     pos: true },
      { label:'Liquidity window',   delta: liquidityWindow,                    pos: liquidityWindow === 'ACUTE' },
      { label:'Asset class',        delta: assetClass.replace(/_/g,' '),       pos: true },
      { label:'Discount signal',    delta: discountSignal,                     pos: discountSignal === 'DEEP' },
    ],
    recommendedAction: liquidityWindow === 'ACUTE'
      ? 'Capital must be positioned immediately. Acute distress windows close on court-mandated schedules — due diligence must compress to match the timeline.'
      : 'Build the distress inventory map now. Identify 10–15 motivated sellers in the target asset class. Capital readiness is the advantage — sellers under pressure will transact with ready buyers at discount.',
    timeHorizon:   liquidityWindow === 'ACUTE' ? '7–30 days' : '30–90 days',
    impactLevel:   discountSignal === 'DEEP' ? 'HIGH' : 'MEDIUM',
    bluf:          `${distressType.replace(/_/g,' ')} distress in ${assetClass.replace(/_/g,' ')}. Liquidity window: ${liquidityWindow}. Discount: ${discountSignal}. ${liquidityWindow === 'ACUTE' ? 'Capital must be positioned before hard deadline.' : 'Build inventory map and position capital for seller-time-pressure window.'}${capital ? ` Capital available: $${(capital/1e3).toFixed(0)}K.` : ''}`,
    purpose:       'Commercial distress liquidity mapping (Mallah Protocol)',
    fiveWs: [
      { w:'WHO',   answer:`${distressType.replace(/_/g,' ')} seller under time or financial pressure.` },
      { w:'WHAT',  answer:`${assetClass.replace(/_/g,' ')} asset at ${discountSignal.toLowerCase()} discount. Distress type: ${distressType.replace(/_/g,' ')}.` },
      { w:'WHEN',  answer:`Liquidity window: ${liquidityWindow}. ${liquidityWindow === 'ACUTE' ? 'Hard deadline — court or auction date drives urgency.' : 'Open window but discount compresses as time pressure resolves.'}` },
      { w:'WHERE', answer:`Asset class: ${assetClass.replace(/_/g,' ')}. Non-institutional capital has access advantage — institutional minimum check size prevents entry at this scale.` },
      { w:'WHY',   answer:'Motivated sellers under time pressure transact at discounts unavailable in normal market conditions. The discount is compensation for speed and certainty of close.' },
    ],
    evidence: [
      'Foreclosure auctions average 15–35% below market value — premium paid for certainty and speed, not credit quality.',
      'Motivated sellers under 30-day time pressure accept 10–20% below their own asking price to secure a certain close.',
      'Non-institutional operators close distressed transactions at 2–3× the velocity of institutional buyers — approval velocity is the competitive advantage.',
    ],
    assumptions: [
      'Capital is liquid and can be deployed within the distress window timeline.',
      'Due diligence can be compressed without eliminating critical title and lien verification.',
    ],
    assessment: `${distressType.replace(/_/g,' ')} in ${assetClass.replace(/_/g,' ')} with ${liquidityWindow} window and ${discountSignal} discount signal. ${liquidityWindow === 'ACUTE' ? 'Time-critical: capital readiness is the only competitive variable.' : 'Build inventory, position capital, move at seller pressure peak.'}`,
    threats: [
      { label:'Title defects or undisclosed liens in distressed assets',                level:'HIGH',   color:LIME },
      { label:'Compressed due diligence missing material condition issues',             level:'HIGH',   color:LIME },
      { label:'Window closes before capital can be positioned and verified',            level:'MEDIUM', color:BLUE },
      { label:'Competing cash buyers eliminating discount at auction',                  level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`${discountSignal === 'DEEP' ? 'Deep discount' : 'Moderate discount'} acquisition below replacement cost — immediate equity creation at close.${capital ? ` At $${(capital/1e3).toFixed(0)}K capital: targets $${(capital * 0.7 / 1e3).toFixed(0)}K–$${(capital * 1.4 / 1e3).toFixed(0)}K asset value range.` : ''}` },
      { label:'Non-institutional velocity advantage: close in 7–14 days vs. institutional 60–90 days — sellers under pressure choose speed.' },
      { label:'Distress inventory map: 10–15 motivated seller relationships built now creates a repeatable deal flow pipeline.' },
    ],
    alternativeView: 'Distressed assets carry embedded problems — deferred maintenance, legal complexity, or tenant issues that consume the discount. Discount does not equal value without full due diligence.',
    outlook: [
      { prob:0.60, label:'Distress acquisition at deep discount creates 20%+ equity on entry + restructuring upside', color:LIME },
      { prob:0.28, label:'Hidden liabilities consume the discount — net return approaches market-rate acquisition',    color:BLUE },
      { prob:0.12, label:'Competing capital eliminates discount at auction — deal not executable at target terms',     color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'TITLE + LIEN SEARCH',         impact:0.95, rationale:'Before any distressed acquisition: full title search + lien verification. This is non-deferrable. Foreclosure assets carry undisclosed junior liens that survive the sale in some jurisdictions.', tag:'DILIGENCE' },
        { id:'a2', label:'CAPITAL READINESS AUDIT',     impact:0.90, rationale:`Verify liquid capital position for immediate deployment. ${capital ? `$${(capital/1e3).toFixed(0)}K available — confirm it is liquid and can close within the window.` : 'Confirm capital is liquid and deployable within distress window timeline.'}`, tag:'CAPITAL' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'BUILD DISTRESS INVENTORY',    impact:0.82, rationale:'Map 10–15 distressed assets in target class. Include seller time pressure, discount estimate, title status. This is your deal flow — a single distress transaction is a trade; a map is a business.', tag:'PIPELINE' },
        { id:'b2', label:'COMPRESS DUE DILIGENCE',      impact:0.77, rationale:'Build a 72-hour due diligence protocol: title, inspection, lien, zoning. Sellers under pressure choose buyers who can close in 7 days over buyers who need 60. Speed is the non-institutional edge.', tag:'PROCESS' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD DISTRESSED SELLER NETWORK', impact:0.74, rationale:'Attorneys (bankruptcy, foreclosure), accountants, and commercial brokers see distress before it hits market. One relationship in each channel creates deal flow 30–60 days ahead of public availability.', tag:'ACCESS' },
        { id:'c2', label:'STRUCTURE CAPITAL FOR VELOCITY',  impact:0.65, rationale:'A HELOC, business line, or pre-arranged capital facility that can deploy in <7 days is worth more than a larger capital base with slow deployment. Distress windows do not wait for wire approvals.', tag:'STRUCTURE' },
      ],
    },
    leverage:         { typeY:3, typeLabel:'CAPITAL', tierLabel, deRatio:0.6, permissionless:false, industryNorm:0.7 },
    distress_type:    distressType,
    liquidity_window: liquidityWindow,
    asset_class:      assetClass,
    discount_signal:  discountSignal,
  };
}

// ── WO-1785: Relevance Warfare Synthesizer (Vaynerchuk Protocol) ──────────────

function synthRelevanceWarfare(session, numbers, query) {
  const q = query.toLowerCase();

  const platform =
    /tiktok/.test(q)    ? 'TIKTOK' :
    /instagram|reels/.test(q) ? 'INSTAGRAM' :
    /linkedin/.test(q)  ? 'LINKEDIN' :
    /twitter|x\.com|\bx\b/.test(q) ? 'X' :
    /youtube/.test(q)   ? 'YOUTUBE' :
    /facebook/.test(q)  ? 'FACEBOOK' : 'MULTI_PLATFORM';

  const relevanceDecay =
    /losing.*relevance|losing.*attention|falling.*behind|outdated|old.*content|irrelevant|dying/.test(q) ? 'ACTIVE_DECAY' :
    /relevance|staying.*relevant|maintain.*relevance|keep.*relevant/.test(q) ? 'MAINTENANCE_MODE' :
    /grow|expand|new.*audience|reach/.test(q) ? 'GROWTH_MODE' : 'UNKNOWN';

  const attentionEdge =
    /native.*content|platform.*native|built.*for.*platform|algorithm.*friend/.test(q) ? 'NATIVE_CONTENT' :
    /volume|output|posting|consistent|daily|frequency/.test(q) ? 'VOLUME_EDGE' :
    /speed|first|fast|rapid|immediate|real.*time/.test(q) ? 'SPEED_EDGE' : 'UNDEFINED';

  const competitor =
    /competitor|rival|competition|others.*doing|everyone.*posting|brand.*fight/.test(q) ? 'PRESENT' : 'ABSENT';

  const isDecay     = /decay|losing|behind|irrelevant|outdated|fading/.test(q);
  const isAttention = /attention|capture|reach|audience|views|impressions/.test(q);
  const isStrategy  = /strategy|plan|approach|how.*compete|how.*win|how.*grow/.test(q);

  let stateLabel, primaryInsight;
  if (isDecay) {
    stateLabel     = 'RELEVANCE_DECAY_DETECTED';
    primaryInsight = "Relevance decay is active. Attention is a zero-sum competition — every platform's algorithm replaces non-native content with native content. The decay accelerates as competitors post native and you post repurposed.";
  } else if (isAttention) {
    stateLabel     = `ATTENTION_${platform}_${attentionEdge === 'UNDEFINED' ? 'CAPTURE_MODE' : attentionEdge}`;
    primaryInsight = platform === 'MULTI_PLATFORM'
      ? 'Multi-platform attention strategy requires native content per platform — not cross-posting. Each algorithm is independent. What wins on LinkedIn loses on TikTok.'
      : `${platform} attention capture. ${attentionEdge === 'NATIVE_CONTENT' ? 'Native content advantage is active.' : attentionEdge === 'VOLUME_EDGE' ? 'Volume edge requires output consistency — missing a day costs more than the content produces.' : 'Speed edge: first-mover attention on trending signals outperforms polished-but-late content.'}`;
  } else if (isStrategy) {
    stateLabel     = 'RELEVANCE_WARFARE_STRATEGY';
    primaryInsight = 'Relevance warfare is won by native content volume at platform speed. Brands that treat content as production lose to individuals who treat content as conversation. Document, do not produce.';
  } else {
    stateLabel     = 'RELEVANCE_WARFARE_SIGNAL_ACTIVE';
    primaryInsight = `Platform: ${platform}. Relevance state: ${relevanceDecay}. Attention edge: ${attentionEdge}. Competitor presence: ${competitor}.`;
  }

  const tierLabel = classifyLeverageTier(0.1);
  return {
    stateLabel,
    confidence:    relevanceDecay === 'ACTIVE_DECAY' ? 0.84 : 0.72,
    primaryInsight,
    momentum:      { value: relevanceDecay === 'ACTIVE_DECAY' ? '-24%' : '+16%', h1: relevanceDecay === 'ACTIVE_DECAY' ? '-6%' : '+3%', h24: relevanceDecay === 'ACTIVE_DECAY' ? '-14%' : '+10%' },
    trajPoints:    relevanceDecay === 'ACTIVE_DECAY'
      ? [0.80,0.74,0.68,0.62,0.56,0.50,0.44,0.39,0.34,0.30,0.27,0.24]
      : [0.30,0.36,0.43,0.50,0.57,0.62,0.67,0.71,0.74,0.77,0.79,0.81],
    attentionStack: [
      { rank:1, signal:'Platform Relevance Score',   category:`${platform} / Algorithm`,   trend: relevanceDecay === 'ACTIVE_DECAY' ? '↓' : '↑', momentum: relevanceDecay === 'ACTIVE_DECAY' ? 'Declining' : 'Building',  mColor:LIME, conf:0.86 },
      { rank:2, signal:'Native Content Ratio',       category:'Content / Platform',        trend:'↗', momentum:'Improving',   mColor:BLUE, conf:0.74 },
      { rank:3, signal:'Competitor Output Volume',   category:`${platform} / Competition`, trend:'↑', momentum:'Accelerating',mColor:LIME, conf:0.65 },
      { rank:4, signal:'Audience Attention Velocity',category:'Audience / Engagement',     trend:'→', momentum:'Flat',        mColor:DIM,  conf:0.51 },
    ],
    keyDrivers: [
      { label:'Relevance state',        delta: relevanceDecay.replace(/_/g,' '),   pos: relevanceDecay !== 'ACTIVE_DECAY' },
      { label:'Platform',               delta: platform,                            pos: true },
      { label:'Attention edge',         delta: attentionEdge.replace(/_/g,' '),    pos: attentionEdge !== 'UNDEFINED' },
      { label:'Competitor presence',    delta: competitor,                          pos: competitor === 'ABSENT' },
    ],
    recommendedAction: relevanceDecay === 'ACTIVE_DECAY'
      ? 'Post native content on the platform today. Not tomorrow. Not after the strategy session. Today. Relevance decay compounds daily — every day of silence is lost ground that takes 5 days to recover.'
      : `Double output volume on ${platform === 'MULTI_PLATFORM' ? 'your highest-engagement platform' : platform}. Native content at 2× current volume is the fastest relevance acceleration mechanism.`,
    timeHorizon:   '30–90 days',
    impactLevel:   relevanceDecay === 'ACTIVE_DECAY' ? 'HIGH' : 'MEDIUM',
    bluf:          `Relevance state: ${relevanceDecay.replace(/_/g,' ')} on ${platform}. ${relevanceDecay === 'ACTIVE_DECAY' ? 'Decay is compounding — each day of non-native posting widens the gap to competitors who are posting natively.' : 'Relevance window is open — volume and native content are the execution levers.'}`,
    purpose:       'Relevance warfare analysis (Vaynerchuk Protocol)',
    fiveWs: [
      { w:'WHO',   answer:`${platform === 'MULTI_PLATFORM' ? 'Multi-platform' : platform} operator competing for finite audience attention.` },
      { w:'WHAT',  answer:`Relevance state: ${relevanceDecay.replace(/_/g,' ')}. Attention edge: ${attentionEdge.replace(/_/g,' ')}.` },
      { w:'WHEN',  answer:'Attention is competed for in real time. Posting cadence gaps create algorithm suppression that compounds over 72–96 hours.' },
      { w:'WHERE', answer:`${platform === 'MULTI_PLATFORM' ? 'All platforms require native content — cross-posting is a relevance tax, not a shortcut.' : `${platform} algorithm rewards native-format, consistent-cadence content above all other signals.`}` },
      { w:'WHY',   answer:'Relevance is a zero-sum competition for finite attention. Every platform algorithm allocates distribution to accounts that earn it through native engagement. Non-native content is algorithmically suppressed regardless of production quality.' },
    ],
    evidence: [
      'Native content outperforms repurposed/cross-posted content by 3–7× on reach per post across all major platforms.',
      'Accounts that break a daily/near-daily posting cadence see 40–60% reach suppression lasting 5–7 days.',
      "Document-don't-produce content (raw, real-time) outperforms produced content on TikTok and Instagram Reels by 2–4× engagement rate.",
    ],
    assumptions: [
      'Operator has capacity to produce native content at 1+ pieces per day without sacrificing core business execution.',
      'Platform algorithm weighting toward native content continues — current trend is stable across all major platforms.',
    ],
    assessment: `${platform} relevance at ${relevanceDecay.replace(/_/g,' ')} state. ${relevanceDecay === 'ACTIVE_DECAY' ? 'Every day of inaction compounds decay. Native content today beats perfect content next week.' : 'Relevance window is open. Volume + native format are the two execution levers with highest return.'}`,
    threats: [
      { label:'Relevance decay compounds — 1 day of silence = 5 days to recover',       level: relevanceDecay === 'ACTIVE_DECAY' ? 'HIGH' : 'MEDIUM', color:LIME },
      { label:'Competitor native content volume capturing your audience attention share', level:'HIGH',   color:LIME },
      { label:'Algorithm change penalizing current content format',                      level:'MEDIUM', color:BLUE },
      { label:'Production bottleneck slowing native content output',                     level:'MEDIUM', color:BLUE },
    ],
    opportunities: [
      { label:'Document-don\'t-produce: raw behind-the-scenes content requires no production budget and outperforms produced content on engagement rate.' },
      { label:`${platform === 'LINKEDIN' ? 'LinkedIn text-first posts outperform all other formats by 2× on professional audiences.' : platform === 'TIKTOK' ? 'TikTok rewards pattern interrupts in first 2 seconds — hook engineering is the highest-leverage content skill.' : 'Native format + consistent cadence outperforms all other strategies on this platform.'}` },
      { label:'Comment and reply volume signals relevance to the algorithm — responding to every comment in the first hour of posting is a distribution multiplier.' },
    ],
    alternativeView: 'High-quality, lower-frequency content can outperform high-volume native content on platforms that reward depth (YouTube long-form, LinkedIn thought leadership). Volume without quality produces diminishing returns.',
    outlook: [
      { prob:0.62, label:'Native content volume + cadence restores relevance within 30 days', color:LIME },
      { prob:0.26, label:'Relevance gap requires 90+ days to close — audience attention has migrated', color:BLUE },
      { prob:0.12, label:'Platform algorithm shift renders current strategy obsolete — full format pivot required', color:DIM },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:`POST NATIVE ${platform === 'MULTI_PLATFORM' ? 'CONTENT' : `ON ${platform}`} TODAY`, impact:0.95, rationale:'Not tomorrow. Not after the strategy session. Today. One native post today breaks the decay cycle and resets the algorithm suppression timer. Document what you are doing right now.', tag:'EXECUTION' },
        { id:'a2', label:'AUDIT CONTENT FORMAT',        impact:0.82, rationale:`Review last 10 posts. What % were native format vs. repurposed? What was the engagement delta? Native content consistently outperforms repurposed by 3–7×. This audit shows you where the relevance tax is being paid.`, tag:'AUDIT' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'2× OUTPUT VOLUME',            impact:0.85, rationale:`Double your current posting cadence for 30 days. Volume is the fastest relevance recovery mechanism. ${platform === 'TIKTOK' ? '3–5 videos/day.' : platform === 'LINKEDIN' ? '1–2 posts/day.' : '1–3 posts/day.'}`, tag:'VOLUME' },
        { id:'b2', label:'BUILD CONTENT SYSTEM',        impact:0.77, rationale:'Content at volume requires a system — a list of 30 topics always ready, a filming habit that runs parallel to real work, a posting schedule. Content strategy without a production system is theater.', tag:'SYSTEM' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'OWN THE ALGORITHM SIGNAL',    impact:0.73, rationale:`${platform === 'TIKTOK' ? 'Hook in first 2 seconds. Loop or payoff at 15 seconds. Comment bait at end.' : platform === 'LINKEDIN' ? 'First 2 lines before "see more" must stop the scroll. Personal story > corporate statement.' : 'Native format + engagement velocity in first hour are the two algorithm signals that matter most.'}`, tag:'ALGORITHM' },
        { id:'c2', label:'TRACK RELEVANCE WEEKLY',      impact:0.61, rationale:'Average reach per post, follower growth rate, engagement rate — tracked weekly, not monthly. Relevance warfare requires real-time feedback loops, not quarterly reviews.', tag:'MEASUREMENT' },
      ],
    },
    leverage:         { typeY:0, typeLabel:'CODE', tierLabel, deRatio:0.1, permissionless:true, industryNorm:0.2 },
    platform,
    relevance_decay:  relevanceDecay,
    attention_edge:   attentionEdge,
    competitor,
  };
}

// ── WO-1786: Content-to-Commerce Conversion Engine (Vaynerchuk Protocol) ──────

function synthContentToCommerce(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const contentType =
    /video|youtube|tiktok|reel|short/.test(q) ? 'VIDEO' :
    /podcast|audio|show/.test(q) ? 'PODCAST' :
    /newsletter|email|substack|written/.test(q) ? 'NEWSLETTER' :
    /social|post|instagram|twitter|x\b/.test(q) ? 'SOCIAL' : 'MULTI_FORMAT';

  const commerceType =
    /merch|merchandise|product|physical/.test(q) ? 'PHYSICAL_PRODUCT' :
    /course|coaching|consult|service|digital.*product/.test(q) ? 'DIGITAL_PRODUCT' :
    /affiliate|commission|referral/.test(q) ? 'AFFILIATE' :
    /brand.*deal|sponsor|partnership/.test(q) ? 'BRAND_DEAL' :
    /community|membership|subscription/.test(q) ? 'COMMUNITY' : 'UNDEFINED';

  const conversionGap =
    /not.*converting|low.*conversion|audience.*not.*buying|views.*not.*sales|traffic.*no.*revenue/.test(q) ? 'ACTIVE' :
    /improve.*conversion|increase.*sales|more.*revenue|monetiz/.test(q) ? 'OPTIMIZATION_MODE' :
    'BASELINE';

  const audienceSize =
    /million|1m|2m|5m|10m/.test(q) ? 'LARGE' :
    /hundred.*thousand|500k|200k|100k/.test(q) ? 'MEDIUM' :
    /thousand|10k|20k|50k/.test(q) ? 'SMALL' : 'UNKNOWN';

  const isConversion = /convert|sales|revenue|monetiz|sell|commerce/.test(q);
  const isAudience   = /audience|follower|subscriber|viewer/.test(q);
  const isFunnel     = /funnel|journey|path|flow|step/.test(q);

  let stateLabel, primaryInsight;
  if (conversionGap === 'ACTIVE') {
    stateLabel     = 'CONTENT_COMMERCE_GAP_ACTIVE';
    primaryInsight = 'Content is not converting to commerce. The gap is almost always one of three things: no clear call-to-action, offer misalignment with audience identity, or no bridge from content context to purchase context. The content is working — the bridge is broken.';
  } else if (isConversion) {
    stateLabel     = `COMMERCE_${commerceType === 'UNDEFINED' ? 'GENERAL' : commerceType}_MODE`;
    primaryInsight = commerceType === 'PHYSICAL_PRODUCT'
      ? 'Physical product from content audience requires identity alignment — the product must feel like it was made for exactly who the content speaks to, not a product looking for an audience.'
      : commerceType === 'DIGITAL_PRODUCT'
      ? 'Digital product conversion from content is the highest-margin content-to-commerce path. Audience already trusts the expertise — the product packages it at a price the algorithm cannot deliver.'
      : commerceType === 'BRAND_DEAL'
      ? 'Brand deal conversion is audience-trust extraction. The deal value is proportional to how specifically the audience matches the brand target — niche, high-trust audiences command premiums over massive, diluted audiences.'
      : `${commerceType.replace(/_/g,' ')} commerce model from ${contentType} content. Conversion path requires explicit bridge between content context and commerce action.`;
  } else if (isAudience) {
    stateLabel     = `AUDIENCE_${audienceSize}_CONVERSION_POTENTIAL`;
    primaryInsight = audienceSize === 'LARGE'
      ? 'Large audience with low conversion rate is more valuable than small audience with high conversion rate at scale — the absolute number of buyers matters. But trust depth determines the ceiling.'
      : 'Smaller, high-trust audiences convert at 5–10× the rate of large, low-trust audiences. Niche authority is more valuable per-follower than mass reach without depth.';
  } else {
    stateLabel     = 'CONTENT_COMMERCE_SIGNAL_ACTIVE';
    primaryInsight = `Content type: ${contentType}. Commerce model: ${commerceType.replace(/_/g,' ')}. Audience size: ${audienceSize}. Conversion gap: ${conversionGap.replace(/_/g,' ')}.`;
  }

  const tierLabel = classifyLeverageTier(0.15);
  return {
    stateLabel,
    confidence:    conversionGap === 'ACTIVE' ? 0.82 : 0.70,
    primaryInsight,
    momentum:      { value: conversionGap === 'ACTIVE' ? '-12%' : '+19%', h1: conversionGap === 'ACTIVE' ? '-3%' : '+4%', h24: conversionGap === 'ACTIVE' ? '-8%' : '+12%' },
    trajPoints:    [0.32,0.38,0.44,0.50,0.56,0.61,0.65,0.69,0.72,0.74,0.76,0.77],
    attentionStack: [
      { rank:1, signal:'Content-Commerce Bridge Strength', category:'Content / Commerce',   trend: conversionGap === 'ACTIVE' ? '↓' : '↗', momentum: conversionGap === 'ACTIVE' ? 'Weakening' : 'Strengthening', mColor:LIME, conf:0.83 },
      { rank:2, signal:'Audience Trust Depth',             category:'Audience / Commerce',  trend:'→', momentum:'Stable',          mColor:BLUE, conf:0.76 },
      { rank:3, signal:'Offer-Audience Alignment',         category:'Product / Audience',   trend:'→', momentum:'Stable',          mColor:LIME, conf:0.67 },
      { rank:4, signal:'CTA Placement Velocity',           category:'Content / Conversion', trend:'↗', momentum:'Improving',       mColor:DIM,  conf:0.53 },
    ],
    keyDrivers: [
      { label:'Content type',       delta: contentType.replace(/_/g,' '),    pos: true },
      { label:'Commerce model',     delta: commerceType.replace(/_/g,' '),   pos: commerceType !== 'UNDEFINED' },
      { label:'Conversion gap',     delta: conversionGap.replace(/_/g,' '),  pos: conversionGap === 'BASELINE' },
      { label:'Audience size tier', delta: audienceSize,                     pos: audienceSize !== 'UNKNOWN' },
    ],
    recommendedAction: conversionGap === 'ACTIVE'
      ? 'Audit the bridge: (1) Is there a clear CTA in every piece of content? (2) Does the offer align with what the audience identifies with? (3) Is the purchase path frictionless — one click from content to checkout? Fix these three before changing the content strategy.'
      : commerceType === 'UNDEFINED'
      ? 'Define the commerce model before scaling content. Content without a commerce path is a distribution machine with no revenue endpoint.'
      : `Scale ${commerceType.replace(/_/g,' ')} conversion by increasing CTA frequency and testing offer alignment with ${contentType.toLowerCase()} audience identity.`,
    timeHorizon:   '30–90 days',
    impactLevel:   conversionGap === 'ACTIVE' ? 'HIGH' : 'MEDIUM',
    bluf:          `${contentType} content to ${commerceType.replace(/_/g,' ')} commerce. Audience: ${audienceSize}. Conversion gap: ${conversionGap.replace(/_/g,' ')}. ${conversionGap === 'ACTIVE' ? 'Bridge is broken — audit CTA, offer alignment, and purchase path friction before any other change.' : 'Conversion path is functional — scale CTA frequency and offer surface area.'}${capital ? ` Revenue target: $${(capital * 0.3 / 1e3).toFixed(0)}K.` : ''}`,
    purpose:       'Content-to-commerce conversion analysis (Vaynerchuk Protocol)',
    fiveWs: [
      { w:'WHO',   answer:`${audienceSize} ${contentType.toLowerCase()} audience with ${commerceType.replace(/_/g,' ')} commerce opportunity.` },
      { w:'WHAT',  answer:`Conversion gap: ${conversionGap.replace(/_/g,' ')}. Commerce model: ${commerceType.replace(/_/g,' ')}.` },
      { w:'WHEN',  answer:'Content-to-commerce conversion is most efficient within 24–48 hours of audience engagement peak. CTA timing relative to content consumption is the primary lever.' },
      { w:'WHERE', answer:`Bridge between ${contentType.toLowerCase()} content context and purchase action. This is the gap — not the content quality and not the product quality.` },
      { w:'WHY',   answer:'Content audiences trust the creator before they trust the product. That trust is the conversion advantage. But trust does not convert without an explicit, frictionless bridge to the purchase action.' },
    ],
    evidence: [
      'Audiences that consume 3+ pieces of content before purchase convert at 4–8× the rate of first-touch audiences.',
      'CTA placement in the first and last 10% of video content outperforms mid-roll CTA by 2–3×.',
      `Offer identity alignment (the product is "made for me") is the single highest-leverage conversion variable — outperforming price and production quality.`,
    ],
    assumptions: [
      'Audience is genuinely engaged with the content — not passive scroll behavior.',
      'The commerce offer is a real product or service with genuine value for the audience.',
    ],
    assessment: `${contentType} content to ${commerceType.replace(/_/g,' ')} commerce. ${conversionGap === 'ACTIVE' ? 'Conversion gap is active — bridge is broken at CTA, offer alignment, or purchase path friction. Fix the bridge before changing the content.' : 'Conversion path is functional. Optimize CTA frequency, offer surface, and purchase friction.'}`,
    threats: [
      { label:'Offer-audience misalignment — product does not match content identity',   level:'HIGH',   color:LIME },
      { label:'Missing or buried CTA — audience cannot find the purchase path',          level:'HIGH',   color:LIME },
      { label:'High purchase path friction (multiple steps, account creation)',           level:'MEDIUM', color:BLUE },
      { label:'Content trust eroded by too many commerce mentions',                      level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:`${commerceType === 'DIGITAL_PRODUCT' ? 'Digital product margin is 90%+ — highest-margin commerce model for content creators.' : commerceType === 'COMMUNITY' ? 'Community/membership creates recurring revenue independent of content algorithm performance.' : 'Define and test one clear commerce offer before building the content strategy around it.'}` },
      { label:`${audienceSize === 'SMALL' ? 'Small, high-trust audience converts at premium price points — niche authority commands pricing power.' : 'Large audience with 1% conversion at $50 = significant revenue. Conversion optimization is a multiplier on existing audience.'}` },
      { label:`CTA A/B test: test placement (first vs. last 10%), format (spoken vs. text vs. link), and offer framing. 2× conversion rate is achievable through CTA optimization alone.${capital ? ` Revenue impact at current audience: $${(capital * 0.02 / 1e3).toFixed(0)}K–$${(capital * 0.08 / 1e3).toFixed(0)}K monthly.` : ''}` },
    ],
    alternativeView: 'Content-first creators who prioritize audience growth over conversion often build larger, more valuable audiences long-term. Premature monetization can erode the trust that makes conversion possible.',
    outlook: [
      { prob:0.60, label:'Bridge fix + CTA optimization doubles conversion rate within 60 days', color:LIME },
      { prob:0.28, label:'Offer-audience misalignment requires product pivot — longer resolution timeline', color:BLUE },
      { prob:0.12, label:'Audience is fundamentally non-commercial — content value and commerce value are incompatible', color:DIM },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'AUDIT CTA PRESENCE',          impact:0.92, rationale:'Review last 10 pieces of content. Does each have a single, clear CTA? Is it in the first and last 10%? Is there one click from content to checkout? If any answer is no, that is the conversion gap.', tag:'CONVERSION' },
        { id:'a2', label:'TEST OFFER ALIGNMENT',        impact:0.87, rationale:`Ask 5 audience members directly: "Would you pay for [X]?" The answer in 10 minutes is more valuable than 10 weeks of content testing. Offer alignment is the highest-leverage conversion variable.`, tag:'PRODUCT' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'LAUNCH MINIMUM VIABLE OFFER', impact:0.83, rationale:`${commerceType === 'UNDEFINED' ? 'Define the commerce model: physical product, digital, community, or brand deal. Then build the minimum viable version and test conversion before scaling production.' : `Test ${commerceType.replace(/_/g,' ')} at minimum viable scale. Conversion rate at small scale predicts large-scale economics.`}`, tag:'LAUNCH' },
        { id:'b2', label:'REDUCE PURCHASE FRICTION',    impact:0.76, rationale:'Map the path from content to completed purchase. Count the clicks and form fields. Every additional step reduces conversion by 15–20%. One-click purchase paths consistently outperform multi-step funnels.', tag:'FRICTION' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD RECURRING COMMERCE',    impact:0.79, rationale:'Subscription, membership, or retainer model converts one-time buyers to recurring revenue. Recurring is the difference between a content business and a creator job.', tag:'RECURRING' },
        { id:'c2', label:'EMAIL LIST AS COMMERCE FLOOR',impact:0.66, rationale:'Email list owned by the creator converts at 5–10× the rate of social platform audiences. Every piece of content should have a path to email capture — this is the commerce floor that survives platform changes.', tag:'INFRASTRUCTURE' },
      ],
    },
    leverage:         { typeY:0, typeLabel:'CODE', tierLabel, deRatio:0.15, permissionless:true, industryNorm:0.25 },
    content_type:     contentType,
    commerce_type:    commerceType,
    conversion_gap:   conversionGap,
    audience_size:    audienceSize,
  };
}

// ── WO-1796: Boxing Disruption Model (White/TKO Protocol) ─────────────────────

function synthBoxingDisruption(session, numbers, query) {
  const q       = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const disruptionVector =
    /streaming|netflix|amazon|dazn|espn\+|direct.*to.*consumer|dtc|platform/.test(q) ? 'STREAMING_RIGHTS' :
    /ppv|pay.*per.*view|buy.*rate|purchase.*rate/.test(q) ? 'PPV_ECONOMICS' :
    /fighter.*pay|athlete.*pay|purse|compensation|revenue.*split/.test(q) ? 'FIGHTER_ECONOMICS' :
    /celebrity|influencer|youtuber|cross.*over|non.*boxer|exhibition/.test(q) ? 'CELEBRITY_CROSSOVER' :
    /promotion|promoter|independent|fighter.*own|boxer.*own/.test(q) ? 'PROMOTIONAL_STRUCTURE' :
    'MARKET_DYNAMICS';

  const marketPosition =
    /ufc|mma|mixed.*martial|cage|octagon/.test(q) ? 'MMA_ADJACENT' :
    /boxing|fight|bout|heavyweight|welterweight|lightweight|middleweight/.test(q) ? 'BOXING_CORE' :
    /combat.*sport|fighting|sport.*entertainment|fight.*entertainment/.test(q) ? 'COMBAT_SPORTS' : 'GENERAL';

  const valueCapture =
    /exclusive|locked|long.*term.*deal|multi.*year|signed/.test(q) ? 'CONTRACTED' :
    /free.*agent|available|unsigned|looking|independent/.test(q) ? 'FREE_AGENT_WINDOW' :
    'STANDARD';

  const tkoPressure =
    /tko|wwe|endeavor|ari.*emanuel|consolidation|merger|acquisition/.test(q) ? 'PRESENT' : 'ABSENT';

  const isStreaming  = /streaming|rights|broadcast|platform|distribution/.test(q);
  const isPPV        = /ppv|pay.*per.*view|buy.*rate/.test(q);
  const isFighter    = /fighter|boxer|athlete|purse|pay|compensation/.test(q);
  const isCelebrity  = /celebrity|youtuber|influencer|logan|paul|jake|cross.?over|exhibition/.test(q);

  let stateLabel, primaryInsight;
  if (isStreaming) {
    stateLabel     = 'STREAMING_RIGHTS_DISRUPTION';
    primaryInsight = 'Streaming rights are restructuring combat sports economics. Traditional PPV is being compressed by platform-bundled content — Netflix, Amazon, and DAZN are competing for the same eyeballs with fundamentally different economic models. The winner controls distribution and, through it, fighter leverage.';
  } else if (isPPV) {
    stateLabel     = 'PPV_ECONOMICS_UNDER_PRESSURE';
    primaryInsight = 'PPV buy rates are structurally declining as streaming alternatives proliferate. Mega-events still produce headline numbers, but the mid-card PPV is being displaced. The promoters who survive are those who convert PPV audiences to platform subscribers.';
  } else if (isFighter) {
    stateLabel     = valueCapture === 'FREE_AGENT_WINDOW' ? 'FIGHTER_VALUE_CAPTURE_WINDOW' : 'FIGHTER_ECONOMICS_CONTRACTED';
    primaryInsight = valueCapture === 'FREE_AGENT_WINDOW'
      ? 'Free agency window is the maximum leverage point for fighter economics. Platform competition (streaming + traditional) creates bidding conditions that do not exist mid-contract. This window is time-limited by deal urgency.'
      : 'Fighter economics are contracted — leverage is determined by the contract structure. Performance incentives, rematch clauses, and promotional rights are the negotiation levers within the existing deal.';
  } else if (isCelebrity) {
    stateLabel     = 'CELEBRITY_CROSSOVER_EVENT';
    primaryInsight = 'Celebrity crossover events have permanently disrupted boxing\'s premium content economics. Jake Paul, Logan Paul, and influencer-boxing events demonstrated that PPV buy rates are driven by audience identity, not athletic pedigree. This permanently changes what "a big fight" means to the market.';
  } else {
    stateLabel     = `BOXING_DISRUPTION_${disruptionVector}`;
    primaryInsight = `Boxing disruption signal: ${disruptionVector.replace(/_/g,' ')}. Market position: ${marketPosition.replace(/_/g,' ')}. TKO/consolidation pressure: ${tkoPressure}. Value capture: ${valueCapture.replace(/_/g,' ')}.`;
  }

  const tierLabel = classifyLeverageTier(0.4);
  return {
    stateLabel,
    confidence:    tkoPressure === 'PRESENT' ? 0.79 : 0.70,
    primaryInsight,
    momentum:      { value: isStreaming ? '+34%' : '+12%', h1: '+5%', h24: '+18%' },
    trajPoints:    [0.28,0.34,0.41,0.48,0.55,0.61,0.66,0.70,0.73,0.76,0.78,0.79],
    attentionStack: [
      { rank:1, signal:'Streaming Rights Competition',  category:'Combat / Distribution',  trend:'↑', momentum:'Accelerating', mColor:LIME, conf:0.85 },
      { rank:2, signal:'PPV Buy Rate Structural Trend', category:'Combat / Economics',     trend:'↘', momentum:'Declining',    mColor:BLUE, conf:0.77 },
      { rank:3, signal:'Fighter Leverage Window',       category:'Combat / Labor',         trend:'↗', momentum:'Expanding',    mColor:LIME, conf:0.66 },
      { rank:4, signal:'TKO Consolidation Pressure',   category:'Combat / M&A',           trend:'↑', momentum: tkoPressure === 'PRESENT' ? 'Active' : 'Latent', mColor:DIM, conf:0.55 },
    ],
    keyDrivers: [
      { label:'Disruption vector',     delta: disruptionVector.replace(/_/g,' '),    pos: true },
      { label:'Market position',       delta: marketPosition.replace(/_/g,' '),      pos: true },
      { label:'Value capture',         delta: valueCapture.replace(/_/g,' '),        pos: valueCapture === 'FREE_AGENT_WINDOW' },
      { label:'TKO pressure',          delta: tkoPressure,                           pos: false },
    ],
    recommendedAction: isFighter && valueCapture === 'FREE_AGENT_WINDOW'
      ? 'Maximize leverage during the free agency window. Platform competition for premium content is at peak — this is the highest-value moment to negotiate. Streaming platforms need marquee names; marquee names need distribution. The terms you set now determine economics for 3–5 years.'
      : isStreaming
      ? 'Map the streaming rights landscape: who needs marquee events, what exclusive vs. co-exclusive structure exists, and what the per-event vs. annual deal economics look like. The promoter who controls streaming rights controls fighter leverage.'
      : 'Position against the disruption vector that is most active in the current market. The old combat sports economy (PPV-first, traditional broadcast) is compressing. The new economy (streaming-first, platform-native) is where the leverage is building.',
    timeHorizon:   '12–36 months',
    impactLevel:   tkoPressure === 'PRESENT' ? 'HIGH' : 'MEDIUM',
    bluf:          `Boxing/combat sports disruption via ${disruptionVector.replace(/_/g,' ')}. ${isStreaming ? 'Streaming rights competition is the primary value creation event in combat sports.' : isFighter ? `Fighter economics at ${valueCapture.replace(/_/g,' ')} stage.` : 'Market is in structural transition from PPV-first to streaming-first economics.'}${capital ? ` Capital exposure: $${(capital/1e3).toFixed(0)}K.` : ''}`,
    purpose:       'Boxing/combat sports disruption analysis (White/TKO Protocol)',
    fiveWs: [
      { w:'WHO',   answer:`${isFighter ? 'Fighter' : isStreaming ? 'Streaming platform or promoter' : 'Combat sports operator'} in a disrupted marketplace.` },
      { w:'WHAT',  answer:`Disruption vector: ${disruptionVector.replace(/_/g,' ')}. TKO consolidation pressure: ${tkoPressure}.` },
      { w:'WHEN',  answer:`${valueCapture === 'FREE_AGENT_WINDOW' ? 'Free agency window is open — this is the maximum leverage moment.' : 'Streaming transition is mid-cycle — 18–36 months before new equilibrium.'}` },
      { w:'WHERE', answer:`${marketPosition === 'MMA_ADJACENT' ? 'MMA/UFC dominance is setting the template — boxing promoters are competing against UFC\'s streaming model.' : marketPosition === 'BOXING_CORE' ? 'Core boxing market is fragmenting between traditional promoters and platform-native content.' : 'Combat sports market in full disruption — no established equilibrium.'}` },
      { w:'WHY',   answer:'Streaming economics destroyed the PPV oligopoly. Platform competition for premium live content creates leverage for fighters and events that did not exist under broadcast-TV dominance.' },
    ],
    evidence: [
      'Netflix boxing events (Paul vs. Tyson) demonstrated streaming platforms can generate 60M+ viewers for combat sports — eclipsing traditional PPV numbers.',
      'Dana White/TKO streaming deal with Netflix valued at $150M/year demonstrates platform willingness to pay for marquee combat sports content.',
      `Celebrity crossover events (Jake Paul) generate PPV buy rates that exceed many traditional world title fights — audience identity drives purchase decisions, not athletic rankings.`,
    ],
    assumptions: [
      'Streaming platform competition for live sports/events content continues at current investment levels.',
      'Celebrity/influencer boxing maintains audience interest — risk of format fatigue after 3–5 years.',
    ],
    assessment: `${disruptionVector.replace(/_/g,' ')} disruption with ${tkoPressure === 'PRESENT' ? 'active' : 'latent'} TKO consolidation pressure. ${isFighter && valueCapture === 'FREE_AGENT_WINDOW' ? 'Maximum leverage window is open for fighter economics.' : 'Structural market transition creates premium opportunity for those positioned on the streaming-rights side of the transition.'}`,
    threats: [
      { label:'TKO/Endeavor consolidation reducing independent promotional leverage',   level: tkoPressure === 'PRESENT' ? 'HIGH' : 'MEDIUM', color:LIME },
      { label:'Streaming platform deal fatigue — rights values peak then compress',    level:'MEDIUM', color:BLUE },
      { label:'Celebrity crossover format fatigue reducing premium content economics', level:'MEDIUM', color:BLUE },
      { label:'Fighter pay demands outpacing streaming revenue growth',                level:'LOW',    color:DIM  },
    ],
    opportunities: [
      { label:'Streaming-first promotion: build event around platform economics, not PPV economics — fundamentally different audience acquisition model.' },
      { label:`Free agency leverage: platform competition for marquee content creates bidding conditions. ${capital ? `At $${(capital/1e3).toFixed(0)}K capital: target co-promotion or streaming rights minority stake.` : 'Fighter or promoter free agency window is the maximum negotiation leverage point.'}` },
      { label:'Celebrity/influencer integration: crossover events proven at scale — not a gimmick, a market segment. Platform audiences for influencer boxing are distinct from boxing-core audiences.' },
    ],
    alternativeView: 'Traditional boxing\'s PPV model has survived 40+ years of "disruption." Mega-events (Fury, Joshua, Canelo) still generate $100M+ PPV — the mega-event ceiling may be higher than streaming economics suggest.',
    outlook: [
      { prob:0.56, label:'Streaming-first combat sports economics become dominant — PPV as premium-only format', color:LIME },
      { prob:0.31, label:'Hybrid model — streaming for mid-card, PPV for mega-events — becomes equilibrium',    color:BLUE },
      { prob:0.13, label:'Traditional broadcast and PPV recover — streaming sports rights plateau',              color:DIM  },
    ],
    actions: {
      IMMEDIATE: [
        { id:'a1', label:'MAP STREAMING RIGHTS LANDSCAPE', impact:0.89, rationale:'Who has existing combat sports streaming rights? What is exclusive vs. co-exclusive? What is the gap in their content calendar? This map identifies the negotiation entry points for fighters, promoters, and event operators.', tag:'POSITIONING' },
        { id:'a2', label:`${isFighter && valueCapture === 'FREE_AGENT_WINDOW' ? 'INITIATE PLATFORM CONVERSATIONS' : 'AUDIT DEAL STRUCTURE'}`, impact:0.85, rationale: isFighter && valueCapture === 'FREE_AGENT_WINDOW' ? 'Free agency window is open. Contact Netflix, DAZN, Amazon, and ESPN+ simultaneously. Bidding competition is the leverage — sequential conversations compress it.' : 'Audit existing deal: performance incentives, rematch rights, promotional control. These are the levers within a contracted structure.', tag: isFighter ? 'LEVERAGE' : 'AUDIT' },
      ],
      SHORT_TERM: [
        { id:'b1', label:'STREAMING ECONOMICS MODEL',   impact:0.82, rationale:'Build a per-event P&L at streaming subscription economics vs. PPV economics. The revenue model is fundamentally different — streaming pays per-subscriber-acquired, not per-buy. Understand the math before negotiating.', tag:'ECONOMICS' },
        { id:'b2', label:'CELEBRITY CROSSOVER EVALUATION', impact:0.74, rationale:'Celebrity/influencer crossover events are a proven market segment. Evaluate whether an event in this format opens streaming platform doors that core boxing events cannot access. The audiences are additive, not competitive.', tag:'MARKET' },
      ],
      STRUCTURAL: [
        { id:'c1', label:'BUILD PLATFORM RELATIONSHIPS', impact:0.77, rationale:'Streaming platform acquisition executives are the new broadcast network executives. Relationship-building with platform sports acquisition teams is the long-term leverage asset — not individual event negotiation.', tag:'ACCESS' },
        { id:'c2', label:'FIGHTER EQUITY STRUCTURE',    impact:0.65, rationale:'Dana White model: fighters as equity participants in the promotion. This aligns fighter and promoter incentives and creates a talent retention mechanism that pure purse models cannot replicate.', tag:'STRUCTURE' },
      ],
    },
    leverage:           { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.4, permissionless:false, industryNorm:0.5 },
    disruption_vector:  disruptionVector,
    market_position:    marketPosition,
    value_capture:      valueCapture,
    tko_pressure:       tkoPressure,
  };
}

// ── WO-1795: Labor Volatility Synthesizer (White/TKO Protocol) ────────────────

function synthLaborVolatility(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const laborVector =
    /union|collective.*bargain|organize|labor.*org/.test(q) ? 'UNIONIZATION_PRESSURE' :
    /pay.*dispute|compensation.*reform|revenue.*share|purse.*split/.test(q) ? 'PAY_STRUCTURE' :
    /free.*agent|unsigned|contract.*expired|holdout/.test(q) ? 'FREE_AGENCY_WINDOW' :
    /strike|work.*stoppage|boycott|walkout/.test(q) ? 'WORK_STOPPAGE_RISK' :
    'GENERAL_LABOR';

  const industryContext =
    /ufc|mma|mixed.*martial/.test(q) ? 'MMA' :
    /boxing|boxer|fight/.test(q) ? 'BOXING' :
    /nfl|nba|mlb|nhl|esport/.test(q) ? 'MAJOR_LEAGUE' :
    'COMBAT_SPORTS';

  let stateLabel, primaryInsight;
  if (laborVector === 'UNIONIZATION_PRESSURE') {
    stateLabel     = 'UNIONIZATION_SIGNAL_ACTIVE';
    primaryInsight = 'Unionization pressure is rising in combat sports. Fighter collective action has historically been suppressed by the monopsony structure of major promotions. When critical mass forms around a credible union effort, it structurally reprices fighter compensation across the entire market — not just the organizing promotion.';
  } else if (laborVector === 'FREE_AGENCY_WINDOW') {
    stateLabel     = 'FREE_AGENCY_LEVERAGE_PEAK';
    primaryInsight = 'Free agency creates a brief window of maximum fighter leverage. Platform competition (streaming, rival promotions) creates bidding conditions that compress rapidly once a deal closes. This window is time-limited by deal urgency and competitor depth.';
  } else if (laborVector === 'WORK_STOPPAGE_RISK') {
    stateLabel     = 'WORK_STOPPAGE_PROBABILITY_ELEVATED';
    primaryInsight = 'Work stoppage signals are present. In combat sports, event cancellations have outsized economic consequences — no recurring schedule, no insurance-pool economics. A credible stoppage threat reprices event rights, sponsorship guarantees, and venue contracts simultaneously.';
  } else {
    stateLabel     = `LABOR_VOLATILITY_${laborVector}`;
    primaryInsight = `Labor volatility signal: ${laborVector.replace(/_/g,' ')}. Industry context: ${industryContext}. Fighter economics are structurally compressed at the base — volatility surfaces at contract events, not between them.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'LABOR VOLATILITY',
    insight:         primaryInsight,
    metrics: [
      { id:'lv1', label:'LABOR VECTOR',      value: laborVector.replace(/_/g,' '),      type:'tag' },
      { id:'lv2', label:'INDUSTRY CONTEXT',  value: industryContext,                   type:'tag' },
      { id:'lv3', label:'LEVERAGE WINDOW',   value: laborVector === 'FREE_AGENCY_WINDOW' ? 'OPEN' : 'CONDITIONAL', type:'status' },
      { id:'lv4', label:'COLLECTIVE ACTION', value: laborVector === 'UNIONIZATION_PRESSURE' ? 'BUILDING' : 'LATENT', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'MAP LABOR CONCENTRATION', impact:0.82, rationale:'Identify which promotions hold the greatest share of top-ranked fighters. Concentration = structural risk when labor organizes.', tag:'STRUCTURE' },
      secondary:  { id:'a2', label:'TRACK CONTRACT EXPIRY CADENCE', impact:0.71, rationale:'Free agency windows cluster by promotion cycle. The window is widest when multiple top fighters hit free agency simultaneously.', tag:'TIMING' },
      conviction: [
        { id:'c1', label:'MODEL REVENUE SHARE SCENARIOS', impact:0.79, rationale:'UFC/boxing revenue-share structures are opaque. Modeling alternative splits (MMA fighters propose 50%) reveals the economic exposure for promoters if labor wins.', tag:'FINANCIAL' },
        { id:'c2', label:'MONITOR THIRD-PARTY ACTOR ENTRY', impact:0.65, rationale:'Rival promotions and streaming platforms are the silent beneficiaries of labor volatility. Their entry as alternative employers is the forcing function that makes union leverage credible.', tag:'SIGNAL' },
      ],
    },
    leverage:       { typeY:2, typeLabel:'LABOR', tierLabel, deRatio:0.45, permissionless:false, industryNorm:0.55 },
    labor_vector:   laborVector,
    industry_context: industryContext,
  };
}

// ── WO-1798: Brand-Equity-to-Enterprise-Stability ─────────────────────────────

function synthBrandEquityStability(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const brandSignal =
    /brand.*decline|brand.*erosion|reputation.*risk|brand.*damage/.test(q) ? 'BRAND_EROSION' :
    /brand.*premium|brand.*strength|brand.*equity.*grow|brand.*value.*rise/.test(q) ? 'BRAND_APPRECIATION' :
    /brand.*crisis|pr.*crisis|scandal|boycott.*brand/.test(q) ? 'BRAND_CRISIS' :
    /brand.*acquisition|brand.*licensing|brand.*extension/.test(q) ? 'BRAND_EXTENSION' :
    'BRAND_STABILITY';

  const enterpriseSignal =
    /enterprise.*value|ev.*ebitda|valuation.*multiple|acquisition.*target/.test(q) ? 'VALUATION_LINK' :
    /stock.*price|market.*cap|equity.*value/.test(q) ? 'EQUITY_IMPACT' :
    /credit.*rating|bond.*spread|debt.*cost/.test(q) ? 'CREDIT_IMPACT' :
    'GENERAL_ENTERPRISE';

  let stateLabel, primaryInsight;
  if (brandSignal === 'BRAND_CRISIS') {
    stateLabel     = 'BRAND_CRISIS_ENTERPRISE_EXPOSURE';
    primaryInsight = 'Brand crisis events create asymmetric enterprise value destruction. The transmission mechanism: brand damage → revenue forecast revision → multiple compression → equity repricing. The compression happens faster than fundamental earnings allow — this is a signal event, not a fundamental event.';
  } else if (brandSignal === 'BRAND_EROSION') {
    stateLabel     = 'BRAND_EROSION_STABILITY_RISK';
    primaryInsight = 'Chronic brand erosion signals enterprise durability risk. Unlike crisis events, erosion unfolds over 12–36 months and is typically invisible in quarterly earnings until it crosses a customer retention threshold. The leading indicators are NPS trajectory, search share, and organic mention velocity.';
  } else if (brandSignal === 'BRAND_APPRECIATION') {
    stateLabel     = 'BRAND_PREMIUM_ENTERPRISE_SIGNAL';
    primaryInsight = 'Brand equity appreciation is a leading indicator of enterprise stability. Companies with strengthening brand equity command acquisition premium, access cheaper debt, and retain talent more efficiently. Brand strength is the cheapest form of enterprise insurance.';
  } else {
    stateLabel     = `BRAND_EQUITY_${brandSignal}`;
    primaryInsight = `Brand-enterprise signal: ${brandSignal.replace(/_/g,' ')}. Enterprise exposure: ${enterpriseSignal.replace(/_/g,' ')}. Brand equity is an upstream variable — it precedes financial statement impact by one to three reporting cycles.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'BRAND EQUITY STABILITY',
    insight:         primaryInsight,
    metrics: [
      { id:'be1', label:'BRAND SIGNAL',      value: brandSignal.replace(/_/g,' '),      type:'tag' },
      { id:'be2', label:'ENTERPRISE VECTOR', value: enterpriseSignal.replace(/_/g,' '), type:'tag' },
      { id:'be3', label:'TRANSMISSION LAG',  value: '1–3 QUARTERS',                    type:'duration' },
      { id:'be4', label:'DETECTION WINDOW',  value: brandSignal === 'BRAND_CRISIS' ? 'IMMEDIATE' : 'LEADING', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'TRACK NPS + SEARCH SHARE VELOCITY', impact:0.85, rationale:'NPS trajectory and organic search share are the highest-signal leading indicators of brand equity direction. Both move before revenue does.', tag:'SIGNAL' },
      secondary:  { id:'a2', label:'MAP MULTIPLE SENSITIVITY TO BRAND', impact:0.73, rationale:'Quantify how much of the current enterprise multiple is attributable to brand premium. This determines downside exposure in a brand-damage scenario.', tag:'VALUATION' },
      conviction: [
        { id:'c1', label:'BUILD BRAND-REVENUE CORRELATION MODEL', impact:0.78, rationale:'Establish the historical correlation between brand sentiment inflections and next-quarter revenue for this company. The lag coefficient determines signal utility.', tag:'FINANCIAL' },
        { id:'c2', label:'MONITOR CATEGORY BRAND DYNAMICS', impact:0.64, rationale:'Brand equity is relative. A company can improve in absolute terms while losing ground to competitors. Category-level brand share is the corrective metric.', tag:'COMPETITIVE' },
      ],
    },
    leverage:       { typeY:2, typeLabel:'BRAND', tierLabel, deRatio:0.35, permissionless:false, industryNorm:0.5 },
    brand_signal:   brandSignal,
    enterprise_signal: enterpriseSignal,
  };
}

// ── WO-1799: Structural Resilience Synthesizer (Dimon Protocol) ───────────────

function synthStructuralResilience(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const resilienceVector =
    /capital.*ratio|tier.*1|cet1|capital.*adequacy|buffer/.test(q) ? 'CAPITAL_BUFFER' :
    /liquidity|lcr|nsfr|deposit.*stability|funding.*mix/.test(q) ? 'LIQUIDITY_POSITION' :
    /stress.*test|scenario.*test|adverse.*scenario|fed.*stress/.test(q) ? 'STRESS_TEST_POSTURE' :
    /credit.*quality|npl|non.*perform|loan.*loss|provision/.test(q) ? 'CREDIT_QUALITY' :
    /interest.*rate.*risk|duration.*risk|rate.*sensitivity|net.*interest.*margin/.test(q) ? 'RATE_SENSITIVITY' :
    'GENERAL_RESILIENCE';

  const institutionType =
    /jpmorgan|jp.*morgan|chase|dimon/.test(q) ? 'JPMORGAN' :
    /bank.*america|wells.*fargo|citi|goldman|morgan.*stanley/.test(q) ? 'MAJOR_BANK' :
    /regional.*bank|community.*bank|svb|signature|silvergate/.test(q) ? 'REGIONAL_BANK' :
    /insurance|insurer/.test(q) ? 'INSURANCE' :
    'FINANCIAL_INSTITUTION';

  let stateLabel, primaryInsight;
  if (resilienceVector === 'CAPITAL_BUFFER') {
    stateLabel     = 'CAPITAL_BUFFER_RESILIENCE_SIGNAL';
    primaryInsight = 'Capital buffer analysis is the structural foundation of institutional durability. CET1 ratios above regulatory minimums create the optionality to absorb unexpected losses without balance sheet restructuring. Buffer thickness — not its existence — determines crisis survivability.';
  } else if (resilienceVector === 'LIQUIDITY_POSITION') {
    stateLabel     = 'LIQUIDITY_RESILIENCE_SCAN';
    primaryInsight = 'Liquidity resilience is the short-duration stress signal. LCR and NSFR ratios indicate the ability to survive a 30-day and 1-year funding stress respectively. SVB\'s failure was a liquidity event before it became a solvency event — the sequencing matters.';
  } else if (resilienceVector === 'STRESS_TEST_POSTURE') {
    stateLabel     = 'STRESS_TEST_POSTURE_ACTIVE';
    primaryInsight = 'Fed stress test results are the closest thing to a regulatory X-ray of institutional resilience. The severely adverse scenario results reveal which institutions carry hidden duration risk, credit concentration, or capital fragility invisible in normal disclosures.';
  } else if (resilienceVector === 'RATE_SENSITIVITY') {
    stateLabel     = 'RATE_SENSITIVITY_EXPOSURE';
    primaryInsight = 'Rate sensitivity is the current regime\'s primary stress vector. Net interest margin compression and duration mismatch define institutional vulnerability when rates move faster than asset portfolios reprice. The institutions that survive rate cycles are those that actively managed duration through the previous low-rate era.';
  } else {
    stateLabel     = `STRUCTURAL_RESILIENCE_${resilienceVector}`;
    primaryInsight = `Structural resilience signal: ${resilienceVector.replace(/_/g,' ')}. Institution type: ${institutionType.replace(/_/g,' ')}. Balance sheet strength is the load-bearing variable — all other signals are downstream of it.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'STRUCTURAL RESILIENCE',
    insight:         primaryInsight,
    metrics: [
      { id:'sr1', label:'RESILIENCE VECTOR',   value: resilienceVector.replace(/_/g,' '),   type:'tag' },
      { id:'sr2', label:'INSTITUTION TYPE',    value: institutionType.replace(/_/g,' '),    type:'tag' },
      { id:'sr3', label:'BUFFER THRESHOLD',    value: resilienceVector === 'CAPITAL_BUFFER' ? 'CET1 ≥ 12%' : 'CONTEXT-DEPENDENT', type:'benchmark' },
      { id:'sr4', label:'CRISIS SEQUENCING',   value: 'LIQUIDITY → SOLVENCY',               type:'framework' },
    ],
    actions: {
      primary:    { id:'a1', label:'RUN CAPITAL RATIO COMPARABLES', impact:0.88, rationale:'CET1 ratio trajectory across peer institutions reveals which are building buffer vs. consuming it. Direction matters more than level.', tag:'CAPITAL' },
      secondary:  { id:'a2', label:'MAP DEPOSIT CONCENTRATION', impact:0.76, rationale:'SVB demonstrated that deposit concentration (uninsured, single-sector) is the hidden liquidity risk. Standard LCR reporting does not reveal concentration until it is too late.', tag:'LIQUIDITY' },
      conviction: [
        { id:'c1', label:'STRESS SCENARIO MODELING', impact:0.83, rationale:'Model the institution against a -300bp NIM compression + 3% credit loss scenario simultaneously. Institutions that can absorb both without capital breach are structurally resilient.', tag:'MODELING' },
        { id:'c2', label:'TRACK UNREALIZED LOSS TRAJECTORY', impact:0.71, rationale:'AOCI (accumulated other comprehensive income) losses on HTM/AFS portfolios are the leading indicator of rate-sensitivity exposure. Rising unrealized losses signal future capital pressure.', tag:'SIGNAL' },
      ],
    },
    leverage:        { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.3, permissionless:false, industryNorm:0.45 },
    resilience_vector: resilienceVector,
    institution_type:  institutionType,
  };
}

// ── WO-1800: Private Credit Fracture Map (Dimon Protocol) ─────────────────────

function synthPrivateCredit(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const fractureVector =
    /covenant.*lite|cov.*lite|weak.*covenant|covenant.*erosion/.test(q) ? 'COVENANT_EROSION' :
    /valuation.*marks|mark.*to.*market|gp.*marks|valuation.*lag/.test(q) ? 'VALUATION_LAG' :
    /liquidity.*risk|redemption.*risk|gate|illiquid/.test(q) ? 'LIQUIDITY_MISMATCH' :
    /default.*rate|distress|delinquency|pik.*interest|payment.*in.*kind/.test(q) ? 'DEFAULT_PRESSURE' :
    /concentration|single.*borrower|sector.*exposure/.test(q) ? 'CONCENTRATION_RISK' :
    'STRUCTURAL_RISK';

  const marketContext =
    /direct.*lending|bdcs?|business.*development/.test(q) ? 'DIRECT_LENDING' :
    /mezzanine|mezz|subordinated|junior.*debt/.test(q) ? 'MEZZANINE' :
    /distressed|special.*situation|credit.*opport/.test(q) ? 'DISTRESSED' :
    /infrastructure.*debt|real.*asset.*credit/.test(q) ? 'INFRASTRUCTURE_CREDIT' :
    'PRIVATE_CREDIT_GENERAL';

  let stateLabel, primaryInsight;
  if (fractureVector === 'VALUATION_LAG') {
    stateLabel     = 'PRIVATE_CREDIT_VALUATION_LAG_RISK';
    primaryInsight = 'GP-marked valuations in private credit lag public market reality by one to two quarters. This creates a structural information asymmetry between LPs and GPs at the moment of stress. When public credit markets dislocate, private credit portfolios appear stable — until they mark. The gap between mark and reality is the hidden risk.';
  } else if (fractureVector === 'DEFAULT_PRESSURE') {
    stateLabel     = 'PRIVATE_CREDIT_DEFAULT_CYCLE_ENTERING';
    primaryInsight = 'PIK (payment-in-kind) election rates and delinquency in direct lending portfolios are the earliest default signal. PIK elections indicate borrowers are managing cash flow stress by capitalizing interest — the credit equivalent of pushing debt forward. Rising PIK rates precede formal defaults by 6–18 months.';
  } else if (fractureVector === 'COVENANT_EROSION') {
    stateLabel     = 'COVENANT_LITE_VULNERABILITY_SIGNAL';
    primaryInsight = 'Covenant-lite structures remove the early warning system from credit agreements. When the next credit stress arrives, lenders lose the maintenance covenant triggers that historically created renegotiation windows before default. Cov-lite = fewer intervention points = higher loss severity when default occurs.';
  } else if (fractureVector === 'LIQUIDITY_MISMATCH') {
    stateLabel     = 'LIQUIDITY_MISMATCH_FRACTURE_RISK';
    primaryInsight = 'Liquidity mismatch in semi-liquid private credit vehicles is the systemic risk that regulators have flagged. When retail investors can redeem quarterly but underlying loans have 3–7 year maturities, a redemption wave creates a forced-selling dynamic with no liquid secondary market to absorb it.';
  } else {
    stateLabel     = `PRIVATE_CREDIT_${fractureVector}`;
    primaryInsight = `Private credit fracture signal: ${fractureVector.replace(/_/g,' ')}. Market context: ${marketContext.replace(/_/g,' ')}. Private credit has absorbed two-thirds of leveraged lending growth since 2015 — systemic risk now lives off-balance-sheet, invisible to traditional bank regulation.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'PRIVATE CREDIT FRACTURE',
    insight:         primaryInsight,
    metrics: [
      { id:'pc1', label:'FRACTURE VECTOR',  value: fractureVector.replace(/_/g,' '),  type:'tag' },
      { id:'pc2', label:'MARKET CONTEXT',   value: marketContext.replace(/_/g,' '),   type:'tag' },
      { id:'pc3', label:'VALUATION LAG',    value: '1–2 QUARTERS',                   type:'duration' },
      { id:'pc4', label:'PIK SIGNAL',       value: fractureVector === 'DEFAULT_PRESSURE' ? 'MONITOR' : 'BASELINE', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'TRACK PIK ELECTION RATES', impact:0.87, rationale:'Rising PIK elections in direct lending portfolios are the 6–18 month leading indicator of default cycles. This data point is available in BDC quarterly filings.', tag:'SIGNAL' },
      secondary:  { id:'a2', label:'MAP VALUATION DISPERSION VS. PUBLIC COMPS', impact:0.75, rationale:'Compare GP marks on private credits to equivalent-rated public bonds. Widening dispersion signals valuation lag accumulation — a correction is building.', tag:'VALUATION' },
      conviction: [
        { id:'c1', label:'STRESS-TEST LIQUIDITY MISMATCH', impact:0.81, rationale:'Model redemption scenarios against underlying loan maturity schedules. Identify at what redemption rate the vehicle begins forced-selling illiquid positions.', tag:'RISK' },
        { id:'c2', label:'MONITOR DIRECT LENDING BDC DISCOUNTS', impact:0.68, rationale:'BDC market discount to NAV is a real-time market signal of private credit stress — public markets pricing in default risk before GP marks reflect it.', tag:'MONITORING' },
      ],
    },
    leverage:       { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.55, permissionless:false, industryNorm:0.65 },
    fracture_vector: fractureVector,
    market_context:  marketContext,
  };
}

// ── WO-1801: Sovereign Capital Synthesizer (Alwaleed Protocol) ────────────────

function synthSovereignCapital(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const deploymentVector =
    /direct.*invest|equity.*stake|strategic.*equity|minority.*stake/.test(q) ? 'DIRECT_EQUITY' :
    /infrastructure|port|airport|energy.*infra|grid/.test(q) ? 'INFRASTRUCTURE' :
    /tech.*invest|venture|growth.*equity|startup/.test(q) ? 'TECH_VENTURE' :
    /real.*estate|property|land|trophy.*asset/.test(q) ? 'REAL_ASSETS' :
    /geopolit|strategic.*asset|national.*interest|belt.*road/.test(q) ? 'GEOPOLITICAL' :
    'DIVERSIFIED_DEPLOYMENT';

  const fundOrigin =
    /saudi|pif|mbs|crown.*prince|aramco/.test(q) ? 'PIF_SAUDI' :
    /alwaleed|kingdom.*holding/.test(q) ? 'KINGDOM_HOLDING' :
    /abu.*dhabi|adia|mubadala|adq/.test(q) ? 'UAE_ABU_DHABI' :
    /norway|nbim|gpfg|oil.*fund/.test(q) ? 'NORWAY_GPFG' :
    /singapore|gic|temasek/.test(q) ? 'SINGAPORE' :
    /qatar|qia/.test(q) ? 'QATAR_QIA' :
    'SOVEREIGN_GENERAL';

  let stateLabel, primaryInsight;
  if (deploymentVector === 'GEOPOLITICAL') {
    stateLabel     = 'SOVEREIGN_GEOPOLITICAL_DEPLOYMENT';
    primaryInsight = 'Sovereign capital with geopolitical deployment intent follows a different logic than financial return maximization. Assets are acquired for strategic positioning — supply chain control, technology access, soft-power extension. The return calculation is multi-dimensional and cannot be modeled as pure IRR.';
  } else if (deploymentVector === 'TECH_VENTURE') {
    stateLabel     = 'SOVEREIGN_TECH_VENTURE_WAVE';
    primaryInsight = 'SWF deployment into tech ventures represents the largest single source of late-stage growth capital globally. PIF, ADIA, and GIC collectively deploy more capital than the top 10 US growth equity firms. Their entry into a sector validates demand at institutional scale and compresses future funding windows.';
  } else if (deploymentVector === 'DIRECT_EQUITY') {
    stateLabel     = 'SOVEREIGN_DIRECT_EQUITY_SIGNAL';
    primaryInsight = 'Direct sovereign equity stakes in public companies are the highest-conviction SWF signal. Unlike fund investments, direct stakes require board-level conviction and typically represent 5–15 year holding horizons. When sovereign capital takes a direct stake, it is signaling a structural view — not a trade.';
  } else {
    stateLabel     = `SOVEREIGN_CAPITAL_${deploymentVector}`;
    primaryInsight = `Sovereign capital deployment signal: ${deploymentVector.replace(/_/g,' ')}. Fund origin: ${fundOrigin.replace(/_/g,' ')}. Sovereign wealth funds collectively manage $12T+ — their deployment patterns set the structural floor for asset class valuations in targeted sectors.`;
  }

  const tierLabel = capital !== null ? (capital >= 100000000 ? 'INSTITUTIONAL' : capital >= 10000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'SOVEREIGN CAPITAL',
    insight:         primaryInsight,
    metrics: [
      { id:'sc1', label:'DEPLOYMENT VECTOR', value: deploymentVector.replace(/_/g,' '), type:'tag' },
      { id:'sc2', label:'FUND ORIGIN',       value: fundOrigin.replace(/_/g,' '),       type:'tag' },
      { id:'sc3', label:'HOLDING HORIZON',   value: '5–15 YEARS',                       type:'duration' },
      { id:'sc4', label:'CAPITAL SCALE',     value: '$12T+ AUM GLOBALLY',               type:'benchmark' },
    ],
    actions: {
      primary:    { id:'a1', label:'MAP SECTOR CONCENTRATION BY SWF', impact:0.86, rationale:'Which sectors are receiving disproportionate sovereign capital? Concentration signals structural conviction — these sectors get a valuation floor that private capital alone cannot sustain.', tag:'MAPPING' },
      secondary:  { id:'a2', label:'TRACK DIRECT STAKE ANNOUNCEMENTS', impact:0.77, rationale:'Direct equity stake announcements from PIF, ADIA, or GIC are the highest-signal sovereign capital events. Track them by sector and geography to identify structural deployment themes.', tag:'SIGNAL' },
      conviction: [
        { id:'c1', label:'GEOPOLITICAL RETURN MODEL', impact:0.80, rationale:'Build a framework for evaluating sovereign investments on strategic + financial return dimensions separately. Pure IRR analysis misses the geopolitical optionality that drives SWF decision-making.', tag:'FRAMEWORK' },
        { id:'c2', label:'MONITOR REPATRIATION RISK', impact:0.66, rationale:'Political transitions in sovereign fund home countries can trigger unexpected repatriation mandates. This is the tail risk in sovereign capital — it exits on political, not financial, logic.', tag:'RISK' },
      ],
    },
    leverage:          { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.2, permissionless:false, industryNorm:0.3 },
    deployment_vector: deploymentVector,
    fund_origin:       fundOrigin,
  };
}

// ── WO-1727: Startup Market Readiness Synthesizer (YC Protocol) ───────────────

function synthStartupReadiness(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const readinessVector =
    /pmf|product.*market.*fit|fit.*signal|retention.*signal|cohort.*retention/.test(q) ? 'PMF_SIGNAL' :
    /launch.*window|timing.*launch|market.*timing|when.*launch/.test(q) ? 'LAUNCH_TIMING' :
    /competitive.*window|competitor.*move|first.*mover|market.*entry/.test(q) ? 'COMPETITIVE_WINDOW' :
    /fundraise|raise.*round|investor.*timing|venture.*round|seed/.test(q) ? 'FUNDRAISE_TIMING' :
    /yc|ycombinator|batch|accelerator/.test(q) ? 'BATCH_CONTEXT' :
    'GENERAL_READINESS';

  const marketSignal =
    /b2b|enterprise|saas.*b2b/.test(q) ? 'B2B' :
    /consumer|b2c|marketplace/.test(q) ? 'B2C' :
    /developer|api.*product|infrastructure/.test(q) ? 'DEVELOPER' :
    /climate|deep.*tech|bio|hardware/.test(q) ? 'DEEP_TECH' :
    'GENERAL';

  let stateLabel, primaryInsight;
  if (readinessVector === 'PMF_SIGNAL') {
    stateLabel     = 'PMF_DETECTION_ACTIVE';
    primaryInsight = 'Product-market fit detection is the highest-signal startup diagnostic. PMF manifests before revenue in engagement metrics: D7/D30 retention, organic referral rate, and usage depth. The YC heuristic — "users are pulling the product from you" — is measurable. A startup with genuine PMF signal should launch faster, not slower.';
  } else if (readinessVector === 'LAUNCH_TIMING') {
    stateLabel     = 'LAUNCH_WINDOW_SCAN';
    primaryInsight = 'Launch timing is a compression trade-off: market readiness vs. product readiness. The optimal window is when demand is building but category leaders have not yet consolidated. Waiting for product perfection is the most common startup timing error — the market window closes independently of product completion.';
  } else if (readinessVector === 'COMPETITIVE_WINDOW') {
    stateLabel     = 'COMPETITIVE_WINDOW_ASSESSMENT';
    primaryInsight = 'Competitive entry windows are time-bounded by the velocity of category formation. In fast-moving categories, the window from "market emerging" to "leaders established" compresses to 18–36 months. Once the top two players control 60%+ of search intent in a category, organic entry becomes structurally expensive.';
  } else {
    stateLabel     = `STARTUP_READINESS_${readinessVector}`;
    primaryInsight = `Market readiness signal: ${readinessVector.replace(/_/g,' ')}. Market context: ${marketSignal}. The YC protocol: build something users want, launch fast, measure retention. Everything else is downstream of these three.`;
  }

  const tierLabel = capital !== null ? (capital >= 1000000 ? 'SEED_PLUS' : capital >= 100000 ? 'PRE_SEED' : 'BOOTSTRAPPED') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'STARTUP MARKET READINESS',
    insight:         primaryInsight,
    metrics: [
      { id:'mr1', label:'READINESS VECTOR',  value: readinessVector.replace(/_/g,' '), type:'tag' },
      { id:'mr2', label:'MARKET CONTEXT',    value: marketSignal,                      type:'tag' },
      { id:'mr3', label:'WINDOW HORIZON',    value: '18–36 MONTHS',                    type:'duration' },
      { id:'mr4', label:'PMF GATE',          value: readinessVector === 'PMF_SIGNAL' ? 'ACTIVE' : 'UPSTREAM', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'MEASURE D30 RETENTION BASELINE', impact:0.91, rationale:'D30 retention is the canonical PMF metric. B2C: >25% is strong. B2B: >80% monthly retention. If you don\'t know these numbers you don\'t know if you have PMF.', tag:'METRIC' },
      secondary:  { id:'a2', label:'MAP CATEGORY LEADER CONSOLIDATION', impact:0.74, rationale:'Quantify how consolidated the target category is. Search share, funding concentration, and TAM coverage by existing players determine entry difficulty.', tag:'COMPETITIVE' },
      conviction: [
        { id:'c1', label:'RUN LAUNCH TIMING DECISION MATRIX', impact:0.82, rationale:'Frame the launch timing trade-off explicitly: what is the cost of launching 6 months early vs. 6 months late? Asymmetry usually favors earlier. Missing the window is permanent; shipping imperfect is recoverable.', tag:'DECISION' },
        { id:'c2', label:'TRACK ORGANIC REFERRAL RATE', impact:0.69, rationale:'Organic referral (users bringing users without incentive) is the most reliable PMF signal because it cannot be manufactured by growth spend. A rising referral rate before paid acquisition means the product is working.', tag:'SIGNAL' },
      ],
    },
    leverage:         { typeY:1, typeLabel:'KNOWLEDGE', tierLabel, deRatio:0.6, permissionless:true, industryNorm:0.4 },
    readiness_vector: readinessVector,
    market_signal:    marketSignal,
  };
}

// ── WO-1729: Long-Duration Convergence Synthesizer (Page-Brin Protocol) ───────

function synthLongDurationConvergence(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const convergenceType =
    /ai|artificial.*intellig|machine.*learn|neural/.test(q) ? 'AI_INFRASTRUCTURE' :
    /climate|energy.*transition|renewable|grid|decarboniz/.test(q) ? 'ENERGY_TRANSITION' :
    /biotech|genomic|longevity|health.*tech|therapeut/.test(q) ? 'BIOTECHNOLOGY' :
    /space|satellite|launch|orbit|mars/.test(q) ? 'SPACE_INFRASTRUCTURE' :
    /quantum|quantum.*computing|qubit/.test(q) ? 'QUANTUM_COMPUTING' :
    /autonomous|self.*driving|robotics|humanoid/.test(q) ? 'AUTONOMOUS_SYSTEMS' :
    'GENERATIONAL_BET';

  const horizonSignal =
    /10.*year|decade|10x|2030|2035|generational/.test(q) ? 'DECADE_SCALE' :
    /5.*year|mid.*term|medium.*term|2028|2029/.test(q) ? 'MEDIUM_TERM' :
    /moonshot|long.*shot|asymmetric|convex/.test(q) ? 'MOONSHOT' :
    'LONG_DURATION';

  let stateLabel, primaryInsight;
  if (convergenceType === 'AI_INFRASTRUCTURE') {
    stateLabel     = 'AI_INFRASTRUCTURE_DECADE_CONVERGENCE';
    primaryInsight = 'AI infrastructure is a decade-scale convergence — not a cycle. The compute, data, and talent infrastructure being built from 2022–2030 determines who owns the next 20 years of enterprise productivity. The Page-Brin insight: index the world first, monetize later. The infrastructure builders win before the applications are visible.';
  } else if (convergenceType === 'ENERGY_TRANSITION') {
    stateLabel     = 'ENERGY_TRANSITION_DECADE_CONVERGENCE';
    primaryInsight = 'Energy transition is the largest long-duration capital deployment opportunity since electrification. The compounding mechanism: cost curves on solar/wind/storage continue declining independently of policy — the economics are now self-reinforcing. Policy accelerates the timeline; removing policy doesn\'t reverse the cost curve.';
  } else if (convergenceType === 'BIOTECHNOLOGY') {
    stateLabel     = 'BIOTECH_DECADE_CONVERGENCE';
    primaryInsight = 'Biotechnology convergence is entering its compounding phase. The GLP-1 weight-loss drug class demonstrated that biology can achieve what decades of behavioral intervention could not. This is the signal pattern: a biological mechanism that produces outcomes unachievable by prior means. Each such mechanism creates a platform, not a product.';
  } else {
    stateLabel     = `LONG_DURATION_${convergenceType}`;
    primaryInsight = `Long-duration convergence signal: ${convergenceType.replace(/_/g,' ')}. Horizon: ${horizonSignal.replace(/_/g,' ')}. The Page-Brin protocol: identify the infrastructure layer of the next decade, build at scale before the use cases are obvious, and hold through the adoption S-curve.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'LONG-DURATION CONVERGENCE',
    insight:         primaryInsight,
    metrics: [
      { id:'ld1', label:'CONVERGENCE TYPE',  value: convergenceType.replace(/_/g,' '),  type:'tag' },
      { id:'ld2', label:'HORIZON SIGNAL',    value: horizonSignal.replace(/_/g,' '),    type:'tag' },
      { id:'ld3', label:'CONVICTION WINDOW', value: '5–15 YEARS',                       type:'duration' },
      { id:'ld4', label:'COMPOUNDING STAGE', value: 'INFRASTRUCTURE PHASE',             type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'MAP INFRASTRUCTURE LAYER OWNERSHIP', impact:0.89, rationale:'In every decade-scale convergence, the infrastructure layer owners capture disproportionate value before applications are visible. Identify who owns the compute/grid/platform/network for this convergence.', tag:'STRUCTURE' },
      secondary:  { id:'a2', label:'TRACK COST CURVE TRAJECTORY', impact:0.78, rationale:'Self-reinforcing cost curves (solar, genome sequencing, AI training) are the mechanism that makes decade-scale bets non-speculative. If the cost curve is declining at 30%+ per year, the demand curve is inevitable.', tag:'SIGNAL' },
      conviction: [
        { id:'c1', label:'MODEL S-CURVE ADOPTION POSITION', impact:0.84, rationale:'Identify where this convergence sits on the adoption S-curve. Pre-inflection (< 5% penetration in addressable market) is the maximum asymmetry window. Post-inflection risk is multiple compression as visibility improves.', tag:'TIMING' },
        { id:'c2', label:'STRESS-TEST AGAINST SUBSTITUTION', impact:0.67, rationale:'What would have to be true for a competing convergence to displace this one? Substitution analysis prevents decade-scale commitment to a losing platform bet.', tag:'RISK' },
      ],
    },
    leverage:          { typeY:2, typeLabel:'CAPITAL', tierLabel, deRatio:0.25, permissionless:false, industryNorm:0.35 },
    convergence_type:  convergenceType,
    horizon_signal:    horizonSignal,
  };
}

// ── WO-1730: Flexible Space Demand Synthesizer (Neumann Protocol) ─────────────

function synthFlexibleSpace(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const demandVector =
    /remote.*work|hybrid.*work|work.*from.*home|distributed.*team/.test(q) ? 'REMOTE_HYBRID_DEMAND' :
    /startup.*space|startup.*office|early.*stage.*office|pre.*series/.test(q) ? 'STARTUP_DEMAND' :
    /enterprise.*flex|large.*company.*flex|corporate.*flex|enterprise.*cowork/.test(q) ? 'ENTERPRISE_FLEX' :
    /wework|iw.*group|regus|industrious|coworking.*operator/.test(q) ? 'OPERATOR_DYNAMICS' :
    /lease.*flex|short.*term.*lease|month.*to.*month|flex.*lease/.test(q) ? 'LEASE_STRUCTURE' :
    'GENERAL_FLEX_DEMAND';

  const marketContext =
    /new.*york|nyc|manhattan/.test(q) ? 'NYC' :
    /san.*francisco|sf|bay.*area/.test(q) ? 'SF_BAY' :
    /london|uk|europe/.test(q) ? 'LONDON_EU' :
    /los.*angeles|la/.test(q) ? 'LA' :
    /austin|miami|nashville|sunbelt/.test(q) ? 'SUNBELT' :
    'MULTI_MARKET';

  let stateLabel, primaryInsight;
  if (demandVector === 'ENTERPRISE_FLEX') {
    stateLabel     = 'ENTERPRISE_FLEX_DEMAND_SIGNAL';
    primaryInsight = 'Enterprise flex demand is the structural shift that WeWork\'s collapse obscured. Large corporations are using flex space not as a WeWork alternative but as a lease optionality tool — converting fixed long-term obligations to variable cost. IWG and Industrious are the beneficiaries because they have the financial structure that WeWork lacked.';
  } else if (demandVector === 'REMOTE_HYBRID_DEMAND') {
    stateLabel     = 'HYBRID_WORK_FLEX_DEMAND_ACTIVE';
    primaryInsight = 'Hybrid work has created a structural reconfiguration of office demand. The demand is not dead — it is distributed. Companies are replacing one large HQ lease with a network of flex memberships and satellite locations. Total square footage is declining but flex utilization is rising. This is a distribution shift, not a demand collapse.';
  } else if (demandVector === 'OPERATOR_DYNAMICS') {
    stateLabel     = 'FLEX_OPERATOR_MARKET_SCAN';
    primaryInsight = 'The flex office operator market has consolidated around asset-light models (Industrious/management contracts) and capital-efficient operators (IWG/Regus global network). WeWork\'s bankruptcy cleared the market of the distortive effect of below-cost pricing. The survivors are operating on fundamentally different unit economics.';
  } else {
    stateLabel     = `FLEXIBLE_SPACE_${demandVector}`;
    primaryInsight = `Flexible space demand signal: ${demandVector.replace(/_/g,' ')}. Market context: ${marketContext}. The Neumann insight: proximity to people and spontaneous collaboration are genuine human needs that remote work cannot fulfill. Flex captures this without locking occupants into decade-long leases.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'FLEXIBLE SPACE DEMAND',
    insight:         primaryInsight,
    metrics: [
      { id:'fs1', label:'DEMAND VECTOR',    value: demandVector.replace(/_/g,' '),   type:'tag' },
      { id:'fs2', label:'MARKET CONTEXT',   value: marketContext,                    type:'tag' },
      { id:'fs3', label:'UTILIZATION TREND',value: 'RISING',                         type:'status' },
      { id:'fs4', label:'LEASE STRUCTURE',  value: 'VARIABLE COST MODEL',            type:'framework' },
    ],
    actions: {
      primary:    { id:'a1', label:'TRACK ENTERPRISE FLEX PENETRATION RATE', impact:0.83, rationale:'Enterprise flex as % of total commercial real estate portfolio is the growth indicator. Current penetration (~5%) suggests substantial runway before flex becomes the dominant office format.', tag:'SIGNAL' },
      secondary:  { id:'a2', label:'COMPARE OPERATOR UNIT ECONOMICS', impact:0.72, rationale:'Management contract model (Industrious) vs. master lease model (legacy WeWork) have fundamentally different risk profiles. Operator unit economics determine which companies survive the next real estate cycle.', tag:'FINANCIAL' },
      conviction: [
        { id:'c1', label:'MODEL SUBLEASE MARKET AS SIGNAL', impact:0.77, rationale:'Sublease availability is the leading indicator of large company office demand. Rising sublease = corporations reducing footprint. Falling sublease = demand recovery. Sublease moves before net absorption in official CBRE/JLL data.', tag:'LEADING_INDICATOR' },
        { id:'c2', label:'MAP SUNBELT FLEX EXPANSION VELOCITY', impact:0.64, rationale:'Sunbelt markets (Austin, Miami, Nashville) are absorbing flex capacity faster than coastal markets. This geographic demand shift changes the optimal operator footprint strategy.', tag:'GEOGRAPHIC' },
      ],
    },
    leverage:       { typeY:5, typeLabel:'OWNERSHIP', tierLabel, deRatio:0.65, permissionless:false, industryNorm:0.6 },
    demand_vector:  demandVector,
    market_context: marketContext,
  };
}

// ── WO-1731: Fintech Infrastructure Synthesizer (Collison Protocol) ───────────

function synthFintechInfra(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const infraVector =
    /payment.*rail|rail.*infrastructure|interbank|swift|ach|real.*time.*payment|rtp/.test(q) ? 'PAYMENT_RAILS' :
    /embedded.*finance|banking.*as.*service|baas|embedded.*banking/.test(q) ? 'EMBEDDED_FINANCE' :
    /developer.*api|financial.*api|api.*first|stripe.*model/.test(q) ? 'DEVELOPER_API' :
    /stablecoin|crypto.*payment|blockchain.*payment|cbdc/.test(q) ? 'CRYPTO_RAILS' :
    /cross.*border|international.*payment|remittance|fx.*settlement/.test(q) ? 'CROSS_BORDER' :
    /compliance|kyc|aml|fraud.*detection|identity.*verif/.test(q) ? 'COMPLIANCE_LAYER' :
    'GENERAL_FINTECH_INFRA';

  const marketLayer =
    /infrastructure|plumbing|backend|middleware/.test(q) ? 'INFRASTRUCTURE_LAYER' :
    /consumer|retail.*banking|neobank|challenger.*bank/.test(q) ? 'CONSUMER_LAYER' :
    /b2b|enterprise.*finance|treasury|corporate/.test(q) ? 'ENTERPRISE_LAYER' :
    'PLATFORM_LAYER';

  let stateLabel, primaryInsight;
  if (infraVector === 'PAYMENT_RAILS') {
    stateLabel     = 'PAYMENT_RAILS_INFRASTRUCTURE_SIGNAL';
    primaryInsight = 'Payment rail modernization is a decade-long infrastructure replacement cycle. ACH was built for a 1970s banking system. The US FedNow launch and global real-time payment network buildout represent the first fundamental rail upgrade in 50 years. Companies that own the transition layer — routing, reconciliation, API abstraction — capture the value of the upgrade without the regulatory exposure of the banks.';
  } else if (infraVector === 'DEVELOPER_API') {
    stateLabel     = 'DEVELOPER_FINTECH_API_EXPANSION';
    primaryInsight = 'The Collison protocol: financial infrastructure should have the same developer experience as web infrastructure. Stripe\'s insight was that payment complexity was a developer problem, not a financial problem. API-first financial services companies are compounding on Stripe\'s proof-of-concept — every financial workflow that can be accessed via API is a future category.';
  } else if (infraVector === 'EMBEDDED_FINANCE') {
    stateLabel     = 'EMBEDDED_FINANCE_WAVE_ACTIVE';
    primaryInsight = 'Embedded finance is the productization of banking-as-a-service. When Shopify offers merchant lending, or Uber offers driver banking, they are using the Collison infrastructure pattern — financial services at the point of need, not at the bank branch. The infrastructure winners are the BaaS providers and ledger-layer companies that enable non-bank companies to offer financial products.';
  } else {
    stateLabel     = `FINTECH_INFRA_${infraVector}`;
    primaryInsight = `Fintech infrastructure signal: ${infraVector.replace(/_/g,' ')}. Market layer: ${marketLayer.replace(/_/g,' ')}. Financial infrastructure follows the same pattern as internet infrastructure: the protocol layer captures durable value, application layers cycle.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'FINTECH INFRASTRUCTURE',
    insight:         primaryInsight,
    metrics: [
      { id:'fi1', label:'INFRA VECTOR',    value: infraVector.replace(/_/g,' '),    type:'tag' },
      { id:'fi2', label:'MARKET LAYER',    value: marketLayer.replace(/_/g,' '),    type:'tag' },
      { id:'fi3', label:'CYCLE DURATION',  value: '10–20 YEARS',                   type:'duration' },
      { id:'fi4', label:'API DENSITY',     value: infraVector === 'DEVELOPER_API' ? 'HIGH' : 'MODERATE', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'MAP API ECOSYSTEM DEPENDENCY GRAPH', impact:0.87, rationale:'Identify which fintech companies are upstream vs. downstream in the API dependency chain. Infrastructure layer companies have pricing power that application layer companies do not — they become the toll road.', tag:'STRUCTURE' },
      secondary:  { id:'a2', label:'TRACK DEVELOPER ADOPTION VELOCITY', impact:0.75, rationale:'Developer adoption (GitHub stars, API call volume, sandbox registrations) is the leading indicator of fintech infrastructure market share — it moves 12–18 months before revenue.', tag:'SIGNAL' },
      conviction: [
        { id:'c1', label:'MODEL SWITCHING COST ARCHITECTURE', impact:0.82, rationale:'Fintech infrastructure switching costs compound with integration depth. Every additional financial product a company builds on a platform raises switching cost. Map integration depth as a moat metric.', tag:'MOAT' },
        { id:'c2', label:'REGULATORY ARBITRAGE SCAN', impact:0.68, rationale:'Banking charter vs. BaaS model has regulatory arbitrage implications. BaaS companies face increasing regulatory scrutiny as they absorb bank-like functions. This is the ceiling on the non-bank fintech infrastructure model.', tag:'RISK' },
      ],
    },
    leverage:       { typeY:1, typeLabel:'TECHNOLOGY', tierLabel, deRatio:0.4, permissionless:true, industryNorm:0.45 },
    infra_vector:   infraVector,
    market_layer:   marketLayer,
  };
}

// ── WO-1732: Forward Compute Demand Synthesizer (Huang Protocol) ──────────────

function synthForwardCompute(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const computeVector =
    /gpu.*supply|gpu.*shortage|h100|a100|blackwell|hopper|nvidia.*supply/.test(q) ? 'GPU_SUPPLY' :
    /inference.*demand|inference.*cost|inference.*scaling|model.*inference/.test(q) ? 'INFERENCE_DEMAND' :
    /training.*compute|training.*cost|pre.*training|foundation.*model.*training/.test(q) ? 'TRAINING_COMPUTE' :
    /data.*center|hyperscaler|cloud.*gpu|gpu.*cloud|colo|rack/.test(q) ? 'DATACENTER_BUILD' :
    /energy.*compute|power.*ai|electricity.*ai|compute.*power/.test(q) ? 'ENERGY_CONSTRAINT' :
    /custom.*chip|asic|tpu|maia|trainium|gaudi/.test(q) ? 'CUSTOM_SILICON' :
    'GENERAL_COMPUTE';

  const supplyDemandBalance =
    /shortage|constrained|backlog|wait.*list|allocation/.test(q) ? 'DEMAND_EXCEEDS_SUPPLY' :
    /oversupply|glut|excess.*capacity|inventory/.test(q) ? 'SUPPLY_EXCEEDS_DEMAND' :
    'BALANCED';

  let stateLabel, primaryInsight;
  if (computeVector === 'GPU_SUPPLY') {
    stateLabel     = 'GPU_SUPPLY_SIGNAL_ACTIVE';
    primaryInsight = 'GPU supply is the rate-limiting variable for AI infrastructure deployment. H100/B200 allocation cycles determine which hyperscalers, startups, and sovereigns can train competitive foundation models. The Huang Protocol: whoever controls GPU supply controls AI timeline. Supply shortage is not a temporary disruption — it is the structural condition for the next 3–5 years as wafer capacity catches up to demand.';
  } else if (computeVector === 'INFERENCE_DEMAND') {
    stateLabel     = 'INFERENCE_DEMAND_CURVE_ACTIVE';
    primaryInsight = 'Inference demand is the next phase of the compute buildout. Training created initial GPU demand; inference deployment will dwarf it. Every user of an AI product generates ongoing inference compute requirement. As AI applications scale from millions to billions of users, inference compute demand creates a structural, recurring revenue stream for GPU manufacturers and cloud providers.';
  } else if (computeVector === 'ENERGY_CONSTRAINT') {
    stateLabel     = 'COMPUTE_ENERGY_CONSTRAINT_SIGNAL';
    primaryInsight = 'Energy availability is becoming the binding constraint on AI compute expansion. Data center power demand is outpacing grid buildout in every major market. The Huang Protocol extension: future compute leadership will be won by whoever secures dedicated power generation — nuclear, gas, or renewable — because the grid cannot absorb the demand at training scale.';
  } else if (computeVector === 'CUSTOM_SILICON') {
    stateLabel     = 'CUSTOM_SILICON_DISRUPTION_SIGNAL';
    primaryInsight = 'Custom silicon (Google TPU, Amazon Trainium, Microsoft Maia) represents hyperscaler vertical integration of the compute stack. If successful at scale, custom silicon reduces GPU dependency and reprices NVIDIA\'s leverage. Current custom silicon trails NVIDIA by 2–3 performance generations but is advancing rapidly on cost-per-inference.';
  } else {
    stateLabel     = `FORWARD_COMPUTE_${computeVector}`;
    primaryInsight = `Forward compute demand signal: ${computeVector.replace(/_/g,' ')}. Supply-demand balance: ${supplyDemandBalance.replace(/_/g,' ')}. Compute demand is not cyclical — it is structurally compounding with AI adoption. Every new AI capability creates downstream inference demand that does not mean-revert.`;
  }

  const tierLabel = capital !== null ? (capital >= 10000000 ? 'INSTITUTIONAL' : capital >= 1000000 ? 'ACCREDITED' : 'RETAIL') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'FORWARD COMPUTE DEMAND',
    insight:         primaryInsight,
    metrics: [
      { id:'fc1', label:'COMPUTE VECTOR',     value: computeVector.replace(/_/g,' '),        type:'tag' },
      { id:'fc2', label:'SUPPLY/DEMAND',      value: supplyDemandBalance.replace(/_/g,' '),  type:'tag' },
      { id:'fc3', label:'DEMAND HORIZON',     value: '3–7 YEARS STRUCTURAL',                 type:'duration' },
      { id:'fc4', label:'BINDING CONSTRAINT', value: computeVector === 'ENERGY_CONSTRAINT' ? 'POWER' : 'SILICON', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'MAP GPU ALLOCATION CONCENTRATION', impact:0.92, rationale:'Track which organizations are securing H100/B200 allocations by volume. GPU allocation is the leading indicator of who will lead AI capability development — 12–18 months before model releases reveal the outcome.', tag:'SIGNAL' },
      secondary:  { id:'a2', label:'TRACK INFERENCE COST CURVE', impact:0.81, rationale:'Inference cost per token is declining at 10x per 18 months historically. Modeling the cost curve determines when AI features become economically viable at consumer scale — the demand activation threshold.', tag:'ECONOMICS' },
      conviction: [
        { id:'c1', label:'MODEL POWER DENSITY CONSTRAINT', impact:0.86, rationale:'Data center power density (kW per rack) is the physical ceiling on compute scaling. Current AI racks at 50–100kW are approaching grid connection limits. Model the power constraint timeline for each major compute geography.', tag:'INFRASTRUCTURE' },
        { id:'c2', label:'TRACK CUSTOM SILICON BENCHMARK PROGRESSION', impact:0.72, rationale:'The pace at which Google/Amazon/Microsoft custom silicon closes the performance gap with NVIDIA H-series determines the GPU dependency timeline. Quarterly benchmark tracking is the signal to watch.', tag:'COMPETITIVE' },
      ],
    },
    leverage:        { typeY:1, typeLabel:'TECHNOLOGY', tierLabel, deRatio:0.3, permissionless:false, industryNorm:0.35 },
    compute_vector:  computeVector,
    supply_demand:   supplyDemandBalance,
  };
}

// ── WO-1733: Attention Saturation Synthesizer (Godin Protocol) ────────────────

function synthAttentionSaturation(session, numbers, query) {
  const q      = query.toLowerCase();
  const capital = numbers[0] ?? null;

  const saturationVector =
    /permission.*market|opt.*in|subscriber|email.*list|newsletter/.test(q) ? 'PERMISSION_MARKETING' :
    /purple.*cow|remarkable|stand.*out|differentiat|category.*of.*one/.test(q) ? 'DIFFERENTIATION_SIGNAL' :
    /ad.*saturation|paid.*attention|cpc.*rising|cpm.*rising|ad.*cost/.test(q) ? 'PAID_ATTENTION_COST' :
    /organic.*reach|algorithmic.*reach|reach.*declining|platform.*reach/.test(q) ? 'ORGANIC_REACH_COMPRESSION' :
    /brand.*trust|credibility|authority|thought.*leader/.test(q) ? 'AUTHORITY_SIGNAL' :
    'GENERAL_SATURATION';

  const channelContext =
    /email|newsletter|substack/.test(q) ? 'EMAIL' :
    /social.*media|instagram|tiktok|twitter|x\.com/.test(q) ? 'SOCIAL' :
    /search|seo|google.*search|organic.*search/.test(q) ? 'SEARCH' :
    /podcast|audio/.test(q) ? 'AUDIO' :
    /content.*market|blog|article|long.*form/.test(q) ? 'CONTENT' :
    'MULTI_CHANNEL';

  let stateLabel, primaryInsight;
  if (saturationVector === 'PERMISSION_MARKETING') {
    stateLabel     = 'PERMISSION_MARKETING_SIGNAL_ACTIVE';
    primaryInsight = 'Permission marketing is the Godin antidote to attention saturation. Interruption marketing (ads, cold outreach) becomes structurally less effective as saturation increases — more noise requires louder noise. Permission (opted-in audiences who want to hear from you) appreciates in value as the attention economy saturates. An email list of 10,000 opted-in subscribers outperforms a social following of 100,000 algorithm-dependent followers.';
  } else if (saturationVector === 'PAID_ATTENTION_COST') {
    stateLabel     = 'PAID_ATTENTION_COST_ESCALATION';
    primaryInsight = 'CPC/CPM escalation is the measurable signal of attention saturation. When paid attention costs rise faster than conversion rates, the paid channel economics invert — the CAC floor rises above LTV for all but the highest-margin products. This is the forcing function that drives category leaders toward owned audience and permission assets.';
  } else if (saturationVector === 'ORGANIC_REACH_COMPRESSION') {
    stateLabel     = 'ORGANIC_REACH_COMPRESSION_SIGNAL';
    primaryInsight = 'Platform algorithmic reach compression is structural, not cyclical. Facebook organic reach declined from 16% (2012) to under 2% (2022). Every major social platform follows the same curve: open organic access → advertiser monetization → organic compression → forced paid promotion. The only escape is owning the channel (email, SMS, podcast, community).';
  } else if (saturationVector === 'DIFFERENTIATION_SIGNAL') {
    stateLabel     = 'PURPLE_COW_DIFFERENTIATION_WINDOW';
    primaryInsight = 'The Purple Cow principle: in a saturated attention environment, the only marketing that works is the product being remarkable — something worth remarking on. Remarkable is not louder. Remarkable is different enough that people choose to spread it. At peak saturation, conventional marketing budgets produce diminishing returns; unconventional product design produces compounding word-of-mouth.';
  } else {
    stateLabel     = `ATTENTION_SATURATION_${saturationVector}`;
    primaryInsight = `Attention saturation signal: ${saturationVector.replace(/_/g,' ')}. Channel context: ${channelContext}. The Godin Protocol: in a world of infinite messages, scarcity is attention, and the only sustainable strategy is earning it — not buying it.`;
  }

  const tierLabel = capital !== null ? (capital >= 1000000 ? 'INSTITUTIONAL' : capital >= 100000 ? 'GROWTH' : 'EARLY_STAGE') : 'UNSPECIFIED';

  return {
    state:           stateLabel,
    label:           'ATTENTION SATURATION',
    insight:         primaryInsight,
    metrics: [
      { id:'as1', label:'SATURATION VECTOR',  value: saturationVector.replace(/_/g,' '),  type:'tag' },
      { id:'as2', label:'CHANNEL CONTEXT',    value: channelContext,                      type:'tag' },
      { id:'as3', label:'PERMISSION ASSET',   value: saturationVector === 'PERMISSION_MARKETING' ? 'PRIMARY SIGNAL' : 'UPSTREAM', type:'status' },
      { id:'as4', label:'REACH TRAJECTORY',   value: saturationVector === 'ORGANIC_REACH_COMPRESSION' ? 'DECLINING' : 'CHANNEL-DEPENDENT', type:'status' },
    ],
    actions: {
      primary:    { id:'a1', label:'AUDIT OWNED AUDIENCE ASSETS', impact:0.88, rationale:'Inventory all permission assets: email list size + open rate, SMS subscribers, podcast listeners, community members. These are the only assets that appreciate as platform reach compresses. Measure them independently of social following.', tag:'AUDIT' },
      secondary:  { id:'a2', label:'TRACK CAC TREND VS. LTV FLOOR', impact:0.76, rationale:'When CAC rises faster than LTV, paid attention is no longer viable for customer acquisition at scale. The breakeven signal indicates when the channel requires renegotiation or abandonment.', tag:'ECONOMICS' },
      conviction: [
        { id:'c1', label:'BUILD PERMISSION ASSET ACCUMULATION PLAN', impact:0.83, rationale:'Permission assets compound over time — an email subscriber from 2019 has more historical engagement data than one from 2025. The earlier the accumulation starts, the more durable the asset becomes. Build now, before saturation makes acquisition costs prohibitive.', tag:'STRATEGY' },
        { id:'c2', label:'MODEL ORGANIC REACH COMPRESSION TIMELINE', impact:0.67, rationale:'All social platforms compress organic reach over time. Modeling the compression curve for each channel (based on Facebook/Instagram historical patterns) predicts when paid dependency becomes mandatory and at what cost.', tag:'FORECAST' },
      ],
    },
    leverage:          { typeY:3, typeLabel:'MEDIA', tierLabel, deRatio:0.7, permissionless:true, industryNorm:0.55 },
    saturation_vector: saturationVector,
    channel_context:   channelContext,
  };
}

// ── Domain router ──────────────────────────────────────────────────────────────

const SYNTH_MAP = {
  AUTO:                synthAuto,
  REAL_ESTATE:         synthRealEstate,
  CAREER:              synthCareer,
  RETIREMENT:          synthRetirement,
  EXPENSE_REDUCTION:   synthExpenseReduction,
  INVESTOR:            synthInvestor,
  HEALTH:              synthHealth,
  GENERAL:             synthGeneral,
  ATHLETE_ENTERPRISE:  synthAthleteEnterprise,
  BRAND_SPINOFF:       synthBrandSpinoff,
  CULTURAL_INFLUENCE:  synthCulturalInfluence,
  CONTRARIAN_FRONTIER:    synthContrarianFrontier,
  SOVEREIGN_HARDWARE:     synthSovereignHardware,
  INDUSTRIAL_FLYWHEEL:    synthIndustrialFlywheel,
  SOCIAL_GRAPH:           synthSocialGraph,
  VC_INVERSION:           synthVCInversion,
  VIRTUAL_ECONOMY:          synthVirtualEconomy,
  PHILANTHROPIC_CAPITAL:    synthPhilanthropicCapital,
  CREATOR_HOLDCO:           synthCreatorHoldco,
  OPERATIONAL_CARRY_RISK:   synthOperationalCarryRisk,
  NON_INSTITUTIONAL_ALPHA:  synthNonInstitutionalAlpha,
  COMMERCIAL_DISTRESS:      synthCommercialDistressLiquidity,
  RELEVANCE_WARFARE:        synthRelevanceWarfare,
  CONTENT_COMMERCE:         synthContentToCommerce,
  BOXING_DISRUPTION:        synthBoxingDisruption,
  LABOR_VOLATILITY:         synthLaborVolatility,
  BRAND_EQUITY_STABILITY:   synthBrandEquityStability,
  STRUCTURAL_RESILIENCE:    synthStructuralResilience,
  PRIVATE_CREDIT:           synthPrivateCredit,
  SOVEREIGN_CAPITAL:        synthSovereignCapital,
  STARTUP_READINESS:        synthStartupReadiness,
  LONG_DURATION_CONVERGENCE: synthLongDurationConvergence,
  FLEXIBLE_SPACE:           synthFlexibleSpace,
  FINTECH_INFRA:            synthFintechInfra,
  FORWARD_COMPUTE:          synthForwardCompute,
  ATTENTION_SATURATION:     synthAttentionSaturation,
};

// ── Public API ─────────────────────────────────────────────────────────────────

import { applyEditorialGate, resolveContractLens } from './editorialgate.js';
import { detectProtectedDomain } from './ingress.js';
import { classifyAmbiguity } from './domainambiguitygate.js';

export function synthesizeQuery(session) {
  if (!session) return null;
  const query   = session.query ?? '';
  const mcv     = resolveMCV(query, session);
  const numbers = extractNumbers(query);
  const vector  = detectDomain(query, session.lens);
  // DEF-1864: HOLD / resolutionEligible:false → AMBIGUOUS result, no synthesis run.
  if (!vector.resolutionEligible) {
    return { queryDomain: 'AMBIGUOUS', domainVector: vector, resolutionEligible: false };
  }
  const fn      = synthesizerFor(vector) ?? synthGeneral;
  const result  = fn(session, numbers, query);
  const contractLens = resolveContractLens(vector.primary, session.lens);

  // Gate: classification confidence (0–1) keyed by domain.
  // true = phase transition detected — safe to write to HP ledger.
  const gateSignal = processTick(
    vector.primary,
    vector.weights?.[vector.primary] ?? 0.5,
  );

  return { ...result, queryDomain: vector.primary, domainVector: vector, actions: applyEditorialGate(result.actions, contractLens), gateSignal, mcv };
}
