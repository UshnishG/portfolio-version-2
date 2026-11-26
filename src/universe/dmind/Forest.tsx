import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useHeightField } from "./heightfield";
import { SCAR } from "./Terrain";
import type { Quality } from "../post";

/**
 * Evergreen / semi-evergreen canopy, as seen from the air: thousands of lumpy
 * tree crowns instanced over the real terrain in noise-driven patches (forest
 * vs. grassland mosaic), kept off cliffs, the slide scar and the two clearings.
 */

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** 2D value noise + fBm (CPU) for patch layout. */
function makeNoise(seed: number) {
  const r = rng(seed);
  const P = 256;
  const g = new Float32Array(P * P).map(() => r());
  const v = (x: number, y: number) => g[(((y % P) + P) % P) * P + (((x % P) + P) % P)];
  const n = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    return (v(xi, yi) * (1 - u) + v(xi + 1, yi) * u) * (1 - w) + (v(xi, yi + 1) * (1 - u) + v(xi + 1, yi + 1) * u) * w;
  };
  return (x: number, y: number) => n(x, y) * 0.55 + n(x * 2.1, y * 2.1) * 0.3 + n(x * 4.3, y * 4.3) * 0.15;
}

/** Crown: three merged, jittered icospheres → irregular broadleaf clump (~60 tris). */
function crownGeometry() {
  const r = rng(5);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.IcosahedronGeometry(1, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.85 + r() * 0.3), p.getY(k) * (0.7 + r() * 0.25), p.getZ(k) * (0.85 + r() * 0.3));
    const a = (i / 3) * Math.PI * 2;
    g.scale(0.75, 0.75, 0.75);
    g.translate(Math.cos(a) * 0.38, 0.15 + r() * 0.2, Math.sin(a) * 0.38);
    parts.push(g.toNonIndexed());
  }
  const merged = mergeGeometries(parts)!;
  merged.computeVertexNormals();
  return merged;
}

export function Forest({ quality }: { quality: Quality }) {
  const field = useHeightField();
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => crownGeometry(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: false }), []);

  const instances = useMemo(() => {
    const { landslide: L, minefield: M, incident: I } = field.sites;
    const cx = (L.x + M.x + I.x) / 3;
    const cz = (L.z + M.z + I.z) / 3;
    const R = 2300; // canopy covers ~4.6 km around the sites (fog takes over beyond)
    const target = quality === "high" ? 30000 : 10000;
    const noise = makeNoise(17);
    const r = rng(23);
    const up = new THREE.Vector2(L.dir[0], L.dir[1]);
    const across = new THREE.Vector2(-up.y, up.x);
    const out: { x: number; y: number; z: number; s: number; h: number; rot: number; tone: number }[] = [];
    let guard = 0;
    while (out.length < target && guard++ < target * 12) {
      const x = cx + (r() * 2 - 1) * R;
      const z = cz + (r() * 2 - 1) * R;
      // forest/grassland mosaic; denser in valleys and on lower slopes
      const h = field.at(x, z);
      const rel = (h - Math.min(L.y, M.y, I.y)) / 900;
      const density = noise(x * 0.0022, z * 0.0022) - rel * 0.18;
      if (density < 0.4 + r() * 0.08) continue;
      if (field.slope(x, z) > 0.85) continue; // bare cliffs
      // clearings: minefield bench, incident site, landslide scar (+ margin)
      if (Math.hypot(x - M.x, z - M.z) < 70 || Math.hypot(x - I.x, z - I.z) < 75) continue;
      const dx = x - L.x;
      const dz = z - L.z;
      const along = -(dx * up.x + dz * up.y);
      const acr = dx * across.x + dz * across.y;
      if (Math.abs(along) < SCAR.length * 0.6 && Math.abs(acr) < SCAR.width * 0.75) continue;
      out.push({ x, y: h - 0.8, z, s: 5 + r() * 5, h: 0.7 + r() * 0.45, rot: r() * Math.PI * 2, tone: r() });
    }
    return out;
  }, [field, quality]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const palette = ["#2c4a1f", "#36552a", "#425f2b", "#2a3f1c", "#4f6b30", "#3a4d23"].map((c) => new THREE.Color(c));
    const c = new THREE.Color();
    instances.forEach((t, i) => {
      o.position.set(t.x, t.y + t.s * t.h * 0.6, t.z);
      o.rotation.set(0, t.rot, 0);
      o.scale.set(t.s, t.s * t.h, t.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      c.copy(palette[Math.floor(t.tone * palette.length)]).multiplyScalar(0.85 + t.tone * 0.3);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [instances]);

  return <instancedMesh name="forest" ref={ref} args={[geo, mat, instances.length]} castShadow={quality === "high"} receiveShadow frustumCulled={false} />;
}
