import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor, Preload, Sparkles } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { CinematicEffects, type Quality } from "../post";
import { Hall } from "./Hall";
import { Pipeline } from "./Pipeline";
import { tour } from "./store";
import { applyOrbit, orbit } from "../ui/orbit";

RectAreaLightUniformsLib.init();

const FOV = 34;

/** Camera with mass: damped travel between stations, handheld drift, pointer parallax. */
function TourRig({ focus }: { focus: THREE.Vector3 }) {
  const { camera, pointer } = useThree();
  const pos = useRef(new THREE.Vector3(-3.6, 1.4, 10.5));
  const look = useRef(new THREE.Vector3(0, 1.2, -6));
  const par = useRef(new THREE.Vector2());
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpL = useMemo(() => new THREE.Vector3(), []);
  const subject = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const aimPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const st = tour.station;
    tmpL.set(...st.target);
    tmpP.set(...st.camera);
    if (st.id !== "overview") {
      // pull back a touch, then aim left of the subject so it sits right of centre,
      // clear of the story panel on the left
      tmpP.sub(tmpL).multiplyScalar(1.18).add(tmpL);
      const fwd = tmpL.clone().sub(tmpP);
      const dist = fwd.length();
      const right = fwd.normalize().cross(THREE.Object3D.DEFAULT_UP).normalize();
      tmpL.addScaledVector(right, -dist * 0.15);
    }
    const rm = tour.reducedMotion;
    const kp = rm ? 1 : 1 - Math.exp(-d * 1.6);
    const kl = rm ? 1 : 1 - Math.exp(-d * 2.4);
    pos.current.lerp(tmpP, kp);
    look.current.lerp(tmpL, kl);
    // depth of field stays locked on the subject itself, not the offset aim point
    focus.lerp(subject.set(...st.target), kl);

    // pointer parallax is a passive nudge; it stands down while the user drags to orbit
    const parK = rm || orbit.dragging ? 0 : 1 - Math.exp(-d * 3);
    par.current.x += ((orbit.dragging ? 0 : pointer.x) - par.current.x) * parK;
    par.current.y += ((orbit.dragging ? 0 : pointer.y) - par.current.y) * parK;

    // user drag: orbit camera + aim around the subject
    orbit.step(d, rm);
    camPos.copy(pos.current);
    aimPos.copy(look.current);
    applyOrbit(camPos, aimPos, focus);
    camPos.y = Math.max(camPos.y, 0.35); // never under the raised floor

    camera.position.copy(camPos);
    // parallax sideways relative to the view direction
    const fwd = tmpL.copy(aimPos).sub(camPos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    camera.position.addScaledVector(right, par.current.x * 0.35).addScaledVector(camera.up, par.current.y * 0.18);
    if (!rm) {
      const t = state.clock.elapsedTime;
      camera.position.x += Math.sin(t * 0.41) * 0.018 + Math.sin(t * 1.13 + 1.1) * 0.006;
      camera.position.y += Math.sin(t * 0.33 + 2.0) * 0.014 + Math.sin(t * 0.87) * 0.005;
    }
    camera.lookAt(aimPos);
  });
  return null;
}

/**
 * Dev-only (?debug): times full frames (scene + post) synchronously, independent of
 * rAF throttling, and writes the result to <body data-perf>.
 */
