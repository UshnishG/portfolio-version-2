import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { surfaceMaps } from "../textures";
import { GERSTNER_GLSL, SEABED_Y } from "./waves";
import { sea } from "./store";
import type { Quality } from "../post";

/* -------------------------------------------------------------- sea surface */

export function SeaSurface({ quality }: { quality: Quality }) {
  const mat = useMemo(() => {
    const ripples = surfaceMaps({ base: 0.1, variation: 0.05, smudges: 0, scratches: 0, normalStrength: 3.5, seed: 131, repeat: [60, 60] });
    const m = new THREE.MeshPhysicalMaterial({
      color: "#0b3442",
      roughness: 0.06,
      metalness: 0,
      ior: 1.333,
      reflectivity: 0.5,
      normalMap: ripples.normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
      sheen: 0.25,
      sheenColor: new THREE.Color("#2a8a9a"),
    });
    const uniforms = { uTime: { value: 0 } };
    m.userData.uniforms = uniforms;
    m.userData.ripples = ripples.normal;
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = uniforms.uTime;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", `#include <common>\nuniform float uTime;\nvarying float vCrest;\nvarying vec3 vSeaW;\n${GERSTNER_GLSL}`)
        .replace(
          "#include <beginnormal_vertex>",
          `vec3 gN; vec3 gP = gerstner(position, gN);
           vec3 objectNormal = gN;
           #ifdef USE_TANGENT
             vec3 objectTangent = vec3( tangent.xyz );
           #endif`,
        )
        .replace("#include <begin_vertex>", `vec3 transformed = gP; vCrest = gP.y; vSeaW = gP;`);
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying float vCrest;\nvarying vec3 vSeaW;\nuniform float uTime;`)
        .replace(
          "#include <dithering_fragment>",
          /* glsl */ `
          // whitecap foam on the steepest crests, broken up by noise
          float f = smoothstep(0.42, 0.62, vCrest) * (0.5 + 0.5 * sin(vSeaW.x * 1.7 + uTime * 0.6) * sin(vSeaW.z * 2.3 - uTime * 0.4));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.86, 0.9, 0.92), clamp(f, 0.0, 1.0) * 0.55);
          #include <dithering_fragment>`,
        );
    };
    return m;
  }, []);

  useFrame((st) => {
    const t = sea.reducedMotion ? 0 : st.clock.elapsedTime;
    (mat.userData.uniforms as { uTime: { value: number } }).uTime.value = t;
    const n = mat.userData.ripples as THREE.Texture;
    n.offset.set(t * 0.004, t * 0.0025);
  });

  // geometry already lies in XZ with an identity transform, so object space == world space
  const geo = useMemo(() => {
    const seg = quality === "high" ? 320 : 160;
    const g = new THREE.PlaneGeometry(420, 420, seg, seg);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [quality]);
  return <mesh geometry={geo} material={mat} receiveShadow frustumCulled={false} />;
}

/* -------------------------------------------------------------- seabed + caustics */

export function Seabed() {
  const mat = useMemo(() => {
    const sand = surfaceMaps({ base: 0.9, variation: 0.08, smudges: 0, scratches: 40, normalStrength: 2.5, seed: 141, repeat: [40, 40] });
    const m = new THREE.MeshStandardMaterial({ color: "#8c7f63", roughness: 1, normalMap: sand.normal, normalScale: new THREE.Vector2(0.8, 0.8) });
    const uniforms = { uTime: { value: 0 } };
    m.userData.uniforms = uniforms;
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = uniforms.uTime;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBedW;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvBedW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBedW;\nuniform float uTime;")
        .replace(
          "#include <dithering_fragment>",
          /* glsl */ `
          // caustics: interference of three moving wave fields focused by the surface
          vec2 p = vBedW.xz * 0.55;
          float c = 0.0;
          for (int i = 0; i < 3; i++) {
            float a = float(i) * 2.094;
            vec2 d = vec2(cos(a), sin(a));
            c += sin(dot(p, d) * 3.1 + uTime * (1.1 + 0.3 * float(i)) + sin(dot(p, d.yx) * 1.7 + uTime * 0.7) * 1.4);
          }
          c = pow(max(0.0, c / 3.0 * 0.5 + 0.5), 7.0);
          gl_FragColor.rgb += vec3(0.55, 0.85, 0.8) * c * 0.9;
          #include <dithering_fragment>`,
        );
    };
    return m;
  }, []);
  useFrame((st) => {
    (mat.userData.uniforms as { uTime: { value: number } }).uTime.value = sea.reducedMotion ? 0 : st.clock.elapsedTime;
  });
  // gentle dunes
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(260, 260, 160, 160);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, Math.sin(x * 0.08) * 0.5 + Math.sin(z * 0.11 + x * 0.03) * 0.4 + Math.sin(x * 0.31 + z * 0.27) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} material={mat} position-y={SEABED_Y} receiveShadow />;
}

/* -------------------------------------------------------------- marine snow + light shafts */

export function MarineSnow() {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const geo = useMemo(() => {
    const N = 2500;
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) a.set([(Math.random() - 0.5) * 40, SEABED_Y + Math.random() * 15, (Math.random() - 0.5) * 40], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  useFrame((st, dt) => {
    const pts = ref.current;
    if (!pts) return;
    pts.visible = sea.underwater;
    if (!pts.visible) return;
    // keep the particle volume centred on the camera; particles sink slowly
    pts.position.set(Math.round(camera.position.x / 40) * 40, 0, Math.round(camera.position.z / 40) * 40);
    const p = geo.attributes.position as THREE.BufferAttribute;
    if (!sea.reducedMotion)
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 0.05;
        if (y < SEABED_Y) y = -1;
        p.setY(i, y);
      }
    p.needsUpdate = true;
    void st;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.035} color="#cfe6e2" transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

export function LightShafts() {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform float uTime;
          void main(){
            float fall = smoothstep(0.0, 1.0, vUv.y);                 // bright near the surface
            float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
            float flick = 0.75 + 0.25 * sin(uTime * 0.9 + vUv.x * 8.0);
            float a = fall * edge * edge * flick * 0.07;
            gl_FragColor = vec4(vec3(0.6, 0.9, 0.85) * a, a);
          }`,
      }),
    [],
  );
  const shafts = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 3.2 + Math.sin(i * 7.1) * 1.2, z: Math.cos(i * 3.3) * 4, w: 1.4 + (i % 3) * 0.6, rot: 0.25 + Math.sin(i) * 0.12 })), []);
  useFrame((st) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    if (group.current) group.current.visible = sea.underwater;
  });
  return (
    <group ref={group} position={[0, SEABED_Y / 2, 0]}>
      {shafts.map((s, i) => (
        <mesh key={i} material={mat} position={[s.x, 0, s.z]} rotation={[0, i * 0.9, s.rot]}>
          <planeGeometry args={[s.w, -SEABED_Y + 2]} />
        </mesh>
      ))}
    </group>
  );
}
