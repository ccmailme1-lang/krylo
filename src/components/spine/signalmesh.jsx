// WO-1025/1040 — Signal Substrate: GPU/CPU delegation mesh
// N ≤ 10: CPU updates position buffer (SignalNodeDeformer path)
// N > 10: GPU uniform arrays uActiveNodes[10] + uActiveVectors[10]

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import vertShader from '../../shaders/signalField.vert?raw';
import fragShader from '../../shaders/signalField.frag?raw';

const HIGH_CORE    = typeof window !== 'undefined' && (window.navigator?.hardwareConcurrency ?? 4) > 4;
const SEGS         = HIGH_CORE ? 128 : 64;
const N_THRESHOLD  = 10;

function makeUniforms() {
  return {
    uTime:          { value: 0 },
    uActiveNodes:   { value: Array.from({ length: 10 }, () => new THREE.Vector3(0, 0, 0)) },
    uActiveVectors: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  };
}

// ── CPU deformer (low-density path) ──────────────────────────────────────────
function cpuDeform(posAttr, orig, active, t) {
  for (let v = 0; v < posAttr.count; v++) {
    const vx = orig[v * 3];
    const vy = orig[v * 3 + 1];
    let dz = 0;
    for (let i = 0; i < active.length; i++) {
      const s    = active[i];
      const dx   = vx - (s.position?.[0] ?? 0);
      const dy   = vy - (s.position?.[2] ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const A    = s.vector?.A ?? 0.3;
      const V    = s.vector?.V ?? 0.5;
      dz += (A / (dist * dist + 0.15)) * Math.sin(t * 3.0 - dist * (2.0 + V * 4.0));
    }
    posAttr.setZ(v, orig[v * 3 + 2] + dz);
  }
  posAttr.needsUpdate = true;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SignalMesh({ signals = [] }) {
  const meshRef = useRef(null);
  const matRef  = useRef(null);
  const uRef    = useRef(makeUniforms());

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(20, 14, SEGS, SEGS);
    g.rotateX(-Math.PI / 2);
    // Store original vertex positions for CPU deformer
    g.userData.origPositions = Float32Array.from(g.attributes.position.array);
    return g;
  }, []);

  useFrame((_, delta) => {
    const u = uRef.current;
    u.uTime.value += delta;

    const active = signals.filter(s => s?.position).slice(0, 10);
    const n      = active.length;

    if (n <= N_THRESHOLD) {
      // CPU path — zero all GPU flags so shader is passthrough
      for (let i = 0; i < 10; i++) u.uActiveNodes.value[i].z = 0;

      const geo  = meshRef.current?.geometry;
      const orig = geo?.userData?.origPositions;
      const pos  = geo?.attributes?.position;
      if (geo && orig && pos) {
        cpuDeform(pos, orig, active, u.uTime.value);
        geo.computeVertexNormals();
      }
    } else {
      // GPU path — pack active nodes into uniforms
      for (let i = 0; i < 10; i++) {
        const s = active[i];
        if (s) {
          u.uActiveNodes.value[i].set(s.position[0], s.position[2], 1);
          u.uActiveVectors.value[i].set(
            s.vector?.D ?? 0,
            s.vector?.V ?? 0.5,
            s.vector?.A ?? 0.3,
            s.vector?.T ?? 0.5,
          );
        } else {
          u.uActiveNodes.value[i].set(0, 0, 0);
        }
      }
    }

    if (matRef.current) {
      matRef.current.uniforms.uTime.value          = u.uTime.value;
      matRef.current.uniforms.uActiveNodes.value   = u.uActiveNodes.value;
      matRef.current.uniforms.uActiveVectors.value = u.uActiveVectors.value;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertShader}
        fragmentShader={fragShader}
        uniforms={uRef.current}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
