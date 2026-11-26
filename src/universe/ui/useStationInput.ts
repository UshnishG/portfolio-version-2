import { useEffect } from "react";

type Stepper = { index: number; go: (i: number) => void };

/**
 * Wheel / swipe / arrow keys step through a world's stations while its stage is at
 * the top of the page; at either end the page is allowed to scroll normally.
 */
export function useStationInput(enabled: boolean, stage: React.RefObject<HTMLElement>, store: Stepper, count: number) {
  useEffect(() => {
    if (!enabled) return;
    let lock = 0;
    const atTop = () => window.scrollY < 4;
    const step = (dir: number) => {
      const now = performance.now();
      if (now < lock) return;
      store.go(store.index + dir);
      lock = now + 900;
    };
    const onWheel = (e: WheelEvent) => {
      if (!atTop() || Math.abs(e.deltaY) < 8) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if ((dir > 0 && store.index === count - 1) || (dir < 0 && store.index === 0)) return;
      e.preventDefault();
      step(dir);
    };
    let y0 = 0;
    const onTouchStart = (e: TouchEvent) => (y0 = e.touches[0].clientY);
    const onTouchEnd = (e: TouchEvent) => {
      if (!atTop()) return;
      const dy = y0 - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 40) step(dy > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!atTop()) return;
      if ((e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") && store.index < count - 1) {
        e.preventDefault();
        store.go(store.index + 1);
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") && store.index > 0) {
        e.preventDefault();
        store.go(store.index - 1);
      } else if (e.key === "Home") {
        store.go(0);
      }
    };
    const node = stage.current ?? window;
    node.addEventListener("wheel", onWheel as EventListener, { passive: false });
    node.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    node.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("wheel", onWheel as EventListener);
      node.removeEventListener("touchstart", onTouchStart as EventListener);
      node.removeEventListener("touchend", onTouchEnd as EventListener);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, stage, store, count]);
}
