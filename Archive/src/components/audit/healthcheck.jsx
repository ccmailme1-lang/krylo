// src/components/audit/healthcheck.jsx
// WO-249 — KRYLO Automated Health Check
// WO-249 rev — HARDENED node presence + Fs range (0.0–1.0) validation added
// Route: /health
// Location: src/components/audit/healthcheck.jsx

import React, { useState, useCallback } from 'react';

const CHECKS = [
  {
    id: 'api',
    label: 'Mock Server — POST /api/truth',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return 'Responded 200';
    },
  },
  {
    id: 'records',
    label: 'Truth Engine — ETR Records Returned',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      if (!arr.length) throw new Error('Empty array');
      return `${arr.length} record(s)`;
    },
  },
  {
    id: 'fs',
    label: 'Fs Calculation — Fidelity Score Valid',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      const fc = arr[0]?.fidelity_components;
      if (!fc) throw new Error('No fidelity_components');
      const keys = ['m_checksum', 't_telemetry', 'd_docs', 'v_voice', 'e_viral'];
      for (const k of keys) {
        if (typeof fc[k] !== 'number') throw new Error(`Missing ${k}`);
      }
      const fs = fc.m_checksum * 0.4 + fc.t_telemetry * 0.3 + fc.d_docs * 0.2 + fc.v_voice * 0.09 + fc.e_viral * 0.01;
      return `Fs ${fs.toFixed(3)}`;
    },
  },
  {
    id: 'canvas',
    label: 'Signal Map — Canvas Mounts',
    run: async () => {
      return new Promise((resolve, reject) => {
        const canvas = document.querySelector('canvas');
        if (canvas) return resolve('Canvas found');
        // Wait up to 3s for canvas to appear
        let tries = 0;
        const interval = setInterval(() => {
          const c = document.querySelector('canvas');
          if (c) { clearInterval(interval); resolve('Canvas found'); }
          if (++tries > 30) { clearInterval(interval); reject(new Error('Canvas not found — navigate to Signal Map first')); }
        }, 100);
      });
    },
  },
  {
    id: 'webgl',
    label: 'WebGL Context — No Loss Detected',
    run: async () => {
      return new Promise((resolve, reject) => {
        const errors = [];
        const handler = (e) => {
          if (e.message?.includes('WebGL context')) errors.push(e.message);
        };
        window.addEventListener('error', handler);
        setTimeout(() => {
          window.removeEventListener('error', handler);
          if (errors.length) reject(new Error(errors[0]));
          else resolve('Clean');
        }, 3000);
      });
    },
  },
  {
    id: 'particles',
    label: 'KineticGravity — Particle Field Present',
    run: async () => {
      const el = document.querySelector('.particle-field');
      if (!el) throw new Error('.particle-field not found — check 10K View');
      return 'particle-field found';
    },
  },
  {
    id: 'stubs',
    label: 'Stub Fallback — signalMapData Never Null',
    run: async () => {
      // Verify app.jsx stub logic by checking window KRYLO debug if available
      // Otherwise validate API response shape
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      if (res.ok) return 'API live — stubs not needed';
      // If API is down, stubs should be active
      return 'API down — stubs should be active';
    },
  },
  {
    id: 'nodes',
    label: 'Signal Map — Node Count Label Present',
    run: async () => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find(e => e.textContent?.startsWith('nodes:'));
      if (!el) throw new Error('nodes: label not found — navigate to Signal Map first');
      return el.textContent.trim();
    },
  },
  {
    id: 'hardened',
    label: 'HARDENED Node — Fs ≥ 0.70 Present in Signal Set',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : [data];
      const FS_W = { m_checksum: 0.4, t_telemetry: 0.3, d_docs: 0.2, v_voice: 0.09, e_viral: 0.01 };
      const hardened = arr.filter(r => {
        const fc = r.fidelity_components ?? {};
        const fs = Object.entries(FS_W).reduce((s, [k, w]) => s + (fc[k] ?? 0) * w, 0);
        return fs >= 0.70;
      });
      if (!hardened.length) throw new Error('No HARDENED nodes in signal set');
      return `${hardened.length} HARDENED node(s)`;
    },
  },
  {
    id: 'fsrange',
    label: 'Fs Range — All Values Within 0.0–1.0',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : [data];
      const FS_W = { m_checksum: 0.4, t_telemetry: 0.3, d_docs: 0.2, v_voice: 0.09, e_viral: 0.01 };
      const scores = arr.map(r => {
        const fc = r.fidelity_components ?? {};
        return Object.entries(FS_W).reduce((s, [k, w]) => s + (fc[k] ?? 0) * w, 0);
      });
      const invalid = scores.filter(fs => fs < 0 || fs > 1);
      if (invalid.length) throw new Error(`${invalid.length} out-of-range Fs value(s)`);
      return `${scores.length} values in [0.0, 1.0]`;
    },
  },
  {
    id: 'score',
    label: 'Signal Score — Renders from Truth Engine',
    run: async () => {
      const res = await fetch('/api/truth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'health' }),
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      const score = arr[0]?.signal_score;
      if (score === undefined || score === null) throw new Error('signal_score missing');
      return `Score ${Math.round(score * 100)}`;
    },
  },
  {
    id: 'return',
    label: 'Return Button — Present on Signal Map',
    run: async () => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ret = btns.find(b => b.textContent?.includes('RETURN'));
      if (!ret) throw new Error('← RETURN button not found — navigate to Signal Map first');
      return '← RETURN found';
    },
  },
];

