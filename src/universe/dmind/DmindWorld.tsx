import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Html, PerformanceMonitor, Preload } from "@react-three/drei";
import { CinematicEffects, type Quality } from "../post";
import { Terrain } from "./Terrain";
import { Forest } from "./Forest";
import { PerfProbe } from "../ui/PerfProbe";

const stationIdForProbe = () => mission.station.id;
import { Drone, drone } from "./Drone";
import { DetectionProjector, Incident, Minefield } from "./Hazards";
import { useHeightField, type HeightField } from "./heightfield";
import { mission, type ScanSite } from "./store";
import { applyOrbit, orbit } from "../ui/orbit";
import type { DStationId } from "./data";

/** Sun direction measured from the HDRI's brightest pixel (48° elevation). */
const SUN_DIR = new THREE.Vector3(0.553, 0.743, 0.377).normalize();
const FOV = 38;

/** Deployment loop: scan order and seconds per site (includes the transit). */
const SCAN_LOOP: ScanSite[] = ["minefield", "landslide", "incident"];
const SCAN_DWELL = 9;
const SCAN_LABEL: Record<ScanSite, string> = {
  minefield: "Scanning · landmines · YOLOv12",
  landslide: "Scanning · landslide · SegFormer",
  incident: "Scanning · fire + people · YOLOv12",
};

/** Ground ring, drone→ground beam and live label on the site being scanned (Deployment step). */
function ScanMarker({ shots }: { shots: Record<DStationId, Shot> }) {
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const [site, setSite] = useState<ScanSite | null>(null);
  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const m = new THREE.LineBasicMaterial({ color: new THREE.Color("#22d3ee").multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.85 });
    return new THREE.Line(g, m);
  }, []);
  useEffect(() => mission.subscribe(() => setSite(mission.station.id === "system" ? mission.scanning : null)), []);
  const radius: Record<ScanSite, number> = { minefield: 22, landslide: 0, incident: 34 };
  useFrame((st) => {
    const on = mission.station.id === "system" && mission.scanning;
    beam.visible = !!on;
    if (ring.current) ring.current.visible = !!on && radius[mission.scanning!] > 0;
    if (!on) return;
    const s = mission.scanning!;
    const ground = shots[s].droneLook;
    const p = beam.geometry.attributes.position as THREE.BufferAttribute;
    p.setXYZ(0, drone.pos.x, drone.pos.y, drone.pos.z);
    p.setXYZ(1, ground.x, ground.y, ground.z);
    p.needsUpdate = true;
    beam.geometry.computeBoundingSphere();
    if (ring.current && ringMat.current) {
      const pulse = mission.reducedMotion ? 1 : 1 + 0.08 * Math.sin(st.clock.elapsedTime * 3);
      ring.current.position.set(ground.x, ground.y + 1.5, ground.z);
      ring.current.scale.setScalar(radius[s] * pulse);
      ringMat.current.opacity = 0.55 + 0.25 * Math.sin(st.clock.elapsedTime * 3);
    }
  });
  const at = site ? shots[site].droneLook : null;
  return (
    <>
      <primitive object={beam} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.93, 1, 96]} />
        <meshBasicMaterial ref={ringMat} color={new THREE.Color("#22d3ee").multiplyScalar(2)} toneMapped={false} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {site && at && (
        <Html position={[at.x, at.y + (site === "landslide" ? 120 : 60), at.z]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
          <div className="flex items-center gap-2 whitespace-nowrap border border-cyan-300/50 bg-[#02030a]/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            {SCAN_LABEL[site]}
          </div>
        </Html>
      )}
    </>
  );
}

type Shot = { droneAt: THREE.Vector3; droneLook: THREE.Vector3; cam: THREE.Vector3; aim: THREE.Vector3; focus: THREE.Vector3 };

