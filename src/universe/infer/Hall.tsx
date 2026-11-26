import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { RoundedBoxGeometry } from "three-stdlib";
import { surfaceMaps } from "../textures";
import { perforationMap } from "./materials";
import type { Quality } from "../post";

/* ---- room dimensions (metres) ---- */
export const ROW_X = 3.3; // rack centre distance from aisle centre
const RACK = { depth: 1.1, height: 2.1, width: 0.6 };
const PITCH = 0.62;
const RACKS_PER_ROW = 20;
const FIRST_Z = 2.4;
const UNITS = 18; // blade slots per rack
export const BACK_WALL_Z = -14.6;

type RackSlot = { side: 1 | -1; z: number };

function useRackSlots() {
  return useMemo(() => {
    const s: RackSlot[] = [];
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < RACKS_PER_ROW; i++) s.push({ side, z: FIRST_Z - i * PITCH });
    }
    return s;
  }, []);
}

let hallMats: ReturnType<typeof buildHallMaterials> | null = null;
function useHallMaterials() {
  return (hallMats ??= buildHallMaterials());
}

function buildHallMaterials() {
  {
    const powder = surfaceMaps({ base: 0.55, variation: 0.18, smudges: 12, scratches: 220, normalStrength: 1.6, seed: 61, repeat: [2, 2] });
    const brushed = surfaceMaps({ base: 0.3, variation: 0.14, smudges: 6, scratches: 300, brushed: 10, normalStrength: 1.2, seed: 62, repeat: [3, 1] });
    const perf = perforationMap();
    perf.repeat.set(1, RACK.height / 0.56);

    return {
      body: new THREE.MeshPhysicalMaterial({
        color: "#1a1f29",
        metalness: 0.6,
        roughness: 1,
        roughnessMap: powder.roughness,
        normalMap: powder.normal,
        normalScale: new THREE.Vector2(0.4, 0.4),
        clearcoat: 0.25,
        clearcoatRoughness: 0.5,
      }),
      door: new THREE.MeshPhysicalMaterial({
        color: "#3a4150",
        metalness: 0.8,
        roughness: 0.38,
        roughnessMap: powder.roughness,
        alphaMap: perf,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      }),
      blade: new THREE.MeshPhysicalMaterial({
        color: "#2a2f38",
        metalness: 0.9,
        roughness: 1,
        roughnessMap: brushed.roughness,
        normalMap: brushed.normal,
        normalScale: new THREE.Vector2(0.3, 0.3),
        anisotropy: 0.6,
      }),
      tray: new THREE.MeshPhysicalMaterial({ color: "#6b7380", metalness: 0.9, roughness: 1, roughnessMap: powder.roughness, normalMap: powder.normal }),
      cable: new THREE.MeshPhysicalMaterial({ color: "#0b0d12", metalness: 0, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.35 }),
      wall: new THREE.MeshStandardMaterial({ color: "#07090f", metalness: 0.2, roughness: 1, roughnessMap: powder.roughness, normalMap: powder.normal }),
    };
  }
}

/** Apply a list of matrices to an InstancedMesh once. */
function useInstances(ref: React.RefObject<THREE.InstancedMesh>, matrices: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, matrices]);
}

const tmpO = new THREE.Object3D();
function mat(pos: [number, number, number], rotY = 0, scale: [number, number, number] = [1, 1, 1]) {
  tmpO.position.set(...pos);
  tmpO.rotation.set(0, rotY, 0);
  tmpO.scale.set(...scale);
  tmpO.updateMatrix();
  return tmpO.matrix.clone();
}

