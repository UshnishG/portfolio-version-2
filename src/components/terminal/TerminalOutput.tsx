import React from "react";

interface TerminalOutputProps {
  children: React.ReactNode;
}

export const TerminalOutput = ({ children }: TerminalOutputProps) => {
  return <div className="mt-1 mb-2 text-foreground text-glow">{children}</div>;
};
