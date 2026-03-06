import { useState } from "react";

interface MenuOption {
  key: string;
  label: string;
  command: string;
  icon: string;
  description: string;
}

const menuOptions: MenuOption[] = [
  { key: "1", label: "About Me", command: "whoami", icon: "👤", description: "Learn about my background" },
  { key: "2", label: "Skills & Expertise", command: "skills", icon: "💪", description: "View technical skills" },
  { key: "3", label: "Work Experience", command: "exp", icon: "💼", description: "My professional journey" },
  { key: "4", label: "Projects", command: "projects", icon: "🚀", description: "Featured projects" },
  { key: "5", label: "Certifications", command: "certs", icon: "🏆", description: "View credentials" },
  { key: "6", label: "Social Links", command: "socials", icon: "🌐", description: "Connect with me" },
  { key: "7", label: "Download Resume", command: "resume", icon: "📄", description: "Get my resume" },
  { key: "8", label: "Explore Files", command: "ls", icon: "📁", description: "List all files" },
];

interface InteractiveMenuProps {
  onCommandExecute: (command: string) => void;
}

export const InteractiveMenu = ({ onCommandExecute }: InteractiveMenuProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-4 mb-6">
      {/* ASCII Art Banner */}
      <div className="text-accent text-glow-amber font-bold text-center mb-4">
        <pre className="text-xs md:text-sm">
          {`
██╗   ██╗███████╗██╗  ██╗███╗   ██╗██╗███████╗██╗  ██╗   ██████╗ ██╗  ██╗██████╗ ███████╗█████╗  ██╗     
██║   ██║██╔════╝██║  ██║████╗  ██║██║██╔════╝██║  ██║   ██╔════╝██║  ██║██╔═══██╗██╔════╝██╔══██╗██║     
██║   ██║███████╗███████║██╔██╗ ██║██║███████╗███████║   ██║  ███╗███████║██║   ██║███████╗███████║██║     
██║   ██║╚════██║██╔══██║██║╚██╗██║██║╚════██║██╔══██║   ██║   ██║██╔══██║██║   ██║╚════██║██╔══██║██║     
╚██████╔╝███████║██║  ██║██║ ╚████║██║███████║██║  ██║   ╚██████╔╝██║  ██║╚██████╔╝███████║██║  ██║███████╗
 ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝
`}
        </pre>
      </div>

      {/* Welcome Message with Toggle */}
      <div className="border-l-4 border-accent pl-4 py-2 bg-accent/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-foreground text-glow text-lg font-bold">Welcome to my Interactive Portfolio Terminal! 🚀</p>
            <p className="text-muted-foreground text-sm mt-1">
              Choose an option below or type commands directly. Discover hidden features and unlock achievements!
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 bg-accent hover:bg-accent/80 text-background font-bold text-sm rounded transition-colors whitespace-nowrap"
          >
            {isExpanded ? "Hide Menu ▲" : "Show Menu ▼"}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Big Prominent Number Shortcut Notice */}
          <div className="border-2 border-accent bg-accent/10 p-4 text-center animate-pulse">
            <p className="text-accent text-glow-amber font-bold text-2xl md:text-3xl mb-2">
              ⚡ TYPE 1-8 TO QUICK ACCESS ⚡
            </p>
            <p className="text-muted-foreground text-sm">
              Or click any option below to execute instantly!
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {menuOptions.map((option) => (
              <div
                key={option.key}
                onClick={() => {
                  onCommandExecute(option.command);
                  setIsExpanded(false); // Auto-collapse after selection
                }}
                className="border border-border hover:border-accent bg-background hover:bg-accent/5 p-3 transition-all cursor-pointer group active:scale-95"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{option.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-accent text-glow-amber font-bold text-lg">[{option.key}]</span>
                      <span className="text-foreground text-glow font-semibold">{option.label}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mb-2">{option.description}</p>
                    <code className="text-accent text-glow-amber text-xs bg-muted/20 px-2 py-1 rounded">
                      $ {option.command}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tips */}
          <div className="border border-border bg-muted/5 p-3">
            <p className="text-accent text-glow-amber font-bold text-sm mb-2">💡 Quick Tips:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>• Click any option above to execute instantly</div>
              <div>• Use <span className="text-accent">Tab</span> for auto-complete</div>
              <div>• Try <span className="text-accent">ls</span> to explore hidden files</div>
              <div>• Type <span className="text-accent">achievements</span> to track progress</div>
              <div>• Press <span className="text-accent">↑/↓</span> for command history</div>
              <div>• Type <span className="text-accent">help</span> for all commands</div>
            </div>
          </div>

          {/* Easter Egg Hint */}
          <div className="text-center text-muted-foreground text-xs italic opacity-70">
            <p>🎁 Psst... there are hidden Easter eggs. Try using <span className="text-accent text-glow-amber">cat</span> on mysterious files...</p>
          </div>
        </div>
      )}

      {/* Collapsed State Quick Access */}
      {!isExpanded && (
        <div className="border border-accent bg-accent/5 p-3 text-center">
          <p className="text-accent text-glow-amber font-bold text-sm">
            💡 Quick Access: Type 1-8 or click "Show Menu" to see all options
          </p>
        </div>
      )}
    </div>
  );
};
