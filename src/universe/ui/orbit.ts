import { useEffect } from "react";
import * as THREE from "three";

/**
 * Free-look orbit shared by every world: the user drags to rotate the camera
 * around the current step's subject. Rigs read `orbit.yaw/pitch` each frame and
 * apply them with `applyOrbit`; changing step eases the rotation back to zero.
 */
export const orbit = {
  yaw: 0,
  pitch: 0,
  /** smoothed values the rigs actually use */
  sYaw: 0,
  sPitch: 0,
  dragging: false,
  /** total pointer travel of the current/last drag, px (used to suppress clicks after a drag) */
  travel: 0,
  limits: { pitchMin: -0.45, pitchMax: 0.75 },
  reset() {
    this.yaw = 0;
    this.pitch = 0;
  },
  /** ease smoothed values toward the user's input; call once per frame */
  step(dt: number, reducedMotion: boolean) {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * (this.dragging ? 10 : 3.5));
    this.sYaw += (this.yaw - this.sYaw) * k;
    this.sPitch += (this.pitch - this.sPitch) * k;
  },
  /** a click that ended a real drag should not also select an object */
  wasDrag() {
    return this.travel > 6;
  },
};

const UP = new THREE.Vector3(0, 1, 0);
const tmpOff = new THREE.Vector3();
const tmpAxis = new THREE.Vector3();
const q = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();

/** Rotate a camera position (and its aim point) around `pivot` by the current orbit. */
export function applyOrbit(pos: THREE.Vector3, aim: THREE.Vector3, pivot: THREE.Vector3) {
  if (Math.abs(orbit.sYaw) < 1e-4 && Math.abs(orbit.sPitch) < 1e-4) return;
  // one rotation for both points: pitch around the horizontal axis across the view, then yaw around world up
  tmpAxis.subVectors(pivot, pos).setY(0);
  if (tmpAxis.lengthSq() < 1e-6) tmpAxis.set(0, 0, -1);
  tmpAxis.normalize().cross(UP).normalize();
  q.setFromAxisAngle(tmpAxis, -orbit.sPitch);
  qYaw.setFromAxisAngle(UP, orbit.sYaw);
  q.premultiply(qYaw);
  for (const p of [pos, aim]) {
    tmpOff.subVectors(p, pivot).applyQuaternion(q);
    p.copy(pivot).add(tmpOff);
  }
}

/**
 * Pointer drag on the stage drives the orbit. Drags that start on links, buttons
 * or form controls are ignored so the overlay stays clickable. On touch, mostly
 * vertical swipes are left to step navigation; sideways drags rotate.
 */
export function useOrbitDrag(stage: React.RefObject<HTMLElement>, stepKey: number) {
  useEffect(() => {
    orbit.reset();
  }, [stepKey]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let active = false;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let touchDecided: "rotate" | "scroll" | null = null;
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a,button,input,textarea,select,[data-no-orbit]");

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || interactive(e.target)) return;
      active = true;
      orbit.travel = 0;
      lastX = startX = e.clientX;
      lastY = startY = e.clientY;
      touchDecided = e.pointerType === "touch" ? null : "rotate";
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (touchDecided === null) {
        const tx = Math.abs(e.clientX - startX);
        const ty = Math.abs(e.clientY - startY);
        if (tx + ty < 10) return;
        touchDecided = tx > ty ? "rotate" : "scroll";
      }
      if (touchDecided !== "rotate") return;
      orbit.travel += Math.abs(dx) + Math.abs(dy);
      if (orbit.travel > 6) {
        orbit.dragging = true;
        el.style.cursor = "grabbing";
      }
      const w = el.clientWidth || window.innerWidth;
      orbit.yaw -= (dx / w) * Math.PI * 1.6;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (dy / w) * Math.PI * 1.2, orbit.limits.pitchMin, orbit.limits.pitchMax);
    };
    const up = () => {
      active = false;
      orbit.dragging = false;
      el.style.cursor = "";
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [stage]);
}
