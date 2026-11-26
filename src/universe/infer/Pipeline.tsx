import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import { surfaceMaps } from "../textures";
import { makePulseMaterial, wallScreenTexture } from "./materials";
import { FCAPS, INFER, type StationId } from "./data";
import { tour } from "./store";
import { orbit } from "../ui/orbit";
import { BACK_WALL_Z, ROW_X } from "./Hall";
import type { Quality } from "../post";

/* ----------------------------- shared materials ----------------------------- */

let mats: ReturnType<typeof buildMats> | null = null;
function useMats() {
  return (mats ??= buildMats());
}
function buildMats() {
  const brushed = surfaceMaps({ base: 0.26, variation: 0.12, smudges: 10, scratches: 260, brushed: 12, normalStrength: 1.2, seed: 81, repeat: [4, 1] });
  const dark = surfaceMaps({ base: 0.45, variation: 0.2, smudges: 14, scratches: 300, normalStrength: 1.8, seed: 82, repeat: [2, 2] });
  return {
    alu: new THREE.MeshPhysicalMaterial({ color: "#c3cad4", metalness: 1, roughness: 1, roughnessMap: brushed.roughness, normalMap: brushed.normal, normalScale: new THREE.Vector2(0.3, 0.3), anisotropy: 0.8 }),
    gun: new THREE.MeshPhysicalMaterial({ color: "#1c212b", metalness: 0.9, roughness: 1, roughnessMap: dark.roughness, normalMap: dark.normal, normalScale: new THREE.Vector2(0.45, 0.45), clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    sleeve: new THREE.MeshPhysicalMaterial({ color: "#a9c4ff", metalness: 0, roughness: 0.12, transmission: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false }),
    node: new THREE.MeshBasicMaterial({ color: new THREE.Color("#9cc2ff").multiplyScalar(2.4), toneMapped: false }),
  };
}

/* --------------------------------- fibres --------------------------------- */

type FibreSpec = { points: [number, number, number][]; color: string; speed?: number; density?: number; offset?: number; radius?: number };

function Fibre({ spec, quality }: { spec: FibreSpec; quality: Quality }) {
  const m = useMats();
  const { core, sleeve } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(spec.points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    const segs = Math.max(48, Math.round(curve.getLength() * 24));
    const r = spec.radius ?? 0.011;
    return {
      core: new THREE.TubeGeometry(curve, segs, r, 8, false),
      sleeve: new THREE.TubeGeometry(curve, segs, r * 2.6, 12, false),
    };
  }, [spec]);
  const mat = useMemo(
    () => makePulseMaterial({ color: spec.color, speed: spec.speed ?? 0.5, density: spec.density ?? 7, offset: spec.offset ?? 0 }),
    [spec],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = tour.reducedMotion ? 0 : s.clock.elapsedTime;
  });
  return (
    <group>
      <mesh geometry={core} material={mat} />
      {quality === "high" && <mesh geometry={sleeve} material={m.sleeve} />}
    </group>
  );
}

const Y = 0.05; // fibre height above floor (in a shallow trench)

const STATION_Z = { ingress: 1.0, phi2: -2.2, mistral: -5.4, deepseek: -8.8, storage: -12.4 };
const TANK_X = [-1.7, 0, 1.7];
const LANE_COLORS = ["#3b82f6", "#22d3ee", "#8b5cf6", "#93c5fd", "#a78bfa"];

