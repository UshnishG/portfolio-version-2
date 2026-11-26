import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { CinematicEffects, type Quality } from "../post";
import { NBodySim } from "./sim";
import { Bodies, CentralMass, DiskGlow, Nebula, RogueStar, S, Starfield } from "./Cosmos";
import { Overlays } from "./Overlays";
import { lab } from "./store";
import type { CStationId } from "./data";
import { applyOrbit, orbit } from "../ui/orbit";
import { PerfProbe } from "../ui/PerfProbe";

const FOV = 36;

/** Camera framing per step (world units; disk radius ≈ 12). */
const SHOTS: Record<CStationId, { cam: [number, number, number]; aim: [number, number, number] }> = {
  overview: { cam: [0, 11, 36], aim: [0, -1.5, 0] },
  tiling: { cam: [-9, 19, 22], aim: [0, 0, 0] },
  barneshut: { cam: [0, 38, 4], aim: [0, 0, 0] },
  speedup: { cam: [-30, 4, 15], aim: [0, 0.4, 0] },
  montecarlo: { cam: [17, 12, 25], aim: [0, 0, 0] },
  validation: { cam: [0, 4.5, 42], aim: [0, 0.5, 0] },
};

function useStation() {
  return useSyncExternalStore(
    (cb) => lab.subscribe(cb),
    () => lab.station.id,
    () => "overview" as CStationId,
  );
}

/** Owns the GPU simulation: creates it for the chosen N, steps it, resets on request. */
function useSimulation() {
  const { gl } = useThree();
  const n = useSyncExternalStore(
    (cb) => lab.subscribe(cb),
    () => `${lab.n}:${lab.resetToken}`,
    () => "4096:0",
  );
  const sim = useMemo(() => new NBodySim(gl, lab.n, 7 + lab.resetToken), [gl, n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => sim.dispose(), [sim]);
  return sim;
}

function Rig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(...SHOTS.overview.cam));
  const aim = useRef(new THREE.Vector3(...SHOTS.overview.aim));
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const pivot = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const s = SHOTS[lab.station.id];
    tmpP.set(...s.cam);
    tmpA.set(...s.aim);
    // keep the disk right of the story panel: aim a little left of it
    const fwd = tmpA.clone().sub(tmpP).setY(0);
    if (fwd.lengthSq() > 1e-3) {
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
      tmpA.addScaledVector(right, -tmpP.distanceTo(tmpA) * 0.2);
    }
    const rm = lab.reducedMotion;
    pos.current.lerp(tmpP, rm ? 1 : 1 - Math.exp(-d * 1.4));
    aim.current.lerp(tmpA, rm ? 1 : 1 - Math.exp(-d * 1.8));
    orbit.step(d, rm);
    const cp = pos.current.clone();
    const ap = aim.current.clone();
    applyOrbit(cp, ap, pivot);
    if (!rm) {
      const t = state.clock.elapsedTime;
      cp.x += Math.sin(t * 0.21) * 0.25;
      cp.y += Math.sin(t * 0.17 + 1.3) * 0.18;
    }
    camera.position.copy(cp);
    camera.lookAt(ap);
  });
  return null;
}

function Simulation() {
  const sim = useSimulation();
  const frames = useRef(0);
  const acc = useRef(0);
  const probe = useRef(0);
  const debug = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  useFrame((_, dt) => {
    // dev: time the O(N²) integration itself (synchronous, so rAF throttling doesn't matter)
    if (import.meta.env.DEV && debug && ++probe.current === 15) {
      const buf = new Float32Array(4);
      const t: number[] = [];
      for (let i = 0; i < 12; i++) {
        const t0 = performance.now();
        sim.step(2);
        sim.readCentral(buf);
        t.push(performance.now() - t0);
      }
      t.sort((a, b) => a - b);
      document.body.dataset.simstep = JSON.stringify({ n: sim.n, twoStepsMedianMs: +t[6].toFixed(2), p90: +t[10].toFixed(2) });
    }
    // two integration steps per rendered frame; slowed (not frozen) for reduced motion
    sim.step(lab.reducedMotion ? 1 : 2);
    // live frame rate of this browser simulation (not a CUDA number)
    frames.current++;
    acc.current += dt;
    if (acc.current > 0.5) {
      lab.fps = Math.round(frames.current / acc.current);
      frames.current = 0;
      acc.current = 0;
    }
  });
  const drop = (e: ThreeEvent<MouseEvent>) => {
    if (orbit.wasDrag()) return;
    e.stopPropagation();
    // world point on the disk plane → sim coordinates (group is rotated −90° about X, scaled S)
    sim.drop(e.point.x / S, -e.point.z / S);
  };
  return (
    <>
      <group rotation-x={-Math.PI / 2} scale={S}>
        <DiskGlow />
        <Bodies sim={sim} />
        <CentralMass sim={sim} />
        <RogueStar sim={sim} />
        <Overlays sim={sim} />
      </group>
      {/* invisible catcher: click anywhere on the disk plane to drop a rogue star */}
      <mesh rotation-x={-Math.PI / 2} onClick={drop} visible={false}>
        <circleGeometry args={[16, 48]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export default function CudaWorld({ initialQuality }: { initialQuality: Quality }) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState(initialQuality === "high" ? 1.5 : 1);
  const station = useStation();
  return (
    <Canvas
      flat
      dpr={dpr}
      camera={{ fov: FOV, near: 0.1, far: 1200, position: SHOTS.overview.cam }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
      aria-hidden
    >
      <color attach="background" args={["#010206"]} />
      <PerformanceMonitor
        onIncline={() => setDpr((d) => Math.min(d + 0.25, quality === "high" ? 2 : 1.5))}
        onDecline={() => {
          setDpr((d) => Math.max(d - 0.25, 0.75));
          setQuality("low");
        }}
        flipflops={3}
      >
        <Suspense fallback={null}>
          <Nebula />
          <Starfield />
          <Simulation />
          <Rig />
          <CinematicEffects quality={quality} bloom={0.55} />
          {import.meta.env.DEV && <PerfProbe rearm={station} />}
        </Suspense>
      </PerformanceMonitor>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
