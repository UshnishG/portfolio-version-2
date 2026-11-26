import { CSTATIONS, type CStationId } from "./data";

type Listener = () => void;

/** Shared state for the CUDA world: active step, body count, live stats, user actions. */
export const lab = {
  index: 0,
  reducedMotion: false,
  n: 4096,
  /** frames per second of the browser simulation, measured from rendered frames */
  fps: 0,
  /** live Barnes–Hut stats from the most recent tree build */
  bh: { nodes: 0, interactions: 0, direct: 0 },
  /** incremented to request a reset of the simulation */
  resetToken: 0,
  /** pending rogue-star drop (normalised device coords) */
  drop: null as null | { x: number; y: number },
  listeners: new Set<Listener>(),
  get station() {
    return CSTATIONS[this.index];
  },
  emit() {
    this.listeners.forEach((l) => l());
  },
  go(i: number) {
    const next = Math.max(0, Math.min(CSTATIONS.length - 1, i));
    if (next === this.index) return;
    this.index = next;
    this.emit();
  },
  goTo(id: CStationId) {
    this.go(CSTATIONS.findIndex((s) => s.id === id));
  },
  setN(n: number) {
    if (n === this.n) return;
    this.n = n;
    this.resetToken++;
    this.emit();
  },
  reset() {
    this.resetToken++;
    this.emit();
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};
