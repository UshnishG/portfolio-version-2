/**
 * Tiny mutable store shared between the R3F scene (read every frame, no
 * re-renders) and the HTML overlay (subscribes for phase changes).
 */
export type Phase = "intro" | "flying" | "arrived";

type Listener = () => void;

export const flight = {
  /** where the user wants to be along the fly-through, 0..1 */
  target: 0,
  /** smoothed position actually used by the camera */
  progress: 0,
  phase: "intro" as Phase,
  reducedMotion: false,
  listeners: new Set<Listener>(),
  setPhase(p: Phase) {
    if (p === this.phase) return;
    this.phase = p;
    this.listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};
