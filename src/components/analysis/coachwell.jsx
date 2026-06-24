// WO-1708 — Coach Well
// Narrowly focused: reads form chip selections (situation/floor/horizon)
// and coaches the guest toward a sharper, more specific query in the textarea.
// Canvas is display-only. No input. Coach writes nothing to the form.

import React, { useState, useEffect, useRef } from 'react';

const MONO  = "'IBM Plex Mono', monospace";
const AGENT_FONT = "'Lato', sans-serif";
const LIME  = '#66FF00';

// Query thresholds — Coach fires at each milestone as user types more
const QUERY_THRESHOLDS = [18, 60, 110];
// Debounce: wait this long after user stops typing before Coach responds
const TYPE_DEBOUNCE_MS = 950;

// Situation label → domain key
const SITUATION_DOMAIN = {
  'BUYING A HOME':        'REALTOR',
  'PLANNING RETIREMENT':  'RETIREMENT',
  'GROWING INCOME':       'INVESTOR',
  'CAREER MOVE':          'ATHLETE',
  'PROTECTING MY FAMILY': 'FAMILY',
  'STARTING OUT':         'STUDENT',
  'STARTING OVER':        'TRANSITION',
  'HEALTH & COSTS':       'HEALTH',
  'BUILDING SOMETHING':   'SALES',
  'NOT SURE YET':         'OPEN',
};

// Query refinement sequences — context-aware nudges per domain.
// tree[0]: fires when situation chip selected — what to put in the query.
// tree[1]: fires at 18+ chars — first refinement nudge.
// tree[2]: fires at 60+ chars — add numbers or timeframe.
// tree[3]: fires at 110+ chars — add the specific tension or constraint.
const DOMAIN_TREES = {
  REALTOR: [
    "You're buying a home. Your query should name the market, property type — primary residence, investment, or rental — and the specific decision you're making.",
    "Good start. Now add a number — purchase price range, down payment available, or a specific constraint you're navigating.",
    "Add your timeline. Closing in 60 days versus 18 months is a completely different signal.",
    "What's blocking you right now? Rate environment, inventory, qualification — put the specific friction in the query.",
  ],
  RETIREMENT: [
    "You're planning retirement. Name the account type, the income gap, or the exact decision in front of you — not the general goal.",
    "Add a number and a timeframe. '8 years out with $600k saved' is a signal. 'Planning for retirement' is noise.",
    "What's the tension? Sequence of returns, healthcare coverage gap, Social Security timing — name it specifically.",
    "What decision are you actually making right now? Withdrawal strategy, Roth conversion, asset allocation — put it in.",
  ],
  ATHLETE: [
    "You're making a career move. Name the role type, what you're optimizing — comp, equity, title, flexibility — and what you're deciding between.",
    "Add real numbers — your current comp, your target, or the specific offer you're evaluating.",
    "What's the constraint? Notice period, vesting cliff, geography, a competing offer — put it in the query.",
    "What does the right outcome actually look like? Be specific about what you'd walk away satisfied.",
  ],
  HEALTH: [
    "You're managing health and costs. Name the specific coverage situation, life event, or financial gap you're trying to close.",
    "Add the numbers — monthly premium, max out-of-pocket exposure, or the specific cost you're planning around.",
    "Is this an employer plan decision, an open market situation, or a coverage gap? Be explicit about which.",
    "What's the trigger forcing this decision right now? Job change, open enrollment, a specific diagnosis — put it in.",
  ],
  SALES: [
    "You're building something. Name the stage — pre-revenue, early ARR, scaling — and the specific financial decision in front of you.",
    "Add numbers — runway in months, monthly burn, or the capital amount that changes your picture.",
    "What's the decision? A raise, a key hire, a pricing change, a pivot — specificity drives the signal.",
    "What's the constraint on the other side of this decision? Dilution, timeline, market window — name it.",
  ],
  INVESTOR: [
    "You're growing income. Name the asset class, the capital amount you're working with, and the specific decision you're making.",
    "Add a number and a timeframe. 'Deploy $80k over 6 months into X' is a signal. 'Want to invest' is noise.",
    "What's the constraint? Tax exposure, liquidity needs, risk threshold, a specific opportunity — put it in.",
    "What does success look like in concrete terms — yield target, portfolio balance, income level? Include it.",
  ],
  FAMILY: [
    "You're protecting your family. Name the specific risk you're covering — income loss, estate gap, education cost — and the decision you're making.",
    "Add the numbers — coverage amount, number of dependents, or the dollar gap you're trying to close.",
    "What's the trigger? A new child, a policy lapse, a change in income or assets — be specific.",
    "What's the timeline you're protecting against — short-term income interruption or long-term estate transfer?",
  ],
  STUDENT: [
    "You're starting out. Name the specific financial decision — debt paydown order, savings strategy, first investment — and where you're starting from.",
    "Add real numbers — income, total debt balance, or the amount you're trying to deploy.",
    "What's the priority you're trying to resolve? Emergency fund, debt payoff, employer match — put the tension in.",
    "What does financial stability look like for you in 12 months, and what's the number attached to it?",
  ],
  TRANSITION: [
    "You're in transition. Name what changed, how long your runway is, and what you're trying to stabilize first.",
    "Add numbers — months of runway at your current burn, the income gap, or the monthly floor you need to hit.",
    "What's the immediate decision? Severance structure, coverage continuation, asset order of operations — be specific.",
    "What's the single outcome that would stabilize your picture? Name it and put a number on it.",
  ],
  OPEN: [
    "Start with the financial picture — income, obligations, and the specific decision that's in front of you right now.",
    "Add a number. Any number. A dollar amount or timeframe gives the engine something concrete to work with.",
    "What outcome are you trying to achieve, and what's in the way? Put both in the query.",
  ],
};

