import React, { useState, useEffect } from "react";

// All known commands for tab completion (including hidden ones)
export const ALL_COMMANDS = [
  "help", "whoami", "about", "skills", "exp", "experience", "projects",
  "stars", "posts", "linkedin", "socials", "contact", "clear", "cls",
  "ls", "wip", "cat", "sudo", "wget", "curl",
];

// Aliases
const ALIASES: Record<string, string> = {
  ls: "ls",
  cls: "clear",
  linkedin: "posts",
  experience: "exp",
  about: "whoami",
  contact: "socials",
};

export function resolveAlias(cmd: string): string {
  return ALIASES[cmd] ?? cmd;
}

export function parseCommand(cmd: string): React.ReactNode {
  const resolved = resolveAlias(cmd);

  // Handle multi-word commands
  if (cmd.startsWith("cat ")) {
    const file = cmd.slice(4).trim();
    return <CatOutput file={file} />;
  }
  if (cmd.startsWith("sudo")) {
    return <SudoOutput />;
  }
  if (cmd === "wget resume.pdf" || cmd === "curl resume") {
    return <ResumeDownload />;
  }

  switch (resolved) {
    case "help":
      return <HelpOutput />;
    case "whoami":
      return <WhoamiOutput />;
    case "skills":
      return <SkillsOutput />;
    case "exp":
      return <ExpOutput />;
    case "projects":
      return <ProjectsOutput />;
    case "ls":
      return <LsOutput />;
    case "stars":
      return <StarsOutput />;
    case "posts":
      return <PostsOutput />;
    case "socials":
      return <SocialsOutput />;
    case "wip":
      return <WipOutput />;
    case "clear":
      return null; // handled in Index.tsx
    default:
      return (
        <div>
          <span className="text-destructive">bash: {cmd}: command not found</span>
          <p className="text-muted-foreground mt-1">Type 'help' to see available commands.</p>
        </div>
      );
  }
}

const HelpOutput = () => (
  <div className="space-y-3">
    <p className="text-accent text-glow-amber font-bold">[ ESSENTIALS ]</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 ml-2">
      <div><span className="text-accent text-glow-amber">whoami</span>    <span className="text-muted-foreground">— About me</span></div>
      <div><span className="text-accent text-glow-amber">skills</span>    <span className="text-muted-foreground">— Technical skills</span></div>
      <div><span className="text-accent text-glow-amber">exp</span>       <span className="text-muted-foreground">— Work experience</span></div>
      <div><span className="text-accent text-glow-amber">projects</span>  <span className="text-muted-foreground">— Featured projects</span></div>
      <div><span className="text-accent text-glow-amber">stars</span>     <span className="text-muted-foreground">— GitHub starred repos</span></div>
    </div>

    <p className="text-accent text-glow-amber font-bold mt-3">[ SOCIAL ]</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 ml-2">
      <div><span className="text-accent text-glow-amber">socials</span>   <span className="text-muted-foreground">— Contact & links</span></div>
      <div><span className="text-accent text-glow-amber">posts</span>     <span className="text-muted-foreground">— LinkedIn feed</span></div>
    </div>

    <p className="text-accent text-glow-amber font-bold mt-3">[ UTILS ]</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 ml-2">
      <div><span className="text-accent text-glow-amber">clear</span>     <span className="text-muted-foreground">— Clear terminal</span></div>
      <div><span className="text-accent text-glow-amber">help</span>      <span className="text-muted-foreground">— Show this message</span></div>
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

const LsOutput = () => (
  <div className="space-y-1">
    <p className="text-accent text-glow-amber font-bold mb-2">drwxr-xr-x  ushnish  portfolio/</p>
    <ProjectsOutput />
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-accent text-glow-amber font-bold mb-2">[ WORK IN PROGRESS ]</p>
      <WipOutput />
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
    "urn:li:share:7412534773643919360",
    "urn:li:share:7403840281223368705",
    "urn:li:share:7359247914390482945",
  ];
  return (
    <div className="space-y-4">
      <p className="text-accent text-glow-amber font-bold">LinkedIn Feed:</p>
      <div className="grid grid-cols-1 gap-4">
        {posts.map((urn) => (
          <iframe
            key={urn}
            src={`https://www.linkedin.com/embed/feed/update/${urn}`}
            width="100%"
            height="300"
            frameBorder="0"
            allowFullScreen
            title="LinkedIn Post"
            className="border border-border rounded-none max-w-full"
          />
        ))}
      </div>
    </div>
  );
};

