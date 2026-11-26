import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { W, type NBodySim } from "./sim";
import { overlayState } from "./Cosmos";
import { lab } from "./store";

const TILE = 256; // CUDA block size used by the tiled kernel (README: B = 256)
const THETA = 0.5; // Barnes–Hut opening angle (README default)
const SAMPLE = 64; // Monte Carlo subset size shown

/* ------------------------------------------------------------- octree (CPU, live) */

type Node = {
  cx: number;
  cy: number;
  cz: number;
  half: number;
  depth: number;
  mass: number;
  mx: number;
  my: number;
  mz: number;
  body: number; // index if leaf with one body, else -1
  count: number;
  kids: (Node | null)[] | null;
};

function buildOctree(P: Float32Array, n: number) {
  let half = 0;
  for (let i = 0; i < n; i++) half = Math.max(half, Math.abs(P[i * 4]), Math.abs(P[i * 4 + 1]), Math.abs(P[i * 4 + 2]));
  const root: Node = { cx: 0, cy: 0, cz: 0, half: half * 1.001 + 1e-6, depth: 0, mass: 0, mx: 0, my: 0, mz: 0, body: -1, count: 0, kids: null };
  const nodes: Node[] = [root];
  const child = (nd: Node, o: number): Node => {
    const h = nd.half / 2;
    const c: Node = {
      cx: nd.cx + (o & 1 ? h : -h),
      cy: nd.cy + (o & 2 ? h : -h),
      cz: nd.cz + (o & 4 ? h : -h),
      half: h,
      depth: nd.depth + 1,
      mass: 0,
      mx: 0,
      my: 0,
      mz: 0,
      body: -1,
      count: 0,
      kids: null,
    };
    nodes.push(c);
    return c;
  };
  const octant = (nd: Node, i: number) => (P[i * 4] > nd.cx ? 1 : 0) | (P[i * 4 + 1] > nd.cy ? 2 : 0) | (P[i * 4 + 2] > nd.cz ? 4 : 0);
  const insert = (nd: Node, i: number) => {
    const m = P[i * 4 + 3];
    nd.mx += P[i * 4] * m;
    nd.my += P[i * 4 + 1] * m;
    nd.mz += P[i * 4 + 2] * m;
    nd.mass += m;
    nd.count++;
    if (nd.count === 1) {
      nd.body = i;
      return;
    }
    if (nd.depth >= 12) return; // coincident bodies: stop splitting
    if (!nd.kids) {
      nd.kids = new Array(8).fill(null);
      const prev = nd.body;
      nd.body = -1;
      if (prev >= 0) {
        const o = octant(nd, prev);
        nd.kids[o] ??= child(nd, o);
        insertDown(nd.kids[o]!, prev);
      }
    }
    const o = octant(nd, i);
    nd.kids[o] ??= child(nd, o);
    insertDown(nd.kids[o]!, i);
  };
  const insertDown = (nd: Node, i: number) => insert(nd, i);
  for (let i = 0; i < n; i++) insert(root, i);
  return { root, nodes };
}

/** Walk the tree for one body with the multipole acceptance criterion s/d < θ. */
function macWalk(root: Node, P: Float32Array, i: number) {
  const accepted: Node[] = [];
  const direct: number[] = [];
  const px = P[i * 4];
  const py = P[i * 4 + 1];
  const pz = P[i * 4 + 2];
  const stack: Node[] = [root];
  while (stack.length) {
    const nd = stack.pop()!;
    if (nd.count === 0) continue;
    if (nd.count === 1 || !nd.kids) {
      if (nd.body !== i && nd.body >= 0) direct.push(nd.body);
      continue;
    }
    const cx = nd.mx / nd.mass;
    const cy = nd.my / nd.mass;
    const cz = nd.mz / nd.mass;
    const d = Math.hypot(cx - px, cy - py, cz - pz);
    if ((nd.half * 2) / d < THETA) accepted.push(nd);
    else nd.kids.forEach((k) => k && stack.push(k));
  }
  return { accepted, direct };
}

/* ------------------------------------------------------------- line helpers */

function makeLines(color: string, intensity: number, opacity: number, max: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 6), 3));
  g.setDrawRange(0, 0);
  const m = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const l = new THREE.LineSegments(g, m);
  l.frustumCulled = false;
  return l;
}

function setLines(l: THREE.LineSegments, segs: number[]) {
  const a = l.geometry.attributes.position as THREE.BufferAttribute;
  const n = Math.min(segs.length, a.array.length);
  (a.array as Float32Array).set(segs.slice(0, n));
  a.needsUpdate = true;
  l.geometry.setDrawRange(0, n / 3);
}

/** Rectangle outline of a cube's top view (disk plane). */
function rect(out: number[], nd: Node) {
  const { cx, cy, half: h } = nd;
  const z = 0;
  out.push(cx - h, cy - h, z, cx + h, cy - h, z, cx + h, cy - h, z, cx + h, cy + h, z, cx + h, cy + h, z, cx - h, cy + h, z, cx - h, cy + h, z, cx - h, cy - h, z);
}

