import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();
import { useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshDistortMaterial,
  MeshReflectorMaterial,
  MeshTransmissionMaterial,
  RoundedBox,
  Sparkles,
  SpotLight,
} from "@react-three/drei";
import { surfaceMaps } from "./textures";

import type { Quality } from "./post";
export type { Quality };

/** Portal centre height and the depth positions of each layer (metres). */
export const PORTAL_Y = 0.6;
export const CORE_Z = -9;
const FLOOR_Y = -3.0;

const RINGS = [
  { z: 0, rIn: 2.95, rOut: 3.45, depth: 0.55, kind: "gunmetal", spin: 0.02, strip: "#1f4fd1" },
  { z: -2.3, rIn: 2.55, rOut: 2.95, depth: 0.42, kind: "brushed", spin: -0.035, strip: null },
  { z: -4.5, rIn: 2.2, rOut: 2.6, depth: 0.7, kind: "glass", spin: 0.05, strip: null },
  { z: -6.6, rIn: 1.95, rOut: 2.25, depth: 0.36, kind: "brushed", spin: -0.06, strip: "#22d3ee" },
] as const;

/** Bevelled rectangular cross-section, lathed into a thick ring. */
function ringGeometry(rIn: number, rOut: number, depth: number, bevel = 0.04, segs = 200) {
  const pts: THREE.Vector2[] = [];
  const b = Math.min(bevel, (rOut - rIn) / 3, depth / 3);
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + ((a1 - a0) * i) / 6;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * b, cy + Math.sin(a) * b));
    }
  };
  const h = depth / 2;
  arc(rIn + b, -h + b, Math.PI, Math.PI * 1.5);
  arc(rOut - b, -h + b, Math.PI * 1.5, Math.PI * 2);
  arc(rOut - b, h - b, 0, Math.PI * 0.5);
  arc(rIn + b, h - b, Math.PI * 0.5, Math.PI);
  pts.push(pts[0].clone());
  const g = new THREE.LatheGeometry(pts, segs);
  g.rotateX(Math.PI / 2); // face the camera (axis along Z)
  return g;
}

function useMaterials() {
  return useMemo(() => {
    const brushed = surfaceMaps({ base: 0.32, variation: 0.18, smudges: 10, scratches: 260, brushed: 10, normalStrength: 1.4, seed: 3, repeat: [6, 1] });
    const gun = surfaceMaps({ base: 0.42, variation: 0.25, smudges: 18, scratches: 380, normalStrength: 2.2, seed: 11, repeat: [5, 1] });
    const chrome = surfaceMaps({ base: 0.1, variation: 0.08, smudges: 16, scratches: 140, normalStrength: 0.6, seed: 21 });

    const brushedMat = new THREE.MeshPhysicalMaterial({
      color: "#b9c2cf",
      metalness: 1,
      roughness: 1,
      roughnessMap: brushed.roughness,
      normalMap: brushed.normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      anisotropy: 0.85,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      envMapIntensity: 1.1,
    });
    const gunMat = new THREE.MeshPhysicalMaterial({
      color: "#2a2f39",
      metalness: 0.95,
      roughness: 1,
      roughnessMap: gun.roughness,
      normalMap: gun.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 1.2,
    });
    const boltMat = new THREE.MeshPhysicalMaterial({ color: "#8d96a3", metalness: 1, roughness: 0.28, roughnessMap: gun.roughness });
    const cradleMat = new THREE.MeshPhysicalMaterial({
      color: "#111520",
      metalness: 0.85,
      roughness: 1,
      roughnessMap: gun.roughness,
      normalMap: gun.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      clearcoat: 0.3,
    });
    return { brushedMat, gunMat, boltMat, cradleMat, chrome };
  }, []);
}

function Bolts({ radius, z, count, material }: { radius: number; z: number; count: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.032, 0.036, 0.04, 16);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      o.position.set(Math.cos(a) * radius, Math.sin(a) * radius, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, radius, z]);
  return <instancedMesh ref={ref} args={[geo, material, count]} castShadow />;
}

/** Vertical support between the cradle and a ring's lowest point (only when there is a gap). */
function Pillar({ spec, material }: { spec: (typeof RINGS)[number]; material: THREE.Material }) {
  const cradleTop = FLOOR_Y - PORTAL_Y + 0.42;
  const ringBottom = -spec.rOut;
  const gap = ringBottom - cradleTop;
  if (gap <= 0.02) return null;
  const h = gap + 0.12;
  return (
    <RoundedBox args={[0.42, h, spec.depth * 0.7]} radius={0.04} smoothness={4} position={[0, cradleTop + h / 2 - 0.02, 0]} material={material} castShadow receiveShadow />
  );
}