function useFibres(): FibreSpec[] {
  return useMemo(() => {
    const f: FibreSpec[] = [];
    // network → log engine: fibres leave both cable trays, run along the ceiling
    // (above every camera position) and drop vertically onto the engine
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const z0 = -1.5 - k * 2.2;
        const xOff = side * (0.18 + k * 0.07);
        f.push({
          points: [
            [side * (ROW_X - 0.15), 2.64, z0],
            [side * (ROW_X - 0.5), 3.15, z0 + 0.2],
            [side * 1.8, 3.35, z0 + 0.4],
            [xOff * 2.2, 3.35, STATION_Z.ingress - 0.25],
            [xOff, 2.9, STATION_Z.ingress - 0.05],
            [xOff, 0.74, STATION_Z.ingress - 0.05],
          ],
          color: "#bfe3ff",
          speed: 0.45,
          density: 9,
          offset: k * 0.37 + (side > 0 ? 0.5 : 0),
          radius: 0.009,
        });
      }
    }
    // log engine → Phi-2: a bundle of three
    for (let k = -1; k <= 1; k++) {
      f.push({ points: [[k * 0.06, Y, STATION_Z.ingress - 0.4], [k * 0.08, Y, -0.6], [k * 0.06, Y, STATION_Z.phi2 + 0.55]], color: "#bfe3ff", speed: 0.6, density: 10, offset: k });
    }
    // Phi-2 → five FCAPS lanes → Mistral
    FCAPS.forEach((_, i) => {
      const x = (i - 2) * 0.55;
      f.push({
        points: [
          [0, Y, STATION_Z.phi2 - 0.55],
          [x * 0.6, Y, STATION_Z.phi2 - 1.0],
          [x, Y, STATION_Z.phi2 - 1.6],
          [x * 0.6, Y, STATION_Z.mistral + 1.0],
          [0, Y, STATION_Z.mistral + 0.6],
        ],
        color: LANE_COLORS[i],
        speed: 0.42 + i * 0.03,
        density: 8,
        offset: i * 0.21,
      });
    });
    // Mistral → DeepSeek
    for (let k = -1; k <= 1; k++) {
      f.push({ points: [[k * 0.06, Y, STATION_Z.mistral - 0.6], [k * 0.12, Y, -7.1], [k * 0.06, Y, STATION_Z.deepseek + 0.7]], color: "#c4b5fd", speed: 0.5, density: 7, offset: k * 0.4 });
    }
    // DeepSeek → storage tanks
    TANK_X.forEach((x, i) => {
      f.push({
        points: [[0, Y, STATION_Z.deepseek - 0.7], [x * 0.5, Y, -10.4], [x, Y, STATION_Z.storage + 0.75]],
        color: i === 0 ? "#93c5fd" : i === 1 ? "#22d3ee" : "#a78bfa",
        speed: 0.5,
        density: 7,
        offset: i * 0.3,
      });
    });
    // TimescaleDB → forecaster (up the back)
    f.push({ points: [[1.7, 0.3, STATION_Z.storage + 0.42], [2.2, Y, -12.0], [2.85, Y, -11.85], [2.94, 0.06, -11.78]], color: "#a78bfa", speed: 0.35, density: 5, radius: 0.009 });
    return f;
  }, []);
}

/* --------------------------- clickable station shell --------------------------- */

function Clickable({ id, children }: { id: StationId; children: React.ReactNode }) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (orbit.wasDrag()) return; // the end of a rotate-drag is not a selection
        tour.goTo(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        tour.setHovered(id);
      }}
      onPointerOut={() => tour.setHovered(null)}
    >
      {children}
    </group>
  );
}

