import { useState, useEffect, useRef, useCallback } from "react";
import { BootSequence } from "@/components/terminal/BootSequence";
import { TerminalPrompt } from "@/components/terminal/TerminalPrompt";
import { TerminalOutput } from "@/components/terminal/TerminalOutput";
import { GlitchEffect } from "@/components/terminal/GlitchEffect";
import { WindowFrame } from "@/components/terminal/WindowFrame";
import { InteractiveMenu } from "@/components/terminal/InteractiveMenu";
import { parseCommand, ALL_COMMANDS, resolveAlias } from "@/lib/commandParser";
import { audioManager } from "@/lib/audioManager";

interface HistoryEntry {
  id: number;
  command: string;
  output: React.ReactNode;
}

const HISTORY_KEY = "terminal-cmd-history";

function loadHistory(): string[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const Terminal = () => {
  const [booted, setBooted] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandCounter, setCommandCounter] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>(loadHistory);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  // Persist command history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(commandHistory));
  }, [commandHistory]);

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;

    // Play command execute sound
    audioManager.playCommandExecute();

    // Add to command history
    setCommandHistory((prev) => {
      const updated = [...prev, trimmed];
      return updated.slice(-50); // keep last 50
    });
    setHistoryIndex(-1);

    const resolved = resolveAlias(trimmed);

    if (resolved === "clear") {
      audioManager.playClear();
      setHistory([]);
      setCurrentInput("");
      return;
    }

    const output = parseCommand(trimmed);
    
    // Play error sound if command not found
    if (typeof output === 'object' && output && 'type' in output && output.type === 'error') {
      audioManager.playError();
    }
    
    setHistory((prev) => [
      ...prev,
      { id: commandCounter, command: cmd, output },
    ]);
    setCommandCounter((c) => c + 1);
    setCurrentInput("");
  }, [commandCounter]);

  const handleTabComplete = useCallback((partial: string) => {
    if (!partial) return partial;
    const lower = partial.toLowerCase();
    const matches = ALL_COMMANDS.filter((c) => c.startsWith(lower));
    if (matches.length === 1) {
      audioManager.playTabComplete();
      return matches[0];
    }
    return partial;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommand(currentInput);
    } else if (e.key === "Tab") {
      e.preventDefault();
      setCurrentInput(handleTabComplete(currentInput));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCurrentInput(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCurrentInput("");
      } else {
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  return (
    <WindowFrame>
      <div
        className="h-full bg-background text-foreground font-mono relative overflow-hidden"
        onClick={focusInput}
      >
        {/* CRT scanlines overlay */}
        <div className="absolute inset-0 crt-scanlines z-10 pointer-events-none" />
        
        {/* Subtle moving scanline glitch */}
        <div className="absolute inset-0 glitch-line pointer-events-none z-10" />
        
        {/* Random glitch effects */}
        <GlitchEffect />
        
        {/* Vignette effect */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(0,0,0,0.3) 100%)'
        }} />


        {/* Scrollable Content Area */}
        <div
          ref={terminalRef}
          className="relative z-20 h-full overflow-y-auto p-4 md:p-6"
        >
          {/* Welcome Section with Collapsible Menu */}
          <InteractiveMenu onCommandExecute={handleCommand} />

          {/* Command history */}
          {history.map((entry) => (
            <div key={entry.id} className="mb-4">
              <div className="flex items-center gap-0 flex-wrap">
                <span className="text-accent text-glow-amber font-bold">ushnish</span>
                <span className="text-foreground text-glow">@</span>
                <span className="text-accent text-glow-amber font-bold">portfolio</span>
                <span className="text-foreground text-glow">:~$ </span>
                <span className="text-foreground text-glow">{entry.command}</span>
              </div>
              <TerminalOutput>{entry.output}</TerminalOutput>
            </div>
          ))}

          {/* Active prompt */}
          <TerminalPrompt
            value={currentInput}
            onChange={setCurrentInput}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
          />
        </div>
      </div>
    </WindowFrame>
  );
};

export default Terminal;
