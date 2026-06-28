import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSurface } from '../../context/SurfaceContext.jsx';
import { useClusterMeshTransition } from '../../hooks/useclustertransition.js';
const ROLL_UP_KEYWORDS = {
  'ECON-FIN':      ['economy', 'market', 'stock', 'trade', 'inflation', 'gdp', 'finance', 'bank', 'monetary', 'currency', 'rate', 'federal reserve', 'debt', 'fiscal', 'recession', 'investment', 'capital'],
  'ENV-CLIMATE':   ['climate', 'environment', 'carbon', 'emissions', 'weather', 'temperature', 'drought', 'flood', 'sea level', 'renewable', 'fossil', 'biodiversity', 'pollution', 'wildfire', 'energy'],
  'GLOBAL-HEALTH': ['health', 'pandemic', 'virus', 'disease', 'hospital', 'vaccine', 'outbreak', 'epidemic', 'medical', 'mortality', 'who', 'cdc', 'sanitation', 'pathogen'],
  'GOV-POL':       ['government', 'politics', 'election', 'policy', 'regulation', 'congress', 'senate', 'president', 'legislation', 'vote', 'party', 'administration', 'law', 'court', 'supreme'],
  'DEFENSE-SEC':   ['military', 'defense', 'security', 'war', 'conflict', 'weapon', 'nato', 'cyber', 'intelligence', 'threat', 'nuclear', 'sanction', 'geopolitic', 'attack'],
  'SUPPLY-CHAIN':  ['supply chain', 'logistics', 'shipping', 'port', 'transport', 'infrastructure', 'inventory', 'manufacturing', 'freight', 'tariff', 'import', 'export', 'semiconductor'],
  'HUMAN-RIGHTS':  ['human rights', 'labor', 'immigration', 'equity', 'discrimination', 'justice', 'refugee', 'protest', 'civil', 'social', 'inequality', 'poverty', 'gender'],
  'TECH-INFO':     ['technology', 'ai', 'artificial intelligence', 'algorithm', 'data', 'software', 'digital', 'platform', 'misinformation', 'social media', 'hack', 'silicon', 'automation'],
};

function classifyToRollUp(text) {
  const t = text.toLowerCase();
  let best = null, top = 0;
  for (const [id, kws] of Object.entries(ROLL_UP_KEYWORDS)) {
    const score = kws.reduce((n, kw) => n + (t.includes(kw) ? 1 : 0), 0);
    if (score > top) { top = score; best = id; }
  }
  return best;
}

const C = {
  high:      new THREE.Color('#8A2BE2'),
  building:  new THREE.Color('#66FF00'),
  turbulent: new THREE.Color('#007FFF'),
  low:       new THREE.Color(0.3, 0.3, 0.3),
};
const HEX = {
  high:      '#8A2BE2',
  building:  '#66FF00',
  turbulent: '#007FFF',
  low:       'rgba(255,255,255,0.3)',
};
const LABEL = {
  high:      'HIGH CONVERGENCE',
  building:  'BUILDING',
  turbulent: 'TURBULENT',
  low:       'LOW SIGNAL',
};

function buildCluster(scale) {
  const levels = [
    { count: 1, y: 4.0 * scale, r: 0 },
    { count: 4, y: 2.8 * scale, r: 0.8 * scale },
    { count: 7, y: 1.4 * scale, r: 1.6 * scale },
    { count: 10, y: 0,          r: 2.2 * scale },
  ];

  const verts = [];
  const byLevel = [];

  levels.forEach((lv) => {
    const ring = [];
    if (lv.count === 1) {
      verts.push(new THREE.Vector3(0, lv.y, 0));
      ring.push(verts.length - 1);
    } else {
      for (let i = 0; i < lv.count; i++) {
        const θ = (i / lv.count) * Math.PI * 2;
        verts.push(new THREE.Vector3(Math.cos(θ) * lv.r, lv.y, Math.sin(θ) * lv.r));
        ring.push(verts.length - 1);
      }
    }
    byLevel.push(ring);
  });

  const edges = [];

  byLevel[0].forEach(a => byLevel[1].forEach(b => edges.push([a, b])));

  for (let l = 1; l < byLevel.length - 1; l++) {
    const curr = byLevel[l];
    const next = byLevel[l + 1];
    curr.forEach((ci, i) => {
      edges.push([ci, curr[(i + 1) % curr.length]]);
      const ni = Math.round(i * next.length / curr.length) % next.length;
      edges.push([ci, next[ni]]);
      edges.push([ci, next[(ni + 1) % next.length]]);
    });
  }

  const bot = byLevel[byLevel.length - 1];
  bot.forEach((bi, i) => edges.push([bi, bot[(i + 1) % bot.length]]));

  const pos = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    pos.set([verts[a].x, verts[a].y, verts[a].z, verts[b].x, verts[b].y, verts[b].z], i * 6);
  });

  return { verts, pos, apexY: levels[0].y };
}