const SocialsOutput = () => (
  <div className="space-y-2 text-sm">
    <p className="text-accent text-glow-amber font-bold">Contact & Socials:</p>
    <div className="ml-2 space-y-1">
      <p>
        <span className="text-muted-foreground">GitHub:</span>{" "}
        <a href="https://github.com/UshnishG" target="_blank" rel="noopener noreferrer" className="text-accent text-glow-amber underline">github.com/UshnishG</a>
      </p>
      <p>
        <span className="text-muted-foreground">LinkedIn:</span>{" "}
        <a href="https://linkedin.com/in/ushnishghosal" target="_blank" rel="noopener noreferrer" className="text-accent text-glow-amber underline">linkedin.com/in/ushnishghosal</a>
      </p>
      <p>
        <span className="text-muted-foreground">Email:</span>{" "}
        <a href="mailto:ghosalushnish@gmail.com" className="text-accent text-glow-amber underline">ghosalushnish@gmail.com</a>
      </p>
    </div>
  </div>
);

const WipOutput = () => (
  <div className="space-y-1 text-sm font-mono">
    <p><span className="text-muted-foreground">drwxr-xr-x</span>  <span className="text-accent text-glow-amber">la_drizzle_pos/</span> <span className="text-muted-foreground">(FastAPI, React - Role-based access)</span></p>
    <p><span className="text-muted-foreground">drwxr-xr-x</span>  <span className="text-accent text-glow-amber">d_mind_drone/</span> <span className="text-muted-foreground">(Disaster Management Drone - Co-pilot: Keshav Gupta)</span></p>
  </div>
);

const CatOutput = ({ file }: { file: string }) => {
  switch (file) {
    case "publications.txt":
      return (
        <div className="text-sm">
          <p><span className="text-accent text-glow-amber font-bold">[ STATUS: PENDING ]</span></p>
          <p className="mt-1">Research paper based on Samsung PRISM synthetic data generation and GANs.</p>
          <p className="text-muted-foreground">Details: Using LLMs/GANs for Network Element Template generation.</p>
        </div>
      );
    case "hobbies":
      return (
        <div className="text-sm">
          <p className="text-destructive font-bold">⚠ System anomaly detected.</p>
          <p className="mt-1">User is an avid keyboardist.</p>
          <p className="text-muted-foreground">Side-effect: Types at 90 Words Per Minute.</p>
        </div>
      );
    default:
      return <p className="text-destructive">cat: {file}: No such file or directory</p>;
  }
};

const SudoOutput = () => {
  const [phase, setPhase] = useState<"password" | "response">("password");

  useEffect(() => {
    const t = setTimeout(() => setPhase("response"), 1500);
    return () => clearTimeout(t);
  }, []);

  if (phase === "password") {
    return <p className="text-muted-foreground">[sudo] password for ushnish: ********</p>;
  }
  return (
    <div>
      <p className="text-destructive font-bold">Nice try.</p>
      <p className="text-muted-foreground">This incident will be reported to the Santa Claus. 🎅</p>
    </div>
  );
};

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
      const t = setTimeout(() => {
        window.open("/Ushnish_Ghosal.pdf", "_blank");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [progress]);

  const filled = Math.floor(progress / 5);
  const bar = "=".repeat(filled) + (filled < 20 ? ">" : "") + " ".repeat(Math.max(0, 20 - filled - 1));

  return (
    <div className="text-sm font-mono">
      <p className="text-muted-foreground">Downloading resume.pdf...</p>
      <p className="text-accent text-glow-amber">[{bar}] {progress}%</p>
      {progress === 100 && <p className="text-foreground text-glow mt-1">✓ Download complete. Opening file...</p>}
    </div>
  );
};