/** True while this station is framed by the camera or under the pointer. */
function useActive(id: StationId) {
  const read = () => tour.station.id === id || tour.hovered === id;
  const [a, setA] = useState(read);
  useEffect(() => tour.subscribe(() => setA(read())), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return a;
}

function Label({ station, position, title, sub }: { station: StationId; position: [number, number, number]; title: string; sub: string }) {
  const active = useActive(station);
  return (
    <Html position={position} center distanceFactor={3.8} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <div
        className="whitespace-nowrap text-center transition-opacity duration-500"
        style={{ opacity: active ? 1 : 0 }}
      >
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-slate-100">{title}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">{sub}</div>
      </div>
    </Html>
  );
}

/* ------------------------------- model pods ------------------------------- */

/** Machined pedestal + glass chamber with a layered neural lattice inside. */
function ModelPod({ id, z, scale, layers, accent, title, sub, quality }: { id: StationId; z: number; scale: number; layers: number; accent: string; title: string; sub: string; quality: Quality }) {
  const m = useMats();
  const s = scale;
  const chamberH = 0.75 * s;
  const baseH = 0.42 * s;
  const r = 0.4 * s;

  // Machined housing: lathe profile with stepped bands.
  const housing = useMemo(() => {
    const p: THREE.Vector2[] = [];
    const steps: [number, number][] = [
      [0, 0],
      [r * 1.12, 0],
      [r * 1.12, baseH * 0.18],
      [r * 1.04, baseH * 0.22],
      [r * 1.04, baseH * 0.55],
      [r * 1.1, baseH * 0.6],
      [r * 1.1, baseH * 0.9],
      [r * 1.02, baseH],
      [0, baseH],
    ];
    steps.forEach(([x, y]) => p.push(new THREE.Vector2(x, y)));
    return new THREE.LatheGeometry(p, 96);
  }, [r, baseH]);
  const cap = useMemo(() => {
    const p = [
      [0, 0],
      [r * 1.04, 0],
      [r * 1.04, 0.05 * s],
      [r * 0.9, 0.09 * s],
      [r * 0.5, 0.11 * s],
      [0, 0.11 * s],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 96);
  }, [r, s]);

  // Neural lattice: rings of nodes per layer + links between adjacent layers.
  const lattice = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    const perLayer: number[] = [];
    for (let l = 0; l < layers; l++) {
      const n = 6 + Math.round(Math.sin((l / Math.max(1, layers - 1)) * Math.PI) * 6);
      perLayer.push(n);
      const y = baseH + 0.1 * s + (l / Math.max(1, layers - 1)) * (chamberH - 0.2 * s);
      const rr = r * (0.45 + 0.35 * Math.sin((l / Math.max(1, layers - 1)) * Math.PI));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + l * 0.4;
        nodes.push(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr));
      }
    }
    const links: number[] = [];
    let start = 0;
    for (let l = 0; l < layers - 1; l++) {
      const a0 = start;
      const a1 = start + perLayer[l];
      for (let i = 0; i < perLayer[l]; i++) {
        for (let k = 0; k < 2; k++) {
          const j = a1 + ((i * 2 + k) % perLayer[l + 1]);
          const A = nodes[a0 + i];
          const B = nodes[j];
          links.push(A.x, A.y, A.z, B.x, B.y, B.z);
        }
      }
      start = a1;
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(links, 3));
    return { nodes, lines: lg };
  }, [layers, r, s, baseH, chamberH]);

  const nodeRef = useRef<THREE.InstancedMesh>(null);
  const spin = useRef<THREE.Group>(null);
  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.014 * s, 10, 8), [s]);
  useLayoutEffect(() => {
    const im = nodeRef.current;
    if (!im) return;
    const o = new THREE.Object3D();
    lattice.nodes.forEach((p, i) => {
      o.position.copy(p);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, new THREE.Color(accent).multiplyScalar(2));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [lattice, accent]);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(0.55), transparent: true, opacity: 0.55, toneMapped: false }), [accent]);
  const tick = useRef(0);
  useFrame((st, dt) => {
    if (spin.current && !tour.reducedMotion) spin.current.rotation.y += dt * 0.12;
    const im = nodeRef.current;
    tick.current += dt;
    if (!im || !im.instanceColor || tick.current < 0.08) return;
    tick.current = 0;
    // "firing" nodes: brief brightening travelling up the layers
    const t = st.clock.elapsedTime;
    const base = new THREE.Color(accent);
    lattice.nodes.forEach((p, i) => {
      const wave = Math.sin(t * 2.2 - p.y * 9 + i * 0.7);
      im.setColorAt(i, base.clone().multiplyScalar(wave > 0.92 ? 6 : 1.4));
    });
    im.instanceColor.needsUpdate = true;
  });

  const hovered = useHovered(id);

  return (
    <Clickable id={id}>
      <group position={[0, 0, z]}>
        <RoundedBox args={[1.25 * s, 0.08, 1.25 * s]} radius={0.02} smoothness={3} position={[0, 0.04, 0]} material={m.gun} receiveShadow castShadow />
        <mesh geometry={housing} material={m.alu} position={[0, 0.08, 0]} castShadow receiveShadow />
        {/* emissive status band */}
        <mesh position={[0, 0.08 + baseH * 0.4, 0]}>
          <torusGeometry args={[r * 1.045, 0.004 * s, 6, 128]} />
          <meshBasicMaterial color={new THREE.Color(accent).multiplyScalar(hovered ? 4 : 1.8)} toneMapped={false} />
        </mesh>
        {/* glass chamber */}
        <mesh position={[0, 0.08 + baseH + chamberH / 2, 0]}>
          <cylinderGeometry args={[r, r, chamberH, 64, 1, true]} />
          {/* thin-wall glass: reflective clearcoat + low opacity (a refraction pass per pod costs a full scene render) */}
          <meshPhysicalMaterial
            color="#c4d6f8"
            metalness={0}
            roughness={0.05}
            transparent
            opacity={quality === "high" ? 0.2 : 0.16}
            clearcoat={1}
            clearcoatRoughness={0.04}
            envMapIntensity={1.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <group ref={spin} position={[0, 0.08, 0]}>
          <instancedMesh ref={nodeRef} args={[nodeGeo, undefined, lattice.nodes.length]}>
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>
          <lineSegments geometry={lattice.lines} material={lineMat} />
        </group>
        <mesh geometry={cap} material={m.alu} position={[0, 0.08 + baseH + chamberH, 0]} castShadow />
        <Label station={id} position={[0, 0.08 + baseH + chamberH + 0.38 * s, 0]} title={title} sub={sub} />
      </group>
    </Clickable>
  );
}

