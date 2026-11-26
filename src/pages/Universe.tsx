import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useLocation, useNavigate } from "react-router-dom";
import { flight, type Phase } from "@/universe/store";
import { hasWebGL2, isLowPowerDevice, prefersReducedMotion } from "@/universe/webgl";
import { Nav } from "@/universe/ui/Nav";
import { About, Achievements, Contact, Education, Experience as ExperienceSection, Explore, Leadership, Projects, Research, Skills } from "@/universe/sections/Sections";

const Experience = lazy(() => import("@/universe/Experience"));

/** Worlds in the Explore section; `href` is set once a world is built. */
const WORLDS: { n: string; name: string; sub: string; href?: string }[] = [
  { n: "01", name: "INFER", sub: "Network operations centre", href: "/explore/infer" },
  { n: "02", name: "D-MIND", sub: "Aerial hazard terrain", href: "/explore/d-mind" },
  { n: "03", name: "CUDA N-Body", sub: "GPU gravity simulation", href: "/explore/cuda-n-body" },
  { n: "04", name: "Marine AI", sub: "Underwater debris detection", href: "/explore/marine-ai" },
  { n: "05", name: "NeuroSVM", sub: "Feature-space lab" },
  { n: "06", name: "Algorithmic Trading", sub: "Spatial market graphs" },
];

const usePhase = () =>
  useSyncExternalStore(
    (cb) => flight.subscribe(cb),
    () => flight.phase,
    () => "intro" as Phase,
  );

function flyTo(target: number) {
  gsap.killTweensOf(flight);
  if (flight.reducedMotion) {
    flight.target = target;
    flight.progress = target;
    return;
  }
  gsap.to(flight, { target, duration: target > flight.target ? 5.2 : 3.4, ease: "power2.inOut" });
}

