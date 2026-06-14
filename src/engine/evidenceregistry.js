// WO-EVIDENCE-001 — Signal Outcome Registry
// Audited record of every pre-consensus prediction made by Krylo engines.
// Proves the claim: "Know first. Act before consensus."
//
// Flow: emitPrediction → timestamp → track → resolve → accuracy accumulation
// Storage: localStorage (browser) / in-memory fallback (Node / harness)
// Pattern: mirrors telemetry.js (WO-1367) persistence architecture
// Clock: Date.now() — monotonic wall clock (substrate_time authority in CausalOS)

const STORAGE_KEY      = 'krylo_evidence_registry';
const MAX_PREDICTIONS  = 500;

// ── OUTCOME STATES ───────────────────────────────────────────────────────────

export const OUTCOME = Object.freeze({
  PENDING:     'PENDING',
  VALIDATED:   'VALIDATED',
  INVALIDATED: 'INVALIDATED',
  EXPIRED:     'EXPIRED',
});

// ── VALID PREDICTION SOURCES ─────────────────────────────────────────────────

export const PREDICTION_SOURCES = Object.freeze([
  'WO-1722', // Munger — cross-domain synthesis
  'WO-1726', // Webb — weak signal detection
  'WO-1734', // Khosla — non-consensus detection
  'WO-1735', // Platform conviction arc
  'WO-1736', // Gass-Benecke — regulatory window
  'WO-1741', // Platform formation
  'MANUAL',  // Founder-entered prediction
]);

// ── PERSISTENCE ──────────────────────────────────────────────────────────────

function _load() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch { /* silent */ }
  return [];
}

function _persist(registry) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    }
  } catch {
    const trimmed = registry.slice(Math.floor(registry.length / 2));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
    } catch { /* silent */ }
  }
}

// ── REGISTRY STATE ───────────────────────────────────────────────────────────

const _registry = _load();

// ── ID GENERATION ────────────────────────────────────────────────────────────

