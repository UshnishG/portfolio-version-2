import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Html, PerformanceMonitor, Preload } from "@react-three/drei";
import { CinematicEffects, type Quality } from "../post";
import { applyOrbit, orbit } from "../ui/orbit";
import { PerfProbe } from "../ui/PerfProbe";
import { Drone, drone } from "../dmind/Drone";
import { LightShafts, MarineSnow, Seabed, SeaSurface } from "./Ocean";
import { AUV_CENTER, BUOY, DetectionProjector, FIELD, Fleet } from "./Fleet";
import { sampleWaves } from "./waves";
import { sea } from "./store";
import type { MStationId } from "./data";

/** Same sky as D-MIND; sun direction measured from that HDRI (48° elevation). */
const SUN_DIR = new THREE.Vector3(0.553, 0.743, 0.377).normalize();
const FOV = 38;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const SHOTS: Record<MStationId, { cam: THREE.Vector3; aim: THREE.Vector3; focus: THREE.Vector3 }> = {
  overview: { cam: v(-15, 3.4, 15), aim: v(3, 0.6, -4), focus: BUOY.clone() },
  buoy: { cam: BUOY.clone().add(v(3.6, 1.5, 4.6)), aim: BUOY.clone().add(v(-1.1, 0.6, 0)), focus: BUOY.clone().add(v(0, 0.8, 0)) },
  detection: { cam: FIELD.clone().add(v(-5, 10, 8)), aim: FIELD.clone().add(v(1.5, 0, -0.5)), focus: FIELD.clone() },
  underwater: { cam: AUV_CENTER.clone().add(v(-8, 1.4, 8)), aim: AUV_CENTER.clone().add(v(1, -1.2, -1)), focus: AUV_CENTER.clone() },
  drift: { cam: FIELD.clone().add(v(-26, 42, 30)), aim: FIELD.clone().add(v(14, 0, -6)), focus: FIELD.clone().add(v(12, 0, -5)) },
  system: { cam: v(-20, 8.5, 21), aim: v(7, -0.5, -6), focus: v(3, 0, -3) },
};

function useStation() {
  return useSyncExternalStore(
    (cb) => sea.subscribe(cb),
    () => sea.station.id,
    () => "overview" as MStationId,
  );
}

/** Camera with mass + drag orbit; toggles above-water haze vs underwater fog at the waterline. */
function Director() {
  const { camera, scene } = useThree();
  const pos = useRef(SHOTS.overview.cam.clone());
  const aim = useRef(SHOTS.overview.aim.clone());
  const focus = useRef(SHOTS.overview.focus.clone());
  const above = useMemo(() => new THREE.FogExp2("#a9bfcd", 0.0045), []);
  const below = useMemo(() => new THREE.FogExp2("#0c4656", 0.085), []);
  const deep = useMemo(() => new THREE.Color("#0b3c4a"), []);
  const skyRef = useRef<THREE.Texture | null>(null);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const s = SHOTS[sea.station.id];
    const rm = sea.reducedMotion;
    pos.current.lerp(s.cam, rm ? 1 : 1 - Math.exp(-d * 1.3));
    aim.current.lerp(s.aim, rm ? 1 : 1 - Math.exp(-d * 1.7));
    focus.current.lerp(s.focus, rm ? 1 : 1 - Math.exp(-d * 2));
    orbit.step(d, rm);
    const cp = pos.current.clone();
    const ap = aim.current.clone();
    applyOrbit(cp, ap, focus.current);
    if (!rm) {
      const t = state.clock.elapsedTime;
      cp.x += Math.sin(t * 0.33) * 0.05;
      cp.y += Math.sin(t * 0.27 + 1.1) * 0.06;
    }
    // keep the camera clear of the seabed; above water, ride slightly with the swell
    cp.y = Math.max(cp.y, -15.2);
    camera.position.copy(cp);
    camera.lookAt(ap);

    const waterline = sampleWaves(cp.x, cp.z, rm ? 0 : state.clock.elapsedTime);
    const under = cp.y < waterline - 0.05;
    if (under !== sea.underwater) sea.underwater = under;
    if (!skyRef.current && scene.background instanceof THREE.Texture) skyRef.current = scene.background;
    scene.fog = under ? below : above;
    scene.background = under ? deep : skyRef.current;
  });
  return null;
}

