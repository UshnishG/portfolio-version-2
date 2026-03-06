import { useState, useEffect, useRef, useCallback } from "react";
import { BootSequence } from "@/components/terminal/BootSequence";
import { TerminalPrompt } from "@/components/terminal/TerminalPrompt";
import { TerminalOutput } from "@/components/terminal/TerminalOutput";
import { parseCommand } from "@/lib/commandParser";

interface HistoryEntry {
  id: number;
  command: string;
  output: React.ReactNode;
}

const Terminal = () => {
  const [booted, setBooted] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandCounter, setCommandCounter] = useState(0);
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

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();

    if (trimmed === "clear") {
      setHistory([]);
      setCurrentInput("");
      return;
    }

    const output = parseCommand(trimmed);
    setHistory((prev) => [
      ...prev,
      { id: commandCounter, command: cmd, output },
    ]);
    setCommandCounter((c) => c + 1);
    setCurrentInput("");
  }, [commandCounter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommand(currentInput);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground font-mono p-4 md:p-6 cursor-text relative overflow-hidden"
      onClick={focusInput}
    >
      {/* CRT scanlines overlay */}
      <div className="fixed inset-0 crt-scanlines z-10" />

      <div
        ref={terminalRef}
        className="relative z-20 max-w-4xl mx-auto overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        {/* Welcome message */}
        <div className="mb-4 text-foreground text-glow">
          <p>Welcome to Ushnish's Terminal Portfolio v1.0.0</p>
          <p className="text-muted-foreground">Type <span className="text-foreground text-glow">'help'</span> to see available commands.</p>
          <br />
        </div>

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
  );
};

export default Terminal;
