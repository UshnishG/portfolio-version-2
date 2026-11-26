/**
 * Real elevation: four AWS "Terrain Tiles" (Terrarium encoding, zoom 13) covering
 * the Western Ghats near Wayanad, Kerala, stitched into one 512×512 height grid.
 * Terrarium: height_m = R*256 + G + B/256 − 32768.
 */

const TILES = { z: 13, x: [5828, 5829], y: [3833, 3834] };
const LAT = 11.45;
/** ground width of one zoom-13 tile at this latitude, metres */
const TILE_M = (40075016.686 * Math.cos((LAT * Math.PI) / 180)) / 2 ** TILES.z;

export const GRID = 512;
export const SIZE = TILE_M * 2; // ≈ 9.6 km square

export type HeightField = {
  heights: Float32Array; // GRID×GRID, row 0 = north, metres above the lowest point
  min: number;
  max: number;
  /** bilinear height at world x (east) / z (south), metres */
  at: (x: number, z: number) => number;
  /** unit-length slope magnitude (rise/run) at world x/z */
  slope: (x: number, z: number) => number;
  sites: Sites;
};

export type Site = { x: number; z: number; y: number };
export type Sites = { landslide: Site & { dir: [number, number] }; minefield: Site; incident: Site; overview: Site };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

async function build(): Promise<HeightField> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const jobs: Promise<void>[] = [];
  TILES.x.forEach((tx, i) =>
    TILES.y.forEach((ty, j) => {
      jobs.push(
        loadImage(`/assets/dmind/terrain_${TILES.z}_${tx}_${ty}.png`).then((img) => {
          ctx.drawImage(img, i * 256, j * 256, 256, 256);
        }),
      );
    }),
  );
  await Promise.all(jobs);
  const px = ctx.getImageData(0, 0, GRID, GRID).data;
  const heights = new Float32Array(GRID * GRID);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < GRID * GRID; i++) {
    const h = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
    heights[i] = h;
    if (h < min) min = h;
    if (h > max) max = h;
  }
  for (let i = 0; i < heights.length; i++) heights[i] -= min;

  const cell = SIZE / (GRID - 1);
  const toGrid = (x: number, z: number) => [(x / SIZE + 0.5) * (GRID - 1), (z / SIZE + 0.5) * (GRID - 1)] as const;
  const hAt = (c: number, r: number) => heights[Math.max(0, Math.min(GRID - 1, r)) * GRID + Math.max(0, Math.min(GRID - 1, c))];
  const at = (x: number, z: number) => {
    const [gx, gz] = toGrid(x, z);
    const c0 = Math.floor(gx);
    const r0 = Math.floor(gz);
    const fx = gx - c0;
    const fz = gz - r0;
    const a = hAt(c0, r0) * (1 - fx) + hAt(c0 + 1, r0) * fx;
    const b = hAt(c0, r0 + 1) * (1 - fx) + hAt(c0 + 1, r0 + 1) * fx;
    return a * (1 - fz) + b * fz;
  };
  const gradAt = (c: number, r: number) => [(hAt(c + 1, r) - hAt(c - 1, r)) / (2 * cell), (hAt(c, r + 1) - hAt(c, r - 1)) / (2 * cell)] as const;
  const slope = (x: number, z: number) => {
    const [gx, gz] = toGrid(x, z);
    const [dx, dz] = gradAt(Math.round(gx), Math.round(gz));
    return Math.hypot(dx, dz);
  };

  // ---- choose sites from the real relief ----
  const W = 6; // window half-size in cells (~110 m)
  const lo = Math.floor(GRID * 0.28);
  const hi = Math.ceil(GRID * 0.72);
  const meanSlope = (c: number, r: number) => {
    let s = 0;
    let n = 0;
    for (let j = -W; j <= W; j += 2)
      for (let i = -W; i <= W; i += 2) {
        const [dx, dz] = gradAt(c + i, r + j);
        s += Math.hypot(dx, dz);
        n++;
      }
    return s / n;
  };
  const toWorld = (c: number, r: number): Site => {
    const x = (c / (GRID - 1) - 0.5) * SIZE;
    const z = (r / (GRID - 1) - 0.5) * SIZE;
    return { x, z, y: at(x, z) };
  };

  // landslide: the steepest sustained slope in the central area
  let best = { s: -1, c: 0, r: 0 };
  for (let r = lo; r < hi; r += 3)
    for (let c = lo; c < hi; c += 3) {
      const s = meanSlope(c, r);
      if (s > best.s) best = { s, c, r };
    }
  const [gx, gz] = gradAt(best.c, best.r);
  const gl = Math.hypot(gx, gz) || 1;
  const landslide = { ...toWorld(best.c, best.r), dir: [gx / gl, gz / gl] as [number, number] }; // dir points uphill

  // flat, elevated benches near the landslide for the minefield + incident site
  const flatNear = (minD: number, maxD: number, avoid: Site[]) => {
    let pick = { s: Infinity, c: best.c, r: best.r };
    for (let r = lo; r < hi; r += 2)
      for (let c = lo; c < hi; c += 2) {
        const w = toWorld(c, r);
        const d = Math.hypot(w.x - landslide.x, w.z - landslide.z);
        if (d < minD || d > maxD) continue;
        if (avoid.some((a) => Math.hypot(w.x - a.x, w.z - a.z) < 350)) continue;
        const s = meanSlope(c, r);
        if (s < pick.s) pick = { s, c, r };
      }
    return toWorld(pick.c, pick.r);
  };
  const minefield = flatNear(450, 1100, []);
  const incident = flatNear(450, 1300, [minefield]);
  const overview = toWorld(Math.round((best.c * 2 + GRID / 2) / 3), Math.round((best.r * 2 + GRID / 2) / 3));

  return { heights, min, max, at, slope, sites: { landslide, minefield, incident, overview } };
}

let promise: Promise<HeightField> | null = null;
let result: HeightField | null = null;
let failure: unknown = null;

/** Suspense-friendly accessor. */
export function useHeightField(): HeightField {
  if (result) return result;
  if (failure) throw failure;
  promise ??= build().then(
    (r) => {
      result = r;
      return r;
    },
    (e) => {
      failure = e;
      throw e;
    },
  );
  throw promise;
}
