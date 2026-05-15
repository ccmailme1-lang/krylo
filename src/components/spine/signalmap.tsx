import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

const FIELD_NODE_COUNT = 30;
const BOUNDS = 6;
const PROXIMITY_THRESHOLD = 4;

function MetadataCard({ node, hovered, setHovered }) {
  if (!node.meta) return null;
  const m = node.meta;
  const accent = '#0096ff';
  return (
    <div
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '9px',
        background: 'rgba(255,255,255,0.88)',
        borderRadius: '8px',
        padding: '8px',
        width: hovered ? '220px' : '140px',
        transition: 'all 0.3s ease',
        pointerEvents: 'auto',
        border: `1px solid ${accent}22`,
        color: '#1d1d1f',
        textTransform: 'lowercase'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', color: accent }}>{node.id}</span>
        <span>
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ color: i < node.strength ? accent : '#ddd' }}>●</span>
          ))}
        </span>
      </div>
      <div style={{ opacity: 0.6 }}>wt: {m.weight} | snt: {m.sentiment}</div>
      {hovered && (
        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <div>vel: {m.velocity} | cnt: {m.signalcount}</div>
          <div style={{ fontStyle: 'italic', marginTop: '4px' }}>&quot;{m.text.slice(0, 50)}...&quot;</div>
        </div>
      )}
    </div>
  );
}

// Proximity edges — all nodes, distance threshold, opacity by distance
function ProximityEdges({ nodesRef, maxPairs = 200 }) {
  const geoRef = useRef(new THREE.BufferGeometry());
  const posArr = useRef(new Float32Array(maxPairs * 6));
  const opacArr = useRef(new Float32Array(maxPairs * 2));

  useMemo(() => {
    geoRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(posArr.current, 3)
    );
  }, []);

  useFrame(() => {
    const nodes = nodesRef.current;
    let idx = 0;
    let pairCount = 0;

    for (let i = 0; i < nodes.length && pairCount < maxPairs; i++) {
      for (let j = i + 1; j < nodes.length && pairCount < maxPairs; j++) {
        const a = nodes[i].position;
        const b = nodes[j].position;
        const dist = a.distanceTo(b);
        if (dist < PROXIMITY_THRESHOLD) {
          posArr.current[idx++] = a.x;
          posArr.current[idx++] = a.y;
          posArr.current[idx++] = a.z;
          posArr.current[idx++] = b.x;
          posArr.current[idx++] = b.y;
          posArr.current[idx++] = b.z;
          pairCount++;
        }
      }
    }

    // Zero out unused slots
    for (let k = idx; k < maxPairs * 6; k++) posArr.current[k] = 0;

    geoRef.current.attributes.position.needsUpdate = true;
    geoRef.current.setDrawRange(0, pairCount * 2);
  });

  return (
    <lineSegments geometry={geoRef.current}>
      <lineBasicMaterial color="#0096FF" transparent opacity={0.2} />
    </lineSegments>
  );
}

function SceneCore({ data }) {
  const nodesRef = useRef([]);
  const meshRef = useRef(null);
  const primaryMeshRefs = useRef([]);
  const [hoveredId, setHoveredId] = useState(null);

  const { primaryNodes, fieldNodes } = useMemo(() => {
    const results = [];
    const signals = data?.signals || [];

    // Fix — ETR-003 z corrected to 0
    const primarySpawn = [
      new THREE.Vector3(-2, 1, 0),
      new THREE.Vector3(2, -1.5, 0),
      new THREE.Vector3(0, 2.5, 0)  // was -1, now 0
    ];

    signals.forEach((sig, i) => {
      const base = primarySpawn[i] || new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        0
      );
      results.push({
        id: `etr-${String(i + 1).padStart(3, '0')}`,
        position: base.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        strength: sig.strength,
        radius: 0.3 + (sig.strength / 5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        primary: true,
        meta: {
          text: sig.text,
          source: sig.source,
          weight: (sig.strength / 5).toFixed(2),
          sentiment: ['contested', 'weak', 'mixed', 'aligned', 'confirmed'][Math.min(sig.strength, 4)],
          velocity: ['dormant', 'cooling', 'stable', 'rising', 'surging'][Math.min(sig.strength, 4)],
          signalcount: Math.floor(50 + sig.strength * 180),
          convergence: (0.5 + sig.strength * 0.1).toFixed(3)
        }
      });
    });

    for (let i = 0; i < FIELD_NODE_COUNT; i++) {
      results.push({
        id: `field-${i}`,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 4
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        ),
        strength: 1,
        radius: 0.08,
        phase: Math.random() * Math.PI * 2,
        primary: false
      });
    }

    nodesRef.current = results;
    return {
      primaryNodes: results.filter(n => n.primary),
      fieldNodes: results.filter(n => !n.primary)
    };
  }, [data]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();

    nodesRef.current.forEach((node) => {
      node.position.add(node.velocity);
      if (Math.abs(node.position.x) > BOUNDS) node.velocity.x *= -1;
      if (Math.abs(node.position.y) > BOUNDS) node.velocity.y *= -1;
      if (Math.abs(node.position.z) > BOUNDS) node.velocity.z *= -1;
    });

    // Field nodes — instanced mesh only
    fieldNodes.forEach((node, i) => {
      tempMatrix.makeScale(1, 1, 1);
      tempMatrix.setPosition(node.position);
      if (meshRef.current) meshRef.current.setMatrixAt(i, tempMatrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;

    // Primary nodes — individual refs
    primaryMeshRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const node = primaryNodes[i];
      const pulse = 1 + Math.sin(time * 3 + node.phase) * 0.12;
      ref.position.copy(node.position);
      ref.scale.setScalar(pulse);
    });
  });

  return (
    <>
      {primaryNodes.map((node, i) => (
        <mesh key={node.id} ref={el => primaryMeshRefs.current[i] = el}>
          <sphereGeometry args={[node.radius, 32, 32]} />
          <meshStandardMaterial
            color="#0096FF"
            emissive="#0096FF"
            emissiveIntensity={0.4}
            metalness={0.6}
            roughness={0.2}
          />
          <Html center={false} distanceFactor={8} zIndexRange={[100, 0]} occlude={false}>
            <div style={{ transform: 'translate(16px, -50%)' }}>
              <MetadataCard
                node={node}
                hovered={hoveredId === node.id}
                setHovered={v => setHoveredId(v ? node.id : null)}
              />
            </div>
          </Html>
        </mesh>
      ))}

      {/* Proximity edges — all nodes, distance-based, matches original */}
      <ProximityEdges nodesRef={nodesRef} maxPairs={200} />

      <instancedMesh ref={meshRef} args={[undefined, undefined, fieldNodes.length]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#0096FF" transparent opacity={0.35} />
      </instancedMesh>
    </>
  );
}

export default function SignalMap({ data, query }) {
  if (!data?.signals?.length) return null;
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: '#000000' }}
      gl={{ antialias: true }}
      camera={{ fov: 60, position: [0, 0, 12] }}
      onCreated={({ gl }) => gl.setClearColor('#000000', 1)}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 10]} intensity={0.6} />
      <SceneCore data={data} />
      <OrbitControls
        enableDamping
        enablePan={false}
        minDistance={8}
        maxDistance={18}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
}