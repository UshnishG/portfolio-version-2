import { useMemo } from "react";
import * as THREE from "three";
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

export type Quality = "high" | "low";

/**
 * Shared cinematic finishing stack for every world: optional DOF, restrained
 * bloom (HDR emissives only), film grain, vignette, AgX tone mapping.
 */
export function CinematicEffects({
  quality,
  focus,
  bokeh = 2.6,
  bloom = 0.32,
}: {
  quality: Quality;
  focus?: THREE.Vector3 | [number, number, number];
  bokeh?: number;
  bloom?: number;
}) {
  const target = useMemo(
    () => (focus ? (Array.isArray(focus) ? new THREE.Vector3(...focus) : focus) : undefined),
    [focus],
  );
  const tail = [
    <Bloom key="b" mipmapBlur intensity={bloom} luminanceThreshold={1.0} luminanceSmoothing={0.2} radius={0.7} />,
    <Noise key="n" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />,
    <Vignette key="v" offset={0.22} darkness={0.72} />,
    <ToneMapping key="t" mode={ToneMappingMode.AGX} />,
  ];
  if (quality === "high" && target) {
    return (
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <DepthOfField target={target} focalLength={0.045} bokehScale={bokeh} height={540} />
        {tail[0]}
        {tail[1]}
        {tail[2]}
        {tail[3]}
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
      {tail[0]}
      {tail[1]}
      {tail[2]}
      {tail[3]}
    </EffectComposer>
  );
}
