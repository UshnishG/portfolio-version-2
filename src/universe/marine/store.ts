import { MSTATIONS, type MStationId } from "./data";

type Listener = () => void;

export type MBox = { id: string; label: string; tone: "debris" | "foam" | "sonar"; x: number; y: number; w: number; h: number; on: boolean };

/** Active step + projected detection boxes for the Marine AI world. */
export const sea = {
  index: 0,
  reducedMotion: false,
  boxes: [] as MBox[],
  /** true while the camera is under the waterline (drives fog / HUD) */
  underwater: false,
  listeners: new Set<Listener>(),
  get station() {
    return MSTATIONS[this.index];
  },
  go(i: number) {
    const next = Math.max(0, Math.min(MSTATIONS.length - 1, i));
    if (next === this.index) return;
    this.index = next;
    this.listeners.forEach((l) => l());
  },
  goTo(id: MStationId) {
    this.go(MSTATIONS.findIndex((s) => s.id === id));
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};