function Racks() {
  const slots = useRackSlots();
  const m = useHallMaterials();
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(RACK.depth, RACK.height, RACK.width - 0.02, 3, 0.025), []);
  const doorGeo = useMemo(() => new THREE.PlaneGeometry(RACK.width - 0.08, RACK.height - 0.12), []);
  const bladeGeo = useMemo(() => new RoundedBoxGeometry(0.85, 0.082, RACK.width - 0.1, 2, 0.006), []);
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.004, 0.011, 0.011), []);

  // Deterministic layout: which blade slots are populated.
  const layout = useMemo(() => {
    let seed = 1234;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const bodies: THREE.Matrix4[] = [];
    const doors: THREE.Matrix4[] = [];
    const blades: THREE.Matrix4[] = [];
    const leds: { m: THREE.Matrix4; tone: number }[] = [];
    for (const s of slots) {
      const x = s.side * ROW_X;
      bodies.push(mat([x, RACK.height / 2, s.z]));
      const front = x - s.side * (RACK.depth / 2 + 0.004);
      doors.push(mat([front, RACK.height / 2, s.z], s.side === -1 ? Math.PI / 2 : -Math.PI / 2));
      for (let u = 0; u < UNITS; u++) {
        if (rnd() < 0.14) continue; // empty slot
        const y = 0.16 + u * 0.1;
        const bx = x - s.side * 0.07;
        blades.push(mat([bx, y, s.z]));
        const ledX = bx - s.side * (0.425 + 0.003);
        for (let k = 0; k < 3; k++) {
          leds.push({ m: mat([ledX, y + 0.018, s.z - 0.2 + k * 0.024]), tone: rnd() });
        }
      }
    }
    return { bodies, doors, blades, leds };
  }, [slots]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const doorRef = useRef<THREE.InstancedMesh>(null);
  const bladeRef = useRef<THREE.InstancedMesh>(null);
  const ledRef = useRef<THREE.InstancedMesh>(null);
  useInstances(bodyRef, layout.bodies);
  useInstances(doorRef, layout.doors);
  useInstances(bladeRef, layout.blades);
  const ledMatrices = useMemo(() => layout.leds.map((l) => l.m), [layout]);
  useInstances(ledRef, ledMatrices);

  // LED palette: mostly steady blue/cyan, a few white activity LEDs, rare violet.
  const ledBase = useMemo(
    () =>
      layout.leds.map((l) =>
        l.tone < 0.6 ? new THREE.Color("#2f6bff").multiplyScalar(5) : l.tone < 0.9 ? new THREE.Color("#22d3ee").multiplyScalar(4) : l.tone < 0.97 ? new THREE.Color("#dbe7ff").multiplyScalar(5) : new THREE.Color("#8b5cf6").multiplyScalar(5),
      ),
    [layout],
  );
  useLayoutEffect(() => {
    const m = ledRef.current;
    if (!m) return;
    ledBase.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ledBase]);

  // Activity blink: flicker a handful of LEDs each frame.
  const off = useMemo(() => new THREE.Color(0.02, 0.03, 0.05), []);
  const acc = useRef(0);
  useFrame((_, dt) => {
    const m = ledRef.current;
    if (!m || !m.instanceColor) return;
    acc.current += dt;
    if (acc.current < 0.06) return;
    acc.current = 0;
    for (let k = 0; k < 60; k++) {
      const i = Math.floor(Math.random() * ledBase.length);
      m.setColorAt(i, Math.random() < 0.35 ? off : ledBase[i]);
    }
    m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeo, m.body, layout.bodies.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={doorRef} args={[doorGeo, m.door, layout.doors.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={bladeRef} args={[bladeGeo, m.blade, layout.blades.length]} receiveShadow frustumCulled={false} />
      <instancedMesh ref={ledRef} args={[ledGeo, undefined, layout.leds.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Overhead cable trays with cable bundles, hangers and linear light fixtures. */
function Overhead() {
  const m = useHallMaterials();
  const length = RACKS_PER_ROW * PITCH + 1.2;
  const centerZ = FIRST_Z - ((RACKS_PER_ROW - 1) * PITCH) / 2;
  const cables = useMemo(() => {
    const out: { side: number; dx: number; dy: number; r: number }[] = [];
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) out.push({ side, dx: (rnd() - 0.5) * 0.32, dy: rnd() * 0.06, r: 0.012 + rnd() * 0.014 });
    return out;
  }, []);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (ROW_X - 0.15), 2.62, centerZ]}>
          {/* U-channel tray */}
          <mesh material={m.tray} position={[0, -0.04, 0]} castShadow>
            <boxGeometry args={[0.42, 0.012, length]} />
          </mesh>
          <mesh material={m.tray} position={[-0.21, 0.0, 0]}>
            <boxGeometry args={[0.012, 0.09, length]} />
          </mesh>
          <mesh material={m.tray} position={[0.21, 0.0, 0]}>
            <boxGeometry args={[0.012, 0.09, length]} />
          </mesh>
          {/* threaded-rod hangers */}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} material={m.tray} position={[0, 1.0, -length / 2 + 0.6 + i * ((length - 1.2) / 7)]}>
              <cylinderGeometry args={[0.008, 0.008, 2.0, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {cables.map((c, i) => (
        <mesh key={i} material={m.cable} position={[c.side * (ROW_X - 0.15) + c.dx, 2.6 + c.r + c.dy, centerZ]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[c.r, c.r, length - 0.1, 10]} />
        </mesh>
      ))}
      {/* linear LED fixtures over the aisle */}
      {[-1.25, 1.25].map((x) => (
        <group key={x} position={[x, 3.55, centerZ - 1]}>
          <mesh material={m.tray}>
            <boxGeometry args={[0.1, 0.05, length + 2]} />
          </mesh>
          <mesh position={[0, -0.026, 0]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[0.05, length + 1.9]} />
            <meshBasicMaterial color={new THREE.Color("#dfe8ff").multiplyScalar(0.85)} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Raised-floor tiles: 600 mm grid with seams, wet-ish reflective sheen. */
function RaisedFloor({ quality }: { quality: Quality }) {
  const { rough, normal } = useMemo(() => {
    const base = surfaceMaps({ base: 0.5, variation: 0.12, smudges: 0, scratches: 140, puddles: 6, normalStrength: 1.4, seed: 71, repeat: [1, 1] });
    // compose per-tile seams into the roughness map
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    g.fillStyle = "#7a7a7a";
    g.fillRect(0, 0, size, size);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, size - 3, size - 3);
    const seam = new THREE.CanvasTexture(c);
    seam.wrapS = seam.wrapT = THREE.RepeatWrapping;
    seam.colorSpace = THREE.NoColorSpace;
    seam.repeat.set(30 / 0.6, 40 / 0.6);
    seam.anisotropy = 8;
    base.normal.repeat.set(6, 8);
    return { rough: seam, normal: base.normal };
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -6]} receiveShadow>
      <planeGeometry args={[30, 40]} />
      <MeshReflectorMaterial
        blur={quality === "high" ? [220, 60] : [120, 40]}
        resolution={quality === "high" ? 1024 : 256}
        mixBlur={0.6}
        mixStrength={quality === "high" ? 10 : 6}
        mixContrast={1}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        mirror={0.8}
        color="#080b12"
        metalness={0.3}
        roughness={1}
        roughnessMap={rough}
        normalMap={normal}
        normalScale={new THREE.Vector2(0.2, 0.2)}
        envMapIntensity={0.4}
      />
    </mesh>
  );
}

function Shell() {
  const m = useHallMaterials();
  return (
    <group>
      {/* back wall, side walls behind racks, ceiling */}
      <mesh material={m.wall} position={[0, 2.5, BACK_WALL_Z]} receiveShadow>
        <planeGeometry args={[12, 5]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wall} position={[s * 4.6, 2.5, -6]} rotation-y={-s * (Math.PI / 2)}>
          <planeGeometry args={[40, 5]} />
        </mesh>
      ))}
      <mesh material={m.wall} position={[0, 4.6, -6]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[12, 40]} />
      </mesh>
    </group>
  );
}

export function Hall({ quality }: { quality: Quality }) {
  return (
    <>
      <Shell />
      <Racks />
      <Overhead />
      <RaisedFloor quality={quality} />
    </>
  );
}
