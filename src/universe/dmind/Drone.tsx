import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { surfaceMaps } from "../textures";
import { mission } from "./store";
import { orbit } from "../ui/orbit";

/** Live pose shared with the camera rig and the HUD. */
export const drone = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  target: new THREE.Vector3(),
  /** point the gimbal camera looks at */
  look: new THREE.Vector3(),
  yaw: 0,
  ready: false,
};

/* ----------------------------- materials ----------------------------- */

/** Carbon-fibre twill: woven normal + roughness from a canvas pattern. */
function carbonMaps() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const cell = 16;
  for (let y = 0; y < S; y += cell)
    for (let x = 0; x < S; x += cell) {
      const twill = ((x + y) / cell) % 4 < 2;
      const grad = twill ? g.createLinearGradient(x, y, x + cell, y) : g.createLinearGradient(x, y, x, y + cell);
      grad.addColorStop(0, "#5a5a5a");
      grad.addColorStop(0.5, "#b0b0b0");
      grad.addColorStop(1, "#5a5a5a");
      g.fillStyle = grad;
      g.fillRect(x, y, cell, cell);
    }
  const h = g.getImageData(0, 0, S, S).data;
  const n = new Uint8ClampedArray(S * S * 4);
  const hv = (x: number, y: number) => h[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (hv(x + 1, y) - hv(x - 1, y)) * 2.5;
      const dy = (hv(x, y + 1) - hv(x, y - 1)) * 2.5;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      n[i] = (-dx / l) * 127 + 128;
      n[i + 1] = (dy / l) * 127 + 128;
      n[i + 2] = (1 / l) * 127 + 128;
      n[i + 3] = 255;
    }
  const normal = new THREE.DataTexture(n, S, S, THREE.RGBAFormat);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(6, 6);
  normal.generateMipmaps = true;
  normal.minFilter = THREE.LinearMipmapLinearFilter;
  normal.needsUpdate = true;
  return normal;
}

