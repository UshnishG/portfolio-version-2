import { STATIONS, type StationId } from "./data";

type Listener = () => void;

/** Which INFER station the camera is framing. Shared by scene + overlay. */
export const tour = {
  index: 0,
  hovered: null as StationId | null,
  reducedMotion: false,
  listeners: new Set<Listener>(),
  get station() {
    return STATIONS[this.index];
  },
  go(i: number) {
    const next = Math.max(0, Math.min(STATIONS.length - 1, i));
    if (next === this.index) return;
    this.index = next;
    this.listeners.forEach((l) => l());
  },
  goTo(id: StationId) {
    this.go(STATIONS.findIndex((s) => s.id === id));
  },
  setHovered(id: StationId | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    document.body.style.cursor = id ? "pointer" : "";
    this.listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};
