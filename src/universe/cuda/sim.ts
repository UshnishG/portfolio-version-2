import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

/**
 * Live N-body integrator on the GPU (WebGL2, float32) mirroring Cosmic
 * Acceleration's physics: direct O(N²) Newtonian sum with Plummer softening
 * (ε = 0.02, G = 1), leapfrog / kick-drift Velocity Verlet, Keplerian disk of
 * 1 central mass + N−1 orbiters. Body i lives at texel (i % W, i / W).
 */

export const W = 64;
export const EPS = 0.02;
export const DT = 0.004;
export const CENTRAL_MASS = 1;
const DISK_MASS = 0.05;

const forceShader = /* glsl */ `
  uniform float uN;
  uniform float uDt;
  uniform float uEps2;
  uniform vec4 uPert;
  uniform sampler2D tPos;
  uniform sampler2D tVel;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy);
    int idx = ip.y * ${W} + ip.x;
    vec4 v = texelFetch(tVel, ip, 0);
    if (idx >= int(uN)) { gl_FragColor = v; return; }
    vec4 p = texelFetch(tPos, ip, 0);
    vec3 acc = vec3(0.0);
    int n = int(uN);
    for (int j = 0; j < 4096; j++) {
      if (j >= n) break;
      vec4 q = texelFetch(tPos, ivec2(j % ${W}, j / ${W}), 0);
      vec3 d = q.xyz - p.xyz;                  // self term: d = 0 → contributes 0
      float inv = inversesqrt(dot(d, d) + uEps2);
      acc += q.w * d * (inv * inv * inv);
    }
    if (uPert.w > 0.0) {
      vec3 d = uPert.xyz - p.xyz;
      float inv = inversesqrt(dot(d, d) + uEps2);
      acc += uPert.w * d * (inv * inv * inv);
    }
    v.xyz += acc * uDt;                        // kick
    gl_FragColor = v;
  }
`;