function Ring({ spec, quality, mats }: { spec: (typeof RINGS)[number]; quality: Quality; mats: ReturnType<typeof useMaterials> }) {
  const spin = useRef<THREE.Group>(null);
  const geo = useMemo(() => ringGeometry(spec.rIn, spec.rOut, spec.depth), [spec]);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += spec.spin * Math.min(dt, 0.05);
  });
  const mid = (spec.rIn + spec.rOut) / 2;
  return (
    <group position={[0, PORTAL_Y, spec.z]}>
      <group ref={spin}>
        {spec.kind === "glass" ? (
          <mesh geometry={geo}>
            {quality === "high" ? (
              <MeshTransmissionMaterial
                samples={6}
                resolution={512}
                thickness={0.65}
                roughness={0.06}
                ior={1.5}
                chromaticAberration={0.08}
                anisotropicBlur={0.15}
                distortion={0.08}
                distortionScale={0.4}
                temporalDistortion={0.02}
                color="#cfe3ff"
                attenuationColor="#7fa8ff"
                attenuationDistance={2.2}
                backside
                backsideThickness={0.4}
              />
            ) : (
              <meshPhysicalMaterial transmission={1} thickness={0.65} roughness={0.08} ior={1.5} dispersion={4} color="#cfe3ff" attenuationColor="#7fa8ff" attenuationDistance={2.2} />
            )}
          </mesh>
        ) : (
          <mesh geometry={geo} material={spec.kind === "brushed" ? mats.brushedMat : mats.gunMat} castShadow receiveShadow />
        )}
        {spec.kind !== "glass" && <Bolts radius={mid} z={spec.depth / 2 + 0.005} count={spec.kind === "gunmetal" ? 36 : 24} material={mats.boltMat} />}
        {spec.strip && (
          <mesh position={[0, 0, spec.depth / 2 - 0.02]}>
            <torusGeometry args={[spec.rIn + 0.012, 0.007, 8, 256]} />
            <meshBasicMaterial color={new THREE.Color(spec.strip).multiplyScalar(1.6)} toneMapped={false} />
          </mesh>
        )}
      </group>
      {/* Static cradle anchoring each ring to the floor. */}
      <RoundedBox
        args={[1.5, 0.42, spec.depth + 0.5]}
        radius={0.06}
        smoothness={4}
        position={[0, FLOOR_Y - PORTAL_Y + 0.21, 0]}
        material={mats.cradleMat}
        castShadow
        receiveShadow
      />
      <Pillar spec={spec} material={mats.cradleMat} />
    </group>
  );
}

function ChromeCore({ mats }: { mats: ReturnType<typeof useMaterials> }) {
  const gyroA = useRef<THREE.Mesh>(null);
  const gyroB = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    if (gyroA.current) {
      gyroA.current.rotation.x += d * 0.22;
      gyroA.current.rotation.y += d * 0.13;
    }
    if (gyroB.current) {
      gyroB.current.rotation.y -= d * 0.18;
      gyroB.current.rotation.z += d * 0.09;
    }
    if (core.current) core.current.position.y = PORTAL_Y + Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
  });
  return (
    <group position={[0, 0, CORE_Z]}>
      <mesh ref={core} position={[0, PORTAL_Y, 0]} castShadow>
        <icosahedronGeometry args={[0.82, 64]} />
        <MeshDistortMaterial
          color="#dfe6f0"
          metalness={1}
          roughness={1}
          roughnessMap={mats.chrome.roughness}
          normalMap={mats.chrome.normal}
          normalScale={new THREE.Vector2(0.12, 0.12)}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.0}
          distort={0.22}
          speed={1.1}
        />
      </mesh>
      <mesh ref={gyroA} position={[0, PORTAL_Y, 0]} material={mats.brushedMat} castShadow>
        <torusGeometry args={[1.22, 0.03, 24, 256]} />
      </mesh>
      <mesh ref={gyroB} position={[0, PORTAL_Y, 0]} material={mats.gunMat} castShadow>
        <torusGeometry args={[1.42, 0.022, 24, 256]} />
      </mesh>
      {/* faint internal glow so ring inner faces pick up a blue rim */}
      <pointLight position={[0, PORTAL_Y, 0.4]} color="#3b82f6" intensity={2.5} distance={6} decay={2} />
    </group>
  );
}

function Floor({ quality }: { quality: Quality }) {
  const maps = useMemo(
    () => surfaceMaps({ base: 0.55, variation: 0.1, smudges: 0, scratches: 120, puddles: 9, normalStrength: 1.5, seed: 41, repeat: [4, 4] }),
    [],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, -6]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        blur={quality === "high" ? [260, 60] : [140, 40]}
        resolution={quality === "high" ? 1024 : 256}
        mixBlur={0.7}
        envMapIntensity={0.35}
        mixStrength={quality === "high" ? 14 : 9}
        mixContrast={1}
        depthScale={1.1}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.4}
        mirror={0.85}
        color="#05070c"
        metalness={0}
        roughness={1}
        roughnessMap={maps.roughness}
        normalMap={maps.normal}
        normalScale={new THREE.Vector2(0.25, 0.25)}
      />
    </mesh>
  );
}

