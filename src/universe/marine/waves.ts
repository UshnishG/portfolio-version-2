import * as THREE from "three";

/**
 * Moderate sea state as a sum of Gerstner waves. The same parameters drive the
 * GPU surface (vertex shader) and the CPU sampler used to float objects, so
 * buoys and debris ride the exact swell that is rendered.
 */
export type Wave = { dir: [number, number]; amp: number; len: number; steep: number };

export const WAVES: Wave[] = [
  { dir: [0.92, 0.39], amp: 0.34, len: 19, steep: 0.55 },
  { dir: [0.62, -0.78], amp: 0.2, len: 10.5, steep: 0.5 },
  { dir: [-0.28, 0.96], amp: 0.11, len: 5.6, steep: 0.45 },
  { dir: [0.99, -0.12], amp: 0.05, len: 2.4, steep: 0.35 },
];

const G = 9.81;

/** GLSL: displaced position + analytic normal. Expects uniform float uTime. */
export const GERSTNER_GLSL = /* glsl */ `
  vec3 gerstner(vec3 p, out vec3 n) {
    vec3 o = p;
    vec3 nn = vec3(0.0, 1.0, 0.0);
    ${WAVES.map(
      (w, i) => `{
      vec2 D = normalize(vec2(${w.dir[0].toFixed(3)}, ${w.dir[1].toFixed(3)}));
      float k = ${((2 * Math.PI) / w.len).toFixed(5)};
      float A = ${w.amp.toFixed(4)};
      float Q = ${(w.steep / (((2 * Math.PI) / w.len) * w.amp * WAVES.length)).toFixed(5)};
      float ph = k * dot(D, p.xz) - ${Math.sqrt(G * ((2 * Math.PI) / w.len)).toFixed(5)} * uTime + ${(i * 1.7).toFixed(2)};
      float c = cos(ph), s = sin(ph);
      o.x += Q * A * D.x * c;
      o.z += Q * A * D.y * c;
      o.y += A * s;
      nn.x -= D.x * k * A * c;
      nn.z -= D.y * k * A * c;
      nn.y -= Q * k * A * s;
    }`,
    ).join("\n")}
    n = normalize(nn);
    return o;
  }
`;

/** CPU height + normal at (x, z), time t (horizontal Gerstner drift ignored — sub-decimetre here). */
export function sampleWaves(x: number, z: number, t: number, outNormal?: THREE.Vector3) {
  let y = 0;
  let nx = 0;
  let nz = 0;
  let ny = 1;
  WAVES.forEach((w, i) => {
    const l = Math.hypot(w.dir[0], w.dir[1]);
    const dx = w.dir[0] / l;
    const dz = w.dir[1] / l;
    const k = (2 * Math.PI) / w.len;
    const q = w.steep / (k * w.amp * WAVES.length);
    const ph = k * (dx * x + dz * z) - Math.sqrt(G * k) * t + i * 1.7;
    const c = Math.cos(ph);
    const s = Math.sin(ph);
    y += w.amp * s;
    nx -= dx * k * w.amp * c;
    nz -= dz * k * w.amp * c;
    ny -= q * k * w.amp * s;
  });
  outNormal?.set(nx, ny, nz).normalize();
  return y;
}

export const SEABED_Y = -16;
