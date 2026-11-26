import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/universe/ui/Nav";
import { StepRail, DragHint } from "@/universe/ui/StepRail";
import { useOrbitDrag } from "@/universe/ui/orbit";
import { useStationInput } from "@/universe/ui/useStationInput";
import { hasWebGL2, isLowPowerDevice, prefersReducedMotion } from "@/universe/webgl";
import { MARINE, MSTATIONS } from "@/universe/marine/data";
import { sea } from "@/universe/marine/store";

const MarineWorld = lazy(() => import("@/universe/marine/MarineWorld"));

const useIndex = () =>
  useSyncExternalStore(
    (cb) => sea.subscribe(cb),
    () => sea.index,
    () => 0,
  );

const TONE = { debris: "#22d3ee", foam: "#94a3b8", sonar: "#5eead4" } as const;

/** Detection boxes projected from the 3D scene every frame (DOM, no React re-renders). */
function DetectionHud({ index }: { index: number }) {
  const layer = useRef<HTMLDivElement>(null);
  const id = MSTATIONS[index].id;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = layer.current;
      if (el) {
        const boxes = sea.boxes;
        while (el.children.length < boxes.length) {
          const d = document.createElement("div");
          d.className = "absolute font-mono text-[9px] uppercase tracking-[0.14em] transition-opacity duration-300";
          const tag = document.createElement("span");
          tag.className = "absolute -top-[15px] left-[-1px] whitespace-nowrap px-1 py-[1px]";
          d.appendChild(tag);
          el.appendChild(d);
        }
        boxes.forEach((b, i) => {
          const d = el.children[i] as HTMLDivElement;
          const tag = d.firstChild as HTMLSpanElement;
          const pad = 4;
          d.style.opacity = b.on ? "1" : "0";
          d.style.left = `${b.x - pad}px`;
          d.style.top = `${b.y - pad}px`;
          d.style.width = `${Math.max(10, b.w + pad * 2)}px`;
          d.style.height = `${Math.max(10, b.h + pad * 2)}px`;
          d.style.border = `1px ${b.tone === "foam" ? "dashed" : "solid"} ${TONE[b.tone]}`;
          tag.style.background = b.tone === "foam" ? "rgba(2,3,10,0.6)" : TONE[b.tone];
          tag.style.color = b.tone === "foam" ? TONE.foam : "#02030a";
          tag.textContent = b.label;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const feed = id === "detection" || id === "underwater";
  return (
    <>
      <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0 z-[5]" />
      {feed && (
        <p aria-hidden className="pointer-events-none absolute right-6 top-[18%] z-[5] hidden font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/70 md:block">
          {id === "detection" ? "UAV camera · YOLOv8–LSTM · illustrative" : "AUV sonar + RGB · illustrative"}
        </p>
      )}
    </>
  );
}

function StationPanel({ index }: { index: number }) {
  const s = MSTATIONS[index];
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
            <p key={p} className="text-[14px] leading-relaxed text-slate-200">
              {p}
            </p>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Metrics() {
  return (
    <dl className="space-y-4 text-right">
      {MARINE.metrics.map((m) => (
        <div key={m.label}>
          <dt className="sr-only">{m.label}</dt>
          <dd className="font-display text-[clamp(2rem,3.6vw,3.2rem)] font-extrabold leading-none text-white">{m.value}</dd>
          <dd className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-200">{m.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function WriteUp() {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-20 md:px-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">Research paper · {MARINE.status}</p>
      <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] text-slate-50 md:text-5xl">{MARINE.paper}</h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{MARINE.authors}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{MARINE.context}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {MARINE.keywords.map((k) => (
          <li key={k} className="border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {k}
          </li>
        ))}
      </ul>
      <ol className="mt-12 grid gap-8 md:grid-cols-2">
        {MSTATIONS.map((s) => (
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
        <p className="mt-1 font-mono text-xs text-slate-300">{MARINE.stack.join(" · ")}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">Debris placement, foam patches, the AUV route and drift curves shown in the scene are illustrative.</p>
      </div>
      <a href="/?at=core" className="mt-14 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
        ← Back to the universe
      </a>
    </section>
  );
}

export default function Marine() {
  const [webgl] = useState(() => hasWebGL2());
  const [quality] = useState(() => (isLowPowerDevice() ? "low" : "high") as "low" | "high");
  const stage = useRef<HTMLElement>(null);
  const index = useIndex();

  useEffect(() => {
    sea.reducedMotion = prefersReducedMotion() || (import.meta.env.DEV && new URLSearchParams(window.location.search).has("debug"));
    sea.index = 0;
    document.title = "Marine AI · Ushnish Ghosal";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.cursor = "";
    };
  }, []);
  useStationInput(webgl, stage, sea, MSTATIONS.length);
  useOrbitDrag(stage, index);

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 antialiased">
      <Nav base="/" />
      <main>
        <section ref={stage} aria-label="Marine AI world" className="relative h-[100svh] w-full touch-pan-y select-none overflow-hidden">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #5d7e98 0%, #1d4a5c 55%, #06222c 100%)" }} />
          {webgl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <MarineWorld initialQuality={quality} />
              </div>
            </Suspense>
          )}
          <DetectionHud index={index} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(2,3,10,0.8) 0%, rgba(2,3,10,0.45) 28%, transparent 50%), linear-gradient(270deg, rgba(2,3,10,0.55) 0%, transparent 24%), linear-gradient(0deg, rgba(2,3,10,0.5) 0%, transparent 30%)",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#02030a] via-[#02030a]/80 to-transparent md:hidden" />

          <StepRail steps={MSTATIONS} index={index} go={(i) => sea.go(i)} label="Marine AI steps" />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-5 pb-6 pt-20 md:pb-8 md:pl-[120px] md:pr-10 lg:pl-[270px]">
            <div className="flex items-start justify-between gap-6">
              <div className="pointer-events-auto">
                <a href="/?at=core" className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-300 hover:text-white">
                  ← Universe
                </a>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-300">World 04</p>
                <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] font-extrabold uppercase leading-[0.82] text-white">{MARINE.title}</h1>
                <p className="mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-slate-200">{MARINE.full}</p>
                <p className="mt-3 inline-block border border-amber-300/40 bg-black/20 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/90">
                  Paper {MARINE.status.toLowerCase()}
                </p>
              </div>
              <div className={`hidden transition-opacity duration-700 md:block ${index === 0 ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={index !== 0}>
                <Metrics />
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div className="pointer-events-auto">
                <StationPanel index={index} />
              </div>
              <nav aria-label="Steps" className="pointer-events-auto flex items-center gap-3 md:hidden">
                <button onClick={() => sea.go(index - 1)} disabled={index === 0} className="border border-white/15 px-3 py-1.5 font-mono text-xs text-slate-200 disabled:opacity-30" aria-label="Previous step">
                  ←
                </button>
                <span className="font-display text-2xl font-extrabold text-white">{MSTATIONS[index].index}</span>
                <button onClick={() => sea.go(index + 1)} disabled={index === MSTATIONS.length - 1} className="border border-white/15 px-3 py-1.5 font-mono text-xs text-slate-200 disabled:opacity-30" aria-label="Next step">
                  →
                </button>
              </nav>
              {webgl && <DragHint />}
            </div>
          </div>

          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#010207]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0, transition: { duration: 1.6, ease: "easeOut", delay: 0.4 } }}
          />
        </section>
        <div className="px-5 pt-10 md:hidden">
          <Metrics />
        </div>
        <WriteUp />
      </main>
    </div>
  );
}
