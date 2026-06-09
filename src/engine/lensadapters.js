// WO-1342 — LensAdapter Registry
// Observer-relative operationalization without observer-relative truth.
// Each adapter transforms the same objective emergence event through a different interpretive lens.

const LIME = '#66FF00';
const BLUE = '#007FFF';

const adapters = {

  INVESTOR: {
    assessmentFrame({ entity, domain }) {
      return `The convergence pattern in ${entity} presents a material asymmetric exposure event for portfolio positioning. Signal pressure at current levels indicates structural dislocation — not noise. Equity holders in the ${domain?.toLowerCase()} vertical face unpriced risk within the fracture window. Capital rotation into defensive instruments is the analytically correct response until lock is confirmed.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'REDUCE',     action: `Reduce exposure to high-volatility ${entity} positions before fracture window opens.`, horizon: '0–24h',     confidence: 0.88, impact: 'HIGH',       rationale: 'Structural lock condition met — asymmetric downside risk unpriced at current levels.' },
        { num: 2, verb: 'HEDGE',      action: 'Establish asymmetric hedge against cross-domain propagation vectors.',                  horizon: '24–72h',    confidence: 0.71, impact: 'MEDIUM',     rationale: 'Secondary node activation confirms contagion pathway to adjacent verticals.' },
        { num: 3, verb: 'REPOSITION', action: 'Rotate capital toward uncorrelated instruments ahead of phase transition.',              horizon: '72h+',      confidence: 0.62, impact: 'MEDIUM',     rationale: 'Post-lock convergence creates early-mover positioning window for defensive rotation.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Equity value compression',     level: 'HIGH',   color: LIME },
        { label: 'Liquidity rotation pressure',  level: 'MEDIUM', color: BLUE },
        { label: 'Cross-portfolio contagion',     level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Asymmetric entry window before consensus forms (48–72h)' },
        { label: 'Defensive rotation alpha — uncorrelated instruments available' },
      ];
    },
  },

  LEGAL: {
    assessmentFrame({ entity, domain }) {
      return `Signal convergence in the ${entity} matter indicates material disclosure asymmetry and potential regulatory exposure within the ${domain?.toLowerCase()} domain. The propagation pattern across observable nodes suggests systemic rather than isolated non-compliance. Legal counsel should assess disclosure obligations and prepare contingency filing positions before the fracture window triggers public materiality thresholds.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'AUDIT',   action: `Conduct immediate disclosure audit across all ${entity} filings within the observation window.`, horizon: '0–24h',     confidence: 0.88, impact: 'HIGH',   rationale: 'Convergence pattern indicates undisclosed material events — audit before public threshold triggers.' },
        { num: 2, verb: 'FILE',    action: 'Prepare contingency disclosure filings for regulatory submission.',                               horizon: '24–72h',    confidence: 0.74, impact: 'HIGH',   rationale: 'Phase transition to HIGH CONVERGENCE will likely meet materiality standard — proactive filing reduces liability.' },
        { num: 3, verb: 'MONITOR', action: 'Monitor counterparty and regulatory body signal feeds for enforcement indicators.',                horizon: 'ONGOING',   confidence: 0.58, impact: 'SUPPORTING', rationale: 'Alternative viewpoint holds 18% — monitoring provides early warning if convergence attenuates.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Regulatory enforcement action',  level: 'HIGH',   color: LIME },
        { label: 'Material disclosure failure',    level: 'HIGH',   color: LIME },
        { label: 'Counterparty litigation risk',   level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Proactive disclosure reduces enforcement exposure window' },
        { label: 'Early audit establishes clean record before regulatory inquiry' },
      ];
    },
  },

  CAREER: {
    assessmentFrame({ entity, domain }) {
      return `The convergence signal in the ${domain?.toLowerCase()} vertical directly affects employment stability and income trajectory for operators in the ${entity} space. Structural tension indicators suggest organizational friction — not cyclical variance. The fracture window corresponds to a personal positioning decision point: contractual lock-in, income diversification, and coverage floor establishment are all load-bearing actions before phase transition completes.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'SECURE',      action: 'Secure contractual income anchor before organizational fracture completes.',                 horizon: '0–24h',     confidence: 0.88, impact: 'HIGH',   rationale: 'Income stability is the load-bearing vector — contractual security before structural shift is irreversible.' },
        { num: 2, verb: 'DIVERSIFY',   action: 'Initiate secondary income stream development uncorrelated to primary domain.',              horizon: '24–72h',    confidence: 0.74, impact: 'HIGH',   rationale: 'Single-source income is a structural fragility — a second stream at 20–30% transforms leverage position.' },
        { num: 3, verb: 'ACCELERATE',  action: 'Accelerate savings velocity to close coverage gap before the long-term horizon.',           horizon: '1–6 months',confidence: 0.67, impact: 'MEDIUM', rationale: 'Coverage gap widens 6 points per year at current rate — velocity correction closes gap before threshold.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Income disruption event',          level: 'HIGH',   color: LIME },
        { label: 'Coverage gap acceleration',        level: 'MEDIUM', color: BLUE },
        { label: 'Organizational attrition signal',  level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Contractual leverage window open before organizational shift completes' },
        { label: 'Income diversification alpha — uncorrelated stream available now' },
      ];
    },
  },

  ATHLETE: {
    assessmentFrame({ entity, domain }) {
      return `Signal convergence in the ${entity} performance context indicates a contract leverage window opening within the ${domain?.toLowerCase()} domain. Structural indicators point to asymmetric negotiation opportunity — organizational pressure currently exceeds athlete leverage at existing terms. The fracture window aligns with a contractual inflection point: renegotiation, extension, or exit positioning must be executed before convergence resolves and leverage normalizes.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'NEGOTIATE', action: `Initiate renegotiation on current ${entity} terms before leverage window closes.`,         horizon: '0–24h',     confidence: 0.88, impact: 'HIGH',   rationale: 'Organizational pressure signal at HIGH — current terms undervalue market position. Window is open.' },
        { num: 2, verb: 'PROTECT',   action: 'Establish injury and performance protection clauses in contract extension.',               horizon: '24–72h',    confidence: 0.74, impact: 'HIGH',   rationale: 'Convergence acceleration increases exposure risk — protection clauses are the defensive instrument.' },
        { num: 3, verb: 'EXTEND',    action: 'Evaluate long-term extension terms against projected performance trajectory.',             horizon: '1–6 months',confidence: 0.62, impact: 'MEDIUM', rationale: 'Leverage window may not reopen — extension at peak locks in favorable terms before volatility.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Contract leverage window closing', level: 'HIGH',   color: LIME },
        { label: 'Performance signal volatility',    level: 'MEDIUM', color: BLUE },
        { label: 'Market position erosion',          level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Asymmetric negotiation window — organizational pressure exceeds athlete leverage' },
        { label: 'Extension terms favorable at current performance peak' },
      ];
    },
  },

  STUDENT: {
    assessmentFrame({ entity, domain }) {
      return `The convergence pattern in ${entity} represents a structural shift in the ${domain?.toLowerCase()} landscape with direct implications for academic positioning and career entry timing. Signal pressure building across multiple vectors indicates the knowledge gap between current academic output and market demand is widening. The fracture window is a compressed learning and positioning cycle — early movers capture asymmetric advantage before the shift becomes consensus.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'INVESTIGATE', action: `Deep-dive into ${entity} signal sources to build primary research advantage.`,               horizon: '0–24h',  confidence: 0.88, impact: 'HIGH',       rationale: 'First-mover knowledge advantage closes within the fracture window — investigation now is asymmetrically valuable.' },
        { num: 2, verb: 'COMPARE',     action: 'Cross-reference emerging signal against established academic and industry baselines.',         horizon: '24–72h', confidence: 0.71, impact: 'MEDIUM',     rationale: 'Alternative viewpoint holds 18% — comparative analysis surfaces the structural vs. cyclical distinction.' },
        { num: 3, verb: 'TRACK',       action: 'Establish ongoing monitoring cadence for domain trajectory and demand signal indicators.',     horizon: 'ONGOING',confidence: 0.62, impact: 'SUPPORTING', rationale: 'Structural shifts compound over time — early tracking builds longitudinal data advantage.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Academic output misalignment',   level: 'HIGH',   color: LIME },
        { label: 'Career entry timing risk',       level: 'MEDIUM', color: BLUE },
        { label: 'Domain shift knowledge gap',     level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Early-entry knowledge advantage before domain shift becomes consensus' },
        { label: 'Longitudinal tracking establishes research credibility in emerging area' },
      ];
    },
  },

  RETIREMENT: {
    assessmentFrame({ entity, domain }) {
      return `Convergence signal in the ${domain?.toLowerCase()} domain poses a direct threat to retirement portfolio stability for operators with ${entity} exposure. The structural tension pattern indicates current asset allocation is over-indexed to a fracturing sector. The fracture window requires defensive repositioning to protect the coverage floor and preserve long-term horizon integrity of the retirement plan.`;
    },
    coas({ entity }) {
      return [
        { num: 1, verb: 'REBALANCE',  action: `Rebalance ${entity} exposure toward lower-volatility instruments within risk tolerance.`,    horizon: '0–24h',  confidence: 0.88, impact: 'HIGH',   rationale: 'Three fracture signals converge on liquidity — reduce variable exposure to extend runway past 12-month threshold.' },
        { num: 2, verb: 'ESTABLISH',  action: 'Establish a coverage floor instrument — indexed, low-volatility — that holds regardless of market conditions.', horizon: '24–72h', confidence: 0.79, impact: 'HIGH', rationale: 'Portfolio coverage must reach 80% to clear the threshold — floor instrument is the structural safeguard.' },
        { num: 3, verb: 'MONITOR',    action: 'Monitor longevity risk indicators against current drawdown trajectory.',                     horizon: 'ONGOING',confidence: 0.58, impact: 'SUPPORTING', rationale: 'Long horizon means compounding risk — ongoing monitoring prevents drift from coverage target.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Coverage floor breach risk',         level: 'HIGH',   color: LIME },
        { label: 'Longevity risk acceleration',        level: 'MEDIUM', color: BLUE },
        { label: 'Drawdown trajectory steepening',     level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Defensive rebalancing window open before fracture completes' },
        { label: 'Coverage floor instrument available at current market conditions' },
      ];
    },
  },

  DEFAULT: {
    assessmentFrame({ entity, domain }) {
      return `The convergence pattern in the ${domain?.toLowerCase()} domain is consistent with a structural phase transition. Signal pressure approaching the normative threshold by a factor of 1.70, with governance indicators suggesting asymmetric exposure. The propagation pattern across 71% of domain nodes indicates systemic origin. Coherence latency assessed as IMMEDIATE — the structural lock condition has been met.`;
    },
    coas() {
      return [
        { num: 1, verb: 'REDUCE',  action: 'Reduce exposure to high-volatility positions within the primary domain.',       horizon: '0–24h',  confidence: 0.88, impact: 'HIGH',       rationale: 'Structural lock condition met; fracture window opens within observation horizon.' },
        { num: 2, verb: 'HEDGE',   action: 'Establish asymmetric hedge against cross-domain propagation vectors.',           horizon: '24–72h', confidence: 0.71, impact: 'MEDIUM',     rationale: 'Secondary node activation suggests contagion pathway to adjacent verticals.' },
        { num: 3, verb: 'MONITOR', action: 'Monitor liquidity rotation confirmation signals for secondary validation.',      horizon: 'ONGOING',confidence: 0.58, impact: 'SUPPORTING', rationale: 'Alternative viewpoint cannot be fully discounted without additional temporal data.' },
      ];
    },
    threatContext() {
      return [
        { label: 'Fracture acceleration',       level: 'HIGH',   color: LIME },
        { label: 'Cross-domain contagion',       level: 'MEDIUM', color: BLUE },
        { label: 'Narrative deformation risk',   level: 'MEDIUM', color: BLUE },
      ];
    },
    opportunities() {
      return [
        { label: 'Early-mover positioning window (48–72h)' },
        { label: 'Asymmetric exposure identification' },
      ];
    },
  },
};

export const LensRegistry = {
  resolve(lens) {
    return adapters[lens?.toUpperCase()] ?? adapters.DEFAULT;
  },
};
