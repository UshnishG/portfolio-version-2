import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/universe/ui/Nav";
import { StepRail, DragHint } from "@/universe/ui/StepRail";
import { useOrbitDrag } from "@/universe/ui/orbit";
import { useStationInput } from "@/universe/ui/useStationInput";
import { hasWebGL2, isLowPowerDevice, prefersReducedMotion } from "@/universe/webgl";
import { BENCH, CUDA, CSTATIONS, TESTS } from "@/universe/cuda/data";
import { lab } from "@/universe/cuda/store";
import { overlayState } from "@/universe/cuda/Cosmos";

const CudaWorld = lazy(() => import("@/universe/cuda/CudaWorld"));

const useLab = () =>
  useSyncExternalStore(
    (cb) => lab.subscribe(cb),
    () => `${lab.index}|${lab.n}`,
    () => "0|4096",
  );

/** Poll fast-changing live values (fps, tile, BH counts) without re-rendering the page. */
function useLive<T>(read: () => T, ms = 250) {
  const [v, setV] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => setV(read()), ms);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

function StationPanel({ index }: { index: number }) {
  const s = CSTATIONS[index];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.1, 1], delay: 0.15 } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
        className="max-w-[470px]"
        aria-live="polite"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/90">
          {s.index} · {s.kicker}
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4.2vw,3.4rem)] font-extrabold uppercase leading-[0.9] text-slate-50">{s.name}</h2>
        <div className="mt-4 space-y-2">
          {s.body.map((p) => (
            <p key={p} className="text-[14px] leading-relaxed text-slate-300">
              {p}
            </p>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Controls() {
  const fps = useLive(() => lab.fps, 500);
  useLab();
  return (
    <div data-no-orbit className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="group" aria-label="Number of bodies" className="flex items-center gap-1">
        <span className="mr-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">N</span>
        {[500, 1000, 2048, 4096].map((n) => (
          <button
            key={n}
            onClick={() => lab.setN(n)}
            aria-pressed={lab.n === n}
            className={`border px-2 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
              lab.n === n ? "border-cyan-300/70 bg-cyan-300/10 text-white" : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
            }`}
          >
            {n.toLocaleString()}
          </button>
        ))}
      </div>
      <button onClick={() => lab.reset()} className="border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-white/30 hover:text-white">
        Reset
      </button>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
        Live in your browser · WebGL · float32 · {fps || "—"} fps
      </p>
    </div>
  );
}

function StepHud({ index }: { index: number }) {
  const id = CSTATIONS[index].id;
  const live = useLive(() => ({ tile: overlayState.tile, tiles: overlayState.tiles, bh: { ...lab.bh }, sample: overlayState.sample }), 200);
  // swap immediately (no exit animation to wait on — throttled tabs could leave a stale panel)
  return (
    <>
      <motion.div
        key={id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.5 } }}
        className="w-[340px] text-right"
      >
        {id === "overview" && (
          <dl className="space-y-5">
            {CUDA.metrics.map((m) => (
              <div key={m.label}>
                <dt className="sr-only">{m.label}</dt>
                <dd className="font-display text-[clamp(2.2rem,4vw,3.6rem)] font-extrabold leading-none text-slate-50">{m.value}</dd>
                <dd className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">{m.label}</dd>
              </div>
            ))}
          </dl>
        )}
        {id === "tiling" && (
          <div>
            <p className="font-display text-5xl font-extrabold text-slate-50">
              {live.tile || "—"}
              <span className="text-slate-500"> / {live.tiles || "—"}</span>
            </p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">Tile in shared memory · 256 bodies each</p>
            <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">Global traffic O(N²) → O(N²/256)</p>
          </div>
        )}
        {id === "barneshut" && (
          <div>
            <p className="font-display text-5xl font-extrabold text-slate-50">{live.bh.interactions ? live.bh.interactions.toLocaleString() : "—"}</p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">Interactions for the white body (θ = 0.5)</p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-400">{live.bh.direct ? live.bh.direct.toLocaleString() : "—"}</p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">Direct sum (N − 1)</p>
            <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-slate-500">
              Computed live from this disk · <span className="text-cyan-300">cyan</span> cells = one point mass · <span className="text-violet-300">violet</span> = direct
            </p>
          </div>
        )}
        {id === "speedup" && <SpeedupChart />}
        {id === "montecarlo" && (
          <div>
            <p className="font-display text-5xl font-extrabold text-slate-50">{live.sample || "—"}</p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">Random subset M shown · resampled every 1.2 s</p>
            <p className="mt-4 font-display text-3xl font-bold text-slate-50">VRF &gt; 10¹¹×</p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">Variance reduction (unit tests)</p>
          </div>
        )}
        {id === "validation" && (
          <ul className="space-y-2 text-left">
            {TESTS.map(([name, res]) => (
              <li key={name} className="flex items-baseline justify-between gap-4 border-b border-white/[0.08] pb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{name}</span>
                <span className="whitespace-nowrap font-mono text-[10px] text-emerald-300/90">✓ {res}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </>
  );
}

/** Real benchmark (README): speedup per N, log-free bars, current N highlighted. */
function SpeedupChart() {
  useLab();
  const max = Math.max(...BENCH.map((b) => b.speedup));
  return (
    <figure className="text-left" aria-label="GPU speedup over CPU by number of bodies">
      <ul className="space-y-2.5">
        {BENCH.map((b) => {
          const on = b.n === lab.n;
          return (
            <li key={b.n}>
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
                <span className={on ? "text-white" : "text-slate-400"}>N = {b.n.toLocaleString()}</span>
                <span className={on ? "text-white" : "text-slate-400"}>
                  {b.cpu} ms → {b.gpu} ms
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-[6px] flex-1 bg-white/[0.06]">
                  <div className={`h-full ${on ? "bg-[hsl(var(--cyan))]" : "bg-slate-500/70"}`} style={{ width: `${(b.speedup / max) * 100}%` }} />
                </div>
                <span className={`w-14 text-right font-display text-xl font-bold ${on ? "text-white" : "text-slate-400"}`}>{b.speedup.toFixed(b.speedup < 10 ? 2 : 1)}×</span>
              </div>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-slate-500">
        CPU direct vs GPU direct, ms per step · {CUDA.hardware}
      </figcaption>
    </figure>
  );
}

function WriteUp() {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-20 md:px-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">Project · {CUDA.project}</p>
      <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] text-slate-50 md:text-5xl">{CUDA.full}</h2>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{CUDA.hardware}</p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse font-mono text-[11px] text-slate-300">
          <caption className="mb-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Benchmark · ms per step</caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {["N", "CPU direct", "GPU direct", "GPU tiled", "Barnes–Hut", "Speedup", "BH error"].map((h) => (
                <th key={h} className="py-2 pr-4 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BENCH.map((b) => (
              <tr key={b.n} className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 text-slate-100">{b.n.toLocaleString()}</td>
                <td className="pr-4">{b.cpu}</td>
                <td className="pr-4">{b.gpu}</td>
                <td className="pr-4">{b.tiled}</td>
                <td className="pr-4">{b.bh}</td>
                <td className="pr-4 text-slate-100">{b.speedup}×</td>
                <td className="pr-4">{b.bhErr}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="mt-12 grid gap-8 md:grid-cols-2">
        {CSTATIONS.map((s) => (
          <li key={s.id} className="border-t border-white/[0.08] pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {s.index} · {s.kicker}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold uppercase text-slate-100">{s.name}</h3>
            {s.body.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
          </li>
        ))}
      </ol>
      <div className="mt-12 border-t border-white/[0.08] pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Stack</p>
        <p className="mt-1 font-mono text-xs text-slate-300">{CUDA.stack.join(" · ")}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          The disk on this page is a live WebGL (float32) re-implementation of the same physics; its frame rate is a browser figure, not a CUDA benchmark.
        </p>
        <a href={CUDA.repo} className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/90 hover:text-white">
          Source on GitHub →
        </a>
      </div>
      <a href="/?at=core" className="mt-14 block font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
        ← Back to the universe
      </a>
    </section>
  );
}

export default function Cuda() {
  const [webgl] = useState(() => hasWebGL2());
  const [quality] = useState(() => (isLowPowerDevice() ? "low" : "high") as "low" | "high");
  const stage = useRef<HTMLElement>(null);
  const [indexStr] = useLab().split("|");
  const index = Number(indexStr);

  useEffect(() => {
    lab.reducedMotion = prefersReducedMotion() || (import.meta.env.DEV && new URLSearchParams(window.location.search).has("debug"));
    lab.index = 0;
    // phones start lighter; the user can still pick 4,096
    lab.n = quality === "low" ? 1000 : 4096;
    lab.emit();
    document.title = "CUDA N-Body · Ushnish Ghosal";
    window.scrollTo(0, 0);
  }, [quality]);
  useStationInput(webgl, stage, lab, CSTATIONS.length);
  useOrbitDrag(stage, index);

  return (
    <div className="min-h-screen bg-[#010206] text-slate-100 antialiased">
      <Nav base="/" />
      <main>
        <section ref={stage} aria-label="CUDA N-Body world" className="relative h-[100svh] w-full touch-pan-y select-none overflow-hidden">
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(50% 40% at 60% 50%, hsl(230 60% 14% / 0.6), transparent 70%), #010206" }} />
          {webgl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <CudaWorld initialQuality={quality} />
              </div>
            </Suspense>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(1,2,6,0.85) 0%, rgba(1,2,6,0.4) 28%, transparent 48%)" }} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#010206] via-[#010206]/80 to-transparent md:hidden" />

          <StepRail steps={CSTATIONS} index={index} go={(i) => lab.go(i)} label="CUDA N-Body steps" />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-5 pb-6 pt-20 md:pb-8 md:pl-[120px] md:pr-10 lg:pl-[270px]">
            <div className="flex items-start justify-between gap-6">
              <div className="pointer-events-auto">
                <a href="/?at=core" className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
                  ← Universe
                </a>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">World 03 · {CUDA.project}</p>
                <h1 className="font-display text-[clamp(3rem,7.5vw,6.6rem)] font-extrabold uppercase leading-[0.82] text-slate-50">{CUDA.title}</h1>
              </div>
              <div className="hidden md:block">
                <StepHud index={index} />
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div className="pointer-events-auto">
                <StationPanel index={index} />
              </div>
              <nav aria-label="Steps" className="pointer-events-auto flex items-center gap-3 md:hidden">
                <button onClick={() => lab.go(index - 1)} disabled={index === 0} className="border border-white/15 px-3 py-1.5 font-mono text-xs text-slate-200 disabled:opacity-30" aria-label="Previous step">
                  ←
                </button>
                <span className="font-display text-2xl font-extrabold text-white">{CSTATIONS[index].index}</span>
                <button onClick={() => lab.go(index + 1)} disabled={index === CSTATIONS.length - 1} className="border border-white/15 px-3 py-1.5 font-mono text-xs text-slate-200 disabled:opacity-30" aria-label="Next step">
                  →
                </button>
              </nav>
              {webgl && <Controls />}
              {webgl && <DragHint />}
            </div>
          </div>

          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#010207]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0, transition: { duration: 1.6, ease: "easeOut", delay: 0.3 } }}
          />
        </section>
        <WriteUp />
      </main>
    </div>
  );
}
