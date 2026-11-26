import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/universe/ui/Nav";
import { StepRail, DragHint } from "@/universe/ui/StepRail";
import { useOrbitDrag } from "@/universe/ui/orbit";
import { hasWebGL2, isLowPowerDevice, prefersReducedMotion } from "@/universe/webgl";
import { FCAPS, INFER, STATIONS } from "@/universe/infer/data";
import { tour } from "@/universe/infer/store";

const InferWorld = lazy(() => import("@/universe/infer/InferWorld"));

const AUTHORS =
  "Ushnish Ghosal, Aayush Mishra, Syeda Umaiza Unsa, Dineshwar Nagabothu, Mohan Reddy Vemullapalli, Akash D, Dr. Kishore Anthuvan Sahayaraj K, Dr. M. Vaidhehi";
const KEYWORDS = ["FCAPS Management", "Network Log Analysis", "Anomaly Detection", "LLMs", "Agentic Orchestration", "Vector Databases", "Predictive Analytics"];

const useStationIndex = () =>
  useSyncExternalStore(
    (cb) => tour.subscribe(cb),
    () => tour.index,
    () => 0,
  );

/** Wheel / swipe / arrow keys step between stations while the stage is in view. */
function useStationInput(enabled: boolean, stage: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!enabled) return;
    let lock = 0;
    const atTop = () => window.scrollY < 4;
    const step = (dir: number) => {
      const now = performance.now();
      if (now < lock) return true;
      const before = tour.index;
      tour.go(tour.index + dir);
      if (tour.index === before) return false; // at an end: let the page scroll
      lock = now + 900;
      return true;
    };
    const onWheel = (e: WheelEvent) => {
      if (!atTop() || Math.abs(e.deltaY) < 8) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const atEnd = (dir > 0 && tour.index === STATIONS.length - 1) || (dir < 0 && tour.index === 0);
      if (atEnd) return;
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
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        if (tour.index < STATIONS.length - 1) {
          e.preventDefault();
          tour.go(tour.index + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        if (tour.index > 0) {
          e.preventDefault();
          tour.go(tour.index - 1);
        }
      } else if (e.key === "Home") {
        tour.go(0);
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
  }, [enabled, stage]);
}

/** Illustrative log stream (clearly labelled; not real data). */
function LogTicker() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const events: Record<string, string[]> = {
      Fault: ["link down on edge-rtr-{n} if ge-0/0/{p}", "BGP peer 10.{n}.{p}.1 unreachable", "PSU fault reported by agg-sw-{n}"],
      Configuration: ["config drift detected on core-sw-{n}", "VLAN {p}{n} added on access-sw-{n}", "ACL commit on fw-{n}"],
      Accounting: ["usage threshold reached on tenant-{n}", "flow export rotated on probe-{n}", "quota report for slice-{p}"],
      Performance: ["latency rise on path {n}→{p}", "queue depth high on agg-sw-{n}", "jitter spike on link {n}-{p}"],
      Security: ["repeated auth failures on vpn-gw-{n}", "port scan pattern from 172.16.{n}.{p}", "cert expiry warning on lb-{n}"],
    };
    const make = () => {
      const cat = FCAPS[Math.floor(Math.random() * FCAPS.length)];
      const pool = events[cat];
      const msg = pool[Math.floor(Math.random() * pool.length)].replace(/\{n\}/g, String(1 + Math.floor(Math.random() * 40))).replace(/\{p\}/g, String(Math.floor(Math.random() * 48)));
      return `[${cat[0]}] ${msg}`;
    };
    setLines(Array.from({ length: 5 }, make));
    const id = window.setInterval(() => setLines((l) => [...l.slice(1), make()]), 1400);
    return () => window.clearInterval(id);
  }, []);
  if (!lines.length) return null;
  return (
    <div aria-hidden className="w-[320px] font-mono text-[10px] leading-[1.7] text-slate-400">
      <p className="mb-1 uppercase tracking-[0.2em] text-slate-500">Illustrative stream · not real data</p>
      {lines.map((l, i) => (
        <p key={l + i} className="truncate" style={{ opacity: 0.35 + (i / lines.length) * 0.65 }}>
          {l}
        </p>
      ))}
    </div>
  );
}

function StationPanel({ index }: { index: number }) {
  const s = STATIONS[index];
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
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">
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

function Stepper({ index }: { index: number }) {
  return (
    <nav aria-label="INFER stations" className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => tour.go(index - 1)}
        disabled={index === 0}
        className="px-2 py-1 font-mono text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
        aria-label="Previous station"
      >
        ←
      </button>
      {STATIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => tour.go(i)}
          aria-current={i === index ? "step" : undefined}
          title={s.name}
          className={`group flex items-center gap-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
            i === index ? "text-white" : "text-slate-500 hover:text-slate-200"
          }`}
        >
          <span className={`h-px transition-all ${i === index ? "w-6 bg-[hsl(var(--cyan))]" : "w-3 bg-slate-600 group-hover:w-5"}`} />
          {s.index}
        </button>
      ))}
      <button
        onClick={() => tour.go(index + 1)}
        disabled={index === STATIONS.length - 1}
        className="px-2 py-1 font-mono text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
        aria-label="Next station"
      >
        →
      </button>
    </nav>
  );
}

