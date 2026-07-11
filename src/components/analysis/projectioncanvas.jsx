// WO-1318 — ProjectionCanvas: 40-year topological projection (R3F)
// Consumes SpatialFrame snapshot — never reads live DOM coordinates directly
import React, { useMemo } from 'react';
import { useCanvasGuard } from '../../utils/webglcontextguard.js';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRenderStore } from '../../store/userenderstore.js';

// ── Primary vector control points (normalized Y: 1.0 = peak capital) ─────────
// Athlete lens: compressed earn window, long liability tail
const BASE_CURVE_POINTS = [
  [0,    0.30],  // t=0  — current position
  [0.08, 0.72],  // t=3  — early career peak
  [0.15, 1.00],  // t=6  — absolute peak (contract years)
  [0.28, 0.62],  // t=11 — post-peak transition
  [0.40, 0.30],  // t=16 — career cliff
  [0.55, 0.18],  // t=22 — liability drag
  [0.70, 0.12],  // t=28 — liquidity floor
  [0.85, 0.08],  // t=34 — long tail
  [1.00, 0.06],  // t=40 — terminus
];

const EVENT_HORIZONS = [
  { t: 0.15, label: 'PEAK EARN',       color: '#66FF00' },
  { t: 0.28, label: 'TRANSITION',      color: '#ffffff' },
  { t: 0.40, label: 'CAREER CLIFF',    color: '#FF3300' },
  { t: 0.55, label: 'LIABILITY MAX',   color: '#FF3300' },
  { t: 0.70, label: 'LIQUIDITY FLOOR', color: '#FF3300' },
];

const X_RANGE = [-5, 5]; // world-space X mapping for t=[0,1]
const Y_SCALE = 3;       // world-space Y amplitude

function tToX(t) { return X_RANGE[0] + t * (X_RANGE[1] - X_RANGE[0]); }
function yToW(y) { return (y - 0.5) * Y_SCALE; }

// ── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ playhead, fractureScore }) {
  const frame       = useRenderStore((s) => s.activeSpatialFrame);
  const tensionFactor = 1.0 + frame.globalTensionSpike;

  const bandRadius = 0.08 + fractureScore * 0.18 * tensionFactor;

  // Build primary vector points
  const primaryPoints = useMemo(
    () => BASE_CURVE_POINTS.map(([t, y]) => new THREE.Vector3(tToX(t), yToW(y), 0)),
    [],
  );

  // Variance band tube
  const varianceCurve  = useMemo(() => new THREE.CatmullRomCurve3(primaryPoints), [primaryPoints]);
  const varianceGeom   = useMemo(
    () => new THREE.TubeGeometry(varianceCurve, 60, bandRadius, 10, false),
    [varianceCurve, bandRadius],
  );

  // Outer uncertainty envelope (wider, more transparent)
  const outerGeom = useMemo(
    () => new THREE.TubeGeometry(varianceCurve, 60, bandRadius * 2.4, 10, false),
    [varianceCurve, bandRadius],
  );

  // Playhead X
  const playheadX = tToX(playhead / 40);
  const playheadPoints = [
    new THREE.Vector3(playheadX, yToW(-0.2), 0),
    new THREE.Vector3(playheadX, yToW(1.3),  0),
  ];

  // Horizontal axis
  const axisPoints = [
    new THREE.Vector3(X_RANGE[0], yToW(0), 0),
    new THREE.Vector3(X_RANGE[1], yToW(0), 0),
  ];

  // Grid lines (vertical time markers every 4 years)
  const gridLines = useMemo(() => {
    const lines = [];
    for (let yr = 0; yr <= 40; yr += 4) {
      const x = tToX(yr / 40);
      lines.push([
        new THREE.Vector3(x, yToW(-0.15), 0),
        new THREE.Vector3(x, yToW(1.15),  0),
      ]);
    }
    return lines;
  }, []);

  return (
    <>
      <color attach="background" args={['#030303']} />

      {/* Time grid */}
      {gridLines.map((pts, i) => (
        <Line key={i} points={pts} color="#1a1a1a" lineWidth={0.6} />
      ))}

      {/* Axis */}
      <Line points={axisPoints} color="#2a2a2a" lineWidth={0.8} />

      {/* Outer uncertainty envelope */}
      <mesh geometry={outerGeom}>
        <meshBasicMaterial color="#66FF00" transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Variance band */}
      <mesh geometry={varianceGeom}>
        <meshBasicMaterial color="#66FF00" transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Primary vector */}
      <Line points={primaryPoints} color="#66FF00" lineWidth={2} />

      {/* Event horizon markers */}
      {EVENT_HORIZONS.map(({ t, label, color }) => {
        const x  = tToX(t);
        const py = BASE_CURVE_POINTS.reduce((closest, [ct, cy]) =>
          Math.abs(ct - t) < Math.abs(closest[0] - t) ? [ct, cy] : closest, BASE_CURVE_POINTS[0],
        )[1];
        return (
          <group key={label} position={[x, yToW(py), 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Line
              points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.5, 0)]}
              color={color}
              lineWidth={0.8}
            />
          </group>
        );
      })}

      {/* Playhead */}
      <Line points={playheadPoints} color="rgba(255,255,255,0.3)" lineWidth={1} />
      <mesh position={[playheadX, yToW(1.3), 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="rgba(255,255,255,0.5)" />
      </mesh>
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProjectionCanvas({ playhead = 0, fractureScore = 1.8 }) {
  const onCanvasCreated = useCanvasGuard();
  return (
    <Canvas
      camera={{ position: [0, 0.8, 9], fov: 48 }}
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: true }}
      onCreated={onCanvasCreated}
    >
      <Scene playhead={playhead} fractureScore={fractureScore} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.8} />
    </Canvas>
  );
}
