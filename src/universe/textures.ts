import * as THREE from "three";

/**
 * Procedural surface-imperfection maps (roughness + normal), generated once on
 * the CPU at load. They give every metal / glass / floor surface roughness
 * variation, smudges and micro-scratches so nothing reads as a flat colour.
 * No external texture downloads are needed for the landing scene.
 */

type MapOptions = {
  size?: number;
  /** base roughness 0..1 */
  base: number;
  /** amplitude of large-scale roughness variation */
  variation: number;
  /** number of fingerprint / smudge blobs */
  smudges: number;
  /** number of micro-scratches */
  scratches: number;
  /** stretch noise along U to fake a brushed finish (1 = isotropic) */
  brushed?: number;
  /** normal map strength */
  normalStrength?: number;
  /** puddle mask for wet floors: lowers roughness in blotches */
  puddles?: number;
  seed?: number;
  repeat?: [number, number];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value-noise fBm on a size×size grid. */
function fbm(size: number, rand: () => number, octaves: number, stretch: number) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cellsY = 4 << o;
    const cellsX = Math.max(1, Math.round(cellsY / stretch));
    const grid = new Float32Array(cellsX * cellsY);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * cellsY;
      const y0 = Math.floor(gy) % cellsY;
      const y1 = (y0 + 1) % cellsY;
      const fy = gy - Math.floor(gy);
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cellsX;
        const x0 = Math.floor(gx) % cellsX;
        const x1 = (x0 + 1) % cellsX;
        const fx = gx - Math.floor(gx);
        const sx = fx * fx * (3 - 2 * fx);
        const a = grid[y0 * cellsX + x0];
        const b = grid[y0 * cellsX + x1];
        const c = grid[y1 * cellsX + x0];
        const d = grid[y1 * cellsX + x1];
        out[y * size + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const cache = new Map<string, { roughness: THREE.Texture; normal: THREE.Texture }>();

export function surfaceMaps(opts: MapOptions) {
  const key = JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit) return hit;

  const size = opts.size ?? 512;
  const rand = mulberry32(opts.seed ?? 7);
  const noise = fbm(size, rand, 5, opts.brushed ?? 1);
  const fine = fbm(size, rand, 3, (opts.brushed ?? 1) * 6);

  // Height field (for normals) and roughness field.
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    height[i] = noise[i] * 0.6 + fine[i] * 0.4;
    rough[i] = opts.base + (noise[i] - 0.5) * opts.variation + (fine[i] - 0.5) * opts.variation * 0.5;
  }

  // Draw smudges + scratches on a 2D canvas, then fold them into the fields.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);

  // Smudges: soft elliptical blobs with faint ridge rings (fingerprint-like).
  for (let i = 0; i < opts.smudges; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.03 + rand() * 0.08);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,0,0,${0.25 + rand() * 0.25})`);
    g.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,0,0,0.08)";
    ctx.lineWidth = 1;
    for (let k = 1; k < 7; k++) {
      ctx.beginPath();
      ctx.ellipse(x, y, (r * k) / 8, ((r * k) / 8) * 0.75, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Micro-scratches: thin, mostly short, slightly curved strokes.
  for (let i = 0; i < opts.scratches; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = size * (0.02 + Math.pow(rand(), 3) * 0.25);
    const ang = opts.brushed && opts.brushed > 1 ? (rand() - 0.5) * 0.3 : rand() * Math.PI;
    ctx.strokeStyle = `rgba(0,255,0,${0.25 + rand() * 0.5})`;
    ctx.lineWidth = rand() < 0.85 ? 0.6 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 6,
      y + Math.sin(ang) * len * 0.5 + (rand() - 0.5) * 6,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len,
    );
    ctx.stroke();
  }
  // Puddles (wet floor): big soft blobs in blue channel.
  for (let i = 0; i < (opts.puddles ?? 0); i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.08 + rand() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,255,0.7)");
    g.addColorStop(0.5, "rgba(0,0,255,0.35)");
    g.addColorStop(1, "rgba(0,0,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const marks = ctx.getImageData(0, 0, size, size).data;

  const roughImg = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const smudge = marks[i * 4] / 255;
    const scratch = marks[i * 4 + 1] / 255;
    const puddle = marks[i * 4 + 2] / 255;
    let r = rough[i] + smudge * 0.22 + scratch * 0.18 - puddle * opts.base * 0.55;
    r = Math.min(1, Math.max(0.02, r));
    height[i] -= scratch * 0.35 - smudge * 0.04;
    const v = Math.round(r * 255);
    roughImg[i * 4] = roughImg[i * 4 + 1] = roughImg[i * 4 + 2] = v;
    roughImg[i * 4 + 3] = 255;
  }

  // Normal map from height (Sobel, wrapping).
  const strength = opts.normalStrength ?? 2;
  const normImg = new Uint8ClampedArray(size * size * 4);
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      normImg[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      normImg[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      normImg[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      normImg[i + 3] = 255;
    }
  }

  const make = (data: Uint8ClampedArray) => {
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...(opts.repeat ?? [1, 1]));
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const result = { roughness: make(roughImg), normal: make(normImg) };
  cache.set(key, result);
  return result;
}
