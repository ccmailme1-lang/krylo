/* src/spine/signalmap.jsx | WO-210 v3.1 | Three.js / R3F | PMNDRS doctrine */
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

const FIELD_NODE_COUNT = 30;
const BOUNDS = 6;

function MetadataCard({ node, hovered, setHovered }) {
  if (!node.meta) return null;
  const m = node.meta;
  const accent = '#0096ff';
  return (
    <Html position={[0, node.radius + 0.2, 0]} center transform distanceFactor={10} occlude>
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
          <span>{[...Array(5)].map((_, i) => <span key={i} style={{ color: i < node.strength ? accent : '#ddd' }}>●</span>)}</span>
        </div>
        <div style={{ opacity: 0.6 }}>wt: {m.weight} | snt: {m.sentiment}</div>
        {hovered && (
          <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <div>vel: {m.velocity} | cnt: {m.signalcount}</div>
            <div style={{ fontStyle: 'italic', marginTop: '4px' }}>&quot;{m.text.slice(0,50)}...&quot;</div>
          </div>
        )}
      </div>
    </Html>
  );
}

function SceneCore({ data }) {
  const nodesRef = useRef([]);
  const meshRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);

  const nodes = useMemo(() => {
    const results = [];
    const signals = data?.signals || [];
    signals.forEach((sig, i) => {
      results.push({
        id: `etr-${String(i+1).padStart(3,'0')}`,
        position: new THREE.Vector3((Math.random()-0.5)*8, (Math.random()-0.5)*8, (Math.random()-0.5)*4),
        velocity: new THREE.Vector3((Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02),
        strength: sig.strength,
        radius: 0.3 + (sig.strength/5)*0.5,
        phase: Math.random()*Math.PI*2,
        primary: true,
        meta: {
          text: sig.text,
          source: sig.source,
          weight: (sig.strength/5).toFixed(2),
          sentiment: ['contested','weak','mixed','aligned','confirmed'][Math.min(sig.strength,4)],
          velocity: ['dormant','cooling','stable','rising','surging'][Math.min(sig.strength,4)],
          signalcount: Math.floor(50 + sig.strength*180),
          convergence: (0.5 + sig.strength*0.1).toFixed(3)
        }
      });
    });

    for(let i=0;i<FIELD_NODE_COUNT;i++){
      results.push({
        id:`field-${i}`,
        position:new THREE.Vector3((Math.random()-0.5)*12,(Math.random()-0.5)*12,(Math.random()-0.5)*12),
        velocity:new THREE.Vector3((Math.random()-0.5)*0.05,(Math.random()-0.5)*0.05,(Math.random()-0.5)*0.05),
        strength:1,
        radius:0.08,
        phase:Math.random()*Math.PI*2,
        primary:false
      });
    }

    nodesRef.current = results;
    return results;
  }, [data]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();

    nodesRef.current.forEach((node,i)=>{
      node.position.add(node.velocity);
      if(Math.abs(node.position.x)>BOUNDS) node.velocity.x*=-1;
      if(Math.abs(node.position.y)>BOUNDS) node.velocity.y*=-1;
      if(Math.abs(node.position.z)>BOUNDS) node.velocity.z*=-1;
      const pulse = node.primary ? 1+Math.sin(time*3+node.phase)*0.12 : 1;
      tempMatrix.makeScale(pulse,pulse,pulse);
      tempMatrix.setPosition(node.position);
      if(meshRef.current) meshRef.current.setMatrixAt(i,tempMatrix);
    });

    if(meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const primaryNodes = nodes.filter(n=>n.primary);
  const fieldNodes = nodes.filter(n=>!n.primary);

  return (
    <>
      {primaryNodes.map(node=>(
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[node.radius,32,32]} />
          <meshStandardMaterial color="#0096FF" emissive="#0096FF" metalness={0.6} roughness={0.2} />
          <MetadataCard node={node} hovered={hoveredId===node.id} setHovered={v=>setHoveredId(v?node.id:null)} />
        </mesh>
      ))}
      <instancedMesh ref={meshRef} args={[undefined,undefined,fieldNodes.length]}>
        <sphereGeometry args={[0.08,16,16]} />
        <meshStandardMaterial color="#0096FF" transparent opacity={0.35} />
      </instancedMesh>
    </>
  );
}

export default function SignalMap({ data, query }) {
  return (
    <Canvas style={{ width:'100vw', height:'100vh', background:'#000000' }} gl={{ antialias:true }} camera={{ fov:60, position:[0,0,12] }}>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10,10,10]} intensity={0.6} />
      <SceneCore data={data} />
      <OrbitControls enableDamping enablePan={false} minDistance={8} maxDistance={18} autoRotate autoRotateSpeed={0.3} />
    </Canvas>
  );
}