function HeroCopy({ phase, webgl }: { phase: Phase; webgl: boolean }) {
  return (
    <AnimatePresence>
      {phase === "intro" && (
        <motion.div
          key="hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.2, 0.7, 0.1, 1], delay: 0.4 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.6 } }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-10 md:px-10 md:pb-14"
        >
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.32em] text-cyan-300/80">The Computational Universe</p>
              <h1 className="font-display text-[clamp(3.4rem,11vw,10.5rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.01em] text-slate-50">
                Ushnish
                <br />
                Ghosal
              </h1>
              <p className="mt-5 max-w-xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.22em] text-slate-300/80">
                Computer Science Engineer · AI &amp; Computer Vision Researcher · Chennai
              </p>
            </div>
            <div className="pointer-events-auto flex flex-col items-start gap-3 md:items-end">
              {webgl && (
                <button
                  onClick={() => flyTo(1)}
                  className="group flex items-center gap-3 border border-white/15 bg-white/[0.03] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-100 backdrop-blur-sm transition hover:border-[hsl(var(--electric))] hover:bg-[hsl(var(--electric)/0.08)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[hsl(var(--cyan))]"
                >
                  Enter the portal
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              )}
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                {webgl ? "Scroll, swipe or press Enter" : "3D view unavailable · showing 2D version"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArrivalPanel({ phase, onEnterWorld }: { phase: Phase; onEnterWorld: (href: string) => void }) {
  return (
    <AnimatePresence>
      {phase === "arrived" && (
        <motion.div
          key="arrived"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.1, delay: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="absolute inset-0 z-10"
          style={{ background: "linear-gradient(90deg, rgba(2,3,10,0.88) 0%, rgba(2,3,10,0.6) 32%, transparent 58%)" }}
        >
        <div className="flex h-full w-full max-w-[560px] flex-col justify-center gap-6 px-5 md:px-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-cyan-300/80">Core reached · Choose a world</p>
          <ol className="space-y-1">
            {WORLDS.map(({ n, name, sub, href }) => (
              <li key={n} className="border-b border-white/[0.07]">
                {href ? (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      onEnterWorld(href);
                    }}
                    className="group flex items-baseline gap-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[hsl(var(--cyan))]"
                  >
                    <span className="font-mono text-[10px] text-cyan-300/80">{n}</span>
                    <span className="font-display text-3xl font-bold uppercase tracking-tight text-slate-50 transition-colors group-hover:text-[hsl(var(--cyan))] md:text-4xl">{name}</span>
                    <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 sm:inline">
                      {sub} <span aria-hidden>→</span>
                    </span>
                  </a>
                ) : (
                  <div className="flex items-baseline gap-4 py-2 opacity-45">
                    <span className="font-mono text-[10px] text-slate-500">{n}</span>
                    <span className="font-display text-3xl font-bold uppercase tracking-tight text-slate-300 md:text-4xl">{name}</span>
                    <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:inline">Coming next</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <button onClick={() => flyTo(0)} className="self-start font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-400 hover:text-white">
            ← Back out
          </button>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Wheel / touch / keys drive the guided fly-through while the hero is at the top of the page. */
function useGuidedInput(enabled: boolean, stage: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!enabled) return;
    const atTop = () => window.scrollY < 4;
    const nudge = (delta: number) => {
      gsap.killTweensOf(flight);
      flight.target = Math.min(1, Math.max(0, flight.target + delta));
      if (flight.reducedMotion) flight.progress = flight.target;
    };
    const onWheel = (e: WheelEvent) => {
      if (!atTop()) return;
      const down = e.deltaY > 0;
      if ((down && flight.target < 1) || (!down && flight.target > 0)) {
        e.preventDefault();
        nudge(e.deltaY * 0.00055);
      }
    };
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => (lastY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!atTop()) return;
      const dy = lastY - e.touches[0].clientY;
      lastY = e.touches[0].clientY;
      if ((dy > 0 && flight.target < 1) || (dy < 0 && flight.target > 0)) {
        e.preventDefault();
        nudge(dy * 0.0022);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON" || el.tagName === "A")) return;
      if (!atTop()) return;
      if (["Enter", "ArrowDown", "PageDown", " "].includes(e.key) && flight.target < 1) {
        e.preventDefault();
        flyTo(1);
      } else if (["ArrowUp", "PageUp", "Escape", "Home"].includes(e.key) && flight.target > 0) {
        e.preventDefault();
        flyTo(0);
      }
    };
    const node = stage.current ?? window;
    node.addEventListener("wheel", onWheel as EventListener, { passive: false });
    node.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    node.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("wheel", onWheel as EventListener);
      node.removeEventListener("touchstart", onTouchStart as EventListener);
      node.removeEventListener("touchmove", onTouchMove as EventListener);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, stage]);
}

/** Static backdrop used when WebGL is missing (also shown while the 3D chunk loads). */
function StaticBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(60% 50% at 50% 42%, hsl(222 80% 30% / 0.35), transparent 70%), radial-gradient(40% 30% at 70% 60%, hsl(262 70% 40% / 0.18), transparent 70%), linear-gradient(180deg, #02030a, #050916 60%, #02030a)",
      }}
    />
  );
}

export default function Universe() {
  const [webgl] = useState(() => hasWebGL2());
  const [quality] = useState(() => (isLowPowerDevice() ? "low" : "high") as "low" | "high");
  const stage = useRef<HTMLElement>(null);
  const phase = usePhase();
  const navigate = useNavigate();
  const location = useLocation();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    flight.reducedMotion = prefersReducedMotion();
    document.title = "Ushnish Ghosal · The Computational Universe";
    // Returning from a world: resume at the core instead of replaying the intro.
    if (new URLSearchParams(location.search).get("at") === "core" && webgl) {
      flight.target = flight.progress = 1;
      flight.setPhase("arrived");
    }
  }, [location.search, webgl]);
  useGuidedInput(webgl && !leaving, stage);

  const enterWorld = (href: string) => {
    if (flight.reducedMotion) return navigate(href);
    setLeaving(true);
    window.setTimeout(() => navigate(href), 750);
  };

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 antialiased selection:bg-[hsl(var(--electric)/0.35)]">
      <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-14 focus:z-50 focus:bg-black focus:px-3 focus:py-2 focus:font-mono focus:text-xs">
        Skip the 3D intro
      </a>
      <Nav base="" />
      <main>
        <section id="top" ref={stage} aria-label="Landing" className="relative h-[100svh] w-full overflow-hidden">
          <StaticBackdrop />
          {webgl && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <Experience initialQuality={quality} />
              </div>
            </Suspense>
          )}
          {/* readability scrim behind type */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(55% 45% at 12% 88%, rgba(2,3,10,0.82), rgba(2,3,10,0.35) 55%, transparent 80%)" }}
          />
          <HeroCopy phase={webgl ? phase : "intro"} webgl={webgl} />
          {webgl && <ArrivalPanel phase={phase} onEnterWorld={enterWorld} />}
          {/* fade to black when leaving for a world */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#010207]"
            initial={false}
            animate={{ opacity: leaving ? 1 : 0 }}
            transition={{ duration: 0.7, ease: "easeIn" }}
          />
        </section>
        <About />
        <Explore worlds={WORLDS} />
        <ExperienceSection />
        <Projects />
        <Research />
        <Skills />
        <Education />
        <Leadership />
        <Achievements />
        <Contact />
      </main>
    </div>
  );
}