function Metrics() {
  return (
    <dl className="space-y-5 text-right">
      {INFER.metrics.map((m) => (
        <div key={m.label}>
          <dt className="sr-only">{m.label}</dt>
          <dd className="font-display text-[clamp(2.2rem,4vw,3.6rem)] font-extrabold leading-none text-slate-50">{m.value}</dd>
          <dd className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">{m.label}</dd>
        </div>
      ))}
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">{INFER.baseline}</p>
    </dl>
  );
}

function WriteUp() {
  return (
    <section id="infer-details" className="mx-auto max-w-[1100px] px-5 py-20 md:px-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">Research paper · {INFER.status}</p>
      <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] text-slate-50 md:text-5xl">{INFER.paper}</h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{AUTHORS}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{INFER.context}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {KEYWORDS.map((k) => (
          <li key={k} className="border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {k}
          </li>
        ))}
      </ul>
      <ol className="mt-12 grid gap-8 md:grid-cols-2">
        {STATIONS.map((s) => (
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Role</p>
        <p className="mt-1 text-sm text-slate-300">{INFER.role}</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Stack</p>
        <p className="mt-1 font-mono text-xs text-slate-300">{INFER.stack.join(" · ")}</p>
      </div>
      <a href="/?at=core" className="mt-14 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
        ← Back to the universe
      </a>
    </section>
  );
}

export default function Infer() {
  const [webgl] = useState(() => hasWebGL2());
  const [quality] = useState(() => (isLowPowerDevice() ? "low" : "high") as "low" | "high");
  const stage = useRef<HTMLElement>(null);
  const index = useStationIndex();

  useEffect(() => {
    // ?debug snaps the camera (useful for screenshots in throttled/background tabs)
    tour.reducedMotion = prefersReducedMotion() || (import.meta.env.DEV && new URLSearchParams(window.location.search).has("debug"));
    tour.index = 0;
    document.title = "INFER · Ushnish Ghosal";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.cursor = "";
    };
  }, []);
  useStationInput(webgl, stage);
  useOrbitDrag(stage, index);

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 antialiased">
      <Nav base="/" />
      <main>
        <section ref={stage} aria-label="INFER world" className="relative h-[100svh] w-full touch-pan-y select-none overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(60% 50% at 50% 45%, hsl(222 70% 22% / 0.35), transparent 70%), #02030a" }}
          />
          {webgl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <InferWorld initialQuality={quality} />
              </div>
            </Suspense>
          )}
          {/* phones: the story panel spans the full width, so darken the lower half */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#02030a] via-[#02030a]/80 to-transparent md:hidden" />
          {/* scrims: left for the story, right for the numbers */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(2,3,10,0.85) 0%, rgba(2,3,10,0.45) 26%, transparent 46%), linear-gradient(270deg, rgba(2,3,10,0.7) 0%, transparent 22%)",
            }}
          />

          <StepRail steps={STATIONS} index={index} go={(i) => tour.go(i)} label="INFER steps" />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-5 pb-6 pt-20 md:pb-8 md:pl-[120px] md:pr-10 lg:pl-[270px]">
            <div className="flex items-start justify-between gap-6">
              <div className="pointer-events-auto">
                <a href="/?at=core" className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
                  ← Universe
                </a>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">World 01</p>
                <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] font-extrabold uppercase leading-[0.82] text-slate-50">{INFER.title}</h1>
                <p className="mt-2 max-w-sm font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.18em] text-slate-300">{INFER.full}</p>
                <p className="mt-3 inline-block border border-amber-300/30 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/80">
                  Paper {INFER.status.toLowerCase()}
                </p>
              </div>
              {/* headline numbers on the overview; each station states its own afterwards */}
              <div className={`hidden transition-opacity duration-700 md:block ${index === 0 ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={index !== 0}>
                <Metrics />
              </div>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="pointer-events-auto flex flex-col gap-5">
                <StationPanel index={index} />
                <div className="md:hidden"><Stepper index={index} /></div>
                {webgl && <DragHint />}
              </div>
              <div className="hidden lg:block">
                <LogTicker />
              </div>
            </div>
          </div>

          {/* fade in from black */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#010207]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0, transition: { duration: 1.6, ease: "easeOut", delay: 0.3 } }}
          />
        </section>
        <div className="md:hidden px-5 pt-10">
          <Metrics />
        </div>
        <WriteUp />
      </main>
    </div>
  );
}
