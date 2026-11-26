import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { W, type NBodySim } from "./sim";
import { lab } from "./store";

/** Sim units → world units. The disk (r ≈ 1.2) spans ~24 m of world space. */
export const S = 10;

/* -------------------------------------------------------------------------- bodies */

const bodyVert = /* glsl */ `
  uniform sampler2D tPos;
  uniform sampler2D tVel;
  uniform float uSize;
  uniform float uPxScale;   // drawing-buffer height / (2·tan(fov/2))
  uniform float uMode;      // 0 none · 1 tiling · 3 monte carlo
  uniform float uTileStart;
  uniform float uTileEnd;
  uniform float uFocus;
  uniform sampler2D tMask;
  attribute vec2 aRef;
  attribute float aIndex;
  attribute float aSeed;
  varying vec2 vQ;
  varying vec3 vColor;
  varying float vHi;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  vec3 starColor(float s) {
    // mostly blue-white disk population, some white, a few orange giants
    if (s < 0.62) return vec3(0.72, 0.82, 1.0);
    if (s < 0.9) return vec3(1.0, 0.96, 0.9);
    return vec3(1.0, 0.72, 0.45);
  }
  void main() {
    vec4 p = texture2D(tPos, aRef);
    vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    // physical size in world units → pixels under perspective, with a 1.5 px floor
    float size = uSize * (0.6 + 0.8 * hash(aSeed * 7.1));
    gl_PointSize = max(1.5, size * uPxScale / -mv.z);
    vQ = vec2(0.0);
    // power-law luminosity: most stars faint, a few very bright
    vColor = starColor(aSeed) * (0.35 + 3.2 * pow(hash(aSeed * 3.3), 7.0));
    // highlights for the algorithm steps
    vHi = 0.0;
    if (uMode == 1.0 && aIndex >= uTileStart && aIndex < uTileEnd) vHi = 1.0;
    if (uMode == 3.0 && texture2D(tMask, aRef).r > 0.5) vHi = 1.0;
    if (aIndex == uFocus && uMode > 0.0) vHi = 2.0;
  }
`;

const bodyFrag = /* glsl */ `
  varying vec2 vQ;
  varying vec3 vColor;
  varying float vHi;
  void main() {
    // stellar point-spread: tight gaussian core + faint halo
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(q, q);
    if (r2 > 1.0) discard;
    float a = exp(-r2 * 6.0) + 0.08 * exp(-r2 * 1.5);
    vec3 col = vColor;
    if (vHi > 1.5) col = vec3(1.0, 1.0, 1.0) * 8.0;            // focus body
    else if (vHi > 0.5) col = vec3(0.35, 0.85, 1.0) * 3.2;      // tile / sampled subset
    // additive: alpha 1 so intensity falls off once (a), not twice (a²)
    gl_FragColor = vec4(col * a * 2.2, 1.0);
  }
`;

export function Bodies({ sim }: { sim: NBodySim }) {
  const { size, camera } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = sim.n - 1; // body 0 (central mass) is drawn separately
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const ref = new Float32Array(n * 2);
    const idx = new Float32Array(n);
    const seed = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const i = k + 1;
      ref[k * 2] = ((i % W) + 0.5) / W;
      ref[k * 2 + 1] = (Math.floor(i / W) + 0.5) / sim.h;
      idx[k] = i;
      seed[k] = ((i * 2654435761) % 4294967296) / 4294967296;
    }
    g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
    g.setAttribute("aIndex", new THREE.BufferAttribute(idx, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    return g;
  }, [sim]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bodyVert,
        fragmentShader: bodyFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          tPos: { value: null },
          tVel: { value: null },
          uSize: { value: 0.05 },
          uPxScale: { value: 800 },
          uMode: { value: 0 },
          uTileStart: { value: 0 },
          uTileEnd: { value: 0 },
          uFocus: { value: -1 },
          tMask: { value: null },
        },
      }),
    [],
  );

  useFrame(({ gl }) => {
    const pc = camera as THREE.PerspectiveCamera;
    mat.uniforms.uPxScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(pc.fov) / 2));
    mat.uniforms.tPos.value = sim.positionTexture;
    mat.uniforms.tVel.value = sim.velocityTexture;
    const h = overlayState;
    mat.uniforms.uMode.value = h.mode;
    mat.uniforms.uTileStart.value = h.tileStart;
    mat.uniforms.uTileEnd.value = h.tileEnd;
    mat.uniforms.uFocus.value = h.focus;
    mat.uniforms.tMask.value = h.mask;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={2} />;
}

