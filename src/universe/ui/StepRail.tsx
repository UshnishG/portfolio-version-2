/**
 * Big step numbers down the left edge of a world. Each number is a real button
 * (keyboard focusable); the active step shows its name beside it.
 */
export function StepRail({
  steps,
  index,
  go,
  label,
}: {
  steps: { index: string; name: string }[];
  index: number;
  go: (i: number) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} data-no-orbit className="pointer-events-auto absolute left-0 top-1/2 z-[15] hidden -translate-y-1/2 md:block">
      <ol className="flex flex-col gap-1 pl-5 lg:pl-8">
        {steps.map((s, i) => {
          const active = i === index;
          return (
            <li key={s.index}>
              <button
                onClick={() => go(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${s.index}: ${s.name}`}
                className="group relative flex items-center gap-3 py-0.5 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--cyan))]"
              >
                <span
                  className={`h-[2px] transition-all duration-500 ${active ? "w-5 bg-[hsl(var(--cyan))]" : "w-2 bg-white/25 group-hover:w-4 group-hover:bg-white/60"}`}
                />
                <span
                  className={`font-display font-extrabold leading-none tracking-tight transition-all duration-500 ${
                    active ? "text-[2.6rem] text-white" : "text-[1.9rem] text-white/35 group-hover:text-white/80"
                  }`}
                >
                  {s.index}
                </span>
                <span
                  className={`pointer-events-none hidden max-w-[170px] font-mono lg:block text-[9.5px] uppercase leading-tight tracking-[0.18em] transition-opacity duration-300 ${
                    active ? "text-cyan-200/90 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                >
                  {s.name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Small hint that the view can be rotated. */
export function DragHint() {
  return (
    <p aria-hidden className="pointer-events-none font-mono text-[9.5px] uppercase tracking-[0.22em] text-slate-400">
      Drag to rotate · scroll or press ← → to change step
    </p>
  );
}