/** Camera + drone placement for each station, derived from the real-terrain sites. */
function useShots(field: HeightField) {
  return useMemo(() => {
    const { landslide: L, minefield: M, incident: I } = field.sites;
    const up = new THREE.Vector2(L.dir[0], L.dir[1]); // uphill
    const across = new THREE.Vector2(-up.y, up.x);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const g = (x: number, z: number) => field.at(x, z);

    /** raise `from` until the straight line to `to` clears the real terrain by `margin` metres */
    const clear = (from: THREE.Vector3, to: THREE.Vector3, margin = 12) => {
      const p = from.clone();
      for (let tries = 0; tries < 40; tries++) {
        let blocked = false;
        for (let i = 1; i < 60; i++) {
          const t = i / 60;
          const x = p.x + (to.x - p.x) * t;
          const z = p.z + (to.z - p.z) * t;
          const y = p.y + (to.y - p.y) * t;
          if (g(x, z) + margin * Math.min(1, (1 - t) * 4) > y) {
            blocked = true;
            break;
          }
        }
        if (!blocked) return p;
        p.y += 25;
      }
      return p;
    };
    const lift = (x: number, z: number, agl: number) => v(x, g(x, z) + agl, z);

    // the slide faces downslope: look at it from the valley side
    const scarMid = v(L.x - up.x * 60, field.at(L.x - up.x * 60, L.z - up.y * 60) + 10, L.z - up.y * 60);
    const slDrone = clear(lift(L.x - up.x * 330 + across.x * 140, L.z - up.y * 330 + across.y * 140, 70), scarMid);

    // minefield: low and close, gimbal straight down
    const mDrone = v(M.x - 2, M.y + 9, M.z + 3);
    // incident: medium altitude, offset
    const iLook = v(I.x, I.y + 1, I.z);
    const iDrone = clear(lift(I.x - 28, I.z + 26, 42), iLook, 6);

    // overview: drone in the foreground over the valley, slide face beyond
    const ovDrone = clear(lift(L.x - up.x * 680 + across.x * 240, L.z - up.y * 680 + across.y * 240, 95), scarMid.clone().add(v(0, 30, 0)), 20);
    const ovAway = new THREE.Vector3(L.x - ovDrone.x, 0, L.z - ovDrone.z).normalize();
    const ovCam = ovDrone.clone().addScaledVector(ovAway, -6.5).add(v(0, 1.6, 0)).addScaledVector(new THREE.Vector3(-ovAway.z, 0, ovAway.x), 2.2);

    const shots: Record<DStationId, Shot> = {
      // aim above the slide so the frame holds slide, ridgelines and sky
      overview: { droneAt: ovDrone, droneLook: scarMid, cam: ovCam, aim: scarMid.clone().add(v(0, 140, 0)), focus: ovDrone.clone() },
      drone: {
        droneAt: ovDrone,
        droneLook: scarMid,
        cam: ovDrone.clone().add(v(1.15, 0.35, 1.35)),
        aim: ovDrone.clone().add(v(-0.1, -0.05, 0)),
        focus: ovDrone.clone(),
      },
      minefield: {
        droneAt: mDrone,
        droneLook: v(M.x, M.y, M.z),
        // just behind and above the drone: its gimbal view with the airframe in frame
        cam: mDrone.clone().add(v(-1.4, 2.6, 2.8)),
        aim: v(M.x + 1, M.y, M.z - 1),
        focus: v(M.x, M.y, M.z),
      },
      landslide: {
        droneAt: slDrone,
        droneLook: scarMid,
        cam: slDrone.clone().add(v(across.x * 5 - up.x * 7, 3, across.y * 5 - up.y * 7)),
        aim: scarMid,
        focus: scarMid,
      },
      incident: {
        droneAt: iDrone,
        droneLook: iLook,
        cam: iDrone.clone().add(v(-5, 3.5, 6)),
        aim: iLook.clone().add(v(-3, 0, 2)),
        focus: iLook,
      },
      system: {
        droneAt: iDrone.clone().add(v(0, 40, 0)),
        droneLook: scarMid,
        // from the north-east: the sun (ESE, 48°) rakes across the ridges from the side,
        // modelling the relief instead of backlighting it; all three sites stay in frame
        cam: clear(
          lift((L.x + M.x + I.x) / 3 + 0.6 * 1300, (L.z + M.z + I.z) / 3 - 0.8 * 1300, 520),
          v((L.x + M.x + I.x) / 3, (L.y + M.y + I.y) / 3, (L.z + M.z + I.z) / 3),
          40,
        ),
        aim: v((L.x + M.x + I.x) / 3, (L.y + M.y + I.y) / 3, (L.z + M.z + I.z) / 3),
        focus: v((L.x + M.x + I.x) / 3, (L.y + M.y + I.y) / 3, (L.z + M.z + I.z) / 3),
      },
    };
    // Deployment: aim left of the sites' centre so they sit right of the story panel
    {
      const s = shots.system;
      const fwd = s.focus.clone().sub(s.cam).setY(0).normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      s.aim = s.focus.clone().addScaledVector(right, -s.cam.distanceTo(s.focus) * 0.24);
    }
    return shots;
  }, [field]);
}

