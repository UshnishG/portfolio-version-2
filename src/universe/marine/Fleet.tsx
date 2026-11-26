import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, RoundedBox } from "@react-three/drei";
import { sampleWaves, SEABED_Y } from "./waves";
import { sea, type MBox } from "./store";
import { surfaceMaps } from "../textures";

const M = (id: string) => `/assets/marine/${id}/${id}.gltf`;
const MODELS = ["ocean_buoy", "plastic_jerrycan", "plastic_bottle_gallon", "plastic_crate_01", "trashbag", "old_tyre", "can_rusted"] as const;
MODELS.forEach((id) => useGLTF.preload(M(id)));

/** Debris field centre and the buoy position (world, metres). */
export const FIELD = new THREE.Vector3(9, 0, -7);
export const BUOY = new THREE.Vector3(-3, 0, 2);
export const AUV_CENTER = new THREE.Vector3(4, SEABED_Y + 2.6, -3);

/* ------------------------------------------------------------ detection targets */

type Target = { id: string; label: string; tone: MBox["tone"]; obj: THREE.Object3D; station: "detection" | "underwater" };
const targets: Target[] = [];
const box = new THREE.Box3();
const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

export function DetectionProjector() {
  const { camera, size } = useThree();
  const tick = useRef(0);
  useFrame(() => {
    if (++tick.current % 2) return;
    const st = sea.station.id;
    sea.boxes = targets.map((t) => {
      const live = st === t.station;
      if (!live) return { id: t.id, label: t.label, tone: t.tone, x: 0, y: 0, w: 0, h: 0, on: false };
      box.setFromObject(t.obj);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, behind = false;
      let k = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const c = corners[k++].set(x, y, z).project(camera);
        if (c.z > 1) behind = true;
        const px = (c.x * 0.5 + 0.5) * size.width;
        const py = (1 - (c.y * 0.5 + 0.5)) * size.height;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      const on = !behind && maxX > 0 && minX < size.width && maxY > 0 && minY < size.height;
      // foam sprites fade out toward their edges: box the visible core, not the quad
      if (t.tone === "foam") {
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, hw = (maxX - minX) * 0.32, hh = (maxY - minY) * 0.32;
        return { id: t.id, label: t.label, tone: t.tone, x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2, on };
      }
      return { id: t.id, label: t.label, tone: t.tone, x: minX, y: minY, w: maxX - minX, h: maxY - minY, on };
    });
  });
  return null;
}

/* ------------------------------------------------------------ floating helper */

/** Rides the Gerstner swell: height + tilt follow the CPU wave sampler. */
function Floater({ at, draft, children, yaw = 0, drift = 0.03, wobble = 1 }: { at: THREE.Vector3; draft: number; children: React.ReactNode; yaw?: number; drift?: number; wobble?: number }) {
  const ref = useRef<THREE.Group>(null);
  const n = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const yq = useMemo(() => new THREE.Quaternion(), []);
  useFrame((st) => {
    const g = ref.current;
    if (!g) return;
    const t = sea.reducedMotion ? 0 : st.clock.elapsedTime;
    const x = at.x + Math.sin(t * drift + yaw) * 0.4;
    const z = at.z + Math.cos(t * drift * 0.8 + yaw) * 0.4;
    const h = sampleWaves(x, z, t, n);
    g.position.set(x, h - draft, z);
    // tilt toward the local wave normal (damped by wobble), plus slow yaw
    n.lerp(up, 1 - wobble).normalize();
    q.setFromUnitVectors(up, n);
    yq.setFromAxisAngle(up, yaw + t * drift * 0.5);
    g.quaternion.copy(q).multiply(yq);
  });
  return <group ref={ref}>{children}</group>;
}

function Model({ id, scale = 1 }: { id: (typeof MODELS)[number]; scale?: number }) {
  const { scene } = useGLTF(M(id));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={obj} scale={scale} />;
}

/** Registers a target that the HUD will box while its station is active. */
function Tracked({ id, label, tone, station, children }: { id: string; label: string; tone: MBox["tone"]; station: Target["station"]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const t: Target = { id, label, tone, station, obj: ref.current };
    targets.push(t);
    return () => {
      const i = targets.indexOf(t);
      if (i >= 0) targets.splice(i, 1);
    };
  }, [id, label, tone, station]);
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------ smart buoy */