/** Large soft key from front-left: rakes across bevels and bolts. */
function KeyLight() {
  const ref = useRef<THREE.RectAreaLight>(null);
  useLayoutEffect(() => ref.current?.lookAt(0, -0.5, -4), []);
  return <rectAreaLight ref={ref} position={[-7, 4.5, 7]} width={7} height={3.5} intensity={18} color="#e6edfb" />;
}

/** Studio light rig expressed as emissive cards baked into the IBL. */
function StudioEnvironment() {
  return (
    <Environment resolution={512} frames={1} background={false} environmentIntensity={2.4}>
      <color attach="background" args={["#05070d"]} />
      {/* broad, dim bounce cards: give metals a mid-value to reflect instead of pure black */}
      <Lightformer form="circle" intensity={0.12} color="#8ea2c4" position={[0, 0, 18]} scale={[30, 14, 1]} />
      <Lightformer form="rect" intensity={0.16} color="#6c7ea3" position={[-16, 0, -4]} rotation-y={Math.PI / 2} scale={[40, 12, 1]} />
      <Lightformer form="rect" intensity={0.16} color="#6c7ea3" position={[16, 0, -4]} rotation-y={-Math.PI / 2} scale={[40, 12, 1]} />
      <Lightformer form="rect" intensity={0.1} color="#5a6a8c" position={[0, -6, -4]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      {/* neutral overhead softboxes carry most of the reflection detail */}
      <Lightformer form="rect" intensity={4.5} color="#f2f5fa" position={[0, 7, -5]} rotation-x={Math.PI / 2} scale={[14, 1.2, 1]} />
      <Lightformer form="rect" intensity={2} color="#f2f5fa" position={[0, 7, 3]} rotation-x={Math.PI / 2} scale={[10, 0.6, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#dfe7f5" position={[-9, 4, 2]} rotation-y={Math.PI / 3} scale={[3, 8, 1]} />
      {/* restrained colour accents */}
      <Lightformer form="rect" intensity={0.9} color="#38bdf8" position={[-8, 1.5, -6]} rotation-y={Math.PI / 2} scale={[16, 0.35, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#7c3aed" position={[8, 1.2, -4]} rotation-y={-Math.PI / 2} scale={[14, 0.3, 1]} />
      <Lightformer form="ring" intensity={1.1} color="#2f6bff" position={[0, 1, -20]} scale={6} />
      <Lightformer form="rect" intensity={0.35} color="#9fb4d9" position={[0, 2, 14]} scale={[10, 5, 1]} />
    </Environment>
  );
}

export function LandingScene({ quality }: { quality: Quality }) {
  const mats = useMaterials();
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <fogExp2 attach="fog" args={["#040713", 0.038]} />
      <StudioEnvironment />
      <ambientLight intensity={0.04} color="#5b7bd6" />

      {/* key light: tight overhead spot with a visible volumetric cone */}
      <SpotLight
        position={[1.5, 9, CORE_Z + 2]}
        target-position={[0, PORTAL_Y, CORE_Z]}
        color="#cfe0ff"
        intensity={60}
        angle={0.32}
        penumbra={0.8}
        distance={22}
        attenuation={11}
        anglePower={6}
        opacity={quality === "high" ? 0.075 : 0.05}
        volumetric
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
      />
      <SpotLight
        position={[-4, 8, 2]}
        color="#7aa7ff"
        intensity={25}
        angle={0.4}
        penumbra={1}
        distance={20}
        attenuation={9}
        anglePower={5}
        opacity={quality === "high" ? 0.04 : 0}
        volumetric={quality === "high"}
      />
      {/* low violet kicker grazing the floor for wet highlights */}
      <rectAreaLight position={[7, -2.6, -6]} rotation-y={Math.PI / 2} width={12} height={0.2} intensity={4} color="#8b5cf6" />
      <KeyLight />

      {RINGS.map((r) => (
        <Ring key={r.z} spec={r} quality={quality} mats={mats} />
      ))}
      <ChromeCore mats={mats} />
      <Floor quality={quality} />
      <ContactShadows position={[0, FLOOR_Y + 0.005, -5]} scale={[12, 22]} opacity={0.75} blur={2.8} far={5} resolution={quality === "high" ? 1024 : 512} frames={1} color="#000208" />
      <Sparkles count={quality === "high" ? 220 : 80} scale={[12, 7, 24]} position={[0, 1, -5]} size={1.1} speed={0.12} opacity={0.28} color="#a8c8ff" noise={0.6} />
    </>
  );
}