/** Drone + camera direction for the active station; camera has mass and slight drift. */
function Director({ shots, focus, field }: { shots: Record<DStationId, Shot>; focus: THREE.Vector3; field: HeightField }) {
  const { camera } = useThree();
  const debug = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  const frames = useRef(0);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const aimPos = useMemo(() => new THREE.Vector3(), []);
  const init = useRef(false);
  const loopStart = useRef(-1);
  const pos = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const s = shots[mission.station.id];
    if (mission.station.id === "system") {
      // Deployment: the drone loops minefield → landslide → incident, scanning each in turn
      if (loopStart.current < 0) loopStart.current = state.clock.elapsedTime;
      const k = Math.floor((state.clock.elapsedTime - loopStart.current) / SCAN_DWELL) % SCAN_LOOP.length;
      const site = SCAN_LOOP[k];
      drone.target.copy(shots[site].droneAt);
      drone.look.copy(shots[site].droneLook);
      mission.setScanning(site);
    } else {
      loopStart.current = -1;
      drone.target.copy(s.droneAt);
      drone.look.copy(s.droneLook);
      mission.setScanning(null);
    }
    if (!init.current) {
      pos.current.copy(s.cam);
      aim.current.copy(s.aim);
      focus.copy(s.focus);
      init.current = true;
    }
    const rm = mission.reducedMotion;
    // the camera rides with the drone for drone-relative shots (follows its live position)
    const rel = mission.station.id !== "system";
    const offset = s.cam.clone().sub(s.droneAt);
    const want = rel ? drone.pos.clone().add(offset) : s.cam;
    const k = rm ? 1 : 1 - Math.exp(-d * 1.4);
    pos.current.lerp(want, k);
    aim.current.lerp(s.aim, rm ? 1 : 1 - Math.exp(-d * 1.8));
    focus.lerp(s.focus, rm ? 1 : 1 - Math.exp(-d * 2));
    // user drag: orbit camera + aim around the subject; stay clear of the real ground
    orbit.step(d, rm);
    camPos.copy(pos.current);
    aimPos.copy(aim.current);
    applyOrbit(camPos, aimPos, focus);
    const floor = field.at(camPos.x, camPos.z) + (mission.station.id === "minefield" ? 1.5 : 4);
    camPos.y = Math.max(camPos.y, floor);
    camera.position.copy(camPos);
    if (!rm) {
      const t = state.clock.elapsedTime;
      const sway = mission.station.id === "drone" ? 0.012 : 0.05;
      camera.position.x += Math.sin(t * 0.37) * sway + Math.sin(t * 1.21) * sway * 0.3;
      camera.position.y += Math.sin(t * 0.29 + 1.7) * sway * 0.8;
    }
    camera.lookAt(aimPos);
    if (import.meta.env.DEV && debug && ++frames.current % 4 === 0) {
      const r = (p: THREE.Vector3) => [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
      document.body.dataset.dmind = JSON.stringify({
        station: mission.station.id,
        cam: r(camera.position),
        groundUnderCam: Math.round(field.at(camera.position.x, camera.position.z)),
        aim: r(aim.current),
        drone: r(drone.pos),
        droneTarget: r(s.droneAt),
        sites: field.sites,
        relief: [Math.round(field.min), Math.round(field.max)],
      });
    }
    // keep near/far sensible from 1 m close-ups to km vistas
    const pc = camera as THREE.PerspectiveCamera;
    const nearNow = mission.station.id === "drone" ? 0.05 : mission.station.id === "minefield" ? 0.1 : 0.5;
    if (Math.abs(pc.near - nearNow) > 1e-3) {
      pc.near = nearNow;
      pc.updateProjectionMatrix();
    }
  });
  return null;
}

