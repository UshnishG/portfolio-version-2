import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/universe/ui/Nav";
import { StepRail, DragHint } from "@/universe/ui/StepRail";
import { useOrbitDrag } from "@/universe/ui/orbit";
import { useStationInput } from "@/universe/ui/useStationInput";
import { hasWebGL2, isLowPowerDevice, prefersReducedMotion } from "@/universe/webgl";
import { DMIND, DSTATIONS } from "@/universe/dmind/data";
import { mission } from "@/universe/dmind/store";

const DmindWorld = lazy(() => import("@/universe/dmind/DmindWorld"));

const useIndex = () =>
  useSyncExternalStore(
    (cb) => mission.subscribe(cb),
    () => mission.index,
    () => 0,
  );

const TONE: Record<string, string> = { mine: "#22d3ee", fire: "#f59e0b", human: "#a78bfa" };

/** Gimbal-camera HUD: detection boxes projected from the 3D scene every frame. */
function DetectionHud({ index }: { index: number }) {
  const layer = useRef<HTMLDivElement>(null);
  const station = DSTATIONS[index].id;
  const feed = station === "minefield" || station === "incident";
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = layer.current;
      if (el) {
        const boxes = mission.boxes;
        while (el.children.length < boxes.length) {
          const d = document.createElement("div");
          d.className = "absolute border font-mono text-[9px] uppercase tracking-[0.14em] transition-opacity duration-300";
          const tag = document.createElement("span");
          tag.className = "absolute -top-[15px] left-[-1px] px-1 py-[1px] text-[#02030a]";
          d.appendChild(tag);
          el.appendChild(d);
        }
        boxes.forEach((b, i) => {
          const d = el.children[i] as HTMLDivElement;
          const tag = d.firstChild as HTMLSpanElement;
          const pad = 3;
          d.style.opacity = b.on ? "1" : "0";
          d.style.left = `${b.x - pad}px`;
          d.style.top = `${b.y - pad}px`;
          d.style.width = `${Math.max(8, b.w + pad * 2)}px`;
          d.style.height = `${Math.max(8, b.h + pad * 2)}px`;
          d.style.borderColor = TONE[b.tone];
          tag.style.background = TONE[b.tone];
          tag.textContent = b.label;
          // tiny boxes (distant mines) drop the tag to stay legible
          tag.style.display = b.w < 14 ? "none" : "block";
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0 z-[5]" />
      <AnimatePresence>
        {feed && (
          <motion.div
            key="feed"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="pointer-events-none absolute inset-[18%_6%_24%_42%] z-[5] hidden md:block"
          >
            {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((c) => (
              <span key={c} className={`absolute h-5 w-5 border-white/60 ${c}`} />
            ))}
            <p className="absolute -top-6 left-0 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/70">
              Gimbal cam · {station === "minefield" ? "YOLOv12 · landmine" : "YOLOv12 · fire / person"} · illustrative
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StationPanel({ index }: { index: number }) {
  const s = DSTATIONS[index];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.1, 1], delay: 0.15 } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
        className="max-w-[460px]"
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

function Stepper({ index }: { index: number }) {
  return (
    <nav aria-label="D-MIND stations" className="flex flex-wrap items-center gap-1">
      <button onClick={() => mission.go(index - 1)} disabled={index === 0} className="px-2 py-1 font-mono text-[11px] text-slate-300 hover:text-white disabled:opacity-30" aria-label="Previous station">
        ←
      </button>
      {DSTATIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => mission.go(i)}
          aria-current={i === index ? "step" : undefined}
          title={s.name}
          className={`group flex items-center gap-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${i === index ? "text-white" : "text-slate-400 hover:text-white"}`}
        >
          <span className={`h-px transition-all ${i === index ? "w-6 bg-[hsl(var(--cyan))]" : "w-3 bg-slate-500 group-hover:w-5"}`} />
          {s.index}
        </button>
      ))}
      <button onClick={() => mission.go(index + 1)} disabled={index === DSTATIONS.length - 1} className="px-2 py-1 font-mono text-[11px] text-slate-300 hover:text-white disabled:opacity-30" aria-label="Next station">
        →
      </button>
    </nav>
  );
}

function Metrics() {
  return (
    <dl className="space-y-4 text-right">
      {DMIND.metrics.map((m) => (
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
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">Research paper · {DMIND.status}</p>
      <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] text-slate-50 md:text-5xl">{DMIND.paper}</h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{DMIND.authors}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{DMIND.context}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {DMIND.keywords.map((k) => (
          <li key={k} className="border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {k}
          </li>
        ))}
      </ul>
      <ol className="mt-12 grid gap-8 md:grid-cols-2">
        {DSTATIONS.map((s) => (
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{DMIND.project}</p>
        <p className="mt-1 font-mono text-xs text-slate-300">{DMIND.stack.join(" · ")}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{DMIND.setting}</p>
      </div>
      <a href="/?at=core" className="mt-14 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
        ← Back to the universe
      </a>
    </section>
  );
}

export default function Dmind() {
  const [webgl] = useState(() => hasWebGL2());
  const [quality] = useState(() => (isLowPowerDevice() ? "low" : "high") as "low" | "high");
  const stage = useRef<HTMLElement>(null);
  const index = useIndex();

  useEffect(() => {
    mission.reducedMotion = prefersReducedMotion() || (import.meta.env.DEV && new URLSearchParams(window.location.search).has("debug"));
    mission.index = 0;
    document.title = "D-MIND · Ushnish Ghosal";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.cursor = "";
    };
  }, []);
  useStationInput(webgl, stage, mission, DSTATIONS.length);
  useOrbitDrag(stage, index);

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 antialiased">
      <Nav base="/" />
      <main>
        <section ref={stage} aria-label="D-MIND world" className="relative h-[100svh] w-full touch-pan-y select-none overflow-hidden">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #4b6a8a 0%, #24364a 45%, #0b121c 100%)" }} />
          {webgl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <DmindWorld initialQuality={quality} />
              </div>
            </Suspense>
          )}
          <DetectionHud index={index} />
          {/* daylight scene: stronger scrims than the night worlds keep type readable */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(2,3,10,0.82) 0%, rgba(2,3,10,0.5) 28%, transparent 50%), linear-gradient(270deg, rgba(2,3,10,0.6) 0%, transparent 24%), linear-gradient(0deg, rgba(2,3,10,0.55) 0%, transparent 30%)",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#02030a] via-[#02030a]/80 to-transparent md:hidden" />

          <StepRail steps={DSTATIONS} index={index} go={(i) => mission.go(i)} label="D-MIND steps" />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-5 pb-6 pt-20 md:pb-8 md:pl-[120px] md:pr-10 lg:pl-[270px]">
            <div className="flex items-start justify-between gap-6">
              <div className="pointer-events-auto">
                <a href="/?at=core" className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-300 hover:text-white">
                  ← Universe
                </a>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-300">World 02</p>
                <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] font-extrabold uppercase leading-[0.82] text-white">{DMIND.title}</h1>
                <p className="mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-slate-200">{DMIND.full}</p>
                <p className="mt-3 inline-block border border-amber-300/40 bg-black/20 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/90">
                  Paper {DMIND.status.toLowerCase()}
                </p>
              </div>
              <div className={`hidden transition-opacity duration-700 md:block ${index === 0 ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={index !== 0}>
                <Metrics />
              </div>
            </div>
            <div className="pointer-events-auto flex flex-col gap-5">
              <StationPanel index={index} />
              <div className="md:hidden"><Stepper index={index} /></div>
              {webgl && <DragHint />}
              <p className="max-w-md font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-slate-400">{DMIND.setting}</p>
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
