import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, Preload } from "@react-three/drei";
import { CORE_Z, LandingScene, PORTAL_Y } from "./LandingScene";
import { CinematicEffects, type Quality } from "./post";
import { flight } from "./store";

const FOV = 32; // one consistent ~50mm-equivalent lens for the whole flight

/** Camera path: from outside the gate, through each layer's centre, settling beside the core. */
const PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-4.2, -1.55, 13.5),
    new THREE.Vector3(-1.8, -0.6, 6.5),
    new THREE.Vector3(-0.1, PORTAL_Y - 0.05, 1.2),
    new THREE.Vector3(-0.2, PORTAL_Y + 0.1, -1.6),
    new THREE.Vector3(-0.95, PORTAL_Y + 0.18, CORE_Z + 5.4),
  ],
  false,
  "centripetal",
);
const CORE = new THREE.Vector3(0, PORTAL_Y, CORE_Z);
/** Establishing-shot aim: the middle of the gate stack, a touch above centre. */
const INTRO_AIM = new THREE.Vector3(0.6, 0.2, -4.2);
/** Final aim sits left of the core so the core lands right-of-centre, clear of the world list. */
const ARRIVAL_AIM = new THREE.Vector3(-1.25, PORTAL_Y + 0.1, CORE_Z);

function CameraRig() {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3().copy(INTRO_AIM));
  const firstFrame = useRef(true);
  const parallax = useRef(new THREE.Vector2());
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    // Critically-damped follow gives the camera mass.
    const k = flight.reducedMotion ? 1 : 1 - Math.exp(-d * 2.2);
    flight.progress += (flight.target - flight.progress) * k;
    if (Math.abs(flight.target - flight.progress) < 1e-4) flight.progress = flight.target;
    const p = flight.progress;

    flight.setPhase(p >= 0.985 ? "arrived" : p > 0.01 ? "flying" : "intro");

    PATH.getPointAt(p, tmp);

    // Pointer parallax (free look), strongest at the start, softer inside the portal.
    const pk = flight.reducedMotion ? 0 : 1 - Math.exp(-d * 3);
    parallax.current.x += (pointer.x - parallax.current.x) * pk;
    parallax.current.y += (pointer.y - parallax.current.y) * pk;
    const pa = 0.55 * (1 - p * 0.75);
    tmp.x += parallax.current.x * pa;
    tmp.y += parallax.current.y * pa * 0.45;

    // Handheld drift: a few incommensurate sines, a few millimetres-to-centimetres.
    if (!flight.reducedMotion) {
      const t = state.clock.elapsedTime;
      tmp.x += Math.sin(t * 0.43) * 0.022 + Math.sin(t * 1.17 + 1.3) * 0.008;
      tmp.y += Math.sin(t * 0.37 + 2.1) * 0.018 + Math.sin(t * 0.93) * 0.006;
    }
    camera.position.copy(tmp);

    // Look slightly ahead along the path early on, locking onto the core near the end.
    // Blend: establishing aim → looking ahead down the tunnel → locked on the core.
    const ahead = PATH.getPointAt(Math.min(1, p + 0.1));
    const desired = INTRO_AIM.clone().lerp(ahead, THREE.MathUtils.smoothstep(p, 0.0, 0.25));
    desired.lerp(CORE, THREE.MathUtils.smoothstep(p, 0.4, 0.8));
    desired.lerp(ARRIVAL_AIM, THREE.MathUtils.smoothstep(p, 0.8, 1.0));
    // first frame when resuming at the core (back from a world): no sweep, start framed
    const snap = flight.reducedMotion || (firstFrame.current && p > 0.98);
    firstFrame.current = false;
    look.current.lerp(desired, snap ? 1 : 1 - Math.exp(-d * 4));
    camera.lookAt(look.current);
    // Slight roll in the middle of the flight for a sense of banking.
    camera.rotateZ(Math.sin(p * Math.PI) * 0.035);
  });
  return null;
}

function Effects({ quality }: { quality: Quality }) {
  const target = useMemo(() => CORE.clone(), []);
  return <CinematicEffects quality={quality} focus={target} />;
}

export default function Experience({ initialQuality }: { initialQuality: Quality }) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState<number>(initialQuality === "high" ? 1.5 : 1);
  return (
    <Canvas
      flat
      shadows
      dpr={dpr}
      camera={{ fov: FOV, near: 0.1, far: 80, position: [-4.2, -1.55, 13.5] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
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
          <LandingScene quality={quality} />
          <CameraRig />
          <Effects quality={quality} />
          <Preload all />
        </Suspense>
      </PerformanceMonitor>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