/** Sun: directional light whose shadow frustum follows the active subject. */
function Sun({ focus, quality }: { focus: THREE.Vector3; quality: Quality }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    const id = mission.station.id;
    const span = id === "minefield" ? 30 : id === "drone" ? 6 : id === "incident" ? 60 : id === "system" ? 1300 : 450;
    l.target.position.copy(focus);
    l.position.copy(focus).addScaledVector(SUN_DIR, id === "system" ? 2500 : 600);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    if (cam.right !== span) {
      cam.left = cam.bottom = -span;
      cam.right = cam.top = span;
      cam.near = 1;
      cam.far = id === "system" ? 6000 : 1500;
      cam.updateProjectionMatrix();
    }
  });
  return (
    <directionalLight
      ref={ref}
      color="#fff3e0"
      intensity={1.9}
      castShadow
      shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]}
      shadow-bias={-0.0003}
      shadow-normalBias={0.04}
    />
  );
}

function Scene({ quality, focus }: { quality: Quality; focus: THREE.Vector3 }) {
  const field = useHeightField();
  const shots = useShots(field);
  return (
    <>
      <Environment files="/assets/dmind/sky_1k.hdr" background environmentIntensity={0.6} backgroundIntensity={0.85} />
      {/* aerial perspective: humid Ghats haze */}
      <fogExp2 attach="fog" args={["#a9bccd", 0.00011]} />
      <Sun focus={focus} quality={quality} />
      <Terrain quality={quality} />
      <Forest quality={quality} />
      <group name="hazards">
        <Minefield site={field.sites.minefield} />
        <Incident site={field.sites.incident} />
      </group>
      <Drone />
      <Director shots={shots} focus={focus} field={field} />
      <ScanMarker shots={shots} />
      {import.meta.env.DEV && <PerfProbe rearm={stationIdForProbe()} />}
      <DetectionProjector />
    </>
  );
}

export default function DmindWorld({ initialQuality }: { initialQuality: Quality }) {
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState(initialQuality === "high" ? 1.5 : 1);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const stationId = useSyncExternalStore(
    (cb) => mission.subscribe(cb),
    () => mission.station.id,
    () => "overview" as DStationId,
  );
  const closeShot = stationId === "drone" || stationId === "minefield" || stationId === "incident";
  return (
    <Canvas
      flat
      shadows
      dpr={dpr}
      camera={{ fov: FOV, near: 0.5, far: 22000, position: [0, 500, 0] }}
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
          <Scene quality={quality} focus={focus} />
          {/* depth of field only on close shots; over kilometres of terrain it just softens everything */}
          <CinematicEffects quality={quality} focus={closeShot ? focus : undefined} bokeh={1.6} bloom={0.22} />
          <Preload all />
        </Suspense>
      </PerformanceMonitor>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
