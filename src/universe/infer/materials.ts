import * as THREE from "three";

/**
 * Light-pulse material for fibre cores. Pulses travel along the tube's U
 * (length) coordinate; HDR output so only the pulse heads reach the bloom
 * threshold, the rest of the fibre stays a dim, physically plausible glow.
 */
export function makePulseMaterial(opts: { color: string; speed?: number; density?: number; base?: number; intensity?: number; offset?: number }) {
  return new THREE.ShaderMaterial({
    toneMapped: false,
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(opts.color) },
      uSpeed: { value: opts.speed ?? 0.35 },
      uDensity: { value: opts.density ?? 6 },
      uBase: { value: opts.base ?? 0.05 },
      uIntensity: { value: opts.intensity ?? 3.2 },
      uOffset: { value: opts.offset ?? 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSpeed, uDensity, uBase, uIntensity, uOffset;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float x = vUv.x * uDensity - uTime * uSpeed + uOffset;
        float cell = floor(x);
        float f = fract(x);
        // irregular spacing: some cells carry no packet
        float on = step(0.35, hash(cell + uOffset * 17.0));
        float head = smoothstep(0.0, 0.015, f) * (1.0 - smoothstep(0.015, 0.22, f));
        float pulse = head * on;
        // fresnel: core reads brighter at grazing angles like a lit fibre
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        vec3 col = uColor * (uBase * (0.6 + fres) + pulse * uIntensity);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/** Hex-perforated steel door alpha map (white = metal, black = hole). */
export function perforationMap(size = 512, cols = 34) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#000";
  const step = size / cols;
  const r = step * 0.43;
  for (let row = 0; row < cols * 1.2; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0);
      const y = row * step * 0.866;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * NOC wall display. Shows only real INFER numbers (metrics + baseline).
 * Drawn once to a canvas; used as an emissive map so the screen lights the room a little.
 */
export function wallScreenTexture(metrics: { value: string; label: string }[], baseline: string) {
  const W = 2048;
  const H = 640;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#050a18");
  bg.addColorStop(1, "#02050d");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // fine pixel grid like an LED wall
  g.strokeStyle = "rgba(120,160,255,0.05)";
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 8) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  g.fillStyle = "rgba(140,180,255,0.55)";
  g.font = "500 30px 'JetBrains Mono', monospace";
  g.fillText("INFER  ·  FCAPS OBSERVABILITY  ·  RESULTS ON 50,000 SYNTHETIC LOGS", 80, 92);
  g.fillStyle = "rgba(140,180,255,0.18)";
  g.fillRect(80, 118, W - 160, 2);
  const colW = (W - 160) / 3;
  metrics.forEach((m, i) => {
    const x = 80 + i * colW;
    g.fillStyle = i === 1 ? "#7fe7ff" : i === 2 ? "#b9a2ff" : "#9cc2ff";
    g.font = "800 190px 'Big Shoulders Display', Impact, sans-serif";
    g.fillText(m.value, x, 390, colW - 60);
    g.fillStyle = "rgba(200,215,240,0.7)";
    g.font = "500 30px 'JetBrains Mono', monospace";
    g.fillText(m.label.toUpperCase(), x + 6, 470);
  });
  g.fillStyle = "rgba(200,215,240,0.45)";
  g.font = "500 26px 'JetBrains Mono', monospace";
  g.fillText(`BASELINE — ${baseline.toUpperCase()}`, 80, 575);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