/** UAV overhead (the D-MIND survey drone), holding station above the debris field. */
function Uav() {
  // the drone pose is shared module state; start fresh here instead of flying in from D-MIND
  useEffect(() => {
    drone.ready = false;
  }, []);
  useFrame(() => {
    drone.target.set(FIELD.x - 1, 17, FIELD.z + 2);
    drone.look.copy(FIELD);
  });
  return <Drone />;
}

/** 72-hour drift forecast curves (illustrative current field) with 24 / 48 / 72 h markers. */
function DriftForecast() {
  const station = useStation();
  const curves = useMemo(() => {
    const starts = [
      [-2.2, 1.0],
      [1.2, -1.6],
      [-0.6, 3.2],
      [2.4, -3.6],
      [4.6, -0.6],
    ];
    return starts.map(([dx, dz], k) => {
      const pts: THREE.Vector3[] = [];
      let x = FIELD.x + dx;
      let z = FIELD.z + dz;
      for (let h = 0; h <= 72; h += 3) {
        pts.push(new THREE.Vector3(x, 0.9, z));
        // smooth illustrative current: eastward set with a slow gyre
        x += (0.55 + 0.12 * Math.sin(z * 0.08 + k)) * 1.0;
        z += (-0.22 + 0.18 * Math.cos(x * 0.06 + k * 0.7)) * 1.0;
      }
      return pts;
    });
  }, []);
  const lines = useMemo(
    () =>
      curves.map((pts) => {
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: new THREE.Color("#22d3ee").multiplyScalar(1.6), dashSize: 0.9, gapSize: 0.5, transparent: true, opacity: 0.9, toneMapped: false }));
        l.computeLineDistances();
        return l;
      }),
    [curves],
  );
  const show = station === "drift";
  return (
    <group visible={show}>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      {show &&
        [8, 16, 24].map((idx, j) => (
          <group key={idx} position={curves[1][idx]}>
            <mesh>
              <sphereGeometry args={[0.35, 16, 12]} />
              <meshBasicMaterial color={new THREE.Color("#a78bfa").multiplyScalar(2.2)} toneMapped={false} />
            </mesh>
            <Html center position={[0, 2.2, 0]} zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
              <span className="whitespace-nowrap border border-violet-300/40 bg-[#02030a]/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-100">
                {(j + 1) * 24} h
              </span>
            </Html>
          </group>
        ))}
    </group>
  );
}

function Sun({ quality }: { quality: Quality }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.position.copy(SUN_DIR).multiplyScalar(80);
    l.target.position.set(0, 0, 0);
    l.target.updateMatrixWorld();
    const c = l.shadow.camera;
    c.left = c.bottom = -30;
    c.right = c.top = 30;
    c.near = 1;
    c.far = 200;
    c.updateProjectionMatrix();
  }, []);
  return <directionalLight ref={ref} intensity={2.1} color="#fff2df" castShadow={quality === "high"} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />;
}

export default function MarineWorld({ initialQuality }: { initialQuality: Quality }) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState(initialQuality === "high" ? 1.5 : 1);
  const station = useStation();
  const focus = useMemo(() => SHOTS[station].focus.clone(), [station]);
  const close = station === "buoy" || station === "underwater";
  return (
    <Canvas
      flat
      shadows
      dpr={dpr}
      camera={{ fov: FOV, near: 0.05, far: 900, position: SHOTS.overview.cam.toArray() }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
      aria-hidden
    >
      <PerformanceMonitor
        onIncline={() => setDpr((d) => Math.min(d + 0.25, quality === "high" ? 2 : 1.5))}
        onDecline={() => {
          setDpr((d) => Math.max(d - 0.25, 0.75));
          setQuality("low");
        }}
        flipflops={3}
      >
        <Suspense fallback={null}>
          <Environment files="/assets/dmind/sky_1k.hdr" background environmentIntensity={0.8} backgroundIntensity={0.9} />
          <Sun quality={quality} />
          <SeaSurface quality={quality} />
          <Seabed />
          <MarineSnow />
          <LightShafts />
          <Fleet />
          <Uav />
          <DriftForecast />
          <Director />
          <DetectionProjector />
          <CinematicEffects quality={quality} focus={close ? focus : undefined} bokeh={1.8} bloom={0.3} />
          {import.meta.env.DEV && <PerfProbe rearm={station} />}
          <Preload all />
        </Suspense>
      </PerformanceMonitor>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
