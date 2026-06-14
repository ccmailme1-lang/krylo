// WO-1736 v2: Regulatory Convergence Window (Gass-Benecke Protocol)
// Dual-lens temporal kernel — replaces static multi-jurisdiction threshold.
//
// STATIC OBSERVABLES (no temporal memory required):
//   phaseA: K + M both > 50  — simultaneous awareness precursor
//   phaseC: K − C > 20       — enforcement spread (knowledge outpacing capital)
//
// VELOCITY STATE MACHINE (temporal kernel — two-layer):
//   Layer A — Micro window: 7–21 days    — ignition detection
//   Layer B — Macro window: 60–120 days  — persistence / consolidation
//
//   DORMANT                         → no signal in micro window
//   MICRO_IGNITION                  → ≥1 domain above threshold in micro window
//   CROSS_JURISDICTIONAL_CLUSTER    → ≥2 distinct domains in micro window
//   MACRO_CONSOLIDATION             → cluster + entries on ≥3 distinct days in macro window
//   ENFORCEMENT_PRECEDENCE_CONFIRMED→ MACRO_CONSOLIDATION + phaseC active
//
// Output contract (WO-1745): observables only. No leadTime. No conclusions.
// Conclusions belong to WEAK → NC → SYNTH.

export const REGULATORY_STATE = {
  DORMANT:                          'DORMANT',
  MICRO_IGNITION:                   'MICRO_IGNITION',
  CROSS_JURISDICTIONAL_CLUSTER:     'CROSS_JURISDICTIONAL_CLUSTER',
  MACRO_CONSOLIDATION:              'MACRO_CONSOLIDATION',
  ENFORCEMENT_PRECEDENCE_CONFIRMED: 'ENFORCEMENT_PRECEDENCE_CONFIRMED',
};

// Static detection thresholds
const PHASE_A_THRESHOLD = 50;   // K + M simultaneous
const PHASE_C_SPREAD    = 20;   // K − C enforcement delta

// Jurisdiction proxies — independent regulatory actors
const K_JURISDICTION = 50;      // KNOWLEDGE as regulatory-knowledge proxy
const M_JURISDICTION = 50;      // MEDIA as public-narrative proxy
const T_JURISDICTION = 55;      // TECHNOLOGY as sector-activity proxy

// Temporal windows
const MICRO_WINDOW_MS   = 21  * 24 * 60 * 60 * 1000; // 21 days
const MACRO_WINDOW_MS   = 120 * 24 * 60 * 60 * 1000; // 120 trading days ≈ 6 months
const MICRO_DOMAIN_MIN  = 2;    // ≥2 distinct domains → cross-jurisdictional
const MACRO_DAY_MIN     = 3;    // ≥3 distinct calendar days → macro consolidation
const RECORD_DEBOUNCE   = 60   * 60 * 1000;           // one entry per hour max
const MAX_LOG           = 500;
const STORAGE_KEY       = 'krylo_gass_benecke_log';

export const FS_GATE = 0.50;   // Fs ≥ 0.50 per spec

// ── Temporal event log I/O ────────────────────────────────────────────────────

function loadLog() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLog(log) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-MAX_LOG)));
    }
  } catch {}
}

function appendToLog(kScore, mScore, tScore, cScore) {
  const log = loadLog();
  const now = Date.now();
  if (log.length > 0 && now - log[log.length - 1].ts < RECORD_DEBOUNCE) return log;
  log.push({ ts: now, kScore, mScore, tScore, cScore });
  saveLog(log);
  return log;
}

function dayId(ts) {
  return Math.floor(ts / (24 * 60 * 60 * 1000));
}

// ── Pure temporal kernel — exported for testing ───────────────────────────────

