import { motion, useReducedMotion } from "framer-motion";
import { ABOUT, AWARDS, CERTIFICATIONS, EDUCATION, EXPERIENCE, LEADERSHIP, PROJECTS, RESEARCH, SKILLS } from "./content";

/* ----------------------------------------------------------------- shell */

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.7, 0.1, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function Section({ id, index, title, kicker, children }: { id: string; index: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="relative mx-auto max-w-[1600px] scroll-mt-20 border-t border-white/[0.07] px-5 py-20 md:px-10 md:py-28">
      <Reveal className="mb-12 grid gap-4 md:mb-16 md:grid-cols-[180px_1fr] md:gap-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-slate-500">
          <span className="text-cyan-300/80">{index}</span> / {title}
        </p>
        <div>
          <h2 id={`${id}-h`} className="font-display text-[clamp(2.8rem,7vw,6rem)] font-extrabold uppercase leading-[0.85] tracking-tight text-slate-50">
            {title}
          </h2>
          {kicker && <p className="mt-4 max-w-2xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-slate-400">{kicker}</p>}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <li className="border border-white/10 bg-white/[0.02] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{children}</li>
);

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((p) => (
        <li key={p} className="relative pl-4 text-[14.5px] leading-relaxed text-slate-300 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2 before:bg-cyan-300/60">
          {p}
        </li>
      ))}
    </ul>
  );
}

const linkCls = "font-mono text-[10.5px] uppercase tracking-[0.2em] text-cyan-300/90 underline-offset-4 hover:text-white hover:underline";

/* ----------------------------------------------------------------- about */