// WO-1303 calibration constants — Founder calibration gate (mandatory before ship)
const TACTILE_AMPLITUDE  = 0.8;   // max Y displacement in world units
const TACTILE_RADIUS_SQ  = 16.0;  // 4.0² — wave radius boundary in world units
const TACTILE_EPSILON    = 0.5;   // prevents division singularity at d=0
const TACTILE_DECAY_TAU  = 0.3;   // seconds — exponential decay time constant

function SignalCluster({ position, state, name, scale = 1, bornAt, collapseT, cursorRef, count }) {
  const color   = C[state]   || C.building;
  const hex     = HEX[state] || HEX.building;
  const label   = LABEL[state] || LABEL.building;
  const lineRef  = useRef(null);
  const groupRef = useRef(null);
  const origPos  = useRef(new THREE.Vector3(...position));
  const displacedY = useRef(0); // WO-1303: live Y displacement from tactile mutation

  const { verts, pos, apexY } = useMemo(() => buildCluster(scale), [scale]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [pos]);

  const mat = useMemo(() => new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 0,
  }), [color]);

  useFrame((_, delta) => {
    const m = lineRef.current?.material;
    const g = groupRef.current;
    if (!m || !g) return;

    const t = collapseT();

    if (t > 0) {
      // Collapse: converge position toward origin, fade opacity
      const ease = t * t * (3 - 2 * t); // smoothstep
      g.position.x = origPos.current.x * (1 - ease);
      g.position.y = origPos.current.y * (1 - ease);
      g.position.z = origPos.current.z * (1 - ease);
      m.opacity    = Math.max(0, m.opacity * (1 - ease));
      displacedY.current = 0;
      return;
    }

    // Birth fade-in
    const age    = Date.now() - (bornAt ?? Date.now());
    const target = Math.min(age / 600, 1) * 0.35;
    m.opacity   += (target - m.opacity) * 0.12;

    // WO-1303: Tactile mutation — Y-axis displacement from cursor proximity
    const cursor = cursorRef?.current;
    const targetDy = cursor
      ? (() => {
          const d2 = (cursor.x - origPos.current.x) ** 2 + (cursor.z - origPos.current.z) ** 2;
          if (d2 >= TACTILE_RADIUS_SQ) return 0;
          return Math.min(TACTILE_AMPLITUDE / (d2 + TACTILE_EPSILON), TACTILE_AMPLITUDE);
        })()
      : 0;

    // Exponential decay toward target — ~300ms ease-out
    const lerpFactor = 1 - Math.exp(-delta / TACTILE_DECAY_TAU);
    displacedY.current += (targetDy - displacedY.current) * lerpFactor;
    g.position.y = displacedY.current;
  });

  return (
    <group ref={groupRef} position={position}>
      <lineSegments ref={lineRef} geometry={geo} material={mat} />
      {verts.map((v, i) => (
        <mesh key={i} position={v}>
          <sphereGeometry args={[i === 0 ? 0.09 * scale : 0.04 * scale, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <Html position={[0, apexY + 0.6, 0]} center>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>{name}</div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: hex, marginTop: '3px' }}>{label}</div>
        </div>
      </Html>
    </group>
  );
}

// Orbital camera: slow ambient drift in idle, accelerates on search submit
function AmbientCamera({ searchState }) {
  const { camera } = useThree();
  const angleRef   = useRef(0);
  const RADIUS     = 12;

  useFrame((_, delta) => {
    const isActive = searchState?.isActive;
    // V drives orbit speed: ambient 0.20, scanning 0.80
    const speed = isActive ? 0.8 : 0.15;
    angleRef.current += delta * speed;

    const targetY = isActive ? 3 : 6;
    camera.position.x = Math.sin(angleRef.current) * RADIUS;
    camera.position.z = Math.cos(angleRef.current) * RADIUS;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 1, 0);
  });

  return null;
}

const DEFAULTS = [
  { id: 'ECON-FIN',      name: 'Economics & Finance',       state: 'building', position: [ 4.00, 0,  0    ], scale: 0.54, born: 0 },
  { id: 'ENV-CLIMATE',   name: 'Environment & Climate',     state: 'building', position: [ 2.83, 0,  2.83 ], scale: 0.32, born: 0 },
  { id: 'GLOBAL-HEALTH', name: 'Global & Public Health',    state: 'building', position: [ 0,    0,  4.00 ], scale: 0.43, born: 0 },
  { id: 'GOV-POL',       name: 'Government & Politics',     state: 'building', position: [-2.83, 0,  2.83 ], scale: 0.57, born: 0 },
  { id: 'DEFENSE-SEC',   name: 'Defense & Security',        state: 'building', position: [-4.00, 0,  0    ], scale: 0.37, born: 0 },
  { id: 'SUPPLY-CHAIN',  name: 'Supply Chain & Logistics',  state: 'building', position: [-2.83, 0, -2.83 ], scale: 0.48, born: 0 },
  { id: 'HUMAN-RIGHTS',  name: 'Human Rights & Equity',     state: 'building', position: [ 0,    0, -4.00 ], scale: 0.29, born: 0 },
  { id: 'TECH-INFO',     name: 'Technology & Info',         state: 'building', position: [ 2.83, 0, -2.83 ], scale: 0.52, born: 0 },
];

// WO-1303: lives inside R3F scene so it has camera access via useThree.
// Cursor position arrives via postMessage from krylo-feed.html (iframe cannot
// bubble mousemove to the parent window — postMessage is the only bridge).
// Falls back to window.mousemove for any surface outside the iframe.
function CursorTracker({ cursorPos }) {
  const { camera } = useThree();

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const plane     = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit       = new THREE.Vector3();

    function project(clientX, clientY) {
      mouse.x =  (clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        cursorPos.current.copy(hit);
      }
    }

    function onMessage(e) {
      if (e.data?.type === 'krylo-cursor') {
        project(e.data.x, e.data.y);
      } else if (e.data?.type === 'krylo-cursor-leave') {
        cursorPos.current.set(1e9, 0, 1e9);
      }
    }

    function onMove(e) { project(e.clientX, e.clientY); }
    function onLeave()  { cursorPos.current.set(1e9, 0, 1e9); }

    window.addEventListener('message',    onMessage);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('message',    onMessage);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [camera, cursorPos]);

  return null;
}

