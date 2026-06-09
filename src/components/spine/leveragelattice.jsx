// WO-1035 — Leverage Lattice
// WO-1040 — Tufte Source Hardening
// WO-1025 — Spatial Paywall
// WO-1102 — Unicorn magnetism: 1/d² quadratic pull toward uUnicornPos

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float u_time;
  uniform vec2  u_impact;
  uniform float u_strength;
  uniform float u_magnetismRadius;
  uniform float u_isUnicorn;
  uniform vec2  u_unicornPos;
  varying float vElevation;

  void main() {
    vec3  pos  = position;

    // Gaussian dip — local XY = world XZ (plane rotation: -π/2 on X)
    float dist  = distance(pos.xy, u_impact);
    float dd    = dist * dist;
    float pulse = 0.65 + 0.35 * sin(u_time * 1.8);
    float warp  = dist <= u_magnetismRadius
      ? u_strength * 6.0 * exp(-dd / 18.0) * pulse
      : 0.0;

    // Unicorn quadratic magnetism — 1/d² pull toward Unicorn coordinate
    float uWarp = 0.0;
    if (u_isUnicorn > 0.5) {
      float uDist = distance(pos.xy, u_unicornPos);
      float uDD   = uDist * uDist;
      uWarp = clamp(1.5 / max(uDD, 0.5), 0.0, 2.0);
    }

    // local +Z → world -Y after rotation: depress below surface, clamped at US map (2.5 units)
    pos.z      = clamp(pos.z + (warp + uWarp), -2.5, 2.5);
    vElevation  = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// WO-1040: Tufte alpha gate
// WO-1025: Spatial Paywall — depth clarity
const fragmentShader = `
  varying float vElevation;
  uniform float u_sourceCount;

  void main() {
    float base    = u_sourceCount >= 5.0 ? 0.4 : 0.15;
    float depth   = max(0.0, -vElevation);
    float clarity = clamp(base + depth * 0.25, 0.0, 0.7);
    gl_FragColor  = vec4(0.29, 0.29, 0.29, clarity);
  }
`;

export default function LeverageLattice({
  impact      = [0, 0],
  strength    = 0,
  sourceCount = 0,
  isUnicorn   = false,
  unicornPos  = [0, 0],
  frozen      = false,
}) {
  const meshRef = useRef();

  const uniforms = useMemo(() => ({
    u_time:            { value: 0 },
    u_impact:          { value: new THREE.Vector2(impact[0], impact[1]) },
    u_strength:        { value: strength },
    u_sourceCount:     { value: sourceCount },
    u_magnetismRadius: { value: 3.0 },
    u_isUnicorn:       { value: 0.0 },
    u_unicornPos:      { value: new THREE.Vector2(unicornPos[0], unicornPos[1]) },
  }), []);

  useFrame((state) => {
    if (frozen) return;
    uniforms.u_time.value            = state.clock.elapsedTime;
    uniforms.u_impact.value.set(impact[0], impact[1]);
    uniforms.u_strength.value        = strength;
    uniforms.u_sourceCount.value     = sourceCount;
    uniforms.u_isUnicorn.value       = isUnicorn ? 1.0 : 0.0;
    uniforms.u_unicornPos.value.set(unicornPos[0], unicornPos[1]);
  });

  const seg = sourceCount >= 5 ? 30 : (window.navigator.hardwareConcurrency > 4 ? 30 : 15);

  // Pure grid: horizontal + vertical lines only, no triangle diagonals.
  // Each line subdivided into `seg` segments so the displacement shader stays smooth.
  const gridPositions = useMemo(() => {
    const S = 100, H = S / 2;
    const step = S / seg;
    const arr = [];
    for (let k = 0; k <= seg; k++) {
      const c = -H + k * step;
      for (let i = 0; i < seg; i++) {
        const a = -H + i * step, b = -H + (i + 1) * step;
        arr.push(a, c, 0, b, c, 0); // horizontal line row k
        arr.push(c, a, 0, c, b, 0); // vertical line col k
      }
    }
    return new Float32Array(arr);
  }, [seg]);

  return (
    <lineSegments ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[gridPositions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </lineSegments>
  );
}