let mats: ReturnType<typeof buildMats> | null = null;
function buildMats() {
  const weave = carbonMaps();
  const scuff = surfaceMaps({ base: 0.38, variation: 0.16, smudges: 14, scratches: 220, normalStrength: 1.2, seed: 91 });
  const brushed = surfaceMaps({ base: 0.28, variation: 0.1, smudges: 6, scratches: 160, brushed: 10, normalStrength: 1, seed: 92, repeat: [3, 1] });
  return {
    carbon: new THREE.MeshPhysicalMaterial({ color: "#121419", metalness: 0.2, roughness: 0.45, normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, clearcoatRoughness: 0.12 }),
    shell: new THREE.MeshPhysicalMaterial({ color: "#2a2f37", metalness: 0.1, roughness: 1, roughnessMap: scuff.roughness, normalMap: scuff.normal, normalScale: new THREE.Vector2(0.2, 0.2), clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    matte: new THREE.MeshPhysicalMaterial({ color: "#3b4048", metalness: 0, roughness: 0.75, roughnessMap: scuff.roughness }),
    alu: new THREE.MeshPhysicalMaterial({ color: "#b9c0c9", metalness: 1, roughness: 1, roughnessMap: brushed.roughness, normalMap: brushed.normal, normalScale: new THREE.Vector2(0.3, 0.3), anisotropy: 0.7 }),
    darkAlu: new THREE.MeshPhysicalMaterial({ color: "#2b2f36", metalness: 0.95, roughness: 0.35, roughnessMap: brushed.roughness }),
    prop: new THREE.MeshPhysicalMaterial({ color: "#0e0f12", metalness: 0, roughness: 0.42, clearcoat: 0.4, side: THREE.DoubleSide }),
    lens: new THREE.MeshPhysicalMaterial({ color: "#05070c", metalness: 0, roughness: 0.02, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600] }),
    rubber: new THREE.MeshPhysicalMaterial({ color: "#16171a", metalness: 0, roughness: 0.9 }),
  };
}
const useMats = () => (mats ??= buildMats());

/* ----------------------------- parts ----------------------------- */

/** Propeller blade: airfoil planform, extruded thin, twisted along its span. */
function useBladeGeometry() {
  return useMemo(() => {
    const L = 0.17;
    const s = new THREE.Shape();
    const chord = (t: number) => 0.012 + 0.03 * Math.sin(Math.min(1, t / 0.32) * Math.PI * 0.5) * (1 - 0.55 * Math.max(0, (t - 0.32) / 0.68));
    const N = 24;
    s.moveTo(0, -0.008);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      s.lineTo(t * L, -chord(t) * 0.35);
    }
    s.quadraticCurveTo(L + 0.008, 0, L, chord(1) * 0.65);
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      s.lineTo(t * L, chord(t) * 0.65);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 12, steps: 1 });
    g.translate(0, 0, -0.00125);
    g.rotateX(-Math.PI / 2); // lie flat in XZ, span along +X
    // twist: pitch angle decreases from root (~22°) to tip (~8°)
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = THREE.MathUtils.clamp(v.x / L, 0, 1);
      const a = THREE.MathUtils.degToRad(22 - 14 * t);
      const y = v.y * Math.cos(a) - v.z * Math.sin(a);
      const z = v.y * Math.sin(a) + v.z * Math.cos(a);
      p.setXYZ(i, v.x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

function Rotor({ position, dir }: { position: [number, number, number]; dir: 1 | -1 }) {
  const m = useMats();
  const blade = useBladeGeometry();
  const spin = useRef<THREE.Group>(null);
  const disc = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, "rgba(20,22,26,0.0)");
    grad.addColorStop(0.25, "rgba(20,22,26,0.22)");
    grad.addColorStop(0.9, "rgba(20,22,26,0.14)");
    grad.addColorStop(1, "rgba(20,22,26,0.0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  }, []);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dir * (mission.reducedMotion ? 0 : 31) * Math.min(dt, 0.05);
  });
  return (
    <group position={position}>
      {/* motor: stator mount, ventilated bell, cap */}
      <mesh material={m.darkAlu} position={[0, -0.012, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.032, 0.016, 32]} />
      </mesh>
      <mesh material={m.alu} position={[0, 0.008, 0]} castShadow>
        <cylinderGeometry args={[0.031, 0.031, 0.026, 32]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 10) * Math.PI * 2) * 0.0312, 0.008, Math.sin((i / 10) * Math.PI * 2) * 0.0312]} rotation-y={-(i / 10) * Math.PI * 2}>
          <boxGeometry args={[0.002, 0.016, 0.007]} />
          <meshStandardMaterial color="#07080a" roughness={0.9} />
        </mesh>
      ))}
      <group ref={spin} position={[0, 0.026, 0]}>
        <mesh material={m.darkAlu} castShadow>
          <cylinderGeometry args={[0.012, 0.014, 0.012, 24]} />
        </mesh>
        <mesh geometry={blade} material={m.prop} castShadow />
        <mesh geometry={blade} material={m.prop} rotation-y={Math.PI} castShadow />
      </group>
      {/* motion-blur disc of the spinning prop */}
      <mesh position={[0, 0.027, 0]} rotation-x={-Math.PI / 2} material={disc}>
        <circleGeometry args={[0.18, 48]} />
      </mesh>
    </group>
  );
}

