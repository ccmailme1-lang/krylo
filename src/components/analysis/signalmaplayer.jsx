// SignalMapLayer — lightweight R3F Canvas for AnalysisField Layer 0
// Real liveSignals data. Max 20 nodes. Nodes drift + rotate independently.

import React, { useRef, useMemo } from 'react';
import { useCanvasGuard } from '../../utils/webglcontextguard.js';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const LIME  = '#66FF00';
const BLUE  = '#007FFF';
const DIM   = '#3a3d4a';
const MAX_NODES = 20;

function nodeColor(fs) {
  if (fs >= 0.75) return LIME;
  if (fs >= 0.40) return BLUE;
  return DIM;
}

function nodeDetail(fs) {
  if (fs >= 0.75) return 2;
  return 1;
}

function nodeSize(fs) {
  // Range 0.20 → 0.55 — clearly differentiated by signal strength
  return 0.20 + fs * 0.35;
}

// Fibonacci sphere — evenly distributed, deterministic
function buildPositions(count) {
  const positions = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y     = 1 - (i / Math.max(count - 1, 1)) * 2;
    const r     = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    // Spread: vary depth (z) to give genuine 3D volume feel
    const spread = 5.5 + (i % 3) * 1.2;
    positions.push([
      Math.cos(theta) * r * spread,
      y * 4.5,
      Math.sin(theta) * r * spread,
    ]);
  }
  return positions;
}

function SignalNode({ position, size, color, detail, index }) {
  const meshRef    = useRef();
  const originRef  = useRef(new THREE.Vector3(...position));

  // Deterministic per-node motion constants
  const phase = index * 1.618;
  const driftA = 0.6 + (index % 4) * 0.18;
  const driftB = 0.4 + (index % 5) * 0.12;
  const driftC = 0.35 + (index % 3) * 0.14;
  const ry = 0.003 + (index % 5) * 0.0007;
  const rx = 0.0015 + (index % 3) * 0.0005;
  const rz = 0.0007 + (index % 7) * 0.0002;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Drift: slow sinusoidal movement around origin
    const ox = originRef.current;
    meshRef.current.position.set(
      ox.x + Math.sin(t * 0.18 + phase)         * driftA,
      ox.y + Math.sin(t * 0.13 + phase * 1.3)   * driftB,
      ox.z + Math.cos(t * 0.16 + phase * 0.7)   * driftC,
    );

    // Rotation — incremental, each axis independent
    meshRef.current.rotation.y += ry + Math.sin(t * 0.3 + phase) * 0.0006;
    meshRef.current.rotation.x += rx + Math.cos(t * 0.25 + phase) * 0.0003;
    meshRef.current.rotation.z += rz * Math.sin(t * 0.2 + phase);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[size, detail]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

function Scene({ nodes, controlsRef }) {
  return (
    <>
      <color attach="background" args={['#09090b']} />
      <fog attach="fog" args={['#09090b', 20, 42]} />

      {nodes.map((n, i) => (
        <SignalNode
          key={n.id}
          position={n.position}
          size={n.size}
          color={n.color}
          detail={n.detail}
          index={i}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
      />
    </>
  );
}

export default function SignalMapLayer({ signals = [] }) {
  const controlsRef = useRef();
  const onCanvasCreated = useCanvasGuard();

  const nodes = useMemo(() => {
    const top = [...signals]
      .sort((a, b) => (b.fs ?? 0) - (a.fs ?? 0))
      .slice(0, MAX_NODES);

    const positions = buildPositions(Math.max(top.length, 1));

    return top.map((sig, i) => ({
      id:       sig.id ?? i,
      label:    sig.text ?? '—',
      position: positions[i],
      size:     nodeSize(sig.fs ?? 0.3),
      color:    nodeColor(sig.fs ?? 0),
      detail:   nodeDetail(sig.fs ?? 0),
      fs:       sig.fs ?? 0,
    }));
  }, [signals]);

  return (
    <Canvas
      camera={{ position: [0, 4, 16], fov: 52 }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
      style={{ background: '#09090b' }}
      onCreated={onCanvasCreated}
    >
      <Scene nodes={nodes} controlsRef={controlsRef} />
    </Canvas>
  );
}
