export const NAV = [
  ["Hero", "top"],
  ["About", "about"],
  ["Explore", "explore"],
  ["Experience", "experience"],
  ["Projects", "projects"],
  ["Research", "research"],
  ["Skills", "skills"],
  ["Education", "education"],
  ["Leadership", "leadership"],
  ["Achievements", "achievements"],
  ["Contact", "contact"],
] as const;

/** Persistent plain-link navigation. `base` is "" on the home page and "/" elsewhere. */
export function Nav({ base = "" }: { base?: "" | "/" }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-[#02030a]/90 via-[#02030a]/55 to-transparent pb-4">
      <nav aria-label="Primary" className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 md:px-10">
        <a href={`${base}#top`} className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-200/90 hover:text-white">
          Ushnish Ghosal
        </a>
        <ul className="hidden flex-wrap justify-end gap-x-5 gap-y-1 lg:flex">
          {NAV.slice(1).map(([label, id]) => (
            <li key={id}>
              <a
                href={`${base}#${id}`}
                className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white focus-visible:text-white"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <details className="lg:hidden">
          <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.24em] text-slate-300">Menu</summary>
          <ul className="absolute right-4 mt-3 space-y-2 border border-white/10 bg-[#04060f]/95 p-4 backdrop-blur">
            {NAV.map(([label, id]) => (
              <li key={id}>
                <a href={`${base}#${id}`} className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300 hover:text-white">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}
