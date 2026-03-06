import React, { useState, useEffect } from "react";
import { audioManager } from "./audioManager";

// All known commands for tab completion (including hidden ones)
export const ALL_COMMANDS = [
  "help", "whoami", "skills", "exp", "experience", "projects",
  "stars", "posts", "medium", "certs", "certifications", "socials", "contact", "resume", "clear", "cls",
  "sound", "audio", "wget", "curl",
  "ls", "dir", "pwd", "date", "echo", "cat", "wip",
  "1", "2", "3", "4", "5", "6", "7", "8",
  // Short aliases
  "proj", "cert", "skill",
];

// Aliases
const ALIASES: Record<string, string> = {
  cls: "clear",
  experience: "exp",
  contact: "socials",
  audio: "sound",
  certifications: "certs",
  dir: "ls",
  // File/directory aliases
  "cat skills": "skills",
  "cat skills.txt": "skills",
  "cat resume": "resume",
  "cat resume.pdf": "resume",
  "cat experience": "exp",
  "cat projects": "projects",
  "cat certifications": "certs",
  "cat hobbies":"hobbies",
  // Short forms
  proj: "projects",
  cert: "certs",
  skill: "skills",
};

export function resolveAlias(cmd: string): string {
  return ALIASES[cmd] ?? cmd;
}

export function parseCommand(cmd: string): React.ReactNode {
  const resolved = resolveAlias(cmd);

  // Handle multi-word commands
  if (cmd === "wget resume.pdf" || cmd === "curl resume") {
    return <ResumeDownload />;
  }

  // Handle echo command
  if (cmd.startsWith("echo ")) {
    const text = cmd.substring(5);
    return <div className="text-foreground text-glow">{text}</div>;
  }

  // Cat commands for regular files
  if (cmd === "cat skills.txt" || cmd === "cat skills") {
    return <SkillsOutput />;
  }
  if (cmd === "cat resume.pdf" || cmd === "cat resume") {
    return <ResumeDownload />;
  }

  // Hidden Easter egg commands
  if (cmd === "cat wip" || cmd === "cat wip.txt" || cmd === "wip") {
    return <WipProjectsOutput />;
  }
  if (cmd === "cat publications.txt" || cmd === "cat publications") {
    return <PublicationsOutput />;
  }
  if (cmd === "cat hobbies" || cmd === "cat hobbies.txt") {
    return <HobbiesOutput />;
  }

  switch (resolved) {
    case "help":
      return <HelpOutput />;
    case "1":
    case "whoami":
      return <WhoamiOutput />;
    case "2":
    case "skills":
      return <SkillsOutput />;
    case "3":
    case "exp":
      return <ExpOutput />;
    case "4":
    case "projects":
      return <ProjectsOutput />;
    case "5":
    case "certs":
      return <CertificationsOutput />;
    case "6":
    case "socials":
      return <SocialsOutput />;
    case "7":
    case "resume":
      return <ResumeDownload />;
    case "8":
    case "ls":
    case "dir":
      return <LsOutput />;
    case "stars":
      return <StarsOutput />;
    case "posts":
      return <PostsOutput />;
    case "medium":
      return <MediumPostsOutput />;
    case "sound":
      return <SoundToggle />;
    case "pwd":
      return <PwdOutput />;
    case "echo":
      return <div className="text-muted-foreground">Usage: echo [text]</div>;
    case "date":
      return <DateOutput />;
    case "clear":
      return null; // handled in Index.tsx
    default:
      return (
        <div>
          <span className="text-destructive">bash: {cmd}: command not found... Type 'help' for available commands.</span>
        </div>
      );
  }
}