export default function ClusterField({ signals, countSignals, searchState, onTransitionComplete }) {
  const { topology } = useSurface();
  const { collapseT } = useClusterMeshTransition({
    isActive: searchState?.isActive ?? false,
    onDone:   onTransitionComplete,
  });

  // WO-1303: world-space cursor position — populated by CursorTracker
  const cursorPos = useRef(new THREE.Vector3());

  // Real signal count per Cognitive Roll-Up category
  const categoryCounts = useMemo(() => {
    if (!countSignals?.length) return {};
    const counts = {};
    countSignals.forEach(s => {
      const text = s.text || s.truth_statement || s.title || s.id || '';
      const cat = classifyToRollUp(text);
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [countSignals]);

  // No signals = category macro view (DEFAULTS). Signals provided = live signal clusters.
  const clusters = useMemo(() => {
    if (!signals?.length) {
      const counts = DEFAULTS.map(d => categoryCounts[d.id] ?? 0);
      const maxCount = Math.max(1, ...counts);
      const stateFromCount = (count) => {
        if (count === 0) return 'low';
        const ratio = count / maxCount;
        if (ratio > 0.6) return 'high';
        if (ratio > 0.25) return 'turbulent';
        return 'building';
      };
      return DEFAULTS.map((d, i) => ({
        ...d,
        count: counts[i],
        state: stateFromCount(counts[i]),
        scale: counts[i] > 0
          ? 0.32 + (counts[i] / maxCount) * 0.25
          : d.scale,
      }));
    }
    const source = topology?.length ? topology : signals;
    if (source?.length) {
      return source.slice(0, 8).map((s, i, arr) => {
        const angle = (i / arr.length) * Math.PI * 2;
        const r     = 2.5 + (i % 3) * 0.9;
        return {
          id:       s.id       ?? `sig-${i}`,
          name:     s.name     || s.text || s.truth_statement || s.title || s.id,
          state:    s.state    || s.convergenceState || 'building',
          position: s.position ?? [s.x ?? Math.cos(angle) * r, 0, s.z ?? Math.sin(angle) * r],
          scale:    Math.max(0.6, Math.min(1.4, s.strength != null ? s.strength / 5 : (s.fs ?? 0.7) * 1.3)),
          born:     s.born     ?? Date.now(),
          count:    categoryCounts[s.id] ?? categoryCounts[s.cat_id] ?? null,
        };
      });
    }
    return DEFAULTS.map(d => ({ ...d, count: categoryCounts[d.id] ?? 0 }));
  }, [topology, signals, categoryCounts]);

  return (
    <>
      <AmbientCamera searchState={searchState} />
      <CursorTracker cursorPos={cursorPos} />
      <group>
        {clusters.map(c => (
          <SignalCluster
            key={c.id}
            position={c.position}
            state={c.state}
            name={c.name}
            scale={c.scale}
            bornAt={c.born}
            collapseT={collapseT}
            cursorRef={cursorPos}
            count={c.count}
          />
        ))}
      </group>
    </>
  );
}