function SolarKit({ top }: { top: number }) {
  const cells = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b1430";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#7d8db5";
    g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const alu = useMemo(() => {
    const b = surfaceMaps({ base: 0.3, variation: 0.1, smudges: 8, scratches: 120, brushed: 8, normalStrength: 1, seed: 151 });
    return new THREE.MeshPhysicalMaterial({ color: "#c2c8cf", metalness: 1, roughness: 1, roughnessMap: b.roughness, normalMap: b.normal });
  }, []);
  const led = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (led.current) led.current.color.setRGB(0.1, 1, 0.9).multiplyScalar(st.clock.elapsedTime % 2 < 0.15 ? 6 : 0.3);
  });
  return (
    <group position={[0, top, 0]}>
      {/* sensor mast */}
      <mesh material={alu} position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.7, 16]} />
      </mesh>
      {/* tilted solar panel on a bracket */}
      <group position={[0, 0.55, 0]} rotation={[-0.45, 0, 0]}>
        <RoundedBox args={[0.62, 0.025, 0.42]} radius={0.008} material={alu} castShadow />
        <mesh position={[0, 0.014, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.58, 0.38]} />
          <meshPhysicalMaterial map={cells} roughness={0.12} metalness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
      </group>
      {/* camera dome (RGB) + LiDAR puck + whip antenna */}
      <mesh position={[0.16, 0.18, 0.12]}>
        <sphereGeometry args={[0.06, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#0a0d12" roughness={0.05} clearcoat={1} transmission={0} />
      </mesh>
      <mesh material={alu} position={[-0.16, 0.2, 0.1]}>
        <cylinderGeometry args={[0.055, 0.055, 0.06, 24]} />
      </mesh>
      <mesh material={alu} position={[0, 1.05, -0.05]}>
        <cylinderGeometry args={[0.006, 0.01, 0.9, 8]} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <sphereGeometry args={[0.022, 12, 8]} />
        <meshBasicMaterial ref={led} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SmartBuoy() {
  const { scene } = useGLTF(M("ocean_buoy"));
  const top = useMemo(() => new THREE.Box3().setFromObject(scene).max.y, [scene]);
  return (
    <Floater at={BUOY} draft={1.45} yaw={0.6} drift={0.02} wobble={0.85}>
      <Model id="ocean_buoy" />
      <SolarKit top={top - 0.05} />
    </Floater>
  );
}

/* ------------------------------------------------------------ debris + foam */

const DEBRIS: { id: (typeof MODELS)[number]; label: string; dx: number; dz: number; draft: number; yaw: number; scale?: number }[] = [
  { id: "plastic_jerrycan", label: "jerrycan", dx: -2.2, dz: 1.0, draft: 0.2, yaw: 0.4 },
  { id: "plastic_bottle_gallon", label: "bottle", dx: 1.2, dz: -1.6, draft: 0.12, yaw: 1.9 },
  { id: "plastic_bottle_gallon", label: "bottle", dx: 3.1, dz: 1.9, draft: 0.1, yaw: 4.2 },
  { id: "plastic_crate_01", label: "crate", dx: -0.6, dz: 3.2, draft: 0.2, yaw: 2.6 },
  { id: "trashbag", label: "bag", dx: 2.4, dz: -3.6, draft: 0.33, yaw: 0.9 },
  { id: "plastic_jerrycan", label: "jerrycan", dx: -3.6, dz: -2.4, draft: 0.22, yaw: 5.1 },
  { id: "trashbag", label: "bag", dx: 4.6, dz: -0.6, draft: 0.35, yaw: 3.3 },
];

function foamTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 160; i++) {
    const x = 128 + (Math.random() - 0.5) * 150;
    const y = 128 + (Math.random() - 0.5) * 90;
    const r = 6 + Math.random() * 22;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

function Foam({ at, s }: { at: THREE.Vector3; s: number }) {
  const tex = useMemo(() => foamTexture(), []);
  return (
    <Floater at={at} draft={-0.02} wobble={1} drift={0.05}>
      <mesh rotation-x={-Math.PI / 2} scale={[s * 1.6, s, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.9} color="#eef3f5" />
      </mesh>
    </Floater>
  );
}

function DebrisField() {
  return (
    <group>
      {DEBRIS.map((d, i) => (
        <Floater key={i} at={new THREE.Vector3(FIELD.x + d.dx, 0, FIELD.z + d.dz)} draft={d.draft} yaw={d.yaw} drift={0.04 + i * 0.004} wobble={0.9}>
          <Tracked id={`debris${i}`} label={d.label} tone="debris" station="detection">
            <Model id={d.id} scale={d.scale ?? 1} />
          </Tracked>
        </Floater>
      ))}
      {[
        [0.4, 0.2, 1.8],
        [-1.8, -3.9, 1.3],
        [5.6, 2.8, 1.5],
      ].map(([dx, dz, s], i) => (
        <Tracked key={`f${i}`} id={`foam${i}`} label="foam · rejected" tone="foam" station="detection">
          <Foam at={new THREE.Vector3(FIELD.x + dx, 0, FIELD.z + dz)} s={s} />
        </Tracked>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ seabed debris + AUV */

function SeabedDebris() {
  const items: { id: (typeof MODELS)[number]; label: string; p: [number, number, number]; r: [number, number, number] }[] = [
    { id: "old_tyre", label: "tyre", p: [AUV_CENTER.x + 2.5, SEABED_Y + 0.25, AUV_CENTER.z + 1.5], r: [1.25, 0.3, 0.2] },
    { id: "can_rusted", label: "can", p: [AUV_CENTER.x - 1.8, SEABED_Y + 0.1, AUV_CENTER.z + 2.6], r: [1.57, 0.8, 0] },
    { id: "plastic_bottle_gallon", label: "bottle", p: [AUV_CENTER.x + 0.6, SEABED_Y + 0.12, AUV_CENTER.z - 2.2], r: [1.5, 2.2, 0.3] },
    { id: "plastic_crate_01", label: "crate", p: [AUV_CENTER.x - 3.2, SEABED_Y + 0.15, AUV_CENTER.z - 1.2], r: [0.1, 0.7, 0.15] },
  ];
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.p} rotation={it.r}>
          <Tracked id={`sonar${i}`} label={`sonar · ${it.label}`} tone="sonar" station="underwater">
            <Model id={it.id} />
          </Tracked>
        </group>
      ))}
    </group>
  );
}

function Auv() {
  const ref = useRef<THREE.Group>(null);
  const prop = useRef<THREE.Mesh>(null);
  const fan = useRef<THREE.Mesh>(null);
  const hull = useMemo(() => {
    const paint = surfaceMaps({ base: 0.35, variation: 0.15, smudges: 14, scratches: 260, normalStrength: 1.4, seed: 161 });
    return new THREE.MeshPhysicalMaterial({ color: "#e0a820", roughness: 1, roughnessMap: paint.roughness, normalMap: paint.normal, normalScale: new THREE.Vector2(0.3, 0.3), clearcoat: 0.6, clearcoatRoughness: 0.3 });
  }, []);
  const dark = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1b1e24", metalness: 0.6, roughness: 0.4 }), []);
  const fanMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime;
          void main(){
            vec2 c = vUv - 0.5;
            float r = length(c) * 2.0;
            float ring = smoothstep(0.04, 0.0, abs(fract(r * 1.0 - uTime * 0.6) - 0.5) - 0.46);
            float a = (0.05 + ring * 0.5) * (1.0 - r);
            gl_FragColor = vec4(vec3(0.3, 0.9, 1.0) * a * 2.0, a);
          }`,
      }),
    [],
  );
  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = sea.reducedMotion ? 0 : st.clock.elapsedTime * 0.06;
    // slow survey loop above the debris
    const x = AUV_CENTER.x + Math.cos(t) * 4.5;
    const z = AUV_CENTER.z + Math.sin(t) * 3.2;
    g.position.set(x, AUV_CENTER.y + Math.sin(t * 3) * 0.15, z);
    g.rotation.y = -t + Math.PI;
    if (prop.current) prop.current.rotation.z += dt * 14;
    fanMat.uniforms.uTime.value = st.clock.elapsedTime;
    if (fan.current) fan.current.rotation.z = Math.sin(st.clock.elapsedTime * 0.8) * 0.35;
  });
  return (
    <group ref={ref}>
      {/* hull along local Z: nose +Z */}
      <mesh material={hull} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.5, 32]} />
      </mesh>
      <mesh material={hull} position={[0, 0, 0.75]} castShadow>
        <sphereGeometry args={[0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={hull} position={[0, 0, -0.95]} rotation-x={-Math.PI / 2} castShadow>
        <coneGeometry args={[0.16, 0.4, 32]} />
      </mesh>
      {/* fins */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={dark} position={[0, 0, -0.9]} rotation-z={(i * Math.PI) / 2}>
          <boxGeometry args={[0.006, 0.42, 0.16]} />
        </mesh>
      ))}
      <mesh ref={prop} material={dark} position={[0, 0, -1.17]}>
        <boxGeometry args={[0.22, 0.03, 0.01]} />
      </mesh>
      {/* sonar transducer + forward light */}
      <mesh material={dark} position={[0, -0.16, 0.35]}>
        <boxGeometry args={[0.12, 0.04, 0.22]} />
      </mesh>
      <mesh position={[0, 0, 0.9]}>
        <sphereGeometry args={[0.03, 12, 8]} />
        <meshBasicMaterial color={new THREE.Color("#e8fbff").multiplyScalar(5)} toneMapped={false} />
      </mesh>
      <spotLight position={[0, 0, 0.92]} target-position={[0, -1.5, 4]} angle={0.5} penumbra={0.8} intensity={30} distance={14} color="#dff7ff" />
      {/* side-scan sonar fan sweeping the seabed */}
      <mesh ref={fan} material={fanMat} position={[0, -0.2, 0.3]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
        <circleGeometry args={[6, 48, -Math.PI / 2 - 0.55, 1.1]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ assembly */

export function Fleet() {
  useEffect(() => () => void targets.splice(0, targets.length), []);
  return (
    <group>
      <SmartBuoy />
      <DebrisField />
      <SeabedDebris />
      <Auv />
    </group>
  );
}
