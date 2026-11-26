# Asset sources

Every model, texture, HDRI and font used by "The Computational Universe", with its licence.

## Landing scene

| Asset | Source | Licence |
| --- | --- | --- |
| Portal rings, cradles, bolts, chrome core, gyroscope rings | Procedural geometry written in this repo (`src/universe/LandingScene.tsx`) | Original |
| Roughness / normal maps (micro-scratches, smudges, brushed finish, wet-floor puddles) | Generated at runtime in `src/universe/textures.ts` | Original |
| Studio lighting / reflections | drei `Lightformer` cards rendered into the environment map (no HDRI file) | Original |
| Big Shoulders Display | Google Fonts | SIL Open Font License 1.1 |
| JetBrains Mono | Google Fonts | SIL Open Font License 1.1 |

## World 01 · INFER

| Asset | Source | Licence |
| --- | --- | --- |
| Server racks, blades, status LEDs, cable trays, hangers, light fixtures, raised floor, walls | Procedural geometry in `src/universe/infer/Hall.tsx` | Original |
| Hex-perforated door alpha map, floor tile seams | Generated at runtime (`src/universe/infer/materials.ts`, `Hall.tsx`) | Original |
| Log engine, model pods (lathe-machined housings, glass chambers, neural lattices), storage tanks, forecaster stand | Procedural geometry in `src/universe/infer/Pipeline.tsx` | Original |
| Fibre light-pulse shader | Original GLSL in `src/universe/infer/materials.ts` | Original |
| Results wall and forecast displays | Drawn at runtime to canvas from INFER's published metrics; forecast curve is labelled illustrative | Original |

## World 02 · D-MIND

| Asset | Source | Licence |
| --- | --- | --- |
| Elevation: 4 Terrarium tiles, zoom 13, x 5828–5829, y 3833–3834 (Western Ghats near Wayanad, Kerala) → `public/assets/dmind/terrain_13_*.png` | AWS Open Data "Terrain Tiles" — `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/{x}/{y}.png` | Open data; underlying sources include SRTM (NASA, public domain). Attribution: Terrain Tiles by Mapzen/Linux Foundation, hosted on AWS Open Data |
| Ground texture "Aerial Grass Rock" 1k (diffuse, normal GL, roughness) → `ground_*_1k.jpg` | Poly Haven — https://polyhaven.com/a/aerial_grass_rock | CC0 |
| Sky HDRI "Kloofendal 48d Partly Cloudy (Pure Sky)" 1k → `sky_1k.hdr` | Poly Haven — https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 |
| Survey quadcopter (carbon body, twisted airfoil props, motors, gimbal, skids, nav lights) | Procedural geometry in `src/universe/dmind/Drone.tsx` (no suitable licensed drone model was available from Poly Haven or the Khronos glTF samples) | Original |
| Landmines, rocks, people, fire + smoke shaders, landslide scar + segmentation shader | Procedural, `src/universe/dmind/Hazards.tsx`, `Terrain.tsx` | Original |
| Forest canopy (instanced crowns, noise-driven forest/grassland mosaic) | Procedural, `src/universe/dmind/Forest.tsx` | Original |

The terrain is a real place used as a setting only; the hazards placed on it and all on-screen detections are illustrative.

## World 03 · CUDA N-Body

| Asset | Source | Licence |
| --- | --- | --- |
| Live N-body simulation (GPU, WebGL2 float textures, O(N²) Plummer-softened gravity, leapfrog/Velocity Verlet) | Original, `src/universe/cuda/sim.ts` — re-implements the physics described in github.com/UshnishG/Cosmic-Acceleration | Original |
| Star sprites, disk glow, central mass, rogue star, starfield, nebula | Procedural shaders, `src/universe/cuda/Cosmos.tsx` | Original |
| Octree / tiling / Monte Carlo overlays | Computed live from the simulation, `src/universe/cuda/Overlays.tsx` | Original |
| Benchmark and validation figures | Project README (RTX 4060 Laptop GPU, float64) | Author's own results |

No external files are downloaded for this world.

## World 04 · Marine AI

All models are Poly Haven, CC0, downloaded as glTF with 1k textures into `public/assets/marine/<id>/`:

| Model | Source |
| --- | --- |
| Ocean Buoy | https://polyhaven.com/a/ocean_buoy |
| Plastic Jerrycan | https://polyhaven.com/a/plastic_jerrycan |
| Plastic Bottle Gallon | https://polyhaven.com/a/plastic_bottle_gallon |
| Plastic Crate 01 | https://polyhaven.com/a/plastic_crate_01 |
| Trashbag | https://polyhaven.com/a/trashbag |
| Old Tyre | https://polyhaven.com/a/old_tyre |
| Can Rusted | https://polyhaven.com/a/can_rusted |

| Asset | Source | Licence |
| --- | --- | --- |
| Sky HDRI (reused from D-MIND) | Poly Haven — kloofendal_48d_partly_cloudy_puresky | CC0 |
| Gerstner ocean, crest foam, seabed caustics, marine snow, light shafts | Procedural, `src/universe/marine/Ocean.tsx`, `waves.ts` | Original |
| Buoy sensor kit (solar panel, mast, camera dome, LiDAR puck), AUV, sonar fan, foam patches | Procedural, `src/universe/marine/Fleet.tsx` | Original |
| UAV | Reused from D-MIND (`src/universe/dmind/Drone.tsx`) | Original |

## Libraries

three.js (MIT), React Three Fiber (MIT), drei (MIT), postprocessing (Zlib), @react-three/postprocessing (MIT), GSAP (GreenSock standard licence, free for this use), Framer Motion (MIT).

## Later worlds

Models, HDRIs and textures added for the worlds will be listed here, with source URL and licence, as each world is built.