export function evaluateTemporalKernel(eventLog, phaseC = false) {
  const now = Date.now();

  const microEntries = eventLog.filter(e => now - e.ts <= MICRO_WINDOW_MS);
  const macroEntries = eventLog.filter(e => now - e.ts <= MACRO_WINDOW_MS);

  // Micro: distinct jurisdictions active
  const microDomains = new Set();
  for (const e of microEntries) {
    if ((e.kScore ?? 0) > K_JURISDICTION) microDomains.add('KNOWLEDGE');
    if ((e.mScore ?? 0) > M_JURISDICTION) microDomains.add('MEDIA');
    if ((e.tScore ?? 0) > T_JURISDICTION) microDomains.add('TECHNOLOGY');
  }

  const hasMicroIgnition     = microEntries.some(e =>
    (e.kScore ?? 0) > K_JURISDICTION ||
    (e.mScore ?? 0) > M_JURISDICTION ||
    (e.tScore ?? 0) > T_JURISDICTION
  );
  const hasCrossJurisdiction = microDomains.size >= MICRO_DOMAIN_MIN;

  // Macro: distinct-day persistence (KNOWLEDGE or MEDIA above threshold)
  const macroDays = new Set(
    macroEntries
      .filter(e => (e.kScore ?? 0) > K_JURISDICTION || (e.mScore ?? 0) > M_JURISDICTION)
      .map(e => dayId(e.ts))
  );
  const hasMacroPersistence = macroDays.size >= MACRO_DAY_MIN;

  // State machine — strictly ordered, no skip
  let state = REGULATORY_STATE.DORMANT;
  if (hasMicroIgnition)                             state = REGULATORY_STATE.MICRO_IGNITION;
  if (hasCrossJurisdiction)                         state = REGULATORY_STATE.CROSS_JURISDICTIONAL_CLUSTER;
  if (hasCrossJurisdiction && hasMacroPersistence)  state = REGULATORY_STATE.MACRO_CONSOLIDATION;
  if (state === REGULATORY_STATE.MACRO_CONSOLIDATION && phaseC) {
    state = REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED;
  }

  return {
    state,
    microWindow: {
      active:      hasMicroIgnition,
      count:       microEntries.length,
      domainCount: microDomains.size,
      domains:     [...microDomains],
    },
    macroWindow: {
      active:       hasMacroPersistence,
      count:        macroEntries.length,
      distinctDays: macroDays.size,
    },
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

const NULL_RESULT = {
  triggered:        false,
  velocityState:    REGULATORY_STATE.DORMANT,
  phaseA:           false,
  phaseC:           false,
  microWindow:      { active: false, count: 0, domainCount: 0, domains: [] },
  macroWindow:      { active: false, count: 0, distinctDays: 0 },
  knowledgeScore:   0,
  mediaScore:       0,
  technologyScore:  0,
  capitalScore:     0,
  enforcementDelta: 0,
  fs:               0,
  ts:               0,
};

export function detectRegulatoryWindow(signals) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return { ...NULL_RESULT, ts: Date.now() };
  }

  const byDomain = {};
  for (const s of signals) {
    if (s?.domain && !byDomain[s.domain]) byDomain[s.domain] = s;
  }

  const k = byDomain.KNOWLEDGE;
  const m = byDomain.MEDIA;
  const t = byDomain.TECHNOLOGY;
  const c = byDomain.CAPITAL;

  const kScore = k?.signal ?? 0;
  const mScore = m?.signal ?? 0;
  const tScore = t?.signal ?? 0;
  const cScore = c?.signal ?? 0;

  const kConf = (k?.confidence ?? 0) / 100;
  const mConf = (m?.confidence ?? 0) / 100;
  const fs = k && m ? (kConf + mConf) / 2 : k ? kConf : m ? mConf : 0;

  const phaseA           = kScore > PHASE_A_THRESHOLD && mScore > PHASE_A_THRESHOLD;
  const enforcementDelta = kScore - cScore;
  const phaseC           = enforcementDelta > PHASE_C_SPREAD;

  const log = appendToLog(kScore, mScore, tScore, cScore);
  const { state: velocityState, microWindow, macroWindow } = evaluateTemporalKernel(log, phaseC);

  return {
    triggered:        velocityState !== REGULATORY_STATE.DORMANT,
    velocityState,
    phaseA,
    phaseC,
    microWindow,
    macroWindow,
    knowledgeScore:   kScore,
    mediaScore:       mScore,
    technologyScore:  tScore,
    capitalScore:     cScore,
    enforcementDelta,
    fs,
    ts: Date.now(),
  };
}

// Clear temporal log — for testing and session reset
export function clearRegulatoryLog() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
