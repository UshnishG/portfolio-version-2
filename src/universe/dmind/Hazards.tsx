import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { surfaceMaps } from "../textures";
import { useHeightField, type Site } from "./heightfield";
import { mission, type Box } from "./store";

/* ---------------------------------------------------------------- helpers */

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Exact ground height by raycasting the rendered terrain mesh (matches its triangles). */
function useGround() {
  const { scene } = useThree();
  return useMemo(() => {
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    return (x: number, z: number, fallback: number) => {
      const terrain = scene.getObjectByName("terrain");
      if (!terrain) return fallback;
      ray.set(new THREE.Vector3(x, 5000, z), down);
      const hit = ray.intersectObject(terrain, false)[0];
      return hit ? hit.point.y : fallback;
    };
  }, [scene]);
}

type Target = { id: string; label: string; tone: Box["tone"]; center: THREE.Vector3; size: THREE.Vector3; station: "minefield" | "incident" };
const targets: Target[] = [];

/** Projects every registered target's 3D box to a 2D screen rect for the HUD. */
export function DetectionProjector() {
  const { camera, size } = useThree();
  const corners = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3()), []);
  const tick = useRef(0);
  useFrame(() => {
    if (++tick.current % 2) return;
    const st = mission.station.id;
    mission.boxes = targets.map((t) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, behind = false;
      let k = 0;
      for (const sx of [-0.5, 0.5])
        for (const sy of [-0.5, 0.5])
          for (const sz of [-0.5, 0.5]) {
            const c = corners[k++].set(t.center.x + sx * t.size.x, t.center.y + sy * t.size.y, t.center.z + sz * t.size.z).project(camera);
            if (c.z > 1) behind = true;
            const px = (c.x * 0.5 + 0.5) * size.width;
            const py = (1 - (c.y * 0.5 + 0.5)) * size.height;
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py);
          }
      // its own step, or the Deployment loop while the drone is scanning that site
      const live = st === t.station || (st === "system" && mission.scanning === t.station);
      const on = live && !behind && maxX > 0 && minX < size.width && maxY > 0 && minY < size.height;
      return { id: t.id, label: t.label, tone: t.tone, x: minX, y: minY, w: maxX - minX, h: maxY - minY, on };
    });
  });
  return null;
}

/* ---------------------------------------------------------------- minefield */

export function Minefield({ site }: { site: Site }) {
  const ground = useGround();
  const [placed, setPlaced] = useState<{ p: THREE.Vector3; r: number; rot: number; kind: "mine" | "rock" }[]>([]);
  const mats = useMemo(() => {
    const worn = surfaceMaps({ base: 0.6, variation: 0.25, smudges: 18, scratches: 200, normalStrength: 2.2, seed: 101 });
    return {
      casing: new THREE.MeshPhysicalMaterial({ color: "#7a7a58", metalness: 0.45, roughness: 1, roughnessMap: worn.roughness, normalMap: worn.normal, normalScale: new THREE.Vector2(0.6, 0.6), clearcoat: 0.2 }),
      plate: new THREE.MeshPhysicalMaterial({ color: "#8f8c6a", metalness: 0.6, roughness: 0.55, roughnessMap: worn.roughness }),
      rock: new THREE.MeshStandardMaterial({ color: "#6b6258", roughness: 0.95, normalMap: worn.normal, normalScale: new THREE.Vector2(1.2, 1.2) }),
      soil: new THREE.MeshStandardMaterial({ color: "#3d3024", roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }),
    };
  }, []);

  // Place after the terrain mesh exists so raycasts hit its real surface.
  useLayoutEffect(() => {
    const r = rng(4242);
    const out: typeof placed = [];
    for (let i = 0; i < 26; i++) {
      const kind = i < 14 ? "mine" : "rock";
      const x = site.x + (r() - 0.5) * 16;
      const z = site.z + (r() - 0.5) * 12;
      out.push({ p: new THREE.Vector3(x, ground(x, z, site.y), z), r: kind === "mine" ? 0.11 + r() * 0.05 : 0.08 + r() * 0.12, rot: r() * Math.PI, kind });
    }
    setPlaced(out);
    targets.splice(0, targets.length, ...targets.filter((t) => t.station !== "minefield"));
    out
      .filter((o) => o.kind === "mine")
      .forEach((o, i) => targets.push({ id: `mine${i}`, label: "landmine", tone: "mine", station: "minefield", center: o.p.clone().add(new THREE.Vector3(0, 0.02, 0)), size: new THREE.Vector3(o.r * 2.4, 0.12, o.r * 2.4) }));
  }, [site, ground]);

  const rockGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const r = rng(77);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.4), p.getY(i) * (0.45 + r() * 0.2), p.getZ(i) * (0.8 + r() * 0.4));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group>
      {placed.map((o, i) =>
        o.kind === "mine" ? (
          // anti-tank style casing, ~60% buried, with disturbed soil ring
          <group key={i} position={o.p} rotation={[0.08 * Math.sin(i), o.rot, 0.06 * Math.cos(i)]}>
            <mesh material={mats.casing} position={[0, 0.015, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[o.r, o.r * 1.04, 0.07, 32]} />
            </mesh>
            <mesh material={mats.plate} position={[0, 0.052, 0]} castShadow>
              <cylinderGeometry args={[o.r * 0.45, o.r * 0.5, 0.012, 24]} />
            </mesh>
            <mesh material={mats.soil} position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[o.r * 1.0, o.r * 1.9, 32]} />
            </mesh>
          </group>
        ) : (
          <mesh key={i} geometry={rockGeo} material={mats.rock} position={o.p} rotation-y={o.rot} scale={o.r} castShadow receiveShadow />
        ),
      )}
    </group>
  );
}