export function About() {
  return (
    <Section id="about" index="01" title="About" kicker={`${ABOUT.role} · ${ABOUT.location}`}>
      <div className="grid gap-12 md:grid-cols-[180px_1fr] md:gap-10">
        <div className="hidden md:block" />
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <p className="max-w-3xl text-[clamp(1.35rem,2.4vw,2rem)] font-light leading-[1.35] text-slate-100">{ABOUT.summary}</p>
            <h3 className="mt-12 font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-500">Research interests</h3>
            <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {ABOUT.interests.map((i) => (
                <li key={i} className="border-b border-white/[0.07] py-2 text-[14px] text-slate-300">
                  {i}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="grid grid-cols-2 gap-px border border-white/[0.07] bg-white/[0.07]">
              {ABOUT.facts.map((f) => (
                <div key={f.label} className="bg-[#02030a] p-5">
                  <dd className="font-display text-5xl font-extrabold leading-none text-white">{f.value}</dd>
                  <dt className="mt-2 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.18em] text-slate-400">{f.label}</dt>
                </div>
              ))}
            </dl>
            <a href="/Ushnish_Ghosal.pdf" className={`mt-6 inline-block ${linkCls}`}>
              Download résumé (PDF) ↓
            </a>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- timeline (experience + leadership) */

function Timeline({ rows }: { rows: { org: string; role: string; team?: string; period: string; points: string[]; link?: { label: string; href: string } }[] }) {
  return (
    <ol className="space-y-0">
      {rows.map((r, i) => (
        <li key={r.org + r.period}>
          <Reveal delay={i * 0.05} className="grid gap-4 border-t border-white/[0.07] py-10 md:grid-cols-[180px_1fr] md:gap-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{r.period}</p>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <h3 className="font-display text-3xl font-bold uppercase leading-[0.95] text-slate-50 md:text-4xl">{r.org}</h3>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300/90">{r.role}</p>
                {r.team && <p className="mt-1 text-[13.5px] text-slate-400">{r.team}</p>}
                {r.link && (
                  <a href={r.link.href} className={`mt-5 inline-block ${linkCls}`}>
                    {r.link.label} →
                  </a>
                )}
              </div>
              <Bullets items={r.points} />
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

export function Experience() {
  return (
    <Section id="experience" index="03" title="Experience" kicker="Industry research and applied AI">
      <Timeline rows={EXPERIENCE} />
    </Section>
  );
}

export function Leadership() {
  return (
    <Section id="leadership" index="08" title="Leadership" kicker="Communities and programmes">
      <Timeline rows={LEADERSHIP.map((l) => ({ ...l }))} />
    </Section>
  );
}

/* ----------------------------------------------------------------- projects */

export function Projects() {
  return (
    <Section id="projects" index="04" title="Projects" kicker="Four of these have their own 3D world — open them from Explore">
      <ul className="grid gap-px border border-white/[0.07] bg-white/[0.07] md:grid-cols-2">
        {PROJECTS.map((p, i) => (
          <li key={p.name} className="bg-[#02030a]">
            <Reveal delay={(i % 2) * 0.06} className="flex h-full flex-col p-6 md:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{p.period}</p>
                {p.world && <span className="border border-cyan-300/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200/80">3D world</span>}
              </div>
              <h3 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[0.95] text-slate-50 md:text-[2.4rem]">{p.name}</h3>
              <p className="mt-1 text-[14px] text-slate-400">{p.tagline}</p>
              <Bullets items={p.points} />
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {p.stack.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6">
                {p.world && (
                  <a href={p.world} className={linkCls}>
                    Explore world →
                  </a>
                )}
                {p.live && (
                  <a href={p.live} className={linkCls}>
                    Live demo ↗
                  </a>
                )}
                {p.repo && (
                  <a href={p.repo} className={linkCls}>
                    GitHub ↗
                  </a>
                )}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ----------------------------------------------------------------- research */

function Authors({ text }: { text: string }) {
  return (
    <p className="mt-3 text-[13.5px] leading-relaxed text-slate-400">
      {text.split(", ").map((a, i, arr) => (
        <span key={a}>
          {a === "Ushnish Ghosal" ? <strong className="font-semibold text-slate-100">{a}</strong> : a}
          {i < arr.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

export function Research() {
  return (
    <Section id="research" index="05" title="Research" kicker="Three papers · all under submission">
      <ol>
        {RESEARCH.map((r, i) => (
          <li key={r.title}>
            <Reveal delay={i * 0.05} className="grid gap-4 border-t border-white/[0.07] py-10 md:grid-cols-[180px_1fr] md:gap-10">
              <div>
                <p className="font-display text-5xl font-extrabold leading-none text-white/90">{r.year}</p>
                <p className="mt-3 inline-block border border-amber-300/30 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-200/80">Under submission</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <h3 className="text-[clamp(1.25rem,2vw,1.6rem)] font-semibold leading-snug text-slate-50">{r.title}</h3>
                  <Authors text={r.authors} />
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">{r.venue}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {r.keywords.map((k) => (
                      <Chip key={k}>{k}</Chip>
                    ))}
                  </ul>
                  {r.world && (
                    <a href={r.world} className={`mt-5 inline-block ${linkCls}`}>
                      Explore in 3D →
                    </a>
                  )}
                </div>
                <Bullets items={r.points} />
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ----------------------------------------------------------------- skills */

export function Skills() {
  return (
    <Section id="skills" index="06" title="Skills">
      <div className="grid gap-px border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
        {SKILLS.map((g, i) => (
          <Reveal key={g.group} delay={(i % 4) * 0.04} className="bg-[#02030a] p-6">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-cyan-300/80">{g.group}</h3>
            <ul className="mt-4 space-y-1.5">
              {g.items.map((s) => (
                <li key={s} className="text-[15px] text-slate-200">
                  {s}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- education */

export function Education() {
  const e = EDUCATION;
  return (
    <Section id="education" index="07" title="Education">
      <Reveal className="grid gap-4 md:grid-cols-[180px_1fr] md:gap-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">{e.period}</p>
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h3 className="font-display text-4xl font-extrabold uppercase leading-[0.92] text-slate-50 md:text-5xl">{e.school}</h3>
            <p className="mt-3 text-[16px] text-slate-300">{e.degree}</p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-500">{e.place}</p>
            <h4 className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.24em] text-slate-500">Relevant coursework</h4>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {e.coursework.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </ul>
          </div>
          <div className="self-start border border-white/[0.08] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">CGPA</p>
            <p className="mt-2 font-display text-[5.5rem] font-extrabold leading-none text-white">9.6</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">out of 10.0</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ----------------------------------------------------------------- explore + contact */

export type World = { n: string; name: string; sub: string; href?: string };

export function Explore({ worlds }: { worlds: World[] }) {
  return (
    <Section id="explore" index="02" title="Explore" kicker="Interactive 3D worlds, one per project — each driven by the real engineering">
      <ol className="grid gap-px border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
        {worlds.map((w, i) => (
          <li key={w.n} className="bg-[#02030a]">
            <Reveal delay={(i % 3) * 0.05} className="h-full">
              {w.href ? (
                <a href={w.href} className="group flex h-full flex-col p-6 transition-colors hover:bg-white/[0.025] md:p-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">World {w.n}</span>
                  <span className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.9] text-slate-50 transition-colors group-hover:text-[hsl(var(--cyan))]">{w.name}</span>
                  <span className="mt-2 text-[14px] text-slate-400">{w.sub}</span>
                  <span className="mt-auto pt-8 font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-300 group-hover:text-white">Enter →</span>
                </a>
              ) : (
                <div className="flex h-full flex-col p-6 opacity-55 md:p-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">World {w.n}</span>
                  <span className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.9] text-slate-300">{w.name}</span>
                  <span className="mt-2 text-[14px] text-slate-500">{w.sub}</span>
                  <span className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/70">[Placeholder] in production</span>
                </div>
              )}
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Contact() {
  const links = [
    ["Email", "mailto:ghosalushnish@gmail.com", "ghosalushnish@gmail.com"],
    ["LinkedIn", "https://linkedin.com/in/ushnishghosal", "linkedin.com/in/ushnishghosal"],
    ["GitHub", "https://github.com/UshnishG", "github.com/UshnishG"],
    ["Web", "https://ushnish.vercel.app", "ushnish.vercel.app"],
  ];
  return (
    <Section id="contact" index="10" title="Contact" kicker="Chennai, Tamil Nadu, India">
      <div className="grid gap-4 md:grid-cols-[180px_1fr] md:gap-10">
        <div className="hidden md:block" />
        <Reveal>
          <a href="mailto:ghosalushnish@gmail.com" className="font-display text-[clamp(2rem,6vw,5rem)] font-extrabold leading-none text-white underline-offset-8 hover:text-[hsl(var(--cyan))] hover:underline">
            ghosalushnish@gmail.com
          </a>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {links.map(([k, href, label]) => (
              <li key={k} className="border-t border-white/[0.1] pt-3">
                <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">{k}</span>
                <a href={href} className="mt-1 inline-block font-mono text-sm text-slate-200 underline-offset-4 hover:text-[hsl(var(--cyan))] hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">© {new Date().getFullYear()} Ushnish Ghosal · Built with three.js and React Three Fiber · Asset credits in ASSETS.md</p>
        </Reveal>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- achievements */

export function Achievements() {
  return (
    <Section id="achievements" index="09" title="Achievements" kicker="Awards, honours and certifications">
      <div className="grid gap-12 md:grid-cols-[180px_1fr] md:gap-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-slate-500">Honours & awards</p>
        <ul className="grid gap-px border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {AWARDS.map((a, i) => (
            <li key={a.title} className="bg-[#02030a]">
              <Reveal delay={(i % 3) * 0.05} className="h-full p-6">
                <span
                  className={`font-mono text-[9.5px] uppercase tracking-[0.2em] ${a.kind === "win" ? "text-amber-200/90" : a.kind === "oss" ? "text-violet-300/90" : "text-cyan-300/80"}`}
                >
                  {a.kind === "win" ? "Winner" : a.kind === "place" ? "Placed" : a.kind === "oss" ? "Open source" : "Honour"}
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-[0.95] text-slate-50">{a.title.replace("Winner — ", "").replace("4th Prize — ", "4th Prize · ")}</h3>
                {a.detail && <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">{a.detail}</p>}
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-slate-500">Certifications</p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATIONS.map((c, i) => (
            <li key={c.title}>
              <Reveal delay={(i % 3) * 0.05} className="flex h-full flex-col border border-white/[0.08]">
                {c.image ? (
                  <a href={c.image} className="block overflow-hidden border-b border-white/[0.08] bg-white/[0.02]">
                    <img src={c.image} alt={`${c.title} certificate`} loading="lazy" className="aspect-[4/3] w-full object-cover object-top opacity-90 transition hover:opacity-100" />
                  </a>
                ) : null}
                <div className="p-5">
                  <h3 className="text-[15px] font-medium leading-snug text-slate-100">{c.title}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {c.issuer}
                    {c.year ? ` · ${c.year}` : ""}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