function useHovered(id: StationId) {
  const [h, setH] = useState(false);
  useEffect(() => tour.subscribe(() => setH(tour.hovered === id)), [id]);
  return h;
}

/* --------------------------- Go synthetic log engine --------------------------- */

function LogEngine() {
  const m = useMats();
  const vents = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  const hovered = useHovered("ingress");
  return (
    <Clickable id="ingress">
      <group position={[0, 0, STATION_Z.ingress]}>
        <RoundedBox args={[1.0, 0.72, 0.78]} radius={0.035} smoothness={4} position={[0, 0.36, 0]} material={m.gun} castShadow receiveShadow />
        {/* machined aluminium front plate with vent slots */}
        <RoundedBox args={[0.86, 0.5, 0.03]} radius={0.01} smoothness={3} position={[0, 0.4, 0.4]} material={m.alu} />
        {vents.map((i) => (
          <mesh key={i} position={[-0.3 + i * 0.075, 0.44, 0.417]}>
            <boxGeometry args={[0.03, 0.26, 0.006]} />
            <meshStandardMaterial color="#05070c" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0.418]}>
          <boxGeometry args={[0.6, 0.012, 0.004]} />
          <meshBasicMaterial color={new THREE.Color("#bfe3ff").multiplyScalar(hovered ? 4 : 2)} toneMapped={false} />
        </mesh>
        <Label station="ingress" position={[0, 1.05, 0]} title="Go · log engine" sub="Synthetic telemetry" />
      </group>
    </Clickable>
  );
}

/* --------------------------------- storage --------------------------------- */

function Tank({ x, title, sub, children }: { x: number; title: string; sub: string; children: React.ReactNode }) {
  const m = useMats();
  return (
    <group position={[x, 0, STATION_Z.storage]}>
      <RoundedBox args={[1.05, 0.1, 1.05]} radius={0.02} smoothness={3} position={[0, 0.05, 0]} material={m.gun} castShadow receiveShadow />
      <mesh position={[0, 0.2, 0]} material={m.alu} castShadow>
        <cylinderGeometry args={[0.46, 0.48, 0.2, 64]} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 1.4, 64, 1, true]} />
        <meshPhysicalMaterial color="#c8d8f8" metalness={0} roughness={0.06} transparent opacity={0.14} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.76, 0]} material={m.alu} castShadow>
        <cylinderGeometry args={[0.44, 0.46, 0.12, 64]} />
      </mesh>
      {children}
      <Label station="storage" position={[0, 2.12, 0]} title={title} sub={sub} />
    </group>
  );
}