// Tips and definitions — fire after each coaching question to give context
const DOMAIN_TIPS = {
  REALTOR: [
    "Def: DTI (Debt-to-Income Ratio) — your total monthly debt payments divided by gross monthly income. Most lenders cap it at 43%.",
    "Tip: A down payment below 20% triggers PMI, which adds 0.5–1.5% of the loan amount annually to your cost. Reaching 20% equity removes it.",
    "Tip: In a rising rate environment, lock your rate as early as your lender allows — typically 30 to 60 days before closing.",
  ],
  RETIREMENT: [
    "Def: Safe Withdrawal Rate — the percentage of your portfolio you can withdraw annually without depleting it over a 30-year retirement. The classic figure is 4%; more conservative planners use 3.5%.",
    "Def: RMD (Required Minimum Distribution) — the IRS-mandated annual withdrawal from traditional IRAs and 401ks starting at age 73, regardless of whether you need the income.",
    "Tip: Delaying Social Security from 62 to 70 increases your monthly benefit by approximately 76%. Every year you delay past full retirement age adds roughly 8%.",
  ],
  ATHLETE: [
    "Def: 409A Valuation — an independent appraisal of a private company's common stock fair market value. This sets the strike price of your options and matters significantly at exit.",
    "Tip: A four-year vest with a one-year cliff means you receive 0% of your equity if you leave before 12 months, then 25% at the cliff, and 1/48th per month thereafter.",
    "Def: BATNA (Best Alternative to a Negotiated Agreement) — your walk-away position. The strength of your negotiation is directly tied to how credible your alternative is.",
  ],
  HEALTH: [
    "Def: HDHP (High-Deductible Health Plan) — a plan with lower premiums but a higher deductible. The benefit: it qualifies you for an HSA, which is the only triple-tax-advantaged account available.",
    "Tip: HSA contributions in 2025 are $4,300 for individuals and $8,550 for families. Contributions are pre-tax, growth is tax-free, and qualified withdrawals are tax-free.",
    "Def: COBRA — a federal law allowing you to continue your employer's health coverage after leaving a job, typically for up to 18 months. Cost is usually the full premium plus a 2% admin fee.",
  ],
  SALES: [
    "Def: Runway — the number of months your company can operate at its current burn rate before exhausting available capital. Calculated as: cash on hand ÷ monthly net burn.",
    "Tip: A healthy LTV/CAC ratio is 3x or higher. Below 3x, the cost of acquiring a customer exceeds what they return in reasonable time — a scaling problem, not a growth opportunity.",
    "Def: ARR (Annual Recurring Revenue) — the normalized, annualized value of your subscription or contract revenue. Excludes one-time fees and professional services.",
  ],
  INVESTOR: [
    "Def: Asset Location — the practice of holding tax-inefficient assets (bonds, REITs) in tax-advantaged accounts and tax-efficient assets (index funds) in taxable accounts to minimize drag.",
    "Tip: Portfolio beta measures sensitivity to market moves. A beta of 1.2 means your portfolio historically moves 20% more than the market in both directions.",
    "Def: Tax-Loss Harvesting — selling positions at a loss to offset capital gains, reducing your taxable income. Losses in excess of gains can offset up to $3,000 of ordinary income annually.",
  ],
  FAMILY: [
    "Def: Human Life Value — a method for calculating life insurance needs: (annual income × years to retirement) adjusted for inflation, minus existing assets and Social Security benefits.",
    "Tip: Term life insurance covers a defined period (10, 20, 30 years) at a fixed premium. For most families, 10–12x annual income in term coverage is the standard starting point.",
    "Def: Umbrella Policy — liability coverage that extends beyond the limits of your auto and homeowners policies. Typically provides $1–5M of additional protection for a few hundred dollars annually.",
  ],
  STUDENT: [
    "Tip: Always capture your employer's 401k match before paying down low-interest debt — it's an immediate 50–100% return on contributed dollars, unmatched by any other instrument.",
    "Def: Credit Utilization — the percentage of your available revolving credit you're using. Keeping it below 30% has a significant positive effect on your credit score.",
    "Tip: Federal student loans offer income-driven repayment and potential forgiveness. Private loans offer neither. Know which you have before choosing a payoff strategy.",
  ],
  TRANSITION: [
    "Tip: If severance is paid as salary continuation rather than a lump sum, you may remain eligible for unemployment benefits in some states. Check your state's rules before accepting the structure.",
    "Def: COBRA Continuation — you have 60 days from the loss of employer coverage to elect COBRA, and it covers the prior 60 days retroactively. Use this window strategically if you're healthy.",
    "Tip: A 401k withdrawal before age 59½ triggers a 10% early withdrawal penalty plus ordinary income tax — a combined effective rate that can reach 30–40% depending on your bracket.",
  ],
  OPEN: [
    "Tip: The four numbers that define any financial picture are: gross income, monthly fixed obligations, total debt load, and liquid assets. Start there.",
    "Def: Liquidity — how quickly an asset can be converted to cash without significant loss of value. Cash is fully liquid. Real estate and private equity are not.",
  ],
};