/** Algorithm-highlight state, written by the overlays, read by the body shader. */
export const overlayState = {
  mode: 0,
  tileStart: 0,
  tileEnd: 0,
  focus: -1,
  /** Monte Carlo sample membership, one texel per body */
  mask: null as THREE.DataTexture | null,
  /** HUD readouts */
  tile: 0,
  tiles: 0,
  sample: 0,
};

/* --------------------------------------------------------------- disk glow */

/** Unresolved starlight: a faint, centrally concentrated glow in the disk plane. */
export function DiskGlow() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vP;
          void main(){
            float r = length(vP);
            float bulge = exp(-r / 0.09) * 0.9;
            float disk = exp(-r / 0.42) * smoothstep(1.35, 0.9, r) * 0.22;
            vec3 col = vec3(1.0, 0.86, 0.68) * bulge + vec3(0.62, 0.7, 0.95) * disk;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={1}>
      <circleGeometry args={[1.4, 96]} />
    </mesh>
  );
}

/* --------------------------------------------------------------- central mass */

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,240,210,1)");
  grad.addColorStop(0.08, "rgba(255,214,150,0.65)");
  grad.addColorStop(0.3, "rgba(255,170,90,0.12)");
  grad.addColorStop(1, "rgba(255,150,80,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function CentralMass({ sim }: { sim: NBodySim }) {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => glowTexture(), []);
  const buf = useMemo(() => new Float32Array(4), []);
  const frame = useRef(0);
  useFrame(() => {
    // follow body 0 (the central mass moves slightly as the disk pulls on it)
    if (++frame.current % 10 === 0 && group.current) {
      sim.readCentral(buf);
      group.current.position.set(buf[0], buf[1], buf[2]);
    }
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.012, 32, 24]} />
        <meshBasicMaterial color={new THREE.Color("#ffd9a0").multiplyScalar(9)} toneMapped={false} />
      </mesh>
      <sprite scale={[0.16, 0.16, 1]}>
        <spriteMaterial map={tex} color={new THREE.Color(2.2, 1.9, 1.5)} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/** The dropped rogue star: a hot blue-white star with a glow, tracked from the CPU integrator. */
export function RogueStar({ sim }: { sim: NBodySim }) {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => glowTexture(), []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = sim.pert.m > 0;
    if (g.visible) g.position.copy(sim.pert.p);
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[0.01, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color("#cfe0ff").multiplyScalar(10)} toneMapped={false} />
      </mesh>
      <sprite scale={[0.12, 0.12, 1]}>
        <spriteMaterial map={tex} color={new THREE.Color(1.2, 1.5, 2.4)} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/* --------------------------------------------------------------- deep space */

/** Background starfield with a realistic temperature/brightness distribution. */
export function Starfield() {
  const geo = useMemo(() => {
    const N = 9000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const temps = [new THREE.Color("#9bb0ff"), new THREE.Color("#cad7ff"), new THREE.Color("#f8f7ff"), new THREE.Color("#fff4ea"), new THREE.Color("#ffd2a1"), new THREE.Color("#ffad51")];
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const q = Math.sqrt(1 - u * u);
      // concentrate a faint band (galactic plane) around a tilted great circle
      const band = r() < 0.45;
      const y = band ? (r() - 0.5) * 0.22 : u;
      const qq = band ? Math.sqrt(1 - y * y) : q;
      const R = 380;
      pos.set([Math.cos(t) * qq * R, y * R, Math.sin(t) * qq * R], i * 3);
      const c = temps[Math.min(temps.length - 1, Math.floor(Math.pow(r(), 0.8) * temps.length))];
      const b = Math.pow(r(), 6) * 2.4 + 0.08; // most stars faint, a few bright
      col.set([c.r * b, c.g * b, c.b * b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} rotation={[0.45, 0, 0.3]}>
      <pointsMaterial size={1.4} sizeAttenuation={false} vertexColors toneMapped={false} transparent depthWrite={false} />
    </points>
  );
}

/** Very faint interstellar dust / emission: fBm on a large back-facing sphere. */
export function Nebula() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
          float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x), f.y),
                       mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x), f.y), f.z); }
          float fbm(vec3 p){ float s=0.0,a=0.5; for(int k=0;k<6;k++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
          void main(){
            vec3 d = vDir;
            float band = exp(-pow(dot(d, normalize(vec3(0.3, 1.0, 0.45))) * 3.2, 2.0));
            float cloud = fbm(d * 3.0);
            float dust = smoothstep(0.45, 0.75, fbm(d * 6.0 + 4.0));
            vec3 col = mix(vec3(0.03, 0.04, 0.09), vec3(0.09, 0.06, 0.16), cloud) * band * (1.0 - 0.75 * dust);
            col += vec3(0.01, 0.012, 0.025) * cloud;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[420, 64, 32]} />
    </mesh>
  );
}

export { lab };