/** FAISS: a clustered point cloud standing in for the vector index. */
function VectorCloud() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const centres = Array.from({ length: 7 }, () => new THREE.Vector3((rnd() - 0.5) * 0.45, 0.45 + rnd() * 1.0, (rnd() - 0.5) * 0.45));
    const pts: number[] = [];
    for (let i = 0; i < 2600; i++) {
      const c = centres[i % centres.length];
      const p = new THREE.Vector3(c.x + gauss() * 0.06, c.y + gauss() * 0.08, c.z + gauss() * 0.06);
      if (Math.hypot(p.x, p.z) > 0.38 || p.y < 0.36 || p.y > 1.66) continue;
      pts.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (ref.current && !tour.reducedMotion) ref.current.rotation.y += dt * 0.08;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.012} sizeAttenuation color={new THREE.Color("#9cc2ff").multiplyScalar(2.2)} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

/** Redis: a stack of fast-spinning machined rings (in-memory cache). */
function CacheRings() {
  const m = useMats();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => {
    if (tour.reducedMotion) return;
    refs.current.forEach((r, i) => r && (r.rotation.y += dt * (1.4 + i * 0.5) * (i % 2 ? -1 : 1)));
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[0, 0.5 + i * 0.2, 0]} material={i % 2 ? m.alu : m.gun}>
          <torusGeometry args={[0.28 - (i % 2) * 0.04, 0.022, 16, 96]} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.3, 8]} />
        <meshBasicMaterial color={new THREE.Color("#22d3ee").multiplyScalar(2.5)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** TimescaleDB: stacked time-slices whose radii scroll upward like a rolling series. */
function TimeSlices() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 26;
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 0.012, 48), []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#8b7bd8", metalness: 0.7, roughness: 0.3, emissive: new THREE.Color("#5b3fd6"), emissiveIntensity: 0.6 }), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    const im = ref.current;
    if (!im) return;
    const t = tour.reducedMotion ? 0 : st.clock.elapsedTime * 0.6;
    for (let i = 0; i < N; i++) {
      const v = 0.5 + 0.25 * Math.sin((i + t * 4) * 0.55) + 0.12 * Math.sin((i + t * 4) * 1.7);
      o.position.set(0, 0.42 + i * 0.048, 0);
      o.scale.set(0.12 + v * 0.24, 1, 0.12 + v * 0.24);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, N]} />;
}

function Storage() {
  return (
    <Clickable id="storage">
      <Tank x={TANK_X[0]} title="FAISS" sub="Vector index">
        <VectorCloud />
      </Tank>
      <Tank x={TANK_X[1]} title="Redis" sub="Cache">
        <CacheRings />
      </Tank>
      <Tank x={TANK_X[2]} title="TimescaleDB" sub="Time series">
        <TimeSlices />
      </Tank>
    </Clickable>
  );
}

/* ------------------------------ forecaster panel ------------------------------ */