function Skids() {
  const m = useMats();
  const legs = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    for (const side of [-1, 1])
      for (const fz of [-1, 1]) {
        const c = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.05, -0.03, fz * 0.06),
          new THREE.Vector3(side * 0.09, -0.08, fz * 0.07),
          new THREE.Vector3(side * 0.12, -0.16, fz * 0.075),
        ]);
        out.push(new THREE.TubeGeometry(c, 16, 0.006, 10, false));
      }
    return out;
  }, []);
  return (
    <group>
      {legs.map((g, i) => (
        <mesh key={i} geometry={g} material={m.carbon} castShadow />
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.12, -0.163, 0]}>
          <mesh material={m.carbon} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.007, 0.007, 0.26, 12]} />
          </mesh>
          {[-1, 1].map((e) => (
            <mesh key={e} material={m.rubber} position={[0, 0, e * 0.13]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.009, 0.009, 0.012, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Gimbal({ gimbalRef }: { gimbalRef: React.RefObject<THREE.Group> }) {
  const m = useMats();
  return (
    <group position={[0, -0.05, 0.1]}>
      {/* damper plate + yaw arm */}
      <RoundedBox args={[0.07, 0.008, 0.05]} radius={0.003} material={m.darkAlu} />
      <mesh material={m.darkAlu} position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.035, 12]} />
      </mesh>
      <group ref={gimbalRef} position={[0, -0.045, 0]}>
        <RoundedBox args={[0.075, 0.012, 0.012]} radius={0.004} material={m.darkAlu} position={[0, 0.025, 0]} />
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.008, 0.04, 0.02]} radius={0.003} material={m.darkAlu} position={[s * 0.036, 0.008, 0]} />
        ))}
        <mesh material={m.shell} castShadow>
          <sphereGeometry args={[0.03, 32, 24]} />
        </mesh>
        <mesh material={m.darkAlu} position={[0, 0, 0.027]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.02, 0.012, 32]} />
        </mesh>
        <mesh material={m.lens} position={[0, 0, 0.0335]}>
          <sphereGeometry args={[0.0145, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
}

function NavLight({ position, color, strobe = false }: { position: [number, number, number]; color: string; strobe?: boolean }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  const base = useMemo(() => new THREE.Color(color).multiplyScalar(strobe ? 14 : 6), [color, strobe]);
  useFrame((s) => {
    if (!ref.current) return;
    if (strobe) {
      const t = s.clock.elapsedTime % 1.2;
      ref.current.color.copy(base).multiplyScalar(t < 0.06 || (t > 0.16 && t < 0.22) ? 1 : 0.02);
    }
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.0055, 12, 8]} />
      <meshBasicMaterial ref={ref} color={base} toneMapped={false} />
    </mesh>
  );
}

/* ----------------------------- assembly ----------------------------- */

const ARM = 0.32; // hub centre → motor, metres (≈0.9 m motor-to-motor diagonal)