/* ------------------------------------------------------------- component */

export function Overlays({ sim }: { sim: NBodySim }) {
  const tree = useMemo(() => makeLines("#9cc2ff", 0.45, 0.16, 40000), []);
  const accepted = useMemo(() => makeLines("#22d3ee", 1.3, 0.75, 6000), []);
  const links = useMemo(() => makeLines("#a78bfa", 1.1, 0.32, 6000), []);
  const rays = useMemo(() => makeLines("#7dd3fc", 0.9, 0.18, 600), []);
  const mask = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(W * sim.h * 4), W, sim.h, THREE.RGBAFormat);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [sim]);
  const focus = useRef(-1);
  const timer = useRef(0);
  const P = useRef<Float32Array | null>(null);

  useEffect(() => {
    overlayState.mask = mask;
    focus.current = -1;
    return () => {
      overlayState.mode = 0;
      overlayState.focus = -1;
    };
  }, [mask]);

  useFrame((st, dt) => {
    const id = lab.station.id;
    const active = id === "tiling" || id === "barneshut" || id === "montecarlo";
    tree.visible = accepted.visible = id === "barneshut";
    links.visible = id === "barneshut";
    rays.visible = id === "tiling" || id === "montecarlo";
    overlayState.mode = id === "tiling" ? 1 : id === "montecarlo" ? 3 : id === "barneshut" ? 2 : 0;
    if (!active) {
      overlayState.focus = -1;
      return;
    }
    timer.current -= dt;
    if (timer.current > 0 && P.current) return;
    timer.current = id === "barneshut" ? 0.5 : 0.25;

    const pos = sim.readPositions();
    P.current = pos;
    const n = sim.n;
    if (import.meta.env.DEV) {
      let bad = 0;
      let rmax = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.hypot(pos[i * 4], pos[i * 4 + 1], pos[i * 4 + 2]);
        if (!Number.isFinite(r)) bad++;
        else rmax = Math.max(rmax, r);
      }
      document.body.dataset.sim = JSON.stringify({ n, bad, rmax: +rmax.toFixed(3), b1: Array.from(pos.slice(4, 8)).map((x) => +x.toFixed(3)) });
    }
    // choose a stable focus body in the outer disk
    if (focus.current < 0) {
      for (let i = 1; i < n; i++) {
        const r = Math.hypot(pos[i * 4], pos[i * 4 + 1]);
        if (r > 0.8 && r < 0.95) {
          focus.current = i;
          break;
        }
      }
    }
    const f = Math.max(1, focus.current);
    overlayState.focus = f;
    const fx = pos[f * 4];
    const fy = pos[f * 4 + 1];
    const fz = pos[f * 4 + 2];

    if (id === "tiling") {
      const tiles = Math.ceil(n / TILE);
      const k = Math.floor(st.clock.elapsedTime / 0.7) % tiles;
      overlayState.tileStart = k * TILE;
      overlayState.tileEnd = Math.min(n, (k + 1) * TILE);
      overlayState.tile = k + 1;
      overlayState.tiles = tiles;
      const segs: number[] = [];
      for (let j = overlayState.tileStart; j < overlayState.tileEnd; j++) if (j !== f) segs.push(fx, fy, fz, pos[j * 4], pos[j * 4 + 1], pos[j * 4 + 2]);
      setLines(rays, segs);
    }

    if (id === "montecarlo") {
      const epoch = Math.floor(st.clock.elapsedTime / 1.2);
      const data = mask.image.data as Uint8Array;
      data.fill(0);
      let s = epoch * 7919 + 13;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const segs: number[] = [];
      for (let c = 0; c < SAMPLE; c++) {
        const j = 1 + Math.floor(rnd() * (n - 1));
        data[j * 4] = 255;
        if (j !== f) segs.push(fx, fy, fz, pos[j * 4], pos[j * 4 + 1], pos[j * 4 + 2]);
      }
      mask.needsUpdate = true;
      overlayState.sample = SAMPLE;
      setLines(rays, segs);
    }

    if (id === "barneshut") {
      const { root, nodes } = buildOctree(pos, n);
      const t: number[] = [];
      for (const nd of nodes) if (nd.count >= 2 && nd.depth <= 7) rect(t, nd);
      setLines(tree, t);
      const walk = macWalk(root, pos, f);
      const a: number[] = [];
      const l: number[] = [];
      for (const nd of walk.accepted) {
        rect(a, nd);
        l.push(fx, fy, fz, nd.mx / nd.mass, nd.my / nd.mass, nd.mz / nd.mass);
      }
      for (const j of walk.direct) l.push(fx, fy, fz, pos[j * 4], pos[j * 4 + 1], pos[j * 4 + 2]);
      setLines(accepted, a);
      setLines(links, l);
      lab.bh = { nodes: nodes.length, interactions: walk.accepted.length + walk.direct.length, direct: n - 1 };
    }
  });

  return (
    <group>
      <primitive object={tree} />
      <primitive object={accepted} />
      <primitive object={links} />
      <primitive object={rays} />
    </group>
  );
}