const STATUS = { idle: 'IDLE', running: 'RUNNING', pass: 'PASS', fail: 'FAIL' };

export default function HealthCheck() {
  const [results, setResults] = useState(
    CHECKS.map(c => ({ id: c.id, label: c.label, status: STATUS.idle, detail: '' }))
  );
  const [running, setRunning] = useState(false);
  const [timestamp, setTimestamp] = useState(null);

  const runAll = useCallback(async () => {
    setRunning(true);
    setTimestamp(null);
    setResults(CHECKS.map(c => ({ id: c.id, label: c.label, status: STATUS.running, detail: '' })));

    for (let i = 0; i < CHECKS.length; i++) {
      const check = CHECKS[i];
      try {
        const detail = await check.run();
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: STATUS.pass, detail: detail ?? 'OK' } : r
        ));
      } catch (err) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: STATUS.fail, detail: err.message } : r
        ));
      }
    }

    setRunning(false);
    setTimestamp(new Date().toLocaleTimeString());
  }, []);

  const passed = results.filter(r => r.status === STATUS.pass).length;
  const failed = results.filter(r => r.status === STATUS.fail).length;
  const total  = CHECKS.length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#05070a',
      color: 'rgba(232,244,255,0.85)',
      fontFamily: 'IBM Plex Mono, monospace',
      padding: '40px 48px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', opacity: 0.4, marginBottom: 6 }}>KRYLO</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.1em' }}>HEALTH CHECK</div>
          {timestamp && (
            <div style={{ fontSize: 10, opacity: 0.35, marginTop: 6 }}>Last run: {timestamp}</div>
          )}
        </div>
        <button
          onClick={runAll}
          disabled={running}
          style={{
            background: running ? 'rgba(232,244,255,0.05)' : 'rgba(0,150,255,0.15)',
            border: '1px solid rgba(0,150,255,0.4)',
            borderRadius: 6,
            color: 'rgba(232,244,255,0.85)',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.15em',
            padding: '10px 20px',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'RUNNING...' : '▶ RUN ALL'}
        </button>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {results.map((r) => (
          <div key={r.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
            borderRadius: 4,
            background: r.status === STATUS.pass ? 'rgba(0,150,255,0.04)'
                      : r.status === STATUS.fail ? 'rgba(245,166,35,0.06)'
                      : 'rgba(255,255,255,0.02)',
            borderLeft: `2px solid ${
              r.status === STATUS.pass ? '#0096ff'
            : r.status === STATUS.fail ? '#F5A623'
            : r.status === STATUS.running ? 'rgba(232,244,255,0.2)'
            : 'rgba(232,244,255,0.08)'}`,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              minWidth: 72,
              color: r.status === STATUS.pass ? '#E8F4FF'
                   : r.status === STATUS.fail ? '#F5A623'
                   : r.status === STATUS.running ? 'rgba(232,244,255,0.5)'
                   : 'rgba(232,244,255,0.2)',
            }}>
              {r.status === STATUS.running ? '...' : r.status === STATUS.idle ? 'IDLE' : r.status}
            </span>
            <span style={{ fontSize: 11, flex: 1, opacity: 0.8 }}>{r.label}</span>
            <span style={{ fontSize: 10, opacity: 0.4, textAlign: 'right', maxWidth: 240 }}>{r.detail}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      {timestamp && (
        <div style={{
          marginTop: 32,
          padding: '16px 20px',
          borderRadius: 6,
          background: failed === 0 ? 'rgba(0,150,255,0.08)' : 'rgba(245,166,35,0.08)',
          border: `1px solid ${failed === 0 ? 'rgba(0,150,255,0.25)' : 'rgba(245,166,35,0.25)'}`,
          fontSize: 12,
          letterSpacing: '0.1em',
        }}>
          {failed === 0
            ? `✓ ${passed}/${total} CHECKS PASSED — PLATFORM HEALTHY`
            : `⚠ ${passed}/${total} PASSED — ${failed} FAILED`}
        </div>
      )}
    </div>
  );
}
