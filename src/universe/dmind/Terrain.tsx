import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GRID, SIZE, useHeightField } from "./heightfield";
import { mission } from "./store";
import type { Quality } from "../post";

/** Landslide scar extent (metres) along / across the fall line. */
export const SCAR = { length: 420, width: 150 };

const GLSL_NOISE = /* glsl */ `
  float dm_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float dm_noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dm_hash(i), dm_hash(i + vec2(1, 0)), u.x), mix(dm_hash(i + vec2(0, 1)), dm_hash(i + vec2(1, 1)), u.x), u.y);
  }
  float dm_fbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * dm_noise(p); p *= 2.03; a *= 0.5; } return s; }
  // landslide scar mask in fall-line coordinates: narrow crown upslope, wide runout downslope
  float dm_scar(vec2 p, vec2 c, vec2 up, float len, float wid) {
    vec2 d = p - c;
    float along = dot(d, -up);            // + = downslope
    float across = dot(d, vec2(-up.y, up.x));
    float t = clamp(along / len + 0.5, 0.0, 1.0);
    float halfW = wid * (0.25 + 0.75 * smoothstep(0.0, 0.8, t)) * 0.5;
    float edgeNoise = (dm_fbm(p * 0.03) - 0.5) * wid * 0.35;
    float inside = 1.0 - smoothstep(halfW - 6.0, halfW + 6.0, abs(across) + edgeNoise);
    inside *= smoothstep(-0.5 * len - 8.0, -0.5 * len + 8.0, along + edgeNoise * 0.6);
    inside *= 1.0 - smoothstep(0.5 * len - 20.0, 0.5 * len + 20.0, along + edgeNoise);
    return inside;
  }
`;

export function Terrain({ quality }: { quality: Quality }) {
  const field = useHeightField();
  const [diff, nor, rough] = useTexture(["/assets/dmind/ground_diff_1k.jpg", "/assets/dmind/ground_nor_gl_1k.jpg", "/assets/dmind/ground_rough_1k.jpg"]);

  const tileM = 14; // one texture repeat covers ~14 m of ground
  useMemo(() => {
    diff.colorSpace = THREE.SRGBColorSpace;
    for (const t of [diff, nor, rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(SIZE / tileM, SIZE / tileM);
      t.anisotropy = 16;
      t.needsUpdate = true;
    }
  }, [diff, nor, rough]);

  const geometry = useMemo(() => {
    const n = quality === "high" ? GRID : GRID / 2;
    const g = new THREE.PlaneGeometry(SIZE, SIZE, n - 1, n - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, field.at(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    return g;
  }, [field, quality]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: diff,
      normalMap: nor,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: rough,
      roughness: 1,
      metalness: 0,
    });
    const s = field.sites.landslide;
    const uniforms = {
      uScarC: { value: new THREE.Vector2(s.x, s.z) },
      uScarUp: { value: new THREE.Vector2(s.dir[0], s.dir[1]) },
      uScarLen: { value: SCAR.length },
      uScarWid: { value: SCAR.width },
      uSeg: { value: 0 },
      uTime: { value: 0 },
    };
    m.userData.uniforms = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vDmWorld;\nvarying vec3 vDmNormal;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvDmWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvDmNormal = normalize(mat3(modelMatrix) * objectNormal);",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec3 vDmWorld; varying vec3 vDmNormal;
           uniform vec2 uScarC; uniform vec2 uScarUp; uniform float uScarLen; uniform float uScarWid; uniform float uSeg; uniform float uTime;
           ${GLSL_NOISE}`,
        )
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          // two-scale sampling breaks visible tiling
          vec4 t1 = texture2D(map, vMapUv);
          vec4 t2 = texture2D(map, vMapUv * 0.173 + vec2(0.37, 0.61));
          float macro = dm_fbm(vDmWorld.xz * 0.0035);
          vec4 sampledDiffuseColor = mix(t1, t2, 0.35 + 0.3 * macro);
          vec3 ground = sampledDiffuseColor.rgb;
          // steep faces: exposed laterite / rock
          float steep = smoothstep(0.55, 0.8, 1.0 - vDmNormal.y);
          vec3 rock = mix(vec3(0.33, 0.27, 0.22), vec3(0.45, 0.41, 0.36), dm_fbm(vDmWorld.xz * 0.05));
          ground = mix(ground, rock * (0.7 + 0.6 * t1.rgb), steep * 0.75);
          // monsoon-green grade for the Ghats (vegetated ground only) + density variation
          ground *= mix(vec3(1.0), vec3(0.62, 0.86, 0.52), (1.0 - steep) * 0.85);
          ground *= 0.7 + 0.36 * macro;
          // altitude zoning: deep green valleys, lighter montane grassland on the high ridges
          float valley = 1.0 - smoothstep(250.0, 700.0, vDmWorld.y);
          float ridge = smoothstep(1100.0, 1700.0, vDmWorld.y);
          ground *= mix(vec3(1.0), vec3(0.72, 0.9, 0.7), valley * (1.0 - steep));
          ground *= mix(vec3(1.0), vec3(1.18, 1.1, 0.82), ridge * (1.0 - steep));
          // medium-scale field / scrub patches break the texture repeat from altitude
          float patchN = dm_fbm(vDmWorld.xz * 0.012);
          ground *= mix(vec3(0.86, 0.92, 0.82), vec3(1.1, 1.05, 0.9), smoothstep(0.35, 0.7, patchN));
          // landslide scar: bare wet soil and debris
          float scar = dm_scar(vDmWorld.xz, uScarC, uScarUp, uScarLen, uScarWid);
          vec3 soil = mix(vec3(0.2, 0.13, 0.08), vec3(0.32, 0.22, 0.14), dm_fbm(vDmWorld.xz * 0.12));
          soil *= 0.75 + 0.5 * t2.g;
          ground = mix(ground, soil, scar);
          diffuseColor.rgb *= ground;
          `,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, 0.62, dm_scar(vDmWorld.xz, uScarC, uScarUp, uScarLen, uScarWid) * 0.6);`,
        )
        .replace(
          "#include <dithering_fragment>",
          /* glsl */ `
          // SegFormer-style segmentation overlay (violet mask + crisp boundary)
          if (uSeg > 0.001) {
            float sm = dm_scar(vDmWorld.xz, uScarC, uScarUp, uScarLen, uScarWid);
            float m = step(0.5, sm);
            float w = fwidth(sm) * 1.5;
            float edge = smoothstep(0.5 - w, 0.5, sm) - smoothstep(0.5, 0.5 + w, sm);
            vec3 violet = vec3(0.545, 0.361, 0.965);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, violet * 0.9, m * 0.42 * uSeg);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.85, 0.8, 1.0) * 2.0, edge * uSeg);
          }
          #include <dithering_fragment>
          `,
        );
    };
    return m;
  }, [diff, nor, rough, field]);

  // ease the segmentation overlay in/out with the station
  useFrame((_, dt) => {
    const u = material.userData.uniforms as { uSeg: { value: number } };
    const id = mission.station.id;
    const target = id === "landslide" || (id === "system" && mission.scanning === "landslide") ? 1 : 0;
    u.uSeg.value += (target - u.uSeg.value) * Math.min(1, dt * 2.5);
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh name="terrain" geometry={geometry} material={material} receiveShadow />;
}