export function Drone() {
  const m = useMats();
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const gimbal = useRef<THREE.Group>(null);
  const prevVel = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const arms = useMemo(
    () =>
      [45, 135, 225, 315].map((deg, i) => {
        const a = THREE.MathUtils.degToRad(deg);
        return { a, x: Math.cos(a) * ARM, z: Math.sin(a) * ARM, dir: (i % 2 ? 1 : -1) as 1 | -1 };
      }),
    [],
  );

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    if (!drone.ready) {
      drone.pos.copy(drone.target);
      drone.ready = true;
    }
    // critically-damped follow of the mission target (feels like a real multirotor)
    const k = mission.reducedMotion ? 1 : 1 - Math.exp(-d * 0.9);
    tmp.copy(drone.target).sub(drone.pos).multiplyScalar(k);
    drone.vel.copy(tmp).divideScalar(Math.max(d, 1e-3));
    drone.pos.add(tmp);
    const t = state.clock.elapsedTime;
    const bob = mission.reducedMotion ? 0 : Math.sin(t * 1.3) * 0.05 + Math.sin(t * 0.37) * 0.08;

    const g = root.current;
    if (!g) return;
    g.position.set(drone.pos.x, drone.pos.y + bob, drone.pos.z);
    // yaw toward travel when moving fast, otherwise face the look target
    const face = tmp.set(drone.look.x - drone.pos.x, 0, drone.look.z - drone.pos.z);
    if (face.lengthSq() > 1) {
      const want = Math.atan2(face.x, face.z);
      let diff = want - drone.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      drone.yaw += diff * (mission.reducedMotion ? 1 : 1 - Math.exp(-d * 1.2));
    }
    g.rotation.y = drone.yaw;
    // bank / pitch into acceleration (in body frame)
    const acc = prevVel.lerp(drone.vel, 0.1);
    const fwd = new THREE.Vector3(Math.sin(drone.yaw), 0, Math.cos(drone.yaw));
    // nose is +Z, so the drone's right-hand side is −X in its own frame
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.clamp(acc.dot(fwd) * 0.012, -0.35, 0.35);
      tilt.current.rotation.z = THREE.MathUtils.clamp(acc.dot(right) * 0.012, -0.35, 0.35) + (mission.reducedMotion ? 0 : Math.sin(t * 0.8) * 0.01);
    }
    // gimbal pitch toward the look point
    if (gimbal.current) {
      const to = new THREE.Vector3().subVectors(drone.look, g.position);
      const horiz = Math.hypot(to.x, to.z);
      const pitch = Math.atan2(-to.y, horiz);
      gimbal.current.rotation.x += (THREE.MathUtils.clamp(pitch, 0, Math.PI / 2) - gimbal.current.rotation.x) * Math.min(1, d * 3);
    }
  });

  return (
    <group
      ref={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (orbit.wasDrag()) return;
        mission.goTo("drone");
      }}
      onPointerOver={() => mission.setHovered("drone")}
      onPointerOut={() => mission.setHovered(null)}
    >
      <group ref={tilt} scale={1}>
        {/* hub: carbon deck, graphite canopy, battery */}
        <RoundedBox args={[0.2, 0.05, 0.26]} radius={0.018} smoothness={4} material={m.carbon} castShadow />
        <RoundedBox args={[0.17, 0.045, 0.22]} radius={0.02} smoothness={4} material={m.shell} position={[0, 0.042, 0.005]} castShadow />
        <RoundedBox args={[0.1, 0.035, 0.15]} radius={0.01} smoothness={3} material={m.matte} position={[0, 0.078, -0.01]} castShadow />
        <mesh position={[0, 0.0965, -0.01]}>
          <boxGeometry args={[0.06, 0.002, 0.004]} />
          <meshBasicMaterial color={new THREE.Color("#22d3ee").multiplyScalar(3)} toneMapped={false} />
        </mesh>
        {/* GPS mast */}
        <mesh material={m.darkAlu} position={[0, 0.13, -0.07]}>
          <cylinderGeometry args={[0.003, 0.003, 0.07, 8]} />
        </mesh>
        <mesh material={m.shell} position={[0, 0.168, -0.07]} castShadow>
          <cylinderGeometry args={[0.022, 0.024, 0.01, 24]} />
        </mesh>
        {/* arms with folding hinges, motors and rotors */}
        {arms.map((a, i) => (
          <group key={i}>
            <mesh material={m.carbon} position={[a.x / 2, 0, a.z / 2]} rotation={[0, -a.a, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, ARM - 0.04, 16]} />
            </mesh>
            <RoundedBox args={[0.04, 0.03, 0.03]} radius={0.006} material={m.darkAlu} position={[Math.cos(a.a) * 0.11, 0, Math.sin(a.a) * 0.11]} rotation-y={-a.a} />
            <Rotor position={[a.x, 0.02, a.z]} dir={a.dir} />
          </group>
        ))}
        <Skids />
        <Gimbal gimbalRef={gimbal} />
        {/* aviation lights: left (+X) red, right (−X) green, rear white strobe */}
        <NavLight position={[Math.cos(THREE.MathUtils.degToRad(45)) * ARM, -0.01, Math.sin(THREE.MathUtils.degToRad(45)) * ARM]} color="#ff2b2b" />
        <NavLight position={[Math.cos(THREE.MathUtils.degToRad(135)) * ARM, -0.01, Math.sin(THREE.MathUtils.degToRad(135)) * ARM]} color="#2bff6a" />
        <NavLight position={[0, 0.02, -0.135]} color="#ffffff" strobe />
      </group>
    </group>
  );
}