function PerfProbe() {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  const enabled = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  useFrame(() => {
    if (!enabled || ++frames.current !== 12) return;
    {
      const ctx = gl.getContext();
      const px = new Uint8Array(4);
      const times: number[] = [];
      for (let i = 0; i < 30; i++) {
        const t = performance.now();
        gl.render(scene, camera);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      document.body.dataset.perf = JSON.stringify({
        sceneMedianMs: +times[15].toFixed(2),
        sceneP90Ms: +times[27].toFixed(2),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        programs: gl.info.programs?.length,
        buffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
      });
    }
  });
  return null;
}

function RackWash({ side }: { side: -1 | 1 }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useLayoutEffect(() => {
    ref.current?.lookAt(side * 3.0, 1.0, -3.6);
  }, [side]);
  return <rectAreaLight ref={ref} position={[-side * 0.6, 3.3, -3.6]} width={14} height={0.6} intensity={12} color="#cdd9f5" />;
}

function Lighting({ quality }: { quality: Quality }) {
  const key = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    if (key.current) {
      key.current.target.position.set(0, 0.5, -6);
      key.current.target.updateMatrixWorld();
    }
  }, []);
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={1.6}>
        <color attach="background" args={["#04060b"]} />
        {/* the two aisle fixtures, as seen by reflections */}
        <Lightformer form="rect" intensity={3.2} color="#e6edff" position={[-1.25, 3.5, -5]} rotation-x={Math.PI / 2} scale={[0.15, 16, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#e6edff" position={[1.25, 3.5, -5]} rotation-x={Math.PI / 2} scale={[0.15, 16, 1]} />
        {/* results wall glow and cool bounce from the racks */}
        <Lightformer form="rect" intensity={1.4} color="#7ea2ff" position={[0, 3.7, -14.5]} scale={[6.5, 2, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#5874b8" position={[-4.5, 1.2, -5]} rotation-y={Math.PI / 2} scale={[20, 2.4, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#5874b8" position={[4.5, 1.2, -5]} rotation-y={-Math.PI / 2} scale={[20, 2.4, 1]} />
        <Lightformer form="circle" intensity={0.12} color="#8ea2c4" position={[0, 1.5, 12]} scale={[12, 6, 1]} />
      </Environment>
      <ambientLight intensity={0.03} color="#6b85c9" />
      {/* physical light from the aisle fixtures */}
      <rectAreaLight position={[-1.25, 3.5, -5]} rotation-x={-Math.PI / 2} width={0.12} height={15} intensity={14} color="#e6edff" />
      <rectAreaLight position={[1.25, 3.5, -5]} rotation-x={-Math.PI / 2} width={0.12} height={15} intensity={14} color="#e6edff" />
      {/* angled wash onto each rack row's front doors */}
      <RackWash side={-1} />
      <RackWash side={1} />
      {/* shadow-casting key down the aisle */}
      <spotLight
        ref={key}
        position={[0.4, 4.4, 3]}
        angle={0.6}
        penumbra={1}
        intensity={30}
        distance={24}
        decay={1.6}
        color="#dfe8ff"
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
    </>
  );
}

export default function InferWorld({ initialQuality }: { initialQuality: Quality }) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState(initialQuality === "high" ? 1.5 : 1);
  const focus = useMemo(() => new THREE.Vector3(0, 1, -6), []);
  return (
    <Canvas
      flat
      shadows
      dpr={dpr}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [-3.6, 1.4, 10.5] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
      aria-hidden
    >
      <color attach="background" args={["#020309"]} />
      <fogExp2 attach="fog" args={["#03050c", 0.03]} />
      <PerformanceMonitor
        onIncline={() => setDpr((d) => Math.min(d + 0.25, quality === "high" ? 2 : 1.5))}
        onDecline={() => {
          setDpr((d) => Math.max(d - 0.25, 0.75));
          setQuality("low");
        }}
        flipflops={3}
      >
        <Suspense fallback={null}>
          <Lighting quality={quality} />
          <Hall quality={quality} />
          <Pipeline quality={quality} />
          <Sparkles count={quality === "high" ? 160 : 60} scale={[7, 3.5, 18]} position={[0, 1.8, -5]} size={0.9} speed={0.1} opacity={0.22} color="#b4ccff" noise={0.5} />
          <TourRig focus={focus} />
          {import.meta.env.DEV && <PerfProbe />}
          <CinematicEffects quality={quality} focus={focus} bokeh={2.2} bloom={0.36} />
          <Preload all />
        </Suspense>
      </PerformanceMonitor>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
