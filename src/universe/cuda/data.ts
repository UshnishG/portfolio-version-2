/**
 * CUDA N-Body ("Cosmic Acceleration") content. Every figure is from Ushnish's
 * resume and the project README (github.com/UshnishG/Cosmic-Acceleration):
 * RTX 4060 Laptop GPU, float64, CUDA 12.8 / CuPy. The browser simulation on this
 * page is a separate, live WebGL re-implementation of the same physics (float32)
 * and is labelled as such — its frame rate is never presented as a CUDA result.
 */

export const CUDA = {
  title: "CUDA N-Body",
  project: "Cosmic Acceleration",
  full: "A CUDA-powered N-body simulation with CuPy, shared-memory tiling, Barnes–Hut and Monte Carlo control variates",
  stack: ["CUDA", "CuPy", "Python", "PyTorch (CUDA fallback)", "NumPy"],
  hardware: "NVIDIA GeForce RTX 4060 Laptop GPU · CUDA 12.8 · float64",
  repo: "https://github.com/UshnishG/Cosmic-Acceleration",
  metrics: [
    { value: "96×", label: "GPU speedup over CPU · N = 4,096" },
    { value: "49×", label: "GPU speedup over CPU · N = 500" },
    { value: "<0.5%", label: "Barnes–Hut force error" },
  ],
};

/** Benchmark table from the README (ms per step). */
export const BENCH = [
  { n: 150, cpu: 0.61, gpu: 0.22, tiled: 0.25, bh: 1.84, speedup: 2.76, bhErr: 0.086 },
  { n: 500, cpu: 14.7, gpu: 0.3, tiled: 0.42, bh: 4.88, speedup: 49.25, bhErr: 0.277 },
  { n: 1000, cpu: 60.03, gpu: 0.72, tiled: 1.21, bh: 10.45, speedup: 49.52, bhErr: 0.488 },
  { n: 2048, cpu: 273.87, gpu: 2.91, tiled: 4.21, bh: 22.1, speedup: 65.06, bhErr: 0.492 },
  { n: 4096, cpu: 1098.2, gpu: 11.4, tiled: 15.8, bh: 46.2, speedup: 96.33, bhErr: 0.495 },
];

/** Physics validation suite from the README. */
export const TESTS = [
  ["Initial conditions", "|P_tot| < 1e-14"],
  ["Newtonian acceleration", "relative error < 1e-7"],
  ["Energy conservation", "ΔE/E₀ = 0.0026% over 300 steps"],
  ["Solver parity (CPU / GPU / tiled)", "max diff < 1e-12"],
  ["Barnes–Hut accuracy", "mean error 0.011%"],
  ["Control variates", "unbiased (p < 1e-5), VRF > 10¹¹×"],
] as const;

export type CStationId = "overview" | "tiling" | "barneshut" | "speedup" | "montecarlo" | "validation";
export type CStation = { id: CStationId; index: string; name: string; kicker: string; body: string[] };

export const CSTATIONS: CStation[] = [
  {
    id: "overview",
    index: "00",
    name: "Gravitational N-body",
    kicker: "Live · in your browser",
    body: [
      "Every body pulls on every other: an O(N²) sum per step, with Plummer softening (ε = 0.02) and symplectic Velocity Verlet integration — the physics of Cosmic Acceleration.",
      "This disk is that physics running live on your GPU in WebGL. Click to drop a rogue star through it.",
    ],
  },
  {
    id: "tiling",
    index: "01",
    name: "Shared-memory tiling",
    kicker: "CUDA kernel · B = 256",
    body: [
      "Instead of every thread reading all N positions from global memory, the tiled kernel loads blocks of 256 bodies into __shared__ memory and reuses them: global traffic drops from O(N²) to O(N²/B).",
      "The highlighted body is accumulating force from one 256-body tile at a time.",
    ],
  },
  {
    id: "barneshut",
    index: "02",
    name: "Barnes–Hut octree",
    kicker: "O(N log N) · θ = 0.5",
    body: [
      "Space is partitioned into an octree; a far cell that passes s/d < θ is treated as one point mass at its centre of mass.",
      "Relative force error stayed below 0.5% at every benchmark size. The tree drawn here is rebuilt from the live particles.",
    ],
  },
  {
    id: "speedup",
    index: "03",
    name: "GPU vs CPU",
    kicker: "Measured on RTX 4060 Laptop",
    body: ["Direct-sum GPU kernel vs vectorised CPU baseline, float64: 49× faster at N = 500, scaling to 96× at N = 4,096."],
  },
  {
    id: "montecarlo",
    index: "04",
    name: "Monte Carlo control variates",
    kicker: "Stochastic force estimation",
    body: [
      "Force is estimated from a random subset of bodies, using the Barnes–Hut multipole term as a control variate with known expectation (after Madan et al., SIGGRAPH 2025).",
      "Unbiased, with a variance-reduction factor above 10¹¹× in the unit tests.",
    ],
  },
  {
    id: "validation",
    index: "05",
    name: "Physics validation",
    kicker: "8 / 8 tests passing",
    body: ["Energy drift of 0.0026% over 300 steps, CPU/GPU/tiled solvers agreeing to 1e-12, and Barnes–Hut mean error of 0.011%."],
  },
];
