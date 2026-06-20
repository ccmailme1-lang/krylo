// WO-1823 — Conviction Record Object
// WO-1824 — Thesis Monitoring Layer
// Session-scoped via sessionStorage. Cross-session persistence: WO-1813.

import { useState, useEffect } from 'react';
import { HIGH_CONVERGENCE_FLOOR, COUNTER_SIGNAL_CEILING, CALIBRATION_MIN_OVERALL, CALIBRATION_MIN_DOMAIN, CALIBRATION_MIN_HP } from './signalconstants.js';

const STORE_KEY = 'krylo_convictions_v2';

function load() {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '[]'); }
  catch { return []; }
}

function persist(records) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(records)); }
  catch {}
}

function makeRecord({ sessionId, thesis, timeHorizon, domains, peakScore, velocity, domainStates }) {
  return {
    id:           crypto.randomUUID(),
    sessionId:    sessionId ?? null,
    thesis:       thesis ?? null,
    timeHorizon:  timeHorizon ?? null,
    domains:      domains ?? [],
    peakScore:    peakScore ?? 0,
    velocity:     velocity ?? 'FLAT',
    domainStates: domainStates ?? {},   // signal field snapshot at commit
    committedAt:  Date.now(),
    status:       'active',
    resolution:   null,   // 'confirmed' | 'denied' | 'timed_out'
    resolvedAt:   null,
  };
}

export function useConvictionStore() {
  const [records, setRecords] = useState(load);

  useEffect(() => { persist(records); }, [records]);

  function commit(params) {
    const record = makeRecord(params);
    setRecords(prev => [record, ...prev]);
    return record.id;
  }

  function resolve(id, resolution) {
    setRecords(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'resolved', resolution, resolvedAt: Date.now() } : r
    ));
  }

  function dismiss(id) {
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  return {
    active:   records.filter(r => r.status === 'active'),
    resolved: records.filter(r => r.status === 'resolved'),
    commit,
    resolve,
    dismiss,
  };
}

// ── WO-1824: THESIS MONITORING ────────────────────────────────────────────────
// computeThesisMonitoring targets the conviction record directly.
// Full entity separation deferred to WO-1813 (cross-session persistence).

export function computeThesisMonitoring(conviction, currentDomainStates, currentHappyPath) {
  const alerts          = [];
  const { domains, domainStates: snap, peakScore } = conviction;
  let   allStrengthening = true;

  for (const domain of domains) {
    const committed = snap[domain] ?? {};
    const cur       = currentDomainStates?.[domain];
    if (!cur) continue;

    if (cur.score < HIGH_CONVERGENCE_FLOOR && (committed.score ?? HIGH_CONVERGENCE_FLOOR) >= HIGH_CONVERGENCE_FLOOR) {
      alerts.push({ condition: 'convergence_drop', severity: 'medium', domain,
        message: `${domain} convergence has dropped below floor (${cur.score.toFixed(0)}). Review recommended.` });
      allStrengthening = false;
    }

    if (cur.velocity === 'DECAYING' && committed.velocity !== 'DECAYING') {
      alerts.push({ condition: 'velocity_reversal', severity: 'medium', domain,
        message: `${domain} velocity reversed. Direction now negative.` });
      allStrengthening = false;
    }

    if ((cur.counterSignal ?? 0) > COUNTER_SIGNAL_CEILING && (committed.counterSignal ?? 0) <= COUNTER_SIGNAL_CEILING) {
      alerts.push({ condition: 'counter_signal', severity: 'high', domain,
        message: `Active counter-signal detected in ${domain}. Thesis contested.` });
      allStrengthening = false;
    }

    if (cur.state === 'TURBULENT' && committed.state !== 'TURBULENT') {
      alerts.push({ condition: 'turbulent', severity: 'high', domain,
        message: `${domain} entered TURBULENT state. Signal contested.` });
      allStrengthening = false;
    }

    if (cur.score < (committed.score ?? 0)) allStrengthening = false;
  }

  const hadHP = peakScore >= HIGH_CONVERGENCE_FLOOR && domains.length >= 2;
  if (hadHP && !currentHappyPath?.qualified) {
    alerts.push({ condition: 'hp_lost', severity: 'high', domain: null,
      message: 'Happy Path designation no longer active. Convergence conditions have changed.' });
    allStrengthening = false;
  }

  if (allStrengthening && alerts.length === 0 && domains.length > 0) {
    const rising = domains.filter(d => {
      const cur = currentDomainStates?.[d];
      return cur && cur.score > (snap[d]?.score ?? 0);
    });
    if (rising.length === domains.length) {
      alerts.push({ condition: 'strengthening', severity: 'informational', domain: null,
        message: `${domains.join(' + ')} strengthening since commitment. Thesis holding.` });
    }
  }

  return alerts;
}

// ── WO-1825: CALIBRATION ─────────────────────────────────────────────────────
// Pure function — call with convictions.resolved to get calibration metrics.
// Thresholds per spec: overall=5, domain=3, HP=2.

export function computeCalibration(resolved) {
  const total     = resolved.length;
  const confirmed = resolved.filter(r => r.resolution === 'confirmed').length;
  const denied    = resolved.filter(r => r.resolution === 'denied').length;
  const timedOut  = resolved.filter(r => r.resolution === 'timed_out').length;

  const overallAccuracy = total >= CALIBRATION_MIN_OVERALL ? confirmed / total : null;

  const groups = {};
  for (const r of resolved) {
    const key = [...r.domains].sort().join('+');
    if (!groups[key]) groups[key] = { domains: r.domains, confirmed: 0, total: 0 };
    groups[key].total++;
    if (r.resolution === 'confirmed') groups[key].confirmed++;
  }
  const domainAccuracy = Object.values(groups)
    .filter(g => g.total >= CALIBRATION_MIN_DOMAIN)
    .map(g => ({ domains: g.domains, accuracy: g.confirmed / g.total, count: g.total }));

  const hpResolved = resolved.filter(r =>
    r.peakScore >= HIGH_CONVERGENCE_FLOOR && r.domains.length >= 2
  );
  const hpAccuracy = hpResolved.length >= CALIBRATION_MIN_HP
    ? hpResolved.filter(r => r.resolution === 'confirmed').length / hpResolved.length
    : null;

  return { total, confirmed, denied, timedOut, overallAccuracy, domainAccuracy, hpResolved: hpResolved.length, hpAccuracy };
}

export function useThesisMonitor(active, domainStates, happyPath) {
  const [monitorMap, setMonitorMap] = useState({});

  useEffect(() => {
    if (!domainStates || active.length === 0) { setMonitorMap({}); return; }
    const map = {};
    for (const conviction of active) {
      map[conviction.id] = computeThesisMonitoring(conviction, domainStates, happyPath);
    }
    setMonitorMap(map);
  }, [active, domainStates, happyPath]);

  return monitorMap;
}
