import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Dev-only (?debug): after `afterFrames` rendered frames, times 30 synchronous
 * scene renders (independent of rAF throttling) and writes the result to
 * <body data-perf>. Re-arms whenever `rearm` changes (e.g. the active step).
 */
export function PerfProbe({ afterFrames = 12, rearm }: { afterFrames?: number; rearm?: unknown }) {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  const last = useRef(rearm);
  const enabled = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  useFrame(() => {
    if (!enabled) return;
    if (last.current !== rearm) {
      last.current = rearm;
      frames.current = 0;
    }
    if (++frames.current !== afterFrames) return;
    const ctx = gl.getContext();
    const px = new Uint8Array(4);
    const time = (n = 20) => {
      const times: number[] = [];
      for (let i = 0; i < n; i++) {
        const t = performance.now();
        gl.render(scene, camera);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      return times;
    };
    const times = time(30);
    // cost of each top-level object: frame time saved when it is hidden
    const breakdown: Record<string, number> = {};
    const base = times[15];
    scene.children.forEach((c, i) => {
      if (!c.visible) return;
      const label = c.name || `${c.type}#${i}`;
      c.visible = false;
      breakdown[label] = +(base - time(10)[5]).toFixed(1);
      c.visible = true;
    });
    const shadows = gl.shadowMap.enabled;
    gl.shadowMap.enabled = false;
    scene.traverse((o) => ((o as THREE.Mesh).material ? (((o as THREE.Mesh).material as THREE.Material).needsUpdate = true) : null));
    breakdown["(shadow maps)"] = +(base - time(10)[5]).toFixed(1);
    gl.shadowMap.enabled = shadows;
    scene.traverse((o) => ((o as THREE.Mesh).material ? (((o as THREE.Mesh).material as THREE.Material).needsUpdate = true) : null));
    document.body.dataset.perf = JSON.stringify({
      step: String(rearm ?? ""),
      breakdown,
      sceneMedianMs: +times[15].toFixed(2),
      sceneP90Ms: +times[27].toFixed(2),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      buffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
    });
  });
  return null;
}
