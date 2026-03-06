import React from "react";

interface TerminalPromptProps {
  value: string;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const TerminalPrompt = ({ value, onChange, onKeyDown, inputRef }: TerminalPromptProps) => {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      <span className="text-accent text-glow-amber font-bold">ushnish</span>
      <span className="text-foreground text-glow">@</span>
      <span className="text-accent text-glow-amber font-bold">portfolio</span>
      <span className="text-foreground text-glow">:~$ </span>
      <span className="text-foreground text-glow relative">
        {value}
        <span className="inline-block w-[0.6em] h-[1.2em] bg-foreground animate-blink align-middle ml-[1px]" />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="absolute opacity-0 w-0 h-0"
        autoFocus
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
};