// Page field definitions — Coach explains what each form element does
const FIELD_CONTEXT = {
  situation: "The situation you select tells the engine which lens to apply. It shapes how your query is interpreted and which signals get weighted.",
  query:     "The query field is the core input — describe the decision you're facing in plain terms. The more specific you are, the more precise the output.",
  floor:     "The capital floor sets the lower bound of what you're working with. It calibrates the engine's recommendations to what's actually actionable for you.",
  horizon:   "The horizon sets your time frame — how far out this decision needs to resolve. NOW means the next 30 days. YEARS means structural, multi-year planning.",
};

const GREETINGS = [
  "I'm KRYLO. Tell me what you're working through.",
  "I'm KRYLO. Ready when you are.",
  "I'm KRYLO. Let's build your signal.",
  "I'm KRYLO. Walk me through your situation.",
  "I'm KRYLO. What are we solving today?",
];

const QUALITY_NUDGES = [
  "Be more specific — name the dollar amount, the timeframe, or the exact decision you're navigating.",
  "Vague queries get vague output. Add a number or a concrete constraint.",
  "What's the specific tension you're trying to resolve? Put it in plain terms.",
];

function evaluateQuality(text) {
  const words     = text.trim().split(/\s+/).length;
  const hasNumber = /\d/.test(text);
  if (words < 4)               return 'too_short';
  if (words < 8 && !hasNumber) return 'vague';
  return 'good';
}

function adaptiveSpeed(text) {
  const len = text?.length ?? 0;
  if (len < 35)  return 22;
  if (len < 70)  return 15;
  return 10;
}