/* ---------------------------------------------------------------- fire + people */

function flameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSeed; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int k=0;k<5;k++){ s+=a*n(p); p*=2.1; a*=0.5; } return s; }
      void main(){
        vec2 uv = vUv;
        float t = uTime * 1.6 + uSeed;
        float shape = (1.0 - uv.y) * (1.0 - pow(abs(uv.x - 0.5) * 2.0, 1.6));
        float turb = fbm(vec2(uv.x * 3.0, uv.y * 2.2 - t));
        float f = smoothstep(0.18, 0.75, shape * 1.25 * turb + shape * 0.25);
        vec3 col = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.75, 0.3), smoothstep(0.35, 0.9, f));
        col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.85, 1.0, f));
        gl_FragColor = vec4(col * f * 3.2, f * 0.9);
      }`,
  });
}

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 18; i++) {
    const x = 40 + Math.random() * 48;
    const y = 40 + Math.random() * 48;
    const r = 18 + Math.random() * 30;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.16)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function Fire({ at }: { at: THREE.Vector3 }) {
  const flames = useMemo(() => Array.from({ length: 7 }, () => flameMaterial()), []);
  const smoke = useRef<THREE.InstancedMesh>(null);
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({ map: smokeTexture(), color: "#5b5a57", transparent: true, depthWrite: false, opacity: 0.9 }), []);
  const puffs = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ seed: i * 0.61, phase: Math.random() })), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);

  useFrame((st) => {
    const t = mission.reducedMotion ? 0 : st.clock.elapsedTime;
    flames.forEach((m) => (m.uniforms.uTime.value = t));
    if (light.current) light.current.intensity = 900 + Math.sin(t * 13) * 120 + Math.sin(t * 7.3) * 90;
    const im = smoke.current;
    if (!im) return;
    puffs.forEach((p, i) => {
      const life = (p.phase + t * 0.06) % 1;
      const drift = life * 9;
      o.position.set(at.x + Math.sin(p.seed * 7) * 1.5 + drift * 0.9, at.y + 1 + life * 18, at.z + Math.cos(p.seed * 5) * 1.5 + drift * 0.4);
      o.quaternion.copy(camera.quaternion);
      const s = 2 + life * 9;
      o.scale.set(s, s, s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {flames.map((m, i) => {
        const a = (i / flames.length) * Math.PI;
        const off = (i % 3) - 1;
        return (
          <mesh key={i} material={m} position={[at.x + off * 0.9, at.y + 0.9, at.z + ((i * 0.7) % 2) - 1]} rotation-y={a}>
            <planeGeometry args={[2.2, 2.0]} />
          </mesh>
        );
      })}
      {/* scorched ground */}
      <mesh position={[at.x, at.y + 0.05, at.z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[4.5, 40]} />
        <meshStandardMaterial color="#120d0a" roughness={1} transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[at.x, at.y + 1.5, at.z]} color="#ff7a2a" distance={40} decay={2} intensity={900} />
      <instancedMesh ref={smoke} args={[undefined, smokeMat, puffs.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
    </group>
  );
}

function Person({ position, coat, rot }: { position: THREE.Vector3; coat: string; rot: number }) {
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: coat, roughness: 0.85 }), [coat]);
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5640", roughness: 0.6 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d1f24", roughness: 0.8 }), []);
  return (
    <group position={position} rotation-y={rot}>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} material={dark} position={[x, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.68, 4, 10]} />
        </mesh>
      ))}
      <mesh material={cloth} position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.42, 4, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={cloth} position={[s * 0.25, 1.08, 0.02]} rotation-z={s * 0.12} castShadow>
          <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        </mesh>
      ))}
      <mesh material={skin} position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>
    </group>
  );
}

export function Incident({ site }: { site: Site }) {
  const ground = useGround();
  const [spots, setSpots] = useState<{ fire: THREE.Vector3; people: { p: THREE.Vector3; coat: string; rot: number }[] } | null>(null);
  useLayoutEffect(() => {
    const fx = site.x + 4;
    const fz = site.z - 3;
    const fire = new THREE.Vector3(fx, ground(fx, fz, site.y), fz);
    const coats = ["#5b6b7d", "#8a6a3c", "#3f5a46"];
    const people = [
      [-9, 6],
      [-11.5, 4.5],
      [-7, 9],
    ].map(([dx, dz], i) => {
      const x = site.x + dx;
      const z = site.z + dz;
      return { p: new THREE.Vector3(x, ground(x, z, site.y), z), coat: coats[i], rot: 0.6 + i * 0.5 };
    });
    setSpots({ fire, people });
    targets.splice(0, targets.length, ...targets.filter((t) => t.station !== "incident"));
    targets.push({ id: "fire", label: "fire", tone: "fire", station: "incident", center: fire.clone().add(new THREE.Vector3(0, 1.0, 0)), size: new THREE.Vector3(4.2, 2.2, 3.4) });
    people.forEach((pp, i) => targets.push({ id: `person${i}`, label: "person", tone: "human", station: "incident", center: pp.p.clone().add(new THREE.Vector3(0, 0.85, 0)), size: new THREE.Vector3(0.6, 1.75, 0.5) }));
  }, [site, ground]);
  if (!spots) return null;
  return (
    <group>
      <Fire at={spots.fire} />
      {spots.people.map((p, i) => (
        <Person key={i} position={p.p} coat={p.coat} rot={p.rot} />
      ))}
    </group>
  );
}

export function useSites() {
  return useHeightField().sites;
}
