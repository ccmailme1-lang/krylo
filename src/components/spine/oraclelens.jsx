// WO-1045 — Oracle Lens
// Glassmorphic pointer-tracking lens. Displays PLI data from WO-1038 (AS-DIFF).
// Mobile-first. pointer-events: none. Follows cursor/touch on the floor plane.

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const FLOOR_PLANE  = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
const LERP_SPEED   = 0.08;

export default function OracleLens({ pliData = null }) {
  const groupRef  = useRef();
  const targetRef = useRef(new THREE.Vector3());
  const { pointer, camera, raycaster } = useThree();

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(FLOOR_PLANE, targetRef.current);
    if (groupRef.current) {
      groupRef.current.position.lerp(targetRef.current, LERP_SPEED);
      groupRef.current.position.y = 0.5;
    }
  });

  if (!pliData) return null;

  const { axis, margin, projection } = pliData;
  const winner = margin > 0 ? 'A' : margin < 0 ? 'B' : 'PARITY';

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'none' }}>
        <div style={{
          backdropFilter:  'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border:          '1px solid rgba(255,255,255,0.1)',
          borderRadius:    '6px',
          padding:         '10px 14px',
          minWidth:        '160px',
          fontFamily:      "'IBM Plex Mono', monospace",
          fontSize:        '10px',
          color:           'rgba(255,255,255,0.85)',
          letterSpacing:   '0.08em',
          background:      'rgba(0,0,0,0.45)',
          pointerEvents:   'none',
          whiteSpace:      'nowrap',
        }}>
          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', letterSpacing: '0.15em' }}>
            ORACLE LENS · PLI
          </div>
          <div style={{ marginBottom: '4px' }}>
            AXIS &nbsp;<span style={{ color: '#fff' }}>{axis}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            MARGIN &nbsp;<span style={{ color: margin > 0 ? '#66FF00' : 'rgba(255,255,255,0.5)' }}>
              {margin > 0 ? '+' : ''}{(margin * 100).toFixed(1)}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            A &nbsp;<span style={{ color: '#fff' }}>{(projection.a * 100).toFixed(0)}</span>
            &nbsp;·&nbsp;
            B &nbsp;<span style={{ color: '#fff' }}>{(projection.b * 100).toFixed(0)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '8px', letterSpacing: '0.12em', color: winner === 'PARITY' ? 'rgba(255,255,255,0.5)' : '#66FF00' }}>
            {winner}
          </div>
        </div>
      </Html>
    </group>
  );
}