const HelpOutput = () => (
  <div className="space-y-4">
    <div className="border-l-4 border-accent pl-4 py-2">
      <p className="text-foreground text-glow text-lg font-bold">📖 COMMAND REFERENCE</p>
      <p className="text-muted-foreground text-sm mt-1">Type any command below to explore the portfolio</p>
    </div>

    {/* About Section */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-accent text-glow-amber text-lg">👤</span>
        <p className="text-accent text-glow-amber font-bold uppercase tracking-wider">About</p>
      </div>
      <div className="ml-6 space-y-1.5">
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">whoami</span>
          <span className="text-muted-foreground">→ Learn about my education and background</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">skills</span>
          <span className="text-muted-foreground">→ View my technical skills & expertise</span>
        </div>
      </div>
    </div>

    {/* Experience & Projects */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-accent text-glow-amber text-lg">💼</span>
        <p className="text-accent text-glow-amber font-bold uppercase tracking-wider">Experience & Work</p>
      </div>
      <div className="ml-6 space-y-1.5">
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">exp</span>
          <span className="text-muted-foreground">→ My work experience timeline</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">projects</span>
          <span className="text-muted-foreground">→ Featured projects & achievements</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">stars</span>
          <span className="text-muted-foreground">→ GitHub repositories I've starred</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">certs</span>
          <span className="text-muted-foreground">→ View my certifications & credentials</span>
        </div>
      </div>
    </div>

    {/* Social & Contact */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-accent text-glow-amber text-lg">🌐</span>
        <p className="text-accent text-glow-amber font-bold uppercase tracking-wider">Connect</p>
      </div>
      <div className="ml-6 space-y-1.5">
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">socials</span>
          <span className="text-muted-foreground">→ Contact info & social links</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">posts</span>
          <span className="text-muted-foreground">→ My latest LinkedIn posts</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">medium</span>
          <span className="text-muted-foreground">→ My Medium articles & blog posts</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">resume</span>
          <span className="text-muted-foreground">→ Download my resume (PDF)</span>
        </div>
      </div>
    </div>

    {/* System Commands */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-accent text-glow-amber text-lg">⚙️</span>
        <p className="text-accent text-glow-amber font-bold uppercase tracking-wider">System</p>
      </div>
      <div className="ml-6 space-y-1.5">
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">sound</span>
          <span className="text-muted-foreground">→ Toggle audio effects on/off</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">clear</span>
          <span className="text-muted-foreground">→ Clear the terminal screen</span>
        </div>
        <div className="flex items-start gap-3 hover:bg-muted/10 p-1.5 rounded transition-colors">
          <span className="text-accent text-glow-amber font-mono min-w-[100px]">help</span>
          <span className="text-muted-foreground">→ Show this help message</span>
        </div>
      </div>
    </div>

    {/* Tips Section */}
    <div className="border border-border p-3 mt-4 bg-muted/5">
      <p className="text-foreground text-glow font-bold mb-2">💡 Pro Tips:</p>
      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
        <li>• Use <span className="text-accent text-glow-amber">Tab</span> to auto-complete commands</li>
        <li>• Press <span className="text-accent text-glow-amber">↑</span> / <span className="text-accent text-glow-amber">↓</span> to browse command history</li>
        <li>• Try aliases: <span className="text-accent text-glow-amber">cls</span> (clear), <span className="text-accent text-glow-amber">experience</span> (exp), <span className="text-accent text-glow-amber">contact</span> (socials)</li>
        <li>• Some files might be hidden... try using <span className="text-accent text-glow-amber">cat</span> 🐱</li>
      </ul>
    </div>
  </div>
);

const WhoamiOutput = () => (
  <div className="space-y-2">
    <p className="text-accent text-glow-amber text-lg font-bold">Ushnish Ghosal</p>
    <div className="ml-2 space-y-1">
      <p><span className="text-muted-foreground">Education:</span> B.Tech in Computer Science and Engineering</p>
      <p><span className="text-muted-foreground">Institute:</span> SRM Institute of Science and Technology, Chennai</p>
      <p><span className="text-muted-foreground">Batch:</span> 2023–2027</p>
      <p><span className="text-muted-foreground">CGPA:</span> <span className="text-accent text-glow-amber font-bold">9.6</span></p>
    </div>
  </div>
);

const ASCII_ART = `
    ██╗   ██╗ ██████╗ 
    ██║   ██║██╔════╝ 
    ██║   ██║██║  ███╗
    ██║   ██║██║   ██║
    ╚██████╔╝╚██████╔╝
     ╚═════╝  ╚═════╝ `.split("\n");

const SkillsOutput = () => (
  <div className="flex flex-col md:flex-row gap-4 md:gap-8">
    <pre className="text-accent text-glow-amber text-xs leading-tight hidden md:block">
      {ASCII_ART.join("\n")}
    </pre>
    <div className="space-y-2 text-sm">
      <div className="flex gap-2">
        <span className="text-accent text-glow-amber min-w-[140px]">Languages</span>
        <span>Python, Java, C, C++</span>
      </div>
      <div className="flex gap-2">
        <span className="text-accent text-glow-amber min-w-[140px]">AI & Frameworks</span>
        <span>PyTorch, TensorFlow.js, Keras, OpenCV, MediaPipe</span>
      </div>
      <div className="flex gap-2">
        <span className="text-accent text-glow-amber min-w-[140px]">Databases</span>
        <span>MySQL, SQLite, MongoDB</span>
      </div>
      <div className="flex gap-2">
        <span className="text-accent text-glow-amber min-w-[140px]">Tools</span>
        <span>Git, GitHub, VS Code</span>
      </div>
    </div>
  </div>
);

const ExpOutput = () => (
  <div className="space-y-3 text-sm">
    <div className="border-l-2 border-accent pl-3">
      <p className="text-muted-foreground">[Jul 2025 – Aug 2025]</p>
      <p className="text-accent text-glow-amber font-bold">AI Intern @ Synapse Recruiter Network</p>
      <p>Built AI recruitment discovery agents and improved the interview-to-hire ratio from 54% to 81%.</p>
    </div>
    <div className="border-l-2 border-accent pl-3">
      <p className="text-muted-foreground">[Nov 2024 – Jul 2025]</p>
      <p className="text-accent text-glow-amber font-bold">Samsung Prism Project Intern @ Samsung R&D Bangalore</p>
      <p>Utilized LLMs and GANs for synthetic data generation.</p>
    </div>
    <div className="border-l-2 border-accent pl-3">
      <p className="text-muted-foreground">[Aug 2025 – Present]</p>
      <p className="text-accent text-glow-amber font-bold">Vice Chairperson — IEEE Computer Society, SRM</p>
      <p>Organized the ICT Quiz and coordinated the DVP Roadshow.</p>
    </div>
  </div>
);

const ProjectsOutput = () => (
  <div className="space-y-4 text-sm">
    <div className="border border-border p-3">
      <p className="text-accent text-glow-amber font-bold">TerraScan <span className="text-muted-foreground font-normal">(2025)</span></p>
      <p className="text-muted-foreground italic">AI + IoT Autonomous Drone for Landmine Detection</p>
      <p className="mt-1">Developed a pipeline achieving 95% detection accuracy using YOLO v11, PyTorch, LiDAR, and GPR.</p>
    </div>
    <div className="border border-border p-3">
      <p className="text-accent text-glow-amber font-bold">Fit Fusion <span className="text-muted-foreground font-normal">(2025)</span></p>
      <p className="text-muted-foreground italic">4th Prize, Bajaj Finserv Flex It Out</p>
      <p className="mt-1">Built real-time exercise tracking using TensorFlow.js and MediaPipe.</p>
    </div>
    <div className="border border-border p-3">
      <p className="text-accent text-glow-amber font-bold">Coffee Bean Quality Assurance <span className="text-muted-foreground font-normal">(2024)</span></p>
      <p className="text-muted-foreground italic">Computer Vision Quality Control</p>
      <p className="mt-1">Detected seven types of defective beans using Python, OpenCV, and YOLO.</p>
    </div>
  </div>
);

const StarsOutput = () => {
  const [repos, setRepos] = useState<any[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("https://api.github.com/users/UshnishG/starred?per_page=6")
      .then((r) => r.json())
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-destructive">Error fetching starred repos.</p>;
  if (!repos) return <p className="text-muted-foreground animate-pulse">Fetching live data...</p>;
  if (repos.length === 0) return <p className="text-muted-foreground">No starred repositories found.</p>;

  return (
    <div className="space-y-1 text-sm">
      {repos.map((r: any) => (
        <p key={r.id}>
          <span className="text-accent text-glow-amber">★</span>{" "}
          <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="text-accent text-glow-amber underline">{r.full_name}</a>
          <span className="text-muted-foreground"> - {r.description || "No description"} - ★ {r.stargazers_count}</span>
        </p>
      ))}
    </div>
  );
};

const PostsOutput = () => {
  const posts = [
    {
      id: "7412534773643919360",
      title: "2025 LinkedIn Wrapped: Quality Over Quantity",
      summary: "9 posts. 156% growth. 2,870 engaged followers. I broke LinkedIn's golden rule by not posting daily—and built a real community instead. Sharing what actually worked: authenticity over polish, signal over noise, and meaning over timing.",
      date: "2025",
      url: "https://www.linkedin.com/feed/update/urn:li:share:7412534773643919360",
      tags: ["Growth", "DataScience", "Finance", "BuildingInPublic"]
    },
    {
      id: "7403840281223368705",
      title: "From 1750 BC Clay Tablets to Black-Scholes",
      summary: "Day 1 at ACM Winter School on AI & Finance at IIIT Hyderabad. Explored the evolution of derivatives from Ancient Greece to modern quant finance. Deep dive into No-Arbitrage Principle, Stochastic Calculus with Brownian Motion, and deriving the Black-Scholes PDE that revolutionized option pricing.",
      date: "2025",
      url: "https://www.linkedin.com/posts/ushnishghosal_acmwinterschool-quantfinance-iiithyderabad-activity-7403840281223368705-neph",
      tags: ["ACMWinterSchool", "QuantFinance", "IIITHyderabad", "AIinFinance", "MachineLearning"]
    },
    {
      id: "7359247914390482945",
      title: "From Self-Doubt to Top Achiever: A Comeback Story",
      summary: "In 2021-2022, I was defeated with degrading grades and shattered confidence. Fast forward to 2025—I treated college as my redemption arc. Through quiet resilience and consistency, I earned the Top Achiever's Medal and became among the highest-paid interns. This medal is a message to my 17-year-old self: YOU WERE ALWAYS ENOUGH.",
      date: "2024",
      url: "https://www.linkedin.com/posts/ushnishghosal_comebackstory-resilience-consistency-activity-7359247914390482945-bRru",
      tags: ["ComebackStory", "Resilience", "Consistency", "GrowthMindset", "TopAchiever", "NeverGiveUp"]
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-accent text-glow-amber font-bold text-lg mb-3">📝 Top LinkedIn Posts</p>
      {posts.map((post, idx) => (
        <div key={post.id} className="border border-border p-4 hover:border-accent transition-colors">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-accent text-glow-amber font-bold">#{idx + 1}</span>
              <span className="text-foreground text-glow font-semibold">{post.title}</span>
            </div>
            <span className="text-muted-foreground text-xs">{post.date}</span>
          </div>
          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{post.summary}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-accent text-glow-amber opacity-70">
                #{tag}
              </span>
            ))}
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent text-glow-amber hover:underline text-sm"
          >
            <span>→ Read full post on LinkedIn</span>
            <span className="text-xs">🔗</span>
          </a>
        </div>
      ))}
      <div className="mt-4 pt-3 border-t border-border">
        <a
          href="https://www.linkedin.com/in/ushnishghosal/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent text-glow-amber hover:underline"
        >
          → View all posts on my LinkedIn profile
        </a>
      </div>
    </div>
  );
};

const MediumPostsOutput = () => {
  const posts = [
    {
      id: "1",
      title: "Advent of Code — A Thinking-First Walkthrough",
      summary: "This introductory post sets the stage for a unique 12-day AoC series that prioritizes problem-solving intuition over coding speed or 'code golf.' It highlights the notorious 'AoC Twist'—where a simple solution for Part 1 entirely falls apart in Part 2—and frames this frustration as a valuable tool for learning to think like an engineer. The series promises to break down complex problems into simple English, highlight common pitfalls, and guide readers toward the 'Aha!' moments needed to build robust, mathematically sound solutions.",
      date: "Dec 13, 2025",
      url: "https://medium.com/@ghosalushnish/advent-of-code-a-thinking-first-walkthrough-d3b932d03a67",
      tags: ["AdventOfCode", "ProblemSolving", "Engineering", "Algorithms"]
    },
    {
      id: "2",
      title: "Advent Of Code: Day 1 — Escaping the Simulation Trap",
      summary: "This post dives into the Day 1 puzzle, which involves deciphering a password by tracking a safe dial numbered 0 to 99 as it rotates left and right. It warns against the 'naive approach' of step-by-step simulation (the 'simulation trap'), which works for small numbers but crashes when faced with massive rotational instructions (e.g., R1000000). The core takeaway is learning to recognize circular structures and applying mathematical shortcuts rather than brute-forcing every single loop.",
      date: "Dec 13, 2025",
      url: "https://medium.com/@ghosalushnish/advent-of-code-day-1-escaping-the-simulation-trap-3bc3a3d77768",
      tags: ["AdventOfCode", "Optimization", "CircularStructures", "Mathematics"]
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-accent text-glow-amber font-bold text-lg mb-3">📰 Medium Articles</p>
      {posts.map((post, idx) => (
        <div key={post.id} className="border border-border p-4 hover:border-accent transition-colors">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-accent text-glow-amber font-bold">#{idx + 1}</span>
              <span className="text-foreground text-glow font-semibold">{post.title}</span>
            </div>
            <span className="text-muted-foreground text-xs">{post.date}</span>
          </div>
          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{post.summary}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-accent text-glow-amber opacity-70">
                #{tag}
              </span>
            ))}
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent text-glow-amber hover:underline text-sm"
          >
            <span>→ Read full article on Medium</span>
            <span className="text-xs">🔗</span>
          </a>
        </div>
      ))}
      <div className="mt-4 pt-3 border-t border-border">
        <a
          href="https://medium.com/@ghosalushnish"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent text-glow-amber hover:underline"
        >
          → View all articles on my Medium profile
        </a>
      </div>
    </div>
  );
};

const CertificationsOutput = () => {
  const certifications: Array<{
    id: string;
    title: string;
    issuer: string;
    date: string;
    image: string;
    credentialUrl?: string;
  }> = [
      {
        id: "1",
        title: "Oracle Certified AI Foundations Associate",
        issuer: "Oracle",
        date: "2025",
        image: "/certs/Oracle Certified AI Foundations Associate.png",
      },
      {
        id: "2",
        title: "Oracle ERP Process Essentials",
        issuer: "Oracle",
        date: "2025",
        image: "/certs/Oracle ERP Process Essentials.png",
      },
      {
        id: "3",
        title: "SAP Certified - SAP Generative AI Developer",
        issuer: "SAP",
        date: "2026",
        image: "/certs/SAP Certified - SAP Generative AI Developer.png",
      },
    ];

  return (
    <div className="space-y-4">
      <p className="text-accent text-glow-amber font-bold text-lg mb-3">🏆 Certifications & Credentials</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certifications.map((cert) => (
          <div key={cert.id} className="border border-border p-4 hover:border-accent transition-colors">
            <div className="mb-3">
              <img
                src={cert.image}
                alt={cert.title}
                className="w-full h-48 object-cover rounded border border-border hover:scale-105 transition-transform cursor-pointer"
                onClick={() => window.open(cert.image, '_blank')}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-glow font-semibold">{cert.title}</h3>
              <p className="text-muted-foreground text-sm">{cert.issuer}</p>
              <p className="text-accent text-glow-amber text-xs">{cert.date}</p>
              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent text-glow-amber hover:underline text-sm mt-2"
                >
                  <span>→ View Credential</span>
                  <span className="text-xs">🔗</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border text-muted-foreground text-sm">
        <p>💡 Click on any certificate image to view it in full size</p>
      </div>
    </div>
  );
};

const SocialsOutput = () => (
  <div className="space-y-2 text-sm">
    <p className="text-accent text-glow-amber font-bold">Contact & Social Links:</p>
    <div className="ml-2 space-y-1">
      <p>
        <span className="text-accent text-glow-amber">[ GitHub ]</span> : {" "}
        <a href="https://github.com/UshnishG" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent transition-colors">https://github.com/UshnishG</a>
      </p>
      <p>
        <span className="text-accent text-glow-amber">[ LinkedIn ]</span> : {" "}
        <a href="https://www.linkedin.com/in/ushnishghosal/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent transition-colors">https://www.linkedin.com/in/ushnishghosal/</a>
      </p>
      <p>
        <span className="text-accent text-glow-amber">[ Email ]</span> : {" "}
        <a href="mailto:ghosalushnish@gmail.com" className="underline hover:text-accent transition-colors">ghosalushnish@gmail.com</a>
      </p>
      <p>
        <span className="text-accent text-glow-amber">[ Medium ]</span> : {" "}
        <a href="https://medium.com/@ghosalushnish" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent transition-colors">https://medium.com/@ghosalushnish</a>
      </p>
    </div>
  </div>
);

const ResumeDownload = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      audioManager.playSuccess();
      const t = setTimeout(() => {
        window.open("/Ushnish_Ghosal.pdf", "_blank");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [progress]);

  const filled = Math.floor(progress / 5);
  const bar = "=".repeat(filled) + (filled < 20 ? ">" : "") + " ".repeat(Math.max(0, 20 - filled - 1));

  return (
    <div className="my-4">
      {/* Windows 95 style dialog box */}
      <div
        className="inline-block bg-gray-200 border-2 border-t-white border-l-white border-r-gray-600 border-b-gray-600 p-0 min-w-[400px]"
        style={{
          boxShadow: '2px 2px 0px rgba(0,0,0,0.5)'
        }}
      >
        {/* Title bar */}
        <div
          className="bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1 flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, #000080, #1084d0)'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">📄 Download Manager</span>
          </div>
          <button className="w-4 h-4 bg-gray-300 border border-gray-600 flex items-center justify-center text-[10px] hover:bg-gray-200">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-gray-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">💾</div>
            <div className="flex-1">
              <p className="text-black font-bold mb-2">Ushnish_Ghosal.pdf</p>
              <p className="text-black text-sm mb-3">Downloading from: C:\PORTFOLIO\RESUME\</p>

              {/* Progress bar - Windows 95 style */}
              <div className="border-2 border-t-gray-600 border-l-gray-600 border-r-white border-b-white bg-white p-1 mb-2">
                <div
                  className="h-5 bg-blue-600 transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(to right, #000080, #1084d0)'
                  }}
                />
              </div>

              <p className="text-black text-sm">{progress}% complete</p>
              {progress === 100 && (
                <p className="text-green-700 text-sm mt-2 font-bold">✓ Download complete! Opening file...</p>
              )}
            </div>
          </div>

          {/* Button */}
          {progress === 100 && (
            <div className="flex justify-end">
              <button
                className="px-4 py-1 bg-gray-300 border-2 border-t-white border-l-white border-r-gray-600 border-b-gray-600 text-black text-sm hover:bg-gray-200 active:border-t-gray-600 active:border-l-gray-600 active:border-r-white active:border-b-white"
                onClick={() => window.open("/Ushnish_Ghosal.pdf", "_blank")}
              >
                Open File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SoundToggle = () => {
  const [enabled, setEnabled] = useState(audioManager.isEnabled());

  useEffect(() => {
    const newState = audioManager.toggle();
    setEnabled(newState);
  }, []);

  return (
    <div className="text-sm">
      <p className="text-accent text-glow-amber">
        Sound effects: <span className={enabled ? "text-foreground" : "text-muted-foreground"}>
          {enabled ? "ENABLED" : "DISABLED"}
        </span>
      </p>
      <p className="text-muted-foreground mt-1">
        {enabled ? "🔊 Audio cues are now active" : "🔇 Audio cues are now muted"}
      </p>
    </div>
  );
};

// Hidden Easter Egg: WIP Projects
const WipProjectsOutput = () => (
  <div className="space-y-4 font-mono">
    <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-500/10">
      <p className="text-yellow-500 font-bold text-lg flex items-center gap-2">
        <span>🔍</span>
        <span>[ DIRECTORY SCAN: /home/desktop/work/ongoing ]</span>
      </p>
      <p className="text-muted-foreground text-sm mt-1">Found 2 active development environments...</p>
    </div>

    {/* Project 1 */}
    <div className="border border-accent p-4 bg-accent/5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🍽️</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent text-glow-amber font-bold">&gt; PROJECT 01:</span>
            <span className="text-foreground text-glow font-bold">La_Drizzle_POS</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Status:</span>
              <span className="text-green-500 font-bold animate-pulse">ACTIVE_DEVELOPMENT</span>
            </div>
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Description:</span>
              <span className="text-muted-foreground">A comprehensive, full-stack Point of Sale (POS) system engineered to digitize a family-owned restaurant and bar business.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Architecture:</span>
              <span className="text-muted-foreground">Features fully connected, real-time web portals with role-based access control (RBAC). Dedicated dashboards for Bar, Restaurant, Kitchen, Staff, and Owner levels to enable seamless on-the-go order tracking.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-accent/30">
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded">Full-Stack</span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded">Real-Time</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded">RBAC</span>
        </div>
      </div>
    </div>

    {/* Project 2 */}
    <div className="border border-accent p-4 bg-accent/5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🚁</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent text-glow-amber font-bold">&gt; PROJECT 02:</span>
            <span className="text-foreground text-glow font-bold">D-MIND</span>
          </div>
          <p className="text-muted-foreground text-xs italic mb-2">(Disaster Management and Intelligent Navigation Drone)</p>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Status:</span>
              <span className="text-blue-500 font-bold">COLLEGE_MINOR_PROJECT</span>
            </div>
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Team:</span>
              <span className="text-muted-foreground">Ushnish Ghosal [cite: 323], Keshav Gupta [cite: 325]</span>
            </div>
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Guide:</span>
              <span className="text-muted-foreground">Dr. G. Niranjana</span>
            </div>
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[100px]">Description:</span>
              <span className="text-muted-foreground">Next-generation autonomous UAV system for landmine detection and disaster management.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-accent/30">
        <p className="text-accent text-glow-amber text-sm font-bold mb-2">Tech Stack & Hardware:</p>
        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
          <li>• <span className="text-foreground">Model:</span> YOLOv12 trained on 5,000 thermal IR images</li>
          <li>• <span className="text-foreground">Edge Compute:</span> Deployed on NVIDIA Jetson Xavier for onboard inference</li>
          <li>• <span className="text-foreground">Payload:</span> Multi-sensor fusion including GPR, Thermal Infrared, Multispectral Cameras, and Metal Detector</li>
          <li>• <span className="text-foreground">Navigation:</span> U-Net segmentation with zig-zag/spiral path planning algorithms</li>
        </ul>
      </div>

      <div className="mt-3 pt-3 border-t border-accent/30">
        <p className="text-accent text-glow-amber text-sm font-bold mb-2">Performance:</p>
        <p className="text-green-500 text-sm">⚡ Operates up to 70% faster and 3x more accurately than manual detection</p>
      </div>

      <div className="mt-3 pt-3 border-t border-accent/30">
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded">YOLOv12</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded">NVIDIA Jetson</span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded">Computer Vision</span>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded">UAV</span>
        </div>
      </div>
    </div>

    <div className="text-muted-foreground text-xs italic text-center pt-2">
      <p>💡 These projects are actively being developed...</p>
    </div>
  </div>
);

// Hidden Easter Egg: Publications
const PublicationsOutput = () => (
  <div className="space-y-4 font-mono">
    <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-500/10">
      <p className="text-purple-500 font-bold text-lg flex items-center gap-2">
        <span>📄</span>
        <span>[ STATUS: PENDING PUBLICATION ]</span>
      </p>
    </div>

    <div className="border border-purple-500 p-4 bg-purple-500/5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">🤖</span>
        <div className="flex-1">
          <h3 className="text-foreground text-glow font-bold text-lg mb-2">
            Agentic LLMs for FCAPS: A Real-Time, Multi-Model Framework for Intelligent Network Observability
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-accent text-glow-amber min-w-[120px]">Framework Name:</span>
              <span className="text-purple-400 font-bold">INFER</span>
              <span className="text-muted-foreground text-xs">(Intelligent Network Fault Evaluation & Resolution)</span>
            </div>

            <div className="border-t border-purple-500/30 pt-3">
              <p className="text-accent text-glow-amber font-bold mb-2">Abstract:</p>
              <p className="text-muted-foreground leading-relaxed">
                This paper presents an end-to-end operational pipeline utilizing multiple Large Language Models.
                The modular pipeline employs <span className="text-foreground">Phi-2</span> for rapid classification,
                <span className="text-foreground"> Mistral 7B</span> for semantic summarization, and
                <span className="text-foreground"> DeepSeek R1 8B</span> for deep reasoning<span className="text-purple-400">[cite: 75]</span>.
                It leverages <span className="text-foreground">FAISS</span> and <span className="text-foreground">Redis</span> for
                semantic vector storage and contextual retrieval, alongside an <span className="text-foreground">LSTM-based</span> forecasting
                module<span className="text-purple-400">[cite: 76]</span>.
              </p>
            </div>

            <div className="border-t border-purple-500/30 pt-3">
              <p className="text-accent text-glow-amber font-bold mb-2">Performance Metrics:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 border border-green-500/30 p-2 rounded">
                  <p className="text-green-400 font-bold text-lg">98.4%</p>
                  <p className="text-muted-foreground text-xs">Classification Accuracy<span className="text-purple-400">[cite: 77]</span></p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded">
                  <p className="text-blue-400 font-bold text-lg">&lt;300ms</p>
                  <p className="text-muted-foreground text-xs">Processing Latency<span className="text-purple-400">[cite: 77]</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-purple-500/30">
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded">LLMs</span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded">FCAPS</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded">Real-Time</span>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded">Network Observability</span>
          <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded">Multi-Model</span>
        </div>
      </div>
    </div>

    <div className="text-muted-foreground text-xs italic text-center pt-2">
      <p>📚 Publication status: Under review</p>
    </div>
  </div>
);

// Hidden Easter Egg: Hobbies
const HobbiesOutput = () => (
  <div className="space-y-4 font-mono">
    <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-500/10">
      <p className="text-red-500 font-bold text-lg flex items-center gap-2">
        <span>⚠️</span>
        <span>[ SYSTEM LOG ] User profile anomaly detected.</span>
      </p>
    </div>

    {/* Childhood Process */}
    <div className="border border-blue-500 p-4 bg-blue-500/5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-400 font-bold">[CHILDHOOD.EXE]</span>
        <span className="text-red-500 font-bold">Process terminated.</span>
      </div>
      <div className="ml-4 space-y-1 text-sm">
        <p className="text-muted-foreground">
          <span className="text-accent text-glow-amber">Previous state:</span> Consuming 'Geronimo_Stilton.pdf' volumes at high frequency.
        </p>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded text-xs">📚 Reading</span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded text-xs">🐭 Geronimo Stilton</span>
        </div>
      </div>
    </div>

    {/* Adulting Process */}
    <div className="border border-green-500 p-4 bg-green-500/5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-400 font-bold">[ADULTING.SH]</span>
        <span className="text-green-500 font-bold">Executed successfully.</span>
      </div>
      <div className="ml-4 space-y-1 text-sm">
        <p className="text-muted-foreground">
          <span className="text-accent text-glow-amber">Reality parameters:</span> Updated.
        </p>
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded mt-2">
          <p className="text-yellow-400 text-xs">⚠️ Warning: Responsibilities increased. Free time decreased.</p>
        </div>
      </div>
    </div>

    {/* Current State */}
    <div className="border border-accent p-4 bg-accent/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent text-glow-amber font-bold">[CURRENT_STATE]</span>
        <span className="text-green-500 font-bold animate-pulse">● ACTIVE</span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded">
          <p className="text-red-400 font-bold mb-2">🎮 Redirecting processing power to Riot Vanguard...</p>
          <div className="ml-4 space-y-1">
            <p className="text-muted-foreground">
              <span className="text-foreground">Loading VALORANT...</span>
            </p>
            <p className="text-muted-foreground">
              <span className="text-accent text-glow-amber">Status:</span> Grinding RR while trying to avoid production database drops.
            </p>
            <div className="mt-2 flex gap-2">
              <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded text-xs">🎯 VALORANT</span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded text-xs">⚔️ Competitive</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded">
          <p className="text-blue-400 font-bold mb-2">⌨️ Side-quest:</p>
          <p className="text-muted-foreground ml-4">
            Maintaining <span className="text-foreground font-bold">90 WPM</span> keyboard/piano skills for when the ping gets too high.
          </p>
          <div className="mt-2 ml-4 flex gap-2">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded text-xs">⌨️ Typing</span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded text-xs">🎹 Piano</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded text-xs">90 WPM</span>
          </div>
        </div>
      </div>
    </div>

    <div className="text-center pt-3">
      <div className="inline-block bg-muted/20 border border-border px-4 py-2 rounded">
        <p className="text-muted-foreground text-xs">
          <span className="text-accent text-glow-amber">System uptime:</span> {new Date().getFullYear() - 2002} years
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          <span className="text-accent text-glow-amber">Current mood:</span> <span className="text-green-400">Vibing 😎</span>
        </p>
      </div>
    </div>
  </div>
);

// Unix-like commands
const LsOutput = () => (
  <div className="font-mono text-sm space-y-2">
    <p className="text-muted-foreground">total 8</p>
    <div className="grid grid-cols-1 gap-1">
      <div className="flex items-center gap-3">
        <span className="text-blue-400">drwxr-xr-x</span>
        <span className="text-muted-foreground">2 ushnish ushnish 4096</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-blue-400 hover:text-blue-300 cursor-pointer">projects/</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-blue-400">drwxr-xr-x</span>
        <span className="text-muted-foreground">2 ushnish ushnish 4096</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-blue-400 hover:text-blue-300 cursor-pointer">experience/</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-green-400">-rw-r--r--</span>
        <span className="text-muted-foreground">1 ushnish ushnish 2048</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-green-400 hover:text-green-300 cursor-pointer">skills.txt</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-green-400">-rw-r--r--</span>
        <span className="text-muted-foreground">1 ushnish ushnish 1024</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-green-400 hover:text-green-300 cursor-pointer">resume.pdf</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-yellow-400">-rw-r--r--</span>
        <span className="text-muted-foreground">1 ushnish ushnish 512</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-yellow-400 hover:text-yellow-300 cursor-pointer">wip.txt</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-yellow-400">-rw-r--r--</span>
        <span className="text-muted-foreground">1 ushnish ushnish 768</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-yellow-400 hover:text-yellow-300 cursor-pointer">publications.txt</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-yellow-400">-rw-r--r--</span>
        <span className="text-muted-foreground">1 ushnish ushnish 256</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-yellow-400 hover:text-yellow-300 cursor-pointer">hobbies.txt</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-blue-400">drwxr-xr-x</span>
        <span className="text-muted-foreground">2 ushnish ushnish 4096</span>
        <span className="text-muted-foreground">Mar 6 18:30</span>
        <span className="text-blue-400 hover:text-blue-300 cursor-pointer">certifications/</span>
      </div>
    </div>
    <div className="mt-3 text-muted-foreground text-xs italic">
      <p>💡 Tip: Use 'cat [filename]' to view file contents</p>
    </div>
  </div>
);

const PwdOutput = () => (
  <div className="font-mono text-sm">
    <p className="text-foreground text-glow">/home/ushnish/portfolio</p>
  </div>
);

const DateOutput = () => (
  <div className="font-mono text-sm">
    <p className="text-foreground text-glow">{new Date().toString()}</p>
  </div>
);
