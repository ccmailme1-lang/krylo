// querysynthesis.js — Dynamic content synthesis from session query + lens
// Reads session, detects domain, returns full content object for all result components

import { computeBEV } from './brandequity.js';

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
  if (/\bcar\b|vehicle|suv|truck|auto|lease|buick|\bford\b|toyota|honda|tesla|bmw|mercedes|audi|chevy|chevrolet|kia|hyundai|dodge|jeep|rivian/.test(q)) return 'AUTO';
  // "home" requires purchase/equity context — bare "home" fires on "home care", "home & community access"
  if (
    /\bhouse\b|mortgage|property|condo|apartment|real estate|sq ft|bedroom|bath|listing|\brent\b/.test(q) ||
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
  if (/job|career|salary|offer|negotiat|hire|compensation|raise|role/.test(q)) return 'CAREER';
  // ── Persona entity gates (before lens fallback) ────────────────────────────
  if (/\bbrady\b|tb12|athlete.entrepre|athlete.brand|athlete.enterprise|athletic.brand|performance.wellness|athlete.business|sport.*business|legacy.venture|sports.enterprise/.test(q)) return 'ATHLETE_ENTERPRISE';
  if (/kris.jenner|kardashian|\bskims\b|kylie.cosmetics|good.american|spin.?off.brand|family.brand|momager|brand.spin.?off|celebrity.brand.empire|cpg.empire/.test(q)) return 'BRAND_SPINOFF';
  if (/rich.paul|\bklutch\b|athlete.representation|cultural.enterprise|sports.agency.*media|influence.mapping|cultural.longevity/.test(q)) return 'CULTURAL_INFLUENCE';
  if (/\bthiel\b|zero.to.one|important.truth|founders.fund|\bpalantir\b|\banduril\b|cultural.resistance|contrarian.frontier/.test(q)) return 'CONTRARIAN_FRONTIER';
  // Lens fallback
  if (lens === 'REALTOR')    return 'REAL_ESTATE';
  if (lens === 'RETIREMENT') return 'RETIREMENT';
  if (lens === 'ATHLETE')    return 'ATHLETE_ENTERPRISE';
  if (lens === 'INVESTOR')   return 'INVESTOR';
  if (lens === 'HEALTH')     return 'HEALTH';
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
  const q = (query ?? '').toLowerCase().replace(PROPER_NOUN_EXCLUSIONS, '');

  // Protected entity gate — medical/disability signals lock domain unconditionally.
  // Wrapped as synthetic HARD vector — compound condition cannot be contaminated.
  const protectedDomain = detectProtectedDomain(query);
  if (protectedDomain) {
    return { primary: protectedDomain, weights: { [protectedDomain]: 1.0 }, state: 'HARD', entropy: 0, coActive: [], resolutionEligible: true };
  }

  const primary = resolvePrimary(q, lens);
  const scores  = scoreDomains(q);

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
      `Property tax + insurance adds $400–$900/mo (location-dependent) to base P&I.`,
    ],
    assumptions: [
      `Credit score 740+ assumed for advertised rates. Sub-740 carries 0.5–1.5% rate premium.`,
      `Local market conditions may deviate materially from national averages.`,
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
  CONTRARIAN_FRONTIER: synthContrarianFrontier,
};

// ── Public API ─────────────────────────────────────────────────────────────────

import { applyEditorialGate, resolveContractLens } from './editorialgate.js';
import { detectProtectedDomain } from './ingress.js';
import { classifyAmbiguity } from './domainambiguitygate.js';

export function synthesizeQuery(session) {
  if (!session) return null;
  const query   = session.query ?? '';
  const numbers = extractNumbers(query);
  const vector  = detectDomain(query, session.lens);
  // HOLD state falls back to synthGeneral — preserves UI stability in v1.
  // v2 may surface a true "insufficient signal" state using vector.state.
  const fn      = synthesizerFor(vector) ?? synthGeneral;
  const result  = fn(session, numbers, query);
  const contractLens = resolveContractLens(vector.primary, session.lens);
  return { ...result, queryDomain: vector.primary, domainVector: vector, actions: applyEditorialGate(result.actions, contractLens) };
}
