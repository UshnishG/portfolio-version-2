import React from "react";

export function parseCommand(cmd: string): React.ReactNode {
  switch (cmd) {
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
  <div className="space-y-1">
    <p className="text-muted-foreground">Available commands:</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 ml-2">
      <div><span className="text-accent text-glow-amber">whoami</span>    <span className="text-muted-foreground">— About me</span></div>
      <div><span className="text-accent text-glow-amber">skills</span>    <span className="text-muted-foreground">— Technical skills</span></div>
      <div><span className="text-accent text-glow-amber">exp</span>       <span className="text-muted-foreground">— Work experience</span></div>
      <div><span className="text-accent text-glow-amber">projects</span>  <span className="text-muted-foreground">— Featured projects</span></div>
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
