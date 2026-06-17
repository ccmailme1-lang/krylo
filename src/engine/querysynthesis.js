// querysynthesis.js — Dynamic content synthesis from session query + lens
// Reads session, detects domain, returns full content object for all result components

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

export function detectDomain(query, lens) {
  const q = (query ?? '').toLowerCase();

  // Protected entity gate — medical/disability signals lock domain unconditionally.
  // Runs before all keyword matching to prevent vocabulary contamination (e.g.,
  // "home & community access" firing REAL_ESTATE when hypotonia is present).
  const protectedDomain = detectProtectedDomain(query);
  if (protectedDomain) return protectedDomain;

  // Query keywords — content beats lens label
  // STARTUP_FINANCE must precede RETIREMENT — 401k-as-bridge-capital is a startup signal
  if (/startup|runway|burn rate|payroll|bridge.*capital|liquidat.*401k|seed round|series [ab]|raise capital|venture|bootstrap/.test(q)) return 'STARTUP_FINANCE';
  if (/\bcar\b|vehicle|suv|truck|auto|lease|buick|\bford\b|toyota|honda|tesla|bmw|mercedes|audi|chevy|chevrolet|kia|hyundai|dodge|jeep|rivian/.test(q)) return 'AUTO';
  // "home" requires purchase/equity context — bare "home" fires on "home care", "home & community access"
  if (
    /\bhouse\b|mortgage|property|condo|apartment|real estate|sq ft|bedroom|bath|listing|\brent\b/.test(q) ||
    (/\bhome\b/.test(q) && /purchase|buy|afford|equity|loan|down payment|listing|\bmarket\b/.test(q))
  ) return 'REAL_ESTATE';
  // EXPENSE_REDUCTION must precede RETIREMENT — distribution phase, not accumulation
  // QA-101: retired + expense/distress signals
  if (/\bretired\b/.test(q) && /fixed income|expenses? down|reduce.*expense|lower.*bill|cut.*cost|monthly.*down|expenses? lower|struggling/.test(q)) return 'EXPENSE_REDUCTION';
  // fixed income + senior demographic
  if (/fixed income/.test(q) && /senior|grandmother|grandfather|grandma|grandpa|elderly/.test(q)) return 'EXPENSE_REDUCTION';
  // QA-102: social security as current income source + any distress/cost signal
  if (/\b(?:living on|on)\s+(?:a\s+)?(?:fixed income|social security)\b/.test(q)) return 'EXPENSE_REDUCTION';
  if (/social security/.test(q) && /struggling|afford|expenses?|bills?|reduce|lower|cut|tight|fixed/.test(q)) return 'EXPENSE_REDUCTION';
  // QA-103: senior + medicare cost signals; or medicare premiums alone
  if (/medicare\s+premiums?/.test(q)) return 'EXPENSE_REDUCTION';
  if (/\bsenior\b/.test(q) && /medicare|medicaid|premiums?|copay|out.of.pocket|healthcare cost/.test(q)) return 'EXPENSE_REDUCTION';
  if (/retire|401k|\bira\b|pension|social security|withdrawal|nest egg/.test(q)) return 'RETIREMENT';
  if (/job|career|salary|offer|negotiat|hire|compensation|raise|role/.test(q)) return 'CAREER';

  // Lens fallback
  if (lens === 'REALTOR')    return 'REAL_ESTATE';
  if (lens === 'RETIREMENT') return 'RETIREMENT';
  if (lens === 'ATHLETE')    return 'CAREER';
  if (lens === 'INVESTOR')   return 'INVESTOR';
  if (lens === 'HEALTH')     return 'HEALTH';

  return 'GENERAL';
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

// ── Domain router ──────────────────────────────────────────────────────────────

const SYNTH_MAP = {
  AUTO:              synthAuto,
  REAL_ESTATE:       synthRealEstate,
  CAREER:            synthCareer,
  RETIREMENT:        synthRetirement,
  EXPENSE_REDUCTION: synthExpenseReduction,
  INVESTOR:          synthGeneral,
  HEALTH:            synthHealth,
  GENERAL:           synthGeneral,
};

// ── Public API ─────────────────────────────────────────────────────────────────

import { applyEditorialGate, resolveContractLens } from './editorialgate.js';
import { detectProtectedDomain } from './ingress.js';

export function synthesizeQuery(session) {
  if (!session) return null;
  const query        = session.query ?? '';
  const numbers      = extractNumbers(query);
  const domain       = detectDomain(query, session.lens);
  const fn           = SYNTH_MAP[domain] ?? synthGeneral;
  const result       = fn(session, numbers, query);
  const contractLens = resolveContractLens(domain, session.lens);
  return { ...result, queryDomain: domain, actions: applyEditorialGate(result.actions, contractLens) };
}
