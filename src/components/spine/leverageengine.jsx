// WO-1038 — AS-DIFF Engine Wiring + Shannon Cubic
// WO-1102 — Signal Stream: live score/sourceCount/ltv/cac/uIsUnicorn/uUnicornPos
// Falls back to mock constants when stream is offline.

import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import LeverageLattice  from './leveragelattice.jsx';
import OracleLens       from './oraclelens.jsx';
import RevenueSignal    from './revenuesignal.jsx';
import { useSignalStream } from '../../hooks/usesignalstream.js';

const SHANNON_FLOOR     = 0.73;
const MOCK_SOURCE_COUNT = 6;

const UNIT_A = {
  schema: { domain: 'finance', constraints: [{ label: 'liquidity', severity: 0.75 }], dependencies: [] },
  signal: { id: 'ETR-042' },
  pli:    { pli: 0.82, confidence: 0.91, fold: 3.1, lens: 'INVESTOR', components: { velocity: 0.70, window: 0.88 } },
};

const UNIT_B = {
  schema: { domain: 'career', constraints: [], dependencies: [{ id: 'DEP-1', status: 'lit', coverage: 0.72 }] },
  signal: { id: 'ETR-031' },
  pli:    { pli: 0.58, confidence: 0.74, fold: 2.1, lens: 'CAREER', components: { velocity: 0.42, window: 0.65 } },
};

function winnerLabel(winner, margin) {
  if (winner === 'PARITY') return 'PARITY — no dominant edge';
  const edge = Math.abs(margin * 100).toFixed(0);
  return `SIGNAL ${winner} LEADS · ${edge}pt EDGE`;
}

export default function LeverageEngine({ stateRef, signals }) {
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(false);
  const impactArr  = useRef([1.5, -1.0]);
  const fetchedRef = useRef(false);

  // WO-1102: live stream — falls back to mocks when null
  const stream = useSignalStream();

  const sourceCount = stream?.sourceCount ?? MOCK_SOURCE_COUNT;
  const ltv         = stream?.ltv         ?? null;
  const cac         = stream?.cac         ?? null;
  const isUnicorn   = stream?.uIsUnicorn  ?? false;
  const unicornPos  = stream?.uUnicornPos
    ? [stream.uUnicornPos[0], stream.uUnicornPos[2]]  // vec3 → XZ
    : [0, 0];

  useFrame(() => {
    if (!signals?.length || !stateRef?.current?.length) return;
    let bestIdx = 0, bestFs = -Infinity;
    for (let i = 0; i < signals.length; i++) {
      const fs = signals[i]?.fs ?? 0;
      if (fs > bestFs) { bestFs = fs; bestIdx = i; }
    }
    const pos = stateRef.current[bestIdx]?.pos;
    if (pos) {
      impactArr.current[0] = pos.x;
      impactArr.current[1] = pos.z;
    }
  });

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch('/asdiff/api/evaluate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ A: UNIT_A, B: UNIT_B }),
    })
      .then(r => r.json())
      .then(data => { if (data.error) { setError(true); return; } setResult(data); })
      .catch(() => setError(true));
  }, []);

  const rawScore = stream?.score ?? result?.score ?? 0;
  const strength = rawScore > SHANNON_FLOOR
    ? Math.pow((rawScore - SHANNON_FLOOR) / (1 - SHANNON_FLOOR), 3) * 10
    : 0;
  const isDip = rawScore > SHANNON_FLOOR;

  return (
    <>
      <LeverageLattice
        impact={impactArr.current}
        strength={strength}
        sourceCount={sourceCount}
        isUnicorn={isUnicorn}
        unicornPos={unicornPos}
      />

      <RevenueSignal
        position={[impactArr.current[0], 0, impactArr.current[1]]}
        ltv={ltv}
        cac={cac}
        sourceCount={sourceCount}
      />

      {(result || stream) && (
        <Html
          position={[impactArr.current[0], 0.3, impactArr.current[1]]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      '8px',
            letterSpacing: '0.14em',
            color:         isDip ? '#808080' : 'rgba(255,255,255,0.5)',
            background:    'rgba(0,0,0,0.65)',
            border:        '1px solid rgba(128,128,128,0.4)',
            borderRadius:  '3px',
            padding:       '3px 8px',
            whiteSpace:    'nowrap',
            textTransform: 'uppercase',
          }}>
            {isDip
              ? winnerLabel(result?.winner ?? 'A', result?.leverage_margin ?? 0)
              : 'RIPPLE — below signal threshold'}
          </div>
        </Html>
      )}

      {error && (
        <Html position={[0, 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            AS-DIFF OFFLINE
          </div>
        </Html>
      )}

      <OracleLens pliData={result?.pli ?? null} />
    </>
  );
}