let _counter = 0;
function _generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${++_counter}`;
}

// ── EMIT ─────────────────────────────────────────────────────────────────────

export function emitPrediction({
  domains             = [],
  convergenceScore    = 0,
  hypothesis          = '',
  expectedHorizonDays = 180,
  source              = 'MANUAL',
  provenanceRef       = null,
} = {}) {
  if (!hypothesis || hypothesis.trim() === '') {
    throw new Error('EVIDENCE_REGISTRY: hypothesis is required');
  }
  if (!domains.length) {
    throw new Error('EVIDENCE_REGISTRY: at least one domain required');
  }
  if (!PREDICTION_SOURCES.includes(source)) {
    throw new Error(`EVIDENCE_REGISTRY: unknown source ${source}`);
  }

  const entry = Object.freeze({
    id:                  _generateId(),
    timestamp:           Date.now(),
    domains:             [...domains],
    convergenceScore:    Math.max(0, Math.min(1, convergenceScore)),
    hypothesis:          hypothesis.trim(),
    expectedHorizonDays: Math.max(1, expectedHorizonDays),
    resolutionDate:      null,
    actualOutcome:       OUTCOME.PENDING,
    leadTimeDays:        null,
    source,
    provenanceRef,
    resolutionNote:      null,
  });

  _registry.push(entry);
  if (_registry.length > MAX_PREDICTIONS) {
    _registry.splice(0, _registry.length - MAX_PREDICTIONS);
  }
  _persist(_registry);
  return entry.id;
}

// ── RESOLVE ──────────────────────────────────────────────────────────────────

export function resolvePrediction(id, outcome, resolutionNote = '') {
  if (
    outcome !== OUTCOME.VALIDATED &&
    outcome !== OUTCOME.INVALIDATED &&
    outcome !== OUTCOME.EXPIRED
  ) {
    throw new Error(
      `EVIDENCE_REGISTRY: invalid outcome ${outcome}. Use VALIDATED | INVALIDATED | EXPIRED`
    );
  }

  const idx = _registry.findIndex(e => e.id === id);
  if (idx === -1) throw new Error(`EVIDENCE_REGISTRY: prediction ${id} not found`);

  const existing = _registry[idx];
  if (existing.actualOutcome !== OUTCOME.PENDING) {
    throw new Error(
      `EVIDENCE_REGISTRY: prediction ${id} already resolved as ${existing.actualOutcome}`
    );
  }

  const resolutionDate = Date.now();
  const leadTimeDays   = Math.round((resolutionDate - existing.timestamp) / 86_400_000);

  _registry[idx] = Object.freeze({
    ...existing,
    resolutionDate,
    actualOutcome: outcome,
    leadTimeDays,
    resolutionNote: resolutionNote.trim() || null,
  });

  _persist(_registry);
  return _registry[idx];
}

// ── EXPIRY CHECK ─────────────────────────────────────────────────────────────
// Call on session start to auto-expire predictions past their horizon window.

export function checkExpiry() {
  const now = Date.now();
  let expired = 0;

  _registry.forEach((entry, idx) => {
    if (entry.actualOutcome !== OUTCOME.PENDING) return;
    const horizonMs = entry.expectedHorizonDays * 86_400_000;
    if (now - entry.timestamp > horizonMs) {
      _registry[idx] = Object.freeze({
        ...entry,
        actualOutcome:  OUTCOME.EXPIRED,
        resolutionDate: now,
        leadTimeDays:   entry.expectedHorizonDays,
        resolutionNote: 'Auto-expired: horizon elapsed without resolution',
      });
      expired++;
    }
  });

  if (expired > 0) _persist(_registry);
  return expired;
}

// ── QUERIES ──────────────────────────────────────────────────────────────────

export function getPending()  {
  return _registry.filter(e => e.actualOutcome === OUTCOME.PENDING);
}

export function getResolved() {
  return _registry.filter(e => e.actualOutcome !== OUTCOME.PENDING);
}

export function getRecord()   {
  return _registry.slice().sort((a, b) => b.timestamp - a.timestamp);
}

// ── ACCURACY ─────────────────────────────────────────────────────────────────

export function getRunningAccuracy() {
  const resolved    = _registry.filter(e => e.actualOutcome !== OUTCOME.PENDING);
  const validated   = resolved.filter(e => e.actualOutcome === OUTCOME.VALIDATED);
  const invalidated = resolved.filter(e => e.actualOutcome === OUTCOME.INVALIDATED);
  const expired     = resolved.filter(e => e.actualOutcome === OUTCOME.EXPIRED);

  const decisiveCount   = validated.length + invalidated.length;
  const overallAccuracy = decisiveCount > 0
    ? parseFloat((validated.length / decisiveCount).toFixed(4))
    : null;

  const avgLeadTimeDays = validated.length > 0
    ? Math.round(validated.reduce((s, e) => s + (e.leadTimeDays ?? 0), 0) / validated.length)
    : null;

  // Per-domain breakdown
  const byDomain = {};
  for (const entry of resolved) {
    for (const domain of entry.domains) {
      if (!byDomain[domain]) byDomain[domain] = { validated: 0, invalidated: 0, accuracy: null };
      if (entry.actualOutcome === OUTCOME.VALIDATED)   byDomain[domain].validated++;
      if (entry.actualOutcome === OUTCOME.INVALIDATED) byDomain[domain].invalidated++;
    }
  }
  for (const domain of Object.keys(byDomain)) {
    const { validated: v, invalidated: i } = byDomain[domain];
    const decisive = v + i;
    byDomain[domain].accuracy = decisive > 0 ? parseFloat((v / decisive).toFixed(4)) : null;
  }

  // Per-source breakdown
  const bySource = {};
  for (const entry of resolved) {
    const s = entry.source;
    if (!bySource[s]) bySource[s] = { validated: 0, invalidated: 0, accuracy: null };
    if (entry.actualOutcome === OUTCOME.VALIDATED)   bySource[s].validated++;
    if (entry.actualOutcome === OUTCOME.INVALIDATED) bySource[s].invalidated++;
  }
  for (const src of Object.keys(bySource)) {
    const { validated: v, invalidated: i } = bySource[src];
    const decisive = v + i;
    bySource[src].accuracy = decisive > 0 ? parseFloat((v / decisive).toFixed(4)) : null;
  }

  return {
    totalPredictions: _registry.length,
    pending:          _registry.length - resolved.length,
    resolved:         resolved.length,
    validated:        validated.length,
    invalidated:      invalidated.length,
    expired:          expired.length,
    overallAccuracy,
    avgLeadTimeDays,
    byDomain,
    bySource,
  };
}

// ── EXPORT ───────────────────────────────────────────────────────────────────

export function exportRegistry() {
  return {
    exportedAt:  Date.now(),
    accuracy:    getRunningAccuracy(),
    predictions: getRecord(),
  };
}

// ── RESET (test / dev only) ──────────────────────────────────────────────────

export function clearRegistry() {
  _registry.splice(0, _registry.length);
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch { /* silent */ }
}