function TypewriterText({ text, style }) {
  const [out, setOut] = useState('');
  const speed = adaptiveSpeed(text);
  useEffect(() => {
    setOut('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <div style={style}>{out}</div>;
}

export default function CoachWell({ activeSituation = null, seedQuery = '', selectedFloor = null }) {
  const [thread,       setThread]       = useState([]);
  const [phase,        setPhase]        = useState('PRE');
  const [completeness, setCompleteness] = useState(0);
  const [domain,       setDomain]       = useState(null);

  const prevSituation  = useRef(null);
  const prevFloor      = useRef(null);
  const nudgeFired     = useRef(false);
  const queryStageRef  = useRef(0);
  const scrollRef      = useRef(null);
  const debounceRef    = useRef(null);
  const domainRef      = useRef(null);

  function push(text) {
    setThread(t => [...t, { text }]);
  }

  useEffect(() => { domainRef.current = domain; }, [domain]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  // Opening sequence — greeting → situation prompt → field orientation
  useEffect(() => {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const t1 = setTimeout(() => {
      setThread([{ text: greeting }]);
    }, 350);
    const t2 = setTimeout(() => {
      setThread(t => [...t, { text: "Select your situation on the left to begin." }]);
    }, 2400);
    const t3 = setTimeout(() => {
      setThread(t => [...t, { text: FIELD_CONTEXT.situation }]);
    }, 4800);
    const t4 = setTimeout(() => {
      setThread(t => [...t, { text: FIELD_CONTEXT.query }]);
    }, 7800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Situation chip selected — coaching question + tip
  useEffect(() => {
    if (!activeSituation || activeSituation === prevSituation.current) return;
    prevSituation.current = activeSituation;
    nudgeFired.current    = false;
    queryStageRef.current = 0;
    clearTimeout(debounceRef.current);

    const d    = SITUATION_DOMAIN[activeSituation] ?? 'OPEN';
    const tree = DOMAIN_TREES[d] ?? DOMAIN_TREES.OPEN;
    const tips = DOMAIN_TIPS[d] ?? [];

    setDomain(d);
    setCompleteness(0.15);
    push(tree[0]);

    // Fire tip[0] after the coaching question finishes rendering
    if (tips[0]) {
      const tipTimer = setTimeout(() => push(tips[0]), 2200);
      return () => clearTimeout(tipTimer);
    }
  }, [activeSituation]);

  // Query typed — debounced, multi-stage refinement coaching + tips
  useEffect(() => {
    if (!seedQuery) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const stage = queryStageRef.current;
      if (stage >= QUERY_THRESHOLDS.length) return;

      const threshold = QUERY_THRESHOLDS[stage];
      if (seedQuery.length < threshold) return;

      const d    = domainRef.current ?? 'OPEN';
      const tree = DOMAIN_TREES[d] ?? DOMAIN_TREES.OPEN;
      const tips = DOMAIN_TIPS[d] ?? [];

      if (stage === 0) {
        const quality = evaluateQuality(seedQuery);
        if (quality !== 'good' && !nudgeFired.current) {
          nudgeFired.current = true;
          setCompleteness(0.35);
          push(QUALITY_NUDGES[Math.floor(Math.random() * QUALITY_NUDGES.length)]);
        } else {
          nudgeFired.current = true;
          setCompleteness(0.45);
          push(tree[1] ?? QUALITY_NUDGES[0]);
          if (tips[1]) setTimeout(() => push(tips[1]), 2400);
        }
      } else {
        const treeIdx = stage + 1;
        if (tree[treeIdx]) {
          setCompleteness(c => Math.min(0.82, c + 0.20));
          push(tree[treeIdx]);
          if (tips[treeIdx]) setTimeout(() => push(tips[treeIdx]), 2400);
        }
      }

      queryStageRef.current = stage + 1;
    }, TYPE_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [seedQuery]);

  // Floor chip selected — acknowledge and confirm signal
  useEffect(() => {
    if (!selectedFloor || selectedFloor === prevFloor.current) return;
    prevFloor.current = selectedFloor;
    setCompleteness(1.0);
    setPhase('READY');
    push("Signal acquired. Compiling IR.");
  }, [selectedFloor]);

  const barPct     = Math.round(completeness * 100);
  const phaseColor = phase === 'READY' ? LIME : 'rgba(255,255,255,0.22)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @font-face { font-family: 'Lato'; src: url('/Lato-Light.ttf') format('truetype'); font-weight: 300; font-style: normal; }
        @font-face { font-family: 'Lato'; src: url('/Lato-Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'Lato'; src: url('/Lato-Bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
        @font-face { font-family: 'Lato'; src: url('/Lato-Italic.ttf') format('truetype'); font-weight: 400; font-style: italic; }
      `}</style>

      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 8px', scrollbarWidth: 'none' }}
      >
        {thread.map((msg, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <TypewriterText
              text={msg.text}
              style={{
                fontFamily: AGENT_FONT,
                fontSize: 21,
                color: 'rgba(255,255,255,0.90)',
                lineHeight: 1.65,
                letterSpacing: '0.005em',
              }}
            />
          </div>
        ))}
      </div>

      {/* Completeness bar */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${barPct}%`,
          background: phase === 'READY' ? LIME : 'rgba(102,255,0,0.45)',
          transition: 'width 700ms ease',
        }} />
      </div>

      {/* Status row */}
      <div style={{
        flexShrink: 0, padding: '10px 22px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', color: phaseColor, textTransform: 'uppercase' }}>
          {phase}
        </span>
        {domain && phase !== 'READY' && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.18em' }}>
            {domain}
          </span>
        )}
        <span style={{
          fontFamily: MONO, fontSize: 9,
          color: phase === 'READY' ? 'rgba(102,255,0,0.6)' : 'rgba(255,255,255,0.18)',
          letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums',
        }}>
          {barPct}%
        </span>
      </div>
    </div>
  );
}