const driftShader = /* glsl */ `
  uniform float uDt;
  uniform sampler2D tPos;
  uniform sampler2D tVel;
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy);
    vec4 p = texelFetch(tPos, ip, 0);
    vec4 v = texelFetch(tVel, ip, 0);
    p.xyz += v.xyz * uDt;                      // drift with the updated velocity
    gl_FragColor = p;
  }
`;

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export class NBodySim {
  readonly n: number;
  readonly h: number;
  private gpu: GPUComputationRenderer;
  private pos: THREE.WebGLRenderTarget[];
  private vel: THREE.WebGLRenderTarget[];
  private cur = 0;
  private kick: THREE.ShaderMaterial;
  private drift: THREE.ShaderMaterial;
  private readBuf: Float32Array;
  /** rogue star: position, velocity, mass (sim units); integrated on the CPU */
  pert = { p: new THREE.Vector3(), v: new THREE.Vector3(), m: 0 };

  constructor(private renderer: THREE.WebGLRenderer, n: number, seed = 7) {
    this.n = n;
    this.h = Math.ceil(n / W);
    this.gpu = new GPUComputationRenderer(W, this.h, renderer);
    const mk = () => this.gpu.createRenderTarget(W, this.h, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter);
    this.pos = [mk(), mk()];
    this.vel = [mk(), mk()];
    this.kick = this.gpu.createShaderMaterial(forceShader, {
      uN: { value: n },
      uDt: { value: DT },
      uEps2: { value: EPS * EPS },
      uPert: { value: new THREE.Vector4() },
      tPos: { value: null },
      tVel: { value: null },
    });
    this.drift = this.gpu.createShaderMaterial(driftShader, { uDt: { value: DT }, tPos: { value: null }, tVel: { value: null } });
    this.readBuf = new Float32Array(W * this.h * 4);
    this.seed(seed);
  }

  /** Keplerian disk: central mass at rest + orbiters on (softened) circular orbits. */
  private seed(seed: number) {
    const r = rng(seed);
    const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
    const p = this.gpu.createTexture();
    const v = this.gpu.createTexture();
    // GPUComputationRenderer textures are Float32 RGBA (typed loosely upstream)
    const P = p.image.data as unknown as Float32Array;
    const V = v.image.data as unknown as Float32Array;
    const m = DISK_MASS / (this.n - 1);
    P[3] = CENTRAL_MASS;
    for (let i = 1; i < this.n; i++) {
      const rad = 0.2 + 1.0 * Math.sqrt(r());
      const a = r() * Math.PI * 2;
      const z = gauss() * 0.02 * rad;
      // softened circular speed + enclosed disk mass (approx.) + 2% dispersion
      const encl = CENTRAL_MASS + DISK_MASS * ((rad - 0.2) / 1.0) ** 2;
      const vc = Math.sqrt((encl * rad * rad) / Math.pow(rad * rad + EPS * EPS, 1.5));
      const o = i * 4;
      P[o] = Math.cos(a) * rad;
      P[o + 1] = Math.sin(a) * rad;
      P[o + 2] = z;
      P[o + 3] = m;
      V[o] = -Math.sin(a) * vc * (1 + gauss() * 0.02);
      V[o + 1] = Math.cos(a) * vc * (1 + gauss() * 0.02);
      V[o + 2] = gauss() * 0.01;
    }
    this.gpu.renderTexture(p, this.pos[0]);
    this.gpu.renderTexture(v, this.vel[0]);
    this.cur = 0;
    p.dispose();
    v.dispose();
  }

  get positionTexture() {
    return this.pos[this.cur].texture;
  }
  get velocityTexture() {
    return this.vel[this.cur].texture;
  }

  /** Drop a rogue star that falls through the disk plane at (x, y). */
  drop(x: number, y: number) {
    this.pert.p.set(x * 0.85, y * 0.85, 1.1);
    this.pert.v.set(-y * 0.25, x * 0.25, -1.1);
    this.pert.m = 0.25;
  }

  step(steps: number) {
    const k = this.kick.uniforms;
    for (let s = 0; s < steps; s++) {
      // rogue star: CPU leapfrog in the central field
      if (this.pert.m > 0) {
        const d = this.pert.p.clone().negate();
        const r2 = d.lengthSq() + EPS * EPS;
        this.pert.v.addScaledVector(d, (CENTRAL_MASS / (r2 * Math.sqrt(r2))) * DT);
        this.pert.p.addScaledVector(this.pert.v, DT);
        if (this.pert.p.length() > 4) this.pert.m = 0;
      }
      (k.uPert.value as THREE.Vector4).set(this.pert.p.x, this.pert.p.y, this.pert.p.z, this.pert.m);
      const next = 1 - this.cur;
      k.tPos.value = this.pos[this.cur].texture;
      k.tVel.value = this.vel[this.cur].texture;
      this.gpu.doRenderTarget(this.kick, this.vel[next]);
      this.drift.uniforms.tPos.value = this.pos[this.cur].texture;
      this.drift.uniforms.tVel.value = this.vel[next].texture;
      this.gpu.doRenderTarget(this.drift, this.pos[next]);
      this.cur = next;
    }
  }

  /** Read body 0 (the central mass) — 1 texel, cheap. */
  readCentral(out: Float32Array) {
    this.renderer.readRenderTargetPixels(this.pos[this.cur], 0, 0, 1, 1, out);
    return out;
  }

  /** Read current positions back to the CPU (for the octree / tiling overlays). */
  readPositions(): Float32Array {
    this.renderer.readRenderTargetPixels(this.pos[this.cur], 0, 0, W, this.h, this.readBuf);
    return this.readBuf;
  }

  dispose() {
    [...this.pos, ...this.vel].forEach((t) => t.dispose());
    this.kick.dispose();
    this.drift.dispose();
    this.gpu.dispose();
  }
}
