// src/components/spine/signalmap.jsx
// WO-248 — Kinetic Signal Map: InstancedMesh, Friction Matrix shaders, GPU disposal
// Four Golden Pillars: InstancedMesh, Shader Normalization, Frustum Culling, Geometry Disposal
// Location: src/components/spine/signalmap.jsx

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

const MAX_NODES = 512;
const FIELD_COUNT = 40;
const BOUNDS = 8;

// ── Friction Matrix Shaders ───────────────────────────────────────────────────
const VERT = /* glsl */`
  uniform float uTime;
  uniform float uFidelity;
  uniform float uStress;

  attribute vec3  aOffset;
  attribute float aFidelity;
  attribute float aStress;
  attribute float aPhase;
  attribute float aScale;

  varying float vFidelity;
  varying vec3  vNormal;

  void main() {
    vFidelity = aFidelity;
    vNormal   = normalize(normalMatrix * normal);

    // Surface deformation — low fidelity = high turbulence
    float cohesion = 1.0 - aFidelity;
    float noise    = sin(position.x * 6.0 + uTime + aPhase)
                   * cos(position.y * 6.0 + uTime)
                   * sin(position.z * 6.0 + uTime - aPhase);
    float viral    = aStress * sin(uTime * (2.0 + aStress * 12.0));

    vec3 displaced = position
      + normal * (noise * cohesion * 0.18 + viral * 0.09);

    vec4 world = instanceMatrix * vec4(displaced * aScale, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;

const FRAG = /* glsl */`
  varying float vFidelity;
  varying vec3  vNormal;

  void main() {
    // HARDENED ≥0.70 → cold white | WATCH 0.40–0.69 → signal blue | CALM <0.40 → amber
    vec3 coldWhite  = vec3(0.91, 0.957, 1.0);
    vec3 signalBlue = vec3(0.0,  0.588, 1.0);
    vec3 amber      = vec3(0.961,0.651, 0.137);

    vec3 color;
    if (vFidelity >= 0.70) {
      color = mix(signalBlue, coldWhite, (vFidelity - 0.70) / 0.30);
    } else if (vFidelity >= 0.40) {
      color = mix(amber, signalBlue, (vFidelity - 0.40) / 0.30);
    } else {
      color = amber;
    }

    float rim   = pow(1.0 - dot(normalize(vNormal), vec3(0.0,0.0,1.0)), 2.0);
    color      += rim * vFidelity * 0.35;
    float alpha = 0.55 + vFidelity * 0.45;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ── helpers ───────────────────────────────────────────────────────────────────
function clamp01(x) {
  const n = Number.isFinite(x) ? x : 0;
  return Math.min(1, Math.max(0, n));
}

function lcg(seed) {
  let s = (seed + 1337) >>> 0;
  s = (Math.imul(1664525, s) + 1013904223) >>> 0;
  return (s & 0xffffff) / 0x1000000;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ signals }) {
  const meshRef    = useRef(null);
  const matRef     = useRef(null);
  const stateRef   = useRef([]);

  // Build per-instance data once
  const { geometry, material, edges } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 48, 48);

    // Per-instance attributes
    const offsets    = new Float32Array(MAX_NODES * 3);
    const fidelities = new Float32Array(MAX_NODES);
    const stresses   = new Float32Array(MAX_NODES);
    const phases     = new Float32Array(MAX_NODES);
    const scales     = new Float32Array(MAX_NODES);

    const state = [];
    const primaries = [];

    // Primary nodes — from ETR signals
    signals.forEach((sig, i) => {
      const fs      = clamp01(sig.fs ?? (sig.strength ?? 1) / 5);
      const eViral  = clamp01(sig.fidelity?.e_viral ?? 0);
      const r       = lcg(i);
      const phi     = i * 2.399963;
      const radius  = Math.sqrt(i / Math.max(signals.length, 1)) * BOUNDS * 0.65;

      const pos = new THREE.Vector3(
        Math.cos(phi) * radius + (lcg(i * 3 + 1) * 2 - 1) * 1.5,
        (lcg(i * 3 + 2) * 2 - 1) * BOUNDS * 0.45,
        Math.sin(phi) * radius * 0.5 + (lcg(i * 3 + 3) * 2 - 1) * 1.0
      );
      const vel = new THREE.Vector3(
        (lcg(i * 7 + 1) * 2 - 1) * 0.01,
        (lcg(i * 7 + 2) * 2 - 1) * 0.007,
        (lcg(i * 7 + 3) * 2 - 1) * 0.005
      );
      const scale = 0.28 + fs * 0.42;

      offsets[i * 3]     = pos.x;
      offsets[i * 3 + 1] = pos.y;
      offsets[i * 3 + 2] = pos.z;
      fidelities[i]      = fs;
      stresses[i]        = eViral;
      phases[i]          = r * Math.PI * 2;
      scales[i]          = scale;

      state.push({ pos: pos.clone(), vel, speedScale: 1 + eViral * 2.5, primary: true, index: i });
      primaries.push({ pos: pos.clone(), id: sig.id ?? `etr-${i}`, fs, sig });
    });

    // Field nodes
    for (let j = 0; j < FIELD_COUNT; j++) {
      const i   = signals.length + j;
      const phi = j * 2.399963;
      const r2  = Math.sqrt(j / FIELD_COUNT) * BOUNDS;
      const pos = new THREE.Vector3(
        Math.cos(phi) * r2,
        (lcg(j * 5 + 4) * 2 - 1) * BOUNDS * 0.6,
        Math.sin(phi) * r2 * 0.4
      );
      const vel = new THREE.Vector3(
        (lcg(j * 11 + 1) * 2 - 1) * 0.02,
        (lcg(j * 11 + 2) * 2 - 1) * 0.015,
        (lcg(j * 11 + 3) * 2 - 1) * 0.01
      );

      offsets[i * 3]     = pos.x;
      offsets[i * 3 + 1] = pos.y;
      offsets[i * 3 + 2] = pos.z;
      fidelities[i]      = 0.15;
      stresses[i]        = 0.05;
      phases[i]          = lcg(j * 3) * Math.PI * 2;
      scales[i]          = 0.06;

      state.push({ pos: pos.clone(), vel, speedScale: 1, primary: false, index: i });
    }

    geo.setAttribute('aOffset',   new THREE.InstancedBufferAttribute(offsets,    3));
    geo.setAttribute('aFidelity', new THREE.InstancedBufferAttribute(fidelities, 1));
    geo.setAttribute('aStress',   new THREE.InstancedBufferAttribute(stresses,   1));
    geo.setAttribute('aPhase',    new THREE.InstancedBufferAttribute(phases,     1));
    geo.setAttribute('aScale',    new THREE.InstancedBufferAttribute(scales,     1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: {
        uTime:     { value: 0 },
        uFidelity: { value: 0.5 },
        uStress:   { value: 0 },
      },
    });

    // Build edges between primary nodes
    const edgeList = [];
    for (let a = 0; a < primaries.length; a++) {
      for (let b = a + 1; b < primaries.length; b++) {
        if (primaries[a].pos.distanceTo(primaries[b].pos) < BOUNDS * 1.2) {
          edgeList.push({
            key: `e-${a}-${b}`,
            start: primaries[a].pos.clone(),
            end:   primaries[b].pos.clone(),
          });
        }
      }
    }

    stateRef.current = state;
    return { geometry: geo, material: mat, instanceData: { count: state.length }, primaryNodes: primaries, edges: edgeList };
  }, [signals]);

  // Pillar 4 — GPU disposal on unmount
  useEffect(() => {
    matRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, dt) => {
    const m = matRef.current ?? material;
    const t = clock.getElapsedTime();
    m.uniforms.uTime.value = t;

    const mesh = meshRef.current;
    if (!mesh) return;

    stateRef.current.forEach((node) => {
      node.pos.addScaledVector(node.vel, dt * node.speedScale * 60);

      const b = node.primary ? BOUNDS * 0.8 : BOUNDS;
      if (Math.abs(node.pos.x) > b) node.vel.x *= -1;
      if (Math.abs(node.pos.y) > b * 0.7) node.vel.y *= -1;
      if (Math.abs(node.pos.z) > b * 0.5) node.vel.z *= -1;

      dummy.position.copy(node.pos);
      dummy.updateMatrix();
      mesh.setMatrixAt(node.index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  const totalCount = signals.length + FIELD_COUNT;

  return (
    <>
      {/* Pillar 1 — Single InstancedMesh draw call */}
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, totalCount]}
        frustumCulled={true}
      />

      {edges.map(e => (
        <Line
          key={e.key}
          points={[e.start, e.end]}
          color="#0096FF"
          lineWidth={0.4}
          transparent
          opacity={0.2}
        />
      ))}

      {/* Node count label */}
      <Html position={[-BOUNDS * 0.9, -BOUNDS * 0.65, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          color: 'rgba(100,160,255,0.45)',
          letterSpacing: '0.1em',
        }}>
          nodes: {totalCount}
        </div>
      </Html>
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function SignalMap({ data, signalMapData }) {
  const resolved = signalMapData ?? data;
  const signals  = Array.isArray(resolved) ? resolved : (resolved?.signals ?? []);
  const loading  = resolved?.loading ?? false;

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
        }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: 'rgba(232,244,255,0.45)', letterSpacing: '0.2em',
          }}>ACQUIRING SIGNAL</span>
        </div>
      )}
      <Canvas
        style={{ width: '100%', height: '100%', background: '#000000' }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 55, position: [0, 0, 16], near: 0.1, far: 200 }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[10, 10, 5]} intensity={0.4} />
        <Scene signals={signals} />
        <OrbitControls
          enableDamping
          enablePan={false}
          dampingFactor={0.08}
          rotateSpeed={0.5}
          minDistance={6}
          maxDistance={22}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>
    </div>
  );
}
