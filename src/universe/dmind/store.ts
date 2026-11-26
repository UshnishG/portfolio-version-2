import { DSTATIONS, type DStationId } from "./data";

type Listener = () => void;

export type ScanSite = "minefield" | "landslide" | "incident";

export type Box ={ id: string; label: string; tone: "mine" | "fire" | "human"; x: number; y: number; w: number; h: number; on: boolean };

/** Shared mission state: which station is active, plus projected detection boxes for the HUD. */
export const mission = {
  index: 0,
  reducedMotion: false,
  hovered: null as DStationId | null,
  boxes: [] as Box[],
  /** Deployment step: which hazard site the drone is scanning in its loop */
  scanning: null as ScanSite | null,
  listeners: new Set<Listener>(),
  setScanning(s: ScanSite | null) {
    if (s === this.scanning) return;
    this.scanning = s;
    this.listeners.forEach((l) => l());
  },
  get station() {
    return DSTATIONS[this.index];
  },
  go(i: number) {
    const next = Math.max(0, Math.min(DSTATIONS.length - 1, i));
    if (next === this.index) return;
    this.index = next;
    this.listeners.forEach((l) => l());
  },
  goTo(id: DStationId) {
    this.go(DSTATIONS.findIndex((s) => s.id === id));
  },
  setHovered(id: DStationId | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    document.body.style.cursor = id ? "pointer" : "";
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};