function ForecastPanel() {
  const m = useMats();
  const tex = useMemo(() => {
    const W = 1400;
    const H = 420;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#03050c";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(150,180,255,0.08)";
    for (let x = 60; x < W; x += 70) {
      g.beginPath();
      g.moveTo(x, 40);
      g.lineTo(x, H - 50);
      g.stroke();
    }
    // forecast horizon band (2–6 h of a 10 h axis), drawn honestly as a band only
    const xAt = (h: number) => 60 + ((W - 120) * (h + 4)) / 10; // -4h..+6h
    g.fillStyle = "rgba(139,92,246,0.16)";
    g.fillRect(xAt(2), 40, xAt(6) - xAt(2), H - 90);
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(xAt(0), 40);
    g.lineTo(xAt(0), H - 50);
    g.stroke();
    g.setLineDash([]);
    // illustrative signal
    g.strokeStyle = "#9cc2ff";
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 60; x <= xAt(0); x += 4) {
      const t = x / 60;
      const y = 230 + Math.sin(t * 0.9) * 40 + Math.sin(t * 2.7) * 14;
      if (x === 60) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = "#c4b5fd";
    g.setLineDash([10, 8]);
    g.beginPath();
    for (let x = xAt(0); x <= W - 60; x += 4) {
      const t = x / 60;
      const y = 230 + Math.sin(t * 0.9) * 40 + Math.sin(t * 2.7) * 14 - Math.max(0, x - xAt(2.5)) * 0.18;
      if (x === xAt(0)) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.setLineDash([]);
    g.font = "500 22px 'JetBrains Mono', monospace";
    g.fillStyle = "rgba(200,215,240,0.75)";
    g.fillText("LSTM ANOMALY FORECAST  ·  F1 86.4%", 60, 30);
    g.fillStyle = "rgba(196,181,253,0.9)";
    g.fillText("2–6 H USEFUL HORIZON", xAt(2) + 10, H - 64);
    g.fillStyle = "rgba(200,215,240,0.4)";
    g.fillText("NOW", xAt(0) + 8, H - 22);
    g.fillText("ILLUSTRATIVE SIGNAL", W - 330, H - 22);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <Clickable id="forecast">
      {/* free-standing display at the end of the right rack row, angled to the aisle */}
      <group position={[3.0, 1.75, -11.7]} rotation-y={-1.05}>
        <RoundedBox args={[2.5, 0.82, 0.07]} radius={0.02} smoothness={3} material={m.gun} position={[0, 0, -0.045]} castShadow />
        <mesh>
          <planeGeometry args={[2.4, 0.72]} />
          <meshStandardMaterial color="#000" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.15} roughness={0.25} metalness={0} />
        </mesh>
        {/* floor stand: column + weighted base */}
        <mesh material={m.alu} position={[0, -1.0, -0.1]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 1.3, 16]} />
        </mesh>
        <RoundedBox args={[0.7, 0.05, 0.45]} radius={0.015} smoothness={3} material={m.gun} position={[0, -1.725, -0.1]} receiveShadow castShadow />
      </group>
    </Clickable>
  );
}

/* ------------------------------- results wall ------------------------------- */

function WallScreen() {
  const m = useMats();
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    // draw now, then redraw once the display + mono faces are actually loaded
    setTex(wallScreenTexture(INFER.metrics, INFER.baseline));
    Promise.all([
      document.fonts.load("800 190px 'Big Shoulders Display'"),
      document.fonts.load("500 30px 'JetBrains Mono'"),
    ])
      .then(() => alive && setTex(wallScreenTexture(INFER.metrics, INFER.baseline)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <group position={[0, 3.75, BACK_WALL_Z + 0.06]}>
      <RoundedBox args={[6.7, 2.2, 0.1]} radius={0.03} smoothness={3} material={m.gun} position={[0, 0, -0.03]} />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[6.5, 2.03]} />
        <meshStandardMaterial color="#000" emissive="#ffffff" emissiveMap={tex ?? undefined} emissiveIntensity={tex ? 1.0 : 0} roughness={0.3} metalness={0} />
      </mesh>
      {/* the screen spills a little cool light into the room */}
      <rectAreaLight position={[0, 0, 0.2]} rotation-y={Math.PI} width={6.4} height={2} intensity={1.6} color="#7ea2ff" />
    </group>
  );
}

/* --------------------------------- assembly --------------------------------- */

export function Pipeline({ quality }: { quality: Quality }) {
  const fibres = useFibres();
  return (
    <group>
      {fibres.map((f, i) => (
        <Fibre key={i} spec={f} quality={quality} />
      ))}
      <LogEngine />
      <ModelPod id="phi2" z={STATION_Z.phi2} scale={0.85} layers={3} accent="#22d3ee" title="Phi-2" sub="Classify · FCAPS" quality={quality} />
      <ModelPod id="mistral" z={STATION_Z.mistral} scale={1.0} layers={5} accent="#60a5fa" title="Mistral 7B" sub="Summarise" quality={quality} />
      <ModelPod id="deepseek" z={STATION_Z.deepseek} scale={1.18} layers={7} accent="#a78bfa" title="DeepSeek R1 8B" sub="Deep reasoning" quality={quality} />
      {FCAPS.map((name, i) => (
        <Label key={name} station="phi2" position={[(i - 2) * 0.55, 0.22, STATION_Z.phi2 - 1.6]} title={name[0]} sub={name} />
      ))}
      <Storage />
      <ForecastPanel />
      <WallScreen />
    </group>
  );
}
